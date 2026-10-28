// Config-driven Schedule status pages: one entry here + one Menu row (see
// TCTLMSAPI/TCTDatabase/DDL/add_schedule_status_menus_bulk.sql) is all that's needed to add a new
// status page. Route: /lms/schedule-status/:slug/ -> ScheduleStatusList.jsx looks itself up here.
// See docs/SCHEDULE_STATUS_PAGES.md for the full pattern.

const scheduleStatusPages = [
  {
    slug: "class-cancelled-tutor-na",
    title: "Class Canceled Tutor Not Available",
    description: "Classes cancelled because the tutor was not available.",
    statusCodes: "20021",
  },
  {
    slug: "class-cancelled-student-na",
    title: "Class Canceled Student Not Available",
    description: "Classes cancelled because the student was not available.",
    statusCodes: "20036",
  },
  {
    slug: "dropped",
    title: "Dropped",
    description: "Sales dropped from the schedule pipeline.",
    statusCodes: "20005",
  },
  {
    slug: "dp-long-followup",
    title: "DP Long Followup",
    description: "Demo pending - long followup.",
    statusCodes: "20006",
  },
  {
    slug: "re-demo",
    title: "ReDemo",
    description: "Sessions marked for a repeat demo.",
    statusCodes: "20007",
  },
  {
    slug: "short-followup",
    title: "ShortFollowUp",
    description: "Sessions marked for a short followup.",
    statusCodes: "20008",
  },
  {
    slug: "dp-short-followup",
    title: "DP Short Followup",
    description: "Demo pending - short followup.",
    statusCodes: "20009",
  },
  {
    slug: "dp-parent-followup",
    title: "DP Parent Followup",
    description: "Demo pending - parent followup.",
    statusCodes: "20010",
  },
  {
    slug: "sales-followup",
    title: "SalesFollowUp",
    description: "Sessions marked for sales followup.",
    statusCodes: "20011",
  },
  {
    slug: "reject",
    title: "Reject",
    description: "Rejected sales/schedule requests.",
    statusCodes: "20014",
  },
  {
    slug: "demo-cancelled",
    title: "Demo Cancelled",
    description: "Demos that were cancelled.",
    statusCodes: "20015",
  },
  {
    slug: "demo-postponed",
    title: "Demo Postponed",
    description: "Demos that were postponed.",
    statusCodes: "20016",
  },
  {
    slug: "dc-need-to-schedule",
    title: "DC Need To Schedule",
    description: "Demo completed - needs class scheduling.",
    statusCodes: "20018",
  },
  {
    slug: "demo-scheduled",
    title: "Demo Scheduled",
    description: "Demos that are scheduled.",
    statusCodes: "20019",
  },
  {
    slug: "class-postponed",
    title: "Class Postponed",
    description: "Classes that were postponed.",
    statusCodes: "20022",
  },
  {
    slug: "request-for-reschedule",
    title: "Request For Re-Schedule",
    description: "Requests to reschedule a class.",
    statusCodes: "20024",
  },
  {
    slug: "request-for-quotation",
    title: "Request For Quotation",
    description: "Requests for a quotation.",
    statusCodes: "20025",
  },
  {
    slug: "tutor-changed-dropped",
    title: "Tutor Changed Dropped",
    description: "Dropped after a tutor change.",
    statusCodes: "20026",
  },
  {
    slug: "demo-completed-feedback-pending",
    title: "Demo Completed Feedback Pending",
    description: "Demo completed, feedback still pending.",
    statusCodes: "20027",
  },
  {
    slug: "demo-reschedule-request",
    title: "Demo Reschedule Request",
    description: "Requests to reschedule a demo.",
    statusCodes: "20029",
  },
  {
    slug: "schedule-change-request",
    title: "Schedule Change Request",
    description: "Requests to change an existing schedule.",
    statusCodes: "20030",
  },
  {
    slug: "dc-dropped",
    title: "DC Dropped",
    description: "Demo completed - dropped.",
    statusCodes: "20031",
  },
  {
    slug: "dp-dropped",
    title: "DP Dropped",
    description: "Demo pending - dropped.",
    statusCodes: "20032",
  },
  {
    slug: "dc-short-followup",
    title: "DC Short Followup",
    description: "Demo completed - short followup.",
    statusCodes: "20033",
  },
  {
    slug: "dc-parent-followup",
    title: "DC Parent Followup",
    description: "Demo completed - parent followup.",
    statusCodes: "20034",
  },
  {
    slug: "dc-tutor-change",
    title: "DC Tutor Change",
    description: "Demo completed - tutor change.",
    statusCodes: "20035",
  },
  {
    slug: "on-spot-tutor-cancellation",
    title: "On Spot Tutor Cancellation",
    description: "Classes cancelled on the spot by the tutor.",
    statusCodes: "20037",
  },
  {
    slug: "on-spot-student-cancellation",
    title: "On Spot Student Cancellation",
    description: "Classes cancelled on the spot by the student.",
    statusCodes: "20038",
  },
  {
    slug: "temporary-hold",
    title: "Temporary Hold",
    description: "Sessions on temporary hold.",
    statusCodes: "20039",
  },
  {
    slug: "permanent-hold",
    title: "Permanent Hold",
    description: "Sessions on permanent hold.",
    statusCodes: "20040",
  },
  {
    slug: "class-cancelled-legacy",
    title: "Class Cancelled",
    description: "Legacy class-cancelled status (Type_Code group 0B60F580, not used by current sales data).",
    statusCodes: "1009002",
  },
  {
    slug: "class-cancelled-student-na-legacy",
    title: "Class Cancelled Student Not Available",
    description: "Legacy class-cancelled-student-not-available status (Type_Code group 0B60F580, not used by current sales data).",
    statusCodes: "1009003",
  },
  // Migrated from standalone pages (DemoCompleted.jsx, ClassCompleted.jsx, ClassRescheduled.jsx,
  // ClassScheduled.jsx, RescheduleDemo.jsx) into the generic config-driven pattern.
  {
    slug: "demo-completed",
    title: "Demo Completed",
    description: "Manage and track completed demo sessions.",
    statusCodes: "20041",
  },
  {
    slug: "class-completed",
    title: "Class Completed",
    description: "Manage and track completed class sessions.",
    statusCodes: "20020",
  },
  {
    slug: "class-rescheduled",
    title: "Class Re-Scheduled",
    description: "Manage and track rescheduled class sessions.",
    statusCodes: "20023",
  },
  {
    slug: "class-scheduled",
    title: "Class Scheduled",
    description: "Manage and track scheduled class sessions.",
    statusCodes: "20004",
  },
  {
    slug: "reschedule-demo",
    title: "Re-Schedule Demo",
    description: "Manage and track demo re-schedule requests.",
    statusCodes: "20028",
  },
];

export const getScheduleStatusPageBySlug = (slug) =>
  scheduleStatusPages.find((entry) => entry.slug === slug);

export default scheduleStatusPages;
