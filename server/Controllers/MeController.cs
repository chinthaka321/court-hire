using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TennisBooking.Services;

namespace TennisBooking.Controllers;

[ApiController]
[Route("api/me")]
[Authorize]
public class MeController(UserService users) : ControllerBase
{
    /// <summary>
    /// Returns the current user's profile and role, creating the DB row on
    /// first contact. The client calls this after sign-in, which is what
    /// provisions new users.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var user = await users.EnsureUserAsync(User);
        return Ok(new { user.Id, user.Name, user.Email, user.Role, user.SkillLevel });
    }
}
