import React, { useContext, useEffect, useState, useRef } from "react";
import {
  DropdownMenu,
  DropdownToggle,
  FormGroup,
  UncontrolledDropdown,
  Modal,
  ModalBody,
  ModalHeader,
  DropdownItem,
  Form,
} from "reactstrap";
import {
  Block,
  BlockBetween,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Icon,
  Button,
  TooltipComponent,
  ReactDataTable,
} from "../../../components/Component";
import Content from "../../../layout/content/Content";
import Head from "../../../layout/head/Head";
import { filterStatus, StudetnData, dtEnrolledCourseColumn, dtStudentColumns } from "./UserData";
import { Link, useLocation } from "react-router-dom";
import { StudentContext } from "./StudentContext";
import { GetStudentsbyTutor, GetStudents, GetStudentsByUser } from "../../../apiservices/StudentEnrollmentService";
import UserAvatar1 from "../../../components/user/UserAvatar1";
import { findUpper1, getColor } from "../../../utils/Utils";
import { getEnrolledCouse, enrollnewcourse, deletecourse } from "../../../apiservices/StudentEnrollmentService";
import { getUsers, createUser, setUserStatus, getTCTUserById } from "../../../apiservices/UserService";
import moment from "moment";
import Swal from "sweetalert2";
import { ToastContainer } from "react-toastify";
import { toast } from "react-toastify";
import StudentFilter from "../common/StudentFilter";
import { getActiveTCTBankDetails, updateTCTBankDetailToStudent } from "../../../apiservices/BankService";
import MapBankModal from "../common/MapBankModal";
import { canMapTctBank } from "../../../library/bankMappingAccess";
import { useForm } from "react-hook-form";
import { usePermissions } from "../../../hooks/usePermissions";
import RdtDataTable from "react-data-table-component";
import "./StudentList.css";

// Coordinator view only: page sizes are the ones the settings menu offered (5 / 10 / 15).
const COORDINATOR_PAGE_SIZES = [5, 10, 15];

// Page numbers to show: first and last page, plus a window around the current page.
const coordinatorPageItems = (page, totalPages) => {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const start = Math.max(2, Math.min(page - 1, totalPages - 4));
  const end = Math.min(totalPages - 1, Math.max(page + 1, 5));
  const items = [1];
  if (start > 2) items.push("gap-start");
  for (let i = start; i <= end; i++) items.push(i);
  if (end < totalPages - 1) items.push("gap-end");
  items.push(totalPages);
  return items;
};

// Coordinator pagination row: page controls (left) · record range (centre) · Rows per page (right).
// react-data-table-component supplies the paging state; the page-size choice goes back to the page's
// existing handler through paginationComponentOptions.onPageSizeSelected.
const CoordinatorStudentPagination = ({ currentPage, rowsPerPage, rowCount, onChangePage, onChangeRowsPerPage, paginationComponentOptions }) => {
  const totalPages = Math.max(1, Math.ceil(rowCount / rowsPerPage));
  const current = Math.min(Math.max(1, currentPage), totalPages);
  const from = rowCount === 0 ? 0 : (current - 1) * rowsPerPage + 1;
  const to = Math.min(current * rowsPerPage, rowCount);
  const go = (next) => {
    if (next < 1 || next > totalPages || next === current) return;
    onChangePage(next);
  };
  return (
    <div className="tct-csl-pager">
      <nav aria-label="Student list pages" className="tct-csl-pager-nav">
        <ul className="pagination pagination-sm mb-0">
          <li className={`page-item ${current === 1 ? "disabled" : ""}`}>
            <button type="button" className="page-link" onClick={() => go(current - 1)} aria-label="Previous page">
              <Icon name="chevron-left" />
              <span className="d-none d-sm-inline">Prev</span>
            </button>
          </li>
          {coordinatorPageItems(current, totalPages).map((item) =>
            typeof item === "number" ? (
              <li key={item} className={`page-item d-none d-sm-block ${item === current ? "active" : ""}`}>
                <button type="button" className="page-link" onClick={() => go(item)} aria-current={item === current ? "page" : undefined}>
                  {item}
                </button>
              </li>
            ) : (
              <li key={item} className="page-item disabled d-none d-sm-block">
                <span className="page-link">…</span>
              </li>
            )
          )}
          <li className="page-item d-sm-none disabled">
            <span className="page-link">{current} / {totalPages}</span>
          </li>
          <li className={`page-item ${current === totalPages ? "disabled" : ""}`}>
            <button type="button" className="page-link" onClick={() => go(current + 1)} aria-label="Next page">
              <span className="d-none d-sm-inline">Next</span>
              <Icon name="chevron-right" />
            </button>
          </li>
        </ul>
      </nav>
      <span className="tct-csl-pager-range" role="status" aria-live="polite">
        {from}–{to} of {rowCount}
      </span>
      <div className="tct-csl-pager-size">
        <span id="tct-csl-rows-label">Rows per page</span>
        <UncontrolledDropdown direction="up">
          <DropdownToggle tag="button" type="button" className="tct-csl-size-toggle" aria-label={`Rows per page: ${rowsPerPage}`}>
            <span>{rowsPerPage}</span>
            <Icon name="chevron-down" />
          </DropdownToggle>
          <DropdownMenu right className="tct-csl-size-menu">
            {COORDINATOR_PAGE_SIZES.map((size) => (
              <DropdownItem
                key={size}
                tag="button"
                type="button"
                active={Number(rowsPerPage) === size}
                onClick={() => {
                  if (Number(rowsPerPage) === size) return;
                  onChangeRowsPerPage(size, 1);
                  paginationComponentOptions?.onPageSizeSelected?.(size);
                }}
              >
                <span>{size}</span>
                {Number(rowsPerPage) === size && <Icon name="check" />}
              </DropdownItem>
            ))}
          </DropdownMenu>
        </UncontrolledDropdown>
      </div>
    </div>
  );
};

// Tutor-only page styles: every selector is under .tct-sl / .tct-sl-title, which are rendered only for tutors.
// The shared StudentFilter markup is restyled here (search always visible, "Show" moved out of the gear menu)
// without editing StudentFilter.jsx, which other pages also use.
const tutorStudentListStyle = `
  .tct-sl-title.nk-block-title { margin: 0; font-size: 1.6rem; font-weight: 700; color: #1c2b46; }
  .tct-sl-des { margin-top: 6px; font-size: 14px; color: #6b7a90; }

  .tct-sl { background: #fff; border: 1px solid #e5e9f2; border-radius: 12px; box-shadow: 0 1px 3px rgba(31, 43, 58, 0.05); }

  /* Toolbar: breadcrumb | search | rows per page | filter + settings */
  /* position + z-index: the flattened (display: contents) filter wrapper no longer layers its menus,
     so the toolbar itself keeps the Filter / Order dropdowns above the rows-per-page bar and the table. */
  .tct-sl-toolbar { position: relative; z-index: 10; display: flex; align-items: center; flex-wrap: wrap; gap: 12px; padding: 14px 18px; border-bottom: 1px solid #e5e9f2; }
  .tct-sl-toolbar > .row,
  .tct-sl-toolbar > .row > [class*="col"],
  .tct-sl-toolbar .entrolled-list:not([title]) { display: contents; }
  /* Board > Grade > Subject breadcrumb from StudentFilter: shows "ALL > ALL > ALL" here, so hidden for tutors. */
  .tct-sl-toolbar .entrolled-list[title] { display: none; }
  .tct-sl-toolbar .breadcrumb { margin: 0; }
  .tct-sl-toolbar .breadcrumb-item,
  .tct-sl-toolbar .breadcrumb-item a { font-size: 11px; font-weight: 600; letter-spacing: 0.06em; color: #8094ae; }
  .tct-sl-toolbar .breadcrumb-item:last-child { color: #854fff; }

  /* Search: always visible (overrides the theme's hidden overlay); the open/close icons are hidden. */
  .tct-sl-toolbar .card-search.search-wrap {
    order: 1; flex: 0 1 320px; position: relative; z-index: auto;
    opacity: 1; pointer-events: auto; background: transparent; border-radius: 0;
  }
  .tct-sl-toolbar .card-search .card-body { padding: 0; }
  .tct-sl-toolbar .search-back { display: none; }
  .tct-sl-toolbar .search-content .form-control {
    height: 38px; padding-left: 38px; padding-right: 12px; font-size: 14px;
    background: #fff; border: 1px solid #dbdfea !important; border-radius: 8px; box-shadow: none;
  }
  .tct-sl-toolbar .search-content .form-control:focus { border-color: #854fff !important; box-shadow: 0 0 0 3px rgba(133, 79, 255, 0.12); }
  .tct-sl-toolbar .search-submit {
    left: 0; right: auto; transform: translate(4px, -50%);
    color: #8094ae; background: transparent; border: 0; pointer-events: none;
  }
  .tct-sl-toolbar .card-tools > .btn-toolbar > li:first-child,
  .tct-sl-toolbar .card-tools > .btn-toolbar > li.btn-toolbar-sep { display: none; }

  /* Rows per page: at the right end of the pagination row. The pagination row is rendered by the shared
     DataTablePagination, so the control is positioned over its right end, and the row reserves room for it. */
  .tct-sl { position: relative; }
  .tct-sl-subbar { display: flex; align-items: center; justify-content: flex-end; }
  @media (min-width: 768px) {
    /* Same fixed height as the pagination row (both centre their content), so the two line up. */
    .tct-sl-subbar { position: absolute; right: 18px; bottom: 0; height: 64px; }
    .tct-sl .dataTables_wrapper .row.align-items-center { min-height: 64px; padding-top: 0 !important; padding-bottom: 0 !important; padding-right: 240px !important; }
  }
  @media (max-width: 767.98px) {
    .tct-sl-subbar { padding: 0 14px 12px; }
  }
  .tct-sl-size { display: flex; align-items: center; gap: 10px; margin: 0; font-size: 13px; font-weight: 500; color: #6b7a90; white-space: nowrap; }
  .tct-sl-size-toggle {
    display: inline-flex; align-items: center; justify-content: space-between; gap: 10px;
    min-width: 76px; height: 36px; padding: 0 10px 0 14px;
    font-size: 14px; font-weight: 600; line-height: 1; color: #364a63; cursor: pointer;
    background: #fff; border: 1px solid #dbdfea; border-radius: 8px;
    transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
  }
  .tct-sl-size-toggle .icon { font-size: 14px; color: #854fff; transition: transform 0.15s ease; }
  .tct-sl-size-toggle:hover { border-color: #c4b0ff; background: #fbf9ff; }
  .tct-sl-size-toggle:focus { outline: none; }
  .tct-sl-size-toggle:focus-visible,
  .tct-sl-size .show > .tct-sl-size-toggle { border-color: #854fff; box-shadow: 0 0 0 3px rgba(133, 79, 255, 0.18); }
  .tct-sl-size .show > .tct-sl-size-toggle .icon { transform: rotate(180deg); }
  .tct-sl-size .tct-sl-size-menu {
    z-index: 1000; min-width: 100px; margin-bottom: 6px; padding: 4px;
    background: #fff; border: 1px solid #e5e9f2; border-radius: 10px; box-shadow: 0 10px 28px rgba(31, 43, 58, 0.14);
  }
  .tct-sl-size .tct-sl-size-menu .dropdown-item {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 12px; border-radius: 6px; font-size: 14px; font-weight: 500; color: #364a63;
  }
  .tct-sl-size .tct-sl-size-menu .dropdown-item:hover,
  .tct-sl-size .tct-sl-size-menu .dropdown-item:focus { background: #f5f1ff; color: #4c1fd0; outline: none; }
  .tct-sl-size .tct-sl-size-menu .dropdown-item.active { background: #f1ebff; color: #4c1fd0; font-weight: 600; }
  .tct-sl-size .tct-sl-size-menu .dropdown-item .icon { font-size: 14px; color: #854fff; }

  /* Filter + settings icons */
  .tct-sl-toolbar .card-title-group { order: 3; margin-left: auto; }
  .tct-sl-toolbar .card-tools .btn-icon { border-radius: 8px; color: #526484; }
  .tct-sl-toolbar .card-tools .btn-icon:hover { background: #f5f1ff; color: #854fff; }
  .tct-sl-toolbar .dropdown-menu-xs { z-index: 1000; min-width: 140px; padding: 6px 0; border: 1px solid #e5e9f2; border-radius: 8px; background: #fff; box-shadow: 0 8px 24px rgba(31, 43, 58, 0.12); }
  /* Filter menu (Board / Grade / Subject) */
  .tct-sl-toolbar .filter-wg {
    z-index: 1000; padding: 0; overflow: visible;
    background: #fff; border: 1px solid #e5e9f2; border-radius: 12px; box-shadow: 0 12px 32px rgba(31, 43, 58, 0.14);
  }
  .tct-sl-toolbar .filter-wg .dropdown-head { padding: 14px 18px; border-bottom: 1px solid #eef0f5; }
  .tct-sl-toolbar .filter-wg .dropdown-title { font-size: 14px; font-weight: 700; color: #1c2b46; }
  .tct-sl-toolbar .filter-wg .dropdown-body { padding: 16px 18px 6px; }
  .tct-sl-toolbar .filter-wg label.overline-title { margin-bottom: 6px; font-size: 11px; letter-spacing: 0.06em; color: #8094ae; }
  .tct-sl-toolbar .filter-wg .react-select__control { min-height: 38px; border: 1px solid #dbdfea; border-radius: 8px; box-shadow: none; font-size: 14px; }
  .tct-sl-toolbar .filter-wg .react-select__control:hover { border-color: #c4b0ff; }
  .tct-sl-toolbar .filter-wg .react-select__control--is-focused { border-color: #854fff !important; box-shadow: 0 0 0 3px rgba(133, 79, 255, 0.12) !important; }
  .tct-sl-toolbar .filter-wg .react-select__indicator-separator { display: none; }
  .tct-sl-toolbar .filter-wg .react-select__menu { z-index: 1060; border: 1px solid #e5e9f2; border-radius: 8px; box-shadow: 0 8px 24px rgba(31, 43, 58, 0.12); overflow: hidden; }
  .tct-sl-toolbar .filter-wg .react-select__option--is-focused { background: #f5f1ff; }
  .tct-sl-toolbar .filter-wg .react-select__option--is-selected { background: #854fff; color: #fff; }
  .tct-sl-toolbar .filter-wg .btn-secondary { height: 38px; padding: 0 22px; border-radius: 8px; font-weight: 600; background: #854fff; border-color: #854fff; color: #fff; }
  .tct-sl-toolbar .filter-wg .btn-secondary:hover { background: #7339f0; border-color: #7339f0; }
  /* Settings menu: "Show" moved to the Rows per page control, so hide it here (Order stays). */
  .tct-sl-toolbar .dropdown-menu-xs .link-check:first-child { display: none; }
  .tct-sl-toolbar .dropdown-menu-xs .link-check + .link-check { border-top: 0; }

  /* Table */
  .tct-sl .dataTables_wrapper > .row:empty { display: none; }
  .tct-sl .rdt_TableHeadRow { min-height: 46px; background: #f8f9fc; border-bottom: 1px solid #e5e9f2; }
  .tct-sl .rdt_TableCol { font-size: 12px; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; color: #8094ae; }
  .tct-sl .rdt_TableRow { min-height: 64px; font-size: 14px; color: #526484; }
  .tct-sl .rdt_TableRow:not(:last-of-type) { border-bottom-color: #eef0f5; }
  .tct-sl .rdt_TableRow:hover { background: #faf8ff; }
  .tct-sl .rdt_TableCell .user-card .tb-lead { font-weight: 600; color: #364a63; }
  .tct-sl .rdt_TableCell .user-card:hover .tb-lead { color: #854fff; }
  .tct-sl .rdt_TableCell .btn-trigger.btn-icon { width: 32px; height: 32px; border-radius: 8px; color: #6e82a5; }
  .tct-sl .rdt_TableCell .btn-trigger.btn-icon:hover { background: #f5f1ff; color: #854fff; }
  .tct-sl .rdt_TableCell .btn-trigger.btn-icon:before { display: none; }

  /* Pagination: directly under the table, inside the card */
  .tct-sl .dataTables_wrapper .row.align-items-center { margin: 0; padding: 12px 18px; border-top: 1px solid #e5e9f2; background: transparent; }
  .tct-sl .dataTables_wrapper .row.align-items-center > [class*="col"] { padding: 0; background: transparent; box-shadow: none; }
  /* LeadLists.css has an unscoped .pagination rule (padding, border-top, white background) that leaks here
     and pushed Prev/Next lower than Rows per page; undo it on this page only. */
  .tct-sl .dataTables_wrapper .row.align-items-center .pagination { margin: 0; padding: 0; border-top: 0; background: transparent; }
  .tct-sl .dataTables_info { font-size: 13px; color: #8094ae; }

  @media (max-width: 767.98px) {
    .tct-sl-toolbar { padding: 12px 14px; }
    .tct-sl-toolbar .entrolled-list[title] { flex-basis: 100%; }
    .tct-sl-toolbar .card-search.search-wrap { flex: 1 1 100%; }
    .tct-sl-toolbar .card-title-group { margin-left: auto; }
    .tct-sl-title.nk-block-title { font-size: 1.35rem; }
  }
`;

const StudentList = () => {
  const location = useLocation();
  const headerSearch = new URLSearchParams(location.search).get("search") || "";
  const listRequest = useRef(0);
  const searchTimer = useRef(null);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState("");
  const defaultGuid = "00000000-0000-0000-0000-000000000000";
  const { canAny, canAll, can } = usePermissions();
  const [isDelete, setIsDelete] = useState(false);
  const [courseList, setCourseList] = useState([]);
  const { contextData } = useContext(StudentContext);
  const [data, setData] = contextData;
  const [openCourseModal, setOpenCourseModal] = useState(false);
  const [openAudioModal, setOpenAudioModal] = useState(false);
  const [audioContent, setAudioContent] = useState("");
  const [audioContentType, setAudioContentType] = useState("audio/mpeg");
  const [openBankModal, setOpenBankModal] = useState(false);
  const [mapBankLoading, setMapBankLoading] = useState(false);
  const [sm, updateSm] = useState(false);
  const [onSearchText] = useState("");
  const [studentDataSource, setStudentDataSource] = useState();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemPerPage] = useState(10);
  const [dataSource, setDataSource] = useState();
  const [boardId, setBoardId] = useState(defaultGuid);
  const [gradeId, setGradeId] = useState(defaultGuid);
  const [subjectId, setSubjectId] = useState(defaultGuid);
  const [searchText, setSearchText] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [pageNumber, setPageNumber] = useState(1);
  const pageNumberRef = useRef(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [resetPaginationToggle, setResetPaginationToggle] = useState(false);
  const [bankList, setBankList] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(defaultGuid);
  const [selectedStudentName, setSelectedStudentName] = useState("");
  const [formData, setFormData] = useState({
    StudentId: defaultGuid,
    Id: defaultGuid,
    UserId: localStorage.getItem("userId"),
  });
  const userRole = localStorage.getItem("roleId");
  const userRoleName = localStorage.getItem("userRole");
  const isTutorView = userRole === "13"; // Tutor: gets the redesigned layout below; other roles are unchanged.
  const isCoordinatorView = userRole === "6"; // Coordinator: separate redesigned layout (StudentList.css, .tct-csl).
  // Tutor profile links carry this page as their origin so the profile's Back button returns here.
  const tutorProfileOrigin = { from: `${process.env.PUBLIC_URL}/lms/studentlist` };
  const canDeleteStudent =
    userRoleName?.trim().toLowerCase() !== "coordinatoradmin" &&
    can("Student List", "delete");
  const canViewCoordinatorAudio = ["SuperAdmin", "SalesAdmin", "CoordinatorAdmin", "Coordinator"].includes(userRoleName);
  const { setValue, trigger, clearErrors } = useForm();
  useEffect(() => {
    pageNumberRef.current = 1;
    setBoardId(defaultGuid);
    setGradeId(defaultGuid);
    setSubjectId(defaultGuid);
    setResetPaginationToggle(value => !value);
    setSearchText(headerSearch);
    clearTimeout(searchTimer.current);
    GetBoardViseStudents(defaultGuid, defaultGuid, defaultGuid, headerSearch, pageSize, 1);
    return () => { clearTimeout(searchTimer.current); listRequest.current += 1; };
  }, [headerSearch]);

  // Changing state value when searching name
  useEffect(() => {
    if (onSearchText !== "") {
      const filteredObject = StudetnData.filter((item) => {
        return (
          item.name.toLowerCase().includes(onSearchText.toLowerCase()) ||
          item.email.toLowerCase().includes(onSearchText.toLowerCase())
        );
      });
      setData([...filteredObject]);
    } else {
      setData([...StudetnData]);
    }
  }, [onSearchText, setData]);

  const getImageSource = (data) => {
    if (data.fileData == null || data.fileData == "") {
      return "";
    }
    const url = `data:image/jpeg;base64, ${data.fileData}`;
    return url;
  };

  const dtStudentColumns = [
    {
      name: "Code",
      width: "100px",
      selector: (row) => row.code,
      sortable: true,
      cell: (row) => <span>{row.code}</span>,
    },
    {
      name: "Student Name",
      minWidth: "250px",
      selector: (row) => row.studentName,
      compact: true,
      grow: 3,
      style: { paddingRight: "10px" },
      cell: (row) => (
        // <Link className="user-card mt-2 mb-2" to={`${process.env.PUBLIC_URL}/student-profile?id=${row.userId}`}>
          <Link
            className="user-card mt-2 mb-2"
            to={userRole === "13"
              ? { pathname: `${process.env.PUBLIC_URL}/student-profile`, search: `?id=${row.userId}`, state: tutorProfileOrigin }
              : `${process.env.PUBLIC_URL}/student-profile-regular-new?id=${row.id}&userId=${row.userId}&mode=view`}
          >
          <UserAvatar1
            image={getImageSource(row)}
            theme={getColor(row.studentName)}
            text={findUpper1(row.studentName)}>
                </UserAvatar1>
           <div className="user-info">
                <span className="tb-lead">
              {row.studentName}{" "}
              <span
                className={`dot dot-${
                  row.isActive === true ? "success" : row.isActive === false ? "warning" : "danger"
                } d-md-none ml-1`}
              ></span>
            </span>
            {userRole != "13" /*Tutor*/ && (
              <>
                {row.emailAddress && <span>{row.emailAddress}</span>}
                {row?.mobileNumber && (
                  <>
                    <br></br>
                    <span>{row.mobileNumber}</span>
                  </>
                )}
              </>
            )}
          </div> 
        
        </Link>
      ),
      sortable: true,
    },
    {
      name: "Courses",
      width: "150px",
      selector: (row) => row.enrolledCourse,
      cell: (row) => (
        <div>
          <span>{row.enrolledCourse}</span>
          {userRole != "13" /*Tutor*/ && (
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
          )}
        </div>
      ),
    },
    {
      name: "Parent Name",
      minWidth: "180px",
      selector: (row) => row.parentName,
      cell: (row) => <span>{row.parentName}</span>,
    },
    {
      name: "DOB",
      selector: (row) => row.dob,
      sortable: true,
      cell: (row) => <span>{row.dob != null ? moment(row.dob).format("DD-MM-yyyy") : ""}</span>,
    },
    ...(canViewCoordinatorAudio
      ? [{
          name: "Instructions",
          width: "120px",
          cell: (row) => row.audioFileData ? (
            <Button
              color="primary"
              outline
              size="sm"
              type="button"
              onClick={() => {
                setAudioContent(row.audioFileData);
                setAudioContentType(row.audioContentType || "audio/mpeg");
                setOpenAudioModal(true);
              }}
            >
              <Icon name="play-circle" /> Play
            </Button>
          ) : <span className="text-soft">—</span>,
        }]
      : []),
    {
      name: "Action",
      minWidth: "100px",
      selector: (row) => row.userId,
      cell: (row) => (
        <>
          {canDeleteStudent && (
            <span
              onClick={() => {
                onDeleteHandler(row.userId);
              }}
            >
              <TooltipComponent
                tag="a"
                containerClassName="btn btn-trigger btn-icon"
                id={"delete" + row.id}
                icon="ni ni-trash"
                direction="top"
                text="Delete"
              />
            </span>
          )}
          {userRole !== "13" && can("Student List", "edit") && (
            <Link
              className="user-card mt-2 mb-2"
              to={`${process.env.PUBLIC_URL}/student-profile-regular-new?id=${row.id}&userId=${row.userId}&mode=edit`}
            >
              <TooltipComponent
                tag="a"
                containerClassName="btn btn-trigger btn-icon"
                id={"edit" + row.id}
                icon="edit"
                direction="top"
                text="Edit"
              />
            </Link>
          )}
          {can("Student List", "view") && (
            <Link
              className="user-card mt-2 mb-2"
              to={userRole === "13"
                ? { pathname: `${process.env.PUBLIC_URL}/student-profile`, search: `?id=${row.userId}`, state: tutorProfileOrigin }
                : `${process.env.PUBLIC_URL}/student-profile-regular-new?id=${row.id}&userId=${row.userId}&mode=view`}
            >
              <TooltipComponent
                tag="a"
                containerClassName="btn btn-trigger btn-icon"
                id={"view" + row.id}
                icon="eye"
                direction="top"
                text="View"
              />
            </Link>
          )}
          {canMapTctBank(userRoleName) && can("Student List", "mapbank") && (
            <Link
              className="user-card mt-2 mb-2"
              to="#"
              onClick={() => {
                setSelectedStudentId(row.id);
                setSelectedStudentName(row.studentName);
                setFormData((prev) => ({ ...prev, Id: row.tctBankID }));
                getActiveTCTBankDetails().then((data) => {
                  console.log("Bank List: ", data);
                  setOpenBankModal(true);
                  setBankList(data);
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
            </Link>
          )}
          <Link
  className="user-card mt-2 mb-2"
  to={`/lms/completed-class-details?studentId=${row.id}`}
  target="_blank"
>
  <TooltipComponent
    tag="span"
    containerClassName="btn btn-trigger btn-icon"
    id={"attendance" + row.id}
    icon="icon ni ni-calendar"
    direction="top"
    text="View Attendance"
  />
</Link>
        </>
      ),
    },
  ];

  // Coordinator table only: column sizing so headers line up with their cells and the action icons fit.
  // Same column objects otherwise (selectors, sorting, cells and handlers unchanged).
  const coordinatorColumnLayout = {
    "Code": { width: "110px" },
    "Student Name": { minWidth: "280px", grow: 3, compact: false, style: undefined },
    "Courses": { width: undefined, minWidth: "160px", grow: 1 },
    "Parent Name": { minWidth: "150px", grow: 1 },
    "DOB": { width: "130px" },
    "Instructions": { width: "130px" },
    "Action": { minWidth: "230px", grow: 0, right: true },
  };
  const coordinatorColumns = dtStudentColumns.map((col) =>
    coordinatorColumnLayout[col.name] ? { ...col, ...coordinatorColumnLayout[col.name] } : col
  );

  // Get current list, pagination
  const indexOfLastItem = currentPage * itemPerPage;
  const indexOfFirstItem = indexOfLastItem - itemPerPage;
  const currentItems = data.slice(indexOfFirstItem, indexOfLastItem);
  const CloseButton = () => {
    return (
      <span className="btn-trigger toast-close-button" role="button">
        <Icon name="cross"></Icon>
      </span>
    );
  };
  const onDeleteHandler = (id) => {
    const userId = id;
    Swal.fire({
      title: "Are you sure want to delete the user?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (result.isConfirmed) {
        setIsDelete(true);
        setUserStatus(userId, false)
          .then(() => {
            toast.success("Student deleted successfully.", {
              position: "top-right",
              autoClose: true,
              hideProgressBar: true,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              progress: false,
              closeButton: <CloseButton />,
            });
            GetBoardViseStudents(boardId, gradeId, subjectId, searchText, pageSize, pageNumberRef.current);
          })
          .catch(() => {
            toast.error("Unable to delete the student. Please try again.");
          })
          .finally(() => setIsDelete(false));
      }
    });
  };

  const handlePageChange = (page) => {
    clearTimeout(searchTimer.current);
    pageNumberRef.current = page;
    GetBoardViseStudents(boardId, gradeId, subjectId, searchText, pageSize, page);
  };

  const filterHandlerCallback = (_boardId, _gradeId, _subjectId, text, size) => {
    setBoardId(_boardId);
    setGradeId(_gradeId);
    setSubjectId(_subjectId);
    setSearchText(text);
    pageNumberRef.current = 1;
    setResetPaginationToggle((prev) => !prev);
    const effectiveSize = size ?? pageSize;
    if (size !== undefined) setPageSize(size);
    clearTimeout(searchTimer.current);
    listRequest.current += 1;
    searchTimer.current = setTimeout(() => {
      GetBoardViseStudents(_boardId, _gradeId, _subjectId, text, effectiveSize, 1);
    }, 300);
  };

  const GetBoardViseStudents = (_boardId, _gradeId, _subjectId, text, pageSize, _pageNumber) => {
    const roleId = localStorage.getItem("roleId");
    const userId = localStorage.getItem("userId");

    const requestId = ++listRequest.current;
    setListLoading(true);
    setListError("");
    const applyResult = (data) => {
      if (requestId === listRequest.current) {
        setStudentDataSource(data?.data);
        setDataSource(data?.data);
        setTotalRecords(data?.totalRecords ?? 0);
      }
    };
    let request;
    if (roleId == "13" /* Tutor */) {
      request = GetStudentsbyTutor(userId, _boardId, _gradeId, _subjectId, text, pageSize, _pageNumber);
    } else if (roleId == "6" /* Coordinator */ || roleId == "4" /* Operations */) {
      request = GetStudentsByUser(userId, parseInt(roleId), _boardId, _gradeId, _subjectId, text, pageSize, _pageNumber);
    } else {
      request = GetStudents(_boardId, _gradeId, _subjectId, text, pageSize, _pageNumber);
    }
    request.then(applyResult).catch(() => {
      if (requestId === listRequest.current) setListError("Unable to load students. Please search again to retry.");
    }).finally(() => { if (requestId === listRequest.current) setListLoading(false); });
  };

  const onFormCancel = () => {
    setOpenBankModal(false);
  };


  const { errors, register, handleSubmit } = useForm();

  const onFormSubmit = async (form) => {
    if (!canMapTctBank(userRoleName)) return;
    const dataToSubmit = {
      UserId: localStorage.getItem("userId"),
      StudentId: selectedStudentId,
      BankDetailId: formData.Id,
    };

    console.log("Sending data:", dataToSubmit);

    setMapBankLoading(true);
    updateTCTBankDetailToStudent(dataToSubmit)
      .then((response) => {
        console.log("Response received:", response);
        toast.success("Bank Details updated successfully.");
        setOpenBankModal(false);
        GetBoardViseStudents(defaultGuid, defaultGuid, defaultGuid, "", pageSize, 1);
      })
      .catch((error) => {
        console.error("Error details:", error);
        toast.error("An error occurred while processing your request.");
      })
      .finally(() => setMapBankLoading(false));
  };
  return (
    <React.Fragment>
      <Head title="Student List"></Head>
      <Content>
        {isTutorView && <style>{tutorStudentListStyle}</style>}
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle tag="h4" className={isTutorView ? "tct-sl-title" : isCoordinatorView ? "tct-csl-title" : undefined}>Student List</BlockTitle>
              {isTutorView && <div className="tct-sl-des">Students assigned to you.</div>}
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
                    <li></li>
                  </ul>
                </div>
              </div>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        <Block>
          <div className={isTutorView ? "tct-sl" : isCoordinatorView ? "tct-csl" : undefined}>
          <div className={isTutorView ? "tct-sl-toolbar" : isCoordinatorView ? "tct-csl-toolbar" : undefined}>
            <StudentFilter key={headerSearch} initialSearch={headerSearch} filterHandlerCallback={filterHandlerCallback} coordinatorView={isCoordinatorView}></StudentFilter>
          </div>
          {listLoading && <div role="status" className="px-3">Loading students…</div>}
          {listError && <div role="alert" className="text-danger px-3">{listError}</div>}
          {isCoordinatorView && studentDataSource && (
            <div className="dataTables_wrapper dt-bootstrap4 no-footer tct-csl-table">
              <RdtDataTable
                data={studentDataSource}
                columns={coordinatorColumns}
                noDataComponent={<div className="p-2">There are no records found</div>}
                sortIcon={
                  <div>
                    <span>&darr;</span>
                    <span>&uarr;</span>
                  </div>
                }
                pagination
                paginationServer
                paginationPerPage={pageSize}
                paginationRowsPerPageOptions={COORDINATOR_PAGE_SIZES}
                paginationTotalRows={totalRecords}
                onChangePage={handlePageChange}
                paginationResetDefaultPage={resetPaginationToggle}
                paginationComponent={CoordinatorStudentPagination}
                paginationComponentOptions={{
                  // Same call the settings menu's "Show" items made: the existing page-size handler.
                  onPageSizeSelected: (size) => filterHandlerCallback(boardId, gradeId, subjectId, searchText, size),
                }}
              />
            </div>
          )}
          {!isCoordinatorView && studentDataSource && (
            <ReactDataTable
              canShowFilter={false}
              data={studentDataSource}
              columns={dtStudentColumns}
              pageSize={pageSize}
              pagination
              paginationServer
              paginationTotalRows={totalRecords}
              onChangePage={handlePageChange}
              paginationResetDefaultPage={resetPaginationToggle}
            />
          )}
          {isTutorView && studentDataSource?.length > 0 && (
            <div className="tct-sl-subbar">
              <div className="tct-sl-size">
                <span>Rows per page</span>
                {/* Themed dropdown (a native <select>'s option list cannot be styled). Opens upward so it stays inside the card. */}
                <UncontrolledDropdown direction="up">
                  <DropdownToggle tag="button" type="button" className="tct-sl-size-toggle" aria-label={`Rows per page: ${pageSize}`}>
                    <span>{pageSize}</span>
                    <Icon name="chevron-down" />
                  </DropdownToggle>
                  <DropdownMenu right className="tct-sl-size-menu">
                    {[5, 10, 15].map((size) => (
                      <DropdownItem
                        key={size}
                        tag="button"
                        type="button"
                        active={Number(pageSize) === size}
                        onClick={() => {
                          // Same call the settings menu's "Show" items make (existing page-size handler).
                          if (Number(pageSize) !== size)
                            filterHandlerCallback(boardId, gradeId, subjectId, searchText, size);
                        }}
                      >
                        <span>{size}</span>
                        {Number(pageSize) === size && <Icon name="check" />}
                      </DropdownItem>
                    ))}
                  </DropdownMenu>
                </UncontrolledDropdown>
              </div>
            </div>
          )}
          </div>
        </Block>

        <Modal
          scrollable={false}
          isOpen={openCourseModal}
          toggle={() => setOpenCourseModal(false)}
          className="modal-dialog-centered"
          size="sm"
        >
          <ModalHeader>Enrolled Courses</ModalHeader>
          <ModalBody>
            <ul class="link-list-opt">
              {courseList.length > 0 ? courseList.map((item) => <li class="tb-lead p-1">{item.subjectName}</li>) : null}
            </ul>
          </ModalBody>
        </Modal>
        <Modal
          isOpen={openAudioModal}
          toggle={() => setOpenAudioModal(false)}
          className="modal-dialog-centered"
        >
          <ModalHeader toggle={() => setOpenAudioModal(false)}>Coordinator Instructions</ModalHeader>
          <ModalBody>
            {audioContent && (
              <audio controls autoPlay className="w-100" src={`data:${audioContentType};base64,${audioContent}`} />
            )}
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
          setValue={setValue}
          trigger={trigger}
          handleSubmit={handleSubmit}
        />
        <ToastContainer />
      </Content>
    </React.Fragment>
  );
};
export default StudentList;
