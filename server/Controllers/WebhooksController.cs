using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Stripe;
using TennisBooking.Data;
using TennisBooking.Services;

namespace TennisBooking.Controllers;

[ApiController]
[Route("api/webhooks")]
public class WebhooksController(BookingService bookingService, EmailService emailService, AppDbContext db, IConfiguration config) : ControllerBase
{
    [HttpPost("stripe")]
    public async Task<IActionResult> Stripe()
    {
        var json = await new StreamReader(Request.Body).ReadToEndAsync();
        var secret = config["Stripe:WebhookSecret"]!;

        Event stripeEvent;
        try
        {
            stripeEvent = EventUtility.ConstructEvent(json, Request.Headers["Stripe-Signature"], secret);
        }
        catch (StripeException)
        {
            return BadRequest();
        }

        if (stripeEvent.Type == EventTypes.CheckoutSessionCompleted)
        {
            var session = (Stripe.Checkout.Session)stripeEvent.Data.Object;
            if (session.Metadata.TryGetValue("holdGroupId", out var holdGroupIdStr) &&
                Guid.TryParse(holdGroupIdStr, out var holdGroupId))
            {
                try
                {
                    var booking = await bookingService.ConfirmBookingAsync(session.PaymentIntentId, holdGroupId);
                    var full = await db.Bookings
                        .Include(b => b.User)
                        .Include(b => b.Court)
                        .FirstOrDefaultAsync(b => b.Id == booking.Id);
                    if (full is not null)
                        await emailService.SendBookingConfirmedAsync(full);
                }
                catch (KeyNotFoundException)
                {
                    // Hold already expired or processed — idempotent
                }
            }
        }

        return Ok();
    }
}
