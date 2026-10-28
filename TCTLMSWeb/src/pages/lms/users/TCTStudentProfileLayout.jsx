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
import TutorBankDetails from "../tutors/TutorBankDetails";
import TCTUserNotificationList from "./TCTUserNotificationList";

// Tutor-only styles: every selector is under .tct-sp, which is rendered only for tutors (other roles unchanged).
const tutorStudentProfileStyle = `
  .tct-sp .nk-block-head { padding-bottom: 18px; }
  .tct-sp .nk-block-title.page-title { margin: 0; font-size: 1.6rem; line-height: 1.25; }
  .tct-sp .nk-block-title.page-title strong.text-primary { font-size: inherit; font-weight: 700; color: #1c2b46 !important; }
  .tct-sp-back.btn {
    display: inline-flex !important; align-items: center; gap: 6px; height: 38px; padding: 0 16px;
    border-radius: 8px; border: 1px solid #d9cbff; background: #f5f1ff; color: #6a35e8;
    font-size: 13px; font-weight: 600; box-shadow: none;
  }
  .tct-sp-back.btn .icon { font-size: 16px; }
  .tct-sp-back.btn:hover { background: #854fff; border-color: #854fff; color: #fff; }
  .tct-sp-back.btn:focus-visible { box-shadow: 0 0 0 3px rgba(133, 79, 255, 0.22); }

  .tct-sp .card-bordered { border: 1px solid #e5e9f2; border-radius: 12px; box-shadow: 0 1px 3px rgba(31, 43, 58, 0.05); }

  /* Tabs */
  .tct-sp .nav-tabs-card { display: flex; flex-wrap: nowrap; gap: 4px; padding: 0 20px; border-bottom: 1px solid #e5e9f2; overflow-x: auto; scrollbar-width: none; }
  .tct-sp .nav-tabs-card::-webkit-scrollbar { display: none; }
  .tct-sp .nav-tabs-card .nav-item { padding: 0; margin: 0; }
  .tct-sp .nav-tabs-card .nav-link {
    display: inline-flex; align-items: center; gap: 8px; padding: 16px 14px; white-space: nowrap;
    font-size: 14px; font-weight: 600; color: #526484; border-radius: 0; transition: color 0.15s ease, background-color 0.15s ease;
  }
  .tct-sp .nav-tabs-card .nav-link .icon { font-size: 18px; color: #8094ae; transition: color 0.15s ease; }
  .tct-sp .nav-tabs-card .nav-link:after { left: 14px; right: 14px; bottom: 0; height: 3px; border-radius: 3px 3px 0 0; background: #854fff; }
  .tct-sp .nav-tabs-card .nav-link:hover { color: #854fff; background: #faf8ff; }
  .tct-sp .nav-tabs-card .nav-link:hover .icon,
  .tct-sp .nav-tabs-card .nav-link.active .icon { color: #854fff; }
  .tct-sp .nav-tabs-card .nav-link.active { color: #854fff; }
  .tct-sp .nav-tabs-card .nav-link:focus-visible { outline: none; box-shadow: inset 0 0 0 2px rgba(133, 79, 255, 0.35); border-radius: 6px; }

  /* Tab content */
  .tct-sp .card-content > .card-inner { padding: 22px 24px; }
  .tct-sp .card-content .nk-block-head { padding-bottom: 14px; }
  .tct-sp .card-content .nk-block-head .nk-block-between:empty,
  .tct-sp .card-content .nk-block-title:empty { display: none; }
  .tct-sp .card-content .nk-block-title { margin: 0; font-size: 1.1rem; font-weight: 700; color: #1c2b46; }
  .tct-sp .data-list .data-head { padding: 10px 16px; border-radius: 8px; background: #f5f1ff; }
  .tct-sp .data-list .data-head .overline-title { color: #6a35e8; letter-spacing: 0.08em; }
  .tct-sp .data-list .data-item { padding: 16px; border-bottom: 1px solid #eef0f5; }
  .tct-sp .data-list .data-item:last-child { border-bottom: 0; }
  .tct-sp .data-list .data-label { font-size: 13px; font-weight: 500; color: #8094ae; }
  .tct-sp .data-list .data-value { font-size: 14px; font-weight: 600; color: #364a63; }

  /* Tables (Availability / Activity) */
  .tct-sp .card-content .rdt_TableHeadRow { min-height: 46px; background: #f8f9fc; border-bottom: 1px solid #e5e9f2; }
  .tct-sp .card-content .rdt_TableCol { font-size: 12px; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; color: #8094ae; }
  .tct-sp .card-content .rdt_TableRow { min-height: 54px; font-size: 14px; color: #526484; }
  .tct-sp .card-content .rdt_TableRow:not(:last-of-type) { border-bottom-color: #eef0f5; }
  .tct-sp .card-content .rdt_TableRow:hover { background: #faf8ff; }
  .tct-sp .card-content .rdt_Table { border: 1px solid #e5e9f2; border-radius: 10px; }
  .tct-sp .card-content .rdt_TableHeadRow { border-radius: 10px 10px 0 0; }
  /* LeadLists.css has an unscoped .pagination rule (padding, border-top, white background); undo it here. */
  .tct-sp .card-content .dataTables_wrapper .pagination { margin: 0; padding: 0; border-top: 0; background: transparent; }
  .tct-sp .card-content .dataTables_wrapper .row.align-items-center { margin: 14px 0 0; }
  .tct-sp .card-content .dataTables_wrapper .row.align-items-center > [class*="col"] { padding: 0; }
  .tct-sp .card-content .dataTables_info { font-size: 13px; color: #8094ae; }

  /* Availability toolbar (UserAvailability markup): search always visible; the empty left column is dropped. */
  .tct-sp .card-content .row:has(> .col-6 > .entrolled-list) { margin: 0 0 14px; }
  .tct-sp .card-content .row:has(> .col-6 > .entrolled-list) > .col-6:first-child { display: none; }
  .tct-sp .card-content .row:has(> .col-6 > .entrolled-list) > .col-6:last-child { flex: 0 0 100%; max-width: 100%; padding: 0; }
  .tct-sp .card-content .entrolled-list.card-tools-toggle { display: flex; align-items: center; gap: 10px; padding: 0; }
  .tct-sp .card-content .entrolled-list .card-search.search-wrap {
    order: 1; flex: 0 1 340px; position: relative; z-index: auto;
    opacity: 1; pointer-events: auto; background: transparent; border-radius: 0;
  }
  .tct-sp .card-content .entrolled-list .card-search .card-body { padding: 0; }
  .tct-sp .card-content .entrolled-list .search-back { display: none; }
  .tct-sp .card-content .entrolled-list .search-content .form-control {
    height: 38px; padding-left: 38px; padding-right: 12px; font-size: 14px;
    background: #fff; border: 1px solid #dbdfea !important; border-radius: 8px; box-shadow: none;
  }
  .tct-sp .card-content .entrolled-list .search-content .form-control:focus { border-color: #854fff !important; box-shadow: 0 0 0 3px rgba(133, 79, 255, 0.12); }
  .tct-sp .card-content .entrolled-list .search-submit {
    left: 0; right: auto; transform: translate(4px, -50%);
    color: #8094ae; background: transparent; border: 0; pointer-events: none;
  }
  /* The settings menu only held "Show" (page size), which is now the Rows per page dropdown, so hide it (no duplicate). */
  .tct-sp .card-content .entrolled-list .card-title-group { display: none; }

  /* Rows per page (Availability): on the pagination row, right side */
  .tct-sp .tct-av-grid,
  .tct-sp .tct-act-grid { position: relative; }
  .tct-sp .tct-rpp { display: flex; align-items: center; justify-content: flex-end; gap: 10px; font-size: 13px; font-weight: 500; color: #6b7a90; white-space: nowrap; }
  @media (min-width: 768px) {
    .tct-sp .tct-av-grid .tct-rpp,
    .tct-sp .tct-act-grid .tct-rpp { position: absolute; right: 0; bottom: 0; height: 44px; }
    .tct-sp .tct-av-grid .dataTables_wrapper .row.align-items-center,
    .tct-sp .tct-act-grid .dataTables_wrapper .row.align-items-center { min-height: 44px; padding-right: 230px; }
  }
  @media (max-width: 767.98px) {
    .tct-sp .tct-av-grid .tct-rpp,
    .tct-sp .tct-act-grid .tct-rpp { margin-top: 12px; }
  }
  .tct-sp .tct-rpp-toggle {
    display: inline-flex; align-items: center; justify-content: space-between; gap: 10px;
    min-width: 76px; height: 36px; padding: 0 10px 0 14px;
    font-size: 14px; font-weight: 600; line-height: 1; color: #364a63; cursor: pointer;
    background: #fff; border: 1px solid #dbdfea; border-radius: 8px;
    transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
  }
  .tct-sp .tct-rpp-toggle .icon { font-size: 14px; color: #854fff; transition: transform 0.15s ease; }
  .tct-sp .tct-rpp-toggle:hover { border-color: #c4b0ff; background: #fbf9ff; }
  .tct-sp .tct-rpp-toggle:focus { outline: none; }
  .tct-sp .tct-rpp-toggle:focus-visible,
  .tct-sp .tct-rpp .show > .tct-rpp-toggle { border-color: #854fff; box-shadow: 0 0 0 3px rgba(133, 79, 255, 0.18); }
  .tct-sp .tct-rpp .show > .tct-rpp-toggle .icon { transform: rotate(180deg); }
  .tct-sp .tct-rpp .tct-rpp-menu {
    z-index: 1000; min-width: 100px; margin-bottom: 6px; padding: 4px;
    background: #fff; border: 1px solid #e5e9f2; border-radius: 10px; box-shadow: 0 10px 28px rgba(31, 43, 58, 0.14);
  }
  .tct-sp .tct-rpp .tct-rpp-menu .dropdown-item {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 12px; border-radius: 6px; font-size: 14px; font-weight: 500; color: #364a63;
  }
  .tct-sp .tct-rpp .tct-rpp-menu .dropdown-item:hover,
  .tct-sp .tct-rpp .tct-rpp-menu .dropdown-item:focus { background: #f5f1ff; color: #4c1fd0; outline: none; }
  .tct-sp .tct-rpp .tct-rpp-menu .dropdown-item.active { background: #f1ebff; color: #4c1fd0; font-weight: 600; }
  .tct-sp .tct-rpp .tct-rpp-menu .dropdown-item .icon { font-size: 14px; color: #854fff; }

  /* Activity search (TCTUserActivity, tutor only): always visible, same look as the Availability search */
  .tct-sp .tct-act-toolbar { display: flex; align-items: center; margin-bottom: 14px; }
  .tct-sp .tct-act-search { position: relative; flex: 0 1 340px; }
  .tct-sp .tct-act-search > .icon {
    position: absolute; left: 13px; top: 50%; transform: translateY(-50%);
    font-size: 16px; color: #8094ae; pointer-events: none;
  }
  .tct-sp .tct-act-search .form-control {
    height: 38px; padding-left: 38px; padding-right: 12px; font-size: 14px;
    background: #fff; border: 1px solid #dbdfea; border-radius: 8px; box-shadow: none;
  }
  .tct-sp .tct-act-search .form-control:focus { border-color: #854fff; box-shadow: 0 0 0 3px rgba(133, 79, 255, 0.12); }
  @media (max-width: 575.98px) {
    .tct-sp .tct-act-search { flex-basis: 100%; }
  }

  /* Student summary panel */
  .tct-sp .user-aside .user-card-s2 { padding-top: 8px; }
  .tct-sp .user-aside .user-info h5 { margin-top: 6px; font-size: 1.15rem; font-weight: 700; color: #1c2b46; }
  .tct-sp .user-aside .badge-outline-light { border-color: #d9cbff; color: #6a35e8; background: #f5f1ff; }
  @media (min-width: 1540px) {
    /* Inline panel: the theme's min-height: 100vh stretched the whole card; let the content set the height. */
    .tct-sp .card-aside { min-height: 0; background: #fcfbff; border-radius: 0 12px 12px 0; }
  }

  @media (max-width: 575.98px) {
    .tct-sp .nk-block-title.page-title { font-size: 1.3rem; }
    .tct-sp .nav-tabs-card { padding: 0 8px; }
    .tct-sp .nav-tabs-card .nav-link { padding: 14px 10px; font-size: 13px; }
    .tct-sp .card-content > .card-inner { padding: 16px; }
  }
`;

const TCTStudentProfileLayout = () => {
  const isTutorView = localStorage.getItem("roleId") === "13";
  const [sm, updateSm] = useState(false);
  const [mobileView, setMobileView] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [designation, setDesignation] = useState("");
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const [id, setId] = useState(searchParams.get("id"));
  // Back: return to the page that opened the profile (passed as location.state.from, e.g. the tutor Student List).
  // Without it (direct URL / other entry points): tutors go to their Student List, other roles keep Enrollment History.
  const backTo =
    location.state?.from ||
    (isTutorView ? `${process.env.PUBLIC_URL}/lms/studentlist` : `${process.env.PUBLIC_URL}/lms/sales/enrollment-history`);
  // Tab links keep the same state so Back still works after switching tabs.
  const tabLink = (pathname) => ({ pathname, search: `?id=${id}`, state: location.state });
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
      setEmailAddress(isTutorView ? "" : response.data.email);
      setDesignation(response.data.designationName);
    });
  };

  const handleDropChange = (acceptedFiles, set) => {
    setSelectedFiles(acceptedFiles);
    set(
      acceptedFiles.map((file) =>
        Object.assign(file, {
          preview: URL.createObjectURL(file),
        }),
      ),
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
    profilePayload.append("DocumentDescription", `${formData.fullName || "Student"} profile photo`);

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
        },
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
        {isTutorView && <style>{tutorStudentProfileStyle}</style>}
        <div className={isTutorView ? "tct-sp" : undefined}>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle tag="h3" page>
                <strong className="text-primary small">{profileName}</strong>
              </BlockTitle>
            </BlockHeadContent>
            <BlockHeadContent>
              <Link
                className={isTutorView ? "btn tct-sp-back" : "btn btn-outline-light bg-white d-none d-sm-inline-flex"}
                to={backTo}
              >
                <em class="icon ni ni-arrow-left"></em>
                <span> Back</span>
              </Link>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>
        <Block>
          <Card className="card-bordered">
            <div className="card-aside-wrap" id="user-detail-block">
              <div className="card-content">
                <Nav tabs className="nav-tabs-mb-icon nav-tabs-card">
                  <li className="nav-item" onClick={() => updateSm(false)}>
                    <Link
                      to={tabLink(`${process.env.PUBLIC_URL}/student-profile`)}
                      className={
                        window.location.pathname === `${process.env.PUBLIC_URL}/student-profile`
                          ? "active nav-link "
                          : "nav-link "
                      }
                    >
                      <Icon name="user-fill-c"></Icon>
                      <span>Personal Info</span>
                    </Link>
                  </li>
                  <li className="nav-item" onClick={() => updateSm(false)}>
                    <Link
                      to={tabLink(`/student-availability-list`)}
                      className={
                        window.location.pathname === `/student-availability-list` ? "active nav-link" : "nav-link"
                      }
                    >
                      <Icon name="calender-date" />
                      <span>Availability</span>
                    </Link>
                  </li> 
                  <li className="nav-item" onClick={() => updateSm(false)}>
                    <Link
                      to={tabLink(`${process.env.PUBLIC_URL}/student-activity-list`)}
                      className={
                        window.location.pathname === `${process.env.PUBLIC_URL}/student-activity-list`
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
                      path={`${process.env.PUBLIC_URL}/student-profile`}
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
                      path={`${process.env.PUBLIC_URL}/student-availability-list`}
                      render={() => <UserAvailability updateSm={updateSm} navigationType="student" studentId={searchParams.get("id")} sm={sm} showRowsPerPage={isTutorView} />}
                    ></Route>
                    <Route
                      exact
                      path={`${process.env.PUBLIC_URL}/student-activity-list`}
                      render={() => <TCTUserActivity updateSm={updateSm} studentId={searchParams.get("id")} sm={sm} showSearchAndPageSize={isTutorView} />}
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
                      render={() => <TutorSkillset studentId={searchParams.get("id")} updateSm={updateSm} sm={sm} />}
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
        </div>
      </Content>
    </React.Fragment>
  );
};

export default TCTStudentProfileLayout;
