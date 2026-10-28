import { Redirect } from "react-router-dom";

//url for production
export var url = "";
if (process.env.NODE_ENV === "development") {
  url = "";
} else {
  url = window.location.host.split("/")[1];
  if (url) {
    url = `/${window.location.host.split("/")[1]}`;
  } else url = process.env.PUBLIC_URL; /// ADD YOUR CPANEL SUB-URL
}

//Function to validate and return errors for a form
export const checkForm = (formData) => {
  let errorState = {};
  Object.keys(formData).forEach((item) => {
    if (formData[item] === null || formData[item] === "") {
      errorState[item] = "This field is required";
    }
  });
  return errorState;
};

export const getColor = (name) => {
  let hash = 0;
  if (name?.length > 0) {
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = Math.floor(Math.abs((Math.sin(hash) * 16777215) % 1) * 16777215).toString(16);
    return "#" + "0".repeat(6 - color.length) + color;
  }
  return "";
};

export const findUpper1 = (name) => {
  if (name == null || name == undefined) {
    name = "";
  }
  const parts = name.trim().split(" ");
  if (parts.length === 1) {
    // For a single name, use the first two letters
    return name.slice(0, 2).toUpperCase();
  } else {
    // For multiple names, use the first letter of each word (up to 2)
    return parts
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  }
};

//Function that returns the first or first two letters from a name
export const findUpper = (string) => {
  if (string == null) return "";
  let extractedString = [];
  for (var i = 0; i < string.length; i++) {
    if (string.charAt(i) === string.charAt(i).toUpperCase() && string.charAt(i) !== " ") {
      extractedString.push(string.charAt(i));
    }
  }
  if (extractedString.length > 1) {
    return extractedString[0] + extractedString[1];
  } else {
    return extractedString[0];
  }
};

//Function that calculates the from current date
export const setDeadline = (days) => {
  let todayDate = new Date();
  var newDate = new Date(todayDate);
  newDate.setDate(newDate.getDate() + days);
  return newDate;
};

// Function to set deadline for projects
export const setDeadlineDays = (deadline) => {
  var currentDate = new Date();
  var difference = deadline.getTime() - currentDate.getTime();
  var days = Math.ceil(difference / (1000 * 3600 * 24));
  return days;
};

//Date formatter function
export const dateFormatterAlt = (date, reverse) => {
  let d = date.getDate();
  let m = date.getMonth();
  let y = date.getFullYear();
  reverse ? (date = m + "-" + d + "-" + y) : (date = y + "-" + d + "-" + m);
  return date;
};

//Date formatter function
export const dateFormatter = (date, reverse) => {
  var dateformat = date.split("-");
  //var date = dateformat[1]+"-"+dateformat[2]+"-"+dateformat[0];
  reverse
    ? (date = dateformat[2] + "-" + dateformat[0] + "-" + dateformat[1])
    : (date = dateformat[1] + "-" + dateformat[2] + "-" + dateformat[0]);
  return date;
};

//Month Names
export const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

//todays Date
export const todaysDate = new Date();

// Function to structure date ex : Jun 4, 2011;
export const getDateStructured = (date) => {
  let d = date.getDate();
  let m = date.getMonth();
  let y = date.getFullYear();
  let final = monthNames[m] + " " + d + ", " + y;
  return final;
};

// Function to structure date ex: YYYY-MM-DD
export const setDateForPicker = (rdate) => {
  let d = rdate.getDate();
  d < 10 && (d = "0" + d);
  let m = rdate.getMonth() + 1;
  m < 10 && (m = "0" + m);
  let y = rdate.getFullYear();
  rdate = y + "-" + m + "-" + d;

  return rdate;
};

//current Time
export const currentTime = () => {
  var hours = todaysDate.getHours();
  var minutes = todaysDate.getMinutes();
  var ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  minutes = minutes < 10 ? "0" + minutes : minutes;
  var strTime = hours + ":" + minutes + " " + ampm;
  return strTime;
};

//Percentage calculation
export const calcPercentage = (str1, str2) => {
  let result = Number(str2) / Number(str1);
  result = result * 100;
  return Math.floor(result);
};

//shortens a long string
export const truncate = (str, n) => {
  return str.length > n ? str.substr(0, n - 1) + " " + truncate(str.substr(n - 1, str.length), n) : str;
};

export const RedirectAs404 = ({ location }) => (
  <Redirect to={Object.assign({}, location, { state: { is404: true } })} />
);

// returns upload url
export const getUploadParams = () => {
  return { url: "https://httpbin.org/post" };
};

// Converts KB to MB
export const bytesToMegaBytes = (bytes) => {
  let result = bytes / (1024 * 1024);
  return result.toFixed(2);
};

export const bulkActionOptions = [
  { value: "suspend", label: "Suspend User" },
  { value: "delete", label: "Delete User" },
];

export const getImageUrl = (data) => {
  if (data?.fileData == null || data?.fileData == "") {
    return "";
  }
  const url = `data:image/jpeg;base64, ${data?.fileData}`;
  return url;
};

export const convertToTimeSpan = (timeStr) => {
  const [time, modifier] = timeStr.split(" ");
  let [hours, minutes] = time.split(":").map(Number);

  if (modifier === "PM" && hours !== 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;

  // Return in format compatible with TimeSpan (HH:mm:ss)
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:00`;
};

const convertTimeToMinutes = (time) => {
  const date = new Date(time);
  return date.getHours() * 60 + date.getMinutes();
};

const normalizeTimeToRange = (timeInMinutes, min = 0, max = 1440) => {
  return Math.max(min, Math.min(timeInMinutes, max)); // Clamp between min and max
};

const parseTime = (time) => {
  const [timePart, period] = time.split(" ");
  let [hours, minutes] = timePart.split(":").map(Number);

  if (period === "PM" && hours !== 12) {
    hours += 12; // Convert PM hour to 24-hour format
  }
  if (period === "AM" && hours === 12) {
    hours = 0; // Midnight case (12 AM is 00:00 in 24-hour format)
  }

  return hours * 60 + minutes;
};

export const _findOverlappingIndices = (slots) => {
  const overlapping = new Set();
  for (let i = 0; i < slots.length; i++) {
    const aStart = parseTime(slots[i].start);
    const aEnd = parseTime(slots[i].end);
    for (let j = i + 1; j < slots.length; j++) {
      const bStart = parseTime(slots[j].start);
      const bEnd = parseTime(slots[j].end);
      if (aStart < bEnd && bStart < aEnd) {
        overlapping.add(i);
        overlapping.add(j);
      }
    }
  }
  return Array.from(overlapping);
};

export const findOverlapsInAllocatedSlots = (slots, allocatedSlots) => {
  const overlapping = new Set();
  for (let i = 0; i < slots.length; i++) {
    const aStart = parseTime(slots[i].startTime);
    const aEnd = parseTime(slots[i].endTime);

    for (let j = 0; j < allocatedSlots.length; j++) {
      const bStart = parseTime(allocatedSlots[j].startTime);
      const bEnd = parseTime(allocatedSlots[j].endTime);
      if (aStart < bEnd && bStart < aEnd) {
        overlapping.add(i);
        overlapping.add(j);
      }
    }
  }
  return Array.from(overlapping);
};

export const findOverlappingIndices = (slots) => {
  const overlapping = new Set();
  for (let i = 0; i < slots.length; i++) {
    const aStart = parseTime(slots[i].startTime);
    const aEnd = parseTime(slots[i].endTime);
    if (aStart >= aEnd) {
      overlapping.add(i);
      continue;
    }
    for (let j = i + 1; j < slots.length; j++) {
      const bStart = parseTime(slots[j].startTime);
      const bEnd = parseTime(slots[j].endTime);
      if (aStart < bEnd && bStart < aEnd) {
        overlapping.add(i);
        overlapping.add(j);
      }
    }
  }
  return Array.from(overlapping);
};

export const formatTime1 = (value) => {
  const hours24 = Math.floor(value / 60);
  const minutes = Math.round(value % 60); // Round minutes to avoid decimals
  const ampm = hours24 >= 12 ? "PM" : "AM";
  let hours12 = hours24 % 12;
  hours12 = hours12 === 0 ? 12 : hours12; // Convert 0 to 12 for AM/PM format

  return `${hours12}:${minutes.toString().padStart(2, "0")} ${ampm}`;
};

export const formatTime24 = (value) => {
  const totalMinutes = Math.max(0, Math.min(1440, Math.round(Number(value) || 0)));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
};

export const processTimeData = (data) => {
  let uniqueId = 0;
  let dataItems = [];
  data.forEach((s) => {
    let startMinutes = 0;
    let endMinutes = 0;
    const _slots = s.timeSlots.map((t, index) => {
      startMinutes = convertTimeToMinutes(t.startTime1);
      endMinutes = convertTimeToMinutes(t.endTime1);
      const selectedTime = `${formatTime1(startMinutes)}-${formatTime1(endMinutes)}`;
      return {
        dayInNo: s.dayInNo,
        uniqueId: index,
        dayofWeek: t.day,
        startTime: formatTime1(startMinutes),
        startMinutes: startMinutes,
        endTime: formatTime1(endMinutes),
        endMinutes: endMinutes,
        minMinutes: startMinutes,
        maxMinutes: endMinutes,
        selectedTime: selectedTime,
      };
    });

    const dateItem = {
      dayInNo: s.dayInNo,
      dayofWeek: s.day,
      slots: _slots,
      startMinutes: startMinutes,
      endMinutes: endMinutes,
      minMinutes: startMinutes,
      maxMinutes: endMinutes,
    };
    dataItems.push(dateItem);
  });
  return dataItems;

  return data.map(({ startTime, endTime, dayofWeek, id }) => {
    const startMinutes = convertTimeToMinutes(startTime);
    const endMinutes = convertTimeToMinutes(endTime);
    uniqueId = id;
    if (id == null || id == undefined) {
      uniqueId = uniqueId + 1;
    }
    return {
      uniqueId,
      dayofWeek,
      startTime,
      startMinutes: startMinutes,
      endTime,
      endMinutes: endMinutes,
    };
  });
};

export const GetClassNoteLabel = (code) => {
  if (code == FollowUpStatus.ClassCanceled) {
    return "Reason for Cancel";
  } else if (code == FollowUpStatus.ClassReScheduled) {
    return "Reason for Reschedule";
  } else if (code == FollowUpStatus.ClassPostponed) {
    return "Reason for Pontpond";
  } else {
    return "Feedback/Comments";
  }
};

export const NotificationType = Object.freeze({
  SalesCreate: 100401,
  CourseEnrollment: 100402,
  AssignTutor: 100403,
  ApproveTutorAssignment: 100404,
  RejectTutorAssignment: 100405,
  TutorAssigned: 100406,
  ScheduleDemoClass: 100407, // backend: ScheduleClass
  Acknowledgment: 100408,
  ScheduleDemo: 100409,
  ReScheduleClass: 100412,
  ReScheduleDemo: 100413,
  TutorPaymentApprovalRequest: 100422,
  TutorPaymentDecision: 100423,
  ClassReminder: 100459,
 TaskAssigned: 100460,
TaskCompleted: 100461,
TutorReassigned: 100462,
ClassRescheduleRequest: 100463,
ClassCompletionThreshold: 100464,
ClassScheduleChanged: 100465,
ClassTimeRequest: 100466,
ClassStatusEditRequest: 100467,
ClassStatusEditDecision: 100468,
ScheduleChangeRequest: 100469,
ScheduleChangeDecision: 100470,
});

// Page a notification opens, or null when it has none:
// - "Class Re-schedule Request": the class in the Operations calendar (with the availability comparison);
// - "Class Completion Threshold": that student in the Accounts student list (to prepare the invoice);
// - "Class Schedule Changed" / "Class Time Request": the Schedule Calendar;
// - "Class Status Edit Decision": the tutor's or student's own calendar.
// - "Schedule Change Request" / "Schedule Change Decision": the Schedule Calendar on that enrolment.
export const notificationLinkPath = (notification) => {
  if (notification?.notificationType == NotificationType.ClassRescheduleRequest && notification?.scheduleDetailsId) {
    const classDate = notification.classStartTime ? new Date(notification.classStartTime) : null;
    const monthQuery = classDate ? `&month=${classDate.getMonth() + 1}&year=${classDate.getFullYear()}` : "";
    return `${process.env.PUBLIC_URL}/lms/operation/view-calendar?scheduleDetailsId=${notification.scheduleDetailsId}${monthQuery}`;
  }
  if (notification?.notificationType == NotificationType.ClassCompletionThreshold) {
    const search = notification.studentName ? `?search=${encodeURIComponent(notification.studentName)}` : "";
    return `${process.env.PUBLIC_URL}/lms/accounts-studentlist${search}`;
  }
  if (
    notification?.notificationType == NotificationType.ClassScheduleChanged ||
    notification?.notificationType == NotificationType.ClassTimeRequest
  ) {
    return `${process.env.PUBLIC_URL}/tct-schedule-calendar`;
  }
  // Schedule Calendar: a request (to Operations) opens the Requests tab; a decision (to tutor/student) opens that enrolment.
  if (notification?.notificationType == NotificationType.ScheduleChangeRequest) {
    return `${process.env.PUBLIC_URL}/tct-schedule-calendar?tab=requests`;
  }
  if (notification?.notificationType == NotificationType.ScheduleChangeDecision && notification?.salesDetailsId) {
    return `${process.env.PUBLIC_URL}/tct-schedule-calendar?salesDetailsId=${notification.salesDetailsId}`;
  }
  if (notification?.notificationType == NotificationType.ClassStatusEditDecision) {
    const role = localStorage.getItem("userRole");
    if (role === "Tutor") return `${process.env.PUBLIC_URL}/tct-tutor-calender`;
    if (role === "Student") return `${process.env.PUBLIC_URL}/tct-student-calendar`;
  }
  return null;
};

export const UserRolesConst = Object.freeze({
  SUPER_ADMIN: "SuperAdmin",
  SALES_ADMIN: "SalesAdmin",
  OPERATIONS_ADMIN: "OperationsAdmin",
  OPERATIONS: "Operations",
  COORDINATOR_ADMIN: "CoordinatorAdmin",
  COORDINATOR: "Coordinator",
  ACCOUNTS_ADMIN: "AccountsAdmin",
  ACCOUNTS: "Accounts",
  PAYROLL_ADMIN: "PayrollAdmin",
  PAYROLL: "Payroll",
  HR_ADMIN: "HRAdmin",
  HR: "HR",
  TUTOR: "Tutor",
  STUDENT: "Student",
});

export const FollowUpStatus = Object.freeze({
  DemoCompleted: 20041,
  DCNeedToSchedule: 20018,
  ShortFollowUp: 20008,
  RequestForQuotation: 20025,
  DemoPendingTutorAssigned: 20002,
  ClassCanceled: 20021,
  Reject: 20014,
  Drop: 20005,
  ReDemo: 20007,
  ClassReScheduled: 20023,
  DemoScheduled: 20019,
  NeedToSchedule: 20003,
  DemoPostponed: 20016,
  DemoCancelled: 20015,
  SalesFollowUp: 20011,
  DemoPendingTutorAssignedNotApproved: 20012,
  DemoPendingTutorAssignedApproved: 20013,
  ParentFollowUp: 20010,
  ClassPostponed: 20022,
  DemoPendingTutorNotAssigned: 20001,
  ClassSchedule: 20004,
  RequestForReschedule: 20024,
  LongFollowUp: 20009,
  FollowUp: 20006,  
  ClassCompleted: 20020,
  ReScheduleDemo: 20028,
  DemoRescheduleRequest: 20029,
  ClassRescheduleRequest: 20030,
  OpsApproved: 20042,
  GoWithTutorsAttendanceOpsApproved: 20043,
  GoWithOperationAttendanceOpsApproved: 20044,
});

export const ClassScheduleType = Object.freeze({
  Class: 100501,
  Demo: 100502,
});

export const UserRole = Object.freeze({
  SuperAdmin: "1",
  Admin: "2",
  OperationsAdmin: "3",
  Operations: "4",
  CoordinatorAdmin: "5",
  Coordinator: "6",
  AccountsAdmin: "7",
  Accounts: "8",
  PayrollAdmin: "9",
  Payroll: "10",
  HRAdmin: "11",
  HR: "12",
  Tutor: "13",
  Student: "14",
});

export const WeekDays = [
  { value: "Sunday", label: "Sun" },
  { value: "Monday", label: "Mon" },
  { value: "Tuesday", label: "Tue" },
  { value: "Wednesday", label: "Wed" },
  { value: "Thursday", label: "Thu" },
  { value: "Friday", label: "Fri" },
  { value: "Saturday", label: "Sat" },
];

export const actionStatus = [
  // {
  //   label: "Demo Completed Feedback Pending",
  //   value: 20027
  // },
  {
    label: "Long Follow up",
    value: 20009,
  },
  {
    label: "Short Follow up",
    value: 20008,
  },
  {
    label: "Parent Follow up",
    value: 20010,
  },
  {
    label: "Sales Follow up",
    value: 20011,
  },
  {
    label: "Re-demo",
    value: 20007,
  },
  {
    label: "Drop",
    value: 20005,
  },
  {
    label: "Need to schedule",
    value: 20003,
  },
];

export const UUIDNill = () => {
  return "00000000-0000-0000-0000-000000000000";
};

export const CoordinatorActions = Object.freeze({
  // DemoPendingTutorNotAssigned: 20001,
  // DemoPendingTutorAssigned: 20002,
  // NeedToSchedule: 20003,
  DPLongFollowup: 20006,
  ReDemo: 20007,
  ShortFollowUp: 20008,
  DPShortFollowup: 20009,
  DPParentFollowup: 20010,
  // SalesFollowUp: 20011,
  // DemoPendingTutorAssignedNotApproved: 20012,
  // DemoPendingTutorAssignedApproved: 20013,
  DemoCancelled: 20015,
  // DemoPostponed: 20016,
  // DemoCompleted: 20018,
  // DemoScheduled: 20019,
  DemoCompleted: 20041,
  RequestForReschedule: 20024,
  RequestForQuotation: 20025,
  TutorChangedDropped: 20026,
  DemoCompletedFeedbackPending: 20027,
  ReScheduleDemo: 20028,
  DemoRescheduleRequest: 20029,
  DCDropped: 20031,
  DPDropped: 20032,
  DCShortFollowup: 20033,
  DCParentFollowup: 20034,
  DCTutorChange: 20035,
});


export const ClassStatusTypes = Object.freeze({
    ClassCompleted: 1009001,
    ClassCancelled: 1009002,
    ClassCancelledStudentNotAvailable: 1009003,
    RequestForReschedule: 1009004,
    ClassPostponed: 1009005,
    ClassRescheduled: 1009006,
    ClassCancelledTutorNotAvailable: 1009007,
    ClassCompletedExtraClass: 1009008,
    ClassCompletedPreponed: 1009009,
    ClassCompletedPostponed: 1009010,
});

// Extra Class category: Completed - Extra Class / Preponed / Postponed all count as one Extra Class.
export const ExtraClassStatusCodes = Object.freeze([
  ClassStatusTypes.ClassCompletedExtraClass,
  ClassStatusTypes.ClassCompletedPreponed,
  ClassStatusTypes.ClassCompletedPostponed,
]);

// Calendar colour for the Extra Class category (theme $orange).
export const ExtraClassColor = Object.freeze({ background: "#ffa353", border: "#e8893a" });

// Calendar colour for the other Class Status values (lookup 1009), using the theme's existing
// fc-event-* colour classes. The Extra Class family (1009008-1009010) is not listed: it is the
// orange Extra Class category.
export const ClassStatusEventStyles = Object.freeze({
  [ClassStatusTypes.ClassCompleted]: { className: "fc-event-success", label: "Completed" },
  [ClassStatusTypes.ClassCancelled]: { className: "fc-event-danger", label: "Cancelled" },
  [ClassStatusTypes.ClassCancelledStudentNotAvailable]: { className: "fc-event-pink", label: "Cancelled - Student N/A" },
  [ClassStatusTypes.ClassCancelledTutorNotAvailable]: { className: "fc-event-secondary", label: "Cancelled - Tutor N/A" },
  [ClassStatusTypes.ClassPostponed]: { className: "fc-event-warning", label: "Postponed" },
  [ClassStatusTypes.RequestForReschedule]: { className: "fc-event-indigo", label: "Re-schedule Request" },
  [ClassStatusTypes.ClassRescheduled]: { className: "fc-event-azure", label: "Re-Scheduled" },
});

export const scheduleStatusConfig = [
  {
    typeCodeValue: 20020,
    statusName: "Class Completed",
    icon: "check-circle-fill",
    color: "success",
  },
  {
    typeCodeValue: 20041,
    statusName: "Demo Completed",
    icon: "done-all-fill",
    color: "green",
  },
  {
    typeCodeValue: 20019,
    statusName: "Demo Scheduled",
    icon: "calendar-fill",
    color: "primary",
  },
  {
    typeCodeValue: 20004,
    statusName: "Class Schedule",
    icon: "calendar-fill",
    color: "orange",
  },
  {
    typeCodeValue: 20023,
    statusName: "Class Re-Scheduled",
    icon: "reload-alt-fill",
    color: "warning",
  },
  {
    typeCodeValue: 20028,
    statusName: "Re-Schedule Demo",
    icon: "repeat-fill",
    color: "orange",
  },
  {
    typeCodeValue: 20024,
    statusName: "Request for Re-schedule",
    icon: "undo-fill",
    color: "purple",
  },
  {
    typeCodeValue: 20015,
    statusName: "Demo Cancelled",
    icon: "cross-circle-fill",
    color: "danger",
  },
  {
    typeCodeValue: 20021,
    statusName: "Class Canceled Tutor Not Available",
    icon: "user-cross-fill",
    color: "danger",
  },
  {
    typeCodeValue: 20036,
    statusName: "Class Canceled Student Not Available",
    icon: "user-cross",
    color: "pink",
  },
  {
    typeCodeValue: 20037,
    statusName: "On spot tutor cancellation",
    icon: "alert-fill",
    color: "warning",
  },
  {
    typeCodeValue: 20038,
    statusName: "On spot student cancellation",
    icon: "alert-circle-fill",
    color: "orange",
  },
  {
    typeCodeValue: 20039,
    statusName: "Temporary Hold",
    icon: "pause-circle-fill",
    color: "secondary",
  },
  {
    typeCodeValue: 20040,
    statusName: "Permanent Hold",
    icon: "shield-off-fill",
    color: "dark",
  },
  {
    typeCodeValue: 20005,
    statusName: "Dropped",
    icon: "trash-fill",
    color: "danger",
  },
  {
    typeCodeValue: 20031,
    statusName: "DC Dropped",
    icon: "trash-empty-fill",
    color: "red",
  },
  {
    typeCodeValue: 20032,
    statusName: "DP Dropped",
    icon: "delete-fill",
    color: "pink",
  },
  {
    typeCodeValue: 20008,
    statusName: "ShortFollowUp",
    icon: "clock-fill",
    color: "warning",
  },
  {
    typeCodeValue: 20006,
    statusName: "DP Long Followup",
    icon: "timer-fill",
    color: "orange",
  },
  {
    typeCodeValue: 20011,
    statusName: "SalesFollowUp",
    icon: "growth-fill",
    color: "info",
  },
  {
    typeCodeValue: 20025,
    statusName: "Request for Quotation",
    icon: "money-fill",
    color: "primary",
  },
];
