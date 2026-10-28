using TCT.LMS.Domain.Entities;

namespace TCT.LMS.API.Authentication;

public static class PermissionClaims
{
    public static List<string> GetAllPermissions()
    {
        return new List<string>
        {
            "SalesDashboard.View",
            "SalesDashboard.Add",
            "SalesDashboard.Edit",
            "SalesDashboard.Delete",
            "Sales.View",
            "Sales.Add",
            "Sales.Edit",
            "Sales.Delete",
            "EnrollmentHistory.View",
            "EnrollmentHistory.Add",
            "EnrollmentHistory.Edit",
            "EnrollmentHistory.Delete",
            "Enrollment.View",
            "Enrollment.Add",
            "Enrollment.Edit",
            "Enrollment.Delete",
            "Student.View",
            "Student.Add",
            "Student.Edit",
            "Student.Delete",
            "Notification.View",
            "Notification.Add",
            "Notification.Edit",
            "Notification.Delete",
            "Tutor.View",
            "Tutor.Add",
            "Tutor.Edit",
            "Tutor.Delete",
        };
    }
}
