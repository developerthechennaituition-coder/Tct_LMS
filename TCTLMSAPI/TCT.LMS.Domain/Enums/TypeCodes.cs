using System.ComponentModel;

namespace TCT.LMS.Domain;

public enum LookupGroup
{
    ClassStatusType = 1009,
    TutorPaymentStatus = 1012
}
public enum UserType
{
    Student = 10001,
    Tutor = 10002,
    OrganizationUser = 10003
}
public enum TCTLMSStatus
{
    DemoPendingTutorNotAssigned = 20001,
    DemoPendingTutorAssigned = 20002,
    NeedToSchedule = 20003,
    Schedule = 20004,
    Drop = 20005,
    FollowUp = 20006,
    ReDemo = 20007,
    ShortFollowUp = 20008,
    LongFollowUp = 20009,
    ParentFollowUp = 20010,
    SalesFollowUp = 20011,
    DemoPendingTutorAssignedNotApproved = 20012,
    DemoPendingTutorAssignedApproved = 20013,
    Reject = 20014
}
public enum Grade
{
    Grade1 = 30001,
    Grade2 = 30002,
    Grade3 = 30003,
    Grade4 = 30004,
    Grade5 = 30005,
    Grade6 = 30006,
    Grade7 = 30007,
    Grade8 = 30008,
    Grade9 = 30009,
    Grade10 = 30010,
    Grade11 = 30011,
    Grade12 = 30012,
}
public enum Board
{
    CBSE = 40001,
    CISCE = 40002,
    ICSE = 40003,
    IGCSE = 40004,
    CAIE = 40005,
    IB = 40006,
    NIOS = 40007,
}
public enum Subject
{
    Maths = 50001,
    Physics = 50002,
    Chemistry = 50003,
    Biology = 50004,
    ComputerScience = 50005,
    Zoology = 50006,
    Botany = 50007,
    Accounts = 50008,
    Commerce = 50009,
    English = 50010,
    Tamil = 50011,
}
public enum Gender
{
    Male = 60001,
    Female = 60002
}

public enum UserRoleEnum
{
    SuperAdmin = 1,
    Admin = 2,
    OperationsAdmin = 3,
    Operations = 4,
    CoordinatorAdmin = 5,
    Coordinator = 6,
    AccountsAdmin = 7,
    Accounts = 8,
    PayrollAdmin = 9,
    Payroll = 10,
    HRAdmin = 11,
    HR = 12,
    Tutor = 13,
    Student = 14
}

public enum NotificationType
{
    [Description("Sales Create")]
    SalesCreate = 100401,

    [Description("Course Enrollment")]
    CourseEnrollment = 100402,

    [Description("Assign Tutor")]
    AssignTutor = 100403,

    [Description("Approve Tutor Assignment")]
    ApproveTutorAssignment = 100404,

    [Description("Reject Tutor Assignment")]
    RejectTutorAssignment = 100405,

    [Description("Tutor Assigned")]
    TutorAssigned = 100406,
    [Description("Tutor Payment Approval Request")]
    TutorPaymentApprovalRequest = 100422,
    [Description("Tutor Payment Decision")]
    TutorPaymentDecision = 100423,

    [Description("Schedule Class")]
    ScheduleClass = 100407,

    [Description("Acknowledgment")]
    Acknowledgment = 100408,
    [Description("Scheduled Demo")]
    ScheduleDemo = 100409,
    [Description("DemoCompleted")]
    DemoCompleted = 100410,
    [Description("Follow-up Status")]
    FollowUpStatus = 100411,

    [Description("Re-Schedule Class")]
    ReScheduleClass = 100412,

    [Description("Re-Schedule Demo")]
    ReScheduleDemo = 100413,

    [Description("Demo Adjustment")]
    DemoAdjustment = 100414,

    [Description("Class Adjustment")]
    ClassAdjustment = 100453,

    [Description("Dropout Reason Type")]
    DropoutReasonType = 100454,

    [Description("Attendance Submitted")]
    AttendanceSubmitted = 100455,

    [Description("Prepaid Credit Exhausted")]
    PrepaidOverrun = 100456,

    [Description("Answer Sheet Submitted")]
    AnswerSheetSubmitted = 100457,

    [Description("Answer Sheet Evaluated")]
    AnswerSheetEvaluated = 100458,

    [Description("Upcoming Class Reminder")]
    ClassReminder = 100459,


[Description("Task Assigned")]
TaskAssigned = 100460,

[Description("Task Completed")]
TaskCompleted = 100461,

[Description("Tutor Reassigned")]
TutorReassigned = 100462,

[Description("Class Re-schedule Request")]
ClassRescheduleRequest = 100463,

[Description("Class Completion Threshold")]
ClassCompletionThreshold = 100464,

[Description("Class Schedule Changed")]
ClassScheduleChanged = 100465,

[Description("Class Time Request")]
ClassTimeRequest = 100466,

[Description("Class Status Edit Request")]
ClassStatusEditRequest = 100467,

[Description("Class Status Edit Decision")]
ClassStatusEditDecision = 100468,

[Description("Schedule Change Request")]
ScheduleChangeRequest = 100469,

[Description("Schedule Change Decision")]
ScheduleChangeDecision = 100470,

}

public enum FollowUpStatus
{
    DCNeedToSchedule = 20018,
    DemoCompleted = 20041,
    ShortFollowUp = 20008,
    RequestForQuotation = 20025,
    DemoPendingTutorAssigned = 20002,
    ClassCanceled = 20021,
    Reject = 20014,
    Drop = 20005,
    ReDemo = 20007,
    ClassReScheduled = 20023,
    DemoScheduled = 20019,
    NeedToSchedule = 20003,
    DemoPostponed = 20016,
    DemoCancelled = 20015,
    SalesFollowUp = 20011,
    DemoPendingTutorAssignedNotApproved = 20012,
    DemoPendingTutorAssignedApproved = 20013,
    ParentFollowUp = 20010,
    ClassPostponed = 20022,
    DemoPendingTutorNotAssigned = 20001,
    Schedule = 20004,
    RequestForReschedule = 20024,
    LongFollowUp = 20009,
    FollowUp = 20006,
    ClassCompleted = 20020,
    ReScheduledDemo = 20028,
}

public enum ScheduleType
{
    Class = 100501,
    Demo = 100502
}

public enum DropoutReason
{
    [Description("Mismatch of Expectations")]
    MismatchOfExpectations = 90001,

    [Description("Teaching Style")]
    TeachingStyle = 90002,

    [Description("Communication Issues")]
    CommunicationIssues = 90003,

    [Description("Lack of Engagement")]
    LackOfEngagement = 90004,

    [Description("Time Management Issues")]
    TimeManagementIssues = 90005,

    [Description("Tutor's Availability")]
    TutorsAvailability = 90006,

    [Description("Unclear Communication of Fees")]
    UnclearCommunicationOfFees = 90007,

    [Description("Uncomfortable Environment")]
    UncomfortableEnvironment = 90008,

    [Description("Inadequate Subject Knowledge")]
    InadequateSubjectKnowledge = 90009,

    [Description("Personal Reasons")]
    PersonalReasons = 90010,

    [Description("Family or Peer Influence")]
    FamilyOrPeerInfluence = 90011,

    [Description("Lack of Rapport")]
    LackOfRapport = 90012,

    [Description("Change in Academic Needs")]
    ChangeInAcademicNeeds = 90013,

    [Description("Technical Difficulties")]
    TechnicalDifficulties = 90014
}

public enum ClassStatusType
{
    ClassCompleted = 1009001,
    ClassCancelled = 1009002,
    ClassCancelledStudentNotAvailable = 1009003,
    RequestForReschedule = 1009004,
    ClassPostponed = 1009005,
    ClassRescheduled = 1009006,
    ClassCompletedExtraClass = 1009008,
    ClassCompletedPreponed = 1009009,
    ClassCompletedPostponed = 1009010
}

public enum TutorPaymentStatus
{
    Approved = 1012001,
    OnHold = 1012002,
    Pending = 1012003,
    Rejected = 1012004
}
