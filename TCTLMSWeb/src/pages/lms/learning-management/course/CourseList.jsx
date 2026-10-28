import React, { useState } from "react";
import AddCourseModal from "./components/AddCourseModal";
import "./CourseList.css";

const CourseList = () => {
  const [showModal, setShowModal] = useState(false);

  // ADD THIS
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);

  const [courses, setCourses] = useState([
    {
      id: 1,
      shortName: "RD",
      name: "Responsive Design",
      category: "Web Development",
      instructor: "Alex Ashley",
      lessons: 32,
      enrolment: 25,
      status: "Active",
      price: 30,
      deadline: "20.4.2021",
    },
    {
      id: 2,
      shortName: "AD",
      name: "Android Development",
      category: "Mobile Application",
      instructor: "Michael Wood",
      lessons: 11,
      enrolment: 7,
      status: "Pending",
      price: 65,
      deadline: "10.5.2021",
    },
    {
      id: 3,
      shortName: "UD",
      name: "UI/UX Design",
      category: "Graphics Design",
      instructor: "Abu Bin Istiak",
      lessons: 12,
      enrolment: 8,
      status: "Active",
      price: 20,
      deadline: "15.4.2021",
    },
    {
      id: 4,
      shortName: "WT",
      name: "WordPress Theme Development",
      category: "Web Development",
      instructor: "Emily Smith",
      lessons: 24,
      enrolment: 3,
      status: "Active",
      price: 50,
      deadline: "20.4.2021",
    },
    {
      id: 5,
      shortName: "AD",
      name: "Android Development",
      category: "Mobile Application",
      instructor: "Jhon Doe",
      lessons: 11,
      enrolment: 7,
      status: "Pending",
      price: 65,
      deadline: "10.5.2021",
    },
    {
      id: 6,
      shortName: "UD",
      name: "UI/UX Design",
      category: "Graphics Design",
      instructor: "Abu Bin Istiak",
      lessons: 12,
      enrolment: 8,
      status: "Active",
      price: 20,
      deadline: "15.4.2021",
    },
    {
      id: 7,
      shortName: "RD",
      name: "Responsive Design",
      category: "Web Development",
      instructor: "Lara Ashley",
      lessons: 22,
      enrolment: 29,
      status: "Active",
      price: 50,
      deadline: "22.5.2021",
    },
    {
      id: 8,
      shortName: "AD",
      name: "Android Development",
      category: "Mobile Application",
      instructor: "Michael Wood",
      lessons: 11,
      enrolment: 7,
      status: "Pending",
      price: 65,
      deadline: "10.5.2021",
    },
    {
      id: 9,
      shortName: "UD",
      name: "UI/UX Design",
      category: "Graphics Design",
      instructor: "Lara Watson",
      lessons: 22,
      enrolment: 17,
      status: "Active",
      price: 20,
      deadline: "15.4.2021",
    },
    {
      id: 10,
      shortName: "WT",
      name: "WordPress Theme Development",
      category: "Web Development",
      instructor: "Mark Smith",
      lessons: 18,
      enrolment: 6,
      status: "Active",
      price: 50,
      deadline: "20.4.2021",
    },
  ]);

  // =========================================================
  // OPEN / CLOSE 3 DOT MENU
  // =========================================================

  const handleMenuClick = (e, courseId) => {
    e.stopPropagation();

    if (openMenuId === courseId) {
      setOpenMenuId(null);
    } else {
      setOpenMenuId(courseId);
    }
  };

  // =========================================================
  // EDIT COURSE
  // =========================================================

  const handleEditClick = (e, course) => {
    e.stopPropagation();

    setSelectedCourse(course);
    setShowEditModal(true);
    setOpenMenuId(null);
  };

  // =========================================================
  // DELETE COURSE
  // =========================================================

  const handleDeleteClick = (e, courseId) => {
    e.stopPropagation();

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this course?"
    );

    if (confirmDelete) {
      setCourses((previousCourses) =>
        previousCourses.filter((course) => course.id !== courseId)
      );
    }

    setOpenMenuId(null);
  };

  // =========================================================
  // SAVE EDITED COURSE
  // =========================================================

  const handleUpdateCourse = (updatedCourse) => {
    setCourses((previousCourses) =>
      previousCourses.map((course) =>
        course.id === updatedCourse.id ? updatedCourse : course
      )
    );

    setShowEditModal(false);
    setSelectedCourse(null);
  };

  return (
    <>
      <div
        className="course-list-page"
        onClick={() => setOpenMenuId(null)}
      >
        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="course-list-header">
          <div>
            <h2>Courses</h2>

            <p>
              You have total {courses.length} Courses
            </p>
          </div>

          <div className="course-list-actions">
            <button
              className="course-filter-btn"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="filter-icon">☰</span>
              Filtered By
              <span className="arrow-icon">›</span>
            </button>

            <button
              className="add-course-btn"
              onClick={(e) => {
                e.stopPropagation();
                setShowModal(true);
              }}
            >
              <span className="plus-icon">＋</span>
              Add Course
            </button>
          </div>
        </div>

        {/* =====================================================
            COURSE TABLE
        ===================================================== */}

        <div
          className="course-table-container"
          onClick={(e) => e.stopPropagation()}
        >
          <table className="course-table">
            <thead>
              <tr>
                <th className="checkbox-column">
                  <input type="checkbox" />
                </th>

                <th>Course Name</th>
                <th>Category</th>
                <th>Instructor</th>
                <th>Lesson</th>
                <th>Enrole Student</th>
                <th>Status</th>
                <th>Price</th>
                <th>Deadline</th>
                <th className="action-column">•••</th>
              </tr>
            </thead>

            <tbody>
              {courses.map((course) => (
                <tr key={course.id}>

                  {/* CHECKBOX */}
                  <td className="checkbox-column">
                    <input type="checkbox" />
                  </td>

                  {/* COURSE */}
                  <td>
                    <div className="course-name-wrapper">

                      <div
                        className={`course-short-name ${course.shortName}`}
                      >
                        {course.shortName}
                      </div>

                      <strong>
                        {course.name}
                      </strong>

                    </div>
                  </td>

                  {/* CATEGORY */}
                  <td>
                    {course.category}
                  </td>

                  {/* INSTRUCTOR */}
                  <td>
                    {course.instructor}
                  </td>

                  {/* LESSON */}
                  <td>
                    Total lesson: {course.lessons}
                  </td>

                  {/* ENROLMENT */}
                  <td>
                    Total enrolment: {course.enrolment}
                  </td>

                  {/* STATUS */}
                  <td>
                    <span
                      className={`course-status ${course.status.toLowerCase()}`}
                    >
                      {course.status}
                    </span>
                  </td>

                  {/* PRICE */}
                  <td>
                    ${course.price}
                  </td>

                  {/* DEADLINE */}
                  <td>
                    {course.deadline}
                  </td>

                  {/* =================================================
                      THREE DOT ACTION
                  ================================================= */}

                  <td className="action-column">
                    <div className="course-action-wrapper">

                      <button
                        className="course-three-dot-btn"
                        onClick={(e) =>
                          handleMenuClick(e, course.id)
                        }
                      >
                        •••
                      </button>

                      {/* =================================================
                          DROPDOWN
                      ================================================= */}

                      {openMenuId === course.id && (
                        <div
                          className="course-action-menu"
                          onClick={(e) => e.stopPropagation()}
                        >

                          <button
                            className="course-action-item edit"
                            onClick={(e) =>
                              handleEditClick(e, course)
                            }
                          >
                            <span className="action-item-icon">
                              ✎
                            </span>

                            Edit Course
                          </button>

                          <button
                            className="course-action-item delete"
                            onClick={(e) =>
                              handleDeleteClick(e, course.id)
                            }
                          >
                            <span className="action-item-icon">
                              ⊗
                            </span>

                            Delete Course
                          </button>

                        </div>
                      )}

                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================
          ADD COURSE MODAL
      ========================================================= */}

      {showModal && (
        <AddCourseModal
          onClose={() => setShowModal(false)}
        />
      )}

      {/* =========================================================
          EDIT COURSE MODAL
      ========================================================= */}

      {showEditModal && selectedCourse && (
        <EditCourseModal
          course={selectedCourse}
          onClose={() => {
            setShowEditModal(false);
            setSelectedCourse(null);
          }}
          onSave={handleUpdateCourse}
        />
      )}
    </>
  );
};


// =============================================================
// EDIT COURSE MODAL
// =============================================================

const EditCourseModal = ({
  course,
  onClose,
  onSave,
}) => {

  const [formData, setFormData] = useState({
    ...course,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    onSave({
      ...formData,
      lessons: Number(formData.lessons),
      enrolment: Number(formData.enrolment),
      price: Number(formData.price),
    });
  };

  return (
    <div
      className="course-edit-modal-overlay"
      onClick={onClose}
    >
      <div
        className="course-edit-modal"
        onClick={(e) => e.stopPropagation()}
      >

        {/* HEADER */}

        <div className="course-modal-header">

          <h2>Edit Course</h2>

          <button
            className="course-modal-close"
            onClick={onClose}
          >
            ×
          </button>

        </div>

        {/* FORM */}

        <form onSubmit={handleSubmit}>

          <div className="course-form-row">

            <div className="course-form-group">
              <label>Course Name</label>

              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
              />
            </div>

            <div className="course-form-group">
              <label>Short Name</label>

              <input
                type="text"
                name="shortName"
                value={formData.shortName}
                onChange={handleChange}
              />
            </div>

          </div>

          <div className="course-form-row">

            <div className="course-form-group">
              <label>Category</label>

              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
              >
                <option>
                  Web Development
                </option>

                <option>
                  Mobile Application
                </option>

                <option>
                  Graphics Design
                </option>
              </select>
            </div>

            <div className="course-form-group">
              <label>Instructor</label>

              <input
                type="text"
                name="instructor"
                value={formData.instructor}
                onChange={handleChange}
              />
            </div>

          </div>

          <div className="course-form-row">

            <div className="course-form-group">
              <label>Total Lessons</label>

              <input
                type="number"
                name="lessons"
                value={formData.lessons}
                onChange={handleChange}
              />
            </div>

            <div className="course-form-group">
              <label>Total Enrolment</label>

              <input
                type="number"
                name="enrolment"
                value={formData.enrolment}
                onChange={handleChange}
              />
            </div>

          </div>

          <div className="course-form-row">

            <div className="course-form-group">
              <label>Price</label>

              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
              />
            </div>

            <div className="course-form-group">
              <label>Deadline</label>

              <input
                type="text"
                name="deadline"
                value={formData.deadline}
                onChange={handleChange}
              />
            </div>

          </div>

          {/* STATUS */}

          <div className="course-form-group">

            <label>Status</label>

            <div className="course-status-options">

              <label className="course-radio">
                <input
                  type="radio"
                  name="status"
                  value="Active"
                  checked={formData.status === "Active"}
                  onChange={handleChange}
                />
                Active
              </label>

              <label className="course-radio">
                <input
                  type="radio"
                  name="status"
                  value="Pending"
                  checked={formData.status === "Pending"}
                  onChange={handleChange}
                />
                Pending
              </label>

              <label className="course-radio">
                <input
                  type="radio"
                  name="status"
                  value="Rejected"
                  checked={formData.status === "Rejected"}
                  onChange={handleChange}
                />
                Rejected
              </label>

            </div>

          </div>

          {/* BUTTONS */}

          <div className="course-edit-modal-footer">

            <button
              type="button"
              className="course-cancel-btn"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="save-course-btn"
            >
              Update Course
            </button>

          </div>

        </form>

      </div>
    </div>
  );
};

export default CourseList;