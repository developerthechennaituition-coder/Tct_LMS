using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.DTOs.Invoice;
using TCT.LMS.DTOs.Payment;
using TCT.LMS.DTOs.Payroll;
using TCT.LMS.DTOs.Sales;
using TCT.LMS.DTOs.Schedule;
using TCT.LMS.DTOs.Tutor;
using TCT.LMS.DTOs.User;
using TCT.LMS.DTOs.Wrappers;

namespace TCT.LMS.Application.Interfaces.Services
{
    public interface IScheduleService
    {
        Task<Response<StudentScheduleDetailsDto>> GetScheduleBySubjectId(Guid tutorId, Guid subjectId, Guid studentId);
        Task<Response<List<ScheduleDTO>>> GetAllScheduledEvents(Guid guestId, string guestType);
        Task<Response<List<ScheduleDTO>>> GetScheduleDetailsById(Guid guestId, string guestType, string month, string year);
        Task<bool> AddSchedule(ScheduleDTO schedule);
        Task<Response<bool>> UpdateScheduleStatus(TCTEvent inputData);
        Task<Response<Guid>> AddOrUpdateSchedule(Schedule1Dto schedule);
        Task<Response<List<ScheduleDetailsDto>>> GetScheduleByTutorId(Guid tutorId);   
        Task<Response<List<PayrollRequestDto>>> GenerateTutorPayroll(Guid tutorId);
        Task<Response<List<PayrollRequestDto>>> GetTutorPayroll(string month, string year);
        Task<Response<Guid>> ApproveRejectTutorSchedules(ScheduleApprovalRequest request);
        Task<Response<List<ScheduleDTO>>> GetStudentClasses(Guid studentId);
        Task<Response<Guid>> DeleteClass(Guid scheduleDetailsId, Guid userId);
        Task<Response<Guid>> UpdateScheduleDetails(UpdateClass detailsDto);
        Task<Response<List<TutorInvoiceDto>>> GetTutorPayrollList(Guid tutorId);
        Task<Response<List<StudentInvoiceDto>>> GetStudentInvoiceList(Guid studentId);
        Task<Response<List<PayrollRequestDto>>> GetTutorInvoiceById(string invoiceNumber);
        Task<Response<List<PayrollRequestDto>>> GetStudentInvoiceById(string invoiceNumber);
        Task<Response<bool>> RemoveSchedule(Guid scheduleId, Guid userId);
        Task<List<TimeSlotsGroup>> GetTutorAllocatedSchedule(Guid tutorId);
        Task<List<TimeSlotsGroup>> GetStudentAllocatedSchedule(Guid userId, Guid studentId, Guid salesDetailsId);
        Task<Response<Guid>> ScheduleNewEvent(TimeSlotsGroup input);
        //Task<List<AccountsScheduleDto>> GetStudentSchedulesAsync();
        Task<List<AccountsInvoiceSummaryDto>> GetStudentSchedulesAsync(Guid studentId, int month, int year);
        Task<List<ClassCompletionRowDto>> GetClassCompletionListAsync(int month, int year);
        Task<CreateInvoiceResponse> CreateStudentInvoiceAsync(CreateInvoiceRequest request);
        Task<CreateInvoiceResponse> CreatePrepaidUpfrontInvoiceAsync(Guid studentId, Guid createdBy);
        Task<List<AdvanceInvoiceDto>> GetAdvanceInvoicesAsync(Guid studentId);
        Task<AdvanceInvoiceSendResultDto> SendAdvanceInvoiceAsync(string invoiceNumber);
        Task<CreateInvoiceResponse> CreatePrepaidStatementInvoiceAsync(Guid studentId, int month, int year, Guid createdBy);
        Task<Response<List<OverrunResultDto>>> ProcessPrepaidOverrunAsync(Guid studentId, Guid createdBy);
        Task<List<Guid>> GetBlockedSalesDetailsIdsAsync();
        Task<Response<List<StudentInvoiceViewModel>>> GetStudentInvoiceDetailsByNumberAsync(string invoiceNumber);
        Task<Response<ScheduleDetailsDto>> GetScheduleDetailsById(Guid scheduleDetailsId);
        Task<Response<bool>> UpdateScheduleDetail(TCTEvent inputData);
        Task<StudentScheduleSummaryResponseDto> GetStudentScheduleSummaryAsync(Guid userId);
        Task<GenerateTutorInvoiceResponseDto> GenerateTutorInvoiceAsync(GenerateTutorInvoiceRequestDto request);
        Task<byte[]> GetTutorPaySlipPdfAsync(string invoiceNumber);
        Task<Response<bool>> ScheduleChangeRequest(ScheduleChangeRqstDTO inputData);
        Task<IReadOnlyList<SalesSummaryResponseDto>> GetAsync(CancellationToken ct = default);
        Task<IReadOnlyList<SalesSummaryResponseDto>> GetNeedToSchedule(CancellationToken ct = default);
        Task<IReadOnlyList<SalesSummaryResponseDto>> GetScheduleByStatus(string statusCodeFilter, CancellationToken ct = default);
        Task<List<TutorEngagementDto>> GetTutorEngagmentInfo(Guid tutorId);
        Task<TutorDashboardInfoDto> GetTutorDashboardInfo(Guid _tutorId);
        Task<Response<int>> GetCancelledClassesCount(Guid salesDetailsId, int year, int month);
        Task<Response<List<ClassScheduleDetailsReportDto>>> GetCompletedClassScheduleDetailsAsync(Guid? studentId = null, Guid? tutorId = null, Guid? operationId = null, DateTime? fromDate = null, DateTime? toDate = null, Guid? operationStatus = null);
        Task<Response<bool>> UpdateOperationScheduleStatus(UpdateOperationScheduleStatusRequest request);
        Task<bool> BulkUpdateOperationScheduleStatus(BulkUpdateOperationScheduleStatusRequest request);
        Task<Response<bool>> UpdateScheduleApprovalStatus(ScheduleStatusUpdateRequest request);
        Task<Response<Guid>> AddOrUpdatePaymentPlanAsync(CreatePaymentPlanRequest request);
        Task<Response<Guid>> RecordPaymentAsync(RecordPaymentRequest request);
        Task<PaymentPlanSummaryDto?> GetPaymentPlanBySalesDetailsIdAsync(Guid salesDetailsId);
        Task<List<PaymentPlanSummaryDto>> GetPaymentPlansByStudentIdAsync(Guid studentId);
    }
}
