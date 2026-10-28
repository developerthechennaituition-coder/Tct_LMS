using Microsoft.EntityFrameworkCore;
using System;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Data.Common;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Notification;
using TCT.LMS.DTOs.Sales;

namespace TCT.LMS.Infrastructure.Repositories;

public class NotificationDetailsRepository :GenericRepository<NotificationDetails>, INotificationDetailsRepository
{
    public readonly ApplicationDbContext _dbContext;

    public NotificationDetailsRepository(ApplicationDbContext dbContext):base(dbContext)
    {
        _dbContext = dbContext;
    } 
}
