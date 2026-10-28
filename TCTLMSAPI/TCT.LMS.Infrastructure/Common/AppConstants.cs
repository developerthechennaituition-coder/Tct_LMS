namespace TCT.LMS.Infrastructure.Common;

public class AppConstants
{
    public static OrganizationConstants OrganizationConstant { get; set; } = new();
    public sealed class OrganizationConstants
    {
        public string TheChennaiTutionAdmin => "admin@thechennaitution.com1";
        public string TheChennaiTutionMaintenanceAdmin => "MaintainanceAdmin@THECHENNAITUTION.com";
        public string OrganizationAdminDefaultPassword => "Client@123";
    }
}
