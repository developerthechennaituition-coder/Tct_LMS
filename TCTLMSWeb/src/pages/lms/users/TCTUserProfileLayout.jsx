import React, { useState, useEffect } from "react";
import {
  Card,
  Modal,
  ModalBody,
  Nav,
  NavItem,
  NavLink,
  TabContent,
  TabPane,
  ModalHeader,
  ModalFooter,
  DropdownItem,
  UncontrolledDropdown,
  DropdownMenu,
  DropdownToggle,
} from "reactstrap";
import Dropzone from "react-dropzone";
import Content from "../../../layout/content/Content";
import axios from "axios";
import { config } from "../../../library/config";
// import StudentProfileRegularPage from "./StudentProfile";
// import StudentProfileSettingPage from "./StudentProfileSetting";
// import UserProfileNotificationPage from "./StudentProfileNotification";
// import UserProfileActivityPage from "./StudentProfileActivity";
import { Route, Switch, Link } from "react-router-dom";
import { Icon, UserAvatar } from "../../../components/Component";
import { ToastContainer } from "react-toastify";
import { toast } from "react-toastify";
import {
  Block,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  BlockDes,
  BackTo,
  PreviewCard,
  Sidebar,
  BlockBetween,
  CodeBlock,
  OverlineTitle,
  Col,
  Row,
  Button,
  PreviewTable,
} from "../../../components/Component";
import UserAvatar1 from "../../../components/user/UserAvatar1";
import { findUpper1, findUpper } from "../../../utils/Utils";
import { useParams } from "react-router-dom";
import classnames from "classnames";
// import StudentEnrolledCourses from "./StudentEnrolledCourses";
import { getStudent } from "../../../apiservices/StudentEnrollmentService";
import { getTCTUserById, uploadProfileImage } from "../../../apiservices/UserService";

import { useLocation } from "react-router-dom";
import TCTUserProfile from "./TCTUserProfile";
import TCTUserActivity from "./TCTUserActivity";
import EditTCTUser from "./EditTCTUser";
import UserAvailability from "./UserAvailability";
import TutorSkillset from "../tutors/TutorSkillset";
import UserProfileSettingPage from "../../pre-built/user-manage/UserProfileSetting";
import TutorBankDetails from "../../lms/tutors/TutorBankDetails";
import TCTUserNotificationList from "./TCTUserNotificationList";

// Profile look, first written for students (every selector under body.tct-student).
// Tutors get the same rules with body.tct-tutor (see the render), plus tutorProfileExtraStyle.
const studentProfileStyle = `
          body.tct-student .tct-profile-head { padding-bottom: 14px; }
          body.tct-student .tct-profile-head .nk-block-title strong { font-size: 22px; font-weight: 700; color: #2c2257; }

          /* Card shell */
          body.tct-student .tct-profile-card {
            border: 1px solid #e5e9f2 !important;
            border-radius: 14px;
            box-shadow: 0 2px 10px rgba(31, 43, 58, 0.05);
          }
          body.tct-student .tct-profile-card .card-inner { padding: 20px 24px; }

          /* Tabs */
          body.tct-student .tct-profile-card .nav-tabs {
            padding: 0 16px;
            border-bottom: 1px solid #e5e9f2;
            flex-wrap: nowrap;
            overflow-x: auto;
            scrollbar-width: none;
          }
          body.tct-student .tct-profile-card .nav-tabs::-webkit-scrollbar { display: none; }
          body.tct-student .tct-profile-card .nav-tabs .nav-link {
            display: inline-flex; align-items: center; gap: 8px;
            padding: 14px 6px; margin: 0 8px;
            font-size: 14px; font-weight: 600; color: #6b7a99; white-space: nowrap;
            transition: color 0.15s ease;
          }
          body.tct-student .tct-profile-card .nav-tabs .nav-link .icon { font-size: 18px; margin: 0 !important; }
          body.tct-student .tct-profile-card .nav-tabs .nav-link:hover { color: #854fff; }
          body.tct-student .tct-profile-card .nav-tabs .nav-link.active { color: #854fff; }

          /* Section headings inside tabs: tighter */
          body.tct-student .tct-profile-card .nk-block-head-lg { padding-bottom: 14px; }
          body.tct-student .tct-profile-card .nk-block-head-sm { padding-bottom: 12px; }
          body.tct-student .tct-profile-card .nk-block-title:empty { display: none; }
          body.tct-student .tct-profile-card h4.nk-block-title,
          body.tct-student .tct-profile-card .change-password h4 { font-size: 18px; font-weight: 700; color: #2c2257; }

          /* Personal Info: compact bordered list */
          body.tct-student .tct-profile-card .nk-data.data-list {
            border: 1px solid #e5e9f2; border-radius: 10px; overflow: hidden; margin-bottom: 16px;
          }
          body.tct-student .tct-profile-card .data-head { background: #f5f6fa; padding: 8px 16px; border-radius: 0; }
          body.tct-student .tct-profile-card .data-head .overline-title { color: #854fff; margin: 0; }
          body.tct-student .tct-profile-card .data-item { padding: 12px 16px; border-bottom: 1px solid #edf0f5; transition: background-color 0.12s ease; }
          body.tct-student .tct-profile-card .data-item:last-child { border-bottom: 0; }
          body.tct-student .tct-profile-card .data-item:hover { background: #faf7ff; }
          body.tct-student .tct-profile-card .data-label { font-size: 13px; color: #8094ae; }
          body.tct-student .tct-profile-card .data-value { font-size: 14px; color: #364a63; font-weight: 500; }

          /* Tables (Availability, Activity) */
          body.tct-student .tct-profile-card .rdt_Table { border: 1px solid #e5e9f2; border-radius: 10px; overflow: hidden; }
          body.tct-student .tct-profile-card .rdt_TableHeadRow { min-height: 42px; background: #f5f6fa; }
          body.tct-student .tct-profile-card .rdt_TableCol {
            font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: #8094ae;
          }
          body.tct-student .tct-profile-card .rdt_TableRow { min-height: 42px; font-size: 13px; color: #526484; }
          body.tct-student .tct-profile-card .rdt_TableRow:hover { background: #faf7ff; }
          body.tct-student .tct-profile-card .pagination .page-link { border-radius: 6px; margin: 0 2px; }
          body.tct-student .tct-profile-card .btn-primary { border-radius: 8px; font-weight: 600; }

          /* Change Password: compact form, clean eye toggles */
          body.tct-student .tct-profile-card .change-password { max-width: 560px; }
          body.tct-student .tct-profile-card .change-password .form-group { margin-bottom: 14px; }
          body.tct-student .tct-profile-card .change-password .form-control {
            height: 40px; border: 1px solid #dbdfea; border-radius: 8px; font-size: 14px;
            transition: border-color 0.15s ease, box-shadow 0.15s ease;
          }
          body.tct-student .tct-profile-card .change-password .form-control:focus {
            border-color: #854fff; box-shadow: 0 0 0 3px rgba(133, 79, 255, 0.12);
          }
          body.tct-student .tct-profile-card .change-password .passcode-switch {
            border: 0; background: transparent; height: 40px; display: flex; align-items: center; color: #8094ae;
          }
          body.tct-student .tct-profile-card .change-password .passcode-switch:hover { color: #854fff; }

          /* Profile summary (aside): compact card, not stretched to the content height */
          @media (min-width: 1540px) {
            body.tct-student .tct-profile-card .card-aside {
              min-height: 0;
              align-self: flex-start;
              border-left: 0;
              width: 320px;
              padding: 20px 20px 20px 0;
              background: transparent;
            }
          }
          body.tct-student .tct-profile-card .user-aside .card-inner {
            border: 1px solid #e6defe;
            border-radius: 12px;
            background: linear-gradient(180deg, #f3edff 0%, #ffffff 110px);
            padding: 24px 16px 20px;
          }
          body.tct-student .tct-profile-card .user-aside .user-card-s2 { margin-top: 0 !important; }
          body.tct-student .tct-profile-card .user-aside .user-avatar.lg {
            box-shadow: 0 0 0 4px #fff, 0 0 0 6px rgba(133, 79, 255, 0.25);
          }
          body.tct-student .tct-profile-card .user-aside .badge {
            color: #854fff; border-color: rgba(133, 79, 255, 0.35); background: rgba(133, 79, 255, 0.06);
          }
          body.tct-student .tct-profile-card .user-aside h5 { color: #2c2257; font-weight: 700; margin-top: 6px; }
          body.tct-student .tct-profile-card .user-aside .sub-text { word-break: break-all; }
        `;

// Tutor own profile only: pagination, Skill Sets inputs, Availability toolbar, Rows per page.
const tutorProfileExtraStyle = `
  /* ---- Tutor own profile only (body.tct-tutor) ---- */
  /* Pagination row inside the card. LeadLists.css leaks an unscoped .pagination rule; undo it here. */
  body.tct-tutor .tct-profile-card .dataTables_wrapper > .row:empty { display: none; }
  body.tct-tutor .tct-profile-card .dataTables_wrapper .row.align-items-center { margin: 14px 0 0; }
  body.tct-tutor .tct-profile-card .dataTables_wrapper .row.align-items-center > [class*="col"] { padding: 0; background: transparent; }
  body.tct-tutor .tct-profile-card .dataTables_wrapper .pagination { margin: 0; padding: 0; border-top: 0; background: transparent; }
  body.tct-tutor .tct-profile-card .dataTables_info { font-size: 13px; color: #8094ae; }
  /* Two-column fit: the tab content column may shrink (flex items default to min-width: auto,
     so a wide table pushed the summary panel past the card's right edge). Wide tables now
     scroll inside their own wrapper; the summary panel keeps its width inside the card. */
  body.tct-tutor .tct-profile-card { max-width: 100%; }
  body.tct-tutor .tct-profile-card .card-aside-wrap { min-width: 0; }
  body.tct-tutor .tct-profile-card .card-content { flex: 1 1 auto; min-width: 0; }
  body.tct-tutor .tct-profile-card .card-content .dataTables_wrapper { max-width: 100%; }
  body.tct-tutor .tct-profile-card .user-aside .card-inner { box-sizing: border-box; max-width: 100%; }
  body.tct-tutor .tct-profile-card .user-aside .user-info { min-width: 0; max-width: 100%; }
  body.tct-tutor .tct-profile-card .user-aside .user-info h5 { overflow-wrap: anywhere; }
  @media (min-width: 1540px) {
    body.tct-tutor .tct-profile-card .card-aside { flex: 0 0 320px; max-width: 320px; box-sizing: border-box; }
  }
  /* Keep row action menus (Availability "...") from being clipped by the rounded table. */
  body.tct-tutor .tct-profile-card .rdt_Table { overflow: visible; }
  /* Skill Sets payment inputs */
  body.tct-tutor .tct-profile-card .rdt_TableCell input.form-control {
    height: 36px; border: 1px solid #dbdfea; border-radius: 8px; font-size: 14px; box-shadow: none;
  }
  body.tct-tutor .tct-profile-card .rdt_TableCell input.form-control:focus { border-color: #854fff; box-shadow: 0 0 0 3px rgba(133, 79, 255, 0.12); }
  body.tct-tutor .tct-profile-card .nk-block-head-sm { padding-bottom: 14px; }

  /* Availability toolbar (UserAvailability, showRowsPerPage): search always visible, gear menu hidden */
  body.tct-tutor .tct-profile-card .tct-av-head .entrolled-list.card-tools-toggle { display: flex; align-items: center; padding: 0; }
  body.tct-tutor .tct-profile-card .tct-av-head .card-search.search-wrap {
    position: relative; z-index: auto; opacity: 1; pointer-events: auto; background: transparent; border-radius: 0;
  }
  body.tct-tutor .tct-profile-card .tct-av-head .card-search .card-body { padding: 0; }
  body.tct-tutor .tct-profile-card .tct-av-head .search-back { display: none; }
  body.tct-tutor .tct-profile-card .tct-av-head .search-content .form-control {
    height: 38px; padding-left: 38px; padding-right: 12px; font-size: 14px;
    background: #fff; border: 1px solid #dbdfea !important; border-radius: 8px; box-shadow: none;
  }
  body.tct-tutor .tct-profile-card .tct-av-head .search-content .form-control:focus { border-color: #854fff !important; box-shadow: 0 0 0 3px rgba(133, 79, 255, 0.12); }
  body.tct-tutor .tct-profile-card .tct-av-head .search-submit {
    left: 0; right: auto; transform: translate(4px, -50%); color: #8094ae; background: transparent; border: 0; pointer-events: none;
  }
  body.tct-tutor .tct-profile-card .tct-av-head .card-title-group { display: none; }

  /* Rows per page (Availability .tct-av-grid / Skill Sets .tct-sk-grid): right end of the pagination row */
  body.tct-tutor .tct-profile-card .tct-av-grid,
  body.tct-tutor .tct-profile-card .tct-sk-grid { position: relative; }
  body.tct-tutor .tct-profile-card .tct-rpp { display: flex; align-items: center; justify-content: flex-end; gap: 10px; font-size: 13px; font-weight: 500; color: #6b7a90; white-space: nowrap; }
  @media (min-width: 768px) {
    body.tct-tutor .tct-profile-card .tct-av-grid .tct-rpp,
    body.tct-tutor .tct-profile-card .tct-sk-grid .tct-rpp { position: absolute; right: 0; bottom: 0; height: 44px; }
    body.tct-tutor .tct-profile-card .tct-av-grid .dataTables_wrapper .row.align-items-center,
    body.tct-tutor .tct-profile-card .tct-sk-grid .dataTables_wrapper .row.align-items-center { min-height: 44px; padding-right: 230px; }
  }
  @media (max-width: 767.98px) {
    body.tct-tutor .tct-profile-card .tct-rpp { margin-top: 12px; }
  }
  body.tct-tutor .tct-profile-card .tct-rpp-toggle {
    display: inline-flex; align-items: center; justify-content: space-between; gap: 10px;
    min-width: 76px; height: 36px; padding: 0 10px 0 14px;
    font-size: 14px; font-weight: 600; line-height: 1; color: #364a63; cursor: pointer;
    background: #fff; border: 1px solid #dbdfea; border-radius: 8px;
    transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
  }
  body.tct-tutor .tct-profile-card .tct-rpp-toggle .icon { font-size: 14px; color: #854fff; transition: transform 0.15s ease; }
  body.tct-tutor .tct-profile-card .tct-rpp-toggle:hover { border-color: #c4b0ff; background: #fbf9ff; }
  body.tct-tutor .tct-profile-card .tct-rpp-toggle:focus { outline: none; }
  body.tct-tutor .tct-profile-card .tct-rpp-toggle:focus-visible,
  body.tct-tutor .tct-profile-card .tct-rpp .show > .tct-rpp-toggle { border-color: #854fff; box-shadow: 0 0 0 3px rgba(133, 79, 255, 0.18); }
  body.tct-tutor .tct-profile-card .tct-rpp .show > .tct-rpp-toggle .icon { transform: rotate(180deg); }
  body.tct-tutor .tct-profile-card .tct-rpp .tct-rpp-menu {
    z-index: 1000; min-width: 100px; margin-bottom: 6px; padding: 4px;
    background: #fff; border: 1px solid #e5e9f2; border-radius: 10px; box-shadow: 0 10px 28px rgba(31, 43, 58, 0.14);
  }
  body.tct-tutor .tct-profile-card .tct-rpp .tct-rpp-menu .dropdown-item {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 12px; border-radius: 6px; font-size: 14px; font-weight: 500; color: #364a63;
  }
  body.tct-tutor .tct-profile-card .tct-rpp .tct-rpp-menu .dropdown-item:hover,
  body.tct-tutor .tct-profile-card .tct-rpp .tct-rpp-menu .dropdown-item:focus { background: #f5f1ff; color: #4c1fd0; outline: none; }
  body.tct-tutor .tct-profile-card .tct-rpp .tct-rpp-menu .dropdown-item.active { background: #f1ebff; color: #4c1fd0; font-weight: 600; }
  body.tct-tutor .tct-profile-card .tct-rpp .tct-rpp-menu .dropdown-item .icon { font-size: 14px; color: #854fff; }
`;

const TCTUserProfileLayout = () => {
  // Tutor (roleId 13): tutor profile look + Rows per page / always-visible Availability search.
  const isTutorRole = localStorage.getItem("roleId") === "13";
  const [sm, updateSm] = useState(false);
  const [mobileView, setMobileView] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [designation, setDesignation] = useState("");
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const [id, setId] = useState(searchParams.get("id"));
  const isOwnProfile = searchParams.get("id") === localStorage.getItem("userId");
  const [modal, setModal] = useState(false);
  const defaultGuid = "00000000-0000-0000-0000-000000000000";
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [files4, setFiles4] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filename, setFilename] = useState("");
  // const [selectedFiles, setSelectedFiles] = useState([]);
  const [formData, setFormData] = useState({
    id: defaultGuid,
    firstName: "",
    fullName: "",
    lastName: "",
    userCode: "",
    email: "",
    phone: "",
    alternatePhone: "",
    dob: "",
    gender: "",
    designationId: "",
    userType: defaultGuid,
    isSystemUser: true,
    isAdminUser: false,
    createdBy: defaultGuid,
    createdDate: new Date(),
    isActive: true,
    addresses: {
      createdBy: defaultGuid,
      createdDate: new Date(),
      isActive: true,
      id: defaultGuid,
      userId: defaultGuid,
      addressLine1: "",
      addressLine2: "",
      addressLine3: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
      isPrimary: true,
    },
  });
  // function to change the design view under 990 px
  const viewChange = () => {
    if (window.innerWidth < 990) {
      setMobileView(true);
    } else {
      setMobileView(false);
      updateSm(false);
    }
  };

  useEffect(() => {
    const name = searchParams.get("id");
    setId(name);
    getUserData();
    viewChange();
    window.addEventListener("load", viewChange);
    window.addEventListener("resize", viewChange);
    document.getElementsByClassName("nk-header")[0].addEventListener("click", function () {
      updateSm(false);
    });
    return () => {
      window.removeEventListener("resize", viewChange);
      window.removeEventListener("load", viewChange);
    };
  }, []);

  const getUserData = () => {
    getTCTUserById(searchParams.get("id")).then((response) => {
      if (!response?.data) return;
      setFormData(response.data);
      setProfileName(response.data.fullName);
      if (response.data.fileData != null && response.data.fileData != "") {
        setImageUrl(`data:image/jpeg;base64, ${response.data.fileData}`);
      }
      setEmailAddress(response.data.email);
      setDesignation(response.data.designationName);
    });
  };

  const handleDropChange = (acceptedFiles, set) => {
    setSelectedFiles(acceptedFiles);
    set(
      acceptedFiles.map((file) =>
        Object.assign(file, {
          preview: URL.createObjectURL(file),
        })
      )
    );
    setFilename(acceptedFiles[0].name);
  };
  const CloseButton = () => {
    return (
      <span className="btn-trigger toast-close-button" role="button">
        <Icon name="cross"></Icon>
      </span>
    );
  };
  const onSaveProfileHandler = async () => {
    const profilePayload = new FormData();
    profilePayload.append("UserId", id);
    profilePayload.append("DocumentName", "Profile Photo");
    profilePayload.append("DocumentDescription", `${formData.fullName || "User"} profile photo`);

    selectedFiles.forEach((element) => {
      profilePayload.append("Files", element);
    });

    axios
      .post(`${config.API_URL}/UserProfile/uploadProfileImage`, profilePayload, { "Content-Type": "multipart/form-data" })
      .then(
        (response) => {
          setProfileModalOpen(false);
          setModal(false);
          toast.success("Profile photo updated successfully.", {
            position: "top-right",
            autoClose: true,
            hideProgressBar: true,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: false,
            closeButton: <CloseButton />,
          });
          getUserData();
        },
        (error) => {
          return Promise.reject(error);
        }
      );
  };
  const [sideBar, setSidebar] = useState(false);
  const [activeTab, setActiveTab] = useState("1");
  const toggle = (tab) => {
    if (activeTab !== tab) setActiveTab(tab);
  };

  const sidebarToggle = (tab) => {
    setSidebar(!sideBar);
  };
  return (
    <React.Fragment>
      <Content>
        {/* Profile look: students (body.tct-student, unchanged) and, the same rules, tutors (body.tct-tutor). */}
        <style>{studentProfileStyle}</style>
        {isTutorRole && <style>{studentProfileStyle.split("body.tct-student").join("body.tct-tutor") + tutorProfileExtraStyle}</style>}
        <BlockHead size="sm" className="tct-profile-head">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle tag="h3" page>
                <strong className="text-primary small">{profileName}</strong>
              </BlockTitle>
            </BlockHeadContent>
            {!isOwnProfile && (
              <BlockHeadContent>
                <Link
                  className="btn btn-outline-light bg-white d-none d-sm-inline-flex"
                  to={`${process.env.PUBLIC_URL}/tct-user-list`}
                >
                  <em className="icon ni ni-arrow-left"></em><span> Back</span>
                </Link>
              </BlockHeadContent>
            )}
          </BlockBetween>
        </BlockHead>
        <Block>
          <Card className="card-bordered tct-profile-card">
            <div className="card-aside-wrap" id="user-detail-block">
              <div className="card-content">
                <Nav tabs className="nav-tabs-mb-icon nav-tabs-card">
                  <li className="nav-item" onClick={() => updateSm(false)}> 
                    <Link
                      to={`${process.env.PUBLIC_URL}/tctuser-profile?id=${id}`}
                      className={
                        window.location.pathname === `${process.env.PUBLIC_URL}/tctuser-profile`
                          ? "active nav-link "
                          : "nav-link "
                      }
                    >
                      <Icon name="user-fill-c"></Icon>
                      <span>Personal Info</span>
                    </Link>
                  </li>

                  {localStorage.getItem("roleId") === "13" && (
                    <>
                      <li className="nav-item" onClick={() => updateSm(false)}>
                        <Link
                          to={`${process.env.PUBLIC_URL}/tctuser-skillset?id=${id}`}
                          className={
                            window.location.pathname === `${process.env.PUBLIC_URL}/tctuser-skillset`
                              ? "active nav-link "
                              : "nav-link"
                          }
                        >
                          <Icon name="user-list"></Icon>
                          <span>Skill sets</span>
                        </Link>
                      </li>
                    </>
                  )}
                  {emailAddress === localStorage.getItem("email") &&
                    (localStorage.getItem("roleId") == 13 || localStorage.getItem("roleId") == 14) && (
                      <li className="nav-item" onClick={() => updateSm(false)}>
                        <Link
                          to={`/user-availability-list?id=${id}`}
                          className={
                            window.location.pathname === `/user-availability-list` ? "active nav-link" : "nav-link"
                          }
                        >
                          <Icon name="calender-date" />
                          <span>Availability</span>
                        </Link>
                      </li>
                    )}
                  {emailAddress === localStorage.getItem("email") && (
                    <>
                      <li className="nav-item" onClick={() => updateSm(false)}>
                        <Link
                          to={`/user-password-change?id=${id}`}
                          className={
                            window.location.pathname === `/user-password-change` ? "active nav-link" : "nav-link"
                          }
                        >
                          <Icon name="lock-alt-fill" />
                          <span>Change Password</span>
                        </Link>
                      </li>

                      {/* <li className="nav-item" onClick={() => updateSm(false)}>
                        <Link
                          to={`/lms/tctuser-notifications?id=${id}`}
                          className={
                            window.location.pathname === `/tctuser-notifications` ? "active nav-link" : "nav-link"
                          }
                        >
                          <Icon name="lock-alt-fill" />
                          <span>Notifs</span>
                        </Link>
                      </li> */}
                    </>
                  )}
                  {localStorage.getItem("roleId") == 13 && (
                    <li className="nav-item" onClick={() => updateSm(false)}>
                      <Link
                        to={`${process.env.PUBLIC_URL}/tutor-bank-details?id=${id}`}
                        className={
                          window.location.pathname === `${process.env.PUBLIC_URL}/tutor-bank-details`
                            ? "active nav-link"
                            : "nav-link"
                        }
                      >
                        <Icon name="money" />
                        <span>Bank Info</span>
                      </Link>
                    </li>
                  )}
                  <li className="nav-item" onClick={() => updateSm(false)}>
                    <Link
                      to={`${process.env.PUBLIC_URL}/useractivity-list?id=${id}`}
                      className={
                        window.location.pathname === `${process.env.PUBLIC_URL}/useractivity-list`
                          ? "active nav-link"
                          : "nav-link"
                      }
                    >
                      <Icon name="user-list-fill"></Icon>
                      <span>Activity</span>
                    </Link>
                  </li>
                  <li className="nav-item nav-item-trigger d-xxl-none">
                    <Button className={`toggle btn-icon btn-trigger ${sideBar && "active"}`} onClick={sidebarToggle}>
                      <Icon name="user-list-fill"></Icon>
                    </Button>
                  </li>
                </Nav>
                <div className="card-inner">
                  {sm && mobileView && <div className="toggle-overlay" onClick={() => updateSm(!sm)}></div>}
                  <Switch>
                    <Route
                      exact
                      path={`${process.env.PUBLIC_URL}/tctuser-profile`}
                      render={() => (
                        <TCTUserProfile
                          updateSm={updateSm}
                          studentId={searchParams.get("id")}
                          sm={sm}
                          setProfileName={setProfileName}
                        />
                      )}
                    ></Route>
                    <Route
                      exact
                      path={`${process.env.PUBLIC_URL}/user-availability-list`}
                      render={() => <UserAvailability updateSm={updateSm} studentId={searchParams.get("id")} sm={sm} showRowsPerPage={isTutorRole} />}
                    ></Route>
                    <Route
                      exact
                      path={`${process.env.PUBLIC_URL}/useractivity-list`}
                      render={() => <TCTUserActivity updateSm={updateSm} studentId={searchParams.get("id")} sm={sm} />}
                    ></Route>
                    <Route
                      exact
                      path={`${process.env.PUBLIC_URL}/student-enrolled-courses`}
                      render={() => (
                        <StudentEnrolledCourses studentId={searchParams.get("id")} updateSm={updateSm} sm={sm} />
                      )}
                    ></Route>
                    <Route
                      exact
                      path={`${process.env.PUBLIC_URL}/tctuser-skillset`}
                      render={() => <TutorSkillset studentId={searchParams.get("id")} updateSm={updateSm} sm={sm} showRowsPerPage={isTutorRole} />}
                    ></Route>
                    <Route
                      exact
                      path={`${process.env.PUBLIC_URL}/user-password-change`}
                      render={() => (
                        <UserProfileSettingPage studentId={searchParams.get("id")} updateSm={updateSm} sm={sm} />
                      )}
                    ></Route>
                    <Route
                      exact
                      path={`${process.env.PUBLIC_URL}/lms/tctuser-notifications`}
                      render={() => (
                        <TCTUserNotificationList
                          studentId={searchParams.get("id")}
                          updateSm={updateSm}
                          sm={sm}
                        ></TCTUserNotificationList>
                      )}
                    ></Route>

                    <Route
                      exact
                      path={`${process.env.PUBLIC_URL}/tutor-bank-details`}
                      render={() => (
                        <TutorBankDetails
                          navigationType="page"
                          updateSm={updateSm}
                          tutorId={searchParams.get("id")}
                          sm={sm}
                        />
                      )}
                    ></Route>
                  </Switch>
                </div>
              </div>
              <Sidebar toggleState={sideBar}>
                <div className="card-inner">
                  <div className="user-card user-card-s2 mt-5 mt-xxl-0">
                    <UserAvatar className="lg" theme="primary" text={findUpper(formData?.fullName)} />
                    <div className="user-info">
                      <div className="badge badge-outline-light badge-pill ucap">{formData?.role}</div>
                      <h5>{formData?.fullName}</h5>
                      <span className="sub-text">{formData?.email}</span>
                    </div>
                  </div>
                </div>
              </Sidebar>
              {sideBar && <div className="toggle-overlay" onClick={() => sidebarToggle()}></div>}
            </div>
          </Card>
          <Modal
            isOpen={profileModalOpen}
            toggle={() => setProfileModalOpen(false)}
            className="modal-dialog-centered"
            size="sm"
          >
            <ModalHeader
              // toggle={toggle}
              close={
                <button
                  className="close"
                  type="button"
                  onClick={() => {
                    setProfileModalOpen(false);
                  }}
                >
                  <Icon name="cross" />
                </button>
              }
            ></ModalHeader>
            <ModalBody>
              <form>
                <div className="row col-md-12">
                  <div className="col-md-2"></div>
                  <div className="col-md-8">
                    <Dropzone
                      onDrop={(acceptedFiles) => handleDropChange(acceptedFiles, setFiles4)}
                      accept={[".jpg", ".png", ".svg"]}
                    >
                      {({ getRootProps, getInputProps }) => (
                        <section>
                          <div {...getRootProps()} className="dropzone upload-zone dz-clickable">
                            <input {...getInputProps()} />
                            {files4.length === 0 && (
                              <div className="dz-message">
                                <span className="dz-message-text">Drag and drop file</span>
                                <span className="dz-message-or">or</span>
                                <Button type="button" color="primary">
                                  SELECT
                                </Button>
                              </div>
                            )}
                            {files4.map((file) => (
                              <div
                                key={file.name}
                                className="dz-preview dz-processing dz-image-preview dz-error dz-complete"
                              >
                                <div className="dz-image">
                                  <img src={file.preview} alt="preview" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>
                      )}
                    </Dropzone>
                    {filename}
                  </div>
                  <div className="col-md-2"></div>
                </div>
              </form>
            </ModalBody>
            <ModalFooter className="bg-light">
              <div style={{ width: "100%" }}>
                <div style={{ textAlign: "right" }}>
                  <Button
                    color="primary"
                    type="button"
                    size="md"
                    onClick={() => {
                      onSaveProfileHandler();
                    }}
                  >
                    Save Photo
                  </Button>
                </div>
              </div>
            </ModalFooter>
          </Modal>
          <ToastContainer />
          <EditTCTUser
            modalOpen={modal}
            onModalCloseCallback={() => {
              setModal(false);
            }}
            formData={formData}
          ></EditTCTUser>
        </Block>
      </Content>
    </React.Fragment >
  );
};

export default TCTUserProfileLayout;
