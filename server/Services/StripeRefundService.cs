using Stripe;

namespace TennisBooking.Services;

public class StripeRefundService
{
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

    /// <summary>Refunds the full charge — used when payment settles after the hold expired.</summary>
    public async Task<string> RefundFullAsync(string paymentIntentId)
    {
        var service = new RefundService();
        var refund = await service.CreateAsync(new RefundCreateOptions { PaymentIntent = paymentIntentId });
        return refund.Id;
    }
}
