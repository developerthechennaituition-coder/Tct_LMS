// Accounts Reports: the report categories from the TCT product document (Accounts section, pages 14–25).
// Each report lists its tabs (API views), the filters its data supports, summary tiles, columns and an optional chart.
// Column types: text, student, date, month, period, number, currency, pct, badge, metric (amount or count per row).
// Chart: { type: "bar" | "line" | "pie", x, series: [{ key, label }], sortBy, sortDirection } — drawn from the same API view.

const INVOICE_STATUSES = ["Paid", "Partially paid", "Pending", "Overdue", "Not tracked", "Critical", "Non-critical"].map((s) => [s, s]);
const CRITICALITY = [["Critical", "Critical (over 3 months past due)"], ["Non-critical", "Non-critical (up to 3 months)"]];
const ALL_FILTERS = ["date", "search", "student", "tutor", "subject", "bank", "board", "grade", "country"];

export const PAYMENT_RULES_NOTE =
  "Payment status exists only for invoices of a prepaid payment plan (Student Payment Plan upfront / balance invoice), " +
  "because payments can only be recorded against a plan. Plan payments are applied to the upfront invoice first, then the balance invoice. " +
  "Paid: paid ≥ invoice amount. Partially paid: some payment, balance remaining. Overdue: unpaid and the due date has passed. " +
  "Pending: unpaid, not yet due. All other invoices show “Not tracked”.";
export const CRITICAL_NOTE = "Critical = an unpaid balance whose due date is more than 3 months ago; Non-critical = past due by up to 3 months.";
export const REVENUE_NOTE =
  "Invoiced revenue = Student Invoice total amount, by the invoice's billing month (the same basis as the Accounts dashboard). " +
  "Collected = recorded student payments by paid date. Amounts are shown in ₹ (the stored currency is not set for most enrolments).";

export const ACCOUNTS_REPORTS = [
  {
    key: "overview",
    title: "Accounts Overview",
    icon: "dashboard",
    description: "Dashboard KPIs: active, new and invoiced students, collections, overdue amounts, collection efficiency and compliance.",
    filters: ALL_FILTERS,
    notes: [
      "Active students: active student accounts (not affected by the date range). New students: first enrolment (Sales Details) in the range. " +
        "Existing students with new subjects: students enrolled before the range who added a subject in it.",
      PAYMENT_RULES_NOTE,
      "Fee collection efficiency = paid ÷ invoiced amount, for payment-tracked invoices issued in the range. " +
        "Payment compliance = invoices paid in full on or before the due date ÷ payment-tracked invoices. Partial-payment rate = partially paid ÷ payment-tracked invoices.",
      "Tutor payments (previous month) = tutor invoices for the month before the To date's month.",
      "Staff salary and staff counts are restricted to Super Admin in the requirements and are not shown here.",
    ],
    summary: [
      { key: "ActiveStudents", label: "Active students" },
      { key: "NewStudents", label: "New students" },
      { key: "ExistingStudentsNewSubjects", label: "Existing students, new subjects" },
      { key: "InvoicedStudents", label: "Students invoiced" },
      { key: "InvoicedAmount", label: "Invoiced amount", format: "currency", hint: (d) => `${fmtCount(d.Invoices)} invoices` },
      { key: "Collected", label: "Collected", format: "currency", hint: (d) => `Previous period ${fmtMoney(d.CollectedPrevious)}` },
      { key: "OverdueAmount", label: "Overdue amount", format: "currency", hint: (d) => `${fmtCount(d.OverdueInvoices)} overdue invoices` },
      { key: "PendingInvoices", label: "Pending invoices", hint: (d) => `${fmtCount(d.NotTrackedInvoices)} not payment-tracked` },
      { key: "PartialPaymentRatePct", label: "Partial-payment rate", format: "pct" },
      { key: "FeeCollectionEfficiencyPct", label: "Fee collection efficiency", format: "pct" },
      { key: "PaymentCompliancePct", label: "Payment compliance", format: "pct" },
      { key: "TutorPaymentsPreviousMonth", label: "Tutor payments (previous month)", format: "currency" },
    ],
    views: [
      {
        key: "new-students", label: "New students",
        columns: [
          { key: "StudentName", label: "Student", type: "student", sort: true },
          { key: "GradeName", label: "Grade", sort: true },
          { key: "BoardName", label: "Board" },
          { key: "FirstEnrolledOn", label: "First enrolled", type: "date", sort: true },
          { key: "Subjects", label: "Subjects", type: "number", sort: true },
          { key: "SubjectNames", label: "Subject names", wrap: true },
        ],
      },
      {
        key: "new-subjects", label: "Existing students, new subjects",
        columns: [
          { key: "EnrolledOn", label: "Enrolled", type: "date", sort: true },
          { key: "StudentName", label: "Student", type: "student", sort: true },
          { key: "SubjectName", label: "New subject", sort: true },
          { key: "GradeName", label: "Grade" },
          { key: "BoardName", label: "Board" },
          { key: "FirstEnrolledOn", label: "Student since", type: "date", sort: true },
        ],
      },
      {
        key: "invoiced-students", label: "Invoiced students",
        columns: [
          { key: "StudentName", label: "Student", type: "student", sort: true },
          { key: "Invoices", label: "Invoices", type: "number", sort: true },
          { key: "InvoicedAmount", label: "Invoiced", type: "currency", sort: true },
          { key: "PaidAmount", label: "Paid", type: "currency", sort: true },
          { key: "BalanceAmount", label: "Balance", type: "currency", sort: true },
          { key: "NotTracked", label: "Not tracked", type: "number" },
        ],
      },
    ],
  },
  {
    key: "invoices",
    title: "Invoice Reports",
    icon: "file-docs",
    description: "Invoice list with payment status, reconciliation, collections by date, course and student, and pending / overdue invoices.",
    filters: ALL_FILTERS,
    notes: [PAYMENT_RULES_NOTE, CRITICAL_NOTE, "Invoice lists are dated by the invoice date (created). Collections are dated by the payment's paid date."],
    summary: [
      { key: "Invoices", label: "Invoices" },
      { key: "InvoicedAmount", label: "Invoiced amount", format: "currency" },
      { key: "Collected", label: "Collected", format: "currency" },
      { key: "OutstandingAmount", label: "Outstanding balance", format: "currency" },
      { key: "PaidInvoices", label: "Paid" },
      { key: "PartialInvoices", label: "Partially paid" },
      { key: "PendingInvoices", label: "Pending", hint: (d) => `${fmtCount(d.OverdueInvoices)} overdue · ${fmtCount(d.CriticalInvoices)} critical` },
      { key: "NotTrackedInvoices", label: "Not payment-tracked" },
    ],
    views: [
      {
        key: "list", label: "Invoice list", statuses: INVOICE_STATUSES,
        columns: [
          { key: "InvoiceNumber", label: "Invoice", sort: true },
          { key: "InvoiceDate", label: "Date", type: "date", sort: true },
          { key: "BillingMonth", label: "Billing month", type: "month" },
          { key: "DueDate", label: "Due", type: "date", sort: true },
          { key: "StudentName", label: "Student", type: "student", sort: true },
          { key: "SubjectName", label: "Course", sort: true },
          { key: "GradeName", label: "Grade" },
          { key: "BoardName", label: "Board" },
          { key: "BankName", label: "Bank" },
          { key: "InvoiceAmount", label: "Amount", type: "currency", sort: true },
          { key: "PaidAmount", label: "Paid", type: "currency", sort: true },
          { key: "BalanceAmount", label: "Balance", type: "currency", sort: true },
          { key: "PaymentStatus", label: "Status", type: "badge", sort: true },
          { key: "Criticality", label: "Overdue level", type: "badge" },
        ],
      },
      {
        key: "reconciliation", label: "Reconciliation",
        statuses: [["Paid", "Paid"], ["Partially paid", "Partially paid"], ["Pending", "Pending"], ["Overdue", "Overdue"]],
        columns: [
          { key: "InvoiceNumber", label: "Invoice", sort: true },
          { key: "InvoiceDate", label: "Date", type: "date", sort: true },
          { key: "StudentName", label: "Student", type: "student", sort: true },
          { key: "InvoiceAmount", label: "Invoiced", type: "currency", sort: true },
          { key: "PaidAmount", label: "Paid", type: "currency", sort: true },
          { key: "Difference", label: "Difference", type: "currency", sort: true },
          { key: "LastPaidDate", label: "Last payment", type: "date" },
          { key: "PaymentStatus", label: "Status", type: "badge", sort: true },
        ],
      },
      {
        key: "by-date", label: "Collection by date",
        chart: { type: "bar", x: "PaidDay", xType: "date", series: [{ key: "CollectedAmount", label: "Collected" }], sortBy: "PaidDay", sortDirection: "asc" },
        columns: [
          { key: "PaidDay", label: "Date", type: "date", sort: true },
          { key: "Payments", label: "Payments", type: "number", sort: true },
          { key: "Students", label: "Students", type: "number", sort: true },
          { key: "CollectedAmount", label: "Collected", type: "currency", sort: true },
        ],
      },
      {
        key: "by-course", label: "Collection by course",
        chart: { type: "bar", x: "CourseName", series: [{ key: "InvoicedAmount", label: "Invoiced" }, { key: "CollectedAmount", label: "Collected" }], sortBy: "InvoicedAmount", sortDirection: "desc" },
        columns: [
          { key: "CourseName", label: "Course", sort: true },
          { key: "Invoices", label: "Invoices", type: "number", sort: true },
          { key: "Students", label: "Students", type: "number", sort: true },
          { key: "InvoicedAmount", label: "Invoiced", type: "currency", sort: true },
          { key: "Payments", label: "Payments", type: "number" },
          { key: "CollectedAmount", label: "Collected", type: "currency", sort: true },
        ],
      },
      {
        key: "by-student", label: "Collection by student",
        columns: [
          { key: "StudentName", label: "Student", type: "student", sort: true },
          { key: "Invoices", label: "Invoices", type: "number", sort: true },
          { key: "InvoicedAmount", label: "Invoiced", type: "currency", sort: true },
          { key: "CollectedAmount", label: "Collected", type: "currency", sort: true },
          { key: "BalanceAmount", label: "Balance", type: "currency", sort: true },
        ],
      },
      {
        key: "pending", label: "Pending & overdue",
        statuses: [["Pending", "Pending"], ["Overdue", "Overdue"], ["Partially paid", "Partially paid"], ...CRITICALITY],
        columns: [
          { key: "InvoiceNumber", label: "Invoice", sort: true },
          { key: "DueDate", label: "Due", type: "date", sort: true },
          { key: "StudentName", label: "Student", type: "student", sort: true },
          { key: "SubjectName", label: "Course" },
          { key: "InvoiceAmount", label: "Amount", type: "currency" },
          { key: "BalanceAmount", label: "Balance", type: "currency", sort: true },
          { key: "DaysPastDue", label: "Days past due", type: "number", sort: true },
          { key: "PaymentStatus", label: "Status", type: "badge", sort: true },
          { key: "Criticality", label: "Overdue level", type: "badge", sort: true },
        ],
      },
    ],
  },
  {
    key: "revenue",
    title: "Revenue Reports",
    icon: "growth",
    description: "Monthly, quarterly and yearly revenue, revenue by course, tutor and student, period comparison and the 6-month trend.",
    filters: ALL_FILTERS,
    notes: [
      REVENUE_NOTE,
      "By course / by tutor use the invoice line amounts (Student Invoice Details subject amount); the tutor is the tutor on each invoice line.",
      "Comparison: the selected range vs the same number of days immediately before it. 6-month trend: the six months ending with the To date's month.",
    ],
    summary: [
      { key: "InvoicedRevenue", label: "Invoiced revenue", format: "currency" },
      { key: "Collected", label: "Collected", format: "currency" },
      { key: "Invoices", label: "Invoices" },
      { key: "StudentsInvoiced", label: "Students invoiced" },
      { key: "RevenuePerStudent", label: "Revenue per student", format: "currency" },
      { key: "CurrentInvoiced", label: "Invoiced this period", format: "currency", hint: (d) => `Previous period ${fmtMoney(d.PreviousInvoiced)}`, help: "By invoice date" },
    ],
    views: [
      {
        key: "period", label: "Monthly / quarterly / yearly", groupBy: true,
        chart: { type: "bar", x: "Period", xType: "period", series: [{ key: "InvoicedRevenue", label: "Invoiced" }, { key: "Collected", label: "Collected" }], sortBy: "Period", sortDirection: "asc" },
        columns: [
          { key: "Period", label: "Period", type: "period", sort: true },
          { key: "Invoices", label: "Invoices", type: "number", sort: true },
          { key: "Students", label: "Students", type: "number", sort: true },
          { key: "InvoicedRevenue", label: "Invoiced revenue", type: "currency", sort: true },
          { key: "Collected", label: "Collected", type: "currency", sort: true },
          { key: "CollectionPct", label: "Collected %", type: "pct", sort: true },
        ],
      },
      {
        key: "by-course", label: "By course",
        chart: { type: "pie", x: "CourseName", series: [{ key: "Revenue", label: "Revenue" }], sortBy: "Revenue", sortDirection: "desc" },
        columns: [
          { key: "CourseName", label: "Course", sort: true },
          { key: "Invoices", label: "Invoices", type: "number", sort: true },
          { key: "Students", label: "Students", type: "number", sort: true },
          { key: "Revenue", label: "Revenue", type: "currency", sort: true },
          { key: "SharePct", label: "Share", type: "pct", sort: true },
        ],
      },
      {
        key: "by-tutor", label: "By tutor",
        chart: { type: "bar", x: "TutorName", series: [{ key: "Revenue", label: "Revenue" }], sortBy: "Revenue", sortDirection: "desc" },
        columns: [
          { key: "TutorName", label: "Tutor", sort: true },
          { key: "Students", label: "Students", type: "number", sort: true },
          { key: "Subjects", label: "Subjects", type: "number", sort: true },
          { key: "Invoices", label: "Invoices", type: "number", sort: true },
          { key: "Revenue", label: "Revenue", type: "currency", sort: true },
          { key: "SharePct", label: "Share", type: "pct", sort: true },
        ],
      },
      {
        key: "by-student", label: "Student contribution",
        columns: [
          { key: "StudentName", label: "Student", type: "student", sort: true },
          { key: "InvoicedRevenue", label: "Invoiced", type: "currency", sort: true },
          { key: "InvoicedSharePct", label: "Share of invoiced", type: "pct", sort: true },
          { key: "Collected", label: "Collected", type: "currency", sort: true },
          { key: "CollectedSharePct", label: "Share of collected", type: "pct", sort: true },
        ],
      },
      {
        key: "monthly-invoices", label: "Monthly invoices", statuses: INVOICE_STATUSES.slice(0, 5),
        columns: [
          { key: "BillingMonth", label: "Billing month", type: "month", sort: true },
          { key: "InvoiceNumber", label: "Invoice", sort: true },
          { key: "InvoiceDate", label: "Date", type: "date" },
          { key: "StudentName", label: "Student", type: "student", sort: true },
          { key: "SubjectName", label: "Course" },
          { key: "InvoiceAmount", label: "Amount", type: "currency", sort: true },
          { key: "PaidAmount", label: "Paid", type: "currency" },
          { key: "PaymentStatus", label: "Status", type: "badge", sort: true },
        ],
      },
      {
        key: "comparison", label: "Current vs previous", paged: false,
        columns: [
          { key: "Metric", label: "Metric" },
          { key: "CurrentValue", label: "Selected period", type: "metric" },
          { key: "PreviousValue", label: "Previous period", type: "metric" },
          { key: "Change", label: "Change", type: "metric" },
          { key: "ChangePct", label: "Change %", type: "pct" },
        ],
      },
      {
        key: "trend", label: "6-month trend", paged: false,
        chart: { type: "line", x: "MonthStart", xType: "month", series: [{ key: "InvoicedRevenue", label: "Invoiced" }, { key: "Collected", label: "Collected" }], sortBy: "MonthStart", sortDirection: "asc" },
        columns: [
          { key: "MonthStart", label: "Month", type: "month", sort: true },
          { key: "InvoicedRevenue", label: "Invoiced revenue", type: "currency", sort: true },
          { key: "StudentsInvoiced", label: "Students invoiced", type: "number", sort: true },
          { key: "Collected", label: "Collected", type: "currency", sort: true },
          { key: "NewStudents", label: "New students", type: "number", sort: true },
          { key: "DroppedEnrollments", label: "Dropped enrolments", type: "number" },
        ],
      },
    ],
  },
  {
    key: "payments",
    title: "Payment Reports",
    icon: "wallet-alt",
    description: "Payments received, payment modes, partial and late payments, outstanding balances (critical / non-critical), tutor payments and bank-wise collections.",
    filters: [...ALL_FILTERS, "mode"],
    unavailable:
      "Not available — no data source: prepaid vs postpaid split (no prepaid/postpaid field is stored on enrolments or invoices) and tutor payout paid status (tutor invoices have no paid flag or paid date).",
    notes: [
      PAYMENT_RULES_NOTE,
      CRITICAL_NOTE,
      "Paid on/after due date compares each payment's paid date with its plan's upfront invoice due date.",
      "Tutor payments = Tutor Invoice total payment by pay month; status shows whether the invoice was emailed to the tutor.",
      "Bank-wise: the TCT bank selected on the enrolment (Sales).",
    ],
    summary: [
      { key: "Collected", label: "Collected", format: "currency" },
      { key: "Payments", label: "Payments" },
      { key: "StudentsPaying", label: "Students paying" },
      { key: "LatePayments", label: "Paid on/after due date" },
      { key: "PartialInvoices", label: "Partially paid invoices" },
      { key: "OutstandingAmount", label: "Outstanding balance", format: "currency", help: "Invoices up to the To date" },
      { key: "TutorPayable", label: "Tutor payments", format: "currency", hint: (d) => `${fmtCount(d.TutorInvoices)} tutor invoices` },
    ],
    views: [
      {
        key: "received", label: "Payments received",
        columns: [
          { key: "PaidDate", label: "Paid on", type: "date", sort: true },
          { key: "StudentName", label: "Student", type: "student", sort: true },
          { key: "SubjectName", label: "Course" },
          { key: "Amount", label: "Amount", type: "currency", sort: true },
          { key: "PaymentMode", label: "Mode", sort: true },
          { key: "ReferenceNo", label: "Reference" },
          { key: "InstallmentNo", label: "Instalment", type: "number" },
          { key: "BankName", label: "Bank", sort: true },
          { key: "Timing", label: "Timing", type: "badge" },
        ],
      },
      {
        key: "modes", label: "Payment modes",
        chart: { type: "pie", x: "PaymentMode", series: [{ key: "Amount", label: "Amount" }], sortBy: "Amount", sortDirection: "desc" },
        columns: [
          { key: "PaymentMode", label: "Mode", sort: true },
          { key: "Payments", label: "Payments", type: "number", sort: true },
          { key: "Students", label: "Students", type: "number", sort: true },
          { key: "Amount", label: "Amount", type: "currency", sort: true },
          { key: "SharePct", label: "Share", type: "pct", sort: true },
        ],
      },
      {
        key: "partial", label: "Partial payments",
        columns: [
          { key: "InvoiceNumber", label: "Invoice", sort: true },
          { key: "DueDate", label: "Due", type: "date", sort: true },
          { key: "StudentName", label: "Student", type: "student", sort: true },
          { key: "InvoiceAmount", label: "Amount", type: "currency", sort: true },
          { key: "PaidAmount", label: "Paid", type: "currency", sort: true },
          { key: "BalanceAmount", label: "Balance", type: "currency", sort: true },
          { key: "Criticality", label: "Overdue level", type: "badge" },
        ],
      },
      {
        key: "history", label: "Payment history",
        columns: [
          { key: "StudentName", label: "Student", type: "student", sort: true },
          { key: "Payments", label: "Payments", type: "number", sort: true },
          { key: "TotalPaid", label: "Total paid", type: "currency", sort: true },
          { key: "FirstPaid", label: "First payment", type: "date", sort: true },
          { key: "LastPaid", label: "Last payment", type: "date", sort: true },
          { key: "Modes", label: "Modes", wrap: true },
        ],
      },
      {
        key: "outstanding", label: "Outstanding", statuses: CRITICALITY,
        columns: [
          { key: "StudentName", label: "Student", type: "student", sort: true },
          { key: "Invoices", label: "Invoices", type: "number", sort: true },
          { key: "InvoicedAmount", label: "Invoiced", type: "currency" },
          { key: "PaidAmount", label: "Paid", type: "currency" },
          { key: "BalanceAmount", label: "Balance", type: "currency", sort: true },
          { key: "OldestDueDate", label: "Oldest due", type: "date", sort: true },
          { key: "MaxDaysPastDue", label: "Days past due", type: "number", sort: true },
          { key: "Criticality", label: "Overdue level", type: "badge", sort: true },
        ],
      },
      {
        key: "late", label: "Paid on/after due date", statuses: CRITICALITY,
        columns: [
          { key: "PaidDate", label: "Paid on", type: "date", sort: true },
          { key: "DueDate", label: "Due", type: "date", sort: true },
          { key: "DaysAfterDue", label: "Days after due", type: "number", sort: true },
          { key: "StudentName", label: "Student", type: "student", sort: true },
          { key: "Amount", label: "Amount", type: "currency", sort: true },
          { key: "PaymentMode", label: "Mode" },
          { key: "Criticality", label: "Level", type: "badge" },
        ],
      },
      {
        key: "tutor", label: "Tutor payments", statuses: [["Generated", "Generated"], ["Sent to tutor", "Sent to tutor"]],
        columns: [
          { key: "PayMonth", label: "Pay month", type: "month", sort: true },
          { key: "InvoiceNumber", label: "Tutor invoice" },
          { key: "TutorName", label: "Tutor", type: "tutor", sort: true },
          { key: "Students", label: "Students", type: "number" },
          { key: "ClassesScheduled", label: "Scheduled", type: "number" },
          { key: "ClassesCompleted", label: "Completed", type: "number", sort: true },
          { key: "ClassesCancelled", label: "Cancelled", type: "number" },
          { key: "Amount", label: "Amount", type: "currency", sort: true },
          { key: "InvoiceStatus", label: "Status", type: "badge", sort: true },
        ],
      },
      {
        key: "banks", label: "Bank-wise",
        chart: { type: "bar", x: "BankName", series: [{ key: "InvoicedAmount", label: "Invoiced" }, { key: "CollectedAmount", label: "Collected" }], sortBy: "CollectedAmount", sortDirection: "desc" },
        columns: [
          { key: "BankName", label: "Bank", sort: true },
          { key: "Invoices", label: "Invoices", type: "number", sort: true },
          { key: "InvoicedAmount", label: "Invoiced", type: "currency", sort: true },
          { key: "Payments", label: "Payments", type: "number", sort: true },
          { key: "CollectedAmount", label: "Collected", type: "currency", sort: true },
        ],
      },
    ],
  },
  {
    key: "financial",
    title: "Financial Reports",
    icon: "coins",
    description: "Revenue vs tutor cost (gross margin) by period, profitable areas by grade, board and subject, and un-recovered revenue.",
    filters: ["date", "search", "student", "tutor", "subject", "bank", "board", "grade", "country"],
    unavailable:
      "Not available — no data source: expenses (daily / weekly / monthly / yearly), expense categories (e.g. rent, salaries, marketing), revenue vs expense and the full profit & loss statement. " +
      "The system stores no expense records; the margin below covers invoiced revenue and tutor payouts only.",
    notes: [
      REVENUE_NOTE,
      "Tutor cost = Tutor Invoice total payment by pay month. Gross margin = invoiced revenue − tutor cost; Margin % = gross margin ÷ invoiced revenue.",
      "Un-recovered revenue = the unpaid balance of payment-tracked invoices whose due date has passed (invoices up to the To date).",
      "Profitable areas: invoice line revenue by grade, board and subject, with the un-recovered share of each line and dropped enrolments in the range.",
    ],
    summary: [
      { key: "InvoicedRevenue", label: "Invoiced revenue", format: "currency" },
      { key: "TutorCost", label: "Tutor cost", format: "currency" },
      { key: "GrossMargin", label: "Gross margin", format: "currency" },
      { key: "MarginPct", label: "Margin", format: "pct" },
      { key: "Collected", label: "Collected", format: "currency" },
      { key: "UnrecoveredAmount", label: "Un-recovered revenue", format: "currency" },
    ],
    views: [
      {
        key: "margin", label: "Revenue vs tutor cost", groupBy: true,
        chart: { type: "bar", x: "Period", xType: "period", series: [{ key: "InvoicedRevenue", label: "Revenue" }, { key: "TutorCost", label: "Tutor cost" }, { key: "GrossMargin", label: "Gross margin" }], sortBy: "Period", sortDirection: "asc" },
        columns: [
          { key: "Period", label: "Period", type: "period", sort: true },
          { key: "InvoicedRevenue", label: "Invoiced revenue", type: "currency", sort: true },
          { key: "TutorCost", label: "Tutor cost", type: "currency", sort: true },
          { key: "GrossMargin", label: "Gross margin", type: "currency", sort: true },
          { key: "MarginPct", label: "Margin", type: "pct", sort: true },
        ],
      },
      {
        key: "areas", label: "Profitable areas",
        chart: { type: "bar", x: "SubjectName", series: [{ key: "InvoicedRevenue", label: "Revenue" }, { key: "UnrecoveredAmount", label: "Un-recovered" }], sortBy: "InvoicedRevenue", sortDirection: "desc" },
        columns: [
          { key: "GradeName", label: "Grade", sort: true },
          { key: "BoardName", label: "Board", sort: true },
          { key: "SubjectName", label: "Subject", sort: true },
          { key: "Students", label: "Students", type: "number", sort: true },
          { key: "InvoicedRevenue", label: "Revenue", type: "currency", sort: true },
          { key: "UnrecoveredAmount", label: "Un-recovered", type: "currency", sort: true },
          { key: "DroppedEnrollments", label: "Dropped", type: "number", sort: true },
        ],
      },
      {
        key: "unrecovered", label: "Un-recovered revenue", statuses: CRITICALITY,
        columns: [
          { key: "InvoiceNumber", label: "Invoice", sort: true },
          { key: "DueDate", label: "Due", type: "date", sort: true },
          { key: "StudentName", label: "Student", type: "student", sort: true },
          { key: "SubjectName", label: "Course" },
          { key: "InvoiceAmount", label: "Amount", type: "currency" },
          { key: "PaidAmount", label: "Paid", type: "currency" },
          { key: "BalanceAmount", label: "Un-recovered", type: "currency", sort: true },
          { key: "DaysPastDue", label: "Days past due", type: "number", sort: true },
          { key: "Criticality", label: "Level", type: "badge", sort: true },
        ],
      },
    ],
  },
  {
    key: "refunds",
    title: "Refund & Dropout Reports",
    icon: "user-cross",
    description: "Dropped students with reasons, dropout reasons breakdown, dropout trend and the revenue of dropped enrolments.",
    filters: ["date", "search", "student", "tutor", "subject", "bank", "board", "grade", "country"],
    unavailable:
      "Not available — no data source: refund report, refund amounts and refund trends. The system has no refund records (no refund table or refund status on invoices or payments).",
    notes: [
      "Dropped = an enrolment (Sales Details) with status Dropped, Tutor Changed Dropped, DC Dropped or DP Dropped, dated by the enrolment's last update.",
      "Reason = the latest dropout-reason note recorded on the enrolment; “Not recorded” when none was saved.",
      "Revenue of dropped enrolments = invoice line amounts already invoiced for that student and subject.",
    ],
    summary: [
      { key: "Dropouts", label: "Dropped enrolments", hint: (d) => `Previous period ${fmtCount(d.DropoutsPrevious)}` },
      { key: "NewEnrollments", label: "New enrolments" },
      { key: "DroppedRevenue", label: "Revenue of dropped enrolments", format: "currency" },
      { key: "TopReason", label: "Top reason", format: "text" },
      { key: "RefundedAmount", label: "Refunded", format: "currency", hint: () => "No refund data source" },
    ],
    views: [
      {
        key: "dropouts", label: "Dropped students", statusesFrom: "reasons",
        columns: [
          { key: "DroppedOn", label: "Dropped on", type: "date", sort: true },
          { key: "StudentName", label: "Student", type: "student", sort: true },
          { key: "SubjectName", label: "Subject", sort: true },
          { key: "GradeName", label: "Grade" },
          { key: "BoardName", label: "Board" },
          { key: "TutorName", label: "Tutor" },
          { key: "StatusName", label: "Status", type: "badge", sort: true },
          { key: "ReasonName", label: "Reason", sort: true },
          { key: "ReasonNote", label: "Note", wrap: true },
          { key: "InvoicedToDate", label: "Invoiced to date", type: "currency", sort: true },
        ],
      },
      {
        key: "reasons", label: "Dropout reasons",
        chart: { type: "pie", x: "ReasonName", series: [{ key: "Dropouts", label: "Dropouts", count: true }], sortBy: "Dropouts", sortDirection: "desc" },
        columns: [
          { key: "ReasonName", label: "Reason", sort: true },
          { key: "Dropouts", label: "Dropouts", type: "number", sort: true },
          { key: "SharePct", label: "Share", type: "pct", sort: true },
          { key: "InvoicedToDate", label: "Invoiced to date", type: "currency", sort: true },
        ],
      },
      {
        key: "trend", label: "Dropout trend", groupBy: true,
        chart: { type: "line", x: "Period", xType: "period", series: [{ key: "Dropouts", label: "Dropouts", count: true }, { key: "NewEnrollments", label: "New enrolments", count: true }], sortBy: "Period", sortDirection: "asc" },
        columns: [
          { key: "Period", label: "Period", type: "period", sort: true },
          { key: "Dropouts", label: "Dropouts", type: "number", sort: true },
          { key: "NewEnrollments", label: "New enrolments", type: "number", sort: true },
        ],
      },
    ],
  },
];

export const findAccountsReport = (key) => ACCOUNTS_REPORTS.find((r) => r.key === String(key || "").toLowerCase());

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2, minimumFractionDigits: 0 });
export const fmtMoney = (v) => (v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? "—" : inr.format(Number(v)));
export const fmtCount = (v) => (v === null || v === undefined || v === "" ? "—" : Number(v).toLocaleString("en-IN"));
