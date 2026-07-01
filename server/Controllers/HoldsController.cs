using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Stripe.Checkout;
using TennisBooking.Data;
using TennisBooking.Services;

namespace TennisBooking.Controllers;

[ApiController]
[Route("api/holds")]
[Authorize]
public class HoldsController(BookingService booking, IConfiguration config) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateHoldRequest req)
    {
        var userId = User.FindFirst("sub")?.Value
            ?? throw new UnauthorizedAccessException();

        try
        {
            var holdGroup = await booking.CreateHoldAsync(req.CourtId, req.SlotStart.ToUniversalTime(), userId, req.SlotCount);

            var options = new SessionCreateOptions
            {
                PaymentMethodTypes = ["card"],
                LineItems = [new SessionLineItemOptions
                {
                    PriceData = new SessionLineItemPriceDataOptions
                    {
                        Currency = "usd",
                        UnitAmountDecimal = holdGroup.TotalPrice * 100,
                        ProductData = new SessionLineItemPriceDataProductDataOptions
                        {
                            Name = $"Tennis Court Booking — {req.SlotStart:MMM d, h:mm tt} ({holdGroup.DurationMinutes} min)"
                        }
                    },
                    Quantity = 1
                }],
                Mode = "payment",
                SuccessUrl = $"{config["App:ClientUrl"]}/booking/confirming?holdGroupId={holdGroup.HoldGroupId}",
                CancelUrl = $"{config["App:ClientUrl"]}/",
                Metadata = new Dictionary<string, string> { ["holdGroupId"] = holdGroup.HoldGroupId.ToString() }
            };

            var service = new SessionService();
            var session = await service.CreateAsync(options);

            await booking.UpdateHoldGroupSessionAsync(holdGroup.HoldGroupId, session.Id);

            return Ok(new { checkoutUrl = session.Url, holdGroupId = holdGroup.HoldGroupId });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
    }
}

public record CreateHoldRequest(Guid CourtId, DateTime SlotStart, int SlotCount = 1);
