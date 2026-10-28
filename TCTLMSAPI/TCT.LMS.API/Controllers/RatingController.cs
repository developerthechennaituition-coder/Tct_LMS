using Microsoft.AspNetCore.Mvc;
using TCT.LMS.API.Controllers.Base;
using TCT.LMS.Application;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Rating;

namespace TCT.LMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RatingController : ControllerBase
{

    private readonly IUserRatingService _userRatingService;
    public RatingController(IUserRatingService userRatingService)
    {
        _userRatingService = userRatingService;
    }

    [HttpPost("addrating")]
    public async Task<IActionResult> AddRating(RatingDto input)
    {
        await _userRatingService.AddRating(input);
        return Ok(true);
    }
}
