using Microsoft.EntityFrameworkCore;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Schedule;

namespace TCT.LMS.Infrastructure.Repositories;

// Class status edit requests: once a tutor or student has saved a class status it is locked for them.
// They can ask Operations to unlock it; when approved they may save it once more, which marks the request Used.
public partial class ScheduleRepository
{
    public async Task<ClassStatusEditResultDto> CreateStatusEditRequestAsync(Guid scheduleDetailsId, Guid userId, string requesterType, string? reason)
    {
        ClassStatusEditResultDto Fail(string message) => new() { Succeeded = false, Message = message };

        var salesDetailsId = await OwnClassSalesDetailsIdAsync(scheduleDetailsId, userId, requesterType);
        if (salesDetailsId == null) return Fail("This class is not one of your classes.");

        var open = await _dbContext.ClassStatusEditRequest
            .Where(r => r.ScheduleDetailsId == scheduleDetailsId && r.RequestedBy == userId
                && (r.Status == (int)ClassStatusEditRequestStatus.Pending || r.Status == (int)ClassStatusEditRequestStatus.Approved))
            .Select(r => (int?)r.Status).FirstOrDefaultAsync();
        if (open == (int)ClassStatusEditRequestStatus.Pending) return Fail("Your edit request for this class is already waiting for Operations.");
        if (open == (int)ClassStatusEditRequestStatus.Approved) return Fail("Operations have already approved editing this class. Open it and save the new status.");

        var request = new ClassStatusEditRequest
        {
            Id = Guid.NewGuid(),
            ScheduleDetailsId = scheduleDetailsId,
            SalesDetailsId = salesDetailsId.Value,
            RequestedBy = userId,
            RequesterType = requesterType,
            Reason = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim()[..Math.Min(reason.Trim().Length, 500)],
            Status = (int)ClassStatusEditRequestStatus.Pending,
            CreatedDate = DateTime.UtcNow,
        };
        _dbContext.ClassStatusEditRequest.Add(request);
        await _dbContext.SaveChangesAsync();
        return new ClassStatusEditResultDto
        {
            Succeeded = true,
            Message = "Edit request sent to Operations. You can change the status once they approve.",
            Request = await GetStatusEditRequestAsync(request.Id),
        };
    }

    // The latest request for a class (the one a notification refers to).
    public async Task<ClassStatusEditRequestDto?> GetLatestStatusEditRequestAsync(Guid scheduleDetailsId)
    {
        var id = await _dbContext.ClassStatusEditRequest.Where(r => r.ScheduleDetailsId == scheduleDetailsId)
            .OrderByDescending(r => r.CreatedDate).Select(r => (Guid?)r.Id).FirstOrDefaultAsync();
        return id.HasValue ? await GetStatusEditRequestAsync(id.Value) : null;
    }

    public async Task<ClassStatusEditRequestDto?> GetStatusEditRequestAsync(Guid id)
    {
        var request = await _dbContext.ClassStatusEditRequest.AsNoTracking().FirstOrDefaultAsync(r => r.Id == id);
        if (request == null) return null;

        var row = await (from detail in _dbContext.ScheduleDetails
                         join schedule in _dbContext.Schedule on detail.ScheduleId equals schedule.ScheduleId
                         where detail.ScheduleDetailsId == request.ScheduleDetailsId
                         select new { detail.StartTime, detail.EndTime, detail.TutorScheduleStatus, detail.StudentScheduleStatus,
                             schedule.TutorId, schedule.StudentId, schedule.SubjectId }).FirstOrDefaultAsync();
        if (row == null) return null;

        string Name(User? u) => u == null ? "" : u.FullName ?? $"{u.FirstName} {u.LastName}";
        var studentUserId = await _dbContext.Student.Where(s => s.Id == row.StudentId).Select(s => s.UserId).FirstOrDefaultAsync();
        // Schedule.TutorId holds either the Tutor.Id or the tutor's User.Id.
        var tutorUserId = await _dbContext.Tutor.Where(t => t.Id == row.TutorId || t.UserId == row.TutorId).Select(t => (Guid?)t.UserId).FirstOrDefaultAsync();
        var userIds = new[] { request.RequestedBy, studentUserId ?? Guid.Empty, tutorUserId ?? Guid.Empty };
        var users = await _dbContext.User.AsNoTracking().Where(u => userIds.Contains(u.Id)).ToListAsync();
        var statusId = request.RequesterType == "tutor" ? row.TutorScheduleStatus : row.StudentScheduleStatus;
        var codeIds = new[] { statusId ?? Guid.Empty, row.SubjectId };
        var codes = await _dbContext.Type_Code.Where(c => codeIds.Contains(c.Id)).ToDictionaryAsync(c => c.Id, c => c.TypeCodeName);

        return new ClassStatusEditRequestDto
        {
            Id = request.Id,
            ScheduleDetailsId = request.ScheduleDetailsId,
            SalesDetailsId = request.SalesDetailsId,
            RequestedBy = request.RequestedBy,
            RequesterType = request.RequesterType,
            RequesterName = Name(users.FirstOrDefault(u => u.Id == request.RequestedBy)),
            StudentName = Name(users.FirstOrDefault(u => u.Id == studentUserId)),
            TutorName = Name(users.FirstOrDefault(u => u.Id == tutorUserId)),
            Subject = codes.TryGetValue(row.SubjectId, out var subject) ? subject ?? "" : "",
            ClassStart = row.StartTime,
            ClassEnd = row.EndTime,
            CurrentStatus = statusId.HasValue && codes.TryGetValue(statusId.Value, out var status) ? status : null,
            Reason = request.Reason,
            Status = ((ClassStatusEditRequestStatus)request.Status).ToString(),
            DecisionComment = request.DecisionComment,
            CreatedDate = request.CreatedDate,
        };
    }

    public async Task<ClassStatusEditResultDto> DecideStatusEditRequestAsync(Guid id, bool approve, Guid decidedBy, string? comment)
    {
        var request = await _dbContext.ClassStatusEditRequest.FirstOrDefaultAsync(r => r.Id == id);
        if (request == null) return new() { Succeeded = false, Message = "Request not found." };
        if (request.Status != (int)ClassStatusEditRequestStatus.Pending)
            return new() { Succeeded = false, Message = $"This request has already been {((ClassStatusEditRequestStatus)request.Status).ToString().ToLower()}." };

        request.Status = (int)(approve ? ClassStatusEditRequestStatus.Approved : ClassStatusEditRequestStatus.Rejected);
        request.DecidedBy = decidedBy;
        request.DecidedDate = DateTime.UtcNow;
        request.DecisionComment = string.IsNullOrWhiteSpace(comment) ? null : comment.Trim()[..Math.Min(comment.Trim().Length, 500)];
        await _dbContext.SaveChangesAsync();
        return new ClassStatusEditResultDto
        {
            Succeeded = true,
            Message = approve ? "Approved. The class status is unlocked for one more change." : "Request rejected.",
            Request = await GetStatusEditRequestAsync(id),
        };
    }

    // The tutor or student saved the class again: an approval allows one change only.
    public async Task MarkStatusEditRequestUsedAsync(Guid scheduleDetailsId, Guid userId)
    {
        var approved = await _dbContext.ClassStatusEditRequest
            .Where(r => r.ScheduleDetailsId == scheduleDetailsId && r.RequestedBy == userId && r.Status == (int)ClassStatusEditRequestStatus.Approved)
            .ToListAsync();
        if (approved.Count == 0) return;
        approved.ForEach(r => r.Status = (int)ClassStatusEditRequestStatus.Used);
        await _dbContext.SaveChangesAsync();
    }

    // Calendar: each class's latest request by this user (Used requests count as none, so the class is locked again).
    private async Task ApplyStatusEditRequestsAsync(List<ScheduleDTO> classes, Guid userId)
    {
        var ids = classes.Where(c => c.ScheduleDetailsId.HasValue).Select(c => c.ScheduleDetailsId!.Value).Distinct().ToList();
        if (ids.Count == 0) return;
        var latest = (await _dbContext.ClassStatusEditRequest.AsNoTracking()
                .Where(r => r.RequestedBy == userId && ids.Contains(r.ScheduleDetailsId))
                .Select(r => new { r.ScheduleDetailsId, r.Status, r.CreatedDate }).ToListAsync())
            .GroupBy(r => r.ScheduleDetailsId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(r => r.CreatedDate).First().Status);

        foreach (var item in classes)
        {
            if (!item.ScheduleDetailsId.HasValue || !latest.TryGetValue(item.ScheduleDetailsId.Value, out var status)
                || status == (int)ClassStatusEditRequestStatus.Used) continue;
            item.EditRequestStatus = ((ClassStatusEditRequestStatus)status).ToString();
            if (status == (int)ClassStatusEditRequestStatus.Approved) item.DisableActions = false;
        }
    }

    // The class's SalesDetailsId when it belongs to this tutor or student user; otherwise null.
    private async Task<Guid?> OwnClassSalesDetailsIdAsync(Guid scheduleDetailsId, Guid userId, string requesterType)
    {
        var row = await (from detail in _dbContext.ScheduleDetails
                         join schedule in _dbContext.Schedule on detail.ScheduleId equals schedule.ScheduleId
                         where detail.ScheduleDetailsId == scheduleDetailsId && detail.IsActive && schedule.IsActive
                         select new { schedule.SalesDetailsId, schedule.TutorId, schedule.StudentId }).FirstOrDefaultAsync();
        if (row == null) return null;

        if (requesterType == "tutor")
        {
            var tutor = await _dbContext.Tutor.FirstOrDefaultAsync(t => t.UserId == userId);
            return tutor != null && (row.TutorId == tutor.Id || row.TutorId == tutor.UserId) ? row.SalesDetailsId : null;
        }
        if (requesterType == "student")
        {
            var studentId = await _dbContext.Student.Where(s => s.UserId == userId).Select(s => (Guid?)s.Id).FirstOrDefaultAsync();
            return studentId.HasValue && row.StudentId == studentId.Value ? row.SalesDetailsId : null;
        }
        return null;
    }
}
