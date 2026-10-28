using System;

namespace TCT.LMS.Domain.Entities;

/// <summary>
/// One demo status change made from My Calendar (table dbo.DemoStatusHistory, TCTDatabase/DDL/DemoStatusWorkflow.sql).
/// SalesDetails.Status keeps the current status; this table keeps every change, its follow-up range and dropout reason.
/// </summary>
public class DemoStatusHistory
{
    public Guid Id { get; set; }
    public Guid SalesDetailsId { get; set; }
    public Guid StatusId { get; set; }
    public Guid? PreviousStatusId { get; set; }
    public DateTime? FollowUpStartDate { get; set; }
    public DateTime? FollowUpEndDate { get; set; }
    /// <summary>Single "Remind Me" date (DemoStatusReminder.sql). New changes store this instead of a start/end range.</summary>
    public DateTime? ReminderDate { get; set; }
    public Guid? DropoutReasonId { get; set; }
    public Guid CreatedBy { get; set; }
    public DateTime CreatedDate { get; set; }
    public bool IsActive { get; set; }
}
