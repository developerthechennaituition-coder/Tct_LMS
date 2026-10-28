using TCT.LMS.Application.Services;
using TCT.LMS.Domain;
using TCT.LMS.Domain.Entities;
using TCT.LMS.Domain.Enums;
using TCT.LMS.DTOs.Notification;
using TCT.LMS.DTOs.Sales;
using TCT.LMS.DTOs.Schedule;
using TCT.LMS.DTOs.Wrappers;

namespace TCT.LMS.Application.Interfaces.Services;

public interface INotificationService
{
    Task SendNotificationAsync(MailMessage message, CommunicationType type);
    Task<EnrolledCourse> GetNotificationByIdAsync(Guid id);
    Task<IEnumerable<NotificationDto>> GetNotificationByUserIdAsync(Guid userId);
    Task<IEnumerable<Notification>> GetAllNotificationsAsync();
    Task AddNotificationAsync(Notification notification);
    Task UpdateNotificationAsync(Notification notification);
    Task DeleteNotificationAsync(int id);
    Task AddNotifications(Guid studentId, NotificationType notificationType);
    Task AddNotifications(Guid salesId, Guid salesDetailsId, Guid userId, NotificationType notificationType,
        decimal? previousTutorPayment = null, decimal? requestedTutorPayment = null);
    Task AddTutorPaymentApprovalNotification(Guid approvalId, Guid requestedBy);
    Task AddTutorPaymentDecisionNotification(Guid approvalId, Guid decidedBy);
    Task AddNotifications(Guid salesId, Guid salesDetailsId, Guid userId, NotificationType notificationType, DateTime start, DateTime end, DateTime startTime, DateTime endTime, bool timesAreLocal = false);
    Task<Response<bool>> ReadUnread(Guid notifiDetailsId, Guid userId);
    Task<StudentInfoModel> BuildStudentInfoModel(Guid salesId, Guid salesDetailsId, Guid userId, bool addTutor, bool isGroupCreation = false);
    Task AddAttendanceSubmittedNotifications(Guid salesDetailsId, Guid submittedByUserId, string guestType);
    Task AddClassCompletionThresholdNotification(MonthlyClassCompletionDto completion, decimal thresholdPercent, Guid scheduleDetailsId, Guid actingUserId);
    Task AddRescheduleRequestNotifications(Guid salesDetailsId, Guid scheduleDetailsId, Guid requestedByUserId, string guestType, string? noteText,
        string? rescheduleType = null);
    Task AddPermanentRescheduleIssueNotifications(Guid salesDetailsId, Guid scheduleDetailsId, Guid requestedByUserId, string requesterType,
        DateTime newStart, DateTime newEnd, string reason);
    Task AddScheduleChangeNotifications(Guid salesDetailsId, Guid changedByUserId, string changedByRole, string changeText);
    Task AddBusySlotRequestNotifications(Guid salesDetailsId, Guid requestedByUserId, string busyParty, DateTime start, DateTime end);
    Task AddScheduleCalendarClashNotifications(Guid salesDetailsId, Guid requestedByUserId, string requesterType,
        bool tutorBusy, bool studentBusy, DateTime start, DateTime end);
    Task AddStatusEditRequestNotifications(ClassStatusEditRequestDto request);
    Task AddStatusEditDecisionNotification(ClassStatusEditRequestDto request, Guid decidedByUserId, bool approved);
    Task AddScheduleChangeRequestNotifications(ScheduleChangeRequestDto request, Guid requestedByUserId);
    Task AddScheduleChangeDecisionNotifications(ScheduleChangeRequestDto request, Guid requestedByUserId, Guid decidedByUserId, bool approved);
    Task AddPrepaidOverrunNotifications(Guid salesId, Guid salesDetailsId, Guid actingUserId,
        string topUpInvoiceNumber, decimal topUpAmount, int remainingClasses);
    Task AddClassReminderNotifications(Guid salesId, Guid salesDetailsId, Guid actingUserId,
        DateTime scheduledStart, DateTime scheduledEnd);
    Task<bool> SendStudentRegistrationFormIfNeeded(Guid salesDetailsId, Guid requestedBy);
}
