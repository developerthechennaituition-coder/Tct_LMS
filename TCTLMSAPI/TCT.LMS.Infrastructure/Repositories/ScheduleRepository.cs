using Common;
using DocumentFormat.OpenXml.InkML;
using DocumentFormat.OpenXml.Spreadsheet;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Stripe;
using System;
using System.Buffers;
using System.Collections.Generic;
using System.Data;
using System.Data.Common;
using System.Globalization;
using System.Linq;
using System.Net.NetworkInformation;
using System.Text;
using System.Threading.Tasks;
using System.Threading.Tasks.Dataflow;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Data.Common;
using TCT.LMS.Domain;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Invoice;
using TCT.LMS.DTOs.Payment;
using TCT.LMS.DTOs.Payroll;
using TCT.LMS.DTOs.Sales;
using TCT.LMS.DTOs.Schedule;
using TCT.LMS.DTOs.Tutor;
using TCT.LMS.DTOs.Wrappers;
using TCT.LMS.Infrastructure.Common;
using TCT.LMS.Infrastructure.Common;
using TCT.LMS.DTOs.Schedule;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace TCT.LMS.Infrastructure.Repositories
{
    public partial class ScheduleRepository : GenericRepository<Schedule>, IScheduleRepository
    {
        public readonly ApplicationDbContext _dbContext;
        private readonly IConfiguration _configuration;
        private readonly IEmailService _emailService;

        private readonly IMasterDetailRepository _masterDetailRepository;
        public ScheduleRepository(ApplicationDbContext dbContext,
            IMasterDetailRepository masterDetailRepository,
            IConfiguration configuration,
            IEmailService emailService) : base(dbContext)
        {
            _dbContext = dbContext;
            _masterDetailRepository = masterDetailRepository;
            _configuration = configuration;
            _emailService = emailService;
        }

        public async Task<Response<List<ScheduleDTO>>> GetStudentClasses(Guid studentId)
        {
            var response = new Response<List<ScheduleDTO>>();
            response.Data = new List<ScheduleDTO>();

            //TODO: Needs to revisit the query
            var scheduleDetails = _dbContext.Schedule.Where(s => s.StudentId == studentId && s.IsActive == true)
                .Join(_dbContext.ScheduleDetails, schedule => new { schedule.ScheduleId, schedule.IsActive },
                                                  details => new { details.ScheduleId, details.IsActive },
                                                  (schedule, details) => new { schedule, details })
                .Where(s => s.schedule.StudentId == studentId && s.details.IsActive == true)
                .Select(i => (new ScheduleDTO()
                {
                    SubjectId = i.schedule.SubjectId,
                    Comment = i.schedule.Description,
                    ScheduleId = i.schedule.ScheduleId,
                    ScheduleDetailsId = i.details.ScheduleDetailsId,
                    SalesDetailsId = i.schedule.SalesDetailsId,
                    CreatedBy = i.schedule.CreatedBy,
                    CreatedDate = i.details.CreatedDate,
                    TutorId = i.schedule.TutorId,
                    StudentId = i.schedule.StudentId,
                    StartDate = i.schedule.StartDate,
                    EndDate = i.schedule.EndDate,
                    StartTime = i.details.StartTime,
                    EndTime = i.details.EndTime,
                    Status = i.details.Status,
                    ScheduleType = i.details.ScheduleType,
                    ScheduleStatus = i.details.TutorScheduleStatus,
                    Date = i.details.Date,
                })).ToList();

            foreach (var item in scheduleDetails)
            {
                DateTime startDateTime = new DateTime(item.Date.Value.Year, item.Date.Value.Month, item.Date.Value.Day, item.StartTime.Value.Hour, item.StartTime.Value.Minute, item.StartTime.Value.Second);
                DateTime endDateTime = new DateTime(item.Date.Value.Year, item.Date.Value.Month, item.Date.Value.Day, item.EndTime.Value.Hour, item.EndTime.Value.Minute, item.EndTime.Value.Second);

                item.StartDate = startDateTime;
                item.EndDate = endDateTime;
                var scheduleStatusType = _dbContext.Type_Code.Where(s => s.Id == item.ScheduleStatus).FirstOrDefault();
                if (scheduleStatusType != null)
                {
                    item.ScheduleStatusCode = scheduleStatusType.TypeCodeValue;
                    item.ScheduleStatusName = scheduleStatusType.TypeCodeName;
                }
                var subjctType = _dbContext.Type_Code.Where(s => s.Id == item.SubjectId).FirstOrDefault();
                item.SubjectId = item.SubjectId;
                item.SubjectName = subjctType.TypeCodeName;
                var user = _dbContext.User.Where(s => s.Id == item.TutorId).FirstOrDefault();
                if (user != null)
                {
                    item.TutorName = $"{user.FirstName} {user.LastName}";
                }
            }
            response.Data = scheduleDetails;
            return response;
        }

        public async Task<Response<List<ScheduleDTO>>> GetAllScheduledEvents(Guid guestId, string guestType)
        {
            var response = new Response<List<ScheduleDTO>>();
            response.Data = new List<ScheduleDTO>();

            var _typeCode = await _masterDetailRepository.GetByTypeGroupId("1009");



            //TODO: Needs to revisit the query
            if (guestType == "tutor")
            {
                response.Data = _dbContext.Schedule
                               .Where(s => s.TutorId == guestId && s.IsActive == true)
                               .Join(
                                   _dbContext.ScheduleDetails.Where(sd => sd.IsActive),
                                   s => s.ScheduleId,
                                   sd => sd.ScheduleId,
                                   (schedule, details) => new ScheduleDTO()
                                   {
                                       Title = schedule.Title,
                                       SubjectId = schedule.SubjectId,
                                       TutorComment = details.TutorComment,
                                       StudentComment = details.StudentComment,
                                       MeetingLink = details.MeetingLink,
                                       Comment = schedule.Description,
                                       ScheduleId = schedule.ScheduleId,
                                       TutorScheduleStatus = details.TutorScheduleStatus,
                                       StudentScheduleStatus = details.StudentScheduleStatus,
                                       ScheduleDetailsId = details.ScheduleDetailsId,
                                       SalesDetailsId = schedule.SalesDetailsId,
                                       CreatedBy = schedule.CreatedBy,
                                       CreatedDate = details.CreatedDate,
                                       TutorId = guestId,
                                       StudentId = schedule.StudentId,
                                       StartDate = schedule.StartDate,
                                       EndDate = schedule.EndDate,
                                       StartTime = details.StartTime,
                                       EndTime = details.EndTime,
                                       Status = details.Status,
                                       ScheduleType = details.ScheduleType,
                                       ScheduleStatus = details.TutorScheduleStatus,
                                       Date = details.Date,
                                   }).ToList();
            }
            else if (guestType == "student")
            {
                var _user = _dbContext.User.Find(guestId);
                if (_user != null)
                {
                    var student = _dbContext.Student.Where(s => s.UserId == guestId).FirstOrDefault();
                    response.Data = _dbContext.Schedule
                                  .Where(s => s.StudentId == student.Id && s.IsActive == true)
                                  .Join(
                                      _dbContext.ScheduleDetails,//.Where(sd => sd.IsActive),
                                      s => s.ScheduleId,
                                      sd => sd.ScheduleId,
                                      (schedule, details) => new ScheduleDTO()
                                      {
                                          Title = schedule.Title,
                                          SubjectId = schedule.SubjectId,
                                          TutorComment = details.TutorComment,
                                          StudentComment = details.StudentComment,
                                          CoordinatorComment = details.Comment,
                                          MeetingLink = details.MeetingLink,
                                          Comment = schedule.Description,
                                          ScheduleId = schedule.ScheduleId,
                                          TutorScheduleStatus = details.TutorScheduleStatus,
                                          StudentScheduleStatus = details.StudentScheduleStatus,
                                          ScheduleDetailsId = details.ScheduleDetailsId,
                                          SalesDetailsId = schedule.SalesDetailsId,
                                          CreatedBy = schedule.CreatedBy,
                                          CreatedDate = details.CreatedDate,
                                          TutorId = schedule.TutorId,
                                          StudentId = schedule.StudentId,
                                          StartDate = schedule.StartDate,
                                          EndDate = schedule.EndDate,
                                          StartTime = details.StartTime,
                                          EndTime = details.EndTime,
                                          Status = details.Status,
                                          ScheduleType = details.ScheduleType,
                                          ScheduleStatus = details.StudentScheduleStatus,
                                          Date = details.Date,
                                      }).ToList();
                }
            }
            if (response.Data == null)
            {
                response.Data = new List<ScheduleDTO>();
                return response;
            }

            var _scheduleDetails = response.Data;
            foreach (var item in _scheduleDetails)
            {
                item.Date = item.Date.Value.ToLocalTime();
                TimeZoneInfo istTimeZone = TimeZoneInfo.FindSystemTimeZoneById("India Standard Time");
                DateTime startDateTime = new DateTime(item.Date.Value.Year, item.Date.Value.Month, item.Date.Value.Day, item.StartTime.Value.Hour, item.StartTime.Value.Minute, item.StartTime.Value.Second);
                DateTime endDateTime = new DateTime(item.Date.Value.Year, item.Date.Value.Month, item.Date.Value.Day, item.EndTime.Value.Hour, item.EndTime.Value.Minute, item.EndTime.Value.Second);

                DateTime istStartDateTime = TimeZoneInfo.ConvertTimeFromUtc(startDateTime, istTimeZone);
                DateTime istEndDateTime = TimeZoneInfo.ConvertTimeFromUtc(endDateTime, istTimeZone);

                item.StartDate = istStartDateTime;
                item.EndDate = istEndDateTime;
                if (item.ScheduleStatus != null && item.ScheduleStatus != Guid.Empty)
                {
                    var scheduleStatusType = _typeCode.Where(s => s.Id == item.ScheduleStatus).FirstOrDefault();
                    if (scheduleStatusType != null)
                    {
                        item.ScheduleStatusCode = scheduleStatusType.TypeCodeValue;
                        item.ScheduleStatusName = scheduleStatusType.TypeCodeName;
                        if (scheduleStatusType.TypeCodeValue != (int)FollowUpStatus.DemoScheduled && scheduleStatusType.TypeCodeValue != (int)FollowUpStatus.Schedule)
                        {
                            item.DisableActions = true;
                        }
                    }
                }
                var subjctType = _dbContext.Type_Code.Where(s => s.Id == item.SubjectId).FirstOrDefault();
                item.SubjectId = item.SubjectId;
                item.SubjectName = subjctType?.TypeCodeName;
                if (guestType == "student")
                {
                    var user = _dbContext.User.Where(s => s.Id == item.TutorId).FirstOrDefault();
                    if (user != null)
                    {
                        item.TutorName = $"{user.FirstName} {user.LastName}";
                        item.TutorUserId = user.Id;
                    }
                }
                if (guestType == "tutor")
                {
                    var student = _dbContext.Student.Where(s => s.Id == item.StudentId).FirstOrDefault();
                    var user = _dbContext.User.Where(s => s.Id == student.UserId).FirstOrDefault();
                    if (user != null)
                    {
                        item.StudentName = $"{user.FirstName} {user.LastName}";
                        item.StudentUserId = user.Id;
                    }
                }
            }
            response.Data = _scheduleDetails;
            return response;
        }

        public async Task<Response<List<ScheduleDTO>>> GetScheduleDetailsById(Guid guestId, string guestType, string month, string year)
        {
            var response = new Response<List<ScheduleDTO>>();
            response.Data = new List<ScheduleDTO>();

            if (!int.TryParse(month, out int monthInt) || !int.TryParse(year, out int yearInt))
            {
                response.Succeeded = false;
                response.Message = "Invalid month or year format.";
                return response;
            }

            var _typeCode = await _masterDetailRepository.GetByTypeGroupId("1009");
            TimeZoneInfo istTimeZone = TimeZoneInfo.FindSystemTimeZoneById("India Standard Time");

            if (guestType == "tutor")
            {
                var _user = _dbContext.User.Find(guestId);
                if (_user != null)
                {
                    var tutor = _dbContext.Tutor.AsNoTracking().FirstOrDefault(s => s.UserId == guestId);
                    if (tutor != null)
                    {
                        // Schedule.TutorId holds the Tutor.Id; older schedules hold the tutor's User.Id.
                        response.Data = _dbContext.Schedule
                        .AsNoTracking()
                        .Where(s => (s.TutorId == tutor.Id || s.TutorId == tutor.UserId) && s.IsActive)
                        .Join(
                            _dbContext.ScheduleDetails
                                .AsNoTracking()
                                .Where(sd => sd.IsActive &&
                                            (
                                                (sd.StartTime.Month == monthInt && sd.StartTime.Year == yearInt) ||
                                                (sd.EndTime.Month == monthInt && sd.EndTime.Year == yearInt)
                                            )),
                            s => s.ScheduleId,
                            sd => sd.ScheduleId,
                            (schedule, details) => new ScheduleDTO
                            {
                                Title = schedule.Title,
                                SubjectId = schedule.SubjectId,
                                TutorComment = details.TutorComment,
                                StudentComment = details.StudentComment,
                                MeetingLink = details.MeetingLink,
                                Comment = schedule.Description,
                                ScheduleId = schedule.ScheduleId,
                                TutorScheduleStatus = details.TutorScheduleStatus,
                                StudentScheduleStatus = details.StudentScheduleStatus,
                                OperationScheduleStatus = details.OperationScheduleStatus,
                                ScheduleDetailsId = details.ScheduleDetailsId,
                                SalesDetailsId = schedule.SalesDetailsId,
                                CreatedBy = schedule.CreatedBy,
                                CreatedDate = details.CreatedDate,
                                TutorId = guestId,
                                StudentId = schedule.StudentId,
                                StartDate = schedule.StartDate,
                                EndDate = schedule.EndDate,
                                StartTime = details.StartTime,
                                EndTime = details.EndTime,
                                Status = details.Status,
                                ScheduleType = details.ScheduleType,
                                ScheduleStatus = details.TutorScheduleStatus,
                                Date = details.Date,
                                SalesId = _dbContext.SalesDetails
                                    .Where(x => x.Id == schedule.SalesDetailsId)
                                    .Select(x => x.SalesId)
                                    .FirstOrDefault(),
                                TutorName = schedule.TutorId == null || schedule.TutorId == Guid.Empty
                                    ? "NA"
                                    : (
                                        from t in _dbContext.Tutor
                                        join u in _dbContext.User on t.UserId equals u.Id
                                        where t.Id == schedule.TutorId || t.UserId == schedule.TutorId
                                        select u.FullName
                                      ).FirstOrDefault() ?? "NA",
                            })
                        .ToList();
                    }
                }
            }
            else if (guestType == "student")
            {
                var _user = _dbContext.User.Find(guestId);
                if (_user != null)
                {
                    var student = _dbContext.Student.AsNoTracking().FirstOrDefault(s => s.UserId == guestId);
                    if (student != null)
                    {

                        response.Data = _dbContext.Schedule
                            .AsNoTracking()
                            .Where(s => s.StudentId == student.Id && s.IsActive)
                            .Join(
                                _dbContext.ScheduleDetails
                                    .AsNoTracking()
                                    .Where(sd => sd.IsActive &&
                                        (
                                            (sd.StartTime.Month == monthInt && sd.StartTime.Year == yearInt) ||
                                            (sd.EndTime.Month == monthInt && sd.EndTime.Year == yearInt)
                                        )),
                                s => s.ScheduleId,
                                sd => sd.ScheduleId,
                                (schedule, details) => new ScheduleDTO
                                {
                                    Title = schedule.Title,
                                    SubjectId = schedule.SubjectId,
                                    TutorComment = details.TutorComment,
                                    StudentComment = details.StudentComment,
                                    CoordinatorComment = details.Comment,
                                    MeetingLink = details.MeetingLink,
                                    Comment = schedule.Description,
                                    ScheduleId = schedule.ScheduleId,
                                    TutorScheduleStatus = details.TutorScheduleStatus,
                                    StudentScheduleStatus = details.StudentScheduleStatus,
                                    OperationScheduleStatus = details.OperationScheduleStatus,
                                    ScheduleDetailsId = details.ScheduleDetailsId,
                                    SalesDetailsId = schedule.SalesDetailsId,
                                    CreatedBy = schedule.CreatedBy,
                                    CreatedDate = details.CreatedDate,
                                    TutorId = schedule.TutorId,
                                    StudentId = schedule.StudentId,
                                    StartDate = schedule.StartDate,
                                    EndDate = schedule.EndDate,
                                    StartTime = details.StartTime,
                                    EndTime = details.EndTime,
                                    Status = details.Status,
                                    ScheduleType = details.ScheduleType,
                                    ScheduleStatus = details.StudentScheduleStatus,
                                    Date = details.Date,
                                    AccountsApprovalStatusCode = _dbContext.Type_Code
                                        .Where(code => code.Id == schedule.AccountsApprovalScheduleStatus)
                                        .Select(code => code.TypeCodeValue)
                                        .FirstOrDefault(),
                                    SalesId = _dbContext.SalesDetails
                                        .Where(x => x.Id == schedule.SalesDetailsId)
                                        .Select(x => x.SalesId)
                                        .FirstOrDefault(),
                                    TutorName = schedule.TutorId == null || schedule.TutorId == Guid.Empty
                                    ? "NA"
                                    : (
                                        from t in _dbContext.Tutor
                                        join u in _dbContext.User on t.UserId equals u.Id
                                        where t.Id == schedule.TutorId
                                        select u.FullName
                                      ).FirstOrDefault() ?? "NA",
                                })
                            .ToList();
                    }
                }
            }
            else if (guestType == "operation")
            {
                var _user = _dbContext.User.Find(guestId);
                if (_user != null)
                {
                    // An Operations user can own many students - aggregate all of them,
                    // not just the first match.
                    var ownedStudentIds = _dbContext.Sales
                        .AsNoTracking()
                        .Where(s => s.Ownership == guestId && s.StudentId != null)
                        .Select(s => s.StudentId!.Value)
                        .ToList();

                    if (ownedStudentIds.Count > 0)
                    {
                        response.Data = _dbContext.Schedule
                            .AsNoTracking()
                            .Where(s => ownedStudentIds.Contains(s.StudentId) && s.IsActive)
                            .Join(
                                _dbContext.ScheduleDetails
                                    .AsNoTracking()
                                    .Where(sd => sd.IsActive &&
                                        (
                                            (sd.StartTime.Month == monthInt && sd.StartTime.Year == yearInt) ||
                                            (sd.EndTime.Month == monthInt && sd.EndTime.Year == yearInt)
                                        )),
                                s => s.ScheduleId,
                                sd => sd.ScheduleId,
                                (schedule, details) => new ScheduleDTO
                                {
                                    Title = schedule.Title,
                                    SubjectId = schedule.SubjectId,
                                    TutorComment = details.TutorComment,
                                    StudentComment = details.StudentComment,
                                    CoordinatorComment = details.Comment,
                                    MeetingLink = details.MeetingLink,
                                    Comment = schedule.Description,
                                    ScheduleId = schedule.ScheduleId,
                                    TutorScheduleStatus = details.TutorScheduleStatus,
                                    StudentScheduleStatus = details.StudentScheduleStatus,
                                    OperationScheduleStatus = details.OperationScheduleStatus,
                                    ScheduleDetailsId = details.ScheduleDetailsId,
                                    SalesDetailsId = schedule.SalesDetailsId,
                                    CreatedBy = schedule.CreatedBy,
                                    CreatedDate = details.CreatedDate,
                                    TutorId = schedule.TutorId,
                                    StudentId = schedule.StudentId,
                                    StartDate = schedule.StartDate,
                                    EndDate = schedule.EndDate,
                                    StartTime = details.StartTime,
                                    EndTime = details.EndTime,
                                    Status = details.Status,
                                    ScheduleType = details.ScheduleType,
                                    //ScheduleStatus = salesDetails.Status,
                                    ScheduleStatus = details.StudentScheduleStatus,
                                    Date = details.Date,
                                    IsStudentPresent = details.IsStudentPresent,
                                    IsTutorPresent = details.IsTutorPresent,
                                    SalesId = _dbContext.SalesDetails
                                        .Where(x => x.Id == schedule.SalesDetailsId)
                                        .Select(x => x.SalesId)
                                        .FirstOrDefault(),
                                    TutorName = schedule.TutorId == null || schedule.TutorId == Guid.Empty
                                ? "NA"
                                : (
                                    from t in _dbContext.Tutor
                                    join u in _dbContext.User on t.UserId equals u.Id
                                    where t.Id == schedule.TutorId
                                    select u.FullName
                                  ).FirstOrDefault() ?? "NA",
                                })
                            .ToList();
                    }
                }
            }
            else if (guestType == "coordinator")
            {
                var _user = _dbContext.User.Find(guestId);
                if (_user != null)
                {
                    // A coordinator can have many students/subjects - aggregate all of them,
                    // not just the first match.
                    var coordinatedSalesDetailsIds = _dbContext.SalesDetails
                        .AsNoTracking()
                        .Where(sd => sd.Coordinator == guestId && sd.IsActive)
                        .Select(sd => sd.Id)
                        .ToList();

                    if (coordinatedSalesDetailsIds.Count > 0)
                    {
                        response.Data = _dbContext.Schedule
                            .AsNoTracking()
                            .Where(s => coordinatedSalesDetailsIds.Contains(s.SalesDetailsId) && s.IsActive)
                            .Join(
                                _dbContext.ScheduleDetails
                                    .AsNoTracking()
                                    .Where(sd => sd.IsActive &&
                                        (
                                            (sd.StartTime.Month == monthInt && sd.StartTime.Year == yearInt) ||
                                            (sd.EndTime.Month == monthInt && sd.EndTime.Year == yearInt)
                                        )),
                                s => s.ScheduleId,
                                sd => sd.ScheduleId,
                                (schedule, details) => new ScheduleDTO
                                {
                                    Title = schedule.Title,
                                    SubjectId = schedule.SubjectId,
                                    TutorComment = details.TutorComment,
                                    StudentComment = details.StudentComment,
                                    CoordinatorComment = details.Comment,
                                    MeetingLink = details.MeetingLink,
                                    Comment = schedule.Description,
                                    ScheduleId = schedule.ScheduleId,
                                    TutorScheduleStatus = details.TutorScheduleStatus,
                                    StudentScheduleStatus = details.StudentScheduleStatus,
                                    OperationScheduleStatus = details.OperationScheduleStatus,
                                    ScheduleDetailsId = details.ScheduleDetailsId,
                                    SalesDetailsId = schedule.SalesDetailsId,
                                    CreatedBy = schedule.CreatedBy,
                                    CreatedDate = details.CreatedDate,
                                    TutorId = schedule.TutorId,
                                    StudentId = schedule.StudentId,
                                    StartDate = schedule.StartDate,
                                    EndDate = schedule.EndDate,
                                    StartTime = details.StartTime,
                                    EndTime = details.EndTime,
                                    Status = details.Status,
                                    ScheduleType = details.ScheduleType,
                                    ScheduleStatus = details.StudentScheduleStatus,
                                    Date = details.Date,
                                    IsStudentPresent = details.IsStudentPresent,
                                    IsTutorPresent = details.IsTutorPresent,
                                    SalesId = _dbContext.SalesDetails
                                        .Where(x => x.Id == schedule.SalesDetailsId)
                                        .Select(x => x.SalesId)
                                        .FirstOrDefault(),
                                    TutorName = schedule.TutorId == null || schedule.TutorId == Guid.Empty
                                        ? "NA"
                                        : (
                                            from t in _dbContext.Tutor
                                            join u in _dbContext.User on t.UserId equals u.Id
                                            where t.Id == schedule.TutorId
                                            select u.FullName
                                          ).FirstOrDefault() ?? "NA",
                                })
                            .ToList();
                    }
                }
            }
            else if (guestType == "accounts")
            {
                response.Data = _dbContext.Schedule.AsNoTracking()
                    .Where(schedule => schedule.IsActive)
                    .Join(
                        _dbContext.ScheduleDetails.AsNoTracking().Where(details => details.IsActive &&
                            ((details.StartTime.Month == monthInt && details.StartTime.Year == yearInt) ||
                             (details.EndTime.Month == monthInt && details.EndTime.Year == yearInt))),
                        schedule => schedule.ScheduleId,
                        details => details.ScheduleId,
                        (schedule, details) => new ScheduleDTO
                        {
                            Title = schedule.Title,
                            SubjectId = schedule.SubjectId,
                            TutorComment = details.TutorComment,
                            StudentComment = details.StudentComment,
                            CoordinatorComment = details.Comment,
                            MeetingLink = details.MeetingLink,
                            Comment = schedule.Description,
                            ScheduleId = schedule.ScheduleId,
                            TutorScheduleStatus = details.TutorScheduleStatus,
                            StudentScheduleStatus = details.StudentScheduleStatus,
                            OperationScheduleStatus = details.OperationScheduleStatus,
                            ScheduleDetailsId = details.ScheduleDetailsId,
                            SalesDetailsId = schedule.SalesDetailsId,
                            CreatedBy = schedule.CreatedBy,
                            CreatedDate = details.CreatedDate,
                            TutorId = schedule.TutorId,
                            StudentId = schedule.StudentId,
                            StartDate = schedule.StartDate,
                            EndDate = schedule.EndDate,
                            StartTime = details.StartTime,
                            EndTime = details.EndTime,
                            Status = details.Status,
                            ScheduleType = details.ScheduleType,
                            ScheduleStatus = details.StudentScheduleStatus,
                            Date = details.Date,
                            IsStudentPresent = details.IsStudentPresent,
                            IsTutorPresent = details.IsTutorPresent,
                            SalesId = _dbContext.SalesDetails.Where(x => x.Id == schedule.SalesDetailsId)
                                .Select(x => x.SalesId).FirstOrDefault(),
                            TutorName = schedule.TutorId == Guid.Empty ? "NA" :
                                (from tutor in _dbContext.Tutor
                                 join user in _dbContext.User on tutor.UserId equals user.Id
                                 where tutor.Id == schedule.TutorId
                                 select user.FullName).FirstOrDefault() ?? "NA"
                        })
                    .ToList();
            }

            if (response.Data == null)
            {
                response.Data = new List<ScheduleDTO>();
                return response;
            }

            var _scheduleDetails = response.Data;

            foreach (var item in _scheduleDetails)
            {
                var localDate = new DateTime(
                    item.Date!.Value.Year,
                    item.Date.Value.Month,
                    item.Date.Value.Day,
                    0, 0, 0,
                    DateTimeKind.Unspecified);

                var localStart = new DateTime(
                    localDate.Year, localDate.Month, localDate.Day,
                    item.StartTime!.Value.Hour,
                    item.StartTime.Value.Minute,
                    item.StartTime.Value.Second,
                    DateTimeKind.Unspecified);

                var localEnd = new DateTime(
                    localDate.Year, localDate.Month, localDate.Day,
                    item.EndTime!.Value.Hour,
                    item.EndTime.Value.Minute,
                    item.EndTime.Value.Second,
                    DateTimeKind.Unspecified);

                item.StartDate = TimeZoneInfo.ConvertTimeToUtc(localStart, istTimeZone);
                item.EndDate = TimeZoneInfo.ConvertTimeToUtc(localEnd, istTimeZone);

                // Status enrichment
                if (item.ScheduleStatus != null && item.ScheduleStatus != Guid.Empty)
                {
                    var scheduleStatusType = _typeCode.FirstOrDefault(s => s.Id == item.ScheduleStatus);
                    if (scheduleStatusType != null)
                    {
                        item.ScheduleStatusCode = scheduleStatusType.TypeCodeValue;
                        item.ScheduleStatusName = scheduleStatusType.TypeCodeName;

                        bool isExcludedStatus =
                            scheduleStatusType.TypeCodeValue != (int)FollowUpStatus.DemoScheduled &&
                            scheduleStatusType.TypeCodeValue != (int)FollowUpStatus.Schedule;

                        bool presenceCheck = true;
                        if (guestType == "operation")
                        {
                            presenceCheck =
                                item.IsTutorPresent != null &&
                                item.IsStudentPresent != null;
                        }

                        if (isExcludedStatus && presenceCheck)
                        {
                            item.DisableActions = true;
                        }
                    }
                }

                // Student calendar, display only: when the student has not submitted a status, show the
                // tutor's Extra Class / Preponed / Postponed status name. ScheduleStatus, ScheduleStatusCode
                // and DisableActions stay as they are, so the student's own attendance flow is unchanged.
                if (guestType == "student" && string.IsNullOrEmpty(item.ScheduleStatusName) &&
                    item.TutorScheduleStatus != null && item.TutorScheduleStatus != Guid.Empty)
                {
                    var tutorStatusType = _typeCode.FirstOrDefault(s => s.Id == item.TutorScheduleStatus);
                    if (tutorStatusType != null &&
                        (tutorStatusType.TypeCodeValue == (int)ClassStatusType.ClassCompletedExtraClass ||
                         tutorStatusType.TypeCodeValue == (int)ClassStatusType.ClassCompletedPreponed ||
                         tutorStatusType.TypeCodeValue == (int)ClassStatusType.ClassCompletedPostponed))
                    {
                        item.ScheduleStatusName = tutorStatusType.TypeCodeName;
                    }
                }


                //if (item.ScheduleStatus != null && item.ScheduleStatus != Guid.Empty)
                //{
                //    var scheduleStatusType = _typeCode.FirstOrDefault(s => s.Id == item.ScheduleStatus);
                //    if (scheduleStatusType != null)
                //    {
                //        item.ScheduleStatusCode = scheduleStatusType.TypeCodeValue;
                //        item.ScheduleStatusName = scheduleStatusType.TypeCodeName;
                //        if (scheduleStatusType.TypeCodeValue != (int)FollowUpStatus.DemoScheduled &&
                //            scheduleStatusType.TypeCodeValue != (int)FollowUpStatus.Schedule
                //            && item.IsTutorPresent != null && item.IsStudentPresent != null)
                //        {
                //            item.DisableActions = true;
                //        }
                //    }
                //}

                // Subject mapping
                var subjctType = _dbContext.Type_Code.AsNoTracking().FirstOrDefault(s => s.Id == item.SubjectId);
                item.SubjectName = subjctType?.TypeCodeName;

                // Tutor/Student names
                if (guestType == "student")
                {
                    var user = _dbContext.User.AsNoTracking().FirstOrDefault(s => s.Id == item.TutorId);
                    if (user != null)
                    {
                        item.TutorName = $"{user.FirstName} {user.LastName}";
                        item.TutorUserId = user.Id;
                    }
                }

                if (guestType == "tutor")
                {
                    var student = _dbContext.Student.AsNoTracking().FirstOrDefault(s => s.Id == item.StudentId);
                    var user = student == null ? null : _dbContext.User.AsNoTracking().FirstOrDefault(s => s.Id == student.UserId);
                    if (user != null)
                    {
                        item.StudentName = $"{user.FirstName} {user.LastName}";
                        item.StudentUserId = user.Id;
                    }
                }
                if (string.Equals(guestType, "operation", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(guestType, "coordinator", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(guestType, "accounts", StringComparison.OrdinalIgnoreCase))
                {
                    var tutorUser = _dbContext.User.AsNoTracking()
                        .FirstOrDefault(s => s.Id == item.TutorId);

                    if (tutorUser != null)
                    {
                        item.TutorName = $"{tutorUser.FirstName} {tutorUser.LastName}";
                        item.TutorUserId = tutorUser.Id;
                    }

                    var student = _dbContext.Student.AsNoTracking()
                        .FirstOrDefault(s => s.Id == item.StudentId);

                    if (student != null)
                    {
                        var studentUser = _dbContext.User.AsNoTracking()
                            .FirstOrDefault(s => s.Id == student.UserId);

                        if (studentUser != null)
                        {
                            item.StudentName = $"{studentUser.FirstName} {studentUser.LastName}";
                            item.StudentUserId = studentUser.Id;
                        }
                    }
                }
            }

            // A tutor's or student's saved status stays locked unless Operations approved an edit request.
            if (guestType == "tutor" || guestType == "student")
                await ApplyStatusEditRequestsAsync(_scheduleDetails, guestId);

            response.Data = _scheduleDetails;
            response.Succeeded = true;
            return response;
        }


        public async Task<bool> AddSchedule(ScheduleDTO scheduleDto)
        {
            using var transaction = await _dbContext.Database.BeginTransactionAsync();
            var changedDate = DateTime.UtcNow;
            try
            {
                TimeZoneInfo istTimeZone = TimeZoneInfo.FindSystemTimeZoneById("India Standard Time");
                DateTime istStartDateTime = TimeZoneInfo.ConvertTimeFromUtc(scheduleDto.StartDate.Value, istTimeZone);
                DateTime istEndDateTime = TimeZoneInfo.ConvertTimeFromUtc(scheduleDto.EndDate.Value, istTimeZone);

                var salesDetails = _dbContext.SalesDetails.Where(s => s.Id == scheduleDto.SalesDetailsId && s.IsActive == true).FirstOrDefault();
                var sales = _dbContext.Sales.Where(s => s.Id == salesDetails.SalesId && s.IsActive == true).FirstOrDefault();

                var schedule = new Schedule();
                schedule.TutorId = scheduleDto.TutorId.Value;
                schedule.StudentId = sales.StudentId.Value;
                schedule.StartDate = istStartDateTime;
                schedule.EndDate = istEndDateTime;
                schedule.IsActive = true;
                schedule.CreatedBy = scheduleDto.CreatedBy;
                schedule.CreatedDate = changedDate;

                _dbContext.Schedule.Add(schedule);

                DateTime fromDate = scheduleDto.StartDate.Value;
                DateTime toDate = scheduleDto.EndDate == null ? scheduleDto.StartDate.Value : scheduleDto.EndDate.Value;

                for (DateTime date = fromDate; date <= toDate; date = date.AddDays(1))
                {
                    // Create a new instance per iteration — reusing the same object causes EF Core
                    // to track only one entity and overwrite it on each loop pass.
                    var scheduleDetails = new ScheduleDetails
                    {
                        ScheduleId = schedule.ScheduleId,
                        StartTime = istStartDateTime,
                        EndTime = istEndDateTime,
                        ScheduleType = scheduleDto.ScheduleDetailsDto?.ScheduleType ?? "NA",
                        TutorComment = scheduleDto.ScheduleDetailsDto?.TutorComment,
                        StudentComment = scheduleDto.ScheduleDetailsDto?.NoteText,
                        Status = scheduleDto.ScheduleDetailsDto?.Status,
                        Date = date,
                        IsActive = true,
                        CreatedBy = scheduleDto.CreatedBy,
                        CreatedDate = changedDate,
                    };
                    _dbContext.ScheduleDetails.Add(scheduleDetails);
                }


                var typeCode = _dbContext.Type_Code.Where(s => s.TypeCodeValue == 20019/*Demo Scheduled*/).FirstOrDefault();

                salesDetails.Status = typeCode.Id;
                salesDetails.ModifiedBy = scheduleDto.CreatedBy;
                salesDetails.ModifiedDate = changedDate;
                _dbContext.SalesDetails.Update(salesDetails);

                var student = _dbContext.Student
                               .Where(u => u.Id == sales.StudentId.Value && u.IsActive == true)
                               .FirstOrDefault();

                var studentName = _dbContext.User
                               .Where(u => u.Id == student.UserId && u.IsActive == true)
                               .Select(n => n.FirstName + " " + n.LastName)
                               .FirstOrDefault();
                /*
                var tutorNotification = new Notification
                {
                    SalesId = sales.Id,
                    SalesDetailsId = salesDetails.Id,
                    FromUserId = scheduleDto.CreatedBy,
                    ToUserId = scheduleDto.TutorId.Value,
                    Message = $"Demo scheduled for student '{studentName}' on {schdeuleDetails.Date}",
                    CreatedBy = scheduleDto.CreatedBy,
                    CreatedDate = changedDate,
                    IsActive = true,
                };
                _dbContext.Notification.Add(tutorNotification);

                var coordinatorNofification = _dbContext.Notification.Where(n => n.SalesId == sales.Id && n.SalesDetailsId == salesDetails.Id && n.IsActive == true).FirstOrDefault();
                coordinatorNofification.ModifiedBy = scheduleDto.CreatedBy;
                coordinatorNofification.ModifiedDate = changedDate;
                coordinatorNofification.IsActive = false;
                _dbContext.Notification.Update(coordinatorNofification);
                */
                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                throw;
            }
            return true;
        }

        private void AddScheduleDetais(ScheduleDetails schdeuleDetails)
        {
            throw new NotImplementedException();
        }

        public async Task<Response<bool>> UpdateScheduleDetails(TCTEvent inputData)
        {
            Response<bool> response = new Response<bool>();
            var scheduleDetails = _dbContext.ScheduleDetails.Where(s => s.ScheduleDetailsId == inputData.ScheduleDetailsId).FirstOrDefault();
            var typeCode = _dbContext.Type_Code.Where(s => s.Id == inputData.EventStatus).FirstOrDefault();

            using var transaction = await _dbContext.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
            try
            {
                if (scheduleDetails != null && typeCode != null && (typeCode.TypeCodeValue == 1009001 || typeCode.TypeCodeValue == 20020))
                {
                    var blocked = await GetPrepaidCompletionBlockReasonAsync(scheduleDetails);
                    if (blocked != null) return new Response<bool> { Succeeded = false, Data = false, Message = blocked };
                }
                if (scheduleDetails != null)
                {
                    scheduleDetails.ModifiedBy = inputData.UserId;
                    scheduleDetails.ModifiedDate = DateTime.Now;
                    scheduleDetails.IsActive = inputData.IsActive;
                    if (inputData.GuestType == "student")
                    {
                        scheduleDetails.StudentScheduleStatus = inputData.EventStatus;
                    }
                    else
                    {
                        scheduleDetails.TutorScheduleStatus = inputData.EventStatus;
                    }
                    _dbContext.Update(scheduleDetails);
                    await _dbContext.SaveChangesAsync();
                }
                if (!string.IsNullOrEmpty(inputData.NoteText))
                {
                    await _dbContext.TCTNotes.AddAsync(new TCTNotes()
                    {
                        NoteText = inputData.NoteText,
                        ReferenceId = inputData.ScheduleDetailsId,
                        CreatedBy = inputData.UserId.Value,
                        UserId = inputData.UserId.Value,
                        CreatedDate = DateTime.UtcNow,
                        Id = Guid.Empty,
                        ReferenceTypeId = inputData.EventStatus.Value,
                        IsActive = true
                    });
                    await _dbContext.SaveChangesAsync();
                }

                /*Update the schedule when demo class scheduled*/
                if (typeCode.TypeCodeValue == 20019 /*Demo Scheduled*/ || typeCode.TypeCodeValue == 20018 /*Demo Completed*/ || typeCode.TypeCodeValue == 20015 /*Demo Cancelled*/ || typeCode.TypeCodeValue == 20016 /*Demo Postponed*/ )
                {
                    var _schedule = _dbContext.Schedule.Where(s => s.ScheduleId == scheduleDetails.ScheduleId).FirstOrDefault();
                    var salesDetails = _dbContext.SalesDetails.SingleOrDefault(s => s.Id == _schedule.SalesDetailsId);
                    if (salesDetails != null)
                    {
                        salesDetails.ModifiedBy = inputData.UserId;
                        salesDetails.ModifiedDate = DateTime.Now;
                        salesDetails.Status = inputData.EventStatus.Value;
                        _dbContext.Update(salesDetails);
                        await _dbContext.SaveChangesAsync();
                    }

                }


                await transaction.CommitAsync();
                response.Succeeded = true;
            }
            catch (Exception ex)
            {
                response.Succeeded = false;
                await transaction.RollbackAsync();
            }
            return response;
        }
        
        private async Task<Response<bool>> UpdateActualClassStartDate(Guid scheduleDetailId, Guid salesDetailsId, Guid userId)
        {
            var scheduleDetail = await _dbContext.ScheduleDetails.FirstOrDefaultAsync(sd => sd.ScheduleDetailsId == scheduleDetailId);

            if (scheduleDetail == null)
            {
                return new Response<bool>()
                {
                    Data = false,
                    Message = "Schedule not found."
                };
            }

            var salesDetails = await _dbContext.SalesDetails.FirstOrDefaultAsync(sd => sd.Id == salesDetailsId);
            if (salesDetails == null)
            {
                return new Response<bool>()
                {
                    Data = false,
                    Message = "Sales Details not found."
                };
            }

            var actualStartDate = scheduleDetail.Date.Date;
            if (!salesDetails.ClassActualDate.HasValue || actualStartDate < salesDetails.ClassActualDate.Value.Date)
            {
                salesDetails.ClassActualDate = actualStartDate;
                salesDetails.ModifiedBy = userId;
                salesDetails.ModifiedDate = DateTime.Now;
            }

            var sales = await _dbContext.Sales.FirstOrDefaultAsync(s => s.Id == salesDetails.SalesId);

            if (sales != null && (!sales.ClassActualDate.HasValue || actualStartDate < sales.ClassActualDate.Value.Date))
            {
                sales.ClassActualDate = actualStartDate;
                sales.ModifiedBy = userId;
                sales.ModifiedDate = DateTime.Now;
            }

            await _dbContext.SaveChangesAsync();

            return new Response<bool>()
            {
                Data = false,
                Message = "Schedule not found."
            };
        }
        public async Task<Response<bool>> UpdateScheduleStatus(TCTEvent inputData)
        {
            Response<bool> response = new Response<bool>();
            using var transaction = await _dbContext.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
            var scheduleDetails = await _dbContext.ScheduleDetails.FindAsync(inputData.ScheduleDetailsId);
            var typeCode = _dbContext.Type_Code.Where(s => s.Id == inputData.EventStatus).FirstOrDefault();
            if (scheduleDetails == null || typeCode == null)
                return new Response<bool> { Succeeded = false, Data = false, Message = "Class or selected status not found." };
            if (typeCode.TypeCodeValue == 1009001 || typeCode.TypeCodeValue == 20020)
            {
                var blocked = await GetPrepaidCompletionBlockReasonAsync(scheduleDetails);
                if (blocked != null) return new Response<bool> { Succeeded = false, Data = false, Message = blocked };
            }

            var currentIndiaTime = DateHelper.TCTConvertTimeFromUtc(DateTime.UtcNow);
            // Test-environment switch only. Keep this disabled in production: accepting
            // future completion can trigger attendance approval and next-month rollover.
            var allowFutureClassCompletionForTesting = bool.TryParse(
                _configuration["Scheduling:AllowFutureClassCompletionForTesting"], out var enabled) && enabled;
            if (!allowFutureClassCompletionForTesting && scheduleDetails != null &&
                string.Equals(scheduleDetails.ScheduleType, "Class", StringComparison.OrdinalIgnoreCase) &&
                typeCode?.TypeCodeValue == (int)ClassStatusType.ClassCompleted &&
                scheduleDetails.EndTime > currentIndiaTime)
            {
                response.Data = false;
                response.Succeeded = false;
                response.Message = "Completed status is available only after the scheduled class end time.";
                return response;
            }

            // Tutor marking a regular class as Extra Class / Preponed / Postponed moves this occurrence's
            // scheduled time. Only the row identified by ScheduleDetailsId is touched.
            var updatesScheduledTime = scheduleDetails != null &&
                inputData.GuestType == "tutor" &&
                string.Equals(scheduleDetails.ScheduleType, "Class", StringComparison.OrdinalIgnoreCase) &&
                (typeCode?.TypeCodeValue == (int)ClassStatusType.ClassCompletedExtraClass ||
                 typeCode?.TypeCodeValue == (int)ClassStatusType.ClassCompletedPreponed ||
                 typeCode?.TypeCodeValue == (int)ClassStatusType.ClassCompletedPostponed);
            if (updatesScheduledTime)
            {
                if (!inputData.StartTime.HasValue || !inputData.EndTime.HasValue)
                {
                    response.Data = false;
                    response.Succeeded = false;
                    response.Message = "Start Time and End Time are required.";
                    return response;
                }
                if (inputData.EndTime.Value <= inputData.StartTime.Value)
                {
                    response.Data = false;
                    response.Succeeded = false;
                    response.Message = "End Time must be later than Start Time.";
                    return response;
                }
            }

            if (typeCode.TypeCodeValue == (int)FollowUpStatus.ClassCompleted)
            {
                await UpdateActualClassStartDate(inputData.SalesDetailsId.Value, inputData.ScheduleDetailsId, inputData.UserId.Value);
            }
            // The tutor's / student's own status for this class before this submission (read inside the
            // serializable transaction). Used only to tell a new attendance submission from a repeat of it.
            var previousSubmitterStatus = inputData.GuestType == "tutor"
                ? scheduleDetails.TutorScheduleStatus
                : inputData.GuestType == "student"
                    ? scheduleDetails.StudentScheduleStatus
                    : null;
            try
            {
                if (scheduleDetails != null)
                {
                    scheduleDetails.ModifiedBy = inputData.UserId;
                    scheduleDetails.ModifiedDate = DateTime.Now;
                    scheduleDetails.IsActive = true;
                    if (inputData.GuestType == "student")
                    {
                        scheduleDetails.StudentStartTime = inputData.StartTime;
                        scheduleDetails.StudentEndTime = inputData.EndTime;
                        scheduleDetails.StudentScheduleStatus = inputData.EventStatus;
                        scheduleDetails.StudentComment = inputData.NoteText;
                    }
                    else if (
                        string.Equals(inputData.GuestType, "coordinator", StringComparison.OrdinalIgnoreCase) ||
                        string.Equals(inputData.GuestType, "coordinatoradmin", StringComparison.OrdinalIgnoreCase) ||
                        string.Equals(inputData.GuestType, "superadmin", StringComparison.OrdinalIgnoreCase))
                    {
                        // Coordinator/Admin attendance updates are intentionally limited to demos.
                        // Store their status independently so Tutor/Student attendance is preserved.
                        if (string.Equals(scheduleDetails.ScheduleType, "Demo", StringComparison.OrdinalIgnoreCase))
                        {
                            scheduleDetails.StartTime = inputData.StartTime.Value;
                            scheduleDetails.EndTime = inputData.EndTime.Value;
                            scheduleDetails.Comment = inputData.NoteText;
                            scheduleDetails.OperationScheduleStatus = inputData.EventStatus;
                        }
                    }
                    else if (inputData.GuestType == "tutor")
                    {
                        scheduleDetails.TutorStartTime = inputData.StartTime;
                        scheduleDetails.TutorEndTime = inputData.EndTime;
                        scheduleDetails.TutorScheduleStatus = inputData.EventStatus;
                        scheduleDetails.TutorComment = inputData.NoteText;
                        if (updatesScheduledTime)
                        {
                            scheduleDetails.StartTime = inputData.StartTime.Value;
                            scheduleDetails.EndTime = inputData.EndTime.Value;
                        }
                    }
                    else if (inputData.GuestType == "operation")
                    {
                        var demoCompletedGuid = Guid.Parse("b06bd2c3-cb58-4060-b629-0babcb96fa18");

                        scheduleDetails.IsTutorPresent = inputData.StartTime.HasValue;
                        scheduleDetails.IsStudentPresent = inputData.EndTime.HasValue;

                        scheduleDetails.OperationStartTime = inputData.StartTime;
                        scheduleDetails.OperationEndTime = inputData.EndTime;

                        scheduleDetails.Comment = inputData.NoteText;

                        scheduleDetails.StudentScheduleStatus = inputData.EventStatus;
                        // The tutor's own attendance (TutorScheduleStatus) is kept: the Operations
                        // cross-check compares it with Operations' record (see AttendanceBillingRule).
                        scheduleDetails.OperationScheduleStatus = inputData.EventStatus;

                        // Status
                        if (inputData.EventStatus.HasValue && inputData.EventStatus.Value != Guid.Empty)
                        {
                            if (inputData.EventStatus.Value == demoCompletedGuid)
                            {
                                scheduleDetails.Status = "Demo Completed Need to Schedule";
                            }
                            else if (typeCode.TypeCodeValue == 1009001 || typeCode.TypeCodeValue == 20020)
                            {
                                scheduleDetails.Status = "Class Completed";
                            }
                            else
                            {
                                scheduleDetails.Status = typeCode.TypeCodeName;
                            }
                        }
                        else
                        {
                            scheduleDetails.Status = null;
                        }
                    }
                    _dbContext.Update(scheduleDetails);
                    await _dbContext.SaveChangesAsync();
                }
                if (!string.IsNullOrEmpty(inputData.NoteText))
                {
                    await _dbContext.TCTNotes.AddAsync(new TCTNotes()
                    {
                        NoteText = inputData.NoteText,
                        ReferenceId = inputData.ScheduleDetailsId,
                        CreatedBy = inputData.UserId.Value,
                        UserId = inputData.UserId.Value,
                        CreatedDate = DateTime.UtcNow,
                        Id = Guid.Empty,
                        ReferenceTypeId = inputData.EventStatus.Value,
                        IsActive = true
                    });
                    await _dbContext.SaveChangesAsync();
                }

                /*Update SalesDetails.Status when demo/class outcome is recorded*/
                if (typeCode.TypeCodeValue == 20041 /*DemoCompleted*/ ||
                    typeCode.TypeCodeValue == 20018 /*DCNeedToSchedule*/ ||
                    typeCode.TypeCodeValue == 20015 /*Demo Cancelled*/ ||
                    typeCode.TypeCodeValue == 20016 /*Demo Postponed*/ ||
                    typeCode.TypeCodeValue == 20019 /*Demo Scheduled*/)
                {
                    var _schedule = _dbContext.Schedule.Where(s => s.ScheduleId == scheduleDetails.ScheduleId).FirstOrDefault();

                    if (_schedule != null)
                    {
                        var salesDetails = _dbContext.SalesDetails.SingleOrDefault(s => s.Id == _schedule.SalesDetailsId);
                        if (salesDetails != null)
                        {
                            salesDetails.ModifiedBy = inputData.UserId;
                            salesDetails.ModifiedDate = DateTime.Now;
                            salesDetails.Status = inputData.EventStatus.Value;
                            _dbContext.Update(salesDetails);
                            await _dbContext.SaveChangesAsync();
                        }
                    }
                }


                await transaction.CommitAsync();
                response.Succeeded = true;
                // Data = the submitter's status changed (first submission or a different status). A repeated
                // submission of the same status returns false, so no second attendance notification is sent.
                response.Data = previousSubmitterStatus != inputData.EventStatus;
            }
            catch (Exception ex)
            {
                response.Succeeded = false;
                await transaction.RollbackAsync();
            }
            return response;
        }

        public async Task<DemoRegistrationEmailContextDto?> GetDemoRegistrationEmailContext(Guid scheduleDetailsId)
        {
            var demoCompletedStatusId = await _dbContext.Type_Code
                .Where(typeCode => typeCode.TypeCodeValue == (int)FollowUpStatus.DemoCompleted)
                .Select(typeCode => typeCode.Id)
                .FirstOrDefaultAsync();

            return await (from details in _dbContext.ScheduleDetails.AsNoTracking()
                          join schedule in _dbContext.Schedule.AsNoTracking()
                              on details.ScheduleId equals schedule.ScheduleId
                          join student in _dbContext.Student.AsNoTracking()
                              on schedule.StudentId equals student.Id
                          join user in _dbContext.User.AsNoTracking()
                              on student.UserId equals user.Id
                          where details.ScheduleDetailsId == scheduleDetailsId
                          select new DemoRegistrationEmailContextDto
                          {
                              IsDemo = details.ScheduleType == "Demo",
                              IsAlreadyCompleted = demoCompletedStatusId != Guid.Empty &&
                                  (details.StudentScheduleStatus == demoCompletedStatusId ||
                                   details.TutorScheduleStatus == demoCompletedStatusId ||
                                   details.OperationScheduleStatus == demoCompletedStatusId),
                              StudentName = user.FullName ?? (user.FirstName + " " + user.LastName),
                              EmailAddress = user.Email
                          }).FirstOrDefaultAsync();
        }

        public async Task<Response<Guid>> UpdateSchedule(Schedule1Dto schedule)
        {
            Response<Guid> response = new Response<Guid>();
            using var transaction = await _dbContext.Database.BeginTransactionAsync();
            var changedDate = DateTime.UtcNow;
            var _schedule = _dbContext.Schedule.Where(s => s.ScheduleId == schedule.ScheduleId).FirstOrDefault();
            if (_schedule == null)
            {
                throw new Exception("Scheduler not found");
            }

            try
            {
                var currentDate = DateTime.Now;
                _schedule.RepeatOn = schedule.RepeatOn;
                _schedule.RepeatType = schedule.RepeatType;
                _schedule.StartDate = schedule.StartDate;
                _schedule.EndDate = schedule.EndDate;
                _schedule.Title = schedule.Title;
                _schedule.Description = schedule.Description;
                _schedule.NoOfMonths = schedule.NoOfMonths;
                _schedule.ScheduleEndDate = schedule.ScheduleEndDate;
                _schedule.ScheduleMode = schedule.ScheduleMode;
                _schedule.TotalClasses = schedule.TotalClasses;
                _schedule.IsActive = true;
                _schedule.ModifiedBy = schedule.UserId;
                _schedule.ModifiedDate = currentDate;
                _dbContext.Update(_schedule);
                var result = await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();
                response.Data = _schedule.ScheduleId;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
            }
            return response;
        }

        public async Task<bool> HasCompletedStudentRegistration(Guid studentId, Guid subjectId)
        {
            var registration = await _dbContext.StudentRegistration.AsNoTracking().FirstOrDefaultAsync(registration =>
                registration.StudentId == studentId &&
                registration.Subject == subjectId &&
                registration.IsActive &&
                registration.TermsAccepted);

            if (registration == null) return false;

            // Safely fill only missing legacy rates; never overwrite an existing financial value.
            var missingRates = await (
                from sales in _dbContext.Sales
                join details in _dbContext.SalesDetails on sales.Id equals details.SalesId
                where sales.StudentId == studentId && details.SubjectId == subjectId &&
                      sales.IsActive && details.IsActive && details.ParentPayment <= 0
                select details).ToListAsync();

            foreach (var details in missingRates)
            {
                details.ParentPayment = registration.FeesPerHour;
                details.ModifiedDate = DateTime.UtcNow;
            }

            if (missingRates.Count > 0) await _dbContext.SaveChangesAsync();
            return true;
        }

        public async Task<Response<Guid>> AddOrUpdateSchedule(Schedule1Dto schedule)
        {
            Response<Guid> response = new Response<Guid>();
            var changedDate = DateTime.UtcNow;
            using var transaction = await _dbContext.Database.BeginTransactionAsync();
            try
            {
                var _scheduleId = Guid.NewGuid();
                var currentDate = DateTime.Now;
                var _schedule = new Schedule()
                {
                    SubjectId = schedule.SubjectId,
                    ScheduleId = _scheduleId,
                    RepeatOn = schedule.RepeatOn,
                    RepeatType = schedule.RepeatType,
                    TutorId = schedule.TutorId.Value,
                    StudentId = schedule.StudentId.Value,
                    SalesDetailsId = schedule.SalesDetailsId.Value,
                    StartDate = schedule.StartDate,
                    EndDate = schedule.EndDate,
                    Title = schedule.Title,
                    Description = schedule.Description,
                    IsActive = true,
                    MeetingLine = schedule.MeetingLine,
                    NoOfMonths = schedule.NoOfMonths,
                    ScheduleEndDate = schedule.ScheduleEndDate,
                    ScheduleMode = schedule.ScheduleMode,
                    TotalClasses = schedule.TotalClasses,
                    CreatedBy = schedule.UserId,
                    CreatedDate = currentDate,
                };
                _dbContext.Add(_schedule);

                var result = _dbContext.SaveChanges();
                await transaction.CommitAsync();
                response.Data = _schedule.ScheduleId;
                response.Succeeded = true;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                response.Succeeded = false;
                response.Message = ex.Message;
            }
            return response;
        }

        public async Task<Response<Guid>> AddOrUpdateScheduleDetails(ScheduleDetailsDto schedule)
        {
            Response<Guid> response = new Response<Guid>();
            using var transaction = await _dbContext.Database.BeginTransactionAsync();
            try
            {
                var detailId = Guid.NewGuid();
                var currentDate = DateTime.Now;

                var details = new ScheduleDetails()
                {
                    IsActive = true,
                    ScheduleDetailsId = detailId,
                    ScheduleId = schedule.ScheduleId,
                    Date = schedule.Date.Value,
                    StudentComment = schedule.NoteText,
                    TutorComment = schedule.TutorComment,
                    Comment = schedule.CoordiatorComment,
                    MeetingLink = schedule.MeetingLink,
                    Title = schedule.Title,
                    ScheduleType = schedule.ScheduleType,
                    StartTime = schedule.StartTime.Value,
                    EndTime = schedule.EndTime.Value,
                    TutorScheduleStatus = schedule.TutorScheduleStatus,
                    StudentScheduleStatus = schedule.StudentScheduleStatus,
                    Status = schedule.Status,
                    CreatedBy = schedule.CreatedBy,
                    CreatedDate = currentDate
                };

                _dbContext.Add(details);
                _dbContext.SaveChanges();
                await transaction.CommitAsync();
                response.Data = detailId;
                response.Succeeded = true;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
            }
            return response;
        }

        public async Task<Response<List<Guid>>> AddScheduleDetailsBatchAsync(List<ScheduleDetailsDto> schedules)
        {
            var response = new Response<List<Guid>> { Data = new List<Guid>() };
            if (schedules == null || schedules.Count == 0)
            {
                response.Succeeded = true;
                return response;
            }

            using var transaction = await _dbContext.Database.BeginTransactionAsync();
            try
            {
                var currentDate = DateTime.Now;
                var entities = new List<ScheduleDetails>(schedules.Count);

                foreach (var schedule in schedules)
                {
                    var detailId = Guid.NewGuid();
                    entities.Add(new ScheduleDetails()
                    {
                        IsActive = true,
                        ScheduleDetailsId = detailId,
                        ScheduleId = schedule.ScheduleId,
                        Date = schedule.Date.Value,
                        StudentComment = schedule.NoteText,
                        TutorComment = schedule.TutorComment,
                        Comment = schedule.CoordiatorComment,
                        MeetingLink = schedule.MeetingLink,
                        Title = schedule.Title,
                        ScheduleType = schedule.ScheduleType,
                        StartTime = schedule.StartTime.Value,
                        EndTime = schedule.EndTime.Value,
                        TutorScheduleStatus = schedule.TutorScheduleStatus,
                        StudentScheduleStatus = schedule.StudentScheduleStatus,
                        Status = schedule.Status,
                        CreatedBy = schedule.CreatedBy,
                        CreatedDate = currentDate
                    });
                    response.Data.Add(detailId);
                }

                _dbContext.AddRange(entities);
                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();
                response.Succeeded = true;
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                response.Succeeded = false;
                response.Data = new List<Guid>();
            }
            return response;
        }

        public async Task<Response<StudentScheduleDetailsDto>> GetScheduleBySubjectId(Guid tutorId, Guid subjectId, Guid studentId)
        {
            Response<StudentScheduleDetailsDto> response = new Response<StudentScheduleDetailsDto>();
            try
            {
                var _schedule = _dbContext.Schedule.Where(s => s.StudentId == studentId && s.TutorId == tutorId && s.SubjectId == subjectId && s.IsActive == true).FirstOrDefault();
                if (_schedule == null)
                {
                    response.Succeeded = false;
                    return response;
                }
                var _details = _dbContext.ScheduleDetails.Where(s => s.ScheduleId == _schedule.ScheduleId).FirstOrDefault();
                var _salesDetails = _dbContext.SalesDetails.Where(s => s.Id == _schedule.SalesDetailsId).FirstOrDefault();
                var typeCode = _dbContext.Type_Code.Where(s => s.Id == _salesDetails.Status).FirstOrDefault();

                if (typeCode.TypeCodeValue == 20018)
                {
                    response.Succeeded = false;
                    response.Message = typeCode.TypeCodeName;
                    return response;
                }

                StudentScheduleDetailsDto studentScheduleDetailsDto = new StudentScheduleDetailsDto()
                {
                    ScheduleId = _schedule.ScheduleId,
                    Title = _schedule.Title,
                    Description = _schedule.Description,
                    RepeatType = _schedule.RepeatType,
                    MeetingLink = _schedule.MeetingLink
                };

                if (_details != null)
                {
                    studentScheduleDetailsDto = new StudentScheduleDetailsDto()
                    {
                        StatusCode = typeCode.TypeCodeValue,
                        ScheduleDetailsId = _details.ScheduleDetailsId,
                        ScheduleId = _details.ScheduleId,
                        ScheduleType = _details.ScheduleType,
                        StartTime = _details.StartTime,
                        StudentScheduleStatus = _details.StudentScheduleStatus,
                        StartDate = _schedule.StartDate,
                        EndDate = _schedule.EndDate,
                        Title = _schedule.Title,
                        Description = _schedule.Description,
                        EndTime = _details.EndTime,
                        Date = _details.Date,
                        Status = _details.Status,
                        StudentComment = _details.StudentComment,
                        RepeatType = _schedule.RepeatType,
                        //RepeatOn = _schedule.RepeatOn,
                        MeetingLink = _details.MeetingLink
                    };
                }

                if (_schedule.RepeatType.ToLower() == "weekly" || _schedule.RepeatType.ToLower() == "daily")
                {
                    if (!string.IsNullOrEmpty(_schedule.RepeatOn))
                    {
                        var _repeatOn = _schedule.RepeatOn.Split(",").ToList();
                        studentScheduleDetailsDto.RepeatOn = _repeatOn;
                    }
                }
                response.Data = studentScheduleDetailsDto;

            }
            catch (Exception ex)
            {

            }
            return response;
        }

        public async Task<List<ScheduleDetailsDto>> GetStudentAllocatedSchedule(Guid studentId, Guid salesDetailsId)
        {
            var result = new List<ScheduleDetailsDto>();
            var now = DateTime.Now;
            var completedDemoStatusIds = await _dbContext.Type_Code.AsNoTracking()
                .Where(x => x.TypeCodeValue == (int)FollowUpStatus.DemoCompleted ||
                            x.TypeCodeValue == (int)FollowUpStatus.DCNeedToSchedule)
                .Select(x => x.Id)
                .ToListAsync();
            result = (from s in _dbContext.Schedule
                      join d in _dbContext.ScheduleDetails on s.ScheduleId equals d.ScheduleId
                      where s.StudentId == studentId
                      && d.IsActive == true
                      && d.EndTime > now
                      && !((d.ScheduleType == "Demo" || d.ScheduleType == "100502") &&
                           ((d.StudentScheduleStatus.HasValue && completedDemoStatusIds.Contains(d.StudentScheduleStatus.Value)) ||
                            (d.TutorScheduleStatus.HasValue && completedDemoStatusIds.Contains(d.TutorScheduleStatus.Value)) ||
                            (d.OperationScheduleStatus.HasValue && completedDemoStatusIds.Contains(d.OperationScheduleStatus.Value))))
                      select new ScheduleDetailsDto()
                      {
                          ScheduleDetailsId = d.ScheduleDetailsId,
                          ScheduleId = d.ScheduleId,
                          // ScheduleDetails are stored as local class times. Converting them
                          // from UTC here shifts occupied slots by +05:30 in the scheduler UI.
                          StartTime = d.StartTime,
                          Date = d.Date,
                          RecurringDay = s.RepeatOn,
                          EndTime = d.EndTime,
                      }).ToList();
            return result;
        }


        public async Task<List<ScheduleDetailsDto>> GetTutorAllocatedSchedule(Guid tutorId)
        {
            var result = new List<ScheduleDetailsDto>();
            var now = DateTime.Now;
            var completedDemoStatusIds = await _dbContext.Type_Code.AsNoTracking()
                .Where(x => x.TypeCodeValue == (int)FollowUpStatus.DemoCompleted ||
                            x.TypeCodeValue == (int)FollowUpStatus.DCNeedToSchedule)
                .Select(x => x.Id)
                .ToListAsync();
            result = (from s in _dbContext.Schedule
                      join d in _dbContext.ScheduleDetails on s.ScheduleId equals d.ScheduleId
                      where s.TutorId == tutorId && d.IsActive == true
                      && d.EndTime > now
                      && !((d.ScheduleType == "Demo" || d.ScheduleType == "100502") &&
                           ((d.StudentScheduleStatus.HasValue && completedDemoStatusIds.Contains(d.StudentScheduleStatus.Value)) ||
                            (d.TutorScheduleStatus.HasValue && completedDemoStatusIds.Contains(d.TutorScheduleStatus.Value)) ||
                            (d.OperationScheduleStatus.HasValue && completedDemoStatusIds.Contains(d.OperationScheduleStatus.Value))))
                      select new ScheduleDetailsDto()
                      {
                          ScheduleDetailsId = d.ScheduleDetailsId,
                          ScheduleId = d.ScheduleId,
                          StartTime = d.StartTime,
                          Date = d.Date,
                          RecurringDay = s.RepeatOn,
                          EndTime = d.EndTime,
                      }).ToList();
            return result;
        }

        public async Task<Response<List<ScheduleDetailsDto>>> GetScheduleByTutorId(Guid tutorId)
        {
            var response = new Response<List<ScheduleDetailsDto>>();

            try
            {
                var result =
                    (from u in _dbContext.User
                     join t in _dbContext.Tutor on u.Id equals t.UserId
                     join sd in _dbContext.SalesDetails on t.UserId equals sd.TutorId
                     join sa in _dbContext.Sales on sd.SalesId equals sa.Id
                     join s in _dbContext.Schedule on sd.TutorId equals s.TutorId
                     join st in _dbContext.Student on s.StudentId equals st.UserId
                     join uas in _dbContext.User on st.UserId equals uas.Id
                     join d in _dbContext.ScheduleDetails on s.ScheduleId equals d.ScheduleId
                     join sb in _dbContext.Type_Code on sd.SubjectId equals sb.Id
                     join g in _dbContext.Type_Code on sa.GradeId equals g.Id
                     join b in _dbContext.Type_Code on sa.BoardId equals b.Id
                     join tc in _dbContext.Type_Code on d.TutorScheduleStatus equals tc.Id into tutorScheduleStatusGroup
                     from tc in tutorScheduleStatusGroup.DefaultIfEmpty()
                     join tcs in _dbContext.Type_Code on d.StudentScheduleStatus equals tcs.Id into studentScheduleStatusGroup
                     from tcs in studentScheduleStatusGroup.DefaultIfEmpty()
                     where t.UserId == tutorId &&
                           u.IsActive &&
                           sd.IsActive &&
                           t.IsActive &&
                           sa.IsActive &&
                           s.IsActive &&
                           st.IsActive &&
                           uas.IsActive &&
                           d.IsActive &&
                           sb.IsActive &&
                           g.IsActive &&
                           b.IsActive &&
                           (tc == null || tc.IsActive) &&
                           (tcs == null || tcs.IsActive)
                     select new ScheduleDetailsDto
                     {
                         ScheduleDetailsId = d.ScheduleDetailsId,
                         ScheduleId = d.ScheduleId,
                         Date = d.Date,
                         UserId = u.Id,
                         TutorName = u.FullName + " - " + u.UserCode,
                         StudentName = uas.FullName + " - " + st.Code,
                         TutorScheduleStatusName = tc.TypeCodeName,
                         StudentScheduleStatusName = tcs.TypeCodeName,
                         StartTime = d.StartTime,
                         EndTime = d.EndTime,
                         Board = b.TypeCodeName,
                         Grade = g.TypeCodeName,
                         Subject = sb.TypeCodeName
                     }).Distinct();

                var data = await result.ToListAsync();

                response.Data = data;
                //response.IsSuccess = data.Any();
                response.Message = "Data retrieved successfully.";
                //response.Message = response.IsSuccess ? "Data retrieved successfully." : "No data found.";
            }
            catch (Exception ex)
            {
                //response.IsSuccess = false;
                response.Message = $"An error occurred: {ex.Message}";
            }

            return response;
        }

        public async Task<Response<Guid>> ApproveRejectTutorSchedules(ScheduleApprovalRequest request)
        {
            var response = new Response<Guid>();
            await using var transaction = await _dbContext.Database.BeginTransactionAsync();
            try
            {
                var scheduleIds = request.ScheduleIds;
                if (!scheduleIds.Any())
                {
                    response.Message = "No valid schedule IDs provided.";
                    return response;
                }

                var existingSchedules = await _dbContext.ScheduleDetails
                    .Where(sd => scheduleIds.Contains(sd.ScheduleDetailsId))
                    .ToListAsync();
                var modifiedDate = DateTime.UtcNow;
                if (!existingSchedules.Any())
                {
                    response.Message = "No matching schedules found in the database.";
                    return response;
                }

                foreach (var schedule in existingSchedules)
                {
                    schedule.IsTutorPresent = request.IsApprovedMethod;
                    schedule.ModifiedBy = request.UserId;
                    schedule.ModifiedDate = modifiedDate;
                }
                await _dbContext.SaveChangesAsync();

                await transaction.CommitAsync();

                response.Message = $"selected {scheduleIds.Count} schedule(s) {(request.IsApprovedMethod ? "approved" : "rejected")} successfully.";
                response.Succeeded = true;
            }
            catch (Exception ex)
            {
                response.Message = $"An error occurred: {ex.Message}";
                response.Succeeded = false;
                await transaction.RollbackAsync();
            }

            return response;
        }

        public async Task<Response<List<PayrollRequestDto>>> GetTutorPayroll(string month, string year)
        {
            if (!int.TryParse(month, out var monthInt) || monthInt < 1 || monthInt > 12 ||
                !int.TryParse(year, out var yearInt) || yearInt < 1 || yearInt > 9998)
                return new Response<List<PayrollRequestDto>> { Succeeded = false, Message = "Invalid month or year." };
            try
            {
                var start = new DateTime(yearInt, monthInt, 1);
                var end = start.AddMonths(1);
                // Schedule/TutorInvoice use Tutor.Id. The UI generation request requires Tutor.UserId.
                // Pay follows the Operations attendance cross-check (AttendanceBillingRule): the cross-check
                // code (OperationScheduleStatus) picks the tutor's or Operations' attendance record.
                var billingCodes = TCT.LMS.Application.Services.AttendanceBillingRule.CompletedStatusCodes
                    .Concat(TCT.LMS.Application.Services.AttendanceBillingRule.CrossCheckCodes).ToList();
                var codeById = await _dbContext.Type_Code.Where(t => t.IsActive && billingCodes.Contains(t.TypeCodeValue))
                    .ToDictionaryAsync(t => t.Id, t => t.TypeCodeValue);
                int? Code(Guid? id) => id.HasValue && codeById.TryGetValue(id.Value, out var value) ? value : null;
                var cancelledIds = await _dbContext.Type_Code.Where(t => t.IsActive && t.TypeCodeValue == 20021)
                    .Select(t => t.Id).ToListAsync();
                var rows = await (from detail in _dbContext.ScheduleDetails.AsNoTracking()
                    join schedule in _dbContext.Schedule on detail.ScheduleId equals schedule.ScheduleId
                    join sale in _dbContext.SalesDetails on schedule.SalesDetailsId equals sale.Id
                    where detail.IsActive && schedule.IsActive && sale.IsActive && detail.Date >= start && detail.Date < end
                    select new { schedule.TutorId, schedule.ScheduleId, detail.ScheduleDetailsId, detail.Date,
                        detail.StartTime, detail.EndTime, schedule.TutorRate, sale.TutorPayment, detail.Status,
                        detail.OperationScheduleStatus, detail.TutorScheduleStatus, detail.StudentScheduleStatus }).ToListAsync();

                var classes = rows.Select(r =>
                {
                    var crossCheck = Code(r.OperationScheduleStatus);

                    var tutorCompleted = Code(r.TutorScheduleStatus) is int tutorCode
                        && TCT.LMS.Application.Services.AttendanceBillingRule.CompletedStatusCodes.Contains(tutorCode);

                    var payable = TCT.LMS.Application.Services.AttendanceBillingRule.IsTutorPayable(
                        crossCheck,
                        tutorCompleted,
                        r.Status);

                    return new TCT.LMS.Application.Services.PayrollClass(
                        r.TutorId,
                        r.ScheduleId,
                        r.ScheduleDetailsId,
                        r.Date,
                        r.StartTime,
                        r.EndTime,
                        TCT.LMS.Application.Services.TutorReassignmentRules.PayRate(
                            r.TutorRate,
                            r.TutorPayment),
                        payable || tutorCompleted ||
                            TCT.LMS.Application.Services.AttendanceBillingRule.OpsCompleted(r.Status),
                        payable,
                        (r.TutorScheduleStatus.HasValue &&
                            cancelledIds.Contains(r.TutorScheduleStatus.Value)) ||
                        (r.StudentScheduleStatus.HasValue &&
                            cancelledIds.Contains(r.StudentScheduleStatus.Value)));
                });
                var monthName = CultureInfo.InvariantCulture.DateTimeFormat.GetMonthName(monthInt);
                var monthNumber = monthInt.ToString();
                var paddedMonth = monthInt.ToString("D2");
                var invoices = await _dbContext.TutorInvoice.AsNoTracking()
                    .Where(i => i.IsActive && i.Year == yearInt &&
                        (i.Month == monthName || i.Month == monthNumber || i.Month == paddedMonth))
                    .OrderByDescending(i => i.Id)
                    .Select(i => new TCT.LMS.Application.Services.PayrollInvoice(i.TutorId, i.InvoiceNumber, i.Month, i.Year, i.TutorTotalPayment))
                    .ToListAsync();
                var historicalTutorIds = rows.Select(r => r.TutorId).Concat(invoices.Select(i => i.TutorId)).Distinct().ToList();
                var tutors = await (from tutor in _dbContext.Tutor.AsNoTracking()
                    join user in _dbContext.User on tutor.UserId equals user.Id
                    where (tutor.IsActive && user.IsActive) || historicalTutorIds.Contains(tutor.Id)
                    select new TCT.LMS.Application.Services.PayrollTutor(tutor.Id, tutor.UserId, user.FullName, user.UserCode)).ToListAsync();
                return new Response<List<PayrollRequestDto>> {
                    Data = TCT.LMS.Application.Services.TutorPayrollSummary.Build(tutors, classes, invoices, monthInt, yearInt),
                    Succeeded = true, Message = "Payroll data retrieved successfully"
                };
            }
            catch (Exception ex)
            {
                return new Response<List<PayrollRequestDto>> { Succeeded = false, Message = $"Error retrieving payroll data: {ex.Message}" };
            }
        }
        public async Task<Response<Guid>> DeleteClass(Guid scheduleDetailsId, Guid userId)
        {
            var response = new Response<Guid>();
            await using var transaction = await _dbContext.Database.BeginTransactionAsync();
            try
            {
                var scheduleDetails = _dbContext.ScheduleDetails.Where(sd => sd.ScheduleDetailsId == scheduleDetailsId).FirstOrDefault();

                if (scheduleDetails == null)
                {
                    response.Succeeded = false;
                    response.Message = "No valid schedule IDs provided.";
                    return response;
                }

                var modifiedDate = DateTime.UtcNow;
                scheduleDetails.IsActive = false;
                scheduleDetails.ModifiedBy = userId;
                scheduleDetails.ModifiedDate = modifiedDate;
                _dbContext.Update(scheduleDetails);
                await _dbContext.SaveChangesAsync();

                await transaction.CommitAsync();
                response.Succeeded = true;
            }
            catch (Exception ex)
            {
                response.Message = $"An error occurred: {ex.Message}";
                response.Succeeded = false;
                await transaction.RollbackAsync();
            }

            return response;
        }

        public async Task<Response<Guid>> UpdateScheduleDetails(UpdateClass detailsDto)
        {
            Response<Guid> response = new Response<Guid>();

            var scheduleDetails = _dbContext.ScheduleDetails.Where(sd => sd.ScheduleDetailsId == detailsDto.ScheduleDetailsId).FirstOrDefault();
            if (scheduleDetails == null)
            {
                response.Succeeded = false;
                response.Message = "No valid schedule IDs provided.";
                return response;
            }

            var schedule = _dbContext.Schedule.Where(sd => sd.ScheduleId == detailsDto.ScheduleId).FirstOrDefault();
            if (schedule == null)
            {
                response.Succeeded = false;
                response.Message = "No valid schedule IDs provided.";
                return response;
            }

            using var transaction = await _dbContext.Database.BeginTransactionAsync();
            try
            {
                var currentDate = DateTime.Now;

                schedule.Title = detailsDto.Title;
                schedule.Description = detailsDto.Comment;
                schedule.ModifiedDate = currentDate;
                schedule.ModifiedBy = detailsDto.UserId;
                _dbContext.Update(schedule);
                var _result = await _dbContext.SaveChangesAsync();
                if (detailsDto.CanUpdateDate)
                {
                    scheduleDetails.StartTime = detailsDto.StartTime.Value;
                    scheduleDetails.EndTime = detailsDto.EndTime.Value;
                }
                scheduleDetails.CreatedBy = detailsDto.UserId;
                scheduleDetails.CreatedDate = currentDate;
                _dbContext.Update(scheduleDetails);
                var result = await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
            }
            return response;
        }

        public async Task<Response<List<PayrollRequestDto>>> GenerateTutorPayroll(Guid tutorId)
        {
            var response = new Response<List<PayrollRequestDto>>();

            try
            {
                var tutorPresence = (from sd in _dbContext.ScheduleDetails
                                     join s in _dbContext.Schedule on sd.ScheduleId equals s.ScheduleId
                                     where s.TutorId == tutorId
                                     group sd by s.TutorId into g
                                     select new
                                     {
                                         TutorId = g.Key,
                                         PresentCount = g.Count(sd => sd.IsTutorPresent == true),
                                         AbsentCount = g.Count(sd => sd.IsTutorPresent == false)
                                     }).FirstOrDefault();

                var query = from u in _dbContext.User
                            join t in _dbContext.Tutor on u.Id equals t.UserId
                            join sd in _dbContext.SalesDetails on t.UserId equals sd.TutorId
                            join sa in _dbContext.Sales on sd.SalesId equals sa.Id
                            join s in _dbContext.Schedule on sd.TutorId equals s.TutorId
                            join st in _dbContext.Student on s.StudentId equals st.UserId
                            join uas in _dbContext.User on st.UserId equals uas.Id
                            join d in _dbContext.ScheduleDetails on s.ScheduleId equals d.ScheduleId
                            join sb in _dbContext.Type_Code on sd.SubjectId equals sb.Id
                            join g in _dbContext.Type_Code on sa.GradeId equals g.Id
                            join b in _dbContext.Type_Code on sa.BoardId equals b.Id
                            join tc in _dbContext.Type_Code on d.TutorScheduleStatus equals tc.Id into tcGroup
                            from tc in tcGroup.DefaultIfEmpty()
                            join tcs in _dbContext.Type_Code on d.StudentScheduleStatus equals tcs.Id into tcsGroup
                            from tcs in tcsGroup.DefaultIfEmpty()
                            where t.UserId == tutorId &&
                                  u.IsActive && sd.IsActive && t.IsActive && sa.IsActive &&
                                  s.IsActive && st.IsActive && uas.IsActive && d.IsActive &&
                                  sb.IsActive && g.IsActive && b.IsActive &&
                                  (tc == null || tc.IsActive) &&
                                  (tcs == null || tcs.IsActive)
                            select new PayrollRequestDto
                            {
                                SalesId = sa.Id,
                                SalesDetailsId = sd.Id,
                                ScheduleId = d.ScheduleId,
                                ScheduleDetailsId = d.ScheduleDetailsId,
                                ScheduleDate = d.Date,
                                ScheduleStartTime = d.StartTime,
                                ScheduleEndTime = d.EndTime,
                                TutorId = u.Id,
                                TutorName = u.FullName + " - " + u.UserCode,
                                UserCode = u.UserCode,
                                StudentName = uas.FullName + " - " + st.Code,
                                StudentId = u.Id,
                                StudentCode = st.Code,
                                //ScheduleStatusId = tc != null ? tc.Id : (Guid?)null,
                                //TutorScheduleStatus = tc != null ? tc.TypeCodeName : null,
                                //StudentScheduleStatus = tcs != null ? tcs.TypeCodeName : null,
                                Board = b.TypeCodeName,
                                Grade = g.TypeCodeName,
                                Subject = sb.TypeCodeName,
                                TutorSubjectPayment = sd.TutorPayment,
                                NoOfDaysPresent = tutorPresence != null ? tutorPresence.PresentCount : 0,
                                NoOfDaysAbsent = tutorPresence != null ? tutorPresence.AbsentCount : 0,
                                TotalTutorPayment = tutorPresence != null ? sd.ParentPayment * tutorPresence.PresentCount : 0,
                                IsInvoiceGenerated = _dbContext.TutorInvoiceDetails.Where(i => i.ScheduleDetailsId == sd.Id).Any(),
                            };

                var payrollRequests = await query.ToListAsync();
                string htmlTable = GenerateHtmlTable(payrollRequests);
                await AddTutorInvoiceAsync(payrollRequests);
                response.Data = payrollRequests;
                response.Message = "Data retrieved successfully.";
                //response.Message = response.IsSuccess ? "Data retrieved successfully." : "No data found.";
            }
            catch (Exception ex)
            {
                //response.IsSuccess = false;
                response.Message = $"An error occurred: {ex.Message}";
            }

            return response;
        }

        private string GenerateHtmlTable(List<PayrollRequestDto> payrollData)
        {
            var totalPayment = payrollData.Sum(p => p.TutorSubjectPayment);

            var sb = new StringBuilder();

            // Start HTML table
            sb.Append("<table style='border-collapse: collapse; width: 100%;' border='1'>");
            sb.Append("<thead>");
            sb.Append("<tr>");
            sb.Append("<th>Student Name</th>");
            sb.Append("<th>Schedule Date & Time</th>");
            sb.Append("<th>Subject</th>");
            sb.Append("<th>Board</th>");
            sb.Append("<th>Grade</th>");
            sb.Append("<th>Tutor Payment</th>");
            sb.Append("</tr>");
            sb.Append("</thead>");
            sb.Append("<tbody>");

            // Add rows
            foreach (var data in payrollData)
            {
                sb.Append("<tr>");
                sb.Append($"<td>{data.StudentName}</td>");
                sb.Append($"<td>{data.ScheduleDate:yyyy-MM-dd} {data.ScheduleStartTime:hh\\:mm}</td>");
                sb.Append($"<td>{data.Subject}</td>");
                sb.Append($"<td>{data.Board}</td>");
                sb.Append($"<td>{data.Grade}</td>");
                sb.Append($"<td>{data.TutorSubjectPayment:C}</td>");
                sb.Append("</tr>");
            }

            // Add total row
            sb.Append("<tr>");
            sb.Append("<td colspan='5' style='text-align: right; font-weight: bold;'>Total Tutor Payment</td>");
            sb.Append($"<td style='font-weight: bold;'>{totalPayment:C}</td>");
            sb.Append("</tr>");

            sb.Append("</tbody>");
            sb.Append("</table>");

            return sb.ToString();
        }

        private async Task AddTutorInvoiceAsync(List<PayrollRequestDto> payrollRequests)
        {
            if (payrollRequests == null || !payrollRequests.Any())
            {
                throw new ArgumentException("Payroll requests cannot be null or empty", nameof(payrollRequests));
            }

            using (var transaction = await _dbContext.Database.BeginTransactionAsync())
            {
                try
                {
                    var payrollRequest = payrollRequests.First();
                    var modifiedDate = DateTime.UtcNow;

                    var tutorInvoice = new TutorInvoice
                    {
                        InvoiceNumber = GenerateInvoiceNumber(payrollRequest),
                        TutorTotalPayment = payrollRequest.TotalTutorPayment.Value,
                        TutorId = payrollRequest.TutorId.Value,
                        Month = payrollRequest.ScheduleMonthName,
                        Year = payrollRequest.ScheduleYear,
                        EmailSentDate = modifiedDate,
                        IsActive = true,
                        CreatedDate = modifiedDate,
                        ModifiedDate = modifiedDate,
                        CreatedBy = payrollRequest.TutorId.Value, //payrollRequest.CreatedBy.Value,
                    };

                    // Add the main invoice
                    _dbContext.TutorInvoice.Add(tutorInvoice);
                    await _dbContext.SaveChangesAsync();
                    //var tutorInvoiceId = tutorInvoice.Id;
                    // Add invoice details
                    var tutorInvoiceDetails = payrollRequests.Select(request => new TutorInvoiceDetails
                    {
                        TutorInvoiceId = tutorInvoice.Id,
                        ScheduleDetailsId = request.ScheduleDetailsId.Value,
                        StudentId = request.StudentId.Value,
                        StudentName = request.StudentName,
                        SubjectPayment = request.TutorSubjectPayment.Value,
                        ScheduleDate = request.ScheduleDate.Value,
                        IsActive = true,
                        CreatedDate = modifiedDate,
                        ModifiedDate = modifiedDate,
                        CreatedBy = payrollRequest.TutorId.Value, //payrollRequest.CreatedBy.Value,
                    }).ToList();

                    _dbContext.TutorInvoiceDetails.AddRange(tutorInvoiceDetails);
                    await _dbContext.SaveChangesAsync();

                    // Commit the transaction
                    await transaction.CommitAsync();
                }
                catch (Exception ex)
                {
                    // Rollback the transaction if any error occurs
                    await transaction.RollbackAsync();
                    throw; // Re-throw the exception after rollback
                }
            }
        }

        private string GenerateInvoiceNumber(PayrollRequestDto payrollRequest)
        {
            return $"{payrollRequest.UserCode}_{payrollRequest.ScheduleMonth}_{payrollRequest.ScheduleYear}_{DateTime.Now:MMddyyyyHHmmss}";
        }

        public List<ScheduleDetailsDto> GetScheduledClasses(Guid tutorId, Guid studentId, DateTime date, bool checkScheduledDate)
        {
            if (checkScheduledDate)
            {
                var _tutorSchedules = _dbContext.Schedule.Where(s => s.TutorId == tutorId && s.IsActive == true)
                                    .Join(_dbContext.ScheduleDetails.Where(sd => sd.IsActive && sd.Date.Date == date.Date),
                                            s => s.ScheduleId, sd => sd.ScheduleId,
                                            (s, sd) => new ScheduleDetailsDto
                                            {
                                                ScheduleId = s.ScheduleId,
                                                ScheduleDetailsId = sd.ScheduleDetailsId,
                                                Date = sd.Date,
                                                StartTime = sd.StartTime,
                                                EndTime = sd.EndTime
                                            })
                                    .Union(_dbContext.Schedule.Where(s => s.StudentId == studentId && s.IsActive == true)
                                    .Join(_dbContext.ScheduleDetails.Where(sd => sd.IsActive && sd.Date == date.Date),
                                            s => s.ScheduleId, sd => sd.ScheduleId,
                                            (s, sd) => new ScheduleDetailsDto
                                            {
                                                ScheduleId = s.ScheduleId,
                                                ScheduleDetailsId = sd.ScheduleDetailsId,
                                                Date = sd.Date,
                                                StartTime = sd.StartTime,
                                                EndTime = sd.EndTime
                                            })).ToList();

                return _tutorSchedules;
            }
            var tutorSchedules = _dbContext.Schedule.Where(s => s.TutorId == tutorId && s.IsActive == true)
                                    .Join(_dbContext.ScheduleDetails.Where(sd => sd.IsActive),
                                            s => s.ScheduleId, sd => sd.ScheduleId,
                                            (s, sd) => new ScheduleDetailsDto
                                            {
                                                ScheduleId = s.ScheduleId,
                                                ScheduleDetailsId = sd.ScheduleDetailsId,
                                                Date = sd.Date,
                                                StartTime = sd.StartTime,
                                                EndTime = sd.EndTime
                                            })
                                    .Union(_dbContext.Schedule.Where(s => s.StudentId == studentId && s.IsActive == true)
                                    .Join(_dbContext.ScheduleDetails.Where(sd => sd.IsActive),
                                            s => s.ScheduleId, sd => sd.ScheduleId,
                                            (s, sd) => new ScheduleDetailsDto
                                            {
                                                ScheduleId = s.ScheduleId,
                                                ScheduleDetailsId = sd.ScheduleDetailsId,
                                                Date = sd.Date,
                                                StartTime = sd.StartTime,
                                                EndTime = sd.EndTime
                                            })).ToList();

            return tutorSchedules;
        }

        public Task<bool> HasTutorScheduleConflictAsync(
            Guid tutorId, DateTime startTime, DateTime endTime, Guid? excludedSalesDetailsId = null)
        {
            var completedDemoStatusIds = _dbContext.Type_Code.AsNoTracking()
                .Where(x => x.TypeCodeValue == (int)FollowUpStatus.DemoCompleted ||
                            x.TypeCodeValue == (int)FollowUpStatus.DCNeedToSchedule)
                .Select(x => x.Id);
            return (from schedule in _dbContext.Schedule.AsNoTracking()
                    join details in _dbContext.ScheduleDetails.AsNoTracking()
                        on schedule.ScheduleId equals details.ScheduleId
                    where schedule.IsActive && details.IsActive
                        && schedule.TutorId == tutorId
                        && (!excludedSalesDetailsId.HasValue || schedule.SalesDetailsId != excludedSalesDetailsId.Value)
                        && !((details.ScheduleType == "Demo" || details.ScheduleType == "100502") &&
                             ((details.StudentScheduleStatus.HasValue && completedDemoStatusIds.Contains(details.StudentScheduleStatus.Value)) ||
                              (details.TutorScheduleStatus.HasValue && completedDemoStatusIds.Contains(details.TutorScheduleStatus.Value)) ||
                              (details.OperationScheduleStatus.HasValue && completedDemoStatusIds.Contains(details.OperationScheduleStatus.Value))))
                        && details.StartTime < endTime
                        && details.EndTime > startTime
                    select details.ScheduleDetailsId).AnyAsync();
        }

        public Task<bool> HasStudentScheduleConflictAsync(
            Guid studentId, DateTime startTime, DateTime endTime, Guid? excludedSalesDetailsId = null)
        {
            var completedDemoStatusIds = _dbContext.Type_Code.AsNoTracking()
                .Where(x => x.TypeCodeValue == (int)FollowUpStatus.DemoCompleted ||
                            x.TypeCodeValue == (int)FollowUpStatus.DCNeedToSchedule)
                .Select(x => x.Id);
            return (from schedule in _dbContext.Schedule.AsNoTracking()
                    join details in _dbContext.ScheduleDetails.AsNoTracking()
                        on schedule.ScheduleId equals details.ScheduleId
                    where schedule.IsActive && details.IsActive
                        && schedule.StudentId == studentId
                        && (!excludedSalesDetailsId.HasValue || schedule.SalesDetailsId != excludedSalesDetailsId.Value)
                        && !((details.ScheduleType == "Demo" || details.ScheduleType == "100502") &&
                             ((details.StudentScheduleStatus.HasValue && completedDemoStatusIds.Contains(details.StudentScheduleStatus.Value)) ||
                              (details.TutorScheduleStatus.HasValue && completedDemoStatusIds.Contains(details.TutorScheduleStatus.Value)) ||
                              (details.OperationScheduleStatus.HasValue && completedDemoStatusIds.Contains(details.OperationScheduleStatus.Value))))
                        && details.StartTime < endTime
                        && details.EndTime > startTime
                    select details.ScheduleDetailsId).AnyAsync();
        }

        public async Task<Response<List<TutorInvoiceDto>>> GetTutorPayrollList(Guid tutorId)
        {
            var response = new Response<List<TutorInvoiceDto>>();

            try
            {
                // The page passes the tutor's User.Id; invoices may be saved under the Tutor.Id or the User.Id.
                var tutorKeys = await TutorKeysAsync(tutorId);
                if (tutorKeys.Count == 0) tutorKeys.Add(tutorId);
                var query = _dbContext.TutorInvoice
                    .Where(ti => tutorKeys.Contains(ti.TutorId) && ti.IsActive)
                    .Select(ti => new TutorInvoiceDto
                    {
                        Id = (int)ti.Id,
                        InvoiceNumber = ti.InvoiceNumber,
                        TutorTotalPayment = ti.TutorTotalPayment,
                        Month = ti.Month,
                        Year = ti.Year,
                    })
                    .ToListAsync();


                var payrollRequests = await query;

                response.Data = payrollRequests;
                response.Message = "Data retrieved successfully.";
                //response.Message = response.IsSuccess ? "Data retrieved successfully." : "No data found.";
            }
            catch (Exception ex)
            {
                //response.IsSuccess = false;
                response.Message = $"An error occurred: {ex.Message}";
            }

            return response;
        }

        public async Task<Response<List<StudentInvoiceDto>>> GetStudentInvoiceList(Guid userId)
        {
            var response = new Response<List<StudentInvoiceDto>>();

            try
            {
                var studentId = _dbContext.Student.Where(u => u.UserId == userId).FirstOrDefault().Id;

                var query = await (from invoice in _dbContext.StudentInvoice
                                   join detail in _dbContext.StudentInvoiceDetails
                                       on invoice.Id equals detail.StudentInvoiceId
                                   where invoice.StudentId == studentId && invoice.IsActive
                                       // An advance invoice reaches the parent only once Accounts send it.
                                       && !(invoice.InvoiceType == AdvanceInvoiceType && invoice.EmailSentDate == null)
                                   select new StudentInvoiceDto
                                   {
                                       Id = invoice.Id,
                                       InvoiceNumber = invoice.InvoiceNumber,
                                       StudentTotalPayment = invoice.TotalInvoiceAmount,
                                       Month = invoice.Month.ToString(),
                                       Year = invoice.Year,
                                       InvoicePeriod = $"{DateTimeFormatInfo.CurrentInfo.GetMonthName(invoice.Month)} - {invoice.Year}",

                                       Details = (from d in _dbContext.StudentInvoiceDetails
                                                  where d.StudentInvoiceId == invoice.Id
                                                  select new StudentInvoiceDetailsDto
                                                  {
                                                      Grade = detail.Grade,
                                                      Board = detail.Board,
                                                      Subject = detail.Subject,
                                                      Month = detail.Month,
                                                      Year = detail.Year,
                                                      ParentPayment = detail.ParentPayment,
                                                      NumberOfClasses = detail.NumberOfClasses,
                                                      PreviousMonthPendingClasses = detail.PreviousMonthPendingClasses,
                                                      PreviousMonthPendingClassesMonthYear = detail.PreviousMonthPendingClassesMonthYear,
                                                      PreviousMonthTotalClasses = detail.PreviousMonthTotalClasses,
                                                      InvoicePeriod = $"{DateTimeFormatInfo.CurrentInfo.GetMonthName(detail.Month)} - {detail.Year}",
                                                  }).ToList()
                                   }).ToListAsync();



                var payrollRequests = query;

                response.Data = payrollRequests;
                response.Message = "Data retrieved successfully.";
                //response.Message = response.IsSuccess ? "Data retrieved successfully." : "No data found.";
            }
            catch (Exception ex)
            {
                //response.IsSuccess = false;
                response.Message = $"An error occurred: {ex.Message}";
            }

            return response;
        }

        //public async Task<Response<List<PayrollRequestDto>>> GetTutorInvoiceById(string invoiceNumber)
        //{
        //    var response = new Response<List<PayrollRequestDto>>();

        //    try
        //    {
        //        var query =
        //            (from tin in _dbContext.TutorInvoice
        //             join tid in _dbContext.TutorInvoiceDetails on tin.Id equals tid.TutorInvoiceId
        //             join shd in _dbContext.ScheduleDetails on tid.ScheduleDetailsId equals shd.ScheduleDetailsId
        //             join sch in _dbContext.Schedule on shd.ScheduleId equals sch.ScheduleId
        //             join sad in _dbContext.SalesDetails on sch.SalesDetailsId equals sad.Id
        //             join sal in _dbContext.Sales on sad.SalesId equals sal.Id
        //             join usr in _dbContext.User on sch.TutorId equals usr.Id
        //             //join uss in _dbContext.User on sch.StudentId equals uss.Id
        //             join tcb in _dbContext.Type_Code on sal.BoardId equals tcb.Id
        //             join tcs in _dbContext.Type_Code on sad.SubjectId equals tcs.Id
        //             join tcg in _dbContext.Type_Code on sal.GradeId equals tcg.Id
        //             where tin.InvoiceNumber == invoiceNumber &&
        //                   tin.IsActive == true &&
        //                   tid.IsActive == true &&
        //                   shd.IsActive == true &&
        //                   sch.IsActive == true &&
        //                   sad.IsActive == true &&
        //                   sal.IsActive == true &&
        //                   usr.IsActive == true &&
        //                   //uss.IsActive == true &&
        //                   tcb.IsActive == true &&
        //                   tcs.IsActive == true &&
        //                   tcg.IsActive == true
        //             orderby shd.Date
        //             select new PayrollRequestDto
        //             {
        //                 SalesId = sal.Id,
        //                 SalesDetailsId = sad.Id,
        //                 ScheduleId = sch.ScheduleId,
        //                 ScheduleDetailsId = shd.ScheduleDetailsId,
        //                 ScheduleDate = shd.Date,
        //                 ScheduleStartTime = shd.StartTime,
        //                 ScheduleEndTime = shd.EndTime,
        //                 //TutorId = sch.TutorId,
        //                 //StudentId = sch.StudentId,
        //                 TutorName = usr.FullName,
        //                 //UserCode = usr.UserCode,
        //                 StudentName = "Test", //uss.FullName,
        //                 StudentCode = "Test",//uss.UserCode,
        //                 Board = tcb.TypeCodeName,
        //                 Subject = tcs.TypeCodeName,
        //                 Grade = tcg.TypeCodeName,
        //                 TutorSubjectPayment = sad.TutorPayment,
        //                 TotalTutorPayment = tin.TutorTotalPayment,
        //                 CreatedDate = tin.CreatedDate
        //             }).Distinct().ToListAsync();


        //        var payrollRequests = await query;
        //        //string htmlTable = GenerateHtmlTable(payrollRequests);
        //        response.Data = payrollRequests;
        //        response.Message = "Data retrieved successfully.";
        //        //response.Message = response.IsSuccess ? "Data retrieved successfully." : "No data found.";
        //    }
        //    catch (Exception ex)
        //    {
        //        //response.IsSuccess = false;
        //        response.Message = $"An error occurred: {ex.Message}";
        //    }
        //    return response;
        //}

        public async Task<Response<List<PayrollRequestDto>>> GetTutorInvoiceById(string invoiceNumber)
        {
            var response = new Response<List<PayrollRequestDto>>();

            try
            {
                var rows = await (
                    from tin in _dbContext.TutorInvoice
                    join tid in _dbContext.TutorInvoiceDetails on tin.Id equals tid.TutorInvoiceId
                    join shd in _dbContext.ScheduleDetails on tid.ScheduleDetailsId equals shd.ScheduleDetailsId
                    join sch in _dbContext.Schedule on shd.ScheduleId equals sch.ScheduleId
                    join sad in _dbContext.SalesDetails on sch.SalesDetailsId equals sad.Id
                    join sal in _dbContext.Sales on sad.SalesId equals sal.Id
                    join tut in _dbContext.Tutor on sch.TutorId equals tut.Id
                    join usr in _dbContext.User on tut.UserId equals usr.Id
                    join tcb in _dbContext.Type_Code on sal.BoardId equals tcb.Id
                    join tcs in _dbContext.Type_Code on sad.SubjectId equals tcs.Id
                    join tcg in _dbContext.Type_Code on sal.GradeId equals tcg.Id
                    join tbd in _dbContext.TCTBankDetails on sal.TCTBankId equals tbd.Id into tctBankJoin
                    from tbd in tctBankJoin.DefaultIfEmpty()
                    join td in _dbContext.TCTDetails on tbd.TCTId equals td.Id into tctDetailsJoin
                    from td in tctDetailsJoin.DefaultIfEmpty()
                    where tin.InvoiceNumber == invoiceNumber &&
                          tin.IsActive == true &&
                          tid.IsActive == true &&
                          shd.IsActive == true &&
                          sch.IsActive == true &&
                          sad.IsActive == true &&
                          sal.IsActive == true &&
                          usr.IsActive == true &&
                          tcb.IsActive == true &&
                          tcs.IsActive == true &&
                          tcg.IsActive == true
                    orderby shd.Date
                    select new PayrollRequestDto
                    {
                        InvoiceNumber = tin.InvoiceNumber,
                        SalesId = sal.Id,
                        SalesDetailsId = sad.Id,
                        ScheduleId = sch.ScheduleId,
                        ScheduleDetailsId = shd.ScheduleDetailsId,
                        ScheduleDate = shd.Date,
                        ScheduleStartTime = shd.StartTime,
                        ScheduleEndTime = shd.EndTime,
                        ScheduleMonth = shd.Date.Month,
                        ScheduleYear = shd.Date.Year,
                        TutorName = usr.FullName,
                        TutorEmail = usr.Email,
                        TutorPhone = usr.Phone,
                        TutorUserCode = usr.UserCode,
                        StudentName = tid.StudentName,
                        Board = tcb.TypeCodeName,
                        Subject = tcs.TypeCodeName,
                        Grade = tcg.TypeCodeName,
                        TutorSubjectPayment = tid.SubjectPayment,
                        ParentSubjectPayment = sad.ParentPayment,
                        TotalTutorPayment = tin.TutorTotalPayment,
                        CreatedDate = tin.CreatedDate,
                        TctTitle = td != null ? td.Title : null,
                        TctAddress1 = td != null ? td.Address1 : null,
                        TctAddress2 = td != null ? td.Address2 : null,
                        TctCity = td != null ? td.City : null,
                        TctState = td != null ? td.State : null,
                        TctZip = td != null ? td.Zip : null,
                        TctCountry = td != null ? td.Country : null,
                        TctPhone = td != null ? td.Phone : null,
                        TctEmail = td != null ? td.Email : null,
                    }
                ).Distinct().ToListAsync();

                // Load TCTDetails directly — the join chain through TCTBankDetails
                // fails when Sales.TCTBankId is not populated, leaving all TCT fields null.
                var tct = await _dbContext.TCTDetails.FirstOrDefaultAsync();

                // Compute total from class-level payments. TutorTotalPayment and SubjectPayment
                // stored by the SP may be 0; fall back to ParentPayment per class in that case.
                var computedTotal = rows.Sum(r =>
                    (r.TutorSubjectPayment ?? 0m) > 0
                        ? (r.TutorSubjectPayment ?? 0m)
                        : (r.ParentSubjectPayment ?? 0m));

                // month name must be set after query (CultureInfo cannot run inside EF LINQ)
                foreach (var row in rows)
                {
                    row.ScheduleMonthName = CultureInfo.CurrentCulture.DateTimeFormat.GetMonthName(row.ScheduleMonth);

                    if (tct != null)
                    {
                        row.TctTitle = tct.Title;
                        row.TctAddress1 = tct.Address1;
                        row.TctAddress2 = tct.Address2;
                        row.TctCity = tct.City;
                        row.TctState = tct.State;
                        row.TctZip = tct.Zip;
                        row.TctCountry = tct.Country;
                        row.TctPhone = tct.Phone;
                        row.TctEmail = tct.Email;
                    }

                    if (row.TotalTutorPayment == null || row.TotalTutorPayment == 0)
                        row.TotalTutorPayment = computedTotal;
                }

                response.Data = rows;
                response.Message = "Data retrieved successfully.";
            }
            catch (Exception ex)
            {
                response.Message = $"An error occurred: {ex.Message}";
            }

            return response;
        }

        public async Task<Response<List<PayrollRequestDto>>> GetStudentInvoiceById(string invoiceNumber)
        {
            var response = new Response<List<PayrollRequestDto>>();

            try
            {
                var cleanInvoice = invoiceNumber?.Trim();

                var query = await (from tin in _dbContext.StudentInvoice
                                   join tid in _dbContext.StudentInvoiceDetails on tin.Id equals tid.StudentInvoiceId
                                   join shd in _dbContext.ScheduleDetails on tid.ScheduleId equals shd.ScheduleId
                                   join sch in _dbContext.Schedule on shd.ScheduleId equals sch.ScheduleId
                                   join sad in _dbContext.SalesDetails on sch.SalesDetailsId equals sad.Id
                                   join sal in _dbContext.Sales on sad.SalesId equals sal.Id
                                   join tut in _dbContext.Tutor on sch.TutorId equals tut.Id
                                   join usr in _dbContext.User on tut.UserId equals usr.Id
                                   join std in _dbContext.Student on sch.StudentId equals std.Id
                                   join uss in _dbContext.User on std.UserId equals uss.Id
                                   join tcb in _dbContext.Type_Code on sal.BoardId equals tcb.Id
                                   join tcs in _dbContext.Type_Code on sad.SubjectId equals tcs.Id
                                   join tcg in _dbContext.Type_Code on sal.GradeId equals tcg.Id

                                   where tin.InvoiceNumber == cleanInvoice &&
                                         tin.Month == shd.Date.Month &&
                                         tin.Year == shd.Date.Year &&
                                         tin.IsActive == true &&
                                         tid.IsActive == true &&
                                         shd.IsActive == true &&
                                         sch.IsActive == true &&
                                         sad.IsActive == true &&
                                         sal.IsActive == true &&
                                         usr.IsActive == true &&
                                         uss.IsActive == true

                                   orderby shd.Date
                                   select new PayrollRequestDto
                                   {
                                       // Basic IDs
                                       SalesId = sal.Id,
                                       SalesDetailsId = sad.Id,
                                       ScheduleId = sch.ScheduleId,
                                       ScheduleDetailsId = shd.ScheduleDetailsId,
                                       StudentId = std.Id,
                                       TutorId = tut.Id,

                                       // Names and Codes
                                       TutorName = usr.FirstName + " " + (usr.LastName ?? ""),
                                       StudentName = uss.FirstName + " " + (uss.LastName ?? ""),
                                       UserCode = usr.UserCode,

                                       // Date and Time
                                       ScheduleDate = shd.Date,
                                       ScheduleStartTime = shd.StartTime,
                                       ScheduleEndTime = shd.EndTime,

                                       // Metadata
                                       Board = tcb.TypeCodeName,
                                       Subject = tcs.TypeCodeName,
                                       Grade = tcg.TypeCodeName,
                                       InvoiceNumber = tin.InvoiceNumber,

                                       // Financials
                                       ParentSubjectPayment = sad.ParentPayment,
                                       TotalParentPayment = tin.TotalInvoiceAmount,

                                       PaymentURL = tin.PaymentUrl,

                                       // Invoice Stats
                                       NumberOfClasses = tid.NumberOfClasses,
                                       InvoicePeriod = $"{DateTimeFormatInfo.CurrentInfo.GetMonthName(tin.Month)} - {tin.Year}"
                                   }).ToListAsync();

                response.Data = query;
                response.Succeeded = query.Any();
                response.Message = query.Any() ? "Data retrieved successfully." : "No data found.";
            }
            catch (Exception ex)
            {
                response.Succeeded = false;
                response.Message = $"An error occurred: {ex.Message}";
            }
            return response;
        }

        //public async Task<Response<List<PayrollRequestDto>>> GetStudentInvoiceById(string invoiceNumber)
        //{
        //    var response = new Response<List<PayrollRequestDto>>();

        //    try
        //    {
        //        var query =
        //            (from tin in _dbContext.StudentInvoice
        //             join tid in _dbContext.StudentInvoiceDetails on tin.Id equals tid.StudentInvoiceId
        //             join shd in _dbContext.ScheduleDetails on tid.ScheduleId equals shd.ScheduleId
        //             join sch in _dbContext.Schedule on shd.ScheduleId equals sch.ScheduleId
        //             join sad in _dbContext.SalesDetails on sch.SalesDetailsId equals sad.Id
        //             join sal in _dbContext.Sales on sad.SalesId equals sal.Id
        //             join usr in _dbContext.User on sch.TutorId equals usr.Id
        //             join std in _dbContext.Student on sch.StudentId equals std.Id
        //             join uss in _dbContext.User on std.UserId equals uss.Id
        //             join tcb in _dbContext.Type_Code on sal.BoardId equals tcb.Id
        //             join tcs in _dbContext.Type_Code on sad.SubjectId equals tcs.Id
        //             join tcg in _dbContext.Type_Code on sal.GradeId equals tcg.Id
        //             where tin.InvoiceNumber == invoiceNumber &&
        //                   shd.Date.Month == tin.Month &&
        //                   shd.Date.Year == tin.Year &&
        //                   tin.IsActive == true &&
        //                   tid.IsActive == true &
        //                   shd.IsActive == true &&
        //                   sch.IsActive == true &&
        //                   sad.IsActive == true &&
        //                   sal.IsActive == true &&
        //                   usr.IsActive == true &&
        //                   uss.IsActive == true &&
        //                   tcb.IsActive == true &&
        //                   tcs.IsActive == true &&
        //                   tcg.IsActive == true
        //             orderby shd.Date
        //             select new PayrollRequestDto
        //             {
        //                 SalesId = sal.Id,
        //                 SalesDetailsId = sad.Id,
        //                 ScheduleId = sch.ScheduleId,
        //                 ScheduleDetailsId = shd.ScheduleDetailsId,
        //                 ScheduleDate = shd.Date,
        //                 ScheduleStartTime = shd.StartTime,
        //                 ScheduleEndTime = shd.EndTime,
        //                 TutorName = usr.FullName,
        //                 UserCode = usr.UserCode,
        //                 StudentName = uss.FullName,
        //                 //StudentCode = uss.UserCode,
        //                 Board = tcb.TypeCodeName,
        //                 Subject = tcs.TypeCodeName,
        //                 Grade = tcg.TypeCodeName,
        //                 ParentSubjectPayment = sad.ParentPayment,
        //                 TotalParentPayment = tin.TotalInvoiceAmount,
        //                 CreatedDate = tin.CreatedDate,
        //                 InvoicePeriod = $"{DateTimeFormatInfo.CurrentInfo.GetMonthName(tin.Month)} - {tin.Year}",
        //                 NumberOfClasses = tid.NumberOfClasses,
        //                 PreviousMonthPendingClasses = tid.PreviousMonthPendingClasses,
        //                 PreviousMonthPendingClassesMonthYear = tid.PreviousMonthPendingClassesMonthYear,
        //                 PreviousMonthTotalClasses = tid.PreviousMonthTotalClasses,
        //             }).Distinct().ToListAsync();


        //        var payrollRequests = await query;
        //        //string htmlTable = GenerateHtmlTable(payrollRequests);
        //        response.Data = payrollRequests;
        //        response.Message = "Data retrieved successfully.";
        //        //response.Message = response.IsSuccess ? "Data retrieved successfully." : "No data found.";
        //    }
        //    catch (Exception ex)
        //    {
        //        //response.IsSuccess = false;
        //        response.Message = $"An error occurred: {ex.Message}";
        //    }
        //    return response;
        //}

        public async Task<Response<bool>> RemoveSchedule(Guid scheduleId, Guid userId)
        {
            Response<bool> response = new Response<bool>();
            using (var transaction = await _dbContext.Database.BeginTransactionAsync())
            {
                try
                {
                    var schedule = _dbContext.Schedule.Where(s => s.ScheduleId == scheduleId).FirstOrDefault();

                    if (schedule == null)
                    {
                        throw new Exception($"Schedule not found for id {scheduleId}");
                    }
                    schedule.IsActive = false;
                    schedule.ModifiedBy = userId;
                    schedule.ModifiedDate = DateTime.Now;
                    _dbContext.Update(schedule);
                    _dbContext.SaveChanges();
                    transaction.Commit();
                }
                catch (Exception ex)
                {
                }
            }
            return response;
        }

        public async Task<List<AccountsInvoiceSummaryDto>> GetStudentSchedulesAsync(
    Guid studentId, int month, int year)
        {
            var query = @"
    SELECT 
        US.Id AS UserId,
        SH.StudentId,
        CONCAT(US.FirstName, ' ', US.LastName) AS StudentName,
        ST.ParentName,    
        CG.TypeCodeName AS Grade,
        CB.TypeCodeName AS Board,
        CS.TypeCodeName AS Subject,
        YEAR(SD.Date) AS Year,
        MONTH(SD.Date) AS Month,
        DATENAME(MONTH, SD.Date) AS MonthName,
        MIN(SA.ParentPayment) AS ParentPayment,
        -- Classes, hours and amount count only classes billable to the parent after the Operations
        -- cross-check (dbo.vw_ClassAttendanceBilling), matching what the invoice bills.
        COUNT(DISTINCT CASE WHEN BILL.IsParentBillable = 1 THEN SD.ScheduleDetailsId END) AS NumberOfClasses,
        ISNULL(SUM(CASE WHEN BILL.IsParentBillable = 1 THEN CEILING(DATEDIFF(MINUTE, SD.StartTime, SD.EndTime) / 15.0) * 15 END), 0) / 60.0 AS TotalHours,
        (ISNULL(SUM(CASE WHEN BILL.IsParentBillable = 1 THEN CEILING(DATEDIFF(MINUTE, SD.StartTime, SD.EndTime) / 15.0) * 15 END), 0) / 60.0 * MIN(SA.ParentPayment)) AS TotalParentPayment,
        SD.ScheduleType,
        SA.Id AS SalesDetailsId,
        MAX(INV.InvoiceNumber) AS InvoiceNumber,
        ISNULL(MAX(INV.TotalInvoiceAmount), 0) AS TotalInvoiceAmount,
        ISNULL(MAX(SR.FeesPerHour), 0) AS AgreedFeesPerHour,
        MAX(US.FirstName) AS TutorName,
        '00000000-0000-0000-0000-000000000000' AS ScheduleDetailsId,
        '00000000-0000-0000-0000-000000000000' AS ScheduleId,
        NULL AS StartTime,
        NULL AS EndTime,
        NULL AS OperationEndTime,
        NULL AS OperationStartTime,
        NULL AS StudentEndTime,
        NULL AS StudentStartTime,
        NULL AS TutorStartTime,
        NULL AS TutorEndTime,
        NULL AS ScheduleDate,
        -- Every schedule contributing classes to this month must be approved.
        CASE WHEN COUNT(DISTINCT CASE WHEN AP.TypeCodeValue = 1014001 THEN SH.ScheduleId END)
                    = COUNT(DISTINCT SH.ScheduleId)
             THEN MAX(SH.AccountsApprovalScheduleStatus) ELSE NULL END AS AccountsApprovalScheduleStatus,
        MAX(SH.ApprovedBy) AS ApprovedBy,
        MAX(SH.ApprovedDate) AS ApprovedDate
    FROM Schedule SH
    INNER JOIN ScheduleDetails SD ON SH.ScheduleId = SD.ScheduleId
    LEFT JOIN vw_ClassAttendanceBilling BILL ON BILL.ScheduleDetailsId = SD.ScheduleDetailsId
    INNER JOIN Student ST ON SH.StudentId = ST.Id
    INNER JOIN [User] US ON US.Id = ST.UserId
    INNER JOIN SalesDetails SA ON SA.Id = SH.SalesDetailsId
    INNER JOIN Sales SS ON SS.Id = SA.SalesId
    OUTER APPLY (
        SELECT MAX(FeesPerHour) AS FeesPerHour
        FROM StudentRegistration
        WHERE StudentId = SS.StudentId
    ) SR
    LEFT JOIN Type_Code AP ON AP.Id = SH.AccountsApprovalScheduleStatus
    INNER JOIN Type_Code CG ON SS.GradeId = CG.Id
    INNER JOIN Type_Code CB ON SS.BoardId = CB.Id
    INNER JOIN Type_Code CS ON SA.SubjectId = CS.Id
    OUTER APPLY (
        SELECT TOP 1 SI.InvoiceNumber, SI.TotalInvoiceAmount
        FROM StudentInvoiceDetails SID
        INNER JOIN Schedule ISH ON ISH.ScheduleId = SID.ScheduleId
        INNER JOIN StudentInvoice SI ON SI.Id = SID.StudentInvoiceId
        WHERE ISH.SalesDetailsId = SA.Id
          AND SID.Month = {1} AND SID.Year = {2}
          AND SID.IsActive = 1 AND SI.IsActive = 1
        ORDER BY SI.Id DESC
    ) INV
    WHERE SD.IsActive = 1
        AND SA.IsActive = 1
        AND SH.IsActive = 1
        AND SH.StudentId = {0}
        AND MONTH(SD.Date) = {1}
        AND YEAR(SD.Date) = {2}
        AND SD.ScheduleType != 'Demo'
    GROUP BY 
        US.Id,
        US.FirstName,
        US.LastName,
        ST.ParentName,
        CG.TypeCodeName,
        CB.TypeCodeName,
        CS.TypeCodeName,
        YEAR(SD.Date),
        MONTH(SD.Date),
        DATENAME(MONTH, SD.Date),
        SD.ScheduleType,
        SH.StudentId,
        SA.Id
    ORDER BY StudentName, Year, MONTH(SD.Date);
    ";

            var rows = await _dbContext.AccountsInvoiceSummaryDtos
                .FromSqlRaw(query, studentId, month, year)
                .AsNoTracking()
                .ToListAsync();
            var enrollmentIds = rows.Select(row => row.SalesDetailsId).Distinct().ToList();
            var recurring = await _dbContext.Schedule.AsNoTracking()
                .Where(s => s.IsActive && s.StudentId == studentId && enrollmentIds.Contains(s.SalesDetailsId)
                    && s.ScheduleMode == "Weekly" && s.NoOfMonths > 1)
                .OrderBy(s => s.StartDate).ThenBy(s => s.CreatedDate).ToListAsync();
            var plans = await _dbContext.StudentPaymentPlan.AsNoTracking()
                .Where(p => p.IsActive && p.StudentId == studentId && enrollmentIds.Contains(p.SalesDetailsId)).ToListAsync();
            foreach (var row in rows)
            {
                var schedule = recurring.FirstOrDefault(s => s.SalesDetailsId == row.SalesDetailsId);
                var plan = plans.FirstOrDefault(p => p.SalesDetailsId == row.SalesDetailsId);
                row.ScheduledPackageMonths = !string.IsNullOrWhiteSpace(plan?.UpfrontInvoiceNumber)
                    ? plan.PlanMonths : schedule?.NoOfMonths ?? plan?.PlanMonths;
                row.PackageStartMonth = plan?.StartMonth ?? schedule?.StartDate.Month;
                row.PackageStartYear = plan?.StartYear ?? schedule?.StartDate.Year;
                row.PaymentPlanId = plan?.Id;
                row.PaymentPlanMonths = plan?.PlanMonths;
                row.PackageInvoiceNumber = plan?.UpfrontInvoiceNumber;
                row.PackageTotalFee = plan?.TotalFee;
                row.PackageTotalClasses = plan?.TotalClasses;
            }
            return rows;
        }

        public async Task<List<InvoiceQueryResult>> GetInvoiceDataAsync(Guid studentId, int month, int year)
        {
            var sql = @"
            SELECT  
                US.Id AS UserId, 
                SH.ScheduleId, 
                SH.StudentId, 
                SH.TutorId,
                CONCAT(US.FirstName, ' ', US.LastName) AS StudentName, 
                '' AS TutorName,
                ST.ParentName,     
                CG.TypeCodeName AS Grade, 
                CB.TypeCodeName AS Board, 
                CS.TypeCodeName AS Subject, 
                YEAR(SD.Date) AS Year,
                MONTH(SD.Date) AS Month, 
                DATENAME(MONTH, SD.Date) AS MonthName, 
                MIN(SA.ParentPayment) AS ParentPayment,
                COUNT(DISTINCT SD.ScheduleDetailsId) AS NumberOfClasses,
                (CH.TotalHours * MIN(SA.ParentPayment)) AS TotalParentPayment,

                -- Previous month total classes
                (
                    SELECT COUNT(*)
                    FROM ScheduleDetails SD2
                    WHERE SD2.ScheduleId = SH.ScheduleId
                      AND SD2.IsActive = 1
                      AND YEAR(SD2.Date) = CASE WHEN {1} = 1 THEN {2} - 1 ELSE {2} END
                      AND MONTH(SD2.Date) = CASE WHEN {1} = 1 THEN 12 ELSE {1} - 1 END
                ) AS PreviousMonthTotalClasses,

                -- Previous month pending classes
                (
                    SELECT COUNT(*)
                    FROM ScheduleDetails SD2
                    WHERE SD2.ScheduleId = SH.ScheduleId
                      AND SD2.IsActive = 1
                      AND (
                            SD2.Status LIKE '%A9485EAB-5D01-491B-9637-91E92A1E71F3%'
                         OR SD2.TutorScheduleStatus = 'A9485EAB-5D01-491B-9637-91E92A1E71F3'
                         OR SD2.StudentScheduleStatus = 'A9485EAB-5D01-491B-9637-91E92A1E71F3'
                      )
                      AND YEAR(SD2.Date) = CASE WHEN {1} = 1 THEN {2} - 1 ELSE {2} END
                      AND MONTH(SD2.Date) = CASE WHEN {1} = 1 THEN 12 ELSE {1} - 1 END
                ) AS PreviousMonthPendingClasses,

                -- Previous month pending class months
                (
                    SELECT STRING_AGG(
                        CONCAT(DATENAME(MONTH, SD2.Date), ' ', YEAR(SD2.Date)), ', '
                    )
                    FROM ScheduleDetails SD2
                    WHERE SD2.ScheduleId = SH.ScheduleId
                      AND SD2.IsActive = 1
                      AND (
                            SD2.Status LIKE '%A9485EAB-5D01-491B-9637-91E92A1E71F3%'
                         OR SD2.TutorScheduleStatus = 'A9485EAB-5D01-491B-9637-91E92A1E71F3'
                         OR SD2.StudentScheduleStatus = 'A9485EAB-5D01-491B-9637-91E92A1E71F3'
                      )
                      AND YEAR(SD2.Date) = CASE WHEN {1} = 1 THEN {2} - 1 ELSE {2} END
                      AND MONTH(SD2.Date) = CASE WHEN {1} = 1 THEN 12 ELSE {1} - 1 END
                ) AS PreviousMonthPendingClassesMonthYear,

                -- Total invoice adjusted by previous month's pending classes (hours-based)
                (CH.TotalHours * MIN(SA.ParentPayment)) - (
                    ISNULL(PH.PendingHours, 0) * MIN(SA.ParentPayment)
                ) AS TotalInvoiceAmount,

                SD.ScheduleType

            FROM Schedule SH
            INNER JOIN ScheduleDetails SD ON SH.ScheduleId = SD.ScheduleId
            INNER JOIN Student ST ON SH.StudentId = ST.Id
            INNER JOIN [User] US ON US.Id = ST.UserId
            INNER JOIN SalesDetails SA ON SA.Id = SH.SalesDetailsId
            INNER JOIN Sales SS ON SS.Id = SA.SalesId
            INNER JOIN Type_Code CG ON SS.GradeId = CG.Id
            INNER JOIN Type_Code CB ON SS.BoardId = CB.Id
            INNER JOIN Type_Code CS ON SA.SubjectId = CS.Id
            -- Bill only classes the Operations cross-check makes billable to the parent
            -- (dbo.vw_ClassAttendanceBilling / AttendanceBillingRule).
            INNER JOIN vw_ClassAttendanceBilling BILL ON BILL.ScheduleDetailsId = SD.ScheduleDetailsId AND BILL.IsParentBillable = 1
            CROSS APPLY (
                -- Bill each class rounded UP to the next 15 min (>1:00->1:15, >1:15->1:30, ...),
                -- then sum and convert to hours. Rounding is per class, not on the monthly total.
                SELECT SUM(CEILING(DATEDIFF(MINUTE, SD3.StartTime, SD3.EndTime) / 15.0) * 15) / 60.0 AS TotalHours
                FROM ScheduleDetails SD3
                INNER JOIN vw_ClassAttendanceBilling BILL3 ON BILL3.ScheduleDetailsId = SD3.ScheduleDetailsId AND BILL3.IsParentBillable = 1
                WHERE SD3.ScheduleId = SH.ScheduleId AND SD3.IsActive = 1
                  AND MONTH(SD3.Date) = {1} AND YEAR(SD3.Date) = {2} AND SD3.ScheduleType != 'Demo'
            ) CH
            OUTER APPLY (
                SELECT SUM(CEILING(DATEDIFF(MINUTE, SD4.StartTime, SD4.EndTime) / 15.0) * 15) / 60.0 AS PendingHours
                FROM ScheduleDetails SD4
                WHERE SD4.ScheduleId = SH.ScheduleId
                  AND SD4.IsActive = 1
                  AND (
                        SD4.Status LIKE '%A9485EAB-5D01-491B-9637-91E92A1E71F3%'
                     OR SD4.TutorScheduleStatus = 'A9485EAB-5D01-491B-9637-91E92A1E71F3'
                     OR SD4.StudentScheduleStatus = 'A9485EAB-5D01-491B-9637-91E92A1E71F3'
                  )
                  AND YEAR(SD4.Date) = CASE
                        WHEN {1} = 1 THEN {2} - 1
                        ELSE {2}
                    END
                  AND MONTH(SD4.Date) = CASE
                        WHEN {1} = 1 THEN 12
                        ELSE {1} - 1
                    END
            ) PH

            WHERE SD.IsActive = 1
              AND SH.IsActive = 1
              AND SA.IsActive = 1
              AND SH.StudentId = {0}
              AND MONTH(SD.Date) = {1}
              AND YEAR(SD.Date) = {2}
              AND SD.ScheduleType != 'Demo'

            GROUP BY
                US.Id,
                SH.ScheduleId,
                SH.StudentId,
                SH.TutorId,
                US.FirstName,
                US.LastName,
                ST.ParentName,
                CG.TypeCodeName,
                CB.TypeCodeName,
                CS.TypeCodeName,
                YEAR(SD.Date),
                MONTH(SD.Date),
                DATENAME(MONTH, SD.Date),
                SD.ScheduleType,
                CH.TotalHours,
                PH.PendingHours

            ORDER BY StudentName, Year, MONTH(SD.Date)";

            //var results = await _dbContext.Database
            //    .SqlQueryRaw<InvoiceQueryResult>(sql, studentId, month, year)
            //    .ToListAsync();
            var results = await _dbContext.Set<InvoiceQueryResult>()
        .FromSqlRaw(sql, studentId, month, year)
        .ToListAsync();

            return results;
        }

        // ══════════════════════════════════════════════════════════════════════
        //  STEP 1 — Add to ScheduleRepository class (top of file)
        // ══════════════════════════════════════════════════════════════════════
        //
        //  ADD this field alongside your existing fields:
        //  private readonly IEmailService _emailService;
        //
        //  UPDATE constructor — add IEmailService parameter:
        //
        //  public ScheduleRepository(
        //      ApplicationDbContext dbContext,
        //      IMasterDetailRepository masterDetailRepository,
        //      IConfiguration configuration,
        //      IEmailService emailService)            // ← ADD
        //      : base(dbContext)
        //  {
        //      _dbContext              = dbContext;
        //      _masterDetailRepository = masterDetailRepository;
        //      _configuration          = configuration;
        //      _emailService           = emailService; // ← ADD
        //  }
        //
        // ══════════════════════════════════════════════════════════════════════
        //  STEP 2 — Add using at top of ScheduleRepository.cs
        // ══════════════════════════════════════════════════════════════════════
        //
        //  using TCT.LMS.Infrastructure.Common;
        //
        // ══════════════════════════════════════════════════════════════════════
        //  STEP 3 — Register in Program.cs
        // ══════════════════════════════════════════════════════════════════════
        //
        //  QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;
        //  builder.Services.Configure<EmailSettings>(
        //      builder.Configuration.GetSection("EmailSettings"));
        //  builder.Services.AddScoped<IInvoicePdfService, InvoicePdfService>();
        //  builder.Services.AddScoped<IEmailService, EmailService>();
        //
        // ══════════════════════════════════════════════════════════════════════
        //  STEP 4 — Full updated method (replace existing one in ScheduleRepository)
        // ══════════════════════════════════════════════════════════════════════

        public async Task<string> CreateInvoiceWithDetailsAsync(
            Guid studentId,
            int month,
            int year,
            Guid createdBy)
        {
            using var transaction = await _dbContext.Database.BeginTransactionAsync();
            try
            {
                // ── 1. Fetch invoice data ────────────────────────────────────
                var queryResults = await GetInvoiceDataAsync(studentId, month, year);
                // Monthly billing must never rebill subjects covered by a prepaid package.
                var invoiceMonth = new DateTime(year, month, 1);
                var prepaidEnrollments = (await _dbContext.StudentPaymentPlan.AsNoTracking()
                    .Where(p => p.StudentId == studentId && p.IsActive).ToListAsync())
                    .Where(p => invoiceMonth >= new DateTime(p.StartYear, p.StartMonth, 1)
                        && invoiceMonth < new DateTime(p.StartYear, p.StartMonth, 1).AddMonths(p.PlanMonths))
                    .Select(p => p.SalesDetailsId).ToList();
                var prepaidSchedules = await _dbContext.Schedule.Where(s => prepaidEnrollments.Contains(s.SalesDetailsId))
                    .Select(s => s.ScheduleId).ToListAsync();
                queryResults = queryResults.Where(row => !row.ScheduleId.HasValue || !prepaidSchedules.Contains(row.ScheduleId.Value)).ToList();
                // A subject's first month billed in advance (ScheduleRepository.AdvanceInvoice.cs) is not billed again.
                var advanceSchedules = await GetAdvanceBilledScheduleIdsAsync(studentId, month, year);
                var advanceEnrollments = await _dbContext.Schedule.Where(s => advanceSchedules.Contains(s.ScheduleId))
                    .Select(s => s.SalesDetailsId).Distinct().ToListAsync();
                var hadMonthRows = queryResults.Any();
                queryResults = queryResults.Where(row => !row.ScheduleId.HasValue || !advanceSchedules.Contains(row.ScheduleId.Value)).ToList();
                if (hadMonthRows && !queryResults.Any())
                    throw new InvalidOperationException(
                        $"{invoiceMonth:MMMM yyyy} was already billed by the advance invoice for the first month's classes. No invoice was created.");

                // ── 1a. Attendance cross-check must be finished ──────────────
                // The parent is billed from the cross-checked attendance (AttendanceBillingRule), so every
                // class of the month that takes place must be cross-checked by Operations first.
                var awaitingCrossCheck = await GetClassesAwaitingCrossCheckAsync(studentId, invoiceMonth, prepaidSchedules.Concat(advanceSchedules).ToList());
                if (awaitingCrossCheck.Count > 0)
                    throw new InvalidOperationException(
                        $"{awaitingCrossCheck.Count} class(es) in {invoiceMonth:MMMM yyyy} are waiting for the Operations attendance cross-check " +
                        $"({string.Join(", ", awaitingCrossCheck.Take(3).Select(start => start.ToString("dd-MMM hh:mm tt")))}" +
                        $"{(awaitingCrossCheck.Count > 3 ? ", ..." : "")}). Approve them on the Class Attendance page, then generate the invoice. No invoice was created.");

                if (!queryResults.Any())
                    throw new InvalidOperationException("No data found for the specified parameters.");

                // ── 1b. Guard against duplicate invoice creation ─────────────
                // An invoice already covering any of these schedules for this
                // month/year means "Generate" was already used — return the
                // existing invoice instead of creating a duplicate.
                var scheduleIdsInPeriod = queryResults.Select(x => x.ScheduleId.Value).Distinct().ToList();
                var existingInvoiceId = await _dbContext.Set<StudentInvoiceDetails>()
                    .Where(d => scheduleIdsInPeriod.Contains(d.ScheduleId) && d.Month == month && d.Year == year && d.IsActive)
                    .Select(d => d.StudentInvoiceId)
                    .FirstOrDefaultAsync();

                if (existingInvoiceId != 0)
                {
                    var existingInvoiceNumber = await _dbContext.Set<StudentInvoice>()
                        .Where(i => i.Id == existingInvoiceId)
                        .Select(i => i.InvoiceNumber)
                        .FirstOrDefaultAsync();

                    if (!string.IsNullOrEmpty(existingInvoiceNumber))
                    {
                        await transaction.RollbackAsync();
                        return existingInvoiceNumber;
                    }
                }

                // The student schedule summary is the source shown to Accounts before
                // generation. Refuse to issue a new invoice if the detail query would
                // bill a different number of classes (for example, across two headers).
                var scheduleSummary = await GetStudentSchedulesAsync(studentId, month, year);
                var displayedClassCount = scheduleSummary.Where(item => !prepaidEnrollments.Contains(item.SalesDetailsId)
                    && !advanceEnrollments.Contains(item.SalesDetailsId)).Sum(item => item.NumberOfClasses);
                var billedClassCount = queryResults.Sum(item => item.NumberOfClasses ?? 0);
                if (displayedClassCount != billedClassCount)
                    throw new InvalidOperationException(
                        $"Invoice class count ({billedClassCount}) does not match the schedule summary ({displayedClassCount}). No invoice was created.");

                var approvedStatusId = await _dbContext.Type_Code
                    .Where(code => code.TypeCodeValue == 1014001)
                    .Select(code => code.Id)
                    .FirstOrDefaultAsync();
                if (approvedStatusId == Guid.Empty || await _dbContext.Schedule
                    .AnyAsync(schedule => scheduleIdsInPeriod.Contains(schedule.ScheduleId) &&
                        schedule.AccountsApprovalScheduleStatus != approvedStatusId))
                    throw new InvalidOperationException(
                        "All scheduled classes for the selected month must be approved before generating an invoice.");

                // ── 2. Calculate totals ──────────────────────────────────────
                var totalInvoiceAmount = queryResults.Sum(x => x.TotalInvoiceAmount);
                var now = DateTime.Now;
                var invoiceNumber = $"INV-{now:yyyyMMdd-HHmmss}-{studentId.ToString().Substring(0, 8).ToUpper()}";
                var first = queryResults.First();

                // ── 3. Generate Stripe Payment Link ──────────────────────────
                string paymentUrl = null;
                try
                {
                    var secretKey = _configuration["Stripe:SecretKey"];
                    if (string.IsNullOrEmpty(secretKey))
                        throw new Exception("Stripe:SecretKey is missing or empty in appsettings.json");

                    StripeConfiguration.ApiKey = secretKey;

                    var priceService = new PriceService();
                    var price = await priceService.CreateAsync(new PriceCreateOptions
                    {
                        Currency = "inr",
                        UnitAmount = (long)(totalInvoiceAmount.Value * 100),
                        ProductData = new PriceProductDataOptions
                        {
                            Name = $"{first.StudentName} — Tuition Fees ({now:MMM yyyy})",
                        },
                    });

                    var linkService = new PaymentLinkService();
                    var link = await linkService.CreateAsync(new PaymentLinkCreateOptions
                    {
                        LineItems = new List<PaymentLinkLineItemOptions>
                {
                    new PaymentLinkLineItemOptions
                    {
                        Price    = price.Id,
                        Quantity = 1,
                    }
                },
                        Metadata = new Dictionary<string, string>
                {
                    { "invoice_number", invoiceNumber },
                    { "student_id",     studentId.ToString() },
                    { "student_name",   first.StudentName ?? "" },
                    { "month_year",     $"{month}/{year}" }
                }
                    });

                    paymentUrl = link.Url;
                }
                catch (StripeException)
                {
                    // Non-fatal — invoice still saves, QR just won't show
                }
                catch (Exception)
                {
                    // Non-fatal — catches config issues like missing key
                }

                // ── 4. Create StudentInvoice record ──────────────────────────
                var invoice = new StudentInvoice
                {
                    InvoiceNumber = invoiceNumber,
                    StudentId = studentId,
                    ScheduleId = first.ScheduleId.Value,
                    TotalInvoiceAmount = totalInvoiceAmount.Value,
                    Month = month,
                    Year = year,
                    IsActive = true,
                    CreatedBy = createdBy,
                    StartDate = now,
                    DueDate = now.AddDays(5),
                    CreatedDate = now,
                    PaymentUrl = paymentUrl,
                };

                _dbContext.Set<StudentInvoice>().Add(invoice);
                await _dbContext.SaveChangesAsync();

                // ── 5. Create StudentInvoiceDetails records ───────────────────
                foreach (var data in queryResults)
                {
                    var detail = new StudentInvoiceDetails
                    {
                        StudentInvoiceId = invoice.Id,
                        UserId = data.UserId.Value,
                        ScheduleId = data.ScheduleId.Value,
                        StudentId = data.StudentId.Value,
                        StudentName = data.StudentName,
                        ParentName = data.ParentName,
                        TutorId = data.TutorId.Value,
                        TutorName = data.TutorName,
                        Grade = data.Grade,
                        Board = data.Board,
                        Subject = data.Subject,
                        Year = data.Year.Value,
                        Month = data.Month.Value,
                        ParentPayment = data.ParentPayment.Value,
                        NumberOfClasses = data.NumberOfClasses.Value,
                        PreviousMonthTotalClasses = data.PreviousMonthTotalClasses,
                        PreviousMonthPendingClasses = data.PreviousMonthPendingClasses,
                        PreviousMonthPendingClassesMonthYear = data.PreviousMonthPendingClassesMonthYear,
                        ScheduleType = data.ScheduleType,
                        SubjectAmount = data.TotalInvoiceAmount,
                        IsActive = true,
                        CreatedBy = createdBy,
                        CreatedDate = DateTime.UtcNow
                    };
                    _dbContext.Set<StudentInvoiceDetails>().Add(detail);
                }

                await _dbContext.SaveChangesAsync();

                // ── 6. Commit transaction ─────────────────────────────────────
                await transaction.CommitAsync();

                // ── 7. Send invoice email with PDF attachment ─────────────────
                // ✅ AFTER CommitAsync — DB is 100% saved before email fires
                // ✅ Fire and forget (_) — API responds instantly
                // ✅ Non-fatal — email failure never affects invoice save
                try
                {
                    // Get parent email from User table using the student's UserId
                    // first.UserId comes from your InvoiceQueryResult (US.Id = student's UserId)
                    var parentEmail = await _dbContext.User
                        .Where(u => u.Id == first.UserId)
                        .Select(u => u.Email)  // ← check your User entity: EmailAddress or Email
                        .FirstOrDefaultAsync();

                    if (!string.IsNullOrEmpty(parentEmail))
                    {
                        _ = _emailService.SendInvoiceWithPdfAsync(new InvoiceEmailData
                        {
                            ToEmail = parentEmail,
                            StudentName = first.StudentName ?? "",
                            ParentName = first.ParentName ?? first.StudentName ?? "",
                            InvoiceNumber = invoiceNumber,
                            MonthYear = $"{now:MMMM yyyy}",
                            TotalAmount = totalInvoiceAmount.Value,
                            PaymentUrl = paymentUrl,         // ← Stripe link → "Pay Now" button in email
                            Grade = first.Grade ?? "",
                            Board = first.Board ?? "",
                            DueDate = now.AddDays(5),
                            LineItems = queryResults.Select(x => new TCT.LMS.Infrastructure.Common.InvoiceLineItem
                            {
                                Subject = x.Subject ?? "",
                                TutorName = x.TutorName ?? "N/A",
                                NumberOfClasses = x.NumberOfClasses ?? 0,
                                ParentPayment = x.ParentPayment ?? 0,
                                TotalAmount = x.TotalInvoiceAmount ?? 0,
                                StartDate = now.ToString("dd-MMM-yyyy"),
                                PreviousMonthTotalClasses = x.PreviousMonthTotalClasses ?? 0,
                                PreviousMonthPendingClasses = x.PreviousMonthPendingClasses ?? 0,
                                PreviousMonthPeriod = new DateTime(year, month, 1).AddMonths(-1).ToString("MMMM yyyy"),
                                PreviousMonthAdjustment = Math.Max(0, (x.TotalParentPayment ?? 0) - (x.TotalInvoiceAmount ?? 0)),
                            }).ToList()
                        });
                    }
                }
                catch (Exception)
                {
                    // Non-fatal — invoice already committed, just swallow email setup errors
                }

                return invoice.InvoiceNumber;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        // ══════════════════════════════════════════════════════════════════════
        //  Prepaid v2 — Phase 2: upfront full-period invoice
        // ══════════════════════════════════════════════════════════════════════
        // Raised once when a prepaid plan is approved. Covers the WHOLE plan window
        // (all PlanMonths) as a SINGLE invoice with one line item per subject/plan.
        // Each line's amount is the agreed prepaid fee for that subject (plan.TotalFee),
        // NOT a per-month hours×rate calc — the parent pays the full plan fee upfront.
        // Re-generating returns the existing invoice (dedup via plan.UpfrontInvoiceNumber).
        public async Task<string> CreatePrepaidUpfrontInvoiceAsync(Guid studentId, Guid createdBy)
        {
            using var transaction = await _dbContext.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
            var plans = await _dbContext.StudentPaymentPlan
                .Where(p => p.StudentId == studentId && p.IsActive)
                .ToListAsync();
            if (plans.Count == 0)
                throw new InvalidOperationException("No active prepaid plan found for this student.");

            // Do not rebill previously invoiced subjects when another subject is added.
            var invoiceNumbers = plans.Where(p => !string.IsNullOrWhiteSpace(p.UpfrontInvoiceNumber))
                .Select(p => p.UpfrontInvoiceNumber).ToList();
            var activeNumbers = await _dbContext.StudentInvoice
                .Where(i => i.IsActive && invoiceNumbers.Contains(i.InvoiceNumber))
                .Select(i => i.InvoiceNumber).ToListAsync();
            if (plans.Any(p => !string.IsNullOrWhiteSpace(p.UpfrontInvoiceNumber) && !activeNumbers.Contains(p.UpfrontInvoiceNumber)))
                throw new InvalidOperationException("An existing upfront invoice is inactive. Accounts must reconcile it before issuing a replacement.");
            var uninvoicedPlans = plans.Where(p => string.IsNullOrWhiteSpace(p.UpfrontInvoiceNumber)).ToList();
            if (uninvoicedPlans.Count == 0) return activeNumbers.First();
            plans = uninvoicedPlans;

            // Validate every pending plan before creating any invoice or external payment link.
            var pendingEnrollmentIds = plans.Select(p => p.SalesDetailsId).ToList();
            var recurringSources = await _dbContext.Schedule.AsNoTracking()
                .Where(s => pendingEnrollmentIds.Contains(s.SalesDetailsId) && s.IsActive && s.ScheduleMode == "Weekly" && s.NoOfMonths > 1)
                .OrderBy(s => s.StartDate).ThenBy(s => s.CreatedDate).ToListAsync();
            foreach (var pending in plans)
            {
                var source = recurringSources.FirstOrDefault(s => s.SalesDetailsId == pending.SalesDetailsId);
                if (source == null) continue;
                TCT.LMS.Application.Services.PackageBillingGuard.RequireScheduledAgreement(
                    source.NoOfMonths.Value, source.StartDate, pending.PlanMonths,
                    pending.StartMonth, pending.StartYear, pending.TotalClasses);
                var alreadyBilled = await (from detail in _dbContext.StudentInvoiceDetails
                    join invoice in _dbContext.StudentInvoice on detail.StudentInvoiceId equals invoice.Id
                    join schedule in _dbContext.Schedule on detail.ScheduleId equals schedule.ScheduleId
                    where schedule.SalesDetailsId == pending.SalesDetailsId && detail.IsActive && invoice.IsActive
                    select invoice.Id).AnyAsync();
                if (alreadyBilled)
                    throw new InvalidOperationException("Invoices already exist for this enrollment. Accounts must review them before issuing a full-period package invoice; no existing invoice was changed.");
            }

            // Student / parent identity (shared across all line items).
            var identity = await (
                from st in _dbContext.Student
                join us in _dbContext.User on st.UserId equals us.Id
                where st.Id == studentId
                select new { us.Id, StudentName = us.FirstName + " " + us.LastName, st.ParentName, us.Email }
            ).FirstOrDefaultAsync();
            if (identity == null)
                throw new InvalidOperationException("Student not found.");

            try
            {
                var now = DateTime.Now;
                var details = new List<StudentInvoiceDetails>();
                decimal totalAmount = 0m;
                Guid anchorScheduleId = Guid.Empty;

                foreach (var plan in plans)
                {
                    var planStart = new DateTime(plan.StartYear, plan.StartMonth, 1);
                    var planEnd = planStart.AddMonths(plan.PlanMonths).AddDays(-1);

                    var info = await (
                        from sh in _dbContext.Schedule
                        join sd in _dbContext.SalesDetails on sh.SalesDetailsId equals sd.Id
                        join ss in _dbContext.Sales on sd.SalesId equals ss.Id
                        join cs in _dbContext.Type_Code on sd.SubjectId equals cs.Id
                        join cg in _dbContext.Type_Code on ss.GradeId equals cg.Id
                        join cb in _dbContext.Type_Code on ss.BoardId equals cb.Id
                        where sh.SalesDetailsId == plan.SalesDetailsId && sh.IsActive
                        select new
                        {
                            sh.ScheduleId,
                            sh.TutorId,
                            Subject = cs.TypeCodeName,
                            Grade = cg.TypeCodeName,
                            Board = cb.TypeCodeName,
                            sd.ParentPayment
                        }
                    ).FirstOrDefaultAsync();
                    if (info == null) throw new InvalidOperationException("Every prepaid subject must have a schedule before upfront invoicing.");

                    // Total scheduled classes across the whole plan window (snapshot wins if set).
                    var totalClasses = plan.TotalClasses ?? await (
                        from sh in _dbContext.Schedule
                        join sdd in _dbContext.ScheduleDetails on sh.ScheduleId equals sdd.ScheduleId
                        where sh.SalesDetailsId == plan.SalesDetailsId
                            && sh.IsActive && sdd.IsActive
                            && sdd.ScheduleType == "Class"
                            && sdd.Date >= planStart && sdd.Date <= planEnd
                        select sdd.ScheduleDetailsId
                    ).CountAsync();

                    if (totalClasses <= 0) throw new InvalidOperationException("The package must include at least one class before invoicing.");
                    plan.TotalClasses = totalClasses; // Freeze the entitlement; later scheduling must not increase it.
                    if (anchorScheduleId == Guid.Empty) anchorScheduleId = info.ScheduleId;

                    details.Add(new StudentInvoiceDetails
                    {
                        UserId = identity.Id,
                        ScheduleId = info.ScheduleId,
                        StudentId = studentId,
                        StudentName = identity.StudentName,
                        ParentName = identity.ParentName,
                        TutorId = info.TutorId,
                        TutorName = "",
                        Grade = info.Grade,
                        Board = info.Board,
                        Subject = info.Subject,
                        Year = plan.StartYear,
                        Month = plan.StartMonth,
                        ParentPayment = info.ParentPayment,
                        NumberOfClasses = totalClasses,
                        ScheduleType = "Class",
                        SubjectAmount = plan.TotalFee,   // full prepaid fee for this subject
                        IsActive = true,
                        CreatedBy = createdBy,
                        CreatedDate = DateTime.UtcNow
                    });
                    totalAmount += plan.TotalFee;
                }

                if (details.Count == 0)
                    throw new InvalidOperationException("No schedule found for the student's prepaid plan(s).");

                var anchorStart = plans.Select(p => new DateTime(p.StartYear, p.StartMonth, 1)).Min();
                var invoiceNumber = $"INV-{now:yyyyMMdd-HHmmss}-{studentId.ToString().Substring(0, 8).ToUpper()}";

                // ── Stripe payment link (non-fatal) ──────────────────────────
                string paymentUrl = null;
                try
                {
                    var secretKey = _configuration["Stripe:SecretKey"];
                    if (!string.IsNullOrEmpty(secretKey))
                    {
                        StripeConfiguration.ApiKey = secretKey;
                        var price = await new PriceService().CreateAsync(new PriceCreateOptions
                        {
                            Currency = "inr",
                            UnitAmount = (long)(totalAmount * 100),
                            ProductData = new PriceProductDataOptions
                            {
                                Name = $"{identity.StudentName} — Prepaid Tuition ({anchorStart:MMM yyyy})",
                            },
                        });
                        var link = await new PaymentLinkService().CreateAsync(new PaymentLinkCreateOptions
                        {
                            LineItems = new List<PaymentLinkLineItemOptions>
                            {
                                new PaymentLinkLineItemOptions { Price = price.Id, Quantity = 1 }
                            },
                            Metadata = new Dictionary<string, string>
                            {
                                { "invoice_number", invoiceNumber },
                                { "student_id",     studentId.ToString() },
                                { "student_name",   identity.StudentName ?? "" },
                                { "invoice_type",   "prepaid-upfront" }
                            }
                        });
                        paymentUrl = link.Url;
                    }
                }
                catch (Exception) { /* non-fatal */ }

                var invoice = new StudentInvoice
                {
                    InvoiceNumber = invoiceNumber,
                    StudentId = studentId,
                    ScheduleId = anchorScheduleId,
                    TotalInvoiceAmount = totalAmount,
                    Month = anchorStart.Month,
                    Year = anchorStart.Year,
                    IsActive = true,
                    CreatedBy = createdBy,
                    StartDate = now,
                    DueDate = now.AddDays(5),
                    CreatedDate = now,
                    PaymentUrl = paymentUrl,
                    InvoiceType = "Upfront",
                };
                _dbContext.Set<StudentInvoice>().Add(invoice);
                await _dbContext.SaveChangesAsync();

                foreach (var d in details)
                {
                    d.StudentInvoiceId = invoice.Id;
                    _dbContext.Set<StudentInvoiceDetails>().Add(d);
                }
                await _dbContext.SaveChangesAsync();

                // Link the invoice number back to every plan it covers (dedup + reference).
                foreach (var plan in plans)
                {
                    plan.UpfrontInvoiceNumber = invoiceNumber;
                    plan.ModifiedBy = createdBy;
                    plan.ModifiedDate = now;
                }
                await _dbContext.SaveChangesAsync();

                await transaction.CommitAsync();

                // ── Invoice email with PDF (non-fatal, fire-and-forget) ──────
                try
                {
                    if (!string.IsNullOrEmpty(identity.Email))
                    {
                        _ = _emailService.SendInvoiceWithPdfAsync(new InvoiceEmailData
                        {
                            ToEmail = identity.Email,
                            StudentName = identity.StudentName ?? "",
                            ParentName = identity.ParentName ?? identity.StudentName ?? "",
                            InvoiceNumber = invoiceNumber,
                            MonthYear = $"{anchorStart:MMMM yyyy} (Prepaid full term)",
                            TotalAmount = totalAmount,
                            PaymentUrl = paymentUrl,
                            Grade = details.First().Grade ?? "",
                            Board = details.First().Board ?? "",
                            DueDate = now.AddDays(5),
                            LineItems = details.Select(d => new TCT.LMS.Infrastructure.Common.InvoiceLineItem
                            {
                                Subject = d.Subject ?? "",
                                TutorName = d.TutorName ?? "N/A",
                                NumberOfClasses = d.NumberOfClasses,
                                ParentPayment = d.ParentPayment,
                                TotalAmount = d.SubjectAmount ?? 0,
                                StartDate = now.ToString("dd-MMM-yyyy"),
                            }).ToList()
                        });
                    }
                }
                catch (Exception) { /* non-fatal */ }

                return invoiceNumber;
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        // ══════════════════════════════════════════════════════════════════════
        //  Prepaid v2 — Phase 3: monthly statement invoice
        // ══════════════════════════════════════════════════════════════════════
        // Informational statement for a prepaid student for one month. NOT a charge
        // (TotalInvoiceAmount = 0) — the parent already paid upfront. One line per subject.
        // The month's figures (scheduled / prev-cancelled / completed / pending / paid /
        // pending-amount) are computed live at view time in ApplyStatementMetricsAsync.
        // Idempotent per student+month+year.


        //public async Task<string> CreateInvoiceWithDetailsAsync(Guid studentId, int month, int year, Guid createdBy)
        //{
        //    using var transaction = await _dbContext.Database.BeginTransactionAsync();

        //    try
        //    {
        //        // Get data from your query
        //        var queryResults = await GetInvoiceDataAsync(studentId, month, year);

        //        if (!queryResults.Any())
        //            throw new InvalidOperationException("No data found for the specified parameters.");

        //        // Calculate total invoice amount
        //        var totalInvoiceAmount = queryResults.Sum(x => x.TotalInvoiceAmount);

        //        // Generate invoice number  
        //        var now = DateTime.Now;
        //        var invoiceNumber = $"INV-{now:yyyyMMdd-HHmmss}-{studentId.ToString().Substring(0, 8).ToUpper()}";

        //        // Create StudentInvoice record
        //        var invoice = new StudentInvoice
        //        {
        //            InvoiceNumber = invoiceNumber,
        //            StudentId = studentId,
        //            ScheduleId = queryResults.First().ScheduleId.Value,
        //            TotalInvoiceAmount = totalInvoiceAmount.Value,
        //            Month = month,
        //            Year = year,
        //            IsActive = true,
        //            CreatedBy = createdBy,
        //            StartDate = now,
        //            DueDate = now.AddDays(5),
        //            CreatedDate = now,
        //        };

        //        _dbContext.Set<StudentInvoice>().Add(invoice);
        //        await _dbContext.SaveChangesAsync();

        //        // Create StudentInvoiceDetails records
        //        foreach (var data in queryResults)
        //        {
        //            var detail = new StudentInvoiceDetails
        //            {
        //                StudentInvoiceId = invoice.Id,
        //                UserId = data.UserId.Value,
        //                ScheduleId = data.ScheduleId.Value,
        //                StudentId = data.StudentId.Value,
        //                StudentName = data.StudentName,
        //                ParentName = data.ParentName,
        //                TutorId = data.TutorId.Value,
        //                TutorName = data.TutorName,
        //                Grade = data.Grade,
        //                Board = data.Board,
        //                Subject = data.Subject,
        //                Year = data.Year.Value,
        //                Month = data.Month.Value,
        //                ParentPayment = data.ParentPayment.Value,
        //                NumberOfClasses = data.NumberOfClasses.Value,
        //                PreviousMonthTotalClasses = data.PreviousMonthTotalClasses,
        //                PreviousMonthPendingClasses = data.PreviousMonthPendingClasses,
        //                PreviousMonthPendingClassesMonthYear = data.PreviousMonthPendingClassesMonthYear,
        //                ScheduleType = data.ScheduleType,
        //                IsActive = true,
        //                CreatedBy = createdBy,
        //                CreatedDate = DateTime.UtcNow
        //            };

        //            _dbContext.Set<StudentInvoiceDetails>().Add(detail);
        //        }

        //        await _dbContext.SaveChangesAsync();
        //        await transaction.CommitAsync();

        //        return invoice.InvoiceNumber;
        //    }
        //    catch (Exception ex)
        //    {
        //        await transaction.RollbackAsync();
        //        throw;
        //    }
        //}

        public async Task<Response<List<StudentInvoiceViewModel>>> GetStudentInvoiceDetailsByNumberAsync(string invoiceNumber)
        {
            var response = new Response<List<StudentInvoiceViewModel>>();

            try
            {
                // One row per saved invoice detail. The detail's ScheduleId lives on the
                // StudentInvoiceDetails row (sit) - join Schedule from there (not from the
                // invoice header) so multi-schedule invoices retain every billed line.
                var results = await (from si in _dbContext.StudentInvoice
                                     join sit in _dbContext.StudentInvoiceDetails on si.Id equals sit.StudentInvoiceId
                                     join sh in _dbContext.Schedule on sit.ScheduleId equals sh.ScheduleId
                                     join sad in _dbContext.SalesDetails on sh.SalesDetailsId equals sad.Id
                                     join sa in _dbContext.Sales on sad.SalesId equals sa.Id
                                     join tbd in _dbContext.TCTBankDetails on sa.TCTBankId equals tbd.Id into tctBankJoin
                                     from tbd in tctBankJoin.DefaultIfEmpty()
                                     join td in _dbContext.TCTDetails on tbd.TCTId equals td.Id into tctDetailsJoin
                                     from td in tctDetailsJoin.DefaultIfEmpty()
                                     join ad in _dbContext.Address on sit.UserId equals ad.UserId into addressJoin
                                     from ad in addressJoin.DefaultIfEmpty()
                                     where si.InvoiceNumber == invoiceNumber
                                     select new StudentInvoiceViewModel
                                     {
                                         InvoiceNumber = si.InvoiceNumber ?? "",
                                         InvoiceDetailId = sit.Id,
                                         TotalInvoiceAmount = si.TotalInvoiceAmount,
                                         Month = si.Month,
                                         Year = si.Year,
                                         StartDate = si.StartDate,
                                         DueDate = si.DueDate,
                                         StudentName = sit.StudentName ?? "",
                                         ParentName = sit.ParentName ?? "",
                                         TutorName = sit.TutorName ?? "",
                                         Grade = sit.Grade ?? "",
                                         Board = sit.Board ?? "",
                                         Subject = sit.Subject ?? "",
                                         ParentPayment = sit.ParentPayment,
                                         NumberOfClasses = sit.NumberOfClasses,
                                         PreviousMonthTotalClasses = sit.PreviousMonthTotalClasses,
                                         PreviousMonthPendingClasses = sit.PreviousMonthPendingClasses,
                                         PreviousMonthPendingClassesMonthYear = sit.PreviousMonthPendingClassesMonthYear ?? "",
                                         ScheduleType = sit.ScheduleType ?? "",
                                         SubjectAmount = sit.SubjectAmount,
                                         SalesDetailsId = sad.Id,
                                         AccountName = tbd.AccountName ?? "",
                                         AccountNumber = tbd.AccountNumber ?? "",
                                         AccountType = tbd.AccountType ?? "",
                                         IFSCCode = tbd.IFSCCode ?? "",
                                         BankName = tbd.BankName ?? "",
                                         BranchName = tbd.BranchName ?? "",
                                         UpiID = tbd.UpiID ?? "",
                                         SwiftCode = tbd.SwiftCode ?? "",
                                         IBANNumber = tbd.IBANNumber ?? "",
                                         Title = td.Title ?? "",
                                         Address1 = td.Address1 ?? "",
                                         Address2 = td.Address2 ?? "",
                                         City = td.City ?? "",
                                         Zip = td.Zip ?? "",
                                         State = td.State ?? "",
                                         Country = td.Country ?? "",
                                         Email = td.Email ?? "",
                                         Phone = td.Phone ?? "",
                                         GSTIN = td.GSTIN ?? "",
                                         PAN = td.PAN ?? "",
                                         Location = ad.Country ?? "",
                                         MonthName = CultureInfo.CurrentCulture.DateTimeFormat.GetMonthName(si.Month),
                                         PaymentUrl = si.PaymentUrl,
                                         InvoiceType = si.InvoiceType,
                                     })
                                    .Distinct()
                                    .ToListAsync();

                // Enrich each subject row with its prepaid-plan picture (Scenario 1).
                // Left as IsPrepaid=false when the subject has no active plan (Scenario 2).
                foreach (var result in results)
                {
                    if (result.TotalInvoiceAmount.HasValue)
                        result.AmountInWords = await GetAmountInWordsAsync(result.TotalInvoiceAmount.Value);

                    await ApplyPaymentPlanToInvoiceRowAsync(result);

                    // A monthly statement row also carries the consumption figures.
                    if (result.InvoiceType == "Statement")
                        await ApplyStatementMetricsAsync(result);
                }

                response.Data = results;
                response.Succeeded = true;
                response.Message = "Invoice retrieved successfully.";
            }
            catch (Exception ex)
            {
                response.Succeeded = false;
                response.Message = $"An error occurred: {ex.Message}";
            }

            return response;
        }
        public async Task<StudentScheduleSummaryResponseDto> GetStudentScheduleSummaryAsync(Guid userId)
        {
            var result = new StudentScheduleSummaryResponseDto
            {
                SubjectSummaries = new List<StudentScheduleSubjectSummaryDto>(),
                ShowLearningExperienceFeedback = false
            };

            var conn = _dbContext.Database.GetDbConnection();

            // Do NOT "await using (conn)" – let EF manage the connection
            var shouldClose = false;
            if (conn.State != ConnectionState.Open)
            {
                await conn.OpenAsync();
                shouldClose = true;
            }


            try
            {
                await using var command = conn.CreateCommand();
                command.CommandText = "dbo.GetStudentScheduleSummary";
                command.CommandType = CommandType.StoredProcedure;

                var param = command.CreateParameter();
                param.ParameterName = "@UserId";
                param.Value = userId;
                param.DbType = DbType.Guid;
                command.Parameters.Add(param);

                await using var reader = await command.ExecuteReaderAsync();

                if (!reader.HasRows)
                    return result;

                // Get ordinals once
                var ordSalesDetailsId = reader.GetOrdinal("SalesDetailsId");
                var ordSubjectName = reader.GetOrdinal("SubjectName");
                var ordCurrentMonthScheduled = reader.GetOrdinal("CurrentMonthScheduledClasses");
                var ordCurrentMonthCompleted = reader.GetOrdinal("CurrentMonthCompletedClasses");
                var ordCurrentMonthUpcoming = reader.GetOrdinal("CurrentMonthUpcomingClasses");
                var ordTotalScheduled = reader.GetOrdinal("TotalScheduledClasses");
                var ordCompleted = reader.GetOrdinal("CompletedClasses");
                var ordUpcoming = reader.GetOrdinal("UpcomingClasses");
                var ordAttendanceCount = reader.GetOrdinal("StudentAttendanceCount");
                var ordAttendancePct = reader.GetOrdinal("StudentAttendancePercentage");
                var ordCancelledByStudent = reader.GetOrdinal("CancelledClassesByStudent");
                var ordCancelledByStudentPct = reader.GetOrdinal("CancelledByStudentPercentage");
                var ordFirstScheduleDate = reader.GetOrdinal("FirstScheduleDate");
                var ordLastScheduleDate = reader.GetOrdinal("LastScheduleDate");
                var ordCompletionPct = reader.GetOrdinal("CompletionPercentage");
                var ordShowFeedback = reader.GetOrdinal("ShowLearningExperienceFeedback");

                while (await reader.ReadAsync())
                {
                    var salesDetailsId = reader.IsDBNull(ordSalesDetailsId)
                        ? Guid.Empty
                        : reader.GetGuid(ordSalesDetailsId);

                    var subjectName = reader.IsDBNull(ordSubjectName)
                        ? null
                        : reader.GetString(ordSubjectName);

                    var summary = new StudentScheduleSubjectSummaryDto
                    {
                        SalesDetailsId = salesDetailsId,
                        SubjectName = subjectName,
                        CurrentMonthScheduledClasses = reader.IsDBNull(ordCurrentMonthScheduled) ? 0 : reader.GetInt32(ordCurrentMonthScheduled),
                        CurrentMonthCompletedClasses = reader.IsDBNull(ordCurrentMonthCompleted) ? 0 : reader.GetInt32(ordCurrentMonthCompleted),
                        CurrentMonthUpcomingClasses = reader.IsDBNull(ordCurrentMonthUpcoming) ? 0 : reader.GetInt32(ordCurrentMonthUpcoming),
                        TotalScheduledClasses = reader.IsDBNull(ordTotalScheduled) ? 0 : reader.GetInt32(ordTotalScheduled),
                        CompletedClasses = reader.IsDBNull(ordCompleted) ? 0 : reader.GetInt32(ordCompleted),
                        UpcomingClasses = reader.IsDBNull(ordUpcoming) ? 0 : reader.GetInt32(ordUpcoming),
                        StudentAttendanceCount = reader.IsDBNull(ordAttendanceCount) ? 0 : reader.GetInt32(ordAttendanceCount),
                        StudentAttendancePercentage = reader.IsDBNull(ordAttendancePct) ? 0 : reader.GetDecimal(ordAttendancePct),
                        CancelledClassesByStudent = reader.IsDBNull(ordCancelledByStudent) ? 0 : reader.GetInt32(ordCancelledByStudent),
                        CancelledByStudentPercentage = reader.IsDBNull(ordCancelledByStudentPct) ? 0 : reader.GetDecimal(ordCancelledByStudentPct),
                        FirstScheduleDate = reader.IsDBNull(ordFirstScheduleDate) ? (DateTime?)null : reader.GetDateTime(ordFirstScheduleDate),
                        LastScheduleDate = reader.IsDBNull(ordLastScheduleDate) ? (DateTime?)null : reader.GetDateTime(ordLastScheduleDate),
                        CompletionPercentage = reader.IsDBNull(ordCompletionPct) ? 0 : reader.GetDecimal(ordCompletionPct)
                    };

                    // Set the feedback flag if any row says "Yes"
                    if (!reader.IsDBNull(ordShowFeedback) &&
                        reader.GetString(ordShowFeedback) == "Yes")
                    {
                        result.ShowLearningExperienceFeedback = true;
                    }

                    // Overall row: no SalesDetailsId (Guid.Empty)
                    if (salesDetailsId == Guid.Empty)
                    {
                        result.OverallSummary = new StudentScheduleOverallSummaryDto
                        {
                            ScheduledClassesForCurrentMonth = summary.CurrentMonthScheduledClasses,
                            CompletedClassesForCurrentMonth = summary.CurrentMonthCompletedClasses,
                            UpcomingClassesForCurrentMonth = summary.CurrentMonthUpcomingClasses,
                            TotalClassesScheduled = summary.TotalScheduledClasses,
                            TotalCompletedClasses = summary.CompletedClasses,
                            TotalUpcomingClasses = summary.UpcomingClasses,
                            TotalStudentAttendanceCount = summary.StudentAttendanceCount,
                            OverallStudentAttendancePercentage = summary.StudentAttendancePercentage,
                            TotalCancelledClassesByStudent = summary.CancelledClassesByStudent,
                            OverrallCancelledByStudentPercentage = summary.CancelledByStudentPercentage,
                            OverallCompletionPercentage = summary.CompletionPercentage
                        };
                    }
                    else
                    {
                        result.SubjectSummaries.Add(summary);
                    }
                }

                // Only show feedback after the student's first regular class (not a demo)
                // has actually been completed. Account activation or enrollment alone must
                // never make the feedback form eligible.
                if (result.ShowLearningExperienceFeedback)
                {
                    // ClassCompleted TypeCodeValue = 20020
                    var firstCompletedClassDate = await (
                        from sd in _dbContext.ScheduleDetails
                        join s in _dbContext.Schedule on sd.ScheduleId equals s.ScheduleId
                        join st in _dbContext.Student on s.StudentId equals st.Id
                        join tc in _dbContext.Type_Code on sd.StudentScheduleStatus equals tc.Id
                        where st.UserId == userId && sd.ScheduleType == "Class" && tc.TypeCodeValue == 20020
                        select (DateTime?)sd.Date
                    ).MinAsync();

                    result.ShowLearningExperienceFeedback = firstCompletedClassDate.HasValue &&
                        DateTime.UtcNow.Date >= firstCompletedClassDate.Value.Date;
                }
            }
            finally
            {
                if (shouldClose && conn.State == ConnectionState.Open)
                    await conn.CloseAsync();
            }

            return result;
        }


        //public async Task<StudentScheduleSummaryResponseDto> GetStudentScheduleSummaryAsync(Guid userId)
        //{
        //    var result = new StudentScheduleSummaryResponseDto
        //    {
        //        SubjectSummaries = new List<StudentScheduleSubjectSummaryDto>(),
        //        ShowLearningExperienceFeedback = false,
        //    };

        //    var conn = _dbContext.Database.GetDbConnection();

        //    await using (conn)
        //    {
        //        if (conn.State != ConnectionState.Open)
        //            await conn.OpenAsync();

        //        using (var command = conn.CreateCommand())
        //        {
        //            command.CommandText = "GetStudentScheduleSummary";
        //            command.CommandType = CommandType.StoredProcedure;

        //            var param = command.CreateParameter();
        //            param.ParameterName = "@UserId";
        //            param.Value = userId;
        //            param.DbType = DbType.Guid;
        //            command.Parameters.Add(param);

        //            using (var reader = await command.ExecuteReaderAsync())
        //            {
        //                // First Result Set: Per-Subject Summary
        //                while (await reader.ReadAsync())
        //                {
        //                    result.SubjectSummaries.Add(new StudentScheduleSubjectSummaryDto
        //                    {
        //                        SalesDetailsId = reader.IsDBNull(0) ? Guid.Empty : reader.GetGuid(0),
        //                        SubjectName = reader.IsDBNull(1) ? null : reader.GetString(1),
        //                        CurrentMonthScheduledClasses = reader.IsDBNull(2) ? 0 : reader.GetInt32(2),
        //                        CurrentMonthCompletedClasses = reader.IsDBNull(3) ? 0 : reader.GetInt32(3),
        //                        CurrentMonthUpcomingClasses = reader.IsDBNull(4) ? 0 : reader.GetInt32(4),
        //                        TotalScheduledClasses = reader.IsDBNull(5) ? 0 : reader.GetInt32(5),
        //                        CompletedClasses = reader.IsDBNull(6) ? 0 : reader.GetInt32(6),
        //                        UpcomingClasses = reader.IsDBNull(7) ? 0 : reader.GetInt32(7),
        //                        StudentAttendanceCount = reader.IsDBNull(8) ? 0 : reader.GetInt32(8),
        //                        StudentAttendancePercentage = reader.IsDBNull(9) ? 0 : reader.GetDecimal(9),
        //                        CancelledClassesByStudent = reader.IsDBNull(10) ? 0 : reader.GetInt32(10),
        //                        CancelledByStudentPercentage = reader.IsDBNull(11) ? 0 : reader.GetDecimal(11),
        //                        FirstScheduleDate = reader.IsDBNull(12) ? null : reader.GetDateTime(12),
        //                        LastScheduleDate = reader.IsDBNull(13) ? null : reader.GetDateTime(13),
        //                        CompletionPercentage = reader.IsDBNull(14) ? 0 : reader.GetDecimal(14),                                
        //                    });
        //                    //result.ShowLearningExperienceFeedback = reader.IsDBNull("ShowLearningExperienceFeedback") ? false : reader.GetString("ShowLearningExperienceFeedback") == "Yes" ? true : false;  
        //                    int showFeedbackOrdinal = reader.GetOrdinal("ShowLearningExperienceFeedback");

        //                    result.ShowLearningExperienceFeedback =
        //                        !reader.IsDBNull(showFeedbackOrdinal) &&
        //                        reader.GetString(showFeedbackOrdinal) == "Yes";

        //                }


        //                // Second Result Set: Overall Summary
        //                if (await reader.NextResultAsync() && await reader.ReadAsync())
        //                {
        //                    result.OverallSummary = new StudentScheduleOverallSummaryDto
        //                    {
        //                        ScheduledClassesForCurrentMonth = reader.IsDBNull(0) ? 0 : reader.GetInt32(0),
        //                        CompletedClassesForCurrentMonth = reader.IsDBNull(1) ? 0 : reader.GetInt32(1),
        //                        UpcomingClassesForCurrentMonth = reader.IsDBNull(2) ? 0 : reader.GetInt32(2),
        //                        TotalClassesScheduled = reader.IsDBNull(3) ? 0 : reader.GetInt32(3),
        //                        TotalCompletedClasses = reader.IsDBNull(4) ? 0 : reader.GetInt32(4),
        //                        TotalUpcomingClasses = reader.IsDBNull(5) ? 0 : reader.GetInt32(5),
        //                        TotalStudentAttendanceCount = reader.IsDBNull(6) ? 0 : reader.GetInt32(6),
        //                        OverallStudentAttendancePercentage = reader.IsDBNull(7) ? 0 : reader.GetDecimal(7),
        //                        TotalCancelledClassesByStudent = reader.IsDBNull(8) ? 0 : reader.GetInt32(8),
        //                        OverrallCancelledByStudentPercentage = reader.IsDBNull(9) ? 0 : reader.GetDecimal(9),
        //                        OverallCompletionPercentage = reader.IsDBNull(10) ? 0 : reader.GetDecimal(10)
        //                    };
        //                }

        //            }
        //        }
        //    }            
        //    return result;
        //}

        public async Task<Response<ScheduleDetailsDto>> GetScheduleDetailsById(Guid scheduleDetailsId)
        {
            Response<ScheduleDetailsDto> response = new Response<ScheduleDetailsDto>();
            response.Data = await (
                from detail in _dbContext.ScheduleDetails.AsNoTracking()
                join schedule in _dbContext.Schedule on detail.ScheduleId equals schedule.ScheduleId
                join student in _dbContext.Student on schedule.StudentId equals student.Id
                join tutor in _dbContext.Tutor on schedule.TutorId equals tutor.Id
                where detail.ScheduleDetailsId == scheduleDetailsId && detail.IsActive && schedule.IsActive
                select new ScheduleDetailsDto
                {
                    ScheduleDetailsId = detail.ScheduleDetailsId,
                    ScheduleId = detail.ScheduleId,
                    MeetingLink = detail.MeetingLink,
                    Date = detail.Date,
                    StudentUserId = student.UserId,
                    TutorUserId = tutor.UserId
                }).FirstOrDefaultAsync();
            response.Succeeded = response.Data != null;
            if (response.Data == null) response.Message = "This class is no longer available.";
            return response;
        }

        public async Task UpdateStudentInvoiceEmailSendDateAsync(string invoiceNumber)
        {
            try
            {
                var result = await _dbContext.StudentInvoice
                    .FirstOrDefaultAsync(x => x.InvoiceNumber == invoiceNumber);

                if (result != null)
                {
                    result.EmailSentDate = DateTime.Now;
                    await _dbContext.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                // Log the exception or handle it appropriately
                throw new Exception($"Failed to update email send date: {ex.Message}", ex);
            }
        }

        public async Task UpdateTutorInvoiceEmailSendDateAsync(string invoiceNumber)
        {
            try
            {
                var result = await _dbContext.TutorInvoice
                    .FirstOrDefaultAsync(x => x.InvoiceNumber == invoiceNumber);

                if (result != null)
                {
                    result.EmailSentDate = DateTime.Now;
                    await _dbContext.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                // Log the exception or handle it appropriately
                throw new Exception($"Failed to update email send date: {ex.Message}", ex);
            }
        }

        public async Task<GenerateTutorInvoiceResponseDto> GenerateTutorInvoiceAsync(GenerateTutorInvoiceRequestDto request)
        {
            // request.TutorId is User.Id; Schedule and TutorInvoice store Tutor.Id (Tutor table PK)
            var tutor = await _dbContext.Tutor.FirstOrDefaultAsync(t => t.UserId == request.TutorId);
            if (tutor == null)
                throw new InvalidOperationException("Tutor not found.");
            var tutorEntityId = tutor.Id;

            string monthName = CultureInfo.CurrentCulture.DateTimeFormat.GetMonthName(request.InputMonth);
            bool invoiceExists = await _dbContext.TutorInvoice.AnyAsync(ti =>
                ti.TutorId == tutorEntityId &&
                ti.Year == request.InputYear &&
                ti.IsActive &&
                (ti.Month == monthName ||
                 ti.Month == request.InputMonth.ToString() ||
                 ti.Month == request.InputMonth.ToString("D2")));

            if (invoiceExists)
                throw new InvalidOperationException($"A pay slip for {monthName} {request.InputYear} has already been generated for this tutor.");

            var connection = _dbContext.Database.GetDbConnection();

            try
            {
                if (connection.State != ConnectionState.Open)
                {
                    await connection.OpenAsync();
                }

                using var command = connection.CreateCommand();
                command.CommandText = "usp_GenerateTutorInvoice";
                command.CommandType = CommandType.StoredProcedure;

                var parameters = new[]
                {
            new SqlParameter("@InputYear", request.InputYear),
            new SqlParameter("@InputMonth", request.InputMonth),
            new SqlParameter("@TutorId", tutorEntityId),
            new SqlParameter("@CreatedBy", request.CreatedBy)
        };
                command.Parameters.AddRange(parameters);

                using var reader = await command.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    var result = new GenerateTutorInvoiceResponseDto
                    {
                        InvoiceId = reader.GetInt64(reader.GetOrdinal("InvoiceId")),
                        TotalPayment = reader.GetDecimal(reader.GetOrdinal("TotalPayment")),
                        InvoiceNumber = reader.GetString(reader.GetOrdinal("InvoiceNumber"))
                    };
                    return result;
                }
            }
            finally
            {
                if (connection.State == ConnectionState.Open)
                {
                    await connection.CloseAsync();
                }
            }

            throw new Exception("No invoice generated. The procedure may have raised an error.");
        }

        public async Task<List<TutorEngagementDto>> GetTutorEngagmentInfo(Guid tutorId)
        {
            List<TutorEngagementDto> response = new List<TutorEngagementDto>();
            try
            {
                var now = DateTime.Now;

                var rawEngagements = await (
                    from t in _dbContext.Tutor
                    join u in _dbContext.User on t.UserId equals u.Id
                    join s in _dbContext.Schedule on u.Id equals s.TutorId
                    join sd in _dbContext.ScheduleDetails on s.ScheduleId equals sd.ScheduleId
                    where s.IsActive && sd.IsActive && u.Id == tutorId
                    join ts in _dbContext.Type_Code on sd.TutorScheduleStatus equals ts.Id into tsJoin
                    from ts in tsJoin.DefaultIfEmpty()

                    group new { u.FullName, t.Id, sd.Date, ts.TypeCodeValue, sd.ScheduleDetailsId } by new
                    {
                        u.FullName,
                        TutorId = t.Id,
                        Year = sd.Date.Year,
                        Month = sd.Date.Month
                    } into g

                    select new
                    {
                        g.Key.FullName,
                        g.Key.TutorId,
                        g.Key.Year,
                        g.Key.Month,
                        SessionCount = g.Select(x => x.ScheduleDetailsId).Distinct().Count(),
                        CompletedSessions = g.Count(x => x.TypeCodeValue == (int)FollowUpStatus.ClassCompleted),
                        CancelledSessions = g.Count(x => x.TypeCodeValue == (int)FollowUpStatus.ClassCanceled),
                        RescheduledSessions = g.Count(x => x.TypeCodeValue == (int)FollowUpStatus.ClassReScheduled),
                        RemainingSessions = g.Count(x => x.TypeCodeValue == (int)FollowUpStatus.Schedule)
                    }
                ).ToListAsync();


                var finalResult = rawEngagements
                    .Select(e => new TutorEngagementDto
                    {
                        FullName = e.FullName,
                        TutorId = e.TutorId,
                        MonthYear = $"{e.Year}-{e.Month:D2}",
                        SessionCount = e.SessionCount,
                        CompletedSessions = e.CompletedSessions,
                        CancelledSessions = e.CancelledSessions,
                        RescheduledSessions = e.RescheduledSessions,
                        RemainingSessions = e.RemainingSessions,
                        IsCurrentMonth = e.Year == now.Year && e.Month == now.Month,
                        EngagementLevel = e.SessionCount >= 8
                            ? "High Engagement"
                            : e.SessionCount >= 1
                                ? "Low Engagement"
                                : "No Engagement"
                    })
                    .OrderByDescending(e => e.MonthYear)
                    .ThenBy(e => e.TutorId)
                    .ToList();
                response = finalResult;
            }
            catch (Exception ex)
            {
                throw ex;
            }
            return response;
        }

        public async Task<TutorDashboardInfoDto> GetTutorDashboardInfo(Guid _tutorId)
        {
            TutorDashboardInfoDto output = new TutorDashboardInfoDto();
            var tutorId = _tutorId;

            var today = DateTime.Today;
            var startDate = new DateTime(today.Year, today.Month, 1);
            var endDate = new DateTime(today.Year, today.Month, 1).AddMonths(2).AddDays(-1); // End of next month
            double engagementThreshold = 60; // 60%

            // Available Hours (Assuming 8 weeks considered)
            var availableHoursQuery = await _dbContext.UserAvailability
                .Where(ua => ua.IsActive && ua.IsRecurring && ua.UserId == tutorId)
                .GroupBy(ua => ua.UserId)
                .Select(g => new
                {
                    UserId = g.Key,
                    TotalAvailableHours = g.Sum(x => EF.Functions.DateDiffMinute(x.StartTime, x.EndTime)) / 60.0 * 8
                })
                .FirstOrDefaultAsync();

            // Occupied (Scheduled) Hours
            var occupiedHoursQuery = await (
                from scd in _dbContext.ScheduleDetails
                join s in _dbContext.Schedule on scd.ScheduleId equals s.ScheduleId
                join sd in _dbContext.SalesDetails on s.SalesDetailsId equals sd.Id
                where sd.TutorId == tutorId && scd.Date >= startDate && scd.Date <= endDate
                group scd by sd.TutorId into g
                select new
                {
                    UserId = g.Key,
                    TotalOccupiedHours = g.Sum(x => EF.Functions.DateDiffMinute(x.StartTime, x.EndTime)) / 60.0
                }
            ).FirstOrDefaultAsync();

            // Combine and compute engagement
            if (availableHoursQuery != null)
            {
                var totalAvailable = availableHoursQuery.TotalAvailableHours;
                var totalOccupied = occupiedHoursQuery?.TotalOccupiedHours ?? 0;
                var engagementRate = totalAvailable > 0 ? (totalOccupied / totalAvailable) : 0;
                var engagementRatePercent = Math.Round(engagementRate * 100, 2);

                var result = new EngagementRatio()
                {
                    TotalAvailableHours = totalAvailable,
                    TotalOccupiedHours = totalOccupied,
                    EngagementRatePercent = engagementRatePercent,
                    EngagementStatus = engagementRate >= engagementThreshold ? "High Engagement" : "Low/Medium Engagement"
                };
                output.Engagement = result;
            }
            //Overall dropout students
            var overallDropoutStudents = await (
                    from s in _dbContext.Sales
                    join sd in _dbContext.SalesDetails on s.Id equals sd.SalesId
                    where sd.TutorId == tutorId
                    select s.StudentId
                ).Distinct().CountAsync();

            //Dropout student due to tutor issues
            var totalDropoutStudents1 = await (
                   from tsa in _dbContext.TutorStudentAllocations
                   join t in _dbContext.Tutor on tsa.TutorId equals t.Id
                   join n in _dbContext.TCTNotes on tsa.Id equals n.ReferenceId
                   join tc in _dbContext.Type_Code on n.ReferenceTypeId equals tc.Id
                   where
                         t.UserId == tutorId &&
                         new[] { 90012, 90002, 90003, 90004, 90005, 90006, 90001, 90009, 90014 }.Contains(tc.TypeCodeValue)
                   select tsa.StudentId
               ).Distinct().CountAsync();

            //Total active student for the tutor
            var totalActiveStudents = await (
                    from s in _dbContext.Sales
                    join sd in _dbContext.SalesDetails on s.Id equals sd.SalesId
                    where s.IsActive && sd.IsActive && sd.TutorId == tutorId
                    select s.StudentId
                ).Distinct().CountAsync();

            //Total Allocated by TCT for the tutor
            var totalAllocatedByTCT = await (
                    from s in _dbContext.Sales
                    join sd in _dbContext.SalesDetails on s.Id equals sd.SalesId
                    where sd.TutorId == tutorId
                    select s.StudentId
                ).Distinct().CountAsync();

            // Average Rating for Tutor
            var ratingSummary = await _dbContext.UserClassRating
                    .Where(r => r.RatedUserId == tutorId)
                    .GroupBy(r => r.RatedUserId)
                    .Select(g => new RatingSummary()
                    {
                        RatedUserId = g.Key,
                        TotalRatings = g.Count(),
                        AverageRating = g.Average(r => (double)r.Rating)
                    })
                    .FirstOrDefaultAsync();

            //Tutor Total Classes
            var totalClasses = await (
                from s in _dbContext.Schedule
                join sd in _dbContext.ScheduleDetails on s.ScheduleId equals sd.ScheduleId
                join t in _dbContext.Tutor on s.TutorId equals t.UserId
                join tp in _dbContext.Type_Code on sd.TutorScheduleStatus equals tp.Id
                where t.UserId == tutorId && sd.IsActive == true
                select sd.TutorScheduleStatus
                ).CountAsync();

            //Tutor Total Cancelled Classes
            var totalCancelledClasses = await (
                from s1 in _dbContext.Schedule
                join sd1 in _dbContext.ScheduleDetails on s1.ScheduleId equals sd1.ScheduleId
                join t in _dbContext.Tutor on s1.TutorId equals t.UserId
                join tp1 in _dbContext.Type_Code on sd1.TutorScheduleStatus equals tp1.Id
                where t.UserId == tutorId && sd1.IsActive == true && tp1.TypeCodeValue == 1009002 // Cancelled
                select sd1.TutorScheduleStatus
                ).CountAsync();


            output.TutorTotalClasses = totalClasses;
            output.TutorTotalCancelledClasses = totalCancelledClasses;


            output.OverallDropoutStudents = overallDropoutStudents;
            output.TotalDropoutStudents = totalDropoutStudents1;
            output.TotalActiveStudents = totalActiveStudents;
            output.TotalAllocatedByTCT = totalAllocatedByTCT;
            output.RatingSummary = ratingSummary;

            return output;
        }

        public async Task<Response<int>> GetTotalClassesCount(Guid salesDetailsId, int year, int month)
        {
            Response<int> response = new Response<int>();
            var monthStart = new DateTime(year, month, 1);
            var monthEnd = monthStart.AddMonths(1).AddTicks(-1);



            var cancelledCount = await _dbContext.Schedule
                .Where(s => s.IsActive
                         && s.SalesDetailsId == salesDetailsId
                         && s.StartDate <= monthEnd
                         && s.EndDate >= monthStart)
                .Join(
                    _dbContext.ScheduleDetails.Where(sd => sd.IsActive),
                    s => s.ScheduleId,
                    sd => sd.ScheduleId,
                    (s, sd) => new { s, sd }
                ).CountAsync();
            response.Data = cancelledCount;
            response.Succeeded = true;
            // replace with your actual Cancelled status code/enum

            return response;
        }


        public async Task<Response<int>> GetCancelledClassesCount(Guid salesDetailsId, int year, int month)
        {
            Response<int> response = new Response<int>();
            var monthStart = new DateTime(year, month, 1);
            var monthEnd = monthStart.AddMonths(1).AddTicks(-1);

            var typeCode = _dbContext.Type_Code.Where(s => s.TypeCodeValue == (int)ClassStatusType.ClassCancelled).FirstOrDefault();

            var cancelledCount = await _dbContext.Schedule
                .Where(s => s.IsActive
                         && s.SalesDetailsId == salesDetailsId
                         && s.StartDate <= monthEnd
                         && s.EndDate >= monthStart)
                .Join(
                    _dbContext.ScheduleDetails.Where(sd => sd.IsActive),
                    s => s.ScheduleId,
                    sd => sd.ScheduleId,
                    (s, sd) => new { s, sd }
                ).CountAsync(x => x.sd.TutorScheduleStatus == typeCode.Id);
            response.Data = cancelledCount;
            response.Succeeded = true;
            // replace with your actual Cancelled status code/enum

            return response;
        }



        public async Task<IReadOnlyList<SalesSummaryResponseDto>> GetAsync(CancellationToken ct = default)
        {
            string Sql = """
                SELECT 
                    SAL.Id                       AS SalesId,
                    SDS.Id                       AS SalesDetailsId,
                    STD.Id                       AS StudentId,
                    STD.UserId                   AS StudentUserId,
                    SDS.SubjectId                AS SubjectId,
                    SAL.CreatedDate              AS SalesDate,
                    USB.FullName                 AS SalesCreatedBy,
                    UST.FullName                 AS Student,
                    ISNULL(UTU.FullName,'Not Assigned') AS Tutor,
                    TCS.TypeCodeName             AS Status,
                    TCC.TypeCodeName             AS Subject,
                    TCG.TypeCodeName             AS Grade,
                    TCB.TypeCodeName             AS Board,
                    USO.FullName                 AS Operation,
                    USC.FullName                 AS Coordinator
                FROM  Type_Code       TCS
                INNER JOIN SalesDetails SDS ON TCS.Id  = SDS.Status
                INNER JOIN Sales        SAL ON SAL.Id  = SDS.SalesId
                INNER JOIN Student      STD ON SAL.StudentId = STD.Id
                INNER JOIN [User]       UST ON UST.Id  = STD.UserId
                LEFT  JOIN Tutor        TUT ON SDS.TutorId   = TUT.UserId
                LEFT  JOIN [User]       UTU ON UTU.Id  = TUT.UserId
                INNER JOIN [User]       USC ON SDS.Coordinator = USC.Id
                INNER JOIN [User]       USO ON SAL.Ownership   = USO.Id
                INNER JOIN [User]       USB ON SAL.CreatedBy   = USB.Id
                INNER JOIN Type_Code    TCC ON SDS.SubjectId   = TCC.Id
                INNER JOIN Type_Code    TCG ON SAL.GradeId     = TCG.Id
                INNER JOIN Type_Code    TCB ON SAL.BoardId     = TCB.Id
                WHERE TCS.TypeCodeValue IN (20001,20002,20012,20013)
                ORDER BY SAL.Id;
                """;
            var result = await _dbContext.Set<SalesSummaryResponseDto>()
                       .FromSqlRaw(Sql)
                       .AsNoTracking()
                       .ToListAsync(ct);
            return result;
        }
        public async Task<IReadOnlyList<SalesSummaryResponseDto>> GetNeedToSchedule(CancellationToken ct = default)
        {
            string Sql = """
                SELECT
                    SAL.Id                       AS SalesId,
                    SDS.Id                       AS SalesDetailsId,
                    STD.Id                       AS StudentId,
                    STD.UserId                   AS StudentUserId,
                    SDS.SubjectId                AS SubjectId,
                    SAL.CreatedDate              AS SalesDate,
                    USB.FullName                 AS SalesCreatedBy,
                    UST.FullName                 AS Student,
                    ISNULL(UTU.FullName,'Not Assigned') AS Tutor,
                    TCS.TypeCodeName             AS Status,
                    TCC.TypeCodeName             AS Subject,
                    TCG.TypeCodeName             AS Grade,
                    TCB.TypeCodeName             AS Board,
                    USO.FullName                 AS Operation,
                    USC.FullName                 AS Coordinator
                FROM  Type_Code       TCS
                INNER JOIN SalesDetails SDS ON TCS.Id  = SDS.Status
                INNER JOIN Sales        SAL ON SAL.Id  = SDS.SalesId
                INNER JOIN Student      STD ON SAL.StudentId = STD.Id
                INNER JOIN [User]       UST ON UST.Id  = STD.UserId
                LEFT  JOIN Tutor        TUT ON SDS.TutorId   = TUT.UserId
                LEFT  JOIN [User]       UTU ON UTU.Id  = TUT.UserId
                INNER JOIN [User]       USC ON SDS.Coordinator = USC.Id
                INNER JOIN [User]       USO ON SAL.Ownership   = USO.Id
                INNER JOIN [User]       USB ON SAL.CreatedBy   = USB.Id
                INNER JOIN Type_Code    TCC ON SDS.SubjectId   = TCC.Id
                INNER JOIN Type_Code    TCG ON SAL.GradeId     = TCG.Id
                INNER JOIN Type_Code    TCB ON SAL.BoardId     = TCB.Id
                WHERE TCS.TypeCodeValue IN (20003)
                ORDER BY SAL.Id;
                """;
            var result = await _dbContext.Set<SalesSummaryResponseDto>()
                       .FromSqlRaw(Sql)
                       .AsNoTracking()
                       .ToListAsync(ct);
            return result;
        }

        public async Task<IReadOnlyList<SalesSummaryResponseDto>> GetScheduleByStatus(
            string statusCodeFilter,
            CancellationToken ct = default)
        {
            string Sql = $"""
                SELECT
                    SAL.Id                       AS SalesId,
                    SDS.Id                       AS SalesDetailsId,
                    STD.Id                       AS StudentId,
                    STD.UserId                   AS StudentUserId,
                    SDS.SubjectId                AS SubjectId,
                    SAL.CreatedDate              AS SalesDate,
                    ISNULL(USB.FullName,'Unknown') AS SalesCreatedBy,
                    UST.FullName                 AS Student,
                    ISNULL(UTU.FullName,'Not Assigned') AS Tutor,
                    TCS.TypeCodeName             AS Status,
                    TCC.TypeCodeName             AS Subject,
                    TCG.TypeCodeName             AS Grade,
                    TCB.TypeCodeName             AS Board,
                    USO.FullName                 AS Operation,
                    USC.FullName                 AS Coordinator
                FROM  Type_Code       TCS
                INNER JOIN SalesDetails SDS ON TCS.Id  = SDS.Status
                INNER JOIN Sales        SAL ON SAL.Id  = SDS.SalesId
                INNER JOIN Student      STD ON SAL.StudentId = STD.Id
                INNER JOIN [User]       UST ON UST.Id  = STD.UserId
                LEFT  JOIN Tutor        TUT ON SDS.TutorId   = TUT.UserId
                LEFT  JOIN [User]       UTU ON UTU.Id  = TUT.UserId
                INNER JOIN [User]       USC ON SDS.Coordinator = USC.Id
                INNER JOIN [User]       USO ON SAL.Ownership   = USO.Id
                LEFT  JOIN [User]       USB ON SAL.CreatedBy   = USB.Id
                INNER JOIN Type_Code    TCC ON SDS.SubjectId   = TCC.Id
                INNER JOIN Type_Code    TCG ON SAL.GradeId     = TCG.Id
                INNER JOIN Type_Code    TCB ON SAL.BoardId     = TCB.Id
                WHERE TCS.TypeCodeValue IN ({statusCodeFilter})
                ORDER BY SAL.Id;
                """;
            var result = await _dbContext.Set<SalesSummaryResponseDto>()
                       .FromSqlRaw(Sql)
                       .AsNoTracking()
                       .ToListAsync(ct);
            return result;
        }

        public async Task<Response<List<ClassScheduleDetailsReportDto>>> GetCompletedClassScheduleDetailsAsync(Guid? studentId = null, Guid? tutorId = null, Guid? operationId = null, DateTime? fromDate = null, DateTime? toDate = null, Guid? operationStatus = null)
        {
            var response = new Response<List<ClassScheduleDetailsReportDto>>();

            try
            {
                var query = @"
                        SELECT 
                            ---------------------------------------------------
                            -- Student Details
                            ---------------------------------------------------
                            SA.StudentId,
                            ST.UserId AS StudentUserId,
                            US.FirstName + ' ' + US.LastName AS StudentName,
                            RS.RoleId AS StudentRoleId,
                            RO.RoleName AS StudentRoleName,

                            ---------------------------------------------------
                            -- Tutor Details
                            ---------------------------------------------------
                            TT.Id AS TutorId,
                            TT.UserId AS TutorUserId,
                            UT.FirstName + ' ' + UT.LastName AS TutorName,
                            RT.RoleId AS TutorRoleId,
                            TR.RoleName AS TutorRoleName,

                            ---------------------------------------------------
                            -- Ownership Details
                            ---------------------------------------------------
                            SA.Ownership AS OwnershipUserId,
                            UO.FirstName + ' ' + UO.LastName AS OwnershipName,
                            RSO.RoleId AS OwnershipRoleId,
                            ROLO.RoleName AS OwnershipRoleName,

                            ---------------------------------------------------
                            -- Coordinator Details
                            ---------------------------------------------------
                            SD.Coordinator AS CoordinatorUserId,
                            UC.FirstName + ' ' + UC.LastName AS CoordinatorName,
                            RSC.RoleId AS CoordinatorRoleId,
                            ROLC.RoleName AS CoordinatorRoleName,

                            ---------------------------------------------------
                            -- Main Transaction Details
                            ---------------------------------------------------
                            SA.Id AS SalesId,
                            SD.Id AS SalesDetailsId,
                            SH.ScheduleId,
                            HS.ScheduleDetailsId,
                            HS.ScheduleType,

                            ---------------------------------------------------
                            -- Schedule Details
                            ---------------------------------------------------
                            HS.[Date],
                            HS.StartTime,
                            HS.EndTime,
                            HS.TutorComment,
                            HS.StudentComment,
                            HS.[Status] AS ScheduleStatus,
                            HS.TutorScheduleStatus AS TutorScheduleStatusId,
                            TSS.TypeCodeName AS TutorScheduleStatusName,
                            TSS.TypeCodeValue AS TutorScheduleStatusCode,
                            HS.StudentScheduleStatus AS StudentScheduleStatusId,
                            SSS.TypeCodeName AS StudentScheduleStatusName,
                            SSS.TypeCodeValue AS StudentScheduleStatusCode,
                            HS.OperationScheduleStatus AS OperationScheduleStatusId,
                            OSS.TypeCodeName AS OperationScheduleStatusName,
                            SH.AccountsApprovalScheduleStatus,
                            APS.TypeCodeValue AS AccountsApprovalStatusCode,
                            APS.TypeCodeName AS AccountsApprovalStatusName,
                            HS.IsTutorPresent,
                            HS.IsStudentPresent,
                            HS.Comment,
                            HS.Title,
                            HS.MeetingLink,
                            HS.TutorStartTime,
                            HS.TutorEndTime,
                            HS.StudentStartTime,
                            HS.StudentEndTime,
                            HS.OperationStartTime,
                            HS.OperationEndTime,

                            ---------------------------------------------------
                            -- Board, Grade & Subject Details
                            ---------------------------------------------------
                            BO.TypeCodeName AS Board,
                            GR.TypeCodeName AS Grade,
                            SJ.TypeCodeName AS Subject,

                            ---------------------------------------------------
                            -- Payment & Payslip
                            ---------------------------------------------------
                             SD.ParentPayment,
                            SD.TutorPayment,
                            COALESCE(TI.SubjectPayment,
                                CASE WHEN BILL.IsTutorPayable = 1
                                THEN CAST(
                                    CEILING(DATEDIFF(MINUTE, HS.StartTime, HS.EndTime) / 15.0)
                                    / 4.0 * COALESCE(SH.TutorRate, SD.TutorPayment)
                                    AS DECIMAL(18,2)
                                )
                                ELSE 0
                                END
                            ) AS TutorClassPayment,
                            TI.InvoiceNumber AS PayslipInvoiceNumber
                        FROM [Sales] AS SA
                        INNER JOIN [SalesDetails] AS SD 
                            ON SD.SalesId = SA.Id

                        ---------------------------------------------------
                        -- Student Join
                        ---------------------------------------------------
                        INNER JOIN [Student] AS ST 
                            ON SA.StudentId = ST.Id
                        INNER JOIN [User] AS US 
                            ON ST.UserId = US.Id
                        LEFT JOIN [UserRole] AS RS 
                            ON US.Id = RS.UserId
                        LEFT JOIN [Roles] AS RO 
                            ON RS.RoleId = RO.Id

                        ---------------------------------------------------
                        -- Tutor Join
                        ---------------------------------------------------
                        INNER JOIN [Schedule] AS SH
                            ON SD.Id = SH.SalesDetailsId
                        INNER JOIN [Tutor] AS TT 
                            ON SH.TutorId = TT.Id
                        INNER JOIN [User] AS UT 
                            ON TT.UserId = UT.Id
                        LEFT JOIN [UserRole] AS RT 
                            ON UT.Id = RT.UserId
                        LEFT JOIN [Roles] AS TR 
                            ON RT.RoleId = TR.Id

                        ---------------------------------------------------
                        -- Ownership Join
                        ---------------------------------------------------
                        LEFT JOIN [User] AS UO 
                            ON SA.Ownership = UO.Id
                        LEFT JOIN [UserRole] AS RSO 
                            ON UO.Id = RSO.UserId
                        LEFT JOIN [Roles] AS ROLO 
                            ON RSO.RoleId = ROLO.Id

                        ---------------------------------------------------
                        -- Coordinator Join
                        ---------------------------------------------------
                        LEFT JOIN [User] AS UC 
                            ON SD.Coordinator = UC.Id
                        LEFT JOIN [UserRole] AS RSC 
                            ON UC.Id = RSC.UserId
                        LEFT JOIN [Roles] AS ROLC 
                            ON RSC.RoleId = ROLC.Id

                        ---------------------------------------------------
                        -- Schedule Join
                        ---------------------------------------------------
                        ---------------------------------------------------
                        -- ScheduleDetails Join
                        ---------------------------------------------------
                        INNER JOIN [ScheduleDetails] AS HS
                            ON HS.ScheduleId = SH.ScheduleId

                        ---------------------------------------------------
                        -- Board, Grade & Subject Join
                        ---------------------------------------------------
                        INNER JOIN [Type_Code] AS BO
                            ON SA.BoardId = BO.Id
                        INNER JOIN [Type_Code] AS GR
                            ON SA.GradeId = GR.Id
                        INNER JOIN [Type_Code] AS SJ
                            ON SD.SubjectId = SJ.Id

                        ---------------------------------------------------
                        -- Schedule Status Type_Code Join
                        ---------------------------------------------------
                        LEFT JOIN [Type_Code] AS TSS
                            ON HS.TutorScheduleStatus = TSS.Id
                        LEFT JOIN [Type_Code] AS SSS
                            ON HS.StudentScheduleStatus = SSS.Id
                        LEFT JOIN [Type_Code] AS OSS
                            ON HS.OperationScheduleStatus = OSS.Id
                        -- Tutor pay per class follows the Operations attendance cross-check.
                        LEFT JOIN vw_ClassAttendanceBilling AS BILL
                            ON BILL.ScheduleDetailsId = HS.ScheduleDetailsId
                        LEFT JOIN [Type_Code] AS APS
                            ON SH.AccountsApprovalScheduleStatus = APS.Id

                        ---------------------------------------------------
                        -- Tutor Payslip Invoice Join
                        ---------------------------------------------------
                        OUTER APPLY (
                            SELECT TOP (1) INV.InvoiceNumber, ID.SubjectPayment
                            FROM TutorInvoice INV
                            INNER JOIN TutorInvoiceDetails ID ON ID.TutorInvoiceId = INV.Id
                            WHERE ID.ScheduleDetailsId = HS.ScheduleDetailsId AND ID.IsActive = 1
                              AND INV.TutorId = SH.TutorId AND INV.IsActive = 1
                              AND INV.Year = YEAR(HS.[Date])
                              AND (TRY_CONVERT(INT, INV.Month) = MONTH(HS.[Date]) OR INV.Month = DATENAME(month, HS.[Date]))
                            ORDER BY INV.Id DESC, ID.Id DESC
                        ) AS TI

                        WHERE HS.ScheduleType = 'Class'
                        AND HS.IsActive = 1 AND SH.IsActive = 1
                        AND (@OperationId is null or SA.[Ownership] = @OperationId)
                        AND (@StudentId IS NULL OR SA.StudentId = @StudentId)
                        AND (@TutorId IS NULL OR SH.TutorId = @TutorId)
                        AND (@fromDate IS NULL OR HS.[Date] >= CAST(@fromDate AS DATE))
                        AND (@OperationStatus is null or HS.OperationScheduleStatus = @OperationStatus)
                        AND (@toDate IS NULL OR HS.[Date] < DATEADD(DAY, 1, CAST(@toDate AS DATE)))";
                var _operationStatus = new SqlParameter("@OperationStatus", (object?)operationStatus ?? DBNull.Value);
                var studentIdParam = new SqlParameter("@StudentId", (object?)studentId ?? DBNull.Value);
                var tutorIdParam = new SqlParameter("@TutorId", (object?)tutorId ?? DBNull.Value);
                var operationIdParam = new SqlParameter("@OperationId", (object?)operationId ?? DBNull.Value);
                var _fromDate = new SqlParameter("@fromDate", fromDate.HasValue ? fromDate.Value.Date : DBNull.Value);
                var _toDate = new SqlParameter("@toDate", toDate.HasValue ? toDate.Value.Date : DBNull.Value);

                var result = await _dbContext.Set<ClassScheduleDetailsReportDto>()
                    .FromSqlRaw(query, studentIdParam, tutorIdParam, operationIdParam, _fromDate, _toDate, _operationStatus)
                    .AsNoTracking()
                    .ToListAsync();

                response.Data = result.OrderBy(x => x.Date)
                      .ThenBy(x => x.StartTime)
                      .ToList();
                response.Succeeded = true;
                response.Message = "Data retrieved successfully.";
            }
            catch (Exception ex)
            {
                response.Data = new List<ClassScheduleDetailsReportDto>();
                response.Succeeded = false;
                response.Message = ex.Message;
            }

            return response;
        }

        public async Task<Response<bool>> UpdateOperationScheduleStatus(UpdateOperationScheduleStatusRequest request)
        {
            try
            {
                if (request == null)
                {
                    return new Response<bool>(false, "Request cannot be null.");
                }

                if (request.ScheduleDetailsId == Guid.Empty)
                {
                    return new Response<bool>(false, "ScheduleDetailsId is required.");
                }

                if (request.OperationScheduleStatus == Guid.Empty)
                {
                    return new Response<bool>(false, "OperationScheduleStatus is required.");
                }

                var entity = await _dbContext.ScheduleDetails
                    .FirstOrDefaultAsync(x => x.ScheduleDetailsId == request.ScheduleDetailsId);

                if (entity == null)
                {
                    return new Response<bool>(false, "Schedule detail not found.");
                }

                var isStatusChanged = entity.OperationScheduleStatus != request.OperationScheduleStatus;

                entity.OperationScheduleStatus = request.OperationScheduleStatus;
                entity.ModifiedDate = DateTime.UtcNow;

                await _dbContext.SaveChangesAsync();

                var message = "Operation schedule status updated successfully.";

                if (isStatusChanged && entity.Date != default
                    && IsIn(entity.OperationScheduleStatus, await GetOpsApprovedStatusIdsAsync()))
                {
                    var rolloverSummary = await CheckAndGenerateNextMonthAsync(entity.ScheduleId, entity.Date);
                    if (!string.IsNullOrEmpty(rolloverSummary))
                    {
                        message += " " + rolloverSummary;
                    }
                }

                return new Response<bool>(true, message);
            }
            catch (Exception ex)
            {
                return new Response<bool>
                {
                    Succeeded = false,
                    Message = ex.Message,
                    Data = false,
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        // Ops sign-off states from the Class Attendance Status lookup (group 1013). All three of its
        // current options mean approved - they differ only in whose attendance was taken as the source:
        //   1013001 Ops Approved
        //   1013002 Go with tutors attendance(Ops Approved)
        //   1013003 Go with operation attendance (Ops Approved)
        // Listed explicitly rather than "any value in group 1013" so that adding a rejection/on-hold
        // status later fails closed (no rollover) instead of silently counting as approved.
        private static readonly int[] OpsApprovedStatusValues = { 1013001, 1013002, 1013003 };

        private async Task<HashSet<Guid>> GetOpsApprovedStatusIdsAsync()
        {
            var ids = await _dbContext.Type_Code
                .Where(t => OpsApprovedStatusValues.Contains(t.TypeCodeValue))
                .Select(t => t.Id)
                .ToListAsync();
            return ids.ToHashSet();
        }

        // Lookup ids that mean "Class Completed". Two groups carry this status depending on which screen
        // submitted it (1009001 from the attendance list, 20020 from the calendar), so accept both plus
        // the name - same tolerance the attendance UI applies.
        private async Task<HashSet<Guid>> GetClassCompletedStatusIdsAsync()
        {
            var ids = await _dbContext.Type_Code
                .Where(t => t.TypeCodeValue == 1009001
                         || t.TypeCodeValue == 20020
                         || (t.TypeCodeName != null && t.TypeCodeName.Trim().ToLower() == "class completed"))
                .Select(t => t.Id)
                .ToListAsync();
            return ids.ToHashSet();
        }

        // Lookup ids for classes that never ran. These are excluded from the "is the month finished?" gate -
        // nobody submits attendance for a cancelled class, so requiring approval on one would stall rollover
        // forever. Their weekly slot is still carried into next month's pattern.
        private async Task<HashSet<Guid>> GetNonRunClassStatusIdsAsync()
        {
            var ids = await _dbContext.Type_Code
                .Where(t => t.TypeCodeValue == 1009002   // Class Cancelled
                         || t.TypeCodeValue == 1009003   // Cancelled - student not available
                         || t.TypeCodeValue == 1009005   // Class Postponed
                         || t.TypeCodeValue == 1009006   // Class Rescheduled
                         || t.TypeCodeValue == 1009007)  // Cancelled - tutor not available
                .Select(t => t.Id)
                .ToListAsync();
            return ids.ToHashSet();
        }

        private static bool IsIn(Guid? statusId, HashSet<Guid> set) =>
            statusId.HasValue && set.Contains(statusId.Value);

        // A class counts as signed off when the tutor and the student have both marked it complete
        // (or Ops confirmed their presence) AND Ops has set the status to "Ops Approved".
        private static bool IsFullySignedOff(ScheduleDetails c, HashSet<Guid> completed, HashSet<Guid> opsApproved)
        {
            var tutorDone = c.IsTutorPresent == true || IsIn(c.TutorScheduleStatus, completed);
            var studentDone = c.IsStudentPresent == true || IsIn(c.StudentScheduleStatus, completed);
            return tutorDone && studentDone && IsIn(c.OperationScheduleStatus, opsApproved);
        }

        // Checks whether every active subject a student takes now has every class for the given month's
        // Ops-approved, and if so, auto-generates next month's recurring schedule for each subject.
        // Returns a short summary of what happened (for surfacing via the save toast), or null if nothing to do yet.
        private async Task<string?> CheckAndGenerateNextMonthAsync(Guid scheduleId, DateTime sourceDate)
        {
            var studentId = await (
                from sh in _dbContext.Schedule
                join sd in _dbContext.SalesDetails on sh.SalesDetailsId equals sd.Id
                join sa in _dbContext.Sales on sd.SalesId equals sa.Id
                where sh.ScheduleId == scheduleId
                select (Guid?)sa.StudentId
            ).FirstOrDefaultAsync();

            if (!studentId.HasValue || studentId.Value == Guid.Empty)
            {
                return null;
            }

            var activeSubjects = await (
                from sd in _dbContext.SalesDetails
                join sa in _dbContext.Sales on sd.SalesId equals sa.Id
                where sa.StudentId == studentId.Value && sd.IsActive
                select sd
            ).ToListAsync();

            if (activeSubjects.Count == 0)
            {
                return null;
            }

            var monthStart = new DateTime(sourceDate.Year, sourceDate.Month, 1);
            var monthEnd = monthStart.AddMonths(1).AddDays(-1);

            // Academic rollover is now bounded by ScheduleEndDate for each subject.
            var completedIds = await GetClassCompletedStatusIdsAsync();
            var opsApprovedIds = await GetOpsApprovedStatusIdsAsync();
            var nonRunIds = await GetNonRunClassStatusIdsAsync();

            foreach (var subject in activeSubjects)
            {
                var hasRecurringSchedule = await (
                    from sh in _dbContext.Schedule
                    join d in _dbContext.ScheduleDetails on sh.ScheduleId equals d.ScheduleId
                    where sh.SalesDetailsId == subject.Id && sh.IsActive && d.IsActive
                        && sh.ScheduleMode == "Weekly"
                        && d.Date >= monthStart && d.Date <= monthEnd
                    select d.ScheduleDetailsId).AnyAsync();
                if (!hasRecurringSchedule)
                    continue;

                var monthClasses = await LoadMonthClassesAsync(subject.Id, monthStart, monthEnd);

                // A subject with no classes scheduled this month isn't part of this month's rollover gate.
                if (monthClasses.Count == 0)
                {
                    continue;
                }

                // Cancelled/postponed classes never ran, so nobody submits attendance for them - excluding
                // them keeps a single cancellation from stalling rollover permanently.
                var classesThatRan = monthClasses
                    .Where(c => !IsIn(c.TutorScheduleStatus, nonRunIds) && !IsIn(c.StudentScheduleStatus, nonRunIds))
                    .ToList();

                if (classesThatRan.Count == 0 ||
                    classesThatRan.Any(c => !IsFullySignedOff(c, completedIds, opsApprovedIds)))
                {
                    // At least one class for at least one subject isn't signed off yet - not time to roll over.
                    return null;
                }
            }

            // Plan every subject before creating anything. The invoice for a student/month is a single
            // record covering all subjects (CreateInvoiceWithDetailsAsync), and its duplicate guard will
            // silently skip any subject added after that invoice exists. So a subject we cannot schedule
            // has to block the whole rollover rather than leave the rest to be invoiced without it.
            var plans = new List<NextMonthPlan>();
            foreach (var subject in activeSubjects)
            {
                var plan = await PlanNextMonthForSubjectAsync(subject, studentId.Value, monthStart, monthEnd);

                if (plan == null)
                {
                    continue; // Nothing to roll over for this subject (no classes, or next month already exists).
                }

                if (plan.BlockReason != null)
                {
                    return $"Next month not scheduled: {plan.BlockReason}. No subjects were rolled over - " +
                           "resolve this and re-approve, or schedule the month manually.";
                }

                plans.Add(plan);
            }

            if (plans.Count == 0)
            {
                return null;
            }

            var outcomes = new List<string>();
            foreach (var plan in plans)
            {
                var outcome = await CommitNextMonthPlanAsync(plan);
                if (!string.IsNullOrEmpty(outcome))
                {
                    outcomes.Add(outcome);
                }
            }

            return outcomes.Count > 0 ? "Next month: " + string.Join("; ", outcomes) + "." : null;
        }

        // Loads the active "Class" rows for one subject within a month.
        private async Task<List<ScheduleDetails>> LoadMonthClassesAsync(Guid salesDetailsId, DateTime monthStart, DateTime monthEnd)
        {
            return await (
                from sh in _dbContext.Schedule
                join sdd in _dbContext.ScheduleDetails on sh.ScheduleId equals sdd.ScheduleId
                where sh.SalesDetailsId == salesDetailsId
                    && sdd.ScheduleType == "Class"
                    && sdd.IsActive
                    && sdd.Date >= monthStart && sdd.Date <= monthEnd
                select sdd
            ).ToListAsync();
        }

        // What one subject's next month will look like. BlockReason set means it cannot be scheduled,
        // which aborts the rollover for every subject.
        private sealed class NextMonthPlan
        {
            public SalesDetails Subject { get; init; } = null!;
            public Schedule SourceSchedule { get; init; } = null!;
            public Guid StudentId { get; init; }
            public string SubjectName { get; init; } = "Subject";
            public DateTime NextMonthStart { get; init; }
            public DateTime NextMonthEnd { get; init; }
            public ScheduleDetails SampleClass { get; init; } = null!;
            public List<(DateTime Start, DateTime End, DayOfWeek Day)> Occurrences { get; init; } = new();
            public string? BlockReason { get; init; }
        }

        // Works out this subject's next-month occurrences from the current month's weekly day/time pattern
        // and re-validates the tutor/student have no conflicting booking. Creates nothing.
        private async Task<NextMonthPlan?> PlanNextMonthForSubjectAsync(SalesDetails subject, Guid studentId, DateTime monthStart, DateTime monthEnd)
        {
            var nextMonthStart = monthStart.AddMonths(1);
            var nextMonthEnd = nextMonthStart.AddMonths(1).AddDays(-1);

            var sourceSchedule = await (
                from sh in _dbContext.Schedule.AsNoTracking()
                join d in _dbContext.ScheduleDetails.AsNoTracking()
                    on sh.ScheduleId equals d.ScheduleId
                where sh.SalesDetailsId == subject.Id && sh.IsActive && d.IsActive
                    && sh.ScheduleMode == "Weekly"
                    && d.Date >= monthStart && d.Date <= monthEnd
                orderby sh.StartDate descending
                select sh).FirstOrDefaultAsync();

            // Only recurring schedules with an academic closing date can roll over.
            if (sourceSchedule?.ScheduleEndDate == null ||
                nextMonthStart.Date > sourceSchedule.ScheduleEndDate.Value.Date)
                return null;

            if (nextMonthEnd > sourceSchedule.ScheduleEndDate.Value.Date)
                nextMonthEnd = sourceSchedule.ScheduleEndDate.Value.Date;

            var subjectName = (await _dbContext.Type_Code.FirstOrDefaultAsync(t => t.Id == subject.SubjectId))?.TypeCodeName
                ?? "Subject";

            // Idempotency: if next month already has real classes for this subject, don't duplicate them.
            // Requires at least one active class row - a Schedule header with no classes is debris from a
            // failed run and must not suppress a retry.
            var alreadyExists = await (
                from s in _dbContext.Schedule
                join d in _dbContext.ScheduleDetails on s.ScheduleId equals d.ScheduleId
                where s.SalesDetailsId == subject.Id && s.IsActive && d.IsActive
                    && d.ScheduleType == "Class"
                    // A 1-4 week Schedule Calendar change running into next month is not next month's schedule.
                    && s.ScheduleMode != TCT.LMS.Application.Services.WeeklyDayChangePlanner.TemporaryScheduleMode
                    && d.Date >= nextMonthStart && d.Date <= nextMonthEnd
                select s.ScheduleId
            ).AnyAsync();
            if (alreadyExists)
            {
                return null;
            }

            var monthClasses = await _dbContext.ScheduleDetails.AsNoTracking()
                .Where(d => d.ScheduleId == sourceSchedule.ScheduleId && d.IsActive
                    && d.ScheduleType == "Class"
                    && d.Date >= monthStart && d.Date <= monthEnd)
                .ToListAsync();

            if (monthClasses.Count == 0)
            {
                return null;
            }

            var blocked = (string reason) => new NextMonthPlan
            {
                Subject = subject,
                SourceSchedule = sourceSchedule,
                StudentId = studentId,
                SubjectName = subjectName,
                NextMonthStart = nextMonthStart,
                NextMonthEnd = nextMonthEnd,
                SampleClass = monthClasses.First(),
                BlockReason = reason
            };

            var packageBlock = await GetPrepaidScheduleBlockReasonAsync(subject.Id, nextMonthStart);
            if (packageBlock != null) return blocked(packageBlock);
            var tutorId = subject.TutorId ?? Guid.Empty;
            if (tutorId == Guid.Empty)
            {
                return blocked($"{subjectName} has no tutor assigned");
            }

            var weeklyPattern = monthClasses
                .GroupBy(c => new { c.Date.DayOfWeek, Start = c.StartTime.TimeOfDay, End = c.EndTime.TimeOfDay })
                .Select(g => g.Key)
                .ToList();

            // A weekly slot moved away by an approved permanent re-schedule still has its earlier classes in this
            // month; it is not carried on unless it has classes again after the move.
            var movedSlots = await (
                from r in _dbContext.ScheduleChangeRequest.AsNoTracking()
                join d in _dbContext.ScheduleDetails.AsNoTracking() on r.ScheduleDetailsId equals d.ScheduleDetailsId
                where r.SalesDetailsId == subject.Id && r.RequestKind == PermanentRescheduleKind
                    && r.Status == (int)ClassStatusEditRequestStatus.Approved
                select new { d.Date, d.StartTime }).ToListAsync();
            weeklyPattern = weeklyPattern.Where(p => !movedSlots.Any(m =>
                    m.Date.DayOfWeek == p.DayOfWeek && m.StartTime.TimeOfDay == p.Start
                    && !monthClasses.Any(c => c.Date.DayOfWeek == p.DayOfWeek && c.StartTime.TimeOfDay == p.Start && c.Date.Date >= m.Date.Date)))
                .ToList();

            var proposedOccurrences = new List<(DateTime Start, DateTime End, DayOfWeek Day)>();
            foreach (var pattern in weeklyPattern)
            {
                foreach (var date in DateHelper.FindRepeatingDays(nextMonthStart, nextMonthEnd, new[] { pattern.DayOfWeek }))
                {
                    proposedOccurrences.Add((date.Date + pattern.Start, date.Date + pattern.End, pattern.DayOfWeek));
                }
            }

            var tutorOtherEvents = await (
                from sh in _dbContext.Schedule
                join sdd in _dbContext.ScheduleDetails on sh.ScheduleId equals sdd.ScheduleId
                where sh.TutorId == tutorId && sh.SalesDetailsId != subject.Id
                    && sdd.IsActive && sdd.Date >= nextMonthStart && sdd.Date <= nextMonthEnd
                select new { sdd.StartTime, sdd.EndTime }
            ).ToListAsync();

            var studentOtherEvents = await (
                from sh in _dbContext.Schedule
                join sdd in _dbContext.ScheduleDetails on sh.ScheduleId equals sdd.ScheduleId
                where sh.StudentId == studentId && sh.SalesDetailsId != subject.Id
                    && sdd.IsActive && sdd.Date >= nextMonthStart && sdd.Date <= nextMonthEnd
                select new { sdd.StartTime, sdd.EndTime }
            ).ToListAsync();

            var tutorEvents = tutorOtherEvents.Select(e => new EventSlotValidator.Event(e.StartTime, e.EndTime)).ToList();
            var studentEvents = studentOtherEvents.Select(e => new EventSlotValidator.Event(e.StartTime, e.EndTime)).ToList();

            if (proposedOccurrences.Count == 0)
            {
                return blocked($"{subjectName} has no repeating day that falls in {nextMonthStart:MMMM yyyy}");
            }

            foreach (var occurrence in proposedOccurrences)
            {
                if (EventSlotValidator.IsSlotAllocated(tutorEvents, occurrence.Start, occurrence.End) ||
                    EventSlotValidator.IsSlotAllocated(studentEvents, occurrence.Start, occurrence.End))
                {
                    return blocked($"{subjectName} clashes with another booking on {occurrence.Day} {occurrence.Start:hh\\:mm tt}");
                }
            }

            return new NextMonthPlan
            {
                Subject = subject,
                SourceSchedule = sourceSchedule,
                StudentId = studentId,
                SubjectName = subjectName,
                NextMonthStart = nextMonthStart,
                NextMonthEnd = nextMonthEnd,
                SampleClass = monthClasses.First(),
                Occurrences = proposedOccurrences
            };
        }

        // Writes a validated plan. Only called once every subject has planned successfully.
        private async Task<string?> CommitNextMonthPlanAsync(NextMonthPlan plan)
        {
            var sampleClass = plan.SampleClass;
            var scheduleResult = await AddOrUpdateSchedule(new Schedule1Dto
            {
                SalesDetailsId = plan.Subject.Id,
                NoOfMonths = plan.SourceSchedule.NoOfMonths,
                ScheduleEndDate = plan.SourceSchedule.ScheduleEndDate,
                ScheduleMode = "Weekly",
                StartDate = plan.NextMonthStart,
                EndDate = plan.NextMonthEnd,
                StudentId = plan.StudentId,
                SubjectId = plan.Subject.SubjectId,
                TutorId = plan.Subject.TutorId ?? Guid.Empty,
                Title = sampleClass.Title,
                MeetingLink = sampleClass.MeetingLink,
                UserId = Guid.Empty
            });

            if (!scheduleResult.Succeeded || scheduleResult.Data == Guid.Empty)
            {
                return $"{plan.SubjectName} failed ({scheduleResult.Message ?? "could not create schedule"})";
            }

            var createdCount = 0;
            foreach (var occurrence in plan.Occurrences)
            {
                var detailResult = await AddOrUpdateScheduleDetails(new ScheduleDetailsDto
                {
                    ScheduleId = scheduleResult.Data,
                    ScheduleType = "Class",
                    StartTime = occurrence.Start,
                    EndTime = occurrence.End,
                    Title = sampleClass.Title,
                    MeetingLink = sampleClass.MeetingLink,
                    Date = occurrence.Start.Date
                });
                if (detailResult.Succeeded)
                {
                    createdCount++;
                }
            }

            // No classes written means the Schedule header is debris - deactivate it so the idempotency
            // check doesn't treat it as "already scheduled" on the next attempt.
            if (createdCount == 0)
            {
                var header = await _dbContext.Schedule.FirstOrDefaultAsync(s => s.ScheduleId == scheduleResult.Data);
                if (header != null)
                {
                    header.IsActive = false;
                    await _dbContext.SaveChangesAsync();
                }
                return $"{plan.SubjectName} failed (no classes could be created)";
            }

            return $"{plan.SubjectName} auto-scheduled ({createdCount} classes)";
        }

        public async Task<Response<bool>> UpdateScheduleApprovalStatus(ScheduleStatusUpdateRequest request)
        {
            try
            {
                var statusEntry = await _dbContext.Type_Code
                    .FirstOrDefaultAsync(x => x.TypeCodeValue == request.ActionCode);

                if (statusEntry == null)
                {
                    return new Response<bool> { Succeeded = false, Message = "Invalid Action Code." };
                }

                var schedules = await _dbContext.Schedule
                    .Where(s => request.ScheduleIds.Contains(s.ScheduleId))
                    .ToListAsync();

                if (!schedules.Any())
                {
                    return new Response<bool> { Succeeded = false, Message = "No schedules found to update." };
                }

                var now = DateTime.Now;
                foreach (var schedule in schedules)
                {
                    schedule.AccountsApprovalScheduleStatus = statusEntry.Id;
                    schedule.ApprovedBy = request.UserId;
                    schedule.ApprovedDate = now;
                    schedule.ModifiedBy = request.UserId;
                    schedule.ModifiedDate = now;
                }

                await _dbContext.SaveChangesAsync();

                return new Response<bool>
                {
                    Succeeded = true,
                    Data = true,
                    Message = "Status updated successfully"
                };
            }
            catch (Exception ex)
            {
                return new Response<bool>
                {
                    Succeeded = false,
                    Data = false,
                    Message = ex.Message
                };
            }
        }

        public async Task UpdateMeetingLinkAsync(Guid scheduleDetailsId, string meetingLink)
        {
            var detail = await _dbContext.ScheduleDetails
                .FirstOrDefaultAsync(x => x.ScheduleDetailsId == scheduleDetailsId);
            if (detail != null)
            {
                detail.MeetingLink = meetingLink;
                await _dbContext.SaveChangesAsync();
            }
        }

        private int GetMonthNumber(string monthName)
        {
            return monthName switch
            {
                "January" => 1,
                "February" => 2,
                "March" => 3,
                "April" => 4,
                "May" => 5,
                "June" => 6,
                "July" => 7,
                "August" => 8,
                "September" => 9,
                "October" => 10,
                "November" => 11,
                "December" => 12,
                _ => 1
            };
        }

        private async Task<string> GetAmountInWordsAsync(decimal amount)
        {
            try
            {
                var sql = "SELECT dbo.fn_NumberToWords(@amount) AS AmountInWords";
                var result = await _dbContext.Database.SqlQueryRaw<string>(sql,
                    new SqlParameter("@amount", amount)).FirstOrDefaultAsync();
                return result ?? string.Empty;
            }
            catch
            {
                return string.Empty; // Fallback if function doesn't exist
            }
        }

        // ══════════════════════════════════════════════════════════════════════
        //  Prepaid payment plans (Scenario 1)
        // ══════════════════════════════════════════════════════════════════════

        // Create a plan for a subject enrollment, or update the existing active one.
        // One active plan per SalesDetailsId (enforced by a filtered unique index).
        public async Task<Response<Guid>> AddOrUpdatePaymentPlanAsync(CreatePaymentPlanRequest request)
        {
            var response = new Response<Guid>();

            if (request.SalesDetailsId == Guid.Empty)
                return new Response<Guid>("SalesDetailsId is required.");
            if (request.PlanMonths <= 0)
                return new Response<Guid>("PlanMonths must be greater than zero.");
            if (request.TotalFee <= 0)
                return new Response<Guid>("TotalFee must be greater than zero.");
            if (request.StartMonth < 1 || request.StartMonth > 12)
                return new Response<Guid>("StartMonth must be between 1 and 12.");
            if (request.StartYear < 2000 || request.StartYear > 9988 || request.PlanMonths > 120)
                return new Response<Guid>("Invalid plan year or duration.");
            if (request.TotalClasses.HasValue && request.TotalClasses.Value <= 0)
                return new Response<Guid>("Included classes must be greater than zero.");
            if (request.InstallmentCount < 1)
                request.InstallmentCount = 1;

            try
            {
                using var transaction = await _dbContext.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
                var now = DateTime.Now;
                var existing = await _dbContext.StudentPaymentPlan
                    .FirstOrDefaultAsync(p => p.SalesDetailsId == request.SalesDetailsId && p.IsActive);

                var studentId = await (from detail in _dbContext.SalesDetails
                    join sale in _dbContext.Sales on detail.SalesId equals sale.Id
                    where detail.Id == request.SalesDetailsId
                    select (Guid?)sale.StudentId).FirstOrDefaultAsync();
                if (!studentId.HasValue || studentId != request.StudentId)
                    return new Response<Guid>("The payment plan must belong to the selected student's enrollment.");
                if (existing != null && !string.IsNullOrWhiteSpace(existing.UpfrontInvoiceNumber))
                    return new Response<Guid>("This payment plan has been invoiced and is locked. Existing invoices must not be changed by editing the plan.");
                {
                    var source = await _dbContext.Schedule.AsNoTracking()
                        .Where(s => s.SalesDetailsId == request.SalesDetailsId && s.IsActive && s.ScheduleMode == "Weekly" && s.NoOfMonths > 1)
                        .OrderBy(s => s.StartDate).ThenBy(s => s.CreatedDate).FirstOrDefaultAsync();
                    if (source != null)
                        TCT.LMS.Application.Services.PackageBillingGuard.RequireScheduledAgreement(
                            source.NoOfMonths.Value, source.StartDate, request.PlanMonths,
                            request.StartMonth, request.StartYear, request.TotalClasses);
                    var hasExistingInvoice = await (from detail in _dbContext.StudentInvoiceDetails
                        join invoice in _dbContext.StudentInvoice on detail.StudentInvoiceId equals invoice.Id
                        join schedule in _dbContext.Schedule on detail.ScheduleId equals schedule.ScheduleId
                        where schedule.SalesDetailsId == request.SalesDetailsId && detail.IsActive && invoice.IsActive
                        select invoice.Id).AnyAsync();
                    if (source != null && hasExistingInvoice)
                        return new Response<Guid>("Invoices already exist for this enrollment. Accounts must review them before converting it to a full-period package; no existing invoice was changed.");
                }

                if (existing == null)
                {
                    var plan = new StudentPaymentPlan
                    {
                        Id = Guid.NewGuid(),
                        SalesDetailsId = request.SalesDetailsId,
                        StudentId = request.StudentId,
                        PlanMonths = request.PlanMonths,
                        StartMonth = request.StartMonth,
                        StartYear = request.StartYear,
                        TotalClasses = request.TotalClasses,
                        TotalFee = request.TotalFee,
                        InstallmentCount = request.InstallmentCount,
                        IsActive = true,
                        CreatedBy = request.UserId,
                        CreatedDate = now
                    };
                    _dbContext.StudentPaymentPlan.Add(plan);
                    await _dbContext.SaveChangesAsync();
                    await transaction.CommitAsync();
                    return new Response<Guid>(plan.Id, "Payment plan created.");
                }

                existing.StudentId = request.StudentId;
                existing.PlanMonths = request.PlanMonths;
                existing.StartMonth = request.StartMonth;
                existing.StartYear = request.StartYear;
                existing.TotalClasses = request.TotalClasses;
                existing.TotalFee = request.TotalFee;
                existing.InstallmentCount = request.InstallmentCount;
                existing.ModifiedBy = request.UserId;
                existing.ModifiedDate = now;
                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();
                return new Response<Guid>(existing.Id, "Payment plan updated.");
            }
            catch (Exception ex)
            {
                response.Succeeded = false;
                response.Message = ex.Message;
                return response;
            }
        }

        // Record one receipt (single shot or an installment) against a plan.
        public async Task<Response<Guid>> RecordPaymentAsync(RecordPaymentRequest request)
        {
            if (request.StudentPaymentPlanId == Guid.Empty)
                return new Response<Guid>("StudentPaymentPlanId is required.");
            if (request.Amount <= 0)
                return new Response<Guid>("Amount must be greater than zero.");

            try
            {
                using var transaction = await _dbContext.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
                var plan = await _dbContext.StudentPaymentPlan
                    .FirstOrDefaultAsync(p => p.Id == request.StudentPaymentPlanId && p.IsActive);
                if (plan == null)
                    return new Response<Guid>("Payment plan not found.");

                // Guard against overpaying the plan.
                var paidSoFar = await _dbContext.StudentPayment
                    .Where(p => p.StudentPaymentPlanId == plan.Id && p.IsActive)
                    .SumAsync(p => (decimal?)p.Amount) ?? 0m;
                var totalDue = plan.TotalFee + await GetPackageExtraChargesAsync(plan.Id);
                if (paidSoFar + request.Amount > totalDue)
                    return new Response<Guid>($"Payment exceeds the plan's remaining balance ({totalDue - paidSoFar:0.00}).");

                var payment = new StudentPayment
                {
                    Id = Guid.NewGuid(),
                    StudentPaymentPlanId = plan.Id,
                    InstallmentNo = request.InstallmentNo,
                    Amount = request.Amount,
                    PaidDate = request.PaidDate == default ? DateTime.Now : request.PaidDate,
                    PaymentMode = request.PaymentMode,
                    ReferenceNo = request.ReferenceNo,
                    Notes = request.Notes,
                    IsActive = true,
                    CreatedBy = request.UserId,
                    CreatedDate = DateTime.Now
                };
                _dbContext.StudentPayment.Add(payment);
                await _dbContext.SaveChangesAsync();

                // Clear the unpaid-balance flag after full payment. Package exhaustion
                // is checked independently and payment does not grant extra classes.
                if (plan.IsBlocked && (paidSoFar + request.Amount) >= totalDue)
                {
                    plan.IsBlocked = false;
                    plan.BlockedDate = null;
                    plan.BalanceInvoiceNumber = null;
                    plan.ModifiedBy = request.UserId;
                    plan.ModifiedDate = DateTime.Now;
                    await _dbContext.SaveChangesAsync();
                }

                await transaction.CommitAsync();
                return new Response<Guid>(payment.Id, "Payment recorded. This does not add classes to the package.");
            }
            catch (Exception ex)
            {
                return new Response<Guid> { Succeeded = false, Message = ex.Message };
            }
        }

        // Fills the prepaid-plan fields on one invoice subject row (live figures).
        // No active plan for the subject => leaves IsPrepaid = false (monthly billing).
        private async Task ApplyPaymentPlanToInvoiceRowAsync(StudentInvoiceViewModel row)
        {
            if (row.SalesDetailsId == null || row.SalesDetailsId == Guid.Empty)
                return;

            var plan = await _dbContext.StudentPaymentPlan
                .FirstOrDefaultAsync(p => p.SalesDetailsId == row.SalesDetailsId && p.IsActive);
            if (plan == null)
                return;

            // Plan window: [first day of StartMonth/Year .. last day of the PlanMonths-th month].
            var planStart = new DateTime(plan.StartYear, plan.StartMonth, 1);
            var planEnd = planStart.AddMonths(plan.PlanMonths).AddDays(-1);

            // "Through the invoiced month" boundary (defaults to plan end if the invoice has no month).
            var throughMonthEnd = (row.Year.HasValue && row.Month.HasValue)
                ? new DateTime(row.Year.Value, row.Month.Value, 1).AddMonths(1).AddDays(-1)
                : planEnd;

            // Active "Class" rows for this enrollment within a date range.
            async Task<int> CountClassesAsync(DateTime fromDate, DateTime toDate) => await (
                from sh in _dbContext.Schedule
                join sdd in _dbContext.ScheduleDetails on sh.ScheduleId equals sdd.ScheduleId
                where sh.SalesDetailsId == plan.SalesDetailsId
                    && sh.IsActive && sdd.IsActive
                    && sdd.ScheduleType == "Class"
                    && sdd.Date >= fromDate && sdd.Date <= toDate
                select sdd.ScheduleDetailsId
            ).CountAsync();

            var totalClasses = plan.TotalClasses ?? await CountClassesAsync(planStart, planEnd);
            var scheduledSoFar = await CountClassesAsync(planStart, throughMonthEnd);

            var amountPaid = await _dbContext.StudentPayment
                .Where(p => p.StudentPaymentPlanId == plan.Id && p.IsActive)
                .SumAsync(p => (decimal?)p.Amount) ?? 0m;

            // Consume the paid balance in date order to decide this month's outcome.
            // Each month's value = rounded hours (ceil per class to 15 min) × per-hour rate.
            var invoiceMonthStart = (row.Year.HasValue && row.Month.HasValue)
                ? new DateTime(row.Year.Value, row.Month.Value, 1)
                : planStart;

            var windowClasses = await (
                from sh in _dbContext.Schedule
                join sdd in _dbContext.ScheduleDetails on sh.ScheduleId equals sdd.ScheduleId
                where sh.SalesDetailsId == plan.SalesDetailsId
                    && sh.IsActive && sdd.IsActive
                    && sdd.ScheduleType == "Class"
                    && sdd.Date >= planStart && sdd.Date <= throughMonthEnd
                select new { sdd.Date, sdd.StartTime, sdd.EndTime }
            ).ToListAsync();

            var rate = row.ParentPayment ?? 0m;
            decimal RoundedHours(IEnumerable<(DateTime Start, DateTime End)> items) =>
                (decimal)items.Sum(c => Math.Ceiling((c.End - c.Start).TotalMinutes / 15.0) * 15) / 60m;

            var priorMonthsClasses = windowClasses
                .Where(c => c.Date < invoiceMonthStart)
                .Select(c => (c.StartTime, c.EndTime));
            var thisMonthClasses = windowClasses
                .Where(c => c.Date >= invoiceMonthStart && c.Date <= throughMonthEnd)
                .Select(c => (c.StartTime, c.EndTime));

            var prevCumulativeValue = RoundedHours(priorMonthsClasses) * rate;
            var thisMonthValue = RoundedHours(thisMonthClasses) * rate;

            var coveredForThisMonth = Math.Max(0m, amountPaid - prevCumulativeValue);
            var dueThisMonth = Math.Max(0m, thisMonthValue - coveredForThisMonth);

            row.IsPrepaid = true;
            row.PlanTotalClasses = totalClasses;
            row.PlanClassesScheduledSoFar = scheduledSoFar;
            row.PlanTotalFee = plan.TotalFee;
            row.PlanAmountPaid = amountPaid;
            row.PlanAmountDueThisMonth = dueThisMonth;
            row.PlanMonthCovered = dueThisMonth <= 0m;
        }

        // Calendar warning flags. Completion/scheduling APIs enforce the same package
        // limits separately; opening historical attendance remains permitted.
        public async Task<List<Guid>> GetBlockedSalesDetailsIdsAsync()
        {
            var plans = await _dbContext.StudentPaymentPlan.AsNoTracking().Where(p => p.IsActive).ToListAsync();
            if (plans.Count == 0) return new List<Guid>();
            var completedIds = await GetClassCompletedStatusIdsAsync();
            var operationIds = completedIds.Union(await GetOpsApprovedStatusIdsAsync()).ToHashSet();
            // Batch usage/payments instead of running several queries for each plan
            // every time any calendar opens.
            var used = await (from plan in _dbContext.StudentPaymentPlan
                              join schedule in _dbContext.Schedule on plan.SalesDetailsId equals schedule.SalesDetailsId
                              join detail in _dbContext.ScheduleDetails on schedule.ScheduleId equals detail.ScheduleId
                              where plan.IsActive && schedule.IsActive && detail.IsActive && detail.ScheduleType == "Class"
                                && detail.Date.Year * 12 + detail.Date.Month >= plan.StartYear * 12 + plan.StartMonth
                                && detail.Date.Year * 12 + detail.Date.Month < plan.StartYear * 12 + plan.StartMonth + plan.PlanMonths
                                && (detail.OperationScheduleStatus.HasValue && operationIds.Contains(detail.OperationScheduleStatus.Value)
                                    || !detail.OperationScheduleStatus.HasValue && detail.TutorScheduleStatus.HasValue && completedIds.Contains(detail.TutorScheduleStatus.Value)
                                    || !detail.OperationScheduleStatus.HasValue && !detail.TutorScheduleStatus.HasValue && detail.Status == "Class Completed")
                              group detail by plan.Id into groupRows
                              select new { Id = groupRows.Key, Count = groupRows.Count() }).ToDictionaryAsync(p => p.Id, p => p.Count);
            var planIds = plans.Select(p => p.Id).ToList();
            var extras = await _dbContext.PrepaidClassCharge.Where(c => planIds.Contains(c.StudentPaymentPlanId))
                .GroupBy(c => c.StudentPaymentPlanId).Select(g => new { Id = g.Key, Amount = g.Sum(c => c.Amount) })
                .ToDictionaryAsync(p => p.Id, p => p.Amount);
            var payments = await _dbContext.StudentPayment.Where(p => p.IsActive && planIds.Contains(p.StudentPaymentPlanId))
                .GroupBy(p => p.StudentPaymentPlanId).Select(g => new { Id = g.Key, Amount = g.Sum(p => p.Amount) })
                .ToDictionaryAsync(p => p.Id, p => p.Amount);
            return plans.Where(plan => plan.IsBlocked || !string.IsNullOrWhiteSpace(plan.UpfrontInvoiceNumber) &&
                (!plan.TotalClasses.HasValue || plan.TotalClasses <= 0
                 || used.GetValueOrDefault(plan.Id) >= plan.TotalClasses
                 || extras.GetValueOrDefault(plan.Id) > 0 && payments.GetValueOrDefault(plan.Id) < plan.TotalFee + extras.GetValueOrDefault(plan.Id)))
                .Select(p => p.SalesDetailsId).Distinct().ToList();
        }

        // Type_Code ids that mean a class was cancelled (not just postponed/rescheduled).
        private async Task<List<Guid>> GetCancelledStatusIdsAsync()
        {
            return await _dbContext.Type_Code
                .Where(t => t.TypeCodeValue == 1009002   // Class Cancelled
                         || t.TypeCodeValue == 1009003   // Cancelled - student not available
                         || t.TypeCodeValue == 1009007)  // Cancelled - tutor not available
                .Select(t => t.Id)
                .ToListAsync();
        }

        // Prepaid v2 — Phase 3: fill the monthly statement figures on one invoice subject row (live).
        // No-op unless the row has an active plan and a month/year (i.e. an "Statement" invoice row).
        private async Task ApplyStatementMetricsAsync(StudentInvoiceViewModel row)
        {
            if (row.SalesDetailsId == null || row.SalesDetailsId == Guid.Empty) return;
            if (!row.Year.HasValue || !row.Month.HasValue) return;

            var plan = await _dbContext.StudentPaymentPlan
                .FirstOrDefaultAsync(p => p.SalesDetailsId == row.SalesDetailsId && p.IsActive);
            if (plan == null) return;

            var rate = row.ParentPayment ?? 0m;

            var planStart = new DateTime(plan.StartYear, plan.StartMonth, 1);
            var planEnd = planStart.AddMonths(plan.PlanMonths).AddDays(-1);
            var monthStart = new DateTime(row.Year.Value, row.Month.Value, 1);
            var monthEnd = monthStart.AddMonths(1).AddDays(-1);
            var prevStart = monthStart.AddMonths(-1);
            var prevEnd = monthStart.AddDays(-1);

            async Task<int> CountClassAsync(DateTime fromDate, DateTime toDate) => await (
                from sh in _dbContext.Schedule
                join sdd in _dbContext.ScheduleDetails on sh.ScheduleId equals sdd.ScheduleId
                where sh.SalesDetailsId == plan.SalesDetailsId
                    && sh.IsActive && sdd.IsActive && sdd.ScheduleType == "Class"
                    && sdd.Date >= fromDate && sdd.Date <= toDate
                select sdd.ScheduleDetailsId
            ).CountAsync();

            var thisMonthScheduled = await CountClassAsync(monthStart, monthEnd);

            var cancelledIds = await GetCancelledStatusIdsAsync();
            var prevMonthCancelled = await (
                from sh in _dbContext.Schedule
                join sdd in _dbContext.ScheduleDetails on sh.ScheduleId equals sdd.ScheduleId
                where sh.SalesDetailsId == plan.SalesDetailsId
                    && sh.IsActive && sdd.IsActive && sdd.ScheduleType == "Class"
                    && sdd.Date >= prevStart && sdd.Date <= prevEnd
                    && sdd.TutorScheduleStatus != null && cancelledIds.Contains(sdd.TutorScheduleStatus.Value)
                select sdd.ScheduleDetailsId
            ).CountAsync();

            // Completed classes (credit consumers) across the plan, through the statement month.
            var completedThroughMonth = await (
                from sh in _dbContext.Schedule
                join sdd in _dbContext.ScheduleDetails on sh.ScheduleId equals sdd.ScheduleId
                where sh.SalesDetailsId == plan.SalesDetailsId
                    && sh.IsActive && sdd.IsActive && sdd.ScheduleType == "Class"
                    && sdd.Status == "Class Completed"
                    && sdd.Date >= planStart && sdd.Date <= monthEnd
                select new { sdd.StartTime, sdd.EndTime }
            ).ToListAsync();

            var totalCompleted = completedThroughMonth.Count;
            var completedValue = (decimal)completedThroughMonth
                .Sum(c => Math.Ceiling((c.EndTime - c.StartTime).TotalMinutes / 15.0) * 15) / 60m * rate;

            var totalClasses = plan.TotalClasses ?? await CountClassAsync(planStart, planEnd);

            var amountPaid = await _dbContext.StudentPayment
                .Where(p => p.StudentPaymentPlanId == plan.Id && p.IsActive)
                .SumAsync(p => (decimal?)p.Amount) ?? 0m;

            row.StmtThisMonthScheduled = thisMonthScheduled;
            row.StmtPrevMonthCancelled = prevMonthCancelled;
            row.StmtTotalCompleted = totalCompleted;
            row.StmtTotalPending = Math.Max(0, totalClasses - totalCompleted);
            row.StmtAmountPaid = amountPaid;
            row.StmtPendingAmount = Math.Max(0m, completedValue - amountPaid);
        }

        // Active plan (with running paid total and receipts) for one subject enrollment, or null.
        public async Task<PaymentPlanSummaryDto?> GetPaymentPlanBySalesDetailsIdAsync(Guid salesDetailsId)
        {
            var plan = await _dbContext.StudentPaymentPlan
                .FirstOrDefaultAsync(p => p.SalesDetailsId == salesDetailsId && p.IsActive);
            if (plan == null) return null;
            return await BuildPlanSummaryAsync(plan);
        }

        // All active plans for a student (one per subject).
        public async Task<List<PaymentPlanSummaryDto>> GetPaymentPlansByStudentIdAsync(Guid studentId)
        {
            var plans = await _dbContext.StudentPaymentPlan
                .Where(p => p.StudentId == studentId && p.IsActive)
                .ToListAsync();

            var result = new List<PaymentPlanSummaryDto>();
            foreach (var plan in plans)
                result.Add(await BuildPlanSummaryAsync(plan));
            return result;
        }

        private async Task<PaymentPlanSummaryDto> BuildPlanSummaryAsync(StudentPaymentPlan plan)
        {
            var payments = await _dbContext.StudentPayment
                .Where(p => p.StudentPaymentPlanId == plan.Id && p.IsActive)
                .OrderBy(p => p.PaidDate)
                .ToListAsync();

            var subjectName = await (
                from sd in _dbContext.SalesDetails
                join tc in _dbContext.Type_Code on sd.SubjectId equals tc.Id
                where sd.Id == plan.SalesDetailsId
                select tc.TypeCodeName
            ).FirstOrDefaultAsync();

            var paid = payments.Sum(p => p.Amount);
            var extraCharges = await GetPackageExtraChargesAsync(plan.Id);
            var completed = string.IsNullOrWhiteSpace(plan.UpfrontInvoiceNumber) ? 0 : (await GetPackageCompletedClassesAsync(plan)).Count;
            return new PaymentPlanSummaryDto
            {
                Id = plan.Id,
                SalesDetailsId = plan.SalesDetailsId,
                StudentId = plan.StudentId,
                Subject = subjectName,
                UpfrontInvoiceNumber = plan.UpfrontInvoiceNumber,
                IsLocked = !string.IsNullOrWhiteSpace(plan.UpfrontInvoiceNumber),
                PlanMonths = plan.PlanMonths,
                StartMonth = plan.StartMonth,
                StartYear = plan.StartYear,
                TotalClasses = plan.TotalClasses,
                TotalFee = plan.TotalFee,
                ExtraClassCharges = extraCharges,
                CompletedClasses = completed,
                RemainingClasses = Math.Max(0, (plan.TotalClasses ?? 0) - completed),
                InstallmentCount = plan.InstallmentCount,
                AmountPaid = paid,
                RemainingAmount = Math.Max(0, plan.TotalFee + extraCharges - paid),
                IsBlocked = await GetPackageBlockReasonAsync(plan) != null,
                BlockedDate = plan.BlockedDate,
                BalanceInvoiceNumber = plan.BalanceInvoiceNumber,
                Payments = payments.Select(p => new PaymentDto
                {
                    Id = p.Id,
                    InstallmentNo = p.InstallmentNo,
                    Amount = p.Amount,
                    PaidDate = p.PaidDate,
                    PaymentMode = p.PaymentMode,
                    ReferenceNo = p.ReferenceNo,
                    Notes = p.Notes
                }).ToList()
            };
        }

    }
}

