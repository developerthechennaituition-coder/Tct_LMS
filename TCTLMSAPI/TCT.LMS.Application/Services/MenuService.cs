using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TCT.LMS.Application.Interfaces.Repositories;
using TCT.LMS.Application.Interfaces.Services;
using TCT.LMS.Domain.Entities;
using TCT.LMS.DTOs.Menu;

namespace TCT.LMS.Application.Services
{
    public class MenuService : IMenuService
    {
        private readonly IMenuRepository _menuRepository;
        private readonly IAuthRepository _authRepository;
        private Dictionary<int, MenuItem> menuDict;
        public MenuService(IMenuRepository menuRepository, IAuthRepository authRepository)
        {
            _menuRepository = menuRepository;
            _authRepository = authRepository;
        }
        public List<MenuItem> GetMenuItems()
        {
            //var permissionResult = _authRepository.GetUserRolePermissionClaims()
            var result = _menuRepository.GetMenuItems();
            return result;
        }

        public async Task<List<MenuItem>> GetHierarchyMenu(int roleId)
        {
            List<MenuItem> tempMenu = new List<MenuItem>();
            try
            {
                var result = _menuRepository.GetMenuItems();

                var permissionReulst = await _authRepository.GetRoleMenuPermissionData(roleId);
                foreach (var item in result)
                {
                    var _findings = permissionReulst.Where(s => s.MenuId == item.Id).FirstOrDefault();
                    if (_findings != null)
                    {
                        item.Delete = _findings.Delete;
                        item.Edit = _findings.Edit;
                        item.View = _findings.View;
                        item.Add = _findings.Add;
                        item.Report = _findings.Report ?? false;
                        item.MapBank = _findings.MapBank ?? false;
                    }
                }

                menuDict = new Dictionary<int, MenuItem>();
                menuDict = result.ToDictionary(x => x.Id);
                tempMenu = BuildHierarchy(result);
            }
            catch (Exception ex)
            {
                throw ex;
            }
            return tempMenu;
        }
        
                public async Task<List<MenuItem>> GetHierarchyMenuItemsByUserId(int roleId)
                {
                    try
                    {
                        Console.WriteLine("===== MENU SERVICE START =====");

                        Console.WriteLine($"Role ID: {roleId}");

                        List<MenuItem> tempMenu = new List<MenuItem>();

                        Console.WriteLine("STEP 1 - Getting permissions...");

                        var permissionResult =
                            await _authRepository.GetRoleMenuPermissionData(roleId);

                        Console.WriteLine(
                            $"STEP 1 SUCCESS - Permission count: {permissionResult.Count}"
                        );

                        Console.WriteLine("STEP 2 - Creating menu IDs...");

                        var menuIds = permissionResult
                            .Where(i =>
                                i.Add == true ||
                                i.Edit == true ||
                                i.Delete == true ||
                                i.View == true)
                            .Select(s => s.MenuId)
                            .ToArray();

                        Console.WriteLine(  
                            $"STEP 2 SUCCESS - Menu IDs: {string.Join(", ", menuIds)}"
                        );

                        Console.WriteLine("STEP 3 - Getting menu items...");

                        var result = _menuRepository.GetMenuItems();

                        Console.WriteLine(
                            $"STEP 3 SUCCESS - Menu count: {result.Count}"
                        );

                        Console.WriteLine("===== MENU CHECK =====");

                        Console.WriteLine(
                            $"Learning Management 99: {result.Any(x => x.Id == 99)}"
                        );

                        Console.WriteLine(
                            $"Course 104: {result.Any(x => x.Id == 104)}"
                        );

                        Console.WriteLine(
                            $"Instructor 105: {result.Any(x => x.Id == 105)}"
                        );

                        Console.WriteLine(
                            $"Student 106: {result.Any(x => x.Id == 106)}"
                        );

                        Console.WriteLine("----- PERMISSIONS -----");

                        Console.WriteLine(
                            $"Permission 99: {permissionResult.Any(x => x.MenuId == 99)}"
                        );

                        Console.WriteLine(
                            $"Permission 104: {permissionResult.Any(x => x.MenuId == 104)}"
                        );

                        Console.WriteLine(
                            $"Permission 105: {permissionResult.Any(x => x.MenuId == 105)}"
                        );

                        Console.WriteLine(
                            $"Permission 106: {permissionResult.Any(x => x.MenuId == 106)}"
                        );

                        Console.WriteLine("======================");
                        result = result.OrderBy(s => s.SortOrder).ToList();
                        foreach (var item in result)
                        {
                            var currentMenu = permissionResult.Where(s => s.MenuId == item.Id).FirstOrDefault();
                            if (currentMenu != null)
                            {
                                if (currentMenu.Add == false && currentMenu.Edit == false && currentMenu.Delete == false && currentMenu.View == false)
                                {
                                    continue;
                                }
                                if (currentMenu.Add || currentMenu.Edit || currentMenu.Delete || currentMenu.View)
                                {
                                    item.Delete = currentMenu.Delete;
                                    item.Add = currentMenu.Add;
                                    item.Edit = currentMenu.Edit;
                                    item.View = currentMenu.View;
                                    tempMenu.Add(item);
                                }
                            }

                        }
                        menuDict = result.ToDictionary(x => x.Id);
                        var hierarcyResult = BuildHierarchy(tempMenu);
                        Console.WriteLine("===== HIERARCHY CHECK =====");

                        foreach (var menu in hierarcyResult)
                        {
                            Console.WriteLine(
                                $"ROOT: {menu.Id} - {menu.Text} - Children: {menu.SubMenu?.Count ?? 0}"
                            );

                            if (menu.SubMenu != null)
                            {
                                foreach (var child in menu.SubMenu)
                                {
                                    Console.WriteLine(
                                        $"    CHILD: {child.Id} - {child.Text} - Parent: {child.ParentMenuId}"
                                    );
                                }
                            }
                        }

                        Console.WriteLine("===========================");
                        tempMenu = FilterByChildIds(hierarcyResult, menuIds);
                        tempMenu = tempMenu.OrderBy(s=>s.SortOrder).ToList();
                        return tempMenu;
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine("MENU ERROR:");
                        Console.WriteLine(ex.ToString());
                        throw;
                    }
                    return null;
                }
      /*  public async Task<List<MenuItem>> GetHierarchyMenuItemsByUserId(int roleId)
        {
            try
            {
                Console.WriteLine("========================================");
                Console.WriteLine("        MENU SERVICE START");
                Console.WriteLine("========================================");

                Console.WriteLine($"ROLE ID = {roleId}");

                // =====================================================
                // STEP 1 - GET PERMISSIONS
                // =====================================================

                Console.WriteLine("");
                Console.WriteLine("===== STEP 1: GET PERMISSIONS =====");

                var permissionResult =
                    await _authRepository.GetRoleMenuPermissionData(roleId);

                Console.WriteLine(
                    $"Permission count = {permissionResult?.Count ?? 0}"
                );

                if (permissionResult != null)
                {
                    foreach (var permission in permissionResult)
                    {
                        Console.WriteLine(
                            $"MenuId={permission.MenuId}, " +
                            $"Add={permission.Add}, " +
                            $"Edit={permission.Edit}, " +
                            $"Delete={permission.Delete}, " +
                            $"View={permission.View}"
                        );
                    }
                }

                // =====================================================
                // STEP 2 - CREATE MENU IDS
                // =====================================================

                Console.WriteLine("");
                Console.WriteLine("===== STEP 2: PERMITTED MENU IDS =====");

                var menuIds = permissionResult
                    .Where(i =>
                        i.Add ||
                        i.Edit ||
                        i.Delete ||
                        i.View)
                    .Select(i => i.MenuId)
                    .ToArray();

                Console.WriteLine(
                    $"Menu IDs = {string.Join(", ", menuIds)}"
                );

                // =====================================================
                // STEP 3 - GET ALL MENU ITEMS
                // =====================================================

                Console.WriteLine("");
                Console.WriteLine("===== STEP 3: GET MENU ITEMS =====");

                var result = _menuRepository.GetMenuItems();

                Console.WriteLine(
                    $"Total menu count = {result.Count}"
                );

                // =====================================================
                // STEP 4 - CHECK SPECIFIC MENUS
                // =====================================================

                Console.WriteLine("");
                Console.WriteLine("===== STEP 4: SPECIFIC MENU CHECK =====");

                foreach (var id in new[] { 99, 104, 105, 106 })
                {
                    var menu = result.FirstOrDefault(x => x.Id == id);

                    var permission =
                        permissionResult.FirstOrDefault(x => x.MenuId == id);

                    Console.WriteLine("----------------------------------------");

                    Console.WriteLine($"MENU ID       : {id}");

                    if (menu != null)
                    {
                        Console.WriteLine($"TEXT          : {menu.Text}");
                        Console.WriteLine($"PARENT ID     : {menu.ParentMenuId}");
                        Console.WriteLine($"LINK          : {menu.Link}");
                        Console.WriteLine($"SORT ORDER    : {menu.SortOrder}");
                    }
                    else
                    {
                        Console.WriteLine("MENU           : NOT FOUND");
                    }

                    if (permission != null)
                    {
                        Console.WriteLine("PERMISSION     : FOUND");
                        Console.WriteLine($"ADD            : {permission.Add}");
                        Console.WriteLine($"EDIT           : {permission.Edit}");
                        Console.WriteLine($"DELETE         : {permission.Delete}");
                        Console.WriteLine($"VIEW           : {permission.View}");
                    }
                    else
                    {
                        Console.WriteLine("PERMISSION     : NOT FOUND");
                    }

                    Console.WriteLine(
                        $"IN menuIds     : {menuIds.Contains(id)}"
                    );
                }

                // =====================================================
                // STEP 5 - FILTER MENU
                // =====================================================

                Console.WriteLine("");
                Console.WriteLine("===== STEP 5: FILTERING MENUS =====");

                result = result
                    .OrderBy(s => s.SortOrder)
                    .ToList();

                List<MenuItem> tempMenu = new List<MenuItem>();

                foreach (var item in result)
                {
                    var currentMenu =
                        permissionResult.FirstOrDefault(
                            s => s.MenuId == item.Id
                        );

                    if (currentMenu == null)
                    {
                        continue;
                    }

                    if (!currentMenu.Add &&
                        !currentMenu.Edit &&
                        !currentMenu.Delete &&
                        !currentMenu.View)
                    {
                        continue;
                    }

                    item.Delete = currentMenu.Delete;
                    item.Add = currentMenu.Add;
                    item.Edit = currentMenu.Edit;
                    item.View = currentMenu.View;

                    tempMenu.Add(item);

                    Console.WriteLine(
                        $"ADDED -> ID={item.Id}, " +
                        $"Text={item.Text}, " +
                        $"Parent={item.ParentMenuId}"
                    );
                }

                Console.WriteLine(
                    $"Filtered menu count = {tempMenu.Count}"
                );

                // =====================================================
                // STEP 6 - BUILD DICTIONARY
                // =====================================================

                Console.WriteLine("");
                Console.WriteLine("===== STEP 6: BUILD DICTIONARY =====");

                menuDict = result.ToDictionary(x => x.Id);

                Console.WriteLine(
                    $"Dictionary count = {menuDict.Count}"
                );

                // =====================================================
                // STEP 7 - BUILD HIERARCHY
                // =====================================================

                Console.WriteLine("");
                Console.WriteLine("===== STEP 7: BUILD HIERARCHY =====");

                var hierarchyResult = BuildHierarchy(tempMenu);

                foreach (var menu in hierarchyResult)
                {
                    Console.WriteLine(
                        $"ROOT -> ID={menu.Id}, " +
                        $"Text={menu.Text}, " +
                        $"Children={menu.SubMenu?.Count ?? 0}"
                    );

                    if (menu.SubMenu != null)
                    {
                        foreach (var child in menu.SubMenu)
                        {
                            Console.WriteLine(
                                $"    CHILD -> ID={child.Id}, " +
                                $"Text={child.Text}, " +
                                $"Parent={child.ParentMenuId}"
                            );
                        }
                    }
                }

                // =====================================================
                // STEP 8 - FILTER BY PERMITTED CHILD IDS
                // =====================================================

                Console.WriteLine("");
                Console.WriteLine("===== STEP 8: FILTER BY CHILD IDS =====");

                tempMenu =
                    FilterByChildIds(
                        hierarchyResult,
                        menuIds
                    );

                Console.WriteLine(
                    $"FINAL ROOT MENU COUNT = {tempMenu.Count}"
                );

                // =====================================================
                // STEP 9 - FINAL RESULT
                // =====================================================

                Console.WriteLine("");
                Console.WriteLine("===== FINAL MENU =====");

                foreach (var menu in tempMenu)
                {
                    Console.WriteLine(
                        $"ROOT: {menu.Id} - {menu.Text}"
                    );

                    if (menu.SubMenu != null)
                    {
                        foreach (var child in menu.SubMenu)
                        {
                            Console.WriteLine(
                                $"    CHILD: {child.Id} - {child.Text}"
                            );
                        }
                    }
                }

                Console.WriteLine("");
                Console.WriteLine("========================================");
                Console.WriteLine("        MENU SERVICE END");
                Console.WriteLine("========================================");

                return tempMenu
                    .OrderBy(s => s.SortOrder)
                    .ToList();
            }
            catch (Exception ex)
            {
                Console.WriteLine("========================================");
                Console.WriteLine("MENU ERROR");
                Console.WriteLine(ex);
                Console.WriteLine("========================================");

                throw;
            }
        }*/

        /*
        private List<MenuItem> BuildHierarchy(List<MenuItem> flatList)
        {
            // Initialize the dictionary for quick lookups
            //menuDict = flatList.ToDictionary(x => x.Id);

            // Create the root level list that we'll return
            List<MenuItem> rootItems = new List<MenuItem>();

            // Process each item
            foreach (var item in flatList)
            {
                // If the item has a parent (ParentMenuId > 0)
                if (item.ParentMenuId > 0 && menuDict.ContainsKey(item.ParentMenuId))
                {
                    // Add it to its parent's children
                    menuDict[item.ParentMenuId].SubMenu.Add(item);
                }
                else
                {
                    // If no parent or parent doesn't exist, add to root
                    rootItems.Add(item);
                }
            }

            return rootItems;
        }
        */
        private List<MenuItem> BuildHierarchy(List<MenuItem> flatList)
        {
            List<MenuItem> rootItems = new List<MenuItem>();

            foreach (var item in flatList)
            {
                // Make sure SubMenu is initialized
                if (item.SubMenu == null)
                {
                    item.SubMenu = new List<MenuItem>();
                }

                if (item.ParentMenuId > 0 &&
                    menuDict.TryGetValue(item.ParentMenuId, out MenuItem parentItem))
                {
                    // Make sure parent's SubMenu is initialized
                    if (parentItem.SubMenu == null)
                    {
                        parentItem.SubMenu = new List<MenuItem>();
                    }

                    parentItem.SubMenu.Add(item);
                }
                else
                {
                    rootItems.Add(item);
                }
            }

            return rootItems;
        }
        private MenuItem FilterByChildId(List<MenuItem> hierarchy, int childId)
        {
            // If the item is found in our dictionary
            if (menuDict.TryGetValue(childId, out MenuItem foundItem))
            {
                // Create a new MenuItem to hold the filtered hierarchy
                var filteredItem = CloneMenuItem(foundItem);

                // If it has a parent, build the parent chain
                if (foundItem.ParentMenuId > 0)
                {
                    var currentParentId = foundItem.ParentMenuId;
                    MenuItem currentItem = filteredItem;

                    while (currentParentId > 0 && menuDict.TryGetValue(currentParentId, out MenuItem parentItem))
                    {
                        var parentCopy = CloneMenuItem(parentItem);
                        parentCopy.SubMenu = new List<MenuItem> { currentItem };
                        currentItem = parentCopy;
                        currentParentId = parentItem.ParentMenuId;
                    }

                    return currentItem;
                }

                return filteredItem;
            }

            return null;
        }

        private MenuItem CloneMenuItem(MenuItem item)
        {
            return new MenuItem
            {
                Id = item.Id,
                SortOrder = item.SortOrder,
                Text = item.Text,
                Icon = item.Icon,
                Link = item.Link,
                NewTab = item.NewTab,
                Delete = item.Delete,
                Report = item.Report,
                MapBank = item.MapBank,
                View = item.View,
                Add = item.Add,
                Edit = item.Edit,
                Badge = item.Badge,
                Description = item.Description,
                IsMenu = item.IsMenu,
                IsParentMenu = item.IsParentMenu,
                ParentMenuId = item.ParentMenuId,
                SubMenu = new List<MenuItem>()
            };
        }

        private List<MenuItem> FilterByChildIds(List<MenuItem> hierarchy, int[] childIds)
        {
            var result = new Dictionary<int, MenuItem>();

            foreach (int childId in childIds)
            {
                if (menuDict.TryGetValue(childId, out MenuItem foundItem))
                {
                    // Build chain from child to root
                    var currentId = childId;
                    while (currentId > 0 && menuDict.ContainsKey(currentId))
                    {
                        var currentItem = menuDict[currentId];

                        // If we haven't processed this item yet
                        if (!result.ContainsKey(currentId))
                        {
                            result[currentId] = CloneMenuItem(currentItem);
                        }

                        // If it has a parent, link them
                        if (currentItem.ParentMenuId > 0)
                        {
                            var parentId = currentItem.ParentMenuId;

                            // Create parent if it doesn't exist in our result
                            if (!result.ContainsKey(parentId))
                            {
                                result[parentId] = CloneMenuItem(menuDict[parentId]);
                            }

                            // Add current item as child of parent if not already added
                            if (!result[parentId].SubMenu.Any(c => c.Id == currentId))
                            {
                                result[parentId].SubMenu.Add(result[currentId]);
                            }
                        }

                        currentId = currentItem.ParentMenuId;
                    }
                }
            }

            // Return only root level items (items with no parents or whose parents are not in the filtered set)
            return result.Values.Where(item => item.ParentMenuId == 0 || !result.ContainsKey(item.ParentMenuId)).ToList();
        }
    }
}
