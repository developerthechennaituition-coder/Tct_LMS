using Common;
using DocumentFormat.OpenXml.InkML;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.VisualBasic;
using System.Threading.Tasks;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Domain;
using TCT.LMS.Domain.Entities;
using TCT.LMS.Domain.Enums;
using TCT.LMS.DTOs.DocStorage;
using TCT.LMS.DTOs.Invoice;
using TCT.LMS.DTOs.Sales;
using TCT.LMS.DTOs.User;
using TCT.LMS.DTOs.Wrappers;

namespace TCT.LMS.Application.Services;

public class SalesService : ISalesService
{
    private readonly ISalesRepository _salesRepository;
    private readonly INotesRepository _notesRepository;
    private readonly INotificationService _notificationService;
    private readonly IDocumentService _documentService;
    private readonly IMasterDetailRepository _masterDetailRepository;
    private readonly IChatGroupRepository _chatGroupRepository;
    private readonly ISalesDetailsRepository _salesDetailsRepository;
    private readonly IGroupMemberRepository _groupMemberRepository;
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly ILogger<SalesService> _logger;
    public SalesService(ISalesRepository salesRepository, INotificationService notificationService,
                                INotesRepository notesRepository, IDocumentService documentService,
                                IMasterDetailRepository masterDetailRepository,
                                IChatGroupRepository chatGroupRepository,
                                ISalesDetailsRepository salesDetailsRepository, IGroupMemberRepository groupMemberRepository,
                                IServiceScopeFactory serviceScopeFactory, ILogger<SalesService> logger)
    {
        _salesRepository = salesRepository;
        _notificationService = notificationService;
        _notesRepository = notesRepository;
        _documentService = documentService;
        _masterDetailRepository = masterDetailRepository;
        _chatGroupRepository = chatGroupRepository;
        _salesDetailsRepository = salesDetailsRepository;
        _groupMemberRepository = groupMemberRepository;
        _serviceScopeFactory = serviceScopeFactory;
        _logger = logger;
    }
    public async Task<IEnumerable<Sales>> GetAllSales(bool hideIsActive, bool hideIsPrimary)
    {
        return await _salesRepository.GetAllSales(hideIsActive, hideIsPrimary);
    }
    public async Task<SalesRequestDto> GetSalesById(Guid id)
    {
        return await _salesRepository.GetSalesById(id);
    }
    public async Task<SalesRequestDto> CreateSales(SalesRequestDto salesModel)
    {
        var gradeMapping = await _masterDetailRepository.GetByIdAsync(salesModel.GradeId.Value);
        salesModel.GradeGroupId = gradeMapping.MappingId;
        var result = await _salesRepository.CreateSales(salesModel);
        if (result.Student.Id != Guid.Empty)
        {
            // Fire-and-forget: notifications (including SMTP) run in a background scope so
            // the API response returns immediately. A new DI scope is created so that the
            // background work is not affected by the current request's scope being disposed.
            var studentId = result.Student.Id.Value;
            _ = Task.Run(async () =>
            {
                using var scope = _serviceScopeFactory.CreateScope();
                var notificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();
                try
                {
                    await notificationService.AddNotifications(studentId, Domain.NotificationType.SalesCreate);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Background SalesCreate notification failed for student {StudentId}.", studentId);
                }
            });
             
            if (salesModel.Files?.Count > 0 && result.Student.UserId.HasValue)
            {
                var typeCode = await _masterDetailRepository.GetTypeCodeByShortCode(2);
                var audioFiles = salesModel.Files.Where(file =>
                    Path.GetExtension(file.FileName).Equals(".mp3", StringComparison.OrdinalIgnoreCase)
                    || Path.GetExtension(file.FileName).Equals(".m4a", StringComparison.OrdinalIgnoreCase)).ToList();
                var supportingFiles = salesModel.Files.Except(audioFiles).ToList();

                if (supportingFiles.Count > 0)
                {
                    await _documentService.CreateDocument(new DocumentStorageDto
                    {
                        Files = supportingFiles,
                        Document = new DocumentDto
                        {
                            DocumentName = typeCode.TypeCodeName,
                            DocumentTypeId = typeCode.Id,
                            DocumentDescription = typeCode.TypeCodeDescription,
                            UserId = result.Student.UserId.Value,
                            ReferenceId = result.Id
                        }
                    });
                }

                if (audioFiles.Count > 0)
                {
                    await _documentService.CreateDocument(new DocumentStorageDto
                    {
                        Files = audioFiles,
                        Document = new DocumentDto
                        {
                            DocumentName = "Instruction",
                            DocumentTypeId = typeCode.Id,
                            DocumentDescription = "Instructions to coordinator (audio)",
                            UserId = result.Student.UserId.Value,
                            ReferenceId = result.Id
                        }
                    });
                }
            }

            if (!string.IsNullOrEmpty(salesModel.Student.EmailAddress) && !string.IsNullOrEmpty(result.Student.GeneratedPassword))
            {
                var toEmail = result.Student.EmailAddress;
                var studentName = $"{result.Student.FirstName} {result.Student.LastName}";
                var generatedPassword = result.Student.GeneratedPassword;
                _ = Task.Run(async () =>
                {
                    using var scope = _serviceScopeFactory.CreateScope();
                    var notificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();
                    try
                    {
                        await notificationService.SendNotificationAsync(new MailMessage
                        {
                            Link = string.Empty,
                            FromEmail = "noreply@tct.com",
                            ToEmail = toEmail,
                            Name = studentName,
                            Password = generatedPassword,
                            MessageType = MessageType.Registration,
                            Subject = "Welcome to The Chennai Tuition Learning Management System!"
                        }, CommunicationType.Email);

                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Background student welcome email failed for {Email}.", toEmail);
                    }
                });
            }
        }
        return result;
    }

    public async Task<SalesMinimalRequestDTO> CreateSalesWithMinimalDetails(SalesMinimalRequestDTO salesModel)
    {
        //var result = await _salesRepository.CreateSales(salesModel);
        //if (result.Student.Id != Guid.Empty)
        //{
        //    await _notificationService.AddNotifications(result.Student.Id.Value, Domain.NotificationType.SalesCreate);
        //    var message = new MailMessage
        //    {
        //        Link = string.Empty,
        //        FromEmail = "noreply@tct.com",
        //        ToEmail = result.Student.EmailAddress,
        //        Name = $"{result.Student.FirstName} {result.Student.LastName}",
        //        MessageType = MessageType.Registration,
        //        Subject = "Welcome to The Chennai Tuition Learning Management System!"
        //    };
        //    _notificationService.SendNotificationAsync(message, CommunicationType.Email);
        //}
        return new SalesMinimalRequestDTO(); //result;
    }
    public async Task UpdateSales(Guid id, SalesRequestDto salesDto)
    {
        await _salesRepository.UpdateSales(id, salesDto);
    }

    public async Task DeleteSales(Guid id)
    {
        await _salesRepository.DeleteSales(id);
    }
    public async Task<IEnumerable<EnrolledCourse>> GetEnrolledCousesById(Guid studentId)
    {
        var result = await _salesRepository.GetEnrolledCousesById(studentId);
        return result;
    }
    public async Task<Response<Guid>> EnrollCouse(SalesDetailsRequestDto input)
    {
        Response<Guid> response = new Response<Guid>();
        try
        {
            var isExist = _salesRepository.IsCourseAlreadyEnrolled(input.SubjectId, input.StudentId.Value);
            if (isExist)
            {
                response.Succeeded = false;
                response.Message = "This course is already enrolled";
                return response;
            }
            var result = await _salesRepository.EnrollCouse(input);

            response.Succeeded = true;
        }
        catch
        {
            throw;
        }
        return response;
    }
    public Response<bool> DeleteCourse(Guid detailsId)
    {
        return _salesRepository.DeleteCourse(detailsId);
    }

    public async Task<Response<SalesDetailsUpdateResponsDto>> UpdateStudentDropout(UpdateSalesDetailsDTO input)
    {
        Response<SalesDetailsUpdateResponsDto> response = new Response<SalesDetailsUpdateResponsDto>();
        var result = await _salesRepository.UpdateSalesDetailsStatus(input);
        if (!string.IsNullOrEmpty(input.NoteText))
        {
            if (result.Succeeded)
            {
                await _notesRepository.AddNote(new TCTNotes()
                {
                    NoteText = input.NoteText,
                    ReferenceId = result.Data.AllocationId,
                    CreatedBy = input.UserId,
                    UserId = input.UserId,
                    CreatedDate = DateTime.UtcNow,
                    Id = Guid.Empty,
                    ReferenceTypeId = input.DropoutReasonTypeId.Value,
                    IsActive = true
                });
                await _notificationService.AddNotifications(input.SalesId, input.SaleseDetailsId, input.UserId, Domain.NotificationType.DropoutReasonType);
            }
        }
        return response;
    }
    public async Task<Response<SalesDetailsUpdateResponsDto>> UpdateSalesDetailsStatus(UpdateSalesDetailsDTO input)
    {
        var saveTimer = System.Diagnostics.Stopwatch.StartNew();
        var result = await _salesRepository.UpdateSalesDetailsStatus(input);
        _logger.LogInformation("TutorAssignment {SalesDetailsId}: status/allocation persistence took {ElapsedMs}ms; succeeded={Succeeded}",
            input.SaleseDetailsId, saveTimer.ElapsedMilliseconds, result.Succeeded);
        if (result.Succeeded)
        {
            if (!string.IsNullOrEmpty(input.NoteText))
            {
                await _notesRepository.AddNote(new TCTNotes()
                {
                    NoteText = input.NoteText,
                    ReferenceId = input.SaleseDetailsId,
                    CreatedBy = input.UserId,
                    UserId = input.UserId,
                    CreatedDate = DateTime.UtcNow,
                    Id = Guid.Empty,
                    ReferenceTypeId = input.StatusId,
                    IsActive = true
                });

            }
            if (input.Status == (int)FollowUpStatus.DemoPendingTutorAssigned ||
                input.Status == (int)FollowUpStatus.DemoPendingTutorAssignedNotApproved)
            {
                var notificationTimer = System.Diagnostics.Stopwatch.StartNew();
                // An assignment must always reach the Coordinator Admin dashboard,
                // even when a separate payment approval is also required.
                await _notificationService.AddNotifications(input.SalesId, input.SaleseDetailsId,
                    input.UserId, Domain.NotificationType.TutorAssigned);

                if (result.Data.TutorPaymentApprovalId.HasValue)
                {
                    await _notificationService.AddTutorPaymentApprovalNotification(
                        result.Data.TutorPaymentApprovalId.Value, input.UserId);
                }
                _logger.LogInformation("TutorAssignment {SalesDetailsId}: notifications took {ElapsedMs}ms; total save {TotalMs}ms",
                    input.SaleseDetailsId, notificationTimer.ElapsedMilliseconds, saveTimer.ElapsedMilliseconds);
            }
            else if (input.Status == (int)FollowUpStatus.DemoPendingTutorAssignedApproved)
            {
                await _notificationService.AddNotifications(input.SalesId, input.SaleseDetailsId, input.UserId, Domain.NotificationType.ApproveTutorAssignment);
                var studentInfo = await _notificationService.BuildStudentInfoModel(input.SalesId, input.SaleseDetailsId, input.UserId, false, true);
                string groupName = $"{studentInfo.StudentUser.UserCode}-{studentInfo.StudentUser.FirstName}-{studentInfo.Board.TypeCodeName}-{studentInfo.Grade.TypeCodeName}";
                var groupInfo = await _chatGroupRepository.FindAsync(s => s.SubjectId == studentInfo.SalesDetails.SubjectId && s.StudentId == studentInfo.Sales.StudentId && s.BoardId == studentInfo.Sales.BoardId && s.GradeId == studentInfo.Sales.GradeId && s.Active);
                if (groupInfo != null)
                {
                    groupInfo.TutorId = input.TutorId;
                    // Class reminders locate the chat group by enrolment; reused groups
                    // were previously left unlinked, so the reminder was never posted.
                    groupInfo.SalesDetailsId ??= studentInfo.SalesDetails.Id;
                    groupInfo.ModifiedBy = input.UserId;
                    groupInfo.ModifiedDate = DateTime.UtcNow;
                    await _chatGroupRepository.UpdateAsync(groupInfo);
                }
                else
                {
                    var newGroup = await _chatGroupRepository.CreateAsync(new Group()
                    {
                        TutorId = input.TutorId,
                        StudentId = studentInfo.Sales.StudentId,
                        SalesDetailsId = studentInfo.SalesDetails.Id,
                        BoardId = studentInfo.Sales.BoardId,
                        GradeId = studentInfo.Sales.GradeId,
                        SubjectId = studentInfo.SalesDetails.SubjectId,
                        Active = true,
                        Name = groupName,
                        GroupName = studentInfo.Subjects.TypeCodeName,
                        Delivered = "",
                        Channel = false,
                        Theme = "red",
                        ChatTheme = "green",
                        Created = DateTime.UtcNow,
                        Archive = false,
                        Id = Guid.NewGuid(),
                        Unread = false,
                        CreatedBy = input.UserId
                    });
                    var userIds = new List<Guid>();
                    userIds.Add(studentInfo.StudentUser.Id);
                    userIds.Add(studentInfo.TutorUser.Id);
                    userIds.Add(studentInfo.CoordinatorUser.Id);

                    foreach (var role in studentInfo.UserRoles)
                    {
                        userIds.Add(role.UserId);
                    }

                    foreach (var item in userIds)
                    {
                        var _gm = new GroupMember
                        {
                            Id = Guid.NewGuid(),
                            GroupId = newGroup.Id,
                            UserId = item,
                            IsActive = true,
                        };
                        var groupMenber = await _groupMemberRepository.CreateAsync(_gm);
                    }
                }
            }
            else if (input.Status == (int)FollowUpStatus.Reject)
            {
                await _notificationService.AddNotifications(input.SalesId, input.SaleseDetailsId, input.UserId, Domain.NotificationType.RejectTutorAssignment);
            }
            else if (input.Status == (int)FollowUpStatus.LongFollowUp ||
                input.Status == (int)FollowUpStatus.ShortFollowUp ||
                input.Status == (int)FollowUpStatus.SalesFollowUp ||
                input.Status == (int)FollowUpStatus.ParentFollowUp)
            {
                await _notificationService.AddNotifications(input.SalesId, input.SaleseDetailsId, input.UserId, Domain.NotificationType.FollowUpStatus);
            }

        }
        return result;
    }
    public async Task<bool> UpdateSalesDetailsTutorAssignedStatus(SalesDetailsRequestDto salesDetailsDto)
    {
        await _salesRepository.UpdateSalesDetailsTutorAssignedStatus(salesDetailsDto);
        return true;
    }
    public async Task<IEnumerable<EnrolledCourse>> GetCoursesByCoordinatorId(Guid studentId, Guid coordinatorId)
    {
        var result = await _salesRepository.GetCoursesByCoordinatorId(studentId, coordinatorId);
        return result;
    }
    public async Task<List<EnrolledCourse>> GetSubjectList(Guid studentId, Guid coordinatorId)
    {
        var result = await _salesRepository.GetSubjectList(studentId, coordinatorId);
        return result;
    }

    public Response<SalesDetailsDTO> GetSalesDetailsById(Guid salesId, Guid salesDetailsId, Guid scheduleDetailsId, string userRole)
    {
        var result = _salesRepository.GetSalesDetailsById(salesId, salesDetailsId, scheduleDetailsId, userRole);
        return result;
    }

    public async Task<Response<bool>> UpdateStudentInfo(SalesRequestDto salesDto)
    {                                                                                                                                                                                                                                                                                                                                                                   
        return await _salesRepository.UpdateStudentInfo(salesDto);
    }

    public async Task<Response<bool>> UpdateStudentAdditionalInfo(SalesRequestDto salesDto)
    {
        return await _salesRepository.UpdateStudentAdditionalInfo(salesDto);
    }

    public async Task<Response<bool>> UpdateCourse(CourseRequestDto input)
    {
        return await _salesRepository.UpdateCourse(input);
    }
}
