using Common;
using DocumentFormat.OpenXml.Drawing;
using DocumentFormat.OpenXml.Office2013.Drawing.TimeSlicer;
using DocumentFormat.OpenXml.Spreadsheet;
using DocumentFormat.OpenXml.Wordprocessing;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Net;
using System.Net.Mail;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Domain; 
using TCT.LMS.DTOs.DocStorage;
using TCT.LMS.DTOs.Invoice;
using TCT.LMS.DTOs.Payment;
using TCT.LMS.DTOs.Payroll;
using TCT.LMS.DTOs.Sales;
using TCT.LMS.DTOs.Schedule;
using TCT.LMS.DTOs.Tutor;
using TCT.LMS.DTOs.User;
using TCT.LMS.DTOs.Wrappers;
using TCT.LMS.DTOs.Schedule;
using static EventSlotValidator; 

namespace TCT.LMS.Application.Services
{
    public class ScheduleService : IScheduleService
    {
        private readonly IScheduleRepository _repository;
        private readonly ISalesRepository _salesRepository;
        private readonly IUserRepository _userRepository;
        private readonly IThresholdRepository _thresholdRepository;
        private readonly IMasterDetailRepository _masterDetailRepository;
        private readonly INotificationService _notificationService;
        private readonly ITutorRepository _tutorRepository;
        private readonly INotesRepository _notesRepository;
        private readonly IDocumentService _documentService;
        private readonly ICurrentUserService _currentUserService;
        private readonly string _smtpServer;
        private readonly int _smtpPort;
        private readonly string _fromEmail;
        private readonly string _fromPassword;
        private readonly string _logo;
        private readonly string _activataionLink;
        private readonly string _forgotPasswordLink;
        private readonly ICancellationPolicyService _cancellationPolicyService;
        private readonly ITutorPaySlipPdfService _tutorPaySlipPdfService;
        private readonly IClassroomProvisioningService _classroomProvisioning;
        private readonly ILogger<ScheduleService> _logger;
        public ScheduleService(IScheduleRepository scheduleRepository, ISalesRepository salesRepository, IMasterDetailRepository masterDetailRepository,
            INotificationService notificationService, IUserRepository userRepository, INotesRepository notesRepository, IDocumentService documentService,
            IConfiguration configuration, IThresholdRepository thresholdRepository, ITutorRepository tutorRepository, ICancellationPolicyService cancellationPolicyService, ICurrentUserService currentUserService, ITutorPaySlipPdfService tutorPaySlipPdfService,
            IClassroomProvisioningService classroomProvisioning, ILogger<ScheduleService> logger)
        {
            _repository = scheduleRepository;
            _salesRepository = salesRepository;
            _masterDetailRepository = masterDetailRepository;
            _notificationService = notificationService;
            _userRepository = userRepository;
            _notesRepository = notesRepository;
            _documentService = documentService;
            _thresholdRepository = thresholdRepository;
            var emailSettings = configuration.GetSection("EmailSettings");
            _smtpServer = emailSettings["SmtpServer"];
            _smtpPort = int.Parse(emailSettings["SmtpPort"]);
            _fromEmail = emailSettings["FromEmail"];
            _fromPassword = emailSettings["FromPassword"];
            _tutorRepository = tutorRepository;
            _cancellationPolicyService = cancellationPolicyService;
            _currentUserService = currentUserService;
            _tutorPaySlipPdfService = tutorPaySlipPdfService;
            _classroomProvisioning = classroomProvisioning;
            _logger = logger;
        }
        public async Task<Response<List<ScheduleDTO>>> GetAllScheduledEvents(Guid guestId, string guestType)
        {
            var result = await _repository.GetAllScheduledEvents(guestId, guestType);
            return result;
        }

        public async Task<Response<List<ScheduleDTO>>> GetScheduleDetailsById(Guid guestId, string guestType, string month, string year)
        {
            var result = await _repository.GetScheduleDetailsById(guestId, guestType, month, year);
            return result;
        }
        public async Task<bool> AddSchedule(ScheduleDTO schedule)
        {
            var result = await _repository.AddSchedule(schedule);
            return result;
        }

        private static readonly int[] CompletedClassStatusCodes =
        {
            (int)ClassStatusType.ClassCompleted, (int)ClassStatusType.ClassCompletedExtraClass,
            (int)ClassStatusType.ClassCompletedPreponed, (int)ClassStatusType.ClassCompletedPostponed,
        };

        // Threshold Configuration "ClassCompletionAlertPercent" (e.g. 90): once that share of the month's
        // classes for this student's subject is completed, notify Accounts (once per subject and month).
        private async Task NotifyAccountsIfMonthNearlyCompleteAsync(Guid scheduleDetailsId, Guid actingUserId)
        {
            var threshold = await _thresholdRepository.GetThresholdByNameAsync("ClassCompletionAlertPercent");
            if (threshold?.Value is not > 0) return;

            var completion = await _repository.GetMonthlyClassCompletionAsync(scheduleDetailsId);
            if (completion == null || completion.AlreadyNotified || completion.TotalClasses == 0) return;
            if (completion.CompletedClasses * 100m / completion.TotalClasses < threshold.Value.Value) return;

            await _notificationService.AddClassCompletionThresholdNotification(completion, threshold.Value.Value, scheduleDetailsId, actingUserId);
        }

        public async Task<Response<bool>> UpdateScheduleStatus(TCTEvent input)
        {
            var currentUser = _currentUserService.GetUser();

            // "Request for Re-schedule" chosen as Permanent by a tutor or student: the move waits for Operations'
            // approval (Schedule Calendar > Requests to approve). Checked before the status is saved.
            ScheduleChangeRequestDto? permanentRequest = null;
            var requesterType = input.GuestType?.ToLowerInvariant();
            if (string.Equals(input.RescheduleType, "Permanent", StringComparison.OrdinalIgnoreCase)
                && (requesterType == "tutor" || requesterType == "student") && input.UserId.HasValue
                && input.EventStatus.HasValue && input.EventStatus.Value != Guid.Empty
                && (await _masterDetailRepository.GetMasterDetailByIdAsync(input.EventStatus.Value))?.TypeCodeValue == (int)ClassStatusType.RequestForReschedule)
            {
                if (!input.PreferredStartTime.HasValue || !input.PreferredEndTime.HasValue)
                    return new Response<bool>("For a permanent re-schedule, click a green slot to choose the new class time.");
                var created = await _repository.CreatePermanentRescheduleRequestAsync(input.ScheduleDetailsId, input.UserId.Value, requesterType,
                    input.PreferredStartTime.Value, input.PreferredEndTime.Value);
                if (!created.Succeeded)
                {
                    // The requester sees the reason; Operations are told too, so they can arrange it.
                    if (!created.AlreadyPending && input.SalesDetailsId.HasValue)
                    {
                        try
                        {
                            await _notificationService.AddPermanentRescheduleIssueNotifications(input.SalesDetailsId.Value, input.ScheduleDetailsId,
                                input.UserId.Value, requesterType, input.PreferredStartTime.Value, input.PreferredEndTime.Value, created.Message);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Permanent re-schedule issue notification failed for ScheduleDetailsId {ScheduleDetailsId}", input.ScheduleDetailsId);
                        }
                    }
                    return new Response<bool>(created.Message);
                }
                permanentRequest = created.Request;
            }

            var result = await _repository.UpdateScheduleStatus(input);
            // result.Data is true only when the tutor's / student's status for this class actually changed,
            // so re-submitting the same attendance does not notify everyone again.
            if (result.Succeeded && result.Data && input.UserId.HasValue && input.SalesDetailsId.HasValue)
            {
                // An approved edit request allows one change; this save uses it, so the class locks again.
                if (input.GuestType == "tutor" || input.GuestType == "student")
                {
                    try
                    {
                        await _repository.MarkStatusEditRequestUsedAsync(input.ScheduleDetailsId, input.UserId.Value);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "UpdateScheduleStatus: failed to close the edit request for ScheduleDetailsId {ScheduleDetailsId}",
                            input.ScheduleDetailsId);
                    }
                }

                try
                {
                    await _notificationService.AddAttendanceSubmittedNotifications(
                        input.SalesDetailsId.Value, input.UserId.Value, input.GuestType);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex,
                        "UpdateScheduleStatus: failed to send attendance-submitted notifications for SalesDetailsId {SalesDetailsId}",
                        input.SalesDetailsId);
                }

                try
                {
                    var status = input.EventStatus.HasValue && input.EventStatus.Value != Guid.Empty
                        ? await _masterDetailRepository.GetMasterDetailByIdAsync(input.EventStatus.Value)
                        : null;
                    if (status?.TypeCodeValue == (int)ClassStatusType.RequestForReschedule)
                    {
                        if (permanentRequest != null)
                            await _notificationService.AddScheduleChangeRequestNotifications(permanentRequest, input.UserId.Value);
                        else
                            await _notificationService.AddRescheduleRequestNotifications(
                                input.SalesDetailsId.Value, input.ScheduleDetailsId, input.UserId.Value, input.GuestType, input.NoteText,
                                input.RescheduleType);
                    }
                    if (status != null && CompletedClassStatusCodes.Contains(status.TypeCodeValue))
                    {
                        await NotifyAccountsIfMonthNearlyCompleteAsync(input.ScheduleDetailsId, input.UserId.Value);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex,
                        "UpdateScheduleStatus: failed to send status notifications for ScheduleDetailsId {ScheduleDetailsId}",
                        input.ScheduleDetailsId);
                }
            }
            if (input.DocumentTypeId != Guid.Empty && input.DocumentTypeId != null)
            {
                var typeCode = await _masterDetailRepository.GetMasterDetailByIdAsync(input.DocumentTypeId.Value);
                var docResult = await _documentService.CreateDocument(new DocumentStorageDto()
                {
                    Files = input.Files,
                    Document = new DocumentDto()
                    {
                        DocumentName = typeCode.TypeCodeName,
                        DocumentTypeId = typeCode.Id,
                        DocumentDescription = typeCode.TypeCodeDescription,
                        UserId = input.UserId.Value,
                        ReferenceId = input.ScheduleDetailsId
                    }
                });
            }
            return result;
        }

        public async Task<Response<Guid>> AddOrUpdateSchedule(Schedule1Dto input)
        {
            Response<Guid> scheduleResult = new Response<Guid>();
            var isNewSchedule = input.ScheduleId == Guid.Empty;
            var isRegularClass = string.Equals(input.ScheduleType, ScheduleType.Class.ToString(), StringComparison.OrdinalIgnoreCase) ||
                                 (int.TryParse(input.ScheduleType, out var scheduleTypeCode) &&
                                  scheduleTypeCode == (int)ScheduleType.Class);

            if (isNewSchedule && isRegularClass)
            {
                if (!input.StudentId.HasValue || input.StudentId == Guid.Empty || input.SubjectId == Guid.Empty ||
                    !await _repository.HasCompletedStudentRegistration(input.StudentId.Value, input.SubjectId))
                {
                    scheduleResult.Data = Guid.Empty;
                    scheduleResult.Succeeded = false;
                    scheduleResult.Message = "The Student Registration Form must be submitted before scheduling the first class. Please ask the student or parent to complete the form.";
                    return scheduleResult;
                }
            }

            var eventList = new List<Event>();
            List<DateTime> _repeatDays = new List<DateTime>();
            input.StartDate = DateHelper.TCTConvertTimeFromUtc(input.StartDate);
            input.EndDate = DateHelper.TCTConvertTimeFromUtc(input.EndDate);

            if (input.RepeatType.ToLower() == "weekly" || input.RepeatType.ToLower() == "daily")
            {
                DayOfWeek[] repeatDays = input.WeeklyDays.Where(s => Enum.TryParse(s, out DayOfWeek result)).Select(s => (DayOfWeek)Enum.Parse(typeof(DayOfWeek), s)).ToArray();
                _repeatDays = DateHelper.FindRepeatingDays(input.StartDate, input.EndDate, repeatDays);
                if (_repeatDays.Count == 0)
                {
                    _repeatDays.Add(input.StartDate);
                }

                foreach (var item in _repeatDays)
                {
                    var _startTime = input.StartTime;
                    var _endTime = input.EndTime;
                    DateTime startDateTime = new DateTime(item.Date.Year, item.Date.Month, item.Date.Day, _startTime.Hour, _startTime.Minute, _startTime.Second);
                    DateTime endDateTime = new DateTime(item.Date.Year, item.Date.Month, item.Date.Day, _endTime.Hour, _endTime.Minute, _endTime.Second);

                    startDateTime = DateHelper.TCTConvertTimeFromUtc(startDateTime);
                    endDateTime = DateHelper.TCTConvertTimeFromUtc(endDateTime);

                    var dataSet = _repository.GetScheduledClasses(input.TutorId.Value, input.StudentId.Value, startDateTime, true);
                    if (dataSet != null)
                    {
                        eventList = new List<Event>();
                        foreach (var data in dataSet)
                        {
                            var start = data.Date.Value;
                            DateTime _startDateTime = new DateTime(start.Year, start.Month, start.Day, data.StartTime.Value.Hour, data.StartTime.Value.Minute, data.StartTime.Value.Second);
                            DateTime _endDateTime = new DateTime(start.Year, start.Month, start.Day, data.EndTime.Value.Hour, data.EndTime.Value.Minute, data.EndTime.Value.Second);
                            eventList.Add(new Event(_startDateTime, _endDateTime));
                        }
                        try
                        {
                            var valid = TryAddEvent(eventList, new Event(startDateTime, endDateTime));
                            if (!valid)
                            {
                                scheduleResult.Data = new Guid();
                                scheduleResult.Message = "The time slot is unavailable for the specified start and end times. Choose a new time, please.";
                                scheduleResult.Succeeded = false;
                                return scheduleResult;
                            }
                        }
                        catch (Exception ex)
                        {
                            scheduleResult.Data = new Guid();
                            scheduleResult.Message = ex.Message;
                            scheduleResult.Succeeded = false;
                            return scheduleResult;
                        }
                    }
                }
            }
            else
            {
                var _startTime = input.StartTime;
                var _endTime = input.EndTime;
                DateTime startDateTime = new DateTime(input.StartDate.Year, input.StartDate.Month, input.StartDate.Day, _startTime.Hour, _startTime.Minute, _startTime.Second);
                DateTime endDateTime = new DateTime(input.StartDate.Year, input.StartDate.Month, input.StartDate.Day, _endTime.Hour, _endTime.Minute, _endTime.Second);

                startDateTime = DateHelper.TCTConvertTimeFromUtc(startDateTime);
                endDateTime = DateHelper.TCTConvertTimeFromUtc(endDateTime);

                var dataSet = _repository.GetScheduledClasses(input.TutorId.Value, input.StudentId.Value, startDateTime, true);
                if (dataSet != null)
                {
                    eventList = new List<Event>();
                    foreach (var data in dataSet)
                    {
                        var start = data.Date.Value;
                        DateTime _startDateTime = new DateTime(start.Year, start.Month, start.Day, data.StartTime.Value.Hour, data.StartTime.Value.Minute, data.StartTime.Value.Second);
                        DateTime _endDateTime = new DateTime(start.Year, start.Month, start.Day, data.EndTime.Value.Hour, data.EndTime.Value.Minute, data.EndTime.Value.Second);
                        eventList.Add(new Event(_startDateTime, _endDateTime));
                    }
                    try
                    {
                        var valid = TryAddEvent(eventList, new Event(startDateTime, endDateTime));
                        if (!valid)
                        {
                            scheduleResult.Data = new Guid();
                            scheduleResult.Message = "The time slot is unavailable for the specified start and end times. Choose a new time, please.";
                            //scheduleResult.Errors.Add("The time slot is unavailable for the specified start and end times. Choose a new time, please.");
                            scheduleResult.Succeeded = false;
                            return scheduleResult;
                        }
                    }
                    catch (Exception ex)
                    {
                        scheduleResult.Data = new Guid();
                        scheduleResult.Message = ex.Message;
                        scheduleResult.Succeeded = false;
                        return scheduleResult;
                    }
                }
                //TODO: needs to revisit
                DayOfWeek[] repeatDays = input.WeeklyDays.Where(s => Enum.TryParse(s, out DayOfWeek result)).Select(s => (DayOfWeek)Enum.Parse(typeof(DayOfWeek), s)).ToArray();
                _repeatDays = DateHelper.FindRepeatingDays(input.StartDate, input.EndDate, repeatDays);
                if (_repeatDays.Count == 0)
                {
                    _repeatDays.Add(input.StartDate);
                }
            }

            if (input.ScheduleId != Guid.Empty && input.ScheduleId != null)
            {
                scheduleResult = await _repository.UpdateSchedule(input);
            }
            else
            {
                scheduleResult = await _repository.AddOrUpdateSchedule(input);
                var _typeCode = await _masterDetailRepository.GetByTypeGroupId("200");
                var typeCode = _typeCode.Where(s => s.TypeCodeValue == input.StatusCode).FirstOrDefault();
                _salesRepository.UpdateSaleDetailsStatus(input.UserId, input.SalesDetailsId.Value, typeCode.Id);
            }

            if (input.RepeatType.ToLower() == "weekly" || input.RepeatType.ToLower() == "daily")
            {
                foreach (var item in _repeatDays)
                {
                    var _startTime = input.StartTime;
                    var _endTime = input.EndTime;
                    DateTime startDateTime = new DateTime(item.Date.Year, item.Date.Month, item.Date.Day, _startTime.Hour, _startTime.Minute, _startTime.Second);
                    DateTime endDateTime = new DateTime(item.Date.Year, item.Date.Month, item.Date.Day, _endTime.Hour, _endTime.Minute, _endTime.Second);

                    startDateTime = DateHelper.TCTConvertTimeFromUtc(startDateTime);
                    endDateTime = DateHelper.TCTConvertTimeFromUtc(endDateTime);

                    await _repository.AddOrUpdateScheduleDetails(new ScheduleDetailsDto()
                    {
                        ScheduleId = scheduleResult.Data,
                        ScheduleType = input.ScheduleType,
                        TutorScheduleStatus = input.ScheduleStatus,
                        StartTime = startDateTime,
                        EndTime = endDateTime,
                        CoordiatorComment = input.Description,
                        Title = input.Title,
                        MeetingLink = input.MeetingLink,
                        CreatedBy = input.UserId,
                        Date = item
                    });
                }
            }
            else
            {
                var scheduleDate = input.StartDate;
                DateTime startDateTime = new DateTime(scheduleDate.Year, scheduleDate.Month, scheduleDate.Day, input.StartTime.Hour, input.StartTime.Minute, input.StartTime.Second);
                DateTime endDateTime = new DateTime(scheduleDate.Year, scheduleDate.Month, scheduleDate.Day, input.EndTime.Hour, input.EndTime.Minute, input.EndTime.Second);

                startDateTime = DateHelper.TCTConvertTimeFromUtc(startDateTime);
                endDateTime = DateHelper.TCTConvertTimeFromUtc(endDateTime);
                input.Date = scheduleDate;
                await _repository.AddOrUpdateScheduleDetails(new ScheduleDetailsDto()
                {
                    ScheduleId = scheduleResult.Data,
                    ScheduleType = input.ScheduleType,
                    TutorScheduleStatus = input.ScheduleStatus,
                    StartTime = startDateTime,
                    EndTime = endDateTime,
                    CoordiatorComment = input.Comment,
                    Title = input.Title,
                    MeetingLink = input.MeetingLink,
                    CreatedBy = input.UserId,
                    Date = input.Date
                });
            }
            int.TryParse(input.ScheduleType, out int scheduleType);
            if ((ScheduleType)scheduleType == ScheduleType.Demo)
            {
                await _notificationService.AddNotifications(input.SalesDetailsId.Value, input.SalesDetailsId.Value,
                     input.UserId, Domain.NotificationType.ScheduleDemo, input.StartDate, input.EndDate, input.StartTime, input.EndTime);
            }
            scheduleResult.Succeeded = true;
            return scheduleResult;
        }
        public async Task<Response<List<ScheduleDetailsDto>>> GetScheduleByTutorId(Guid tutorId)
        {
            var result = await _repository.GetScheduleByTutorId(tutorId);
            return result;
        }

        public async Task<Response<Guid>> ApproveRejectTutorSchedules(ScheduleApprovalRequest request)
        {
            var result = await _repository.ApproveRejectTutorSchedules(request);
            return result;
        }

        public async Task<Response<StudentScheduleDetailsDto>> GetScheduleBySubjectId(Guid tutorId, Guid subjectId, Guid studentId)
        {
            var result = await _repository.GetScheduleBySubjectId(tutorId, subjectId, studentId);
            return result;
        }

        public async Task<Response<List<PayrollRequestDto>>> GetTutorPayroll(string month, string year)
        {
            var result = await _repository.GetTutorPayroll(month, year);
            return result;
        }

        public async Task<Response<List<PayrollRequestDto>>> GenerateTutorPayroll(Guid tutorId)
        {
            var result = await _repository.GenerateTutorPayroll(tutorId);
            return result;
        }

        public async Task<Response<List<ScheduleDTO>>> GetStudentClasses(Guid studentId)
        {
            var result = await _repository.GetStudentClasses(studentId);
            return result;
        }

        public async Task<Response<Guid>> DeleteClass(Guid scheduleDetailsId, Guid userId)
        {
            var result = await _repository.DeleteClass(scheduleDetailsId, userId);
            return result;
        }

        public async Task<Response<Guid>> UpdateScheduleDetails(UpdateClass detailsDto)
        {

            Response<Guid> response = new Response<Guid>();
            var eventList = new List<Event>();

            if (detailsDto.StartTime != detailsDto.StartTimeOld || detailsDto.EndTime != detailsDto.EndTimeOld)
            {
                DateTime istStartDateTime = DateHelper.TCTConvertTimeFromUtc(detailsDto.StartTime.Value);
                DateTime istEndDateTime = DateHelper.TCTConvertTimeFromUtc(detailsDto.EndTime.Value);

                var dataSet = _repository.GetScheduledClasses(detailsDto.TutorId, detailsDto.StudentId, detailsDto.StartTime.Value, true);
                if (dataSet != null)
                {
                    dataSet = dataSet.Where(s => s.ScheduleDetailsId != detailsDto.ScheduleDetailsId).ToList();
                    foreach (var data in dataSet)
                    {
                        var start = data.Date.Value;
                        DateTime _startDateTime = new DateTime(start.Year, start.Month, start.Day, data.StartTime.Value.Hour, data.StartTime.Value.Minute, data.StartTime.Value.Second);
                        DateTime _endDateTime = new DateTime(start.Year, start.Month, start.Day, data.EndTime.Value.Hour, data.EndTime.Value.Minute, data.EndTime.Value.Second);
                        //_startDateTime = DateHelper.TCTConvertTimeFromUtc(_startDateTime);
                        //_endDateTime = DateHelper.TCTConvertTimeFromUtc(_endDateTime);
                        eventList.Add(new Event(_startDateTime, _endDateTime));
                    }
                    var canAdd = dataSet.Exists(s => s.ScheduleDetailsId == detailsDto.ScheduleDetailsId && s.StartTime == istStartDateTime && s.EndTime == istEndDateTime);
                    var valid = EventSlotValidator.TryAddEvent(eventList, new Event(istStartDateTime, istEndDateTime));
                    if (valid)
                    {
                        detailsDto.StartTime = istStartDateTime;
                        detailsDto.EndTime = istEndDateTime;
                    }
                    else
                    {
                        response.Message = "The time slot is unavailable for the specified start and end times. Choose a new time, please.";
                        //response.Errors.Add("The time slot is unavailable for the specified start and end times. Choose a new time, please.");
                        response.Succeeded = false;
                        return response;
                    }

                }
                detailsDto.CanUpdateDate = true;
            }
            var result = await _repository.UpdateScheduleDetails(detailsDto);
            result.Succeeded = true;
            return result;
        }

        public async Task<Response<List<TutorInvoiceDto>>> GetTutorPayrollList(Guid tutorId)
        {
            var result = await _repository.GetTutorPayrollList(tutorId);
            return result;
        }

        public async Task<Response<List<StudentInvoiceDto>>> GetStudentInvoiceList(Guid studentid)
        {
            var result = await _repository.GetStudentInvoiceList(studentid);
            return result;
        }

        public async Task<Response<List<PayrollRequestDto>>> GetTutorInvoiceById(string invoiceNumber)
        {
            var result = await _repository.GetTutorInvoiceById(invoiceNumber);
            return result;
        }
        public async Task<Response<List<PayrollRequestDto>>> GetStudentInvoiceById(string invoiceNumber)
        {
            var result = await _repository.GetStudentInvoiceById(invoiceNumber);
            return result;
        }

        public async Task<Response<bool>> RemoveSchedule(Guid scheduleId, Guid userId)
        {
            var result = await _repository.RemoveSchedule(scheduleId, userId);
            result.Succeeded = true;
            return result;
        }

        public async Task<List<TimeSlotsGroup>> GetTutorAllocatedSchedule(Guid tutorId)
        {
            var _tutor = await _tutorRepository.FindAsync(s => s.Id == tutorId);
            if (_tutor is null)
            {
                _tutor = await _tutorRepository.FindAsync(s => s.UserId == tutorId);
            }
            var tutorAvailableSlot = await _userRepository.GetUserAvailabilityDataByUserIdAsync(_tutor.UserId);
            List<TimeSlot> tutorSlots = new List<TimeSlot>();
            foreach (var item in tutorAvailableSlot)
            {
                tutorSlots.Add(new TimeSlot()
                {
                    StartTime = item.StartTime.TimeOfDay,
                    EndTime = item.EndTime.TimeOfDay,
                    Day = item.DayOfWeek
                });
            }

            // The caller may supply either Tutor.Id or Tutor.UserId. Schedule.TutorId
            // stores Tutor.Id, so always query using the resolved tutor record.
            var result = await _repository.GetTutorAllocatedSchedule(_tutor.Id);

            List<TimeSlot> classSchedules = new List<TimeSlot>();
            foreach (var item in result)
            {
                //TimeZoneInfo istTimeZone = TimeZoneInfo.FindSystemTimeZoneById("India Standard Time");
                //item.StartTime = TimeZoneInfo.ConvertTimeFromUtc(item.StartTime.Value, istTimeZone);
                //item.EndTime = TimeZoneInfo.ConvertTimeFromUtc(item.EndTime.Value, istTimeZone);
                classSchedules.Add(new TimeSlot()
                {
                    StartTime = item.StartTime.Value.TimeOfDay,
                    EndTime = item.EndTime.Value.TimeOfDay,
                    Day = item.Date.Value.DayOfWeek.ToString()
                });
            }

            var records = GetTimeSlots(tutorSlots, classSchedules).GroupBy(s => new { s.Day, s.StartTime, s.EndTime }).Select(g => g.First()).ToList();
            var groupedRecords = records.GroupBy(s => s.Day).Select(s => new TimeSlotsGroup()
            {
                DayInNo = (DayOfWeek)Enum.Parse(typeof(DayOfWeek), s.Key),
                Day = s.Key,
                TimeSlots = s.Select(s => s).ToList()
            }).OrderBy(s => s.DayInNo).ToList();

            return groupedRecords;
        }

        public async Task<List<TimeSlotsGroup>> GetStudentAllocatedSchedule(Guid userId, Guid studentId, Guid salesDetailsId)
        {
            var tutorAvailableSlot = await _userRepository.GetUserAvailabilityDataByUserIdAsync(userId);
            List<TimeSlot> tutorSlots = new List<TimeSlot>();
            foreach (var item in tutorAvailableSlot)
            {
                tutorSlots.Add(new TimeSlot()
                {
                    StartTime = item.StartTime.TimeOfDay,
                    EndTime = item.EndTime.TimeOfDay,
                    Day = item.DayOfWeek
                });
            }

            var result = await _repository.GetStudentAllocatedSchedule(studentId, salesDetailsId);

            List<TimeSlot> classSchedules = new List<TimeSlot>();
            foreach (var item in result)
            {
                classSchedules.Add(new TimeSlot()
                {
                    StartTime = item.StartTime.Value.TimeOfDay,
                    EndTime = item.EndTime.Value.TimeOfDay,
                    Day = item.Date.Value.DayOfWeek.ToString()
                });
            }

            var records = GetTimeSlots(tutorSlots, classSchedules).GroupBy(s => new { s.Day, s.StartTime, s.EndTime }).Select(g => g.First()).ToList();
            var groupedRecords = records.GroupBy(s => s.Day).Select(s => new TimeSlotsGroup()
            {
                DayInNo = (DayOfWeek)Enum.Parse(typeof(DayOfWeek), s.Key),
                Day = s.Key,
                TimeSlots = s.Select(s => s).ToList()
            }).OrderBy(s => s.DayInNo).ToList();

            return groupedRecords;
        }


        private List<TimeSlot> GetTimeSlots(List<TimeSlot> tutorSlots, List<TimeSlot> classSchedules)
        {
            List<TimeSlot> resultSlots = new List<TimeSlot>();

            foreach (var tutorSlot in tutorSlots)
            {
                TimeSpan currentStart = tutorSlot.StartTime;

                foreach (var classSlot in classSchedules.Where(cs => cs.Day == tutorSlot.Day).OrderBy(cs => cs.StartTime))
                {
                    // If class overlaps with the tutor's slot
                    if (classSlot.StartTime < tutorSlot.EndTime && classSlot.EndTime > tutorSlot.StartTime)
                    {
                        // Add available slot before the class
                        if (currentStart < classSlot.StartTime)
                        {
                            resultSlots.Add(new TimeSlot(tutorSlot.Day, currentStart, classSlot.StartTime, "success", false));
                        }
                        // Add allocated class slot
                        resultSlots.Add(new TimeSlot(tutorSlot.Day, classSlot.StartTime, classSlot.EndTime, "danger", true));

                        // Move start to end of the class
                        currentStart = classSlot.EndTime;
                    }
                }

                // Add any remaining available slot after all classes
                if (currentStart < tutorSlot.EndTime)
                {
                    resultSlots.Add(new TimeSlot(tutorSlot.Day, currentStart, tutorSlot.EndTime, "success", false));
                }
            }

            return resultSlots;
        }

        // A student asked for a time the tutor is busy (or a tutor, a time the student is busy): the class is
        // still refused, and Operations are notified. A notification failure must not hide the refusal reason.
        private async Task NotifyBusySlotRequestAsync(TimeSlotsGroup input, string busyParty, DateTime start, DateTime end)
        {
            if (!input.UserId.HasValue || input.IsReschedule || input.ScheduleType != ScheduleType.Class) return;
            try
            {
                await _notificationService.AddBusySlotRequestNotifications(input.SalesDetailsId, input.UserId.Value, busyParty, start, end);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Busy slot request notification failed for SalesDetailsId {SalesDetailsId}", input.SalesDetailsId);
            }
        }

        public async Task<Response<Guid>> ScheduleNewEvent(TimeSlotsGroup input)
        {
            var overallStopwatch = System.Diagnostics.Stopwatch.StartNew();
            try
            {
                TimeSlotsGroup timeSlotsGroup = input;
                // Browser DatePicker values arrive as UTC (for example, local midnight in
                // India is serialized as 18:30 on the previous UTC day). Normalize the
                // calendar dates once before combining them with local time slots.
                DateTime startDate = input.StartDate.Value.Kind == DateTimeKind.Utc
                    ? DateHelper.TCTConvertTimeFromUtc(input.StartDate.Value)
                    : input.StartDate.Value;
                if (input.ScheduleType != ScheduleType.Demo)
                {
                    var packageBlock = await _repository.GetPrepaidScheduleBlockReasonAsync(input.SalesDetailsId, startDate);
                    if (packageBlock != null) throw new InvalidOperationException(packageBlock);
                }
                string scheduleMode = input.ScheduleMode?.Trim() switch
                {
                    "OneTime" => "OneTime",
                    "FixedCount" => "FixedCount",
                    "Weekly" => "Weekly",
                    _ => input.IsRecurrence ? "Weekly" : "OneTime"
                };
                int? noOfMonths = input.ScheduleType == ScheduleType.Demo || scheduleMode != "Weekly"
                    ? null
                    : input.NoOfMonths ?? 10;
                if (noOfMonths.HasValue && (noOfMonths.Value < 1 || noOfMonths.Value > 10))
                    throw new ArgumentOutOfRangeException(nameof(input.NoOfMonths), "No. of months must be between 1 and 10.");
                if (scheduleMode == "FixedCount" &&
                    (!input.TotalClasses.HasValue || input.TotalClasses.Value < 1 || input.TotalClasses.Value > 500))
                    throw new ArgumentOutOfRangeException(nameof(input.TotalClasses), "Total classes must be between 1 and 500.");

                DateTime endDate = input.EndDate.HasValue
                    ? input.EndDate.Value.Kind == DateTimeKind.Utc
                        ? DateHelper.TCTConvertTimeFromUtc(input.EndDate.Value)
                        : input.EndDate.Value
                    : startDate;
                DateTime? scheduleEndDate = noOfMonths.HasValue
                    ? ScheduledPackagePeriod.EndDate(startDate, noOfMonths.Value)
                    : null;
                DateTime currentAcademicDate = DateHelper.TCTConvertTimeFromUtc(DateTime.UtcNow).Date;
                DateTime latestAcademicMonthEnd = new DateTime(currentAcademicDate.Year, currentAcademicDate.Month, 1)
                    .AddMonths(10).AddDays(-1);
                if (scheduleEndDate.HasValue &&
                    scheduleEndDate.Value.Date > latestAcademicMonthEnd)
                    throw new ArgumentException("Schedule End Date cannot exceed the end of the tenth month from today.");
                if (endDate.Date < startDate.Date)
                    throw new ArgumentException("End Date must be on or after Start Date.");
                if (input.ScheduleType == ScheduleType.Demo && endDate.Date != startDate.Date)
                    throw new ArgumentException("A demo can be scheduled on only one date.");
                if (scheduleEndDate.HasValue && endDate.Date > scheduleEndDate.Value.Date)
                    throw new ArgumentException("End Date cannot be after Schedule End Date.");
                if (scheduleMode == "FixedCount" &&
                    (endDate.Year != startDate.Year || endDate.Month != startDate.Month))
                    throw new ArgumentException("A fixed-count schedule must end within the Start Date month.");
                var eventList = new List<Event>();
                List<DateTime> _repeatDays = new List<DateTime>();
                DayOfWeek[] repeatDays = input.TimeSlotGroup.Select(s => s.DayInNo).ToArray();

                var scheduleDetailDtos = new List<ScheduleDetailsDto>();
                var groupData = input.TimeSlotGroup;
                for (int i = 0; i < groupData.Count; i++)
                {
                    _repeatDays = new List<DateTime>();
                    var record = groupData[i];
                    foreach (var slot in record.TimeSlots)
                    {
                        repeatDays = [record.DayInNo];
                        var slotDates = DateHelper.FindRepeatingDays(startDate, endDate, repeatDays);
                        _repeatDays.AddRange(slotDates);
                        foreach (var item in _repeatDays)
                        {
                            var _startTime = slot.StartTime;
                            var _endTime = slot.EndTime;

                            //// Commenting this for now and store time in IST format.

                            //TimeSpan istOffset = TimeSpan.FromHours(5.5); // UTC+5:30
                            //_startTime = _startTime - istOffset;
                            //_endTime = _endTime - istOffset;
                            //DateTime startDateTime = item.Date + _startTime;
                            //DateTime endDateTime = item.Date + _endTime;

                            //startDateTime = DateHelper.TCTConvertTimeFromUtc(startDateTime);
                            //endDateTime = DateHelper.TCTConvertTimeFromUtc(endDateTime);

                            DateTime startDateTime = item.Date + _startTime;
                            DateTime endDateTime = item.Date + _endTime;

                            scheduleDetailDtos.Add(new ScheduleDetailsDto()
                            {
                                ScheduleId = Guid.Empty,
                                ScheduleType = (input.ScheduleType).ToString(),
                                TutorScheduleStatus = input.ScheduleStatus,
                                StudentScheduleStatus = input.ScheduleStatus,
                                //Status = input.ScheduleStatus.ToString(),
                                StartTime = startDateTime,
                                EndTime = endDateTime,
                                //Comment = input.Description,
                                Title = input.Title,
                                MeetingLink = input.MeetingLink,
                                //CreatedBy = input.UserId,
                                Date = item
                            });
                        }
                    }
                    ;
                }

                scheduleDetailDtos = scheduleDetailDtos
                    .OrderBy(item => item.StartTime)
                    .ToList();

                if (scheduleDetailDtos.Count == 0)
                    throw new InvalidOperationException(
                        "No selected weekday falls between Start Date and End Date.");

                if (scheduleMode == "OneTime")
                {
                    scheduleDetailDtos = scheduleDetailDtos
                        .Where(item => item.StartTime?.Date == startDate.Date)
                        .Take(1)
                        .ToList();
                    if (scheduleDetailDtos.Count == 0)
                        throw new InvalidOperationException("No available time slot was selected for the start date.");
                }
                else if (scheduleMode == "FixedCount")
                {
                    if (scheduleDetailDtos.Count < input.TotalClasses!.Value)
                        throw new InvalidOperationException(
                            $"Only {scheduleDetailDtos.Count} matching class dates are available in the selected period. " +
                            $"Select a longer period or reduce the total classes.");

                    scheduleDetailDtos = scheduleDetailDtos.Take(input.TotalClasses.Value).ToList();
                }

                // Availability shown by the UI is only a convenience and can become stale
                // while another coordinator is scheduling. Enforce both tutor and student
                // booking conflicts on the server before creating any schedule rows.
                Guid? excludedSalesDetailsId = input.IsReschedule ? input.SalesDetailsId : null;
                var proposedEvents = new List<Event>();
                foreach (var detail in scheduleDetailDtos)
                {
                    DateTime proposedStart = detail.StartTime!.Value;
                    DateTime proposedEnd = detail.EndTime!.Value;

                    if (proposedStart >= proposedEnd)
                        throw new InvalidOperationException("The selected class end time must be after its start time.");

                    if (EventSlotValidator.IsSlotAllocated(proposedEvents, proposedStart, proposedEnd))
                        throw new InvalidOperationException(
                            $"The selected class times overlap on {proposedStart:dd MMM yyyy}.");

                    var tutorConflict = await _repository.HasTutorScheduleConflictAsync(
                        input.TutorId, proposedStart, proposedEnd, excludedSalesDetailsId);
                    if (tutorConflict)
                    {
                        await NotifyBusySlotRequestAsync(input, "tutor", proposedStart, proposedEnd);
                        throw new InvalidOperationException(
                            $"The tutor already has another class on {proposedStart:dd MMM yyyy} " +
                            $"between {proposedStart:hh:mm tt} and {proposedEnd:hh:mm tt}. Please select another time.");
                    }

                    var studentConflict = await _repository.HasStudentScheduleConflictAsync(
                        input.StudentId, proposedStart, proposedEnd, excludedSalesDetailsId);
                    if (studentConflict)
                    {
                        await NotifyBusySlotRequestAsync(input, "student", proposedStart, proposedEnd);
                        throw new InvalidOperationException(
                            $"The student already has another class on {proposedStart:dd MMM yyyy} " +
                            $"between {proposedStart:hh:mm tt} and {proposedEnd:hh:mm tt}. Please select another time.");
                    }

                    proposedEvents.Add(new Event(proposedStart, proposedEnd));
                }

                var _scheduleResult = await _repository.AddOrUpdateSchedule(new Schedule1Dto
                {
                    SalesDetailsId = input.SalesDetailsId,
                    StartDate = startDate,
                    EndDate = endDate,
                    StudentId = input.StudentId,
                    SubjectId = input.SubjectId,
                    TutorId = input.TutorId,
                    Comment = input.Comment,
                    Title = input.Title,
                    MeetingLink = input.MeetingLink,
                    NoOfMonths = noOfMonths,
                    ScheduleEndDate = scheduleEndDate,
                    ScheduleMode = scheduleMode,
                    TotalClasses = scheduleMode == "FixedCount" ? input.TotalClasses : scheduleDetailDtos.Count
                });

                foreach (var detail in scheduleDetailDtos)
                    detail.ScheduleId = _scheduleResult.Data;

                var batchResult = await _repository.AddScheduleDetailsBatchAsync(scheduleDetailDtos);
                var scheduleDetailIds = batchResult.Succeeded ? batchResult.Data : new List<Guid>();

                _logger.LogInformation(
                    "ScheduleNewEvent: inserted {Count} schedule detail rows in {ElapsedMs}ms",
                    scheduleDetailIds.Count, overallStopwatch.ElapsedMilliseconds);

                // Provision classroom rooms concurrently (best-effort, external API calls)
                // instead of one-by-one, then write back the Join URLs.
                if (scheduleDetailIds.Count > 0)
                {
                    var provisioningStopwatch = System.Diagnostics.Stopwatch.StartNew();
                    var provisioningTasks = scheduleDetailIds
                        .Select(detailId => _classroomProvisioning.ProvisionRoomAsync(
                            detailId, _scheduleResult.Data, input.UserId ?? Guid.Empty))
                        .ToArray();
                    var joinUrls = await Task.WhenAll(provisioningTasks);

                    _logger.LogInformation(
                        "ScheduleNewEvent: provisioned {Count} classroom rooms concurrently in {ElapsedMs}ms",
                        scheduleDetailIds.Count, provisioningStopwatch.ElapsedMilliseconds);

                    for (int i = 0; i < scheduleDetailIds.Count; i++)
                    {
                        if (joinUrls[i] != null)
                            await _repository.UpdateMeetingLinkAsync(scheduleDetailIds[i], joinUrls[i]);
                    }
                }

                var _typeCode = await _masterDetailRepository.GetByTypeGroupId("200");
                var typeCodeId = Guid.Empty;
                if (!input.IsReschedule)
                {
                    if (input.ScheduleType == ScheduleType.Class)
                    {
                        typeCodeId = _typeCode.Where(s => s.TypeCodeValue == (int)FollowUpStatus.Schedule).FirstOrDefault().Id;
                        await _notificationService.AddNotifications(input.SalesId, input.SalesDetailsId,
                             input.UserId.Value, Domain.NotificationType.ScheduleClass, input.StartDate.Value, endDate, input.StartDate.Value, endDate);
                    }
                    else
                    {
                        typeCodeId = _typeCode.Where(s => s.TypeCodeValue == (int)FollowUpStatus.DemoScheduled).FirstOrDefault().Id;

                        var firstDemoOccurrence = scheduleDetailDtos.OrderBy(item => item.StartTime).First();
                        DateTime startTime = firstDemoOccurrence.StartTime.Value;
                        DateTime endTime = firstDemoOccurrence.EndTime.Value;
                        await _notificationService.AddNotifications(input.SalesId, input.SalesDetailsId,
                            input.UserId.Value, Domain.NotificationType.ScheduleDemo, startTime.Date, endTime.Date,
                            startTime, endTime, timesAreLocal: true);
                    }

                    await _salesRepository.UpdateSaleDetailsStatus(input.UserId.Value, input.SalesDetailsId, typeCodeId);
                }
                else
                {
                    if (input.ScheduleType == ScheduleType.Class)
                    {
                        typeCodeId = _typeCode.Where(s => s.TypeCodeValue == (int)FollowUpStatus.ClassReScheduled).FirstOrDefault().Id;
                        await _notificationService.AddNotifications(input.SalesId, input.SalesDetailsId,
                             input.UserId.Value, Domain.NotificationType.ReScheduleClass, input.StartDate.Value, endDate, input.StartDate.Value, endDate);
                    }
                    else
                    {
                        typeCodeId = _typeCode.Where(s => s.TypeCodeValue == (int)FollowUpStatus.ReScheduledDemo).FirstOrDefault().Id;

                        var firstDemoOccurrence = scheduleDetailDtos.OrderBy(item => item.StartTime).First();
                        DateTime startTime = firstDemoOccurrence.StartTime.Value;
                        DateTime endTime = firstDemoOccurrence.EndTime.Value;
                        await _notificationService.AddNotifications(input.SalesId, input.SalesDetailsId,
                            input.UserId.Value, Domain.NotificationType.ReScheduleDemo, startTime.Date, endTime.Date,
                            startTime, endTime, timesAreLocal: true);
                    }
                    await _salesRepository.UpdateSaleDetailsStatus(input.UserId.Value, input.SalesDetailsId, typeCodeId);
                }
                if (!input.IsReschedule && input.ScheduleType == ScheduleType.Class && scheduleDetailIds.Count > 0)
                {
                    try
                    {
                        await _notificationService.SendStudentRegistrationFormIfNeeded(
                            input.SalesDetailsId, input.UserId ?? Guid.Empty);
                    }
                    catch (Exception emailError)
                    {
                        // The class is already saved; an email failure must not make the
                        // coordinator retry and accidentally create duplicate classes.
                        _logger.LogError(emailError,
                            "Regular class saved but registration email failed for SalesDetailsId {SalesDetailsId}",
                            input.SalesDetailsId);
                    }

                    // A subject's first regular classes after its demo: bill the first month in advance.
                    // Created unsent; Accounts send it. A failure here never affects the saved classes.
                    try
                    {
                        var advanceInvoice = await _repository.CreateAdvanceInvoiceIfFirstClassesAsync(
                            _scheduleResult.Data, input.UserId ?? Guid.Empty);
                        if (advanceInvoice != null)
                            _logger.LogInformation("Advance invoice {InvoiceNumber} created for SalesDetailsId {SalesDetailsId}",
                                advanceInvoice, input.SalesDetailsId);
                    }
                    catch (Exception invoiceError)
                    {
                        _logger.LogError(invoiceError,
                            "Regular class saved but advance invoice failed for SalesDetailsId {SalesDetailsId}",
                            input.SalesDetailsId);
                    }
                }
                _logger.LogInformation(
                    "ScheduleNewEvent: total time {ElapsedMs}ms for ScheduleId {ScheduleId}",
                    overallStopwatch.ElapsedMilliseconds, _scheduleResult.Data);
                return new Response<Guid>(_scheduleResult.Data, "Class scheduled successfully.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "ScheduleNewEvent: failed after {ElapsedMs}ms", overallStopwatch.ElapsedMilliseconds);
                throw;
            }
        }

        public Task<List<ClassCompletionRowDto>> GetClassCompletionListAsync(int month, int year)
            => _repository.GetClassCompletionListAsync(month, year);

        public async Task<List<AccountsInvoiceSummaryDto>> GetStudentSchedulesAsync(Guid studentId, int month, int year)
        {
            return await _repository.GetStudentSchedulesAsync(studentId, month, year);
        }

        public async Task<CreateInvoiceResponse> CreateStudentInvoiceAsync(CreateInvoiceRequest request)
        {
            try
            {
                var summary = await _repository.GetStudentSchedulesAsync(request.StudentId, request.Month, request.Year);
                PackageBillingGuard.RequireConfirmedPlans(summary);
                var plans = await _repository.GetPaymentPlansByStudentIdAsync(request.StudentId);
                var invoiceMonth = new DateTime(request.Year, request.Month, 1);
                var applicablePlans = plans.Where(plan => invoiceMonth >= new DateTime(plan.StartYear, plan.StartMonth, 1)
                    && invoiceMonth < new DateTime(plan.StartYear, plan.StartMonth, 1).AddMonths(plan.PlanMonths)).ToList();
                if (applicablePlans.Count > 0)
                {
                    CreateInvoiceResponse prepaid;
                    if (applicablePlans.Any(plan => string.IsNullOrWhiteSpace(plan.UpfrontInvoiceNumber)))
                        prepaid = await CreatePrepaidUpfrontInvoiceAsync(request.StudentId, request.CreatedBy);
                    else
                        prepaid = await CreatePrepaidStatementInvoiceAsync(request.StudentId, request.Month, request.Year, request.CreatedBy);
                    if (!prepaid.Success) return prepaid;
                    var monthSubjects = summary;
                    if (monthSubjects.Any(subject => !applicablePlans.Any(plan => plan.SalesDetailsId == subject.SalesDetailsId)))
                    {
                        var monthlyInvoice = await _repository.CreateInvoiceWithDetailsAsync(request.StudentId, request.Month, request.Year, request.CreatedBy);
                        prepaid.Message += $" Monthly-billed subjects are on invoice {monthlyInvoice}.";
                    }
                    return prepaid;
                }
                var invoiceNumber = await _repository.CreateInvoiceWithDetailsAsync(
                                    request.StudentId,
                                    request.Month,
                                    request.Year,
                                    request.CreatedBy);

                return new CreateInvoiceResponse
                {
                    Success = true,
                    Message = "Invoice created successfully.",
                    InvoiceNumber = invoiceNumber
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "CreateStudentInvoice failed for StudentId {StudentId}, Month {Month}, Year {Year}",
                    request.StudentId, request.Month, request.Year);
                var message = ex is InvalidOperationException
                    ? ex.Message
                    : "Failed to create invoice. Please contact support with the student and invoice month.";
                return new CreateInvoiceResponse
                {
                    Success = false,
                    Message = message,
                    Errors = { message }
                };
            }
        }

        public Task<List<AdvanceInvoiceDto>> GetAdvanceInvoicesAsync(Guid studentId) =>
            _repository.GetAdvanceInvoicesAsync(studentId);

        public Task<AdvanceInvoiceSendResultDto> SendAdvanceInvoiceAsync(string invoiceNumber) =>
            _repository.SendAdvanceInvoiceAsync(invoiceNumber);

        // Prepaid v2 — Phase 2: raise the single upfront full-period invoice (all subjects as
        // line items) for a student's active prepaid plan(s). Idempotent per plan.
        public async Task<CreateInvoiceResponse> CreatePrepaidUpfrontInvoiceAsync(Guid studentId, Guid createdBy)
        {
            try
            {
                var invoiceNumber = await _repository.CreatePrepaidUpfrontInvoiceAsync(studentId, createdBy);

                return new CreateInvoiceResponse
                {
                    Success = true,
                    Message = "Upfront prepaid invoice created successfully.",
                    InvoiceNumber = invoiceNumber
                };
            }
            catch (Exception ex)
            {
                return new CreateInvoiceResponse
                {
                    Success = false,
                    Message = ex is InvalidOperationException ? ex.Message : "Failed to create upfront prepaid invoice.",
                    Errors = { ex.Message }
                };
            }
        }

        // Prepaid v2 — Phase 3: raise the informational monthly statement for a prepaid student.
        public async Task<CreateInvoiceResponse> CreatePrepaidStatementInvoiceAsync(Guid studentId, int month, int year, Guid createdBy)
        {
            try
            {
                var invoiceNumber = await _repository.CreatePrepaidStatementInvoiceAsync(studentId, month, year, createdBy);

                // Refresh the exhausted-package flag; this check never bills future classes.
                try { await ProcessPrepaidOverrunAsync(studentId, createdBy); }
                catch (Exception ex) { _logger?.LogError(ex, "Overrun check after statement failed for student {StudentId}.", studentId); }

                return new CreateInvoiceResponse
                {
                    Success = true,
                    Message = "Monthly package check completed. Only completed classes beyond the package total are charged.",
                    InvoiceNumber = invoiceNumber
                };
            }
            catch (Exception ex)
            {
                return new CreateInvoiceResponse
                {
                    Success = false,
                    Message = ex is InvalidOperationException ? ex.Message : "Failed to create monthly statement.",
                    Errors = { ex.Message }
                };
            }
        }

        // Prepaid v2 — Phase 4: detect early credit exhaustion, raise top-up + block, and notify roles.
        public async Task<Response<List<OverrunResultDto>>> ProcessPrepaidOverrunAsync(Guid studentId, Guid createdBy)
        {
            try
            {
                var overruns = await _repository.DetectAndRaiseOverrunAsync(studentId, createdBy);
                foreach (var o in overruns)
                {
                    try
                    {
                        await _notificationService.AddPrepaidOverrunNotifications(
                            o.SalesId, o.SalesDetailsId, createdBy, o.TopUpInvoiceNumber, o.TopUpAmount, o.RemainingClasses);
                    }
                    catch (Exception ex)
                    {
                        _logger?.LogError(ex, "Overrun notification failed for salesDetails {Id}.", o.SalesDetailsId);
                    }
                }
                return new Response<List<OverrunResultDto>>(overruns,
                    "Package usage checked. Review the remaining classes and blocked status; use monthly reconciliation to invoice completed extras.");
            }
            catch (Exception ex)
            {
                return new Response<List<OverrunResultDto>> { Succeeded = false, Message = ex.Message };
            }
        }

        // Prepaid v2 — Phase 5: SalesDetails ids whose plan is blocked (for calendar freeze).
        public async Task<List<Guid>> GetBlockedSalesDetailsIdsAsync()
        {
            return await _repository.GetBlockedSalesDetailsIdsAsync();
        }

        private async Task<bool> SendStudentInvoiceMail(Response<List<StudentInvoiceViewModel>> response)
        {
            var data = response.Data;
            var invoiceBodyContent = await GenerateStudentInvoiceHTMLContent(response);
            string result = null;
            bool isMailSent = false;
            using (var mailMessage = new System.Net.Mail.MailMessage())
            {
                mailMessage.From = new MailAddress("noreply@tct.com");
                mailMessage.To.Add(new MailAddress("manikandan14@gmail.com"));//data.ParentEmail
                mailMessage.Subject = $"Invoice for the month {data[0].MonthName} for {data[0].Subject}";
                mailMessage.Body = invoiceBodyContent;
                mailMessage.IsBodyHtml = true;

                //string logoPath = _logo;
                using (var client = new SmtpClient(_smtpServer, _smtpPort))
                {
                    client.UseDefaultCredentials = false;
                    client.Credentials = new NetworkCredential(_fromEmail, _fromPassword);
                    client.EnableSsl = true;

                    try
                    {
                        await client.SendMailAsync(mailMessage);
                        result = "Email sent successfully.";
                        isMailSent = true;
                    }
                    catch (Exception ex)
                    {
                        result = $"Failed to send email. Error: {ex.Message}";
                        throw;
                    }
                }
            }
            return isMailSent;
        }

        public async Task<Response<List<StudentInvoiceViewModel>>> GetStudentInvoiceDetailsByNumberAsync(string invoiceNumber)
        {
            if (string.IsNullOrWhiteSpace(invoiceNumber))
                throw new ArgumentException("Invoice number cannot be null or empty", nameof(invoiceNumber));

            return await _repository.GetStudentInvoiceDetailsByNumberAsync(invoiceNumber);
        }

        public async Task<StudentScheduleSummaryResponseDto> GetStudentScheduleSummaryAsync(Guid userId)
        {
            //return await _repository.GetStudentScheduleSummaryAsync(userId);
            try
            {
                var data = await _repository.GetStudentScheduleSummaryAsync(userId);
                return data;
            }
            catch (Exception ex)
            {
                return null;
                //_logger.LogError(ex, "Error in GetStudentScheduleSummary");
                //return StatusCode(500, "Internal error");
            }
        }

        public Task<Response<ScheduleDetailsDto>> GetScheduleDetailsById(Guid scheduleDetailsId)
        {
            var result = _repository.GetScheduleDetailsById(scheduleDetailsId);
            return result;
        }

        public async Task<Response<bool>> UpdateScheduleDetail(TCTEvent inputData)
        {
            var result = await _repository.UpdateScheduleDetails(inputData);
            return result;
        }

        private string GenerateInvoiceHtml(Response<List<StudentInvoiceViewModel>> result)
        {
            try
            {
                // Add null checks and validation
                if (result == null)
                {
                    throw new ArgumentNullException(nameof(result), "Result task is null");
                }

                if (result.Data == null)
                {
                    throw new InvalidOperationException("Result.Result is null - task may not have completed successfully");
                }

                if (result.Data == null)
                {
                    throw new InvalidOperationException("Result.Result.Data is null");
                }

                if (result.Data.Count == 0)
                {
                    throw new InvalidOperationException("Result.Result.Data is empty - no invoice data available");
                }

                var data = result.Data[0];

                // Add null check for data object
                if (data == null)
                {
                    throw new InvalidOperationException("First data item is null");
                }

                // Validate critical properties (add null checks for properties that might be null)
                var studentName = data.StudentName ?? "N/A";
                var invoiceNumber = data.InvoiceNumber ?? "N/A";
                var startDate = data.StartDate;
                var dueDate = data.DueDate;
                var subject = data.Subject ?? "N/A";
                var monthName = data.MonthName ?? "N/A";
                var year = data.Year.ToString() ?? "N/A";

                // Handle potential null values for numeric properties
                var totalInvoiceAmount = data.TotalInvoiceAmount.Value;
                var numberOfClasses = data.NumberOfClasses;
                var previousMonthPendingClasses = data.PreviousMonthPendingClasses;
                var previousMonthTotalClasses = data.PreviousMonthTotalClasses;
                var parentPayment = data.ParentPayment;

                // Format currency with null checks
                string formattedTotalAmount;
                string formattedParentPayment;

                try
                {
                    formattedTotalAmount = totalInvoiceAmount.ToString("N", new CultureInfo("en-IN"));
                    formattedParentPayment = string.Format(new CultureInfo("en-IN"), "{0:C}", parentPayment);
                }
                catch (Exception formatEx)
                {
                    throw new InvalidOperationException($"Error formatting currency values: {formatEx.Message}", formatEx);
                }

                return $@"
<!DOCTYPE html>
<html lang=""en"">
<head>
    <meta charset=""UTF-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>TCT Invoice</title>
    <style>
        /* Keep minimal CSS for print optimization only */
        @page {{
            size: A4;
            margin: 12mm;
        }}
        
        @media print {{
            body {{ 
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }}
            
            .email-section {{
                display: none;
            }}
            
            * {{
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }}
        }}
    </style>
</head>
<body style=""font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f7fafc; font-size: 12px; line-height: 1.4; color: #333;"">
    
    <!-- EMAIL SECTION -->
    <div class=""email-section"" style=""background-color: #f7fafc; padding: 20px;"">
        <div style=""max-width: 800px; margin: 0 auto 40px auto; background-color: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden;"">
            <div style=""background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%); color: white; padding: 20px; text-align: center; font-size: 24px; font-weight: bold;"">
                The Chennai Tuition
            </div>
            <div style=""padding: 30px; line-height: 1.6; color: #333; background-color: #f0fff4;"">
                <div style=""font-size: 16px; margin-bottom: 20px;"">Dear {studentName},</div>
                
                <div style=""padding: 15px; margin: 20px 0; background-color: #e6fffa; border: 1px solid #38b2ac; border-radius: 6px; font-weight: bold;"">
                    <strong>Invoice Ready!</strong> Your invoice for <strong>The Chennai Tuition</strong> services has been generated and is ready for your review.
                </div>
                
                <div style=""margin-bottom: 20px; text-align: justify;"">
                    We hope you're enjoying your learning experience with us. Please find below the details of your current invoice:
                </div>
                
                <div style=""background-color: #f7fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 6px; margin: 20px 0;"">
                    <div style=""display: flex; justify-content: space-between; margin-bottom: 8px; padding: 5px 0; border-bottom: 1px solid #e2e8f0;"">
                        <span style=""font-weight: bold; color: #4a5568;"">Invoice Number:</span>
                        <span style=""color: #2d3748; background-color: #bee3f8; padding: 2px 4px; border-radius: 3px; font-weight: bold;"">{invoiceNumber}</span>
                    </div>
                    <div style=""display: flex; justify-content: space-between; margin-bottom: 8px; padding: 5px 0; border-bottom: 1px solid #e2e8f0;"">
                        <span style=""font-weight: bold; color: #4a5568;"">Invoice Date:</span>
                        <span style=""color: #2d3748;"">{startDate}</span>
                    </div>
                    <div style=""display: flex; justify-content: space-between; margin-bottom: 8px; padding: 5px 0; border-bottom: 1px solid #e2e8f0;"">
                        <span style=""font-weight: bold; color: #4a5568;"">Due Date:</span>
                        <span style=""color: #2d3748;"">{dueDate}</span>
                    </div>
                    <div style=""display: flex; justify-content: space-between; margin-bottom: 8px; padding: 5px 0; border-bottom: 1px solid #e2e8f0;"">
                        <span style=""font-weight: bold; color: #4a5568;"">Subject:</span>
                        <span style=""color: #2d3748;"">{subject}</span>
                    </div>
                    <div style=""display: flex; justify-content: space-between; margin-bottom: 8px; padding: 5px 0; border-bottom: 1px solid #e2e8f0;"">
                        <span style=""font-weight: bold; color: #4a5568;"">Period:</span>
                        <span style=""color: #2d3748;"">{monthName} - {year}</span>
                    </div>
                    <div style=""display: flex; justify-content: space-between; border-bottom: none; font-weight: bold; background-color: #c6f6d5; padding: 10px; border-radius: 4px; margin-top: 10px;"">
                        <span style=""font-weight: bold; color: #4a5568;"">Total Amount:</span>
                        <span style=""color: #2d3748;"">₹{formattedTotalAmount}</span>
                    </div>
                </div>
                
                <div style=""background-color: #fef5e7; border: 1px solid #f6ad55; padding: 15px; border-radius: 6px; margin: 20px 0; text-align: center;"">
                    <strong>📎 Invoice Details Below:</strong> Please find the detailed invoice below for your reference.
                </div>
                
                <div style=""background-color: #ebf8ff; border: 1px solid #81e6d9; padding: 15px; border-radius: 6px; margin: 20px 0;"">
                    <strong>Payment Instructions:</strong><br>
                    Please review the invoice below and make the payment by the due date mentioned. You can make payments through:
                    
                    <div style=""margin: 10px 0; padding-left: 20px;"">
                        • Online payment portal<br>
                        • Bank transfer<br>
                        • Cash payment at our center
                    </div>
                    
                    <em>For any payment queries, please contact our accounts team.</em>
                </div>
                
                <div style=""margin-bottom: 20px; text-align: justify;"">
                    If you have any questions about this invoice or need clarification on any charges, please don't hesitate to contact us. We're here to help!
                </div>
                
                <div style=""margin-bottom: 20px; text-align: justify;"">
                    Thank you for choosing The Chennai Tuition for your educational needs.
                </div>
                
                <div style=""margin-top: 30px;"">
                    <div>Best regards,</div>
                    <div style=""margin-top: 20px; font-weight: bold;"">
                        The Chennai Tuition<br>
                        Accounts Department
                    </div>
                </div>
                
                <div style=""background-color: #f7fafc; padding: 15px; border-radius: 6px; margin-top: 20px; font-size: 12px; color: #718096; text-align: center;"">
                    This is an automated email. Please do not reply to this email address.<br>
                    For support, contact us at: {data.Email ?? "support@thechennai-tuition.com"} | Phone: {data.Phone ?? "+91-XXXX-XXXXX"}
                </div>
            </div>
        </div>
    </div>

    <!-- INVOICE SECTION -->
    <div style=""background: #fff; padding: 20px;"">
        <div style=""width: 100%; max-width: 210mm; margin: 0 auto; background: white;"">
            
            <!-- Invoice Header -->
            <div style=""text-align: center; margin-bottom: 30px;"">
                <div style=""font-size: 32px; font-weight: bold; color: #333; margin-bottom: 5px;"">INVOICE</div>
                <div style=""font-size: 18px; color: #7CB342; font-weight: 600; letter-spacing: 1px;"">THE CHENNAI TUITION</div>
            </div>

            <!-- Invoice Info Section -->
            <table style=""width: 100%; margin-bottom: 30px;"" cellpadding=""0"" cellspacing=""0"">
                <tr>
                    <td style=""width: 50%;""></td>
                    <td style=""width: 50%;"">
                        <table style=""width: 100%; font-size: 11px;"" cellpadding=""0"" cellspacing=""0"">
                            <tr>
                                <td style=""color: #666; font-weight: normal; padding: 4px 0; text-align: right; padding-right: 20px;"">INVOICE #</td>
                                <td style=""color: #333; font-weight: 600; padding: 4px 0; text-align: right;"">{invoiceNumber}</td>
                            </tr>
                            <tr>
                                <td style=""color: #666; font-weight: normal; padding: 4px 0; text-align: right; padding-right: 20px;"">START DATE</td>
                                <td style=""color: #333; font-weight: 600; padding: 4px 0; text-align: right;"">{startDate}</td>
                            </tr>
                            <tr>
                                <td style=""color: #666; font-weight: normal; padding: 4px 0; text-align: right; padding-right: 20px;"">DUE DATE</td>
                                <td style=""color: #333; font-weight: 600; padding: 4px 0; text-align: right;"">{dueDate}</td>
                            </tr>
                            <tr>
                                <td style=""color: #666; font-weight: normal; padding: 4px 0; text-align: right; padding-right: 20px;"">Department</td>
                                <td style=""color: #333; font-weight: 600; padding: 4px 0; text-align: right;"">TCT - ACCOUNTS</td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>

            <!-- Billing Section -->
            <table style=""width: 100%; margin-bottom: 30px;"" cellpadding=""0"" cellspacing=""0"">
                <tr>
                    <td style=""width: 45%; background: #f8f9fa; padding: 20px; border-radius: 4px; vertical-align: top;"">
                        <div style=""color: #7CB342; font-weight: 600; font-size: 14px; margin-bottom: 15px;"">Billed By</div>
                        <div style=""color: #333; line-height: 1.6; font-size: 11px;"">
                            <strong>{data.Title ?? "The Chennai Tuition"}</strong><br/>
                            {data.Address1 ?? "Address Line 1"}<br/>
                            {data.Address2 ?? "Address Line 2"}<br/>
                            {data.City ?? "Chennai"},<br/>
                            {data.State ?? "Tamil Nadu"}, {data.Country ?? "India"} - {data.Zip ?? "600001"}<br/>
                            <strong>GSTIN:</strong> {data.GSTIN ?? "N/A"}<br/>
                            <strong>PAN:</strong> {data.PAN ?? "N/A"}<br/>
                            <strong>Email:</strong> {data.Email ?? "N/A"}<br/>
                            <strong>Phone:</strong> {data.Phone ?? "N/A"}
                        </div>
                    </td>
                    <td style=""width: 10%;""></td>
                    <td style=""width: 45%; background: #f8f9fa; padding: 20px; border-radius: 4px; vertical-align: top;"">
                        <div style=""color: #7CB342; font-weight: 600; font-size: 14px; margin-bottom: 15px;"">Billed To</div>
                        <div style=""color: #333; line-height: 1.6; font-size: 11px;"">
                            <strong>{data.ParentName ?? "N/A"}</strong><br/>
                            {data.Location ?? "N/A"}
                        </div>
                    </td>
                </tr>
            </table>

            <!-- Items Table -->
            <table style=""width: 100%; border-collapse: collapse; margin-bottom: 20px;"" cellpadding=""0"" cellspacing=""0"">
                <thead>
                    <tr style=""background: #7CB342; color: white;"">
                        <th style=""padding: 15px 12px; font-weight: 600; font-size: 12px; text-align: left;"">Item</th>
                        <th style=""padding: 15px 12px; font-weight: 600; font-size: 12px; text-align: center;"">Quantity</th>
                        <th style=""padding: 15px 12px; font-weight: 600; font-size: 12px; text-align: right;"">Rate</th>
                        <th style=""padding: 15px 12px; font-weight: 600; font-size: 12px; text-align: right;"">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style=""border-bottom: 1px solid #e9ecef;"">
                        <td style=""padding: 15px 12px; vertical-align: top; font-size: 11px;"">
                            <div style=""color: #666; font-weight: 600;"">1.</div>
                            <div style=""font-weight: 600; color: #333; margin-bottom: 8px; font-size: 12px;"">{monthName.ToUpper()} MONTH FEES DETAILS</div>
                            <div style=""color: #666; line-height: 1.5;"">
                                {(data.PreviousMonthPendingClassesMonthYear ?? monthName).ToUpper()} Month billed classes= {previousMonthTotalClasses} classes<br/>
                                {(data.PreviousMonthPendingClassesMonthYear ?? monthName).ToUpper()} month classes completed= {previousMonthTotalClasses - previousMonthPendingClasses} classes<br/>
                                {monthName.ToUpper()} Month as per schedule= {numberOfClasses} classes<br/>
                                Difference Billing Amount in {monthName.ToUpper()} = {numberOfClasses + previousMonthPendingClasses} classes
                            </div>
                        </td>
                        <td style=""padding: 15px 12px; vertical-align: top; font-size: 11px; text-align: center;"">{numberOfClasses + previousMonthPendingClasses}</td>
                        <td style=""padding: 15px 12px; vertical-align: top; font-size: 11px; text-align: right;"">₹{formattedParentPayment}</td>
                        <td style=""padding: 15px 12px; vertical-align: top; font-size: 11px; text-align: right;""><strong>₹{formattedTotalAmount}</strong></td>
                    </tr>
                </tbody>
            </table>

            <!-- Total in Words -->
            <div style=""background: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 30px; font-size: 11px; color: #666; border: 1px solid #ddd; text-align: center; font-weight: bold;"">
                <strong>Total (in words): {data.AmountInWords ?? "N/A"}</strong>
            </div>

            <!-- Bank Details & Total Amount -->
            <table style=""width: 100%; margin-bottom: 30px;"" cellpadding=""0"" cellspacing=""0"">
                <tr>
                    <td style=""width: 60%; background: #f8f9fa; padding: 20px; border-radius: 4px; vertical-align: top;"">
                        <div style=""color: #7CB342; font-weight: 600; font-size: 14px; margin-bottom: 15px;"">Bank Details</div>
                        <div style=""font-size: 11px; line-height: 1.8;"">
                            <table style=""width: 100%;"" cellpadding=""0"" cellspacing=""0"">
                                <tr>
                                    <td style=""font-weight: 600; color: #333; width: 120px; padding: 3px 0;"">Account Name</td>
                                    <td style=""color: #666; padding: 3px 0;"">{data.AccountName ?? "N/A"}</td>
                                </tr>
                                <tr>
                                    <td style=""font-weight: 600; color: #333; width: 120px; padding: 3px 0;"">Account Number</td>
                                    <td style=""color: #666; padding: 3px 0;"">{data.AccountNumber ?? "N/A"}</td>
                                </tr>
                                <tr>
                                    <td style=""font-weight: 600; color: #333; width: 120px; padding: 3px 0;"">IFSC</td>
                                    <td style=""color: #666; padding: 3px 0;"">{data.IFSCCode ?? "N/A"}</td>
                                </tr>
                                <tr>
                                    <td style=""font-weight: 600; color: #333; width: 120px; padding: 3px 0;"">Account Type</td>
                                    <td style=""color: #666; padding: 3px 0;"">{data.AccountType ?? "N/A"}</td>
                                </tr>
                                <tr>
                                    <td style=""font-weight: 600; color: #333; width: 120px; padding: 3px 0;"">Bank</td>
                                    <td style=""color: #666; padding: 3px 0;"">{data.BankName ?? "N/A"}</td>
                                </tr>
                            </table>
                        </div>
                    </td>
                    <td style=""width: 10%;""></td>
                    <td style=""width: 30%; vertical-align: top;"">
                        <div style=""background: #7CB342; color: white; padding: 20px; border-radius: 4px; text-align: center; border: 2px solid #7CB342; margin-bottom: 20px;"">
                            <div style=""font-size: 20px; font-weight: 600;"">Total (INR) ₹{formattedTotalAmount}</div>
                        </div>
                        
                        <div style=""text-align: center;"">
                            <div style=""width:90px;height:90px;border:2px solid #7cb342;border-radius:50%;display:inline-flex;color:#7cb342;font-size:10px;font-weight:600;text-align:center;line-height:1.2;margin-bottom:15px;align-items: center;justify-content: center"">
                                TCT<br/>
                                CHENNAI<br/>
                                TUITION
                            </div>
                            <div style=""font-size: 11px; color: #666; font-weight: 600;"">Authorised Signatory</div>
                        </div>
                    </td>
                </tr>
            </table>

            <!-- Terms and Conditions -->
            <div style=""margin: 30px 0;"">
                <div style=""color: #7CB342; font-weight: 600; font-size: 14px; margin-bottom: 15px;"">Terms and Conditions</div>
                <div style=""font-size: 11px; line-height: 1.5; color: #666;"">
                    <div style=""margin-bottom: 8px; padding-left: 15px; position: relative;"">
                        <span style=""position: absolute; left: 0; font-weight: 600; color: #333;"">1.</span>
                        Please pay within Due Date from the date of invoice, overdue interest @ 18% will be charged on delayed payments
                    </div>
                    <div style=""margin-bottom: 8px; padding-left: 15px; position: relative;"">
                        <span style=""position: absolute; left: 0; font-weight: 600; color: #333;"">2.</span>
                        While making a payment, mention the invoice number and the student's name in the remark section
                    </div>
                    <div style=""margin-bottom: 8px; padding-left: 15px; position: relative;"">
                        <span style=""position: absolute; left: 0; font-weight: 600; color: #333;"">3.</span>
                        For International Transaction use SWIFT Payment
                    </div>
                    <div style=""margin-bottom: 8px; padding-left: 15px; position: relative;"">
                        <span style=""position: absolute; left: 0; font-weight: 600; color: #333;"">4.</span>
                        Please ensure to cancel your class at least 4 hours before it begins to avoid a fee
                    </div>
                    <div style=""margin-bottom: 8px; padding-left: 15px; position: relative;"">
                        <span style=""position: absolute; left: 0; font-weight: 600; color: #333;"">5.</span>
                        For any concerns about the classes or to request a tutor change, please reach out to us
                    </div>
                </div>
            </div>

            <!-- Additional Notes -->
            <div style=""margin: 20px 0;"">
                <div style=""color: #7CB342; font-weight: 600; font-size: 14px; margin-bottom: 10px;"">Additional Notes</div>
                <div style=""font-size: 11px; color: #666; font-style: italic;"">Happy to work with you.</div>
            </div>
        </div>
    </div>

    <script>
        window.onload = function() {{
            setTimeout(() => {{
                window.print();
                window.onafterprint = function() {{
                    window.close();
                }}
            }}, 500);
        }}
    </script>
</body>
</html>";
            }
            catch (Exception ex)
            {
                // Log the actual exception for debugging
                // You should replace this with your actual logging mechanism
                System.Diagnostics.Debug.WriteLine($"Error in GenerateInvoiceHtml: {ex.Message}");
                System.Diagnostics.Debug.WriteLine($"Stack trace: {ex.StackTrace}");

                // Consider throwing the exception instead of returning null for better error handling
                throw new InvalidOperationException($"Failed to generate invoice HTML: {ex.Message}", ex);

                // If you must return null, at least log why
                // return null;
            }
        }

        public async Task<Response<bool>> ScheduleChangeRequest(ScheduleChangeRqstDTO input)
        {
            Response<bool> response = new Response<bool>();
            try
            {
                var salesDetails = _salesRepository.GetSalesDetailsById(input.SalesDetailsId, input.SalesDetailsId, input.ScheduleDetailsId, input.UserRole);
                if (salesDetails != null)
                {
                    input.SalesId = salesDetails.Data.SalesId.Value;
                }
                await _notificationService.AddNotifications(input.SalesId, input.SalesDetailsId, input.UserId, Domain.NotificationType.DemoAdjustment);

                response = await _repository.UpdateScheduleDetails(new TCTEvent()
                {
                    IsActive = true,
                    ScheduleDetailsId = input.ScheduleDetailsId,
                    GuestType = input.GuestType,
                    EventStatus = input.EventStatus,
                    UserId = input.UserId,
                });
                response.Data = response.Succeeded = true;
            }
            catch (Exception ex)
            {
                response.Data = response.Succeeded = false;
            }
            return response;
        }

        public Task<Response<bool>> UpdateScheduleDetails(TCTEvent inputData)
        {
            throw new NotImplementedException();
        }

        public async Task<GenerateTutorInvoiceResponseDto> GenerateTutorInvoiceAsync(GenerateTutorInvoiceRequestDto request)
        {
            var result = await _repository.GenerateTutorInvoiceAsync(request);
            if (result != null && result.InvoiceNumber != null)
            {
                try
                {
                    var invoiceDetails = await GetTutorInvoiceById(result.InvoiceNumber);
                    bool isMailSent = await SendTutorInvoiceMail(invoiceDetails.Data);
                    if (isMailSent)
                    {
                        await _repository.UpdateTutorInvoiceEmailSendDateAsync(result.InvoiceNumber);
                    }
                }
                catch (Exception ex)
                {
                    result.EmailError = ex.Message;
                }
            }
            return result;
        }

        public async Task<byte[]> GetTutorPaySlipPdfAsync(string invoiceNumber)
        {
            var invoiceDetails = await GetTutorInvoiceById(invoiceNumber);
            if (invoiceDetails?.Data == null || invoiceDetails.Data.Count == 0)
                throw new InvalidOperationException($"Invoice {invoiceNumber} not found.");
            return _tutorPaySlipPdfService.GeneratePaySlipPdf(invoiceDetails.Data);
        }

        private async Task<bool> SendTutorInvoiceMail(List<PayrollRequestDto> response)
        {
            var data = response[0];
            var toEmail = data.TutorEmail;
            if (string.IsNullOrWhiteSpace(toEmail))
                throw new InvalidOperationException($"Tutor email address is missing for invoice {data.InvoiceNumber}. Cannot send pay slip.");

            var invoiceBodyContent = await GenerateTutorInvoiceHTMLContent(response);
            var pdfBytes = _tutorPaySlipPdfService.GeneratePaySlipPdf(response);
            var pdfFileName = $"PaySlip-{data.InvoiceNumber}-{data.ScheduleMonthName}{data.ScheduleYear}.pdf";

            bool isMailSent = false;

            using var mailMessage = new System.Net.Mail.MailMessage();
            mailMessage.From = new MailAddress(_fromEmail, "The Chennai Tuition");
            mailMessage.To.Add(new MailAddress(toEmail));
            mailMessage.Subject = $"Pay Slip for {data.ScheduleMonthName} {data.ScheduleYear} | The Chennai Tuition";
            mailMessage.Body = invoiceBodyContent;
            mailMessage.IsBodyHtml = true;

            var pdfStream = new MemoryStream(pdfBytes);
            var attachment = new System.Net.Mail.Attachment(pdfStream, pdfFileName, "application/pdf");
            mailMessage.Attachments.Add(attachment);

            using var client = new SmtpClient(_smtpServer, _smtpPort)
            {
                UseDefaultCredentials = false,
                Credentials = new NetworkCredential(_fromEmail, _fromPassword),
                EnableSsl = true,
            };

            try
            {
                await client.SendMailAsync(mailMessage);
                isMailSent = true;
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException($"Failed to send pay slip email. Error: {ex.Message}", ex);
            }

            return isMailSent;
        }

        public async Task<string> GenerateStudentInvoiceHTMLContent(Response<List<StudentInvoiceViewModel>> invoiceData)
        {
            try
            {
                var htmlContent = GenerateInvoiceHtml(invoiceData);

                return htmlContent;
            }
            catch (Exception ex)
            {
                //_logger.LogError(ex, "Error generating PDF for invoice {InvoiceNumber}", invoiceData.InvNumber);
                throw;
            }
        }

        public async Task<string> GenerateTutorInvoiceHTMLContent(List<PayrollRequestDto> invoiceData)
        {
            try
            {
                var htmlContent = GenerateTutorInvoiceHtml(invoiceData);

                return htmlContent;
            }
            catch (Exception ex)
            {
                //_logger.LogError(ex, "Error generating PDF for invoice {InvoiceNumber}", invoiceData.InvNumber);
                throw;
            }
        }

        public Task<IReadOnlyList<SalesSummaryResponseDto>> GetAsync(CancellationToken ct = default)
        {
            var result = _repository.GetAsync(ct);
            return result;
        }
        public Task<IReadOnlyList<SalesSummaryResponseDto>> GetNeedToSchedule(CancellationToken ct = default)
        {
            var result = _repository.GetNeedToSchedule(ct);
            return result;
        }
        public Task<IReadOnlyList<SalesSummaryResponseDto>> GetScheduleByStatus(string statusCodeFilter, CancellationToken ct = default)
        {
            var result = _repository.GetScheduleByStatus(statusCodeFilter, ct);
            return result;
        }
        private string GenerateStudentInvoiceHtml(Response<List<StudentInvoiceViewModel>> result)
        {
            try
            {
                // Add null checks and validation
                if (result == null)
                {
                    throw new ArgumentNullException(nameof(result), "Result task is null");
                }

                if (result.Data == null)
                {
                    throw new InvalidOperationException("Result.Result is null - task may not have completed successfully");
                }

                if (result.Data == null)
                {
                    throw new InvalidOperationException("Result.Result.Data is null");
                }

                if (result.Data.Count == 0)
                {
                    throw new InvalidOperationException("Result.Result.Data is empty - no invoice data available");
                }

                var data = result.Data[0];

                // Add null check for data object
                if (data == null)
                {
                    throw new InvalidOperationException("First data item is null");
                }

                // Validate critical properties (add null checks for properties that might be null)
                var studentName = data.StudentName ?? "N/A";
                var invoiceNumber = data.InvoiceNumber ?? "N/A";
                var startDate = data.StartDate;
                var dueDate = data.DueDate;
                var subject = data.Subject ?? "N/A";
                var monthName = data.MonthName ?? "N/A";
                var year = data.Year.ToString() ?? "N/A";

                // Handle potential null values for numeric properties
                var totalInvoiceAmount = data.TotalInvoiceAmount.Value;
                var numberOfClasses = data.NumberOfClasses;
                var previousMonthPendingClasses = data.PreviousMonthPendingClasses;
                var previousMonthTotalClasses = data.PreviousMonthTotalClasses;
                var parentPayment = data.ParentPayment;

                // Format currency with null checks
                string formattedTotalAmount;
                string formattedParentPayment;

                try
                {
                    formattedTotalAmount = totalInvoiceAmount.ToString("N", new CultureInfo("en-IN"));
                    formattedParentPayment = string.Format(new CultureInfo("en-IN"), "{0:C}", parentPayment);
                }
                catch (Exception formatEx)
                {
                    throw new InvalidOperationException($"Error formatting currency values: {formatEx.Message}", formatEx);
                }

                return $@"
<!DOCTYPE html>
<html lang=""en"">
<head>
    <meta charset=""UTF-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>TCT Invoice</title>
    <style>
        /* Keep minimal CSS for print optimization only */
        @page {{
            size: A4;
            margin: 12mm;
        }}
        
        @media print {{
            body {{ 
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }}
            
            .email-section {{
                display: none;
            }}
            
            * {{
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }}
        }}
    </style>
</head>
<body style=""font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f7fafc; font-size: 12px; line-height: 1.4; color: #333;"">
    
    <!-- EMAIL SECTION -->
    <div class=""email-section"" style=""background-color: #f7fafc; padding: 20px;"">
        <div style=""max-width: 800px; margin: 0 auto 40px auto; background-color: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden;"">
            <div style=""background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%); color: white; padding: 20px; text-align: center; font-size: 24px; font-weight: bold;"">
                The Chennai Tuition
            </div>
            <div style=""padding: 30px; line-height: 1.6; color: #333; background-color: #f0fff4;"">
                <div style=""font-size: 16px; margin-bottom: 20px;"">Dear {studentName},</div>
                
                <div style=""padding: 15px; margin: 20px 0; background-color: #e6fffa; border: 1px solid #38b2ac; border-radius: 6px; font-weight: bold;"">
                    <strong>Invoice Ready!</strong> Your invoice for <strong>The Chennai Tuition</strong> services has been generated and is ready for your review.
                </div>
                
                <div style=""margin-bottom: 20px; text-align: justify;"">
                    We hope you're enjoying your learning experience with us. Please find below the details of your current invoice:
                </div>
                
                <div style=""background-color: #f7fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 6px; margin: 20px 0;"">
                    <div style=""display: flex; justify-content: space-between; margin-bottom: 8px; padding: 5px 0; border-bottom: 1px solid #e2e8f0;"">
                        <span style=""font-weight: bold; color: #4a5568;"">Invoice Number:</span>
                        <span style=""color: #2d3748; background-color: #bee3f8; padding: 2px 4px; border-radius: 3px; font-weight: bold;"">{invoiceNumber}</span>
                    </div>
                    <div style=""display: flex; justify-content: space-between; margin-bottom: 8px; padding: 5px 0; border-bottom: 1px solid #e2e8f0;"">
                        <span style=""font-weight: bold; color: #4a5568;"">Invoice Date:</span>
                        <span style=""color: #2d3748;"">{startDate}</span>
                    </div>
                    <div style=""display: flex; justify-content: space-between; margin-bottom: 8px; padding: 5px 0; border-bottom: 1px solid #e2e8f0;"">
                        <span style=""font-weight: bold; color: #4a5568;"">Due Date:</span>
                        <span style=""color: #2d3748;"">{dueDate}</span>
                    </div>
                    <div style=""display: flex; justify-content: space-between; margin-bottom: 8px; padding: 5px 0; border-bottom: 1px solid #e2e8f0;"">
                        <span style=""font-weight: bold; color: #4a5568;"">Subject:</span>
                        <span style=""color: #2d3748;"">{subject}</span>
                    </div>
                    <div style=""display: flex; justify-content: space-between; margin-bottom: 8px; padding: 5px 0; border-bottom: 1px solid #e2e8f0;"">
                        <span style=""font-weight: bold; color: #4a5568;"">Period:</span>
                        <span style=""color: #2d3748;"">{monthName} - {year}</span>
                    </div>
                    <div style=""display: flex; justify-content: space-between; border-bottom: none; font-weight: bold; background-color: #c6f6d5; padding: 10px; border-radius: 4px; margin-top: 10px;"">
                        <span style=""font-weight: bold; color: #4a5568;"">Total Amount:</span>
                        <span style=""color: #2d3748;"">₹{formattedTotalAmount}</span>
                    </div>
                </div>
                
                <div style=""background-color: #fef5e7; border: 1px solid #f6ad55; padding: 15px; border-radius: 6px; margin: 20px 0; text-align: center;"">
                    <strong>📎 Invoice Details Below:</strong> Please find the detailed invoice below for your reference.
                </div>
                
                <div style=""background-color: #ebf8ff; border: 1px solid #81e6d9; padding: 15px; border-radius: 6px; margin: 20px 0;"">
                    <strong>Payment Instructions:</strong><br>
                    Please review the invoice below and make the payment by the due date mentioned. You can make payments through:
                    
                    <div style=""margin: 10px 0; padding-left: 20px;"">
                        • Online payment portal<br>
                        • Bank transfer<br>
                        • Cash payment at our center
                    </div>
                    
                    <em>For any payment queries, please contact our accounts team.</em>
                </div>
                
                <div style=""margin-bottom: 20px; text-align: justify;"">
                    If you have any questions about this invoice or need clarification on any charges, please don't hesitate to contact us. We're here to help!
                </div>
                
                <div style=""margin-bottom: 20px; text-align: justify;"">
                    Thank you for choosing The Chennai Tuition for your educational needs.
                </div>
                
                <div style=""margin-top: 30px;"">
                    <div>Best regards,</div>
                    <div style=""margin-top: 20px; font-weight: bold;"">
                        The Chennai Tuition<br>
                        Accounts Department
                    </div>
                </div>
                
                <div style=""background-color: #f7fafc; padding: 15px; border-radius: 6px; margin-top: 20px; font-size: 12px; color: #718096; text-align: center;"">
                    This is an automated email. Please do not reply to this email address.<br>
                    For support, contact us at: {data.Email ?? "support@thechennai-tuition.com"} | Phone: {data.Phone ?? "+91-XXXX-XXXXX"}
                </div>
            </div>
        </div>
    </div>

    <!-- INVOICE SECTION -->
    <div style=""background: #fff; padding: 20px;"">
        <div style=""width: 100%; max-width: 210mm; margin: 0 auto; background: white;"">
            
            <!-- Invoice Header -->
            <div style=""text-align: center; margin-bottom: 30px;"">
                <div style=""font-size: 32px; font-weight: bold; color: #333; margin-bottom: 5px;"">INVOICE</div>
                <div style=""font-size: 18px; color: #7CB342; font-weight: 600; letter-spacing: 1px;"">THE CHENNAI TUITION</div>
            </div>

            <!-- Invoice Info Section -->
            <table style=""width: 100%; margin-bottom: 30px;"" cellpadding=""0"" cellspacing=""0"">
                <tr>
                    <td style=""width: 50%;""></td>
                    <td style=""width: 50%;"">
                        <table style=""width: 100%; font-size: 11px;"" cellpadding=""0"" cellspacing=""0"">
                            <tr>
                                <td style=""color: #666; font-weight: normal; padding: 4px 0; text-align: right; padding-right: 20px;"">INVOICE #</td>
                                <td style=""color: #333; font-weight: 600; padding: 4px 0; text-align: right;"">{invoiceNumber}</td>
                            </tr>
                            <tr>
                                <td style=""color: #666; font-weight: normal; padding: 4px 0; text-align: right; padding-right: 20px;"">START DATE</td>
                                <td style=""color: #333; font-weight: 600; padding: 4px 0; text-align: right;"">{startDate}</td>
                            </tr>
                            <tr>
                                <td style=""color: #666; font-weight: normal; padding: 4px 0; text-align: right; padding-right: 20px;"">DUE DATE</td>
                                <td style=""color: #333; font-weight: 600; padding: 4px 0; text-align: right;"">{dueDate}</td>
                            </tr>
                            <tr>
                                <td style=""color: #666; font-weight: normal; padding: 4px 0; text-align: right; padding-right: 20px;"">Department</td>
                                <td style=""color: #333; font-weight: 600; padding: 4px 0; text-align: right;"">TCT - ACCOUNTS</td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>

            <!-- Billing Section -->
            <table style=""width: 100%; margin-bottom: 30px;"" cellpadding=""0"" cellspacing=""0"">
                <tr>
                    <td style=""width: 45%; background: #f8f9fa; padding: 20px; border-radius: 4px; vertical-align: top;"">
                        <div style=""color: #7CB342; font-weight: 600; font-size: 14px; margin-bottom: 15px;"">Billed By</div>
                        <div style=""color: #333; line-height: 1.6; font-size: 11px;"">
                            <strong>{data.Title ?? "The Chennai Tuition"}</strong><br/>
                            {data.Address1 ?? "Address Line 1"}<br/>
                            {data.Address2 ?? "Address Line 2"}<br/>
                            {data.City ?? "Chennai"},<br/>
                            {data.State ?? "Tamil Nadu"}, {data.Country ?? "India"} - {data.Zip ?? "600001"}<br/>
                            <strong>GSTIN:</strong> {data.GSTIN ?? "N/A"}<br/>
                            <strong>PAN:</strong> {data.PAN ?? "N/A"}<br/>
                            <strong>Email:</strong> {data.Email ?? "N/A"}<br/>
                            <strong>Phone:</strong> {data.Phone ?? "N/A"}
                        </div>
                    </td>
                    <td style=""width: 10%;""></td>
                    <td style=""width: 45%; background: #f8f9fa; padding: 20px; border-radius: 4px; vertical-align: top;"">
                        <div style=""color: #7CB342; font-weight: 600; font-size: 14px; margin-bottom: 15px;"">Billed To</div>
                        <div style=""color: #333; line-height: 1.6; font-size: 11px;"">
                            <strong>{data.ParentName ?? "N/A"}</strong><br/>
                            {data.Location ?? "N/A"}
                        </div>
                    </td>
                </tr>
            </table>

            <!-- Items Table -->
            <table style=""width: 100%; border-collapse: collapse; margin-bottom: 20px;"" cellpadding=""0"" cellspacing=""0"">
                <thead>
                    <tr style=""background: #7CB342; color: white;"">
                        <th style=""padding: 15px 12px; font-weight: 600; font-size: 12px; text-align: left;"">Item</th>
                        <th style=""padding: 15px 12px; font-weight: 600; font-size: 12px; text-align: center;"">Quantity</th>
                        <th style=""padding: 15px 12px; font-weight: 600; font-size: 12px; text-align: right;"">Rate</th>
                        <th style=""padding: 15px 12px; font-weight: 600; font-size: 12px; text-align: right;"">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style=""border-bottom: 1px solid #e9ecef;"">
                        <td style=""padding: 15px 12px; vertical-align: top; font-size: 11px;"">
                            <div style=""color: #666; font-weight: 600;"">1.</div>
                            <div style=""font-weight: 600; color: #333; margin-bottom: 8px; font-size: 12px;"">{monthName.ToUpper()} MONTH FEES DETAILS</div>
                            <div style=""color: #666; line-height: 1.5;"">
                                {(data.PreviousMonthPendingClassesMonthYear ?? monthName).ToUpper()} Month billed classes= {previousMonthTotalClasses} classes<br/>
                                {(data.PreviousMonthPendingClassesMonthYear ?? monthName).ToUpper()} month classes completed= {previousMonthTotalClasses - previousMonthPendingClasses} classes<br/>
                                {monthName.ToUpper()} Month as per schedule= {numberOfClasses} classes<br/>
                                Difference Billing Amount in {monthName.ToUpper()} = {numberOfClasses + previousMonthPendingClasses} classes
                            </div>
                        </td>
                        <td style=""padding: 15px 12px; vertical-align: top; font-size: 11px; text-align: center;"">{numberOfClasses + previousMonthPendingClasses}</td>
                        <td style=""padding: 15px 12px; vertical-align: top; font-size: 11px; text-align: right;"">₹{formattedParentPayment}</td>
                        <td style=""padding: 15px 12px; vertical-align: top; font-size: 11px, text-align: right;""><strong>₹{formattedTotalAmount}</strong></td>
                    </tr>
                </tbody>
            </table>

            <!-- Total in Words -->                                 
            <div style=""background: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 30px; font-size: 11px; color: #666; border: 1px solid #ddd; text-align: center; font-weight: bold;"">
                <strong>Total (in words): {data.AmountInWords ?? "N/A"}</strong>
            </div>

            <!-- Bank Details & Total Amount -->
            <table style=""width: 100%; margin-bottom: 30px;"" cellpadding=""0"" cellspacing=""0"">
                <tr>
                    <td style=""width: 60%; background: #f8f9fa; padding: 20px; border-radius: 4px; vertical-align: top;"">
                        <div style=""color: #7CB342; font-weight: 600; font-size: 14px; margin-bottom: 15px;"">Bank Details</div>
                        <div style=""font-size: 11px; line-height: 1.8;"">
                            <table style=""width: 100%;"" cellpadding=""0"" cellspacing=""0"">
                                <tr>
                                    <td style=""font-weight: 600; color: #333; width: 120px; padding: 3px 0;"">Account Name</td>
                                    <td style=""color: #666; padding: 3px 0;"">{data.AccountName ?? "N/A"}</td>
                                </tr>
                                <tr>
                                    <td style=""font-weight: 600; color: #333; width: 120px; padding: 3px 0;"">Account Number</td>
                                    <td style=""color: #666; padding: 3px 0;"">{data.AccountNumber ?? "N/A"}</td>
                                </tr>
                                <tr>
                                    <td style=""font-weight: 600; color: #333; width: 120px; padding: 3px 0;"">IFSC</td>
                                    <td style=""color: #666; padding: 3px 0;"">{data.IFSCCode ?? "N/A"}</td>
                                </tr>
                                <tr>
                                    <td style=""font-weight: 600; color: #333; width: 120px; padding: 3px 0;"">Account Type</td>
                                    <td style=""color: #666; padding: 3px 0;"">{data.AccountType ?? "N/A"}</td>
                                </tr>
                                <tr>
                                    <td style=""font-weight: 600; color: #333; width: 120px; padding: 3px 0;"">Bank</td>
                                    <td style=""color: #666; padding: 3px 0;"">{data.BankName ?? "N/A"}</td>
                                </tr>
                            </table>
                        </div>
                    </td>
                    <td style=""width: 10%;""></td>
                    <td style=""width: 30%; vertical-align: top;"">
                        <div style=""background: #7CB342; color: white; padding: 20px; border-radius: 4px; text-align: center; border: 2px solid #7CB342; margin-bottom: 20px;"">
                            <div style=""font-size: 20px; font-weight: 600;"">Total (INR) ₹{formattedTotalAmount}</div>
                        </div>
                        
                        <div style=""text-align: center;"">
                            <div style=""width:90px;height:90px;border:2px solid #7cb342;border-radius:50%;display:inline-flex;color:#7cb342;font-size:10px;font-weight:600;text-align:center;line-height:1.2;margin-bottom:15px;align-items: center;justify-content: center"">
                                TCT<br/>
                                CHENNAI<br/>
                                TUITION
                            </div>
                            <div style=""font-size: 11px; color: #666; font-weight: 600;"">Authorised Signatory</div>
                        </div>
                    </td>
                </tr>
            </table>

            <!-- Terms and Conditions -->
            <div style=""margin: 30px 0;"">
                <div style=""color: #7CB342; font-weight: 600; font-size: 14px; margin-bottom: 15px;"">Terms and Conditions</div>
                <div style=""font-size: 11px; line-height: 1.5; color: #666;"">
                    <div style=""margin-bottom: 8px; padding-left: 15px; position: relative;"">
                        <span style=""position: absolute; left: 0; font-weight: 600; color: #333;"">1.</span>
                        Please pay within Due Date from the date of invoice, overdue interest @ 18% will be charged on delayed payments
                    </div>
                    <div style=""margin-bottom: 8px; padding-left: 15px; position: relative;"">
                        <span style=""position: absolute; left: 0; font-weight: 600; color: #333;"">2.</span>
                        While making a payment, mention the invoice number and the student's name in the remark section
                    </div>
                    <div style=""margin-bottom: 8px; padding-left: 15px; position: relative;"">
                        <span style=""position: absolute; left: 0; font-weight: 600; color: #333;"">3.</span>
                        For International Transaction use SWIFT Payment
                    </div>
                    <div style=""margin-bottom: 8px; padding-left: 15px; position: relative;"">
                        <span style=""position: absolute; left: 0; font-weight: 600; color: #333;"">4.</span>
                        Please ensure to cancel your class at least 4 hours before it begins to avoid a fee
                    </div>
                    <div style=""margin-bottom: 8px; padding-left: 15px; position: relative;"">
                        <span style=""position: absolute; left: 0; font-weight: 600; color: #333;"">5.</span>
                        For any concerns about the classes or to request a tutor change, please reach out to us
                    </div>
                </div>
            </div>

            <!-- Additional Notes -->
            <div style=""margin: 20px 0;"">
                <div style=""color: #7CB342; font-weight: 600; font-size: 14px; margin-bottom: 10px;"">Additional Notes</div>
                <div style=""font-size: 11px; color: #666; font-style: italic;"">Happy to work with you.</div>
            </div>
        </div>
    </div>

    <script>
        window.onload = function() {{
            setTimeout(() => {{
                window.print();
                window.onafterprint = function() {{
                    window.close();
                }}
            }}, 500);
        }}
    </script>
</body>
</html>";
            }
            catch (Exception ex)
            {
                // Log the actual exception for debugging
                // You should replace this with your actual logging mechanism
                System.Diagnostics.Debug.WriteLine($"Error in GenerateTutorInvoiceHtml: {ex.Message}");
                System.Diagnostics.Debug.WriteLine($"Stack trace: {ex.StackTrace}");

                // Consider throwing the exception instead of returning null for better error handling
                throw new InvalidOperationException($"Failed to generate invoice HTML: {ex.Message}", ex);

                // If you must return null, at least log why
                // return null;
            }
        }

        public async Task<List<TutorEngagementDto>> GetTutorEngagmentInfo(Guid tutorId)
        {
            var result = await _repository.GetTutorEngagmentInfo(tutorId);
            return result;
        }

        public async Task<TutorDashboardInfoDto> GetTutorDashboardInfo(Guid _tutorId)
        {
            var result = await _repository.GetTutorDashboardInfo(_tutorId);
            return result;
        }

        public async Task<Response<int>> GetCancelledClassesCount(Guid salesDetailsId, int year, int month)
        {
            var result = await _repository.GetCancelledClassesCount(salesDetailsId, year, month);
            return result;
        }

        public async Task<Response<string>> CheckCanCancelClass(Guid salesDetailsId, int year, int month)
        {
            var response = new Response<string>();

            // 1. Get total classes for the month
            var totalClasses = await _repository.GetTotalClassesCount(salesDetailsId, year, month);

            // 2. Get cancelled classes for the month
            var cancelledClasses = await _repository.GetCancelledClassesCount(salesDetailsId, year, month);

            // 3. Get threshold
            var threshold = await _thresholdRepository.GetThresholdByNameAsync("CancelClassRatio");

            if (threshold?.Value == null || totalClasses.Data == 0)
            {
                response.Data = "Threshold not configured or no classes available.";
                return response;
            }

            // 4. Calculate allowed cancels
            var allowedCancels = (int)Math.Floor((threshold.Value.Value / 100m) * totalClasses.Data);

            // Safety check: ensure minimum of 0
            allowedCancels = Math.Max(0, allowedCancels);

            // 5. Prepare response
            string message;
            if (allowedCancels == 0)
            {
                message = "Cancellations are not allowed for this month. Please reschedule the class instead.";
            }
            else if (cancelledClasses.Data == 0)
            {
                message = $"You have not cancelled any classes yet.The maximum allowed is {allowedCancels}. " +
                "You can cancel classes within this limit. Alternatively, you can choose to reschedule the class.";
            }
            else if (cancelledClasses.Data >= allowedCancels)
            {
                message = $"You have reached the maximum cancellation limit of {allowedCancels} classes. " +
              "You cannot cancel any more classes. If you proceed with cancellation, your invoice amount will be reduced. " +
              "Please reschedule the class instead.";
            }
            else
            {
                var remainingCancels = allowedCancels - cancelledClasses.Data;
                message = $"You have already cancelled {cancelledClasses.Data} class(es). The maximum allowed is {allowedCancels}. " +
               $"You can still cancel {remainingCancels} more class(es). Alternatively, you can choose to reschedule the class.";
            }

            response.Data = message;
            return response;
        }

        public async Task<Response<List<ClassScheduleDetailsReportDto>>> GetCompletedClassScheduleDetailsAsync(Guid? studentId = null, Guid? tutorId = null, Guid? operationId = null, DateTime? fromDate = null, DateTime? toDate = null, Guid? operationStatus = null)
        {
            return await _repository.GetCompletedClassScheduleDetailsAsync(studentId, tutorId, operationId, fromDate, toDate, operationStatus);
        }

        public async Task<Response<bool>> UpdateOperationScheduleStatus(UpdateOperationScheduleStatusRequest request)
        {
            return await _repository.UpdateOperationScheduleStatus(request);
        }
        public async Task<bool> BulkUpdateOperationScheduleStatus(BulkUpdateOperationScheduleStatusRequest request)
        {
            if (request is null) throw new ArgumentNullException(nameof(request));

            var ids = request.ScheduleDetailsIds ?? new List<Guid>();
            if (!ids.Any()) return false;

            if (!Guid.TryParse(request.OperationScheduleStatus, out var operationStatusGuid))
            {
                throw new ArgumentException("OperationScheduleStatus must be a valid GUID.", nameof(request.OperationScheduleStatus));
            }

            foreach (var id in ids)
            {
                var singleRequest = new UpdateOperationScheduleStatusRequest
                {
                    ScheduleDetailsId = id,
                    OperationScheduleStatus = operationStatusGuid
                };

                var response = await UpdateOperationScheduleStatus(singleRequest);
                if (response == null || !response.Succeeded)
                {
                    // Stop on first failure and return false so caller knows bulk update did not fully succeed.
                    return false;
                }
            }

            return true;
        }

        public async Task<Response<bool>> UpdateScheduleApprovalStatus(ScheduleStatusUpdateRequest request)
        {
            try
            {
                var result = await _repository.UpdateScheduleApprovalStatus(request);
                return result;
            }
            catch (Exception ex)
            {
                return new Response<bool>
                {
                    Succeeded = false,
                    Message = ex.Message,
                    Data = false
                };
            }
        }

        public Task<Response<Guid>> AddOrUpdatePaymentPlanAsync(CreatePaymentPlanRequest request)
            => _repository.AddOrUpdatePaymentPlanAsync(request);

        public Task<Response<Guid>> RecordPaymentAsync(RecordPaymentRequest request)
            => _repository.RecordPaymentAsync(request);

        public Task<PaymentPlanSummaryDto?> GetPaymentPlanBySalesDetailsIdAsync(Guid salesDetailsId)
            => _repository.GetPaymentPlanBySalesDetailsIdAsync(salesDetailsId);

        public Task<List<PaymentPlanSummaryDto>> GetPaymentPlansByStudentIdAsync(Guid studentId)
            => _repository.GetPaymentPlansByStudentIdAsync(studentId);

        private string GenerateTutorInvoiceHtml(List<PayrollRequestDto> result)
        {
            try
            {
                if (result == null || result.Count == 0)
                    throw new ArgumentException("No invoice data available", nameof(result));

                var data = result[0];

                var tutorName = data.TutorName ?? "N/A";
                var tutorPhone = data.TutorPhone ?? "-";
                var tutorCode = data.TutorUserCode ?? "-";
                var invoiceNumber = data.InvoiceNumber ?? "N/A";
                var monthName = data.ScheduleMonthName ?? "N/A";
                var year = data.ScheduleYear > 0 ? data.ScheduleYear.ToString() : (data.CreatedDate?.Year.ToString() ?? "-");
                var invoiceDate = data.CreatedDate?.ToString("dd-MM-yyyy") ?? "-";

                var totalInvoiceAmount = data.TotalTutorPayment ?? 0m;
                var formattedTotalAmount = totalInvoiceAmount.ToString("N2", new CultureInfo("en-IN"));

                // TCT org details — fall back to static defaults if DB values are absent
                var tctTitle = string.IsNullOrWhiteSpace(data.TctTitle) ? "THE CHENNAI TUITION" : data.TctTitle.ToUpper();
                var tctAddress = BuildAddress(data.TctAddress1, data.TctAddress2, data.TctCity, data.TctState, data.TctZip, data.TctCountry);
                var tctPhone = data.TctPhone ?? "+91-9042171782";
                var tctEmail = data.TctEmail ?? "accounts@thechennaituition.com";

                // Subjects across all rows
                var subjects = result.Select(r => r.Subject).Where(s => !string.IsNullOrEmpty(s)).Distinct();
                var subjectLine = string.Join(", ", subjects);
                string htmlTemplate = $@"<!DOCTYPE html>
<html lang=""en"">
<head>
    <meta charset=""UTF-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>{tctTitle} - Pay Slip</title>
</head>
<body style=""font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;"">

    <!-- Notification Email Section -->
    <div style=""max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 30px;"">

        <div style=""background-color: #1a1a2e; padding: 24px 32px;"">
            <h1 style=""color: #7CB342; font-size: 22px; font-weight: 300; margin: 0; letter-spacing: 1px;"">{tctTitle}</h1>
            <p style=""color: rgba(255,255,255,0.45); font-size: 11px; margin: 4px 0 0;"">Monthly Pay Slip</p>
        </div>

        <div style=""padding: 28px 32px;"">
            <p style=""font-size: 15px; color: #333; margin: 0 0 6px;"">Dear <strong>{tutorName}</strong>,</p>
            <p style=""font-size: 13px; color: #555; line-height: 1.7; margin: 0 0 16px;"">
                Your pay slip for <strong>{monthName} {year}</strong> has been generated. Please find the details below.
            </p>

            <div style=""background: #f9f9f9; border: 1px solid #eee; border-radius: 8px; padding: 18px; margin-bottom: 20px;"">
                <table style=""width: 100%; border-collapse: collapse; font-size: 13px;"">
                    <tr>
                        <td style=""padding: 7px 0; color: #777;"">Invoice Number</td>
                        <td style=""padding: 7px 0; font-weight: 600; text-align: right; color: #222;"">{invoiceNumber}</td>
                    </tr>
                    <tr style=""border-top: 1px solid #eee;"">
                        <td style=""padding: 7px 0; color: #777;"">Pay Period</td>
                        <td style=""padding: 7px 0; font-weight: 600; text-align: right; color: #222;"">{monthName} {year}</td>
                    </tr>
                    <tr style=""border-top: 1px solid #eee;"">
                        <td style=""padding: 7px 0; color: #777;"">Subject(s)</td>
                        <td style=""padding: 7px 0; font-weight: 600; text-align: right; color: #222;"">{subjectLine}</td>
                    </tr>
                    <tr style=""border-top: 2px solid #7CB342;"">
                        <td style=""padding: 12px 0; font-weight: 700; font-size: 15px; color: #333;"">Net Payment</td>
                        <td style=""padding: 12px 0; font-weight: 700; font-size: 18px; color: #7CB342; text-align: right;"">&#8377;{formattedTotalAmount}</td>
                    </tr>
                </table>
            </div>

            <div style=""background: #e7f3ff; border: 1px solid #b8daff; border-radius: 5px; padding: 15px; margin-bottom: 20px; font-size: 13px; color: #444;"">
                Payment will be processed via bank transfer. For any queries, please contact our accounts team at
                <a href=""mailto:{tctEmail}"" style=""color:#007bff;"">{tctEmail}</a>.
            </div>

            <p style=""margin: 0; color: #666; font-size: 14px;"">
                Best regards,<br>
                <strong>{tctTitle}</strong><br>
                Accounts Department
            </p>
        </div>

        <div style=""background: #f9f9f9; border-top: 1px solid #eee; padding: 14px 32px; text-align: center;"">
            <p style=""font-size: 11px; color: #aaa; margin: 0;"">
                {tctTitle} &nbsp;·&nbsp; {tctEmail} &nbsp;·&nbsp; {tctPhone}
            </p>
            <p style=""font-size: 10px; color: #ccc; margin: 5px 0 0; font-style: italic;"">
                This is an automated email. Please do not reply directly to this message.
            </p>
        </div>
    </div>

    <!-- Payslip Section -->
    <div style=""max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);"">

        <!-- Payslip Header -->
        <div style=""padding: 20px; text-align: center; border-bottom: 2px solid #333;"">
            <h2 style=""margin: 0 0 8px 0; color: #333; font-size: 20px;"">{tctTitle}</h2>
            <p style=""margin: 0; color: #666; font-size: 13px; line-height: 1.6;"">{tctAddress}<br>Contact: {tctPhone}</p>
        </div>

        <!-- Pay Slip Title -->
        <div style=""text-align: center; padding: 15px; background-color: #f8f9fa; border-bottom: 2px solid #333;"">
            <h3 style=""margin: 0; color: #333;"">Pay slip</h3>
        </div>

        <!-- Employee Details -->
        <div style=""padding: 20px;"">
            <table style=""width: 100%; border-collapse: collapse; margin-bottom: 20px;"">
                <tr style=""border-bottom: 2px solid #333;"">
                    <td style=""padding: 10px 0; font-weight: bold;"">Name: {tutorName}</td>
                    <td style=""padding: 10px 0; font-weight: bold; text-align: right;"">Phone number: {tutorPhone}</td>
                </tr>
                <tr style=""border-bottom: 2px solid #333;"">
                    <td style=""padding: 10px 0;"">Designation: Online Tutor</td>
                    <td style=""padding: 10px 0; text-align: right;"">Employee Type: Freelance</td>
                </tr>
            </table>

            <!-- Salary Calculations -->
            <h4 style=""margin: 20px 0 10px 0; color: #333;"">Salary calculations:</h4>
            <table style=""width: 100%; border-collapse: collapse; border: 1px solid #333; margin-bottom: 20px;"">
                <tr>
                    <td style=""border: 1px solid #333; padding: 8px; font-weight: bold; background-color: #f8f9fa;"">Net salary</td>
                    <td style=""border: 1px solid #333; padding: 8px; background-color: #f8f9fa;"">{formattedTotalAmount} INR</td>
                </tr>
                <tr>
                    <td style=""border: 1px solid #333; padding: 8px;"">Paid amount</td>
                    <td style=""border: 1px solid #333; padding: 8px;"">{formattedTotalAmount} INR</td>
                </tr>
                <tr>
                    <td style=""border: 1px solid #333; padding: 8px;"">Total Deductions</td>
                    <td style=""border: 1px solid #333; padding: 8px;"">NA</td>
                </tr>
            </table>

            <!-- Attendance Summary -->
            <h4 style=""margin: 20px 0 10px 0; color: #333;"">Attendance summary:</h4>
            <table style=""width: 100%; border-collapse: collapse; border: 1px solid #333; margin-bottom: 20px;"">
                <tr style=""background-color: #f8f9fa;"">
                    <td style=""border: 1px solid #333; padding: 8px; font-weight: bold; text-align: center;"">Present</td>
                    <td style=""border: 1px solid #333; padding: 8px; font-weight: bold; text-align: center;"">Absent</td>
                    <td style=""border: 1px solid #333; padding: 8px; font-weight: bold; text-align: center;"">Half days</td>
                    <td style=""border: 1px solid #333; padding: 8px; font-weight: bold; text-align: center;"">Paid leaves</td>
                    <td style=""border: 1px solid #333; padding: 8px; font-weight: bold; text-align: center;"">LOP</td>
                </tr>
                <tr>
                    <td style=""border: 1px solid #333; padding: 8px; text-align: center;"">-</td>
                    <td style=""border: 1px solid #333; padding: 8px; text-align: center;"">-</td>
                    <td style=""border: 1px solid #333; padding: 8px; text-align: center;"">-</td>
                    <td style=""border: 1px solid #333; padding: 8px; text-align: center;"">-</td>
                    <td style=""border: 1px solid #333; padding: 8px; text-align: center;"">-</td>
                </tr>
                <tr style=""background-color: #f8f9fa;"">
                    <td style=""border: 1px solid #333; padding: 8px; font-weight: bold; text-align: center;"">Double present</td>
                    <td style=""border: 1px solid #333; padding: 8px; font-weight: bold; text-align: center;"">Week off</td>
                    <td style=""border: 1px solid #333; padding: 8px; font-weight: bold; text-align: center;"">Holidays</td>
                    <td style=""border: 1px solid #333; padding: 8px; font-weight: bold; text-align: center;"">Hours worked</td>
                    <td style=""border: 1px solid #333; padding: 8px; font-weight: bold; text-align: center;"">OT</td>
                </tr>
                <tr>
                    <td style=""border: 1px solid #333; padding: 8px; text-align: center;"">-</td>
                    <td style=""border: 1px solid #333; padding: 8px; text-align: center;"">-</td>
                    <td style=""border: 1px solid #333; padding: 8px; text-align: center;"">-</td>
                    <td style=""border: 1px solid #333; padding: 8px; text-align: center;"">-</td>
                    <td style=""border: 1px solid #333; padding: 8px; text-align: center;"">-</td>
                </tr>
            </table>

            <!-- Paid Amount Breakdown -->
            <h4 style=""margin: 20px 0 10px 0; color: #333;"">Paid amount Breakdown:</h4>
            <table style=""width: 100%; border-collapse: collapse; border: 1px solid #333; margin-bottom: 20px;"">
                <tr style=""background-color: #f8f9fa;"">
                    <td style=""border: 1px solid #333; padding: 8px; font-weight: bold; text-align: center;"">Employee ID</td>
                    <td style=""border: 1px solid #333; padding: 8px; font-weight: bold; text-align: center;"">Pay period</td>
                    <td style=""border: 1px solid #333; padding: 8px; font-weight: bold; text-align: center;"">Pay Date</td>
                </tr>
                <tr>
                    <td style=""border: 1px solid #333; padding: 8px; text-align: center;"">{tutorCode}</td>
                    <td style=""border: 1px solid #333; padding: 8px; text-align: center;"">{monthName} {year}</td>
                    <td style=""border: 1px solid #333; padding: 8px; text-align: center;"">{invoiceDate}</td>
                </tr>
            </table>

            <!-- Footer Note -->
            <p style=""margin: 20px 0 0 0; color: #666; font-size: 12px; font-style: italic; text-align: center; border-top: 2px solid #333; padding-top: 15px;"">
                *This is a computer generated payslip and does not require signature and stamp.
            </p>
        </div>
    </div>

</body>
</html>";
                return htmlTemplate;
            }
            catch (Exception ex)
            {
                // Log the actual exception for debugging
                // You should replace this with your actual logging mechanism
                System.Diagnostics.Debug.WriteLine($"Error in GenerateStudentInvoiceHtml: {ex.Message}");
                System.Diagnostics.Debug.WriteLine($"Stack trace: {ex.StackTrace}");

                // Consider throwing the exception instead of returning null for better error handling
                throw new InvalidOperationException($"Failed to generate invoice HTML: {ex.Message}", ex);

                // If you must return null, at least log why
                // return null;
            }
        }

        private static string BuildAddress(params string?[] parts)
        {
            var segments = parts.Where(p => !string.IsNullOrWhiteSpace(p)).Select(p => p!.Trim());
            return string.Join(", ", segments);
        }
    }
}
