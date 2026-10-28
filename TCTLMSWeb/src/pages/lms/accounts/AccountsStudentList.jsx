import React, { useEffect, useState } from "react";
import {
  Block, BlockBetween, BlockHead, BlockHeadContent, BlockTitle, Icon, CustomReactDataTable, Spinner
} from "../../../components/Component";
import {
  DropdownMenu, DropdownToggle, UncontrolledDropdown, Modal, ModalHeader, ModalBody, ModalFooter, Table, Button, Row, Col, FormGroup
} from "reactstrap";
import Content from "../../../layout/content/Content";
import { getStudentAccountStatus, getStudentScheduleSummaryById } from "../../../apiservices/DashboardService";
import { createStudetnInvoice, getAdvanceInvoices, sendAdvanceInvoice } from "../../../apiservices/ScheduleService";
import Head from "../../../layout/head/Head";
import { Link, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { toast, ToastContainer } from "react-toastify";
import { formatShortDate, formatTimeRangeWithHours, getDurationDifferenceInHours} from "../../../utils/dateUtils"
import { usePermissions } from "../../../hooks/usePermissions";
import moment from "moment";


// Coordinator-only Student List look. Every selector is under .tct-csl (rendered only for the
// Coordinator role). The shared CustomReactDataTable markup is restyled here, not edited.
// Coordinator-only Student List look. Every selector is under .tct-csl (rendered only for the
// Coordinator role). The shared CustomReactDataTable markup is restyled here, not edited.
const coordinatorStudentListStyle = `
  /* Title row: Student List | search (flexible) | Excel, CSV, Copy  (shared table, toolbarTitle) */
  .tct-csl .crdt-toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: 12px 16px; margin-bottom: 16px; }
  .tct-csl .crdt-toolbar-title { flex: 0 0 auto; }
  .tct-csl .crdt-toolbar-title .nk-block-title { margin: 0; font-size: 1.6rem; font-weight: 700; color: #1c2b46; white-space: nowrap; }
  /* Compact search, pushed right next to the export buttons */
  .tct-csl .crdt-toolbar-search { flex: 0 1 380px; min-width: 240px; margin: 0 0 0 auto; }
  .tct-csl .crdt-toolbar-search input.form-control {
    height: 40px; padding: 0 14px 0 38px; font-size: 14px; color: #364a63;
    background: #fff url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%238094ae%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Ccircle cx=%2711%27 cy=%2711%27 r=%277%27/%3E%3Cline x1=%2721%27 y1=%2721%27 x2=%2716.65%27 y2=%2716.65%27/%3E%3C/svg%3E") no-repeat 13px center / 16px 16px;
    border: 1px solid #dbdfea; border-radius: 8px; box-shadow: none; transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .tct-csl .crdt-toolbar-search input.form-control:hover { border-color: #c4b0ff; }
  .tct-csl .crdt-toolbar-search input.form-control::placeholder { color: #8094ae; }
  .tct-csl .crdt-toolbar-search input.form-control:focus { border-color: #854fff; box-shadow: 0 0 0 3px rgba(133, 79, 255, 0.12); }
  .tct-csl .crdt-toolbar .dt-export-buttons { flex: 0 0 auto; margin: 0; }
  .tct-csl .dt-buttons { display: inline-flex; gap: 6px; }
  .tct-csl .dt-buttons .btn {
    height: 40px; min-width: 40px; margin: 0 !important; padding: 0 11px;
    display: inline-flex; align-items: center; justify-content: center;
    color: #526484 !important; background: #fff !important; border: 1px solid #dbdfea !important; border-radius: 8px !important;
    box-shadow: none !important; transition: border-color 0.15s ease, color 0.15s ease, background-color 0.15s ease;
  }
  .tct-csl .dt-buttons .btn:hover { color: #854fff !important; background: #f5f1ff !important; border-color: #c4b0ff !important; }
  .tct-csl .dt-buttons .btn:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(133, 79, 255, 0.18) !important; }
  /* Excel: green accent (spreadsheet). Copy keeps the neutral style above. */
  .tct-csl .dt-buttons .btn.buttons-excel { color: #1a8754 !important; background: #ecf8f1 !important; border-color: #b8e2c9 !important; }
  .tct-csl .dt-buttons .btn.buttons-excel:hover { color: #fff !important; background: #1f9d63 !important; border-color: #1f9d63 !important; }
  .tct-csl .dt-buttons .btn.buttons-excel:active { background: #198754 !important; border-color: #198754 !important; }
  .tct-csl .dt-buttons .btn.buttons-excel:focus-visible { box-shadow: 0 0 0 3px rgba(31, 157, 99, 0.22) !important; }
  /* CSV: blue accent, distinct from Excel. */
  .tct-csl .dt-buttons .btn.buttons-csv { color: #2563c9 !important; background: #edf3fe !important; border-color: #c2d5f8 !important; }
  .tct-csl .dt-buttons .btn.buttons-csv:hover { color: #fff !important; background: #3474e0 !important; border-color: #3474e0 !important; }
  .tct-csl .dt-buttons .btn.buttons-csv:active { background: #2563c9 !important; border-color: #2563c9 !important; }
  .tct-csl .dt-buttons .btn.buttons-csv:focus-visible { box-shadow: 0 0 0 3px rgba(52, 116, 224, 0.22) !important; }

  /* Table in a white rounded card; wide tables scroll inside it */
  .tct-csl .dataTables_wrapper > div.nk-tb-list:not(.dataTables_wrapper) {
    background: #fff; border: 1px solid #e5e9f2; border-radius: 12px; box-shadow: 0 1px 3px rgba(31, 43, 58, 0.05);
  }
  .tct-csl .rdt_Table { background: transparent; }
  .tct-csl .rdt_TableHeadRow { min-height: 46px; background: #f8f9fc; border-bottom: 1px solid #e5e9f2; border-radius: 12px 12px 0 0; }
  .tct-csl .rdt_TableCol { font-size: 11.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #8094ae; }
  .tct-csl .rdt_TableCol div { white-space: normal; overflow: visible; text-overflow: clip; line-height: 1.3; }
  .tct-csl .rdt_TableRow { min-height: 54px; font-size: 14px; color: #526484; }
  .tct-csl .rdt_TableRow:not(:last-of-type) { border-bottom-color: #eef0f5; }
  .tct-csl .rdt_TableRow:hover { background: #faf8ff; }
  .tct-csl .rdt_TableCell:first-child { font-weight: 600; color: #364a63; }
  .tct-csl .rdt_TableCell > div { overflow-wrap: anywhere; }
  /* Category / Status: same text and colour classes, shown as soft pills */
  .tct-csl .rdt_TableCell .tb-status { display: inline-block; min-width: 72px; text-align: center; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; line-height: 1.5; white-space: nowrap; }
  .tct-csl .rdt_TableCell .tb-status.text-success { background: rgba(30, 224, 172, 0.14); color: #0c9a74 !important; }
  .tct-csl .rdt_TableCell .tb-status.text-danger { background: rgba(232, 83, 71, 0.12); color: #c4382d !important; }
  .tct-csl .rdt_TableCell .tb-status.text-warning { background: rgba(244, 189, 14, 0.16); color: #a77b00 !important; }
  /* Actions (three dots) */
  .tct-csl .rdt_TableCell .btn-trigger.btn-icon { width: 32px; height: 32px; margin: 0 !important; border-radius: 8px; color: #6e82a5; }
  .tct-csl .rdt_TableCell .btn-trigger.btn-icon:before { display: none; }
  .tct-csl .rdt_TableCell .btn-trigger.btn-icon:hover,
  .tct-csl .rdt_TableCell .show > .btn-trigger.btn-icon { background: #f5f1ff; color: #854fff; }
  .tct-csl .rdt_TableCell .dropdown-menu { border: 1px solid #e5e9f2; border-radius: 10px; box-shadow: 0 10px 28px rgba(31, 43, 58, 0.14); }

  /* Footer row below the table (shared table, showEntriesInFooter): Show | entry count | pagination, right-aligned */
  /* Three sections: entry count (left edge) | pagination (middle) | Show / rows per page (right edge).
     Equal-width outer columns keep the count flush with the table's left border and Show with its right border. */
  .tct-csl .crdt-footer {
    display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    align-items: center; gap: 10px 18px; margin-top: 14px;
    width: 100%; flex: 1 1 100%; box-sizing: border-box; padding: 0 2px;
  }
  .tct-csl .crdt-footer .dataTables_length { margin: 0; }
  /* Rows per page: themed dropdown (shared table footer layout) */
  .tct-csl .crdt-rpp { display: flex; align-items: center; gap: 10px; }
  .tct-csl .crdt-rpp-label { font-size: 13px; font-weight: 600; color: #526484; }
  .tct-csl .crdt-rpp-toggle {
    display: inline-flex; align-items: center; justify-content: space-between; gap: 12px;
    min-width: 84px; height: 38px; padding: 0 12px 0 14px; cursor: pointer;
    font-size: 14px; font-weight: 600; line-height: 1; color: #364a63;
    background: #fff; border: 1px solid #dbdfea; border-radius: 8px; box-shadow: 0 1px 2px rgba(31, 43, 58, 0.04);
    transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
  }
  .tct-csl .crdt-rpp-toggle .icon { font-size: 14px; color: #854fff; transition: transform 0.15s ease; }
  .tct-csl .crdt-rpp-toggle:hover { border-color: #c4b0ff; background: #fbf9ff; }
  .tct-csl .crdt-rpp-toggle:focus { outline: none; }
  .tct-csl .crdt-rpp-toggle:focus-visible,
  .tct-csl .crdt-rpp .show > .crdt-rpp-toggle { border-color: #854fff; box-shadow: 0 0 0 3px rgba(133, 79, 255, 0.18); }
  .tct-csl .crdt-rpp .show > .crdt-rpp-toggle .icon { transform: rotate(180deg); }
  .tct-csl .crdt-rpp .crdt-rpp-menu {
    z-index: 1000; min-width: 110px; margin-bottom: 6px; padding: 4px;
    background: #fff; border: 1px solid #e5e9f2; border-radius: 10px; box-shadow: 0 10px 28px rgba(31, 43, 58, 0.14);
  }
  .tct-csl .crdt-rpp .crdt-rpp-menu .dropdown-item {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    padding: 8px 12px; border-radius: 6px; font-size: 14px; font-weight: 500; color: #364a63;
  }
  .tct-csl .crdt-rpp .crdt-rpp-menu .dropdown-item:hover,
  .tct-csl .crdt-rpp .crdt-rpp-menu .dropdown-item:focus { background: #f5f1ff; color: #4c1fd0; outline: none; }
  .tct-csl .crdt-rpp .crdt-rpp-menu .dropdown-item.active { background: #f1ebff; color: #4c1fd0; font-weight: 600; }
  .tct-csl .crdt-rpp .crdt-rpp-menu .dropdown-item .icon { font-size: 14px; color: #854fff; }
  .tct-csl .crdt-footer .dataTables_info { grid-column: 1; grid-row: 1; justify-self: start; padding: 0; font-size: 13px; color: #8094ae; white-space: nowrap; }
  .tct-csl .crdt-footer .dataTables_paginate { grid-column: 2; grid-row: 1; justify-self: center; margin: 0; }
  .tct-csl .crdt-footer .dataTables_length { grid-column: 3; grid-row: 1; justify-self: end; }
  /* LeadLists.css leaks an unscoped .pagination rule (padding, border-top, white background); undo it here. */
  .tct-csl .crdt-footer .pagination { display: flex; gap: 4px; margin: 0; padding: 0; border-top: 0; background: transparent; }
  .tct-csl .crdt-footer .pagination .page-link {
    min-width: 34px; height: 34px; padding: 0 8px; display: inline-flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 600; border-radius: 8px !important;
  }
  .tct-csl .crdt-footer .pagination .page-item.active .page-link { background: #854fff !important; color: #fff !important; }
  .tct-csl .crdt-footer .pagination .page-item:not(.active):not(.disabled) .page-link:hover { background: #f5f1ff !important; color: #854fff !important; }

  /* ---- Reference-design refinements ---- */
  /* Table + footer read as one card: purple top edge; the footer is the card's bottom section. */
  .tct-csl .dataTables_wrapper > div.nk-tb-list:not(.dataTables_wrapper) {
    border-top: 2px solid #854fff; border-radius: 12px 12px 0 0; box-shadow: 0 1px 2px rgba(31, 43, 58, 0.04);
  }
  .tct-csl .crdt-footer {
    margin-top: 0; padding: 12px 18px; background: #fff;
    border: 1px solid #e5e9f2; border-top: 0; border-radius: 0 0 12px 12px; box-shadow: 0 2px 4px rgba(31, 43, 58, 0.04);
  }
  .tct-csl .rdt_TableHeadRow { min-height: 42px; background: #f4f6fb; border-radius: 10px 10px 0 0; }
  .tct-csl .rdt_TableCol { font-size: 11px; color: #6b7a90; }
  .tct-csl .rdt_TableRow { min-height: 48px; font-size: 13.5px; }
  .tct-csl .rdt_TableCell .tb-status { min-width: 68px; padding: 2px 10px; font-size: 11.5px; }
  .tct-csl .rdt_TableCell .btn-trigger.btn-icon { width: 30px; height: 30px; background: #f5f2ff; color: #6a35e8; }
  /* Actions column (last column): extra left spacing from Status, same for header and rows so they stay aligned. */
  .tct-csl .rdt_TableHeadRow .rdt_TableCol:last-child,
  .tct-csl .rdt_TableRow .rdt_TableCell:last-child { padding-left: 28px; }
  .tct-csl .rdt_TableCell .btn-trigger.btn-icon:hover,
  .tct-csl .rdt_TableCell .show > .btn-trigger.btn-icon { background: #e9e0ff; color: #854fff; }
  /* Boxed page buttons; purple current page */
  .tct-csl .crdt-footer .pagination .page-item .page-link {
    min-width: 32px; height: 32px; color: #526484 !important; background: #fff !important; border: 1px solid #e5e9f2 !important;
  }
  .tct-csl .crdt-footer .pagination .page-item.active .page-link { color: #fff !important; background: #854fff !important; border-color: #854fff !important; }
  .tct-csl .crdt-footer .pagination .page-item:not(.active):not(.disabled) .page-link:hover { color: #854fff !important; background: #f5f1ff !important; border-color: #c4b0ff !important; }
  .tct-csl .crdt-footer .pagination .page-item.disabled .page-link { opacity: 0.5; }

  @media (max-width: 991.98px) {
    .tct-csl .crdt-toolbar-title { flex-basis: 100%; }
  }
  @media (max-width: 575.98px) {
    .tct-csl .crdt-toolbar-search { flex-basis: 100%; margin-left: 0; }
    .tct-csl .crdt-toolbar-title .nk-block-title { font-size: 1.35rem; }
  }
  /* Narrow screens: stack count, pagination, Show — centred */
  @media (max-width: 767.98px) {
    .tct-csl .crdt-footer { grid-template-columns: minmax(0, 1fr); justify-items: center; }
    .tct-csl .crdt-footer .dataTables_info,
    .tct-csl .crdt-footer .dataTables_paginate,
    .tct-csl .crdt-footer .dataTables_length { grid-column: 1; justify-self: center; }
    .tct-csl .crdt-footer .dataTables_info { grid-row: 1; }
    .tct-csl .crdt-footer .dataTables_paginate { grid-row: 2; }
    .tct-csl .crdt-footer .dataTables_length { grid-row: 3; }
  }
`;

const AccountsStudentList = () => {
  const location = useLocation();
  const headerSearch = new URLSearchParams(location.search).get("search") || "";
  const { can } = usePermissions();
  // Coordinator: redesigned look (.tct-csl). Other roles keep the existing page appearance.
  const isCoordinatorView = (localStorage.getItem("userRole") || "").trim().toLowerCase() === "coordinator";
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [studentAccountStatusSource, setStudentAccountStatusSource] = useState();
  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [itemPerPage, setItemPerPage] = useState(10);
  const defaultGuid = "00000000-0000-0000-0000-000000000000";
  const [openViewDetailsModal, setOpenViewDetailsModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState(defaultGuid);
  const [selectedStudentName, setSelectedStudentName] = useState("");
  const [selectedBoardName, setSelectedBoardName] = useState("");
  const [selectedGradeName, setSelectedGradeName] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [filteredEnrolledCourses, setFilteredEnrolledCourses] = useState([]);
  const [studentScheduleData, setStudentScheduleData] = useState(null);
  // Advance invoices of the opened student (first month of a newly scheduled subject), sent by Accounts.
  const [advanceInvoices, setAdvanceInvoices] = useState([]);
  const [sendingAdvanceInvoice, setSendingAdvanceInvoice] = useState(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());  

  const invoiceCount = filteredEnrolledCourses.filter(c => c.invoiceNumber).length;
  const hasInvoice = invoiceCount > 0;

  const [formData, setFormData] = useState({
    id: defaultGuid,
    board: defaultGuid,
    grade: defaultGuid,
    subject: defaultGuid,
    tutorPercentage: "",
    tctPercentage: "",
    tutorPercentageDiscount: "0",
    tctPercentageDiscount: "0"
  });

  const { reset } = useForm();

  // Months array for navigation
  const months = [
    { value: "January", label: "January" },
    { value: "February", label: "February" },
    { value: "March", label: "March" },
    { value: "April", label: "April" },
    { value: "May", label: "May" },
    { value: "June", label: "June" },
    { value: "July", label: "July" },
    { value: "August", label: "August" },
    { value: "September", label: "September" },
    { value: "October", label: "October" },
    { value: "November", label: "November" },
    { value: "December", label: "December" }
  ];

  // Years function
  const years = () => {
    const currentYear = new Date().getFullYear();
    const yearsList = [];
    for (let i = currentYear - 5; i <= currentYear; i++) {
      yearsList.push({ value: i, label: i.toString() });
    }
    return yearsList;
  };

  // Function to fetch student data
  const fetchStudentData = async () => {
    setDataLoading(true);
    try {
      const data = await getStudentAccountStatus();
      setStudentAccountStatusSource(data);
    } catch (error) {
      toast.error(`Error loading student data: ${error.message || "Something went wrong"}`);
    } finally {
      setDataLoading(false);
    }
  };

  const fetchStudentScheduleSummary = async (studentId, month = selectedMonth, year = selectedYear) => {
    setScheduleLoading(true);
    try {
      const data = await getStudentScheduleSummaryById(studentId, month, year);
      setStudentScheduleData(data);
      getAdvanceInvoices(studentId)
        .then((rows) => setAdvanceInvoices(Array.isArray(rows) ? rows : []))
        .catch(() => setAdvanceInvoices([]));
      
      let courses = [];
      if (Array.isArray(data)) {
        courses = data;
      } else if (data?.enrolledCourses && Array.isArray(data.enrolledCourses)) {
        courses = data.enrolledCourses;
      } else if (data?.data && Array.isArray(data.data)) {
        courses = data.data;
      }
      setFilteredEnrolledCourses(courses);
    } catch (error) {
      toast.error(`Error loading student schedule: ${error.message || "Something went wrong"}`);
      setStudentScheduleData(null);
      setFilteredEnrolledCourses([]);
    } finally {
      setScheduleLoading(false);
    }
  };

  const onSendAdvanceInvoice = async (invoice) => {
    setSendingAdvanceInvoice(invoice.invoiceNumber);
    try {
      const result = await sendAdvanceInvoice(invoice.invoiceNumber);
      toast.success(result?.message || "Advance invoice sent to the parent.");
      const rows = await getAdvanceInvoices(selectedStudentId);
      setAdvanceInvoices(Array.isArray(rows) ? rows : []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to send the advance invoice.");
    } finally {
      setSendingAdvanceInvoice(null);
    }
  };

  const closeViewDetailsModal = () => {
    setAdvanceInvoices([]);
    setOpenViewDetailsModal(false);
    setSelectedStudentId(defaultGuid);
    setSelectedStudentName("");
    setSelectedBoardName("");
    setSelectedGradeName("");
    setStudentScheduleData(null);
    setFilteredEnrolledCourses([]);
    setExpandedRows(new Set()); // Reset expanded rows
  };

  // Updated onEditHandler to handle view details
  const onEditHandler = async (studentData) => {
    try {
      const studentId = studentData?.studentId;
      if (studentId) {
        setSelectedStudentId(studentId);
        setSelectedStudentName(studentData.studentName);
        setSelectedBoardName(studentData.boardName || "");
        setSelectedGradeName(studentData.gradeName || "");
        
        // Set current month and year as default
        const currentDate = new Date();
        const currentMonth = months[currentDate.getMonth()].value;
        const currentYear = currentDate.getFullYear();
        
        setSelectedMonth(currentMonth);
        setSelectedYear(currentYear);
        
        setOpenViewDetailsModal(true);
        
        // Fetch student schedule summary with current month and year
        await fetchStudentScheduleSummary(studentId, currentMonth, currentYear);
      } else {
        toast.error("Student details are unavailable. Please refresh the list.");
      }
    } catch (error) {
      toast.error(`Error opening student details: ${error.message || "Something went wrong"}`);
    }
  };

  // Handle generate invoice
  const handleGenerateInvoice = async (details) => {
    setIsGeneratingInvoice(true);
    try {
      // Add your invoice generation logic here
      toast.success("Invoice generated successfully");
      // Refresh the data after generating invoice with current filters
      await fetchStudentScheduleSummary(selectedStudentId, selectedMonth, selectedYear);
    } catch (error) {
      toast.error(`Error generating invoice: ${error.message || "Something went wrong"}`);
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const handleViewInvoice = (invoiceNumber) => {
    console.log("Viewing invoice:", invoiceNumber);
  };

  const handleMonthChange = async (newMonth) => {
    setSelectedMonth(newMonth);
    if (selectedStudentId !== defaultGuid && openViewDetailsModal) {
      await fetchStudentScheduleSummary(selectedStudentId, newMonth, selectedYear);
    }
  };

  const handleYearChange = async (newYear) => {
    setSelectedYear(newYear);
    if (selectedStudentId !== defaultGuid && openViewDetailsModal) {
      await fetchStudentScheduleSummary(selectedStudentId, selectedMonth, newYear);
    }
  };

  // Toggle row expansion
  const toggleRow = (index) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(index)) {
      newExpandedRows.delete(index);
    } else {
      newExpandedRows.add(index);
    }
    setExpandedRows(newExpandedRows);
  };

  useEffect(() => {
    fetchStudentData();
  }, [itemPerPage]);

  const dtStudentAccountStatusColumns = [
    {
      name: "StudentName",
      selector: (row) => row.studentName,
      sortable: true,
      width: "300px"
    },
    {
      name: "Board/Grade",
      selector: (row) => row.boardAndGrade,
      sortable: true,
      width: "200px"
    },
    {
      name: "Phone",
      selector: (row) => row.phone,
      sortable: true,
      width: "160px"
    },
    {
      name: "Category",
      selector: (row) => row.category,
      cell: (row) => (
        <span className={row.category === "Low Risk" ? "tb-status text-success" : "tb-status text-danger"}>
          {row.category}
        </span>
      ),
      sortable: true,
      width: "120px"
    },
    {
      name: "Payment Till Date",
      selector: (row) => row.paymentTillDate,
      sortable: true,
      width: "200px"
    },
    {
      name: "Status",
      selector: (row) => row.isActive,
      sortable: true,
      cell: (row) => (
        <span className={row.isActive ? "tb-status text-success" : "tb-status text-warning"}>
          {row.isActive ? "Active" : "Inactive"}
        </span>
      ),
      width: "100px",
      hide: "md",
    },
    {
      name: "Actions",
      cell: (row) => (
        <UncontrolledDropdown>
          <DropdownToggle color="tranparent" className="dropdown-toggle btn btn-icon btn-trigger mr-n1">
            <Icon name="more-h" />
          </DropdownToggle>
          <DropdownMenu right>
            <ul className="link-list-opt no-bdr">
              {/* The menu is named "Student List" in the DB; older data used "Accounts Student List". */}
              {(can("Accounts Student List", "view") || can("Student List", "view")) && (
                <li>
                  <button type="button" className="btn btn-link" onClick={() => onEditHandler(row)}>
                    <Icon name="eye" />
                    <span>View Details</span>
                  </button>
                </li>
              )}
              {["Accounts", "AccountsAdmin"].includes(localStorage.getItem("userRole")?.trim()) && row.userId && (
                <li>
                  <Link to={`${process.env.PUBLIC_URL}/tct-student-calendar?id=${row.userId}`}>
                    <Icon name="calender-date" />
                    <span>View Schedule</span>
                  </Link>
                </li>
              )}
            </ul>
          </DropdownMenu>
        </UncontrolledDropdown>
      ),
      width: "100px",
      ignoreRowClick: true,
      allowOverflow: true,
      button: true,
    }
  ];

  const resetForm = () => {
    setFormData({
      id: defaultGuid,
      board: defaultGuid,
      grade: defaultGuid,
      subject: defaultGuid,
      tutorPercentage: "",
      tctPercentage: "",
      tutorPercentageDiscount: 0,
      tctPercentageDiscount: 0,
      createdBy: localStorage.getItem("userId"),
      createdDate: new Date(),
      isActive: true,
    });
    reset();
    setIsEdit(false);
  };

  const onFormSubmit = () => {
    if (loading) return;

    setLoading(true);
    const isNewRecord = !isEdit;

    const operation = isEdit
      ? updatePaymentPercentageConfigById(formData.id, { ...formData })
      : addPaymentPercentageConfig({ ...formData });

    operation
      .then(() => {
        setModalOpen(false);
        resetForm();
        fetchStudentData();
        toast.success(isNewRecord ? "Payment Percentage Config added successfully." : "Payment Percentage Config updated successfully.");
      })
      .catch((error) => {
        toast.error(`Error: ${error.message || "Something went wrong"}`);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const RenderGrid = () => {
    const searchableFields = dtStudentAccountStatusColumns
      .filter(col => col.selector && col.name !== "Actions" && col.name !== "Status")
      .map(col => {
        const fnString = col.selector?.toString();
        const match = fnString?.match(/row\.(\w+)/);
        return match ? match[1] : null;
      })
      .filter(Boolean);

    return (
      <CustomReactDataTable
        initialSearch={headerSearch}
        data={studentAccountStatusSource}
        columns={dtStudentAccountStatusColumns}
        pagination={true}
        className="nk-tb-list"
        canShowFilter={true}
        selectableRows={false}
        expandableRows={false}
        actions={true}
        searchableFields={searchableFields}
        downloadFileName="Student_List"
        toolbarTitle={isCoordinatorView ? <h3 className="nk-block-title page-title">Student List</h3> : undefined}
        showEntriesInFooter={isCoordinatorView}
        loading={dataLoading}
        loadingMessage="Loading student data..."
      />
    );
  };

  const handleGenerateAllInvoices = async () => {
    if (isGeneratingInvoice) return;
    setIsGeneratingInvoice(true);

    // Filter out courses that already have invoices generated
    const pendingCourses = filteredEnrolledCourses.filter(course => 
      !course.invoiceNumber || course.invoiceNumber == null || course.invoiceNumber == undefined
    );

    if (filteredEnrolledCourses.length === 0) {
      toast.info('No classes found for this student and month.');
      setIsGeneratingInvoice(false);
      return;
    }

    // Check if any course has fees mismatch. The API sends the registration fee as agreedFeesPerHour;
    // 0 means no fee per hour is on record for the student, so there is nothing to compare.
    const mismatchedCourses = pendingCourses.filter(course => {
      const agreedFees = Number(course.agreedFeesPerHour ?? course.feesPerHour ?? 0);
      return agreedFees > 0 && agreedFees !== Number(course.parentPayment);
    });

    if (mismatchedCourses.length > 0) {
      const subjectNames = mismatchedCourses.map(course => 
        course.subject || course.subjectName
      ).join(', ');

      toast.error(`Fees per hour and parent payment do not match for: ${subjectNames}`);
      setIsGeneratingInvoice(false);
      return;
    }

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    try {
      // The API is student-level and includes all subjects. Calling once per subject
      // could create an upfront invoice and immediately trigger reconciliation again.
      for (const course of filteredEnrolledCourses.slice(0, 1)) {
        const inputData = {
          studentId: course.studentId || course.userId,
          // The popup keeps the month as a name ("August"); the invoice API needs its number (8).
          month: isNaN(Number(selectedMonth)) ? new Date(`${selectedMonth} 1, 2000`).getMonth() + 1 : Number(selectedMonth),
          year: Number(selectedYear),
          createdBy: localStorage.getItem("userId")
        };

        try {
          const response = await createStudetnInvoice(inputData);
          if (response?.success === false || response?.succeeded === false)
            throw new Error(response.message || "Invoice generation failed.");
          successCount++;
        } catch (error) {
          console.error(`Error generating invoice for ${course.subject || course.subjectName}:`, error);
          errors.push(`${course.subject || course.subjectName}: ${error.message || 'Unknown error'}`);
          errorCount++;
        }
      }

      // Show results
      if (successCount > 0 && errorCount === 0) {
        toast.success(`All ${successCount} invoices generated successfully.`);
      } else if (successCount > 0 && errorCount > 0) {
        toast.warning(`${successCount} invoices generated successfully, ${errorCount} failed.`);
      } else if (errorCount > 0) {
        toast.error(errors.join("; "));
      }

      // Refresh the data
      await fetchStudentScheduleSummary(selectedStudentId, selectedMonth, selectedYear);

    } catch (error) {
      console.error("Unexpected error in handleGenerateAllInvoices:", error);
      toast.error("An unexpected error occurred while processing your request.");
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  // Collapsible Table Render Function
  const renderCollapsibleTable = () => (
    <Table className="table table-striped" style={{ minWidth: '100%', fontSize: '0.875rem' }}>
      <thead className="thead-dark">
        <tr>
          <th style={{ width: '30px' }}></th>
          <th style={{ minWidth: '80px' }}>Subject</th>
          <th style={{ minWidth: '120px' }}>Tutor</th>
          <th style={{ minWidth: '80px' }}>Type</th>
          <th style={{ minWidth: '120px' }}>Schedule Date</th>
          <th style={{ minWidth: '100px' }}>Planned Hours</th>
          <th style={{ minWidth: '80px' }}>Difference</th>
          <th style={{ minWidth: '80px' }}>Amount</th>
          <th style={{ minWidth: '100px' }}>Status</th>
        </tr>
      </thead>
      <tbody style={{ color: '#000000' }}>
        {
        filteredEnrolledCourses.length > 0 ? (
          filteredEnrolledCourses.map((details, index) => {
            const difference = getDurationDifferenceInHours(
              details.operationStartTime,
              details.operationEndTime,
              details.startTime,
              details.endTime
            );
            const isHighlighted = difference > 0;
            const isExpanded = expandedRows.has(index);

            return (
              <React.Fragment key={index}>
                <tr 
                  style={{ 
                    cursor: 'pointer',
                    backgroundColor: isHighlighted ? '#dbc4f3ff' : 'transparent',
                    borderLeft: isHighlighted ? '4px solid #854fff' : 'none'
                  }}
                  onClick={() => toggleRow(index)}
                >
                  <td>
                    <Icon name={isExpanded ? "chevron-down" : "chevron-right"} />
                  </td>
                  <td>
                    <div className="d-flex align-items-center">
                      {details.subject || details.subjectName || '-'}
                      {isHighlighted && (
                        <Icon name="alert-triangle" className="text-warning ms-2" style={{ fontSize: '0.8rem' }} />
                      )}
                    </div>
                  </td>
                  <td>{details.tutorName || '-'}</td>
                  <td>
                    <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>
                      {details.scheduleType || details.type || 'Class'}
                    </span>
                  </td>
                  <td>{formatShortDate(details.scheduleDate) || '-'}
                    <br></br>{details.scheduleId}
                  </td>
                  <td>{formatTimeRangeWithHours(details.startTime, details.endTime)}</td>
                  <td>
                    <span className={`fw-bold ${difference > 0 ? 'text-danger' : 'text-muted'}`}>
                      {difference > 0 ? `+${difference} h` : `${difference} h`}
                    </span>
                  </td>
                  <td>₹{Number(details.parentPayment || details.amount || 0).toLocaleString('en-IN')}</td>
                  <td>
                    {(details.invoiceNumber == null || details.invoiceNumber == undefined) ? (
                      <span className="badge text-danger">Pending</span>
                    ) : (
                      <span className="badge text-success">Generated</span>
                    )}
                  </td>
                </tr>
                
                {isExpanded && (
                  <tr>
                    <td colSpan="9" style={{ backgroundColor: '#f8f9fa', borderTop: 'none' }}>
                      <div className="p-3">
                        <h6 className="mb-3">
                          <Icon name="user" className="me-2" />
                          Detailed Attendance Information
                        </h6>
                        <div className="row">
                          <div className="col-md-4">
                            <div className="p-3" style={{ backgroundColor: '#e3f2fd', borderLeft: '4px solid #2196f3', borderRadius: '4px' }}>
                              <div className="mb-2">
                                <span className="badge bg-primary text-white" style={{ fontSize: '0.7rem' }}>
                                  STUDENT
                                </span>
                              </div>
                              <div style={{ fontSize: '0.85rem' }}>
                                <div><strong>Date:</strong> {formatShortDate(details.scheduleDate)}</div>
                                <div><strong>Time:</strong> {formatTimeRangeWithHours(details.studentStartTime, details.studentEndTime)}</div>
                                <div><strong>Attendance:</strong> {details.studentStartTime == null ? "Not submitted" : "Submitted"}</div>
                              </div>
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="p-3" style={{ backgroundColor: '#e8f5e8', borderLeft: '4px solid #4caf50', borderRadius: '4px' }}>
                              <div className="mb-2">
                                <span className="badge bg-success text-white" style={{ fontSize: '0.7rem' }}>
                                  TUTOR
                                </span>
                              </div>
                              <div style={{ fontSize: '0.85rem' }}>
                                <div><strong>Date:</strong> {formatShortDate(details.scheduleDate)}</div>
                                <div><strong>Time:</strong> {formatTimeRangeWithHours(details.tutorStartTime, details.tutorEndTime)}</div>
                                <div><strong>Attendance:</strong> {details.tutorStartTime == null ? "Not submitted" : "Submitted"}</div>
                              </div>
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="p-3" style={{ 
                              backgroundColor: isHighlighted ? '#fff3cd' : '#e0f7fa', 
                              borderLeft: isHighlighted ? '4px solid #ff9800' : '4px solid #00bcd4', 
                              borderRadius: '4px' 
                            }}>
                              <div className="mb-2 d-flex align-items-center">
                                <span className={`badge text-white me-2 ${isHighlighted ? 'bg-warning' : 'bg-info'}`} style={{ fontSize: '0.7rem' }}>
                                  OPERATIONS
                                </span>
                                {isHighlighted && (
                                  <span className="badge bg-danger text-white" style={{ fontSize: '0.65rem' }}>
                                    ⚠️ Extra Time
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.85rem' }}>
                                <div><strong>Date:</strong> {formatShortDate(details.scheduleDate)}</div>
                                <div><strong>Time:</strong> {formatTimeRangeWithHours(details.operationStartTime, details.operationEndTime)}</div>
                                <div><strong>Attendance:</strong> {details.operationStartTime == null ? "Not submitted" : "Submitted"}</div>

                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })
        ) : (
          <tr>
            <td colSpan="9" className="text-center">
              {scheduleLoading ? "Loading..." : "No records found"}
            </td>
          </tr>
        )}
      </tbody>
    </Table>
  );

  return (
    <>
      <Head title="Student List" />
      <Content>
        {isCoordinatorView && <style>{coordinatorStudentListStyle}</style>}
        <div className={isCoordinatorView ? "tct-csl" : undefined}>
        {!isCoordinatorView && (
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle tag="h5">Student List</BlockTitle>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>
        )}

        <Block>
          <RenderGrid />
        </Block>
        </div>

        <Modal isOpen={openViewDetailsModal} toggle={closeViewDetailsModal} size="xl" style={{ maxWidth: '95vw' }}>
          <ModalHeader toggle={closeViewDetailsModal}>
            <span className="ml-2" style={{ color: "#854fff" }}>Invoice for </span>
            <span style={{ color: "#09c2de" }}> {selectedStudentName}</span>
            <span style={{ color: "#854fff" }}> for the period {selectedMonth} {selectedYear}</span>
          </ModalHeader>
          <ModalBody style={{ position: 'relative' }}>
            {/* Component-level loader overlay */}
            {(isGeneratingInvoice || scheduleLoading) && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000,
                  flexDirection: 'column'
                }}
              >
                <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} role="status">
                  <span className="sr-only">Loading...</span>
                </div>
                <div className="mt-3 text-primary fw-bold">
                  {scheduleLoading ? "Loading student data..." : "Generating Invoice..."}
                </div>
              </div>
            )}

            {/* Description */}
            <Row className="mb-4">
              <Col size="12">
                <div className="mb-3 p-2" style={{ fontSize: '0.85rem', color: '#6c757d' }}>
                  Show Previous and current month class details
                </div>
              </Col>
            </Row>

            {/* Month and Year Navigation with Student-Level Actions */}
            <Row className="gy-3 mb-4">
              <Col size="sm" md="2">
                <FormGroup>
                  <div className="d-flex align-items-center">
                    <label className="form-label me-3 mb-0" style={{ minWidth: '50px' }}>Month:</label>
                    <div className="d-flex align-items-center">
                      <Button
                        color="light"
                        size="sm"
                        className="me-2"
                        disabled={isGeneratingInvoice || scheduleLoading}
                        onClick={async () => {
                          const currentIndex = months.findIndex(m => m.value === selectedMonth);
                          const newIndex = currentIndex > 0 ? currentIndex - 1 : months.length - 1;
                          await handleMonthChange(months[newIndex].value);
                        }}
                      >
                        <Icon name="chevron-left"></Icon>
                      </Button>

                      <div className="text-center" style={{ minWidth: '100px', fontWeight: '500' }}>
                        {months.find(m => m.value === selectedMonth)?.label || 'Select Month'}
                      </div>

                      <Button
                        color="light"
                        size="sm"
                        className="ms-2"
                        disabled={isGeneratingInvoice || scheduleLoading}
                        onClick={async () => {
                          const currentIndex = months.findIndex(m => m.value === selectedMonth);
                          const newIndex = currentIndex < months.length - 1 ? currentIndex + 1 : 0;
                          await handleMonthChange(months[newIndex].value);
                        }}
                      >
                        <Icon name="chevron-right"></Icon>
                      </Button>
                    </div>
                  </div>
                </FormGroup>
              </Col>

              <Col size="sm" md="2">
                <FormGroup>
                  <div className="d-flex align-items-center">
                    <label className="form-label me-3 mb-0" style={{ minWidth: '40px' }}>Year:</label>
                    <div className="d-flex align-items-center">
                      <Button
                        color="light"
                        size="sm"
                        className="me-2"
                        disabled={isGeneratingInvoice || scheduleLoading}
                        onClick={async () => {
                          const yearsList = years();
                          const currentIndex = yearsList.findIndex(y => y.value === selectedYear);
                          if (currentIndex > 0) {
                            await handleYearChange(yearsList[currentIndex - 1].value);
                          }
                        }}
                      >
                        <Icon name="chevron-left"></Icon>
                      </Button>

                      <div className="text-center" style={{ minWidth: '80px', fontWeight: '500' }}>
                        {selectedYear}
                      </div>

                      <Button
                        color="light"
                        size="sm"
                        className="ms-2"
                        disabled={isGeneratingInvoice || scheduleLoading}
                        onClick={async () => {
                          const yearsList = years();
                          const currentIndex = yearsList.findIndex(y => y.value === selectedYear);
                          if (currentIndex < yearsList.length - 1) {
                            await handleYearChange(yearsList[currentIndex + 1].value);
                          }
                        }}
                      >
                        <Icon name="chevron-right"></Icon>
                      </Button>
                    </div>
                  </div>
                </FormGroup>
              </Col>

              {/* Student-Level Action Buttons */}
              <Col size="sm" md="8">
                <div className="d-flex justify-content-end align-items-center" style={{ gap: '15px' }}>
                  {/* Generate Invoice for All Subjects */}
                  <Button
                    color="success"
                    size="sm"
                    disabled={isGeneratingInvoice || scheduleLoading || filteredEnrolledCourses.length === 0}
                    onClick={() => handleGenerateAllInvoices()}
                  >
                    <Icon name="file-text" className="me-2"></Icon>
                    Generate Invoice
                  </Button>

                  {/* View All Invoices - disabled until at least one invoice is generated */}
                  <Button
                    color="primary"
                    size="sm"
                    disabled={
                      isGeneratingInvoice || 
                      scheduleLoading || 
                      filteredEnrolledCourses.filter(course => course.invoiceNumber).length === 0
                    }
                    onClick={() => handleViewInvoice()}
                  >
                    <Icon name="eye" className="me-2"></Icon>
                    {hasInvoice ? " View Invoice" : " Invoice Not Generated"}
                  </Button>

                  {/* View Student Schedule */} 
                  <Link 
                    target="_blank" 
                    to={`${process.env.PUBLIC_URL}/tct-student-calendar?id=${filteredEnrolledCourses[0]?.userId || filteredEnrolledCourses[0]?.studentId}`}
                  >
                    <Button
                      color="info"
                      size="sm"
                      disabled={isGeneratingInvoice || scheduleLoading || filteredEnrolledCourses.length === 0}
                    >
                      <Icon name="calendar" className="me-2"></Icon>
                      View Schedule
                    </Button>
                  </Link>
                </div>
              </Col>
            </Row>

            {/* Advance invoices: first month of a newly scheduled subject; Accounts send them to the parent. */}
            {advanceInvoices.length > 0 && (
              <div className="border rounded p-3 mb-3" style={{ background: "#f5f6fa" }}>
                <h6 className="mb-2">Advance invoices (first month of new classes)</h6>
                {advanceInvoices.map((inv) => (
                  <div key={inv.invoiceNumber} className="d-flex justify-content-between align-items-center flex-wrap py-1" style={{ gap: 10 }}>
                    <span>
                      <strong>{inv.subject}</strong> – {moment([inv.year, inv.month - 1]).format("MMMM YYYY")} – {inv.numberOfClasses} class(es) –{" "}
                      <strong>₹{Number(inv.totalAmount).toLocaleString("en-IN")}</strong>{" "}
                      <span className="text-soft">({inv.invoiceNumber})</span>
                    </span>
                    {inv.emailSentDate ? (
                      <span className="badge bg-success">Sent {moment(inv.emailSentDate).format("DD-MMM-YYYY hh:mm A")}</span>
                    ) : (
                      <Button color="primary" size="sm" disabled={sendingAdvanceInvoice === inv.invoiceNumber} onClick={() => onSendAdvanceInvoice(inv)}>
                        {sendingAdvanceInvoice === inv.invoiceNumber ? "Sending..." : "Send to parent"}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Collapsible Table Content */}
            <div className="table-responsive" style={{ overflowX: 'auto', maxWidth: '100%', paddingTop: '10px' }}>
              {renderCollapsibleTable()}
            </div>
          </ModalBody>
        </Modal>
      </Content>
      <ToastContainer />
    </>
  );
};

export default AccountsStudentList;
