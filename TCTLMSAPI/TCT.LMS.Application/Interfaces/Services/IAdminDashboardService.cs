using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.DTOs.Dashboard;

namespace TCT.LMS.Application.Interfaces.Services
{
    public interface IAdminDashboardService
    {
        List<BoardSalesDto> GetSalesByBoard(int typeGroupCode);
        List<UserStatisticsDto> GetUserCountByRole();
    }
}
