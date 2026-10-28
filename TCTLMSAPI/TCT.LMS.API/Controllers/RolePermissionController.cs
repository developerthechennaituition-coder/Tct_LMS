using Microsoft.AspNetCore.Mvc;
using TCT.LMS.API.Controllers.Base;
using TCT.LMS.Application;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Menu;

namespace TCT.LMS.API.Controllers;

public class RolePermissionController : BaseAPIController<RolePermission>
{
    private readonly IMenuService _menuService;
    public RolePermissionController(IGenericService<RolePermission> service, IMenuService menuService) : base(service)
    {
        _menuService = menuService;
    }

    [HttpGet("gethierarchymenu")]
    public async Task<IActionResult> GetHierarchyMenu(int roleId)
    {
        var result = await _menuService.GetHierarchyMenu(roleId);
        return Ok(result);
    }
}