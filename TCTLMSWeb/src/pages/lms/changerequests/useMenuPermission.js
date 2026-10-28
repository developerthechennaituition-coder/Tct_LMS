import { useEffect, useState } from "react";
import { GetMenuByUser } from "../../../apiservices/AuthenticateService";

// True when the signed-in role is granted the menu with this link (Settings → Role Permission).
// Read fresh from the menu API on every visit, so a typed URL cannot bypass a revoked permission.
// The API enforces the same permission on every request.
const useMenuPermission = (link) => {
  const [state, setState] = useState({ loading: true, allowed: false });
  useEffect(() => {
    let active = true;
    const roleId = localStorage.getItem("roleId");
    if (!roleId) {
      setState({ loading: false, allowed: false });
      return undefined;
    }
    const target = String(link || "").trim().toLowerCase();
    const has = (items) =>
      (Array.isArray(items) ? items : []).some(
        (item) => (item?.link || "").trim().toLowerCase().replace(/\/+$/, "") === target || has(item?.subMenu)
      );
    GetMenuByUser(roleId)
      .then((menu) => active && setState({ loading: false, allowed: has(Array.isArray(menu) ? menu : menu?.data) }))
      .catch(() => active && setState({ loading: false, allowed: false }));
    return () => {
      active = false;
    };
  }, [link]);
  return state;
};

export default useMenuPermission;
