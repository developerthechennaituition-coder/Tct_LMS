using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.User;
using TCT.LMS.DTOs.Wrappers;

namespace TCT.LMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IUserService _userService;
    private readonly IMenuService _menuService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        IAuthService authService,
        IUserService userService,
        IMenuService menuService,
        ILogger<AuthController> logger)
    {
        _authService = authService;
        _userService = userService;
        _menuService = menuService;
        _logger = logger;
    }

    [HttpPost("authenticate-user")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(AuthenticationResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> AuthenticateUser([FromBody] LoginRequestDto loginInfo)
    {
        try
        {
            var result = await _authService.AuthenticateUser(loginInfo);
            SetRefreshTokenCookie(result);
            return Ok(AuthenticationResponseDto.From(result));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Authentication failed for user {UserName}", loginInfo.UserName);
            return StatusCode(StatusCodes.Status500InternalServerError, ApiResponseDto.Failure("An error occurred during authentication."));
        }
    }

    [HttpPost("complete-student-login")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(AuthenticationResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> CompleteStudentLogin([FromBody] StudentSelectionLoginRequestDto request)
    {
        try
        {
            var result = await _authService.CompleteStudentLogin(request);
            SetRefreshTokenCookie(result);
            return Ok(AuthenticationResponseDto.From(result));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Student login completion failed for userId {UserId}", request.UserId);
            return StatusCode(StatusCodes.Status500InternalServerError, ApiResponseDto.Failure("An error occurred during student login."));
        }
    }

    [HttpGet("get-user-claims")]
    [Authorize]
    [ProducesResponseType(typeof(List<UserRolesPermissionResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetUserClaims()
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        try
        {
            var result = await _authService.GetUserRolePermissionClaims(userId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch claims for userId {UserId}", userId);
            return StatusCode(StatusCodes.Status500InternalServerError, ApiResponseDto.Failure("An error occurred while fetching user claims."));
        }
    }

    [HttpGet("get-menu-by-user")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetMenuByUser([FromQuery] int roleId)
    {   /*
        var menuItems = await _menuService.GetHierarchyMenuItemsByUserId(roleId);
        return Ok(menuItems);*/
        try
        {
            _logger.LogInformation("GetMenuByUser started. RoleId: {RoleId}", roleId);

            var menuItems = await _menuService.GetHierarchyMenuItemsByUserId(roleId);

            _logger.LogInformation(
                "GetMenuByUser completed. RoleId: {RoleId}, MenuCount: {MenuCount}",
                roleId,
                menuItems?.Count ?? 0
            );

            return Ok(menuItems);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "GetMenuByUser failed. RoleId: {RoleId}",
                roleId
            );

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                ApiResponseDto.Failure("Error while loading menu.")
            );
        }
    }

    [HttpGet("get-claims")]
    [Authorize]
    [ProducesResponseType(typeof(List<UserRolesPermissionResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetClaims()
    {
        try
        {
            var result = await _authService.GetRolePermission();
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch role permissions");
            return StatusCode(StatusCodes.Status500InternalServerError, ApiResponseDto.Failure("An error occurred while fetching claims."));
        }
    }

    [HttpGet("confirm-email")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> ConfirmEmail([FromQuery] string email)
    {
        if (string.IsNullOrWhiteSpace(email))
            return BadRequest(ApiResponseDto.Failure("Email token is required."));

        var result = await _authService.ConfirmEmail(email);
        return Ok(result);
    }

    [HttpPost("forgot-password")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> ForgotPassword([FromQuery] string email)
    {
        if (string.IsNullOrWhiteSpace(email))
            return BadRequest(ApiResponseDto.Failure("Email address is required."));

        // Always return the same response regardless of whether the email exists.
        // Returning a distinct "not found" response allows attackers to enumerate registered emails.
        var user = await _userService.GetUserByEmail(email);
        if (user != null)
        {
            try
            {
                await _authService.SendPasswordResetLink(user, email);
            }
            catch (Exception ex)
            {
                // Password-reset requests intentionally return the same response
                // for existing and non-existing accounts. Keep SMTP failures out
                // of the public response, but preserve the full exception in the
                // server log so delivery configuration can be corrected.
                _logger.LogError(ex,
                    "Password reset email could not be delivered for user {UserId}.",
                    user.Id);
            }
        }

        return Ok(ApiResponseDto.Success("If this email is registered, a password reset link has been sent."));
    }

    [HttpPost("change-password")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto changePasswordDto)
    {
        if (changePasswordDto.UserId.HasValue && changePasswordDto.UserId != Guid.Empty)
            return BadRequest(ApiResponseDto.Failure("Use the authenticated password-change endpoint."));

        var message = await _authService.ChangePassword(changePasswordDto);
        if (message == "Password changed successfully.")
            return Ok(ApiResponseDto.Success(message));
        return BadRequest(ApiResponseDto.Failure(message));
    }

    [HttpPost("refresh-token")]
    [AllowAnonymous]
    public async Task<IActionResult> RefreshToken()
    {
        try
        {
            var refreshToken = Request.Cookies["refreshToken"];
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var result = await _authService.RefreshSession(refreshToken, ipAddress);
            if (string.IsNullOrWhiteSpace(result.Token))
                return Unauthorized(ApiResponseDto.Failure(result.Message ?? "Session has expired."));

            SetRefreshTokenCookie(result);
            return Ok(AuthenticationResponseDto.From(result));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unable to refresh the authenticated session.");
            return StatusCode(
                StatusCodes.Status503ServiceUnavailable,
                ApiResponseDto.Failure("The session could not be refreshed right now. Please try again."));
        }
    }

    [HttpPost("revoke-token")]
    [AllowAnonymous]
    public async Task<IActionResult> RevokeToken()
    {
        var refreshToken = Request.Cookies["refreshToken"];
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        await _authService.RevokeRefreshToken(refreshToken, ipAddress);
        Response.Cookies.Delete("refreshToken", RefreshCookieOptions(DateTime.UtcNow.AddDays(-1)));
        return Ok(ApiResponseDto.Success("Session ended."));
    }

    private void SetRefreshTokenCookie(AuthenticationModel model)
    {
        if (string.IsNullOrWhiteSpace(model.RefreshToken) || !model.RefreshTokenExpiresAt.HasValue) return;
        Response.Cookies.Append(
            "refreshToken",
            model.RefreshToken,
            RefreshCookieOptions(model.RefreshTokenExpiresAt.Value));
    }

    private static CookieOptions RefreshCookieOptions(DateTime expires) => new()
    {
        HttpOnly = true,
        Secure = true,
        SameSite = SameSiteMode.None,
        Expires = expires,
        Path = "/api/Auth"
    };

    [HttpPost("change-password-authenticated")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> ChangePasswordAuthenticated([FromBody] ChangePasswordDto changePasswordDto)
    {
        if (changePasswordDto.UserId.HasValue && changePasswordDto.UserId != Guid.Empty)
        {
            var authenticatedUserId = User.Claims
                .FirstOrDefault(claim =>
                    claim.Type.Equals(System.Security.Claims.ClaimTypes.NameIdentifier, StringComparison.OrdinalIgnoreCase)
                    || claim.Type.Equals("UserId", StringComparison.OrdinalIgnoreCase)
                    || claim.Type.Equals("nameid", StringComparison.OrdinalIgnoreCase)
                    || claim.Type.Equals("uid", StringComparison.OrdinalIgnoreCase))
                ?.Value;

            if (Guid.TryParse(authenticatedUserId, out var callerId))
            {
                if (callerId != changePasswordDto.UserId.Value)
                    return Forbid();
            }
            else
            {
                var authenticatedEmail = User.Claims
                    .FirstOrDefault(claim =>
                        claim.Type.Equals(System.Security.Claims.ClaimTypes.Email, StringComparison.OrdinalIgnoreCase)
                        || claim.Type.Equals("Email", StringComparison.OrdinalIgnoreCase)
                        || claim.Type.Equals("email_address", StringComparison.OrdinalIgnoreCase))
                    ?.Value;

                if (string.IsNullOrWhiteSpace(authenticatedEmail)
                    || string.IsNullOrWhiteSpace(changePasswordDto.Email)
                    || !string.Equals(authenticatedEmail.Trim(), changePasswordDto.Email.Trim(), StringComparison.OrdinalIgnoreCase))
                {
                    return Unauthorized(ApiResponseDto.Failure("The signed-in user could not be verified. Please sign in again."));
                }
            }
        }
        else
        {
            return BadRequest(ApiResponseDto.Failure("User ID is required."));
        }

        var message = await _authService.ChangePassword(changePasswordDto);
        if (message == "Password changed successfully.")
            return Ok(ApiResponseDto.Success(message));
        return BadRequest(ApiResponseDto.Failure(message));
    }

    [HttpGet("get-role-menu-permission")]
    [Authorize]
    [ProducesResponseType(typeof(List<RoleMenuPermissionDTO>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetRoleMenuPermission([FromQuery] int roleId)
    {
        var result = await _authService.GetRoleMenuPermission(roleId);
        return Ok(result);
    }

    [HttpPut("update-user-claim")]
    [HttpPost("update-user-claim")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> UpdateUserClaim(
        [FromQuery] int roleId,
        [FromQuery] string menuIds,
        [FromQuery] string type,
        [FromQuery] bool value,
        [FromQuery] Guid userId)
    {
        try
        {
            var authenticatedUserId = User.Claims
                .FirstOrDefault(claim =>
                    claim.Type.Equals(System.Security.Claims.ClaimTypes.NameIdentifier, StringComparison.OrdinalIgnoreCase)
                    || claim.Type.Equals("UserId", StringComparison.OrdinalIgnoreCase)
                    || claim.Type.Equals("nameid", StringComparison.OrdinalIgnoreCase)
                    || claim.Type.Equals("uid", StringComparison.OrdinalIgnoreCase))
                ?.Value;

            var hasAuthenticatedCallerId = Guid.TryParse(authenticatedUserId, out var callerId);
            if (!hasAuthenticatedCallerId)
            {
                // Older/refreshed tokens in existing deployments may not contain the
                // user-id claim. Authorization still comes exclusively from the signed
                // role claim; this value is used only for audit fields.
                callerId = userId;
            }

            if (callerId == Guid.Empty)
                return Unauthorized(ApiResponseDto.Failure("Your login session is invalid. Please sign in again."));

            // Authorize from the authenticated identity. The userId query value is supplied
            // by the UI for legacy clients and must not decide who is making the request.
            static string NormalizeRoleName(string? roleName) =>
                new((roleName ?? string.Empty)
                    .Where(char.IsLetterOrDigit)
                    .Select(char.ToUpperInvariant)
                    .ToArray());

            var authenticatedRoles = User.Claims
                .Where(claim => claim.Type == System.Security.Claims.ClaimTypes.Role ||
                                claim.Type.Equals("role", StringComparison.OrdinalIgnoreCase))
                .Select(claim => claim.Value);
            var canManagePermissions = authenticatedRoles.Any(role =>
            {
                var normalizedRole = NormalizeRoleName(role);
                return normalizedRole == "SUPERADMIN" || normalizedRole == "SALESADMIN";
            });

            // Some deployed tokens include only RoleId. In the current role table,
            // 1 is SuperAdmin and 2 is SalesAdmin.
            canManagePermissions = canManagePermissions || User.Claims.Any(claim =>
                (claim.Type.Equals("RoleId", StringComparison.OrdinalIgnoreCase)
                 || claim.Type.Equals("role_id", StringComparison.OrdinalIgnoreCase))
                && (claim.Value == "1" || claim.Value == "2"));

            // Fall back to the current database assignment for tokens issued before a role
            // change, while still requiring the caller's authenticated user identity.
            if (!canManagePermissions && hasAuthenticatedCallerId)
            {
                var callerPermissions = await _authService.GetUserRolePermissionClaims(callerId);
                canManagePermissions = callerPermissions?
                    .SelectMany(item => item.Roles ?? [])
                    .Any(role =>
                        role.Id == "1"
                        || role.Id == "2"
                        || NormalizeRoleName(role.RoleName) == "SUPERADMIN"
                        || NormalizeRoleName(role.RoleName) == "SALESADMIN") == true;
            }

            if (!canManagePermissions)
                return StatusCode(
                    StatusCodes.Status403Forbidden,
                    ApiResponseDto.Failure("You do not have permission to manage role permissions."));

            await _authService.UpdateUserClaim(roleId, menuIds, type, value, callerId);
            return Ok(ApiResponseDto.Success("Permission updated successfully."));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update permission for roleId {RoleId} by userId {UserId}", roleId, userId);
            return StatusCode(StatusCodes.Status500InternalServerError, ApiResponseDto.Failure("Error while updating permission."));
        }
    }
}
