import React, { useState } from "react";
import "./LeadLists.css";

const initialLeadData = [
  {
    id: 1,
    initials: "AS",
    name: "Abu Binhtiyak",
    type: "Individual",
    group: "Customer",
    email: "info@softnio.com",
    phone: "+81 847-4958",
    address: "Mirpur, Dhaka, Bangladesh.",
    openDeal: 2,
    closeDeal: 3,
    status: "Active",
  },
  {
    id: 2,
    initials: "PN",
    name: "Patrick Newman",
    type: "Individual",
    group: "Cold Lead",
    email: "patrick@example.com",
    phone: "+942 238-4474",
    address: "United States",
    openDeal: 1,
    closeDeal: 0,
    status: "Pending",
  },
  {
    id: 3,
    initials: "HK",
    name: "Howard Kennedy",
    type: "Individual",
    group: "Hot Lead",
    email: "howard@example.com",
    phone: "+447 595-6725",
    address: "England",
    openDeal: 1,
    closeDeal: 1,
    status: "Active",
  },
  {
    id: 4,
    initials: "AB",
    name: "Albert Brown",
    type: "Individual",
    group: "Customer",
    email: "albert@example.com",
    phone: "+408 595-6725",
    address: "United States",
    openDeal: 1,
    closeDeal: 1,
    status: "Active",
  },
];

const initialOrganizationData = [
  {
    id: 1,
    initials: "HB",
    name: "HBO MAX",
    type: "Organization",
    group: "Customer",
    position: "HR",
    email: "info@softnio.com",
    phone: "+81 847-4958",
    address: "New York, United States",
    branch: "Main branch",
    openDeal: 2,
    closeDeal: 3,
    status: "Active",
  },
  {
    id: 2,
    initials: "WT",
    name: "WB Time",
    type: "Organization",
    group: "Cold Lead",
    position: "Manager",
    email: "patrick@example.com",
    phone: "+942 238-4474",
    address: "United States",
    branch: "Branch-1",
    openDeal: 1,
    closeDeal: 0,
    status: "Pending",
  },
  {
    id: 3,
    initials: "DC",
    name: "Detective Comics",
    type: "Organization",
    group: "Hot Lead",
    position: "Junior Executive",
    email: "howard@example.com",
    phone: "+447 595-6725",
    address: "England",
    branch: "Branch-2",
    openDeal: 1,
    closeDeal: 1,
    status: "Active",
  },
  {
    id: 4,
    initials: "AP",
    name: "Apple",
    type: "Organization",
    group: "Customer",
    position: "Senior Executive",
    email: "apple@example.com",
    phone: "+408 595-6725",
    address: "United States",
    branch: "Main branch",
    openDeal: 1,
    closeDeal: 1,
    status: "Active",
  },
];

const emptyLead = {
  name: "",
  type: "Individual",
  group: "Customer",
  email: "",
  phone: "",
  address: "",
  openDeal: "",
  closeDeal: "",
  status: "Active",
  position: "",
  branch: "",
};

const LeadLists = () => {
  const [leadData, setLeadData] = useState(initialLeadData);

  const [organizationData, setOrganizationData] = useState(
    initialOrganizationData
  );

  const [selectedLeads, setSelectedLeads] = useState([]);

  const [showAddLeadModal, setShowAddLeadModal] = useState(false);

  const [activeMenu, setActiveMenu] = useState(null);

  const [activeTab, setActiveTab] = useState("lead");

  // IMPORTANT:
  // This tells the popup whether it was opened
  // from Lead Lists or Organizations Lead Lists.
  const [modalType, setModalType] = useState("lead");

  const [editingLeadId, setEditingLeadId] = useState(null);

  const [editingOrganizationId, setEditingOrganizationId] =
    useState(null);

  const [newLead, setNewLead] = useState(emptyLead);

  // =========================================================
  // SELECT LEAD
  // =========================================================

  const toggleSelect = (id) => {
    setSelectedLeads((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    );
  };

  // =========================================================
  // SELECT ALL
  // =========================================================

  const toggleSelectAll = (data) => {
    const allSelected =
      data.length > 0 &&
      data.every((item) => selectedLeads.includes(item.id));

    if (allSelected) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(data.map((item) => item.id));
    }
  };

  // =========================================================
  // FORM CHANGE
  // =========================================================

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setNewLead((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // =========================================================
  // OPEN ADD LEAD MODAL
  // =========================================================

  const openAddLeadModal = () => {
    setNewLead({
      ...emptyLead,
      type: "Individual",
    });

    setEditingLeadId(null);
    setEditingOrganizationId(null);

    setModalType("lead");
    setActiveTab("lead");

    setActiveMenu(null);

    setShowAddLeadModal(true);
  };

  // =========================================================
  // OPEN ADD ORGANIZATION MODAL
  // =========================================================

  const openAddOrganizationModal = () => {
    setNewLead({
      ...emptyLead,
      type: "Organization",
    });

    setEditingLeadId(null);
    setEditingOrganizationId(null);

    setModalType("organization");
    setActiveTab("lead");

    setActiveMenu(null);

    setShowAddLeadModal(true);
  };

  // =========================================================
  // ADD / UPDATE
  // =========================================================

  const handleAddLead = (event) => {
    event.preventDefault();

    if (!newLead.name.trim()) {
      alert("Please enter Lead Name");
      return;
    }

    const initials = newLead.name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join("");

    // =======================================================
    // ORGANIZATION
    // =======================================================

    if (modalType === "organization") {
      const organization = {
        id:
          editingOrganizationId !== null
            ? editingOrganizationId
            : Date.now(),

        initials: initials || "OR",

        name: newLead.name.trim(),

        type: "Organization",

        group: newLead.group,

        position: newLead.position?.trim() || "HR",

        email: newLead.email.trim(),

        phone: newLead.phone.trim(),

        address: newLead.address.trim(),

        branch: newLead.branch?.trim() || "Main branch",

        openDeal: Number(newLead.openDeal) || 0,

        closeDeal: Number(newLead.closeDeal) || 0,

        status: newLead.status,
      };

      if (editingOrganizationId !== null) {
        setOrganizationData((prev) =>
          prev.map((item) =>
            item.id === editingOrganizationId
              ? organization
              : item
          )
        );
      } else {
        setOrganizationData((prev) => [
          ...prev,
          organization,
        ]);
      }

      closeAddLeadModal();

      return;
    }

    // =======================================================
    // NORMAL LEAD
    // =======================================================

    const lead = {
      id:
        editingLeadId !== null
          ? editingLeadId
          : Date.now(),

      initials: initials || "LD",

      name: newLead.name.trim(),

      type: newLead.type,

      group: newLead.group,

      email: newLead.email.trim(),

      phone: newLead.phone.trim(),

      address: newLead.address.trim(),

      openDeal: Number(newLead.openDeal) || 0,

      closeDeal: Number(newLead.closeDeal) || 0,

      status: newLead.status,
    };

    if (editingLeadId !== null) {
      setLeadData((prev) =>
        prev.map((item) =>
          item.id === editingLeadId ? lead : item
        )
      );
    } else {
      setLeadData((prev) => [...prev, lead]);
    }

    closeAddLeadModal();
  };

  // =========================================================
  // RESET FORM
  // =========================================================

  const resetForm = () => {
    setNewLead({
      ...emptyLead,
      type:
        modalType === "organization"
          ? "Organization"
          : "Individual",
    });

    setEditingLeadId(null);
    setEditingOrganizationId(null);
  };

  // =========================================================
  // CLOSE MODAL
  // =========================================================

  const closeAddLeadModal = () => {
    setShowAddLeadModal(false);

    setActiveTab("lead");

    setModalType("lead");

    setEditingLeadId(null);

    setEditingOrganizationId(null);

    setNewLead(emptyLead);
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
  // VIEW LEAD DETAILS
  // =========================================================

  const handleViewDetails = (lead) => {
    setActiveMenu(null);

    alert(
      `Lead Details\n\nName: ${lead.name}\nEmail: ${lead.email}\nPhone: ${lead.phone}\nAddress: ${lead.address}\nStatus: ${lead.status}`
    );
  };

  // =========================================================
  // VIEW ORGANIZATION DETAILS
  // =========================================================

  const handleViewOrganization = (organization) => {
    setActiveMenu(null);

    alert(
      `Organization Details\n\nName: ${organization.name}\nEmail: ${organization.email}\nPhone: ${organization.phone}\nAddress: ${organization.address}\nBranch: ${organization.branch}\nStatus: ${organization.status}`
    );
  };

  // =========================================================
  // EDIT LEAD
  // =========================================================

  const handleEdit = (lead) => {
    setActiveMenu(null);

    setNewLead({
      name: lead.name || "",
      type: lead.type || "Individual",
      group: lead.group || "Customer",
      email: lead.email || "",
      phone: lead.phone || "",
      address: lead.address || "",
      openDeal: lead.openDeal ?? "",
      closeDeal: lead.closeDeal ?? "",
      status: lead.status || "Active",
      position: "",
      branch: "",
    });

    setEditingLeadId(lead.id);

    setEditingOrganizationId(null);

    setModalType("lead");

    setActiveTab("lead");

    setShowAddLeadModal(true);
  };

  // =========================================================
  // EDIT ORGANIZATION
  // =========================================================

  const handleEditOrganization = (organization) => {
    setActiveMenu(null);

    setNewLead({
      name: organization.name || "",
      type: "Organization",
      group: organization.group || "Customer",
      email: organization.email || "",
      phone: organization.phone || "",
      address: organization.address || "",
      openDeal: organization.openDeal ?? "",
      closeDeal: organization.closeDeal ?? "",
      status: organization.status || "Active",
      position: organization.position || "",
      branch: organization.branch || "",
    });

    setEditingOrganizationId(organization.id);

    setEditingLeadId(null);

    setModalType("organization");

    setActiveTab("lead");

    setShowAddLeadModal(true);
  };

  // =========================================================
  // DELETE LEAD
  // =========================================================

  const handleDelete = (id) => {
    setActiveMenu(null);

    const confirmed = window.confirm(
      "Are you sure you want to delete this lead?"
    );

    if (confirmed) {
      setLeadData((prev) =>
        prev.filter((lead) => lead.id !== id)
      );

      setSelectedLeads((prev) =>
        prev.filter((leadId) => leadId !== id)
      );
    }
  };

  // =========================================================
  // DELETE ORGANIZATION
  // =========================================================

  const handleDeleteOrganization = (id) => {
    setActiveMenu(null);

    const organization = organizationData.find(
      (item) => item.id === id
    );

    const confirmed = window.confirm(
      `Are you sure you want to delete ${organization?.name || "this organization"}?`
    );

    if (confirmed) {
      setOrganizationData((prev) =>
        prev.filter((item) => item.id !== id)
      );
    }
  };

  return (
    <div
      className="lead-page"
      onClick={() => setActiveMenu(null)}
    >
      {/* =====================================================
          LEAD LIST HEADER
      ===================================================== */}

      <LeadSectionHeader
        title="Lead Lists"
        subtitle={`You have total ${leadData.length} Lead.`}
        onAdd={openAddLeadModal}
      />

      {/* =====================================================
          LEAD TABLE
      ===================================================== */}

      <div className="lead-card">
        <TableToolbar />

        <div className="table-responsive">
          <table className="lead-table">
            <thead>
              <tr>
                <th className="checkbox-column">
                  <input
                    type="checkbox"
                    checked={
                      leadData.length > 0 &&
                      leadData.every((lead) =>
                        selectedLeads.includes(lead.id)
                      )
                    }
                    onChange={(event) => {
                      event.stopPropagation();

                      toggleSelectAll(leadData);
                    }}
                  />
                </th>

                <th>Name</th>

                <th>Group</th>

                <th>Email</th>

                <th>Phone</th>

                <th>Address</th>

                <th>Open Deal</th>

                <th>Close Deal</th>

                <th>Status</th>

                <th></th>
              </tr>
            </thead>

            <tbody>
              {leadData.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedLeads.includes(
                        lead.id
                      )}
                      onChange={() =>
                        toggleSelect(lead.id)
                      }
                    />
                  </td>

                  <td>
                    <div className="person-info">
                      <div className="avatar">
                        {lead.initials}
                      </div>

                      <span>{lead.name}</span>
                    </div>
                  </td>

                  <td>
                    <LeadBadge
                      group={lead.group}
                    />
                  </td>

                  <td>
                    <span className="table-text">
                      {lead.email}
                    </span>
                  </td>

                  <td>
                    <span className="table-text">
                      {lead.phone}
                    </span>
                  </td>

                  <td>
                    <span className="table-text">
                      {lead.address}
                    </span>
                  </td>

                  <td>
                    <div className="deal-count open">
                      <span>◷</span>

                      {lead.openDeal}
                    </div>
                  </td>

                  <td>
                    <div className="deal-count close">
                      <span>◉</span>

                      {lead.closeDeal}
                    </div>
                  </td>

                  <td>
                    <StatusBadge
                      status={lead.status}
                    />
                  </td>

                  <td className="action-column">
                    <div className="action-wrapper">
                      <button
                        className="action-button"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();

                          toggleActionMenu(
                            `lead-${lead.id}`
                          );
                        }}
                      >
                        ⋯
                      </button>

                      {activeMenu ===
                        `lead-${lead.id}` && (
                        <ActionMenu
                          onView={() =>
                            handleViewDetails(lead)
                          }
                          onEdit={() =>
                            handleEdit(lead)
                          }
                          onDelete={() =>
                            handleDelete(lead.id)
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

        <Pagination />
      </div>

      {/* =====================================================
          ORGANIZATIONS HEADER
          SAME + BUTTON METHOD
      ===================================================== */}

      <LeadSectionHeader
        title="Organizations Lead Lists"
        subtitle={`You have total ${organizationData.length} Lead.`}
        onAdd={openAddOrganizationModal}
      />

      {/* =====================================================
          ORGANIZATION TABLE
      ===================================================== */}

      <div className="lead-card">
        <TableToolbar />

        <div className="table-responsive">
          <table className="lead-table organization-table">
            <thead>
              <tr>
                <th className="checkbox-column">
                  <input type="checkbox" />
                </th>

                <th>Name</th>

                <th>Group</th>

                <th>Contact</th>

                <th>Address</th>

                <th>Open Deal</th>

                <th>Close Deal</th>

                <th>Status</th>

                <th></th>
              </tr>
            </thead>

            <tbody>
              {organizationData.map(
                (organization) => (
                  <tr key={organization.id}>
                    <td>
                      <input type="checkbox" />
                    </td>

                    <td>
                      <div className="person-info">
                        <div className="avatar organization-avatar">
                          {organization.initials}
                        </div>

                        <span>
                          {organization.name}
                        </span>
                      </div>
                    </td>

                    <td>
                      <LeadBadge
                        group={organization.group}
                      />
                    </td>

                    <td>
                      <div className="contact-info">
                        <strong>
                          {organization.position}
                        </strong>

                        <span>
                          {organization.email}
                        </span>

                        <span>
                          {organization.phone}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div className="contact-info">
                        <span>
                          {organization.address}
                        </span>

                        <span>
                          {organization.branch}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div className="deal-count open">
                        <span>◷</span>

                        {organization.openDeal}
                      </div>
                    </td>

                    <td>
                      <div className="deal-count close">
                        <span>◉</span>

                        {organization.closeDeal}
                      </div>
                    </td>

                    <td>
                      <StatusBadge
                        status={
                          organization.status
                        }
                      />
                    </td>

                    <td className="action-column">
                      <div className="action-wrapper">
                        <button
                          className="action-button"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();

                            toggleActionMenu(
                              `org-${organization.id}`
                            );
                          }}
                        >
                          ⋯
                        </button>

                        {activeMenu ===
                          `org-${organization.id}` && (
                          <ActionMenu
                            onView={() =>
                              handleViewOrganization(
                                organization
                              )
                            }
                            onEdit={() =>
                              handleEditOrganization(
                                organization
                              )
                            }
                            onDelete={() =>
                              handleDeleteOrganization(
                                organization.id
                              )
                            }
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>

        <Pagination />
      </div>

      {/* =====================================================
          ADD / EDIT MODAL
          DO NOT CHANGE THE EXISTING UI
      ===================================================== */}

      {showAddLeadModal && (
        <div
          className="lead-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeAddLeadModal();
            }
          }}
        >
          <div
            className="lead-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            {/* MODAL HEADER */}

            <div className="lead-modal-header">
              <h3>
                {editingLeadId !== null ||
                editingOrganizationId !== null
                  ? "Edit Lead"
                  : "Add Lead"}
              </h3>

              <button
                type="button"
                className="lead-modal-close"
                onClick={closeAddLeadModal}
              >
                ×
              </button>
            </div>

            {/* TABS */}

            <div className="lead-modal-tabs">
              <button
                type="button"
                className={
                  activeTab === "lead"
                    ? "modal-tab active"
                    : "modal-tab"
                }
                onClick={() =>
                  setActiveTab("lead")
                }
              >
                Lead Details
              </button>

              <button
                type="button"
                className={
                  activeTab === "contact"
                    ? "modal-tab active"
                    : "modal-tab"
                }
                onClick={() =>
                  setActiveTab("contact")
                }
              >
                Contact Details
              </button>
            </div>

            {/* FORM */}

            <form
              className="lead-modal-form"
              onSubmit={handleAddLead}
            >
              {activeTab === "lead" && (
                <div className="lead-form-grid">
                  {/* NAME */}

                  <div className="lead-form-group">
                    <label htmlFor="lead-name">
                      Name
                    </label>

                    <input
                      id="lead-name"
                      type="text"
                      name="name"
                      value={newLead.name}
                      onChange={handleInputChange}
                      placeholder="e.g. Abu Bin Ishtiyak"
                    />
                  </div>

                  {/* TYPE */}

                  <div className="lead-form-group">
                    <label htmlFor="lead-type">
                      Type
                    </label>

                    <select
                      id="lead-type"
                      name="type"
                      value={
                        modalType ===
                        "organization"
                          ? "Organization"
                          : newLead.type
                      }
                      onChange={handleInputChange}
                      disabled={
                        modalType ===
                        "organization"
                      }
                    >
                      <option value="Individual">
                        Individual
                      </option>

                      <option value="Organization">
                        Organization
                      </option>
                    </select>
                  </div>

                  {/* GROUP */}

                  <div className="lead-form-group">
                    <label htmlFor="lead-group">
                      Group
                    </label>

                    <select
                      id="lead-group"
                      name="group"
                      value={newLead.group}
                      onChange={handleInputChange}
                    >
                      <option value="Customer">
                        Customer
                      </option>

                      <option value="Cold Lead">
                        Cold Lead
                      </option>

                      <option value="Hot Lead">
                        Hot Lead
                      </option>
                    </select>
                  </div>

                  {/* OPEN DEAL */}

                  <div className="lead-form-group">
                    <label htmlFor="lead-open-deal">
                      Open Deal
                    </label>

                    <input
                      id="lead-open-deal"
                      type="number"
                      name="openDeal"
                      value={newLead.openDeal}
                      onChange={handleInputChange}
                      placeholder="e.g. 5"
                    />
                  </div>

                  {/* CLOSE DEAL */}

                  <div className="lead-form-group">
                    <label htmlFor="lead-close-deal">
                      Close Deal
                    </label>

                    <input
                      id="lead-close-deal"
                      type="number"
                      name="closeDeal"
                      value={newLead.closeDeal}
                      onChange={handleInputChange}
                      placeholder="e.g. 3"
                    />
                  </div>

                  {/* STATUS */}

                  <div className="lead-form-group">
                    <label htmlFor="lead-status">
                      Status
                    </label>

                    <select
                      id="lead-status"
                      name="status"
                      value={newLead.status}
                      onChange={handleInputChange}
                    >
                      <option value="Active">
                        Active
                      </option>

                      <option value="Pending">
                        Pending
                      </option>
                    </select>
                  </div>
                </div>
              )}

              {/* =================================================
                  CONTACT TAB
              ================================================= */}

              {activeTab === "contact" && (
                <div className="contact-form-grid">
                  {/* EMAIL */}

                  <div className="lead-form-group">
                    <label htmlFor="lead-email">
                      Email Address
                    </label>

                    <input
                      id="lead-email"
                      type="email"
                      name="email"
                      value={newLead.email}
                      onChange={handleInputChange}
                      placeholder="Email Address"
                    />
                  </div>

                  {/* PHONE */}

                  <div className="lead-form-group">
                    <label htmlFor="lead-phone">
                      Phone Number
                    </label>

                    <input
                      id="lead-phone"
                      type="text"
                      name="phone"
                      value={newLead.phone}
                      onChange={handleInputChange}
                      placeholder="Phone Number"
                    />
                  </div>

                  {/* ADDRESS */}

                  <div className="lead-form-group contact-address">
                    <label htmlFor="lead-address">
                      Address
                    </label>

                    <input
                      id="lead-address"
                      type="text"
                      name="address"
                      value={newLead.address}
                      onChange={handleInputChange}
                      placeholder="Address"
                    />
                  </div>

                  {/* POSITION */}

                  {modalType ===
                    "organization" && (
                    <div className="lead-form-group">
                      <label htmlFor="lead-position">
                        Position
                      </label>

                      <input
                        id="lead-position"
                        type="text"
                        name="position"
                        value={newLead.position}
                        onChange={
                          handleInputChange
                        }
                        placeholder="e.g. HR"
                      />
                    </div>
                  )}

                  {/* BRANCH */}

                  {modalType ===
                    "organization" && (
                    <div className="lead-form-group">
                      <label htmlFor="lead-branch">
                        Branch
                      </label>

                      <input
                        id="lead-branch"
                        type="text"
                        name="branch"
                        value={newLead.branch}
                        onChange={
                          handleInputChange
                        }
                        placeholder="e.g. Main branch"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* MODAL FOOTER */}

              <div className="lead-modal-footer">
                <button
                  type="submit"
                  className="lead-save-button"
                >
                  {editingLeadId !== null ||
                  editingOrganizationId !== null
                    ? "Save Changes"
                    : "Add Lead"}
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
// ACTION MENU
// =========================================================

const ActionMenu = ({
  onView,
  onEdit,
  onDelete,
}) => {
  return (
    <div
      className="lead-action-menu"
      onClick={(event) =>
        event.stopPropagation()
      }
    >
      <button
        type="button"
        className="action-menu-item"
        onClick={onView}
      >
        <span className="action-menu-icon view-icon">
          👁
        </span>

        <span>View Details</span>
      </button>

      <button
        type="button"
        className="action-menu-item"
        onClick={onEdit}
      >
        <span className="action-menu-icon edit-icon">
          ✎
        </span>

        <span>Edit</span>
      </button>

      <button
        type="button"
        className="action-menu-item delete-item"
        onClick={onDelete}
      >
        <span className="action-menu-icon delete-icon">
          🗑
        </span>

        <span>Delete</span>
      </button>
    </div>
  );
};

// =========================================================
// SECTION HEADER
// =========================================================

const LeadSectionHeader = ({
  title,
  subtitle,
  onAdd,
}) => {
  return (
    <div className="lead-section-header">
      <div className="lead-section-title">
        <h2>{title}</h2>

        <p>{subtitle}</p>
      </div>

      <div className="header-actions">
        <button
          className="export-button"
          type="button"
        >
          <span>⇩</span>

          Export
        </button>

        {onAdd && (
          <button
            className="add-button"
            type="button"
            onClick={onAdd}
            title="Add Lead"
            aria-label="Add Lead"
          >
            +
          </button>
        )}
      </div>
    </div>
  );
};

// =========================================================
// TABLE TOOLBAR
// =========================================================

const TableToolbar = () => {
  return (
    <div className="table-toolbar">
      <div className="bulk-actions">
        <button
          className="bulk-button"
          type="button"
        >
          Bulk Action

          <span>⌄</span>
        </button>

        <button
          className="apply-button"
          type="button"
        >
          Apply
        </button>
      </div>

      <div className="table-tools">
        <button
          type="button"
          title="Search"
        >
          ⌕
        </button>

        <button
          type="button"
          title="View"
        >
          ☷
        </button>

        <button
          type="button"
          title="Settings"
        >
          ⚙
        </button>
      </div>
    </div>
  );
};

// =========================================================
// LEAD BADGE
// =========================================================

const LeadBadge = ({ group }) => {
  const className =
    group === "Customer"
      ? "customer"
      : group === "Cold Lead"
      ? "cold"
      : "hot";

  return (
    <span
      className={`lead-badge ${className}`}
    >
      {group}
    </span>
  );
};

// =========================================================
// STATUS BADGE
// =========================================================

const StatusBadge = ({ status }) => {
  return (
    <span
      className={`status-badge ${
        status === "Active"
          ? "active"
          : "pending"
      }`}
    >
      {status}
    </span>
  );
};

// =========================================================
// PAGINATION
// =========================================================

const Pagination = () => {
  return (
    <div className="pagination">
      <button type="button">Prev</button>

      <button
        type="button"
        className="current"
      >
        1
      </button>

      <button type="button">2</button>

      <button type="button">...</button>

      <button type="button">6</button>

      <button type="button">7</button>

      <button type="button">Next</button>
    </div>
  );
};

export default LeadLists;