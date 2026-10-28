namespace TCT.LMS.Domain;

public sealed class EnumConstants
{
    public static UserStatus UserStatuses { get; set; } = new();
    public sealed class UserStatus
    {
        public string NotConfirmed => "Not Confirmed";
        public string Active => "Active";
        public string DeActive => "De-Active";
        public string Locked => "Locked";
    } 
}
