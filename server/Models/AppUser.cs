namespace TennisBooking.Models;

public enum SkillLevel { Beginner, Intermediate, Advanced }
public enum UserRole { User, Admin }

public class AppUser
{
    public string Id { get; set; } = null!; // Clerk provider sub
    public string Name { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string? Phone { get; set; }
    public SkillLevel SkillLevel { get; set; } = SkillLevel.Beginner;
    public UserRole Role { get; set; } = UserRole.User;
}
