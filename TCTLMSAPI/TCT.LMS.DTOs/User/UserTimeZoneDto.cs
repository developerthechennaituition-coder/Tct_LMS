namespace TCT.LMS.DTOs.User
{
    // POST api/User/{id}/timezone. Null or blank clears the user's timezone (back to "not set").
    public class UpdateUserTimeZoneRequest
    {
        public string? TimeZoneId { get; set; }
    }

    public class UserTimeZoneResponse
    {
        public bool Succeeded { get; set; }
        public Guid UserId { get; set; }
        public string? TimeZoneId { get; set; }
        public string? Message { get; set; }
    }

    // GET api/User/timezones. Available is false when the server cannot resolve IANA timezone IDs.
    public class SupportedTimeZonesResponse
    {
        public bool Available { get; set; }
        public IReadOnlyList<string> TimeZoneIds { get; set; } = Array.Empty<string>();
    }
}
