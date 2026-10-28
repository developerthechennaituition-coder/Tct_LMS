using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Application.Interfaces.Services;

namespace TCT.LMS.Application.Services;

public sealed class TutorDashboardService : ITutorDashboardService
{
    private readonly ITutorDashboardRepository _repository;

    public TutorDashboardService(ITutorDashboardRepository repository) => _repository = repository;

    public async Task<Guid> GetTutorIdAsync(Guid userId, CancellationToken token)
    {
        if (userId == Guid.Empty) throw new ArgumentException("userId is required.");

        return await _repository.GetTutorIdByUserAsync(userId, token)
            ?? throw new KeyNotFoundException("No active tutor profile is linked to this user.");
    }

    public async Task<IReadOnlyList<IReadOnlyDictionary<string, object?>>> QueryAsync(
        TutorDashboardQuery query,
        Guid tutorId,
        Guid authenticatedUserId,
        DateTime? fromDate,
        DateTime? toDate,
        int? take,
        CancellationToken token)
    {
        if (tutorId == Guid.Empty) throw new ArgumentException("tutorId is required.");
        if (authenticatedUserId == Guid.Empty) throw new UnauthorizedAccessException("Invalid authenticated user.");
        if (fromDate?.Date > toDate?.Date) throw new ArgumentException("fromDate must be on or before toDate.");
        if (!await _repository.BelongsToUserAsync(tutorId, authenticatedUserId, token))
            throw new UnauthorizedAccessException("The requested tutor dashboard does not belong to the logged-in user.");

        return await _repository.QueryAsync(
            query,
            tutorId,
            fromDate?.Date,
            toDate?.Date,
            take.HasValue ? Math.Clamp(take.Value, 1, 500) : null,
            token);
    }
}
