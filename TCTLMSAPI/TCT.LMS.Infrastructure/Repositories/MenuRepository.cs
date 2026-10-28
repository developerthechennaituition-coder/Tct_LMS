using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Data.Common;
using TCT.LMS.DTOs.Menu;

namespace TCT.LMS.Infrastructure.Repositories
{
    public class MenuRepository : IMenuRepository
    {
        public readonly ApplicationDbContext _dbContext;

        public MenuRepository(ApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }
        /*
        public List<MenuItem> GetMenuItems()
        {
            List<MenuItem> menuItems = new List<MenuItem>();
            var result = _dbContext.Menu.Where(s => s.IsActive).ToList();
            foreach (var item in result)
            {
                menuItems.Add(new MenuItem  
                {
                    SortOrder = item.SortOrder,
                    Description = item.Description ?? string.Empty,
                    Text = item.Name ?? string.Empty,
                    Icon = item.Icon ?? string.Empty,
                    Link = item.Link ?? string.Empty,
                    Id = item.Id,
                    //ParentMenuId = item.ParentMenuId.Value,
                    ParentMenuId = item.ParentMenuId ?? 0,
                });
            }
            return menuItems;
        }
        */
        public List<MenuItem> GetMenuItems()
        {
            List<MenuItem> menuItems = new List<MenuItem>();

            var result = _dbContext.Menu
                .Where(s => s.IsActive)
                .Select(s => new
                {
                    s.Id,
                    s.Name,
                    s.Description,
                    s.Icon,
                    s.Link,
                    s.ParentMenuId,
                    s.SortOrder
                })
                .ToList();

            foreach (var item in result)
            {
                menuItems.Add(new MenuItem
                {
                    SortOrder = item.SortOrder,
                    Description = item.Description ?? string.Empty,
                    Text = item.Name ?? string.Empty,
                    Icon = item.Icon ?? string.Empty,
                    Link = item.Link ?? string.Empty,
                    Id = item.Id,
                    ParentMenuId = item.ParentMenuId ?? 0
                });
            }

            return menuItems;
        }
    }
}
