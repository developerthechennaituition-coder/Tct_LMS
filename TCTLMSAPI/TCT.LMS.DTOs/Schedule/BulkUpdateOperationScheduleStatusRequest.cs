namespace TCT.LMS.DTOs.Schedule
{
    public class BulkUpdateOperationScheduleStatusRequest
    {
        public List<Guid> ScheduleDetailsIds { get; set; }
        public string OperationScheduleStatus { get; set; }
    }
}