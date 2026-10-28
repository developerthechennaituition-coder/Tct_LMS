using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Internal;
using TCT.LMS.Application;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Data.Common;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.User;

namespace TCT.LMS.Infrastructure.Repositories;

public class AuthRepository : IAuthRepository
{
    private readonly ApplicationDbContext _dbContext;
    private readonly IPasswordHasher<User> _passwordHasher;
    public AuthRepository(ApplicationDbContext dbContext, IPasswordHasher<User> passwordHasher)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
    }

    public async Task<string> ChangePassword(User userDetails, ChangePasswordDto changePassword)
    {
        if (userDetails == null)
            return "User not found.";

        // CurrentPassword is required for an authenticated in-app password change.
        // Password-reset links intentionally leave it empty and are validated separately.
        if (!string.IsNullOrWhiteSpace(changePassword.CurrentPassword))
        {
            var verification = _passwordHasher.VerifyHashedPassword(
                userDetails,
                userDetails.PasswordHash,
                changePassword.CurrentPassword);
            if (verification == PasswordVerificationResult.Failed)
                return "Current password is incorrect.";
        }

        userDetails.PasswordHash = _passwordHasher.HashPassword(userDetails, changePassword.NewPassword);
        userDetails.ModifiedDate = DateTime.Now;
        userDetails.ModifiedBy = userDetails.Id;
        _dbContext.User.Update(userDetails);
        await _dbContext.SaveChangesAsync();
        return "Password changed successfully.";
    }

    public async Task<bool> ConfirmEmail(User userDetails, string email)
    {

        userDetails.EmailConfirmed = true;
        userDetails.ModifiedDate = DateTime.Now;
        userDetails.ModifiedBy = userDetails.Id;
        _dbContext.User.Update(userDetails);
        await _dbContext.SaveChangesAsync();
        return true;
    }

    public async Task<List<UserRolesPermissionResponseDto>> GetUserRolePermissionClaims(Guid userId)
    {

        var userRolesPermissions = await (from ur in _dbContext.UserRole
                                          where ur.UserId == userId && ur.IsActive
                                          select new UserRolesPermissionResponseDto
                                          {
                                              UserId = ur.UserId,
                                              Roles = (from r in _dbContext.Roles
                                                       where r.Id == ur.RoleId && r.IsActive
                                                       select new RolesResponseDto { Id = r.Id.ToString(), RoleName = r.RoleName, }).ToList(),
                                              Permissions = (from rp in _dbContext.RoleMenuPermission
                                                             join p in _dbContext.Menu on rp.MenuId equals p.Id
                                                             where rp.RoleId == ur.RoleId && rp.IsActive && p.IsActive
                                                             select new MenuResponseDto
                                                             {
                                                                 Id = rp.MenuId,
                                                                 Name = p.Name,
                                                                 Add = rp.Add,
                                                                 View = rp.View,
                                                                 Edit = rp.Edit,
                                                                 Delete = rp.Delete,
                                                                 Report = rp.Report ?? false,
                                                             }).ToList()
                                          }).ToListAsync();

        return userRolesPermissions;
    }

    public async Task<AuthenticationModel> UpdateUserClaim(int roleId, string menuIds, string type, bool value, Guid userId)
    {
        var normalizedType = type?.Trim().ToLowerInvariant();
        var supportedTypes = new[] { "view", "add", "edit", "delete", "report", "mapbank" };
        if (!supportedTypes.Contains(normalizedType))
            throw new ArgumentException($"Unsupported permission type '{type}'.", nameof(type));

        var _menuIds = menuIds.Split(",", StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(item => int.TryParse(item, out var menuId) ? menuId : 0)
            .Where(menuId => menuId > 0)
            .Distinct()
            .ToArray();
        if (_menuIds.Length == 0)
            throw new ArgumentException("At least one valid menu ID is required.", nameof(menuIds));

        foreach (var item in _menuIds)
        {
            var menuId = item;

            var currentMenuPermission = _dbContext.RoleMenuPermission
                .Where(i => i.MenuId == menuId && i.RoleId == roleId)
                .FirstOrDefault();

            if (currentMenuPermission != null)
            {
                SetPermission(currentMenuPermission, normalizedType, value);
                currentMenuPermission.IsActive = true;
                currentMenuPermission.ModifiedBy = userId;
                currentMenuPermission.ModifiedDate = DateTime.Now;
                _dbContext.RoleMenuPermission.Update(currentMenuPermission);
            }
            else
            {
                var rolePermission = new RoleMenuPermission
                {
                    RoleId = roleId,
                    MenuId = menuId,
                    CreatedBy = userId,
                    CreatedDate = DateTime.UtcNow,
                    IsActive = true,
                };
                SetPermission(rolePermission, normalizedType, value);
                _dbContext.RoleMenuPermission.Add(rolePermission);
            }
        }
        await _dbContext.SaveChangesAsync();
        return null;
    }

    private static void SetPermission(RoleMenuPermission permission, string type, bool value)
    {
        switch (type)
        {
            case "view": permission.View = value; break;
            case "add": permission.Add = value; break;
            case "edit": permission.Edit = value; break;
            case "delete": permission.Delete = value; break;
            case "report": permission.Report = value; break;
            case "mapbank": permission.MapBank = value; break;
            default: throw new ArgumentOutOfRangeException(nameof(type), type, "Unsupported permission type.");
        }
    }
    public async Task<List<RoleMenuPermissionDTO>> GetRoleMenuPermission(int roleId)
    {
        var result = _dbContext.Menu.Select(s => new RoleMenuPermissionDTO()
        {
            Name = s.Name,
            MenuId = s.Id
        }).ToList();

        foreach (var item in result)
        {
            var _permissions = _dbContext.RoleMenuPermission
                .Where(p => p.MenuId == item.MenuId && p.RoleId == roleId)
                .FirstOrDefault();
            if (_permissions != null)
            {
                item.Add = _permissions.Add;
                item.View = _permissions.View;
                item.Delete = _permissions.Delete;
                item.Edit = _permissions.Edit;
                item.Id = _permissions.Id;
                item.MenuId = item.Id;
                item.RoleId = roleId;
            }
        }
        return result;
    }

    public async Task<List<RoleMenuPermission>> GetRoleMenuPermissionData(int roleId)
    {
        return await _dbContext.RoleMenuPermission
            .Where(p => p.RoleId == roleId)
            .OrderBy(x => x.Id)
            .ToListAsync();
    }

    public async Task<List<UserRolesPermissionResponseDto>> GetRolePermission()
    {

        //var userRolesPermissions = await (from ur in _dbContext.UserRole
        //                                  where ur.IsActive
        //                                  select new UserRolesPermissionResponseDto
        //                                  {
        //                                      UserId = ur.UserId,
        //                                      Roles = (from r in _dbContext.Roles
        //                                               where r.Id == ur.RoleId && r.IsActive
        //                                               select new RolesResponseDto { Id = r.Id, RoleName = r.RoleName }).ToList(),
        //                                      Permissions = (from rp in _dbContext.RoleMenuPermission
        //                                                     join p in _dbContext.Menu on rp.MenuId equals p.Id
        //                                                     where rp.RoleId == ur.RoleId && rp.IsActive && p.IsActive
        //                                                     select new MenuResponseDto
        //                                                     {
        //                                                         Id = rp.MenuId,
        //                                                         Name = p.Name,
        //                                                         Add = rp.Add,
        //                                                         View = rp.View,
        //                                                         Edit = rp.Edit,
        //                                                         Delete = rp.Delete,
        //                                                     }).ToList()
        //                                  }).ToListAsync();
        var userRolesPermissions = await (from r in _dbContext.Roles
                                          where r.IsActive
                                          select new UserRolesPermissionResponseDto
                                          {
                                              Roles = new List<RolesResponseDto> {
                                           new RolesResponseDto { Id = r.Id.ToString(), RoleName = r.RoleName }
                                       },
                                              Permissions = (from rp in _dbContext.RoleMenuPermission
                                                             join p in _dbContext.Menu on rp.MenuId equals p.Id
                                                             where rp.RoleId == r.Id && rp.IsActive && p.IsActive
                                                             select new MenuResponseDto
                                                             {
                                                                 Id = rp.MenuId,
                                                                 Name = p.Name,
                                                                 Add = rp.Add,
                                                                 View = rp.View,
                                                                 Edit = rp.Edit,
                                                                 Delete = rp.Delete,
                                                             }).ToList()
                                          }).ToListAsync();

        return userRolesPermissions;


        //return userRolesPermissions;
    }
}
