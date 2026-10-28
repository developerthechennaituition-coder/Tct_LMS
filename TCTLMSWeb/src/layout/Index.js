import React, { useEffect, useState, useLayoutEffect } from "react";
import Pages from "../route/Index";
import Sidebar from "./sidebar/Sidebar";
import Head from "./head/Head";
import Header from "./header/Header";
import Footer from "./footer/Footer";
import GlobalSpinner from "../components/spinner/GlobalSpinner";
import classNames from "classnames";

// Styles applied only while a student is logged in (every selector is scoped to body.tct-student).
const studentUiStyle = `
  /* ---- Dropdowns: one design for native selects and react-select (RSelect) ---- */
  body.tct-student select.form-control:not([multiple]):not([size]),
  body.tct-student select.custom-select:not([multiple]):not([size]),
  body.tct-student select.form-select:not([multiple]):not([size]) {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    min-height: 38px;
    padding: 6px 36px 6px 12px;
    font-size: 14px;
    line-height: 1.5;
    color: #364a63;
    background-color: #fff;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238094ae' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    background-size: 12px 12px;
    border: 1px solid #dbdfea;
    border-radius: 8px;
    box-shadow: none;
    cursor: pointer;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  body.tct-student select.form-control:not([multiple]):not([size]):hover,
  body.tct-student select.custom-select:not([multiple]):not([size]):hover,
  body.tct-student select.form-select:not([multiple]):not([size]):hover { border-color: #b7c2d0; }
  body.tct-student select.form-control:focus,
  body.tct-student select.custom-select:focus,
  body.tct-student select.form-select:focus {
    border-color: #854fff;
    box-shadow: 0 0 0 3px rgba(133, 79, 255, 0.12);
    outline: none;
  }
  body.tct-student select.form-control:disabled,
  body.tct-student select.custom-select:disabled,
  body.tct-student select.form-select:disabled { background-color: #f5f6fa; cursor: not-allowed; }
  /* Option list: browsers render it natively; these apply where the browser allows. */
  body.tct-student select option { color: #364a63; background-color: #fff; font-size: 14px; }
  body.tct-student select option:checked { color: #4c1fd0; background-color: #f1ebff; }

  body.tct-student .react-select__control {
    min-height: 38px;
    border: 1px solid #dbdfea;
    border-radius: 8px;
    box-shadow: none;
    background-color: #fff;
    font-size: 14px;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  body.tct-student .react-select__control:hover { border-color: #b7c2d0; }
  body.tct-student .react-select__control--is-focused {
    border-color: #854fff !important;
    box-shadow: 0 0 0 3px rgba(133, 79, 255, 0.12) !important;
  }
  body.tct-student .react-select__indicator-separator { display: none; }
  body.tct-student .react-select__single-value { color: #364a63; }
  body.tct-student .react-select__placeholder { color: #8094ae; }
  body.tct-student .react-select__menu {
    z-index: 1060;
    margin-top: 4px;
    border: 1px solid #e5e9f2;
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(31, 43, 58, 0.12);
    overflow: hidden;
  }
  body.tct-student .react-select__option { padding: 8px 12px; font-size: 14px; color: #364a63; cursor: pointer; }
  body.tct-student .react-select__option--is-focused { background-color: #f5f1ff; }
  body.tct-student .react-select__option--is-selected { background-color: #854fff; color: #fff; }
  body.tct-student .react-select__option--is-selected.react-select__option--is-focused { background-color: #7a3ff5; }

  /* Action menus (reactstrap Dropdown / "more" menus): same menu look as the selects */
  body.tct-student .dropdown-menu {
    border: 1px solid #e5e9f2;
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(31, 43, 58, 0.12);
    padding: 4px;
  }
  body.tct-student .dropdown-menu .dropdown-item,
  body.tct-student .dropdown-menu .link-list-opt a,
  body.tct-student .dropdown-menu .link-list-plain a {
    border-radius: 6px;
    font-size: 14px;
    color: #364a63;
  }
  body.tct-student .dropdown-menu .dropdown-item:hover,
  body.tct-student .dropdown-menu .dropdown-item:focus,
  body.tct-student .dropdown-menu .link-list-opt a:hover,
  body.tct-student .dropdown-menu .link-list-plain a:hover { background-color: #f5f1ff; color: #4c1fd0; }
  body.tct-student .dropdown-menu .dropdown-item.active,
  body.tct-student .dropdown-menu .dropdown-item:active { background-color: #854fff; color: #fff; }

`;

// Click-only sidebar collapse for students and tutors (scoped to body.tct-click-sidebar).
const clickOnlySidebarStyle = `
  /* ---- Sidebar: the burger is the only expand/collapse control (no hover-peek) ---- */
  @media (min-width: 1200px) {
    /* The theme re-expands a collapsed sidebar on hover (it only collapses under
       :not(:hover)) while content keeps the narrow offset, so it overlapped the page.
       Keep the collapsed look while hovered too. */
    body.tct-click-sidebar .nk-sidebar.is-compact:hover { width: 74px; }
    body.tct-click-sidebar .nk-sidebar.is-compact:hover .nk-menu-text,
    body.tct-click-sidebar .nk-sidebar.is-compact:hover .nk-menu-heading .overline-title,
    body.tct-click-sidebar .nk-sidebar.is-compact:hover .user-info { opacity: 0; }
    body.tct-click-sidebar .nk-sidebar.is-compact:hover .nk-menu-badge,
    body.tct-click-sidebar .nk-sidebar.is-compact:hover .nk-menu-toggle:after { opacity: 0; pointer-events: none; }
    body.tct-click-sidebar .nk-sidebar.is-compact:hover .nk-menu-sub { display: none !important; }
    body.tct-click-sidebar .nk-sidebar.is-compact:hover .nk-menu-wrap { height: 0 !important; }
    /* While collapsed, the burger replaced the logo in the 74px head so it is always clickable. */
    body.tct-click-sidebar .nk-sidebar.is-compact .nk-sidebar-brand { display: none; }
    /* The head is 290px wide by default; size it to the 74px collapsed width so centring works. */
    body.tct-click-sidebar .nk-sidebar.is-compact .nk-sidebar-head { width: 100%; justify-content: center; padding-left: 0; padding-right: 0; }
    body.tct-click-sidebar .nk-sidebar.is-compact .nk-menu-trigger { margin: 0 !important; }
  }
`;

const Layout = () => {
  //Sidebar
  const [mobileView, setMobileView] = useState();
  const [visibility, setVisibility] = useState(false);
  const [themeState] = useState({
    main: "default",
    sidebar: "white",
    header: "white",
    skin: "light",
  });

  useEffect(() => {
    document.body.className = `nk-body bg-lighter npc-default has-sidebar no-touch nk-nio-theme ${
      themeState.skin === "dark" ? "dark-mode" : ""
    }`;
  }, [themeState.skin]);

  useEffect(() => {
    viewChange();
  }, []);

  // Student-only UI (dropdown design + click-only sidebar collapse). The class lives on <body>
  // so dropdowns inside reactstrap modals (rendered into <body>) are covered too.
  const isStudent = (localStorage.getItem("userRole") || "").trim().toLowerCase() === "student";
  useEffect(() => {
    document.body.classList.toggle("tct-student", isStudent);
  });
  useEffect(() => () => document.body.classList.remove("tct-student"), []);
  const isTutor = (localStorage.getItem("userRole") || "").trim().toLowerCase() === "tutor";
  // Coordinator: same click-only collapse (the theme's hover re-expand overlapped the dashboard).
  const isCoordinator = (localStorage.getItem("userRole") || "").trim().toLowerCase() === "coordinator";
  const clickOnlySidebar = isStudent || isTutor || isCoordinator;
  useEffect(() => {
    document.body.classList.toggle("tct-click-sidebar", clickOnlySidebar);
    document.body.classList.toggle("tct-tutor", isTutor);
  });
  useEffect(() => () => document.body.classList.remove("tct-click-sidebar", "tct-tutor"), []);

  // Stops scrolling on overlay
  useLayoutEffect(() => {
    if (visibility) {
      document.body.style.overflow = "hidden";
      document.body.style.height = "100%";
    }
    if (!visibility) {
      document.body.style.overflow = "auto";
      document.body.style.height = "auto";
    }
  }, [visibility]);

  // function to toggle sidebar
  const toggleSidebar = (e) => {
    e.preventDefault();
    if (visibility === false) {
      setVisibility(true);
    } else {
      setVisibility(false);
    }
  };

  // function to change the design view under 1200 px
  const viewChange = () => {
    if (window.innerWidth < 1200) {
      setMobileView(true);
    } else {
      setMobileView(false);
      setVisibility(false);
    }
  };
  window.addEventListener("load", viewChange);
  window.addEventListener("resize", viewChange);

  const sidebarClass = classNames({
    "nk-sidebar-mobile": mobileView,
    "nk-sidebar-active": visibility && mobileView,
  });

  return (
    <React.Fragment>
      <GlobalSpinner />
      <Head title="Loading" />
      {isStudent && <style>{studentUiStyle}</style>}
      {clickOnlySidebar && <style>{clickOnlySidebarStyle}</style>}
      <div className="nk-app-root">
        <div className="nk-main">
          <Sidebar
            sidebarToggle={toggleSidebar}
            fixed
            mobileView={mobileView}
            theme={themeState.sidebar}
            className={sidebarClass}
          />
          {visibility && mobileView && <div className="nk-sidebar-overlay" onClick={toggleSidebar}></div>}
          <div className="nk-wrap">
            <Header sidebarToggle={toggleSidebar} fixed setVisibility={setVisibility} theme={themeState.header} />
            <Pages />
            <Footer />
          </div>
        </div>
      </div>
    </React.Fragment>
  );
};
export default Layout;
