using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TennisBooking.Migrations
{
    /// <inheritdoc />
    public partial class AddHoldGroupIdToBookings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "HoldGroupId",
                table: "Bookings",
                type: "uuid",
                nullable: true);

            // Mock/dev payments create bookings without a Stripe payment intent
            migrationBuilder.AlterColumn<string>(
                name: "StripePaymentIntentId",
                table: "Bookings",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.CreateIndex(
                name: "IX_Bookings_HoldGroupId",
                table: "Bookings",
                column: "HoldGroupId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Bookings_HoldGroupId",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "HoldGroupId",
                table: "Bookings");

            migrationBuilder.AlterColumn<string>(
                name: "StripePaymentIntentId",
                table: "Bookings",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);
        }
    }
}
