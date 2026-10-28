namespace TCT.LMS.Application.Interfaces.Repositories;
public enum RemainingDashboardQuery { FinanceSummary, FinanceTrend, OutstandingInvoices, PaymentModes, HrSummary, TutorPipeline, TutorOnboardingTrend, TutorEngagement }
public interface IRemainingDashboardRepository { Task<IReadOnlyList<IReadOnlyDictionary<string,object?>>> QueryAsync(RemainingDashboardQuery query,DateTime fromDate,DateTime toDate,int take,CancellationToken token); }
