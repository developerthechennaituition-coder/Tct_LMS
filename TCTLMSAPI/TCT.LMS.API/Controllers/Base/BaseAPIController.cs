using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TCT.LMS.Application;
using TCT.LMS.Domain;

namespace TCT.LMS.API.Controllers.Base;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public abstract class BaseAPIController<T> : ControllerBase where T : BaseEntity, new()
{
    private readonly IGenericService<T> _service;
    public BaseAPIController(IGenericService<T> service)
    {
        _service = service;
    }
    
    [HttpGet("GetAll")]
    public virtual async Task<ActionResult<IEnumerable<T>>> GetAll(bool hideInActive = false)
    {
        try
        {
            var result = await _service.GetAllAsync(hideInActive);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, "An unexpected error occurred.");
        }
    }    

    [HttpGet("{id}")]
    public async Task<ActionResult<T>> GetById(Guid id)
    {
        var entity = await _service.GetByIdAsync(id);

        if (entity == null)
        {
            return NotFound();
        }

        return Ok(entity);
    }

    [HttpPost]
    public async Task<ActionResult<T>> Create(T entity)
    {
        var createdEntity = await _service.CreateAsync(entity);
        return CreatedAtAction(nameof(GetById), new { id = GetEntityId(createdEntity) }, createdEntity);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, T entity)
    {
        if (id != GetEntityId(entity))
        {
            return BadRequest();
        }

        await _service.UpdateAsync(entity);
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<T>> Delete(Guid id)
    {
        var entity = await _service.DeleteAsync(id);
        if (entity == null)
        {
            return NotFound();
        }

        return Ok(entity);
    }
    private Guid GetEntityId(T entity)
    {
        var idProperty = typeof(T).GetProperty("Id");
        return (Guid)idProperty.GetValue(entity);
    }
    private bool EntityExists(int id)
    {
        return false;
    }
}
