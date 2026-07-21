using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using TennisBooking.Data;
using TennisBooking.Models;

namespace TennisBooking.Services;

public class UserService(AppDbContext db)
{
    /// <summary>
    /// Upserts the AppUser row for the authenticated principal. Clerk owns
    /// authentication; this row owns profile and role (see CLAUDE.md).
    /// Called on first authenticated contact so FK constraints on Holds and
    /// Bookings always have a user to point at.
    /// </summary>
    public async Task<AppUser> EnsureUserAsync(ClaimsPrincipal principal)
    {
        var sub = principal.FindFirst("sub")?.Value
            ?? throw new UnauthorizedAccessException("Token has no sub claim");

        // Clerk's default session token carries only sub; email/name appear
        // only if the session token is customised in the Clerk dashboard.
        var email = principal.FindFirst("email")?.Value;
        var name = principal.FindFirst("name")?.Value;

        var user = await db.Users.FindAsync(sub);
        if (user is null)
        {
            var isFirstUser = !await db.Users.AnyAsync();
            user = new AppUser
            {
                Id = sub,
                Name = name ?? email ?? sub,
                Email = email ?? "",
                Role = isFirstUser ? UserRole.Admin : UserRole.User
            };
            db.Users.Add(user);
        }
        else
        {
            if (email is not null) user.Email = email;
            if (name is not null) user.Name = name;
        }

        // If the JWT does carry a role claim (customised Clerk token), keep the DB in sync
        if (principal.HasClaim("role", "admin"))
            user.Role = UserRole.Admin;

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            // Two first-login requests raced the insert; the other one won.
            // Fall back to the committed row instead of surfacing a 500 (#35).
            db.ChangeTracker.Clear();
            user = await db.Users.FindAsync(sub)
                ?? throw new InvalidOperationException("User row vanished after concurrent insert");
        }

        return user;
    }
}
