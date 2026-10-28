import React, { useEffect, useState, useRef } from "react";
import { DropdownMenu, DropdownToggle, FormGroup, UncontrolledDropdown, DropdownItem, Breadcrumb, BreadcrumbItem, Modal, ModalHeader, ModalBody, ModalFooter, Table } from "reactstrap";
import { Block, BlockBetween, BlockHead, BlockHeadContent, Icon, Button, BlockTitle, ReactDataTable, TooltipComponent, Row, Col, RSelect, } from "../../../components/Component";
import Content from "../../../layout/content/Content";
import Head from "../../../layout/head/Head";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import UserAvatar1 from "../../../components/user/UserAvatar1";
import { findUpper1, getColor } from "../../../utils/Utils";
import { getEnrolledCouse, GetBoardViseStudentList, DownloadExcel, getStudentSchedulesForInvoice } from "../../../apiservices/StudentEnrollmentService";
import { getLookups } from "../../../apiservices/LookupsService";
import { getTCTBankDetails, updateTCTBankDetailToStudent } from "../../../apiservices/BankService";
import { createStudetnInvoice, viewStudentInvoice, getStudentInvoice } from "../../../apiservices/ScheduleService";
import { ToastContainer } from "react-toastify";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import PaymentPlanModal from "./PaymentPlanModal";

const StudentSchedule = () => {
  const [sm, updateSm] = useState(false);
  const [studentDataSource, setStudentDataSource] = useState();
  const [dataSource, setDataSource] = useState();
  const [openCourseModal, setOpenCourseModal] = useState(false);
  const [openBankModal, setOpenBankModal] = useState(false);
  const [openAudioModal, setOpenAudioModal] = useState(false);
  const [audioContent, setaudioContent] = useState();
  const [courseList, setCourseList] = useState([]);
  const [bankList, setBankList] = useState([]);
  const userRole = localStorage.getItem("userRole");
  const defaultGuid = "00000000-0000-0000-0000-000000000000";
  const [gradeList, setGradeList] = useState([]);
  const searchParams = new URLSearchParams(new URL(window.location.href).search);
  const [boardId, setBoardId] = useState(searchParams.get("boardId") || defaultGuid);
  const [selectedStudentId, setSelectedStudentId] = useState(defaultGuid);
  const [selectedStudentName, setSelectedStudentName] = useState("");
  const [selectedBoardName, setSelectedBoardName] = useState("");
  const [selectedGradeName, setSelectedGradeName] = useState("");
  const [boardName, setBoardName] = useState(searchParams.get("name"));
  const [subjectName, setSubjectName] = useState("All");
  const [gradeName, setGradeName] = useState("All");
  const [gradeId, setGradeId] = useState(defaultGuid);
  const [subjectId, setSubjectId] = useState(defaultGuid);
  const [courseList1, setCourseList1] = useState([]);
  const [boardList, setBoardList] = useState([]);
  const dropdownRef = useRef(null);
  const [tablesm, updateTableSm] = useState(false);
  const [onSearch, setonSearch] = useState(true);
  const [onSearchText, setSearchText] = useState("");
  const [sort, setSortState] = useState("");
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [paymentPlanCourse, setPaymentPlanCourse] = useState(null);
  const canManagePackage = ["Accounts", "AccountsAdmin", "Payroll", "PayrollAdmin", "SuperAdmin"].includes(userRole);

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
    { value: "December", label: "December" },
  ];

  const years = () => {
    const currentYear = new Date().getFullYear();
    const yearsList = [];
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
      yearsList.push({ value: String(i), label: String(i) });
    }
    return yearsList;
  };

  const [enrolledCoursesData, setEnrolledCoursesData] = useState([]);
  const monthlyInvoiceNumber = enrolledCoursesData.find((course) => course.invoiceNumber)?.invoiceNumber;
  const hasPackage = enrolledCoursesData.some(course => course.scheduledPackageMonths > 1);

  const [formData, setFormData] = useState({
    StudentId: defaultGuid,
    Id: defaultGuid,
    UserId: localStorage.getItem("userId")
  });

  const toggle = () => setonSearch(!onSearch);

  const sortFunc = (params) => {
    let defaultData = dataSource;
    if (params === "asc") {
      let sortedData = defaultData.sort((a, b) => a.studentName.localeCompare(b.studentName));
      setStudentDataSource([...sortedData]);
    } else if (params === "dsc") {
      let sortedData = defaultData.sort((a, b) => b.studentName.localeCompare(a.studentName));
      setStudentDataSource([...sortedData]);
    }
  };

  const getCurrentMonth = () => {
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    return monthNames[new Date().getMonth()];
  };

  const getCurrentYear = () => String(new Date().getFullYear());

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [selectedYear, setSelectedYear] = useState(getCurrentYear());

  // ✅ Convert month name to number (January=1, February=2, ...)
  const getMonthNumber = (monthName) => {
    return months.findIndex(m => m.value === monthName) + 1;
  };

  // ✅ Shared fetch function used by modal open + navigation
  const fetchScheduleData = async (studentId, monthName, year) => {
    try {
      setLoadingInvoices(true);
      const monthNumber = getMonthNumber(monthName);
      const response = await getStudentSchedulesForInvoice(studentId, monthNumber, parseInt(year));
      const data = response.data ?? response;
      setEnrolledCoursesData(data);
    } catch (error) {
      console.error("Error fetching student schedules:", error);
      setEnrolledCoursesData([]);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const openEnrolledCoursesModal = async (studentId, studentName, boardName, gradeName) => {
    const currentMonth = getCurrentMonth();
    const currentYear = getCurrentYear();
    setSelectedStudentId(studentId);
    setSelectedStudentName(studentName);
    setSelectedBoardName(boardName);
    setSelectedGradeName(gradeName);
    setSelectedMonth(currentMonth);
    setSelectedYear(currentYear);
    setOpenCourseModal(true);
    await fetchScheduleData(studentId, currentMonth, currentYear);
  };

  const closeEnrolledCoursesModal = () => {
    setOpenCourseModal(false);
    setSelectedStudentId(defaultGuid);
    setSelectedStudentName("");
    setEnrolledCoursesData([]);
  };

  // ✅ Month navigation with re-fetch
  const handleMonthPrev = async () => {
    const currentIndex = months.findIndex(m => m.value === selectedMonth);
    const newIndex = currentIndex > 0 ? currentIndex - 1 : months.length - 1;
    const newMonth = months[newIndex].value;
    setSelectedMonth(newMonth);
    await fetchScheduleData(selectedStudentId, newMonth, selectedYear);
  };

  const handleMonthNext = async () => {
    const currentIndex = months.findIndex(m => m.value === selectedMonth);
    const newIndex = currentIndex < months.length - 1 ? currentIndex + 1 : 0;
    const newMonth = months[newIndex].value;
    setSelectedMonth(newMonth);
    await fetchScheduleData(selectedStudentId, newMonth, selectedYear);
  };

  // ✅ Year navigation with re-fetch
  const handleYearPrev = async () => {
    const yearsList = years();
    const currentIndex = yearsList.findIndex(y => y.value === selectedYear);
    if (currentIndex > 0) {
      const newYear = yearsList[currentIndex - 1].value;
      setSelectedYear(newYear);
      await fetchScheduleData(selectedStudentId, selectedMonth, newYear);
    }
  };

  const handleYearNext = async () => {
    const yearsList = years();
    const currentIndex = yearsList.findIndex(y => y.value === selectedYear);
    if (currentIndex < yearsList.length - 1) {
      const newYear = yearsList[currentIndex + 1].value;
      setSelectedYear(newYear);
      await fetchScheduleData(selectedStudentId, selectedMonth, newYear);
    }
  };

  const handleGenerateInvoice = async () => {
    if (hasPackage && !canManagePackage) return;
    if (enrolledCoursesData.length === 0 || isGeneratingInvoice || (monthlyInvoiceNumber && !hasPackage)) return;
    const missingPackage = enrolledCoursesData.find(course => course.scheduledPackageMonths > 1 &&
      (!course.paymentPlanId || course.paymentPlanMonths !== course.scheduledPackageMonths));
    if (missingPackage) {
      setPaymentPlanCourse(missingPackage);
      toast.info("Confirm the full-package fee and included classes before generating the invoice.");
      return;
    }
    setIsGeneratingInvoice(true);

    const course = enrolledCoursesData[0];
    const unapprovedCourse = enrolledCoursesData.find((item) => !item.accountsApprovalScheduleStatus);
    const mismatchedCourse = enrolledCoursesData.find((item) => Number(item.agreedFeesPerHour) !== Number(item.parentPayment));

    const inputData = {
      studentId: course.studentId,
      month: course.month,
      year: course.year,
      createdBy: localStorage.getItem("userId")
    };

    if (unapprovedCourse) {
      Swal.fire({
        title: 'Alert!',
        html: `Accounts has not yet approved the class scheduled. <br />
           <a href="/tct-student-calendar?id=${unapprovedCourse.userId}&stuName=${unapprovedCourse.studentName}&grade=${unapprovedCourse.grade}&board=${unapprovedCourse.board}&month=${getMonthNumber(selectedMonth)}&year=${selectedYear}" target="_blank" style="color: #3085d6; font-weight: bold; text-decoration: underline;">
           Click here</a> to View & Approve Schedule.`,
        icon: 'warning',
        confirmButtonText: 'OK'
      }).then(async (result) => {
        if (result.isConfirmed) {
          // Re-fetch data to check if 'accountsApprovalScheduleStatus' is now updated
          await fetchScheduleData(course.studentId, selectedMonth, selectedYear);
        }
      });

      setIsGeneratingInvoice(false);
      return;
    }

    if (mismatchedCourse) {
      Swal.fire({
        title: 'Alert!',
        text: 'Fees per hour and parent payment do not match for the subject. Ask Student to complete the registration form.',
        icon: 'error',
        confirmButtonText: 'OK'
      }).then(async (result) => {
        if (result.isConfirmed) {
          // This "reloads" the modal content by fetching fresh data from the server
          await fetchScheduleData(course.studentId, selectedMonth, selectedYear);
          
          // Optional: Show a small toast to let the user know the data was refreshed
          toast.info("Data refreshed.");
        }
      });
      
      setIsGeneratingInvoice(false);
      return;
    }

    try {
      const result = await createStudetnInvoice(inputData);
      if (result?.success === false || result?.succeeded === false) throw new Error(result.message || "Invoice generation failed.");
      toast.success(result?.message || "Invoice generated successfully.");
      await fetchScheduleData(course.studentId, selectedMonth, selectedYear);
    } catch (error) {
      console.error("Error:", error);
      toast.error(error?.response?.data?.message || error?.message || "Invoice could not be generated.");
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const handleViewInvoice = (invNumber) => {
    viewStudentInvoice(invNumber)
      .then(response => {
        console.log("Response received:", response);
        toast.success("Invoice viewed successfully.");
      })
      .catch(error => {
        toast.error("An error occurred while processing your request.");
      });
  };

  useEffect(() => {
    getLookups("300").then((response) => {
      let temp = [];
      temp.push({ value: defaultGuid, label: "Select grade" });
      response.forEach((s) => {
        temp.push({ value: s?.id, label: s?.typeCodeName });
      });
      setGradeList(temp);
    });

    getLookups("400").then((response) => {
      let temp = [];
      temp.push({ value: defaultGuid, label: "Select subject" });
      response.forEach((s) => {
        temp.push({ value: s?.id, label: s?.typeCodeName, id: s?.id });
      });
      setBoardList(temp);
    });

    getLookups("500").then((response) => {
      let temp = [];
      temp.push({ value: defaultGuid, label: "Select subject" });
      response.forEach((s) => {
        temp.push({ value: s?.id, label: s?.typeCodeName });
      });
      setCourseList1(temp);
    });

    GetBoardViseStudents("");
  }, []);

  const GetBoardViseStudents = (_filterText) => {
    if (gradeId != defaultGuid) {
      const temp = [...dtStudentColumns];
      var index = temp.findIndex((s) => s.name == "Grade");
      if (index != -1) {
        temp[index]["omit"] = "grade";
        setDtStudentColumns(temp);
      }
    } else {
      const temp = [...dtStudentColumns];
      var index = temp.findIndex((s) => s.name == "Grade");
      if (index != -1) {
        temp[index]["omit"] = "";
        setDtStudentColumns(temp);
      }
    }
    GetBoardViseStudentList(boardId, gradeId, subjectId, _filterText).then((data) => {
      setDataSource(data);
      setStudentDataSource(data);
      document.body.click();
    });
  };

  const [dtStudentColumns, setDtStudentColumns] = useState([
    {
      name: "Stu. Name",
      selector: (row) => row.studentName,
      grow: 2,
      style: { paddingRight: "20px" },
      cell: (row) => (
        <Link className="user-card mt-2 mb-2" to={`${process.env.PUBLIC_URL}/student-profile-regular?id=${row.id}`}>
          <UserAvatar1
            image={getImageSource(row)}
            theme={getColor(row.studentName)}
            text={findUpper1(row.studentName)}
          ></UserAvatar1>
          <div className="user-info">
            <span className="tb-lead">{row.studentName}{" "}</span>
            {row.mobileNumber && <span>{row.mobileNumber}</span>}
          </div>
        </Link>
      ),
      sortable: true,
    },
    {
      name: "Board",
      selector: (row) => row.board,
      cell: (row) => <span>{row.board}</span>,
    },
    {
      name: "Grade",
      selector: (row) => row.grade,
      cell: (row) => <span>{row.grade}</span>,
    },
    {
      name: "Phone",
      selector: (row) => row.mobileNumber,
      cell: (row) => <span>{row.mobileNumber.replace(" ", "")}</span>,
    },
    {
      name: "Enroll. Date",
      selector: (row) => row.enrollmentDate,
      sortable: true,
      cell: (row) => <span>{row.enrollmentDate}</span>,
      hide: "md",
    },
    {
      name: userRole == "Coordinator" ? "" : "Actions",
      selector: (row) => row.status,
      cell: (row) => (
        <>
          <Button
            className="btn btn-trigger btn-icon"
            onClick={() => openEnrolledCoursesModal(row.id, row.studentName, row.board, row.grade)}
          >
            <TooltipComponent
              tag="span"
              containerClassName="btn btn-trigger btn-icon"
              id={"add" + row.id}
              icon="icon ni ni-book"
              direction="top"
              text="Enrolled Courses"
            />
          </Button>
        </>
      ),
      hide: "md",
    },
  ]);

  const { handleSubmit } = useForm();

  const getImageSource = (data) => {
    if (data.fileData == null || data.fileData == "") return "";
    return `data:image/jpeg;base64, ${data.fileData}`;
  };

  useEffect(() => {
    if (onSearchText !== "") {
      const filteredObject = dataSource?.filter((item) => {
        return (
          item.studentName.toLowerCase().includes(onSearchText.toLowerCase()) ||
          item.emailAddress.toLowerCase().includes(onSearchText.toLowerCase()) ||
          item.mobileNumber.toLowerCase().includes(onSearchText.toLowerCase())
        );
      });
      setStudentDataSource(filteredObject || []);
    } else {
      setStudentDataSource(dataSource);
    }
  }, [onSearchText, dataSource]);

  const onFilterChange = (e) => {
    setSearchText(e.target.value);
    GetBoardViseStudents(e.target.value);
  };

  const exportToExcel = () => {
    DownloadExcel(boardId, gradeId, subjectId, boardName)
      .then((response) => {
        const url = window.URL.createObjectURL(new Blob([response]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `BoardOfferedCourseReport.xlsx`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      })
      .catch((error) => { alert(error); });
  };

  const RenderGrid = (props) => {
    return (
      <ReactDataTable
        canShowFilter={false}
        data={props.dataSource}
        columns={dtStudentColumns}
        pageSize={10}
        pagination
      />
    );
  };

  const onFormCancel = () => setOpenBankModal(false);

  const onFormSubmit = async (form) => {
    const dataToSubmit = {
      UserId: localStorage.getItem("userId"),
      StudentId: selectedStudentId,
      BankDetailId: formData.Id
    };
    updateTCTBankDetailToStudent(dataToSubmit)
      .then(response => {
        toast.success("Bank Details updated successfully.");
        setOpenBankModal(false);
        GetBoardViseStudents("");
      })
      .catch(error => {
        toast.error("An error occurred while processing your request.");
      });
  };

  const itemPerPage = 10;

  return (
    <React.Fragment>
      <Head title="Student List"></Head>
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              {boardId != null || boardId != undefined ? (
                <BlockTitle tag="h4">{boardName} Student Schedules</BlockTitle>
              ) : (
                <BlockTitle tag="h3" page>
                  {userRole == "Coordinator" ? "Enrolled Student List" : "Enrollment list"}
                </BlockTitle>
              )}
            </BlockHeadContent>
            <BlockHeadContent>
              <div className="toggle-wrap nk-block-tools-toggle">
                <Button
                  className={`btn-icon btn-trigger toggle-expand mr-n1 ${sm ? "active" : ""}`}
                  onClick={() => updateSm(!sm)}
                >
                  <Icon name="menu-alt-r"></Icon>
                </Button>
                <div className="toggle-expand-content" style={{ display: sm ? "block" : "none" }}>
                  <ul className="nk-block-tools g-3">
                    <li>
                      <a href="#export" onClick={(ev) => { ev.preventDefault(); exportToExcel(); }} className="btn btn-white btn-outline-light">
                        <Icon name="download-cloud"></Icon>
                        <span>Export</span>
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        {userRole == "Coordinator" && (
          <Block>
            {studentDataSource && <RenderGrid dataSource={studentDataSource} />}
          </Block>
        )}

        {userRole != "Coordinator" && (
          <Block>
            <Row className="">
              <Col size={6}>
                <div title="Board > Grade > Subject" className="entrolled-list card-inner position-relative card-tools-toggle" style={{ marginTop: "4%" }}>
                  <Breadcrumb className="breadcrumb-arrow">
                    <BreadcrumbItem><a href="#">{boardName}</a></BreadcrumbItem>
                    <BreadcrumbItem><a href="#">{gradeName}</a></BreadcrumbItem>
                    <BreadcrumbItem>{subjectName}</BreadcrumbItem>
                  </Breadcrumb>
                </div>
              </Col>
              <Col size={6}>
                <div className="entrolled-list card-inner position-relative card-tools-toggle">
                  <div className="card-title-group">
                    <div className="card-tools"></div>
                    <div className="card-tools mr-n1">
                      <ul className="btn-toolbar gx-1">
                        <li>
                          <a href="#search" onClick={(ev) => { ev.preventDefault(); toggle(); }} className="btn btn-icon search-toggle toggle-search">
                            <Icon name="search"></Icon>
                          </a>
                        </li>
                        <li className="btn-toolbar-sep"></li>
                        <li>
                          <div className="toggle-wrap">
                            <Button className={`btn-icon btn-trigger toggle ${tablesm ? "active" : ""}`} onClick={() => updateTableSm(true)}>
                              <Icon name="menu-right"></Icon>
                            </Button>
                            <div className={`toggle-content ${tablesm ? "content-active" : ""}`}>
                              <ul className="btn-toolbar gx-1">
                                <li className="toggle-close">
                                  <Button className="btn-icon btn-trigger toggle" onClick={() => updateTableSm(false)}>
                                    <Icon name="arrow-left"></Icon>
                                  </Button>
                                </li>
                                <li>
                                  <UncontrolledDropdown innerRef={dropdownRef}>
                                    <DropdownToggle tag="a" className="btn btn-trigger btn-icon dropdown-toggle">
                                      <div className="dot dot-primary"></div>
                                      <Icon name="filter-alt"></Icon>
                                    </DropdownToggle>
                                    <DropdownMenu right className="filter-wg dropdown-menu-xl" style={{ overflow: "visible" }}>
                                      <div className="dropdown-head">
                                        <span className="sub-title dropdown-title">Student Filter</span>
                                        <div className="dropdown">
                                          <DropdownItem href="#more" onClick={(ev) => { ev.preventDefault(); }} className="btn btn-sm btn-icon">
                                            <Icon name="more-h"></Icon>
                                          </DropdownItem>
                                        </div>
                                      </div>
                                      <div className="dropdown-body dropdown-body-rg">
                                        <Row className="gx-6 gy-3">
                                          <Col size={12}>
                                            <label className="overline-title overline-title-alt">Board</label>
                                            <RSelect
                                              dataSource={boardList || []}
                                              value1={boardId}
                                              onChangeHandler={(e) => {
                                                if (e.value == defaultGuid) { setBoardName("All"); }
                                                else { setBoardName(boardList.find((s) => s.value == e.value)?.label); }
                                                setBoardId(e.value);
                                              }}
                                            />
                                          </Col>
                                          <Col size={12}>
                                            <label className="overline-title overline-title-alt">Grade</label>
                                            <RSelect
                                              dataSource={gradeList || []}
                                              value1={gradeId}
                                              menuPlacement="top"
                                              onChangeHandler={(e) => {
                                                if (e.value == defaultGuid) { setGradeName("All"); }
                                                else { setGradeName(gradeList.find((s) => s.value == e.value)?.label); }
                                                setGradeId(e.value);
                                              }}
                                            />
                                          </Col>
                                          <Col size={12}>
                                            <label className="overline-title overline-title-alt">Subject</label>
                                            <RSelect
                                              value1={subjectId}
                                              dataSource={courseList1 || []}
                                              menuPlacement="top"
                                              onChangeHandler={(e) => {
                                                if (e.value == defaultGuid) { setSubjectName("All"); }
                                                else { setSubjectName(courseList1.find((s) => s.value == e.value)?.label); }
                                                setSubjectId(e.value);
                                              }}
                                            />
                                          </Col>
                                          <Col size="12">
                                            <FormGroup className="form-group">
                                              <Button color="secondary" onClick={() => { GetBoardViseStudents(onSearchText); }}>Filter</Button>
                                            </FormGroup>
                                          </Col>
                                        </Row>
                                      </div>
                                    </DropdownMenu>
                                  </UncontrolledDropdown>
                                </li>
                                <li>
                                  <UncontrolledDropdown>
                                    <DropdownToggle tag="a" className="btn btn-trigger btn-icon dropdown-toggle">
                                      <Icon name="setting"></Icon>
                                    </DropdownToggle>
                                    <DropdownMenu right className="dropdown-menu-xs">
                                      <ul className="link-check">
                                        <li><span>Show</span></li>
                                        <li className={itemPerPage === 10 ? "active" : ""}>
                                          <DropdownItem tag="a" href="#dropdownitem" onClick={(ev) => { ev.preventDefault(); }}>10</DropdownItem>
                                        </li>
                                        <li className={itemPerPage === 15 ? "active" : ""}>
                                          <DropdownItem tag="a" href="#dropdownitem" onClick={(ev) => { ev.preventDefault(); }}>15</DropdownItem>
                                        </li>
                                      </ul>
                                      <ul className="link-check">
                                        <li><span>Order</span></li>
                                        <li className={sort === "dsc" ? "active" : ""}>
                                          <DropdownItem tag="a" href="#dropdownitem" onClick={(ev) => { ev.preventDefault(); setSortState("dsc"); sortFunc("dsc"); }}>DESC</DropdownItem>
                                        </li>
                                        <li className={sort === "asc" ? "active" : ""}>
                                          <DropdownItem tag="a" href="#dropdownitem" onClick={(ev) => { ev.preventDefault(); setSortState("asc"); sortFunc("asc"); }}>ASC</DropdownItem>
                                        </li>
                                      </ul>
                                    </DropdownMenu>
                                  </UncontrolledDropdown>
                                </li>
                              </ul>
                            </div>
                          </div>
                        </li>
                      </ul>
                    </div>
                  </div>
                  <div className={`card-search search-wrap ${!onSearch && "active"}`}>
                    <div className="card-body">
                      <div className="search-content">
                        <Button className="search-back btn-icon toggle-search active" onClick={() => { setSearchText(""); toggle(); }}>
                          <Icon name="arrow-left"></Icon>
                        </Button>
                        <input
                          type="text"
                          className="border-transparent form-focus-none form-control"
                          placeholder="Search by user or email"
                          value={onSearchText}
                          onChange={(e) => onFilterChange(e)}
                        />
                        <Button className="search-submit btn-icon"><Icon name="search"></Icon></Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Col>
            </Row>

            {/* ✅ Full page loader - only shows during invoice data load */}
            {loadingInvoices && !openCourseModal && (
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255, 255, 255, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, flexDirection: 'column' }}>
                <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} role="status">
                  <span className="sr-only">Loading...</span>
                </div>
                <div className="mt-3 text-primary fw-bold">Loading Details........</div>
              </div>
            )}

            {studentDataSource && <RenderGrid dataSource={studentDataSource} />}
          </Block>
        )}

        {/* Enrolled Courses Modal */}
        <Modal isOpen={openCourseModal} toggle={closeEnrolledCoursesModal} size="xl">
          <ModalHeader toggle={closeEnrolledCoursesModal}>
            <Icon name="book"></Icon>
            <span className="ml-2" style={{ color: "#854fff" }}>Schedules &amp; Billing for </span>
            <span style={{ color: "#09c2de" }}> {selectedStudentName} ({selectedBoardName}/{selectedGradeName}) for the period {selectedMonth} {selectedYear}</span>
          </ModalHeader>
          <ModalBody style={{ position: 'relative' }}>

            {/* ✅ Modal loader overlay - shows during navigation/generate */}
            {(isGeneratingInvoice || loadingInvoices) && (
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255, 255, 255, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, flexDirection: 'column' }}>
                <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} role="status">
                  <span className="sr-only">Loading...</span>
                </div>
                <div className="mt-3 text-primary fw-bold">
                  {isGeneratingInvoice ? "Generating Invoice..." : "Loading..."}
                </div>
              </div>
            )}

            {/* ✅ Month and Year Navigation */}
            <Row className="gy-3 mb-4">
              <Col size="sm" md="4">
                <FormGroup>
                  <div className="d-flex align-items-center">
                    <label className="form-label me-3 mb-0" style={{ minWidth: '50px' }}>Month:</label>
                    <div className="d-flex align-items-center">
                      <Button color="light" size="sm" className="me-2" disabled={isGeneratingInvoice || loadingInvoices} onClick={handleMonthPrev}>
                        <Icon name="chevron-left"></Icon>
                      </Button>
                      <div className="text-center" style={{ minWidth: '100px', fontWeight: '500' }}>
                        {selectedMonth}
                      </div>
                      <Button color="light" size="sm" className="ms-2" disabled={isGeneratingInvoice || loadingInvoices} onClick={handleMonthNext}>
                        <Icon name="chevron-right"></Icon>
                      </Button>
                    </div>
                  </div>
                </FormGroup>
              </Col>

              <Col size="sm" md="4">
                <FormGroup>
                  <div className="d-flex align-items-center">
                    <label className="form-label me-3 mb-0" style={{ minWidth: '40px' }}>Year:</label>
                    <div className="d-flex align-items-center">
                      <Button color="light" size="sm" className="me-2" disabled={isGeneratingInvoice || loadingInvoices} onClick={handleYearPrev}>
                        <Icon name="chevron-left"></Icon>
                      </Button>
                      <div className="text-center" style={{ minWidth: '80px', fontWeight: '500' }}>
                        {selectedYear}
                      </div>
                      <Button color="light" size="sm" className="ms-2" disabled={isGeneratingInvoice || loadingInvoices} onClick={handleYearNext}>
                        <Icon name="chevron-right"></Icon>
                      </Button>
                    </div>
                  </div>
                </FormGroup>
              </Col>
            </Row>

            {/* Table */}
            <div className="table-responsive" style={{ overflowX: 'auto', maxWidth: '100%', paddingTop: '10px' }}>
              <Table className="table table-striped" style={{ minWidth: '100%', fontSize: '0.875rem' }}>
                <thead className="thead-dark">
                  <tr>
                    <th style={{ minWidth: '80px' }}>Subject</th>
                    <th style={{ minWidth: '80px' }}>Amount</th>
                    <th style={{ minWidth: '120px' }}>No. of Classes</th>
                    <th style={{ minWidth: '100px' }}>Type</th>
                    <th style={{ minWidth: '100px' }}>Total Amt</th>
                    <th style={{ minWidth: '150px' }}>Invoice Total Amt</th>
                    <th style={{ minWidth: '150px' }}>Schedule Classes</th>
                  </tr>
                </thead>
                <tbody>
                  {enrolledCoursesData.length > 0 ? (
                    enrolledCoursesData.map((course, index) => (
                      <tr key={index}>
                        <td>{course.subject}
                          {course.scheduledPackageMonths > 1 && <div className="mt-2">
                            <strong>{course.scheduledPackageMonths}-month package</strong>
                            <div>Starts {course.packageStartMonth}/{course.packageStartYear}</div>
                            {course.packageTotalFee != null && <div>Full fee: ₹{Number(course.packageTotalFee).toLocaleString('en-IN')} · {course.packageTotalClasses ?? 'Unconfirmed'} classes</div>}
                            {canManagePackage && <Button color="secondary" size="sm" className="mt-1" onClick={() => setPaymentPlanCourse(course)}>Package Billing</Button>}
                            {course.packageInvoiceNumber && <div><Link target="_blank" to={`${process.env.PUBLIC_URL}/lms/students/student-invoice-details?invNumber=${encodeURIComponent(course.packageInvoiceNumber)}`}>View full-package invoice</Link></div>}
                          </div>}
                        </td>
                        <td>₹{Number(course.parentPayment).toLocaleString('en-IN')}</td>
                        <td>
                          {course.numberOfClasses}
                          {course.totalHours ? ` (${Number(course.totalHours)} hrs)` : ""}
                        </td>
                        <td>{course.scheduleType}</td>
                        <td>₹{Number(course.totalParentPayment).toLocaleString('en-IN')}</td>
                        <td>₹{Number(course.totalInvoiceAmount).toLocaleString('en-IN')}</td>
                        <td>
                          <Link target="_blank" to={`${process.env.PUBLIC_URL}/tct-student-calendar?id=${course.userId}&stuName=${course.studentName}&grade=${course.grade}&board=${course.board}&month=${getMonthNumber(selectedMonth)}&year=${selectedYear}`}>
                            <Button color="info" size="sm" disabled={isGeneratingInvoice || loadingInvoices}>
                              View
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="text-center">No courses found for the selected period</td>
                    </tr>
                  )}
                </tbody>
              </Table>
              {enrolledCoursesData.length > 0 && (
                <div className="d-flex justify-content-end align-items-center mt-3" style={{ gap: '8px' }}>
                  {monthlyInvoiceNumber ? (
                    <>
                      <Link to={`${process.env.PUBLIC_URL}/lms/students/student-invoice-details?invNumber=${monthlyInvoiceNumber}`} target="_blank">
                        <Button color="primary" size="sm" disabled={isGeneratingInvoice || loadingInvoices}>View Invoice</Button>
                      </Link>
                      <Link to={`${process.env.PUBLIC_URL}/lms/students/invoice-print?invNumber=${monthlyInvoiceNumber}`} target="_blank">
                        <Button color="primary" size="sm" disabled={isGeneratingInvoice || loadingInvoices}>Print Invoice</Button>
                      </Link>
                    </>
                  ) : (
                    <Button color="primary" size="sm" disabled={isGeneratingInvoice || loadingInvoices || (hasPackage && !canManagePackage)} onClick={handleGenerateInvoice}>
                      {hasPackage ? "Generate Package / Monthly Check" : `Generate Invoice for ${selectedMonth} ${selectedYear}`}
                    </Button>
                  )}
                  {monthlyInvoiceNumber && hasPackage && canManagePackage && <Button color="primary" size="sm" disabled={isGeneratingInvoice || loadingInvoices} onClick={handleGenerateInvoice}>Monthly Check / Invoice</Button>}
                </div>
              )}
            </div>
          </ModalBody>
        </Modal>
        <PaymentPlanModal isOpen={Boolean(paymentPlanCourse)} course={paymentPlanCourse} onClose={() => {
          setPaymentPlanCourse(null);
          if (selectedStudentId !== defaultGuid) fetchScheduleData(selectedStudentId, selectedMonth, selectedYear);
        }} />
        <ToastContainer />
      </Content>
    </React.Fragment>
  );
};

export default StudentSchedule;
