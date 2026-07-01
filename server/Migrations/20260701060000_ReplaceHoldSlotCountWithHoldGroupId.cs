using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TennisBooking.Migrations
{
    /// <inheritdoc />
    public partial class ReplaceHoldSlotCountWithHoldGroupId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SlotCount",
                table: "Holds");

            // Add HoldGroupId; fill existing rows with unique UUIDs so the NOT NULL constraint is met
            migrationBuilder.Sql("ALTER TABLE \"Holds\" ADD COLUMN \"HoldGroupId\" uuid NOT NULL DEFAULT gen_random_uuid()");
            migrationBuilder.Sql("ALTER TABLE \"Holds\" ALTER COLUMN \"HoldGroupId\" DROP DEFAULT");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HoldGroupId",
                table: "Holds");

            migrationBuilder.AddColumn<int>(
                name: "SlotCount",
                table: "Holds",
                type: "integer",
                nullable: false,
                defaultValue: 1);
        }
    }
}
