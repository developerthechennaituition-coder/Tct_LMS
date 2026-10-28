import React, { useState } from "react";
import "./Payroll.css";

const permanentEmployees = [
  {
    id: 1,
    initials: "AB",
    name: "Abu Bin Ishtiyak",
    email: "info@softnio.com",
    position: "MD",
    accountNumber: "9834/paypal",
    basic: "$700",
    highest: "$960",
    overtime: "$400",
  },
  {
    id: 2,
    initials: "AB",
    name: "Alan Butler",
    email: "butler@example.com",
    position: "Executive",
    accountNumber: "7623/paypal",
    basic: "$690",
    highest: "$800",
    overtime: "$390",
  },
  {
    id: 3,
    initials: "VL",
    name: "Victoria Lynch",
    email: "victoria@example.com",
    position: "Manager",
    accountNumber: "7459/Payoneer",
    basic: "$789",
    highest: "$850",
    overtime: "$378",
  },
  {
    id: 4,
    initials: "PN",
    name: "Patrick Newman",
    email: "patrick@example.com",
    position: "Product Manager",
    accountNumber: "8659/Payoneer",
    basic: "$760",
    highest: "$8480",
    overtime: "$430",
  },
  {
    id: 5,
    initials: "JH",
    name: "Jane Harris",
    email: "harris@example.com",
    position: "Project Manager",
    accountNumber: "8976/Payoneer",
    basic: "$760",
    highest: "$848",
    overtime: "$460",
  },
  {
    id: 6,
    initials: "EW",
    name: "Emma Walker",
    email: "walker@example.com",
    position: "Jr. Project Manager",
    accountNumber: "9256/paypal",
    basic: "$650",
    highest: "$750",
    overtime: "$290",
  },
  {
    id: 7,
    initials: "AB",
    name: "Alan Butler",
    email: "alan@example.com",
    position: "Senior Executive",
    accountNumber: "8745/payoneer",
    basic: "$740",
    highest: "$790",
    overtime: "$310",
  },
  {
    id: 8,
    initials: "VL",
    name: "Victoria Lynch",
    email: "victoria@example.com",
    position: "Junior Executive",
    accountNumber: "7945/payoneer",
    basic: "$650",
    highest: "$720",
    overtime: "$360",
  },
  {
    id: 9,
    initials: "PN",
    name: "Patrick Newman",
    email: "patrick@example.com",
    position: "Sr. Engineer",
    accountNumber: "7456/paypal",
    basic: "$680",
    highest: "$740",
    overtime: "$380",
  },
  {
    id: 10,
    initials: "JH",
    name: "Jane Harris",
    email: "harris@example.com",
    position: "Jr. Engineer",
    accountNumber: "7125/paypal",
    basic: "$605",
    highest: "$680",
    overtime: "$350",
  },
];

const partTimeEmployees = [
  {
    id: 11,
    initials: "IB",
    name: "Ifrat Binte",
    email: "ifrat@example.com",
    position: "Sr. Developer",
    accountNumber: "9834/payoneer",
    basic: "$800",
    highest: "$990",
    overtime: "$400",
  },
  {
    id: 12,
    initials: "AB",
    name: "Alan Butler",
    email: "butler@example.com",
    position: "Executive",
    accountNumber: "7623/paypal",
    basic: "$690",
    highest: "$800",
    overtime: "$390",
  },
  {
    id: 13,
    initials: "VL",
    name: "Victoria Lynch",
    email: "victoria@example.com",
    position: "Manager",
    accountNumber: "7459/Payoneer",
    basic: "$789",
    highest: "$850",
    overtime: "$378",
  },
  {
    id: 14,
    initials: "PN",
    name: "Patrick Newman",
    email: "patrick@example.com",
    position: "Product Manager",
    accountNumber: "8659/Payoneer",
    basic: "$760",
    highest: "$8480",
    overtime: "$430",
  },
  {
    id: 15,
    initials: "JH",
    name: "Jane Harris",
    email: "harris@example.com",
    position: "Project Manager",
    accountNumber: "8976/Payoneer",
    basic: "$760",
    highest: "$848",
    overtime: "$460",
  },
  {
    id: 16,
    initials: "EW",
    name: "Emma Walker",
    email: "walker@example.com",
    position: "Jr. Project Manager",
    accountNumber: "9256/paypal",
    basic: "$650",
    highest: "$750",
    overtime: "$290",
  },
  {
    id: 17,
    initials: "AB",
    name: "Alan Butler",
    email: "alan@example.com",
    position: "Senior Executive",
    accountNumber: "8745/payoneer",
    basic: "$740",
    highest: "$790",
    overtime: "$310",
  },
  {
    id: 18,
    initials: "VL",
    name: "Victoria Lynch",
    email: "victoria@example.com",
    position: "Junior Executive",
    accountNumber: "7945/payoneer",
    basic: "$650",
    highest: "$720",
    overtime: "$360",
  },
  {
    id: 19,
    initials: "PN",
    name: "Patrick Newman",
    email: "patrick@example.com",
    position: "Sr. Engineer",
    accountNumber: "7456/paypal",
    basic: "$680",
    highest: "$740",
    overtime: "$380",
  },
  {
    id: 20,
    initials: "JH",
    name: "Jane Harris",
    email: "harris@example.com",
    position: "Jr. Engineer",
    accountNumber: "7125/paypal",
    basic: "$605",
    highest: "$680",
    overtime: "$350",
  },
];

const Payroll = () => {
  const [activeTab, setActiveTab] = useState("permanent");

  const [permanentData, setPermanentData] =
    useState(permanentEmployees);

  const [partTimeData, setPartTimeData] =
    useState(partTimeEmployees);

  const [activeMenu, setActiveMenu] = useState(null);

  const [selectedEmployee, setSelectedEmployee] =
    useState(null);

  const [showEditModal, setShowEditModal] =
    useState(false);

  const [selectedRows, setSelectedRows] = useState([]);

  const currentData =
    activeTab === "permanent"
      ? permanentData
      : partTimeData;

  // =========================================================
  // SELECT SINGLE ROW
  // =========================================================

  const toggleRowSelection = (id) => {
    setSelectedRows((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    );
  };

  // =========================================================
  // SELECT ALL
  // =========================================================

  const toggleSelectAll = () => {
    const allSelected =
      currentData.length > 0 &&
      currentData.every((employee) =>
        selectedRows.includes(employee.id)
      );

    if (allSelected) {
      setSelectedRows([]);
    } else {
      setSelectedRows(
        currentData.map((employee) => employee.id)
      );
    }
  };

  // =========================================================
  // THREE DOT MENU
  // =========================================================

  const toggleActionMenu = (id) => {
    setActiveMenu((prev) =>
      prev === id ? null : id
    );
  };

  // =========================================================
  // VIEW DETAILS
  // =========================================================

  const handleViewDetails = (employee) => {
    setActiveMenu(null);

    alert(
      `Payroll Details\n\n` +
        `Name: ${employee.name}\n` +
        `Position: ${employee.position}\n` +
        `Account Number: ${employee.accountNumber}\n` +
        `Basic: ${employee.basic}\n` +
        `Highest: ${employee.highest}\n` +
        `Overtime: ${employee.overtime}`
    );
  };

  // =========================================================
  // EDIT
  // =========================================================

  const handleEdit = (employee) => {
    setActiveMenu(null);

    setSelectedEmployee({
      ...employee,
    });

    setShowEditModal(true);
  };

  // =========================================================
  // EDIT INPUT
  // =========================================================

  const handleEditChange = (event) => {
    const { name, value } = event.target;

    setSelectedEmployee((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // =========================================================
  // SAVE EDIT
  // =========================================================

  const handleSaveEdit = (event) => {
    event.preventDefault();

    if (!selectedEmployee) {
      return;
    }

    if (activeTab === "permanent") {
      setPermanentData((prev) =>
        prev.map((employee) =>
          employee.id === selectedEmployee.id
            ? selectedEmployee
            : employee
        )
      );
    } else {
      setPartTimeData((prev) =>
        prev.map((employee) =>
          employee.id === selectedEmployee.id
            ? selectedEmployee
            : employee
        )
      );
    }

    setShowEditModal(false);
    setSelectedEmployee(null);
  };

  // =========================================================
  // DELETE
  // =========================================================

  const handleDelete = (id) => {
    setActiveMenu(null);

    const employee = currentData.find(
      (item) => item.id === id
    );

    const confirmed = window.confirm(
      `Are you sure you want to delete ${employee?.name || "this employee"}?`
    );

    if (!confirmed) {
      return;
    }

    if (activeTab === "permanent") {
      setPermanentData((prev) =>
        prev.filter((employee) => employee.id !== id)
      );
    } else {
      setPartTimeData((prev) =>
        prev.filter((employee) => employee.id !== id)
      );
    }

    setSelectedRows((prev) =>
      prev.filter((rowId) => rowId !== id)
    );
  };

  // =========================================================
  // CLOSE MODAL
  // =========================================================

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedEmployee(null);
  };

  return (
    <div
      className="payroll-page"
      onClick={() => setActiveMenu(null)}
    >
      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <div className="payroll-page-header">
        <div>
          <h2>
            Payroll <span>/ Salary grade</span>
          </h2>

          <p>
            Permanent and part-time employee's payroll
          </p>
        </div>
      </div>

      {/* =====================================================
          PAYROLL CARD
      ===================================================== */}

      <div className="payroll-card">

        {/* ===================================================
            TABS
        =================================================== */}

        <div className="payroll-tabs">

          <button
            type="button"
            className={
              activeTab === "permanent"
                ? "payroll-tab active"
                : "payroll-tab"
            }
            onClick={() => {
              setActiveTab("permanent");
              setActiveMenu(null);
              setSelectedRows([]);
            }}
          >
            <span className="tab-icon">
              ◎
            </span>

            Permanent
          </button>

          <button
            type="button"
            className={
              activeTab === "parttime"
                ? "payroll-tab active"
                : "payroll-tab"
            }
            onClick={() => {
              setActiveTab("parttime");
              setActiveMenu(null);
              setSelectedRows([]);
            }}
          >
            <span className="tab-icon">
              ⇄
            </span>

            Part Time
          </button>

        </div>

        {/* ===================================================
            TABLE
        =================================================== */}

        <div className="payroll-table-wrapper">
          <table className="payroll-table">

            <thead>
              <tr>

                <th className="payroll-checkbox">
                  <input
                    type="checkbox"
                    checked={
                      currentData.length > 0 &&
                      currentData.every((employee) =>
                        selectedRows.includes(
                          employee.id
                        )
                      )
                    }
                    onChange={(event) => {
                      event.stopPropagation();
                      toggleSelectAll();
                    }}
                  />
                </th>

                <th>Name</th>

                <th>Position</th>

                <th>Account Number</th>

                <th>Basic</th>

                <th>Highest</th>

                {activeTab === "permanent" && (
                  <th>Overtime</th>
                )}

                <th className="payroll-action-header">
                  ...
                </th>

              </tr>
            </thead>

            <tbody>

              {currentData.map((employee) => (

                <tr key={employee.id}>

                  {/* CHECKBOX */}

                  <td className="payroll-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(
                        employee.id
                      )}
                      onChange={() =>
                        toggleRowSelection(
                          employee.id
                        )
                      }
                    />
                  </td>

                  {/* NAME */}

                  <td>
                    <div className="employee-info">

                      <div
                        className={`employee-avatar avatar-${employee.id % 5}`}
                      >
                        {employee.initials}
                      </div>

                      <div className="employee-details">

                        <span className="employee-name">
                          {employee.name}
                        </span>

                        <span className="employee-email">
                          {employee.email}
                        </span>

                      </div>

                    </div>
                  </td>

                  {/* POSITION */}

                  <td>
                    <span className="payroll-text">
                      {employee.position}
                    </span>
                  </td>

                  {/* ACCOUNT */}

                  <td>
                    <span className="payroll-text">
                      {employee.accountNumber}
                    </span>
                  </td>

                  {/* BASIC */}

                  <td>
                    <span className="payroll-text">
                      {employee.basic}
                    </span>
                  </td>

                  {/* HIGHEST */}

                  <td>
                    <span className="payroll-text">
                      {employee.highest}
                    </span>
                  </td>

                  {/* OVERTIME */}

                  {activeTab === "permanent" && (
                    <td>
                      <span className="payroll-text">
                        {employee.overtime}
                      </span>
                    </td>
                  )}

                  {/* THREE DOT */}

                  <td className="payroll-action-cell">

                    <div className="payroll-action-wrapper">

                      <button
                        type="button"
                        className="payroll-three-dot"
                        onClick={(event) => {
                          event.stopPropagation();

                          toggleActionMenu(
                            employee.id
                          );
                        }}
                        aria-label="Employee actions"
                      >
                        ...
                      </button>

                      {activeMenu ===
                        employee.id && (

                        <PayrollActionMenu
                          onView={() =>
                            handleViewDetails(
                              employee
                            )
                          }
                          onEdit={() =>
                            handleEdit(employee)
                          }
                          onDelete={() =>
                            handleDelete(
                              employee.id
                            )
                          }
                        />

                      )}

                    </div>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>
        </div>

        {/* ===================================================
            PAGINATION
        =================================================== */}

        <div className="payroll-bottom">

          <div className="payroll-pagination">

            <button type="button">
              «
            </button>

            <button
              type="button"
              className="page-active"
            >
              1
            </button>

            <button type="button">
              2
            </button>

            <button type="button">
              ...
            </button>

            <button type="button">
              6
            </button>

            <button type="button">
              7
            </button>

            <button type="button">
              »
            </button>

          </div>

          <div className="page-count">
            PAGE

            <select defaultValue="1">
              <option value="1">
                1
              </option>

              <option value="2">
                2
              </option>

              <option value="3">
                3
              </option>
            </select>

            <span>
              OF 102
            </span>
          </div>

        </div>

      </div>

      {/* =====================================================
          EDIT PAYROLL POPUP
      ===================================================== */}

      {showEditModal &&
        selectedEmployee && (

        <div
          className="payroll-modal-overlay"
          onMouseDown={(event) => {

            if (
              event.target ===
              event.currentTarget
            ) {
              closeEditModal();
            }

          }}
        >

          <div
            className="payroll-edit-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >

            {/* MODAL HEADER */}

            <div className="payroll-modal-header">

              <h3>
                Edit Payroll
              </h3>

              <button
                type="button"
                className="payroll-modal-close"
                onClick={closeEditModal}
              >
                ×
              </button>

            </div>

            {/* MODAL BODY */}

            <form
              onSubmit={handleSaveEdit}
            >

              <div className="payroll-modal-body">

                <div className="payroll-form-grid">

                  {/* NAME */}

                  <div className="payroll-form-group">

                    <label>
                      Name
                    </label>

                    <input
                      type="text"
                      name="name"
                      value={
                        selectedEmployee.name
                      }
                      onChange={
                        handleEditChange
                      }
                    />

                  </div>

                  {/* POSITION */}

                  <div className="payroll-form-group">

                    <label>
                      Position
                    </label>

                    <input
                      type="text"
                      name="position"
                      value={
                        selectedEmployee.position
                      }
                      onChange={
                        handleEditChange
                      }
                    />

                  </div>

                  {/* ACCOUNT */}

                  <div className="payroll-form-group">

                    <label>
                      Account Number
                    </label>

                    <input
                      type="text"
                      name="accountNumber"
                      value={
                        selectedEmployee.accountNumber
                      }
                      onChange={
                        handleEditChange
                      }
                    />

                  </div>

                  {/* BASIC */}

                  <div className="payroll-form-group">

                    <label>
                      Basic
                    </label>

                    <input
                      type="text"
                      name="basic"
                      value={
                        selectedEmployee.basic
                      }
                      onChange={
                        handleEditChange
                      }
                    />

                  </div>

                  {/* HIGHEST */}

                  <div className="payroll-form-group">

                    <label>
                      Highest
                    </label>

                    <input
                      type="text"
                      name="highest"
                      value={
                        selectedEmployee.highest
                      }
                      onChange={
                        handleEditChange
                      }
                    />

                  </div>

                  {/* OVERTIME */}

                  <div className="payroll-form-group">

                    <label>
                      Overtime
                    </label>

                    <input
                      type="text"
                      name="overtime"
                      value={
                        selectedEmployee.overtime
                      }
                      onChange={
                        handleEditChange
                      }
                    />

                  </div>

                </div>

              </div>

              {/* MODAL FOOTER */}

              <div className="payroll-modal-footer">

                <button
                  type="button"
                  className="payroll-cancel-button"
                  onClick={closeEditModal}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="payroll-save-button"
                >
                  Save Changes
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
};

// =========================================================
// THREE DOT ACTION MENU
// =========================================================

const PayrollActionMenu = ({
  onView,
  onEdit,
  onDelete,
}) => {

  return (
    <div
      className="payroll-action-menu"
      onClick={(event) =>
        event.stopPropagation()
      }
    >

      {/* VIEW */}

      <button
        type="button"
        className="payroll-action-item"
        onClick={onView}
      >
        <span className="action-icon">
          👁
        </span>

        <span>
          View Details
        </span>
      </button>

      {/* EDIT */}

      <button
        type="button"
        className="payroll-action-item"
        onClick={onEdit}
      >
        <span className="action-icon">
          ✎
        </span>

        <span>
          Edit
        </span>
      </button>

      {/* DELETE */}

      <button
        type="button"
        className="payroll-action-item delete-action"
        onClick={onDelete}
      >
        <span className="action-icon">
          🗑
        </span>

        <span>
          Delete
        </span>
      </button>

    </div>
  );
};

export default Payroll;