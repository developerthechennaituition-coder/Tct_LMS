import React, { useEffect, useState } from "react";
import classNames from "classnames";
import SimpleBar from "simplebar-react";
import Logo from "../logo/Logo";
import Menu from "../menu/Menu";
import Toggle from "./Toggle";
import EcommerceMenu from "../menu/EcommerceMenu";
import { GetMenuByUser } from "../../apiservices/AuthenticateService";
import { normalizeChatMenu } from "../../library/workflowDisplay";

const removeStudentOnlyRestrictedItems = (items) => {
  if (!Array.isArray(items)) return items;

  return items
    .filter((item) => item?.text?.trim().toLowerCase() !== "bank details")
    .map((item) => ({
      ...item,
      subMenu: removeStudentOnlyRestrictedItems(item.subMenu),
    }));
};

const removeDuplicateCoordinatorNotificationItems = (items, roleName) => {
  if (!Array.isArray(items)) return items;

  const normalizedRole = roleName?.trim().toLowerCase();
  return items
    .filter((item) => {
      const link = item?.link?.trim().toLowerCase() || "";
      if (normalizedRole === "coordinatoradmin") {
        return !link.endsWith("/coordinator-notification");
      }
      if (normalizedRole === "coordinator") {
        return !link.endsWith("/coadmin-notification");
      }
      return true;
    })
    .map((item) => ({
      ...item,
      subMenu: removeDuplicateCoordinatorNotificationItems(item.subMenu, roleName),
    }));
};

const Sidebar = ({ fixed, theme, className, sidebarToggle, mobileView, ...props }) => {
  const [collapseSidebar, setSidebar] = useState(false);
  const [mouseEnter, setMouseEnter] = useState(false);
  const [menuData, setMenuData] = useState();
  /*useEffect(() => {
    if (localStorage.getItem("roleId")) {
      GetMenuByUser(localStorage.getItem("roleId")).then((response) => {
        const roleName = localStorage.getItem("userRole")?.trim();
        const isStudent = roleName?.toLowerCase() === "student";
        const roleFilteredMenu = normalizeChatMenu(removeDuplicateCoordinatorNotificationItems(response, roleName));
        setMenuData(isStudent ? removeStudentOnlyRestrictedItems(roleFilteredMenu) : roleFilteredMenu);
      });
    }
  }, []);*/
  useEffect(() => {
  const roleId = localStorage.getItem("roleId");

  console.log("Sidebar Role ID:", roleId);

  if (!roleId) {
    console.log("No roleId found in localStorage");
    return;
  }

  GetMenuByUser(roleId)
    .then((response) => {
      console.log(
  "Sidebar API Response FULL:",
  JSON.stringify(response, null, 2)
);

      const isStudent =
        localStorage
          .getItem("userRole")
          ?.trim()
          .toLowerCase() === "student";

      const roleMenuData = isStudent
        ? removeStudentOnlyRestrictedItems(response)
        : response;

      // Tutors land on the Dashboard ("/") but their Dashboard menu permission has View = 0,
      // so the API omits it. Add it at the top for tutors only, unless the API already sent one.
      const isTutor =
        localStorage.getItem("userRole")?.trim().toLowerCase() === "tutor";
      const hasDashboardItem =
        Array.isArray(roleMenuData) &&
        roleMenuData.some(
          (item) =>
            item?.link === "/" ||
            item?.text?.trim().toLowerCase() === "dashboard"
        );
      const withDashboard =
        isTutor && Array.isArray(roleMenuData) && !hasDashboardItem
          ? [
              { text: "Dashboard", link: "/", icon: "dashboard", subMenu: [] },
              ...roleMenuData,
            ]
          : roleMenuData;

      // Tutors: "Mock Exams" (question paper upload + answer sheet evaluation) right after
      // Notifications; before Payroll if there is no Notifications item; otherwise at the end.
      let finalMenuData = withDashboard;
      if (isTutor && Array.isArray(withDashboard)) {
        const hasMockExams = withDashboard.some(
          (item) => item?.link === "/lms/mock-exams" || item?.text?.trim().toLowerCase() === "mock exams"
        );
        if (!hasMockExams) {
          const mockExamsItem = { text: "Mock Exams", link: "/lms/mock-exams", icon: "file-docs", subMenu: [] };
          const findIndex = (name) =>
            withDashboard.findIndex((item) => item?.text?.trim().toLowerCase() === name);
          const notificationsIndex = findIndex("notifications");
          const payrollIndex = findIndex("payroll");
          const insertAt =
            notificationsIndex >= 0 ? notificationsIndex + 1 : payrollIndex >= 0 ? payrollIndex : withDashboard.length;
          finalMenuData = [
            ...withDashboard.slice(0, insertAt),
            mockExamsItem,
            ...withDashboard.slice(insertAt),
          ];
        }
      }

      // "Support" (Help, PTM) comes from the menu API like every other menu: it is granted per role
      // in Settings → Role Permission (see TCTDatabase/DDL/add_support_menus.sql).

      // My Calendar (demo classes + Tasks): every role except Tutor and Student. Skipped when an item
      // with the same link is already present (the API stays the source of truth for everything else).
      const sidebarRole = localStorage.getItem("userRole")?.trim().toLowerCase();
      if (sidebarRole && !["tutor", "student"].includes(sidebarRole) && Array.isArray(finalMenuData)) {
        const myCalendarLink = "/lms/my-calendar";
        const hasMyCalendar = finalMenuData.some(
          (item) =>
            item?.link === myCalendarLink ||
            (Array.isArray(item?.subMenu) && item.subMenu.some((sub) => sub?.link === myCalendarLink))
        );
        if (!hasMyCalendar) {
          finalMenuData = [...finalMenuData, { text: "My Calendar", link: myCalendarLink, icon: "calendar-booking", subMenu: [] }];
        }
      }

      // Reports parent (present only when the API returned at least one permitted report) opens the Reports landing page.
      if (Array.isArray(finalMenuData)) {
        finalMenuData = finalMenuData.map((item) =>
          !item?.link && Array.isArray(item?.subMenu) &&
          item.subMenu.some((child) => (child?.link || "").startsWith("/lms/operation/reports/"))
            ? { ...item, link: "/lms/operation/reports" }
            : item
        );
      }

      // Accounts Reports parent likewise opens the Accounts Reports landing page.
      if (Array.isArray(finalMenuData)) {
        finalMenuData = finalMenuData.map((item) =>
          !item?.link && Array.isArray(item?.subMenu) &&
          item.subMenu.some((child) => (child?.link || "").startsWith("/lms/accounts/reports/"))
            ? { ...item, link: "/lms/accounts/reports" }
            : item
        );
      }

      console.log("Final Sidebar Menu:", finalMenuData);

      // Check Customer Management specifically
      const customerManagement = finalMenuData?.find(
        (item) =>
          item?.id === 82 ||
          item?.Id === 82 ||
          item?.text?.trim().toLowerCase() ===
            "customer management"
      );

      console.log(
        "Customer Management found:",
        customerManagement
      );

      // Top level only: Dashboard first, Settings last; every other item keeps the API order.
      if (Array.isArray(finalMenuData)) {
        const menuName = (item) => item?.text?.trim().toLowerCase();
        const dashboardItems = finalMenuData.filter((item) => menuName(item) === "dashboard");
        const settingsItems = finalMenuData.filter((item) => menuName(item) === "settings");
        const otherItems = finalMenuData.filter(
          (item) => menuName(item) !== "dashboard" && menuName(item) !== "settings"
        );
        finalMenuData = [...dashboardItems, ...otherItems, ...settingsItems];
      }

      setMenuData(finalMenuData);
    })
    .catch((error) => {
      console.error("Sidebar Menu API Error:", error);
      console.error("API Response:", error?.response);
    });
}, []);

  const toggleCollapse = () => {
    setSidebar(!collapseSidebar);
  };

  const handleMouseEnter = () => setMouseEnter(true);
  const handleMouseLeave = () => setMouseEnter(false);

  const classes = classNames({
    "nk-sidebar": true,
    "nk-sidebar-fixed": fixed,
    "is-compact": collapseSidebar,
    "has-hover": collapseSidebar && mouseEnter,
    [`is-light`]: theme === "white",
    [`is-${theme}`]: theme !== "white" && theme !== "light",
    [`${className}`]: className,
  });

  return (
    <div className={classes}>
      <div className="nk-sidebar-element nk-sidebar-head">
        <div className="nk-sidebar-brand">
          <Logo />
        </div>
        <div className="nk-menu-trigger mr-n2">
          <Toggle className="nk-nav-toggle nk-quick-nav-icon d-xl-none mr-n2" icon="arrow-left" click={sidebarToggle} />
          <Toggle
            className={`nk-nav-compact nk-quick-nav-icon d-none d-xl-inline-flex ${
              collapseSidebar ? "compact-active" : ""
            }`}
            click={toggleCollapse}
            icon="menu"
          />
        </div>
      </div>
      <div className="nk-sidebar-content" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        <SimpleBar className="nk-sidebar-menu">
          {menuData && <Menu menuData={menuData} sidebarToggle={sidebarToggle} mobileView={mobileView} />}
        </SimpleBar>
      </div>
    </div>
  );
};
export default Sidebar;
