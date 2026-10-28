import React from "react";

export function filterEnrollmentStudents(students, search) {
  const rows = Array.isArray(students) ? students : [];
  const words = String(search || "").trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return rows;
  return rows.filter(student => {
    const text = [student.code, student.studentName, student.parentName, student.emailAddress, student.mobileNumber]
      .filter(value => value != null).map(String).join(" ").toLocaleLowerCase();
    return words.every(word => text.includes(word));
  });
}

// Compact search shown beside the page title (styled by .tct-eh in EnrollmentHistory.css).
export default function EnrollmentHistorySearch({ value, onChange }) {
  return <div className="tct-eh-search">
    <label htmlFor="enrollment-student-search" className="sr-only">Search students</label>
    <div className="tct-eh-search-field">
      <em className="icon ni ni-search tct-eh-search-icon" aria-hidden="true"></em>
      <input id="enrollment-student-search" type="search" className="form-control"
        placeholder="Search by student code, name, parent, email or mobile"
        value={value} onChange={event => onChange(event.target.value)} />
      {value && <button type="button" className="tct-eh-search-clear" aria-label="Clear search" title="Clear search"
        onClick={() => onChange("")}><em className="icon ni ni-cross" aria-hidden="true"></em></button>}
    </div>
  </div>;
}
