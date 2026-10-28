import React, { useEffect, useState } from "react";
import {
  Block, BlockBetween, BlockHead, BlockHeadContent, BlockTitle, Icon, CustomReactDataTable, Spinner
} from "../../../components/Component";
import {
  DropdownMenu, DropdownToggle, UncontrolledDropdown, Modal, ModalHeader, ModalBody, ModalFooter, Table, Button, Row, Col, FormGroup
} from "reactstrap";
import Content from "../../../layout/content/Content";
import { getTutorAccountStatus, getTutorScheduleSummaryById } from "../../../apiservices/DashboardService";
import { generateTutorInvoice } from "../../../apiservices/ScheduleService";
import Head from "../../../layout/head/Head";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { ToastContainer } from "react-toastify";
import { toast } from "react-toastify";
import { usePermissions } from "../../../hooks/usePermissions";

const AccountsTutorList = () => {
  const { can } = usePermissions();
  const canViewTutorDetails =
    can("Accounts Tutor List", "view") || can("Tutor List", "view");
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [tutorAccountStatusSource, setTutorAccountStatusSource] = useState();
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
  const [tutorScheduleData, setTutorScheduleData] = useState(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);

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

  const fetchTutorData = async () => {
    setDataLoading(true);
    try {
      const res = await getTutorAccountStatus();

      if (Array.isArray(res.data)) {
        setTutorAccountStatusSource(res.data);
        toast.success("Tutor data loaded successfully");
      } else {
        toast.error("Unexpected response format");
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.statusText ||
        error.message ||
        "Something went wrong";
      toast.error(`Error loading tutor data: ${errorMessage}`);
    } finally {
      setDataLoading(false);
    }
  };

  const fetchTutorScheduleSummary = async (tutorId, month = selectedMonth, year = selectedYear) => {
    setScheduleLoading(true);
    try {
      const data = await getTutorScheduleSummaryById(tutorId, month, year);
      setTutorScheduleData(data);

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
      toast.error(`Error loading tutor schedule: ${error.message || "Something went wrong"}`);
      setTutorScheduleData(null);
      setFilteredEnrolledCourses([]);
    } finally {
      setScheduleLoading(false);
    }
  };

  const closeViewDetailsModal = () => {
    setOpenViewDetailsModal(false);
    setSelectedStudentId(defaultGuid);
    setSelectedStudentName("");
    setTutorScheduleData(null);
    setFilteredEnrolledCourses([]);
  };

  // Updated onEditHandler to handle view details
  const onEditHandler = async (tutorId) => {
    try {
      const tutorData = tutorAccountStatusSource?.find(tutor => tutor.tutorId === tutorId);

      if (tutorData) {
        setSelectedStudentId(tutorId);
        setSelectedStudentName(tutorData.tutorName);

        // Set current month and year as default
        const currentDate = new Date();
        const currentMonth = months[currentDate.getMonth()].value;
        const currentYear = currentDate.getFullYear();

        setSelectedMonth(currentMonth);
        setSelectedYear(currentYear);

        setOpenViewDetailsModal(true);

        // Fetch tutor schedule summary with current month and year
        await fetchTutorScheduleSummary(tutorId, currentMonth, currentYear);
      }
    } catch (error) {
      toast.error(`Error opening tutor details: ${error.message || "Something went wrong"}`);
    }
  };

  const openPayslip = (invoiceNumber) => {
    if (!invoiceNumber) return;
    const url = `${process.env.PUBLIC_URL}/lms/tutors/tutor-invoice-details?invNumber=${encodeURIComponent(invoiceNumber)}&from=accounts`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleViewAllInvoices = () => {
    const invoiceNumbers = [...new Set(
      filteredEnrolledCourses.map(course => course.invoiceNumber).filter(Boolean)
    )];

    if (invoiceNumbers.length === 0) {
      toast.info("No payslip has been generated for this tutor and month.");
      return;
    }

    invoiceNumbers.forEach(openPayslip);
  };

  const handleMonthChange = async (newMonth) => {
    setSelectedMonth(newMonth);
    if (selectedStudentId !== defaultGuid && openViewDetailsModal) {
      await fetchTutorScheduleSummary(selectedStudentId, newMonth, selectedYear);
    }
  };

  const handleYearChange = async (newYear) => {
    setSelectedYear(newYear);
    if (selectedStudentId !== defaultGuid && openViewDetailsModal) {
      await fetchTutorScheduleSummary(selectedStudentId, selectedMonth, newYear);
    }
  };

  useEffect(() => {
    fetchTutorData();
  }, [itemPerPage]);

  const dtStudentAccountStatusColumns = [
    {
      name: "TutorName",
      selector: (row) => row.tutorName,
      sortable: true,
      width: "300px"
    },
    {
      name: "Phone",
      selector: (row) => row.phone,
      sortable: true,
      width: "200px"
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
      cell: (row) =>
        canViewTutorDetails ? (
          <UncontrolledDropdown>
            <DropdownToggle color="transparent" className="dropdown-toggle btn btn-icon btn-trigger mr-n1">
              <Icon name="more-h" />
            </DropdownToggle>
            <DropdownMenu right>
              <ul className="link-list-opt no-bdr">
                <li>
                  <Link onClick={() => onEditHandler(row.tutorId)}>
                    <Icon name="eye" />
                    <span>Payroll Details</span>
                  </Link>
                </li>
              </ul>
            </DropdownMenu>
          </UncontrolledDropdown>
        ) : null,
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
        fetchTutorData();
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
        data={tutorAccountStatusSource}
        columns={dtStudentAccountStatusColumns}
        pagination={true}
        className="nk-tb-list"
        canShowFilter={true}
        selectableRows={false}
        expandableRows={false}
        actions={true}
        searchableFields={searchableFields}
        downloadFileName="Student_List"
        loading={dataLoading}
        loadingMessage="Loading tutor data..."
      />
    );
  };
  const handleGenerateAllInvoices = async () => {
    setIsGeneratingInvoice(true);
    try {
      const tutorUserId = filteredEnrolledCourses[0]?.userId;
      const inputMonth = months.findIndex(item => item.value === selectedMonth) + 1;
      const createdBy = localStorage.getItem("userId");

      if (!tutorUserId || inputMonth <= 0 || !createdBy) {
        toast.error("Tutor, month, or logged-in user information is missing.");
        return;
      }

      const result = await generateTutorInvoice(Number(selectedYear), inputMonth, tutorUserId, createdBy);
      if (result?.emailError) {
        toast.warning(`Payslip generated, but the email could not be sent: ${result.emailError}`);
      } else {
        toast.success(result?.invoiceNumber
          ? `Payslip ${result.invoiceNumber} generated successfully.`
          : "Payslip generated successfully.");
      }
      await fetchTutorScheduleSummary(selectedStudentId, selectedMonth, selectedYear);
    } catch (error) {
      const message = error?.response?.data?.message || error?.response?.data || error?.message || "Failed to generate payslip.";
      toast.error(typeof message === "string" ? message : "Failed to generate payslip.");
    } finally {
      setIsGeneratingInvoice(false);
    }
  };
  return (
    <>
      <Head title="Tutor List" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle tag="h5">Tutor List</BlockTitle>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        <Block>
          <RenderGrid />
        </Block>

        <Modal isOpen={openViewDetailsModal} toggle={closeViewDetailsModal} size="xl" style={{ maxWidth: '95vw' }}>
          <ModalHeader toggle={closeViewDetailsModal}>
            <span className="ml-2" style={{ color: "#854fff" }}>Tutor Payroll — </span>
            <span style={{ color: "#09c2de" }}> {selectedStudentName}</span>
            <span style={{ color: "#854fff" }}> — {selectedMonth} {selectedYear}</span>
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
                  {scheduleLoading ? "Loading tutor data..." : "Generating Invoice..."}
                </div>
              </div>
            )}

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
                    disabled={
                      isGeneratingInvoice ||
                      scheduleLoading ||
                      filteredEnrolledCourses.length === 0 ||
                      filteredEnrolledCourses.some(course => Boolean(course.invoiceNumber))
                    }
                    onClick={() => handleGenerateAllInvoices()}
                  >
                    <Icon name="file-text" className="me-2"></Icon>
                    Generate Payslip
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
                    onClick={() => handleViewAllInvoices()}
                  >
                    <Icon name="eye" className="me-2"></Icon>
                    View Payslips
                  </Button>

                  {/* View Student Schedule */}
                  <Link
                    target="_blank"
                    to={`${process.env.PUBLIC_URL}/tct-tutor-calender/?id=${filteredEnrolledCourses[0]?.userId || filteredEnrolledCourses[0]?.tutorId}&tutorName=${encodeURIComponent(selectedStudentName || filteredEnrolledCourses[0]?.tutorName || "Tutor")}&month=${months.findIndex(item => item.value === selectedMonth) + 1}&year=${selectedYear}`}
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

            {/* Simplified Table - removed per-row action buttons */}
            <div className="table-responsive" style={{ overflowX: 'auto', maxWidth: '100%', paddingTop: '10px' }}>
              <Table className="table table-striped" style={{ minWidth: '100%', fontSize: '0.875rem' }}>
                <thead className="thead-dark">
                  <tr>
                    <th style={{ minWidth: '80px' }}>Subject</th>
                    <th style={{ minWidth: '80px' }}>Student</th>
                    <th style={{ minWidth: '100px' }}>Type</th>
                    <th style={{ minWidth: '120px' }}>No. of Classes</th>
                    <th style={{ minWidth: '100px' }}>Planned Hours</th>
                    <th style={{ minWidth: '100px' }}>Student Attendance</th>
                    <th style={{ minWidth: '100px' }}>Tutor Attendance</th>
                    <th style={{ minWidth: '100px' }}>Difference</th>
                    <th style={{ minWidth: '80px' }}>Amount</th>
                    <th style={{ minWidth: '100px' }}>Total Amount</th>
                    <th style={{ minWidth: '150px' }}>Payslip Amount</th>
                    <th style={{ minWidth: '100px' }}>Payslip Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEnrolledCourses.length > 0 ? (
                    filteredEnrolledCourses.map((details, index) => (
                      <tr key={index}>
                        <td>{details.subject || details.subjectName || '-'}</td>
                        <td>{details.studentName || details.studentName || '-'}</td>
                        <td>{details.scheduleType || details.type || '-'}</td>
                        <td>{details.numberOfClasses || details.classCount || '-'}</td>
                        <td>{details.totalHours || '-'}</td>
                        <td>{details.studentHours || '-'}</td>
                        <td>{details.tutorHours || '-'}</td>
                        <td>{(details.tutorHours - details.totalHours) || '-'}</td>
                        <td>₹{Number(details.parentPayment || details.amount || 0).toLocaleString('en-IN')}</td>
                        <td>₹{Number(details.totalParentPayment || 0).toLocaleString('en-IN')}</td>
                        <td>₹{Number(details.totalInvoiceAmount || details.invoiceAmount || 0).toLocaleString('en-IN')}</td>
                        <td>
                          {!details.invoiceNumber ? (
                            <span className="badge text-warning">Pending</span>
                          ) : (
                            <span className="badge text-success">Generated</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="11" className="text-center">
                        {scheduleLoading ? "Loading..." : "No records found"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          </ModalBody>
        </Modal>
        <ToastContainer />
      </Content>
    </>
  );
};

export default AccountsTutorList;
