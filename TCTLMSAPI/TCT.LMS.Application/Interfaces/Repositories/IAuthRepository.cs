using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.User;

namespace TCT.LMS.Application.Interfaces.Repositories;

public interface IAuthRepository
{
    //public Task<AuthenticationModel> AuthenticateUser(LoginRequestDto loginInfo);
    public Task<string> ChangePassword(User user, ChangePasswordDto changePassword);
    Task<bool> ConfirmEmail(User user, string email);
    Task<List<UserRolesPermissionResponseDto>> GetUserRolePermissionClaims(Guid userId);
    Task<List<UserRolesPermissionResponseDto>> GetRolePermission();
    Task<AuthenticationModel> UpdateUserClaim(int roleId, string menuIds, string type, bool value, Guid userId);
    Task<List<RoleMenuPermissionDTO>> GetRoleMenuPermission(int roleId);
    Task<List<RoleMenuPermission>> GetRoleMenuPermissionData(int roleId);
}
