import React, { useState } from "react";

const AddCourseModal = ({ onClose }) => {

  const [courseName, setCourseName] = useState("");

  const [category, setCategory] = useState("Web Development");

  const [difficulty, setDifficulty] = useState("Beginners");

  const [totalLesson, setTotalLesson] = useState("");

  const [thumbnail, setThumbnail] = useState(null);

  const [description, setDescription] = useState("");

  const [status, setStatus] = useState("Active");

  const [price, setPrice] = useState("");

  const [deadline, setDeadline] = useState("");

  const handleSave = () => {

    const courseData = {
      courseName,
      category,
      difficulty,
      totalLesson,
      thumbnail,
      description,
      status,
      price,
      deadline,
    };

    console.log("Course data:", courseData);

    // Later:
    // Call ASP.NET API here

    onClose();
  };

  return (

    <div className="course-modal-overlay">

      <div className="course-modal">

        {/* =========================
            HEADER
        ========================= */}

        <div className="course-modal-header">

          <h2>Create Course</h2>

          <button
            type="button"
            className="course-modal-close"
            onClick={onClose}
          >
            ×
          </button>

        </div>


        {/* =========================
            COURSE NAME
        ========================= */}

        <div className="course-form-group">

          <label>
            Course Name
          </label>

          <input
            type="text"
            placeholder="e.g. Responsive Design"
            value={courseName}
            onChange={(e) =>
              setCourseName(e.target.value)
            }
          />

        </div>


        {/* =========================
            CATEGORY + DIFFICULTY
        ========================= */}

        <div className="course-form-row">

          <div className="course-form-group">

            <label>
              Course category
            </label>

            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value)
              }
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

            <label>
              Course Difficulties
            </label>

            <select
              value={difficulty}
              onChange={(e) =>
                setDifficulty(e.target.value)
              }
            >

              <option>
                Beginners
              </option>

              <option>
                Intermediate
              </option>

              <option>
                Advanced
              </option>

            </select>

          </div>

        </div>


        {/* =========================
            LESSON + THUMBNAIL
        ========================= */}

        <div className="course-form-row">

          <div className="course-form-group">

            <label>
              Total Lesson
            </label>

            <input
              type="number"
              placeholder="40"
              value={totalLesson}
              onChange={(e) =>
                setTotalLesson(e.target.value)
              }
            />

          </div>


          <div className="course-form-group">

            <label>
              Course thumbnail
            </label>

            <div className="course-file-wrapper">

              <input
                type="text"
                placeholder="Choose file"
                value={
                  thumbnail
                    ? thumbnail.name
                    : ""
                }
                readOnly
              />

              <label className="course-browse-btn">

                Browse

                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) =>
                    setThumbnail(
                      e.target.files[0]
                    )
                  }
                />

              </label>

            </div>

          </div>

        </div>


        {/* =========================
            DESCRIPTION
        ========================= */}

        <div className="course-form-group">

          <label>
            Course Description
          </label>

          <textarea
            placeholder="Write Course Description"
            value={description}
            onChange={(e) =>
              setDescription(e.target.value)
            }
          />

        </div>


        {/* =========================
            STATUS
        ========================= */}

        <div className="course-form-group">

          <label>
            Status
          </label>

          <div className="course-status-options">

            <label className="course-radio">

              <input
                type="radio"
                name="courseStatus"
                value="Active"
                checked={status === "Active"}
                onChange={(e) =>
                  setStatus(e.target.value)
                }
              />

              <span>
                Active
              </span>

            </label>


            <label className="course-radio">

              <input
                type="radio"
                name="courseStatus"
                value="Pending"
                checked={status === "Pending"}
                onChange={(e) =>
                  setStatus(e.target.value)
                }
              />

              <span>
                Pending
              </span>

            </label>


            <label className="course-radio">

              <input
                type="radio"
                name="courseStatus"
                value="Rejected"
                checked={status === "Rejected"}
                onChange={(e) =>
                  setStatus(e.target.value)
                }
              />

              <span>
                Rejected
              </span>

            </label>

          </div>

        </div>


        {/* =========================
            PRICE + DEADLINE
        ========================= */}

        <div className="course-form-row">

          <div className="course-form-group">

            <label>
              Course Price
            </label>

            <input
              type="number"
              placeholder="30"
              value={price}
              onChange={(e) =>
                setPrice(e.target.value)
              }
            />

          </div>


          <div className="course-form-group">

            <label>
              Deadline
            </label>

            <input
              type="date"
              value={deadline}
              onChange={(e) =>
                setDeadline(e.target.value)
              }
            />

          </div>

        </div>


        {/* =========================
            SAVE
        ========================= */}

        <button
          type="button"
          className="save-course-btn"
          onClick={handleSave}
        >
          Save Informations
        </button>

      </div>

    </div>

  );
};

export default AddCourseModal;