using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Application.Services;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Address;
using TCT.LMS.DTOs.Sales;
using TCT.LMS.DTOs.Wrappers;

namespace TCT.LMS.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class SalesController : ControllerBase
{
    private readonly ISalesService _salesService;
    private readonly IUserService _userService;
    public SalesController(ISalesService salesService, IUserService userService)
    {
        _salesService = salesService;
        _userService = userService;
    }

    //[CheckPolicy("Sales.View")]
    [HttpGet("GetAll")]
    public async Task<ActionResult<IEnumerable<Sales>>> GetAllSales(bool hideInActive = false, bool hideIsPrimary = false)
    {
        if (!ModelState.IsValid)
        {
            //_logger.LogWarning("{0}.ListEmployees(hideInactive: {1}) > bad request due to invalid ModelState: {2}", GetType().Name, hideInactive, JsonConvert.SerializeObject(ModelState));
            return BadRequest(ModelState);
        }

        var sales = await _salesService.GetAllSales(hideInActive, hideIsPrimary);
        return Ok(sales);
    }

    //[CheckPolicy("Sales.View")]
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<SalesRequestDto>> GetSalesById(Guid id)
    {
        if (!ModelState.IsValid)
        {
            //_logger.LogWarning("{0}.ListEmployees(hideInactive: {1}) > bad request due to invalid ModelState: {2}", GetType().Name, hideInactive, JsonConvert.SerializeObject(ModelState));
            return BadRequest(ModelState);
        }
        var sales = await _salesService.GetSalesById(id);
        if (sales == null)
        {
            return NotFound();
        }
        return Ok(sales);
    }

    //[CheckPolicy("Sales.Add")]
    //[AllowAnonymous]
    [HttpPost("createsales")]
    public async Task<IActionResult> CreateSales([FromForm] SalesRequestDto salesDto)
    {
        Response<UserDTO> response = new Response<UserDTO>();
        try
        {
            var unsupportedFile = salesDto.Files?.FirstOrDefault(file =>
            {
                var extension = Path.GetExtension(file.FileName);
                return !extension.Equals(".mp3", StringComparison.OrdinalIgnoreCase)
                       && !extension.Equals(".m4a", StringComparison.OrdinalIgnoreCase)
                       && !extension.Equals(".jpg", StringComparison.OrdinalIgnoreCase)
                       && !extension.Equals(".jpeg", StringComparison.OrdinalIgnoreCase)
                       && !extension.Equals(".png", StringComparison.OrdinalIgnoreCase)
                       && !extension.Equals(".svg", StringComparison.OrdinalIgnoreCase);
            });
            if (unsupportedFile != null)
            {
                return BadRequest(new { succeeded = false, message = "Only JPG, PNG, SVG, MP3 and M4A files are allowed." });
            }
            //if (salesDto.Student.EmailAddress != null)
            //{
            //    var result = await _userService.GetUserByEmail(salesDto.Student.EmailAddress, false);
            //    if (result != null)
            //    {
            //        response.Succeeded = false;
            //        response.Message = $"{salesDto.Student.EmailAddress} already available!";
            //        return Ok(response);
            //    }
            //}
            salesDto.BoardId = salesDto.Student.BoardId;
            salesDto.GradeId = salesDto.Student.GradeId;
            var value = JsonSerializer.Serialize(salesDto);
            if (!ModelState.IsValid)
            {
                //_logger.LogWarning("{0}.ListEmployees(hideInactive: {1}) > bad request due to invalid ModelState: {2}", GetType().Name, hideInactive, JsonConvert.SerializeObject(ModelState));
                return BadRequest(ModelState);
            }
            var createdSales = await _salesService.CreateSales(salesDto);
            response.Succeeded = true;
            response.Message = $"Student enrolled successfully!";
            return Ok(response);
        }
        catch (InvalidOperationException ex)
            when (ex.Message.StartsWith(
                "DUPLICATE_STUDENT:",
                StringComparison.Ordinal))
        {
            return Conflict(new
            {
                succeeded = false,
                message = ex.Message.Replace(
                    "DUPLICATE_STUDENT: ",
                    "",
                    StringComparison.Ordinal)
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new
            {
                succeeded = false,
                message = ex.Message
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new
            {
                succeeded = false,
                message = ex.Message
            });
        }
        catch (Exception ex)
        {
            // Unexpected server error
            return StatusCode(500, new
            {
                succeeded = false,
                message = "An unexpected error occurred.",
                detail = ex.Message
            });
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateSales(Guid id, SalesRequestDto salesDto)
    {
        try
        {
            await _salesService.UpdateSales(id, salesDto);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpPost("updatestudentinfo")]
    public async Task<IActionResult> UpdateStudentSalesInfo([FromForm] SalesRequestDto salesDto)
    {
        try
        {
            var result = await _salesService.UpdateStudentInfo(salesDto);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return Ok(new Response<bool>(ex.Message));
        }
    }


    [HttpPost("updateadditionalinfo")]
    public async Task<IActionResult> UpdateAdditionalSalesInfo([FromForm] SalesRequestDto salesDto)
    {
        try
        {
            var result = await _salesService.UpdateStudentAdditionalInfo(salesDto);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return Ok(new Response<bool>(ex.Message));
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteSales(Guid id)
    {
        try
        {
            await _salesService.DeleteSales(id);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpGet("getenrolledcourse")]
    public async Task<IActionResult> GetEnrolledCoursesById(Guid studentId, [FromQuery] Guid? userId,
        [FromServices] IStudentDashboardService studentDashboardService, CancellationToken token)
    {
        // Optional: callers that only know the student's user id (e.g. the calendar opened with ?id=<userId>).
        if (studentId == Guid.Empty && userId.HasValue && userId.Value != Guid.Empty)
        {
            try
            {
                studentId = await studentDashboardService.GetStudentIdAsync(userId.Value, token);
            }
            catch (KeyNotFoundException)
            {
                return Ok(new List<object>());
            }
        }

        var result = await _salesService.GetEnrolledCousesById(studentId);
        return Ok(result.ToList());
    }

    [HttpGet("GetCoursesByCoordinatorId")]
    public async Task<IActionResult> GetCoursesByCoordinatorId(Guid studentId, Guid coordinatorId)
    {
        var result = await _salesService.GetCoursesByCoordinatorId(studentId, coordinatorId);
        return Ok(result.ToList());
    }

    [HttpGet("GetSubjectList")]
    public async Task<IActionResult> GetSubjectList(Guid studentId, Guid coordinatorId)
    {
        var result = await _salesService.GetSubjectList(studentId, coordinatorId);
        return Ok(result.ToList());
    }

    [HttpPost("enrollnewcourse")]
    public async Task<IActionResult> EnrollNewCourse(SalesDetailsRequestDto input)
    {
        var result = await _salesService.EnrollCouse(input);
        return Ok(result);
    }

    [HttpDelete("deletecourse")]
    public IActionResult DeleteCourse(Guid detailsId)
    {
        var result = _salesService.DeleteCourse(detailsId);
        return Ok(result);
    }

    [HttpPost("UpdateSalesDetailsStatus")]
    public async Task<IActionResult> UpdateSalesDetailsStatus(UpdateSalesDetailsDTO salesDetailsDto)
    {
        var result = await _salesService.UpdateSalesDetailsStatus(salesDetailsDto);
        return Ok(result);
    }

    [HttpPost("UpdateStudentDropout")]
    public async Task<IActionResult> UpdateStudentDropout(UpdateSalesDetailsDTO salesDetailsDto)
    {
        var result = await _salesService.UpdateStudentDropout(salesDetailsDto);
        return Ok(result);
    } 

    [HttpPost("UpdateTutorAssignedStatus")]
    public async Task<IActionResult> UpdateSalesDetailsTutorAssignedStatus(SalesDetailsRequestDto salesDetailsDto)
    {
        try
        {
            salesDetailsDto.Id = salesDetailsDto.SalesDetailsId.Value;
            await _salesService.UpdateSalesDetailsTutorAssignedStatus(salesDetailsDto);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpGet("salesDetails")]
    public async Task<IActionResult> GetSalesByDetailsId(Guid salesId, Guid salesDetailsId, Guid scheduleDetailsId, string userRole = null)
    {
        if (salesDetailsId == Guid.Empty)
        {
            return BadRequest(ApiResponseDto.Failure("Sales details ID is required."));
        }

        var result = _salesService.GetSalesDetailsById(salesId, salesDetailsId, scheduleDetailsId, userRole);
        return Ok(result);
    }

    [HttpPost("updateenrolledcourse")]
    public async Task<IActionResult> UpdateEnrolledCourse(CourseRequestDto input)
    {
        var result = await _salesService.UpdateCourse(input);
        return Ok(result);
    }
}
