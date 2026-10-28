import React, { useContext, useEffect, useState, useRef, useMemo } from "react";
import moment from "moment";
import "react-datepicker/dist/react-datepicker.css";
import { FormGroup, Modal, ModalBody, ModalFooter, ModalHeader, Row, Form, Spinner, UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem } from "reactstrap";
import DatePicker from "react-datepicker";
import "react-phone-number-input/style.css";
import { getLookups, getAllRoles } from "../../../apiservices/LookupsService";
import { updateStatus } from "../../../apiservices/StudentEnrollmentService";
import {
  insertSchedule,
  getClassStatusEditRequest,
  decideClassStatusEditRequest,
} from "../../../apiservices/ScheduleService";
import Swal from "sweetalert2";
import { ToastContainer } from "react-toastify";
import { toast } from "react-toastify";
import { NotificationType, FollowUpStatus, notificationLinkPath } from "../../../utils/Utils";
import {
  Block,
  BlockBetween,
  BlockDes,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Icon,
  Col,
  PreviewCard,
  Button,
  TooltipComponent,
  RSelect,
  ReactDataTable,
} from "../../../components/Component";
import Content from "../../../layout/content/Content";
import Head from "../../../layout/head/Head";
import { useForm, Controller } from "react-hook-form";
import { getTutors, getCoordinatorAdmins, getUserAvailability } from "../../../apiservices/UserService";
import {
  getFilteredTutors,
  getTutorById,
  getTutorPaymentApproval,
  decideTutorPaymentApproval,
} from "../../../apiservices/TutorService";
import TutorInfo from "../tutors/TutorInfo";
import {
  fetchNotifications,
  fetchNotificationsById,
  GetSalesDetails,
  MarkAsRead,
} from "../../../apiservices/NofiticationService";
import { Link } from "react-router-dom";
import NotificationMessage from "../../../components/NotificationMessage";

// Notifications page + "View" popup styles for Tutor / Coordinator. Every selector is under .tct-notif
// (page wrapper) or .tct-notif-modal (popup dialog), which are only rendered when isStyledNotificationPage is true.
const notificationPageStyle = `
  .tct-notif .nk-block-head { padding-bottom: 18px; }
  .tct-notif .nk-block-title { margin: 0; font-size: 1.6rem; font-weight: 700; color: #1c2b46; }

  .tct-notif-card { background: #fff; border: 1px solid #e5e9f2; border-radius: 12px; box-shadow: 0 1px 3px rgba(31, 43, 58, 0.05); }
  .tct-notif-card .dataTables_wrapper > .row:empty { display: none; }
  .tct-notif-card .rdt_Table { border-radius: 12px 12px 0 0; }
  .tct-notif-card .rdt_TableHeadRow { min-height: 46px; background: #f8f9fc; border-bottom: 1px solid #e5e9f2; border-radius: 12px 12px 0 0; }
  .tct-notif-card .rdt_TableCol { font-size: 12px; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; color: #8094ae; }
  .tct-notif-card .rdt_TableRow { min-height: 64px; }
  .tct-notif-card .rdt_TableRow:not(:last-of-type) { border-bottom-color: #eef0f5; }
  .tct-notif-card .rdt_TableRow:hover { background: #faf8ff; }
  .tct-notif-card .rdt_TableCell { padding-top: 12px; padding-bottom: 12px; }
  /* Message: readable size and line height; long messages wrap instead of overflowing. */
  .tct-notif-card .rdt_TableCell .n_read,
  .tct-notif-card .rdt_TableCell .n_unread { font-size: 14px; line-height: 1.6; white-space: normal; overflow-wrap: anywhere; cursor: default; }
  /* Date */
  .tct-notif-card .rdt_TableCell > span > strong { font-size: 13px; font-weight: 600; color: #526484; white-space: nowrap; }
  /* Action icons */
  .tct-notif-card .rdt_TableCell .btn-trigger.btn-icon { width: 34px; height: 34px; border-radius: 8px; color: #6e82a5; transition: background-color 0.15s ease, color 0.15s ease; }
  .tct-notif-card .rdt_TableCell .btn-trigger.btn-icon:before { display: none; }
  .tct-notif-card .rdt_TableCell .btn-trigger.btn-icon .icon { font-size: 18px; }
  .tct-notif-card .rdt_TableCell .btn-trigger.btn-icon:hover { background: #f5f1ff; color: #854fff; }

  /* Pagination inside the card. LeadLists.css has an unscoped .pagination rule
     (padding, border-top, white background); undo it on this page only. */
  .tct-notif-card .dataTables_wrapper .row.align-items-center { margin: 0; padding: 12px 18px; border-top: 1px solid #e5e9f2; }
  .tct-notif-card .dataTables_wrapper .row.align-items-center > [class*="col"] { padding: 0; background: transparent; }
  .tct-notif-card .dataTables_wrapper .pagination { margin: 0; padding: 0; border-top: 0; background: transparent; }
  .tct-notif-card .dataTables_info { font-size: 13px; color: #8094ae; }

  /* ---- View popup ---- */
  .tct-notif-modal .modal-content { border: 0; border-radius: 14px; box-shadow: 0 24px 48px rgba(31, 43, 58, 0.18); }
  .tct-notif-modal .modal-header { align-items: center; padding: 18px 24px; border-bottom: 1px solid #eef0f5; }
  .tct-notif-modal .modal-title { font-size: 1.15rem; font-weight: 700; color: #1c2b46; }
  .tct-notif-modal .modal-header .close {
    display: inline-flex; align-items: center; justify-content: center;
    width: 34px; height: 34px; margin: 0 0 0 auto; padding: 0; border-radius: 8px;
    color: #8094ae; opacity: 1; text-shadow: none; transition: background-color 0.15s ease, color 0.15s ease;
  }
  .tct-notif-modal .modal-header .close:hover { background: #f5f1ff; color: #854fff; }
  .tct-notif-modal .modal-header .close:focus { outline: none; }
  .tct-notif-modal .modal-header .close:focus-visible { box-shadow: 0 0 0 3px rgba(133, 79, 255, 0.22); }
  .tct-notif-modal .modal-body { padding: 20px 24px 10px; }
  /* Each detail as a light tile: label on top, value below */
  .tct-notif-modal .modal-body .form-group {
    height: calc(100% - 14px); margin-bottom: 14px; padding: 12px 14px;
    background: #f8f9fc; border: 1px solid #eef0f5; border-radius: 10px;
  }
  .tct-notif-modal .modal-body .overline-title { margin-bottom: 6px; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; color: #8094ae; }
  .tct-notif-modal .modal-body #preview-event-start { margin: 0; font-size: 14px; font-weight: 600; color: #364a63; overflow-wrap: anywhere; }
  .tct-notif-modal .modal-body a #preview-event-start { color: #854fff; }
  .tct-notif-modal .modal-body a:hover #preview-event-start { text-decoration: underline; }
  .tct-notif-modal .modal-body .btn-trigger.text-primary { width: 28px; height: 28px; border-radius: 6px; }
  .tct-notif-modal .modal-body .btn-trigger.text-primary:hover { background: #f5f1ff; }
  /* Status: same text and colour class as before, shown as a soft pill */
  .tct-notif-modal .modal-body .form-control-wrap > p.text-success,
  .tct-notif-modal .modal-body .form-control-wrap > p.text-warning,
  .tct-notif-modal .modal-body .form-control-wrap > p.text-danger {
    display: inline-block; max-width: 100%; margin: 0; padding: 4px 12px; border-radius: 999px;
    font-size: 12px; font-weight: 600; line-height: 1.5; overflow-wrap: anywhere;
  }
  .tct-notif-modal .modal-body .form-control-wrap > p.text-success { background: rgba(30, 224, 172, 0.14); color: #0c9a74 !important; }
  .tct-notif-modal .modal-body .form-control-wrap > p.text-warning { background: rgba(244, 189, 14, 0.16); color: #a77b00 !important; }
  .tct-notif-modal .modal-body .form-control-wrap > p.text-danger { background: rgba(232, 83, 71, 0.12); color: #c4382d !important; }
  /* Tutor Payment */
  .tct-notif-modal .modal-body .form-label { margin-bottom: 8px; font-size: 13px; font-weight: 600; color: #364a63; }
  .tct-notif-modal .modal-body input.form-control {
    width: 100%; height: 40px; padding: 0 12px; font-size: 14px; color: #364a63;
    background: #fff; border: 1px solid #dbdfea; border-radius: 8px; box-shadow: none;
  }
  .tct-notif-modal .modal-body input.form-control:focus { border-color: #854fff; box-shadow: 0 0 0 3px rgba(133, 79, 255, 0.12); }
  .tct-notif-modal .modal-footer { padding: 12px 24px; border-top: 1px solid #eef0f5; border-radius: 0 0 14px 14px; }

  /* Rows per page: right end of the pagination row (the row is drawn by the shared pagination component,
     so the control is positioned over its right end and the row keeps room for it). */
  .tct-notif-card { position: relative; }
  .tct-notif-rpp { display: flex; align-items: center; justify-content: flex-end; gap: 10px; font-size: 13px; font-weight: 500; color: #6b7a90; white-space: nowrap; }
  @media (min-width: 768px) {
    .tct-notif-rpp { position: absolute; right: 18px; bottom: 0; height: 64px; }
    .tct-notif-card .dataTables_wrapper .row.align-items-center { min-height: 64px; padding-top: 0; padding-bottom: 0; padding-right: 240px; }
  }
  @media (max-width: 767.98px) {
    .tct-notif-rpp { padding: 0 18px 14px; }
  }
  .tct-notif-rpp-toggle {
    display: inline-flex; align-items: center; justify-content: space-between; gap: 10px;
    min-width: 76px; height: 38px; padding: 0 10px 0 14px;
    font-size: 14px; font-weight: 600; line-height: 1; color: #364a63; cursor: pointer;
    background: #fff; border: 1px solid #dbdfea; border-radius: 8px;
    transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
  }
  .tct-notif-rpp-toggle .icon { font-size: 14px; color: #854fff; transition: transform 0.15s ease; }
  .tct-notif-rpp-toggle:hover { border-color: #c4b0ff; background: #fbf9ff; }
  .tct-notif-rpp-toggle:focus { outline: none; }
  .tct-notif-rpp-toggle:focus-visible,
  .tct-notif-rpp .show > .tct-notif-rpp-toggle { border-color: #854fff; box-shadow: 0 0 0 3px rgba(133, 79, 255, 0.18); }
  .tct-notif-rpp .show > .tct-notif-rpp-toggle .icon { transform: rotate(180deg); }
  .tct-notif-rpp .tct-notif-rpp-menu {
    z-index: 1000; min-width: 100px; margin-bottom: 6px; padding: 4px;
    background: #fff; border: 1px solid #e5e9f2; border-radius: 10px; box-shadow: 0 10px 28px rgba(31, 43, 58, 0.14);
  }
  .tct-notif-rpp .tct-notif-rpp-menu .dropdown-item {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 12px; border-radius: 6px; font-size: 14px; font-weight: 500; color: #364a63;
  }
  .tct-notif-rpp .tct-notif-rpp-menu .dropdown-item:hover,
  .tct-notif-rpp .tct-notif-rpp-menu .dropdown-item:focus { background: #f5f1ff; color: #4c1fd0; outline: none; }
  .tct-notif-rpp .tct-notif-rpp-menu .dropdown-item.active { background: #f1ebff; color: #4c1fd0; font-weight: 600; }
  .tct-notif-rpp .tct-notif-rpp-menu .dropdown-item .icon { font-size: 14px; color: #854fff; }

  /* ---- Source-team filter cards ----
     Two-row card: icon + count on top, full team name below (no truncation). Auto-fill grid,
     so all cards share one row on wide screens and wrap evenly on smaller ones. */
  .tct-notif-teams { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; margin-bottom: 16px; }
  .tct-notif-team {
    position: relative; display: grid; grid-template-columns: auto 1fr; grid-template-areas: "icon count" "name name";
    align-items: center; row-gap: 12px; width: 100%; min-width: 0; min-height: 100px; padding: 14px 14px 13px;
    text-align: left; cursor: pointer; overflow: hidden;
    background: #fff; border: 1px solid #e5e9f2; border-radius: 14px; box-shadow: 0 1px 2px rgba(31, 43, 58, 0.04);
    transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease, transform 0.15s ease;
  }
  /* Thin accent line along the top, in the team's colour */
  .tct-notif-team::before {
    content: ""; position: absolute; top: 0; left: 0; right: 0; height: 3px;
    background: var(--tn-accent, #854fff); opacity: 0; transition: opacity 0.15s ease;
  }
  .tct-notif-team:hover { border-color: #d4c6ff; box-shadow: 0 8px 18px rgba(31, 43, 58, 0.08); transform: translateY(-2px); }
  .tct-notif-team:hover::before { opacity: 0.55; }
  .tct-notif-team:focus { outline: none; }
  .tct-notif-team:focus-visible { border-color: #854fff; box-shadow: 0 0 0 3px rgba(133, 79, 255, 0.22); }
  .tct-notif-team.is-active {
    border-color: #854fff; background: linear-gradient(180deg, #faf8ff 0%, #ffffff 100%);
    box-shadow: 0 0 0 1px #854fff, 0 8px 20px rgba(133, 79, 255, 0.16);
  }
  .tct-notif-team.is-active::before { opacity: 1; background: #854fff; }
  .tct-notif-team-icon {
    grid-area: icon; display: inline-flex; align-items: center; justify-content: center;
    width: 36px; height: 36px; border-radius: 10px; font-size: 17px;
    color: var(--tn-accent, #854fff); background: var(--tn-bg, #f1ecff); transition: background-color 0.15s ease, color 0.15s ease;
  }
  .tct-notif-team.is-active .tct-notif-team-icon { color: #fff; background: #854fff; }
  .tct-notif-team-count {
    grid-area: count; justify-self: end; font-size: 22px; font-weight: 700; line-height: 1; letter-spacing: -0.01em;
    color: #1c2b46; font-variant-numeric: tabular-nums;
  }
  .tct-notif-team.is-active .tct-notif-team-count { color: #6a35e8; }
  .tct-notif-team-text { grid-area: name; display: flex; flex-direction: column; min-width: 0; }
  /* Full name: wraps to a second line if needed instead of being cut off */
  .tct-notif-team-name { font-size: 13px; font-weight: 600; line-height: 1.35; color: #364a63; overflow-wrap: anywhere; }
  .tct-notif-team.is-active .tct-notif-team-name { color: #4c1fd0; }
  .tct-notif-team-sub { margin-top: 2px; font-size: 11.5px; line-height: 1.3; color: #8094ae; }
  .tct-notif-state {
    display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 36px 16px; text-align: center;
    font-size: 14px; color: #6b7a90; background: #fff; border: 1px solid #e5e9f2; border-radius: 12px;
  }
  .tct-notif-state .icon { font-size: 26px; color: #854fff; }
  .tct-notif-state.is-error .icon { color: #e85347; }
  .tct-notif-card .dataTables_wrapper .p-2 { padding: 36px 16px !important; font-size: 14px; color: #8094ae; text-align: center; }

  @media (max-width: 575.98px) {
    .tct-notif-teams { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    .tct-notif-team { min-height: 88px; padding: 12px; row-gap: 10px; }
    .tct-notif-team-icon { width: 32px; height: 32px; font-size: 15px; }
    .tct-notif-team-count { font-size: 19px; }
    .tct-notif .nk-block-title { font-size: 1.3rem; }
    .tct-notif-modal .modal-header { padding: 14px 16px; }
    .tct-notif-modal .modal-body { padding: 16px 16px 6px; }
    .tct-notif-modal .modal-footer { padding: 12px 16px; }
  }
`;

// Icon / accent for a source-team card. Cards themselves are generated from the data; unknown teams get the default.
const SOURCE_TEAM_LOOK = {
  all: { icon: "bell", accent: "#854fff", bg: "#f1ecff" },
  SuperAdmin: { icon: "shield-star", accent: "#6a35e8", bg: "#efe9ff" },
  Admin: { icon: "shield", accent: "#6a35e8", bg: "#efe9ff" },
  CoordinatorAdmin: { icon: "user-check", accent: "#0b8f6c", bg: "#e3f8f1" },
  Coordinator: { icon: "users", accent: "#1c7ed6", bg: "#e7f2fd" },
  SalesAdmin: { icon: "growth", accent: "#c05f00", bg: "#fff2e2" },
  OperationsAdmin: { icon: "setting", accent: "#0d8ca3", bg: "#e2f6f9" },
  Operations: { icon: "setting", accent: "#0d8ca3", bg: "#e2f6f9" },
  Tutor: { icon: "book-read", accent: "#b2459c", bg: "#fbe9f7" },
  Student: { icon: "user", accent: "#2f7d32", bg: "#e8f5e9" },
  System: { icon: "cpu", accent: "#526484", bg: "#f1f3f8" },
};
// Same value the Source Team column shows (role name from the API; missing → "System").
const notificationSourceTeam = (row) => (row?.sourceTeam || "").trim() || "System";
// "CoordinatorAdmin" → "Coordinator Admin" (display only; filtering uses the raw role name).
const sourceTeamLabel = (team) => team.replace(/([a-z])([A-Z])/g, "$1 $2");

const TCTUserNotificationList = () => {
  const userId = localStorage.getItem("userId");
  // Redesigned UI only for Tutor / Coordinator on the Notifications pages (not the profile-embedded lists or other roles).
  const isStyledNotificationPage =
    ["Tutor", "Coordinator"].includes(localStorage.getItem("userRole")) &&
    [`${process.env.PUBLIC_URL}/lms/users/user-notification`, `${process.env.PUBLIC_URL}/lms/users/coordinator-notification`].includes(
      window.location.pathname.replace(/\/$/, "")
    );
  const viewTooltip = isStyledNotificationPage ? "View details" : "View";
  // Rows per page (Tutor / Coordinator Notifications page only). Starts at the existing page size (100);
  // other roles / embedded lists keep the fixed 100.
  const NOTIFICATION_PAGE_SIZES = [5, 10, 25, 50, 100];
  const [notificationPageSize, setNotificationPageSize] = useState(100);
  const [notificationPageReset, setNotificationPageReset] = useState(false);
  const defaultGuid = "00000000-0000-0000-0000-000000000000";
  const [notificationDataSource, setNotificationDataSource] = useState();
  // Source-team filter (styled Notifications page only). null = All notifications.
  const [selectedSourceTeam, setSelectedSourceTeam] = useState(null);
  const [notificationLoadError, setNotificationLoadError] = useState(false);
  // The API returns every notification for the user (no server paging), so counts come from the full list.
  // Duplicate rows (same notification detail id) are counted and listed once.
  const uniqueNotifications = useMemo(() => {
    if (!Array.isArray(notificationDataSource)) return [];
    const seen = new Set();
    return notificationDataSource.filter((row) => {
      if (row?.id == null) return true;
      if (seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    });
  }, [notificationDataSource]);
  const sourceTeamCards = useMemo(() => {
    const counts = new Map();
    uniqueNotifications.forEach((row) => {
      const team = notificationSourceTeam(row);
      counts.set(team, (counts.get(team) || 0) + 1);
    });
    return [...counts.entries()]
      .map(([team, count]) => ({ team, count }))
      .sort((a, b) => b.count - a.count || a.team.localeCompare(b.team));
  }, [uniqueNotifications]);
  const visibleNotifications = useMemo(
    () => (selectedSourceTeam ? uniqueNotifications.filter((row) => notificationSourceTeam(row) === selectedSourceTeam) : uniqueNotifications),
    [uniqueNotifications, selectedSourceTeam]
  );
  // If a refresh removes the last notification of the selected team, fall back to All.
  useEffect(() => {
    if (selectedSourceTeam && Array.isArray(notificationDataSource) && !sourceTeamCards.some((c) => c.team === selectedSourceTeam)) {
      setSelectedSourceTeam(null);
    }
  }, [sourceTeamCards, selectedSourceTeam, notificationDataSource]);
  const selectSourceTeam = (team) => {
    if (team === selectedSourceTeam) return;
    setSelectedSourceTeam(team);
    setNotificationPageReset((prev) => !prev); // back to page 1
  };
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [tutorList, setTutorList] = useState([]);
  const [filteredTutorList, setFilteredTutorList] = useState([]);
  const [isTutorListLoading, setIsTutorListLoading] = useState(false);
  const [coordinatorAdminList, setCoordinatorAdminList] = useState([]);
  const [statusList, setStatusList] = useState([]);
  const [unFillterdStatusList, setUnFillterdStatusList] = useState([]);
  const [showSalesDetails, setShowSalesDetails] = useState(false);
  const [salesId, setSalesId] = useState(false);
  const [salesDetailsId, setSalesDetailsId] = useState(false);
  const [statusId, setStatusId] = useState("");
  const [tutorId, setTutorId] = useState("");
  const [tutorPayment, setTutorPayment] = useState(null);
  const [status, setStatus] = useState(null);
  const [currentNotificationType, setCurrentNotificationType] = useState(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [tutorInfoModal, setTutorInfoModal] = useState(false);
  const [tutorInfoData, setTutorInfoData] = useState({ tutorId: null, tutorUserId: null });
  const [tutorHasAvailability, setTutorHasAvailability] = useState(null);
  const [salesDetails, setSalesDetails] = useState({
    studentId: null,
    studentName: "",
    tutorName: "",
    coordinatorId: "",
    coordinatorName: "",
    subjectId: "",
    subjectName: "",
    gradeName: "",
    gradId: "",
    boardName: "",
    boardId: "",
    tutorId: null,
    enrollmentDate: "",
    status: "",
  });
  const [formData, setFormData] = useState({
    notificationId: defaultGuid,
    statusId: "",
    tutorId: "",
    id: "",
    salesDetailsId: "",
    userId: "",
    createdBy: "",
    startDate: "",
    ScheduleDetailsDto: {
      guestType: "",
      scheduleDetailsId: "",
      scheduleId: "",
      date: "",
      startTime: "",
      endTime: "",
      scheduleType: "",
      tutorComment: "",
      studentComment: "",
      status: "",
      tutorScheduleStatus: "",
      studentScheduleStatus: "",
      tutorScheduleStatusName: "",
      studentScheduleStatusName: "",
      tutorName: "",
      studentName: "",
      board: "",
      grade: "",
      subject: "",
      UuserId: "",
      isTutorPresent: "",
      isStudentPresent: "",
      coordiatorComment: "",
      title: "",
      meetingLink: "",
    },
  });

  const resetForm = () => {
    setFormData({
      ...formData,
      tutorId: "",
      statusId: "",
    });
    setValue("tutorId", "");
    setValue("statusId", "");
    clearErrors(["tutorId", "statusId"]);
  };

  const onMarkAsReadHandler = (notifiDetailsId) => {
    MarkAsRead(notifiDetailsId, userId).then((response) => {
      if (response.succeeded) {
        fetchNotifications(userId).then((data) => {
          setNotificationDataSource(data);
        });
      }
    });
  };

  const openNotification = (row) => {
    if (!row?.isRead) onMarkAsReadHandler(row.id);
  };

  const restSalesDetails = () => {
    setSalesDetails({
      studentId: null,
      studentName: "",
      tutorName: "",
      coordinatorId: "",
      coordinatorName: "",
      subjectId: "",
      subjectName: "",
      gradeName: "",
      gradId: "",
      boardName: "",
      boardId: "",
      tutorId: null,
      enrollmentDate: "",
      status: "",
    });
  };

  const calendarNotificationTypes = [
    NotificationType.ScheduleDemoClass, // backend: ScheduleClass
    NotificationType.ScheduleDemo,
    NotificationType.ReScheduleClass,
    NotificationType.ReScheduleDemo,
    NotificationType.ClassReminder,
  ];

  const reviewPaymentRequest = async (approvalId) => {
    try {
      const request = await getTutorPaymentApproval(approvalId);
      if (!request || request.approvalStatus !== 1012003) {
        toast.info("This payment request has already been processed.");
        return;
      }
      const result = await Swal.fire({
        title: request.requestTypeName === "AssignmentWithPaymentChange"
          ? "Review assignment and payment"
          : "Review tutor payment change",
        width: 680,
        html: `<div style="text-align:left; padding:0 10px;">
          <div style="display:grid; grid-template-columns:170px minmax(0,1fr); gap:10px 18px; padding:16px 18px; margin-bottom:22px; background:#f5f7fa; border-radius:6px; line-height:1.45;">
            <strong>Tutor</strong><span>${request.tutorName || "-"}</span>
            <strong>Course</strong><span>${request.board || "-"} ${request.grade || ""}</span>
            <strong>Current amount</strong><span>${request.basePaymentAmount}</span>
            <strong>Proposed amount</strong><span>${request.requestedPaymentAmount}</span>
            <strong>Request reason</strong><span style="overflow-wrap:anywhere;">${request.requestReason || "Not provided"}</span>
          </div>
          <label for="payment-approved-amount" style="display:block; font-weight:600; margin-bottom:7px;">Approved amount</label>
          <input id="payment-approved-amount" class="swal2-input" style="width:100%; margin:0 0 18px; box-sizing:border-box;" type="number" min="0.01" step="0.01" value="${request.requestedPaymentAmount}" />
          <label for="payment-decision-comment" style="display:block; font-weight:600; margin-bottom:7px;">Decision comment <span style="color:#e85347;">*</span></label>
          <textarea id="payment-decision-comment" class="swal2-textarea" style="width:100%; min-height:120px; margin:0; box-sizing:border-box; resize:vertical;" placeholder="Enter approval or rejection reason"></textarea>
        </div>`,
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: request.requestTypeName === "AssignmentWithPaymentChange"
          ? "Approve assignment & payment" : "Approve payment",
        denyButtonText: "Reject",
        cancelButtonText: "Cancel",
        buttonsStyling: false,
        customClass: {
          confirmButton: "btn btn-primary px-4",
          denyButton: "btn btn-danger px-4",
          cancelButton: "btn btn-light px-4",
        },
        didOpen: () => {
          const actions = Swal.getActions();
          if (actions) {
            actions.style.display = "flex";
            actions.style.flexWrap = "nowrap";
            actions.style.justifyContent = "flex-end";
            actions.style.gap = "10px";
            actions.style.width = "calc(100% - 40px)";
            actions.style.margin = "24px 20px 0";
          }
        },
        preConfirm: () => {
          const comment = document.getElementById("payment-decision-comment")?.value?.trim();
          const approvedAmount = Number(document.getElementById("payment-approved-amount")?.value);
          if (!comment) return Swal.showValidationMessage("Decision comment is required.");
          if (!approvedAmount || approvedAmount <= 0) return Swal.showValidationMessage("Approved amount must be greater than zero.");
          return { comment, approvedAmount };
        },
        preDeny: () => {
          const comment = document.getElementById("payment-decision-comment")?.value?.trim();
          if (!comment) return Swal.showValidationMessage("Rejection reason is required.");
          return { comment };
        },
      });
      if (!result.isConfirmed && !result.isDenied) return;
      await decideTutorPaymentApproval({
        ApprovalId: approvalId,
        UserId: userId,
        Approved: result.isConfirmed,
        ApprovedAmount: result.isConfirmed ? result.value.approvedAmount : null,
        Comment: result.value.comment,
      });
      toast.success(result.isConfirmed ? "Payment request approved." : "Payment request rejected.");
      const notifications = await fetchNotifications(userId);
      setNotificationDataSource(notifications);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to process the payment request.");
    }
  };

  // Operations: approve or reject a tutor's/student's request to change a class status they already saved.
  const reviewStatusEditRequest = async (scheduleDetailsId) => {
    try {
      const request = await getClassStatusEditRequest(scheduleDetailsId);
      if (!request || request.status !== "Pending") {
        toast.info(`This request has already been ${String(request?.status || "processed").toLowerCase()}.`);
        return;
      }
      const escape = (text) => String(text ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
      const result = await Swal.fire({
        title: "Class status edit request",
        width: 640,
        html: `<div style="text-align:left; display:grid; grid-template-columns:150px minmax(0,1fr); gap:8px 16px; padding:14px 16px; background:#f5f7fa; border-radius:6px; line-height:1.45;">
            <strong>Requested by</strong><span>${escape(request.requesterName)} (${request.requesterType === "tutor" ? "Tutor" : "Student"})</span>
            <strong>Student</strong><span>${escape(request.studentName)}</span>
            <strong>Tutor</strong><span>${escape(request.tutorName)}</span>
            <strong>Subject</strong><span>${escape(request.subject)}</span>
            <strong>Class</strong><span>${moment(request.classStart).format("DD MMM YYYY, hh:mm A")} - ${moment(request.classEnd).format("hh:mm A")}</span>
            <strong>Current status</strong><span>${escape(request.currentStatus || "-")}</span>
            <strong>Reason</strong><span>${escape(request.reason || "-")}</span>
          </div>`,
        input: "textarea",
        inputPlaceholder: "Comment (optional)",
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: "Approve",
        denyButtonText: "Reject",
        cancelButtonText: "Close",
      });
      if (!result.isConfirmed && !result.isDenied) return;
      const response = await decideClassStatusEditRequest(request.id, result.isConfirmed, result.value || "");
      toast.success(response?.message || (result.isConfirmed ? "Request approved." : "Request rejected."));
      const notifications = await fetchNotifications(userId);
      setNotificationDataSource(notifications);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to process the edit request.");
    }
  };

  const renderActionButton = (row) => {
    const userRole = localStorage.getItem("userRole");

    if (row.notificationType == NotificationType.ClassStatusEditRequest && row.scheduleDetailsId) {
      return (
        <span onClick={() => reviewStatusEditRequest(row.scheduleDetailsId)}>
          <TooltipComponent
            tag="a"
            containerClassName="btn btn-trigger btn-icon"
            id={"statusedit" + row.id}
            icon="edit"
            direction="top"
            text="Review edit request"
          />
        </span>
      );
    }

    if (row.notificationType == NotificationType.TutorPaymentApprovalRequest) {
      return (
        <span onClick={() => reviewPaymentRequest(row.salesDetailsId)}>
          <TooltipComponent
            tag="a"
            containerClassName="btn btn-trigger btn-icon"
            id={"payment" + row.id}
            icon="wallet-in"
            direction="top"
            text="Review Payment Request"
          />
        </span>
      );
    }

    // My Calendar task notifications (assigned / completed): open the Tasks tab.
    if (
      row.notificationType == NotificationType.TaskAssigned ||
      row.notificationType == NotificationType.TaskCompleted
    ) {
      return (
        <Link to="/lms/my-calendar?tab=tasks">
          <TooltipComponent
            tag="a"
            containerClassName="btn btn-trigger btn-icon"
            id={"task" + row.id}
            icon="task"
            direction="top"
            text="Open task"
          />
        </Link>
      );
    }

    // Class and schedule notifications
    const linkPath = notificationLinkPath(row);

    if (linkPath) {
      const isCompletionAlert =
        row.notificationType == NotificationType.ClassCompletionThreshold;

      const isScheduleChange =
        row.notificationType == NotificationType.ClassScheduleChanged ||
        row.notificationType == NotificationType.ClassTimeRequest;

      const isStatusEditDecision =
        row.notificationType == NotificationType.ClassStatusEditDecision;

      const isScheduleRequest =
        row.notificationType == NotificationType.ScheduleChangeRequest;

      const isScheduleDecision =
        row.notificationType == NotificationType.ScheduleChangeDecision;

      return (
        <Link to={linkPath}>
          <TooltipComponent
            tag="a"
            containerClassName="btn btn-trigger btn-icon"
            id={"link" + row.id}
            icon={
              isCompletionAlert
                ? "icon ni ni-file-text"
                : "icon ni ni-calender-date"
            }
            direction="top"
            text={
              isCompletionAlert
                ? "Prepare invoice"
                : isScheduleRequest
                  ? "Review request"
                  : isScheduleChange || isScheduleDecision
                    ? "Open schedule calendar"
                    : isStatusEditDecision
                      ? "Open my calendar"
                      : "Check availability"
            }
          />
        </Link>
      );
    }

    if (userRole === "Operations") {
      return (
        <Link to="/lms/completed-class-details">
          <TooltipComponent
            tag="a"
            containerClassName="btn btn-trigger btn-icon"
            id={"view" + row.id}
            icon="eye"
            direction="top"
            text="View"
          />
        </Link>
      );
    }

    if (
      (userRole === "Tutor" || userRole === "Student") &&
      calendarNotificationTypes.some((t) => t == row.notificationType)
    ) {
      return (
        <Link to={userRole === "Tutor" ? "/tct-tutor-calender/" : "/tct-student-calendar/"}>
          <TooltipComponent
            tag="a"
            containerClassName="btn btn-trigger btn-icon"
            id={"cal" + row.id}
            icon="icon ni ni-calender-date"
            direction="top"
            text="View Calendar"
          />
        </Link>
      );
    }

    if (userRole === "Tutor") {
      if (!row.salesDetailsId) return <></>;
      return (
        <span
          onClick={() => {
            restSalesDetails();
            setSalesId(row.salesId);
            setSalesDetailsId(row.salesDetailsId);
            onTutorAssignmentHandler(row.salesId, row.salesDetailsId);
            setCurrentNotificationType(row.notificationType);
          }}
        >
          <TooltipComponent
            tag="a"
            containerClassName="btn btn-trigger btn-icon"
            id={"view" + row.id}
            icon="eye"
            direction="top"
            text={viewTooltip}
          />
        </span>
      );
    }
    if (row.notificationType == NotificationType.AssignTutor) {
      return (
        <>
          <span
            onClick={() => {
              restSalesDetails();
              setSalesId(row.salesId);
              setSalesDetailsId(row.salesDetailsId);
              onTutorAssignmentHandler(row.salesId, row.salesDetailsId);
              setCurrentNotificationType(row.notificationType);
            }}
          >
            <TooltipComponent
              tag="a"
              containerClassName="btn btn-trigger btn-icon"
              id={"edit" + row.id}
              icon="edit"
              direction="top"
              text={row?.notificationTypeName}
            />
          </span>
        </>
      );
    } else if (row.notificationType == NotificationType.ApproveTutorAssignment) {
      return (
        <>
          <Link to={`/lms/schedule/schedule-class?id=${row.studentId}`}>
            <TooltipComponent
              tag="a"
              containerClassName="btn btn-trigger btn-icon"
              id={"remove" + row.id}
              icon="icon ni ni-calender-date"
              direction="top"
              text="Schedule Class"
            />
          </Link>
          <span
            onClick={() => {
              restSalesDetails();
              setSalesId(row.salesId);
              setSalesDetailsId(row.salesDetailsId);
              onTutorAssignmentHandler(row.salesId, row.salesDetailsId);
              setCurrentNotificationType(row.notificationType);
            }}
          >
            <TooltipComponent
              tag="a"
              containerClassName="btn btn-trigger btn-icon"
              id={"schedule" + row.id}
              icon="eye"
              direction="top"
              text={viewTooltip}
            />
          </span>
        </>
      );
    } else if (row.notificationType == NotificationType.ScheduleDemoClass) {
      return (
        <>
          <Link to={`/lms/schedule/schedule-class?id=${row.studentId}`}>
            <TooltipComponent
              tag="a"
              containerClassName="btn btn-trigger btn-icon"
              id={"remove" + row.id}
              icon="icon ni ni-calender-date"
              direction="top"
              text="Schedule Class"
            />
          </Link>
        </>
      );
    } else if (row.notificationType == NotificationType.TutorAssigned) {
      if (row.statusTypeCode == FollowUpStatus.DemoPendingTutorAssignedApproved) {
        return (
          <>
            <Link to={`/lms/schedule/schedule-class?id=${row.studentId}`}>
              <TooltipComponent
                tag="a"
                containerClassName="btn btn-trigger btn-icon"
                id={"cal" + row.id}
                icon="icon ni ni-calender-date"
                direction="top"
                text="Schedule Class"
              />
            </Link>
            <span
              onClick={() => {
                restSalesDetails();
                setSalesId(row.salesId);
                setSalesDetailsId(row.salesDetailsId);
                onTutorAssignmentHandler(row.salesId, row.salesDetailsId);
                setCurrentNotificationType(row.notificationType);
              }}
            >
              <TooltipComponent
                tag="a"
                containerClassName="btn btn-trigger btn-icon"
                id={"view" + row.id}
                icon="eye"
                direction="top"
                text={viewTooltip}
              />
            </span>
          </>
        );
      }
      if (row.statusTypeCode != null && row.statusTypeCode != FollowUpStatus.DemoPendingTutorAssignedNotApproved) {
        return (
          <span style={{ opacity: 0.35, cursor: "not-allowed", pointerEvents: "none" }}>
            <TooltipComponent
              tag="a"
              containerClassName="btn btn-trigger btn-icon"
              id={"approve" + row.id}
              icon="user-check "
              direction="top"
              text={"Already Processed"}
            />
          </span>
        );
      }
      return (
        <>
          <span
            onClick={() => {
              restSalesDetails();
              setSalesId(row.salesId);
              setSalesDetailsId(row.salesDetailsId);
              onTutorAssignmentHandler(row.salesId, row.salesDetailsId);
              setCurrentNotificationType(row.notificationType);
            }}
          >
            <TooltipComponent
              tag="a"
              containerClassName="btn btn-trigger btn-icon"
              id={"approve" + row.id}
              icon={localStorage.getItem("userRole") === "Tutor" ? "eye" : "user-check "}
              direction="top"
              text={localStorage.getItem("userRole") === "Tutor" ? viewTooltip : "Approve Tutor Assignment"}
            />
          </span>
        </>
      );
    }
    return <></>;
  };

  const dtNotificationColumns = [
    {
      name: "Source Team",
      selector: (row) => row.sourceTeam || "System",
      sortable: true,
      cell: (row) => <span className="badge badge-dim badge-primary">{row.sourceTeam || "System"}</span>,
      minWidth: "140px",
      maxWidth: "180px",
    },
    {
      name: "Notification",
      selector: (row) => row.message,
      sortable: true,
      cell: (row) => (
        <div
          onClick={() => {
            onMarkAsReadHandler(row?.id);
          }}
          className={row.isRead ? "n_read" : "n_unread"}
        >
          {" "}
          <span><NotificationMessage message={row.message} /></span>{" "}
        </div>
      ),
      hide: "md",
    },
    {
      name: "Date",
      minWidth: "200px",
      maxWidth: "200px",
      selector: (row) => row.createdDate,
      cell: (row) => (
        <span>
          <strong>{moment(row.createdDate).format("DD-MMM-yyyy")}</strong>
        </span>
      ),
      hide: "md",
    },
    {
      name: "Action",
      minWidth: "100px",
      maxWidth: "100px",
      selector: (row) => row.id,
      cell: (row) => <div onClick={() => openNotification(row)}>{renderActionButton(row)}</div>,
    },
  ];

  const formRef = useRef(null);

  useEffect(() => {
    getLookups("200" /*status*/).then((response) => {
      let temp = [];
      response
        ?.filter((s) => s.typeCodeValue == FollowUpStatus.DemoPendingTutorAssignedNotApproved)
        ?.forEach((s) => {
          temp.push({ value: s?.id, label: s?.typeCodeName, code: s?.typeCodeValue, id: s?.id });
        });
      setStatusList(temp);
      let temp1 = [];
      response.forEach((s) => {
        temp1.push({ value: s?.id, label: s?.typeCodeName, code: s?.typeCodeValue, id: s?.id });
      });
      setUnFillterdStatusList(temp1);
    });

    fetchNotifications(userId)
      .then((data) => {
        setNotificationLoadError(false);
        setNotificationDataSource(data);
      })
      .catch(() => setNotificationLoadError(true));

    getTutors().then((response) => {
      let temp = [];
      response.forEach((s) => {
        temp.push({ value: s?.id.toString(), label: s?.fullName });
      });
      setTutorList(temp);
    });

    getCoordinatorAdmins().then((response) => {
      let temp = [];
      response.forEach((s) => {
        temp.push({ value: s?.id.toString(), label: s?.fullName });
      });
      setCoordinatorAdminList(temp);
    });
  }, []);

  useEffect(() => {
    fetchNotifications(userId).then((data) => {
      setNotificationDataSource(data);
    });
  }, [editModalOpen, isAddModalOpen]);

  const onEditFormSubmit = (data) => {
    const inputData = formData;
    inputData.createdBy = formData.createdBy;
    inputData.userId = formData.userId;
    //const inputData = { ...formData };

    const handleSuccess = () => {
      setEditModalOpen(false);
      toast.success("Data updated successfully.", {
        position: "top-right",
        autoClose: true,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: false,
        closeButton: <CloseButton />,
      });
      // props.submitCallback?.(); // Call if defined
    };

    const handleError = (error) => {
      toast.error("Failed to update data: " + error.message, {
        position: "top-right",
        autoClose: true,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    };

    if (inputData.startDate == null || inputData.startDate == undefined || inputData.startDate == "") {
      updateStatus(inputData).then(handleSuccess).catch(handleError);
    } else {
      inputData.stringStartDate = new Date(inputData.startDate).toISOString();

      inputData.startDate = moment(inputData.startDate);
      inputData.endDate = moment(inputData.startDate).clone().add(1, "hour");
      console.log("Input Data", inputData);
      insertSchedule(inputData).then(handleSuccess).catch(handleError);
    }
  };

  const CloseButton = () => {
    return (
      <span className="btn-trigger toast-close-button" role="button">
        <Icon name="cross"></Icon>
      </span>
    );
  };

  const onTutorAssignmentHandler = (salesId, salesDetailId) => {
    setTutorHasAvailability(null);
    GetSalesDetails(salesId, salesDetailId)
      .then((response) => {
        if (response?.data) {
          let temp = response.data;
          temp["statusId"] = temp.status;
          setSalesDetails(temp);

          if (!temp.tutorId || temp.tutorId === defaultGuid) {
            setFilteredTutorList([]);
            setIsTutorListLoading(true);
            getFilteredTutors(temp.boardId || "", temp.gradId || "", "", temp.subjectId || "", "", 0, 0)
              .then((tutorResponse) => {
                if (tutorResponse?.data) {
                  const seen = new Set();
                  const list = [];
                  tutorResponse.data.forEach((t) => {
                    if (t.tutorId && !seen.has(t.tutorId)) {
                      seen.add(t.tutorId);
                      list.push({ value: t.tutorId.toString(), label: t.tutorName });
                    }
                  });
                  setFilteredTutorList(list);
                  if (temp.tutorName) {
                    const matched = list.find((t) => t.label === temp.tutorName);
                    if (matched) {
                      setSalesDetails((prev) => ({ ...prev, tutorId: matched.value }));
                    }
                  }
                }
              })
              .catch(() => setFilteredTutorList([]))
              .finally(() => setIsTutorListLoading(false));
          } else {
            getTutorById(temp.tutorId)
              .then((tutorResponse) => getUserAvailability(tutorResponse?.data?.id || temp.tutorId))
              .then((avail) => setTutorHasAvailability(Array.isArray(avail) && avail.length > 0))
              .catch(() => setTutorHasAvailability(null));
          }
        }
        setShowSalesDetails(true);
      })
      .catch((error) => {});
  };

  const onEditHandler = (id) => {
    setEditModalOpen(true);
    fetchNotificationsById(id).then(async (response) => {
      console.log(response);
      setFormData(response);
      setValue("tutorId", response.tutorId);
      setValue("coordinatorAdminId", response.coordinatorAdminId);
      setValue("statusId", response.statusId);
      setValue("id", response.salesDetailsId);
      setValue("salesDetailsId", response.salesDetailsId);
      setValue("toUserId", response.fromUserId);
      setValue("createdBy", userId);
      setValue("startDate", response.startDate);
    });
  };

  const onStatusUpdateHandler = () => {
    console.log(salesDetails);
    const inputData = {
      SalesId: salesId,
      SaleseDetailsId: salesDetailsId,
      UserId: userId,
      Status: salesDetails?.status,
      TutorId: salesDetails?.tutorId,
      StatusId: salesDetails?.statusId,
      TutorPayment: salesDetails?.tutorPayment,
      NoteText: "",
    };

    updateStatus(inputData).then((response) => {
      setShowSalesDetails(false);
      fetchNotifications(userId).then((data) => {
        setNotificationDataSource(data);
      });
      toast.success("Tutor assigned successfully.", {
        position: "top-right",
        autoClose: true,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: false,
        closeButton: <CloseButton />,
      });
    });
  };

  const RenderGrid = (props) => {
    return (
      <>
        <ReactDataTable
          data={props.dataSource}
          pageSize={isStyledNotificationPage ? notificationPageSize : 100}
          columns={dtNotificationColumns}
          pagination
          paginationResetDefaultPage={isStyledNotificationPage ? notificationPageReset : undefined}
          className="nk-tb-list"
        />
      </>
    );
  };

  const { errors, register, handleSubmit, setValue, clearErrors } = useForm({
    defaultValues: {
      id: "",
      tutorId: "",
      statusId: "",
      coordinatorAdminId: "",
    },
  });

  const closeModal = () => {
    resetForm();
    setEditModalOpen(false);
  };

  return (
    <>
      <React.Fragment>
        <Head title="Coordinator"></Head>
        <Content>
          {isStyledNotificationPage && <style>{notificationPageStyle}</style>}
          <div className={isStyledNotificationPage ? "tct-notif" : undefined}>
          <BlockHead size="sm">
            <BlockBetween>
              <BlockHeadContent>
                <BlockTitle tag="h5">Notifications</BlockTitle>
              </BlockHeadContent>
            </BlockBetween>
          </BlockHead>

          <Block>
            {isStyledNotificationPage && !notificationDataSource && (
              notificationLoadError ? (
                <div className="tct-notif-state is-error" role="alert">
                  <Icon name="alert-circle" />
                  <span>Unable to load notifications. Please refresh the page to try again.</span>
                </div>
              ) : (
                <div className="tct-notif-state" role="status">
                  <Spinner size="sm" color="primary" />
                  <span>Loading notifications…</span>
                </div>
              )
            )}
            {isStyledNotificationPage && notificationDataSource && sourceTeamCards.length > 0 && (
              <div className="tct-notif-teams" role="group" aria-label="Filter notifications by source team">
                {[{ team: null, count: uniqueNotifications.length }, ...sourceTeamCards].map(({ team, count }) => {
                  const look = SOURCE_TEAM_LOOK[team ?? "all"] || { icon: "bell", accent: "#854fff", bg: "#f1ecff" };
                  const active = selectedSourceTeam === team;
                  return (
                    <button
                      key={team ?? "__all__"}
                      type="button"
                      className={`tct-notif-team${active ? " is-active" : ""}`}
                      style={{ "--tn-accent": look.accent, "--tn-bg": look.bg }}
                      aria-pressed={active}
                      onClick={() => selectSourceTeam(team)}
                    >
                      <span className="tct-notif-team-icon" aria-hidden="true"><Icon name={look.icon} /></span>
                      <span className="tct-notif-team-text">
                        <span className="tct-notif-team-name" title={team ? sourceTeamLabel(team) : "All Notifications"}>
                          {team ? sourceTeamLabel(team) : "All Notifications"}
                        </span>
                        <span className="tct-notif-team-sub">{team ? "Notifications" : "Every team"}</span>
                      </span>
                      <span className="tct-notif-team-count">{count}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {notificationDataSource && (
              <div className={isStyledNotificationPage ? "tct-notif-card" : undefined}>
                <RenderGrid dataSource={isStyledNotificationPage ? visibleNotifications : notificationDataSource}></RenderGrid>
                {isStyledNotificationPage && visibleNotifications.length > 0 && (
                  <div className="tct-notif-rpp">
                    <span>Rows per page</span>
                    <UncontrolledDropdown direction="up">
                      <DropdownToggle
                        tag="button"
                        type="button"
                        className="tct-notif-rpp-toggle"
                        aria-label={`Rows per page: ${notificationPageSize}`}
                      >
                        <span>{notificationPageSize}</span>
                        <Icon name="chevron-down" />
                      </DropdownToggle>
                      <DropdownMenu right className="tct-notif-rpp-menu">
                        {NOTIFICATION_PAGE_SIZES.map((size) => (
                          <DropdownItem
                            key={size}
                            tag="button"
                            type="button"
                            active={notificationPageSize === size}
                            onClick={() => {
                              if (notificationPageSize === size) return;
                              setNotificationPageSize(size);
                              setNotificationPageReset((prev) => !prev); // back to page 1
                            }}
                          >
                            <span>{size}</span>
                            {notificationPageSize === size && <Icon name="check" />}
                          </DropdownItem>
                        ))}
                      </DropdownMenu>
                    </UncontrolledDropdown>
                  </div>
                )}
              </div>
            )}
          </Block>
          </div>

          <Modal
            scrollable={true}
            isOpen={editModalOpen}
            toggle={closeModal}
            className="modal-dialog-centered"
            size="lg"
          >
            <ModalHeader
              close={
                <button className="close" type="button" onClick={closeModal}>
                  <Icon name="cross" />
                </button>
              }
            >
              Assign Tutor
            </ModalHeader>
            <ModalBody>
              <div>
                <PreviewCard>
                  <Form className="row gy-4" ref={formRef} noValidate onSubmit={handleSubmit(onEditFormSubmit)}>
                    <Row className="col-md-12">
                      <Col md="12">
                        <FormGroup>
                          <label className="overline-title" htmlFor="firstName">
                            Status:&nbsp;
                          </label>
                          <p id="preview-event-start" style={{ color: formData.displayColor }}>
                            {formData.statusName}
                          </p>
                        </FormGroup>
                      </Col>
                    </Row>
                    <Row className="col-md-12">
                      <Col md="6">
                        <FormGroup>
                          <label className="overline-title" htmlFor="firstName">
                            Student Name:&nbsp;
                          </label>
                          <p id="preview-event-start">{formData.studentName}</p>
                        </FormGroup>
                      </Col>
                      {formData.typeCodeValue === 20013 /*DemoPendingTutorAssignedApproved*/ && (
                        <Col sm="6">
                          <FormGroup>
                            <label className="overline-title">Tutor:&nbsp;</label>
                            <p id="preview-event-start">{formData.tutorName}</p>
                          </FormGroup>
                        </Col>
                      )}
                    </Row>
                    <Row className="col-md-12">
                      {formData.typeCodeValue === 20001 /*DemoPendingTutorNotAssigned*/ && (
                        <Col sm="12">
                          <FormGroup>
                            <label className="overline-title">Tutor</label>
                            <div className="form-control-wrap">
                              <RSelect
                                dataSource={tutorList || []}
                                value1={formData.tutorId}
                                onChangeHandler={(e) => {
                                  clearErrors(["tutorId"]);
                                  setFormData({ ...formData, tutorId: e.value });
                                  setValue("tutorId", e.value);
                                }}
                                {...register("tutorId", { required: "Tutor is Required" })}
                              />
                              {errors.tutorId && (
                                <span className="invalid" style={{ color: "#e85347" }}>
                                  {errors.tutorId.message}
                                </span>
                              )}
                            </div>
                          </FormGroup>
                        </Col>
                      )}
                    </Row>
                    <Row className="col-md-12">
                      {formData.typeCodeValue === 20001 /*DemoPendingTutorNotAssigned*/ && (
                        <Col sm="12">
                          <FormGroup>
                            <label className="overline-title">Coordinator Admin</label>
                            <div className="form-control-wrap">
                              <RSelect
                                dataSource={coordinatorAdminList || []}
                                value1={formData.id}
                                onChangeHandler={(e) => {
                                  clearErrors(["coordinatorAdminId"]);
                                  setFormData({ ...formData, coordinatorAdminId: e.value });
                                  setValue("coordinatorAdminId", e.value);
                                }}
                                {...register("coordinatorAdminId", { required: "Coordinator Admin is Required" })}
                              />
                              {errors.coordinatorAdminId && (
                                <span className="invalid" style={{ color: "#e85347" }}>
                                  {errors.coordinatorAdminId.message}
                                </span>
                              )}
                            </div>
                          </FormGroup>
                        </Col>
                      )}
                    </Row>
                    <Row className="col-md-12">
                      <Col sm="3">
                        <FormGroup>
                          <label className="overline-title" htmlFor="dob">
                            Board:&nbsp;
                          </label>
                          <p id="preview-event-start">{formData.board}</p>
                        </FormGroup>
                      </Col>
                      <Col md="3">
                        <FormGroup>
                          <label className="overline-title" htmlFor="email">
                            Grade:&nbsp;
                          </label>
                          <p id="preview-event-start">{formData.grade}</p>
                        </FormGroup>
                      </Col>
                      <Col md="6">
                        <FormGroup>
                          <label className="overline-title" htmlFor="email">
                            Subject:&nbsp;
                          </label>
                          <p id="preview-event-start">{formData.subjectName}</p>
                        </FormGroup>
                      </Col>
                    </Row>
                    <Row className="col-md-12">
                      <Col sm="12">
                        <FormGroup>
                          <label className="overline-title">Status:</label>
                          <div className="form-control-wrap">
                            <RSelect
                              dataSource={statusList || []}
                              value1={formData.statusId}
                              //value={statusList.find((option) => option.value === formData.statusId)}
                              onChangeHandler={(e) => {
                                clearErrors(["statusId"]);
                                setFormData({ ...formData, statusId: e.value });
                                setValue("statusId", e.value);
                              }}
                              {...register("statusId", { required: "Status is Required" })}
                            />
                            {errors.statusId && (
                              <span className="invalid" style={{ color: "#e85347" }}>
                                {errors.statusId.message}
                              </span>
                            )}
                          </div>
                        </FormGroup>
                      </Col>
                    </Row>

                    <Row className="col-md-12">
                      {formData.typeCodeValue === 20013 && (
                        <Col sm="12">
                          <FormGroup>
                            <p id="preview-event-start">Demo Schedule Date</p>
                            <div className="form-control-wrap">
                              <DatePicker
                                selected={formData.startDate ? new Date(formData.startDate) : null}
                                dateFormat="dd/MM/yyyy h:mm aa"
                                showMonthDropdown
                                showYearDropdown
                                dropdownMode="select"
                                yearDropdownItemNumber={100}
                                scrollableYearDropdown
                                placeholderText="Select demo schedule date and time"
                                minDate={new Date()}
                                showTimeSelect
                                timeFormat="HH:mm"
                                timeIntervals={15} // Defines the interval for time options in minutes
                                timeCaption="Time"
                                onChange={(date) => {
                                  setFormData({
                                    ...formData,
                                    startDate: date ? date : null, // Ensure the time is saved as well
                                  });
                                }}
                                className="form-control date-picker"
                              />
                            </div>
                            {errors.startDate && <span className="invalid">{errors.startDate.message}</span>}
                          </FormGroup>
                        </Col>
                      )}
                    </Row>
                    {formData.comment && (
                      <Row className="col-md-12">
                        <Col sm="12">
                          <FormGroup>
                            <label className="overline-title">Comment:</label>
                            <>
                              <br />
                            </>
                            <p id="preview-event-start">{formData.comment}</p>
                          </FormGroup>
                        </Col>
                      </Row>
                    )}
                    <Row className="col-md-12">
                      <Col sm="12">
                        <FormGroup></FormGroup>
                      </Col>
                    </Row>
                  </Form>
                </PreviewCard>
              </div>
            </ModalBody>
            <ModalFooter className="bg-light">
              <Col size="12">
                <ul className="align-center flex-wrap flex-sm-nowrap gx-4 gy-2">
                  <li>
                    <Button
                      color="primary"
                      size="md"
                      onClick={() => {
                        handleSubmit(onEditFormSubmit)();
                      }}
                    >
                      Update Status
                    </Button>
                  </li>
                </ul>
              </Col>
            </ModalFooter>
          </Modal>

          <Modal
            scrollable={true}
            isOpen={showSalesDetails}
            toggle={() => { setShowSalesDetails(false); setIsApproving(false); setIsRejecting(false); setTutorHasAvailability(null); }}
            className={`modal-dialog-centered${isStyledNotificationPage ? " tct-notif-modal" : ""}`}
            size="lg"
          >
            <ModalHeader
              close={
                <button
                  className="close"
                  type="button"
                  title="Close"
                  aria-label="Close"
                  onClick={() => {
                    setShowSalesDetails(false);
                    setIsApproving(false);
                    setIsRejecting(false);
                    setTutorHasAvailability(null);
                  }}
                >
                  <Icon name="cross" />
                </button>
              }
            >
              {currentNotificationType == NotificationType.TutorAssigned ||
              currentNotificationType == NotificationType.ApproveTutorAssignment ||
              (localStorage.getItem("userRole") === "CoordinatorAdmin" &&
               salesDetails?.statusTypeCode == FollowUpStatus.DemoPendingTutorAssignedNotApproved) ? (
                <>Approve Tutor Assignment</>
              ) : (
                <>Assign Tutor</>
              )}
            </ModalHeader>
            <ModalBody>
              <div>
                <Form className="row gy-1" ref={formRef} noValidate onSubmit={handleSubmit(onStatusUpdateHandler)}>
                  <Row className="col-md-12">
                    <Col md="6">
                      <FormGroup>
                        <label className="overline-title" htmlFor="firstName">
                          Student Name:
                        </label>
                        <p id="preview-event-start">{salesDetails.studentName}</p>
                      </FormGroup>
                    </Col>
                    <Col md="6">
                      <FormGroup>
                        <label className="overline-title" htmlFor="email">
                          Subject:
                        </label>
                        <p id="preview-event-start">{salesDetails.subjectName}</p>
                      </FormGroup>
                    </Col>
                  </Row>
                  <Row className="col-md-12">
                    <Col md="6">
                      <FormGroup>
                        <label className="overline-title" htmlFor="firstName">
                          Coordinator:
                        </label>
                        <p id="preview-event-start">{salesDetails.coordinatorName}</p>
                      </FormGroup>
                    </Col>
                    <Col sm="6">
                      <FormGroup>
                        <label className="overline-title">Tutor:</label>
                        <p id="preview-event-start">{salesDetails.tutorName}</p>
                      </FormGroup>
                    </Col>
                  </Row>

                  <Row className="col-md-12">
                    <Col sm="6">
                      <FormGroup>
                        <label className="overline-title" htmlFor="dob">
                          Board:
                        </label>
                        <p id="preview-event-start">{salesDetails.boardName}</p>
                      </FormGroup>
                    </Col>
                    <Col md="6">
                      <FormGroup>
                        <label className="overline-title" htmlFor="email">
                          Grade:
                        </label>
                        <p id="preview-event-start">{salesDetails.gradeName}</p>
                      </FormGroup>
                    </Col>
                  </Row>

                  <Row className="col-md-12">
                    <Col sm="6">
                      <FormGroup>
                        <label className="overline-title">Tutor</label>
                        <div className="form-control-wrap">
                          {salesDetails?.tutorId != null && salesDetails?.tutorId != defaultGuid ? (
                            <>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <a
                                  href={`/lms/tutorprofile?id=${null}&userId=${salesDetails?.tutorId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <p id="preview-event-start" style={{ margin: 0 }}>
                                    {salesDetails.tutorName ||
                                      tutorList.find((t) => t.value == salesDetails?.tutorId)?.label}
                                  </p>
                                </a>
                                <a
                                  href="#info"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    getTutorById(salesDetails.tutorId).then((response) => {
                                      setTutorInfoData({
                                        tutorId: salesDetails.tutorId,
                                        tutorUserId: response?.data?.id || salesDetails.tutorId,
                                      });
                                      setTutorInfoModal(true);
                                    });
                                  }}
                                  className="btn btn-icon btn-trigger text-primary"
                                >
                                  <Icon name="alert-circle-fill" />
                                </a>
                              </div>
                              {tutorInfoModal && (
                                <TutorInfo
                                  tutorId={tutorInfoData.tutorId}
                                  tutorUserId={tutorInfoData.tutorUserId}
                                  modalOpen={tutorInfoModal}
                                  tutorInfoModalHandler={() => setTutorInfoModal(false)}
                                  onAvailabilityLoaded={(hasAvailability) => setTutorHasAvailability(hasAvailability)}
                                />
                              )}
                            </>
                          ) : isTutorListLoading ? (
                            <p style={{ color: "#8094ae", fontSize: "13px" }}>Loading available tutors...</p>
                          ) : filteredTutorList.length === 0 ? (
                            <div style={{ padding: "8px 0" }}>
                              <em className="icon ni ni-user-cross" style={{ fontSize: "20px", color: "#e85347", marginRight: "6px" }}></em>
                              <span style={{ color: "#e85347", fontSize: "13px", fontWeight: 500 }}>
                                No tutors available for {salesDetails.subjectName}
                                {salesDetails.boardName ? ` (${salesDetails.boardName}` : ""}
                                {salesDetails.gradeName ? `, ${salesDetails.gradeName})` : salesDetails.boardName ? ")" : ""}.
                                Please update tutor profiles with the required skill.
                              </span>
                            </div>
                          ) : (
                            <>
                              <RSelect
                                dataSource={filteredTutorList}
                                value1={salesDetails?.tutorId}
                                menuPlacement="top"
                                onChangeHandler={(e) => {
                                  setTutorId(e.value);
                                  setSalesDetails((prevState) => ({ ...prevState, tutorId: e.value, tutorName: e.label }));
                                  setValue("tutorId", e.value);
                                }}
                                {...register("tutorId", { required: "Tutor is Required" })}
                              />
                              {errors.tutorId && (
                                <span className="invalid" style={{ color: "#e85347" }}>
                                  {errors.tutorId.message}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </FormGroup>
                    </Col>
                    <Col sm="6">
                      <FormGroup>
                        <label className="overline-title">Status:</label>
                        <div className="form-control-wrap">
                          {/* salesDetails?.statusTypeCode == FollowUpStatus.DemoPendingTutorAssignedNotApproved */}
                          {salesDetails?.statusTypeCode != FollowUpStatus.DemoPendingTutorNotAssigned ? (
                            <>
                              <p
                                className={
                                  salesDetails?.statusTypeCode == FollowUpStatus.DemoPendingTutorAssignedNotApproved
                                    ? "text-warning"
                                    : salesDetails?.statusTypeCode == FollowUpStatus.Reject
                                    ? "text-danger"
                                    : "text-success"
                                }
                              >
                                {salesDetails.statusTypeName}
                              </p>
                            </>
                          ) : (
                            <>
                              <RSelect
                                dataSource={statusList || []}
                                menuPlacement="top"
                                value1={salesDetails.status}
                                onChangeHandler={(e) => {
                                  setStatusId(e.value);
                                  setSalesDetails((prevState) => ({ ...prevState, statusId: e.value, status: e.code }));
                                  setValue("statusId", e.value);
                                  setStatus(FollowUpStatus.DemoPendingTutorAssignedNotApproved);
                                }}
                                {...register("statusId", { required: "Status is Required" })}
                              />
                              {errors.statusId && (
                                <span className="invalid" style={{ color: "#e85347" }}>
                                  {errors.statusId.message}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </FormGroup>
                    </Col>
                  </Row>
                  <Row className="col-md-12">
                    <Col md="12">
                      <div className="form-group">
                        <label className="form-label" htmlFor="regular-price">
                          {salesDetails?.tutorPaymentApprovalRequired ? "Tutor Payment Change" : "Tutor Payment"}
                        </label>
                        <div className="form-control-wrap">
                          {salesDetails?.tutorPaymentApprovalRequired ? (
                            <Row className="gy-2">
                              <Col sm="6">
                                <div className="border rounded p-3 bg-light">
                                  <span className="overline-title text-soft">Current approved amount</span>
                                  <div className="h5 mb-0">{salesDetails?.previousTutorPayment}</div>
                                </div>
                              </Col>
                              <Col sm="6">
                                <div className="border border-warning rounded p-3">
                                  <span className="overline-title text-warning">Proposed amount</span>
                                  <div className="h5 mb-0 text-warning">{salesDetails?.requestedTutorPayment}</div>
                                </div>
                              </Col>
                            </Row>
                          ) : (
                            <input
                              type="number"
                              name="tutorPayment"
                              maxLength={3}
                              ref={register({ required: "This is required" })}
                              className="form-control"
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setTutorPayment(val);
                                setSalesDetails((prevState) => ({
                                  ...prevState,
                                  tutorPayment: val,
                                }));
                              }}
                              defaultValue={salesDetails?.tutorPayment}
                            />
                          )}
                          {errors.tutorPayment && <span className="invalid">{errors.tutorPayment.message}</span>}
                        </div>
                      </div>
                    </Col>
                  </Row>
                </Form>
              </div>
            </ModalBody>
            {salesDetails?.statusTypeCode == FollowUpStatus.DemoPendingTutorNotAssigned && (
              <ModalFooter className="bg-light">
                <Col size="12">
                  <ul className="align-center flex-wrap flex-sm-nowrap gx-4 gy-2">
                    <li>
                      <Button
                        color="primary"
                        size="md"
                        disabled={isAssigning}
                        onClick={() => {
                          if (!salesDetails?.tutorId || salesDetails.tutorId === defaultGuid) {
                            toast.error("Please select a tutor before assigning.", {
                              position: "top-right",
                              autoClose: true,
                              hideProgressBar: true,
                              closeOnClick: true,
                            });
                            return;
                          }
                          const statusEntry = statusList[0];
                          if (!statusEntry) return;
                          const inputData = {
                            SalesId: salesId,
                            SaleseDetailsId: salesDetailsId,
                            UserId: userId,
                            Status: statusEntry.code,
                            TutorId: salesDetails?.tutorId,
                            StatusId: statusEntry.value,
                            TutorPayment: salesDetails?.tutorPayment,
                            NoteText: "",
                          };
                          setIsAssigning(true);
                          updateStatus(inputData).then(() => {
                            setIsAssigning(false);
                            setShowSalesDetails(false);
                            fetchNotifications(userId).then((data) => {
                              setNotificationDataSource(data);
                            });
                            toast.success("Tutor assigned successfully.", {
                              position: "top-right",
                              autoClose: true,
                              hideProgressBar: true,
                              closeOnClick: true,
                              pauseOnHover: true,
                              draggable: true,
                              progress: false,
                              closeButton: <CloseButton />,
                            });
                          }).catch(() => setIsAssigning(false));
                        }}
                      >
                        {isAssigning ? (
                          <>
                            <Spinner size="sm" className="mr-1" /> Assigning...
                          </>
                        ) : (
                          <>
                            <Icon name="user-add" /> Assign Tutor
                          </>
                        )}
                      </Button>
                    </li>
                  </ul>
                </Col>
              </ModalFooter>
            )}
            {salesDetails?.statusTypeCode == FollowUpStatus.DemoPendingTutorAssignedNotApproved &&
              localStorage.getItem("userRole") !== "CoordinatorAdmin" &&
              localStorage.getItem("userRole") !== "Tutor" && (
              <ModalFooter className="bg-light">
                <Col size="12">
                  <ul className="align-center flex-wrap flex-sm-nowrap gx-4 gy-2">
                    <li>
                      <Button
                        color="primary"
                        size="md"
                        disabled={isAssigning}
                        onClick={() => {
                          const inputData = {
                            SalesId: salesId,
                            SaleseDetailsId: salesDetailsId,
                            UserId: userId,
                            Status: salesDetails?.statusTypeCode,
                            TutorId: salesDetails?.tutorId,
                            StatusId: salesDetails?.status,
                            TutorPayment: salesDetails?.tutorPayment,
                            NoteText: "",
                          };
                          setIsAssigning(true);
                          updateStatus(inputData).then(() => {
                            setIsAssigning(false);
                            setShowSalesDetails(false);
                            fetchNotifications(userId).then((data) => {
                              setNotificationDataSource(data);
                            });
                            toast.success("Tutor assigned successfully.", {
                              position: "top-right",
                              autoClose: true,
                              hideProgressBar: true,
                              closeOnClick: true,
                              pauseOnHover: true,
                              draggable: true,
                              progress: false,
                              closeButton: <CloseButton />,
                            });
                          }).catch(() => setIsAssigning(false));
                        }}
                      >
                        {isAssigning ? (
                          <>
                            <Spinner size="sm" className="mr-1" /> Assigning...
                          </>
                        ) : (
                          <>
                            <Icon name="user-add" /> Assign Tutor
                          </>
                        )}
                      </Button>
                    </li>
                  </ul>
                </Col>
              </ModalFooter>
            )}
            {(currentNotificationType == NotificationType.TutorAssigned ||
              currentNotificationType == NotificationType.ApproveTutorAssignment ||
              localStorage.getItem("userRole") === "CoordinatorAdmin") &&
              localStorage.getItem("userRole") !== "Tutor" &&
              salesDetails?.statusTypeCode == FollowUpStatus.DemoPendingTutorAssignedNotApproved && (
                <ModalFooter className="bg-light modal-footer-custom">
                  <Col size="8"></Col>
                  <Col size="4">
                    <ul className="align-center flex-wrap flex-sm-nowrap gx-4 gy-2">
                      <li>
                        <Button
                          color="primary"
                          size="md"
                          disabled={isApproving || isRejecting || (localStorage.getItem("userRole") === "CoordinatorAdmin" && tutorHasAvailability === false)}
                          onClick={() => {
                            if (!salesDetails?.tutorId || salesDetails.tutorId === defaultGuid) {
                              toast.error("Please select a tutor before approving.", {
                                position: "top-right",
                                autoClose: true,
                                hideProgressBar: true,
                                closeOnClick: true,
                              });
                              return;
                            }
                            const typeCode = unFillterdStatusList.find(
                              (f) => f.code == FollowUpStatus.DemoPendingTutorAssignedApproved
                            );
                            if (!typeCode) return;
                            const inputData = {
                              SalesId: salesId,
                              SaleseDetailsId: salesDetailsId,
                              UserId: userId,
                              Status: typeCode.code,
                              TutorId: salesDetails?.tutorId,
                              StatusId: typeCode.value,
                              TutorPayment: salesDetails?.requestedTutorPayment ?? salesDetails?.tutorPayment,
                              NoteText: "",
                            };
                            setIsApproving(true);
                            updateStatus(inputData).then(() => {
                              setShowSalesDetails(false);
                              setIsApproving(false);
                              fetchNotifications(userId).then((data) => {
                                setNotificationDataSource(data);
                              });
                              toast.success("Tutor assignment approved.", {
                                position: "top-right",
                                autoClose: true,
                                hideProgressBar: true,
                                closeOnClick: true,
                                pauseOnHover: true,
                                draggable: true,
                                progress: false,
                                closeButton: <CloseButton />,
                              });
                            }).catch(() => setIsApproving(false));
                          }}
                        >
                          {isApproving ? (
                            <>
                              <Spinner size="sm" className="mr-1" /> Approving...
                            </>
                          ) : (
                            <>
                              <Icon name="user-check"></Icon> Approve
                            </>
                          )}
                        </Button>
                      </li>
                      <li>
                        <Button
                          color="btn btn-danger btn-md"
                          size="md"
                          disabled={isApproving || isRejecting}
                          onClick={() => {
                            if (!salesDetails?.tutorId || salesDetails.tutorId === defaultGuid) {
                              toast.error("Please select a tutor before rejecting.", {
                                position: "top-right",
                                autoClose: true,
                                hideProgressBar: true,
                                closeOnClick: true,
                              });
                              return;
                            }
                            const typeCode = unFillterdStatusList.find((f) => f.code == FollowUpStatus.Reject);
                            if (!typeCode) return;
                            const inputData = {
                              SalesId: salesId,
                              SaleseDetailsId: salesDetailsId,
                              UserId: userId,
                              Status: typeCode.code,
                              TutorId: salesDetails?.tutorId,
                              StatusId: typeCode.value,
                              TutorPayment: salesDetails?.tutorPayment,
                              NoteText: "",
                            };
                            setIsRejecting(true);
                            updateStatus(inputData).then(() => {
                              setShowSalesDetails(false);
                              setIsRejecting(false);
                              fetchNotifications(userId).then((data) => {
                                setNotificationDataSource(data);
                              });
                              toast.success("Tutor assignment rejected.", {
                                position: "top-right",
                                autoClose: true,
                                hideProgressBar: true,
                                closeOnClick: true,
                                pauseOnHover: true,
                                draggable: true,
                                progress: false,
                                closeButton: <CloseButton />,
                              });
                            }).catch(() => setIsRejecting(false));
                          }}
                        >
                          {isRejecting ? (
                            <>
                              <Spinner size="sm" className="mr-1" /> Rejecting...
                            </>
                          ) : (
                            <>
                              <Icon name="user-cross" /> Reject
                            </>
                          )}
                        </Button>
                      </li>
                    </ul>
                  </Col>
                </ModalFooter>
              )}
          </Modal>

          <ToastContainer />
        </Content>
      </React.Fragment>
    </>
  );
};

export default TCTUserNotificationList;
