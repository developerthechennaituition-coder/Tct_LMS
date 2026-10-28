import React from "react";
import {
  useHistory,
  useLocation,
  useParams,
} from "react-router-dom";

import "./StudentDetails.css";

const StudentDetails = () => {
  const history = useHistory();
  const location = useLocation();
  const { id } = useParams();

  // Student is passed from StudentLists using history.push()
  const student = location.state?.student;

  // If someone directly opens the URL without state
  if (!student) {
    return (
      <div className="student-details-page">
        <div className="student-details-topbar">
          <div className="student-details-breadcrumb">
            <span
              className="breadcrumb-link"
              onClick={() => history.goBack()}
            >
              Students
            </span>

            <span className="breadcrumb-separator">
              /
            </span>

            <span>
              Student Details
            </span>
          </div>

          <button
            type="button"
            className="student-back-btn"
            onClick={() => history.goBack()}
          >
            ← Back
          </button>
        </div>

        <div className="student-details-not-found">
          <h3>Student details not found</h3>

          <p>
            Please return to the Students list and
            select View Details again.
          </p>

          <button
            type="button"
            onClick={() =>
              history.push("/lms/studentlist")
            }
          >
            Back to Students
          </button>
        </div>
      </div>
    );
  }

  const courses = student.enrolledCourses || [];

  return (
    <div className="student-details-page">
      {/* =========================================
          TOP HEADER
      ========================================= */}

      <div className="student-details-topbar">
        <div className="student-details-breadcrumb">
          <span
            className="breadcrumb-link"
            onClick={() => history.goBack()}
          >
            Students
          </span>

          <span className="breadcrumb-separator">
            /
          </span>

          <span className="breadcrumb-current">
            {student.name}
          </span>
        </div>

        <button
          type="button"
          className="student-back-btn"
          onClick={() => history.goBack()}
        >
          ←
          <span>Back</span>
        </button>
      </div>

      {/* =========================================
          MAIN CARD
      ========================================= */}

      <div className="student-details-card">
        {/* =========================================
            LEFT SIDEBAR
        ========================================= */}

        <aside className="student-details-sidebar">
          {/* PROFILE */}

          <div className="student-profile-summary">
            <img
              src={student.avatar}
              alt={student.name}
              className="student-details-avatar"
            />

            <div className="student-profile-name">
              <strong>{student.name}</strong>

              <span>{student.email}</span>
            </div>
          </div>

          {/* BILL */}

          <div className="student-billing-box">
            <span className="billing-label">
              TOTAL BILL
            </span>

            <strong className="billing-paid">
              Paid 19 USD
            </strong>

            <span className="billing-due">
              Due 10 USD
            </span>
          </div>

          {/* MENU */}

          <div className="student-side-menu">
            <button className="student-side-menu-item active">
              <span className="side-menu-icon">
                ▣
              </span>

              <span>Personal Information</span>

              <span className="side-menu-arrow">
                ›
              </span>
            </button>

            <button className="student-side-menu-item">
              <span className="side-menu-icon">
                ▤
              </span>

              <span>Billings</span>

              <span className="side-menu-arrow">
                ›
              </span>
            </button>

            <button className="student-side-menu-item">
              <span className="side-menu-icon">
                ♟
              </span>

              <span>Notifications</span>

              <span className="side-menu-arrow">
                ›
              </span>
            </button>

            <button className="student-side-menu-item">
              <span className="side-menu-icon">
                ▣
              </span>

              <span>Account Activity</span>

              <span className="side-menu-arrow">
                ›
              </span>
            </button>
          </div>

          {/* LOGIN INFORMATION */}

          <div className="student-login-info">
            <span className="login-label">
              LAST LOGIN
            </span>

            <span className="login-value">
              06-29-2026 02:39pm
            </span>

            <span className="login-label login-ip-label">
              LOGIN IP
            </span>

            <span className="login-value">
              192.129.243.28
            </span>
          </div>
        </aside>

        {/* =========================================
            RIGHT CONTENT
        ========================================= */}

        <main className="student-details-content">
          {/* TITLE */}

          <div className="student-information-header">
            <div>
              <h2>Students Information</h2>

              <p>
                Basic information about the student.
              </p>
            </div>

            <button
              type="button"
              className="student-edit-details-btn"
              onClick={() =>
                alert(`Edit ${student.name}`)
              }
            >
              ✎
            </button>
          </div>

          {/* BASICS */}

          <div className="student-section-title">
            BASICS
          </div>

          <div className="student-information-table">
            <div className="student-information-row">
              <span className="information-label">
                Full Name
              </span>

              <span className="information-value">
                {student.name}
              </span>
            </div>

            <div className="student-information-row">
              <span className="information-label">
                Display Name
              </span>

              <span className="information-value">
                {student.name.split(" ")[0]}
              </span>
            </div>

            <div className="student-information-row">
              <span className="information-label">
                Email
              </span>

              <span className="information-value">
                {student.email}
              </span>
            </div>

            <div className="student-information-row">
              <span className="information-label">
                Phone Number
              </span>

              <span className="information-value">
                {student.phone}
              </span>
            </div>

            <div className="student-information-row">
              <span className="information-label">
                Date of Birth
              </span>

              <span className="information-value">
                {student.dateOfBirth}
              </span>
            </div>

            <div className="student-information-row">
              <span className="information-label">
                Gender
              </span>

              <span className="information-value">
                {student.gender}
              </span>
            </div>

            <div className="student-information-row">
              <span className="information-label">
                Grade
              </span>

              <span className="information-value">
                {student.grade}
              </span>
            </div>

            <div className="student-information-row">
              <span className="information-label">
                Board
              </span>

              <span className="information-value">
                {student.board}
              </span>
            </div>

            <div className="student-information-row">
              <span className="information-label">
                Status
              </span>

              <span className="information-value">
                <span
                  className={`details-status ${student.status.toLowerCase()}`}
                >
                  <span className="details-status-dot"></span>

                  {student.status}
                </span>
              </span>
            </div>

            <div className="student-information-row">
              <span className="information-label">
                Parent Name
              </span>

              <span className="information-value">
                {student.parentName}
              </span>
            </div>

            <div className="student-information-row">
              <span className="information-label">
                Parent Phone
              </span>

              <span className="information-value">
                {student.parentPhone}
              </span>
            </div>

            <div className="student-information-row">
              <span className="information-label">
                Address
              </span>

              <span className="information-value">
                {student.address}
              </span>
            </div>
          </div>

          {/* =========================================
              ENROLLED COURSES
          ========================================= */}

          <div className="enrolled-courses-header">
            <div>
              <h2>Enrolled Courses</h2>

              <p>
                Courses currently enrolled by the
                student.
              </p>
            </div>

            <span className="course-add-icon">
              ⊞
            </span>
          </div>

          <div className="enrolled-courses-table-wrapper">
            <table className="enrolled-courses-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Courses List</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {courses.length > 0 ? (
                  courses.map((course, index) => (
                    <tr key={index}>
                      <td>{index + 1}</td>

                      <td className="course-name">
                        {course.name}
                      </td>

                      <td>
                        <span
                          className={`course-status ${course.status.toLowerCase()}`}
                        >
                          <span className="course-status-dot"></span>

                          {course.status}
                        </span>
                      </td>

                      <td className="course-delete">
                        🗑
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="4"
                      className="no-courses"
                    >
                      No courses enrolled.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
};

export default StudentDetails;