import React, { useEffect, useMemo, useState } from "react";
import {
  Block,
  BlockBetween,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Icon,
  CustomReactDataTable,
  Rating,
} from "../../../components/Component";
import {
  Button,
  Col,
  FormGroup,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Row,
  Table,
  Spinner,
} from "reactstrap";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import moment from "moment";
import exportFromJSON from "export-from-json";
import Content from "../../../layout/content/Content";
import Head from "../../../layout/head/Head";
import { toast } from "react-toastify";
import {
  getCompletedClassScheduleDetails,
  updateOperationScheduleStatus,
  bulkUpdateOperationScheduleStatus,
  updateScheduleStatus,
  getFutureClassCompletionTestEnabled,
  getScheduledStudentList,
  updateScheduleApprovalStatus,
} from "../../../apiservices/ScheduleService";
import { getLookups } from "../../../apiservices/LookupsService";
import { Link, useLocation } from "react-router-dom";
import { usePermissions } from "../../../hooks/usePermissions";
import { ClassStatusTypes } from "../../../utils/Utils";
import "./ApproveClassAttendanceList.css";

// Attendance List page only (/lms/completed-class-details): Rows per page options for the grouped table.
const ATTENDANCE_GROUP_PAGE_SIZES = [10, 20, 50, 100];
// Expanded class table on that page: flexible column sizes (min width + share of the free space) instead of
// fixed widths, so all columns fit the content width without a horizontal scrollbar on a normal desktop.
const ATTENDANCE_DETAIL_COLUMN_LAYOUT = {
  "Tutor": { minWidth: "120px", grow: 1.3, wrap: true },
  "Board / Grade": { minWidth: "110px", grow: 1, wrap: true },
  "Subject": { minWidth: "90px", grow: 0.9, wrap: true },
  "Date / Time": { minWidth: "112px", grow: 1 },
  "Attendance": { minWidth: "112px", grow: 1 },
  "Status": { minWidth: "100px", grow: 1, wrap: true },
  "Opr Status": { minWidth: "100px", grow: 1, wrap: true },
  "Accounts Status": { minWidth: "112px", grow: 1, wrap: true },
};

const CompletedClassScheduleReport = (props) => {
  const { can } = usePermissions();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const studentId = queryParams.get("studentId");
  const loggedInUserRole = localStorage.getItem("userRole");
  const isAccountsReadOnly = ["Accounts", "AccountsAdmin"].includes(loggedInUserRole);
  const canViewStudentSchedule = ["Accounts", "AccountsAdmin", "Operations", "OperationsAdmin"].includes(
    loggedInUserRole,
  );
  const canRateClass = ["Student", "Operations", "Coordinator"].includes(loggedInUserRole);
  const operationId = props?.operationId || null;
  const [fromDate, setFromDate] = useState(props?.fromDate || null);
  const [toDate, setToDate] = useState(props?.toDate || null);
  const [operationStatus, setOperationStatus] = useState(props?.operationStatus || null);
  const [studentOptions, setStudentOptions] = useState([]);
  // Operations: each Month + Student group has a View Attendance button (student's calendar).
  const canViewStudentAttendance = ["Operations", "OperationsAdmin"].includes(loggedInUserRole);
   const [tutorOptions, setTutorOptions] = useState([]);
  const canShowFilter = props?.canShowFilter != undefined ? props?.canShowFilter : true; // Set to true to show filters, false to hide
  const canShowHeader = props?.canShowHeader != undefined ? props?.canShowHeader : true; // Set to true to show header, false to hide

  // ─── Main table state ───────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [tableKey, setTableKey] = useState(0);
  const [allowFutureClassCompletionForTesting, setAllowFutureClassCompletionForTesting] = useState(false);
  const [accountsApprovalSubmittingId, setAccountsApprovalSubmittingId] = useState(null);
  const canUseFutureClassTesting = allowFutureClassCompletionForTesting &&
    ["Operations", "OperationAdmin", "OperationsAdmin"].includes(loggedInUserRole);

  useEffect(() => {
    getFutureClassCompletionTestEnabled()
      .then(setAllowFutureClassCompletionForTesting)
      .catch(() => setAllowFutureClassCompletionForTesting(false));
  }, []);

  // ─── View Details modal state ────────────────────────────────────────────────
  const [selectedRow, setSelectedRow] = useState(null);
  const [openViewDetailsModal, setOpenViewDetailsModal] = useState(false);
  const [attendanceStatusOptions, setAttendanceStatusOptions] = useState([]);
  const [selectedAttendanceStatus, setSelectedAttendanceStatus] = useState("");
  const [originalAttendanceStatus, setOriginalAttendanceStatus] = useState("");
  const [savingOperationStatus, setSavingOperationStatus] = useState(false);
  const [loadingOperationStatuses, setLoadingOperationStatuses] = useState(false);

  // ─── Bulk update state ───────────────────────────────────────────────────────
  const [selectedRows, setSelectedRows] = useState([]);
  const [openBulkModal, setOpenBulkModal] = useState(false);

  // ─── Update Attendance modal state ──────────────────────────────────────────
  const [openAttendanceModal, setOpenAttendanceModal] = useState(false);
  const [attendanceRow, setAttendanceRow] = useState(null);
  const [loadingAttendanceModal, setLoadingAttendanceModal] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [classStatusOptions, setClassStatusOptions] = useState([]);
  const [documentTypeOptions, setDocumentTypeOptions] = useState([]);
  const [attendanceDateError, setAttendanceDateError] = useState("");
  const [attendanceFormData, setAttendanceFormData] = useState({
    eventStatus: "",
    startTime: new Date(),
    endTime: new Date(),
    documentTypeId: "",
    noteText: "",
    rate: 0,
    file: null,
    selectedFileName: null,
  });

  // ─── Filters ─────────────────────────────────────────────────────────────────
  const [filters, setFilters] = useState({
    studentName: "",
    tutorName: "",
    board: "",
    grade: "",
    subject: "",
    month: "",
    year: "",
    status: "",
    studentId: "",
  });

  useEffect(async () => {
    await getScheduledStudents();
  }, [fromDate, toDate, operationStatus]);
  // ─── Data fetching ────────────────────────────────────────────────────────────
  const getScheduledStudents = async () => {
    try {
      const response = await getScheduledStudentList({ studentId, operationId, fromDate, toDate, operationStatus });
      if (response?.succeeded) {
        setStudentOptions(response.data || []);
      }
    } catch (error) {
      console.error("Error loading scheduled students:", error);
      toast.error("Error loading scheduled students");
    }
  };

  const fetchCompletedClassScheduleDetails = async () => {
    setLoading(true);
    try {
      const response = await getCompletedClassScheduleDetails(
        filters.studentId || null,
        null,
        operationId || null,
        fromDate || null,
        toDate || null,
        operationStatus || null,
      );
      const rows = Array.isArray(response) ? response : Array.isArray(response?.data) ? response.data : [];
      setSource(rows);
      setFilteredData(rows);
    } catch (error) {
      console.error("Error loading report:", error);
      toast.error(`Error loading report: ${error.message || "Something went wrong"}`);
      setSource([]);
      setFilteredData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceStatusLookups = async (row = null) => {
    setLoadingOperationStatuses(true);
    try {
      const response = await getLookups("1013");
      const rows = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.data?.data)
            ? response.data.data
            : [];

      setAttendanceStatusOptions(rows);

      if (row) {
        const currentValue = row?.operationScheduleStatusId || row?.operationScheduleStatus || "";
        const matched =
          rows.find((x) => String(x?.id || "").toLowerCase() === String(currentValue || "").toLowerCase()) ||
          rows.find(
            (x) =>
              String(x?.typeCodeName || "").toLowerCase() ===
              String(row?.operationScheduleStatusName || "").toLowerCase(),
          ) ||
          rows.find(
            (x) =>
              String(x?.typeCodeDescription || "").toLowerCase() ===
              String(row?.operationScheduleStatusName || "").toLowerCase(),
          );

        const selectedId = matched?.id || "";
        setSelectedAttendanceStatus(selectedId);
        setOriginalAttendanceStatus(selectedId);
      } else {
        setSelectedAttendanceStatus("");
        setOriginalAttendanceStatus("");
      }
    } catch (error) {
      console.error("Error loading operation status lookups:", error);
      toast.error("Unable to load operation status values.");
      setAttendanceStatusOptions([]);
      setSelectedAttendanceStatus("");
      setOriginalAttendanceStatus("");
    } finally {
      setLoadingOperationStatuses(false);
    }
  };

  useEffect(() => {
    fetchCompletedClassScheduleDetails();
  }, [studentId, filters.studentId]);

  // ─── Filter derived options ───────────────────────────────────────────────────
  const boardOptions = useMemo(() => uniqueValues(source, "board"), [source]);
  const gradeOptions = useMemo(() => uniqueValues(source, "grade"), [source]);
  const subjectOptions = useMemo(() => uniqueValues(source, "subject"), [source]);
  const statusOptions = useMemo(() => uniqueValues(source, "scheduleStatus"), [source]);

  useEffect(() => {
    const result = source.filter((item) => {
      const itemDate = item?.date ? new Date(item.date) : null;
      const itemMonth = itemDate ? String(itemDate.getMonth() + 1).padStart(2, "0") : "";
      const itemYear = itemDate ? String(itemDate.getFullYear()) : "";

      return (
        contains(item?.studentName, filters.studentName) &&
        contains(item?.tutorName, filters.tutorName) &&
        equalsOrEmpty(item?.board, filters.board) &&
        equalsOrEmpty(item?.grade, filters.grade) &&
        equalsOrEmpty(item?.subject, filters.subject) &&
        equalsOrEmpty(item?.scheduleStatus, filters.status) &&
        equalsOrEmpty(itemMonth, filters.month) &&
        equalsOrEmpty(itemYear, filters.year)
      );
    });
    setFilteredData(result);
  }, [filters, source]);

  // ─── Bulk select helpers ──────────────────────────────────────────────────────
  const eligibleRows = useMemo(
    () => filteredData.filter((r) => r.scheduleStatus === "Class Completed"),
    [filteredData],
  );

  const isAllSelected = eligibleRows.length > 0 && selectedRows.length === eligibleRows.length;
  const isIndeterminate = selectedRows.length > 0 && selectedRows.length < eligibleRows.length;

  const handleHeaderCheckbox = (e) => {
    if (e.target.checked) {
      setSelectedRows(eligibleRows);
    } else {
      setSelectedRows([]);
    }
  };

  const handleRowCheckbox = (e, row) => {
    if (e.target.checked) {
      setSelectedRows((prev) => [...prev, row]);
    } else {
      setSelectedRows((prev) => prev.filter((r) => r.scheduleDetailsId !== row.scheduleDetailsId));
    }
  };

  const handleAccountsApproval = async (row, actionCode) => {
    if (!row?.scheduleId || !row?.studentId) {
      toast.error("Schedule information is unavailable for final approval.");
      return;
    }
    try {
      setAccountsApprovalSubmittingId(row.scheduleDetailsId);
      const response = await updateScheduleApprovalStatus(
        actionCode,
        row.studentId,
        [row.scheduleId],
        localStorage.getItem("userId"),
      );
      if (response?.succeeded === false || response?.data?.succeeded === false) {
        throw new Error(response?.message || response?.data?.message || "Unable to update final approval.");
      }
      const statusByCode = { 1014001: "Approved", 1014002: "On-Hold", 1014004: "Rejected" };
      const statusName = statusByCode[actionCode];
      const updateRows = (items) => items.map((item) =>
        item.scheduleId === row.scheduleId
          ? { ...item, accountsApprovalStatusCode: Number(actionCode), accountsApprovalStatusName: statusName }
          : item
      );
      setSource(updateRows);
      setFilteredData(updateRows);
      toast.success(`Accounts final approval updated to ${statusName}.`);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Unable to update final approval.");
    } finally {
      setAccountsApprovalSubmittingId(null);
    }
  };

  // ─── View Details modal handlers ──────────────────────────────────────────────
  const onViewDetails = async (row) => {
    setSelectedRow(row);
    setOpenViewDetailsModal(true);
    if (!isAccountsReadOnly) {
      await fetchAttendanceStatusLookups(row);
    } else {
      const currentStatus = row.operationScheduleStatus || row.operationScheduleStatusId || "";
      setSelectedAttendanceStatus(currentStatus);
      setOriginalAttendanceStatus(currentStatus);
    }
  };

  const closeViewDetailsModal = () => {
    if (savingOperationStatus) return;
    setSelectedRow(null);
    setAttendanceStatusOptions([]);
    setSelectedAttendanceStatus("");
    setOriginalAttendanceStatus("");
    setOpenViewDetailsModal(false);
  };

  const handleOperationStatusChange = (e) => {
    setSelectedAttendanceStatus(e.target.value);
  };

  const handleSaveOperationStatus = async () => {
    if (!selectedRow?.scheduleDetailsId) {
      toast.error("ScheduleDetailsId is missing.");
      return;
    }
    if (!selectedAttendanceStatus) {
      toast.error("Please select operation status.");
      return;
    }
    if (selectedAttendanceStatus === originalAttendanceStatus) {
      toast.info("No changes to save.");
      return;
    }

    try {
      setSavingOperationStatus(true);
      const payload = {
        scheduleDetailsId: selectedRow.scheduleDetailsId,
        operationScheduleStatus: selectedAttendanceStatus,
      };
      const response = await updateOperationScheduleStatus(payload);

      const isSuccess =
        response?.succeeded === true ||
        response?.success === true ||
        response?.status === true ||
        response?.data === true;

      if (!isSuccess && response?.succeeded !== undefined) {
        throw new Error(response?.message || "Failed to update operation status.");
      }

      const selectedOption = attendanceStatusOptions.find(
        (x) => String(x.id).toLowerCase() === String(selectedAttendanceStatus).toLowerCase(),
      );
      const updatedName = selectedOption?.typeCodeDescription || selectedOption?.typeCodeName || "-";

      setOriginalAttendanceStatus(selectedAttendanceStatus);
      setSelectedRow((prev) => ({
        ...prev,
        operationScheduleStatus: selectedAttendanceStatus,
        operationScheduleStatusId: selectedAttendanceStatus,
        operationScheduleStatusName: updatedName,
      }));

      const updateRows = (prev) =>
        prev.map((item) =>
          item.scheduleDetailsId === selectedRow.scheduleDetailsId
            ? {
                ...item,
                operationScheduleStatus: selectedAttendanceStatus,
                operationScheduleStatusId: selectedAttendanceStatus,
                operationScheduleStatusName: updatedName,
              }
            : item,
        );

      setSource(updateRows);
      setFilteredData(updateRows);
      toast.success(response?.message || "Operation status updated successfully.");
      setSelectedRow(null);
      setAttendanceStatusOptions([]);
      setSelectedAttendanceStatus("");
      setOriginalAttendanceStatus("");
      setOpenViewDetailsModal(false);
    } catch (error) {
      console.error("Error updating operation status:", error);
      toast.error(error?.response?.data?.message || error?.message || "Unable to update operation status.");
    } finally {
      setSavingOperationStatus(false);
    }
  };

  // ─── Bulk save handler ────────────────────────────────────────────────────────
  const handleBulkSaveOperationStatus = async () => {
    if (!selectedAttendanceStatus) {
      toast.error("Please select operation status.");
      return;
    }

    try {
      setSavingOperationStatus(true);

      const payload = {
        scheduleDetailsIds: selectedRows.map((r) => r.scheduleDetailsId),
        operationScheduleStatus: selectedAttendanceStatus,
      };

      await bulkUpdateOperationScheduleStatus(payload);

      const selectedOption = attendanceStatusOptions.find(
        (x) => String(x.id).toLowerCase() === String(selectedAttendanceStatus).toLowerCase(),
      );
      const updatedName = selectedOption?.typeCodeDescription || selectedOption?.typeCodeName || "-";
      const updatedIds = new Set(selectedRows.map((r) => r.scheduleDetailsId));
      const count = selectedRows.length;

      const updateRows = (prev) =>
        prev.map((item) =>
          updatedIds.has(item.scheduleDetailsId)
            ? {
                ...item,
                operationScheduleStatus: selectedAttendanceStatus,
                operationScheduleStatusId: selectedAttendanceStatus,
                operationScheduleStatusName: updatedName,
              }
            : item,
        );

      setSource(updateRows);
      setFilteredData(updateRows);
      setSelectedRows([]);
      setTableKey((prev) => prev + 1);
      setOpenBulkModal(false);
      setSelectedAttendanceStatus("");
      toast.success(`Operation status updated for ${count} record(s).`);
    } catch (error) {
      console.error("Error bulk updating:", error);
      toast.error(error?.response?.data?.message || error?.message || "Bulk update failed.");
    } finally {
      setSavingOperationStatus(false);
    }
  };

  // ─── Update Attendance modal handlers ────────────────────────────────────────
  const onUpdateAttendance = async (row) => {
    if (isScheduledClassInFuture(row) && !canUseFutureClassTesting) {
      toast.info("Attendance can be updated only after the scheduled class has ended.");
      return;
    }

    setAttendanceRow(row);
    setAttendanceDateError("");
    setAttendanceFormData({
      eventStatus: "",
      startTime: row?.startTime ? new Date(row.startTime) : new Date(),
      endTime: row?.endTime ? new Date(row.endTime) : new Date(),
      documentTypeId: "",
      noteText: "",
      rate: 0,
      file: null,
      selectedFileName: null,
    });
    setOpenAttendanceModal(true);
    setLoadingAttendanceModal(true);

    try {
      // Load class status lookups (1009)
      const statusResponse = await getLookups("1009");
      const rawStatuses = Array.isArray(statusResponse)
        ? statusResponse
        : Array.isArray(statusResponse?.data)
          ? statusResponse.data
          : [];
      const statusList = [{ value: "", label: "--Select--" }];
      rawStatuses.forEach((s) => {
        statusList.push({
          value: s?.id,
          label: s?.typeCodeName,
          id: s?.id,
          code: s?.typeCodeValue,
        });
      });
      setClassStatusOptions(statusList);

      // Load document type lookups (1006)
      const docResponse = await getLookups("1006");
      const rawDocs = Array.isArray(docResponse)
        ? docResponse
        : Array.isArray(docResponse?.data)
          ? docResponse.data
          : [];
      const docList = [{ value: "", label: "--Select document type--" }];
      rawDocs.forEach((s) => {
        docList.push({ value: s?.id, label: s?.typeCodeName });
      });
      setDocumentTypeOptions(docList);
    } catch (err) {
      console.error("Failed to load attendance modal data:", err);
      toast.error("Failed to load modal data.");
    } finally {
      setLoadingAttendanceModal(false);
    }
  };

  const closeAttendanceModal = () => {
    if (savingAttendance) return;
    setOpenAttendanceModal(false);
    setAttendanceRow(null);
    setAttendanceDateError("");
    setClassStatusOptions([]);
    setDocumentTypeOptions([]);
  };

  const validateAttendanceTimes = (start, end) => {
    if (start && end && start >= end) {
      setAttendanceDateError("Start Time should be earlier than End Time.");
    } else {
      setAttendanceDateError("");
    }
  };

  const handleSaveAttendance = async () => {
    if (!attendanceFormData.eventStatus) {
      toast.error("Please select a class status.");
      return;
    }
    if (attendanceDateError) {
      toast.error(attendanceDateError);
      return;
    }

    try {
      setSavingAttendance(true);
      const defaultGuid = "00000000-0000-0000-0000-000000000000";
      const _formData = new FormData();
      _formData.append("GuestType", "operation");
      _formData.append("ScheduleDetailsId", attendanceRow.scheduleDetailsId);
      _formData.append("StartTime", moment(attendanceFormData.startTime).format("YYYY-MM-DDTHH:mm:ss"));
      _formData.append("EndTime", moment(attendanceFormData.endTime).format("YYYY-MM-DDTHH:mm:ss"));
      _formData.append("NoteText", attendanceFormData.noteText || "");
      _formData.append("EventStatus", attendanceFormData.eventStatus);
      _formData.append("UserId", localStorage.getItem("userId") || "");
      _formData.append("DocumentTypeId", attendanceFormData.documentTypeId || defaultGuid);
      if (attendanceFormData.file) {
        Array.from(attendanceFormData.file).forEach((f) => _formData.append("Files", f));
      }

      await updateScheduleStatus(_formData);
      toast.success("Attendance updated successfully.");
      closeAttendanceModal();
      fetchCompletedClassScheduleDetails();
    } catch (error) {
      console.error("Error saving attendance:", error);
      toast.error(error?.response?.data?.message || error?.message || "Failed to update attendance.");
    } finally {
      setSavingAttendance(false);
    }
  };

  // ─── Filter reset ─────────────────────────────────────────────────────────────
  const resetFilters = () => {
    setFilters({
      studentId: "",
      studentName: "",
      tutorName: "",
      board: "",
      grade: "",
      subject: "",
      month: "",
      year: "",
      status: "",
    });
  };

  // ─── Table columns ────────────────────────────────────────────────────────────
  const columns = [
    {
      name: (
        <input
          type="checkbox"
          checked={isAllSelected}
          ref={(el) => {
            if (el) el.indeterminate = isIndeterminate;
          }}
          onChange={handleHeaderCheckbox}
          style={{ cursor: "pointer", width: "16px", height: "16px" }}
        />
      ),
      cell: (row) => {
        const isEligible = row.scheduleStatus === "Class Completed";
        const isChecked = selectedRows.some((r) => r.scheduleDetailsId === row.scheduleDetailsId);
        return (
          <input
            type="checkbox"
            checked={isChecked}
            disabled={!isEligible}
            onChange={(e) => handleRowCheckbox(e, row)}
            style={{
              cursor: isEligible ? "pointer" : "not-allowed",
              opacity: isEligible ? 1 : 0.25,
              width: "16px",
              height: "16px",
            }}
          />
        );
      },
      width: "50px",
      ignoreRowClick: true,
      allowOverflow: false,
      button: false,
    },
    {
      // Same Month column as the Tutor Attendance List, from the class date.
      name: "Month",
      selector: (row) => (row.date ? moment(row.date).format("YYYY-MM") : ""),
      sortable: true,
      cell: (row) => <strong>{row.date ? moment(row.date).format("MMMM YYYY") : "-"}</strong>,
      width: "140px",
    },
    {
      name: "Student",
      selector: (row) => row.studentName,
      sortable: true,
      width: "160px",
    },
    {
      name: "Tutor",
      selector: (row) => row.tutorName,
      sortable: true,
      width: "160px",
    },
    {
      name: "Board / Grade",
      selector: (row) => `${row.board || "-"} / ${row.grade || "-"}`,
      sortable: true,
      width: "150px",
    },
    {
      name: "Subject",
      selector: (row) => row.subject,
      sortable: true,
      width: "130px",
    },
    {
      name: "Date / Time",
      selector: (row) => row.date,
      sortable: true,
      cell: (row) => (
        <div>
          <div>{formatDate(row.date)}</div>
          <div style={{ fontSize: "0.8rem", color: "#6c757d" }}>{formatTimeRange(row.startTime, row.endTime)}</div>
        </div>
      ),
      width: "150px",
    },
    {
      name: "Attendance",
      selector: (row) => row.isTutorPresent,
      sortable: false,
      cell: (row) => {
        // Ops-confirmed presence OR the tutor/student's own "Class Completed" submission both count.
        // Checks the status name (already returned by the API today) as well as the numeric
        // status code (added server-side, in case that build isn't deployed yet).
        const isClassCompleted = (statusName, statusCode) =>
          statusCode === ClassStatusTypes.ClassCompleted ||
          String(statusName || "").trim().toLowerCase() === "class completed";

        const tutorDone = row.isTutorPresent || isClassCompleted(row.tutorScheduleStatusName, row.tutorScheduleStatusCode);
        const studentDone = row.isStudentPresent || isClassCompleted(row.studentScheduleStatusName, row.studentScheduleStatusCode);
        return (
          <div>
            <div className={tutorDone ? "text-success" : "text-danger"}>
              Tutor: {tutorDone ? "Present" : "Pending"}
            </div>
            <div className={studentDone ? "text-success" : "text-danger"}>
              Student: {studentDone ? "Present" : "Pending"}
            </div>
          </div>
        );
      },
      width: "140px",
    },
    {
      name: "Status",
      selector: (row) => row.scheduleStatus,
      sortable: true,
      cell: (row) => <span className="tb-status text-success">{row.scheduleStatus || "-"}</span>,
      width: "140px",
    },
    {
      name: "Opr Status",
      selector: (row) => row.operationScheduleStatusName,
      sortable: true,
      cell: (row) => <span className="tb-status text-success">{row.operationScheduleStatusName || "-"}</span>,
      width: "130px",
    },
    {
      name: "Accounts Status",
      selector: (row) => row.accountsApprovalStatusName,
      sortable: true,
      cell: (row) => <span className="tb-status text-success">{row.accountsApprovalStatusName || "Pending"}</span>,
      width: "145px",
    },
    {
      name: "Actions",
      cell: (row) => {
        const isCompleted = row.scheduleStatus === "Class Completed";
        const hasSelection = selectedRows.length > 0;
        const isFutureClass = isScheduledClassInFuture(row);
        const disableViewDetails = (!isCompleted && !(isFutureClass && canUseFutureClassTesting)) || hasSelection;
        const disableUpdateAttendance = isCompleted || hasSelection || (isFutureClass && !canUseFutureClassTesting);
        return (
          <div className="d-flex align-items-center" style={{ gap: "6px", flexWrap: "nowrap" }}>
            {/* View Details */}
            {can("Attendance List", "view") && (
              <Button
                color="primary"
                size="sm"
                onClick={() => onViewDetails(row)}
                disabled={disableViewDetails}
                style={{ whiteSpace: "nowrap" }}
              >
                <Icon name="eye" className="me-1" />
                View Details
              </Button>
            )}

            {canViewStudentSchedule && row.studentUserId && (
              <Button
                tag={Link}
                to={`${process.env.PUBLIC_URL}/tct-student-calendar?id=${row.studentUserId}&stuName=${encodeURIComponent(row.studentName || "")}&grade=${encodeURIComponent(row.grade || "")}&board=${encodeURIComponent(row.board || "")}&month=${moment(row.date).month() + 1}&year=${moment(row.date).year()}`}
                color="secondary"
                size="sm"
                style={{ whiteSpace: "nowrap", color: "#fff" }}
              >
                <Icon name="calender-date" className="me-1" />
                View Schedule
              </Button>
            )}

            {isAccountsReadOnly && isCompleted && row.operationScheduleStatusId && (
              <>
                <Button color="success" size="sm" disabled={accountsApprovalSubmittingId === row.scheduleDetailsId} onClick={() => handleAccountsApproval(row, 1014001)}>Approve</Button>
                <Button color="warning" size="sm" disabled={accountsApprovalSubmittingId === row.scheduleDetailsId} onClick={() => handleAccountsApproval(row, 1014002)}>Hold</Button>
                <Button color="danger" size="sm" disabled={accountsApprovalSubmittingId === row.scheduleDetailsId} onClick={() => handleAccountsApproval(row, 1014004)}>Reject</Button>
              </>
            )}

            {/* Update Attendance */}
            {can("Attendance List", "edit") && !isAccountsReadOnly && (
              <Button
                color="info"
                size="sm"
                onClick={() => onUpdateAttendance(row)}
                disabled={disableUpdateAttendance}
                title={isFutureClass && !canUseFutureClassTesting ? "Attendance can be updated after the scheduled class has ended" : undefined}
                style={{ whiteSpace: "nowrap", color: "#fff" }}
              >
                <Icon name="edit" className="me-1" />
                Update Attendance
              </Button>
            )}
          </div>
        );
      },
      width: isAccountsReadOnly ? "650px" : canViewStudentSchedule ? "460px" : "300px",
      ignoreRowClick: true,
      allowOverflow: true,
      button: true,
    },
  ];

  const searchableFields = [
    "studentName",
    "tutorName",
    "board",
    "grade",
    "subject",
    "scheduleStatus",
    "ownershipName",
    "coordinatorName",
  ];

  // ─── Grouped view (Month + Student), same layout as the Tutor Attendance List ──
  const [groupPageSize, setGroupPageSize] = useState(10);
  // Redesign (CSS, footer layout, fluid detail columns) only on the standalone Attendance List page;
  // the same component embedded elsewhere (e.g. Operations calendar) keeps its current layout.
  const isAttendanceListPage =
    window.location.pathname.replace(/\/$/, "") === `${process.env.PUBLIC_URL}/lms/completed-class-details`;
  const [groupSearchText, setGroupSearchText] = useState("");
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [groupPage, setGroupPage] = useState(1);

  const searchedData = useMemo(() => {
    const text = groupSearchText.trim().toLowerCase();
    if (!text) return filteredData;
    return filteredData.filter((row) =>
      searchableFields.some((field) => String(row[field] ?? "").toLowerCase().includes(text)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredData, groupSearchText]);

  const groupedData = useMemo(() => {
    const groups = {};
    searchedData.forEach((row) => {
      const month = row.date ? moment(row.date).format("YYYY-MM") : "";
      const key = `${month}|${row.studentId || row.studentName}`;
      if (!groups[key]) {
        groups[key] = {
          key,
          month,
          monthLabel: row.date ? moment(row.date).format("MMMM YYYY") : "-",
          studentName: row.studentName,
          studentUserId: row.studentUserId,
          rows: [],
        };
      }
      groups[key].rows.push(row);
    });
    return Object.values(groups)
      .map((g) => ({
        ...g,
        rows: [...g.rows].sort((a, b) => new Date(a.date) - new Date(b.date)),
        subjects: [...new Set(g.rows.map((r) => r.subject).filter(Boolean))].join(", "),
        completedCount: g.rows.filter((r) => r.scheduleStatus === "Class Completed").length,
      }))
      .sort((a, b) => b.month.localeCompare(a.month) || String(a.studentName).localeCompare(String(b.studentName)));
  }, [searchedData]);

  useEffect(() => setGroupPage(1), [groupSearchText, filteredData]);

  const groupTotalPages = Math.ceil(groupedData.length / groupPageSize);
  const paginatedGroups = groupedData.slice((groupPage - 1) * groupPageSize, groupPage * groupPageSize);

  const toggleGroup = (key) =>
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  // Class rows inside a group: the existing columns without Month / Student (shown on the group row)
  // and without the select-all header checkbox (it is shown once above the table).
  const groupColumns = (isAccountsReadOnly ? columns.slice(1) : columns)
    .filter((col) => col.name !== "Month" && col.name !== "Student")
    .map((col, index) => (index === 0 && !isAccountsReadOnly ? { ...col, name: "" } : col));

  // Same columns (cells, selectors, sorting, handlers); only their sizing changes on the Attendance List page.
  const detailColumns = !isAttendanceListPage
    ? groupColumns
    : groupColumns.map((col, index) => {
        if (index === 0 && col.name === "") return { ...col, width: "44px" }; // row checkbox
        if (col.name === "Actions") {
          return {
            ...col,
            width: undefined,
            minWidth: isAccountsReadOnly ? "420px" : canViewStudentSchedule ? "400px" : "300px",
            grow: 0,
            right: true,
          };
        }
        const layout = ATTENDANCE_DETAIL_COLUMN_LAYOUT[col.name];
        return layout ? { ...col, width: undefined, ...layout } : col;
      });

  const exportGroupedRows = (exportType) =>
    exportFromJSON({
      data: searchedData,
      fileName: `Completed_Class_Schedule_Report_${moment().format("YYYYMMDD_HHmmss")}`,
      exportType,
    });

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      <Head title="Completed Class Schedule Report" />
      <Content>
        <div className={isAttendanceListPage ? "tct-cal" : undefined}>
        <>
          {canShowHeader && (
            <BlockHead size="sm">
              <BlockBetween>
                <BlockHeadContent>
                  <BlockTitle tag="h5">Completed Class Schedule Report</BlockTitle>
                </BlockHeadContent>
              </BlockBetween>
            </BlockHead>
          )}
        </>
        <Block>
          <>
            {/* ── Filters ── */}
            {canShowFilter && (
              <div className="card card-bordered mb-4 tct-cal-filters">
                <div className="card-inner">
                  <Row className="g-3 align-items-end">
                    <Col md="3">
                      <FormGroup>
                        <Label>Student Name</Label> 
                        <Input
                          type="select"
                          value={filters.studentId}
                          onChange={(e) => {
                            setFilters((prev) => ({
                              ...prev,
                              studentId: e.target.value,
                            }));
                          }}
                        >
                          <option value="">All Students</option>
                          {studentOptions.map((item) => (
                            <option key={item.studentId} value={item.studentId}>
                              {item.studentName}
                            </option>
                          ))}
                        </Input>
                      </FormGroup>
                    </Col>
                    <Col md="3">
                      <FormGroup>
                        <Label>Tutor Name</Label>
                        <Input
                          type="select"
                          value={filters.tutorId}
                          onChange={(e) => setFilters((prev) => ({ ...prev, tutorId: e.target.value }))}>
                          <option value="">All Tutors</option>
                          {tutorOptions.map((item) => (
                            <option key={item.tutorId} value={item.tutorId}>
                              {item.tutorName}
                              </option>))}
                          </Input>
                      </FormGroup>
                    </Col>
                    <Col md="2">
                      <FormGroup>
                        <Label>Board</Label>
                        <Input
                          type="select"
                          value={filters.board}
                          onChange={(e) => setFilters((prev) => ({ ...prev, board: e.target.value }))}
                        >
                          <option value="">All</option>
                          {boardOptions.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </Input>
                      </FormGroup>
                    </Col>
                    <Col md="2">
                      <FormGroup>
                        <Label>Grade</Label>
                        <Input
                          type="select"
                          value={filters.grade}
                          onChange={(e) => setFilters((prev) => ({ ...prev, grade: e.target.value }))}
                        >
                          <option value="">All</option>
                          {gradeOptions.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </Input>
                      </FormGroup>
                    </Col>
                    <Col md="2">
                      <FormGroup>
                        <Label>Subject</Label>
                        <Input
                          type="select"
                          value={filters.subject}
                          onChange={(e) => setFilters((prev) => ({ ...prev, subject: e.target.value }))}
                        >
                          <option value="">All</option>
                          {subjectOptions.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </Input>
                      </FormGroup>
                    </Col>
                    <Col md="2">
                      <FormGroup>
                        <Label>Month</Label>
                        <Input
                          type="select"
                          value={filters.month}
                          onChange={(e) => setFilters((prev) => ({ ...prev, month: e.target.value }))}
                        >
                          <option value="">All</option>
                          {monthOptions.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </Input>
                      </FormGroup>
                    </Col>
                    <Col md="2">
                      <FormGroup>
                        <Label>Year</Label>
                        <Input
                          type="number"
                          value={filters.year}
                          onChange={(e) => setFilters((prev) => ({ ...prev, year: e.target.value }))}
                          placeholder="YYYY"
                        />
                      </FormGroup>
                    </Col>
                    <Col md="3">
                      <FormGroup>
                        <Label>Status</Label>
                        <Input
                          type="select"
                          value={filters.status}
                          onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                        >
                          <option value="">All</option>
                          {statusOptions.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </Input>
                      </FormGroup>
                    </Col>
                    <Col md="2">
                      <Button color="light" className="w-100" onClick={resetFilters}>
                        <Icon name="reload" className="me-1" />
                        Reset
                      </Button>
                    </Col>
                  </Row>
                </div>
              </div>
            )}
            {/* ── Bulk action bar ── */}
            {!isAccountsReadOnly && selectedRows.length > 0 && (
              <div
                className="d-flex align-items-center mb-3 px-3 py-2"
                style={{
                  gap: "12px",
                  flexWrap: "wrap",
                  backgroundColor: "#f0eaff",
                  border: "1px solid #854fff",
                  borderRadius: "6px",
                }}
              >
                <span style={{ color: "#854fff", fontWeight: 500 }}>{selectedRows.length} record(s) selected</span>
                {can("Attendance List", "edit") && (
                  <Button
                    color="primary"
                    size="sm"
                    onClick={() => {
                      setSelectedAttendanceStatus("");
                      fetchAttendanceStatusLookups();
                      setOpenBulkModal(true);
                    }}
                  >
                    <Icon name="edit" className="me-1" />
                    Update Opr Status
                  </Button>
                )}
                <Button
                  color="light"
                  size="sm"
                  onClick={() => {
                    setSelectedRows([]);
                    setTableKey((prev) => prev + 1);
                  }}
                >
                  Clear Selection
                </Button>
              </div>
            )}
          </>

          {/* ── Grouped Table (Month + Student), same layout as the Tutor Attendance List ── */}
          <div>
            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap tct-cal-toolbar" style={{ gap: "8px" }}>
              <Input
                type="text"
                placeholder="Search by Student, Tutor, Board, Grade, Subject, Status, Ownership, Coordinator..."
                value={groupSearchText}
                onChange={(e) => setGroupSearchText(e.target.value)}
                style={{ maxWidth: "480px" }}
              />
              <div className="d-flex align-items-center" style={{ gap: "8px" }}>
                <span className="text-muted" style={{ fontSize: "0.85rem" }}>
                  {groupedData.length} group(s) · {searchedData.length} record(s)
                </span>
                <Button color="light" size="sm" title="Export data to Excel format" onClick={() => exportGroupedRows(exportFromJSON.types.xls)}>
                  <Icon name="file-xls" />
                </Button>
                <Button color="light" size="sm" title="Export data to CSV format" onClick={() => exportGroupedRows(exportFromJSON.types.csv)}>
                  <Icon name="file-text" />
                </Button>
              </div>
            </div>

            {!isAccountsReadOnly && eligibleRows.length > 0 && (
              <div className="d-flex align-items-center mb-2 tct-cal-selectall" style={{ gap: "8px" }}>
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isIndeterminate;
                  }}
                  onChange={handleHeaderCheckbox}
                  style={{ cursor: "pointer", width: "16px", height: "16px" }}
                />
                <span style={{ fontSize: "0.85rem", color: "#6c757d" }}>
                  Select all eligible rows ({eligibleRows.length})
                </span>
              </div>
            )}

            {loading ? (
              <div className="d-flex justify-content-center align-items-center py-5">
                <Spinner color="primary" />
                <span className="ms-3 text-muted">Loading completed class schedule report...</span>
              </div>
            ) : groupedData.length === 0 ? (
              <div className="text-center py-5 text-muted">No records found.</div>
            ) : (
              <>
                <div className="tct-cal-table-wrap" style={{ overflowX: "auto" }}>
                  {/* Fixed layout: the wide class table in an expanded group scrolls inside its own box
                      instead of stretching this table past the page. */}
                  <table
                    className="table table-bordered tct-cal-table"
                    style={{ fontSize: "0.875rem", minWidth: "820px", width: "100%", tableLayout: "fixed" }}
                  >
                    <thead>
                      <tr style={{ backgroundColor: "#f8f9fa" }}>
                        <th style={{ width: "42px" }}></th>
                        <th>Month</th>
                        <th>Student</th>
                        <th>Subjects</th>
                        <th style={{ textAlign: "center", width: "80px" }}>Classes</th>
                        <th style={{ textAlign: "center", width: "100px" }}>Completed</th>
                        <th style={{ textAlign: "right", width: "170px" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedGroups.map((group) => (
                        <React.Fragment key={group.key}>
                          <tr style={{ backgroundColor: "#f0eaff", cursor: "pointer" }} onClick={() => toggleGroup(group.key)}>
                            <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                              <Icon name={expandedGroups.has(group.key) ? "chevron-up" : "chevron-down"} />
                            </td>
                            <td style={{ fontWeight: 600, verticalAlign: "middle", whiteSpace: "nowrap" }}>{group.monthLabel}</td>
                            <td style={{ verticalAlign: "middle" }}>{group.studentName}</td>
                            <td style={{ verticalAlign: "middle" }}>{group.subjects || "-"}</td>
                            <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                              <span
                                className="badge"
                                style={{ backgroundColor: "#854fff", color: "#fff", fontSize: "0.85rem", minWidth: "28px", display: "inline-block" }}
                              >
                                {group.rows.length}
                              </span>
                            </td>
                            <td style={{ textAlign: "center", verticalAlign: "middle", color: "#1ee0ac", fontWeight: 600 }}>
                              {group.completedCount}
                            </td>
                            <td style={{ textAlign: "right", verticalAlign: "middle" }}>
                              {canViewStudentAttendance && group.studentUserId && group.month && (
                                <Link
                                  to={`${process.env.PUBLIC_URL}/tct-student-calendar?${new URLSearchParams({
                                    id: group.studentUserId,
                                    stuName: group.studentName || "Student",
                                    month: Number(group.month.slice(5, 7)),
                                    year: group.month.slice(0, 4),
                                  }).toString()}`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Button color="primary" size="sm" style={{ whiteSpace: "nowrap" }}>
                                    <Icon name="calendar-check" className="me-1" />
                                    View Attendance
                                  </Button>
                                </Link>
                              )}
                            </td>
                          </tr>

                          {expandedGroups.has(group.key) && (
                            <tr>
                              <td colSpan={7} style={{ padding: 0, backgroundColor: "#fafbfc" }}>
                                <div className="tct-cal-detail" style={{ overflow: "auto", width: "100%", maxHeight: "450px" }}>
                                  <CustomReactDataTable
                                    key={`${tableKey}-${group.key}`}
                                    data={group.rows}
                                    columns={detailColumns}
                                    pagination={group.rows.length > 10}
                                    className="nk-tb-list"
                                    canShowFilter={false}
                                    selectableRows={false}
                                    expandableRows={false}
                                    actions={false}
                                  />
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>

                {isAttendanceListPage ? (
                <div className="tct-cal-pager">
                  {groupTotalPages > 1 ? (
                    <div className="d-flex tct-cal-pager-nav" style={{ gap: "4px" }}>
                      <Button color="light" size="sm" disabled={groupPage === 1} onClick={() => setGroupPage((p) => p - 1)}>
                        Prev
                      </Button>
                      {Array.from({ length: Math.min(groupTotalPages, 5) }, (_, i) => {
                        const page = groupPage <= 3 ? i + 1 : groupPage - 2 + i;
                        if (page > groupTotalPages) return null;
                        return (
                          <Button key={page} color={page === groupPage ? "primary" : "light"} size="sm" onClick={() => setGroupPage(page)}>
                            {page}
                          </Button>
                        );
                      })}
                      <Button color="light" size="sm" disabled={groupPage === groupTotalPages} onClick={() => setGroupPage((p) => p + 1)}>
                        Next
                      </Button>
                    </div>
                  ) : (
                    <div className="tct-cal-pager-nav" aria-hidden="true"></div>
                  )}
                  <span className="text-muted tct-cal-pager-range" role="status" aria-live="polite">
                    Showing {Math.min((groupPage - 1) * groupPageSize + 1, groupedData.length)}–
                    {Math.min(groupPage * groupPageSize, groupedData.length)} of {groupedData.length} group(s)
                  </span>
                  <div className="tct-cal-pager-size">
                    <label htmlFor="tct-cal-rows-per-page">Rows per page</label>
                    <select
                      id="tct-cal-rows-per-page"
                      className="form-control"
                      value={groupPageSize}
                      onChange={(e) => {
                        setGroupPageSize(Number(e.target.value));
                        setGroupPage(1);
                      }}
                    >
                      {ATTENDANCE_GROUP_PAGE_SIZES.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                ) : (
                <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap" style={{ gap: "8px" }}>
                  <span className="text-muted" style={{ fontSize: "0.85rem" }}>
                    Showing {Math.min((groupPage - 1) * groupPageSize + 1, groupedData.length)}–
                    {Math.min(groupPage * groupPageSize, groupedData.length)} of {groupedData.length} group(s)
                  </span>
                  {groupTotalPages > 1 && (
                    <div className="d-flex" style={{ gap: "4px" }}>
                      <Button color="light" size="sm" disabled={groupPage === 1} onClick={() => setGroupPage((p) => p - 1)}>
                        Prev
                      </Button>
                      {Array.from({ length: Math.min(groupTotalPages, 5) }, (_, i) => {
                        const page = groupPage <= 3 ? i + 1 : groupPage - 2 + i;
                        if (page > groupTotalPages) return null;
                        return (
                          <Button key={page} color={page === groupPage ? "primary" : "light"} size="sm" onClick={() => setGroupPage(page)}>
                            {page}
                          </Button>
                        );
                      })}
                      <Button color="light" size="sm" disabled={groupPage === groupTotalPages} onClick={() => setGroupPage((p) => p + 1)}>
                        Next
                      </Button>
                    </div>
                  )}
                </div>
                )}
              </>
            )}
          </div>
        </Block>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            View Details Modal
        ══════════════════════════════════════════════════════════════════════ */}
        <Modal isOpen={openViewDetailsModal} toggle={closeViewDetailsModal} size="xl" style={{ maxWidth: "95vw" }}>
          <ModalHeader toggle={closeViewDetailsModal}>
            <span className="ml-2" style={{ color: "#854fff" }}>
              Completed Class Details
            </span>
            {selectedRow ? (
              <>
                <span style={{ color: "#09c2de" }}> - {selectedRow.studentName}</span>
                <span style={{ color: "#854fff" }}> / {selectedRow.subject}</span>
              </>
            ) : null}
          </ModalHeader>
          <ModalBody>
            {!selectedRow ? null : (
              <>
                <Row className="g-3 mb-4">
                  <Col md="6">
                    <div className="card card-bordered h-100">
                      <div className="card-inner">
                        <h6 className="mb-3">Student / Subject</h6>
                        <Table borderless size="sm">
                          <tbody>
                            <tr>
                              <td>
                                <strong>Student</strong>
                              </td>
                              <td>{selectedRow.studentName || "-"}</td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Board</strong>
                              </td>
                              <td>{selectedRow.board || "-"}</td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Grade</strong>
                              </td>
                              <td>{selectedRow.grade || "-"}</td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Subject</strong>
                              </td>
                              <td>{selectedRow.subject || "-"}</td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Schedule Type</strong>
                              </td>
                              <td>{selectedRow.scheduleType || "-"}</td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Date</strong>
                              </td>
                              <td>{formatDate(selectedRow.date)}</td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Planned Time</strong>
                              </td>
                              <td>{formatTimeRange(selectedRow.startTime, selectedRow.endTime)}</td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Meeting Link</strong>
                              </td>
                              <td>
                                {selectedRow.meetingLink ? (
                                  <a href={selectedRow.meetingLink} target="_blank" rel="noreferrer">
                                    Open Link
                                  </a>
                                ) : (
                                  "-"
                                )}
                              </td>
                            </tr>
                          </tbody>
                        </Table>
                      </div>
                    </div>
                  </Col>
                  <Col md="6">
                    <div className="card card-bordered h-100">
                      <div className="card-inner">
                        <h6 className="mb-3">Tutor / Operations(Ownership) / Coordinator</h6>
                        <Table borderless size="sm">
                          <tbody>
                            <tr>
                              <td>
                                <strong>Tutor</strong>
                              </td>
                              <td>{selectedRow.tutorName || "-"}</td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Ownership</strong>
                              </td>
                              <td>{selectedRow.ownershipName || "-"}</td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Coordinator</strong>
                              </td>
                              <td>{selectedRow.coordinatorName || "-"}</td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Schedule Status</strong>
                              </td>
                              <td>{selectedRow.scheduleStatus || "-"}</td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Tutor Status</strong>
                              </td>
                              <td>{selectedRow.tutorScheduleStatusName || "-"}</td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Student Status</strong>
                              </td>
                              <td>{selectedRow.studentScheduleStatusName || "-"}</td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Operation Status</strong>
                              </td>
                              <td>
                                {isAccountsReadOnly ? (
                                  <span>{selectedRow.operationScheduleStatusName || "-"}</span>
                                ) : loadingOperationStatuses ? (
                                  <div className="d-flex align-items-center gap-2">
                                    <Spinner size="sm" />
                                    <span className="ms-2">Loading statuses...</span>
                                  </div>
                                ) : (
                                  <Input
                                    type="select"
                                    value={selectedAttendanceStatus}
                                    onChange={handleOperationStatusChange}
                                    disabled={savingOperationStatus}
                                  >
                                    <option value="">Select Status</option>
                                    {attendanceStatusOptions.map((item) => (
                                      <option key={item.id} value={item.id}>
                                        {item.typeCodeDescription || item.typeCodeName}
                                      </option>
                                    ))}
                                  </Input>
                                )}
                              </td>
                            </tr>
                          </tbody>
                        </Table>
                      </div>
                    </div>
                  </Col>
                </Row>

                <Row className="g-3 mb-4">
                  <Col md="4">
                    <div
                      className="p-3"
                      style={{
                        backgroundColor: "#e3f2fd",
                        borderLeft: "4px solid #2196f3",
                        borderRadius: "4px",
                      }}
                    >
                      <div className="mb-2">
                        <span className="badge bg-primary text-white" style={{ fontSize: "0.7rem" }}>
                          STUDENT
                        </span>
                      </div>
                      <div style={{ fontSize: "0.85rem" }}>
                        <div>
                          <strong>Start:</strong> {formatDateTime(selectedRow.studentStartTime)}
                        </div>
                        <div>
                          <strong>End:</strong> {formatDateTime(selectedRow.studentEndTime)}
                        </div>
                        <div>
                          <strong>Present:</strong> {toYesNo(selectedRow.isStudentPresent)}
                        </div>
                        <div>
                          <strong>Comment:</strong> {selectedRow.studentComment || "-"}
                        </div>
                      </div>
                    </div>
                  </Col>
                  <Col md="4">
                    <div
                      className="p-3"
                      style={{
                        backgroundColor: "#e8f5e8",
                        borderLeft: "4px solid #4caf50",
                        borderRadius: "4px",
                      }}
                    >
                      <div className="mb-2">
                        <span className="badge bg-success text-white" style={{ fontSize: "0.7rem" }}>
                          TUTOR
                        </span>
                      </div>
                      <div style={{ fontSize: "0.85rem" }}>
                        <div>
                          <strong>Start:</strong> {formatDateTime(selectedRow.tutorStartTime)}
                        </div>
                        <div>
                          <strong>End:</strong> {formatDateTime(selectedRow.tutorEndTime)}
                        </div>
                        <div>
                          <strong>Present:</strong> {toYesNo(selectedRow.isTutorPresent)}
                        </div>
                        <div>
                          <strong>Comment:</strong> {selectedRow.tutorComment || "-"}
                        </div>
                      </div>
                    </div>
                  </Col>
                  <Col md="4">
                    <div
                      className="p-3"
                      style={{
                        backgroundColor: "#e0f7fa",
                        borderLeft: "4px solid #00bcd4",
                        borderRadius: "4px",
                      }}
                    >
                      <div className="mb-2">
                        <span className="badge bg-info text-white" style={{ fontSize: "0.7rem" }}>
                          OPERATIONS
                        </span>
                      </div>
                      <div style={{ fontSize: "0.85rem" }}>
                        <div>
                          <strong>Start:</strong> {formatDateTime(selectedRow.operationStartTime)}
                        </div>
                        <div>
                          <strong>End:</strong> {formatDateTime(selectedRow.operationEndTime)}
                        </div>
                        <div>
                          <strong>Title:</strong> {selectedRow.title || "-"}
                        </div>
                        <div>
                          <strong>Comment:</strong> {selectedRow.comment || "-"}
                        </div>
                      </div>
                    </div>
                  </Col>
                </Row>
              </>
            )}
          </ModalBody>
          <ModalFooter>
            <Button color="light" onClick={closeViewDetailsModal} disabled={savingOperationStatus}>
              {isAccountsReadOnly ? "Close" : "Cancel"}
            </Button>
            {!isAccountsReadOnly && (
              <Button
                color="primary"
                onClick={handleSaveOperationStatus}
                disabled={
                  savingOperationStatus ||
                  loadingOperationStatuses ||
                  !selectedAttendanceStatus ||
                  selectedAttendanceStatus === originalAttendanceStatus
                }
              >
                {savingOperationStatus ? (
                  <>
                    <Spinner size="sm" className="me-1" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            )}
          </ModalFooter>
        </Modal>

        {/* ══════════════════════════════════════════════════════════════════════
            Bulk Update Modal
        ══════════════════════════════════════════════════════════════════════ */}
        <Modal
          isOpen={openBulkModal}
          toggle={() => {
            if (!savingOperationStatus) {
              setOpenBulkModal(false);
              setSelectedAttendanceStatus("");
            }
          }}
          size="md"
        >
          <ModalHeader
            toggle={() => {
              if (!savingOperationStatus) {
                setOpenBulkModal(false);
                setSelectedAttendanceStatus("");
              }
            }}
          >
            <span style={{ color: "#854fff" }}>Bulk Update Operation Status</span>
          </ModalHeader>
          <ModalBody>
            <p className="text-muted mb-3">
              You are updating <strong style={{ color: "#854fff" }}>{selectedRows.length}</strong> selected record(s).
            </p>
            {loadingOperationStatuses ? (
              <div className="d-flex align-items-center gap-2">
                <Spinner size="sm" />
                <span className="ms-2">Loading statuses...</span>
              </div>
            ) : (
              <FormGroup>
                <Label>Operation Status</Label>
                <Input
                  type="select"
                  value={selectedAttendanceStatus}
                  onChange={handleOperationStatusChange}
                  disabled={savingOperationStatus}
                >
                  <option value="">Select Status</option>
                  {attendanceStatusOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.typeCodeDescription || item.typeCodeName}
                    </option>
                  ))}
                </Input>
              </FormGroup>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              color="light"
              onClick={() => {
                setOpenBulkModal(false);
                setSelectedAttendanceStatus("");
              }}
              disabled={savingOperationStatus}
            >
              Cancel
            </Button>
            <Button
              color="primary"
              onClick={handleBulkSaveOperationStatus}
              disabled={savingOperationStatus || loadingOperationStatuses || !selectedAttendanceStatus}
            >
              {savingOperationStatus ? (
                <>
                  <Spinner size="sm" className="me-1" />
                  Saving...
                </>
              ) : (
                `Update ${selectedRows.length} Record(s)`
              )}
            </Button>
          </ModalFooter>
        </Modal>

        {/* ══════════════════════════════════════════════════════════════════════
            Update Attendance Modal  (NEW)
        ══════════════════════════════════════════════════════════════════════ */}
        <Modal isOpen={openAttendanceModal} toggle={closeAttendanceModal} size="lg" centered>
          <ModalHeader toggle={closeAttendanceModal}>
            <span style={{ color: "#854fff" }}>Update Attendance</span>
            {attendanceRow && (
              <>
                <span style={{ color: "#09c2de" }}> - {attendanceRow.studentName}</span>
                <span style={{ color: "#854fff" }}> / {attendanceRow.subject}</span>
              </>
            )}
          </ModalHeader>

          <ModalBody>
            {loadingAttendanceModal ? (
              <div className="d-flex justify-content-center align-items-center py-5">
                <Spinner color="primary" />
                <span className="ms-3 text-muted">Loading...</span>
              </div>
            ) : (
              <>
                {/* ── Read-only info header ── */}
                <div
                  className="mb-4 p-3"
                  style={{
                    backgroundColor: "#f8f9fa",
                    borderRadius: "6px",
                    border: "1px solid #e9ecef",
                  }}
                >
                  <Row>
                    <Col sm="6">
                      <h6
                        className="overline-title text-muted mb-1"
                        style={{ fontSize: "0.68rem", letterSpacing: "0.08em" }}
                      >
                        TUTOR NAME
                      </h6>
                      <p className="mb-0 fw-medium">{attendanceRow?.tutorName || "—"}</p>
                    </Col>
                    <Col sm="6">
                      <h6
                        className="overline-title text-muted mb-1"
                        style={{ fontSize: "0.68rem", letterSpacing: "0.08em" }}
                      >
                        SUBJECT
                      </h6>
                      <p className="mb-0 fw-medium">{attendanceRow?.subject || "—"}</p>
                    </Col>
                  </Row>
                  <Row className="mt-2">
                    <Col sm="4">
                      <h6
                        className="overline-title text-muted mb-1"
                        style={{ fontSize: "0.68rem", letterSpacing: "0.08em" }}
                      >
                        CLASS DATE
                      </h6>
                      <p className="mb-0 fw-medium">{formatDate(attendanceRow?.date)}</p>
                    </Col>
                    <Col sm="4">
                      <h6
                        className="overline-title text-muted mb-1"
                        style={{ fontSize: "0.68rem", letterSpacing: "0.08em" }}
                      >
                        START TIME
                      </h6>
                      <p className="mb-0">{formatTime(attendanceRow?.startTime)}</p>
                    </Col>
                    <Col sm="4">
                      <h6
                        className="overline-title text-muted mb-1"
                        style={{ fontSize: "0.68rem", letterSpacing: "0.08em" }}
                      >
                        END TIME
                      </h6>
                      <p className="mb-0">{formatTime(attendanceRow?.endTime)}</p>
                    </Col>
                  </Row>
                </div>

                <hr className="mb-4" />

                {/* ── Editable fields ── */}
                <Row className="g-3">
                  {/* Class Status */}
                  <Col sm="6">
                    <FormGroup>
                      <Label>
                        Class Status <span className="text-danger">*</span>
                      </Label>
                      <Input
                        type="select"
                        value={attendanceFormData.eventStatus}
                        onChange={(e) =>
                          setAttendanceFormData((prev) => ({
                            ...prev,
                            eventStatus: e.target.value,
                          }))
                        }
                        disabled={savingAttendance}
                      >
                        {classStatusOptions.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </Input>
                    </FormGroup>
                  </Col>

                  {/* Start Time picker */}
                  <Col sm="3">
                    <FormGroup>
                      <Label>Start Time</Label>
                      <DatePicker
                        selected={attendanceFormData.startTime}
                        onChange={(date) => {
                          setAttendanceFormData((prev) => ({ ...prev, startTime: date }));
                          validateAttendanceTimes(date, attendanceFormData.endTime);
                        }}
                        showTimeSelect
                        showTimeSelectOnly
                        timeCaption="Time"
                        dateFormat="h:mm aa"
                        className="form-control"
                        disabled={savingAttendance}
                        timeIntervals={15}
                      />
                    </FormGroup>
                  </Col>

                  {/* End Time picker */}
                  <Col sm="3">
                    <FormGroup>
                      <Label>End Time</Label>
                      <DatePicker
                        selected={attendanceFormData.endTime}
                        onChange={(date) => {
                          setAttendanceFormData((prev) => ({ ...prev, endTime: date }));
                          validateAttendanceTimes(attendanceFormData.startTime, date);
                        }}
                        showTimeSelect
                        showTimeSelectOnly
                        timeCaption="Time"
                        dateFormat="h:mm aa"
                        className="form-control"
                        disabled={savingAttendance}
                        timeIntervals={15}
                      />
                      {attendanceDateError && (
                        <p className="text-danger mt-1" style={{ fontSize: "0.8rem" }}>
                          {attendanceDateError}
                        </p>
                      )}
                    </FormGroup>
                  </Col>

                  {/* Document Type */}
                  <Col sm="6">
                    <FormGroup>
                      <Label>Document Type</Label>
                      <Input
                        type="select"
                        value={attendanceFormData.documentTypeId}
                        onChange={(e) =>
                          setAttendanceFormData((prev) => ({
                            ...prev,
                            documentTypeId: e.target.value,
                          }))
                        }
                        disabled={savingAttendance}
                      >
                        {documentTypeOptions.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </Input>
                    </FormGroup>
                  </Col>

                  {/* Upload File */}
                  <Col sm="6">
                    <FormGroup>
                      <Label>Upload File</Label>
                      <div className="form-control-wrap">
                        <div className="custom-file">
                          <input
                            type="file"
                            multiple
                            className="custom-file-input form-control"
                            id="attendanceFileUpload"
                            disabled={savingAttendance}
                            onChange={(e) => {
                              setAttendanceFormData((prev) => ({
                                ...prev,
                                file: e.target.files,
                                selectedFileName: e.target.files[0]?.name || null,
                              }));
                            }}
                          />
                          <Label className="custom-file-label" htmlFor="attendanceFileUpload">
                            {attendanceFormData.selectedFileName || "Choose file"}
                          </Label>
                        </div>
                      </div>
                    </FormGroup>
                  </Col>

                  {/* Rating */}
                  {canRateClass && (
                    <Col sm="6">
                      <FormGroup>
                        <Label>Rate Today Demo / Class</Label>
                        <div className="form-control-wrap">
                          <Rating
                            type="star"
                            initVal={attendanceFormData.rate || 0}
                            ratingCallback={(rate) => setAttendanceFormData((prev) => ({ ...prev, rate }))}
                          />
                        </div>
                      </FormGroup>
                    </Col>
                  )}

                  {/* Feedback / Comments */}
                  <Col sm="6">
                    <FormGroup>
                      <Label>Feedback / Comments</Label>
                      <Input
                        type="textarea"
                        rows="3"
                        value={attendanceFormData.noteText}
                        onChange={(e) =>
                          setAttendanceFormData((prev) => ({
                            ...prev,
                            noteText: e.target.value,
                          }))
                        }
                        disabled={savingAttendance}
                        placeholder="Enter comments..."
                        style={{ minHeight: "80px" }}
                      />
                    </FormGroup>
                  </Col>
                </Row>
              </>
            )}
          </ModalBody>

          <ModalFooter>
            <Button color="light" onClick={closeAttendanceModal} disabled={savingAttendance}>
              Cancel
            </Button>
            <Button
              color="primary"
              onClick={handleSaveAttendance}
              disabled={savingAttendance || loadingAttendanceModal}
            >
              {savingAttendance ? (
                <>
                  <Spinner size="sm" className="me-1" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </ModalFooter>
        </Modal>
      </Content>
    </>
  );
};

// ─── Static data ──────────────────────────────────────────────────────────────
const monthOptions = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

// ─── Utility functions ────────────────────────────────────────────────────────
function contains(value, search) {
  if (!search) return true;
  return String(value || "")
    .toLowerCase()
    .includes(String(search).toLowerCase());
}

function equalsOrEmpty(value, filterValue) {
  if (!filterValue) return true;
  return String(value || "") === String(filterValue);
}

function uniqueValues(rows, key) {
  return [...new Set((rows || []).map((x) => x?.[key]).filter(Boolean))].sort();
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

function isScheduledClassInFuture(row) {
  const endTime = row?.endTime ? new Date(row.endTime) : null;
  if (endTime && !Number.isNaN(endTime.getTime())) {
    return endTime.getTime() > Date.now();
  }

  const classDate = row?.date ? new Date(row.date) : null;
  if (!classDate || Number.isNaN(classDate.getTime())) return false;

  classDate.setHours(23, 59, 59, 999);
  return classDate.getTime() > Date.now();
}

function formatTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  const text = String(value);
  if (text.includes("T")) {
    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
  }
  return text;
}

function formatTimeRange(start, end) {
  if (!start && !end) return "-";
  return `${formatTime(start)} - ${formatTime(end)}`;
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function toYesNo(value) {
  if (value === null || value === undefined) return "-";
  return value ? "Yes" : "No";
}

export default CompletedClassScheduleReport;
