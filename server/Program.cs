using Hangfire;
using Hangfire.PostgreSql;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Stripe;
using TennisBooking.Auth;
using TennisBooking.Data;
using TennisBooking.Jobs;
using TennisBooking.Services;

var builder = WebApplication.CreateBuilder(args);

// Stripe
StripeConfiguration.ApiKey = builder.Configuration["Stripe:SecretKey"];

// Database
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

// Auth — Clerk JWT
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        opt.Authority = builder.Configuration["Clerk:Authority"];
        opt.MapInboundClaims = false; // keep claim names as-is from the JWT (e.g. "role" stays "role")
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateAudience = false,
            NameClaimType = "sub"
        };
    });

// Admin = role claim in the JWT OR Role=Admin on the Users table (DB is the source of truth)
builder.Services.AddAuthorization(opt =>
    opt.AddPolicy("AdminOnly", p => p.AddRequirements(new AdminRequirement())));
builder.Services.AddScoped<IAuthorizationHandler, AdminAuthorizationHandler>();

// Hangfire
builder.Services.AddHangfire(cfg => cfg
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UsePostgreSqlStorage(builder.Configuration.GetConnectionString("Default")));
builder.Services.AddHangfireServer();

// App services
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<PricingService>();
builder.Services.AddScoped<AvailabilityService>();
builder.Services.AddScoped<BookingService>();
builder.Services.AddScoped<StripeRefundService>();
builder.Services.AddScoped<EmailService>();
builder.Services.AddScoped<SweepExpiredHoldsJob>();
builder.Services.AddScoped<SendReminderEmailsJob>();

builder.Services.AddControllers()
    .AddJsonOptions(opt =>
        opt.JsonSerializerOptions.Converters.Add(
            new System.Text.Json.Serialization.JsonStringEnumConverter()));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(opt => opt.AddPolicy("ClientApp", p =>
    p.WithOrigins(builder.Configuration["App:ClientUrl"] ?? "http://localhost:5173")
     .AllowAnyHeader()
     .AllowAnyMethod()));

var app = builder.Build();

// Auto-migrate on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();

    // Auto-promote first user to Admin in Development mode if no Admin exists
    var dbUsers = db.Users.ToList();
    if (app.Environment.IsDevelopment() && !dbUsers.Any(u => u.Role == TennisBooking.Models.UserRole.Admin) && dbUsers.Any())
    {
        var firstUser = dbUsers.First();
        firstUser.Role = TennisBooking.Models.UserRole.Admin;
        db.SaveChanges();
    }

    if (app.Environment.IsDevelopment() && !db.Courts.Any(c => c.Active))
    {
        var court1Id = Guid.NewGuid();
        var court2Id = Guid.NewGuid();

        db.Courts.AddRange(
            new TennisBooking.Models.Court
            {
                Id = court1Id,
                Name = "Court A",
                OpeningHours = new TennisBooking.Models.OpeningHours
                {
                    Open  = new TimeOnly(7, 0),
                    Close = new TimeOnly(22, 0)
                },
                SlotLengthMinutes = 30,
                DayNightBoundary = new TimeOnly(18, 0),
                Active = true
            },
            new TennisBooking.Models.Court
            {
                Id = court2Id,
                Name = "Court B",
                OpeningHours = new TennisBooking.Models.OpeningHours
                {
                    Open  = new TimeOnly(8, 0),
                    Close = new TimeOnly(21, 0)
                },
                SlotLengthMinutes = 30,
                DayNightBoundary = new TimeOnly(17, 0),
                Active = true
            }
        );

        foreach (var courtId in new[] { court1Id, court2Id })
        {
            db.PriceRates.AddRange(
                new TennisBooking.Models.PriceRate { Id = Guid.NewGuid(), CourtId = courtId, DayType = TennisBooking.Models.DayType.Weekday, Band = TennisBooking.Models.PriceBand.Day,   Price = 25m },
                new TennisBooking.Models.PriceRate { Id = Guid.NewGuid(), CourtId = courtId, DayType = TennisBooking.Models.DayType.Weekday, Band = TennisBooking.Models.PriceBand.Night, Price = 35m },
                new TennisBooking.Models.PriceRate { Id = Guid.NewGuid(), CourtId = courtId, DayType = TennisBooking.Models.DayType.Weekend, Band = TennisBooking.Models.PriceBand.Day,   Price = 40m },
                new TennisBooking.Models.PriceRate { Id = Guid.NewGuid(), CourtId = courtId, DayType = TennisBooking.Models.DayType.Weekend, Band = TennisBooking.Models.PriceBand.Night, Price = 50m }
            );
        }

        db.SaveChanges();
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("ClientApp");
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

// Dashboard is dev-only: Hangfire's default filter would otherwise expose it publicly
if (app.Environment.IsDevelopment())
    app.UseHangfireDashboard("/hangfire");

// Register recurring jobs
RecurringJob.AddOrUpdate<SweepExpiredHoldsJob>(
    "sweep-expired-holds",
    job => job.ExecuteAsync(),
    "*/2 * * * *"); // every 2 min

RecurringJob.AddOrUpdate<SendReminderEmailsJob>(
    "send-reminders",
    job => job.ExecuteAsync(),
    "*/15 * * * *"); // every 15 min

app.MapControllers();
app.Run();

public partial class Program { }
