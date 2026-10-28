using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Invoice;
using TCT.LMS.DTOs.Payment;
using TCT.LMS.DTOs.Payroll;
using TCT.LMS.DTOs.Sales;
using TCT.LMS.DTOs.Schedule;
using TCT.LMS.DTOs.Tutor;
using TCT.LMS.DTOs.Wrappers;

namespace TCT.LMS.Application.Interfaces.Repositories
{
    public interface IScheduleRepository : IGenericRepository<Schedule>
    {
        Task<Response<StudentScheduleDetailsDto>> GetScheduleBySubjectId(Guid tutorId, Guid subjectId, Guid studentId);
        Task<Response<Guid>> AddOrUpdateSchedule(Schedule1Dto schedule);
        Task<bool> HasCompletedStudentRegistration(Guid studentId, Guid subjectId);
        Task<Response<Guid>> AddOrUpdateScheduleDetails(ScheduleDetailsDto schedule);
        Task<Response<List<Guid>>> AddScheduleDetailsBatchAsync(List<ScheduleDetailsDto> schedules);
        Task<bool> AddSchedule(ScheduleDTO schedule);
        Task<Response<List<ScheduleDTO>>> GetAllScheduledEvents(Guid guestId, string guestType);
        Task<Response<List<ScheduleDTO>>> GetScheduleDetailsById(Guid guestId, string guestType, string month, string year);
    /// <summary>Saves an attendance/status submission. On success, Data is true when the submitting tutor's or
    /// student's status for the class changed (a new submission) and false for a repeat of the same status.</summary>
    Task<Response<bool>> UpdateScheduleStatus(TCTEvent inputData);
    Task<DemoRegistrationEmailContextDto?> GetDemoRegistrationEmailContext(Guid scheduleDetailsId);
        Task<Response<List<ScheduleDetailsDto>>> GetScheduleByTutorId(Guid tutorId);
        Task<Response<List<PayrollRequestDto>>> GenerateTutorPayroll(Guid tutorId);
        Task<Response<List<PayrollRequestDto>>> GetTutorPayroll(string month, string year);
        Task<Response<Guid>> ApproveRejectTutorSchedules(ScheduleApprovalRequest request);
        Task<Response<Guid>> UpdateSchedule(Schedule1Dto schedule);
        Task<Response<List<ScheduleDTO>>> GetStudentClasses(Guid studentId);
        Task<Response<Guid>> DeleteClass(Guid scheduleDetailsId, Guid userId);
        Task<Response<Guid>> UpdateScheduleDetails(UpdateClass detailsDto);
        List<ScheduleDetailsDto> GetScheduledClasses(Guid tutorId, Guid studentId, DateTime date, bool checkScheduledDate);
        Task<bool> HasTutorScheduleConflictAsync(Guid tutorId, DateTime startTime, DateTime endTime, Guid? excludedSalesDetailsId = null);
        Task<bool> HasStudentScheduleConflictAsync(Guid studentId, DateTime startTime, DateTime endTime, Guid? excludedSalesDetailsId = null);
        Task<Response<List<TutorInvoiceDto>>> GetTutorPayrollList(Guid tutorId);
        Task<Response<List<StudentInvoiceDto>>> GetStudentInvoiceList(Guid studentId);
        Task<Response<List<PayrollRequestDto>>> GetTutorInvoiceById(string invoiceNumber);
        Task<Response<List<PayrollRequestDto>>> GetStudentInvoiceById(string invoiceNumber);
        Task<Response<bool>> RemoveSchedule(Guid scheduleId, Guid userId);
        Task<List<ScheduleDetailsDto>> GetTutorAllocatedSchedule(Guid tutorId);
        Task<List<ScheduleDetailsDto>> GetStudentAllocatedSchedule(Guid studentId, Guid salesDetailsId);
        //Task<List<AccountsScheduleDto>> GetStudentSchedulesAsync();
        Task<List<AccountsInvoiceSummaryDto>> GetStudentSchedulesAsync(Guid studentId, int month, int year);
        Task<List<InvoiceQueryResult>> GetInvoiceDataAsync(Guid studentId, int month, int year);
        Task<string> CreateInvoiceWithDetailsAsync(Guid studentId, int month, int year, Guid createdBy);
        Task<string> CreatePrepaidUpfrontInvoiceAsync(Guid studentId, Guid createdBy);
        Task<string?> CreateAdvanceInvoiceIfFirstClassesAsync(Guid scheduleId, Guid createdBy);
        Task<List<AdvanceInvoiceDto>> GetAdvanceInvoicesAsync(Guid studentId);
        Task<AdvanceInvoiceSendResultDto> SendAdvanceInvoiceAsync(string invoiceNumber);
        Task<string> CreatePrepaidStatementInvoiceAsync(Guid studentId, int month, int year, Guid createdBy);
        Task<MonthlyClassCompletionDto?> GetMonthlyClassCompletionAsync(Guid scheduleDetailsId);
        Task<List<ClassCompletionRowDto>> GetClassCompletionListAsync(int month, int year);
        Task<List<ScheduleCalendarTutorDto>> GetScheduleCalendarTutorsAsync();
        Task<List<ScheduleCalendarEnrolmentDto>> GetScheduleCalendarEnrolmentsAsync(Guid? tutorId, Guid? tutorUserId, Guid? studentUserId);
        Task<List<ScheduleCalendarEventDto>> GetScheduleCalendarEventsAsync(Guid salesDetailsId, DateTime from, DateTime to);
        Task<WeeklyDayChangeResultDto> AddWeeklyDayChangeAsync(WeeklyDayChangeRequestDto request, Guid actorId, bool dryRun = false,
            IReadOnlyCollection<Guid>? ignoreClassIds = null);
        Task<ScheduleChangeRequestResultDto> CreatePermanentRescheduleRequestAsync(Guid scheduleDetailsId, Guid userId, string requesterType,
            DateTime newStart, DateTime newEnd);
        Task<ScheduleChangeRequestResultDto> CreateScheduleChangeRequestAsync(WeeklyDayChangeRequestDto request, Guid userId, string requesterType, string summary);
        Task<List<ScheduleChangeRequestDto>> GetScheduleChangeRequestsAsync(Guid salesDetailsId);
        Task<List<ScheduleChangeRequestDto>> GetScheduleChangeRequestListAsync(List<Guid>? salesDetailsIds, bool pendingOnly);
        Task<ScheduleChangeRequestDto?> GetScheduleChangeRequestAsync(Guid id);
        Task<ScheduleChangeRequestResultDto> DecideScheduleChangeRequestAsync(Guid id, bool approve, Guid decidedBy, string? comment);
        Task<List<ScheduleCalendarStudentDto>> GetScheduleCalendarStudentsAsync();
        Task<List<ScheduleCalendarPersonEventDto>> GetScheduleCalendarPersonEventsAsync(Guid? tutorId, Guid? studentId, DateTime fromDate, DateTime toDate);
        Task<ScheduleChangeRequestResultDto> ModifyAndApproveScheduleChangeRequestAsync(Guid id, WeeklyDayChangeRequestDto change, Guid decidedBy, string? comment);
        Task<ClassStatusEditResultDto> CreateStatusEditRequestAsync(Guid scheduleDetailsId, Guid userId, string requesterType, string? reason);
        Task<ClassStatusEditRequestDto?> GetStatusEditRequestAsync(Guid id);
        Task<ClassStatusEditRequestDto?> GetLatestStatusEditRequestAsync(Guid scheduleDetailsId);
        Task<ClassStatusEditResultDto> DecideStatusEditRequestAsync(Guid id, bool approve, Guid decidedBy, string? comment);
        Task MarkStatusEditRequestUsedAsync(Guid scheduleDetailsId, Guid userId);
        Task<List<OverrunResultDto>> DetectAndRaiseOverrunAsync(Guid studentId, Guid createdBy);
        Task<List<Guid>> GetBlockedSalesDetailsIdsAsync();
        Task<Response<List<StudentInvoiceViewModel>>> GetStudentInvoiceDetailsByNumberAsync(string invoiceNumber);
        Task<StudentScheduleSummaryResponseDto> GetStudentScheduleSummaryAsync(Guid userId);
        Task<Response<ScheduleDetailsDto>> GetScheduleDetailsById(Guid scheduleDetailsId);
        Task<Response<bool>> UpdateScheduleDetails(TCTEvent inputData);
        Task UpdateStudentInvoiceEmailSendDateAsync(string invoiceNumber);
        Task UpdateTutorInvoiceEmailSendDateAsync(string invoiceNumber);
        Task<GenerateTutorInvoiceResponseDto> GenerateTutorInvoiceAsync(GenerateTutorInvoiceRequestDto request);
        Task<IReadOnlyList<SalesSummaryResponseDto>> GetAsync(CancellationToken ct = default);
        Task<IReadOnlyList<SalesSummaryResponseDto>> GetNeedToSchedule(CancellationToken ct = default);
        Task<IReadOnlyList<SalesSummaryResponseDto>> GetScheduleByStatus(string statusCodeFilter, CancellationToken ct = default);
        Task<List<TutorEngagementDto>> GetTutorEngagmentInfo(Guid tutorId);
        Task<TutorDashboardInfoDto> GetTutorDashboardInfo(Guid _tutorId);
        Task<Response<int>> GetCancelledClassesCount(Guid salesDetailsId, int year, int month);
        Task<Response<int>> GetTotalClassesCount(Guid salesDetailsId, int year, int month);
        Task<Response<List<ClassScheduleDetailsReportDto>>> GetCompletedClassScheduleDetailsAsync(Guid? studentId = null, Guid? tutorId = null, Guid? operationId = null, DateTime? fromDate = null, DateTime? toDate = null, Guid? operationStatus = null);
        Task<Response<bool>> UpdateOperationScheduleStatus(UpdateOperationScheduleStatusRequest request);
        Task<Response<bool>> UpdateScheduleApprovalStatus(ScheduleStatusUpdateRequest request);
        Task UpdateMeetingLinkAsync(Guid scheduleDetailsId, string meetingLink);
        Task<Response<Guid>> AddOrUpdatePaymentPlanAsync(CreatePaymentPlanRequest request);
        Task<string?> GetPrepaidScheduleBlockReasonAsync(Guid salesDetailsId, DateTime classDate);
        Task<Response<Guid>> RecordPaymentAsync(RecordPaymentRequest request);
        Task<PaymentPlanSummaryDto?> GetPaymentPlanBySalesDetailsIdAsync(Guid salesDetailsId);
        Task<List<PaymentPlanSummaryDto>> GetPaymentPlansByStudentIdAsync(Guid studentId);
    }
}
