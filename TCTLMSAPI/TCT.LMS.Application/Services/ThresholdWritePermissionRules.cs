namespace TCT.LMS.Application.Services;

/// <summary>
/// Threshold Configuration (/api/Threshold) changes need the matching permission on the Threshold Configuration menu
/// (Settings → Role Permission): add = POST, edit = PUT, activate / inactivate = DELETE. Reading needs none, as before.
/// Used by ThresholdWritePermissionFilter.
/// </summary>
public static class ThresholdWritePermissionRules
{
    public const string MenuLink = "/threshold-config";

    public const string ForbiddenMessage =
        "You do not have permission to change Threshold Configuration. A Super Admin can grant it in Settings → Role Permission.";

    public enum Permission { None, Add, Edit, Delete }

    public static Permission RequiredPermission(string? httpMethod) =>
        (httpMethod ?? string.Empty).ToUpperInvariant() switch
        {
            "POST" => Permission.Add,
            "PUT" => Permission.Edit,
            "DELETE" => Permission.Delete,
            _ => Permission.None
        };

    // A role's permission row for the menu grants the request.
    public static bool Grants(Permission required, bool add, bool edit, bool delete) => required switch
    {
        Permission.Add => add,
        Permission.Edit => edit,
        Permission.Delete => delete,
        _ => true
    };
}
