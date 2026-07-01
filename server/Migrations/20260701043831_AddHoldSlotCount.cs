using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TennisBooking.Migrations
{
    /// <inheritdoc />
    public partial class AddHoldSlotCount : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SlotCount",
                table: "Holds",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SlotCount",
                table: "Holds");
        }
    }
}
