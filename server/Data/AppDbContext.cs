using Microsoft.EntityFrameworkCore;
using TennisBooking.Models;

namespace TennisBooking.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<Court> Courts => Set<Court>();
    public DbSet<PriceRate> PriceRates => Set<PriceRate>();
    public DbSet<Hold> Holds => Set<Hold>();
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<Blackout> Blackouts => Set<Blackout>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Court>().OwnsOne(c => c.OpeningHours, o =>
        {
            o.Property(x => x.Open).HasColumnName("opening_open");
            o.Property(x => x.Close).HasColumnName("opening_close");
        });

        b.Entity<PriceRate>()
            .HasIndex(p => new { p.CourtId, p.DayType, p.Band })
            .IsUnique();

        b.Entity<Hold>()
            .HasIndex(h => new { h.CourtId, h.SlotStart })
            .IsUnique();

        b.Entity<Booking>()
            .Property(bk => bk.SlotStarts)
            .HasColumnType("timestamp with time zone[]");

        b.Entity<Booking>()
            .HasIndex(bk => bk.HoldGroupId);

        // Prevent double-booking: Hold has a real DB-level UNIQUE(CourtId, SlotStart)
        // index above. Booking.SlotStarts is an array column with no DB-level uniqueness —
        // Bookings are only race-safe because every Booking is created by consuming an
        // already slot-exclusive Hold (see BookingService.ConfirmBookingAsync). That's an
        // application-level invariant, not a DB-enforced one; there is no cross-table
        // trigger or constraint. See tracked issue for adding real DB-level enforcement
        // on Booking.

        b.Entity<AppUser>().Property(u => u.Role).HasConversion<string>();
        b.Entity<AppUser>().Property(u => u.SkillLevel).HasConversion<string>();
        b.Entity<PriceRate>().Property(p => p.DayType).HasConversion<string>();
        b.Entity<PriceRate>().Property(p => p.Band).HasConversion<string>();
        b.Entity<Booking>().Property(bk => bk.State).HasConversion<string>();
    }
}
