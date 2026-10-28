using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Collections;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Lookup;
using TCT.LMS.DTOs.Wrappers;

namespace TCT.LMS.API.Controllers;

//[Authorize(Roles = "Admin")]
[ApiController]
[Route("api/[controller]")]
public class MasterDetailController : ControllerBase
{
    private readonly IMasterDetailService _service;
    public MasterDetailController(IMasterDetailService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable>> GetAll(bool hideInActive = false)
    {
        return Ok(await _service.GetMasterDetailAsync(hideInActive));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult> GetById(Guid id)
    {
        var entity = await _service.GetMasterDetailByIdAsync(id);

        if (entity == null)
        {
            return NotFound();
        }

        return Ok(entity);
    }

    [HttpGet("GetByTypeGroupId/{id}")]
    public async Task<ActionResult> GetByTypeGroupId(string id)
    {
        var entity = await _service.GetByTypeGroupId(id);
        entity = entity.OrderBy(s => s.TypeCodeName);
        if (entity == null)
        {
            return NotFound();
        }

        return Ok(entity);
    }

    [HttpPost]
    public async Task<ActionResult<Type_Code>> Create(Type_Code entity)
    {
        if (!ModelState.IsValid)
        {
            //_logger.LogWarning("{0}.ListEmployees(hideInactive: {1}) > bad request due to invalid ModelState: {2}", GetType().Name, hideInactive, JsonConvert.SerializeObject(ModelState));
            return BadRequest(ModelState);
        }
        var result = await _service.CreateMasterDetailAsync(entity);
        return result;

    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, Type_Code typeCode)
    {
        if (id != typeCode.Id)
        {
            return BadRequest();
        }

        await _service.UpdateMasterDetailAsync(typeCode);
        return NoContent();
    }

    [HttpGet("deletetypecode")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _service.DeleteMasterDetailAsync(id);
        return Ok(true);
    }

    [HttpPost("addupdatetypecode")]
    public async Task<IActionResult> AddUpdateTypeCode(Type_Code entity)
    {
        var result = await _service.AddUpdateTypeCode(entity);
        return Ok(result);
    }

    [HttpGet("GetGradeGroupByBoardAsync")]
    public async Task<ActionResult> GetGradeGroupByBoardAsync(string boardIds)
    {
        var entity = await _service.GetGradeGroupByBoardAsync(boardIds);
        entity = entity.OrderBy(s => s.TypeCodeValue);
        if (entity == null)
        {
            return NotFound();
        }

        return Ok(entity);
    }

    [HttpPost("GetGradeByGroupAsync")]
    public async Task<ActionResult> GetGradeByGroupAsync([FromBody] GradeGroupRequest input)
    {
        var entity = await _service.GetGradeByGroupAsync(input.BoardIds, input.GroupIds);
        entity = entity.OrderBy(s => s.TypeCodeValue);
        if (entity == null)
        {
            return NotFound();
        }

        return Ok(entity);
    }
}
