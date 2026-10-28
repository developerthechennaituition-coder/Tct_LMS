using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.Domain.Entities
{
    public class Thresholds : BaseEntity
    {
        public Guid Id { get; set; }
        public string EntityType { get; set; }
        public string GroupKey { get; set; }
        public string ThresholdName { get; set; }
        public decimal? Value { get; set; }
        public string Unit { get; set; }
        public string Description { get; set; }
    }
}
