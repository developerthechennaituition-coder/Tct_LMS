using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TCT.LMS.Application;
using TCT.LMS.Domain.Entities;

namespace TCT.LMS.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class UserAddressController : ControllerBase
{
    private readonly IGenericService<Address> _service;
    private readonly IAuthorizationPolicyProvider _policyProvider;
    public UserAddressController(IGenericService<Address> service, IAuthorizationPolicyProvider policyProvider)
    {
        _service = service;
        _policyProvider = policyProvider;
    }

    [CheckPolicy("User.View")]
    [HttpGet("GetAll")]
    public virtual async Task<ActionResult<IEnumerable<Address>>> GetAll(bool hideInActive = false)
    {
        var result = await _service.GetAllAsync(hideInActive);
        return Ok(result);
    }

    [CheckPolicy("User.View")]
    [HttpGet("{id}")]
    public async Task<ActionResult<Address>> GetById(Guid id)
    {
        var entity = await _service.GetByIdAsync(id);

        if (entity == null)
        {
            return NotFound();
        }

        return Ok(entity);
    }

    [CheckPolicy("User.Add")]
    [HttpPost]
    public async Task<ActionResult<Address>> Create(Address entity)
    {
        var createdEntity = await _service.CreateAsync(entity);
        return CreatedAtAction(nameof(GetById), new { id = GetEntityId(createdEntity) }, createdEntity);
    }

    [CheckPolicy("User.Edit")]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, Address entity)
    {
        if (id != GetEntityId(entity))
        {
            return BadRequest();
        }

        await _service.UpdateAsync(entity);
        return NoContent();
    }

    [CheckPolicy("User.Delete")]
    [HttpDelete("{id}")]
    public async Task<ActionResult<Address>> Delete(Guid id)
    {
        var entity = await _service.DeleteAsync(id);
        if (entity == null)
        {
            return NotFound();
        }

        return Ok(entity);
    }

    private Guid GetEntityId(Address entity)
    {
        var idProperty = typeof(Address).GetProperty("Id");
        return (Guid)idProperty.GetValue(entity);
    }
}
