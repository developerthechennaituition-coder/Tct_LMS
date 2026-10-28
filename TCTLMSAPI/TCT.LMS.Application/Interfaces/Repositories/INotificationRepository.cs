using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Notification;
using TCT.LMS.DTOs.Sales;
using TCT.LMS.DTOs.Wrappers;

namespace TCT.LMS.Application.Interfaces.Repositories;

public interface INotificationRepository
{
    Task<EnrolledCourse> GetNotificationByIdAsync(Guid id);
    Task<IEnumerable<Notification>> GetAllNotificationsAsync();
    Task<IEnumerable<NotificationDto>> GetNotificationByUserIdAsync(Guid userId);
    Task AddNotificationAsync(Notification notification);
    Task UpdateNotificationAsync(Notification notification);
    Task DeleteNotificationAsync(int id);
    Task<Response<bool>> ReadUnread(Guid notifiDetailsId, Guid userId);
}