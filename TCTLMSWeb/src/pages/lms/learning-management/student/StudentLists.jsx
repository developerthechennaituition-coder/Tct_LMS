import React, { useMemo, useState } from "react";
import { useHistory } from "react-router-dom";
import "./StudentLists.css";

const initialStudents = [
  {
    id: 1,
    name: "John Smith",
    email: "john.smith@example.com",
    phone: "+91 98765 43210",
    grade: "Grade 10",
    board: "CBSE",
    status: "Active",
    avatar: "https://i.pravatar.cc/100?img=12",
    dateOfBirth: "15 May 2009",
    gender: "Male",
    address: "Chennai, Tamil Nadu, India",
    parentName: "Robert Smith",
    parentPhone: "+91 98765 43220",
    enrolledCourses: [
      {
        name: "Mathematics",
        status: "Active",
      },
      {
        name: "Physics",
        status: "Active",
      },
      {
        name: "Chemistry",
        status: "Pending",
      },
    ],
  },
  {
    id: 2,
    name: "Emma Wilson",
    email: "emma.wilson@example.com",
    phone: "+91 98765 43211",
    grade: "Grade 9",
    board: "CBSE",
    status: "Active",
    avatar: "https://i.pravatar.cc/100?img=47",
    dateOfBirth: "22 August 2010",
    gender: "Female",
    address: "Bangalore, Karnataka, India",
    parentName: "James Wilson",
    parentPhone: "+91 98765 43221",
    enrolledCourses: [
      {
        name: "English",
        status: "Active",
      },
      {
        name: "Mathematics",
        status: "Active",
      },
    ],
  },
  {
    id: 3,
    name: "Michael Brown",
    email: "michael.brown@example.com",
    phone: "+91 98765 43212",
    grade: "Grade 10",
    board: "ICSE",
    status: "Inactive",
    avatar: "https://i.pravatar.cc/100?img=13",
    dateOfBirth: "10 January 2009",
    gender: "Male",
    address: "Coimbatore, Tamil Nadu, India",
    parentName: "David Brown",
    parentPhone: "+91 98765 43222",
    enrolledCourses: [
      {
        name: "Computer Science",
        status: "Canceled",
      },
      {
        name: "Mathematics",
        status: "Pending",
      },
    ],
  },
  {
    id: 4,
    name: "Sophia Davis",
    email: "sophia.davis@example.com",
    phone: "+91 98765 43213",
    grade: "Grade 8",
    board: "CBSE",
    status: "Active",
    avatar: "https://i.pravatar.cc/100?img=32",
    dateOfBirth: "18 March 2011",
    gender: "Female",
    address: "Chennai, Tamil Nadu, India",
    parentName: "William Davis",
    parentPhone: "+91 98765 43223",
    enrolledCourses: [
      {
        name: "Science",
        status: "Active",
      },
      {
        name: "English",
        status: "Active",
      },
    ],
  },
  {
    id: 5,
    name: "Daniel Miller",
    email: "daniel.miller@example.com",
    phone: "+91 98765 43214",
    grade: "Grade 12",
    board: "CBSE",
    status: "Active",
    avatar: "https://i.pravatar.cc/100?img=11",
    dateOfBirth: "12 December 2007",
    gender: "Male",
    address: "Hyderabad, Telangana, India",
    parentName: "Thomas Miller",
    parentPhone: "+91 98765 43224",
    enrolledCourses: [
      {
        name: "Physics",
        status: "Active",
      },
      {
        name: "Mathematics",
        status: "Active",
      },
      {
        name: "Chemistry",
        status: "Pending",
      },
    ],
  },
  {
    id: 6,
    name: "Olivia Taylor",
    email: "olivia.taylor@example.com",
    phone: "+91 98765 43215",
    grade: "Grade 11",
    board: "ICSE",
    status: "Inactive",
    avatar: "https://i.pravatar.cc/100?img=44",
    dateOfBirth: "5 July 2008",
    gender: "Female",
    address: "Mumbai, Maharashtra, India",
    parentName: "Richard Taylor",
    parentPhone: "+91 98765 43225",
    enrolledCourses: [
      {
        name: "Biology",
        status: "Canceled",
      },
      {
        name: "English",
        status: "Pending",
      },
    ],
  },
  {
    id: 7,
    name: "James Anderson",
    email: "james.anderson@example.com",
    phone: "+91 98765 43216",
    grade: "Grade 10",
    board: "CBSE",
    status: "Active",
    avatar: "https://i.pravatar.cc/100?img=14",
    dateOfBirth: "21 November 2009",
    gender: "Male",
    address: "Chennai, Tamil Nadu, India",
    parentName: "Andrew Anderson",
    parentPhone: "+91 98765 43226",
    enrolledCourses: [
      {
        name: "Mathematics",
        status: "Active",
      },
      {
        name: "Physics",
        status: "Active",
      },
    ],
  },
  {
    id: 8,
    name: "Isabella Thomas",
    email: "isabella.thomas@example.com",
    phone: "+91 98765 43217",
    grade: "Grade 9",
    board: "State Board",
    status: "Active",
    avatar: "https://i.pravatar.cc/100?img=49",
    dateOfBirth: "9 September 2010",
    gender: "Female",
    address: "Madurai, Tamil Nadu, India",
    parentName: "George Thomas",
    parentPhone: "+91 98765 43227",
    enrolledCourses: [
      {
        name: "Tamil",
        status: "Active",
      },
      {
        name: "Science",
        status: "Active",
      },
    ],
  },
  {
    id: 9,
    name: "William Jackson",
    email: "william.jackson@example.com",
    phone: "+91 98765 43218",
    grade: "Grade 12",
    board: "CBSE",
    status: "Inactive",
    avatar: "https://i.pravatar.cc/100?img=15",
    dateOfBirth: "28 February 2007",
    gender: "Male",
    address: "Pune, Maharashtra, India",
    parentName: "Henry Jackson",
    parentPhone: "+91 98765 43228",
    enrolledCourses: [
      {
        name: "Computer Science",
        status: "Canceled",
      },
      {
        name: "Mathematics",
        status: "Pending",
      },
    ],
  },
];

const StudentLists = () => {
  const history = useHistory();

  const [students, setStudents] = useState(initialStudents);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [openMenuId, setOpenMenuId] = useState(null);

  const [showAddModal, setShowAddModal] = useState(false);

  const [newStudent, setNewStudent] = useState({
    name: "",
    email: "",
    phone: "",
    grade: "",
    board: "",
    status: "Active",
  });

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const search = searchTerm.trim().toLowerCase();

      const matchesSearch =
        search === "" ||
        student.name.toLowerCase().includes(search) ||
        student.email.toLowerCase().includes(search) ||
        student.phone.toLowerCase().includes(search) ||
        student.grade.toLowerCase().includes(search) ||
        student.board.toLowerCase().includes(search);

      const matchesStatus =
        statusFilter === "All" || student.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [students, searchTerm, statusFilter]);

  const handlePageClick = () => {
    setOpenMenuId(null);
  };

  // ==========================================
  // VIEW DETAILS
  // ==========================================

  const handleViewDetails = (student) => {
    setOpenMenuId(null);

    history.push(`/lms/student-details/${student.id}`, {
      student: student,
    });
  };

  // ==========================================
  // ACTIVITIES
  // ==========================================

  const handleActivities = (student) => {
    setOpenMenuId(null);

    alert(`Activities: ${student.name}`);
  };

  // ==========================================
  // EDIT
  // ==========================================

  const handleEdit = (student) => {
    setOpenMenuId(null);

    alert(`Edit Student: ${student.name}`);
  };

  // ==========================================
  // DELETE
  // ==========================================

  const handleDelete = (student) => {
    setOpenMenuId(null);

    const confirmed = window.confirm(
      `Are you sure you want to delete ${student.name}?`
    );

    if (!confirmed) {
      return;
    }

    setStudents((previousStudents) =>
      previousStudents.filter((item) => item.id !== student.id)
    );
  };

  // ==========================================
  // INPUT CHANGE
  // ==========================================

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setNewStudent((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // ==========================================
  // ADD STUDENT
  // ==========================================

  const handleAddStudent = (event) => {
    event.preventDefault();

    if (
      !newStudent.name.trim() ||
      !newStudent.email.trim() ||
      !newStudent.phone.trim()
    ) {
      alert("Please enter Name, Email and Phone.");
      return;
    }

    const student = {
      id: Date.now(),
      name: newStudent.name.trim(),
      email: newStudent.email.trim(),
      phone: newStudent.phone.trim(),
      grade: newStudent.grade || "Grade 10",
      board: newStudent.board || "CBSE",
      status: newStudent.status,
      avatar: `https://i.pravatar.cc/100?img=${
        Math.floor(Math.random() * 60) + 1
      }`,
      dateOfBirth: "Not added yet",
      gender: "Not added yet",
      address: "Not added yet",
      parentName: "Not added yet",
      parentPhone: "Not added yet",
      enrolledCourses: [],
    };

    setStudents((previousStudents) => [
      student,
      ...previousStudents,
    ]);

    setNewStudent({
      name: "",
      email: "",
      phone: "",
      grade: "",
      board: "",
      status: "Active",
    });

    setShowAddModal(false);
  };

  return (
    <div
      className="student-list-page"
      onClick={handlePageClick}
    >
      {/* =========================================
          PAGE HEADER
      ========================================= */}

      <div className="student-list-header">
        <div className="student-list-title">
          <h2>Students</h2>
          <p>Manage all students</p>
        </div>

        <div
          className="student-list-actions"
          onClick={(event) => event.stopPropagation()}
        >
          {/* SEARCH */}

          <div className="student-search">
            <span className="student-search-icon">
              ⌕
            </span>

            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
            />
          </div>

          {/* STATUS */}

          <div className="status-filter-wrapper">
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
            >
              <option value="All">Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>

            <span className="status-filter-arrow">
              ⌄
            </span>
          </div>

          {/* ADD */}

          <button
            type="button"
            className="add-student-btn"
            onClick={() => setShowAddModal(true)}
          >
            <span className="add-icon">＋</span>
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* =========================================
          STUDENT TABLE
      ========================================= */}

      <div className="student-table-wrapper">
        <table className="student-table">
          <thead>
            <tr>
              <th className="student-column">
                Student
              </th>

              <th>Email</th>

              <th>Phone</th>

              <th>Grade</th>

              <th>Board</th>

              <th>Status</th>

              <th className="action-column">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student) => (
                <tr key={student.id}>
                  {/* STUDENT */}

                  <td>
                    <div className="student-info">
                      <img
                        src={student.avatar}
                        alt={student.name}
                        className="student-avatar"
                      />

                      <div className="student-name-wrapper">
                        <span className="student-name">
                          {student.name}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* EMAIL */}

                  <td>
                    <span className="student-email">
                      {student.email}
                    </span>
                  </td>

                  {/* PHONE */}

                  <td>
                    <span className="student-phone">
                      {student.phone}
                    </span>
                  </td>

                  {/* GRADE */}

                  <td>{student.grade}</td>

                  {/* BOARD */}

                  <td>{student.board}</td>

                  {/* STATUS */}

                  <td>
                    <span
                      className={`student-status ${student.status.toLowerCase()}`}
                    >
                      <span className="status-dot"></span>

                      {student.status}
                    </span>
                  </td>

                  {/* ACTION */}

                  <td>
                    <div className="student-action-wrapper">
                      <button
                        type="button"
                        className="student-menu-btn"
                        onClick={(event) => {
                          event.stopPropagation();

                          setOpenMenuId(
                            openMenuId === student.id
                              ? null
                              : student.id
                          );
                        }}
                        aria-label="Student actions"
                      >
                        •••
                      </button>

                      {openMenuId === student.id && (
                        <div
                          className="student-dropdown"
                          onClick={(event) =>
                            event.stopPropagation()
                          }
                        >
                          {/* VIEW DETAILS */}

                          <button
                            type="button"
                            className="student-dropdown-item"
                            onClick={() =>
                              handleViewDetails(student)
                            }
                          >
                            <span className="dropdown-icon view-icon">
                              ◉
                            </span>

                            <span>
                              View Details
                            </span>
                          </button>

                          {/* ACTIVITIES */}

                          <button
                            type="button"
                            className="student-dropdown-item"
                            onClick={() =>
                              handleActivities(student)
                            }
                          >
                            <span className="dropdown-icon activity-icon">
                              ⊞
                            </span>

                            <span>
                              Activities
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="7"
                  className="student-empty-row"
                >
                  No students found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* =========================================
          FOOTER
      ========================================= */}

      <div className="student-list-footer">
        <span>
          Showing {filteredStudents.length} of{" "}
          {students.length} students
        </span>
      </div>

      {/* =========================================
          ADD STUDENT MODAL
      ========================================= */}

      {showAddModal && (
        <div
          className="student-modal-overlay"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="student-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="student-modal-header">
              <div>
                <h3>Add Student</h3>

                <p>
                  Enter student information
                </p>
              </div>

              <button
                type="button"
                className="student-modal-close"
                onClick={() =>
                  setShowAddModal(false)
                }
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddStudent}>
              <div className="student-form-grid">
                {/* NAME */}

                <div className="student-form-group">
                  <label>Student Name</label>

                  <input
                    type="text"
                    name="name"
                    value={newStudent.name}
                    onChange={handleInputChange}
                    placeholder="Enter student name"
                  />
                </div>

                {/* EMAIL */}

                <div className="student-form-group">
                  <label>Email</label>

                  <input
                    type="email"
                    name="email"
                    value={newStudent.email}
                    onChange={handleInputChange}
                    placeholder="Enter email"
                  />
                </div>

                {/* PHONE */}

                <div className="student-form-group">
                  <label>Phone</label>

                  <input
                    type="text"
                    name="phone"
                    value={newStudent.phone}
                    onChange={handleInputChange}
                    placeholder="Enter phone number"
                  />
                </div>

                {/* GRADE */}

                <div className="student-form-group">
                  <label>Grade</label>

                  <select
                    name="grade"
                    value={newStudent.grade}
                    onChange={handleInputChange}
                  >
                    <option value="">
                      Select Grade
                    </option>

                    <option value="Grade 8">
                      Grade 8
                    </option>

                    <option value="Grade 9">
                      Grade 9
                    </option>

                    <option value="Grade 10">
                      Grade 10
                    </option>

                    <option value="Grade 11">
                      Grade 11
                    </option>

                    <option value="Grade 12">
                      Grade 12
                    </option>
                  </select>
                </div>

                {/* BOARD */}

                <div className="student-form-group">
                  <label>Board</label>

                  <select
                    name="board"
                    value={newStudent.board}
                    onChange={handleInputChange}
                  >
                    <option value="">
                      Select Board
                    </option>

                    <option value="CBSE">
                      CBSE
                    </option>

                    <option value="ICSE">
                      ICSE
                    </option>

                    <option value="State Board">
                      State Board
                    </option>
                  </select>
                </div>

                {/* STATUS */}

                <div className="student-form-group">
                  <label>Status</label>

                  <select
                    name="status"
                    value={newStudent.status}
                    onChange={handleInputChange}
                  >
                    <option value="Active">
                      Active
                    </option>

                    <option value="Inactive">
                      Inactive
                    </option>
                  </select>
                </div>
              </div>

              <div className="student-modal-footer">
                <button
                  type="button"
                  className="student-cancel-btn"
                  onClick={() =>
                    setShowAddModal(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="student-save-btn"
                >
                  Add Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentLists;