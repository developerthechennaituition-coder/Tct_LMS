namespace TCT.LMS.Application.Services;

// Which classes the parent is billed for and the tutor is paid for, after the Operations cross-check.
//
// Each class has two attendance records:
//   - the tutor's:      ScheduleDetails.TutorScheduleStatus
//   - Operations':      ScheduleDetails.Status (text; written only when Operations save the class status)
// Operations then cross-check the class on the Class Attendance page. The choice is stored in
// ScheduleDetails.OperationScheduleStatus (Class Attendance Status lookup 1013):
//   1013001 Ops Approved (records agree)    parent: Operations' record (tutor's if Operations recorded none)
//                                           tutor:  tutor's record
//   1013002 Go with tutors attendance       parent and tutor: tutor's record
//   1013003 Go with operation attendance    parent and tutor: Operations' record
// e.g. tutor 10, Operations 12: Go with operation attendance -> both 12; Go with tutors attendance -> both 10.
// A class that is not cross-checked is neither billed nor paid.
//
// The same rule is implemented in SQL by the view dbo.vw_ClassAttendanceBilling
// (DBScript/AttendanceGoWithOpsPaysOpsRecord_23_October_2026.sql); keep the two in step.
public static class AttendanceBillingRule
{
    public const int OpsApproved = 1013001;
    public const int GoWithTutorAttendance = 1013002;
    public const int GoWithOperationAttendance = 1013003;

    // Class Completed (and its Extra Class / Preponed / Postponed variants), from either status group.
    public static readonly int[] CompletedStatusCodes = { 1009001, 1009008, 1009009, 1009010, 20020 };

    // Cancelled / postponed / re-scheduled: the class does not take place, so it needs no cross-check.
    public static readonly int[] NotTakingPlaceStatusCodes = { 1009002, 1009003, 1009005, 1009006, 1009007, 20021 };

    public static int[] CrossCheckCodes => new[] { OpsApproved, GoWithTutorAttendance, GoWithOperationAttendance };

    public static bool IsCrossChecked(int? crossCheckCode) =>
        crossCheckCode is OpsApproved or GoWithTutorAttendance or GoWithOperationAttendance;

    public static bool OpsRecorded(string? opsStatus) => !string.IsNullOrWhiteSpace(opsStatus);

    public static bool OpsCompleted(string? opsStatus) =>
        opsStatus != null && opsStatus.TrimStart().StartsWith("Class Completed", StringComparison.OrdinalIgnoreCase);

    public static bool IsParentBillable(int? crossCheckCode, bool tutorCompleted, string? opsStatus) => crossCheckCode switch
    {
        GoWithTutorAttendance => tutorCompleted,
        GoWithOperationAttendance => OpsCompleted(opsStatus),
        OpsApproved => OpsRecorded(opsStatus) ? OpsCompleted(opsStatus) : tutorCompleted,
        _ => false,
    };

    public static bool IsTutorPayable(int? crossCheckCode, bool tutorCompleted, string? opsStatus) => crossCheckCode switch
    {
        GoWithOperationAttendance => OpsCompleted(opsStatus),
        OpsApproved or GoWithTutorAttendance => tutorCompleted,
        _ => false,
    };

    // The record that decides whether the class took place: Operations' when they recorded one, else the tutor's.
    public static bool IsNotTakingPlace(string? opsStatus, IReadOnlyCollection<string> notTakingPlaceStatusNames, int? tutorStatusCode) =>
        OpsRecorded(opsStatus)
            ? notTakingPlaceStatusNames.Contains(opsStatus!.Trim(), StringComparer.OrdinalIgnoreCase)
            : tutorStatusCode.HasValue && NotTakingPlaceStatusCodes.Contains(tutorStatusCode.Value);

    // Blocks the parent invoice: the class takes place but Operations have not cross-checked it yet.
    public static bool IsAwaitingCrossCheck(int? crossCheckCode, bool notTakingPlace) =>
        !IsCrossChecked(crossCheckCode) && !notTakingPlace;
}
