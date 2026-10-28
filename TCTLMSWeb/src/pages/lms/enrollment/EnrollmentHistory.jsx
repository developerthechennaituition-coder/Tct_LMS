import React, { useContext, useEffect, useState, useRef, useMemo } from "react";
import {
  DropdownMenu,
  DropdownToggle,
  FormGroup,
  UncontrolledDropdown,
  Modal,
  ModalHeader,
  ModalBody,
  DropdownItem,
  Breadcrumb,
  BreadcrumbItem,
  Form,
  ModalFooter,
} from "reactstrap";
import { useLocation } from "react-router-dom";
import {
  Block,
  BlockBetween,
  BlockDes,
  BlockHead,
  BlockHeadContent,
  Icon,
  Button,
  BlockTitle,
  ReactDataTable,
  TooltipComponent,
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableRow,
  DataTableItem,
  Row,
  Col,
  RSelect,
} from "../../../components/Component";
import Content from "../../../layout/content/Content";
import Head from "../../../layout/head/Head";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import UserAvatar1 from "../../../components/user/UserAvatar1";
import { findUpper1, getColor } from "../../../utils/Utils";
import {
  getEnrolledCouse,
  GetBoardViseStudentList,
  GetBoardViseStudentListByUser,
  DownloadExcel,
} from "../../../apiservices/StudentEnrollmentService";
import { getLookups } from "../../../apiservices/LookupsService";
import { getActiveTCTBankDetails, updateTCTBankDetailToStudent } from "../../../apiservices/BankService";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { axios } from "../../../library/axios";
import { ToastContainer } from "react-toastify";
import { toast } from "react-toastify";
import MapBankModal from "../common/MapBankModal";
import { canMapTctBank } from "../../../library/bankMappingAccess";
import { AlignCenter } from "lucide-react";
import EnrollmentHistorySearch, { filterEnrollmentStudents } from "./EnrollmentHistorySearch";
import RdtDataTable from "react-data-table-component";
import TutorListPagination, { TUTOR_PAGE_SIZES } from "../tutors/TutorListPagination";
import "./EnrollmentHistory.css";

// Coordinator list pager: page buttons, the shown range ("11–20 of 46") and Rows per page.
// Paging stays client-side inside the table (same filtered list, same sorting). Defined at module
// level so the table does not remount it; onPageSizeSelected keeps the page's size in sync.
const EnrollmentTablePagination = ({ currentPage, rowsPerPage, rowCount, onChangePage, onChangeRowsPerPage, paginationComponentOptions }) => (
  <TutorListPagination
    page={currentPage}
    pageSize={rowsPerPage}
    total={rowCount}
    onPageChange={onChangePage}
    onPageSizeChange={(size) => {
      onChangeRowsPerPage(size);
      onChangePage(1);
      paginationComponentOptions?.onPageSizeSelected?.(size);
    }}
  />
);

const EnrollmentHistory = () => {
  const [sm, updateSm] = useState(false);
  const [studentDataSource, setStudentDataSource] = useState();
  const [dataSource, setDataSource] = useState();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemPerPage] = useState(10);
  // Coordinator table: rows per page (starts at the existing 10).
  const [ehPageSize, setEhPageSize] = useState(10);
  const ehPaginationOptions = useMemo(() => ({ onPageSizeSelected: setEhPageSize }), []);
  const [openCourseModal, setOpenCourseModal] = useState(false);
  const [openBankModal, setOpenBankModal] = useState(false);
  const [mapBankLoading, setMapBankLoading] = useState(false);
  const [openAudioModal, setOpenAudioModal] = useState(false);
  const [openAudioUploadModal, setOpenAudioUploadModal] = useState(false);
  const [audioUploadFile, setAudioUploadFile] = useState(null);
  const [audioUploadStudentId, setAudioUploadStudentId] = useState(null);
  const [audioUploading, setAudioUploading] = useState(false);
  const [audioContent, setaudioContent] = useState();
  const [audioContentType, setAudioContentType] = useState("audio/mpeg");
  const [courseList, setCourseList] = useState([]);
  const [bankList, setBankList] = useState([]);
  const userRole = localStorage.getItem("userRole");
  const defaultGuid = "00000000-0000-0000-0000-000000000000";
  const [gradeList, setGradeList] = useState([]);
  const location = useLocation();
  const searchParams = new URLSearchParams(new URL(window.location.href).search);
  const [boardId, setBoardId] = useState(searchParams.get("boardId") || defaultGuid);
  const [selectedStudentId, setSelectedStudentId] = useState(defaultGuid);
  const [selectedStudentName, setSelectedStudentName] = useState("");
  const [boardName, setBoardName] = useState(searchParams.get("name"));
  const [subjectName, setSubjectName] = useState("All");
  const [gradeName, setGradeName] = useState("All");
  const [gradeId, setGradeId] = useState(defaultGuid);
  const [subjectId, setSubjectId] = useState(defaultGuid);
  const [courseList1, setCourseList1] = useState([]);
  const [boardList, setBoardList] = useState([]);
  const [hiddenColumns, setHiddenColumns] = useState([]);
  const dropdownRef = useRef(null);
  const [tablesm, updateTableSm] = useState(false);
  const [onSearch, setonSearch] = useState(true);
  const [onSearchText, setSearchText] = useState("");
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState("");
  const studentRequestSequence = useRef(0);
  const [resetSearchPage, setResetSearchPage] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const [actionText, setActionText] = useState("");
  const [sort, setSortState] = useState("");

  const uploadCoordinatorAudio = async () => {
    if (!audioUploadFile) {
      toast.error("Please select an MP3 or M4A audio file.");
      return;
    }
    const extension = audioUploadFile.name.split(".").pop()?.toLowerCase();
    if (!extension || !["mp3", "m4a"].includes(extension)) {
      toast.error("Only MP3 and M4A audio files are supported.");
      return;
    }

    const form = new FormData();
    form.append("studentId", audioUploadStudentId);
    form.append("file", audioUploadFile);
    try {
      setAudioUploading(true);
      await axios.post("/Student/uploadCoordinatorInstructions", form);
      toast.success("Coordinator instruction audio uploaded successfully.");
      setOpenAudioUploadModal(false);
      setAudioUploadFile(null);
      GetBoardViseStudents(onSearchText);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to upload the audio file.");
    } finally {
      setAudioUploading(false);
    }
  };

  const [formData, setFormData] = useState({
    StudentId: defaultGuid,
    Id: defaultGuid,
    UserId: localStorage.getItem("userId")

  });
  const toggle = () => setonSearch(!onSearch);
  // Sorting data
  const sortFunc = (params) => {
    let defaultData = data;
    if (params === "asc") {
      let sortedData = defaultData.sort((a, b) => a.name.localeCompare(b.name));
      setData([...sortedData]);
    } else if (params === "dsc") {
      let sortedData = defaultData.sort((a, b) => b.name.localeCompare(a.name));
      setData([...sortedData]);
    }
  };

  // unselects the data on mount
  useEffect(() => {
    // if (boardId != null || boardId != undefined) {
    getLookups("300" /*Grade*/).then((response) => {
      let temp = [];
      temp.push({ value: defaultGuid, label: "Select grade" });
      response.forEach((s) => {
        temp.push({ value: s?.id, label: s?.typeCodeName });
      });
      setGradeList(temp);
    });

    getLookups("400" /*Board*/).then((response) => {
      let temp = [];
      temp.push({ value: defaultGuid, label: "Select subject" });
      response.forEach((s) => {
        temp.push({ value: s?.id, label: s?.typeCodeName, id: s?.id });
      });
      setBoardList(temp);
    });

    getLookups("500" /*Subject*/).then((response) => {
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
    const request = ++studentRequestSequence.current;
    setStudentsLoading(true);
    setStudentsError("");
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

    const roleId = localStorage.getItem("roleId");
    const userId = localStorage.getItem("userId");
    const restrictedRoles = ["4", "6", "13"]; // Operations, Coordinator, Tutor

    const applyResult = (data) => {
      if (request !== studentRequestSequence.current) return;
      setDataSource(Array.isArray(data) ? data : []);
    };

    // These endpoints already return the whole authorized list, not one page.
    // Search it locally so code/parent matches are not lost to the narrower API filter.
    const pending = restrictedRoles.includes(roleId)
      ? GetBoardViseStudentListByUser(userId, parseInt(roleId), boardId, gradeId, subjectId, "")
      : GetBoardViseStudentList(boardId, gradeId, subjectId, "");
    pending.then(applyResult).catch(() => {
      if (request !== studentRequestSequence.current) return;
      setDataSource([]);
      setStudentsError("Unable to load students. Please retry.");
    }).finally(() => {
      if (request === studentRequestSequence.current) setStudentsLoading(false);
    });
  };

  const toggleColumn = (columnName) => {
    setHiddenColumns(
      (prev) =>
        prev.includes(columnName)
          ? prev.filter((col) => col !== columnName) // Remove from hidden list
          : [...prev, columnName] // Add to hidden list
    );
  };

  const [dtStudentColumns, setDtStudentColumns] = useState([
    {
      name: "Code",
      width: "100px",
      selector: (row) => row.code,
      sortable: true,
      cell: (row) => <span>{row.code}</span>,
    },
    {
      name: "Stu. Name",
      selector: (row) => row.studentName,
      grow: 2,
      style: { paddingRight: "20px" },
      cell: (row) => ( 
        <Link className="user-card mt-2 mb-2" to={`${process.env.PUBLIC_URL}/student-profile?id=${row.userId}`}>
          <UserAvatar1
            image={getImageSource(row)}
            theme={getColor(row.studentName)}
            text={findUpper1(row.studentName)}
          ></UserAvatar1>
          <div className="user-info">
            <span className="tb-lead">
              {row.studentName}{" "}
            </span>
            {/* {row.mobileNumber && <span>{row.mobileNumber}</span>} */}
          </div>
        </Link>
      ),
      sortable: true,
    },
     {
      name: "Parent Name",
      minWidth: "180px",
      selector: (row) => row.parentName,
      cell: (row) => <span>{row.parentName}</span>,
    },
     {
      name: "Operations(Ownership)",
      selector: (row) => row.operationName,
      hidden: true,
      width: "250px",
      cell: (row) => <span>{row.operationName}</span>,
      
    },
    {
      name: "Courses",
      selector: (row) => row.enrolledCourse,
      sortable: false,
      cell: (row) => (
  <div style={{ whiteSpace: "nowrap" }}>
    <span>{row.enrolledCourse}</span>
    <Link
      className="user-card mt-2 mb-2"
      onClick={() => {
        getEnrolledCouse(row.id).then((data) => {
          setOpenCourseModal(true);
          setCourseList(data);
        });
      }}
    >
      View More
    </Link>
  </div>
)
    },
    {
      name: "Board",
      selector: (row) => row.board,
      hidden: true,
      cell: (row) => <span>{row.board}</span>,
      omit: "board",
    },
    {
      name: "Grade",
      selector: (row) => row.grade,
      // omit: hiddenColumns.includes("grade"),
      cell: (row) => <span>{row.grade}</span>,
    },
    // {
    //   name: "Phone",
    //   selector: (row) => row.mobileNumber,
    //   cell: (row) => <span>{row.mobileNumber.replace(" ", "")}</span>,
    // },
    {
      name: "Enroll. Date",
      selector: (row) => row.enrollmentDate,
      sortable: true,
      cell: (row) => <span>{row.enrollmentDate}</span>,
      hide: "md",
    },
    {
  name:
    userRole === "Coordinator" || userRole === "SuperAdmin"
      ? ""
      : "Actions",
  selector: (row) => row.status,
  cell: (row) => (
    <>
      {userRole === "Coordinator" || userRole === "SuperAdmin" ? (
        <>
          <Link
            className="user-card mt-2 mb-2"
            to={`${process.env.PUBLIC_URL}/lms/schedule/schedule-class?id=${row.id}&coordinatorId=${row.coordinatorId}`}
          >
            <TooltipComponent
              tag="a"
              containerClassName="btn btn-trigger btn-icon"
              id={"add" + row.id}
              icon="icon ni ni-calender-date"
              direction="top"
              text="Schedule Class"
            />
          </Link>

          {row.hasSchedule ? (
            <Link
              className="user-card mt-2 mb-2"
              to={`${process.env.PUBLIC_URL}/lms/schedule/view-student-class?id=${row.userId}&studentId=${row.id}`}
            >
              <TooltipComponent
                tag="a"
                containerClassName="btn btn-trigger btn-icon"
                id={"view" + row.id}
                icon="icon ni ni-calendar-check-fill"
                direction="top"
                text="View Calender"
              />
            </Link>
          ) : (
            <span style={{ opacity: 0.35, cursor: "not-allowed", display: "inline-flex" }}>
              <TooltipComponent
                tag="a"
                containerClassName="btn btn-trigger btn-icon"
                id={"view" + row.id}
                icon="icon ni ni-calendar-check-fill"
                direction="top"
                text="No classes scheduled"
              />
            </span>
          )}
        </>
      ) : (
        <>
          <Link
            className="user-card mt-2 mb-2"
            to={`${process.env.PUBLIC_URL}/lms/schedule/schedule-class?id=${row.id}`}
          >
            <TooltipComponent
              tag="a"
              containerClassName="btn btn-trigger btn-icon"
              id={"add" + row.id}
              icon="icon ni ni-calender-date"
              direction="top"
              text="Schedule Class"
            />
          </Link>

          {row.hasSchedule ? (
            <Link
              className="user-card mt-2 mb-2"
              to={`${process.env.PUBLIC_URL}/lms/schedule/view-student-class?id=${row.userId}&studentId=${row.id}`}
            >
              <TooltipComponent
                tag="a"
                containerClassName="btn btn-trigger btn-icon"
                id={"view" + row.id}
                icon="icon ni ni-calendar-check-fill"
                direction="top"
                text="View Calender"
              />
            </Link>
          ) : (
            <span style={{ opacity: 0.35, cursor: "not-allowed", display: "inline-flex" }}>
              <TooltipComponent
                tag="a"
                containerClassName="btn btn-trigger btn-icon"
                id={"view" + row.id}
                icon="icon ni ni-calendar-check-fill"
                direction="top"
                text="No classes scheduled"
              />
            </span>
          )}

          {canMapTctBank(userRole) && <Link
            className="user-card mt-2 mb-2"
            to="#"
            onClick={() => {
              setSelectedStudentId(row.id);
              setSelectedStudentName(row.studentName);

              setFormData({
                StudentId: row.id,
                Id: row.tctBankID || defaultGuid,
                GSTPercentage: row.gstPercentage || null,
                VATPercentage: row.vatPercentage || null,
                Currency: row.currency || "",
                ClientGST: row.clientGST || "",
                ClientPAN: row.clientPAN || "",
                ClientGSTStateCode: row.clientGSTStateCode || "",
                ClientCountryCode: row.clientCountryCode || "",
                UserId: localStorage.getItem("userId"),
              });

              getActiveTCTBankDetails().then((data) => {
                if (data.length > 0) {
                  setOpenBankModal(true);
                  setBankList(data);
                } else {
                  toast.error(
                    "No bank details found. Please contact administrator."
                  );
                }
              });
            }}
          >
            <TooltipComponent
              tag="a"
              containerClassName="btn btn-trigger btn-icon"
              id={"bank" + row.id}
              icon="icon ni ni-money"
              direction="top"
              text="Map TCT Bank"
            />
          </Link>}
        </>
      )}

      {(userRole === "SuperAdmin" ||
        userRole === "SalesAdmin" ||
        userRole === "Coordinator" ||
        userRole === "CoordinatorAdmin" ||
        userRole === "Operations") &&
        row.audioFileData && (
          <Link
            className="user-card mt-2 mb-2"
            onClick={() => {
              setOpenAudioModal(true);
              setaudioContent(row.audioFileData);
              setAudioContentType(row.audioContentType || "audio/mpeg");
              setSelectedStudentName(row.studentName);
              setAudioUploadStudentId(row.id);
            }}
          >
            <TooltipComponent
              tag="a"
              containerClassName="btn btn-trigger btn-icon"
              id={"audio" + row.id}
              icon="icon ni ni-music"
              direction="top"
              text="Instructions"
            />
          </Link>
        )}
      {(userRole === "SuperAdmin" ||
        userRole === "SalesAdmin" ||
        userRole === "Coordinator" ||
        userRole === "CoordinatorAdmin") && (
          <Link
            className="user-card mt-2 mb-2"
            onClick={() => {
              setAudioUploadStudentId(row.id);
              setSelectedStudentName(row.studentName);
              setAudioUploadFile(null);
              setOpenAudioUploadModal(true);
            }}
          >
            <TooltipComponent
              tag="a"
              containerClassName="btn btn-trigger btn-icon"
              id={"upload-audio" + row.id}
              icon="icon ni ni-upload-cloud"
              direction="top"
              text={row.audioFileData ? "Replace coordinator instructions" : "Upload coordinator instructions"}
            />
          </Link>
        )}
    </>
  ),
  hide: "md",
} 
  ]);

  // Get current list, pagination
  const indexOfLastItem = currentPage * itemPerPage;
  const indexOfFirstItem = indexOfLastItem - itemPerPage;
  // const currentItems = data.slice(indexOfFirstItem, indexOfLastItem);

  // Change Page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const { errors, register, handleSubmit, setValue, trigger, clearErrors } = useForm();
  const getImageSource = (data) => {
    if (data.fileData == null || data.fileData == "") {
      return "";
    }
    const url = `data:image/jpeg;base64, ${data.fileData}`;
    return url;
  };

  useEffect(() => {
    setStudentDataSource(filterEnrollmentStudents(dataSource, onSearchText));
    setResetSearchPage(previous => !previous);
  }, [onSearchText, dataSource]);

  // onChange function for searching name
  const onFilterChange = (e) => {
    setSearchText(e.target.value);
  };

  const downloadExcel = async () => {
    try {
      const response = await axios({
        url: "/Reports/download",
        method: "GET",
        responseType: "blob", // Important for file downloads
      });

      // Check if the response has content
      if (response.data.size === 0) {
        throw new Error("Received empty file from server");
      }

      // Create a URL for the blob and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "SampleData.xlsx");
      document.body.appendChild(link);
      link.click();

      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading file:", error);
    } finally {
    }
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
      .catch((error) => {
        alert(error);
      });
    return;
    const jsonData = [
      {
        "Stu. Name": "Arul Chezhian",
        Courses: "English",
        Grade: "Grade5",
        Phone: "+917894123567",
        "Enroll. Date": "24-02-2025",
        Status: "Active",
      },
      {
        "Stu. Name": "Anthony Daasan",
        Courses: "Tamil",
        Grade: "Grade5",
        Phone: "+917891234560",
        "Enroll. Date": "24-02-2025",
        Status: "Active",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(jsonData, { origin: "A4" }); // Start data from row 4

    // Add title and details manually
    const title = [["Student Report"]];
    const dateInfo = [["Generated Date:", new Date().toLocaleDateString()]];
    const emptyRow = [[]];

    // Combine everything into a new worksheet
    const finalData = [...title, ...dateInfo, ...emptyRow]; // Add title and metadata
    const newWorksheet = XLSX.utils.sheet_add_aoa(worksheet, finalData, { origin: "A1" });

    // Merge title across columns (A1:F1)
    newWorksheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];

    // Auto adjust column widths based on content
    const columnWidths = Object.keys(jsonData[0]).map((key) => ({ wch: key.length + 5 }));
    newWorksheet["!cols"] = columnWidths;

    // Create workbook and append worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, newWorksheet, "Students");

    // Generate Excel file and trigger download
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(data, "student_report.xlsx");
  };

  // Coordinator table only: fixed column sizing so headers and cells line up, and the full
  // "Enrollment Date" heading. Same column objects otherwise (selectors, sorting, cells, omit).
  const ehColumnLayout = {
    "Code": { width: "110px" },
    "Stu. Name": { minWidth: "230px", grow: 2 },
    "Parent Name": { minWidth: "150px", grow: 1 },
    "Operations(Ownership)": { width: "220px" },
    "Courses": { minWidth: "170px", grow: 1 },
    "Grade": { width: "110px" },
    "Enroll. Date": { width: "180px", name: "Enrollment Date" },
  };
  const ehColumns = useMemo(
    () => dtStudentColumns.map((col, i) =>
      i === dtStudentColumns.length - 1
        ? { ...col, width: "150px", right: true }
        : ehColumnLayout[col.name] ? { ...col, minWidth: undefined, width: undefined, ...ehColumnLayout[col.name] } : col),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dtStudentColumns]
  );

  const RenderGrid = (props) => {
    return (
      <>
        <ReactDataTable
          canShowFilter={false}
          data={props.dataSource}
          columns={dtStudentColumns}
          pageSize={10}
          pagination
          paginationResetDefaultPage={resetSearchPage}
        // selectableRows
        />
      </>
    );
  };

  const onFormCancel = () => {
    setOpenBankModal(false);
  }



  const onFormSubmit = async (form) => {
    if (!canMapTctBank(userRole)) return;
    const dataToSubmit = {
      UserId: localStorage.getItem("userId"),
      StudentId: selectedStudentId,
      BankDetailId: formData.Id,
      GSTPercentage: formData.GSTPercentage,
      VATPercentage: formData.VATPercentage,
      Currency: formData.Currency,
      ClientGST: formData.ClientGST,
      ClientPAN: formData.ClientPAN,
      ClientGSTStateCode: formData.ClientGSTStateCode,
      ClientCountryCode: formData.ClientCountryCode,
    };

    setMapBankLoading(true);
    updateTCTBankDetailToStudent(dataToSubmit)
      .then(response => {
        toast.success("Bank Details updated successfully.");
        setOpenBankModal(false);
        GetBoardViseStudents("");
      })
      .catch(error => {
        console.error("Error details:", error);
        toast.error("An error occurred while processing your request.");
      })
      .finally(() => setMapBankLoading(false));
  };

  return (
    <React.Fragment>
      <Head title="Student List"></Head>
      <Content>
        <div className={userRole === "Coordinator" ? "tct-eh" : undefined}>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              {boardId != null || boardId != undefined ? (
                <>
                  <BlockTitle tag="h4">{boardName} Student List</BlockTitle>
                </>
              ) : (
                <>
                  <BlockTitle tag="h3" page>
                    {userRole == "Coordinator" ? "Enrolled Student List" : "Enrollment list"}
                  </BlockTitle>
                </>
              )}
            </BlockHeadContent>
            <BlockHeadContent>
              {userRole === "Coordinator" && <EnrollmentHistorySearch value={onSearchText} onChange={setSearchText} />}
              <div className="toggle-wrap nk-block-tools-toggle">
                <Button
                  className={`btn-icon btn-trigger toggle-expand mr-n1 ${sm ? "active" : ""}`}
                  onClick={() => updateSm(!sm)}
                >
                  <Icon name="menu-alt-r"></Icon>
                </Button>
                {/* <div className="toggle-expand-content" style={{ display: sm ? "block" : "none" }}>
                  <ul className="nk-block-tools g-3">
                    <li>
                      <a
                        href="#export"
                        onClick={(ev) => {
                          ev.preventDefault();
                          exportToExcel();
                        }}
                        className="btn btn-white btn-outline-light"
                      >
                        <Icon name="download-cloud"></Icon>
                        <span>Export</span>
                      </a>
                    </li>
                  </ul>
                </div> */}
              </div>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        {studentsLoading &&<div role="status" className="mb-3">Loading students…</div>}
        {studentsError && <div role="alert" className="alert alert-danger">{studentsError} <button type="button" onClick={() => GetBoardViseStudents("")}>Retry</button></div>}

        {userRole == "Coordinator" && (
          <Block>
            {studentDataSource && (
              <div className="dataTables_wrapper dt-bootstrap4 no-footer tct-eh-table">
                <RdtDataTable
                  data={studentDataSource}
                  columns={ehColumns}
                  noDataComponent={<div className="p-2">There are no records found</div>}
                  sortIcon={
                    <div>
                      <span>&darr;</span>
                      <span>&uarr;</span>
                    </div>
                  }
                  pagination
                  paginationPerPage={ehPageSize}
                  paginationRowsPerPageOptions={TUTOR_PAGE_SIZES}
                  paginationResetDefaultPage={resetSearchPage}
                  paginationComponent={EnrollmentTablePagination}
                  paginationComponentOptions={ehPaginationOptions}
                />
              </div>
            )}
          </Block>
        )}

        {userRole != "Coordinator" && (
          <Block>
            <Row className="">
              <Col size={6}>
                <div
                  title="Board > Grade > Subject"
                  className="entrolled-list card-inner position-relative card-tools-toggle"
                  style={{ marginTop: "4%" }}
                >
                  <Breadcrumb className="breadcrumb-arrow">
                    <BreadcrumbItem>
                      <a href="#">{boardName}</a>
                    </BreadcrumbItem>
                    <BreadcrumbItem>
                      <a href="#">{gradeName}</a>
                    </BreadcrumbItem>
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
                          <a
                            href="#search"
                            onClick={(ev) => {
                              ev.preventDefault();
                              toggle();
                            }}
                            className="btn btn-icon search-toggle toggle-search"
                          >
                            <Icon name="search"></Icon>
                          </a>
                        </li>
                        <li className="btn-toolbar-sep"></li>
                        <li>
                          <div className="toggle-wrap">
                            <Button
                              className={`btn-icon btn-trigger toggle ${tablesm ? "active" : ""}`}
                              onClick={() => updateTableSm(true)}
                            >
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
                                    <DropdownMenu
                                      right
                                      className="filter-wg dropdown-menu-xl"
                                      style={{ overflow: "visible" }}
                                    >
                                      <div className="dropdown-head">
                                        <span className="sub-title dropdown-title">Student Filter</span>
                                        <div className="dropdown">
                                          <DropdownItem
                                            href="#more"
                                            onClick={(ev) => {
                                              ev.preventDefault();
                                            }}
                                            className="btn btn-sm btn-icon"
                                          >
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
                                                if (e.value == defaultGuid) {
                                                  setBoardName("All");
                                                } else {
                                                  var board = boardList.find((s) => s.value == e.value);
                                                  setBoardName(board?.label);
                                                }
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
                                                if (e.value == defaultGuid) {
                                                  setGradeName("All");
                                                } else {
                                                  var board = gradeList.find((s) => s.value == e.value);
                                                  setGradeName(board?.label);
                                                }
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
                                                if (e.value == defaultGuid) {
                                                  setSubjectName("All");
                                                } else {
                                                  var board = courseList1.find((s) => s.value == e.value);
                                                  setSubjectName(board?.label);
                                                }
                                                setSubjectId(e.value);
                                              }}
                                            />
                                          </Col>
                                          <Col size="12">
                                            <FormGroup className="form-group">
                                              <Button
                                                color="secondary"
                                                onClick={() => {
                                                  GetBoardViseStudents(onSearchText);
                                                  document.body.click();
                                                }}
                                              >
                                                Filter
                                              </Button>
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
                                        <li>
                                          <span>Show</span>
                                        </li>
                                        <li className={itemPerPage === 10 ? "active" : ""}>
                                          <DropdownItem
                                            tag="a"
                                            href="#dropdownitem"
                                            onClick={(ev) => {
                                              ev.preventDefault();
                                              setItemPerPage(10);
                                            }}
                                          >
                                            10
                                          </DropdownItem>
                                        </li>
                                        <li className={itemPerPage === 15 ? "active" : ""}>
                                          <DropdownItem
                                            tag="a"
                                            href="#dropdownitem"
                                            onClick={(ev) => {
                                              ev.preventDefault();
                                              setItemPerPage(15);
                                            }}
                                          >
                                            15
                                          </DropdownItem>
                                        </li>
                                      </ul>
                                      <ul className="link-check">
                                        <li>
                                          <span>Order</span>
                                        </li>
                                        <li className={sort === "dsc" ? "active" : ""}>
                                          <DropdownItem
                                            tag="a"
                                            href="#dropdownitem"
                                            onClick={(ev) => {
                                              ev.preventDefault();
                                              setSortState("dsc");
                                              sortFunc("dsc");
                                            }}
                                          >
                                            DESC
                                          </DropdownItem>
                                        </li>
                                        <li className={sort === "asc" ? "active" : ""}>
                                          <DropdownItem
                                            tag="a"
                                            href="#dropdownitem"
                                            onClick={(ev) => {
                                              ev.preventDefault();
                                              setSortState("asc");
                                              sortFunc("asc");
                                            }}
                                          >
                                            ASC
                                          </DropdownItem>
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
                        <Button
                          className="search-back btn-icon toggle-search active"
                          onClick={() => {
                            setSearchText("");
                            GetBoardViseStudents("");
                            toggle();
                          }}
                        >
                          <Icon name="arrow-left"></Icon>
                        </Button>
                        <input
                          type="text"
                          className="border-transparent form-focus-none form-control"
                          placeholder="Search by user or email"
                          value={onSearchText}
                          onChange={(e) => onFilterChange(e)}
                        />
                        <Button className="search-submit btn-icon">
                          <Icon name="search"></Icon>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Col>
            </Row>

            {studentDataSource && (
              <>
                <RenderGrid dataSource={studentDataSource}></RenderGrid>
              </>
            )}
          </Block>
        )}
        <Modal
          isOpen={openAudioUploadModal}
          toggle={() => setOpenAudioUploadModal(false)}
          className="modal-dialog-centered tct-eh-upload"
          size="md"
        >
          {(() => {
            // Display only: the row already loaded for this student (no extra request).
            const uploadStudent = (dataSource || []).find((s) => s.id === audioUploadStudentId);
            return (
              <>
                <div className="ehu-head">
                  <span className="ehu-icon" aria-hidden="true"><Icon name="mic"></Icon></span>
                  <div className="ehu-head-text">
                    <h5 className="ehu-title">Upload coordinator instructions</h5>
                    <p className="ehu-sub">Upload audio instructions for the selected student.</p>
                  </div>
                  <button type="button" className="ehu-close" aria-label="Close" onClick={() => setOpenAudioUploadModal(false)}>
                    <Icon name="cross"></Icon>
                  </button>
                </div>
                <ModalBody>
                  <div className="ehu-student">
                    <UserAvatar1 theme={getColor(selectedStudentName)} text={findUpper1(selectedStudentName)}></UserAvatar1>
                    <div className="ehu-student-text">
                      <span className="ehu-student-name">Student: {selectedStudentName}</span>
                      {(uploadStudent?.code || uploadStudent?.parentName) && (
                        <span className="ehu-student-meta">
                          {uploadStudent?.code && <>Code: <b>{uploadStudent.code}</b></>}
                          {uploadStudent?.code && uploadStudent?.parentName && <i aria-hidden="true">|</i>}
                          {uploadStudent?.parentName && <>Parent: <b>{uploadStudent.parentName}</b></>}
                        </span>
                      )}
                    </div>
                  </div>
                  <FormGroup className="mb-0">
                    <label className="form-label" htmlFor="ehu-audio-file">Audio file</label>
                    <label className={`ehu-drop${audioUploadFile ? " has-file" : ""}`} htmlFor="ehu-audio-file">
                      <input
                        id="ehu-audio-file"
                        className="ehu-file-input"
                        type="file"
                        accept=".mp3,.m4a,audio/mpeg,audio/mp4,audio/x-m4a"
                        onChange={(event) => setAudioUploadFile(event.target.files?.[0] || null)}
                      />
                      <span className="ehu-drop-icon" aria-hidden="true"><Icon name={audioUploadFile ? "music" : "upload-cloud"}></Icon></span>
                      {audioUploadFile ? (
                        <span className="ehu-drop-text"><b className="ehu-file-name">{audioUploadFile.name}</b><small>Click to choose a different file</small></span>
                      ) : (
                        <span className="ehu-drop-text"><b>No file chosen</b><small>Click to browse your files</small></span>
                      )}
                      <span className="ehu-browse">{audioUploadFile ? "Change file" : "Choose audio file"}</span>
                    </label>
                    <div className="ehu-hint">Supported formats: MP3, M4A</div>
                  </FormGroup>
                </ModalBody>
                <ModalFooter>
                  <Button color="light" onClick={() => setOpenAudioUploadModal(false)} disabled={audioUploading}>Cancel</Button>
                  <Button color="primary" onClick={uploadCoordinatorAudio} disabled={audioUploading}>
                    {audioUploading ? <span className="spinner-border spinner-border-sm" aria-hidden="true"></span> : <Icon name="upload"></Icon>}
                    <span>{audioUploading ? "Uploading..." : "Upload audio"}</span>
                  </Button>
                </ModalFooter>
              </>
            );
          })()}
        </Modal>
        <Modal
          scrollable={false}
          isOpen={openAudioModal}
          toggle={() => setOpenAudioModal(false)}
          className="modal-dialog-centered"
          size="md"
        >
          <ModalHeader>Instructions to co-ordinator</ModalHeader>
          <ModalBody>
            <label>Student: {selectedStudentName}</label>
            <div style={{ textAlign: 'center' }}>
              <audio controls src={`data:${audioContentType};base64,${audioContent}`} />
            </div>
          </ModalBody>
          {(userRole === "SuperAdmin" ||
            userRole === "SalesAdmin" ||
            userRole === "Coordinator" ||
            userRole === "CoordinatorAdmin") && (
            <ModalFooter>
              <Button color="light" onClick={() => setOpenAudioModal(false)}>Close</Button>
              <Button
                color="primary"
                onClick={() => {
                  setOpenAudioModal(false);
                  setAudioUploadFile(null);
                  setOpenAudioUploadModal(true);
                }}
              >
                Replace audio
              </Button>
            </ModalFooter>
          )}
        </Modal>
        <Modal
          scrollable={false}
          isOpen={openCourseModal}
          toggle={() => setOpenCourseModal(false)}
          className="modal-dialog-centered"
          size="lg"
        >
          <ModalHeader>Enrolled Courses</ModalHeader>
          <ModalBody>
           <div className="table-responsive">
             <table className="table table-bordered align-middle">
               <thead>
                 <tr>
                   <th>Subject</th>
                   <th>Board / Grade</th>
                   <th>Coordinator</th>
                   <th>Tutor</th>
                   <th>Sessions / Week</th>
                   <th>Subject Code</th>
                   <th>Author / Book</th>
                   <th>Status</th>
                 </tr>
               </thead>
               <tbody>
                 {courseList.length > 0 ? courseList.map((item, index) => (
                   <tr key={item.salesDetailsId || index}>
                     <td>{item.subjectName || "-"}</td>
                     <td>{[item.board, item.grade].filter(Boolean).join(" / ") || "-"}</td>
                     <td>{item.coordinatorName || "-"}</td>
                     <td>{item.tutorName || "Not Assigned"}</td>
                     <td>{item.noOfSessionPerWeek || "-"}</td>
                     <td>{item.subjectCode || "-"}</td>
                     <td>{item.authorBookDetails || "-"}</td>
                     <td>{item.statusName || "-"}</td>
                   </tr>
                 )) : (
                   <tr><td colSpan="8" className="text-center">No enrollment requirements found.</td></tr>
                 )}
               </tbody>
             </table>
           </div>
          </ModalBody>
        </Modal>
        <MapBankModal
          isOpen={openBankModal}
          toggle={() => setOpenBankModal(false)}
          selectedStudentName={selectedStudentName}
          selectedStudentId={selectedStudentId}
          bankList={bankList}
          formData={formData}
          setFormData={setFormData}
          onFormSubmit={onFormSubmit}
          onFormCancel={onFormCancel}
          loading={mapBankLoading}
          register={register}
          errors={errors}
          handleSubmit={handleSubmit}
          setValue={setValue}
          clearErrors={clearErrors}
          trigger={trigger}
        />
        <ToastContainer />
        </div>
      </Content>
    </React.Fragment>
  );
};
export default EnrollmentHistory;
