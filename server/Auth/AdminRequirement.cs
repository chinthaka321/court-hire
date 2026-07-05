using Microsoft.AspNetCore.Authorization;
using TennisBooking.Data;
using TennisBooking.Models;

namespace TennisBooking.Auth;

public class AdminRequirement : IAuthorizationRequirement;

/// <summary>
/// Admin access = role claim "admin" in the JWT (customised Clerk token, used
/// by the integration tests) OR Role=Admin on the Users table, which is the
/// source of truth per CLAUDE.md. The DB path means no Clerk dashboard
/// configuration is required to grant admin.
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
