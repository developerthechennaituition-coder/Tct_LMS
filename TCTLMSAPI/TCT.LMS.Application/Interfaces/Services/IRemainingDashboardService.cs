using TCT.LMS.Application.Interfaces.Repositories; namespace TCT.LMS.Application.Interfaces.Services;
public interface IRemainingDashboardService { Task<IReadOnlyList<IReadOnlyDictionary<string,object?>>> QueryAsync(RemainingDashboardQuery query,DateTime? fromDate,DateTime? toDate,int? take,CancellationToken token); }
