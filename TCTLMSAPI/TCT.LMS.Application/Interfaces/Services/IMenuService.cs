using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.DTOs.Menu;

namespace TCT.LMS.Application.Interfaces.Services
{
    public interface IMenuService
    {
        Task<List<MenuItem>> GetHierarchyMenu(int roleId);
        List<MenuItem> GetMenuItems();
        Task<List<MenuItem>> GetHierarchyMenuItemsByUserId(int roleId);
    }
}
