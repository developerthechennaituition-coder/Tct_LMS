using System.Globalization;
using Microsoft.AspNetCore.Http;
using TCT.LMS.Domain.Entities;

namespace TCT.LMS.Application.Services;

public sealed class AssessmentException : Exception
{
    public int StatusCode { get; }
    public AssessmentException(string message, int statusCode = 400) : base(message) => StatusCode = statusCode;
}

public static class AssessmentRules
{
    // Existing assessment dates are Indian wall-clock dates, not UTC dates.
    public static DateTimeOffset StartsAt(TestSchedule test)
    {
        if (!TimeSpan.TryParseExact(test.ExamStartTime, @"hh\:mm", CultureInfo.InvariantCulture, out var time))
            throw new AssessmentException("The test has an invalid start time. Contact Operations.");
        return new DateTimeOffset(DateTime.SpecifyKind(test.ExamDate.Date + time, DateTimeKind.Unspecified), TimeSpan.FromMinutes(330));
    }

    public static DateTimeOffset EndsAt(TestSchedule test) => StartsAt(test).AddMinutes(test.ExamDurationMinutes);

    public static void RequireDownloadWindow(TestSchedule test, DateTimeOffset now)
    {
        if (now < StartsAt(test) || now >= EndsAt(test))
            throw new AssessmentException("The question paper is available only during the scheduled test window.", 403);
    }

    public static void ValidateMarks(decimal marks, decimal maximum)
    {
        if (maximum <= 0 || maximum > 9999.99m || marks < 0 || marks > maximum
            || decimal.Round(marks, 2) != marks || decimal.Round(maximum, 2) != maximum)
            throw new AssessmentException("Enter valid marks: maximum must be positive, marks must be between zero and maximum, with at most two decimal places.");
    }

    public static void ValidateFiles(ICollection<IFormFile>? files)
    {
        if (files == null || files.Count == 0 || files.Count > 10)
            throw new AssessmentException("Attach between 1 and 10 files.");
        var allowed = new[] { ".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png" };
        if (files.Any(f => f.Length <= 0 || f.Length > 20 * 1024 * 1024
            || !allowed.Contains(Path.GetExtension(f.FileName).ToLowerInvariant()))
            || files.Sum(f => f.Length) > 40 * 1024 * 1024)
            throw new AssessmentException("Use PDF, DOC, DOCX, JPG or PNG files, up to 20 MB each and 40 MB in total. Empty files are not allowed.");
    }
}
