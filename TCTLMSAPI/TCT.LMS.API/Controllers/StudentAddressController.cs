using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TCT.LMS.Application;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Address;

namespace TCT.LMS.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class StudentAddressController : ControllerBase
{
    private readonly IAddressService _addressService;
    private readonly IGenericService<StudentAddress> _service;
    private readonly IAuthorizationPolicyProvider _policyProvider;
    public StudentAddressController(IGenericService<StudentAddress> service, IAuthorizationPolicyProvider policyProvider, IAddressService addressService)
    {
        _service = service;
        _policyProvider = policyProvider;
        _addressService = addressService;
    }

    [CheckPolicy("Student.View")]
    [HttpGet("GetAll")]
    public virtual async Task<ActionResult<IEnumerable<StudentAddress>>> GetAll(bool hideInActive = false)
    {
        var result = await _service.GetAllAsync(hideInActive);
        return Ok(result);
    }

    [CheckPolicy("Students.View")]
    [HttpGet("{id}")]
    public async Task<ActionResult<StudentAddress>> GetById(Guid id)
    {
        var entity = await _service.GetByIdAsync(id);

        if (entity == null)
        {
            return NotFound();
        }

        return Ok(entity);
    }

    [CheckPolicy("Student.Add")]
    [HttpPost]
    public async Task<ActionResult<StudentAddress>> Create(StudentAddress entity)
    {
        var createdEntity = await _service.CreateAsync(entity);
        return CreatedAtAction(nameof(GetById), new { id = GetEntityId(createdEntity) }, createdEntity);
    }

    [CheckPolicy("Student.Edit")]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, StudentAddress entity)
    {
        if (id != GetEntityId(entity))
        {
            return BadRequest();
        }

        await _service.UpdateAsync(entity);
        return NoContent();
    }

    [HttpPost("addupdateaddress")]
    public async Task<IActionResult> AddUpdateAddress(StudentAddressRequestDto input)
    {
        var result = await _addressService.AddUpdateAddress(input);
        return Ok(result);
    }

    [CheckPolicy("Student.Delete")]
    [HttpDelete("{id}")]
    public async Task<ActionResult<StudentAddress>> Delete(Guid id)
    {
        var entity = await _service.DeleteAsync(id);
        if (entity == null)
        {
            return NotFound();
        }

        return Ok(entity);
    }

    private Guid GetEntityId(StudentAddress entity)
    {
        var idProperty = typeof(StudentAddress).GetProperty("Id");
        return (Guid)idProperty.GetValue(entity);
    }
}