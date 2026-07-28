using Stripe;

namespace TennisBooking.Services;

public interface IPaymentGateway
{
    Task<string> CreateCheckoutSessionAsync(
        Guid holdGroupId,
        string userId,
        decimal amount,
        string courtName,
        string slotDetails,
        string originDomain
    );
    Task<string> RefundAsync(string paymentIntentId, decimal amount, Guid bookingId);
    Task<string> RefundFullAsync(string paymentIntentId);
    Event ParseWebhookEvent(string jsonBody, string stripeSignature, string webhookSecret);
}
