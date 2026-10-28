using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Domain.Entities;

[Authorize]
[Route("api/[controller]")]
[ApiController]
public class NotificationController : ControllerBase
{
    private readonly INotificationService _service;

    public NotificationController(INotificationService service)
    {
        _service = service;
    }

    [HttpGet("getnotificationbyid")]
    public async Task<IActionResult> GetNotificationById(Guid id)
    {
        var notification = await _service.GetNotificationByIdAsync(id);
        if (notification == null)
            return NotFound();
        return Ok(notification);
    }

    [HttpGet("getallnotifications")]
    public async Task<IActionResult> GetAllNotifications()
    {
        var notifications = await _service.GetAllNotificationsAsync();
        return Ok(notifications);
    }

    [HttpPost]
    public async Task<IActionResult> AddNotification([FromBody] Notification notification)
    {
        await _service.AddNotificationAsync(notification);
        return CreatedAtAction(nameof(GetNotificationById), new { id = notification.Id }, notification);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateNotification(Guid id, [FromBody] Notification notification)
    {
        if (notification == null || id != notification.Id)
            return BadRequest();

        await _service.UpdateNotificationAsync(notification);
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteNotification(int id)
    {
        await _service.DeleteNotificationAsync(id);
        return NoContent();
    }

    [HttpGet("getnotificationbyuserId")]
    public async Task<IActionResult> GetNotificationByUserIdAsync(Guid userId)
    {
        var notifications = await _service.GetNotificationByUserIdAsync(userId);
        notifications = notifications.OrderByDescending(s=>s.CreatedDate).ToList();
        return Ok(notifications);
    }

    [HttpPut("ReadUnread")]
    [HttpPost("ReadUnread")]
    public async Task<IActionResult> ReadUnread([FromQuery] Guid notifiDetailsId)
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

        // Read state belongs to the authenticated recipient. Never allow a
        // browser-supplied userId to mark another user's notification as read.
        var result = await _service.ReadUnread(notifiDetailsId, callerId);
        return Ok(result);
    }
}
