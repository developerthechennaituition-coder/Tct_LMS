import { useMemo } from "react";

// recursive helper
const findMenu = (menuName, menus) => {
  for (let m of menus) {
    if (m.text === menuName) {
      return m;
    }
    if (m.subMenu && m.subMenu.length > 0) {
      const found = findMenu(menuName, m.subMenu);
      if (found) return found;
    }
  }
  return null;
};

export const usePermissions = () => {
  const permissions = useMemo(() => {
    return JSON.parse(localStorage.getItem("MenuPermissions")) || [];
  }, []);

  // ✅ single action check
  const can = (menu, action) => {
    const m = findMenu(menu, permissions);
    if (!m) return false;
    return m[action] === true || m[action] === "true"; // support boolean or string
  };

  // ✅ at least one of the actions
  const canAny = (menu, actions) => {
    const m = findMenu(menu, permissions);
    if (!m) return false;
    return actions.some((a) => m[a] === true || m[a] === "true");
  };

  // ✅ all actions required
  const canAll = (menu, actions) => {
    const m = findMenu(menu, permissions);
    if (!m) return false;
    return actions.every((a) => m[a] === true || m[a] === "true");
  };

  return { can, canAny, canAll };
};
