using System.Diagnostics.CodeAnalysis;
using System.Globalization;

namespace Common
{
    // How to resolve a wall-clock time that occurs twice (clocks go back for daylight saving).
    public enum TctAmbiguousTime
    {
        Reject,
        Earlier, // first occurrence (still on daylight time)
        Later    // second occurrence (back on standard time)
    }

    // How to resolve a wall-clock time that never occurs (clocks go forward for daylight saving).
    public enum TctInvalidTime
    {
        Reject,
        ShiftForward // move forward by the length of the gap, e.g. 02:30 becomes 03:30
    }

    public enum TctLocalTimeStatus
    {
        Valid,
        Invalid,
        Ambiguous
    }

    /// <summary>
    /// Timezone conversions with explicit semantics:
    /// a UTC instant is a DateTime with Kind = Utc;
    /// a wall-clock time is a DateTime with Kind = Unspecified that only has meaning with a timezone ID.
    /// DateTimeKind.Local is always rejected, so no result depends on the server's own timezone.
    /// Timezone IDs may be IANA ("America/New_York") or Windows ("Eastern Standard Time").
    /// </summary>
    public static class TctTime
    {
        // Class and demo times are stored as India wall-clock times. India has no daylight saving,
        // so an India wall-clock time is never invalid or ambiguous.
        public const string IndiaTimeZoneId = "Asia/Kolkata";
        private const string IndiaWindowsTimeZoneId = "India Standard Time";

        // ICU (and browsers) still report some zones by their old IANA names. These are pure renames in the
        // IANA "backward" file: same zone, same rules. Merged zones (e.g. Pacific/Johnston -> Honolulu) are
        // deliberately absent because mapping them would change which rules apply.
        private static readonly Dictionary<string, string> RenamedIanaIds = new(StringComparer.OrdinalIgnoreCase)
        {
            ["Africa/Asmera"] = "Africa/Asmara",
            ["America/Buenos_Aires"] = "America/Argentina/Buenos_Aires",
            ["America/Catamarca"] = "America/Argentina/Catamarca",
            ["America/Cordoba"] = "America/Argentina/Cordoba",
            ["America/Godthab"] = "America/Nuuk",
            ["America/Indianapolis"] = "America/Indiana/Indianapolis",
            ["America/Jujuy"] = "America/Argentina/Jujuy",
            ["America/Louisville"] = "America/Kentucky/Louisville",
            ["America/Mendoza"] = "America/Argentina/Mendoza",
            ["Asia/Calcutta"] = "Asia/Kolkata",
            ["Asia/Katmandu"] = "Asia/Kathmandu",
            ["Asia/Rangoon"] = "Asia/Yangon",
            ["Asia/Saigon"] = "Asia/Ho_Chi_Minh",
            ["Atlantic/Faeroe"] = "Atlantic/Faroe",
            ["Europe/Kiev"] = "Europe/Kyiv",
            ["Pacific/Enderbury"] = "Pacific/Kanton",
            ["Pacific/Ponape"] = "Pacific/Pohnpei",
            ["Pacific/Truk"] = "Pacific/Chuuk",
        };

        // Case-insensitive lookup of every IANA ID this host's ICU data knows -> its standard spelling.
        private static readonly Lazy<Dictionary<string, string>> StandardIanaIds = new(BuildStandardIanaIds);

        public static TimeZoneInfo FindTimeZone(string timeZoneId)
        {
            if (TryFindTimeZone(timeZoneId, out var timeZone)) return timeZone;
            throw new TimeZoneNotFoundException($"Unknown timezone ID '{timeZoneId}'.");
        }

        public static bool TryFindTimeZone(string? timeZoneId, [NotNullWhen(true)] out TimeZoneInfo? timeZone)
        {
            timeZone = null;
            if (string.IsNullOrWhiteSpace(timeZoneId)) return false;
            var id = timeZoneId.Trim();
            if (TryFindSystemTimeZone(id, out timeZone)) return true;
            // A host may know only Windows IDs or only IANA IDs; try the mapped ID as well.
            if (TimeZoneInfo.TryConvertIanaIdToWindowsId(id, out var windowsId) && TryFindSystemTimeZone(windowsId, out timeZone)) return true;
            if (TimeZoneInfo.TryConvertWindowsIdToIanaId(id, out var ianaId) && TryFindSystemTimeZone(ianaId, out timeZone)) return true;
            // IANA lookups are case-sensitive on some hosts ("america/new_york" fails); retry with the standard spelling.
            if (StandardIanaIds.Value.TryGetValue(id, out var standardId) && !string.Equals(standardId, id, StringComparison.Ordinal)
                && TryFindSystemTimeZone(standardId, out timeZone)) return true;
            return string.Equals(id, IndiaTimeZoneId, StringComparison.OrdinalIgnoreCase)
                && TryFindSystemTimeZone(IndiaWindowsTimeZoneId, out timeZone);
        }

        public static bool IsValidTimeZoneId(string? timeZoneId) => TryFindTimeZone(timeZoneId, out _);

        // False on hosts without ICU, where IANA IDs other than Asia/Kolkata cannot be resolved or mapped.
        public static bool SupportsIanaTimeZones => StandardIanaIds.Value.Count > 0;

        // The IDs a person can choose as "their" timezone, sorted: every location ID ("Area/Location", e.g.
        // America/New_York) this host can resolve, plus Etc/UTC. Fixed-offset IDs (EST, EST5EDT, Etc/GMT+5) are
        // left out: they never follow local daylight saving and Etc/GMT signs are inverted.
        public static IReadOnlyList<string> GetSupportedIanaIds() => SupportedIanaIds.Value;

        private static readonly Lazy<IReadOnlyList<string>> SupportedIanaIds = new(() =>
        {
            var ids = new SortedSet<string>(StringComparer.Ordinal);
            foreach (var standardId in StandardIanaIds.Value.Values)
                if (IsLocationId(standardId) && TryFindSystemTimeZone(standardId, out _)) ids.Add(standardId);
            if (TryFindTimeZone(IndiaTimeZoneId, out _)) ids.Add(IndiaTimeZoneId);
            return ids.ToList();
        });

        private static bool IsLocationId(string ianaId) =>
            ianaId == "Etc/UTC" || (ianaId.Contains('/') && !ianaId.StartsWith("Etc/", StringComparison.Ordinal));

        // The standard IANA form of a timezone ID, for storing a user's choice: "India Standard Time",
        // "asia/calcutta" and "Asia/Kolkata" all give "Asia/Kolkata".
        public static bool TryGetIanaId(string? timeZoneId, [NotNullWhen(true)] out string? ianaId)
        {
            ianaId = null;
            if (!TryFindTimeZone(timeZoneId, out var timeZone)) return false;
            string? candidate = timeZone.HasIanaId ? timeZone.Id
                : TimeZoneInfo.TryConvertWindowsIdToIanaId(timeZone.Id, out var mappedId) ? mappedId
                : timeZone.Id == IndiaWindowsTimeZoneId ? IndiaTimeZoneId // hosts without ICU cannot map Windows IDs
                : null;
            if (candidate == null) return false;
            ianaId = StandardIanaIds.Value.TryGetValue(candidate, out var standardId) ? standardId : PreferredIanaId(candidate);
            return true;
        }

        public static DateTime UtcToLocal(DateTime utcInstant, string timeZoneId)
        {
            RequireUtc(utcInstant, nameof(utcInstant));
            var local = TimeZoneInfo.ConvertTimeFromUtc(utcInstant, FindTimeZone(timeZoneId));
            return DateTime.SpecifyKind(local, DateTimeKind.Unspecified);
        }

        // The same instant with the zone's offset attached, e.g. 2026-11-02T17:00:00-05:00.
        public static DateTimeOffset UtcToOffset(DateTime utcInstant, string timeZoneId)
        {
            RequireUtc(utcInstant, nameof(utcInstant));
            return TimeZoneInfo.ConvertTime(new DateTimeOffset(utcInstant), FindTimeZone(timeZoneId));
        }

        public static TctLocalTimeStatus GetLocalTimeStatus(DateTime wallClock, string timeZoneId)
        {
            RequireWallClock(wallClock, nameof(wallClock));
            var timeZone = FindTimeZone(timeZoneId);
            if (timeZone.IsInvalidTime(wallClock)) return TctLocalTimeStatus.Invalid;
            if (timeZone.IsAmbiguousTime(wallClock)) return TctLocalTimeStatus.Ambiguous;
            return TctLocalTimeStatus.Valid;
        }

        // False when the wall-clock time is invalid or ambiguous and the matching resolution is Reject.
        public static bool TryLocalToUtc(DateTime wallClock, string timeZoneId, out DateTime utcInstant,
            TctAmbiguousTime ambiguous = TctAmbiguousTime.Reject, TctInvalidTime invalid = TctInvalidTime.Reject)
        {
            RequireWallClock(wallClock, nameof(wallClock));
            var timeZone = FindTimeZone(timeZoneId);
            utcInstant = default;

            if (timeZone.IsInvalidTime(wallClock))
            {
                if (invalid == TctInvalidTime.Reject) return false;
                // Use the offset in force before the gap, which moves the time forward by the gap length.
                var dayBefore = wallClock.AddDays(-1);
                var offsetBefore = dayBefore - TimeZoneInfo.ConvertTimeToUtc(dayBefore, timeZone);
                utcInstant = DateTime.SpecifyKind(wallClock - offsetBefore, DateTimeKind.Utc);
                return true;
            }

            if (timeZone.IsAmbiguousTime(wallClock))
            {
                if (ambiguous == TctAmbiguousTime.Reject) return false;
                var offsets = timeZone.GetAmbiguousTimeOffsets(wallClock);
                // The larger offset gives the earlier instant.
                var offset = ambiguous == TctAmbiguousTime.Earlier ? offsets.Max() : offsets.Min();
                utcInstant = DateTime.SpecifyKind(wallClock - offset, DateTimeKind.Utc);
                return true;
            }

            utcInstant = DateTime.SpecifyKind(TimeZoneInfo.ConvertTimeToUtc(wallClock, timeZone), DateTimeKind.Utc);
            return true;
        }

        public static DateTime LocalToUtc(DateTime wallClock, string timeZoneId,
            TctAmbiguousTime ambiguous = TctAmbiguousTime.Reject, TctInvalidTime invalid = TctInvalidTime.Reject)
        {
            if (TryLocalToUtc(wallClock, timeZoneId, out var utcInstant, ambiguous, invalid)) return utcInstant;
            var reason = GetLocalTimeStatus(wallClock, timeZoneId) == TctLocalTimeStatus.Invalid
                ? "does not exist (daylight-saving gap)"
                : "occurs twice (daylight-saving overlap)";
            throw new ArgumentException($"{wallClock:yyyy-MM-dd HH:mm} in '{timeZoneId}' {reason}.", nameof(wallClock));
        }

        // A wall-clock time in one zone as the wall-clock time of the same instant in another zone.
        public static DateTime ConvertLocal(DateTime wallClock, string fromTimeZoneId, string toTimeZoneId,
            TctAmbiguousTime ambiguous = TctAmbiguousTime.Reject, TctInvalidTime invalid = TctInvalidTime.Reject) =>
            UtcToLocal(LocalToUtc(wallClock, fromTimeZoneId, ambiguous, invalid), toTimeZoneId);

        // Stored class times (India wall-clock) to and from UTC instants.
        public static DateTime IndiaToUtc(DateTime indiaWallClock) => LocalToUtc(indiaWallClock, IndiaTimeZoneId);

        public static DateTime UtcToIndia(DateTime utcInstant) => UtcToLocal(utcInstant, IndiaTimeZoneId);

        // The renamed form of an old IANA name, only when this host can resolve the new name.
        private static string PreferredIanaId(string ianaId) =>
            RenamedIanaIds.TryGetValue(ianaId, out var renamed) && TryFindSystemTimeZone(renamed, out _) ? renamed : ianaId;

        // Built from the host's own Windows-to-IANA data for every region, so no country is hardcoded.
        // Empty on hosts without ICU, where only exact IDs are recognised.
        private static Dictionary<string, string> BuildStandardIanaIds()
        {
            var standardIds = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            void Add(string ianaId)
            {
                var preferred = PreferredIanaId(ianaId);
                standardIds[ianaId] = preferred;
                standardIds[preferred] = preferred;
            }

            var regions = new List<string> { "001" };
            foreach (var culture in CultureInfo.GetCultures(CultureTypes.SpecificCultures))
            {
                try
                {
                    var region = new RegionInfo(culture.Name).TwoLetterISORegionName;
                    if (region.Length == 2 && !regions.Contains(region)) regions.Add(region);
                }
                catch (ArgumentException) { }
            }

            foreach (var zone in TimeZoneInfo.GetSystemTimeZones())
                foreach (var region in regions)
                    if (TimeZoneInfo.TryConvertWindowsIdToIanaId(zone.Id, region, out var ianaId)) Add(ianaId);
            foreach (var oldId in RenamedIanaIds.Keys)
                if (TryFindSystemTimeZone(oldId, out _)) Add(oldId);
            return standardIds;
        }

        private static bool TryFindSystemTimeZone(string id, [NotNullWhen(true)] out TimeZoneInfo? timeZone)
        {
            try
            {
                timeZone = TimeZoneInfo.FindSystemTimeZoneById(id);
                return true;
            }
            catch (TimeZoneNotFoundException) { }
            catch (InvalidTimeZoneException) { }
            timeZone = null;
            return false;
        }

        private static void RequireUtc(DateTime value, string paramName)
        {
            if (value.Kind != DateTimeKind.Utc)
                throw new ArgumentException("Expected a UTC instant (DateTimeKind.Utc).", paramName);
        }

        private static void RequireWallClock(DateTime value, string paramName)
        {
            if (value.Kind != DateTimeKind.Unspecified)
                throw new ArgumentException("Expected a wall-clock time (DateTimeKind.Unspecified) with a timezone ID.", paramName);
        }
    }
}
