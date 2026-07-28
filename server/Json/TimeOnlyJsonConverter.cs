using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace TennisBooking.Json;

/// <summary>
/// The built-in System.Text.Json TimeOnly converter only accepts the strict
/// round-trip format "HH:mm:ss.fffffff". Browser &lt;input type="time"&gt;
/// elements (and most API clients) send plain "HH:mm", which that converter
/// rejects with a 400 that has no usable error message. Accept both.
/// </summary>
public class TimeOnlyJsonConverter : JsonConverter<TimeOnly>
{
    private static readonly string[] Formats = ["HH:mm:ss.fffffff", "HH:mm:ss", "HH:mm"];

    public override TimeOnly Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var value = reader.GetString();
        return TimeOnly.ParseExact(value!, Formats, CultureInfo.InvariantCulture);
    }

    public override void Write(Utf8JsonWriter writer, TimeOnly value, JsonSerializerOptions options)
        => writer.WriteStringValue(value.ToString("HH:mm:ss.fffffff", CultureInfo.InvariantCulture));
}
