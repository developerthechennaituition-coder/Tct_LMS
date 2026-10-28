using System.Reflection.Metadata.Ecma335;
using TCT.LMS.Domain;

namespace TCT.LMS.DTOs.Notification;

public class NotificationDto : BaseEntity
{
    public Guid Id { get; set; }
    public Guid SalesId { get; set; }
    public Guid SalesDetailsId { get; set; }
    public Guid FromUserId { get; set; }
    public string? SourceTeam { get; set; }
    public Guid ToUserId { get; set; }
    public Guid? StudentId { get; set; }
    public Guid? TutorId { get; set; }
    public string? Message { get; set; }
    public string? Comment { get; set; }
    public int? TypeCodeValue { get; set; }
    public bool IsRead { get; set; }
    public int NotificationType { get; set; }
    public string NotificationTypeName { get; set; }
    public Guid CoorndinatorId { get; set; }
    public int? StatusTypeCode { get; set; }
    // Class the notification is about (e.g. a re-schedule request) and its scheduled start.
    public Guid? ScheduleDetailsId { get; set; }
    public DateTime? ClassStartTime { get; set; }
    // Student a "Class Completion Threshold" notification is about (links Accounts to that student).
    public string? StudentName { get; set; }
}
