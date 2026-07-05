using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using TennisBooking.Data;
using TennisBooking.Models;

namespace TennisBooking.Tests.Helpers;

public class AuthTestFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureAppConfiguration((context, config) =>
        {
            var devConn = Microsoft.Extensions.Configuration.ConfigurationExtensions.GetConnectionString(context.Configuration, "Default");
            if (!string.IsNullOrEmpty(devConn))
            {
                var connBuilder = new Npgsql.NpgsqlConnectionStringBuilder(devConn)
                {
                    MaxPoolSize = 5
                };
                var testConn = connBuilder.ToString();
                Microsoft.Extensions.Configuration.MemoryConfigurationBuilderExtensions.AddInMemoryCollection(config, new System.Collections.Generic.Dictionary<string, string?>
                {
                    ["ConnectionStrings:Default"] = testConn
                });
            }
        });

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

            // Register hosted service to seed test users safely on application startup
            services.AddHostedService<SeederHostedService>();
        });

        builder.UseEnvironment("Development");
    }
}

public class SeederHostedService(IServiceProvider serviceProvider) : IHostedService
{
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        using var scope = serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // Seed test users
        if (!db.Users.Any(u => u.Id == "user_admin"))
        {
            db.Users.Add(new AppUser
            {
                Id = "user_admin",
                Email = "admin@test.com",
                Name = "Admin User",
                Phone = "",
                Role = UserRole.Admin,
                SkillLevel = SkillLevel.Intermediate
            });
        }
        if (!db.Users.Any(u => u.Id == "admin_user"))
        {
            db.Users.Add(new AppUser
            {
                Id = "admin_user",
                Email = "admin2@test.com",
                Name = "Admin User 2",
                Phone = "",
                Role = UserRole.Admin,
                SkillLevel = SkillLevel.Intermediate
            });
        }
        if (!db.Users.Any(u => u.Id == "user_regular"))
        {
            db.Users.Add(new AppUser
            {
                Id = "user_regular",
                Email = "user@test.com",
                Name = "Regular User",
                Phone = "",
                Role = UserRole.User,
                SkillLevel = SkillLevel.Intermediate
            });
        }
        if (!db.Users.Any(u => u.Id == "regular_user"))
        {
            db.Users.Add(new AppUser
            {
                Id = "regular_user",
                Email = "user2@test.com",
                Name = "Regular User 2",
                Phone = "",
                Role = UserRole.User,
                SkillLevel = SkillLevel.Intermediate
            });
        }

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            // Ignore duplicate key conflicts from parallel setups
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
