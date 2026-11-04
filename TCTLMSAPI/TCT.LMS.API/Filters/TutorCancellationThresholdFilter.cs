using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using TCT.LMS.Data.Common;
using TCT.LMS.Domain.Entities;
using Rules = TCT.LMS.Application.Services.TutorCancellationRules;

namespace TCT.LMS.API.Filters;

/// <summary>
/// Threshold Configuration saves (ThresholdController) of the tutor cancellation thresholds (TutorCancellationRules):
/// a value must be valid, one name may have only one active row (no overlapping weekly bands), and the weeks per month
/// and the 1-7 weekly allowances cannot be inactivated. Other thresholds are not affected. Read-only.
/// </summary>
public sealed class TutorCancellationThresholdFilter : IAsyncActionFilter
{
    private readonly ApplicationDbContext _dbContext;

    public TutorCancellationThresholdFilter(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var method = context.HttpContext.Request.Method.ToUpperInvariant();
        string? error = null;
        if (method is "POST" or "PUT" && context.ActionArguments.Values.OfType<Thresholds>().FirstOrDefault() is { } row)
            error = await ValidateSaveAsync(row);
        else if (method == "DELETE" && context.ActionArguments.TryGetValue("id", out var id) && id is Guid rowId)
            error = await ValidateToggleAsync(rowId);

        if (error != null)
        {
            context.Result = new BadRequestObjectResult(new { succeeded = false, message = error });
            return;
        }
        await next();
    }

    private Task<List<Thresholds>> OtherActiveRowsAsync(Guid excludeId) =>
        _dbContext.Thresholds.AsNoTracking()
            .Where(t => t.IsActive && t.Id != excludeId && t.ThresholdName != null && t.ThresholdName.StartsWith("TutorCancel"))
            .ToListAsync();

    private async Task<string?> ValidateSaveAsync(Thresholds row)
    {
        var name = row.ThresholdName?.Trim();
        if (!row.IsActive || !Rules.IsRuleThreshold(name)) return null;

        var others = await OtherActiveRowsAsync(row.Id);
        if (others.Any(t => t.ThresholdName == name))
            return $"{name} is already configured. Edit the existing row instead of adding another one.";

        var weeks = name == Rules.WeeksPerMonthName ? row.Value
            : others.Where(t => t.ThresholdName == Rules.WeeksPerMonthName).Select(t => t.Value).FirstOrDefault();
        var weeksPerMonth = weeks is { } w && w == decimal.Truncate(w) && w >= 1 ? (int?)w : null;
        var invalid = Rules.ValidateValue(name!, row.Value, name == Rules.WeeksPerMonthName ? null : weeksPerMonth);
        if (invalid != null) return invalid;

        // Fewer weeks a month must still leave room for every saved allowance.
        if (name == Rules.WeeksPerMonthName && weeksPerMonth is { } newWeeks)
            foreach (var band in others.Where(t => Rules.WeeklyBandOf(t.ThresholdName).HasValue))
                if (Rules.ValidateValue(band.ThresholdName, band.Value, newWeeks) is { } bandError)
                    return $"With {newWeeks} weeks a month: {bandError}";
        return null;
    }

    // ThresholdController's DELETE switches a row between active and inactive.
    private async Task<string?> ValidateToggleAsync(Guid id)
    {
        var row = await _dbContext.Thresholds.AsNoTracking().FirstOrDefaultAsync(t => t.Id == id);
        if (row == null || !Rules.IsRuleThreshold(row.ThresholdName)) return null;
        if (!row.IsActive)
        {
            var others = await OtherActiveRowsAsync(row.Id);
            return others.Any(t => t.ThresholdName == row.ThresholdName)
                ? $"{row.ThresholdName} already has an active row. Inactivate it first."
                : null;
        }
        var required = row.ThresholdName == Rules.WeeksPerMonthName || row.ThresholdName == Rules.DeductionPercentName
            || Rules.WeeklyBandOf(row.ThresholdName) is >= Rules.RequiredMinWeekly and <= Rules.RequiredMaxWeekly;
        return required
            ? $"{row.ThresholdName} is required by the tutor cancellation rules and cannot be inactivated. Edit its value instead."
            : null;
    }
}
