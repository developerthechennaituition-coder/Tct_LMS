using Microsoft.EntityFrameworkCore;
using System;
using TCT.LMS.Application;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Invoice;
using TCT.LMS.DTOs.Sales;
using TCT.LMS.DTOs.Schedule;
using TCT.LMS.DTOs.Student;
using TCT.LMS.DTOs.Tutor;
using TheChennaiTuitionQA.Models;
using TCT.LMS.DTOs.Schedule;

namespace TCT.LMS.Data.Common;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {

    }
    public DbSet<Sales> Sales { get; set; }
    public DbSet<SalesDetails> SalesDetails { get; set; }
    public DbSet<Tutor> Tutor { get; set; }
    public DbSet<TutorDetails> TutorDetails { get; set; }
    public DbSet<Address> Address { get; set; }
    public DbSet<Student> Student { get; set; }
    public DbSet<UserProfile> UserProfile { get; set; }
    public DbSet<User> User { get; set; }
    public DbSet<Roles> Roles { get; set; }
    public DbSet<Menu> Menu { get; set; }
    public DbSet<RoleMenuPermission> RoleMenuPermission { get; set; }
    public DbSet<Permissions> Permissions { get; set; }
    public DbSet<RolePermission> RolePermission { get; set; }
    public DbSet<UserRole> UserRole { get; set; }
    public DbSet<TypeGroup> TypeGroup { get; set; }
    public DbSet<Type_Code> Type_Code { get; set; }
    public DbSet<Notification> Notification { get; set; }
    public DbSet<NotificationDetails> NotificationDetails { get; set; }
    public DbSet<Document> Documents { get; set; }
    public DbSet<DocumentStorage> DocumentStorage { get; set; }
    public DbSet<Schedule> Schedule { get; set; }
    public DbSet<ScheduleDetails> ScheduleDetails { get; set; }
    public DbSet<TutorInvoice> TutorInvoice { get; set; }
    public DbSet<TutorInvoiceDetails> TutorInvoiceDetails { get; set; }
    public DbSet<StudentInvoice> StudentInvoice { get; set; }
    public DbSet<StudentInvoiceDetails> StudentInvoiceDetails { get; set; }
    public DbSet<StudentPaymentPlan> StudentPaymentPlan { get; set; }
    public DbSet<PrepaidClassCharge> PrepaidClassCharge { get; set; }
    public DbSet<StudentPayment> StudentPayment { get; set; }
    public DbSet<Chats> Chats { get; set; }
    public DbSet<ChatMessages> ChatMessages { get; set; }
    public DbSet<ChatUser> ChatUsers { get; set; }
    public DbSet<Conversation> Conversations { get; set; }
    public DbSet<MessageStatus> MessageStatus { get; set; }
    public DbSet<Message> Messages { get; set; }
    public DbSet<Group> Groups { get; set; }
    public DbSet<GroupMember> GroupMembers { get; set; }
    public DbSet<ChatLabel> ChatLabels { get; set; }
    public DbSet<ChatLabelMember> ChatLabelMembers { get; set; }
    public DbSet<UserActivity> UserActivity { get; set; }
    public DbSet<RefreshToken> RefreshToken { get; set; }
    public DbSet<UserAvailability> UserAvailability { get; set; }
    public DbSet<UserAvailabilityExceptions> UserAvailabilityExceptions { get; set; }
    public DbSet<TCTBankDetails> TCTBankDetails { get; set; }
    public DbSet<TCTDetails> TCTDetails { get; set; }
    public DbSet<IndianTutorBankDetails> IndianTutorBankDetails { get; set; }
    public DbSet<ForeignTutorPaymentDetails> ForeignTutorPaymentDetails { get; set; }
    public DbSet<TCTNotes> TCTNotes { get; set; }
    public DbSet<StudentRegistration> StudentRegistration { get; set; }
    public DbSet<AuditLog> AuditLog { get; set; }
    public DbSet<AccountsScheduleDto> AccountsScheduleDtos { get; set; }

    public DbSet<AccountsInvoiceSummaryDto> AccountsInvoiceSummaryDtos { get; set; }

    public DbSet<InvoiceQueryResult> InvoiceQueryResult { get; set; }
    public DbSet<StudentInvoiceViewModel> StudentInvoiceViewModel { get; set; }
    public DbSet<UserClassRating> UserClassRating { get; set; }
    public DbSet<Thresholds> Thresholds { get; set; }
    public DbSet<PaymentPercentageConfiguration> PaymentPercentageConfiguration { get; set; }
    public DbSet<PaymentPercentageConfigurationView> PaymentPercentageConfigurationViews { get; set; }
    public DbSet<TutorStudentAllocations> TutorStudentAllocations { get; set; }
    public DbSet<TutorStudentAllocationHistory> TutorStudentAllocationHistory { get; set; }
    public DbSet<TutorPaymentApproval> TutorPaymentApproval { get; set; }
    public DbSet<ClassStatusEditRequest> ClassStatusEditRequest { get; set; }
    public DbSet<ScheduleChangeRequest> ScheduleChangeRequest { get; set; }
    public DbSet<StudentAccountStatusDto> StudentAccountStatusDtos { get; set; }
    public DbSet<TutorAccountStatusDto> TutorAccountStatusDto { get; set; }
    public DbSet<BoardGradeGroupMapping> BoardGradeGroupMapping { get; set; }
    public DbSet<TctLearningExperienceFeedback> TctLearningExperienceFeedback { get; set; }
    public DbSet<TctTutorDailyFeedback> TctTutorDailyFeedback { get; set; }

    public DbSet<ClassScheduleDetailsReportDto> ClassScheduleDetailsReportDtos { get; set; }
    public DbSet<ScheduleStatusCountDto> ScheduleStatusCountDto { get; set; }
    public DbSet<TestSchedule> TestSchedule { get; set; }
    public DbSet<AnswerSheetSubmission> AnswerSheetSubmission { get; set; }
    public DbSet<UserTask> UserTask { get; set; }
    public DbSet<DemoStatusHistory> DemoStatusHistory { get; set; }
    public DbSet<AssignmentChangeRequest> AssignmentChangeRequest { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<PrepaidClassCharge>(entity =>
        {
            entity.HasIndex(x => x.ScheduleDetailsId).IsUnique();
            entity.HasIndex(x => x.StudentPaymentPlanId);
            entity.HasOne<StudentPaymentPlan>().WithMany().HasForeignKey(x => x.StudentPaymentPlanId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<ScheduleDetails>().WithMany().HasForeignKey(x => x.ScheduleDetailsId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<StudentInvoice>().WithMany().HasForeignKey(x => x.StudentInvoiceId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<SalesSummaryResponseDto>(entity =>
        {
            entity.HasNoKey();
            entity.ToView(null);
        });

        modelBuilder.Entity<PaymentPercentageConfigurationView>(entity =>
        {
            entity.HasNoKey();
            entity.ToView("vw_PaymentPercentageConfiguration");
        });

modelBuilder.Entity<UserTask>(entity =>
        {
            entity.ToTable("UserTask");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Title).HasMaxLength(200).IsRequired();
            entity.Property(x => x.Description).HasMaxLength(2000).IsRequired();
            entity.Property(x => x.Priority).HasMaxLength(20);
            entity.Property(x => x.Status).HasMaxLength(20).IsRequired();
        });

        modelBuilder.Entity<DemoStatusHistory>(entity =>
        {
            entity.ToTable("DemoStatusHistory");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.FollowUpStartDate).HasColumnType("date");
            entity.Property(x => x.FollowUpEndDate).HasColumnType("date");
            entity.Property(x => x.ReminderDate).HasColumnType("date");
        });

        modelBuilder.Entity<AssignmentChangeRequest>(entity =>
        {
            entity.ToTable("AssignmentChangeRequest");
            entity.HasKey(x => x.Id);
            // RequestNo is an IDENTITY column: never sent on insert or update.
            entity.Property(x => x.RequestNo).ValueGeneratedOnAdd()
                .Metadata.SetAfterSaveBehavior(Microsoft.EntityFrameworkCore.Metadata.PropertySaveBehavior.Ignore);
            entity.Property(x => x.RequestType).HasMaxLength(20).IsRequired();
            entity.Property(x => x.Reason).HasMaxLength(100).IsRequired();
            entity.Property(x => x.Description).HasMaxLength(2000).IsRequired();
            entity.Property(x => x.Status).HasMaxLength(20).IsRequired();
            entity.Property(x => x.DecisionNote).HasMaxLength(1000);
        });

        modelBuilder.Entity<ClassStatusEditRequest>(entity =>
            entity.ToTable("ClassStatusEditRequest"));

        modelBuilder.Entity<ScheduleChangeRequest>(entity =>
            entity.ToTable("ScheduleChangeRequest"));

        modelBuilder.Entity<TutorPaymentApproval>(entity =>
        {
            entity.ToTable("TutorPaymentApproval");
            entity.HasKey(x => x.Id);
            // This legacy table does not contain the standard audit columns.
            // Explicit ignores also protect it from conventions applied by older builds.
            entity.Ignore("CreatedBy");
            entity.Ignore("CreatedDate");
            entity.Ignore("ModifiedBy");
            entity.Ignore("ModifiedDate");
        });

        modelBuilder.Entity<StudentAccountStatusDto>(entity =>
        {
            entity.HasNoKey();
            entity.ToView(null);
        });

        modelBuilder.Entity<TutorAccountStatusDto>(entity =>
        {
            entity.HasNoKey();
            entity.ToView(null);
        });

        modelBuilder.Entity<AccountsScheduleDto>(entity =>
        {
            entity.HasNoKey();
            entity.ToView(null);
        });

        modelBuilder.Entity<AccountsInvoiceSummaryDto>(entity =>
        {
            entity.HasNoKey();
            entity.ToView(null);
        });
        modelBuilder.Entity<ClassScheduleDetailsReportDto>().HasNoKey();
        modelBuilder.Entity<ScheduleStatusCountDto>().HasNoKey();
        modelBuilder.Entity<ClassScheduleReportDto>().HasNoKey();

        modelBuilder.Entity<ChatLabel>(entity =>
        {
            entity.ToTable("ChatLabels");

            entity.HasKey(x => x.Id);

            entity.Property(x => x.Id)
                .ValueGeneratedOnAdd();

            entity.Property(x => x.Name)
                .HasColumnType("varchar(100)")
                .IsRequired();

            entity.Property(x => x.CreatedBy)
                .IsRequired();

            entity.Property(x => x.CreatedDate)
                .HasColumnType("datetime2")
                .HasDefaultValueSql("GETDATE()")
                .IsRequired();

            entity.Property(x => x.ModifiedDate)
                .HasColumnType("datetime2");

            entity.Property(x => x.IsActive)
                .HasDefaultValue(true)
                .IsRequired();
        });

        modelBuilder.Entity<ChatLabelMember>(entity =>
        {
            entity.ToTable("ChatLabelMembers");

            entity.HasKey(x => x.Id);

            entity.Property(x => x.Id)
                .ValueGeneratedOnAdd();

            entity.Property(x => x.LabelId)
                .IsRequired();

            entity.Property(x => x.UserId);

            entity.Property(x => x.GroupId);

            entity.Property(x => x.CreatedDate)
                .HasColumnType("datetime2")
                .HasDefaultValueSql("GETDATE()")
                .IsRequired();

            entity.Property(x => x.IsActive)
                .HasDefaultValue(true)
                .IsRequired();

            entity.HasOne(x => x.Label)
                .WithMany(x => x.Members)
                .HasForeignKey(x => x.LabelId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
