using Microsoft.EntityFrameworkCore;
using System;
using System.ComponentModel;
using System.Reflection;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Data.Common;
using TCT.LMS.Domain;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Notification;
using TCT.LMS.DTOs.Sales;
using TCT.LMS.DTOs.Wrappers;

namespace TCT.LMS.Infrastructure.Repositories;

public class NotificationRepository : INotificationRepository
{
    public readonly ApplicationDbContext _dbContext;

    public NotificationRepository(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<EnrolledCourse> GetNotificationByIdAsync(Guid id)
    {
        try
        {
            var query = from n in _dbContext.Notification
                        join s in _dbContext.Sales on n.SalesId equals s.Id
                        join sd in _dbContext.SalesDetails on n.SalesDetailsId equals sd.Id
                        join st in _dbContext.Student on s.StudentId equals st.Id
                        join u in _dbContext.User on st.UserId equals u.Id
                        join c in _dbContext.Type_Code on sd.SubjectId equals c.Id
                        join b in _dbContext.Type_Code on s.BoardId equals b.Id
                        join g in _dbContext.Type_Code on s.GradeId equals g.Id
                        join sa in _dbContext.Type_Code on sd.Status equals sa.Id
                        where n.Id == id
                        //&&
                        //n.IsActive == true &&
                        //s.IsActive == true &&
                        //sd.IsActive == true &&
                        //st.IsActive == true &&
                        //u.IsActive == true &&
                        //c.IsActive == true &&
                        //b.IsActive == true &&
                        //g.IsActive == true &&
                        //sa.IsActive == true
                        //join t in _dbContext.Tutor on sd.TutorId equals t.UserId into tutorGroup
                        //from t in tutorGroup.DefaultIfEmpty()
                        join tu in _dbContext.User on sd.TutorId equals tu.Id into tutorUserGroup
                        from tu in tutorUserGroup.DefaultIfEmpty()
                        select new EnrolledCourse
                        {
                            NotificationId = n.Id,
                            SalesId = n.SalesId.Value,
                            SalesDetailsId = n.SalesDetailsId.Value,
                            Message = n.Message,
                            //Comment = n.Comment,
                            StudentName = u.FirstName + " " + u.LastName,
                            TutorName = $"{tu.FirstName} {tu.LastName} [{tu.UserCode}]" ?? "Not Assigned",
                            TutorId = tu.Id,
                            SubjectName = c.TypeCodeName,
                            Board = b.TypeCodeName,
                            Grade = g.TypeCodeName,
                            StatusName = sa.TypeCodeName,
                            StatusId = sd.Status,
                            CreatedBy = n.CreatedBy,
                            //FromUserid = n.FromUserId,
                            //ToUserid = n.ToUserId,
                            DisplayColor = sa.DisplayColor,
                            TypeCodeValue = sa.TypeCodeValue,
                        };
            var result = await query.ToListAsync();
            return result.FirstOrDefault();
        }
        catch (Exception ex)
        {
            throw;
        }
    }

    public async Task<IEnumerable<NotificationDto>> GetNotificationByUserIdAsync(Guid userId)
    {
        try
        {
            var notifyResults = (from item in _dbContext.Notification
                                 join nd in _dbContext.NotificationDetails on item.Id equals nd.NotificationId
                                 where nd.ToUserId == userId && item.IsActive && nd.IsActive
                                 orderby item.CreatedDate descending
                                 select new NotificationDto()
                                 {
                                     SalesDetailsId = item.SalesDetailsId ?? Guid.Empty,
                                     CreatedDate = item.CreatedDate,
                                     SalesId = item.SalesId ?? Guid.Empty,
                                     Message = item.Message,
                                     FromUserId = nd.FromUserId,
                                     SourceTeam = (from userRole in _dbContext.UserRole
                                                   join role in _dbContext.Roles on userRole.RoleId equals role.Id
                                                   where userRole.UserId == nd.FromUserId
                                                         && userRole.IsActive && role.IsActive
                                                   orderby role.Id
                                                   select role.RoleName).FirstOrDefault(),
                                     Id = nd.Id,
                                     IsRead = nd.IsRead,
                                     NotificationTypeName = GetEnumDescription((NotificationType)item.NotificationType),
                                     NotificationType = item.NotificationType,
                                     ScheduleDetailsId = item.ScheduleDetailsId
                                 }).ToList();

            foreach (var item in notifyResults)
            {
                if (item.NotificationType == (int)NotificationType.ClassCompletionThreshold)
                {
                    item.StudentName = (from sales in _dbContext.Sales
                                        from student in _dbContext.Student
                                        from user in _dbContext.User
                                        where sales.Id == item.SalesId && student.Id == sales.StudentId && user.Id == student.UserId
                                        select user.FullName ?? (user.FirstName + " " + user.LastName)).FirstOrDefault();
                }
                if (item.NotificationType == (int)NotificationType.ClassRescheduleRequest && item.ScheduleDetailsId.HasValue)
                {
                    item.ClassStartTime = _dbContext.ScheduleDetails
                        .Where(d => d.ScheduleDetailsId == item.ScheduleDetailsId.Value)
                        .Select(d => (DateTime?)d.StartTime).FirstOrDefault();
                }

                if (item.NotificationType == (int)NotificationType.ApproveTutorAssignment)
                {
                    var sales = _dbContext.Sales.Find(item.SalesId);
                    var salesDetails = _dbContext.SalesDetails.Find(item.SalesDetailsId);
                    if (salesDetails != null)
                    {
                        item.TutorId = salesDetails.TutorId;
                        item.StudentId = sales.StudentId;
                        item.CoorndinatorId = salesDetails.Coordinator;
                    }
                }
                else if (item.NotificationType == (int)NotificationType.TutorAssigned)
                {
                    var sales = _dbContext.Sales.Find(item.SalesId);
                    var salesDetails = _dbContext.SalesDetails.Find(item.SalesDetailsId);
                    if (salesDetails != null)
                    {
                        item.StudentId = sales?.StudentId;
                        var typeCode = _dbContext.Type_Code.Find(salesDetails.Status);
                        item.StatusTypeCode = typeCode?.TypeCodeValue;
                    }
                }
                else if (item.NotificationType == (int)NotificationType.ScheduleClass ||
                         item.NotificationType == (int)NotificationType.ScheduleDemo ||
                         item.NotificationType == (int)NotificationType.ReScheduleClass ||
                         item.NotificationType == (int)NotificationType.ReScheduleDemo)
                {
                    var sales = _dbContext.Sales.Find(item.SalesId);
                    var salesDetails = _dbContext.SalesDetails.Find(item.SalesDetailsId);
                    if (salesDetails != null)
                    {
                        item.StudentId = sales?.StudentId;
                        item.TutorId = salesDetails.TutorId;
                        item.CoorndinatorId = salesDetails.Coordinator;
                    }
                }
            }

            return notifyResults;
        }
        catch (Exception ex)
        {
            return Enumerable.Empty<NotificationDto>();
        }
    }

    private static string GetEnumDescription(Enum value)
    {
        try
        {
            FieldInfo field = value.GetType().GetField(value.ToString());
            DescriptionAttribute attribute = field.GetCustomAttribute<DescriptionAttribute>();
            return attribute != null ? attribute.Description : value.ToString();
        }
        catch (Exception e)
        {
            return value.ToString();
        }
    }

    public async Task<IEnumerable<Notification>> GetAllNotificationsAsync()
    {
        return await _dbContext.Notification.ToListAsync();
    }

    public async Task AddNotificationAsync(Notification notification)
    {
        await _dbContext.Notification.AddAsync(notification);
        await _dbContext.SaveChangesAsync();
    }

    public async Task UpdateNotificationAsync(Notification notification)
    {
        _dbContext.Notification.Update(notification);
        await _dbContext.SaveChangesAsync();
    }

    public async Task DeleteNotificationAsync(int id)
    {
        var notification = await _dbContext.Notification.FindAsync(id);
        if (notification != null)
        {
            _dbContext.Notification.Remove(notification);
            await _dbContext.SaveChangesAsync();
        }
    }

    public async Task<Response<bool>> ReadUnread(Guid notifiDetailsId, Guid userId)
    {
        Response<bool> response = new Response<bool>();
        using var transaction = await _dbContext.Database.BeginTransactionAsync();
        try
        {
            var notifiDetails = await _dbContext.NotificationDetails
                .FirstOrDefaultAsync(item => item.Id == notifiDetailsId && item.ToUserId == userId);
            if (notifiDetails == null)
            {
                throw new Exception("Notificaiton not found. Please contact admin.");
            }
            notifiDetails.ModifiedBy = userId;
            notifiDetails.ModifiedDate = DateTime.UtcNow;
            notifiDetails.IsRead = true;
            _dbContext.NotificationDetails.Update(notifiDetails);
            await _dbContext.SaveChangesAsync();
            await transaction.CommitAsync();
            response.Succeeded = true;
            response.Message = "Notification successfully read.";
        }
        catch (Exception ex)
        {
            transaction.Rollback();
            throw;
        }
        return response;
    }
}
