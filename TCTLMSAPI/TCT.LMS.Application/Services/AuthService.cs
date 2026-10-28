using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using System.Security.Claims;
using System.Text.Json;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Application.Services.Configuration;
using TCT.LMS.Domain.Entities;
using TCT.LMS.Domain.Enums;
using TCT.LMS.DTOs.User;
using TCT.LMS.DTOs.Wrappers;

namespace TCT.LMS.Application.Services;

public class AuthService : IAuthService
{
    private readonly IGenericRepository<User> _repo;
    private readonly IAuthRepository _authRepo;
    private readonly IUserRoleRepository _userRoleRepo;
    private readonly IRoleRepository _roleRepo;
    private readonly IRolePermissionRepository _rolePermissionRepo;
    private readonly IPermissionRepository _permissionRepo;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly TokenService _tokenService;
    private readonly IUserRepository _userRepo;
    private readonly INotificationService _notificationService;
    private readonly IGenericRepository<RefreshToken> _refreshTokenRepo;
    private readonly ILogger<AuthService> _logger;

    public AuthService(IAuthRepository authRepo, IGenericRepository<User> repo,
                        IUserRoleRepository userRoleRepo,
                        IRoleRepository roleRepo,
                        IRolePermissionRepository rolePermissionRepo,
                        IPermissionRepository permissionRepo,
                        IPasswordHasher<User> passwordHasher,
                        TokenService tokenService, IUserRepository userRepo,
                        INotificationService notificationService,
                        IGenericRepository<RefreshToken> refreshTokenRepo,
                        ILogger<AuthService> logger)
    {
        _authRepo = authRepo;
        _repo = repo;
        _userRoleRepo = userRoleRepo;
        _roleRepo = roleRepo;
        _rolePermissionRepo = rolePermissionRepo;
        _permissionRepo = permissionRepo;
        _tokenService = tokenService;
        _userRepo = userRepo;
        _passwordHasher = passwordHasher;
        _notificationService = notificationService;
        _refreshTokenRepo = refreshTokenRepo;
        _logger = logger;
    }
    

    public async Task<AuthenticationModel> AuthenticateUser(LoginRequestDto loginInfo)
    {
        AuthenticationModel status = new();

        try
        {
            var users = await _userRepo.GetUsersByEmail(loginInfo.UserName);

            if (users == null || !users.Any())
            {
                status.Message = "User name / Password incorrect. Please try again.";
                return status;
            }

            var passwordMatchedUsers = users
                .Where(user => _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, loginInfo.Password?.Trim())
                                == PasswordVerificationResult.Success)
                .ToList();

            if (!passwordMatchedUsers.Any())
            {
                status.Message = "User name / Password incorrect. Please try again.";
                return status;
            }

            var validUsers = passwordMatchedUsers.Where(user => user.EmailConfirmed == true).ToList();
            if (!validUsers.Any())
            {
                status.Message = "Email verification is not completed";
                return status;
            }

            // only student users should participate in multi-student selection
            var studentUsers = new List<User>();

            foreach (var user in validUsers)
            {
                var permissions = await _authRepo.GetUserRolePermissionClaims(user.Id);
                var roleName = permissions?.FirstOrDefault()?.Roles?.FirstOrDefault()?.RoleName?.ToString();

                if (roleName == "Student")
                {
                    studentUsers.Add(user);
                }
            }

            if (studentUsers.Count > 1)
            {
                var students = await _userRepo.GetStudentsByEmail(loginInfo.UserName);

                status.RequiresStudentSelection = true;
                status.LoginEmail = loginInfo.UserName;
                status.Students = students
                    .Where(x => studentUsers.Select(s => s.Id).Contains(x.UserId))
                    .ToList();

                return status;
            }

            // Email lookup is case-insensitive, so duplicate accounts differing only by case
            // (e.g. two signups for "name@x.com" vs "Name@x.com") can both land in validUsers.
            // Prefer whichever one exactly matches the casing the user actually typed instead
            // of picking arbitrarily — otherwise the login silently resolves to the wrong
            // duplicate account regardless of which one the user intended.
            var selectedUser = validUsers.FirstOrDefault(u => u.Email == loginInfo.UserName) ?? validUsers.First();

            await _userRepo.UpdateLoggedInDateById(selectedUser.Id);

            string permissionsJson = string.Empty;
            List<RolesResponseDto>? roles = new List<RolesResponseDto>();
            var selectedPermissions = await _authRepo.GetUserRolePermissionClaims(selectedUser.Id);

            if (selectedPermissions != null && selectedPermissions.Count > 0)
            {
                roles = selectedPermissions[0].Roles.ToList();
                permissionsJson = JsonSerializer.Serialize(selectedPermissions);
            }

            var selectedRole = roles?.FirstOrDefault();
            if (selectedRole == null || string.IsNullOrWhiteSpace(selectedRole.RoleName?.ToString()))
            {
                status.Message = "No active role is assigned to this account. Please contact an administrator.";
                return status;
            }

            if (string.IsNullOrEmpty(selectedUser.FullName))
            {
                selectedUser.FullName = $"{selectedUser.FirstName} {selectedUser.LastName}";
            }

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, selectedUser.Id.ToString()),
                new Claim(ClaimTypes.Role, selectedRole.RoleName.ToString()), 
                new Claim("RoleId", selectedRole.Id?.ToString() ?? string.Empty),
                 new Claim(ClaimTypes.Name, selectedUser.FullName),
                new Claim(ClaimTypes.Email, selectedUser.Email),
                new Claim("Permissions", permissionsJson)
            };

            var token = await _tokenService.GenerateTokens(claims, selectedUser, roles);
            var userDetails = await _userRepo.GetTCTUserById(selectedUser.Id);

            bool isFeedbackSubmitedToday = false;
            bool isFeedbackCheckRequired = false;

            if (roles?.FirstOrDefault()?.RoleName?.ToString() == "Student" ||
                roles?.FirstOrDefault()?.RoleName?.ToString() == "Tutor")
            {
                isFeedbackCheckRequired = true;
            }

            status = new AuthenticationModel
            {
                UserId = selectedUser.Id,
                UserName = selectedUser.FullName,
                Email = selectedUser.Email,
                Token = token.JwtToken,
                RefreshToken = token.RefreshToken,
                RefreshTokenExpiresAt = token.RefreshTokenExpiresAt,
                Role = roles?.FirstOrDefault()?.RoleName?.ToString(),
                RoleId = roles?.FirstOrDefault()?.Id,
                Nationality = userDetails?.Data?.Address?.Country,
                IsFeedbackCheckRequired = isFeedbackCheckRequired,
                IsFeedbackSubmitedToday = isFeedbackSubmitedToday,
                RequiresStudentSelection = false
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Authentication failed while processing account {UserName}", loginInfo.UserName);
            if (ex.Message == "Email verification is not completed")
            {
                status.Message = ex.Message;
                return status;
            }

#if DEBUG
            status.Message = $"Authentication failed ({ex.GetType().Name}): {ex.GetBaseException().Message}";
#else
            status.Message = "Something went wrong. Please try again.";
#endif
        }

        return status;
    }

    public async Task<AuthenticationModel> CompleteStudentLogin(StudentSelectionLoginRequestDto request)
    {
        AuthenticationModel status = new();

        try
        {
            if (string.IsNullOrWhiteSpace(request.LoginEmail))
            {
                status.Message = "Invalid student selection.";
                return status;
            }

            var user = await _userRepo.GetUserById(request.UserId);

            if (user == null)
            {
                status.Message = "Selected student not found.";
                return status;
            }

            // Verify the selected student's email matches the email used in the first login step.
            // This prevents UserId injection — the caller must also know the correct login email.
            if (!string.Equals(user.Email, request.LoginEmail, StringComparison.OrdinalIgnoreCase))
            {
                status.Message = "Invalid student selection.";
                return status;
            }

            var permissions = await _authRepo.GetUserRolePermissionClaims(user.Id);
            var roleName = permissions?
                .FirstOrDefault()?
                .Roles?
                .FirstOrDefault()?
                .RoleName?
                .ToString();

            if (!string.Equals(roleName, "Student", StringComparison.OrdinalIgnoreCase))
            {
                status.Message = "Invalid student selection.";
                return status;
            }

            return await BuildAuthenticatedResponse(user);
        }
        catch
        {
            status.Message = "Something went wrong. Please try again.";
            return status;
        }
    }

    private async Task<AuthenticationModel> BuildAuthenticatedResponse(User user)
    {
        await _userRepo.UpdateLoggedInDateById(user.Id);

        string permissionsJson = string.Empty;
        List<RolesResponseDto>? roles = new List<RolesResponseDto>();

        var permissions = await _authRepo.GetUserRolePermissionClaims(user.Id);
        if (permissions != null && permissions.Count > 0)
        {
            // GetUserRolePermissionClaims returns one entry per role assignment, each carrying
            // just that one role — flatten across all entries so a multi-role user's token carries
            // every role, not whichever assignment the query happened to return first.
            roles = permissions.SelectMany(p => p.Roles).ToList();
            permissionsJson = JsonSerializer.Serialize(permissions);
        }

        if (string.IsNullOrEmpty(user.FullName))
        {
            user.FullName = $"{user.FirstName} {user.LastName}".Trim();
        }

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.FullName ?? string.Empty),
            new Claim(ClaimTypes.Email, user.Email ?? string.Empty),
            new Claim("Permissions", permissionsJson)
        };

        var token = await _tokenService.GenerateTokens(claims, user, roles);
        var userDetails = await _userRepo.GetTCTUserById(user.Id);

        bool isFeedbackSubmitedToday = false;
        bool isFeedbackCheckRequired = false;

        var roleName = roles?.FirstOrDefault()?.RoleName?.ToString();

        if (roles != null && roles.Any(r => r.RoleName == "Student" || r.RoleName == "Tutor"))
        {
            isFeedbackCheckRequired = true;
        }

        return new AuthenticationModel
        {
            UserId = user.Id,
            UserName = user.FullName,
            Email = user.Email,
            Token = token.JwtToken,
            RefreshToken = token.RefreshToken,
            RefreshTokenExpiresAt = token.RefreshTokenExpiresAt,
            Role = roleName,
            RoleId = roles?.FirstOrDefault()?.Id,
            Nationality = userDetails?.Data?.Address?.Country,
            IsFeedbackCheckRequired = isFeedbackCheckRequired,
            IsFeedbackSubmitedToday = isFeedbackSubmitedToday,
            RequiresStudentSelection = false,
            Message = string.Empty
        };
    }

    public async Task<AuthenticationModel> RefreshSession(string refreshToken, string ipAddress)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
            return new AuthenticationModel { Message = "Session has expired." };

        var storedToken = await _refreshTokenRepo.FindAsync(token => token.Token == refreshToken);
        if (storedToken == null || !storedToken.IsActive)
            return new AuthenticationModel { Message = "Session has expired." };

        var user = await _userRepo.GetActiveUserById(storedToken.UserId);
        if (user == null)
            return new AuthenticationModel { Message = "User is no longer active." };

        storedToken.Revoked = DateTime.UtcNow;
        storedToken.RevokedByIp = ipAddress;
        await _refreshTokenRepo.UpdateAsync(storedToken);

        return await BuildAuthenticatedResponse(user);
    }

    public async Task RevokeRefreshToken(string refreshToken, string ipAddress)
    {
        if (string.IsNullOrWhiteSpace(refreshToken)) return;
        var storedToken = await _refreshTokenRepo.FindAsync(token => token.Token == refreshToken);
        if (storedToken == null || storedToken.IsRevoked) return;
        storedToken.Revoked = DateTime.UtcNow;
        storedToken.RevokedByIp = ipAddress;
        await _refreshTokenRepo.UpdateAsync(storedToken);
    }

    public async Task<List<UserRolesPermissionResponseDto>> GetUserRolePermissionClaims(Guid userId)
    {
        return await _authRepo.GetUserRolePermissionClaims(userId);
    }
    public async Task<List<UserRolesPermissionResponseDto>> GetRolePermission()
    {
        return await _authRepo.GetRolePermission();
    }
    public async Task<string> ChangePassword(ChangePasswordDto changePassword)
    {
        if (string.IsNullOrWhiteSpace(changePassword.NewPassword))
            return "Enter new password.";

        if (!changePassword.NewPassword.Equals(changePassword.ConfirmPassword))
            return "Confirm password mismatch.";

        if (string.IsNullOrWhiteSpace(changePassword.Email))
            return "Email is required.";

        try
        {
            // Authenticated profile change: UserId and plain-text account email are supplied.
            if (changePassword.UserId.HasValue && changePassword.UserId != Guid.Empty)
            {
                if (string.IsNullOrWhiteSpace(changePassword.CurrentPassword))
                    return "Current password is required.";

            var userDetails = await _userRepo.GetUserById(changePassword.UserId.Value);
            if (userDetails == null)
                return "User not found.";

            // Cross-validate: the provided email must match the account's email.
            // Prevents password change using only a guessed UserId — caller must also know the email.
            if (!string.Equals(userDetails.Email, changePassword.Email.Trim(), StringComparison.OrdinalIgnoreCase))
                return "User not found.";

                return await _authRepo.ChangePassword(userDetails, changePassword);
            }

            // Password-reset flow: Email contains the encrypted value from the reset link.
            var email = CryptographyHelper.Decrypt(changePassword.Email);
            // Confirmation links must be able to load an account that is not yet confirmed.
            var user = await _userRepo.GetUserByEmail(email, checkEmailConfirmed: false);
            if (user == null)
                return "User not found.";

            return await _authRepo.ChangePassword(user, changePassword);
        }
        catch (Exception ex)
        {
            return ex.Message.ToString();
        }
    }

    public async Task<ApiResponseDto> ConfirmEmail(string encryptedEmail)
    {
        try
        {
            var email = CryptographyHelper.Decrypt(encryptedEmail);
            var user = await _userRepo.GetUserByEmail(email, checkEmailConfirmed: true);

            if (user == null)
                return ApiResponseDto.Failure("Email address not found.");

            if (user.EmailConfirmed == true)
                return ApiResponseDto.Success("Email verification already completed.");

            await _authRepo.ConfirmEmail(user, email);
            return ApiResponseDto.Success("Email confirmed successfully.");
        }
        catch (Exception)
        {
            return ApiResponseDto.Failure("Email confirmation failed. The link may be invalid or expired.");
        }
    }
    async Task IAuthService.SendPasswordResetLink(User user, string email)
    {
        var message = new MailMessage
        {
            Link = string.Empty,
            FromEmail = "noreply@tct.com",
            ToEmail = email,
            Name = $"{user.FirstName} {user.LastName}",
            MessageType = MessageType.Forgotpassword,
            Subject = "Password Reset Request for The Chennai Tuition LMS"
        };

        try
        {
            await _notificationService.SendNotificationAsync(message, CommunicationType.Email);
            _logger.LogInformation("Password reset email sent for user {UserId}.", user.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Password reset email delivery failed for user {UserId}.", user.Id);
            throw;
        }
    }
    public async Task<AuthenticationModel> UpdateUserClaim(int roleId, string menuIds, string type, bool value, Guid userId)
    {
        var message = string.Empty;
        AuthenticationModel status = new();

        var permissions = await _authRepo.UpdateUserClaim(roleId, menuIds, type, value, userId);
        return status;
    }

    public async Task<List<RoleMenuPermissionDTO>> GetRoleMenuPermission(int roleId)
    {
        var result = await _authRepo.GetRoleMenuPermission(roleId);
        return result;
    }
}
