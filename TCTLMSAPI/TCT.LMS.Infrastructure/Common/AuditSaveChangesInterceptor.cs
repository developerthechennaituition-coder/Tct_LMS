using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using TCT.LMS.Domain.Entities;

namespace TCT.LMS.Infrastructure.Common
{
    public class AuditSaveChangesInterceptor : SaveChangesInterceptor
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly AuditOptions _auditOptions;

        public AuditSaveChangesInterceptor(IHttpContextAccessor httpContextAccessor, IOptions<AuditOptions> options)
        {
            _httpContextAccessor = httpContextAccessor;
            _auditOptions = options.Value;
        }

        private List<AuditLog> BuildAuditLogs(DbContext context)
        {
            var auditLogs = new List<AuditLog>();

            if (context == null) return auditLogs;

            var user = _httpContextAccessor.HttpContext?.User?.Identity?.Name ?? "System";

            var entries = context.ChangeTracker.Entries()
                .Where(e => e.State != EntityState.Detached && e.State != EntityState.Unchanged)
                .Where(e => e.Entity is not AuditLog)
                .ToList(); // ✅ snapshot to avoid modifying during iteration

            foreach (var entry in entries)
            {
                var tableName = entry.Metadata.GetTableName();

                if (!_auditOptions.IncludedTables.Contains(tableName))
                    continue;

                var audit = new AuditLog
                {
                    TableName = tableName,
                    ChangedBy = user,
                    Action = entry.State.ToString(),
                    ChangedAt = DateTime.UtcNow
                };

                var keyProps = entry.Properties.Where(p => p.Metadata.IsPrimaryKey()).ToList();
                audit.KeyValues = keyProps.FirstOrDefault()?.CurrentValue?.ToString();

                var includedCols = _auditOptions.IncludedColumnsPerTable.TryGetValue(tableName, out var set) ? set : null;

                var changedProps = entry.Properties
                    .Where(p =>
                        (entry.State == EntityState.Added || p.IsModified) &&
                        (includedCols == null || includedCols.Contains(p.Metadata.Name)))
                    .ToList();

                if (!changedProps.Any()) continue;

                if (entry.State == EntityState.Added)
                {
                    audit.NewValues = JsonConvert.SerializeObject(changedProps.ToDictionary(p => p.Metadata.Name, p => p.CurrentValue));
                }
                else if (entry.State == EntityState.Modified)
                {
                    audit.OldValues = JsonConvert.SerializeObject(changedProps.ToDictionary(p => p.Metadata.Name, p => p.OriginalValue));
                    audit.NewValues = JsonConvert.SerializeObject(changedProps.ToDictionary(p => p.Metadata.Name, p => p.CurrentValue));
                }
                else if (entry.State == EntityState.Deleted)
                {
                    audit.OldValues = JsonConvert.SerializeObject(changedProps.ToDictionary(p => p.Metadata.Name, p => p.OriginalValue));
                }

                auditLogs.Add(audit);
            }

            return auditLogs;
        }

        private void AddAuditLogs(DbContext context)
        {
            var logs = BuildAuditLogs(context);
            if (logs.Any())
            {
                context.AddRange(logs); // ✅ add after iteration is finished
            }
        }

        public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
        {
            AddAuditLogs(eventData.Context);
            return base.SavingChanges(eventData, result);
        }

        public override async ValueTask<InterceptionResult<int>> SavingChangesAsync(
            DbContextEventData eventData,
            InterceptionResult<int> result,
            CancellationToken cancellationToken = default)
        {
            AddAuditLogs(eventData.Context);
            return await base.SavingChangesAsync(eventData, result, cancellationToken);
        }
    }
}
