using Microsoft.AspNetCore.Mvc;
using Stripe;
using TennisBooking.Services;

namespace TennisBooking.Controllers;

[ApiController]
[Route("api/webhooks")]
public class WebhooksController(BookingService bookingService, IConfiguration config) : ControllerBase
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
                    await bookingService.ConfirmBookingAsync(session.PaymentIntentId, holdGroupId);
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
