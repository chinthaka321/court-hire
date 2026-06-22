using System.Net;
using System.Net.Http.Headers;
using TennisBooking.Tests.Helpers;

namespace TennisBooking.Tests.Auth;

public class AuthBehaviorTests(AuthTestFactory factory) : IClassFixture<AuthTestFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    // 1 — public endpoint is accessible without a token
    [Fact]
    public async Task GetCourts_WithoutToken_Returns200()
    {
        var response = await _client.GetAsync("/api/courts");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    // 2 — protected endpoint rejects requests with no token
    [Fact]
    public async Task PostHolds_WithoutToken_Returns401()
    {
        var response = await _client.PostAsync("/api/holds",
            new StringContent("{}", System.Text.Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // 3 — admin endpoint rejects requests with no token
    [Fact]
    public async Task GetAdminBookings_WithoutToken_Returns401()
    {
        var response = await _client.GetAsync("/api/admin/bookings");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // 4 — admin endpoint rejects authenticated non-admin users
    [Fact]
    public async Task GetAdminBookings_WithUserToken_Returns403()
    {
        var token = TestJwtFactory.CreateToken(userId: "user_regular", isAdmin: false);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.GetAsync("/api/admin/bookings");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // 5 — admin endpoint allows authenticated admin users
    [Fact]
    public async Task GetAdminBookings_WithAdminToken_Returns200()
    {
        var token = TestJwtFactory.CreateToken(userId: "user_admin", isAdmin: true);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.GetAsync("/api/admin/bookings");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
