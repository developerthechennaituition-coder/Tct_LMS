using Microsoft.AspNetCore.Mvc;
using TCT.LMS.API.Controllers.Base;
using TCT.LMS.Application;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.User;

namespace TCT.LMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UserProfileController : BaseAPIController<UserProfile>
{
    private readonly IDocumentService _documentService;
    public UserProfileController(IGenericService<UserProfile> service, IDocumentService documentService) : base(service)
    {
        _documentService = documentService;
    }

    [HttpPost("uploadProfileImage")]
    public async Task<IActionResult> UploadUserProfileImage([FromForm] UserProfileDto input)
    {
        input.DocumentName = "Profile Photo";
        input.DocumentDescription = "User profile photo";
        var result = await _documentService.CreateDocument(input);
        return Ok(result);
    }
}
