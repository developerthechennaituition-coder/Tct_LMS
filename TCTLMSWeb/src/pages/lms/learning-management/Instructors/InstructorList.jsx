import React, { useMemo, useState } from "react";
import { useHistory } from "react-router-dom";
import {
  Search,
  ChevronDown,
  Plus,
  MoreHorizontal,
  X
} from "lucide-react";

import "./InstructorList.css";

const instructorData = [
  {
    id: 1,
    name: "Abu Bin Ishtiyak",
    email: "info@softnio.com",
    phone: "+811 758-756433",
    country: "United State",
    description: "Lorem ipsum dolor sit amet.",
    courses: 12,
    status: "Active",
    avatar: "AB",
    avatarType: "purple",
  },
  {
    id: 2,
    name: "Ashley Lawson",
    email: "ashley@softnio.com",
    phone: "+811 534-98324",
    country: "United kingdom",
    description: "Lorem ipsum dolor sit amet.",
    courses: 24,
    status: "Pending",
    avatar: "AL",
    avatarType: "image",
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
  },
  {
    id: 3,
    name: "Joe Larson",
    email: "larson@example.com",
    phone: "+811 987-4958",
    country: "United State",
    description: "Lorem ipsum dolor sit amet.",
    courses: 2,
    status: "Active",
    avatar: "JL",
    avatarType: "cyan",
  },
  {
    id: 4,
    name: "Jane Montgomery",
    email: "jane84@example.com",
    phone: "+811 765-4958",
    country: "Canada",
    description: "Lorem ipsum dolor sit amet.",
    courses: 14,
    status: "Suspend",
    avatar: "JM",
    avatarType: "red",
  },
  {
    id: 5,
    name: "Frances Burns",
    email: "frances@example.com",
    phone: "+811 987-9875",
    country: "Australia",
    description: "Lorem ipsum dolor sit amet.",
    courses: 20,
    status: "Active",
    avatar: "FB",
    avatarType: "image",
    image:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
  },
  {
    id: 6,
    name: "Alan Butler",
    email: "butler@example.com",
    phone: "+811 847-4532",
    country: "Brazil",
    description: "Lorem ipsum dolor sit amet.",
    courses: 3,
    status: "Inactive",
    avatar: "AB",
    avatarType: "image",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
  },
  {
    id: 7,
    name: "Victoria Lynch",
    email: "victoria@example.com",
    phone: "+811 231-5463",
    country: "India",
    description: "Lorem ipsum dolor sit amet.",
    courses: 5,
    status: "Active",
    avatar: "VL",
    avatarType: "yellow",
  },
  {
    id: 8,
    name: "Patrick Newman",
    email: "patrick@example.com",
    phone: "+811 347-4958",
    country: "Bangladesh",
    description: "Lorem ipsum dolor sit amet.",
    courses: 29,
    status: "Active",
    avatar: "PN",
    avatarType: "green",
  },
  {
    id: 9,
    name: "Jane Harris",
    email: "harris@example.com",
    phone: "+811 816-4958",
    country: "India",
    description: "Lorem ipsum dolor sit amet.",
    courses: 6,
    status: "Pending",
    avatar: "JH",
    avatarType: "image",
    image:
      "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=100&h=100&fit=crop",
  },
  {
    id: 10,
    name: "Emma Walker",
    email: "walker@example.com",
    phone: "+811 162-5647",
    country: "Brazil",
    description: "Lorem ipsum dolor sit amet.",
    courses: 35,
    status: "Active",
    avatar: "EW",
    avatarType: "purple",
  },
];

const InstructorList = () => {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Status");
  const [selected, setSelected] = useState([]);

  const filteredInstructors = useMemo(() => {
    return instructorData.filter((instructor) => {
      const searchValue = search.toLowerCase().trim();

      const matchesSearch =
        instructor.name.toLowerCase().includes(searchValue) ||
        instructor.email.toLowerCase().includes(searchValue) ||
        instructor.phone.toLowerCase().includes(searchValue);

      const matchesStatus =
        status === "Status" || instructor.status === status;

      return matchesSearch && matchesStatus;
    });
  }, [search, status]);

  const toggleSelect = (id) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  };

  const toggleSelectAll = () => {
    if (selected.length === filteredInstructors.length) {
      setSelected([]);
    } else {
      setSelected(filteredInstructors.map((item) => item.id));
    }
  };
  const history = useHistory();
const [openActionId, setOpenActionId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  return (
    <div className="instructor-list-page">

      {/* =========================
          PAGE HEADER
      ========================= */}

      <div className="instructor-list-header">

        <h1 className="instructor-list-title">
          Instructors
        </h1>

        <div className="instructor-list-actions">

          {/* Search */}

          <div className="instructor-search">
            <input
              type="text"
              placeholder="Search by name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <Search size={18} />
          </div>

          {/* Status */}

          <div className="instructor-status-dropdown">
            <button type="button">
              <span>{status}</span>
              <ChevronDown size={15} />
            </button>

            <div className="instructor-status-menu">
              {["Status", "Active", "Pending", "Suspend", "Inactive"].map(
                (item) => (
                  <button
                    type="button"
                    key={item}
                    onClick={() => setStatus(item)}
                  >
                    {item}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Add */}

          <button
            type="button"
            className="instructor-add-button"
             onClick={() => setShowAddModal(true)}
          >
            <Plus size={18} />
            <span>Add</span>
          </button>

        </div>
      </div>


      {/* =========================
          TABLE
      ========================= */}

      <div className="instructor-table-card">

        <div className="instructor-table-wrapper">

          <table className="instructor-table">

            <thead>
              <tr>

                <th className="instructor-check-column">
                  <input
                    type="checkbox"
                    checked={
                      filteredInstructors.length > 0 &&
                      selected.length === filteredInstructors.length
                    }
                    onChange={toggleSelectAll}
                  />
                </th>

                <th>Instructor</th>

                <th>Phone</th>

                <th>Country</th>

                <th>Description</th>

                <th>Active courses</th>

                <th>Status</th>

                <th className="instructor-action-column">
                  <MoreHorizontal size={19} />
                </th>

              </tr>
            </thead>

            <tbody>

              {filteredInstructors.length > 0 ? (
                filteredInstructors.map((instructor) => (

                  <tr key={instructor.id}>

                    {/* Checkbox */}

                    <td className="instructor-check-column">
                      <input
                        type="checkbox"
                        checked={selected.includes(instructor.id)}
                        onChange={() =>
                          toggleSelect(instructor.id)
                        }
                      />
                    </td>


                    {/* Instructor */}

                    <td>
                      <div className="instructor-person">

                        {instructor.avatarType === "image" ? (
                          <img
                            src={instructor.image}
                            alt={instructor.name}
                            className="instructor-avatar"
                          />
                        ) : (
                          <div
                            className={`instructor-avatar instructor-avatar-${instructor.avatarType}`}
                          >
                            {instructor.avatar}
                          </div>
                        )}

                        <div className="instructor-person-info">

                          <div className="instructor-name">
                            {instructor.name}
                          </div>

                          <div className="instructor-email">
                            {instructor.email}
                          </div>

                        </div>

                      </div>
                    </td>


                    {/* Phone */}

                    <td>
                      <span className="instructor-table-text">
                        {instructor.phone}
                      </span>
                    </td>


                    {/* Country */}

                    <td>
                      <span className="instructor-table-text">
                        {instructor.country}
                      </span>
                    </td>


                    {/* Description */}

                    <td>
                      <span className="instructor-description">
                        {instructor.description}
                      </span>
                    </td>


                    {/* Courses */}

                    <td>
                      <span className="instructor-table-text">
                        {instructor.courses} active courses
                      </span>
                    </td>


                    {/* Status */}

                    <td>
                      <span
                        className={`instructor-status-badge ${instructor.status
                          .toLowerCase()
                          .replace(" ", "-")}`}
                      >
                        {instructor.status}
                      </span>
                    </td>


                    {/* Actions */}

                    <td className="instructor-action-column">

    <button
        type="button"
        className="instructor-row-action"
        onClick={() =>
            setOpenActionId(
                openActionId === instructor.id
                    ? null
                    : instructor.id
            )
        }
    >
        <MoreHorizontal size={20} />
    </button>

    {openActionId === instructor.id && (
        <div className="instructor-row-menu">

            <button
                type="button"
                onClick={() => {
                    setOpenActionId(null);

                    history.push(
                        `/learning-management/instructor/details/${instructor.id}`
                    );
                }}
            >
                View
            </button>

            <button
                type="button"
                onClick={()=>{}}
            >
                Activites
            </button>


        </div>
    )}

</td>

                  </tr>

                ))
              ) : (

                <tr>
                  <td
                    colSpan="8"
                    className="instructor-empty"
                  >
                    No instructors found
                  </td>
                </tr>

              )}

            </tbody>

          </table>

        </div>

      </div>
{showAddModal && (
  <div
    className="instructor-modal-overlay"
    onClick={() => setShowAddModal(false)}
  >
    <div
      className="instructor-add-modal"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Modal Header */}
      <div className="instructor-modal-header">
        <h2>Add Instructor</h2>

        <button
          type="button"
          className="instructor-modal-close"
          onClick={() => setShowAddModal(false)}
        >
          <X size={18} />
        </button>
      </div>

      {/* Modal Body */}
      <div className="instructor-modal-body">

        <div className="instructor-form-grid">

          {/* First Name */}
          <div className="instructor-form-group">
            <label>First Name</label>
            <input
              type="text"
              placeholder="First name"
            />
          </div>

          {/* Last Name */}
          <div className="instructor-form-group">
            <label>Last Name</label>
            <input
              type="text"
              placeholder="Last name"
            />
          </div>

          {/* Email */}
          <div className="instructor-form-group">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="Email Address"
            />
          </div>

          {/* Phone */}
          <div className="instructor-form-group">
            <label>Phone Number</label>
            <input
              type="text"
              placeholder="+880"
            />
          </div>

          {/* Address 1 */}
          <div className="instructor-form-group">
            <label>Address Line 1</label>
            <input
              type="text"
              placeholder="Address Line 1"
            />
          </div>

          {/* Address 2 */}
          <div className="instructor-form-group">
            <label>Address Line 2</label>
            <input
              type="text"
              placeholder="Address Line 2"
            />
          </div>

          {/* State */}
          <div className="instructor-form-group">
            <label>State</label>
            <input
              type="text"
              placeholder="State"
            />
          </div>

          {/* Country */}
          <div className="instructor-form-group">
            <label>Country</label>

            <select defaultValue="Canada">
              <option value="India">India</option>
              <option value="Canada">Canada</option>
              <option value="United State">United State</option>
              <option value="United Kingdom">United Kingdom</option>
              <option value="Australia">Australia</option>
            </select>
          </div>

        </div>

        {/* About Instructor */}
        <div className="instructor-form-group instructor-about-group">
          <label>About Instructor</label>

          <textarea
            placeholder="Describe a little bit"
            rows="4"
          />
        </div>

      </div>

      {/* Modal Footer */}
      <div className="instructor-modal-footer">

        <button
          type="button"
          className="instructor-modal-submit"
          onClick={() => {
            // API call will be added later
            setShowAddModal(false);
          }}
        >
          Add Instructor
        </button>

        <button
          type="button"
          className="instructor-modal-cancel"
          onClick={() => setShowAddModal(false)}
        >
          Cancel
        </button>

      </div>
    </div>
  </div>
)}
    </div>
  );
};

export default InstructorList;