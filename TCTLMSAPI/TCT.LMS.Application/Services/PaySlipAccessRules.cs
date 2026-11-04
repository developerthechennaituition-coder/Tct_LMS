namespace TCT.LMS.Application.Services;

/// <summary>
/// Who may open a tutor's pay slip (SchedulerController: GetTutorPaySlipPdf and gettutorinvoicebyid, through
/// PaySlipAccessFilter): a signed-in staff user (Accounts, Payroll, Operations, admins ...) as before; a Tutor only their own
/// pay slips; a Student never. Signing in is required (the PDF was anonymous before).
/// </summary>
public static class PaySlipAccessRules
{
    public const string ForbiddenMessage = "You can only open your own pay slips.";

    /// <param name="restrictedAs">ClassActionAuthorizationRules.RestrictedAs(roles): "tutor", "student", or null for staff.</param>
    /// <param name="invoiceTutorUserId">The pay slip's tutor (User.Id); null when the pay slip is not found.</param>
    /// <returns>Null when allowed (or not found, left to the action), otherwise the reason.</returns>
    public static string? Check(string? restrictedAs, Guid callerId, Guid? invoiceTutorUserId) => restrictedAs switch
    {
        null => null,
        "student" => ForbiddenMessage,
        _ => invoiceTutorUserId == null || (callerId != Guid.Empty && invoiceTutorUserId == callerId) ? null : ForbiddenMessage,
    };
}
