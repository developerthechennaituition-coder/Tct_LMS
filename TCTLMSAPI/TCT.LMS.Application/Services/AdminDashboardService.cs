using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.DTOs.Dashboard;

namespace TCT.LMS.Application.Services
{
    public class AdminDashboardService : IAdminDashboardService
    {
        private readonly IAdminDashboardRepository _adminDashboardRepository;
        public AdminDashboardService(IAdminDashboardRepository adminDashboardRepository)
        {
            _adminDashboardRepository = adminDashboardRepository;
        }

        public List<BoardSalesDto> GetSalesByBoard(int typeGroupCode)
        {
            try
            {
                List<BoardSalesDto> boardSalesDtos = new List<BoardSalesDto>();
                boardSalesDtos = _adminDashboardRepository.GetSalesByBoard(typeGroupCode);
                return boardSalesDtos;
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        public List<UserStatisticsDto> GetUserCountByRole()
        {
            try
            {
                var result = _adminDashboardRepository.GetUserCountByRole();
                return result;
            }
            catch (Exception ex)
            {
                throw ex;
            }
        }
    }
}
