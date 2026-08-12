using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using TennisBooking.Controllers;
using TennisBooking.Models;
using TennisBooking.Tests.Helpers;

namespace TennisBooking.Tests.Controllers;

public class CourtsControllerTests(AuthTestFactory factory) : IClassFixture<AuthTestFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    private static List<UpsertRateRequest> FullRateGrid() =>
    [
        new(DayType.Weekday, PriceBand.Day, 20m),
        new(DayType.Weekday, PriceBand.Night, 25m),
        new(DayType.Weekend, PriceBand.Day, 30m),
        new(DayType.Weekend, PriceBand.Night, 35m),
    ];

    [Fact]
    public async Task List_ReturnsActiveCourtsOnly()
    {
        // Act
        var response = await _client.GetAsync("/api/courts");

        // Assert
        if (response.StatusCode != HttpStatusCode.OK)
        {
            var body = await response.Content.ReadAsStringAsync();
            throw new Exception($"Failed with status {response.StatusCode}. Response: {body}");
        }
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var courts = await response.Content.ReadFromJsonAsync<List<CourtDto>>();
        Assert.NotNull(courts);
        // Both seeded Court A and Court B are active
        Assert.NotEmpty(courts);
        Assert.All(courts, c => Assert.True(c.Active));
    }

    [Fact]
    public async Task Create_AsNonAdmin_Returns403()
    {
        // Arrange
        var token = TestJwtFactory.CreateToken(userId: "regular_user", isAdmin: false);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var request = new CreateCourtRequest("Test Court", new TimeOnly(8, 0), new TimeOnly(20, 0), 30, new TimeOnly(18, 0), FullRateGrid());

        // Act
        var response = await _client.PostAsJsonAsync("/api/courts", request);

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Create_AsAdmin_ValidRequest_Returns200AndCreatesCourt()
    {
        // Arrange
        var token = TestJwtFactory.CreateToken(userId: "admin_user", isAdmin: true);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var uniqueName = "Test Court " + Guid.NewGuid().ToString("N");
        var request = new CreateCourtRequest(uniqueName, new TimeOnly(8, 0), new TimeOnly(20, 0), 30, new TimeOnly(18, 0), FullRateGrid());

        // Act
        var response = await _client.PostAsJsonAsync("/api/courts", request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<CourtDto>();
        Assert.NotNull(created);
        Assert.Equal(uniqueName, created.Name);
        Assert.True(created.Active);
    }

    [Fact]
    public async Task Create_AsAdmin_EmptyName_Returns400()
    {
        // Arrange
        var token = TestJwtFactory.CreateToken(userId: "admin_user", isAdmin: true);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var request = new CreateCourtRequest("", new TimeOnly(8, 0), new TimeOnly(20, 0), 30, new TimeOnly(18, 0), FullRateGrid());

        // Act
        var response = await _client.PostAsJsonAsync("/api/courts", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Create_AsAdmin_CloseBeforeOpen_Returns400()
    {
        // Arrange
        var token = TestJwtFactory.CreateToken(userId: "admin_user", isAdmin: true);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var request = new CreateCourtRequest("Bad Times Court", new TimeOnly(18, 0), new TimeOnly(8, 0), 30, new TimeOnly(18, 0), FullRateGrid());

        // Act
        var response = await _client.PostAsJsonAsync("/api/courts", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Create_AsAdmin_MissingRateCell_Returns400()
    {
        // Arrange
        var token = TestJwtFactory.CreateToken(userId: "admin_user", isAdmin: true);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var incompleteRates = FullRateGrid().Take(3).ToList();
        var request = new CreateCourtRequest("Incomplete Rates Court", new TimeOnly(8, 0), new TimeOnly(20, 0), 30, new TimeOnly(18, 0), incompleteRates);

        // Act
        var response = await _client.PostAsJsonAsync("/api/courts", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Create_AsAdmin_ValidRequest_SeedsAllFourPriceRates()
    {
        // Arrange
        var token = TestJwtFactory.CreateToken(userId: "admin_user", isAdmin: true);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var uniqueName = "Priced Court " + Guid.NewGuid().ToString("N");
        var request = new CreateCourtRequest(uniqueName, new TimeOnly(8, 0), new TimeOnly(20, 0), 30, new TimeOnly(18, 0), FullRateGrid());

        // Act
        var createResponse = await _client.PostAsJsonAsync("/api/courts", request);
        var created = await createResponse.Content.ReadFromJsonAsync<CourtDto>();
        var ratesResponse = await _client.GetAsync($"/api/admin/courts/{created!.Id}/pricing");
        var rates = await ratesResponse.Content.ReadFromJsonAsync<JsonElement>();

        // Assert
        Assert.Equal(HttpStatusCode.OK, ratesResponse.StatusCode);
        Assert.Equal(4, rates.GetArrayLength());
    }

    [Fact]
    public async Task Update_AsNonAdmin_Returns403()
    {
        // Arrange
        var token = TestJwtFactory.CreateToken(userId: "regular_user", isAdmin: false);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var request = new CreateCourtRequest("Updated Name", new TimeOnly(8, 0), new TimeOnly(20, 0), 30, new TimeOnly(18, 0), FullRateGrid());

        // Act
        var response = await _client.PutAsJsonAsync($"/api/courts/{Guid.NewGuid()}", request);

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Update_AsAdmin_CloseBeforeOpen_Returns400()
    {
        // Arrange
        var token = TestJwtFactory.CreateToken(userId: "admin_user", isAdmin: true);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var request = new CreateCourtRequest("Bad Times Court", new TimeOnly(18, 0), new TimeOnly(8, 0), 30, new TimeOnly(18, 0), FullRateGrid());

        // Act
        var response = await _client.PutAsJsonAsync($"/api/courts/{Guid.NewGuid()}", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private record CourtDto(Guid Id, string Name, int SlotLengthMinutes, OpeningHours OpeningHours, TimeOnly DayNightBoundary, bool Active);
}
