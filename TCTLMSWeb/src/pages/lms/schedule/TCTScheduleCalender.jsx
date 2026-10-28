import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import "react-phone-number-input/style.css";
import { ToastContainer } from "react-toastify";
import { toast } from "react-toastify";
import CalenderApp from "../../../components/partials/calender/Calender";
import { getTutorScheduleDetails, updateScheduleApprovalStatus, getBlockedPlans, getAllScheduleDetails } from "../../../apiservices/ScheduleService";
import { useForm } from "react-hook-form";
import { setDateForPicker } from "../../../utils/Utils";
import {
  FollowUpStatus,
  ExtraClassStatusCodes,
  ExtraClassColor,
  ClassStatusEventStyles,
} from "../../../utils/Utils";
import { getLookups } from "../../../apiservices/LookupsService";

// Class Status codes (lookup 1009) on a schedule row from getScheduleDetailsById: the viewer's own
// status first, then the tutor's, operations' and student's stored status ids. statusCodes maps
// lowercase lookup id -> TypeCodeValue.
const getClassStatusCodes = (item, statusCodes) =>
  [
    Number(item.scheduleStatusCode) || null,
    ...[item.tutorScheduleStatus, item.operationScheduleStatus, item.studentScheduleStatus].map((id) =>
      id ? statusCodes.get(String(id).toLowerCase()) : null,
    ),
  ].filter(Boolean);

// Calendar category: "extra" | "demo" | "regular". Extra Class / Preponed / Postponed
// (1009008-1009010), set by any party, are all the Extra Class category.
const getScheduleCategory = (item, statusCodes) => {
  if (item.scheduleType !== "Class") return "demo";
  return getClassStatusCodes(item, statusCodes).some((code) => ExtraClassStatusCodes.includes(code))
    ? "extra"
    : "regular";
};

// Calendar card class. Priority: blocked -> Demo (cyan) -> Extra Class (orange) -> a regular class's
// Class Status colour -> existing Regular Class (violet).
const getScheduleEventClass = (item, statusCodes, isBlocked) => {
  if (isBlocked) return "fc-event-blocked";
  const category = getScheduleCategory(item, statusCodes);
  if (category === "extra") return "fc-event-extra";
  if (category === "regular") {
    const statusCode = getClassStatusCodes(item, statusCodes).find((code) => ClassStatusEventStyles[code]);
    if (statusCode) return ClassStatusEventStyles[statusCode].className;
  }
  return item.scheduleType === "Class"
    ? item.scheduleStatusCode === "20020"
      ? "fc-event-primary-completed"
      : "fc-event-primary"
    : "bg-info text-white";
};

// Student calendar: the attendance a student sees for a regular class.
//  - the tutor and Operations recorded the same status -> that status;
//  - they differ, but Operations cross-checked it -> "TCT Attendance: <status the cross-check chose>"
//    (Go with tutors attendance: tutor's; Go with operation attendance: Operations'; Ops Approved: Operations' if recorded, else tutor's);
//  - otherwise (one side only, or not cross-checked yet) -> not confirmed yet.
// classStatuses: lookup 1009 rows; crossChecks: lowercase lookup-1013 id -> code.
const getStudentAttendance = (item, classStatuses, crossChecks) => {
  if (item.scheduleType !== "Class") return null;
  const byId = (id) => (id ? classStatuses.find((s) => String(s.id).toLowerCase() === String(id).toLowerCase()) : null);
  const toStatus = (row) => (row ? { id: row.id, code: Number(row.typeCodeValue), name: row.typeCodeName?.trim() } : null);
  const tutor = toStatus(byId(item.tutorScheduleStatus));
  // Operations' own record is the status text (ScheduleDetails.Status), e.g. "Class Completed".
  const opsName = (item.status || "").trim();
  const ops = opsName
    ? toStatus(classStatuses.find((s) => s.typeCodeName?.trim().toLowerCase() === opsName.toLowerCase())) ||
      { id: null, code: null, name: opsName }
    : null;
  const crossCheck = item.operationScheduleStatus ? crossChecks.get(String(item.operationScheduleStatus).toLowerCase()) : null;

  if (tutor && ops && tutor.name.toLowerCase() === ops.name.toLowerCase()) return { ...tutor, label: tutor.name };
  const chosen =
    crossCheck === 1013002 ? tutor : crossCheck === 1013003 ? ops : crossCheck === 1013001 ? ops || tutor : null;
  if (chosen) return { ...chosen, label: `TCT Attendance: ${chosen.name}` };
  return { id: null, code: null, name: null, label: "Attendance not confirmed yet" };
};

const TCTScheduleCalender = (props) => {
  const userRole = localStorage.getItem("userRole")?.trim();
  const canApprove = ["Accounts", "AccountsAdmin"].includes(userRole);
  // A student's own calendar is view-only and shows the agreed / cross-checked attendance.
  const isStudentViewer = userRole === "Student";
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const selectedStudentId = searchParams.get("id");
  const requestedMonth = Number(searchParams.get("month"));
  const requestedYear = Number(searchParams.get("year"));
  const initialCalendarDate = requestedMonth >= 1 && requestedMonth <= 12 && requestedYear > 0
    ? new Date(requestedYear, requestedMonth - 1, 1)
    : new Date();
  const [currentDate, setCurrentDate] = useState(initialCalendarDate);
  
  const stuName = searchParams.get("stuName");
  const tutorName = searchParams.get("tutorName");
  const grade = searchParams.get("grade");
  const board = searchParams.get("board");

  const [modal, setModal] = useState(false);
  const [mockEvents, updateEvent] = useState([]);
  const [approvalStatus, setApprovalStatus] = useState(null);  
  const [approvalSubmitting, setApprovalSubmitting] = useState(false);
  const [dates, setDates] = useState({
    startDate: new Date(),
    startTime: new Date(),
    endTime: new Date(),
    endDate: new Date(),
  });
  const [theme, settheme] = useState("");

  const toggle = () => {
    setModal(!modal);
  };

  useEffect(() => {
    getTutorScheduledEvent(initialCalendarDate);
  }, []);

  // Optional embedding props (e.g. the chat attendance panel); the calendar routes don't pass them.
  // filterStudentId: show only that student's classes (the role's usual scope is kept, then narrowed).
  // guestUserId: whose schedule to query for the "student"/"tutor" guest types (default: logged-in user).
  const filterStudentId = props?.filterStudentId ? String(props.filterStudentId).toLowerCase() : null;

  const getTutorScheduledEvent = React.useCallback((date = new Date()) => {
    let userId = localStorage.userId;
    if (selectedStudentId && !filterStudentId) {
      userId = selectedStudentId;
    }
    if (filterStudentId && props?.guestUserId) {
      userId = props.guestUserId;
    }

    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    // A selected id belongs to the calendar being opened. Preserve the page's guest
    // type so tutor links are queried as tutors and student links as students.
    const guest =
      canApprove && !selectedStudentId
        ? "accounts"
        : selectedStudentId
        ? props?.guestType
        : ["Operations", "OperationAdmin", "OperationsAdmin"].includes(localStorage.userRole)
        ? "operation"
        : localStorage.userRole === "Coordinator"
          ? "coordinator"
          : props?.guestType;
    if (guest == "operation" || guest == "coordinator") {
      userId = localStorage.userId;
    }

    // Flag exhausted/unpaid packages. The API enforces attendance and scheduling rules.
    const blockedPromise = getBlockedPlans()
      .then((r) => {
        const ids = r?.data ?? r;
        if (!Array.isArray(ids)) throw new Error("Unable to verify package status.");
        return new Set(ids.map((g) => String(g).toLowerCase()));
      });

    // Class Status lookup (1009): id -> code, so any party's stored status (tutor / student /
    // operations) can classify the event in every calendar.
    const statusRowsPromise = getLookups("1009")
      .then((rows) => rows ?? [])
      .catch(() => []);
    const statusCodesPromise = statusRowsPromise.then(
      (rows) => new Map(rows.map((s) => [String(s.id).toLowerCase(), Number(s.typeCodeValue)])),
    );
    // Students: the Operations cross-check lookup (1013), for the attendance they are shown.
    const crossChecksPromise = isStudentViewer
      ? getLookups("1013")
          .then((rows) => new Map((rows ?? []).map((s) => [String(s.id).toLowerCase(), Number(s.typeCodeValue)])))
          .catch(() => new Map())
      : Promise.resolve(new Map());

    // viewAll (Operations "View Calendar"): every tutor's and student's classes, read-only.
    const schedulePromise = props?.viewAll
      ? getAllScheduleDetails(month, year)
      : getTutorScheduleDetails(userId, guest, month, year);

    Promise.all([blockedPromise, schedulePromise, statusCodesPromise, statusRowsPromise, crossChecksPromise])
      .then(([blockedSet, response, statusCodes, statusRows, crossChecks]) => {
        if (!response || !response.data) {
          updateEvent([]);
          setApprovalStatus(null);
          return;
        }

        var respData = response.data.data ?? response.data;
        if (!Array.isArray(respData) || respData.length === 0) {
          updateEvent([]);
          setApprovalStatus(null);
          return;
        }

        // Approval belongs to the schedules shown in this month, not to the
        // calendar component across month navigation or page refreshes.
        const approvalCodes = [...new Set(respData.map((item) => item.accountsApprovalStatusCode))];
        const persistedStatus = approvalCodes.length === 1
          ? ({ 1014001: "Approved", 1014002: "On-Hold", 1014004: "Rejected" })[approvalCodes[0]] || null
          : null;
        setApprovalStatus(persistedStatus);

        const scopedData = filterStudentId
          ? respData.filter((item) => String(item?.studentId || "").toLowerCase() === filterStudentId)
          : respData;
        const _events = scopedData.map((item) => {
          const isBlocked = blockedSet.has(String(item.salesDetailsId || "").toLowerCase());
          const isOperationsViewer = ["Operations", "OperationAdmin", "OperationsAdmin"].includes(userRole);
          // Operations can always edit the class status (also after the cross-check);
          // tutors and students keep their saved-status lock.
          const disableAttendance = isOperationsViewer ? false : item.disableActions;
          // Student: colour and status come from the agreed / cross-checked attendance only.
          const attendance = isStudentViewer ? getStudentAttendance(item, statusRows, crossChecks) : null;
          const studentClassName = !attendance
            ? null
            : isBlocked
            ? "fc-event-blocked"
            : ExtraClassStatusCodes.includes(attendance.code)
            ? "fc-event-extra"
            : ClassStatusEventStyles[attendance.code]?.className || "fc-event-primary";
          return {
            id: `default-event-id-${item.scheduleDetailsId}`,
            scheduleDetailsId: item.scheduleDetailsId,
            scheduleId: item.scheduleId,       // ← added
            studentId: item.studentId,         // ← added
            title: item.title,
            start: item.startDate,
            end: item.endDate,
            startTime: item.startTime,
            endTime: item.endTime,
            comment: item.comment,
            tutorComment: item.tutorComment,
            studentComment: item.studentComment,
            studentName: item.studentName,
            tutorName: item.tutorName,
            subjectName: item.subjectName,
            subjectId: item.subjectId,
            scheduleType: item.scheduleType,
            isBlocked,
            // Blocked classes render red; everything else keeps its existing colour.
            ...(isBlocked ? { backgroundColor: "#dc3545", borderColor: "#b02a37" } : {}),
            // Category / Class Status colour (see getScheduleEventClass); blocked keeps precedence.
            className: studentClassName || getScheduleEventClass(item, statusCodes, isBlocked),
            meetingLink: item.meetingLink,
            tutorUserId: item.tutorUserId,
            studentUserId: item.studentUserId,
            scheduleStatusName: item.scheduleStatusName,
            // When Operations opens a student's calendar, the API query runs in
            // student context. Use Operations' own status so Tutor/Student
            // attendance does not hide the Operations Save button.
            canDisable: disableAttendance,
            // Tutor/student: their request to unlock a saved status (Pending / Approved / Rejected).
            editRequestStatus: item.editRequestStatus,
            scheduleStatus: attendance ? attendance.id : item.scheduleStatus,
            tutorScheduleStatus: item.tutorScheduleStatus,
            studentScheduleStatus: attendance ? attendance.id : item.studentScheduleStatus,
            operationScheduleStatus: item.operationScheduleStatus,
            // Shown in the student's (read-only) class popup.
            attendanceLabel: attendance?.label,
            salesId: item.salesId,
            salesDetailsId: item.salesDetailsId,
          };
        });

        updateEvent(_events);
      })
      .catch((error) => {
        console.error("Error fetching schedule:", error);
        updateEvent([]);
        toast.error("Unable to load schedules and payment status. Please retry.");
      });
  }, [props?.guestType, searchParams, filterStudentId, props?.guestUserId]);

  useEffect(() => {
    if (props.refreshKey > 0) getTutorScheduledEvent(currentDate);
  }, [props.refreshKey]);

  const { errors, register, handleSubmit } = useForm();

  const handleApprovalAction = async (actionCode) => {
    const scheduleIds = [...new Set(mockEvents.map((e) => e.scheduleId).filter(Boolean))];
    const studentId = mockEvents[0]?.studentId;

    if (!studentId || scheduleIds.length === 0) {
      toast.error("No student schedules are available for approval this month.");
      return;
    }

    try {
      setApprovalSubmitting(true);
      const response = await updateScheduleApprovalStatus(actionCode, studentId, scheduleIds, localStorage.userId);

      const succeeded = response?.data?.succeeded ?? response?.succeeded ?? false;

      if (succeeded === true) {
        if (actionCode === "1014001") {
          setApprovalStatus("Approved");
          toast.success("Approved successfully!", { position: "top-right", autoClose: true });
        } else if (actionCode === "1014002") {
          setApprovalStatus("On-Hold");
          toast.success("Marked as On-Hold!", { position: "top-right", autoClose: true });
        } else if (actionCode === "1014004") {
          setApprovalStatus("Rejected");
          toast.success("Rejected successfully!", { position: "top-right", autoClose: true });
        }
      } else {
        const message = response?.data?.message ?? response?.message ?? "Action failed. Please try again.";
        toast.error(message, { position: "top-right", autoClose: true });
      }
    } catch (error) {
      // ✅ Network or unexpected error
      console.error("Approval action failed:", error);
      toast.error("Something went wrong. Please try again.", {
        position: "top-right",
        autoClose: true,
      });
    } finally {
      setApprovalSubmitting(false);
    }
  };

  const handleFormSubmit = (formData) => {
    let newEvent = {
      id: "default-event-id-" + Math.floor(Math.random() * 9999999),
      title: formData.title,
      start: setDateForPicker(dates.startDate),
      end: setDateForPicker(dates.endDate),
      description: formData.description,
      className: theme.value,
      type: theme,
    };
    updateEvent([...mockEvents, newEvent]);
    settheme({ value: "fc-event-primary", label: "Company" });
    toggle();
  };

  const editEvent = (action, message) => {
    if (action != "close") {
      toast.success(message, {
        position: "top-right",
        autoClose: true,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: false,
      });
      getTutorScheduledEvent(currentDate);
    }
  };

  const deleteEvent = (id) => {
    let filteredEvents = mockEvents.filter((item) => item.id !== id);
    updateEvent(filteredEvents);
  };

  const handleDateChange = (newDate) => {
    setCurrentDate(newDate);
    setApprovalStatus(null);
    getTutorScheduledEvent(newDate);
  };

  // Label color mapping
  const statusLabelStyle = {
    Approved: { backgroundColor: "#007bff" },
    "On-Hold": { backgroundColor: "#ffc107" },
    Rejected: { backgroundColor: "#dc3545" },
  };

  return (
    <>
      {/* ── Student Information Header ── */}
      {stuName && (
        <div style={{ padding: "10px 16px", backgroundColor: "#f5f6fa", borderBottom: "1px solid #dbdfea", marginBottom: "10px" }}>
          <h5 style={{ margin: 0, fontSize: "16px", color: "#364a63" }}>
            Student: <span style={{ fontWeight: "bold" }}>{stuName}</span>
            {grade && <> | Grade: <span style={{ fontWeight: "bold" }}>{grade}</span></>}
            {board && <> | Board: <span style={{ fontWeight: "bold" }}>{board}</span></>}
          </h5>
        </div>
      )}
      {props?.guestType?.toLowerCase() === "tutor" && (tutorName || mockEvents[0]?.tutorName) && (
        <div style={{ padding: "10px 16px", backgroundColor: "#f5f6fa", borderBottom: "1px solid #dbdfea", marginBottom: "10px" }}>
          <h5 style={{ margin: 0, fontSize: "16px", color: "#364a63" }}>
            Tutor: <span style={{ fontWeight: "bold" }}>{tutorName || mockEvents[0]?.tutorName}</span>
          </h5>
        </div>
      )}
      {/* ── Calendar Legend + Action Buttons ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px" }}>

        {/* Left: Legend */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ display: "inline-block", width: "14px", height: "14px", borderRadius: "3px", backgroundColor: "#6576ff" }} />
            <span style={{ fontSize: "12px", color: "#526484" }}>Regular Class</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ display: "inline-block", width: "14px", height: "14px", borderRadius: "3px", backgroundColor: "#00bcd4" }} />
            <span style={{ fontSize: "12px", color: "#526484" }}>Demo Class</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ display: "inline-block", width: "14px", height: "14px", borderRadius: "3px", backgroundColor: ExtraClassColor.background }} />
            <span style={{ fontSize: "12px", color: "#526484" }}>Extra Class</span>
          </div>
        </div>

        {/* Right: Approval Buttons or Status Label */}
        {canApprove && selectedStudentId && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>

            {/* Status label - always show if set */}
            {approvalStatus && (
              <span style={{
                ...statusLabelStyle[approvalStatus],
                color: "#fff",
                borderRadius: "4px",
                padding: "6px 14px",
                fontSize: "13px",
                fontWeight: "500",
              }}>
                {approvalStatus}
              </span>
            )}

            {/* Approve button — hide only when Approved */}
            {approvalStatus !== "Approved" && (
              <button
                disabled={approvalSubmitting || mockEvents.length === 0}
                onClick={() => handleApprovalAction("1014001")}
                style={{ backgroundColor: "#007bff", color: "#fff", border: "none", borderRadius: "4px", padding: "6px 16px", fontSize: "13px", cursor: "pointer" }}
              >
                Approve
              </button>
            )}

            {/* Reject button — always show unless Approved */}
            {approvalStatus !== "Approved" && (
              <button
                disabled={approvalSubmitting || mockEvents.length === 0}
                onClick={() => handleApprovalAction("1014004")}
                style={{ backgroundColor: "#dc3545", color: "#fff", border: "none", borderRadius: "4px", padding: "6px 16px", fontSize: "13px", cursor: "pointer" }}
              >
                Reject
              </button>
            )}

            {/* Hold button — always show unless Approved */}
            {approvalStatus !== "Approved" && (
              <button
                disabled={approvalSubmitting || mockEvents.length === 0}
                onClick={() => handleApprovalAction("1014002")}
                style={{ backgroundColor: "#ffc107", color: "#fff", border: "none", borderRadius: "4px", padding: "6px 16px", fontSize: "13px", cursor: "pointer" }}
              >
                Hold
              </button>
            )}

          </div>
        )}
      </div>

      {/* Class Status colours (regular classes), from ClassStatusEventStyles via the theme's fc-event-* classes */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px 14px", padding: "0 16px 8px" }}>
        <span style={{ fontSize: "11px", color: "#8094ae" }}>Class status:</span>
        {Object.values(ClassStatusEventStyles).map((style) => (
          <span key={style.className} className={style.className} style={{ display: "flex", alignItems: "center", fontSize: "11px", color: "#526484" }}>
            <span className="dot" style={{ width: "10px", height: "10px", borderRadius: "50%", marginRight: "5px" }} />
            {style.label}
          </span>
        ))}
      </div>

      <CalenderApp
        guestType={props?.guestType}
        events={mockEvents}
        onDelete={deleteEvent}
        onEdit={editEvent}
        scheduleType={props?.guestType}
        onMonthChange={handleDateChange}
        initialDate={initialCalendarDate}
        readOnly={Boolean(props?.viewAll) || isStudentViewer}
        targetUserId={selectedStudentId}
        selectedScheduleDetailsId={searchParams.get("scheduleDetailsId")}
      />
      <ToastContainer />
    </>
  );
};

export default TCTScheduleCalender;
