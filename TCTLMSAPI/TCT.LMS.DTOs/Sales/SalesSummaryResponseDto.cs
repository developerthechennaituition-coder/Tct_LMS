using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.DTOs.Sales
{
    public sealed class SalesSummaryResponseDto
    {
        public Guid SalesId { get; init; }
        public Guid SalesDetailsId { get; init; }
        public Guid StudentId { get; init; }
        public Guid StudentUserId { get; init; }
        public Guid SubjectId { get; init; }
        public DateTime SalesDate { get; init; }

        public string SalesCreatedBy { get; init; } = null!;
        public string Student { get; init; } = null!;
        public string? Tutor { get; init; }      // “Not Assigned” possible
        public string Status { get; init; } = null!;
        public string Subject { get; init; } = null!;
        public string Grade { get; init; } = null!;
        public string Board { get; init; } = null!;
        public string Operation { get; init; } = null!;
        public string Coordinator { get; init; } = null!;
    }
}
