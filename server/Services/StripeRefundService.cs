using Stripe;

namespace TennisBooking.Services;

public class StripeRefundService
{
    public async Task RefundAsync(string paymentIntentId, decimal amount, Guid bookingId)
    {
        var options = new RefundCreateOptions
        {
            PaymentIntent = paymentIntentId,
            Amount = (long)(amount * 100),
            Metadata = new Dictionary<string, string> { ["bookingId"] = bookingId.ToString() }
        };
        var service = new RefundService();
        var refund = await service.CreateAsync(options);
        _ = refund.Id;
    }
}
