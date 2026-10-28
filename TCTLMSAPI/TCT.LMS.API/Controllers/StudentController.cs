using DocumentFormat.OpenXml.Math;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TCT.LMS.API.Utilities;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Data.Common;
using TCT.LMS.Domain;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Schedule;
using TCT.LMS.DTOs.DocStorage;
using TCT.LMS.DTOs.Student;
using TCT.LMS.DTOs.User;
using TCTModel.Student;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace TCT.LMS.API.Controllers;

[Authorize]
[Route("api/[controller]")]
[ApiController]
public class StudentController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly IStudentService _studentService;
    public readonly ApplicationDbContext _dbContext;
    private readonly IDocumentService _documentService;
    public StudentController(IUserService userService, IStudentService studentService, ApplicationDbContext dbContext,
        IDocumentService documentService)
    {
        _userService = userService;
        _studentService = studentService;
        _dbContext = dbContext;
        _documentService = documentService;
    }

    [CheckPolicy("Student.View")]
    [HttpGet("GetAllStudent")]
    public async Task<IActionResult> GetAllStudent()
    { 
        var userType = (int)UserType.Student;
        var users = _studentService.GetAllStudents();
        foreach (var item in users)
        {
            var _doc = _dbContext.Documents.Where(s => s.UserId == item.Id).OrderByDescending(s => s.CreatedDate).FirstOrDefault();
            if (_doc != null)
            {
                var docStorage = _dbContext.DocumentStorage.OrderByDescending(s => s.CreatedDate).FirstOrDefault(s => s.DocumentId == _doc.Id);
                if (docStorage != null)
                {
                    var file = await _documentService.ReadFileAsync(docStorage.FilePath);
                    item.FileData = file.FileData;
                }
            }
        }
        return Ok(users);
    }

    [HttpGet("studentlistbyboard")]
    public async Task<IActionResult> GetBoardViseStudentList(Guid? boardId, Guid? gradeId = null, Guid? subjectId = null, string filterText = "")
    {
        var userType = (int)UserType.Student;
        var users = _studentService.GetBoardViseStudentList(boardId, gradeId, subjectId, filterText);
        foreach (var item in users)
        {
            var audioFile = await (from document in _dbContext.Documents
                                   join storage in _dbContext.DocumentStorage on document.Id equals storage.DocumentId
                                   where (document.UserId == item.Id || document.UserId == item.UserId)
                                         && document.IsActive && storage.IsActive
                                         && (storage.ContentType.StartsWith("audio/")
                                             || storage.FileName.EndsWith(".mp3")
                                             || storage.FileName.EndsWith(".m4a"))
                                   orderby storage.CreatedDate descending
                                   select new { storage.FilePath, storage.ContentType, storage.FileName }).FirstOrDefaultAsync();
            if (audioFile != null && !string.IsNullOrWhiteSpace(audioFile.FilePath))
            {
                var file = await _documentService.ReadFileAsync(audioFile.FilePath);
                item.AudioFileData = file.FileData;
                item.AudioContentType = NormalizeAudioContentType(audioFile.ContentType, audioFile.FileName);
            }
        }
        //foreach (var item in users)
        //{
        //    var _doc = _dbContext.Documents.Where(s => s.UserId == item.UserId).OrderByDescending(s => s.CreatedDate).FirstOrDefault();
        //    if (_doc != null)
        //    {
        //        var docStorage = _dbContext.DocumentStorage.OrderByDescending(s => s.CreatedDate).FirstOrDefault(s => s.DocumentId == _doc.Id);
        //        var file = await _documentService.ReadFileAsync(docStorage.FilePath);
        //        if(docStorage.ContentType == "audio/x-m4a")
        //        {
        //            item.AudioFileData = file.FileData;
        //        }
        //        item.FileData = file.FileData;
        //    }
        //}
        return Ok(users);
    }

    [HttpGet("getstudents")]
    public async Task<IActionResult> GetStudents(int pageSize, int pageNumber, Guid? boardId, Guid? gradeId = null, Guid? subjectId = null, string filterText = "")
    {
        var userType = (int)UserType.Student;
        var students = await _studentService.GetStudentListWithPaginations(boardId, gradeId, subjectId, filterText, pageSize, pageNumber);
        var canViewCoordinatorInstructions = await IsCallerInRoleAsync("Coordinator")
                                             || await IsCallerInRoleAsync("CoordinatorAdmin")
                                             || await IsCallerInRoleAsync("SalesAdmin")
                                             || await IsCallerInRoleAsync("SuperAdmin");
        foreach (var item in students.Data)
        {
            var _doc = _dbContext.Documents.Where(s => s.UserId == item.Id).OrderByDescending(s => s.CreatedDate).FirstOrDefault();
            if (_doc != null)
            {
                var docStorage = _dbContext.DocumentStorage.OrderByDescending(s => s.CreatedDate).FirstOrDefault(s => s.DocumentId == _doc.Id);
                if (docStorage != null)
                {
                    var file = await _documentService.ReadFileAsync(docStorage.FilePath);
                    item.FileData = file.FileData;
                }
            }

            if (canViewCoordinatorInstructions)
            {
                await PopulateAudioAsync(item);
            }
        }
        return Ok(students);
    }

    [HttpGet("getStudentsbyTutor")]
    public async Task<IActionResult> GetStudentsByTutorId(int pageSize, int pageNumber, Guid tutorId, Guid? boardId, Guid? gradeId = null, Guid? subjectId = null, string filterText = "")
    {
        var callerId = User.Claims
            .Where(claim => claim.Type.Equals("UserId", StringComparison.OrdinalIgnoreCase)
                || claim.Type == System.Security.Claims.ClaimTypes.NameIdentifier
                || claim.Type.EndsWith("/nameidentifier", StringComparison.OrdinalIgnoreCase)
                || claim.Type.Equals("sub", StringComparison.OrdinalIgnoreCase))
            .Select(claim => Guid.TryParse(claim.Value, out var id) ? id : Guid.Empty)
            .FirstOrDefault(id => id != Guid.Empty);
        if (callerId == Guid.Empty)
            return Unauthorized(new { succeeded = false, message = "Your login session is invalid. Please sign in again." });

        var isTutor = await (from userRole in _dbContext.UserRole
                             join role in _dbContext.Roles on userRole.RoleId equals role.Id
                             where userRole.UserId == callerId && userRole.IsActive && role.IsActive
                                   && role.RoleName == "Tutor"
                             select role.Id).AnyAsync();
        if (!isTutor)
            return StatusCode(StatusCodes.Status403Forbidden, new { succeeded = false, message = "Only tutors can access their assigned student list." });

        // Never trust the tutorId supplied by the browser for data scoping.
        // The authenticated caller is the only tutor whose students are returned.
        var students = await _studentService.GetStudentsByTutorId(callerId, boardId, gradeId, subjectId, filterText, pageSize, pageNumber);
        return Ok(students);
    }

    [HttpGet("getStudentsByUser")]
    public async Task<IActionResult> GetStudentsByUser(int pageSize, int pageNumber, Guid? boardId, Guid? gradeId = null, Guid? subjectId = null, string filterText = "")
    {
        // Never trust the userId/roleId supplied by the browser for data scoping — a caller could
        // pass any other coordinator's/operations user's id and see that person's full student list.
        // Resolve both from the authenticated caller's own claims instead.
        var callerId = User.Claims
            .Where(claim => claim.Type.Equals("UserId", StringComparison.OrdinalIgnoreCase)
                || claim.Type == System.Security.Claims.ClaimTypes.NameIdentifier
                || claim.Type.EndsWith("/nameidentifier", StringComparison.OrdinalIgnoreCase)
                || claim.Type.Equals("sub", StringComparison.OrdinalIgnoreCase))
            .Select(claim => Guid.TryParse(claim.Value, out var id) ? id : Guid.Empty)
            .FirstOrDefault(id => id != Guid.Empty);
        if (callerId == Guid.Empty)
            return Unauthorized(new { succeeded = false, message = "Your login session is invalid. Please sign in again." });

        var callerRoleId = await (from userRole in _dbContext.UserRole
                                  join role in _dbContext.Roles on userRole.RoleId equals role.Id
                                  where userRole.UserId == callerId && userRole.IsActive && role.IsActive
                                        && (role.RoleName == "Coordinator" || role.RoleName == "Operations")
                                  select role.Id).FirstOrDefaultAsync();
        if (callerRoleId == null)
            return StatusCode(StatusCodes.Status403Forbidden, new { succeeded = false, message = "Only coordinators or operations users can access this student list." });

        var students = await _studentService.GetStudentsByCoordinatorOrOps(callerId, callerRoleId.Value, boardId, gradeId, subjectId, filterText, pageSize, pageNumber);
        if (await IsCallerInRoleAsync("Coordinator")
            || await IsCallerInRoleAsync("CoordinatorAdmin")
            || await IsCallerInRoleAsync("SalesAdmin")
            || await IsCallerInRoleAsync("SuperAdmin"))
        {
            foreach (var item in students.Data)
            {
                await PopulateAudioAsync(item);
            }
        }
        return Ok(students);
    }

    private async Task PopulateAudioAsync(StudentInfo item)
    {
        var audioFile = await (from document in _dbContext.Documents
                               join storage in _dbContext.DocumentStorage on document.Id equals storage.DocumentId
                               where (document.UserId == item.Id || document.UserId == item.UserId)
                                     && document.IsActive && storage.IsActive
                                     && (storage.ContentType.StartsWith("audio/")
                                         || storage.FileName.EndsWith(".mp3")
                                         || storage.FileName.EndsWith(".m4a"))
                               orderby storage.CreatedDate descending
                               select new { storage.FilePath, storage.ContentType, storage.FileName }).FirstOrDefaultAsync();

        if (audioFile == null || string.IsNullOrWhiteSpace(audioFile.FilePath)) return;

        var file = await _documentService.ReadFileAsync(audioFile.FilePath);
        item.AudioFileData = file.FileData;
        item.AudioContentType = NormalizeAudioContentType(audioFile.ContentType, audioFile.FileName);
    }

    private static string NormalizeAudioContentType(string? contentType, string fileName)
    {
        if (!string.IsNullOrWhiteSpace(contentType) && contentType.StartsWith("audio/", StringComparison.OrdinalIgnoreCase))
            return contentType;

        return fileName.EndsWith(".mp3", StringComparison.OrdinalIgnoreCase) ? "audio/mpeg" : "audio/mp4";
    }

    [HttpPost("uploadCoordinatorInstructions")]
    public async Task<IActionResult> UploadCoordinatorInstructions([FromForm] UploadCoordinatorInstructionsDto input)
    {
        var studentId = input.StudentId;
        var file = input.File;
        var callerId = GetCallerId();
        if (callerId == Guid.Empty) return Unauthorized();

        var isCoordinator = await IsCallerInRoleAsync("Coordinator");
        var canUpload = isCoordinator
                        || await IsCallerInRoleAsync("CoordinatorAdmin")
                        || await IsCallerInRoleAsync("SalesAdmin")
                        || await IsCallerInRoleAsync("SuperAdmin");
        if (!canUpload) return Forbid();

        var extension = Path.GetExtension(file?.FileName ?? string.Empty);
        if (file == null || file.Length == 0 ||
            (!extension.Equals(".mp3", StringComparison.OrdinalIgnoreCase)
             && !extension.Equals(".m4a", StringComparison.OrdinalIgnoreCase)))
            return BadRequest(new { message = "Please upload a valid MP3 or M4A audio file." });

        var student = await _dbContext.Student.AsNoTracking().FirstOrDefaultAsync(x => x.Id == studentId && x.IsActive);
        if (student == null || !student.UserId.HasValue) return NotFound(new { message = "Student not found." });

        var sales = await _dbContext.Sales.AsNoTracking()
            .Where(x => x.StudentId == studentId && x.IsActive)
            .OrderByDescending(x => x.CreatedDate)
            .FirstOrDefaultAsync();
        if (sales == null) return NotFound(new { message = "Enrollment not found." });

        if (isCoordinator)
        {
            var assigned = await _dbContext.SalesDetails.AsNoTracking()
                .AnyAsync(x => x.SalesId == sales.Id && x.Coordinator == callerId && x.IsActive);
            if (!assigned) return Forbid();
        }

        var typeCode = await _dbContext.Type_Code.AsNoTracking().FirstOrDefaultAsync(x => x.TypeCodeValue == 2);
        if (typeCode == null) return StatusCode(500, new { message = "Enrollment document type is not configured." });

        var uploadResult = await _documentService.CreateDocument(new DocumentStorageDto
        {
            Files = new List<IFormFile> { file },
            Document = new DocumentDto
            {
                DocumentName = "Instruction",
                DocumentDescription = "Instructions to coordinator (audio)",
                DocumentTypeId = typeCode.Id,
                UserId = student.UserId.Value,
                ReferenceId = sales.Id
            }
        });

        if (!uploadResult.Succeeded || uploadResult.Data == Guid.Empty)
            return StatusCode(500, new { message = "Coordinator instruction audio could not be saved." });

        return Ok(new { message = "Coordinator instruction audio uploaded successfully." });
    }

    [HttpGet("studentlistbyuser")]
    public async Task<IActionResult> GetBoardViseStudentListByUser(Guid userId, int roleId, Guid? boardId, Guid? gradeId = null, Guid? subjectId = null, string filterText = "")
    {
        var users = await _studentService.GetBoardViseStudentListByUser(userId, roleId, boardId, gradeId, subjectId, filterText);
        foreach (var item in users)
        {
            var audioFile = await (from document in _dbContext.Documents
                                   join storage in _dbContext.DocumentStorage on document.Id equals storage.DocumentId
                                   where (document.UserId == item.Id || document.UserId == item.UserId)
                                         && document.IsActive && storage.IsActive
                                         && (storage.ContentType.StartsWith("audio/")
                                             || storage.FileName.EndsWith(".mp3")
                                             || storage.FileName.EndsWith(".m4a"))
                                   orderby storage.CreatedDate descending
                                   select new { storage.FilePath, storage.ContentType, storage.FileName }).FirstOrDefaultAsync();
            if (audioFile != null && !string.IsNullOrWhiteSpace(audioFile.FilePath))
            {
                var file = await _documentService.ReadFileAsync(audioFile.FilePath);
                item.AudioFileData = file.FileData;
                item.AudioContentType = NormalizeAudioContentType(audioFile.ContentType, audioFile.FileName);
            }
        }
        return Ok(users);
    }

    //[CheckPolicy("Student.View")]
    [HttpGet("GetStudent")]
    public async Task<IActionResult> GetStudent(Guid studentId)
    {
        var result = _studentService.GetStudent(studentId);

        if (result.Data != null && await IsCallerInRoleAsync("Tutor"))
        {
            result.Data.EmailAddress = null;
            result.Data.MobileNumber = null;
            result.Data.AlternatePhone = null;
        }


        if (result.Data != null)
        {
            var _doc = _dbContext.Documents.Where(s => s.UserId == result.Data.UserId).OrderByDescending(s => s.CreatedDate).FirstOrDefault();
            if (_doc != null)
            {
                var docStorage = _dbContext.DocumentStorage.OrderByDescending(s => s.CreatedDate).FirstOrDefault(s => s.DocumentId == _doc.Id);
                if (docStorage != null)
                {
                    var file = await _documentService.ReadFileAsync(docStorage.FilePath);
                    result.Data.FileData = file.FileData;
                    result.Data.FileName = docStorage.FileName;
                }
            }
        }
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
        if (await IsCallerInRoleAsync("Tutor"))
        {
            user.Email = null;
            user.Phone = null;
            user.AlternatePhone = null;
        }
        return Ok(user);
    }

    private async Task<bool> IsCallerInRoleAsync(string roleName)
    {
        var callerId = User.Claims
            .Where(claim => claim.Type.Equals("UserId", StringComparison.OrdinalIgnoreCase)
                || claim.Type == System.Security.Claims.ClaimTypes.NameIdentifier
                || claim.Type.EndsWith("/nameidentifier", StringComparison.OrdinalIgnoreCase)
                || claim.Type.Equals("sub", StringComparison.OrdinalIgnoreCase))
            .Select(claim => Guid.TryParse(claim.Value, out var id) ? id : Guid.Empty)
            .FirstOrDefault(id => id != Guid.Empty);
        if (callerId == Guid.Empty) return false;

        return await (from userRole in _dbContext.UserRole
                      join role in _dbContext.Roles on userRole.RoleId equals role.Id
                      where userRole.UserId == callerId && userRole.IsActive && role.IsActive
                            && role.RoleName == roleName
                      select role.Id).AnyAsync();
    }

    private Guid GetCallerId()
    {
        return User.Claims
            .Where(claim => claim.Type.Equals("UserId", StringComparison.OrdinalIgnoreCase)
                || claim.Type == System.Security.Claims.ClaimTypes.NameIdentifier
                || claim.Type.EndsWith("/nameidentifier", StringComparison.OrdinalIgnoreCase)
                || claim.Type.Equals("sub", StringComparison.OrdinalIgnoreCase))
            .Select(claim => Guid.TryParse(claim.Value, out var id) ? id : Guid.Empty)
            .FirstOrDefault(id => id != Guid.Empty);
    }

    [CheckPolicy("Student.View")]
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

    [CheckPolicy("Student.Add")]
    [HttpPost]
    public async Task<ActionResult<User>> CreateUser(User user)
    {
        var createdUser = await _userService.AddUser(user);
        return CreatedAtAction(nameof(GetUser), new { id = createdUser.Id }, createdUser);
    }

    [CheckPolicy("Student.Edit")]
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

    [CheckPolicy("Student.Delete")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteUser(Guid id)
    {
        await _userService.DeleteUser(id);
        return NoContent();
    }

    [HttpPost("updatestudent")]
    public async Task<IActionResult> UpdateStudent(StudentRequestDto input)
    {
        var result = await _studentService.UpdateStudent(input);
        return Ok(result);
    }

    [HttpGet("GetCoordinatorAllStudent")]
    public async Task<IActionResult> GetCoordinatorAllStudent(Guid id)
    {
        var result = _studentService.GetCoordinatorAllStudent(id);
        foreach (var item in result)
        {
            var _doc = _dbContext.Documents.Where(s => s.UserId == item.UserId).OrderByDescending(s => s.CreatedDate).FirstOrDefault();
            if (_doc != null)
            {
                var docStorage = _dbContext.DocumentStorage.OrderByDescending(s => s.CreatedDate).FirstOrDefault(s => s.DocumentId == _doc.Id);
                if (docStorage != null)
                {
                    var file = await _documentService.ReadFileAsync(docStorage.FilePath);
                    item.FileData = file.FileData;
                }
            }
        }
        return Ok(result);
    }

    [AllowAnonymous]
    [HttpPost("studentRegistration")]
    public async Task<IActionResult> Register([FromForm] StudentRegistrationDto dto)
    {

        var result = await _studentService.Register(dto);
        if (result.Succeeded)
        {
            var userProfileDto = new UserProfileDto
            {
                UserId = result.Data,
                DocumentDescription = "ID Proof for student registration",
                DocumentName = "ID Proof",
                Files = dto.Files,
            };
            var docResult = await _documentService.CreateDocument(userProfileDto);
            return Ok(new { Message = "Student registration successfully completed" });
        }
        return BadRequest(new { Message = result.Message, Phone = dto.ParentMobile });
    }


    private async Task<bool> UserExists(Guid id)
    {
        var user = await _userService.GetUserById(id);
        return user != null;
    }
}
