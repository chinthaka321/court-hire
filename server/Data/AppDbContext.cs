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

        // Prevent double-booking: unique (court_id, slot_start) enforced at DB level
        // via application-layer check + Hold unique index as backstop.
        // Full cross-table enforcement is done via a DB trigger in migration.

        b.Entity<AppUser>().Property(u => u.Role).HasConversion<string>();
        b.Entity<AppUser>().Property(u => u.SkillLevel).HasConversion<string>();
        b.Entity<PriceRate>().Property(p => p.DayType).HasConversion<string>();
        b.Entity<PriceRate>().Property(p => p.Band).HasConversion<string>();
        b.Entity<Booking>().Property(bk => bk.State).HasConversion<string>();
    }
}
