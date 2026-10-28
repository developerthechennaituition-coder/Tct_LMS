using DocumentFormat.OpenXml.Office2010.Excel;
using DocumentFormat.OpenXml.Spreadsheet;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Application.Services;
using TCT.LMS.Data.Common;
using TCT.LMS.Domain;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Address;
using TCT.LMS.DTOs.User;
using TCT.LMS.DTOs.Wrappers;

namespace TCT.LMS.API.Controllers;

//[Authorize(Roles = "Admin")]
[ApiController]
[Route("api/[controller]")]
public class UserController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly IDocumentService _documentService;
    public readonly ApplicationDbContext _dbContext;
    public UserController(IUserService userService, ApplicationDbContext dbContext, IDocumentService documentService)
    {
        _documentService = documentService;
        _userService = userService;
        _dbContext = dbContext;
    }

    [HttpGet("GetAllUser")]
    public async Task<ActionResult<IEnumerable<UserDTO>>> GetAllUser(
        int? roleId,
        string? filterText,
        Guid? managerId = null,
        bool excludeStudentTutor = false,
        bool includeProfileImages = true,
        [FromQuery] int[]? roleIds = null)
    {
        if (roleId == -1)
        {
            roleId = null;
        }
        List<UserDTO> result = new List<UserDTO>();
        try
        {
            var users = await _userService.GetAllUser(roleId, filterText, managerId, roleIds, excludeStudentTutor);
            foreach (var user in users)
            {
                var _user = new UserDTO()
                {
                    UserCode = user.UserCode,
                    Id = user.Id,
                    FullName = user.FullName,
                    FirstName = user.FirstName,
                    IsSystemUser = user.IsSystemUser,
                    IsActive = user.IsActive,
                    IsAdminUser = user.IsAdminUser,
                    AlternatePhone = user.AlternatePhone,
                    DesignationId = user.DesignationId,
                    DOB = user.DOB,
                    ManagerId = user.ManagerId,
                    Email = user.Email,
                    Gender = user.Gender,
                    Nickname = string.IsNullOrEmpty(user.Nickname) ? user.FullName : user.Nickname,
                    Role = user.Role,
                    Location = user.Location,
                    JoiningDate = user.JoiningDate,
                    CreatedDate = user.CreatedDate,
                    CreatedBy = user.CreatedBy
                };

                if (includeProfileImages)
                {
                    var _doc = _dbContext.Documents.Where(s => s.UserId == _user.Id).OrderByDescending(s => s.CreatedDate).FirstOrDefault();
                    if (_doc != null)
                    {
                        var docStorage = _dbContext.DocumentStorage.OrderByDescending(s => s.CreatedDate).FirstOrDefault(s => s.DocumentId == _doc.Id);
                        if (docStorage != null)
                        {
                            var file = await _documentService.ReadFileAsync(docStorage.FilePath);
                            _user.FileData = file.FileData;
                        }
                    }
                }
                result.Add(_user);

            }
            result = result.OrderByDescending(o => o.CreatedDate).ToList();
        }
        catch (Exception ex)
        {
            throw ex;
        }
        return Ok(result);
    }

    [AllowAnonymous]
    [HttpGet("GetAllOwnership")]
    public async Task<ActionResult<IEnumerable<UserDTO>>> GetAllOwnership()
    {
        List<UserDTO> result = new List<UserDTO>();

        var userType = (int)UserType.OrganizationUser;
        var ownershipRoleIds = new[]
        {
            (int)UserRoleEnum.OperationsAdmin,
            (int)UserRoleEnum.Operations
        };
        var users = await _userService.GetAllUser(null, string.Empty, roleIds: ownershipRoleIds);


        foreach (var user in users)
        {
            var _user = new UserDTO()
            {
                UserCode = user.UserCode,
                Id = user.Id,
                FullName = user.FullName,
                FirstName = user.FirstName,
                IsSystemUser = user.IsSystemUser,
                IsActive = user.IsActive,
                IsAdminUser = user.IsAdminUser,
                AlternatePhone = user.AlternatePhone,
                DesignationId = user.DesignationId,
                DOB = user.DOB,
                ManagerId = user.ManagerId,
                Email = user.Email,
                Gender = user.Gender,
                Location = user.Location,
                JoiningDate = user.JoiningDate,
                CreatedDate = user.CreatedDate,
                CreatedBy = user.CreatedBy
            };

            var _doc = _dbContext.Documents.Where(s => s.UserId == _user.Id).OrderByDescending(s => s.CreatedDate).FirstOrDefault();
            if (_doc != null)
            {
                var docStorage = _dbContext.DocumentStorage.OrderByDescending(s => s.CreatedDate).FirstOrDefault(s => s.DocumentId == _doc.Id);
                if (docStorage != null)
                {
                    var file = await _documentService.ReadFileAsync(docStorage.FilePath);
                    _user.FileData = file.FileData;
                }
            }
            result.Add(_user);

        }
        result = result.OrderByDescending(o => o.CreatedDate).ToList();
        return Ok(result);
    }


    [HttpGet("GetAllCoordinator")]
    public async Task<ActionResult<IEnumerable<UserDTO>>> GetAllCoordinator()
    {
        var userType = (int)UserType.OrganizationUser;
        var coordinatorsRoleIds = new[]
        {
            (int)UserRoleEnum.Coordinator,
            (int)UserRoleEnum.CoordinatorAdmin
        };
        var users = await _userService.GetAllUser(null, string.Empty, roleIds: coordinatorsRoleIds);

        List<UserDTO> result = new List<UserDTO>();
       
        foreach (var user in users.Where(u => u.Role == "Coordinator"))
        {
            var _user = new UserDTO()
            {
                UserCode = user.UserCode,
                Id = user.Id,
                FullName = user.FullName,
                FirstName = user.FirstName,
                IsSystemUser = user.IsSystemUser,
                IsActive = user.IsActive,
                IsAdminUser = user.IsAdminUser,
                AlternatePhone = user.AlternatePhone,
                DesignationId = user.DesignationId,
                DOB = user.DOB,
                ManagerId = user.ManagerId,
                Email = user.Email,
                Gender = user.Gender,
                Location = user.Location,
                JoiningDate = user.JoiningDate,
                CreatedDate = user.CreatedDate,
                CreatedBy = user.CreatedBy
            };

            var _doc = _dbContext.Documents.Where(s => s.UserId == _user.Id).OrderByDescending(s => s.CreatedDate).FirstOrDefault();
            if (_doc != null)
            {
                var docStorage = _dbContext.DocumentStorage.OrderByDescending(s => s.CreatedDate).FirstOrDefault(s => s.DocumentId == _doc.Id);
                if (docStorage != null)
                {
                    var file = await _documentService.ReadFileAsync(docStorage.FilePath);
                    _user.FileData = file.FileData;
                }
            }
            result.Add(_user);

        }
        result = result.OrderByDescending(o => o.CreatedDate).ToList();
        return Ok(result);
    }


    [HttpGet("{id}")]
    public async Task<ActionResult<User>> GetUser(Guid id)
    {
        var user = await _userService.GetUserById(id);
        if (user == null)
        {
            return NotFound();
        }
        return Ok(user);
    }


    [HttpGet("email/{email}")]
    public async Task<ActionResult<User>> GetUserByEmail(string email)
    {
        var user = await _userService.GetUserByEmail(email);
        if (user == null)
        {
            return NotFound();
        }
        return Ok(user);
    }

    [Authorize]
    [HttpGet("gettctuserbyid")]
    public async Task<IActionResult> GetTCTUserById(Guid id)
    {
        var result = await _userService.GetTCTUserById(id);
        if (result?.Data != null)
        {
            result.Data.PasswordHash = null;

            var callerId = User.Claims
                .Where(claim => claim.Type.Equals("UserId", StringComparison.OrdinalIgnoreCase)
                    || claim.Type == System.Security.Claims.ClaimTypes.NameIdentifier
                    || claim.Type.EndsWith("/nameidentifier", StringComparison.OrdinalIgnoreCase)
                    || claim.Type.Equals("sub", StringComparison.OrdinalIgnoreCase))
                .Select(claim => Guid.TryParse(claim.Value, out var value) ? value : Guid.Empty)
                .FirstOrDefault(value => value != Guid.Empty);
            var callerRole = callerId == Guid.Empty
                ? null
                : await (from userRole in _dbContext.UserRole
                         join role in _dbContext.Roles on userRole.RoleId equals role.Id
                         where userRole.UserId == callerId && userRole.IsActive && role.IsActive
                         select role.RoleName).FirstOrDefaultAsync();
            var targetRole = await (from userRole in _dbContext.UserRole
                                    join role in _dbContext.Roles on userRole.RoleId equals role.Id
                                    where userRole.UserId == result.Data.Id && userRole.IsActive && role.IsActive
                                    select role.RoleName).FirstOrDefaultAsync();
            var hideContact =
                (string.Equals(callerRole, "Tutor", StringComparison.OrdinalIgnoreCase)
                    && string.Equals(targetRole, "Student", StringComparison.OrdinalIgnoreCase))
                || (string.Equals(callerRole, "Student", StringComparison.OrdinalIgnoreCase)
                    && string.Equals(targetRole, "Tutor", StringComparison.OrdinalIgnoreCase));
            if (hideContact)
            {
                result.Data.Email = null;
                result.Data.Phone = null;
                result.Data.AlternatePhone = null;
            }

            var userId = result.Data.Id;
            var _doc = _dbContext.Documents
                .Where(s => s.UserId == userId
                            && s.DocumentTypeId == Guid.Empty
                            && s.IsActive)
                .OrderByDescending(s => s.CreatedDate)
                .FirstOrDefault();
            if (_doc != null)
            {
                var docStorage = _dbContext.DocumentStorage.OrderByDescending(s => s.CreatedDate).FirstOrDefault(s => s.DocumentId == _doc.Id);
                if (docStorage != null)
                {
                    var file = await _documentService.ReadFileAsync(docStorage.FilePath);
                    result.Data.FileData = file.FileData;
                }
            }
        }
        return Ok(result);
    }

    [HttpPost("CreateTCTUser")]
    public async Task<IActionResult> CreateTCTUser(UserDTO userDTO)
    {
        Response<UserDTO> response = new Response<UserDTO>();
        if (userDTO.Id == Guid.Empty || userDTO.Id == null)
        {
            var result = await _userService.CheckEmailAlreadyExists(userDTO.Email);
            if (result != null)
            {
                response.Succeeded = false;
                response.Message = "Email already available";
                return Ok(response);
            }
        }
        response.Message = "User successfully added.";
        response = await _userService.AddTCTUser(userDTO);
        response.Succeeded = true;
        return Ok(response);
    }

    [HttpPost("CreateUser")]
    public async Task<ActionResult<User>> CreateUser(User user)
    {
        user.Location = "chennai";
        var createdUser = await _userService.AddUser(user);
        return CreatedAtAction(nameof(GetUser), new { id = createdUser.Id }, createdUser);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateUser(Guid id, User user)
    {
        if (id != user.Id)
        {
            return BadRequest();
        }

        try
        {
            var updatedUser = await _userService.UpdateUser(user);
            return Ok(updatedUser);
        }
        catch (Exception)
        {
            if (!await UserExists(id))
            {
                return NotFound();
            }
            throw;
        }
    }

    [HttpDelete("deleteuser")]
    public async Task<IActionResult> DeleteUser(Guid id)
    {
        var result = await _userService.DeleteUser(id);
        return Ok(result);
    }

    [Authorize]
    [HttpPost("setUserStatus")]
    public async Task<IActionResult> SetUserStatus(Guid id, bool isActive)
    {
        var callerId = User.Claims
            .Where(claim => claim.Type.Equals("UserId", StringComparison.OrdinalIgnoreCase)
                || claim.Type == System.Security.Claims.ClaimTypes.NameIdentifier
                || claim.Type.EndsWith("/nameidentifier", StringComparison.OrdinalIgnoreCase)
                || claim.Type.Equals("sub", StringComparison.OrdinalIgnoreCase))
            .Select(claim => Guid.TryParse(claim.Value, out var value) ? value : Guid.Empty)
            .FirstOrDefault(value => value != Guid.Empty);
        if (callerId == Guid.Empty)
            return Unauthorized(new { message = "Your login session is invalid. Please sign in again." });

        var callerRoleId = User.Claims
            .Where(claim => claim.Type.Equals("RoleId", StringComparison.OrdinalIgnoreCase))
            .Select(claim => int.TryParse(claim.Value, out var value) ? value : 0)
            .FirstOrDefault(value => value > 0);

        var callerRoleName = User.Claims
            .Where(claim => claim.Type == System.Security.Claims.ClaimTypes.Role
                || claim.Type.EndsWith("/role", StringComparison.OrdinalIgnoreCase)
                || claim.Type.Equals("role", StringComparison.OrdinalIgnoreCase))
            .Select(claim => claim.Value)
            .FirstOrDefault();

        var canManageUsers = callerRoleId == (int)UserRoleEnum.SuperAdmin
            || string.Equals(callerRoleName, "SuperAdmin", StringComparison.OrdinalIgnoreCase)
            || await (from userRole in _dbContext.UserRole
                                    join permission in _dbContext.RoleMenuPermission
                                        on userRole.RoleId equals permission.RoleId
                                    join menu in _dbContext.Menu on permission.MenuId equals menu.Id
                                    where userRole.UserId == callerId
                                          && userRole.IsActive
                                          && permission.IsActive
                                          && permission.Delete
                                          && menu.IsActive
                                          && (menu.Name == "User List" || menu.Name == "Student List")
                                    select permission.Id).AnyAsync();
        if (!canManageUsers)
            return Forbid();

        var user = await _dbContext.User.FirstOrDefaultAsync(x => x.Id == id);
        if (user == null)
            return NotFound(new { message = "User not found." });

        user.IsActive = isActive;
        user.ModifiedDate = DateTime.Now;
        _dbContext.User.Update(user);
        await _dbContext.SaveChangesAsync();

        return Ok(new { succeeded = true, userId = user.Id, isActive = user.IsActive });
    }

    private async Task<bool> UserExists(Guid id)
    {
        var user = await _userService.GetUserById(id);
        return user != null;
    }

    [HttpGet("GetTutor")]
    public async Task<ActionResult<IEnumerable<UserDTO>>> GetAllTutor()
    {
        var userType = (int)UserType.Tutor;
        var users = await _userService.GetAllUser((int)UserRoleEnum.Tutor/*Tutor*/, string.Empty);

        List<UserDTO> result = new List<UserDTO>();

        foreach (var user in users.Where(t => t.IsActive == true))
        {
            var _user = new UserDTO()
            {
                UserCode = user.UserCode,
                Id = user.Id,
                FullName = user.FullName,
                FirstName = user.FirstName,
                IsSystemUser = user.IsSystemUser,
                IsActive = user.IsActive,
                IsAdminUser = user.IsAdminUser,
                AlternatePhone = user.AlternatePhone,
                DesignationId = user.DesignationId,
                DOB = user.DOB,
                ManagerId = user.ManagerId,
                Email = user.Email,
                Gender = user.Gender,
                Location = user.Location,
                JoiningDate = user.JoiningDate,
                CreatedDate = user.CreatedDate,
                CreatedBy = user.CreatedBy,
                Role = user.Role,
                RoleId = user.RoleId
            };

            var _doc = _dbContext.Documents.Where(s => s.UserId == _user.Id).OrderByDescending(s => s.CreatedDate).FirstOrDefault();
            if (_doc != null)
            {
                var docStorage = _dbContext.DocumentStorage.OrderByDescending(s => s.CreatedDate).FirstOrDefault(s => s.DocumentId == _doc.Id);
                if (docStorage != null)
                {
                    var file = await _documentService.ReadFileAsync(docStorage.FilePath);
                    _user.FileData = file.FileData;
                }
            }
            result.Add(_user);

        }
        result = result.OrderByDescending(o => o.CreatedDate).ToList();
        return Ok(result);
    }

    [HttpGet("getCoordinatorAdmins")]
    public async Task<ActionResult<IEnumerable<UserDTO>>> GetCoordinatorAdmins()
    {
        var users = await _userService.GetCoordinatorAdmins();

        List<UserDTO> result = new List<UserDTO>();

        foreach (var user in users.Where(t => t.IsActive == true))
        {
            var _user = new UserDTO()
            {
                UserCode = user.UserCode,
                Id = user.Id,
                FullName = user.FullName,
                FirstName = user.FirstName,
                IsSystemUser = user.IsSystemUser,
                IsActive = user.IsActive,
                IsAdminUser = user.IsAdminUser,
                AlternatePhone = user.AlternatePhone,
                DesignationId = user.DesignationId,
                DOB = user.DOB,
                ManagerId = user.ManagerId,
                Email = user.Email,
                Gender = user.Gender,
                Location = user.Location,
                JoiningDate = user.JoiningDate,
                CreatedDate = user.CreatedDate,
                CreatedBy = user.CreatedBy
            };

            result.Add(_user);
        }
        result = result.OrderByDescending(o => o.CreatedDate).ToList();
        return Ok(result);
    }


    [HttpGet("getSuperAdmins")]
    public async Task<ActionResult<IEnumerable<UserDTO>>> GetSuperAdmins()
    {
        var users = await _userService.GetSuperAdmins();
        return Ok(users);
    }

    [HttpPost("updateUserActivity")]
    public async Task<IActionResult> UpdateUserActivity([FromBody] LogoutRequest request)
    {
        if (request == null || request.UserId == Guid.Empty)
        {
            return BadRequest("Invalid user ID.");
        }
        await _userService.UpdateUserActivity(request.UserId);
        return Ok(new { message = "User logged out successfully" });
    }

    [HttpGet("getUserActivitybyId")]
    public async Task<ActionResult<IEnumerable<UserActivityResponseDTO>>> GetUserActivitybyId(Guid id)
    {
        var users = await _userService.GetUserActivitybyId(id);

        return Ok(users);
    }

    [HttpPost("addOrUpdateUserAvailability")]
    public async Task<IActionResult> AddOrUpdateUserAvailability(UserAvailabilityRequestDto input)
    {
        Response<UserAvailabilityRequestDto> response = new Response<UserAvailabilityRequestDto>();
        input.TimeZone = "India Standard Time";
        TimeZoneInfo selectedTimeZone = TimeZoneInfo.FindSystemTimeZoneById("India Standard Time");
        DateTime currentTimeInSelectedZone = DateTime.UtcNow;// TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, selectedTimeZone);
        DateTime selectedStartTime = input.StartTime;// TimeZoneInfo.ConvertTimeFromUtc(input.StartTime, selectedTimeZone);
        DateTime selectedEndTime = input.EndTime;// TimeZoneInfo.ConvertTimeFromUtc(input.EndTime, selectedTimeZone);

        if (((input.UserAvailabilityId == Guid.Empty ||
            input.UserAvailabilityId == null) &&
            (input.UserAvailabilityExceptionId == Guid.Empty ||
            input.UserAvailabilityExceptionId == null)) &&
            !input.IsRecurring && (selectedStartTime < currentTimeInSelectedZone))
        {
            response.Succeeded = false;
            response.Message = "Selected time is already past. Please choose a future time.";
            return Ok(response);
        }

        if (selectedEndTime <= selectedStartTime)
        {
            response.Succeeded = false;
            response.Message = "The end time must be greater than the start time.";
            return Ok(response);
        }

        if ((input.UserAvailabilityId == Guid.Empty ||
            input.UserAvailabilityId == null) &&
            (input.UserAvailabilityExceptionId == Guid.Empty ||
            input.UserAvailabilityExceptionId == null))
        {
            var result = await _userService.CheckDayOfWeekExits(input);
            //if (result != null)
            //{
            //    response.Succeeded = false;
            //    response.Message = $"Selected Day '{input.DayOfWeek}' already exists";
            //    return Ok(response);
            //}
        }

        response.Message = "User avaiability slot successfully added.";
        response = await _userService.AddOrUpdateUserAvailability(input);
        response.Succeeded = true;
        return Ok(response);
    }

    [HttpGet("getUserAvailabilityDataByUserIdAsync")]
    public async Task<ActionResult<Response<List<UserAvailabilityRequestDto>>>> GetUserAvailabilityDataByUserIdAsync(Guid id)
    {
        var result = await _userService.GetUserAvailabilityDataByUserIdAsync(id);
        return Ok(result);
    }

    [HttpGet("GetOverlappingTimeSlot")]
    public async Task<ActionResult<List<TimeSlotsGroup>>> GetOverlappingTimeSlot(Guid tutorId, Guid stdId, DateTime? date = null)
    {
        var result = await _userService.GetOverlappingTimeSlot(tutorId, stdId, date);
        return Ok(result);
    }

    // A user's free slots on each date in [from, to] (availability minus booked classes), plus the
    // booked classes themselves. Shown on "Request for Re-schedule": the student's slots to a tutor,
    // the tutor's slots to a student.
    [HttpGet("GetUserAvailableSlots")]
    [Authorize]
    public async Task<ActionResult<UserAvailableSlotsDto>> GetUserAvailableSlots(Guid userId, DateTime from, DateTime to)
    {
        if (userId == Guid.Empty) return BadRequest("userId is required.");
        if (to.Date < from.Date || (to.Date - from.Date).TotalDays > 62)
            return BadRequest("Date range must be between 1 and 63 days.");
        return Ok(await _userService.GetUserAvailableSlots(userId, from, to));
    }

    // Student vs tutor free time on each date in [from, to]: when both are free, and when only one is.
    // Used by Operations to resolve a "Request for Re-schedule".
    [HttpGet("GetAvailabilityComparison")]
    [Authorize(Roles = "Operations,OperationsAdmin,SuperAdmin,Admin")]
    public async Task<ActionResult<AvailabilityComparisonDto>> GetAvailabilityComparison(Guid studentUserId, Guid tutorUserId, DateTime from, DateTime to)
    {
        if (studentUserId == Guid.Empty || tutorUserId == Guid.Empty)
            return BadRequest("studentUserId and tutorUserId are required.");
        if (to.Date < from.Date || (to.Date - from.Date).TotalDays > 62)
            return BadRequest("Date range must be between 1 and 63 days.");
        return Ok(await _userService.CompareAvailability(studentUserId, tutorUserId, from, to));
    }

    [HttpGet("getUserAvailabilityById")]
    public async Task<ActionResult<Response<UserAvailabilityRequestDto>>> GetUserAvailabilityById(Guid id)
    {
        var result = await _userService.GetUserAvailabilityDataByIdAsync(id);
        return Ok(result);
    }

    [HttpPost("addusertimeslots")]
    public async Task<IActionResult> AddUserTimeSlots(UserTimeSlots input)
    {
        var result = await _userService.AddTimeSlots(input);
        return Ok(result);
    }

    [AllowAnonymous]
    [HttpGet("getuserslotsbyday")]
    public async Task<IActionResult> GetUserSlotsByDay(Guid userId, string dayofWeek)
    {
        var result = await _userService.GetUserSlotsByDay(userId, dayofWeek);
        return Ok(result);
    }

    [HttpPost("UpdateTimeSlots")]
    public async Task<IActionResult> UpdateTimeSlots(UserTimeSlots input)
    {
        var result = await _userService.UpdateTimeSlots(input);
        return Ok(result);
    }

    [HttpPost("RemoveTimeSlot")]
    public async Task<IActionResult> RemoveTimeSlot(RemoveSlot input)
    {
        var result = await _userService.RemoveTimeSlot(input);
        return Ok(result);
    }
}
