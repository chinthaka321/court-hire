using TennisBooking.Data;
using TennisBooking.Models;

namespace TennisBooking.Services;

public static class RefundHelper
{
    public static async Task<bool> TryRefundAsync(
        Booking booking, IPaymentGateway paymentGateway, AppDbContext db,
        EmailService emailService, ILogger logger, Guid bookingId)
    {
        try
        {
            booking.StripeRefundId = await paymentGateway.RefundAsync(booking.StripePaymentIntentId!, booking.AmountCharged, bookingId);
            await db.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Refund failed for cancelled booking {BookingId} (paymentIntent {PaymentIntent})", bookingId, booking.StripePaymentIntentId);
            await emailService.SendBookingCancelledAsync(booking);
            return false;
        }
    }
}
