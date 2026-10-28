using DocumentFormat.OpenXml.Bibliography;
using DocumentFormat.OpenXml.Spreadsheet;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;
using System.Dynamic;
using System.Security.Claims;
using System.Text;
using System.Threading;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Domain;
using TCT.LMS.Domain.Entities;
using TCT.LMS.Domain.Enums;
using TCT.LMS.DTOs.Address;
using TCT.LMS.DTOs.User;
using TCT.LMS.DTOs.Wrappers;
using TheChennaiTuitionQA.Models;

namespace TCT.LMS.Application.Services;

public class UserService : IUserService
{
    private readonly IUserRepository _repository;
    private readonly IConfiguration _configuration;
    private readonly INotificationService _notificationService;
    private readonly IMasterDetailRepository _masterDetailRepository;
    private readonly IUserRoleRepository _userRoleRepository;
    private readonly ILogger<UserService> _logger;


    public UserService(IUserRepository repository,
        IConfiguration configuration,
        INotificationService notificationService,
        IMasterDetailRepository masterDetailRepository,
        IUserRoleRepository userRoleRepository,
        ILogger<UserService> logger)
    {
        _repository = repository;
        _configuration = configuration;
        _notificationService = notificationService;
        _masterDetailRepository = masterDetailRepository;
        _userRoleRepository = userRoleRepository;
        _logger = logger;
    }

    public async Task<User> GetUserById(Guid id)
    {
        return await _repository.GetUserById(id);
    }

    public async Task<IEnumerable<UserDTO>> GetCoordinatorAdmins()
    {
        return await _repository.GetCoordinatorAdmins();
    }

    public async Task<IEnumerable<UserDTO>> GetSuperAdmins()
    {
        return await _repository.GetSuperAdmins();
    }
    public async Task<IEnumerable<UserDTO>> GetAllUser(int? roleId, string? filterText, Guid? managerId = null, IEnumerable<int>? roleIds = null, bool excludeStudentTutor = false)
    {
        return await _repository.GetAllUser(roleId, filterText, managerId, roleIds, excludeStudentTutor);
    }

    public async Task<User> AddUser(User user)
    {
        await _repository.AddUser(user);

        if ((user.Id == Guid.Empty || user?.Id == null) && user?.IsSystemUser == false)
        {
            var message = new MailMessage
            {
                Link = string.Empty,
                FromEmail = "noreply@tct.com",
                ToEmail = user.Email,
                Name = $"{user.FirstName} {user.LastName}",
                MessageType = MessageType.Registration,
                Subject = "Welcome to The Chennai Tuition Learning Management System!"
            };
            await _notificationService.SendNotificationAsync(message, CommunicationType.Email);
        }
        return user;
    }

    public async Task<User> UpdateUser(User user)
    {
        return await _repository.UpdateUser(user);
    }

    public async Task<User> UpdateConfirmEmail(string email)
    {
        return await _repository.UpdateConfirmEmail(email);
    }

    public async Task<Response<Guid>> DeleteUser(Guid id)
    {
        var result = await _repository.DeleteUser(id);
        return result;
    }

    public async Task<User> GetUserByEmail(string email, bool checkEmailConfirmed = false)
    {
        return await _repository.GetUserByEmail(email, checkEmailConfirmed);
    }
    public async Task<User> CheckEmailAlreadyExists(string email)
    {
        return await _repository.CheckEmailAlreadyExists(email);
    }

    public async Task<UserAvailabilityRequestDto> CheckDayOfWeekExits(UserAvailabilityRequestDto input)
    {
        return await _repository.CheckDayOfWeekExits(input);
    }

    public async Task<Response<UserDTO>> GetTCTUserById(Guid id)
    {
        Response<UserDTO> response = new Response<UserDTO>();
        response = await _repository.GetTCTUserById(id);
        return response;
    }
    public async Task<Response<UserDTO>> AddTCTUser(UserDTO input)
    {
        var result = await _repository.AddTCTUser(input);
        bool isNewUser = input.Id == Guid.Empty || input.Id == null;
        if (isNewUser && result?.Data?.IsSystemUser == false
            && !string.IsNullOrEmpty(result.Data.GeneratedPassword))
        {
            var message = new MailMessage
            {
                Link = string.Empty,
                FromEmail = "noreply@tct.com",
                ToEmail = input.Email,
                Name = $"{input.FirstName} {input.LastName}",
                Password = result.Data.GeneratedPassword,
                MessageType = MessageType.Registration,
                Subject = "Welcome to The Chennai Tuition Learning Management System!"
            };
            _ = _notificationService.SendNotificationAsync(message, CommunicationType.Email)
                .ContinueWith(t =>
                {
                    if (t.Exception != null)
                    {
                        _logger.LogError(t.Exception.Flatten(), "Failed to send welcome email to {Email} for new user {UserId}.", input.Email, result.Data.Id);
                    }
                }, TaskScheduler.Default);
        }

        if (isNewUser && input.ManagerId.HasValue && input.ManagerId != Guid.Empty && input.DesignationId.HasValue)
        {
            // DB lookups must be awaited here while the request-scoped DbContext is still alive;
            // only the actual SMTP send (no DbContext dependency) is safe to fire-and-forget.
            var managerMessage = await BuildEmployeeAssignedMessageAsync(input);
            if (managerMessage != null)
            {
                _ = _notificationService.SendNotificationAsync(managerMessage, CommunicationType.Email)
                    .ContinueWith(t =>
                    {
                        if (t.Exception != null)
                        {
                            _logger.LogError(t.Exception.Flatten(), "Failed to notify manager {ManagerId} of new employee {UserId}.", input.ManagerId, result?.Data?.Id);
                        }
                    }, TaskScheduler.Default);
            }
        }

        return result;
    }

    private async Task<MailMessage?> BuildEmployeeAssignedMessageAsync(UserDTO input)
    {
        var designation = await _masterDetailRepository.GetMasterDetailByIdAsync(input.DesignationId.Value);
        if (designation?.TypeCodeName?.Trim().Equals("Employee", StringComparison.OrdinalIgnoreCase) != true)
        {
            return null;
        }

        var managerRole = await _userRoleRepository.FindAsync(ur => ur.UserId == input.ManagerId.Value && ur.IsActive);
        if (managerRole != null && managerRole.RoleId == (int)UserRoleEnum.SuperAdmin)
        {
            return null;
        }

        var manager = await _repository.GetUserById(input.ManagerId.Value);
        if (manager == null || string.IsNullOrEmpty(manager.Email))
        {
            return null;
        }

        return new MailMessage
        {
            Link = string.Empty,
            FromEmail = "noreply@tct.com",
            ToEmail = manager.Email,
            Name = manager.FullName ?? $"{manager.FirstName} {manager.LastName}",
            Body = $"<strong>{input.FirstName} {input.LastName}</strong> has been added as a new employee reporting to you.",
            MessageType = MessageType.EmployeeAssigned,
            Subject = $"New Employee Assigned: {input.FirstName} {input.LastName}"
        };
    }

    public async Task UpdateUserActivity(Guid id)
    {
        await _repository.UpdateUserActivity(id);
    }

    public async Task<IEnumerable<UserActivityResponseDTO>> GetUserActivitybyId(Guid id)
    {
        return await _repository.GetUserActivitybyId(id);
    }

    public async Task<Response<UserAvailabilityRequestDto>> AddOrUpdateUserAvailability(UserAvailabilityRequestDto input)
    {
        var result = await _repository.AddOrUpdateUserAvailability(input);
        return result;
    }
    public async Task<IEnumerable<UserAvailabilityRequestDto>> GetUserAvailabilityDataByUserIdAsync(Guid userId)
    {
        var result = await _repository.GetUserAvailabilityDataByUserIdAsync(userId);

        result = result.OrderBy(d =>
                    {
                        var day = (int)Enum.Parse(typeof(DayOfWeek), d.DayOfWeek, true);
                        return day == 0 ? 7 : day; // Treat Sunday (0) as 7 to put it last
                    }).ToList();
        return result;
    }

    public async Task<List<TimeSlotsGroup>> GetOverlappingTimeSlot(Guid tutorId, Guid stdId, DateTime? date = null)
    {
        try
        {
            List<TimeSlotsGroup> timeSlotsGroups = new List<TimeSlotsGroup>();
            List<AvailableTimeSlot> output = new List<AvailableTimeSlot>();
            var tutorResult = await _repository.GetUserAvailabilityDataByUserIdAsync(tutorId);
            List<AvailableTimeSlot> tutorAvailableSlots = new List<AvailableTimeSlot>();
            foreach (var item in tutorResult)
            {
                if (!Enum.TryParse<DayOfWeek>(item.DayOfWeek, true, out _)) continue;
                tutorAvailableSlots.Add(new AvailableTimeSlot((DayOfWeek)Enum.Parse(typeof(DayOfWeek), item.DayOfWeek, true), item.StartTime, item.EndTime, item.DayOfWeek));
            }
            var stdResult = await _repository.GetUserAvailabilityDataByUserIdAsync(stdId);
            List<AvailableTimeSlot> stdAvailableSlots = new List<AvailableTimeSlot>();
            foreach (var item in stdResult)
            {
                if (!Enum.TryParse<DayOfWeek>(item.DayOfWeek, true, out _)) continue;
                stdAvailableSlots.Add(new AvailableTimeSlot((DayOfWeek)Enum.Parse(typeof(DayOfWeek), item.DayOfWeek, true), item.StartTime, item.EndTime, item.DayOfWeek));
            }

            if (date.HasValue)
            {
                tutorAvailableSlots = AvailabilityMatcher.ForDate(tutorResult, date.Value);
                stdAvailableSlots = AvailabilityMatcher.ForDate(stdResult, date.Value);
            }
            output = FindMatchingSlots(tutorAvailableSlots, stdAvailableSlots);
            output = output.OrderBy(s => s.Day).ToList();

            var groupedRecords = output.GroupBy(s => s.Day).Select(s => new TimeSlotsGroup()
            {
                DayInNo = s.Key,
                Day = s.Key.ToString(),
                TimeSlots = s.Select(t => new TimeSlot()
                {
                    StartTime1 = t.StartTime,
                    EndTime1 = t.EndTime,
                    Day = t.Day.ToString(),
                }).ToList()
            }).OrderBy(s => s.DayInNo).ToList();

            return groupedRecords;
        }
        catch (Exception ex)
        {
            throw;
        }
    }

    public async Task<UserAvailableSlotsDto> GetUserAvailableSlots(Guid userId, DateTime from, DateTime to)
    {
        var rows = await _repository.GetUserAvailabilityDataByUserIdAsync(userId);
        var booked = await _repository.GetUserBookedClassesAsync(userId, from, to);
        return new UserAvailableSlotsDto
        {
            Available = AvailabilityMatcher.Subtract(AvailabilityMatcher.ForRange(rows, from, to), booked),
            Booked = booked,
        };
    }

    public async Task<AvailabilityComparisonDto> CompareAvailability(Guid studentUserId, Guid tutorUserId, DateTime from, DateTime to)
    {
        var student = await GetUserAvailableSlots(studentUserId, from, to);
        var tutor = await GetUserAvailableSlots(tutorUserId, from, to);
        return new AvailabilityComparisonDto
        {
            Student = student,
            Tutor = tutor,
            Common = AvailabilityMatcher.Intersect(student.Available, tutor.Available),
            StudentOnly = AvailabilityMatcher.Subtract(student.Available, tutor.Available),
            TutorOnly = AvailabilityMatcher.Subtract(tutor.Available, student.Available),
        };
    }

    public async Task<UserAvailabilityRequestDto> GetUserAvailabilityDataByIdAsync(Guid id)
    {
        var result = await _repository.GetUserAvailabilityDataByIdAsync(id);
        return result;
    }

    public static List<AvailableTimeSlot> FindMatchingSlots(List<AvailableTimeSlot> tutorSlots, List<AvailableTimeSlot> studentSlots)
    {
        List<AvailableTimeSlot> matchedSlots = new List<AvailableTimeSlot>();

        // Group slots by day for efficient comparison
        var tutorGrouped = tutorSlots.GroupBy(slot => slot.Day).ToDictionary(g => g.Key, g => g.OrderBy(s => s.StartTime.TimeOfDay).ToList());
        var studentGrouped = studentSlots.GroupBy(slot => slot.Day).ToDictionary(g => g.Key, g => g.OrderBy(s => s.StartTime.TimeOfDay).ToList());

        // Iterate over available days in both schedules
        foreach (var day in tutorGrouped.Keys.Intersect(studentGrouped.Keys))
        {
            var tutorDaySlots = tutorGrouped[day];
            var studentDaySlots = studentGrouped[day];

            int i = 0, j = 0;

            while (i < tutorDaySlots.Count && j < studentDaySlots.Count)
            {
                var tutorSlot = tutorDaySlots[i];
                var studentSlot = studentDaySlots[j];

                // Compare only time portion using TimeSpan
                var tutorStart = tutorSlot.StartTime.TimeOfDay;
                var tutorEnd = tutorSlot.EndTime.TimeOfDay;

                var studentStart = studentSlot.StartTime.TimeOfDay;
                var studentEnd = studentSlot.EndTime.TimeOfDay;

                // Find overlapping time (only time portion)
                var overlapStart = tutorStart > studentStart ? tutorStart : studentStart;
                var overlapEnd = tutorEnd < studentEnd ? tutorEnd : studentEnd;

                if (overlapStart < overlapEnd)
                {
                    // Use original date from one of the slots but apply the overlapped TimeSpan
                    var overlapStartDateTime = tutorSlot.StartTime.Date.Add(overlapStart);
                    var overlapEndDateTime = tutorSlot.StartTime.Date.Add(overlapEnd);

                    matchedSlots.Add(new AvailableTimeSlot(day, overlapStartDateTime, overlapEndDateTime, day.ToString()));
                }

                // Move the pointer with the earlier end time
                if (tutorEnd < studentEnd)
                {
                    i++;
                }
                else
                {
                    j++;
                }
            }
        }

        return matchedSlots;
    }

    public async Task<bool> AddTimeSlots(UserTimeSlots input)
    {
        var result = await _repository.AddTimeSlots(input);
        return result;
    }
    public async Task<Response<List<DaySchedule>>> GetUserSlotsByDay(Guid userId, string dayOfWeek)
    {
        var result = await _repository.GetUserSlotsByDay(userId, dayOfWeek);
        return result;
    }

    public async Task<Response<bool>> UpdateTimeSlots(UserTimeSlots input)
    {
        var result = await _repository.UpdateTimeSlots(input);
        return result;
    }

    public async Task<Response<bool>> RemoveTimeSlot(RemoveSlot input)
    {
        var result = await _repository.RemoveTimeSlot(input);
        return result;
    }
}

