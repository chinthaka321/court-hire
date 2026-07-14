using Microsoft.AspNetCore.Authorization;
using TennisBooking.Data;
using TennisBooking.Models;

namespace TennisBooking.Auth;

public class AdminRequirement : IAuthorizationRequirement;

/// <summary>
/// Admin access = Role=Admin on the Users table — the sole source of truth per
/// CLAUDE.md ("no second auth stack"). No JWT claim is consulted; this means no
/// Clerk dashboard configuration is required to grant admin.
/// </summary>
public class AdminAuthorizationHandler(AppDbContext db) : AuthorizationHandler<AdminRequirement>
{
    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context, AdminRequirement requirement)
    {
        var sub = context.User.FindFirst("sub")?.Value;
        if (sub is null) return;

        var user = await db.Users.FindAsync(sub);
        if (user?.Role == UserRole.Admin)
            context.Succeed(requirement);
    }
}
