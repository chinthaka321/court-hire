using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;

namespace TennisBooking.Tests.Helpers;

public static class TestJwtFactory
{
    // Shared symmetric key used by both the factory (to validate) and tests (to sign).
    public static readonly SymmetricSecurityKey TestKey = new(
        System.Text.Encoding.UTF8.GetBytes("test-secret-key-that-is-long-enough-for-hmac-sha256"));

    // `isAdmin` is documentation-only for call sites — admin access is decided by
    // AdminAuthorizationHandler looking up `userId` in the DB (seeded by AuthTestFactory),
    // never by a token claim. Pass a userId that AuthTestFactory seeds with the matching role.
    public static string CreateToken(string userId = "user_test", bool isAdmin = false)
    {
        _ = isAdmin;
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, userId),
        };

        var creds = new SigningCredentials(TestKey, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: "test-issuer",
            audience: "test-audience",
            claims: claims,
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
