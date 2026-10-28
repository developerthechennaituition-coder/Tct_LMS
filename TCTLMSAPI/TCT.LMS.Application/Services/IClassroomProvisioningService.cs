namespace TCT.LMS.Application.Services
{
    public interface IClassroomProvisioningService
    {
        Task<string?> ProvisionRoomAsync(Guid scheduleDetailsId, Guid scheduleId, Guid createdBy);
    }
}
