using System;

namespace YourProject.Application.DTOs.Schedule;

public class UpdateOperationScheduleStatusRequestDto
{
    public Guid ScheduleDetailsId { get; set; }
    public Guid OperationScheduleStatus { get; set; }
}