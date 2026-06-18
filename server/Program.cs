using Hangfire;
using Hangfire.PostgreSql;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Stripe;
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
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateAudience = false,
            NameClaimType = "sub"
        };
    });

builder.Services.AddAuthorization(opt =>
    opt.AddPolicy("AdminOnly", p => p.RequireClaim("metadata_role", "admin")));

// Hangfire
builder.Services.AddHangfire(cfg => cfg
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UsePostgreSqlStorage(builder.Configuration.GetConnectionString("Default")));
builder.Services.AddHangfireServer();

// App services
builder.Services.AddScoped<PricingService>();
builder.Services.AddScoped<AvailabilityService>();
builder.Services.AddScoped<BookingService>();
builder.Services.AddScoped<StripeRefundService>();
builder.Services.AddScoped<SweepExpiredHoldsJob>();
builder.Services.AddScoped<SendReminderEmailsJob>();

builder.Services.AddControllers();
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
