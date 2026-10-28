export function groupTutorAttendance(rows) {
  const groups = {};
  const seen = new Set();
  (rows || []).forEach(row => {
    if (row.scheduleDetailsId && seen.has(row.scheduleDetailsId)) return;
    if (row.scheduleDetailsId) seen.add(row.scheduleDetailsId);
    const date = row.date ? new Date(row.date) : null;
    const monthNum = date ? String(date.getMonth() + 1).padStart(2, "0") : "00";
    const year = date ? String(date.getFullYear()) : "0000";
    const key = `${year}-${monthNum}||${row.tutorUserId || row.tutorId || row.tutorName}`;
    const group = groups[key] || (groups[key] = {
      key, year, monthNum, monthLabel: date ? date.toLocaleString("default", { month: "long" }) : "-",
      tutorName: row.tutorName || "-", tutorUserId: row.tutorUserId || null,
      invoiceNumber: null, childGroups: {}, rows: [],
    });
    if (row.payslipInvoiceNumber && !group.invoiceNumber) group.invoiceNumber = row.payslipInvoiceNumber;
    const rate = Number(row.tutorPayment) || 0;
    const childKey = `${row.salesDetailsId || `${row.studentName}||${row.subject}`}||${rate}`;
    const child = group.childGroups[childKey] || (group.childGroups[childKey] = {
      key: childKey, salesDetailsId: row.salesDetailsId, studentName: row.studentName || "-", subject: row.subject || "-",
      tutorPayment: rate, totalTutorPayment: 0, totalClasses: 0, completedClasses: 0, tutorAbsent: 0,
    });
    child.totalClasses++;
    if (row.scheduleStatus === "Class Completed") child.completedClasses++;
    if (row.isTutorPresent === false) child.tutorAbsent++;
    // The API supplies the stored payslip line, or the approved hourly estimate before issue.
    // Never substitute the parent's rate if the API has not supplied tutor pay.
    child.totalTutorPayment += Number(row.tutorClassPayment) || 0;
    group.rows.push(row);
  });
  return Object.values(groups).map(group => {
    const childGroupList = Object.values(group.childGroups);
    return { ...group, childGroupList, totalPayslipAmount: childGroupList.reduce((sum, child) => sum + child.totalTutorPayment, 0) };
  }).sort((a, b) => Number(b.year) - Number(a.year) || Number(b.monthNum) - Number(a.monthNum));
}
