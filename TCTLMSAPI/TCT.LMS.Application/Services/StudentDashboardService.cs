using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Application.Interfaces.Services;

namespace TCT.LMS.Application.Services;

public sealed class StudentDashboardService : IStudentDashboardService
{
    private readonly IStudentDashboardRepository _repository;

    public StudentDashboardService(IStudentDashboardRepository repository) => _repository = repository;

    public async Task<Guid> GetStudentIdAsync(Guid userId, CancellationToken token)
    {
        if (userId == Guid.Empty) throw new ArgumentException("userId is required.");
        return await _repository.GetStudentIdByUserAsync(userId, token)
            ?? throw new KeyNotFoundException("No active student profile is linked to this user.");
    }

    public async Task<IReadOnlyList<IReadOnlyDictionary<string, object?>>> QueryAsync(
        StudentDashboardQuery query,
        Guid studentId,
        Guid authenticatedUserId,
        DateTime? fromDate,
        DateTime? toDate,
        int? take,
        CancellationToken token)
    {
        if (studentId == Guid.Empty) throw new ArgumentException("studentId is required.");
        if (authenticatedUserId == Guid.Empty) throw new UnauthorizedAccessException("Invalid authenticated user.");
        if (fromDate?.Date > toDate?.Date) throw new ArgumentException("fromDate must be on or before toDate.");
        if (!await _repository.BelongsToUserAsync(studentId, authenticatedUserId, token))
            throw new UnauthorizedAccessException("The requested student dashboard does not belong to the logged-in user.");

        return await _repository.QueryAsync(
            query,
            studentId,
            fromDate?.Date,
            toDate?.Date,
            take.HasValue ? Math.Clamp(take.Value, 1, 500) : null,
            token);
    }
}
