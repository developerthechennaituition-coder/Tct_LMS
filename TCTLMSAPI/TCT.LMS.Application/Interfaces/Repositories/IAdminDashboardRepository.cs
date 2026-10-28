using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.DTOs.Dashboard;

namespace TCT.LMS.Application.Interfaces.Repositories
{
    public interface IAdminDashboardRepository
    {
        List<BoardSalesDto> GetSalesByBoard(int typeGroupCode);
        List<UserStatisticsDto> GetUserCountByRole();
    }
}
