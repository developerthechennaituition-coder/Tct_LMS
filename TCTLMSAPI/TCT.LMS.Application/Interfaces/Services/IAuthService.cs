using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.User;
using TCT.LMS.DTOs.Wrappers;

namespace TCT.LMS.Application.Interfaces.Services;

public interface IAuthService
{
    Task<AuthenticationModel> AuthenticateUser(LoginRequestDto loginInfo);
    Task<AuthenticationModel> CompleteStudentLogin(StudentSelectionLoginRequestDto request);
    Task<AuthenticationModel> RefreshSession(string refreshToken, string ipAddress);
    Task RevokeRefreshToken(string refreshToken, string ipAddress);
    Task<string> ChangePassword(ChangePasswordDto changePassword);
    Task<ApiResponseDto> ConfirmEmail(string encryptedEmail);
    Task<AuthenticationModel> UpdateUserClaim(int roleId, string menuIds, string type, bool value, Guid userId);
    Task<List<UserRolesPermissionResponseDto>> GetUserRolePermissionClaims(Guid userId);
    Task<List<UserRolesPermissionResponseDto>> GetRolePermission();
    Task SendPasswordResetLink(User user, string email);
    Task<List<RoleMenuPermissionDTO>> GetRoleMenuPermission(int roleId);
}
