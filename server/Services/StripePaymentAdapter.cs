using Stripe;
using Stripe.Checkout;

namespace TennisBooking.Services;

public class StripePaymentAdapter : IPaymentGateway
{
    public async Task<string> CreateCheckoutSessionAsync(
        Guid holdGroupId,
        string userId,
        decimal amount,
        string courtName,
        string slotDetails,
        string originDomain
    )
    {
        var options = new SessionCreateOptions
        {
            PaymentMethodTypes = ["card"],
            LineItems = [
                new SessionLineItemOptions
                {
                    PriceData = new SessionLineItemPriceDataOptions
                    {
                        UnitAmount = (long)(amount * 100),
                        Currency = "usd",
                        ProductData = new SessionLineItemPriceDataProductDataOptions
                        {
                            Name = $"Court Reservation: {courtName}",
                            Description = slotDetails,
                        },
                    },
                    Quantity = 1,
                },
            ],
            Mode = "payment",
            SuccessUrl = $"{originDomain}/booking/confirming?session_id={{CHECKOUT_SESSION_ID}}&hold_group_id={holdGroupId}",
            CancelUrl = $"{originDomain}/?cancelled=1",
            Metadata = new Dictionary<string, string>
            {
                ["holdGroupId"] = holdGroupId.ToString(),
                ["userId"] = userId,
            },
        };

        var service = new SessionService();
        var session = await service.CreateAsync(options);
        return session.Url;
    }

    public async Task<string> RefundAsync(string paymentIntentId, decimal amount, Guid bookingId)
    {
        var options = new RefundCreateOptions
        {
            PaymentIntent = paymentIntentId,
            Amount = (long)(amount * 100),
            Metadata = new Dictionary<string, string> { ["bookingId"] = bookingId.ToString() }
        };
        var service = new RefundService();
        var refund = await service.CreateAsync(options);
        return refund.Id;
    }

    public async Task<string> RefundFullAsync(string paymentIntentId)
    {
        var service = new RefundService();
        var refund = await service.CreateAsync(new RefundCreateOptions { PaymentIntent = paymentIntentId });
        return refund.Id;
    }

    public Event ParseWebhookEvent(string jsonBody, string stripeSignature, string webhookSecret)
    {
        return EventUtility.ConstructEvent(jsonBody, stripeSignature, webhookSecret);
    }
}
