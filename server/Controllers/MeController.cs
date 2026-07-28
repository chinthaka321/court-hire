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
    /// provisions new users. email/name are optional query params the client
    /// fills from its own Clerk session (the JWT itself usually only carries
    /// `sub` — see UserService.EnsureUserAsync).
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] string? email, [FromQuery] string? name)
    {
        var user = await users.EnsureUserAsync(User, email, name);
        return Ok(new { user.Id, user.Name, user.Email, user.Role, user.SkillLevel });
    }
}
