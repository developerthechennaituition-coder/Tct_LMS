import React, { useEffect, useMemo, useState } from "react";
import {
  Block,
  BlockBetween,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Icon,
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
import { groupTutorAttendance } from "../../../library/tutorAttendanceSummary";
import Content from "../../../layout/content/Content";
import Head from "../../../layout/head/Head";
import { toast, ToastContainer } from "react-toastify";
import {
  getCompletedClassScheduleDetails,
  updateOperationScheduleStatus,
  bulkUpdateOperationScheduleStatus,
  updateScheduleStatus,
  getScheduledTutorList,
  generateTutorInvoice,
} from "../../../apiservices/ScheduleService";
import { getLookups } from "../../../apiservices/LookupsService";
import { useLocation, Link, useHistory } from "react-router-dom";
import { usePermissions } from "../../../hooks/usePermissions";
import "./TCTTutorOprList.css";

// Rows per page options for the grouped table (client-side paging).
const TUTOR_ATTENDANCE_PAGE_SIZES = [10, 20, 50, 100];

const TCTTutorOprList = (props) => {
  const { can } = usePermissions();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const tutorIdParam = queryParams.get("tutorId");
  const operationId = props?.operationId || null;
  const loggedInUserRole = localStorage.getItem("userRole");
  const canRateClass = ["Student", "Operations", "Coordinator"].includes(loggedInUserRole);
  const [fromDate, setFromDate] = useState(props?.fromDate || null);
  const [toDate, setToDate] = useState(props?.toDate || null);
  const [operationStatus, setOperationStatus] = useState(props?.operationStatus || null);
  const [tutorOptions, setTutorOptions] = useState([]);
  const history = useHistory();
  const canViewTutorAttendance = ["Operations", "OperationsAdmin"].includes(loggedInUserRole);
  const canShowFilter = props?.canShowFilter != undefined ? props?.canShowFilter : true;
  const canShowHeader = props?.canShowHeader != undefined ? props?.canShowHeader : true;

  // ─── Main table state ───────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [tableKey, setTableKey] = useState(0);

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

  const [pageSize, setPageSize] = useState(10);
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [invoiceGroup, setInvoiceGroup] = useState(null);
  const [openInvoiceModal, setOpenInvoiceModal] = useState(false);
  const [invoiceStudentsExpanded, setInvoiceStudentsExpanded] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [generatedInvoices, setGeneratedInvoices] = useState({});
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // ─── Filters ─────────────────────────────────────────────────────────────────
  const [filters, setFilters] = useState({
    tutorId: "",
    board: "",
    grade: "",
    subject: "",
    month: "",
    year: "",
    status: "",
  });

  useEffect(async () => {
    await getScheduledTutors();
  }, [fromDate, toDate, operationStatus]);

  const getScheduledTutors = async () => {
    try {
      const response = await getScheduledTutorList({ operationId, fromDate, toDate, operationStatus });
      if (response?.succeeded) {
        setTutorOptions(response.data || []);
      }
    } catch (error) {
      console.error("Error loading scheduled tutors:", error);
      toast.error("Error loading scheduled tutors");
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await getCompletedClassScheduleDetails(
        null,
        filters.tutorId || null,
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
    fetchData();
  }, [filters.tutorId]);

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

  useEffect(() => {
    setCurrentPage(1);
    setExpandedGroups(new Set());
  }, [filters, searchText]);

  const searchedData = useMemo(() => {
    if (!searchText.trim()) return filteredData;
    const lower = searchText.toLowerCase();
    return filteredData.filter((row) =>
      searchableFields.some((field) =>
        String(row[field] || "").toLowerCase().includes(lower),
      ),
    );
  }, [filteredData, searchText]);

  const groupedData = useMemo(() => groupTutorAttendance(searchedData), [searchedData]);

  const paginatedGroups = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return groupedData.slice(start, start + pageSize);
  }, [groupedData, currentPage, pageSize]);

  const totalPages = Math.ceil(groupedData.length / pageSize);

  // Seed generatedInvoices from API data on load so "View Payslip" persists after login
  useEffect(() => {
    const existing = {};
    groupedData.forEach((g) => {
      if (g.invoiceNumber) existing[g.key] = g.invoiceNumber;
    });
    if (Object.keys(existing).length > 0) {
      setGeneratedInvoices((prev) => ({ ...existing, ...prev }));
    }
  }, [groupedData]);

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

  // ─── View Details modal handlers ──────────────────────────────────────────────
  const onViewDetails = async (row) => {
    setSelectedRow(row);
    setOpenViewDetailsModal(true);
    await fetchAttendanceStatusLookups(row);
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
      fetchData();
    } catch (error) {
      console.error("Error saving attendance:", error);
      toast.error(error?.response?.data?.message || error?.message || "Failed to update attendance.");
    } finally {
      setSavingAttendance(false);
    }
  };

  // ─── Filter reset ─────────────────────────────────────────────────────────────
  // Opens the selected tutor's existing calendar (classes with their attendance status),
  // on the filtered month/year when one is chosen.
  const viewTutorAttendance = () => {
    const tutor = tutorOptions.find((item) => String(item.tutorId) === String(filters.tutorId));
    if (!tutor?.tutorUserId) {
      toast.error("Please select a tutor to view attendance.");
      return;
    }
    const params = new URLSearchParams({ id: tutor.tutorUserId, tutorName: tutor.tutorName || "Tutor" });
    if (filters.month) {
      params.set("month", Number(filters.month));
      params.set("year", filters.year || new Date().getFullYear());
    }
    history.push(`${process.env.PUBLIC_URL}/tct-tutor-calender/?${params.toString()}`);
  };

  const resetFilters = () => {
    setFilters({
      tutorId: "",
      board: "",
      grade: "",
      subject: "",
      month: "",
      year: "",
      status: "",
    });
  };

  // ─── Group handlers ───────────────────────────────────────────────────────────
  const toggleGroup = (key) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const onGenerateInvoice = (group) => {
    setInvoiceGroup(group);
    setInvoiceStudentsExpanded(false);
    setOpenInvoiceModal(true);
  };

  const onConfirmGeneratePayslip = async () => {
    if (!invoiceGroup) return;
    const tutorId = invoiceGroup.tutorUserId;
    if (!tutorId) {
      toast.error("Tutor ID not found. Cannot generate payslip.", { toastId: "payslip-error" });
      return;
    }
    const createdBy = localStorage.getItem("userId");
    const groupKey = invoiceGroup.key;
    setGeneratingInvoice(true);
    try {
      const res = await generateTutorInvoice(
        Number(invoiceGroup.year),
        Number(invoiceGroup.monthNum),
        tutorId,
        createdBy,
      );
      const data = res?.data ?? res;
      const invoiceNumber = data?.invoiceNumber;
      if (invoiceNumber) {
        setGeneratedInvoices((prev) => ({ ...prev, [groupKey]: invoiceNumber }));
      }
      if (data?.emailError) {
        toast.warning(`Payslip generated but email could not be sent: ${data.emailError}`, { toastId: "email-warning" });
      } else {
        toast.success(
          invoiceNumber
            ? `Payslip ${invoiceNumber} generated successfully. Pay slip sent to tutor's email.`
            : "Payslip generated successfully. Pay slip sent to tutor's email.",
          { toastId: "payslip-success" },
        );
      }
      setOpenInvoiceModal(false);
      fetchData();
    } catch (error) {
      toast.error(error?.response?.data || error?.message || "Failed to generate payslip.", { toastId: "payslip-error" });
    } finally {
      setGeneratingInvoice(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      <ToastContainer />
      <Head title="Tutor Attendance List" />
      <Content>
        <div className="tct-tal">
        <>
          {canShowHeader && (
            <BlockHead size="sm">
              <BlockBetween>
                <BlockHeadContent>
                  <BlockTitle tag="h5">Tutor Attendance List</BlockTitle>
                </BlockHeadContent>
              </BlockBetween>
            </BlockHead>
          )}
        </>
        <Block>
          <>
            {/* ── Filters ── */}
            {canShowFilter && (
              <div className="card card-bordered mb-4 tct-tal-filters">
                <div className="card-inner">
                  <Row className="g-3 align-items-end">
                    <Col md="3">
                      <FormGroup>
                        <Label>Tutor Name</Label>
                        <Input
                          type="select"
                          value={filters.tutorId}
                          onChange={(e) => {
                            setFilters((prev) => ({
                              ...prev,
                              tutorId: e.target.value,
                            }));
                          }}
                        >
                          <option value="">All Tutors</option>
                          {tutorOptions.map((item) => (
                            <option key={item.tutorId} value={item.tutorId}>
                              {item.tutorName}
                            </option>
                          ))}
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
                    {canViewTutorAttendance && (
                      <Col md="2">
                        <Button color="primary" className="w-100" onClick={viewTutorAttendance}>
                          <Icon name="calendar-check" className="me-1" />
                          View Attendance
                        </Button>
                      </Col>
                    )}
                  </Row>
                </div>
              </div>
            )}
            {/* ── Bulk action bar ── */}
            {selectedRows.length > 0 && (
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
                {can("Tutor Attendance List", "edit") && (
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

          {/* ── Grouped Table ── */}
          <div>
            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap tct-tal-toolbar" style={{ gap: "8px" }}>
              <Input
                type="text"
                placeholder="Search by Student, Tutor, Board, Grade, Subject, Status..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ maxWidth: "420px" }}
              />
              <span className="text-muted" style={{ fontSize: "0.85rem" }}>
                {groupedData.length} group(s) · {searchedData.length} record(s)
              </span>
            </div>

            {eligibleRows.length > 0 && (
              <div className="d-flex align-items-center mb-2 tct-tal-selectall" style={{ gap: "8px" }}>
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(el) => { if (el) el.indeterminate = isIndeterminate; }}
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
                <span className="ms-3 text-muted">Loading tutor attendance list...</span>
              </div>
            ) : groupedData.length === 0 ? (
              <div className="text-center py-5 text-muted">No records found.</div>
            ) : (
              <>
                <div className="tct-tal-table-wrap" style={{ overflowX: "auto" }}>
                  <table className="table table-bordered tct-tal-table" style={{ fontSize: "0.875rem", minWidth: "820px" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f8f9fa" }}>
                        <th style={{ width: "42px" }}></th>
                        <th>Month</th>
                        <th>Tutor</th>
                        <th style={{ textAlign: "center", width: "80px" }}>Classes</th>
                        <th style={{ textAlign: "right", width: "140px" }}>Payslip Amt</th>
                        <th style={{ textAlign: "right", width: "170px" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedGroups.map((group) => (
                        <React.Fragment key={group.key}>
                          <tr
                            style={{ backgroundColor: "#f0eaff", cursor: "pointer" }}
                            onClick={() => toggleGroup(group.key)}
                          >
                            <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                              <Icon name={expandedGroups.has(group.key) ? "chevron-up" : "chevron-down"} />
                            </td>
                            <td style={{ fontWeight: 600, verticalAlign: "middle", whiteSpace: "nowrap" }}>
                              {group.monthLabel} {group.year}
                            </td>
                            <td style={{ verticalAlign: "middle" }}>{group.tutorName}</td>
                            <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                              <span
                                className="badge"
                                style={{ backgroundColor: "#854fff", color: "#fff", fontSize: "0.85rem", minWidth: "28px", display: "inline-block" }}
                              >
                                {group.rows.length}
                              </span>
                            </td>
                            <td style={{ textAlign: "right", verticalAlign: "middle", fontWeight: 600, color: "#2c7a2c" }}>
                              {group.totalPayslipAmount > 0
                                ? `₹${group.totalPayslipAmount.toLocaleString("en-IN")}`
                                : "-"}
                            </td>
                            <td style={{ textAlign: "right", verticalAlign: "middle" }}>
                              {(() => {
                                const generatedInvoiceNumber = generatedInvoices[group.key];
                                if (generatedInvoiceNumber) {
                                  if (!can("Tutor Attendance List", "view")) return null;
                                  return (
                                    <Link
                                      to={`${process.env.PUBLIC_URL}/lms/tutors/tutor-invoice-details?invNumber=${generatedInvoiceNumber}&from=opr-list`}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Button color="success" size="sm" style={{ whiteSpace: "nowrap", color: "#fff" }}>
                                        <Icon name="card-view" className="me-1" />
                                        View Payslip
                                      </Button>
                                    </Link>
                                  );
                                }
                                if (!can("Tutor Attendance List", "add")) return null;
                                // The three cross-check names (lookup 1013), compared without spaces:
                                // the stored name is "Go with operation attendance(Ops Approved)".
                                const approvedOperationStatuses = new Set([
                                  "opsapproved",
                                  "gowithtutorsattendance(opsapproved)",
                                  "gowithoperationattendance(opsapproved)",
                                ]);
                                const allOpsApproved = group.rows.every((r) =>
                                  approvedOperationStatuses.has(
                                    String(r.operationScheduleStatusName || "").replace(/\s+/g, "").toLowerCase()
                                  )
                                );
                                return (
                                  <span
                                    title={!allOpsApproved ? "All classes must be Ops Approved to generate a payslip" : ""}
                                    style={{ display: "inline-block", cursor: !allOpsApproved ? "not-allowed" : "default" }}
                                  >
                                    <Button
                                      color="warning"
                                      size="sm"
                                      disabled={!allOpsApproved}
                                      style={{
                                        whiteSpace: "nowrap",
                                        color: "#fff",
                                        pointerEvents: !allOpsApproved ? "none" : "auto",
                                      }}
                                      onClick={(e) => { e.stopPropagation(); onGenerateInvoice(group); }}
                                    >
                                      <Icon name="file-text" className="me-1" />
                                      Generate Payslip
                                    </Button>
                                  </span>
                                );
                              })()}
                            </td>
                          </tr>

                          {expandedGroups.has(group.key) && (
                            <tr>
                              <td colSpan={6} style={{ padding: 0, backgroundColor: "#fafbfc" }}>
                                <div style={{ overflowX: "auto" }}>
                                  <table className="table table-sm table-striped mb-0" style={{ fontSize: "0.82rem" }}>
                                    <thead>
                                      <tr style={{ backgroundColor: "#e9ecef" }}>
                                        <th>Student</th>
                                        <th>Subject</th>
                                        <th style={{ textAlign: "right" }}>Tutor Rate (₹/hour)</th>
                                        <th style={{ textAlign: "center" }}>Total Classes</th>
                                        <th style={{ textAlign: "center" }}>Completed</th>
                                        <th style={{ textAlign: "center" }}>Tutor Absent</th>
                                        <th style={{ textAlign: "right" }}>Total Amt (₹)</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {group.childGroupList.length > 0 ? (
                                        group.childGroupList.map((cg, idx) => (
                                          <tr key={cg.key || idx}>
                                            <td style={{ verticalAlign: "middle" }}>{cg.studentName}</td>
                                            <td style={{ verticalAlign: "middle" }}>{cg.subject}</td>
                                            <td style={{ textAlign: "right", verticalAlign: "middle" }}>
                                              {cg.tutorPayment > 0 ? cg.tutorPayment.toLocaleString("en-IN") : "-"}
                                            </td>
                                            <td style={{ textAlign: "center", verticalAlign: "middle" }}>{cg.totalClasses}</td>
                                            <td style={{ textAlign: "center", verticalAlign: "middle", color: "#1ee0ac" }}>{cg.completedClasses}</td>
                                            <td style={{ textAlign: "center", verticalAlign: "middle", color: cg.tutorAbsent > 0 ? "#e85347" : "#6c757d" }}>
                                              {cg.tutorAbsent}
                                            </td>
                                            <td style={{ textAlign: "right", verticalAlign: "middle", fontWeight: 600 }}>
                                              {cg.totalTutorPayment.toLocaleString("en-IN")}
                                            </td>
                                          </tr>
                                        ))
                                      ) : (
                                        <tr>
                                          <td colSpan={7} className="text-center text-muted">No records</td>
                                        </tr>
                                      )}
                                    </tbody>
                                    <tfoot>
                                      <tr style={{ backgroundColor: "#e9ecef", fontWeight: 600 }}>
                                        <td colSpan={6} style={{ textAlign: "right" }}>Total Payslip Amount:</td>
                                        <td style={{ textAlign: "right", color: "#2c7a2c" }}>
                                          ₹{group.totalPayslipAmount.toLocaleString("en-IN")}
                                        </td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="tct-tal-pager">
                  {totalPages > 1 ? (
                    <div className="d-flex tct-tal-pager-nav" style={{ gap: "4px" }}>
                      <Button color="light" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
                        Prev
                      </Button>
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        const page = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                        if (page > totalPages) return null;
                        return (
                          <Button key={page} color={page === currentPage ? "primary" : "light"} size="sm" onClick={() => setCurrentPage(page)}>
                            {page}
                          </Button>
                        );
                      })}
                      <Button color="light" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
                        Next
                      </Button>
                    </div>
                  ) : (
                    <div className="tct-tal-pager-nav" aria-hidden="true"></div>
                  )}
                  <span className="text-muted tct-tal-pager-range" role="status" aria-live="polite">
                    Showing {Math.min((currentPage - 1) * pageSize + 1, groupedData.length)}–{Math.min(currentPage * pageSize, groupedData.length)} of {groupedData.length} group(s)
                  </span>
                  <div className="tct-tal-pager-size">
                    <label htmlFor="tct-tal-rows-per-page">Rows per page</label>
                    <select
                      id="tct-tal-rows-per-page"
                      className="form-control"
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                    >
                      {TUTOR_ATTENDANCE_PAGE_SIZES.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
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
                <span style={{ color: "#09c2de" }}> - {selectedRow.tutorName}</span>
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
                              <td><strong>Student</strong></td>
                              <td>{selectedRow.studentName || "-"}</td>
                            </tr>
                            <tr>
                              <td><strong>Board</strong></td>
                              <td>{selectedRow.board || "-"}</td>
                            </tr>
                            <tr>
                              <td><strong>Grade</strong></td>
                              <td>{selectedRow.grade || "-"}</td>
                            </tr>
                            <tr>
                              <td><strong>Subject</strong></td>
                              <td>{selectedRow.subject || "-"}</td>
                            </tr>
                            <tr>
                              <td><strong>Schedule Type</strong></td>
                              <td>{selectedRow.scheduleType || "-"}</td>
                            </tr>
                            <tr>
                              <td><strong>Date</strong></td>
                              <td>{formatDate(selectedRow.date)}</td>
                            </tr>
                            <tr>
                              <td><strong>Planned Time</strong></td>
                              <td>{formatTimeRange(selectedRow.startTime, selectedRow.endTime)}</td>
                            </tr>
                            <tr>
                              <td><strong>Meeting Link</strong></td>
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
                              <td><strong>Tutor</strong></td>
                              <td>{selectedRow.tutorName || "-"}</td>
                            </tr>
                            <tr>
                              <td><strong>Ownership</strong></td>
                              <td>{selectedRow.ownershipName || "-"}</td>
                            </tr>
                            <tr>
                              <td><strong>Coordinator</strong></td>
                              <td>{selectedRow.coordinatorName || "-"}</td>
                            </tr>
                            <tr>
                              <td><strong>Schedule Status</strong></td>
                              <td>{selectedRow.scheduleStatus || "-"}</td>
                            </tr>
                            <tr>
                              <td><strong>Tutor Status</strong></td>
                              <td>{selectedRow.tutorScheduleStatusName || "-"}</td>
                            </tr>
                            <tr>
                              <td><strong>Student Status</strong></td>
                              <td>{selectedRow.studentScheduleStatusName || "-"}</td>
                            </tr>
                            <tr>
                              <td><strong>Operation Status</strong></td>
                              <td>
                                {loadingOperationStatuses ? (
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
                      style={{ backgroundColor: "#e3f2fd", borderLeft: "4px solid #2196f3", borderRadius: "4px" }}
                    >
                      <div className="mb-2">
                        <span className="badge bg-primary text-white" style={{ fontSize: "0.7rem" }}>STUDENT</span>
                      </div>
                      <div style={{ fontSize: "0.85rem" }}>
                        <div><strong>Start:</strong> {formatDateTime(selectedRow.studentStartTime)}</div>
                        <div><strong>End:</strong> {formatDateTime(selectedRow.studentEndTime)}</div>
                        <div><strong>Present:</strong> {toYesNo(selectedRow.isStudentPresent)}</div>
                        <div><strong>Comment:</strong> {selectedRow.studentComment || "-"}</div>
                      </div>
                    </div>
                  </Col>
                  <Col md="4">
                    <div
                      className="p-3"
                      style={{ backgroundColor: "#e8f5e8", borderLeft: "4px solid #4caf50", borderRadius: "4px" }}
                    >
                      <div className="mb-2">
                        <span className="badge bg-success text-white" style={{ fontSize: "0.7rem" }}>TUTOR</span>
                      </div>
                      <div style={{ fontSize: "0.85rem" }}>
                        <div><strong>Start:</strong> {formatDateTime(selectedRow.tutorStartTime)}</div>
                        <div><strong>End:</strong> {formatDateTime(selectedRow.tutorEndTime)}</div>
                        <div><strong>Present:</strong> {toYesNo(selectedRow.isTutorPresent)}</div>
                        <div><strong>Comment:</strong> {selectedRow.tutorComment || "-"}</div>
                      </div>
                    </div>
                  </Col>
                  <Col md="4">
                    <div
                      className="p-3"
                      style={{ backgroundColor: "#e0f7fa", borderLeft: "4px solid #00bcd4", borderRadius: "4px" }}
                    >
                      <div className="mb-2">
                        <span className="badge bg-info text-white" style={{ fontSize: "0.7rem" }}>OPERATIONS</span>
                      </div>
                      <div style={{ fontSize: "0.85rem" }}>
                        <div><strong>Start:</strong> {formatDateTime(selectedRow.operationStartTime)}</div>
                        <div><strong>End:</strong> {formatDateTime(selectedRow.operationEndTime)}</div>
                        <div><strong>Title:</strong> {selectedRow.title || "-"}</div>
                        <div><strong>Comment:</strong> {selectedRow.comment || "-"}</div>
                      </div>
                    </div>
                  </Col>
                </Row>
              </>
            )}
          </ModalBody>
          <ModalFooter>
            <Button color="light" onClick={closeViewDetailsModal} disabled={savingOperationStatus}>
              Cancel
            </Button>
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
            Update Attendance Modal
        ══════════════════════════════════════════════════════════════════════ */}
        <Modal isOpen={openAttendanceModal} toggle={closeAttendanceModal} size="lg" centered>
          <ModalHeader toggle={closeAttendanceModal}>
            <span style={{ color: "#854fff" }}>Update Attendance</span>
            {attendanceRow && (
              <>
                <span style={{ color: "#09c2de" }}> - {attendanceRow.tutorName}</span>
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
                <div
                  className="mb-4 p-3"
                  style={{ backgroundColor: "#f8f9fa", borderRadius: "6px", border: "1px solid #e9ecef" }}
                >
                  <Row>
                    <Col sm="6">
                      <h6 className="overline-title text-muted mb-1" style={{ fontSize: "0.68rem", letterSpacing: "0.08em" }}>
                        TUTOR NAME
                      </h6>
                      <p className="mb-0 fw-medium">{attendanceRow?.tutorName || "—"}</p>
                    </Col>
                    <Col sm="6">
                      <h6 className="overline-title text-muted mb-1" style={{ fontSize: "0.68rem", letterSpacing: "0.08em" }}>
                        SUBJECT
                      </h6>
                      <p className="mb-0 fw-medium">{attendanceRow?.subject || "—"}</p>
                    </Col>
                  </Row>
                  <Row className="mt-2">
                    <Col sm="4">
                      <h6 className="overline-title text-muted mb-1" style={{ fontSize: "0.68rem", letterSpacing: "0.08em" }}>
                        CLASS DATE
                      </h6>
                      <p className="mb-0 fw-medium">{formatDate(attendanceRow?.date)}</p>
                    </Col>
                    <Col sm="4">
                      <h6 className="overline-title text-muted mb-1" style={{ fontSize: "0.68rem", letterSpacing: "0.08em" }}>
                        START TIME
                      </h6>
                      <p className="mb-0">{formatTime(attendanceRow?.startTime)}</p>
                    </Col>
                    <Col sm="4">
                      <h6 className="overline-title text-muted mb-1" style={{ fontSize: "0.68rem", letterSpacing: "0.08em" }}>
                        END TIME
                      </h6>
                      <p className="mb-0">{formatTime(attendanceRow?.endTime)}</p>
                    </Col>
                  </Row>
                </div>

                <hr className="mb-4" />

                <Row className="g-3">
                  <Col sm="6">
                    <FormGroup>
                      <Label>Class Status <span className="text-danger">*</span></Label>
                      <Input
                        type="select"
                        value={attendanceFormData.eventStatus}
                        onChange={(e) => setAttendanceFormData((prev) => ({ ...prev, eventStatus: e.target.value }))}
                        disabled={savingAttendance}
                      >
                        {classStatusOptions.map((item) => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </Input>
                    </FormGroup>
                  </Col>

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
                        <p className="text-danger mt-1" style={{ fontSize: "0.8rem" }}>{attendanceDateError}</p>
                      )}
                    </FormGroup>
                  </Col>

                  <Col sm="6">
                    <FormGroup>
                      <Label>Document Type</Label>
                      <Input
                        type="select"
                        value={attendanceFormData.documentTypeId}
                        onChange={(e) => setAttendanceFormData((prev) => ({ ...prev, documentTypeId: e.target.value }))}
                        disabled={savingAttendance}
                      >
                        {documentTypeOptions.map((item) => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </Input>
                    </FormGroup>
                  </Col>

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

                  <Col sm="6">
                    <FormGroup>
                      <Label>Feedback / Comments</Label>
                      <Input
                        type="textarea"
                        rows="3"
                        value={attendanceFormData.noteText}
                        onChange={(e) => setAttendanceFormData((prev) => ({ ...prev, noteText: e.target.value }))}
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

        {/* ══════════════════════════════════════════════════════════════════════
            Generate Payslip Modal
        ══════════════════════════════════════════════════════════════════════ */}
        <Modal isOpen={openInvoiceModal} toggle={() => setOpenInvoiceModal(false)} size="xl" style={{ maxWidth: "900px" }}>
          <ModalHeader toggle={() => setOpenInvoiceModal(false)}>
            <div>
              <span style={{ color: "#854fff", fontWeight: 600 }}>Generate Payslip</span>
              {invoiceGroup && (
                <div style={{ fontSize: "0.82rem", fontWeight: 400, marginTop: "3px", color: "#555" }}>
                  <span style={{ color: "#1ee0ac" }}>{invoiceGroup.tutorName}</span>
                  <span style={{ margin: "0 6px", color: "#aaa" }}>·</span>
                  <span style={{ color: "#09c2de" }}>{invoiceGroup.monthLabel} {invoiceGroup.year}</span>
                </div>
              )}
            </div>
          </ModalHeader>
          <ModalBody style={{ minHeight: "420px" }}>
            {invoiceGroup && (
              <>
                <h6 className="mb-3">
                  Student &amp; Subject Summary
                  <span className="ms-2 badge" style={{ backgroundColor: "#854fff", color: "#fff", fontSize: "0.8rem" }}>
                    {invoiceGroup.rows.length} {invoiceGroup.rows.length === 1 ? "class" : "classes"}
                  </span>
                </h6>
                <div style={{ overflowX: "auto" }}>
                  <Table bordered size="sm">
                    <thead style={{ backgroundColor: "#f8f9fa" }}>
                      <tr>
                        <th>Student</th>
                        <th>Subject</th>
                        <th style={{ textAlign: "right" }}>Tutor Rate (₹/hour)</th>
                        <th style={{ textAlign: "center" }}>Total Classes</th>
                        <th style={{ textAlign: "center" }}>Completed</th>
                        <th style={{ textAlign: "center" }}>Tutor Absent</th>
                        <th style={{ textAlign: "right" }}>Total Amt (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceGroup.childGroupList?.map((cg, idx) => (
                        <tr key={cg.key || idx}>
                          <td>{cg.studentName}</td>
                          <td>{cg.subject}</td>
                          <td style={{ textAlign: "right" }}>
                            {cg.tutorPayment > 0 ? cg.tutorPayment.toLocaleString("en-IN") : "-"}
                          </td>
                          <td style={{ textAlign: "center" }}>{cg.totalClasses}</td>
                          <td style={{ textAlign: "center", color: "#1ee0ac" }}>{cg.completedClasses}</td>
                          <td style={{ textAlign: "center", color: cg.tutorAbsent > 0 ? "#e85347" : "#6c757d" }}>
                            {cg.tutorAbsent}
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 600 }}>
                            {cg.totalTutorPayment.toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ backgroundColor: "#f8f9fa", fontWeight: 600 }}>
                        <td colSpan={6} style={{ textAlign: "right" }}>Total Payslip Amount:</td>
                        <td style={{ textAlign: "right", color: "#2c7a2c" }}>
                          ₹{invoiceGroup.totalPayslipAmount?.toLocaleString("en-IN") ?? 0}
                        </td>
                      </tr>
                    </tfoot>
                  </Table>
                </div>
              </>
            )}
          </ModalBody>
          <ModalFooter>
            <Button color="light" onClick={() => setOpenInvoiceModal(false)} disabled={generatingInvoice}>
              Cancel
            </Button>
            <Button color="success" onClick={onConfirmGeneratePayslip} disabled={generatingInvoice}>
              {generatingInvoice ? (
                <>
                  <Spinner size="sm" className="me-1" /> Generating...
                </>
              ) : (
                <>
                  <Icon name="file-text" className="me-1" />
                  Generate Payslip
                </>
              )}
            </Button>
          </ModalFooter>
        </Modal>
      </Content>
    </>
  );
};

// ─── Module-level constants ───────────────────────────────────────────────────
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
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function toYesNo(value) {
  if (value === null || value === undefined) return "-";
  return value ? "Yes" : "No";
}

export default TCTTutorOprList;
