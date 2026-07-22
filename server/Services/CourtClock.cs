namespace TennisBooking.Services;

public class CourtClock(IConfiguration config)
{
    private readonly Lazy<TimeZoneInfo> _tz = new(() =>
        TimeZoneInfo.FindSystemTimeZoneById(config["App:TimeZoneId"] ?? "UTC"));

    // Real current instant, expressed as court-local wall-clock digits, then
    // re-labelled Kind=Utc so it compares directly against stored slot times
    // (which use that same "labelled UTC, actually local" convention).
    public DateTime Now() =>
        DateTime.SpecifyKind(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, _tz.Value), DateTimeKind.Utc);
}
