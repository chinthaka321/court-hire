using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using TennisBooking.Models;

namespace TennisBooking.Services;

public class EmailSettings
{
    public string SmtpHost { get; set; } = "localhost";
    public int SmtpPort { get; set; } = 587;
    public string Username { get; set; } = "";
    public string Password { get; set; } = "";
    public string FromAddress { get; set; } = "noreply@example.com";
    public string FromName { get; set; } = "Tennis Court Booking";
}

public class EmailService(IConfiguration config, ILogger<EmailService> logger)
{
    private EmailSettings Settings => config.GetSection("Email").Get<EmailSettings>() ?? new();

    public async Task SendBookingConfirmedAsync(Booking booking)
    {
        var slot = booking.SlotStarts.Min();
        var durationMin = booking.SlotStarts.Count * 30;
        var body = $"""
            Hi {booking.User.Name ?? booking.User.Email},

            Your booking is confirmed!

            Court:    {booking.Court.Name}
            Date:     {slot:dddd, MMMM d, yyyy}
            Time:     {slot:h:mm tt} – {slot.AddMinutes(durationMin):h:mm tt} ({durationMin} min)
            Total:    ${booking.AmountCharged:F2}

            See you on the court.

            Tennis Court Booking
            """;

        await SendAsync(
            booking.User.Email,
            booking.User.Name,
            $"Booking confirmed — {booking.Court.Name} on {slot:MMM d}",
            body);
    }

    public async Task SendBookingCancelledAsync(Booking booking)
    {
        var slot = booking.SlotStarts.Min();
        var durationMin = booking.SlotStarts.Count * 30;
        var body = $"""
            Hi {booking.User.Name ?? booking.User.Email},

            Your booking has been cancelled.

            Court:    {booking.Court.Name}
            Date:     {slot:dddd, MMMM d, yyyy}
            Time:     {slot:h:mm tt} – {slot.AddMinutes(durationMin):h:mm tt} ({durationMin} min)
            Refund:   ${booking.AmountCharged:F2} will be returned to your card within 5–10 business days.

            Tennis Court Booking
            """;

        await SendAsync(
            booking.User.Email,
            booking.User.Name,
            $"Booking cancelled — {booking.Court.Name} on {slot:MMM d}",
            body);
    }

    /// <summary>Returns true only if the reminder was actually handed to the mail server —
    /// the caller must not mark the booking as reminded otherwise (#34).</summary>
    public async Task<bool> SendBookingReminderAsync(Booking booking)
    {
        var slot = booking.SlotStarts.Min();
        var durationMin = booking.SlotStarts.Count * 30;
        var body = $"""
            Hi {booking.User.Name ?? booking.User.Email},

            Just a reminder — you have a court booked tomorrow.

            Court:    {booking.Court.Name}
            Date:     {slot:dddd, MMMM d, yyyy}
            Time:     {slot:h:mm tt} – {slot.AddMinutes(durationMin):h:mm tt} ({durationMin} min)

            See you on the court!

            Tennis Court Booking
            """;

        return await SendAsync(
            booking.User.Email,
            booking.User.Name,
            $"Reminder: {booking.Court.Name} tomorrow at {slot:h:mm tt}",
            body);
    }

    private async Task<bool> SendAsync(string toAddress, string? toName, string subject, string body)
    {
        var s = Settings;
        if (string.IsNullOrEmpty(s.SmtpHost) || s.SmtpHost == "localhost")
        {
            logger.LogInformation("[Email skipped — no SMTP configured] To: {To} Subject: {Subject}", toAddress, subject);
            return true; // dev mode: treat as sent so jobs don't retry forever
        }

        try
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(s.FromName, s.FromAddress));
            message.To.Add(new MailboxAddress(toName ?? toAddress, toAddress));
            message.Subject = subject;
            message.Body = new TextPart("plain") { Text = body };

            using var client = new SmtpClient();
            await client.ConnectAsync(s.SmtpHost, s.SmtpPort, SecureSocketOptions.StartTls);
            if (!string.IsNullOrEmpty(s.Username))
                await client.AuthenticateAsync(s.Username, s.Password);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);

            logger.LogInformation("Email sent to {To}: {Subject}", toAddress, subject);
            return true;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send email to {To}: {Subject}", toAddress, subject);
            return false;
        }
    }
}
