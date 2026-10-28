namespace TCT.LMS.Domain.Enums;

public sealed class EnumDictionary
{
    public static readonly Dictionary<string, string> TypeGroups = new Dictionary<string, string>
    {
        { "UserType", "100" },
        { "TCTLMSStatus", "200" },
        { "Grade", "300" },
        { "Board", "400" },
        { "Subject", "500" },
    };

    public static readonly Dictionary<int, Dictionary<string, int>> UserType = new Dictionary<int, Dictionary<string, int>>
    {
        {
            100, new Dictionary<string, int>
            {
                { "Student", 10001 },
                { "Tutor", 10002 },
                { "OrganizationUser", 10003 }
            }
        },
        {
            200, new Dictionary<string, int>
            {
                { "DemoPendingTutorNotAssigned", 20001 },
                { "DemoPendingTutorAssigned", 20002 },
                { "NeedToSchedule", 20003 },
                { "Schedule", 20004 },
                { "Drop", 20005 },
                { "FollowUp", 20006 },
                { "ReDemo", 20007 },
                { "ShortFollowUp", 20008 },
                { "LongFollowUp", 20009 },
                { "ParentFollowUp", 20010 },
                { "SalesFollowUp", 20011 },
                { "DemoPendingTutorAssignedNotApproved", 20012 },
                { "DemoPendingTutorAssignedApproved", 20013 },
                { "Reject", 20014 }
            }
        },
         {
            300, new Dictionary<string, int>
            {
                { "Grade1", 30001 },
                { "Grade2", 30002 },
                { "Grade3", 30003 },
                { "Grade4", 30004 },
                { "Grade5", 30005 },
                { "Grade6", 30006 },
                { "Grade7", 30007 },
                { "Grade8", 30008 },
                { "Grade9", 30009 },
                { "Grade10", 30010 },
                { "Grade11", 30011 },
                { "Grade12", 30012 }
            }
        },
        {
            400, new Dictionary<string, int>
            {
                { "CBSE", 40001 },
                { "CISCE", 40002 },
                { "ICSE", 40003 },
                { "IGCSE", 40004 },
                { "CAIE", 40005 },
                { "IB", 40006 },
                { "NIOS", 40007 }
            }
        },
        {
            500, new Dictionary<string, int>
            {
                { "Maths", 50001 },
                { "Physics", 50002 },
                { "Chemistry", 50003 },
                { "Biology", 50004 },
                { "ComputerScience", 50005 },
                { "Zoology", 50006 },
                { "Botany", 50007 },
                { "Accounts", 50008 },
                { "Commerce", 50009 },
                { "English", 50010 },
                { "Tamil", 50011 }
            }
        }
    };
}
