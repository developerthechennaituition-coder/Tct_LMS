using Microsoft.EntityFrameworkCore;
using TCT.LMS.Data.Common;
using TCT.LMS.Domain;
using Rules = TCT.LMS.Application.Services.TutorAssignmentThresholdRules;

namespace TCT.LMS.Infrastructure.Repositories;

/// <summary>
/// Reads the facts for TutorAssignmentThresholdRules from the database, for one course (SalesDetails) and the
/// tutors offered or assigned for it. Used when a tutor is assigned (SalesRepository) and by the assignment tutor
/// lists (TutorRepository), so both apply the same rules. Read-only.
/// </summary>
internal static class TutorAssignmentEligibility
{
    public sealed record TutorKey(Guid TutorId, Guid UserId);

    public static async Task<(Rules.Config? Config, string? Error)> LoadConfigAsync(ApplicationDbContext dbContext)
    {
        var rows = await dbContext.Thresholds.AsNoTracking()
            .Where(t => t.IsActive && Rules.ThresholdNames.Contains(t.ThresholdName))
            .Select(t => new { t.ThresholdName, t.Value })
            .ToListAsync();
        var byName = rows.GroupBy(r => r.ThresholdName)
            .ToDictionary(g => g.Key, g => (IReadOnlyList<decimal?>)g.Select(r => r.Value).ToList());
        var config = Rules.ReadConfig(byName, out var error);
        return (config, error);
    }

    public static async Task<(Rules.TenureConfig? Config, string? Error)> LoadTenureConfigAsync(ApplicationDbContext dbContext)
    {
        var rows = await dbContext.Thresholds.AsNoTracking()
            .Where(t => t.IsActive && Rules.TenureThresholdNames.Contains(t.ThresholdName))
            .Select(t => new { t.ThresholdName, t.Value })
            .ToListAsync();
        var byName = rows.GroupBy(r => r.ThresholdName)
            .ToDictionary(g => g.Key, g => (IReadOnlyList<decimal?>)g.Select(r => r.Value).ToList());
        var config = Rules.ReadTenureConfig(byName, out var error);
        return (config, error);
    }

    /// <summary>
    /// The tenure limit per tutor (by Tutor.Id) for an assignment by this user. Active students: distinct students on the
    /// tutor's active courses (active Sales and SalesDetails, the Tutor Dashboard definition), the given course excluded
    /// (Guid.Empty excludes none). A course leaving the tutor or becoming inactive frees the slot.
    /// </summary>
    public static async Task<IReadOnlyDictionary<Guid, Rules.TenureStatus>> TenureAsync(ApplicationDbContext dbContext,
        Guid excludedSalesDetailsId, IReadOnlyCollection<TutorKey> tutors, Guid callerUserId, DateTime nowUtc)
    {
        if (tutors.Count == 0) return new Dictionary<Guid, Rules.TenureStatus>();
        var callerIsSuperAdmin = callerUserId != Guid.Empty
            && await HasActiveRoleAsync(dbContext, callerUserId, UserRoleEnum.SuperAdmin);
        var (config, configError) = await LoadTenureConfigAsync(dbContext);

        // SalesDetails normally hold Tutor.Id; older rows may hold the tutor's User.Id, so both are matched.
        var tutorIdByAnyId = new Dictionary<Guid, Guid>();
        foreach (var tutor in tutors)
        {
            tutorIdByAnyId[tutor.TutorId] = tutor.TutorId;
            if (tutor.UserId != Guid.Empty) tutorIdByAnyId.TryAdd(tutor.UserId, tutor.TutorId);
        }
        var anyIds = tutorIdByAnyId.Keys.ToList();
        var tutorIds = tutors.Select(t => t.TutorId).Distinct().ToList();

        var activeCourses = await (from sd in dbContext.SalesDetails.AsNoTracking()
                                   join s in dbContext.Sales.AsNoTracking() on sd.SalesId equals s.Id
                                   where s.IsActive && sd.IsActive && sd.TutorId != null && anyIds.Contains(sd.TutorId.Value)
                                         && sd.Id != excludedSalesDetailsId && s.StudentId != null
                                   select new { TutorId = sd.TutorId!.Value, StudentId = s.StudentId!.Value })
            .Distinct().ToListAsync();
        var activeStudents = activeCourses
            .GroupBy(c => tutorIdByAnyId[c.TutorId])
            .ToDictionary(g => g.Key, g => g.Select(c => c.StudentId).Distinct().Count());

        var joinDates = await (from t in dbContext.Tutor.AsNoTracking()
                               join u in dbContext.User.AsNoTracking() on t.UserId equals u.Id
                               where tutorIds.Contains(t.Id)
                               select new { t.Id, u.JoiningDate, u.CreatedDate })
            .ToDictionaryAsync(x => x.Id);

        var result = new Dictionary<Guid, Rules.TenureStatus>();
        foreach (var tutorId in tutorIds)
        {
            joinDates.TryGetValue(tutorId, out var dates);
            result[tutorId] = Rules.EvaluateTenure(config, configError, dates?.JoiningDate, dates?.CreatedDate,
                activeStudents.TryGetValue(tutorId, out var count) ? count : 0, callerIsSuperAdmin, nowUtc);
        }
        return result;
    }

    public static Task<bool> HasActiveRoleAsync(ApplicationDbContext dbContext, Guid userId, UserRoleEnum role) =>
        dbContext.UserRole.AsNoTracking().AnyAsync(userRole =>
            userRole.UserId == userId && userRole.IsActive && userRole.RoleId == (int)role
            && dbContext.Roles.Any(r => r.Id == userRole.RoleId && r.IsActive));

    /// <summary>The rule decision per tutor (by Tutor.Id). Empty when the course cannot be found.</summary>
    public static async Task<IReadOnlyDictionary<Guid, Rules.Decision>> EvaluateAsync(ApplicationDbContext dbContext,
        Guid salesDetailsId, IReadOnlyCollection<TutorKey> tutors, Guid callerUserId, DateTime nowUtc)
    {
        var course = await (from sd in dbContext.SalesDetails.AsNoTracking()
                            join s in dbContext.Sales.AsNoTracking() on sd.SalesId equals s.Id
                            where sd.Id == salesDetailsId
                            select new { sd.SubjectId, s.BoardId, s.GradeId }).FirstOrDefaultAsync();
        if (course == null || tutors.Count == 0) return new Dictionary<Guid, Rules.Decision>();

        var appliesCoordinatorRules = callerUserId != Guid.Empty
            && await HasActiveRoleAsync(dbContext, callerUserId, UserRoleEnum.Coordinator);
        var appliesGradeRule = callerUserId == Guid.Empty
            || !await HasActiveRoleAsync(dbContext, callerUserId, UserRoleEnum.SuperAdmin);
        var (config, configError) = await LoadConfigAsync(dbContext);

        // Allocations normally hold Tutor.Id; older rows may hold the tutor's User.Id, so both are matched.
        var tutorIdByAnyId = new Dictionary<Guid, Guid>();
        foreach (var tutor in tutors)
        {
            tutorIdByAnyId[tutor.TutorId] = tutor.TutorId;
            if (tutor.UserId != Guid.Empty) tutorIdByAnyId.TryAdd(tutor.UserId, tutor.TutorId);
        }
        var anyIds = tutorIdByAnyId.Keys.ToList();
        var tutorIds = tutors.Select(t => t.TutorId).Distinct().ToList();

        // Active students: distinct students on active allocations (the Super Admin dashboard definition), this course excluded.
        var activeAllocations = await dbContext.TutorStudentAllocations.AsNoTracking()
            .Where(a => a.IsActive && anyIds.Contains(a.TutorId) && a.SalesDetailsId != salesDetailsId)
            .Select(a => new { a.TutorId, a.StudentId })
            .ToListAsync();
        var activeStudents = activeAllocations
            .GroupBy(a => tutorIdByAnyId[a.TutorId])
            .ToDictionary(g => g.Key, g => g.Select(a => a.StudentId).Distinct().Count());

        var lastUse = new Dictionary<Guid, DateTime>();
        var holdStart = new Dictionary<Guid, DateTime>();
        if (appliesCoordinatorRules && config != null)
        {
            // Cooldown: every allocation this user created for the tutor on another course, whatever happened to it later.
            var callerUses = await dbContext.TutorStudentAllocations.AsNoTracking()
                .Where(a => anyIds.Contains(a.TutorId) && a.CreatedBy == callerUserId && a.SalesDetailsId != salesDetailsId)
                .GroupBy(a => a.TutorId)
                .Select(g => new { TutorId = g.Key, Last = g.Max(a => a.CreatedDate) })
                .ToListAsync();
            foreach (var use in callerUses)
            {
                var key = tutorIdByAnyId[use.TutorId];
                if (!lastUse.TryGetValue(key, out var current) || use.Last > current) lastUse[key] = use.Last;
            }

            var holds = await HoldStartsAsync(dbContext, salesDetailsId, course.SubjectId, course.BoardId, course.GradeId,
                callerUserId, nowUtc.AddHours(-config.DemoHoldHours), anyIds);
            foreach (var (rawTutorId, start) in holds)
            {
                var key = tutorIdByAnyId[rawTutorId];
                if (!holdStart.TryGetValue(key, out var current) || start > current) holdStart[key] = start;
            }
        }

        // Eligible grades: the tutor's active skill rows (TutorDetails.GradeId), compared by grade id only.
        var tutorsWithGrade = appliesGradeRule
            ? (await dbContext.TutorDetails.AsNoTracking()
                .Where(d => d.IsActive && tutorIds.Contains(d.TutorId) && d.GradeId == course.GradeId)
                .Select(d => d.TutorId).Distinct().ToListAsync()).ToHashSet()
            : new HashSet<Guid>();

        var tenure = await TenureAsync(dbContext, salesDetailsId, tutors, callerUserId, nowUtc);

        var decisions = new Dictionary<Guid, Rules.Decision>();
        foreach (var tutorId in tutorIds)
        {
            var facts = new Rules.Facts(
                appliesCoordinatorRules,
                appliesGradeRule,
                activeStudents.TryGetValue(tutorId, out var count) ? count : 0,
                lastUse.TryGetValue(tutorId, out var used) ? used : null,
                holdStart.TryGetValue(tutorId, out var held) ? held : null,
                tutorsWithGrade.Contains(tutorId));
            var decision = Rules.Evaluate(facts, config, configError, nowUtc);
            decisions[tutorId] = tenure.TryGetValue(tutorId, out var tenureStatus) ? Rules.Combine(decision, tenureStatus) : decision;
        }
        return decisions;
    }

    /// <summary>
    /// Tutors (Tutor.Id) currently held for another coordinator's pending demo for the course's board, grade and
    /// subject, as seen by this user. Empty unless the user is a Coordinator and the configuration is valid (an invalid
    /// configuration blocks the save itself). Lets a paged tutor list leave them out before paging.
    /// </summary>
    public static async Task<HashSet<Guid>> HeldTutorIdsAsync(ApplicationDbContext dbContext, Guid salesDetailsId,
        Guid callerUserId, DateTime nowUtc)
    {
        if (callerUserId == Guid.Empty || !await HasActiveRoleAsync(dbContext, callerUserId, UserRoleEnum.Coordinator))
            return new HashSet<Guid>();
        var course = await (from sd in dbContext.SalesDetails.AsNoTracking()
                            join s in dbContext.Sales.AsNoTracking() on sd.SalesId equals s.Id
                            where sd.Id == salesDetailsId
                            select new { sd.SubjectId, s.BoardId, s.GradeId }).FirstOrDefaultAsync();
        var (config, _) = await LoadConfigAsync(dbContext);
        if (course == null || config == null) return new HashSet<Guid>();

        var holds = await HoldStartsAsync(dbContext, salesDetailsId, course.SubjectId, course.BoardId, course.GradeId,
            callerUserId, nowUtc.AddHours(-config.DemoHoldHours), null);
        var rawIds = holds.Select(h => h.RawTutorId).ToList();
        if (rawIds.Count == 0) return new HashSet<Guid>();
        return (await dbContext.Tutor.AsNoTracking()
            .Where(t => rawIds.Contains(t.Id) || rawIds.Contains(t.UserId))
            .Select(t => t.Id).ToListAsync()).ToHashSet();
    }

    // Demo hold: another Coordinator's active allocation of the tutor created after holdFrom, on a course with the same
    // board, grade and subject that is still a pending demo. Keyed by the allocation's TutorId as stored.
    private static async Task<List<(Guid RawTutorId, DateTime Start)>> HoldStartsAsync(ApplicationDbContext dbContext,
        Guid salesDetailsId, Guid subjectId, Guid? boardId, Guid? gradeId, Guid callerUserId, DateTime holdFrom,
        List<Guid>? anyTutorIds)
    {
        var query = from a in dbContext.TutorStudentAllocations.AsNoTracking()
                    join sd in dbContext.SalesDetails.AsNoTracking() on a.SalesDetailsId equals sd.Id
                    join s in dbContext.Sales.AsNoTracking() on sd.SalesId equals s.Id
                    join status in dbContext.Type_Code.AsNoTracking() on sd.Status equals status.Id
                    where a.IsActive
                          && a.CreatedBy != callerUserId && a.SalesDetailsId != salesDetailsId
                          && a.CreatedDate > holdFrom
                          && sd.IsActive && s.IsActive
                          && Rules.PendingDemoStatusCodes.Contains(status.TypeCodeValue)
                          && sd.SubjectId == subjectId && s.BoardId == boardId && s.GradeId == gradeId
                          && dbContext.UserRole.Any(ur => ur.UserId == a.CreatedBy && ur.IsActive
                                                          && ur.RoleId == (int)UserRoleEnum.Coordinator)
                    select a;
        if (anyTutorIds != null) query = query.Where(a => anyTutorIds.Contains(a.TutorId));
        var rows = await query.GroupBy(a => a.TutorId)
            .Select(g => new { TutorId = g.Key, Start = g.Max(a => a.CreatedDate) })
            .ToListAsync();
        return rows.Select(r => (r.TutorId, r.Start)).ToList();
    }
}
