namespace TCT.LMS.Domain.Authentication;

public enum Permissions
{
    None = 0,
    SalesDashboard = 1 << 0,
    CoordinatorDashboard = 1 << 1,
    ParentStudentDashboard = 1 << 2,
    User = 1 << 3,
    Admin = 1 << 4,
    AccountsDashboard = 1 << 5,
    TutorDashboard = 1 << 6,
    // = 1 << 7,
    // = 1 << 8,
    // = 1 << 9,
    // = 1 << 10,
    // = 1 << 11,
    MaintainanceAdmin = 1 << 12,
    //QueryBuilder = 1 << 13,
    All = ~None
}
