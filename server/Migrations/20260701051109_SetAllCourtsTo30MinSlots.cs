using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TennisBooking.Migrations
{
    /// <inheritdoc />
    public partial class SetAllCourtsTo30MinSlots : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("UPDATE \"Courts\" SET \"SlotLengthMinutes\" = 30 WHERE \"SlotLengthMinutes\" != 30");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
