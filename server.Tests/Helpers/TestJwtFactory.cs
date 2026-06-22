using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;

namespace TennisBooking.Tests.Helpers;

public static class TestJwtFactory
{
    // Shared symmetric key used by both the factory (to validate) and tests (to sign).
    public static readonly SymmetricSecurityKey TestKey = new(
        System.Text.Encoding.UTF8.GetBytes("test-secret-key-that-is-long-enough-for-hmac-sha256"));

    public static string CreateToken(string userId = "user_test", bool isAdmin = false)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, userId),
        };

        if (isAdmin)
            claims.Add(new Claim("role", "admin"));

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
