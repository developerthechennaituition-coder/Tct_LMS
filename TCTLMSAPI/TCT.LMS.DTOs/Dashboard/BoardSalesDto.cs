using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TCT.LMS.DTOs.Dashboard
{
    public class BoardSalesDto
    {
        public Guid? BoardId { get; set; }    
        public string? BoardName { get; set; } = string.Empty;  
        public int? SalesCount { get; set; }    
    }
    public class UserStatisticsDto
    {
        public int UserCount { get; set; }
        public string RoleName { get; set; }
        public int? RoleId { get; set; }
    }

}
