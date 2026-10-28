using ClosedXML;
using Common;
using DocumentFormat.OpenXml.Drawing;
using DocumentFormat.OpenXml.Spreadsheet;
using DocumentFormat.OpenXml.Wordprocessing;
using Microsoft.Extensions.Logging;
using System.Runtime.InteropServices;
using System.Security.Policy;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Domain;
using TCT.LMS.Domain.Entities;
using TCT.LMS.Domain.Enums;
using TCT.LMS.DTOs.Notification;
using TCT.LMS.DTOs.Sales;
using TCT.LMS.DTOs.Schedule;
using TCT.LMS.DTOs.Wrappers;

namespace TCT.LMS.Application.Services;

public class NotificationService : INotificationService
{
    private readonly ICommunicationFactory _factory;
    private readonly INotificationRepository _repository;
    private readonly IStudentRepository _studentRepository;
    private readonly IUserRepository _userRepository;
    private readonly ISalesRepository _salesRepository;
    private readonly IMasterDetailRepository _typeCodeRepository;
    private readonly ISalesDetailsRepository _salesDetailsRepository;
    private readonly IRoleRepository _roleRepository;
    private readonly IUserRoleRepository _userRoleRepository;
    private readonly INotificationDetailsRepository _notificationDetailsRepository;
    private readonly IScheduleRepository _scheduleRepository;
    private readonly IScheduleDetailsRepository _scheduleDetailsRepository;
    private readonly ITutorRepository _tutorRepository;
    private readonly ITutorStudentAllocationRepository _tutorStudentAllocationRepository;
    private readonly ITutorPaymentApprovalRepository _tutorPaymentApprovalRepository;
    private readonly ILogger<NotificationService> _logger;
    public NotificationService(ICommunicationFactory factory, INotificationRepository repository,
        IStudentRepository studentRepository, IUserRepository userRepository, ISalesRepository salesRepository,
        IMasterDetailRepository typeCodeRepository, ISalesDetailsRepository salesDetailsRepository,
        IRoleRepository roleRepository, IUserRoleRepository userRoleRepository,
        INotificationDetailsRepository notificationDetailsRepository,
        IScheduleRepository scheduleRepository,
        IScheduleDetailsRepository scheduleDetailsRepository,
        ITutorRepository tutorRepository,
        ITutorStudentAllocationRepository tutorStudentAllocationRepository,
        ITutorPaymentApprovalRepository tutorPaymentApprovalRepository,
        ILogger<NotificationService> logger)
    {
        _factory = factory;
        _repository = repository;
        _studentRepository = studentRepository;
        _userRepository = userRepository;
        _salesRepository = salesRepository;
        _typeCodeRepository = typeCodeRepository;
        _salesDetailsRepository = salesDetailsRepository;
        _roleRepository = roleRepository;
        _userRoleRepository = userRoleRepository;
        _notificationDetailsRepository = notificationDetailsRepository;
        _scheduleRepository = scheduleRepository;
        _scheduleDetailsRepository = scheduleDetailsRepository;
        _tutorRepository = tutorRepository;
        _tutorStudentAllocationRepository = tutorStudentAllocationRepository;
        _tutorPaymentApprovalRepository = tutorPaymentApprovalRepository;
        _logger = logger;
    }

    public async Task SendNotificationAsync(MailMessage message, CommunicationType type)
    {
        var strategy = _factory.CreateStrategy(type);
        await strategy.SendMessageAsync(message);
    }

    public async Task<bool> SendStudentRegistrationFormIfNeeded(Guid salesDetailsId, Guid requestedBy)
    {
        var salesDetails = await _salesDetailsRepository.FindAsync(d => d.Id == salesDetailsId && d.IsActive);
        if (salesDetails == null)
            throw new InvalidOperationException("Active subject enrollment was not found.");

        var studentInfo = await BuildStudentInfoModel(salesDetails.SalesId, salesDetailsId, requestedBy, false);
        if (await _scheduleRepository.HasCompletedStudentRegistration(studentInfo.Student.Id, salesDetails.SubjectId))
            return false;

        if (string.IsNullOrWhiteSpace(studentInfo.StudentUser?.Email))
            throw new InvalidOperationException("The student has no email address for the registration form.");

        await SendNotificationAsync(new MailMessage
        {
            ToEmail = studentInfo.StudentUser.Email,
            Name = studentInfo.StudentName,
            MessageType = MessageType.StudentRegistrationForm,
            Subject = $"Complete Your Student Registration: {studentInfo.Subjects.TypeCodeName}"
        }, CommunicationType.Email);
        return true;
    }

    public async Task AddNotifications(Guid studentId, NotificationType notificationType)
    {
        if (notificationType == NotificationType.SalesCreate)
        {
            List<int> userRole = new List<int> {
            (int)UserRoleEnum.Admin,
            (int)UserRoleEnum.OperationsAdmin,
            (int)UserRoleEnum.Operations,
            (int)UserRoleEnum.AccountsAdmin,
            (int)UserRoleEnum.Accounts };

            var roles = await _userRoleRepository.FindAll(s => userRole.Contains(s.RoleId));
            var student = await _studentRepository.GetByIdAsync(studentId);
            var _createdByUser = await _userRepository.FindAsync(s => s.Id == student.CreatedBy);
            var user = await _userRepository.GetByIdAsync(student.UserId.Value);
            var sales = await _salesRepository.FindAsync(s => s.StudentId == student.Id);
            var salesDetails = await _salesDetailsRepository.FindAll(s => s.SalesId == sales.Id);
            var _subjects = salesDetails.ToList().Select(s => s.SubjectId);
            var typeCodes = new List<Guid> { student.GradeId, student.BoardId };
            var typeCode = await _typeCodeRepository.FindAll(s => typeCodes.Contains(s.Id));
            var subjects = await _typeCodeRepository.FindAll(s => _subjects.Contains(s.Id));

            #region Add Notifications for Create Sales
            //Notifications for Create Sale
            var notification = new Notification
            {
                Id = Guid.NewGuid(),
                SalesId = sales.Id,
                NotificationType = (int)NotificationType.SalesCreate,
                SalesDetailsId = Guid.Empty,
                Message = $"A new sale has been successfully created for {user.FirstName} {user.LastName} in <b>{typeCode.FirstOrDefault(t => t.Id == student.BoardId)?.TypeCodeName}</b> grade <b>{typeCode.FirstOrDefault(t => t.Id == student.GradeId)?.TypeCodeName}</b> by <b>{_createdByUser?.FullName}</b>",
                CreatedBy = student.CreatedBy,
                CreatedDate = DateTime.UtcNow,
                IsActive = true,
            };
            await _repository.AddNotificationAsync(notification);

            foreach (var item in roles)
            {
                var notificationDetails = new NotificationDetails()
                {
                    Id = Guid.NewGuid(),
                    NotificationId = notification.Id,
                    FromUserId = student.CreatedBy,
                    ToUserId = item.UserId,
                    CreatedBy = student.CreatedBy,
                    CreatedDate = DateTime.UtcNow,
                    IsActive = true,
                    IsRead = false
                };
                await _notificationDetailsRepository.CreateAsync(notificationDetails);
            }
            #endregion

            #region Notifications for course enrollment
            foreach (var item in salesDetails)
            {
                var entrollmentNotifications = new Notification
                {
                    Id = Guid.NewGuid(),
                    SalesId = sales.Id,
                    ScheduleDetailsId = item.Id,
                    NotificationType = (int)NotificationType.AssignTutor,
                    SalesDetailsId = item.Id,
                    Message = $"{user.FirstName} {user.LastName} has been enrolled in  <b>{typeCode.FirstOrDefault(t => t.Id == student.BoardId)?.TypeCodeName}</b> grade <b>{typeCode.FirstOrDefault(t => t.Id == student.GradeId)?.TypeCodeName} <i>{subjects.FirstOrDefault(s => s.Id == item.SubjectId)?.TypeCodeName}</i></b>. Sale recorded by {_createdByUser?.FullName}, Please assign tutor.",
                    CreatedBy = student.CreatedBy,
                    CreatedDate = DateTime.UtcNow,
                    IsActive = true,
                };
                await _repository.AddNotificationAsync(entrollmentNotifications);

                var notificationDetails = new NotificationDetails()
                {
                    Id = Guid.NewGuid(),
                    NotificationId = entrollmentNotifications.Id,
                    FromUserId = student.CreatedBy,
                    ToUserId = item.Coordinator,
                    CreatedBy = student.CreatedBy,
                    CreatedDate = DateTime.UtcNow,
                    IsActive = true,
                    IsRead = false
                };
                await _notificationDetailsRepository.CreateAsync(notificationDetails);
            }
            #endregion

            #region Send Email to Operations/Ownership and Coordinators
            var boardName = typeCode.FirstOrDefault(t => t.Id == student.BoardId)?.TypeCodeName;
            var gradeName = typeCode.FirstOrDefault(t => t.Id == student.GradeId)?.TypeCodeName;

            // Email only the selected Operations user (Sales.Ownership)
            if (sales.Ownership.HasValue && sales.Ownership.Value != Guid.Empty)
            {
                try
                {
                    var opsUser = await _userRepository.GetByIdAsync(sales.Ownership.Value);
                    if (opsUser == null)
                    {
                        _logger.LogWarning("SalesCreate email: ownership user {UserId} not found, skipping.", sales.Ownership.Value);
                    }
                    else if (string.IsNullOrEmpty(opsUser.Email))
                    {
                        _logger.LogWarning("SalesCreate email: ownership user {UserId} ({Name}) has no Email, skipping.", opsUser.Id, opsUser.FullName ?? $"{opsUser.FirstName} {opsUser.LastName}");
                    }
                    else
                    {
                        var opsEmailMessage = new MailMessage
                        {
                            FromEmail = "noreply@tct.com",
                            ToEmail = opsUser.Email,
                            Name = opsUser.FullName ?? $"{opsUser.FirstName} {opsUser.LastName}",
                            Body = $"A new sale has been successfully created for <strong>{user.FirstName} {user.LastName}</strong> in <strong>{boardName}</strong> grade <strong>{gradeName}</strong> by <strong>{_createdByUser?.FullName}</strong>.",
                            MessageType = MessageType.SalesCreated,
                            Subject = $"New Enrolment: {user.FirstName} {user.LastName} ({boardName} - {gradeName})"
                        };
                        _logger.LogInformation("SalesCreate email: sending to ownership/operations user {Email}.", opsUser.Email);
                        await SendNotificationAsync(opsEmailMessage, CommunicationType.Email);
                        _logger.LogInformation("SalesCreate email: sent OK to {Email}.", opsUser.Email);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "SalesCreate email: SMTP failed for ownership user {UserId}.", sales.Ownership.Value);
                }
            }
            else
            {
                _logger.LogWarning("SalesCreate email: no Ownership (Operations) user assigned to this sale, skipping operations email.");
            }

            // Email to Coordinators (one per enrolled course, deduplicated)
            var sentCoordinators = new HashSet<Guid>();
            foreach (var item in salesDetails)
            {
                if (item.Coordinator == Guid.Empty)
                {
                    _logger.LogWarning("SalesCreate email: salesDetail {Id} has no coordinator, skipping.", item.Id);
                    continue;
                }
                if (sentCoordinators.Contains(item.Coordinator)) continue;
                sentCoordinators.Add(item.Coordinator);

                try
                {
                    var coordinatorUser = await _userRepository.GetByIdAsync(item.Coordinator);
                    if (coordinatorUser == null)
                    {
                        _logger.LogWarning("SalesCreate email: coordinator {CoordinatorId} not found, skipping.", item.Coordinator);
                        continue;
                    }
                    if (string.IsNullOrEmpty(coordinatorUser.Email))
                    {
                        _logger.LogWarning("SalesCreate email: coordinator {CoordinatorId} ({Name}) has no Email, skipping.", coordinatorUser.Id, coordinatorUser.FullName ?? $"{coordinatorUser.FirstName} {coordinatorUser.LastName}");
                        continue;
                    }

                    var subjectName = subjects.FirstOrDefault(s => s.Id == item.SubjectId)?.TypeCodeName;
                    var coordEmailMessage = new MailMessage
                    {
                        FromEmail = "noreply@tct.com",
                        ToEmail = coordinatorUser.Email,
                        Name = coordinatorUser.FullName ?? $"{coordinatorUser.FirstName} {coordinatorUser.LastName}",
                        Body = $"<strong>{user.FirstName} {user.LastName}</strong> has been enrolled in <strong>{boardName}</strong> grade <strong>{gradeName}</strong> for <strong>{subjectName}</strong>. Sale recorded by <strong>{_createdByUser?.FullName}</strong>. Please log in to assign a tutor.",
                        MessageType = MessageType.SalesCreated,
                        Subject = $"New Student Enrolled: {user.FirstName} {user.LastName} – {subjectName} ({gradeName})"
                    };
                    _logger.LogInformation("SalesCreate email: sending to coordinator {Email}.", coordinatorUser.Email);
                    await SendNotificationAsync(coordEmailMessage, CommunicationType.Email);
                    _logger.LogInformation("SalesCreate email: sent OK to coordinator {Email}.", coordinatorUser.Email);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "SalesCreate email: SMTP failed for coordinator {CoordinatorId}.", item.Coordinator);
                }
            }
            #endregion
        }
    }

    public async Task<StudentInfoModel> BuildStudentInfoModel(Guid salesId, Guid salesDetailsId, Guid userId, bool addTutor, bool isGroupCreation = false)
    {
        var userRoles = isGroupCreation
            ? new List<int>
            {
            (int)UserRoleEnum.OperationsAdmin,
            (int)UserRoleEnum.Operations,
            (int)UserRoleEnum.Coordinator,
            (int)UserRoleEnum.CoordinatorAdmin,
            (int)UserRoleEnum.Admin
            }
            : new List<int>
            {
            (int)UserRoleEnum.Admin,
            (int)UserRoleEnum.OperationsAdmin,
            (int)UserRoleEnum.Operations,
            (int)UserRoleEnum.AccountsAdmin,
            (int)UserRoleEnum.Accounts
            };

        if (addTutor)
        {
            userRoles.Add((int)UserRoleEnum.Tutor);
        }

        // Initial parallel calls
        var allRoles = await _userRoleRepository.GetAllAsync();
        var sales = await _salesRepository.FindAsync(s => s.Id == salesId);
        if (sales == null)
        {
            _logger.LogError("BuildStudentInfoModel: no Sales record found for SalesId {SalesId}", salesId);
            throw new InvalidOperationException($"Sales record not found for SalesId '{salesId}'.");
        }

        var salesDetails = await _salesDetailsRepository.FindAsync(d => d.Id == salesDetailsId);
        if (salesDetails == null)
        {
            _logger.LogError("BuildStudentInfoModel: no SalesDetails record found for SalesDetailsId {SalesDetailsId}", salesDetailsId);
            throw new InvalidOperationException($"SalesDetails record not found for SalesDetailsId '{salesDetailsId}'.");
        }

        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null)
        {
            _logger.LogError("BuildStudentInfoModel: no User record found for UserId {UserId}", userId);
            throw new InvalidOperationException($"User not found for UserId '{userId}'.");
        }

        if (sales.StudentId is null)
        {
            _logger.LogError("BuildStudentInfoModel: Sales {SalesId} has no StudentId set", salesId);
            throw new InvalidOperationException($"Sales '{salesId}' has no StudentId set.");
        }

        // Second-level parallel calls
        var student = await _studentRepository.GetByIdAsync(sales.StudentId.Value);
        if (student == null)
        {
            _logger.LogError("BuildStudentInfoModel: no Student record found for StudentId {StudentId} (Sales {SalesId})", sales.StudentId.Value, salesId);
            throw new InvalidOperationException($"Student not found for StudentId '{sales.StudentId.Value}'.");
        }

        var coordinatorUser = await _userRepository.GetByIdAsync(salesDetails.Coordinator);
        var tutor = salesDetails.TutorId.HasValue
            ? await _tutorRepository.FindAsync(t => t.Id == salesDetails.TutorId.Value || t.UserId == salesDetails.TutorId.Value)
            : null;

        if (student.UserId is null)
        {
            _logger.LogError("BuildStudentInfoModel: Student {StudentId} has no linked UserId", student.Id);
            throw new InvalidOperationException($"Student '{student.Id}' has no linked UserId.");
        }

        // Third-level parallel calls
        var studentUser = await _userRepository.GetByIdAsync(student.UserId.Value);
        if (studentUser == null)
        {
            _logger.LogError("BuildStudentInfoModel: no User record found for Student's UserId {UserId} (Student {StudentId})", student.UserId.Value, student.Id);
            throw new InvalidOperationException($"User not found for Student's UserId '{student.UserId.Value}'.");
        }
        var status = await _typeCodeRepository.GetByIdAsync(salesDetails.Status);
        var subjects = await _typeCodeRepository.GetByIdAsync(salesDetails.SubjectId);
        var grade = await _typeCodeRepository.GetByIdAsync(sales.GradeId!.Value);
        var board = await _typeCodeRepository.GetByIdAsync(sales.BoardId!.Value);

        var typeCodes = new List<Guid>
            {
                student.GradeId,
                student.BoardId,
                salesDetails.Status
            };

        var typeCode = await _typeCodeRepository.FindAll(s => typeCodes.Contains(s.Id));


        User tutorUser = null;

        if (tutor != null)
        {
            tutorUser = await _userRepository.GetByIdAsync(tutor.UserId);
        }

        var roles = allRoles.Where(r => userRoles.Contains(r.RoleId)).ToList();

        return new StudentInfoModel
        {
            CoordinatorUser = coordinatorUser,
            TutorUser = tutorUser,
            StudentUser = studentUser,
            AllUserRoles = allRoles.ToList(),
            UserRoles = roles,
            Sales = sales,
            SalesDetails = salesDetails,
            Student = student,
            Status = status,
            IsNewStudent = (DateTime.Now - student.CreatedDate).Days < 45,
            User = user,
            StudentName = $"{studentUser.FirstName} {studentUser.LastName}",
            TutorName = tutorUser != null ? $"{tutorUser.FirstName} {tutorUser.LastName}" : string.Empty,
            TutorId = salesDetails.TutorId,
            TypeCode = typeCode.ToList(),
            Subjects = subjects,
            Grade = grade,
            Board = board,
            CreatedBy = user.FullName
        };
    }

    public async Task AddNotifications(Guid salesId, Guid salesDetailsId, Guid userId, NotificationType notificationType,
        decimal? previousTutorPayment = null, decimal? requestedTutorPayment = null)
    {
        StudentInfoModel dataItem = await BuildStudentInfoModel(salesId, salesDetailsId, userId, false);

        if (notificationType == NotificationType.DropoutReasonType)
        {
            var message = $"Student {dataItem.StudentName} has dropped out of the subject {dataItem.Subjects.TypeCodeName} ({dataItem.Grade.TypeCodeName} {dataItem.Board.TypeCodeName} Board) due to a {dataItem.Status.TypeCodeName}.";
            var notification = await CreateNotifications(salesId, salesDetailsId, NotificationType.TutorAssigned, message, userId);
            foreach (var item in dataItem.UserRoles)
            {
                var notificationDetails = await NotificationDetails(notification.Id, item.UserId, userId);
            }
            return;
        }

        if (notificationType == NotificationType.TutorAssigned)
        {
            var assignmentTimer = System.Diagnostics.Stopwatch.StartNew();
            var assignmentEmails = new List<MailMessage>();
            #region Add Notifications for Tutor Assignment
            var paymentApproval = await _tutorPaymentApprovalRepository.FindAsync(p =>
                p.SalesDetailsId == salesDetailsId && p.IsActive && p.ApprovalStatus == (int)TutorPaymentStatus.Pending);
            var oldPayment = previousTutorPayment ?? paymentApproval?.BasePaymentAmount;
            var proposedPayment = requestedTutorPayment ?? paymentApproval?.RequestedPaymentAmount;
            var paymentChange = !oldPayment.HasValue || !proposedPayment.HasValue || oldPayment.Value == proposedPayment.Value
                ? string.Empty
                : $" Tutor payment increase requires Super Admin approval: <b>{oldPayment.Value:0.##}</b> to <b>{proposedPayment.Value:0.##}</b>. Approve to apply the proposed amount; reject to retain the current amount.";
            var msg = $"Tutor <b>{dataItem.TutorName}</b> has been assigned to student <b>{dataItem.StudentName}</b> for {dataItem.Subjects.TypeCodeName}, under <b>{dataItem.TypeCode.FirstOrDefault(t => t.Id == dataItem.Student.BoardId)?.TypeCodeName}</b> grade <b>{dataItem.TypeCode.FirstOrDefault(t => t.Id == dataItem.Student.GradeId)?.TypeCodeName}</b> by {dataItem.CreatedBy}.{paymentChange} Please review and approve.";
            //Coordinator admin has approved Tutor[Tutor Name] for Student[Student Name] under[Board Name], Grade[Grade Name].
            var notification = await CreateNotifications(salesId, salesDetailsId, NotificationType.TutorAssigned, msg, userId);
            var recipientIds = dataItem.UserRoles.Select(r => r.UserId)
                .Concat(dataItem.AllUserRoles
                    .Where(r => r.RoleId == (int)UserRoleEnum.CoordinatorAdmin
                                || r.RoleId == (int)UserRoleEnum.SuperAdmin)
                    .Select(r => r.UserId))
                .Distinct()
                .ToList();
            foreach (var recipientId in recipientIds)
            {
                await NotificationDetails(notification.Id, recipientId, userId);
            }

            var adminRecipientIds = dataItem.AllUserRoles
                .Where(role => role.RoleId == (int)UserRoleEnum.SuperAdmin
                               || role.RoleId == (int)UserRoleEnum.Admin
                               || role.RoleId == (int)UserRoleEnum.CoordinatorAdmin)
                .Select(role => role.UserId)
                .Distinct()
                .ToList();

            foreach (var adminRecipientId in adminRecipientIds)
            {
                var adminUser = await _userRepository.GetByIdAsync(adminRecipientId);
                if (adminUser == null || string.IsNullOrWhiteSpace(adminUser.Email)) continue;

                    assignmentEmails.Add(new MailMessage
                    {
                        FromEmail = "noreply@tct.com",
                        ToEmail = adminUser.Email,
                        Name = adminUser.FullName ?? $"{adminUser.FirstName} {adminUser.LastName}".Trim(),
                        Body = $"Coordinator <strong>{dataItem.CreatedBy}</strong> assigned tutor <strong>{dataItem.TutorName}</strong> to student <strong>{dataItem.StudentName}</strong> for <strong>{dataItem.Subjects.TypeCodeName}</strong> ({dataItem.Grade.TypeCodeName} - {dataItem.Board.TypeCodeName}). Please review the assignment in the LMS dashboard.",
                        MessageType = MessageType.TutorAssigned,
                        Subject = $"Tutor Assignment Review: {dataItem.StudentName} – {dataItem.Subjects.TypeCodeName}"
                    });
            }
            #endregion

            #region Notify tutor
            if (dataItem.TutorId.HasValue && dataItem.TutorUser != null)
            {
                var tutorMsg = $"Dear <b>{dataItem.TutorName}</b>, you have been assigned to student <b>{dataItem.StudentName}</b> for <b>{dataItem.Subjects.TypeCodeName}</b> ({dataItem.Grade.TypeCodeName} - {dataItem.Board.TypeCodeName}). This is pending coordinator admin approval.";
                var tutorNotification = await CreateNotifications(salesId, salesDetailsId, NotificationType.TutorAssigned, tutorMsg, userId);
                await NotificationDetails(tutorNotification.Id, dataItem.TutorUser.Id, userId);

                if (!string.IsNullOrEmpty(dataItem.TutorUser.Email))
                {
                        assignmentEmails.Add(new MailMessage
                        {
                            FromEmail = "noreply@tct.com",
                            ToEmail = dataItem.TutorUser.Email,
                            Name = dataItem.TutorName,
                            Body = $"You have been assigned to student <strong>{dataItem.StudentName}</strong> for <strong>{dataItem.Subjects.TypeCodeName}</strong> ({dataItem.Grade.TypeCodeName} - {dataItem.Board.TypeCodeName}). This is pending coordinator admin approval.",
                            MessageType = MessageType.TutorAssigned,
                            Subject = $"Tutor Assignment: {dataItem.StudentName} – {dataItem.Subjects.TypeCodeName}"
                        });
                }
            }
            #endregion

            #region Add Notifications Ack to logged in user
            var ownerMsg = $"You have successfully assigned <b>{dataItem.TutorName}</b> to student <b>{dataItem.StudentName}</b> for {dataItem.Subjects.TypeCodeName}, under<b>{dataItem.TypeCode.FirstOrDefault(t => t.Id == dataItem.Student.BoardId)?.TypeCodeName}</b>, grade <b>{dataItem.TypeCode.FirstOrDefault(t => t.Id == dataItem.Student.GradeId)?.TypeCodeName}</b>.The assignment is now awaiting coordinator admin approval.";
            var _notification = await CreateNotifications(salesId, salesDetailsId, NotificationType.Acknowledgment, ownerMsg, userId);
            var _notificationDetails = await NotificationDetails(_notification.Id, userId, userId);
            #endregion
            _logger.LogInformation("TutorAssignment {SalesDetailsId}: notification preparation took {ElapsedMs}ms; {EmailCount} email(s)",
                salesDetailsId, assignmentTimer.ElapsedMilliseconds, assignmentEmails.Count);
            assignmentTimer.Restart();
            await AssignmentEmailBatch.SendAsync(assignmentEmails,
                message => SendNotificationAsync(message, CommunicationType.Email),
                (_, ex) => _logger.LogError(ex, "Tutor assignment email failed for enrollment {SalesDetailsId}", salesDetailsId));
            _logger.LogInformation("TutorAssignment {SalesDetailsId}: awaited email batch took {ElapsedMs}ms",
                salesDetailsId, assignmentTimer.ElapsedMilliseconds);
        }
        else if (notificationType == NotificationType.ApproveTutorAssignment || notificationType == NotificationType.RejectTutorAssignment)
        {
            #region Add Notifications for Tutor Approval  
            NotificationType type = NotificationType.ApproveTutorAssignment;
            var msg = $"{dataItem.CreatedBy} has approved the <b>{dataItem.TutorName}</b> for student <b>{dataItem.StudentName}</b> for {dataItem.Subjects.TypeCodeName}, under <b>{dataItem.TypeCode.FirstOrDefault(t => t.Id == dataItem.Student.BoardId)?.TypeCodeName}</b> grade <b>{dataItem.TypeCode.FirstOrDefault(t => t.Id == dataItem.Student.GradeId)?.TypeCodeName}</b>.Please schedule demo/regular class.";
            var ownerMsg = $"You have successfully approved <b>{dataItem.TutorName}</b> for student <b>{dataItem.StudentName}</b> subject {dataItem.Subjects.TypeCodeName}, under<b>{dataItem.TypeCode.FirstOrDefault(t => t.Id == dataItem.Student.BoardId)?.TypeCodeName}</b>, grade <b>{dataItem.TypeCode.FirstOrDefault(t => t.Id == dataItem.Student.GradeId)?.TypeCodeName}</b>.";
            if (notificationType == NotificationType.RejectTutorAssignment)
            {
                type = NotificationType.RejectTutorAssignment;
                msg = $"{dataItem.CreatedBy} has rejected the <b>{dataItem.TutorName}</b> for student <b>{dataItem.StudentName}</b> for {dataItem.Subjects.TypeCodeName}, under <b>{dataItem.TypeCode.FirstOrDefault(t => t.Id == dataItem.Student.BoardId)?.TypeCodeName}</b> grade <b>{dataItem.TypeCode.FirstOrDefault(t => t.Id == dataItem.Student.GradeId)?.TypeCodeName}</b>.";
                ownerMsg = $"You have successfully rejected <b>{dataItem.TutorName}</b> for student <b>{dataItem.StudentName}</b> subject {dataItem.Subjects.TypeCodeName}, under<b>{dataItem.TypeCode.FirstOrDefault(t => t.Id == dataItem.Student.BoardId)?.TypeCodeName}</b>, grade <b>{dataItem.TypeCode.FirstOrDefault(t => t.Id == dataItem.Student.GradeId)?.TypeCodeName}</b>.";
            }
            var notification = await CreateNotifications(salesId, salesDetailsId, type, msg, userId);
            var notificationDetails = await NotificationDetails(notification.Id, dataItem.SalesDetails.Coordinator, userId);
            foreach (var item in dataItem.UserRoles)
            {
                notificationDetails = await NotificationDetails(notification.Id, item.UserId, userId);
            }
            #endregion

            #region Add Notifications to tutor
            if (notificationType == NotificationType.ApproveTutorAssignment && dataItem.TutorUser != null)
            {
                var tutorMessage = $"Dear {dataItem.TutorName}, your assignment to student <b>{dataItem.StudentName}</b> for <b>{dataItem.Subjects.TypeCodeName}</b> ({dataItem.Grade.TypeCodeName} - {dataItem.Board.TypeCodeName}) has been approved. Please prepare for the demo class.";
                var tutorNotify = await CreateNotifications(salesId, salesDetailsId, type, tutorMessage, userId);
                var tutorNotifyDetails = await NotificationDetails(tutorNotify.Id, dataItem.TutorUser.Id, userId);

                if (!string.IsNullOrWhiteSpace(dataItem.TutorUser.Email))
                {
                    try
                    {
                        await SendNotificationAsync(new MailMessage
                        {
                            FromEmail = "noreply@tct.com",
                            ToEmail = dataItem.TutorUser.Email,
                            Name = dataItem.TutorName,
                            Body = $"Your assignment to student <strong>{dataItem.StudentName}</strong> for <strong>{dataItem.Subjects.TypeCodeName}</strong> ({dataItem.Grade.TypeCodeName} - {dataItem.Board.TypeCodeName}) has been approved. Please prepare for the demo class.",
                            MessageType = MessageType.TutorAssigned,
                            Subject = $"Tutor Assignment Approved: {dataItem.StudentName} – {dataItem.Subjects.TypeCodeName}"
                        }, CommunicationType.Email);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex,
                            "Approved tutor assignment email failed for {Email} and SalesDetailsId {SalesDetailsId}.",
                            dataItem.TutorUser.Email, salesDetailsId);
                    }
                }
            }
            #endregion

            #region Add Notifications Ack to logged in user
            var _notification = await CreateNotifications(salesId, salesDetailsId, type, ownerMsg, userId);
            var _notificationDetails = await NotificationDetails(_notification.Id, userId, userId);
            #endregion
        }
        else if (notificationType == NotificationType.FollowUpStatus)
        {
            var followUpStatusList = Enum.GetValues(typeof(FollowUpStatus))
              .Cast<FollowUpStatus>().Select(status => new KeyValuePair<int, string>((int)status, status.ToString())).ToList();

            var statusList = followUpStatusList.ToList();
            var typeCodeData = (from a in statusList
                                join b in dataItem.TypeCode on a.Key equals b.TypeCodeValue
                                select new
                                {
                                    Key = a.Key,
                                    Value = b.TypeCodeName
                                }).FirstOrDefault();

            #region Add Notifications for Tutor Approval  
            NotificationType type = NotificationType.ApproveTutorAssignment;
            var message = $"Student {dataItem.StudentName} follow-up update for  {dataItem.Subjects.TypeCodeName} as of {dataItem.SalesDetails.FollowUpDate} ({typeCodeData.Value}).";
            var notification = await CreateNotifications(salesId, salesDetailsId, type, message, userId);
            var notificationDetails = await NotificationDetails(notification.Id, dataItem.SalesDetails.Coordinator, userId);
            foreach (var item in dataItem.UserRoles)
            {
                notificationDetails = await NotificationDetails(notification.Id, item.UserId, userId);
            }
            #endregion 
        }
        else if (notificationType == NotificationType.DemoAdjustment || notificationType == NotificationType.ClassAdjustment)
        {
            List<int> _roles = new List<int>();

            if (dataItem.IsNewStudent)
            {
                _roles.Add((int)UserRoleEnum.OperationsAdmin);
                _roles.Add((int)UserRoleEnum.Operations);
                dataItem.UserRoles = dataItem.AllUserRoles.Where(s => _roles.Contains(s.RoleId)).ToList();
            }
            else
            {
                _roles.Add((int)UserRoleEnum.CoordinatorAdmin);
                _roles.Add((int)UserRoleEnum.Coordinator);
                //_roles = new List<int>([(int)UserRoleEnum.CoordinatorAdmin, (int)UserRoleEnum.Coordinator]);
                dataItem.UserRoles = dataItem.AllUserRoles.Where(s => _roles.Contains(s.RoleId)).ToList();
            }
            string message = $"You have requested reschedule the class/demo for student:<b>{dataItem.StudentName}</b> subject:<b>{dataItem.Subjects.TypeCodeName} </b>";
            var stdNotification = await CreateNotifications(salesId, salesDetailsId, NotificationType.DemoAdjustment, message, userId);
            var stdNotifi = await NotificationDetails(stdNotification.Id, userId, userId);

            //Ack Notifications
            message = $"{dataItem.User.FirstName} requested reschedule the class/demo for  <b> {dataItem.Subjects.TypeCodeName}</b>.";
            var ackNotification = await CreateNotifications(salesId, salesDetailsId, NotificationType.DemoAdjustment, message, userId);

            foreach (var item in dataItem.UserRoles)
            {
                await NotificationDetails(ackNotification.Id, item.UserId, userId);
            }
        }

    }

    public async Task AddNotifications(Guid salesId, Guid salesDetailsId, Guid userId, NotificationType notificationType, DateTime start, DateTime end, DateTime startTime, DateTime endTime, bool timesAreLocal = false)
    {
        var sales = await _salesDetailsRepository.FindAsync(s => s.Id == salesDetailsId);
        salesId = sales.SalesId;
        StudentInfoModel dataItem = await BuildStudentInfoModel(salesId, salesDetailsId, userId, false);
        if (notificationType == NotificationType.ScheduleDemo)
        {
            var scheduleDate = start;
            DateTime startDateTime = new DateTime(scheduleDate.Year, scheduleDate.Month, scheduleDate.Day, startTime.Hour, startTime.Minute, startTime.Second);
            DateTime endDateTime = new DateTime(scheduleDate.Year, scheduleDate.Month, scheduleDate.Day, endTime.Hour, endTime.Minute, endTime.Second);

            if (!timesAreLocal)
            {
                startDateTime = DateHelper.TCTConvertTimeFromUtc(startDateTime);
                endDateTime = DateHelper.TCTConvertTimeFromUtc(endDateTime);
            }

            string message = $"<b>{dataItem.CreatedBy}</b> has scheduled an subject <b>{dataItem.Subjects.TypeCodeName}</b> demo class for the student <b>{dataItem.StudentName}</b> on {DateTime.Now.ToString("dd-MM-yyyy")}. The session will take place on {start.ToString("dd-MM-yyyy")} from <i>{startDateTime.ToString("hh:mm tt")}</i> to <i>{endDateTime.ToString("hh:mm tt")}</i>.";
            string stdMessage = $"<b>{dataItem.StudentName}</b>, your subject <b>{dataItem.Subjects.TypeCodeName}</b> demo is scheduled by <b><i>{dataItem.CreatedBy}</b></i> on {DateTime.Now.ToString("dd-MM-yyyy")}. Be ready on <i>{start.ToString("dd-MM-yyyy")}</i> from <i>{startDateTime.ToString("hh:mm tt")} - {endDateTime.ToString("hh:mm tt")}</i>.";

            //Admin notifications
            var notification = await CreateNotifications(salesId, salesDetailsId, NotificationType.ScheduleDemo, message, userId);
            foreach (var item in dataItem.UserRoles)
            {
                var notificationDetails1 = await NotificationDetails(notification.Id, item.UserId, userId);
            }
            //Tutor notifications
            if (dataItem.TutorUser != null)
            {
                await NotificationDetails(notification.Id, dataItem.TutorUser.Id, userId);

                if (!string.IsNullOrEmpty(dataItem.TutorUser.Email))
                {
                    string tutorEmailBody = $"A demo class for <strong>{dataItem.StudentName}</strong> has been scheduled for subject <strong>{dataItem.Subjects.TypeCodeName}</strong> on <strong>{start:dd-MM-yyyy}</strong> from <strong>{startDateTime:hh:mm tt}</strong> to <strong>{endDateTime:hh:mm tt}</strong>. Please be prepared for the session.";
                    await SendNotificationAsync(new MailMessage
                    {
                        FromEmail = "noreply@tct.com",
                        ToEmail = dataItem.TutorUser.Email,
                        Name = dataItem.TutorName,
                        Body = tutorEmailBody,
                        MessageType = MessageType.ScheduleDemo,
                        Subject = $"Demo Scheduled: {dataItem.StudentName} – {dataItem.Subjects.TypeCodeName}"
                    }, CommunicationType.Email);
                }
            }

            //Student Notifications
            var stdNotification = await CreateNotifications(salesId, salesDetailsId, NotificationType.ScheduleDemo, stdMessage, userId);
            if (dataItem.StudentUser != null)
            {
                var stdNotifi = await NotificationDetails(stdNotification.Id, dataItem.StudentUser.Id, userId);
            }

            if (dataItem.StudentUser != null && !string.IsNullOrEmpty(dataItem.StudentUser.Email))
            {
                await SendNotificationAsync(new MailMessage
                {
                    FromEmail = "noreply@tct.com",
                    ToEmail = dataItem.StudentUser.Email,
                    Name = dataItem.StudentName,
                    Body = stdMessage,
                    MessageType = MessageType.ScheduleDemo,
                    Subject = $"Your Demo is Scheduled: {dataItem.Subjects.TypeCodeName}"
                }, CommunicationType.Email);
            }

            //Ack Notifications
            message = $"You have been successfully scheduled an <b> {dataItem.Subjects.TypeCodeName} demo</b> session for the student <b>{dataItem.StudentName}</b> on {DateTime.Now.ToString("dd-MM-yyyy")}. The session will take place on <b>{start.ToString("dd-MM-yyyy")}</b> from <b>{startDateTime.ToString("hh:mm tt")} to {endDateTime.ToString("hh:mm tt")}</b>.";
            var ackNotification = await CreateNotifications(salesId, salesDetailsId, NotificationType.ScheduleDemo, message, userId);
            var ackNotifi = await NotificationDetails(ackNotification.Id, userId, userId);
        }
        else if (notificationType == NotificationType.ScheduleClass)
        {
            var scheduleDate = start;
            //DateTime startDateTime = new DateTime(scheduleDate.Year, scheduleDate.MonthName, scheduleDate.Day, startTime.Hour, startTime.Minute, startTime.Second);
            //DateTime endDateTime = new DateTime(scheduleDate.Year, scheduleDate.MonthName, scheduleDate.Day, endTime.Hour, endTime.Minute, endTime.Second);

            //startDateTime = DateHelper.TCTConvertTimeFromUtc(startDateTime);
            //endDateTime = DateHelper.TCTConvertTimeFromUtc(endDateTime);

            string message = $"<b>{dataItem.CreatedBy}</b> has scheduled an subject <b>{dataItem.Subjects.TypeCodeName}</b> regular class for the student <b>{dataItem.StudentName}</b> on {DateTime.Now.ToString("dd-MM-yyyy")}";// The session will take place on {start.ToString("dd-MM-yyyy")} from <i>{startDateTime.ToString("hh:mm tt")}</i> to <i>{endDateTime.ToString("hh:mm tt")}</i>.";
            string stdMessage = $"<b>{dataItem.StudentName}</b>, your subject <b>{dataItem.Subjects.TypeCodeName}</b> class is scheduled by <b><i>{dataItem.CreatedBy}</b></i> on {DateTime.Now.ToString("dd-MM-yyyy")}.";// Be ready on <i>{start.ToString("dd-MM-yyyy")}</i> from <i>{startDateTime.ToString("hh:mm tt")} - {endDateTime.ToString("hh:mm tt")}</i>.";

            //Admin notifications
            var notification = await CreateNotifications(salesId, salesDetailsId, NotificationType.ScheduleClass, message, userId);
            foreach (var item in dataItem.UserRoles)
            {
                var notificationDetails1 = await NotificationDetails(notification.Id, item.UserId, userId);
            }
            //Tutor notifications
            if (dataItem.TutorUser != null)
            {
                await NotificationDetails(notification.Id, dataItem.TutorUser.Id, userId);
            }

            //Student Notifications
            var stdNotification = await CreateNotifications(salesId, salesDetailsId, NotificationType.ScheduleClass, stdMessage, userId);
            if (dataItem.StudentUser != null)
            {
                var stdNotifi = await NotificationDetails(stdNotification.Id, dataItem.StudentUser.Id, userId);
            }

            //Ack Notifications
            message = $"You have been successfully scheduled an <b> {dataItem.Subjects.TypeCodeName} class</b> for the student <b>{dataItem.StudentName}</b> on {DateTime.Now.ToString("dd-MM-yyyy")}.";// The session will take place on <b>{start.ToString("dd-MM-yyyy")}</b> from <b>{startDateTime.ToString("hh:mm tt")} to {endDateTime.ToString("hh:mm tt")}</b>.";
            var ackNotification = await CreateNotifications(salesId, salesDetailsId, NotificationType.ScheduleClass, message, userId);
            var ackNotifi = await NotificationDetails(ackNotification.Id, userId, userId);
        }
    }

    public async Task AddAttendanceSubmittedNotifications(Guid salesDetailsId, Guid submittedByUserId, string guestType)
    {
        var isTutor = string.Equals(guestType, "tutor", StringComparison.OrdinalIgnoreCase);
        var isStudent = string.Equals(guestType, "student", StringComparison.OrdinalIgnoreCase);
        if (!isTutor && !isStudent)
        {
            // Operations (or any other guest type) submitting attendance needs no notification.
            return;
        }

        var salesDetails = await _salesDetailsRepository.FindAsync(d => d.Id == salesDetailsId);
        if (salesDetails == null)
        {
            return;
        }

        StudentInfoModel dataItem = await BuildStudentInfoModel(salesDetails.SalesId, salesDetailsId, submittedByUserId, addTutor: true);
        var subjectName = dataItem.Subjects?.TypeCodeName;
        var dateStr = DateTime.Now.ToString("dd-MM-yyyy");

        var recipients = new Dictionary<Guid, string>();
        string broadcastMessage;

        if (isTutor)
        {
            broadcastMessage = $"Tutor <b>{dataItem.TutorName}</b> has submitted attendance for student <b>{dataItem.StudentName}</b>'s subject <b>{subjectName}</b> class on {dateStr}.";
            if (dataItem.StudentUser != null)
            {
                recipients[dataItem.StudentUser.Id] = $"Your subject <b>{subjectName}</b> class attendance has been submitted by tutor <b>{dataItem.TutorName}</b> on {dateStr}.";
            }
        }
        else
        {
            broadcastMessage = $"Student <b>{dataItem.StudentName}</b> has submitted attendance for subject <b>{subjectName}</b> class on {dateStr}.";
            if (dataItem.TutorUser != null)
            {
                recipients[dataItem.TutorUser.Id] = broadcastMessage;
            }
        }

        if (dataItem.CoordinatorUser != null)
        {
            recipients[dataItem.CoordinatorUser.Id] = broadcastMessage;
        }

        if (dataItem.Sales?.Ownership != null && dataItem.Sales.Ownership != Guid.Empty)
        {
            var opsUser = await _userRepository.GetByIdAsync(dataItem.Sales.Ownership.Value);
            if (opsUser != null)
            {
                recipients[opsUser.Id] = broadcastMessage;
            }
        }

        foreach (var (toUserId, message) in recipients)
        {
            var notification = await CreateNotifications(salesDetails.SalesId, salesDetailsId, NotificationType.AttendanceSubmitted, message, submittedByUserId);
            await NotificationDetails(notification.Id, toUserId, submittedByUserId);
        }
    }

    // The month's classes for one student's subject reached the "ClassCompletionAlertPercent" threshold:
    // tell every Accounts and Accounts Admin user, so next month's invoice can be prepared.
    // ScheduleDetailsId is the class whose completion crossed the threshold (it fixes the month).
    public async Task AddClassCompletionThresholdNotification(MonthlyClassCompletionDto completion, decimal thresholdPercent,
        Guid scheduleDetailsId, Guid actingUserId)
    {
        var dataItem = await BuildStudentInfoModel(completion.SalesId, completion.SalesDetailsId, actingUserId, addTutor: true);
        var roleIds = new[] { (int)UserRoleEnum.AccountsAdmin, (int)UserRoleEnum.Accounts };
        var recipientIds = dataItem.AllUserRoles.Where(r => r.IsActive && roleIds.Contains(r.RoleId))
            .Select(r => r.UserId).Where(id => id != Guid.Empty).ToHashSet();
        if (recipientIds.Count == 0) return;

        var subjectName = dataItem.Subjects?.TypeCodeName ?? "Class";
        var monthText = new DateTime(completion.Year, completion.Month, 1).ToString("MMMM yyyy");
        var percent = completion.TotalClasses == 0 ? 0 : completion.CompletedClasses * 100 / completion.TotalClasses;
        var message = $"<b>{dataItem.StudentName}</b>'s <b>{subjectName}</b> classes for <b>{monthText}</b> are " +
                      $"<b>{percent}%</b> completed ({completion.CompletedClasses} of {completion.TotalClasses} classes, " +
                      $"threshold {thresholdPercent:0.##}%). Please prepare the next invoice.";

        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            SalesId = completion.SalesId,
            SalesDetailsId = completion.SalesDetailsId,
            ScheduleDetailsId = scheduleDetailsId,
            NotificationType = (int)NotificationType.ClassCompletionThreshold,
            Message = message,
            CreatedBy = actingUserId,
            CreatedDate = DateTime.UtcNow,
            IsActive = true,
        };
        await _repository.AddNotificationAsync(notification);
        foreach (var userId in recipientIds)
            await NotificationDetails(notification.Id, userId, actingUserId);
    }

    // A tutor or student set a class to "Request for Re-schedule": tell Operations, who arrange the
    // new time. Recipients: every Operations and Operations Admin user, plus the enrolment's owner.
    // The notification links to the class (ScheduleDetailsId).
    public async Task AddRescheduleRequestNotifications(Guid salesDetailsId, Guid scheduleDetailsId, Guid requestedByUserId,
        string guestType, string? noteText, string? rescheduleType = null)
    {
        var isTutor = string.Equals(guestType, "tutor", StringComparison.OrdinalIgnoreCase);
        var isStudent = string.Equals(guestType, "student", StringComparison.OrdinalIgnoreCase);
        if (!isTutor && !isStudent) return;

        var salesDetails = await _salesDetailsRepository.FindAsync(d => d.Id == salesDetailsId);
        if (salesDetails == null) return;
        var classDetails = await _scheduleDetailsRepository.FindAsync(d => d.ScheduleDetailsId == scheduleDetailsId);
        var dataItem = await BuildStudentInfoModel(salesDetails.SalesId, salesDetailsId, requestedByUserId, addTutor: true);

        var recipientIds = new HashSet<Guid>();
        var owner = dataItem.Sales?.Ownership;
        if (owner.HasValue && owner.Value != Guid.Empty) recipientIds.Add(owner.Value);
        var roleIds = new[] { (int)UserRoleEnum.OperationsAdmin, (int)UserRoleEnum.Operations };
        foreach (var role in dataItem.AllUserRoles.Where(r => r.IsActive && roleIds.Contains(r.RoleId)))
            recipientIds.Add(role.UserId);
        recipientIds.Remove(Guid.Empty);
        recipientIds.Remove(requestedByUserId);
        if (recipientIds.Count == 0) return;

        // ScheduleDetails times are stored as TCT local (India) time.
        var subjectName = dataItem.Subjects?.TypeCodeName ?? "Class";
        var requester = isTutor ? $"Tutor <b>{dataItem.TutorName}</b>" : $"Student <b>{dataItem.StudentName}</b>";
        var classText = classDetails == null ? ""
            : $" on <b>{classDetails.StartTime:dd MMM yyyy}</b> at <b>{classDetails.StartTime:h:mm tt} - {classDetails.EndTime:h:mm tt}</b>";
        var temporary = string.Equals(rescheduleType, "Temporary", StringComparison.OrdinalIgnoreCase) ? " (temporary - this class only)" : "";
        var message = $"{requester} has requested to re-schedule <b>{dataItem.StudentName}</b>'s <b>{subjectName}</b> class " +
                      $"with tutor <b>{dataItem.TutorName}</b>{classText}{temporary}. Please arrange a new time.";
        if (!string.IsNullOrWhiteSpace(noteText))
            message += $" Comment: {System.Net.WebUtility.HtmlEncode(noteText.Trim()).Replace("\n", "<br/>")}";

        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            SalesId = salesDetails.SalesId,
            SalesDetailsId = salesDetailsId,
            ScheduleDetailsId = scheduleDetailsId,
            NotificationType = (int)NotificationType.ClassRescheduleRequest,
            Message = message,
            CreatedBy = requestedByUserId,
            CreatedDate = DateTime.UtcNow,
            IsActive = true,
        };
        await _repository.AddNotificationAsync(notification);
        foreach (var userId in recipientIds)
            await NotificationDetails(notification.Id, userId, requestedByUserId);
    }

    // A tutor's or student's Permanent "Request for Re-schedule" was refused (e.g. the class is not a weekly class, or the
    // new time clashes). The requester saw the reason; Operations get it too, linked to the class, to arrange it.
    public async Task AddPermanentRescheduleIssueNotifications(Guid salesDetailsId, Guid scheduleDetailsId, Guid requestedByUserId,
        string requesterType, DateTime newStart, DateTime newEnd, string reason)
    {
        var byTutor = string.Equals(requesterType, "tutor", StringComparison.OrdinalIgnoreCase);
        var byStudent = string.Equals(requesterType, "student", StringComparison.OrdinalIgnoreCase);
        if (!byTutor && !byStudent) return;

        var salesDetails = await _salesDetailsRepository.FindAsync(d => d.Id == salesDetailsId);
        if (salesDetails == null) return;
        var classDetails = await _scheduleDetailsRepository.FindAsync(d => d.ScheduleDetailsId == scheduleDetailsId);
        var dataItem = await BuildStudentInfoModel(salesDetails.SalesId, salesDetailsId, requestedByUserId, addTutor: true);

        var recipientIds = new HashSet<Guid>();
        var owner = dataItem.Sales?.Ownership;
        if (owner.HasValue && owner.Value != Guid.Empty) recipientIds.Add(owner.Value);
        var roleIds = new[] { (int)UserRoleEnum.OperationsAdmin, (int)UserRoleEnum.Operations };
        foreach (var role in dataItem.AllUserRoles.Where(r => r.IsActive && roleIds.Contains(r.RoleId)))
            recipientIds.Add(role.UserId);
        recipientIds.Remove(Guid.Empty);
        recipientIds.Remove(requestedByUserId);
        if (recipientIds.Count == 0) return;

        // ScheduleDetails times are TCT local (India) time.
        var subjectName = dataItem.Subjects?.TypeCodeName ?? "Class";
        var requester = byTutor ? $"Tutor <b>{dataItem.TutorName}</b>" : $"Student <b>{dataItem.StudentName}</b>";
        var classText = classDetails == null ? "" : $" on <b>{classDetails.StartTime:dd MMM yyyy}</b> at <b>{classDetails.StartTime:h:mm tt}</b>";
        var message = $"{requester} requested to <b>permanently</b> re-schedule <b>{dataItem.StudentName}</b>'s <b>{subjectName}</b> class " +
                      $"with tutor <b>{dataItem.TutorName}</b>{classText} to every <b>{newStart:dddd h:mm tt} - {newEnd:h:mm tt}</b> " +
                      $"from {newStart:dd MMM yyyy}, but it could not be sent for approval: {System.Net.WebUtility.HtmlEncode(reason)} " +
                      "Please arrange it with them.";

        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            SalesId = salesDetails.SalesId,
            SalesDetailsId = salesDetailsId,
            ScheduleDetailsId = scheduleDetailsId,
            NotificationType = (int)NotificationType.ClassRescheduleRequest,
            Message = message,
            CreatedBy = requestedByUserId,
            CreatedDate = DateTime.UtcNow,
            IsActive = true,
        };
        await _repository.AddNotificationAsync(notification);
        foreach (var userId in recipientIds)
            await NotificationDetails(notification.Id, userId, requestedByUserId);
    }

    // Schedule Calendar: class day(s) were added. Tell the student, the tutor, the enrolment's owner and
    // every Operations / Operations Admin user, except whoever made the change.
    public async Task AddScheduleChangeNotifications(Guid salesDetailsId, Guid changedByUserId, string changedByRole, string changeText)
    {
        var salesDetails = await _salesDetailsRepository.FindAsync(d => d.Id == salesDetailsId);
        if (salesDetails == null) return;
        var dataItem = await BuildStudentInfoModel(salesDetails.SalesId, salesDetailsId, changedByUserId, addTutor: true);

        var recipientIds = new HashSet<Guid>();
        if (dataItem.StudentUser != null) recipientIds.Add(dataItem.StudentUser.Id);
        if (dataItem.TutorUser != null) recipientIds.Add(dataItem.TutorUser.Id);
        var owner = dataItem.Sales?.Ownership;
        if (owner.HasValue && owner.Value != Guid.Empty) recipientIds.Add(owner.Value);
        // Accounts Admin are told of every Schedule Calendar change (the billable schedule changed).
        var roleIds = new[] { (int)UserRoleEnum.OperationsAdmin, (int)UserRoleEnum.Operations, (int)UserRoleEnum.AccountsAdmin };
        foreach (var role in dataItem.AllUserRoles.Where(r => r.IsActive && roleIds.Contains(r.RoleId)))
            recipientIds.Add(role.UserId);
        recipientIds.Remove(Guid.Empty);
        recipientIds.Remove(changedByUserId);
        if (recipientIds.Count == 0) return;

        var subjectName = dataItem.Subjects?.TypeCodeName ?? "Class";
        var changedBy = string.Equals(changedByRole, "Tutor", StringComparison.OrdinalIgnoreCase) ? $"Tutor <b>{dataItem.TutorName}</b>"
            : string.Equals(changedByRole, "Student", StringComparison.OrdinalIgnoreCase) ? $"Student <b>{dataItem.StudentName}</b>"
            : string.Equals(changedByRole, "AccountsAdmin", StringComparison.OrdinalIgnoreCase) ? "Accounts Admin"
            : "Operations";
        var message = $"{changedBy} changed the schedule of <b>{dataItem.StudentName}</b>'s <b>{subjectName}</b> classes " +
                      $"with tutor <b>{dataItem.TutorName}</b>: {System.Net.WebUtility.HtmlEncode(changeText)}";

        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            SalesId = salesDetails.SalesId,
            SalesDetailsId = salesDetailsId,
            NotificationType = (int)NotificationType.ClassScheduleChanged,
            Message = message,
            CreatedBy = changedByUserId,
            CreatedDate = DateTime.UtcNow,
            IsActive = true,
        };
        await _repository.AddNotificationAsync(notification);
        foreach (var userId in recipientIds)
            await NotificationDetails(notification.Id, userId, changedByUserId);
    }

    // A tutor or student asked to change a class status they already saved: every Operations / Operations Admin
    // user and the enrolment's owner can approve or reject it from the notification (linked by ScheduleDetailsId).
    public async Task AddStatusEditRequestNotifications(ClassStatusEditRequestDto request)
    {
        var salesDetails = await _salesDetailsRepository.FindAsync(d => d.Id == request.SalesDetailsId);
        if (salesDetails == null) return;
        var dataItem = await BuildStudentInfoModel(salesDetails.SalesId, request.SalesDetailsId, request.RequestedBy, addTutor: true);

        var recipientIds = new HashSet<Guid>();
        var owner = dataItem.Sales?.Ownership;
        if (owner.HasValue && owner.Value != Guid.Empty) recipientIds.Add(owner.Value);
        var roleIds = new[] { (int)UserRoleEnum.OperationsAdmin, (int)UserRoleEnum.Operations };
        foreach (var role in dataItem.AllUserRoles.Where(r => r.IsActive && roleIds.Contains(r.RoleId)))
            recipientIds.Add(role.UserId);
        recipientIds.Remove(Guid.Empty);
        recipientIds.Remove(request.RequestedBy);
        if (recipientIds.Count == 0) return;

        var requester = request.RequesterType == "tutor" ? $"Tutor <b>{request.RequesterName}</b>" : $"Student <b>{request.RequesterName}</b>";
        var message = $"{requester} asked to change the status of <b>{request.StudentName}</b>'s <b>{request.Subject}</b> class " +
                      $"with tutor <b>{request.TutorName}</b> on <b>{request.ClassStart:dd MMM yyyy}</b> at " +
                      $"<b>{request.ClassStart:h:mm tt} - {request.ClassEnd:h:mm tt}</b>" +
                      (string.IsNullOrEmpty(request.CurrentStatus) ? "" : $" (currently <b>{request.CurrentStatus}</b>)") + ".";
        if (!string.IsNullOrWhiteSpace(request.Reason))
            message += $" Reason: {System.Net.WebUtility.HtmlEncode(request.Reason)}";

        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            SalesId = salesDetails.SalesId,
            SalesDetailsId = request.SalesDetailsId,
            ScheduleDetailsId = request.ScheduleDetailsId,
            NotificationType = (int)NotificationType.ClassStatusEditRequest,
            Message = message,
            CreatedBy = request.RequestedBy,
            CreatedDate = DateTime.UtcNow,
            IsActive = true,
        };
        await _repository.AddNotificationAsync(notification);
        foreach (var userId in recipientIds)
            await NotificationDetails(notification.Id, userId, request.RequestedBy);
    }

    // Operations approved or rejected a class status edit request: tell the tutor or student who asked.
    public async Task AddStatusEditDecisionNotification(ClassStatusEditRequestDto request, Guid decidedByUserId, bool approved)
    {
        var salesDetails = await _salesDetailsRepository.FindAsync(d => d.Id == request.SalesDetailsId);
        var message = $"Operations {(approved ? "<b>approved</b>" : "<b>rejected</b>")} your request to change the status of " +
                      $"the <b>{request.Subject}</b> class on <b>{request.ClassStart:dd MMM yyyy}</b> at <b>{request.ClassStart:h:mm tt}</b>." +
                      (approved ? " Open the class in your calendar and save the new status (one change allowed)." : "");
        if (!string.IsNullOrWhiteSpace(request.DecisionComment))
            message += $" Comment: {System.Net.WebUtility.HtmlEncode(request.DecisionComment)}";

        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            SalesId = salesDetails?.SalesId,
            SalesDetailsId = request.SalesDetailsId,
            ScheduleDetailsId = request.ScheduleDetailsId,
            NotificationType = (int)NotificationType.ClassStatusEditDecision,
            Message = message,
            CreatedBy = decidedByUserId,
            CreatedDate = DateTime.UtcNow,
            IsActive = true,
        };
        await _repository.AddNotificationAsync(notification);
        await NotificationDetails(notification.Id, request.RequestedBy, decidedByUserId);
    }

    // Schedule Calendar: a tutor or student asked to add class day(s). Every Operations / Operations Admin user
    // and the enrolment's owner are told; the notification opens the Schedule Calendar on that enrolment.
    public async Task AddScheduleChangeRequestNotifications(ScheduleChangeRequestDto request, Guid requestedByUserId)
    {
        var salesDetails = await _salesDetailsRepository.FindAsync(d => d.Id == request.SalesDetailsId);
        if (salesDetails == null) return;
        var dataItem = await BuildStudentInfoModel(salesDetails.SalesId, request.SalesDetailsId, requestedByUserId, addTutor: true);

        var recipientIds = new HashSet<Guid>();
        var owner = dataItem.Sales?.Ownership;
        if (owner.HasValue && owner.Value != Guid.Empty) recipientIds.Add(owner.Value);
        // Accounts Admin can approve too (same Schedule Calendar as Operations), and see every schedule change.
        var roleIds = new[] { (int)UserRoleEnum.OperationsAdmin, (int)UserRoleEnum.Operations, (int)UserRoleEnum.AccountsAdmin };
        foreach (var role in dataItem.AllUserRoles.Where(r => r.IsActive && roleIds.Contains(r.RoleId)))
            recipientIds.Add(role.UserId);
        recipientIds.Remove(Guid.Empty);
        recipientIds.Remove(requestedByUserId);
        if (recipientIds.Count == 0) return;

        var requester = request.RequesterType == "tutor" ? $"Tutor <b>{request.RequesterName}</b>" : $"Student <b>{request.RequesterName}</b>";
        var action = request.RequestKind == "PermanentReschedule" ? "permanently re-schedule the classes of" : "add classes for";
        var message = $"{requester} requested to {action} <b>{request.StudentName}</b>'s <b>{request.Subject}</b> " +
                      $"with tutor <b>{request.TutorName}</b>: {System.Net.WebUtility.HtmlEncode(request.Summary ?? "")}. " +
                      "Please approve or reject it in Schedule Calendar > Requests to approve.";

        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            SalesId = salesDetails.SalesId,
            SalesDetailsId = request.SalesDetailsId,
            NotificationType = (int)NotificationType.ScheduleChangeRequest,
            Message = message,
            CreatedBy = requestedByUserId,
            CreatedDate = DateTime.UtcNow,
            IsActive = true,
        };
        await _repository.AddNotificationAsync(notification);
        foreach (var userId in recipientIds)
            await NotificationDetails(notification.Id, userId, requestedByUserId);
    }

    // Operations decided a Schedule Calendar request: tell the requester; when approved also the other party
    // (the student when a tutor asked, the tutor when a student asked), whose classes changed too.
    public async Task AddScheduleChangeDecisionNotifications(ScheduleChangeRequestDto request, Guid requestedByUserId, Guid decidedByUserId, bool approved)
    {
        var salesDetails = await _salesDetailsRepository.FindAsync(d => d.Id == request.SalesDetailsId);
        if (salesDetails == null) return;
        var dataItem = await BuildStudentInfoModel(salesDetails.SalesId, request.SalesDetailsId, decidedByUserId, addTutor: true);

        var decidedBy = dataItem.AllUserRoles.Any(r => r.IsActive && r.UserId == decidedByUserId && r.RoleId == (int)UserRoleEnum.AccountsAdmin)
            ? "Accounts Admin" : "Operations";
        var recipientIds = new HashSet<Guid> { requestedByUserId };
        if (approved)
        {
            if (dataItem.StudentUser != null) recipientIds.Add(dataItem.StudentUser.Id);
            if (dataItem.TutorUser != null) recipientIds.Add(dataItem.TutorUser.Id);
        }
        recipientIds.Remove(Guid.Empty);
        recipientIds.Remove(decidedByUserId);
        if (recipientIds.Count == 0) return;

        var requester = request.RequesterType == "tutor" ? $"tutor <b>{request.RequesterName}</b>" : $"student <b>{request.RequesterName}</b>";
        var message = approved
            ? $"{decidedBy} <b>approved</b> the request from {requester} for <b>{request.StudentName}</b>'s <b>{request.Subject}</b> classes " +
              $"with tutor <b>{request.TutorName}</b>: {System.Net.WebUtility.HtmlEncode(request.Summary ?? "")}"
            : $"{decidedBy} <b>rejected</b> your request to " +
              (request.RequestKind == "PermanentReschedule" ? "permanently re-schedule" : "add") +
              $" <b>{request.Subject}</b> classes: {System.Net.WebUtility.HtmlEncode(request.Summary ?? "")}.";
        if (!string.IsNullOrWhiteSpace(request.DecisionComment))
            message += $" Comment: {System.Net.WebUtility.HtmlEncode(request.DecisionComment)}";

        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            SalesId = salesDetails.SalesId,
            SalesDetailsId = request.SalesDetailsId,
            NotificationType = (int)NotificationType.ScheduleChangeDecision,
            Message = message,
            CreatedBy = decidedByUserId,
            CreatedDate = DateTime.UtcNow,
            IsActive = true,
        };
        await _repository.AddNotificationAsync(notification);
        foreach (var userId in recipientIds)
            await NotificationDetails(notification.Id, userId, decidedByUserId);

        // Accounts Admin: every decision on a Schedule Calendar request, worded for them.
        var accountsAdmins = dataItem.AllUserRoles
            .Where(r => r.IsActive && r.RoleId == (int)UserRoleEnum.AccountsAdmin && r.UserId != Guid.Empty && r.UserId != decidedByUserId)
            .Select(r => r.UserId).Where(id => !recipientIds.Contains(id)).ToHashSet();
        if (accountsAdmins.Count == 0) return;
        var accountsMessage = $"{decidedBy} <b>{(approved ? "approved" : "rejected")}</b> the request from {requester} " +
                              $"for <b>{request.StudentName}</b>'s <b>{request.Subject}</b> classes with tutor <b>{request.TutorName}</b>: " +
                              System.Net.WebUtility.HtmlEncode(request.Summary ?? "") +
                              (string.IsNullOrWhiteSpace(request.DecisionComment) ? "" : $" Comment: {System.Net.WebUtility.HtmlEncode(request.DecisionComment)}");
        var accountsNotification = new Notification
        {
            Id = Guid.NewGuid(),
            SalesId = salesDetails.SalesId,
            SalesDetailsId = request.SalesDetailsId,
            NotificationType = (int)NotificationType.ScheduleChangeDecision,
            Message = accountsMessage,
            CreatedBy = decidedByUserId,
            CreatedDate = DateTime.UtcNow,
            IsActive = true,
        };
        await _repository.AddNotificationAsync(accountsNotification);
        foreach (var userId in accountsAdmins)
            await NotificationDetails(accountsNotification.Id, userId, decidedByUserId);
    }

    // A student asked for a class when the tutor is busy with another class, or a tutor asked for one when
    // the student is busy. The request is refused, so Operations are told to arrange a time. Nothing is sent
    // when the requester is anyone else (e.g. Operations scheduling) or is the busy person themselves.
    public async Task AddBusySlotRequestNotifications(Guid salesDetailsId, Guid requestedByUserId, string busyParty, DateTime start, DateTime end)
    {
        var tutorBusy = string.Equals(busyParty, "tutor", StringComparison.OrdinalIgnoreCase);
        var studentBusy = string.Equals(busyParty, "student", StringComparison.OrdinalIgnoreCase);
        if (!tutorBusy && !studentBusy) return;

        var salesDetails = await _salesDetailsRepository.FindAsync(d => d.Id == salesDetailsId);
        if (salesDetails == null) return;
        var dataItem = await BuildStudentInfoModel(salesDetails.SalesId, salesDetailsId, requestedByUserId, addTutor: true);
        var requestedByStudent = dataItem.StudentUser?.Id == requestedByUserId;
        var requestedByTutor = dataItem.TutorUser?.Id == requestedByUserId;
        if (tutorBusy ? !requestedByStudent : !requestedByTutor) return;

        var recipientIds = new HashSet<Guid>();
        var owner = dataItem.Sales?.Ownership;
        if (owner.HasValue && owner.Value != Guid.Empty) recipientIds.Add(owner.Value);
        var roleIds = new[] { (int)UserRoleEnum.OperationsAdmin, (int)UserRoleEnum.Operations };
        foreach (var role in dataItem.AllUserRoles.Where(r => r.IsActive && roleIds.Contains(r.RoleId)))
            recipientIds.Add(role.UserId);
        recipientIds.Remove(Guid.Empty);
        recipientIds.Remove(requestedByUserId);
        if (recipientIds.Count == 0) return;

        // ScheduleDetails times are TCT local (India) time.
        var subjectName = dataItem.Subjects?.TypeCodeName ?? "Class";
        var message = tutorBusy
            ? $"Student <b>{dataItem.StudentName}</b> requested a <b>{subjectName}</b> class with tutor <b>{dataItem.TutorName}</b>"
            : $"Tutor <b>{dataItem.TutorName}</b> requested a <b>{subjectName}</b> class with student <b>{dataItem.StudentName}</b>";
        message += $" on <b>{start:dd MMM yyyy}</b> at <b>{start:h:mm tt} - {end:h:mm tt}</b>, but the " +
                   (tutorBusy ? "tutor" : "student") + " already has another class at that time. Please arrange a suitable time.";

        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            SalesId = salesDetails.SalesId,
            SalesDetailsId = salesDetailsId,
            NotificationType = (int)NotificationType.ClassTimeRequest,
            Message = message,
            CreatedBy = requestedByUserId,
            CreatedDate = DateTime.UtcNow,
            IsActive = true,
        };
        await _repository.AddNotificationAsync(notification);
        foreach (var userId in recipientIds)
            await NotificationDetails(notification.Id, userId, requestedByUserId);
    }

    // Schedule Calendar: a tutor's or student's request to add class day(s) was refused because the tutor and/or
    // the student already has a class at that time. Operations (and the enrolment's owner) are told to arrange a time.
    public async Task AddScheduleCalendarClashNotifications(Guid salesDetailsId, Guid requestedByUserId, string requesterType,
        bool tutorBusy, bool studentBusy, DateTime start, DateTime end)
    {
        var byTutor = string.Equals(requesterType, "tutor", StringComparison.OrdinalIgnoreCase);
        var byStudent = string.Equals(requesterType, "student", StringComparison.OrdinalIgnoreCase);
        if ((!byTutor && !byStudent) || (!tutorBusy && !studentBusy)) return;

        var salesDetails = await _salesDetailsRepository.FindAsync(d => d.Id == salesDetailsId);
        if (salesDetails == null) return;
        var dataItem = await BuildStudentInfoModel(salesDetails.SalesId, salesDetailsId, requestedByUserId, addTutor: true);

        var recipientIds = new HashSet<Guid>();
        var owner = dataItem.Sales?.Ownership;
        if (owner.HasValue && owner.Value != Guid.Empty) recipientIds.Add(owner.Value);
        var roleIds = new[] { (int)UserRoleEnum.OperationsAdmin, (int)UserRoleEnum.Operations };
        foreach (var role in dataItem.AllUserRoles.Where(r => r.IsActive && roleIds.Contains(r.RoleId)))
            recipientIds.Add(role.UserId);
        recipientIds.Remove(Guid.Empty);
        recipientIds.Remove(requestedByUserId);
        if (recipientIds.Count == 0) return;

        // ScheduleDetails times are TCT local (India) time.
        var subjectName = dataItem.Subjects?.TypeCodeName ?? "Class";
        var busy = tutorBusy && studentBusy ? "the tutor and the student already have" : tutorBusy ? "the tutor already has" : "the student already has";
        var message = byStudent
            ? $"Student <b>{dataItem.StudentName}</b> requested a <b>{subjectName}</b> class with tutor <b>{dataItem.TutorName}</b>"
            : $"Tutor <b>{dataItem.TutorName}</b> requested a <b>{subjectName}</b> class with student <b>{dataItem.StudentName}</b>";
        message += $" on <b>{start:dd MMM yyyy}</b> at <b>{start:h:mm tt} - {end:h:mm tt}</b> (Schedule Calendar), but {busy} " +
                   "a class at that time. Please arrange a suitable time.";

        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            SalesId = salesDetails.SalesId,
            SalesDetailsId = salesDetailsId,
            NotificationType = (int)NotificationType.ClassTimeRequest,
            Message = message,
            CreatedBy = requestedByUserId,
            CreatedDate = DateTime.UtcNow,
            IsActive = true,
        };
        await _repository.AddNotificationAsync(notification);
        foreach (var userId in recipientIds)
            await NotificationDetails(notification.Id, userId, requestedByUserId);
    }

    // Prepaid v2 — Phase 4: notify the six roles (Student, Tutor, CoordinatorAdmin,
    // OperationsAdmin, AccountsAdmin, SuperAdmin) that a prepaid plan's credit is exhausted
    // and a top-up invoice has been raised (app notification + email).
    public async Task AddPrepaidOverrunNotifications(Guid salesId, Guid salesDetailsId, Guid actingUserId,
        string topUpInvoiceNumber, decimal topUpAmount, int remainingClasses)
    {
        var dataItem = await BuildStudentInfoModel(salesId, salesDetailsId, actingUserId, addTutor: true);
        var subjectName = dataItem.Subjects?.TypeCodeName;
        var amountStr = topUpAmount.ToString("N2");

        // Recipient user ids: student, tutor, and the four admin roles.
        var recipientIds = new HashSet<Guid>();
        if (dataItem.StudentUser != null) recipientIds.Add(dataItem.StudentUser.Id);
        if (dataItem.TutorUser != null) recipientIds.Add(dataItem.TutorUser.Id);

        var adminRoleIds = new List<int>
        {
            (int)UserRoleEnum.SuperAdmin,
            (int)UserRoleEnum.CoordinatorAdmin,
            (int)UserRoleEnum.OperationsAdmin,
            (int)UserRoleEnum.AccountsAdmin
        };
        foreach (var r in dataItem.AllUserRoles.Where(r => adminRoleIds.Contains(r.RoleId)))
            recipientIds.Add(r.UserId);

        recipientIds.Remove(Guid.Empty);
        if (recipientIds.Count == 0) return;

        var message = $"Prepaid credit exhausted for <b>{dataItem.StudentName}</b> — subject <b>{subjectName}</b>. " +
                      $"<b>{remainingClasses}</b> class(es) remain scheduled. A top-up invoice <b>{topUpInvoiceNumber}</b> for <b>₹{amountStr}</b> has been raised; these classes are blocked until it is paid.";

        var notification = await CreateNotifications(salesId, salesDetailsId, NotificationType.PrepaidOverrun, message, actingUserId);

        foreach (var uid in recipientIds)
        {
            await NotificationDetails(notification.Id, uid, actingUserId);

            try
            {
                var user = await _userRepository.GetByIdAsync(uid);
                if (user != null && !string.IsNullOrEmpty(user.Email))
                {
                    await SendNotificationAsync(new MailMessage
                    {
                        FromEmail = "noreply@tct.com",
                        ToEmail = user.Email,
                        Name = user.FullName ?? $"{user.FirstName} {user.LastName}",
                        Body = $"Prepaid credit for <strong>{dataItem.StudentName}</strong> ({subjectName}) has been fully used with <strong>{remainingClasses}</strong> class(es) still scheduled. A top-up invoice <strong>{topUpInvoiceNumber}</strong> for <strong>₹{amountStr}</strong> has been raised. The remaining classes are blocked until the balance is paid.",
                        MessageType = MessageType.Information,
                        Subject = $"Action needed: Prepaid balance exhausted – {dataItem.StudentName} ({subjectName})"
                    }, CommunicationType.Email);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "PrepaidOverrun email failed for user {UserId}.", uid);
            }
        }
    }

    public async Task AddClassReminderNotifications(Guid salesId, Guid salesDetailsId, Guid actingUserId,
        DateTime scheduledStart, DateTime scheduledEnd)
    {
        var dataItem = await BuildStudentInfoModel(salesId, salesDetailsId, actingUserId, addTutor: true);
        var recipientIds = new HashSet<Guid>();
        if (dataItem.StudentUser != null) recipientIds.Add(dataItem.StudentUser.Id);
        if (dataItem.TutorUser != null) recipientIds.Add(dataItem.TutorUser.Id);

        var teamRoleIds = new[]
        {
            (int)UserRoleEnum.OperationsAdmin,
            (int)UserRoleEnum.CoordinatorAdmin
        };
        foreach (var role in dataItem.AllUserRoles.Where(role => teamRoleIds.Contains(role.RoleId)))
            recipientIds.Add(role.UserId);

        recipientIds.Remove(Guid.Empty);
        if (recipientIds.Count == 0) return;

        // ScheduleDetails times are already stored as TCT local (India) time;
        // converting them again showed the class 5.5 hours later than scheduled.
        var localStart = scheduledStart;
        var localEnd = scheduledEnd;
        var subjectName = dataItem.Subjects?.TypeCodeName ?? "Class";
        var dateText = localStart.ToString("dd MMM yyyy");
        var timeText = $"{localStart:h:mm tt} - {localEnd:h:mm tt}";
        var message = $"Upcoming class reminder for <b>{dataItem.StudentName}</b> — <b>{subjectName}</b> on " +
                      $"<b>{dateText}</b> at <b>{timeText}</b>.";
        var notification = await CreateNotifications(
            salesId, salesDetailsId, NotificationType.ClassReminder, message, actingUserId);

        foreach (var userId in recipientIds)
        {
            await NotificationDetails(notification.Id, userId, actingUserId);
            try
            {
                var user = await _userRepository.GetByIdAsync(userId);
                if (user != null && !string.IsNullOrWhiteSpace(user.Email))
                {
                    await SendNotificationAsync(new MailMessage
                    {
                        FromEmail = "noreply@tct.com",
                        ToEmail = user.Email,
                        Name = user.FullName ?? $"{user.FirstName} {user.LastName}",
                        Subject = $"Class reminder: {dataItem.StudentName} - {subjectName}",
                        Body = $"This is a reminder that the <strong>{subjectName}</strong> class for " +
                               $"<strong>{dataItem.StudentName}</strong> is scheduled on " +
                               $"<strong>{dateText}</strong> at <strong>{timeText}</strong>.",
                        MessageType = MessageType.Information
                    }, CommunicationType.Email);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Class reminder email failed for user {UserId}.", userId);
            }
        }
    }

    private async Task<Notification> CreateNotifications(Guid salesId, Guid salesDetailsId, NotificationType notificationType, string message, Guid userId)
    {
        var _notification = new Notification
        {
            Id = Guid.NewGuid(),
            SalesId = salesId,
            NotificationType = (int)notificationType,
            SalesDetailsId = salesDetailsId,
            Message = message,
            CreatedBy = userId,
            CreatedDate = DateTime.UtcNow,
            IsActive = true,
        };
        await _repository.AddNotificationAsync(_notification);
        return _notification;
    }

    private async Task<NotificationDetails> NotificationDetails(Guid notificationId, Guid toUserId, Guid userId)
    {
        var notificationDetails = new NotificationDetails()
        {
            Id = Guid.NewGuid(),
            NotificationId = notificationId,
            FromUserId = userId,
            ToUserId = toUserId,
            CreatedBy = userId,
            CreatedDate = DateTime.UtcNow,
            IsActive = true,
            IsRead = false
        };
        await _notificationDetailsRepository.CreateAsync(notificationDetails);
        return notificationDetails;
    }

    public async Task AddTutorPaymentApprovalNotification(Guid approvalId, Guid requestedBy)
    {
        var approval = await _tutorPaymentApprovalRepository.GetByIdAsync(approvalId)
            ?? throw new KeyNotFoundException("Tutor payment approval request was not found.");
        var tutor = await _tutorRepository.GetByIdAsync(approval.TutorId);
        var tutorUser = tutor == null ? null : await _userRepository.GetByIdAsync(tutor.UserId);
        var requestLabel = ((TutorPaymentRequestType)approval.RequestType) switch
        {
            TutorPaymentRequestType.AssignmentWithPaymentChange => "Tutor assignment and payment change",
            TutorPaymentRequestType.ExistingAssignmentPaymentChange => "Existing assignment payment change",
            TutorPaymentRequestType.TutorRateChange => "General tutor rate change",
            _ => "Tutor payment change"
        };
        var message = $"{requestLabel} requested for <b>{tutorUser?.FullName ?? "Tutor"}</b>, " +
                      $"{approval.Board} {approval.Grade}: <b>{approval.BasePaymentAmount:0.##}</b> to " +
                      $"<b>{approval.RequestedPaymentAmount:0.##}</b>. " +
                      $"Reason: {approval.RequestReason ?? "Not provided"}. Please review the request and enter a decision comment.";
        var notification = new Notification
        {
            Id = Guid.NewGuid(), SalesDetailsId = approval.Id,
            NotificationType = (int)NotificationType.TutorPaymentApprovalRequest,
            Message = message, CreatedBy = requestedBy, CreatedDate = DateTime.UtcNow, IsActive = true
        };
        await _repository.AddNotificationAsync(notification);
        var allRoles = await _userRoleRepository.GetAllAsync();
        foreach (var superAdminId in allRoles.Where(r => r.RoleId == (int)UserRoleEnum.SuperAdmin)
                     .Select(r => r.UserId).Distinct())
        {
            await NotificationDetails(notification.Id, superAdminId, requestedBy);
        }
    }

    public async Task AddTutorPaymentDecisionNotification(Guid approvalId, Guid decidedBy)
    {
        var approval = await _tutorPaymentApprovalRepository.GetByIdAsync(approvalId)
            ?? throw new KeyNotFoundException("Tutor payment approval request was not found.");
        var tutor = await _tutorRepository.GetByIdAsync(approval.TutorId);
        var tutorUser = tutor == null ? null : await _userRepository.GetByIdAsync(tutor.UserId);
        var approved = approval.ApprovalStatus == (int)TutorPaymentStatus.Approved;
        var finalAmount = approved ? approval.ApprovedPaymentAmount : approval.BasePaymentAmount;
        var message = $"Tutor payment request for <b>{tutorUser?.FullName ?? "Tutor"}</b> was " +
                      $"<b>{(approved ? "approved" : "rejected")}</b>. Final amount: <b>{finalAmount:0.##}</b>. " +
                      $"Comment: {approval.ApprovalRemarks}.";
        var notification = new Notification
        {
            Id = Guid.NewGuid(), SalesDetailsId = approval.Id,
            NotificationType = (int)NotificationType.TutorPaymentDecision,
            Message = message, CreatedBy = decidedBy, CreatedDate = DateTime.UtcNow, IsActive = true
        };
        await _repository.AddNotificationAsync(notification);
        await NotificationDetails(notification.Id, approval.RequestedBy, decidedBy);
        if (approval.RequestType == (int)TutorPaymentRequestType.TutorRateChange && tutorUser != null
            && tutorUser.Id != approval.RequestedBy)
        {
            await NotificationDetails(notification.Id, tutorUser.Id, decidedBy);
        }
    }

    public async Task<EnrolledCourse> GetNotificationByIdAsync(Guid id)
    {
        return await _repository.GetNotificationByIdAsync(id);
    }

    public async Task<IEnumerable<Notification>> GetAllNotificationsAsync()
    {
        return await _repository.GetAllNotificationsAsync();
    }

    public async Task AddNotificationAsync(Notification notification)
    {
        await _repository.AddNotificationAsync(notification);
    }

    public async Task UpdateNotificationAsync(Notification notification)
    {
        await _repository.UpdateNotificationAsync(notification);
    }

    public async Task DeleteNotificationAsync(int id)
    {
        await _repository.DeleteNotificationAsync(id);
    }

    public async Task<IEnumerable<NotificationDto>> GetNotificationByUserIdAsync(Guid userId)
    {
        IEnumerable<NotificationDto> notifications = new List<NotificationDto>();
        notifications = await _repository.GetNotificationByUserIdAsync(userId);
        return notifications;
    }

    public async Task<Response<bool>> ReadUnread(Guid notifiDetailsId, Guid userId)
    {
        var result = await _repository.ReadUnread(notifiDetailsId, userId);
        return result;
    }
}

public class StudentInfoModel
{
    public List<UserRole> AllUserRoles { get; set; }
    public List<UserRole> UserRoles { get; set; }
    public Sales Sales { get; set; }
    public SalesDetails SalesDetails { get; set; }
    public Student Student { get; set; }
    public User User { get; set; }
    public User CoordinatorUser { get; set; }
    public User StudentUser { get; set; }
    public User TutorUser { get; set; }
    public string StudentName { get; set; }
    public string TutorName { get; set; }
    public List<Type_Code> TypeCode { get; set; } = new List<Type_Code>();
    public Type_Code Subjects { get; set; }
    public Type_Code Grade { get; set; }
    public Type_Code Board { get; set; }
    public Type_Code Status { get; set; }
    public string? CreatedBy { get; set; }
    public Guid? TutorId { get; set; }
    public bool IsNewStudent { get; set; }
}
