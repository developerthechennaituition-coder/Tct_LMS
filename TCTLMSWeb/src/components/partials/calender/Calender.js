import React, { useEffect, useState, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import bootstrapPlugin from "@fullcalendar/bootstrap";
import DatePicker from "react-datepicker";
import ClassStatusUpdate from "../../../pages/lms/common/ClassStatusUpdate";
import ScheduleDemo from "../../../pages/lms/common/ScheduleDemo";
import AvailabilityCalendar from "../../../pages/lms/common/AvailabilityCalendar";
import AvailabilityComparisonModal from "../../../pages/lms/common/AvailabilityComparisonModal";
import Swal from "sweetalert2";
import {
  BlockDes,
  Block,
  BlockBetween,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Col,
  Icon,
  PreviewAltCard,
  PreviewCard,
  ProjectCard,
  Row,
  ReactDataTable,
  Rating,
  RSelect,
} from "../../../components/Component";
import {
  Popover,
  PopoverHeader,
  PopoverBody,
  ModalHeader,
  Modal,
  ModalBody,
  FormGroup,
  Button,
  Form,
  Label,
  Spinner,
} from "reactstrap";
import { useForm } from "react-hook-form";
import { ClassStatusTypes, ExtraClassStatusCodes, setDateForPicker } from "../../../utils/Utils";
import { eventOptions, returnDate } from "./CalenderData";
import { getLookups, getAllRoles } from "../../../apiservices/LookupsService";
import { useDispatch } from "react-redux";
import { setSelectedDate } from "../../../features/calendarSlice";
import {
  updateScheduleStatus,
  getLookupForClassStatus,
  UpdateScheduleDetail,
  addRating,
  checkCanCancelClass,
  updatescheduledetails,
  getTutorScheduleDetails,
  requestClassStatusEdit,
} from "../../../apiservices/ScheduleService";
import {
  getCurrentTutorContext,
  getTutorDashboardStudents,
  getCurrentStudentContext,
  getStudentDashboardCourses,
} from "../../../apiservices/DashboardService";
import { getEnrolledCoursesByUser } from "../../../apiservices/StudentEnrollmentService";
import { scheduleEvent } from "../../../apiservices/UserService";
import moment from "moment";
import { GetSalesDetails } from "../../../apiservices/NofiticationService";
import { FollowUpStatus, GetClassNoteLabel } from "../../../utils/Utils";
import PaymentPlanModal from "../../../pages/lms/students/PaymentPlanModal";
import { toast } from "react-toastify";

// Class statuses that let the tutor move this occurrence's scheduled Start/End Time.
const isScheduledTimeEditStatus = (code) => ExtraClassStatusCodes.includes(Number(code));

const EventTooltip = (props) => {
  const event = props.eventData;
  return (
    <>
      <Row className="gy-3 py-1 p-2">
        <Col sm="12">
          <div className="d-flex flex-row">
            <div class="user-avatar bg-purple-dim">
              <span>
                <Icon name="book-read"></Icon>
              </span>
            </div>
            <div className="d-flex align-items-center p-1">
              <p id="preview-event-start">
                {event?.subjectName?.length > 10 ? event?.subjectName?.substring(0, 10) + "..." : event?.subjectName}
              </p>
            </div>
            <div className="tooltip-card-right">
              <h6 className="overline-title">{event && moment(event?.start).format("DD-MM-YYYY")}</h6>
              <p id="preview-event-start">
                <Icon name="clock" />
                {event && moment(event?.start).format("hh:mm")}
                {" - "} {event && moment(event?.end).format("hh:mm")}
              </p>
            </div>
          </div>
        </Col>
        {["operation", "operations", "coordinator"].includes(props?.guestType?.toLowerCase()) ? (
          <>
            <Col sm="12">
              <h6 className="overline-title">Tutor Name</h6>
              <p id="preview-event-start">{event?.tutorName}</p>
            </Col>
            <Col sm="12">
              <h6 className="overline-title">Student Name</h6>
              <p id="preview-event-start">{event?.studentName}</p>
            </Col>
          </>
        ) : props?.guestType?.toLowerCase() === "tutor" ? (
          <>
            <Col sm="12">
              <h6 className="overline-title">Student Name</h6>
              <p id="preview-event-start">{event?.studentName}</p>
            </Col>
          </>
        ) : (
          <>
            <Col sm="12">
              <h6 className="overline-title">Tutor Name</h6>
              <p id="preview-event-start">{event?.tutorName}</p>
            </Col>
          </>
        )}

        {event.scheduleStatusName != null && event.scheduleStatusName != "" && (
          <Col sm="10" id="preview-event-description-check">
            <h6 className="overline-title">Status</h6>
            <p id="preview-event-description">{event && event.scheduleStatusName}</p>
          </Col>
        )}

        <Col sm="10" id="preview-event-description-check">
          <h6 className="overline-title">Class Link</h6>
          <p id="preview-event-description">{event && event.meetingLink}</p>
        </Col>
      </Row>
    </>
  );
};

// stableHover (opt-in, My Calendar only): the hover card stays open while the pointer is on it and
// closes shortly after the pointer leaves both the event and the card, so crossing the gap to the card,
// or the card covering the pointer, no longer closes and re-opens it. Without the prop nothing changes.
const HOVER_CLOSE_DELAY_MS = 150;
const STABLE_HOVER_POPPER_MODIFIERS = {
  // Position against the browser window (not the calendar's scroll box), flipping cleanly between sides
  // instead of being pushed onto the event it describes.
  flip: { behavior: ["bottom", "top", "right", "left"], boundariesElement: "viewport" },
  preventOverflow: { boundariesElement: "viewport" },
};

// The one stable hover card currently open; opening another closes it at once, so moving straight
// from one event to the next never shows two cards during the close delay.
let closeActiveStableHover = null;

const EventView = ({ event, events, guestType, stableHover = false }) => {
  const loggedinUser = localStorage.getItem("userRole")?.toLowerCase();
  if (loggedinUser != guestType) {
    guestType = loggedinUser;
  }
  const [mouseEnter, setMouseEnter] = useState(false);
  const closeTimer = useRef(null);
  const closeNow = useRef(null);
  closeNow.current = () => {
    clearTimeout(closeTimer.current);
    setMouseEnter(false);
  };
  useEffect(
    () => () => {
      clearTimeout(closeTimer.current);
      if (closeActiveStableHover === closeNow) closeActiveStableHover = null;
    },
    []
  );
  const openHover = () => {
    clearTimeout(closeTimer.current);
    if (stableHover) {
      if (closeActiveStableHover && closeActiveStableHover !== closeNow) closeActiveStableHover.current?.();
      closeActiveStableHover = closeNow;
    }
    setMouseEnter(true);
  };
  const closeHover = () => {
    if (!stableHover) {
      setMouseEnter(false);
      return;
    }
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setMouseEnter(false), HOVER_CLOSE_DELAY_MS);
  };
  const { title, extendedProps, publicId } = event.event._def;
  const _publicId = event.event._def.publicId + event.event._def.extendedProps.scheduleDetailsId;
  const _eventData = events.find((item) => item.scheduleDetailsId === extendedProps.scheduleDetailsId);
  return (
    <React.Fragment>
      {/* Month view: a small chip per class with only time and student name (full details in the
          hover tooltip / click popup), so many classes fit in one day. Week / Day / List keep the text card. */}
      {_eventData?.isFollowUp ? (
        // My Calendar follow-up window: a labelled bar instead of class times.
        <div
          id={_publicId}
          className="tct-event-content tct-followup-bar"
          onMouseEnter={openHover}
          onMouseLeave={closeHover}
        >
          <span className="tct-chip-name">
            {_eventData.statusLabel} · {_eventData.studentName}
          </span>
        </div>
      ) : event?.view?.type === "dayGridMonth" ? (
        <div
          id={_publicId}
          className="tct-event-square"
          onMouseEnter={openHover}
          onMouseLeave={closeHover}
        >
          <span className="tct-chip-time">
            {moment(_eventData?.start).format("hh:mm")}-{moment(_eventData?.end).format("hh:mm")}
          </span>
          <span className="tct-chip-name">
            {guestType?.toLowerCase() === "student" ? _eventData?.tutorName : _eventData?.studentName}
          </span>
        </div>
      ) : (
      <div
        id={_publicId}
        className="tct-event-content"
        onMouseEnter={openHover}
        onMouseLeave={closeHover}
      >
        {_eventData?.isBlocked && (
          <span style={{ fontWeight: 700 }}>🔒 BLOCKED<br /></span>
        )}
        <span className="tct-event-time">
          {event && moment(_eventData?.start).format("hh:mm")}
          {" - "} {event && moment(_eventData?.end).format("hh:mm")}
        </span>
        <br></br>
        {["operation", "operations", "coordinator"].includes(guestType?.toLowerCase()) ? (
          <span className="tct-event-details">
            {_eventData?.subjectName}: Tut: {_eventData?.tutorName} <br></br> Stu: {_eventData?.studentName}
          </span>
        ) : guestType?.toLowerCase() === "tutor" ? (
          <span className="tct-event-details">
            {_eventData?.subjectName} - Stu: {_eventData?.studentName}
          </span>
        ) : (
          <span className="tct-event-details">
            {_eventData?.subjectName} - Tut: {_eventData?.tutorName}
          </span>
        )}
      </div>
      )}{" "}
      {stableHover ? (
        <Popover
          placement="bottom"
          // Closed when this event's data is gone (e.g. the events list was reloaded or filtered while the
          // card was open), so the card never renders without data.
          isOpen={mouseEnter && Boolean(_eventData)}
          target={_publicId}
          trigger="manual"
          modifiers={STABLE_HOVER_POPPER_MODIFIERS}
          // No fade: reactstrap keeps a closing popover fully visible for the fade time (its "show"
          // class stays on), so moving to the next event would briefly show two cards.
          fade={false}
        >
          <div onMouseEnter={openHover} onMouseLeave={closeHover}>
            {_eventData?.isFollowUp ? (
              <div className="p-2" style={{ minWidth: 220 }}>
                <h6 className="overline-title">{_eventData.markerHeading || "Follow-up"}</h6>
                <p className="mb-1" style={{ fontWeight: 600 }}>{_eventData.statusLabel}</p>
                <p className="mb-1">
                  {_eventData.markerDateText ||
                    `${moment(_eventData.followUpStart).format("DD-MMM-YYYY")} – ${moment(_eventData.followUpEnd).format("DD-MMM-YYYY")}`}
                </p>
                <h6 className="overline-title mt-2">Student</h6>
                <p className="mb-1">{_eventData.studentName}</p>
                <h6 className="overline-title mt-2">Subject · Tutor</h6>
                <p className="mb-0">{_eventData.subjectName} · {_eventData.tutorName}</p>
              </div>
            ) : _eventData ? (
              // reactstrap renders the content once more while closing; skip it when the data is gone.
              <EventTooltip
                subjectName={_eventData?.subjectName}
                guestType={guestType}
                eventData={_eventData}
                title={_eventData?.title}
              ></EventTooltip>
            ) : null}
          </div>
        </Popover>
      ) : (
        <Popover placement="bottom" isOpen={mouseEnter} target={_publicId}>
          <EventTooltip
            subjectName={_eventData?.subjectName}
            guestType={guestType}
            eventData={_eventData}
            title={_eventData?.title}
          ></EventTooltip>
        </Popover>
      )}
    </React.Fragment>
  );
};

// readOnly (Operations "View Calendar"): events can be viewed but not created, edited, moved or saved.
// targetUserId: user id of the person whose calendar is open (?id=...), when it is not the logged-in user.
// selectedScheduleDetailsId: opens that class's popup once its month has loaded (chat deep link).
// onEventClick (opt-in, My Calendar): called with the clicked event's data instead of opening the built-in
// popup. Without it, clicks behave exactly as before.
const CalenderApp = ({ events, onDelete, onEdit, scheduleType, onMonthChange, initialDate, readOnly = false, targetUserId, selectedScheduleDetailsId, stableHover = false, onEventClick }) => {
  const openedClass = useRef(null);
  const userRole = localStorage.getItem("userRole")?.trim();
  const cancelledCount = 2;
  const thresholdLimit = 3;
  const calendarRef = useRef(null);
  const clickTimerRef = useRef(null);
  const dateRightClickRef = useRef(null);
  const lastCalledMonthYear = useRef("");
  const [documentTypes, setDocumentTypes] = useState([]);
  const [modalState, updateModal] = useState(false);
  const [tutorModalState, setTutorModalState] = useState(false);
  const [statusList, setStatusList] = useState([]);
  const [eventStatusCode, setEventStatusCode] = useState("");
  const [statusTypeId, setStatusTypeId] = useState("");
  const [mockEvents, updateEvents] = useState(events);
  const [event, updateEvent] = useState({});
  const [theme, settheme] = useState();
  const [edit, updateEditModal] = useState(false);
  const defaultGuid = "00000000-0000-0000-0000-000000000000";
  const [commentText, setCommentText] = useState("");
  const [file, setFile] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState(null);
  const [error, setDateError] = useState("");
  const [noteTextLabel, setNoteTextLabel] = useState("Feedback/Comments");
  // "Request for Re-schedule" by a tutor/student: Temporary (Operations are notified) or Permanent (Operations approve),
  // with the green slot picked as the new time.
  const [rescheduleType, setRescheduleType] = useState("");
  const [preferredSlot, setPreferredSlot] = useState(null);
  const isOperationsUser = ["Operations", "OperationAdmin", "OperationsAdmin"].includes(localStorage.getItem("userRole"));
  const [statusModal, setStatusModal] = useState(false);
  const [salesDetails, setSalesDetails] = useState(null);
  const [dataItem, setDataItem] = useState(null);
  const [scheduleDemoModal, setScheduleDemoModal] = useState(false);
  const [isTimeEnabled, setIsTimeEnabled] = useState(false);
  const [showSalesDetails, setShowSalesDetails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [paymentPlanCourse, setPaymentPlanCourse] = useState(null);
  // Tutor Calendar: double-clicking a date opens the class popup as a new-class entry.
  const [isNewClass, setIsNewClass] = useState(false);
  // Operations: { event, requestedBy } for a class the tutor or student asked to re-schedule.
  const [rescheduleComparison, setRescheduleComparison] = useState(null);
  const [tutorStudents, setTutorStudents] = useState([]);
  const isDemoEvent = Boolean(event?.scheduleType) && event.scheduleType !== "Class";
  const canManagePaymentPlan = ["Accounts", "AccountsAdmin", "Payroll", "PayrollAdmin", "SuperAdmin"].includes(userRole);
  const canSubmitStandardAttendance = ["Student", "Tutor", "Operations", "OperationAdmin", "OperationsAdmin"].includes(userRole);
  const [createClassModal, setCreateClassModal] = useState(false);
const [selectedClassType, setSelectedClassType] = useState("Schedule Class");
const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);
  const canManageDemoAttendance =
        isDemoEvent && ["Coordinator", "CoordinatorAdmin", "SuperAdmin"].includes(userRole);
  const selectedClassEnd = new Date(event?.end ?? event?.endTime);
  const isSelectedUpcomingClass =
    event?.scheduleType === "Class" &&
    !Number.isNaN(selectedClassEnd.getTime()) &&
    selectedClassEnd > new Date();
  const canEditAttendance =
    (canSubmitStandardAttendance && event.canDisable == false) || canManageDemoAttendance;
  // A tutor's or student's saved class status is locked; they can ask Operations to unlock it once.
  const isSelfAttendanceRole = ["Tutor", "Student"].includes(userRole);
  const canRequestStatusEdit =
    !readOnly && !isNewClass && isSelfAttendanceRole && event?.scheduleType === "Class" &&
    Boolean(event?.scheduleDetailsId) && !canEditAttendance;

  const requestStatusEdit = async () => {
    const { value: reason, isConfirmed } = await Swal.fire({
      title: "Request to change the status",
      input: "textarea",
      inputLabel: "Why does the status need to change?",
      inputPlaceholder: "e.g. I selected the wrong status",
      showCancelButton: true,
      confirmButtonText: "Send to Operations",
      inputValidator: (value) => (!value || !value.trim() ? "Please enter a reason." : undefined),
    });
    if (!isConfirmed) return;
    try {
      const result = await requestClassStatusEdit(event.scheduleDetailsId, reason);
      tutorToggle();
      onEdit("class update", result?.message || "Edit request sent to Operations.");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to send the edit request.");
    }
  };
  const [formData, setFormData] = useState({
    scheduleId: defaultGuid,
    saleDetailsId: defaultGuid,
    subjectId: defaultGuid,
    rate: 0,
    tutorId: defaultGuid,
    studentId: defaultGuid,
    scheduleStatus: defaultGuid,
    noteText: "",
    startTime: new Date(),
    endTime: new Date(),
    eventStatus: defaultGuid,
    documentType: defaultGuid,
  });
  const statusLoaded = useRef(false);
  const [dates, setDates] = useState({
    startDate: new Date(),
    startTime: new Date(),
    endTime: new Date(),
    endDate: new Date(),
  });

  const [repeatOptions, setRepeatOptions] = useState([]);
  const dispatch = useDispatch();
  useEffect(() => {
    updateEvents(events);
  }, [events]);

  useEffect(() => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      console.log("FullCalendar initialized:", calendarApi);
    }
  }, []);

  const validateTimes = (start, end) => {
    if (start && end && start >= end) {
      setDateError("Start Time should be earlier than End Time.");
    } else {
      setDateError("");
    }
  };

  const handleFormSubmit = (formData) => {
    let newEvent = {};
    newEvent = {
      id: event.id,
      className: theme.value,
      type: theme,
      title: formData.title,
      start: event.start,
      end: event.end,
      description: formData.description,
    };
    onEdit(newEvent);
    settheme("");
    toggleEdit();
  };

  const toggle = () => {
    updateModal(!modalState);
  };

  const tutorToggle = () => {
    setTutorModalState(!tutorModalState);
  };

  const toggleEdit = () => {
    updateEditModal(!edit);
  };

  const handleDatesSet = (dateInfo) => {
    try {
      const calendarApi = calendarRef.current?.getApi();
      const currentCalendarDate = calendarApi?.getDate() || new Date();
      const month = currentCalendarDate.getMonth() + 1;
      const year = currentCalendarDate.getFullYear();
      const monthYearKey = `${year}-${month}`;

      console.log("📅 Calendar navigated to:", monthYearKey);

      if (lastCalledMonthYear.current !== monthYearKey) {
        lastCalledMonthYear.current = monthYearKey;
        onMonthChange?.(currentCalendarDate);
      }
    } catch (error) {
      console.error("Error in handleDatesSet:", error);
    }
  };

  const handleEventClick = async (info) => {
    const event = events.find((item) => item.scheduleDetailsId === info.event._def.extendedProps.scheduleDetailsId);
    if (!event) return;

    // Keep historical attendance and cancellation accessible even when the package
    // is exhausted. Server-side guards reject completion of an additional class;
    // the existing warning in this dialog explains the package restriction.

    updateEvent(event);
    settheme(event.type);

    // Pick the correct status field based on the logged-in user's role
    const loggedInRole = localStorage.getItem("userRole")?.toLowerCase();
    let selectedStatusId = defaultGuid;
    if (loggedInRole === "student") {
      selectedStatusId = event?.studentScheduleStatus || event?.scheduleStatus || defaultGuid;
    } else if (loggedInRole === "tutor") {
      selectedStatusId = event?.tutorScheduleStatus || event?.scheduleStatus || defaultGuid;
    } else if (["operations", "operationadmin", "operationsadmin"].includes(loggedInRole)) {
      // Operations must see only their own submitted status — never fall back to the
      // tutor's/student's status, or the dropdown looks pre-completed before Operations acts.
      selectedStatusId = event?.operationScheduleStatus || defaultGuid;
    } else if (["coordinator", "coordinatoradmin", "superadmin"].includes(loggedInRole)) {
      // Demo attendance submitted by a Coordinator/Admin is stored separately from
      // the Tutor and Student submissions.
      selectedStatusId =
        event?.operationScheduleStatus ||
        event?.tutorScheduleStatus ||
        event?.studentScheduleStatus ||
        event?.scheduleStatus ||
        defaultGuid;
    } else {
      selectedStatusId =
        event?.tutorScheduleStatus || event?.studentScheduleStatus || event?.scheduleStatus || defaultGuid;
    }

    // Build statusList locally to avoid React async state race condition
    let localStatusList = [{ value: defaultGuid, label: "--Select--", id: defaultGuid, code: 0 }];
    const scheduledEnd = new Date(event?.end ?? event?.endTime);
    const isUpcomingClass =
      event?.scheduleType === "Class" &&
      !Number.isNaN(scheduledEnd.getTime()) &&
      scheduledEnd > new Date();
    await getLookups("1009").then((response) => {
      response.forEach((s) => {
        // An upcoming regular class may be cancelled/rescheduled/not available,
        // but it cannot be completed until its scheduled end time has passed.
        if (isUpcomingClass && s.typeCodeValue == ClassStatusTypes.ClassCompleted) return;
        localStatusList.push({
          value: s?.id,
          label: s?.typeCodeName,
          id: s?.id,
          code: s.typeCodeValue,
        });
      });
      setStatusList(localStatusList);
    });

    // The saved status before it is matched against the Class list; a demo's status is in the Demo list (below).
    const savedStatusId = selectedStatusId;
    // Find matching status using local list (not stale state)
    let selectedStatus = localStatusList.find(
      (s) => String(s.id).toLowerCase() === String(selectedStatusId).toLowerCase(),
    );
    if (!selectedStatus) {
      selectedStatusId = defaultGuid;
      selectedStatus = localStatusList[0];
    }
    setStatusTypeId(selectedStatusId);
    console.log("selectedStatus found:", selectedStatus);

    // ✅ Use local variable to capture API response — state is stale inside async callbacks
    let salesDetailsTemp = null;
    await GetSalesDetails(event.salesId, event.salesDetailsId, event.scheduleDetailsId)
      .then((response) => {
        let temp = response.data;
        if (response?.data) {
          temp["salesId"] = event.salesId;
          temp["salesDetailId"] = event.salesDetailsId;
          temp["scheduleDetailsId"] = event.scheduleDetailsId;
        }
        salesDetailsTemp = temp;
        setDataItem(temp);
        setSalesDetails(temp);
        setShowSalesDetails(true);
      })
      .catch((error) => {
        console.error("GetSalesDetails error:", error);
      });

    // ✅ noteText = comments from API response only. Show empty if null/missing.
    const noteText = salesDetailsTemp?.comments ?? "";

    setFormData((prev) => ({
      ...prev,
      scheduleDetailsId: event.scheduleDetailsId,
      startTime: event.start,
      endTime: event.end,
      eventStatus: selectedStatusId,
      documentTypeId: event.documentTypeId ?? defaultGuid,
      noteText: noteText,
    }));
    setRescheduleType("");
    setPreferredSlot(null);

    if (selectedStatus) {
      setNoteTextLabel(GetClassNoteLabel(selectedStatus.code));
      setEventStatusCode(selectedStatus.code);
      setIsTimeEnabled(
        selectedStatus.code != ClassStatusTypes.ClassCompleted && !isScheduledTimeEditStatus(selectedStatus.code),
      );
    } else {
      setNoteTextLabel("Feedback/Comments");
      setEventStatusCode("");
    }

    // For Demo events only — build filtered status list
    // For Class events — keep the full getLookups("1009") list, don't overwrite it

    if (event.scheduleType !== "Class") {
      getLookupForClassStatus(event.endTime, "200", event.scheduleType).then((response) => {
        let temp = [{ value: defaultGuid, label: "--Select--", id: defaultGuid, code: 0 }];
        response.forEach((s) => {
          if (
            s.typeCodeValue == "20016" ||
            s.typeCodeValue == "20015" ||
            s.typeCodeValue == "20018" ||
            s.typeCodeValue == "20019" ||
            s.typeCodeValue == "20041" ||
            s.typeCodeValue == "20028" ||
            s.typeCodeValue == "20023"
          ) {
            temp.push({ value: s?.id, label: s?.typeCodeName, id: s?.id, code: s.typeCodeValue });
          }
        });
        setStatusList(temp);
        // Show the demo's saved status (e.g. Demo Completed), which the Class list above could not match.
        const savedDemoStatus = temp.find(
          (s) => s.code !== 0 && String(s.id).toLowerCase() === String(savedStatusId).toLowerCase(),
        );
        if (savedDemoStatus) {
          setStatusTypeId(savedDemoStatus.id);
          setEventStatusCode(savedDemoStatus.code);
          setFormData((prev) => ({ ...prev, eventStatus: savedDemoStatus.id }));
        }
      });
    }

    getLookups("1006").then((response) => {
      let temp = [{ value: defaultGuid, label: "--Select document type--", id: defaultGuid }];
      response.forEach((s) => {
        temp.push({ value: s?.id, label: s?.typeCodeName, id: s?.id });
      });
      setDocumentTypes(temp);
    });

    // Operations opening a class the tutor or student asked to re-schedule: show the student/tutor
    // availability comparison first; it offers "View class details" to continue to this popup.
    const rescheduleRequestId = localStatusList.find((s) => s.code == ClassStatusTypes.RequestForReschedule)?.id;
    const isStatus = (value) => rescheduleRequestId && String(value).toLowerCase() === String(rescheduleRequestId).toLowerCase();
    const requestedBy = isStatus(event.tutorScheduleStatus) ? "tutor" : isStatus(event.studentScheduleStatus) ? "student" : null;
    const isOpsViewer = ["Operations", "OperationsAdmin", "OperationAdmin", "SuperAdmin", "Admin"].includes(localStorage.getItem("userRole"));
    if (isOpsViewer && requestedBy && event.studentUserId && event.tutorUserId) {
      setRescheduleComparison({ event, requestedBy });
      return;
    }

    // Open modal last, after all data is ready
    tutorToggle();
  };

  // Tutor Calendar: right-clicking a date opens the existing Regular Class popup for that
  // date's regular class (via handleEventClick). Demo classes are not offered here.
  const handleDateRightClick = async (date) => {
    const dayClasses = events
      .filter((item) => item.scheduleType === "Class" && moment(item.start).isSame(date, "day"))
      .sort((a, b) => new Date(a.start) - new Date(b.start));

    if (dayClasses.length === 0) {
      Swal.fire({
        icon: "info",
        title: "No regular class",
        text: `There is no regular class on ${moment(date).format("DD-MMM-YYYY")}.`,
      });
      return;
    }

    let selected = dayClasses[0];
    if (dayClasses.length > 1) {
      const { value } = await Swal.fire({
        title: `Select class - ${moment(date).format("DD-MMM-YYYY")}`,
        input: "select",
        inputOptions: Object.fromEntries(
          dayClasses.map((c) => [
            c.scheduleDetailsId,
            `${moment(c.start).format("hh:mm A")} - ${moment(c.end).format("hh:mm A")} | ${c.subjectName} - ${c.studentName}`,
          ]),
        ),
        showCancelButton: true,
        confirmButtonText: "Open",
      });
      if (!value) return;
      selected = dayClasses.find((c) => c.scheduleDetailsId === value);
    }

    handleEventClick({ event: { _def: { extendedProps: { scheduleDetailsId: selected.scheduleDetailsId } } } });
  };
  // Double-click on a date: with no class that day, open the new-class popup. Otherwise ask which
  // existing class (regular, demo, ...) to open, or whether to add a new class on that date.
  const openClassOrNewOnDate = async (date) => {
    const dayClasses = events
      .filter((item) => moment(item.start).isSame(date, "day"))
      .sort((a, b) => new Date(a.start) - new Date(b.start));
    if (dayClasses.length === 0) {
      openNewClassPopup(date);
      return;
    }

    const NEW_CLASS = "__new__";
    const { value } = await Swal.fire({
      title: `Classes on ${moment(date).format("DD-MMM-YYYY")}`,
      input: "select",
      inputOptions: {
        ...Object.fromEntries(
          dayClasses.map((c) => [
            c.scheduleDetailsId,
            `${moment(c.start).format("hh:mm A")} - ${moment(c.end).format("hh:mm A")} | ${c.scheduleType} | ${c.subjectName} - ${
              scheduleType === "student" ? c.tutorName : c.studentName
            }`,
          ]),
        ),
        [NEW_CLASS]: "+ Add a new class on this date",
      },
      inputValue: dayClasses[0].scheduleDetailsId,
      showCancelButton: true,
      confirmButtonText: "Open",
    });
    if (!value) return;
    if (value === NEW_CLASS) {
      openNewClassPopup(date);
      return;
    }
    handleEventClick({ event: { _def: { extendedProps: { scheduleDetailsId: value } } } });
  };

  // Day cells bind their listener once on mount, so they read the latest handler through this ref.
  dateRightClickRef.current = scheduleType === "tutor" ? handleDateRightClick : null;

  // ---- Tutor / Student Calendar: double-click a date to add a class (reuses the class popup) ----
  // A tutor picks one of their students, a student picks one of their tutors; then the subject.
  // Operations on a particular student's calendar (?id=<student user id>) get the same student flow.
  const isOpsStudentEntry =
    !readOnly && scheduleType === "student" && Boolean(targetUserId) && ["Operations", "OperationsAdmin"].includes(userRole);
  const isStudentEntry = (scheduleType === "student" && userRole === "Student") || isOpsStudentEntry;
  const canAddClassFromDate = (scheduleType === "tutor" && userRole === "Tutor") || isStudentEntry;
  const partyKey = isStudentEntry ? "TutorId" : "StudentId";
  const partyNameKey = isStudentEntry ? "TutorName" : "StudentName";
  const pick = (row, name) => row?.[name] ?? row?.[name.charAt(0).toLowerCase() + name.slice(1)];

  // Whose availability "Request for Re-schedule" (offered only on an existing class) shows: the other
  // side of the class. On a student's calendar (the student, or Operations acting for them) that is
  // the tutor; otherwise the student.
  const reschedulePerson =
    scheduleType === "student"
      ? { roleLabel: "tutor", userId: event?.tutorUserId, name: event?.tutorName }
      : { roleLabel: "student", userId: event?.studentUserId, name: event?.studentName };

  // Clicking a free slot records it in the comments, replacing an earlier pick.
  const onRescheduleSlotSelect = (start, end) => {
    const line = `Preferred re-schedule slot: ${moment(start).format("ddd DD-MMM-YYYY hh:mm A")} - ${moment(end).format("hh:mm A")}`;
    setPreferredSlot({ start, end });
    setFormData((prev) => {
      const others = (prev.noteText || "").split("\n").filter((l) => l.trim() && !l.startsWith("Preferred re-schedule slot:"));
      return { ...prev, noteText: [...others, line].join("\n") };
    });
  };

  // Leaving new-class mode whenever the popup closes keeps the existing event popup untouched.
  useEffect(() => {
    if (!tutorModalState) setIsNewClass(false);
  }, [tutorModalState]);

  // Keep the selected calendar date and take only the hours/minutes from the time picker.
  const withSelectedDate = (time) => {
    if (!time) return time;
    const picked = moment(time);
    return moment(event.start).set({ hour: picked.hour(), minute: picked.minute(), second: 0, millisecond: 0 }).toDate();
  };

  const openNewClassPopup = async (date) => {
    // Week/Day views pass the clicked time slot; Month view passes midnight, so default to 10:00 AM.
    const start = moment(date);
    if (start.hour() === 0 && start.minute() === 0) start.set({ hour: 10, minute: 0 });
    const end = start.clone().add(1, "hour");

    // Rows share one shape: StudentId / TutorId / tutorId / SalesDetailsId / SubjectId / SubjectName.
    let rows = [];
    try {
      if (isOpsStudentEntry) {
        // Operations: the opened student's enrolled subjects with the assigned tutor (existing Sales API).
        const response = await getEnrolledCoursesByUser(targetUserId);
        rows = (Array.isArray(response) ? response : response?.data ?? [])
          .filter((row) => row.tutorId && row.isActive !== false)
          .map((row) => ({
            StudentId: row.studentId,
            TutorId: row.tutorId,
            TutorName: row.tutorName,
            tutorId: row.tutorId,
            SalesDetailsId: row.salesDetailsId,
            SubjectId: row.subjectId,
            SubjectName: row.subjectName,
          }));
      } else if (isStudentEntry) {
        // Student: their own enrolled subjects with the assigned tutor (existing student-dashboard API).
        const context = await getCurrentStudentContext(localStorage.getItem("userId"));
        const studentId = context?.data?.studentId;
        const response = studentId ? await getStudentDashboardCourses(studentId) : null;
        rows = (response?.data ?? [])
          .filter((row) => pick(row, "TutorId"))
          .map((row) => ({
            StudentId: studentId,
            TutorId: pick(row, "TutorId"),
            TutorName: pick(row, "TutorName"),
            tutorId: pick(row, "TutorId"),
            SalesDetailsId: pick(row, "CourseEnrollmentId"),
            SubjectId: pick(row, "SubjectId"),
            SubjectName: pick(row, "CourseName"),
          }));
      } else {
        const context = await getCurrentTutorContext(localStorage.getItem("userId"));
        const tutorId = context?.data?.tutorId;
        const response = tutorId ? await getTutorDashboardStudents(tutorId) : null;
        rows = (response?.data ?? []).map((row) => ({ ...row, tutorId }));
      }
    } catch (e) {
      toast.error(isStudentEntry ? "Unable to load your tutors." : "Unable to load your students.");
      return;
    }

    const isUpcoming = end.toDate() > new Date();
    const localStatusList = [{ value: defaultGuid, label: "--Select--", id: defaultGuid, code: 0 }];
    const statusResponse = await getLookups("1009");
    statusResponse.forEach((s) => {
      // Same rule as the existing class popup: no Class Completed before the class has ended.
      if (isUpcoming && s.typeCodeValue == ClassStatusTypes.ClassCompleted) return;
      // Re-scheduling (or requesting it) needs an existing class, so neither is offered while creating one.
      if (s.typeCodeValue == ClassStatusTypes.ClassRescheduled) return;
      if (s.typeCodeValue == ClassStatusTypes.RequestForReschedule) return;
      localStatusList.push({ value: s?.id, label: s?.typeCodeName, id: s?.id, code: s.typeCodeValue });
    });
    const documentResponse = await getLookups("1006");
    const localDocumentTypes = [{ value: defaultGuid, label: "--Select document type--", id: defaultGuid }];
    documentResponse.forEach((s) => localDocumentTypes.push({ value: s?.id, label: s?.typeCodeName, id: s?.id }));

    setTutorStudents(rows);
    setStatusList(localStatusList);
    setDocumentTypes(localDocumentTypes);
    updateEvent({ scheduleType: "Class", start: start.toDate(), end: end.toDate(), canDisable: false });
    setFormData((prev) => ({
      ...prev,
      scheduleDetailsId: undefined,
      studentId: defaultGuid,
      salesDetailsId: defaultGuid,
      subjectId: defaultGuid,
      startTime: start.toDate(),
      endTime: end.toDate(),
      eventStatus: defaultGuid,
      documentTypeId: defaultGuid,
      noteText: "",
      rate: 0,
    }));
    setStatusTypeId(defaultGuid);
    setEventStatusCode("");
    setNoteTextLabel("Feedback/Comments");
    setIsTimeEnabled(false);
    setDateError("");
    setFile(null);
    setSelectedFileName(null);
    clearErrors();
    setIsNewClass(true);
    setTutorModalState(true);
  };

  const onSaveNewClass = async () => {
    clearErrors();
    let valid = true;
    if (!formData.studentId || formData.studentId === defaultGuid) {
      setError("studentId", { type: "manual" });
      valid = false;
    }
    if (!formData.salesDetailsId || formData.salesDetailsId === defaultGuid) {
      setError("subjectId", { type: "manual" });
      valid = false;
    }
    const start = withSelectedDate(formData.startTime);
    const end = withSelectedDate(formData.endTime);
    if (!start || !end) {
      setDateError("Start Time and End Time are required.");
      return;
    }
    if (start >= end) {
      setDateError("Start Time should be earlier than End Time.");
      return;
    }
    setDateError("");
    if (!valid) return;

    const allocation = tutorStudents.find(
      (row) => String(pick(row, "SalesDetailsId")).toLowerCase() === String(formData.salesDetailsId).toLowerCase(),
    );
    const classDate = moment(event.start).startOf("day").toDate();
    const dayName = moment(classDate).format("dddd");
    const scheduledStatus = (await getLookups("200")).find((s) => s.typeCodeValue == FollowUpStatus.Schedule);

    // Same request the coordinator's class scheduling sends, as a one-time class on the selected date.
    const inputData = {
      SalesId: defaultGuid,
      SalesDetailsId: pick(allocation, "SalesDetailsId"),
      TutorId: allocation.tutorId,
      StudentId: pick(allocation, "StudentId"),
      SubjectId: pick(allocation, "SubjectId"),
      StartDate: classDate,
      EndDate: classDate,
      ScheduleStatus: scheduledStatus?.id,
      ScheduleType: 100501,
      UserId: localStorage.getItem("userId"),
      Title: "No title",
      IsRecurrence: false,
      ScheduleMode: "OneTime",
      TotalClasses: 1,
      DayInNo: classDate.getDay(),
      TimeSlotGroup: [
        {
          Day: dayName,
          SalesId: defaultGuid,
          SalesDetailsId: pick(allocation, "SalesDetailsId"),
          StartDate: classDate,
          EndDate: classDate,
          IsRecurrence: false,
          DayInNo: classDate.getDay(),
          TimeSlots: [
            {
              StartTime: moment(start).format("HH:mm:ss"),
              EndTime: moment(end).format("HH:mm:ss"),
              Day: dayName,
              Color: "",
            },
          ],
        },
      ],
    };

    setIsSaving(true);
    let scheduleId = null;
    try {
      const response = await scheduleEvent(inputData);
      if (response?.succeeded === false) throw new Error(response?.message || "Unable to schedule the class.");
      scheduleId = response?.data;
    } catch (error) {
      toast.error(
        error?.response?.data?.message || error?.message || "Unable to schedule the class. Please check the selected time.",
      );
      setIsSaving(false);
      return;
    }
    setIsSaving(false);

    // No status chosen: the class is simply scheduled.
    if (!formData.eventStatus || formData.eventStatus === defaultGuid) {
      tutorToggle();
      onEdit("class update", "Class has been scheduled successfully");
      return;
    }

    // A status was chosen: find the new class and save it through the existing status update.
    try {
      const response = await getTutorScheduleDetails(
        isOpsStudentEntry ? targetUserId : localStorage.getItem("userId"),
        isStudentEntry ? "student" : "tutor",
        classDate.getMonth() + 1,
        classDate.getFullYear(),
      );
      const rowsForMonth = response?.data?.data ?? response?.data ?? [];
      const created = rowsForMonth.find((row) => String(row.scheduleId).toLowerCase() === String(scheduleId).toLowerCase());
      if (!created) throw new Error("not found");
      formSubmit({
        ...event,
        scheduleDetailsId: created.scheduleDetailsId,
        salesDetailsId: created.salesDetailsId,
        scheduleType: "Class",
      });
    } catch (e) {
      toast.error("The class was scheduled, but its status could not be saved. Please open the class and save the status.");
      tutorToggle();
      onEdit("class update", "Class has been scheduled successfully");
    }
  };

  useEffect(() => {
    if (!selectedScheduleDetailsId || openedClass.current === selectedScheduleDetailsId) return;
    const selected = events.find(item => String(item.scheduleDetailsId).toLowerCase() === selectedScheduleDetailsId.toLowerCase());
    if (!selected) return;
    openedClass.current = selectedScheduleDetailsId;
    handleEventClick({ event: { _def: { extendedProps: { scheduleDetailsId: selected.scheduleDetailsId } } } })
      .catch(() => Swal.fire("Unable to open class", "Please click the class in the calendar to retry.", "error"));
    // Open a chat deep link once, after the requested month's events arrive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, selectedScheduleDetailsId]);

  const formManualValidation = (start, end) => {
    if (formData.eventStatus == defaultGuid || formData.eventStatus == -1) {
      setError("eventStatus", {
        type: "manual",
        message: "Custom error message",
      });
      return false;
    }

    if (isScheduledTimeEditStatus(eventStatusCode) && (!start || !end)) {
      setDateError("Start Time and End Time are required.");
      return false;
    }

    if (start && end && start >= end) {
      setDateError("Start Time should be earlier than End Time.");
      return false;
    } else {
      setDateError("");
      return true;
    }
  };

  // For the Extra Class / Preponed / Postponed statuses, keep the selected class's date and take
  // only the hours/minutes from the time picker. Other statuses submit the picker value unchanged.
  const toClassDateTime = (time) => {
    if (!time || !isScheduledTimeEditStatus(eventStatusCode)) return time;
    const picked = moment(time);
    return moment(event.start)
      .set({ hour: picked.hour(), minute: picked.minute(), second: 0, millisecond: 0 })
      .toDate();
  };

  const cancelClassHandler = async () => {
    var reulst = await checkCanCancelClass(event.salesDetailsId, 2025, 9);
    const message = reulst.data;
    Swal.fire({
      title: "Confirm class cancellation",
      text: message,
      icon: "warning",
      showCloseButton: true,
      showCancelButton: true,
      confirmButtonText: "Cancel Class",
      cancelButtonText: "Reschedule Class",
    }).then((result) => {
      if (result.isConfirmed) {
        formSubmit();
      } else {
        setScheduleDemoModal(true);
      }
    });
  };

  const onUpdateDemoStatusHandler = () => {
    const isValid = formManualValidation(toClassDateTime(formData.startTime), toClassDateTime(formData.endTime));
    if (!isValid) return;
    if (eventStatusCode == ClassStatusTypes.ClassCancelled) {
      cancelClassHandler();
      return;
    }
    if (eventStatusCode == ClassStatusTypes.RequestForReschedule && !isOperationsUser && !isNewClass) {
      if (!rescheduleType) {
        toast.error("Choose whether the re-schedule is Temporary or Permanent.");
        return;
      }
      if (rescheduleType === "Permanent" && !preferredSlot) {
        toast.error("For a permanent re-schedule, click a green slot to choose the new class time.");
        return;
      }
    }
    formSubmit();
  };

  // `target` defaults to the opened event; the new-class flow passes the class it just created.
  const formSubmit = (target = event) => {
    const loggedInUserRole = localStorage.getItem("userRole")?.toLowerCase();
    const _formData = new FormData();
    _formData.append(
      "GuestType",
      ["Operations", "OperationAdmin", "OperationsAdmin"].includes(localStorage.userRole)
        ? "operation"
        : loggedInUserRole == scheduleType
          ? scheduleType
          : loggedInUserRole,
    );
    _formData.append("SalesDetailsId", target.salesDetailsId);
    _formData.append("ScheduleDetailsId", target.scheduleDetailsId);
    _formData.append("StartTime", moment(toClassDateTime(formData.startTime)).format("YYYY-MM-DDTHH:mm:ss"));
    _formData.append("EndTime", moment(toClassDateTime(formData.endTime)).format("YYYY-MM-DDTHH:mm:ss"));
    _formData.append("NoteText", formData.noteText);
    _formData.append("EventStatus", formData.eventStatus);
    _formData.append("UserId", localStorage.getItem("userId"));
    _formData.append("DocumentTypeId", formData?.documentTypeId || defaultGuid);
    if (eventStatusCode == ClassStatusTypes.RequestForReschedule && rescheduleType) {
      _formData.append("RescheduleType", rescheduleType);
      if (rescheduleType === "Permanent" && preferredSlot) {
        _formData.append("PreferredStartTime", moment(preferredSlot.start).format("YYYY-MM-DDTHH:mm:ss"));
        _formData.append("PreferredEndTime", moment(preferredSlot.end).format("YYYY-MM-DDTHH:mm:ss"));
      }
    }
    if (file !== null) {
      Array.from(file).forEach((file) => {
        _formData.append("Files", file);
      });
    }

    setIsSaving(true);
    updateScheduleStatus(_formData).then((response) => {
      if (response?.succeeded === false) {
        toast.error(response?.message || "Unable to update the class status.");
        return;
      }
      if (formData.rate) {
        const ratingInput = {
          rating: formData.rate,
          userId: localStorage.getItem("userId"),
          ratedUserId: scheduleType == "student" ? target.tutorUserId : target.studentUserId,
          referenceId: target.scheduleDetailsId,
          ratingTypeId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        };
        addRating(ratingInput).catch(() => {});
      }
      tutorToggle();
      onEdit(
        "class update",
        target.scheduleType == "Class" ? "Class has been updated successfully" : "Demo has been updated successfully",
      );
    }).catch(() => {
      toast.error("Unable to update the class status.");
    }).finally(() => setIsSaving(false));
  };

  const UpdateSchedule = (action) => {
    const loggedInUserRole = localStorage.getItem("userRole")?.toLowerCase();
    const inputData = {
      guestType: loggedInUserRole == scheduleType ? scheduleType : loggedInUserRole,
      scheduleDetailsId: event.scheduleDetailsId,
      startTime: formData.startTime,
      endTime: formData.endTime,
      noteText: formData.noteText,
      eventStatus: formData.eventStatus,
      userId: localStorage.getItem("userId"),
    };
    UpdateScheduleDetail(inputData).then((response) => {
      tutorToggle();
      onEdit(action, action == "demo" ? "Demo rescheduled successfyll!" : "Class rescheduled successfully!");
    });
  };

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm({});

  // Prepaid v2: subjects frozen because their prepaid credit is exhausted (Scenario 3).
  const blockedSubjects = [...new Set(mockEvents.filter((e) => e.isBlocked).map((e) => e.subjectName).filter(Boolean))];

  return (
    <React.Fragment>
      <div className="tct-calendar" style={{ minHeight: "800px", background: "#fff", padding: "20px" }}>
        {blockedSubjects.length > 0 && (
          <div
            style={{
              background: "#dc3545",
              color: "#fff",
              padding: "10px 16px",
              borderRadius: "6px",
              marginBottom: "14px",
              fontSize: "13px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Icon name="alert-circle" />
            <span>
              Prepaid credit exhausted for {blockedSubjects.join(", ")}. These classes are blocked (shown in red) and
              cannot be actioned until the balance (top-up) invoice is paid.
            </span>
          </div>
        )}
        <FullCalendar
          ref={calendarRef}
          initialDate={initialDate}
          plugins={[dayGridPlugin, interactionPlugin, timeGridPlugin, listPlugin, bootstrapPlugin]}
          events={mockEvents}
         dateClick={(info) => {
  // readOnly: no class creation from a date. Operations never get it; students only on their own
  // calendar (New Class popup), never the "Create Class" chooser.
  if (readOnly || (!canAddClassFromDate && ["Student", "Operations", "OperationsAdmin"].includes(userRole))) return;
  if (clickTimerRef.current) {
    clearTimeout(clickTimerRef.current);
    clickTimerRef.current = null;

    dispatch(
      setSelectedDate({
        dateStr: info.dateStr,
        start: info.date,
        end: info.end,
        allDay: info.allDay,
        viewType: info.view.type,
      })
    );

    // Tutor/Student Calendar: a date that already has classes opens one of them (all statuses,
    // including Request for Re-schedule); an empty date opens the new-class popup.
    if (canAddClassFromDate) {
      openClassOrNewOnDate(info.date);
      return;
    }

    setSelectedCalendarDate(info.date);
    setSelectedClassType("Schedule Class");
    setCreateClassModal(true);
  } else {
    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null;
    }, 300);
  }
}}
          eventClick={(info) => {
            if (onEventClick) {
              const clicked = events.find((item) => item.scheduleDetailsId === info.event._def.extendedProps.scheduleDetailsId);
              if (clicked) onEventClick(clicked);
              return;
            }
            handleEventClick(info);
          }}
          dayCellDidMount={(arg) => {
            arg.el.addEventListener("contextmenu", (e) => {
              if (!dateRightClickRef.current) return;
              e.preventDefault();
              dateRightClickRef.current(arg.date);
            });
          }}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "title prev,next",
            center: null,
            right: "today dayGridMonth,timeGridWeek,timeGridDay,listWeek",
          }}
          themeSystem="bootstrap"
          height={800}
          contentHeight={780}
          eventContent={(e) => <EventView event={e} events={events} guestType={scheduleType} stableHover={stableHover} />}
          aspectRatio={1}
          editable={!readOnly}
          droppable={!readOnly}
          datesSet={handleDatesSet}
        />
      </div>
      <Modal
  isOpen={createClassModal}
  toggle={() => setCreateClassModal(false)}
  centered
  className="modal-md"
>
  <ModalHeader toggle={() => setCreateClassModal(false)}>
    Create Class
  </ModalHeader>

  <ModalBody>
    <p>
      Selected Date:{" "}
      {selectedCalendarDate
        ? moment(selectedCalendarDate).format("DD-MMM-YYYY")
        : "-"}
    </p>

    <FormGroup>
      <Label>Class Type</Label>

      <div className="d-flex flex-column gap-2">
        <Button
          type="button"
          color={selectedClassType === "Schedule Class" ? "primary" : "light"}
          onClick={() => setSelectedClassType("Schedule Class")}
        >
          Schedule Class
        </Button>

        <Button
          type="button"
          color={selectedClassType === "Extra Class" ? "primary" : "light"}
          onClick={() => setSelectedClassType("Extra Class")}
        >
          Extra Class
        </Button>
      </div>
    </FormGroup>

    <div className="d-flex justify-content-end gap-2 mt-4">
      <Button
        type="button"
        color="secondary"
        onClick={() => setCreateClassModal(false)}
      >
        Cancel
      </Button>

      <Button
        type="button"
        color="primary"
        onClick={() => {
          console.log("Selected class type:", selectedClassType);
          console.log("Selected date:", selectedCalendarDate);

          setCreateClassModal(false);
        }}
      >
        Continue
      </Button>
    </div>
  </ModalBody>
</Modal>
      <Modal isOpen={tutorModalState} toggle={tutorToggle} className="modal-dialog-centered totur-modal" size="lg">
        <ModalHeader className={event && event.className} toggle={tutorToggle}>
          {isNewClass ? "New Class" : event && event.title}
        </ModalHeader>
        <ModalBody>
          <Form
            className="gy-1"
            noValidate
            onSubmit={
              isNewClass
                ? (e) => {
                    e.preventDefault();
                    onSaveNewClass();
                  }
                : handleSubmit(onUpdateDemoStatusHandler)
            }
          >
            <Row className="gy-3 py-1">
              {isNewClass ? (
                <>
                  <Col sm="6">
                    <h6 className="overline-title">{isStudentEntry ? "Tutor Name" : "Student Name"}</h6>
                    {/* formData.studentId holds the selected person: a student (tutor login) or a tutor (student login) */}
                    <select
                      className="form-control form-select"
                      value={formData.studentId}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          studentId: e.target.value,
                          salesDetailsId: defaultGuid,
                          subjectId: defaultGuid,
                        }));
                        clearErrors("studentId");
                      }}
                    >
                      <option value={defaultGuid}>{isStudentEntry ? "--Select tutor--" : "--Select student--"}</option>
                      {[...new Map(tutorStudents.map((row) => [pick(row, partyKey), row])).values()].map((row) => (
                        <option key={pick(row, partyKey)} value={pick(row, partyKey)}>
                          {pick(row, partyNameKey)}
                        </option>
                      ))}
                    </select>
                    {errors.studentId && (
                      <span className="invalid">{isStudentEntry ? "Please select a tutor." : "Please select a student."}</span>
                    )}
                  </Col>
                </>
              ) : scheduleType == "tutor" ? (
                <>
                  <Col sm="6">
                    <h6 className="overline-title">Student Name</h6>
                    <p id="preview-event-start">{event?.studentName}</p>
                  </Col>
                </>
              ) : (
                <>
                  <Col sm="6">
                    <h6 className="overline-title">Tutor Name</h6>
                    <p id="preview-event-start">{event?.tutorName || salesDetails?.tutorName || "NA"}</p>
                  </Col>
                  {readOnly && (
                    <Col sm="6">
                      <h6 className="overline-title">Student Name</h6>
                      <p>{event?.studentName || "NA"}</p>
                    </Col>
                  )}
                </>
              )}
              <Col sm="6">
                <h6 className="overline-title">Subject</h6>
                {isNewClass ? (
                  <>
                    <select
                      className="form-control form-select"
                      value={formData.salesDetailsId}
                      disabled={!formData.studentId || formData.studentId === defaultGuid}
                      onChange={(e) => {
                        const row = tutorStudents.find(
                          (r) => String(pick(r, "SalesDetailsId")) === String(e.target.value),
                        );
                        setFormData((prev) => ({
                          ...prev,
                          salesDetailsId: e.target.value,
                          subjectId: row ? pick(row, "SubjectId") : defaultGuid,
                        }));
                        clearErrors("subjectId");
                      }}
                    >
                      <option value={defaultGuid}>--Select subject--</option>
                      {tutorStudents
                        .filter((row) => String(pick(row, partyKey)) === String(formData.studentId))
                        .map((row) => (
                          <option key={pick(row, "SalesDetailsId")} value={pick(row, "SalesDetailsId")}>
                            {pick(row, "SubjectName")}
                          </option>
                        ))}
                    </select>
                    {errors.subjectId && <span className="invalid">Please select a subject.</span>}
                  </>
                ) : (
                  <p id="preview-event-start">{event && event.subjectName}</p>
                )}
              </Col>
              <Col sm="6">
                <h6 className="overline-title">Class Date</h6>
                <p>{event?.start ? moment(event.start).format("DD-MMM-YYYY") : "-"}</p>
              </Col>
              <Col sm="6">
                <h6 className="overline-title">Start Time</h6>
                <p id="preview-event-start">
                  {event && moment(isNewClass ? formData.startTime : event?.start).format("hh:mm")}
                </p>
              </Col>
              <Col sm="6" id="preview-event-end-check">
                <h6 className="overline-title">End Time</h6>
                <p id="preview-event-end">
                  {" "}
                  {event && moment(isNewClass ? formData.endTime : event?.end).format("hh:mm")}
                </p>
              </Col>
            </Row>
            {/* Student calendar: the agreed or Operations cross-checked attendance for this class. */}
            {readOnly && event?.attendanceLabel && (
              <div className={`alert ${event.attendanceLabel.startsWith("Attendance not") ? "alert-light" : "alert-info"} py-2 mb-3`}>
                <strong>Attendance:</strong> {event.attendanceLabel}
              </div>
            )}
            {/* readOnly: every field below is shown but disabled */}
            <fieldset disabled={readOnly} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
            <Row>
              <Col sm="6">
                <FormGroup>
                  <label htmlFor="default-4" className="form-label">
                    {event.scheduleType == "Class" ? "Class Status" : "Demo Status"}
                  </label>
                  <select
                    className="form-control form-select"
                    disabled={!canEditAttendance}
                    name="eventStatus"
                    value={formData.eventStatus}
                    placeholder="Select a option"
                    onChange={(e) => {
                      const selectedValue = e.target.value;
                      const status = statusList.find(
                        (s) => String(s.id).toLowerCase() === String(selectedValue).toLowerCase(),
                      );

                      setFormData((prev) => ({
                        ...prev,
                        eventStatus: selectedValue,
                        // ✅ When user changes status manually, keep existing comment or clear
                        noteText: prev.noteText,
                      }));
                      clearErrors("eventStatus");

                      setNoteTextLabel("");

                      if (status) {
                        setNoteTextLabel(GetClassNoteLabel(status.code));
                        setEventStatusCode(status.code);
                        setIsTimeEnabled(
                          status.code != ClassStatusTypes.ClassCompleted && !isScheduledTimeEditStatus(status.code),
                        );

                        if (
                          !isNewClass &&
                          (status.code == FollowUpStatus.ReScheduleDemo ||
                            status.code == ClassStatusTypes.ClassRescheduled)
                        ) {
                          setScheduleDemoModal(true);
                        }
                      }
                    }}
                  >
                    {statusList.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  {isSelectedUpcomingClass && (
                    <small className="text-muted d-block mt-1">
                      Class Completed will be available after {moment(event.end).format("DD-MMM-YYYY hh:mm A")}.
                    </small>
                  )}
                  {errors.eventStatus && <span className="invalid">Please select status.</span>}
                </FormGroup>
              </Col>
              <Col md="3" className="pb-md-1">
                <FormGroup>
                  <label className="form-label" htmlFor="full-name-1">
                    Start Time
                  </label>
                  <DatePicker
                    onChange={(date) => {
                      setFormData((prevState) => ({ ...prevState, startTime: date }));
                      validateTimes(date, formData.endTime);
                    }}
                    showTimeSelect
                    showTimeSelectOnly
                    disabled={isTimeEnabled && !isNewClass}
                    timeZone="Asia/Kolkata"
                    selected={new Date(formData.startTime)}
                    timeCaption="Time"
                    dateFormat="h:mm aa"
                    className="form-control date-picker"
                  />
                </FormGroup>
              </Col>
              <Col md="3" className="pb-md-1">
                <FormGroup>
                  <label className="form-label" htmlFor="full-name-1">
                    End Time
                  </label>
                  <DatePicker
                    onChange={(date) => {
                      setFormData((prevState) => ({ ...prevState, endTime: date }));
                      validateTimes(formData.startTime, date);
                    }}
                    selected={new Date(formData.endTime)}
                    showTimeSelect
                    showTimeSelectOnly
                    disabled={isTimeEnabled && !isNewClass}
                    name="endTime"
                    timeCaption="Time"
                    dateFormat="h:mm aa"
                    className="form-control date-picker"
                  />
                  {error && <p className="text-danger">{error}</p>}
                </FormGroup>
              </Col>
            </Row>
            {!isNewClass && eventStatusCode == ClassStatusTypes.RequestForReschedule && reschedulePerson.userId && (
              <Row>
                <Col sm="12">
                  <AvailabilityCalendar
                    userId={reschedulePerson.userId}
                    name={reschedulePerson.name}
                    roleLabel={reschedulePerson.roleLabel}
                    initialDate={event?.start}
                    onSelectSlot={readOnly ? undefined : onRescheduleSlotSelect}
                  />
                </Col>
              </Row>
            )}
            {!isNewClass && !readOnly && !isOperationsUser && eventStatusCode == ClassStatusTypes.RequestForReschedule && (
              <Row className="mb-3">
                <Col sm="12">
                  <Label className="form-label">Re-schedule type</Label>
                  <div className="d-flex flex-wrap" style={{ gap: 24 }}>
                    {[
                      { value: "Temporary", label: "Temporary", hint: "Only this class. Operations are notified to arrange it." },
                      { value: "Permanent", label: "Permanent", hint: "This weekly class moves to the chosen slot from now on, after Operations approve." },
                    ].map((option) => (
                      <div className="custom-control custom-radio" key={option.value}>
                        <input
                          type="radio"
                          className="custom-control-input"
                          id={`reschedule-${option.value}`}
                          name="rescheduleType"
                          checked={rescheduleType === option.value}
                          onChange={() => setRescheduleType(option.value)}
                        />
                        <label className="custom-control-label" htmlFor={`reschedule-${option.value}`}>
                          <strong>{option.label}</strong>
                          <div className="text-soft small">{option.hint}</div>
                        </label>
                      </div>
                    ))}
                  </div>
                  {rescheduleType === "Permanent" && (
                    <div className={`small mt-1 ${preferredSlot ? "text-success" : "text-danger"}`}>
                      {preferredSlot
                        ? `New weekly time: every ${moment(preferredSlot.start).format("dddd hh:mm A")} - ${moment(preferredSlot.end).format("hh:mm A")}, from ${moment(preferredSlot.start).format("DD-MMM-YYYY")}`
                        : "Click a green slot above to choose the new weekly time."}
                    </div>
                  )}
                </Col>
              </Row>
            )}
            <Row>
              <Col sm="6">
                <FormGroup>
                  <Label htmlFor="default-4" className="form-label">
                    Document Type
                  </Label>
                  <select
                    className="form-control form-select"
                    name="documentType"
                    value={formData.documentTypeId}
                    placeholder="Select a option"
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, documentTypeId: e.target.value }));
                    }}
                  >
                    {documentTypes.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </FormGroup>
              </Col>
              <Col sm="6">
                <FormGroup>
                  <Label htmlFor="default-4" className="form-label">
                    Upload File
                  </Label>
                  <div className="form-control-wrap">
                    <div className="custom-file">
                      <input
                        type="file"
                        multiple
                        className="custom-file-input form-control"
                        id="customFile"
                        onChange={(e) => {
                          setFile(e.target.files);
                          setSelectedFileName(e.target.files[0].name);
                        }}
                      />
                      <Label className="custom-file-label" htmlFor="customFile">
                        {file == null ? "Choose file" : selectedFileName}
                      </Label>
                    </div>
                  </div>
                </FormGroup>
              </Col>
            </Row>
            <Row>
              {!readOnly && !isNewClass && ["Student", "Operations", "Coordinator"].includes(userRole) && (
                <Col sm="6">
                  <Label htmlFor="default-4" className="form-label">
                    Rate Today Demo/Class
                  </Label>
                  <div className="form-control-wrap">
                    <Rating
                      type="star"
                      initVal={formData?.rate || 0}
                      ratingCallback={(rate) => {
                        setFormData((prevState) => ({ ...prevState, rate: rate }));
                      }}
                    ></Rating>
                  </div>
                </Col>
              )}

              <Col sm="6" id="preview-event-description-check">
                <FormGroup>
                  <label className="form-label" htmlFor="event-description">
                    {noteTextLabel}
                  </label>
                  <div className="form-control-wrap">
                    <textarea
                      className="form-control"
                      name="noteText"
                      style={{ minHeight: "60px" }}
                      onChange={(e) => {
                        setFormData((prevState) => ({ ...prevState, noteText: e.target.value }));
                      }}
                      ref={register({ required: true })}
                      value={formData.noteText}
                      defaultValue={formData.noteText}
                    ></textarea>
                    {errors.noteText && <p className="invalid">This field is required</p>}
                  </div>
                </FormGroup>
              </Col>
            </Row>
            </fieldset>
            {canRequestStatusEdit && (
              <div className="alert alert-light d-flex justify-content-between align-items-center flex-wrap mt-2" style={{ gap: 10 }}>
                {event?.editRequestStatus === "Pending" ? (
                  <span>Your request to change this status is waiting for Operations' approval.</span>
                ) : (
                  <>
                    <span>
                      This status is locked.
                      {event?.editRequestStatus === "Rejected" && " Operations rejected your last request."} To change it,
                      ask Operations for approval.
                    </span>
                    <Button type="button" color="primary" size="sm" onClick={requestStatusEdit}>
                      Request edit
                    </Button>
                  </>
                )}
              </div>
            )}
            {isSelfAttendanceRole && !readOnly && event?.editRequestStatus === "Approved" && canEditAttendance && (
              <div className="alert alert-success mt-2">
                Operations approved your request. You can change this status once; it locks again after you save.
              </div>
            )}
            <Row className="gy-3 py-1">
              <Col sm="6">
                {canManagePaymentPlan && event?.scheduleType === "Class" && event?.salesDetailsId && (
                  <Button
                    type="button"
                    color="secondary"
                    outline
                    onClick={() => {
                      const scheduledDate = new Date(event.start);
                      setPaymentPlanCourse({
                        salesDetailsId: event.salesDetailsId,
                        studentId: event.studentId,
                        subject: event.subjectName,
                        month: scheduledDate.getMonth() + 1,
                        year: scheduledDate.getFullYear(),
                      });
                      tutorToggle();
                    }}
                  >
                    <Icon name="wallet" className="mr-1" /> Payment Plan
                  </Button>
                )}
              </Col>
              <Col sm="6">
                <div style={{ display: "flex", gap: "10px", float: "right" }}>
                  {canEditAttendance && !readOnly && (
                    <Button type="submit" color="primary" disabled={isSaving}>
                      {isSaving ? (
                        <>
                          <Spinner size="sm" className="mr-1" /> Saving...
                        </>
                      ) : "Save"}
                    </Button>
                  )}
                  <Button type="button" color="danger" className="btn-dim" onClick={() => tutorToggle()}>
                    {canEditAttendance && !readOnly ? "Cancel" : "Close"}
                  </Button>
                </div>
              </Col>
            </Row>
          </Form>
        </ModalBody>
      </Modal>
      <AvailabilityComparisonModal
        isOpen={Boolean(rescheduleComparison)}
        classEvent={rescheduleComparison?.event}
        requestedBy={rescheduleComparison?.requestedBy}
        onClose={() => setRescheduleComparison(null)}
        onOpenClass={() => {
          setRescheduleComparison(null);
          tutorToggle();
        }}
      />
      <PaymentPlanModal
        isOpen={Boolean(paymentPlanCourse)}
        course={paymentPlanCourse}
        onClose={() => setPaymentPlanCourse(null)}
      />
      <Modal isOpen={edit} toggle={toggleEdit} className="modal-md">
        <ModalHeader toggle={toggleEdit}>Edit Event</ModalHeader>
        <ModalBody>
          <form className="form-validate is-alter" onSubmit={handleSubmit(handleFormSubmit)}>
            <Row className="gx-4 gy-3">
              <Col size="12">
                <FormGroup>
                  <label className="form-label" htmlFor="event-title">
                    Event Title
                  </label>
                  <div className="form-control-wrap">
                    <input
                      type="text"
                      id="event-title"
                      name="title"
                      className="form-control"
                      ref={register({ required: true })}
                      defaultValue={event.title}
                    />
                    {errors.title && <p className="invalid">This field is required</p>}
                  </div>
                </FormGroup>
              </Col>
              <Col sm="6">
                <FormGroup>
                  <label className="form-label">Start Date &amp; Time</label>
                  <Row className="gx-2">
                    <div className="w-55">
                      <div className="form-control-wrap">
                        <DatePicker
                          selected={new Date(event.start)}
                          onChange={(date) => updateEvent({ ...event, start: setDateForPicker(date) })}
                          className="form-control date-picker"
                        />
                      </div>
                    </div>
                    <div className="w-45">
                      <div className="form-control-wrap has-timepicker">
                        <DatePicker
                          selected={dates.startTime}
                          onChange={(date) => setDates({ ...dates, startTime: date })}
                          showTimeSelect
                          showTimeSelectOnly
                          timeIntervals={15}
                          timeCaption="Time"
                          dateFormat="h:mm aa"
                          className="form-control date-picker"
                        />
                      </div>
                    </div>
                  </Row>
                </FormGroup>
              </Col>
              <Col sm="6">
                <FormGroup>
                  <label className="form-label">End Date &amp; Time</label>
                  <Row className="gx-2">
                    <div className="w-55">
                      <div className="form-control-wrap">
                        <DatePicker
                          selected={new Date(event.end)}
                          onChange={(date) => updateEvent({ ...event, end: setDateForPicker(date) })}
                          className="form-control date-picker"
                        />
                      </div>
                    </div>
                    <div className="w-45">
                      <div className="form-control-wrap has-timepicker">
                        <DatePicker
                          selected={dates.endTime}
                          onChange={(date) => setDates({ ...dates, endTime: date })}
                          showTimeSelect
                          showTimeSelectOnly
                          timeIntervals={15}
                          timeCaption="Time"
                          dateFormat="h:mm aa"
                          className="form-control date-picker"
                        />
                      </div>
                    </div>
                  </Row>
                </FormGroup>
              </Col>
              <Col size="12">
                <FormGroup>
                  <label className="form-label" htmlFor="event-description">
                    Event Description
                  </label>
                  <div className="form-control-wrap">
                    <textarea
                      className="form-control"
                      id="event-description"
                      name="description"
                      ref={register({ required: true })}
                      defaultValue={event.description}
                    ></textarea>
                    {errors.description && <p className="invalid">This field is required</p>}
                  </div>
                </FormGroup>
              </Col>
              <Col size="12">
                <FormGroup>
                  <label className="form-label">Event Category</label>
                  <div className="form-control-wrap">
                    <RSelect options={eventOptions} defaultValue={event.type} onChange={(e) => settheme(e)} />
                  </div>
                </FormGroup>
              </Col>
              <Col size="12">
                <ul className="d-flex justify-content-between gx-4 mt-1">
                  <li>
                    <Button type="submit" color="primary">
                      Update Event
                    </Button>
                  </li>
                  <li>
                    <Button color="danger" className="btn-dim" onClick={toggleEdit}>
                      Discard
                    </Button>
                  </li>
                </ul>
              </Col>
            </Row>
          </form>
        </ModalBody>
      </Modal>
      {statusModal == true && (
        <>
          <ClassStatusUpdate
            dataItem={dataItem}
            key="scheduleClass"
            source="Calender"
            guestType={scheduleType}
            salesDetails={salesDetails}
            scheduleDetailsId={event.scheduleDetailsId}
            type={FollowUpStatus.NeedToSchedule}
            modalOpen={statusModal}
            modalStateChange={(resp) => {
              if (resp == "success") {
                UpdateSchedule("class");
              } else {
                if (resp == "closeaction") {
                  setFormData((prev) => ({ ...prev, eventStatus: defaultGuid }));
                  tutorToggle();
                  onEdit("close");
                }
              }
              setScheduleDemoModal(false);
            }}
          ></ClassStatusUpdate>
        </>
      )}
      {scheduleDemoModal == true && (
        <>
          <ScheduleDemo
            dataItem={dataItem}
            key="scheduleDemo"
            source="Calender"
            guestType={scheduleType}
            salesDetails={salesDetails}
            scheduleDetailsId={event.scheduleDetailsId}
            eventStatusCode={eventStatusCode}
            type={FollowUpStatus.NeedToSchedule}
            modalOpen={scheduleDemoModal}
            modalStateChange={(resp) => {
              if (resp == "success") {
                UpdateSchedule(
                  eventStatusCode == ClassStatusTypes.ClassRescheduled ? "class" : "demo"
                );
              } else {
                if (resp != "closeaction") {
                  tutorToggle();
                  onEdit("close");
                } else {
                  setFormData((prev) => ({ ...prev, eventStatus: defaultGuid }));
                }
              }
              setScheduleDemoModal(false);
            }}
          ></ScheduleDemo>
        </>
      )}
    </React.Fragment>
  );
};

export default CalenderApp;
