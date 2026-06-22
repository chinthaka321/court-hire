using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace TennisBooking.Tests.Helpers;

public class AuthTestFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            // Replace Clerk JWT validation with a local test key so tests
            // don't need real Clerk credentials or network access.
            services.PostConfigure<JwtBearerOptions>(
                JwtBearerDefaults.AuthenticationScheme, opt =>
                {
                    opt.Authority = null;
                    opt.MapInboundClaims = false;
                    opt.RequireHttpsMetadata = false;
                    opt.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuerSigningKey = true,
                        IssuerSigningKey = TestJwtFactory.TestKey,
                        ValidateIssuer = false,
                        ValidateAudience = false,
                        NameClaimType = "sub",
                    };
                });
        });

        builder.UseEnvironment("Development");
    }
}
