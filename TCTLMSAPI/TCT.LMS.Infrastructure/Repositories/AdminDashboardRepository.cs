using DocumentFormat.OpenXml.InkML;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Data.Common;
using TCT.LMS.Domain;
using TCT.LMS.DTOs.Dashboard;

namespace TCT.LMS.Infrastructure.Repositories
{
    public class AdminDashboardRepository : IAdminDashboardRepository
    {
        private readonly ApplicationDbContext _dbContext;
        public AdminDashboardRepository(ApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public List<BoardSalesDto> GetSalesByBoard(int typeGroupCode)
        {
            List<BoardSalesDto> boardSalesDtos = [];

            boardSalesDtos = (from tc in _dbContext.Type_Code
                              join tg in _dbContext.TypeGroup on tc.TypeGroupId equals tg.Id
                              where tg.TypeGroupCode == typeGroupCode
                              join s in _dbContext.Sales on tc.Id equals s.BoardId into salesGroup
                              from sales in salesGroup.DefaultIfEmpty()
                              group sales by new { tc.Id, tc.TypeCodeName } into g
                              orderby g.Count() descending
                              select new BoardSalesDto
                              {
                                  BoardId = g.Key.Id,
                                  BoardName = g.Key.TypeCodeName,
                                  SalesCount = g.Count(s => s != null) // Counting only non-null sales
                              }).ToList();

            return boardSalesDtos;
        }

        public List<UserStatisticsDto> GetUserCountByRole()
        {
            var userCounts = (from r in _dbContext.Roles
                              join ur in _dbContext.UserRole on r.Id equals ur.RoleId into urGroup
                              from ur in urGroup.DefaultIfEmpty()
                              join u in _dbContext.User on ur.UserId equals u.Id into uGroup
                              from u in uGroup.Where(x => x.IsActive).DefaultIfEmpty()
                              where r.Id.HasValue && !new List<int> { (int)UserRoleEnum.SuperAdmin }.Contains(r.Id.Value)
                              group u by new { r.RoleName, r.Id } into g
                              select new UserStatisticsDto()
                              {
                                  UserCount = g.Count(x => x != null),
                                  RoleName = g.Key.RoleName,
                                  RoleId = g.Key.Id
                              }).ToList();

            return userCounts;
        }
    }
}
