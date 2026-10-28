import React, { useContext, useEffect, useMemo, useState, useRef } from "react";
import moment from "moment";
import {
  DropdownMenu,
  DropdownToggle,
  FormGroup,
  UncontrolledDropdown,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  DropdownItem,
  Row,
  Form,
} from "reactstrap";
import DatePicker from "react-datepicker";
import PhoneInput, {
  formatPhoneNumber,
  formatPhoneNumberIntl,
  isPossiblePhoneNumber,
  isValidPhoneNumber,
} from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { getLookups, getAllRoles } from "../../../apiservices/LookupsService";
import Swal from "sweetalert2";
import { ToastContainer } from "react-toastify";
import { toast } from "react-toastify";
import {
  Block,
  BlockBetween,
  BlockDes,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Icon,
  Col,
  PreviewCard,
  UserAvatar,
  PaginationComponent,
  Button,
  DataTableHead,
  DataTableRow,
  DataTableItem,
  TooltipComponent,
  RSelect,
  PreviewAltCard,
  ReactDataTable,
} from "../../../components/Component";
import Content from "../../../layout/content/Content";
import Head from "../../../layout/head/Head";
import { findUpper } from "../../../utils/Utils";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { getUsers, createUser, deleteUser, getTCTUserById } from "../../../apiservices/UserService";
import { getAllTutor, getTutorSkillset } from "../../../apiservices/TutorService";
import UserAvatar1 from "../../../components/user/UserAvatar1";
import { findUpper1, getColor } from "../../../utils/Utils";
import ToturForm from "./TutorForm";
import EditTCTTutor from "./EditTCTTutor";
import { usePermissions } from "../../../hooks/usePermissions";
import TCTTutorListGrid from "./TutorFilterColumnGrid";
import { useDispatch, useSelector } from "react-redux";
import { toggleFilter } from "../../../features/tutorFilterSlice";
import { toggleColumn } from "../../../features/tutorColumnSlice";
import { useLocation } from "react-router-dom";
import DataTable from "react-data-table-component";
import { Spinner } from "reactstrap";
import TutorListPagination from "./TutorListPagination";
import "./TutorList.css";

// Pagination component for the client-side tutor table. Defined at module level so the table does not
// remount it on every render; paginationComponentOptions.onPageSizeSelected keeps the page's size in sync.
const TutorTablePagination = ({ currentPage, rowsPerPage, rowCount, onChangePage, onChangeRowsPerPage, paginationComponentOptions }) => (
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

const TutorSkillsRow = ({ data }) => {
  const [skills, setSkills] = useState(null);

  useEffect(() => {
    getTutorSkillset(data.id)
      .then((res) => setSkills(res.data ?? []))
      .catch(() => setSkills([]));
  }, [data.id]);

  if (skills === null) {
    return <div className="p-2 text-muted" style={{ fontSize: "13px" }}>Loading skills...</div>;
  }

  if (skills.length === 0) {
    return <div className="p-2 text-muted" style={{ fontSize: "13px" }}>No skills added.</div>;
  }

  return (
    <div style={{ padding: "8px 16px 12px", backgroundColor: "#f8f9fc" }}>
      <table className="table table-sm table-bordered" style={{ fontSize: "13px", marginBottom: 0, maxWidth: "600px" }}>
        <thead style={{ backgroundColor: "#e5e9f2" }}>
          <tr>
            <th>Board</th>
            <th>Grade</th>
            <th>Subject</th>
            <th>Payment (₹)</th>
          </tr>
        </thead>
        <tbody>
          {skills.map((s, i) => (
            <tr key={i}>
              <td>{s.boardName || "—"}</td>
              <td>{s.gradeName || "—"}</td>
              <td>{s.subjectName || "—"}</td>
              <td>{s.tutorPayment ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const TCTTutorList = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const saleDetailsId = queryParams.get("id");
  const defaultGuid = "00000000-0000-0000-0000-000000000000";

  const [userDataSource, setUserDataSource] = useState(undefined);
  const [sm, updateSm] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isDelete, setIsDelete] = useState(false);
  const [genderList, setGenderList] = useState([]);
  const [designationList, setDesignationList] = useState([]);
  const [roleList, setRoleList] = useState([]);
  const [tutorId, setTutorId] = useState("");
  const [tutorsError, setTutorsError] = useState("");

  // Tutor-name search lives in the page toolbar. It filters the tutor list below and, when the filter
  // panel is open, is sent with the Board / Grade Groups / Grade / Subject filters.
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [resetPageToggle, setResetPageToggle] = useState(false);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const searchTimer = window.setTimeout(() => setAppliedSearch(searchInput.trim()), 400);
    return () => window.clearTimeout(searchTimer);
  }, [searchInput]); // Search after the user pauses typing (same delay as the filter panel had).

  useEffect(() => setResetPageToggle((x) => !x), [appliedSearch]); // new search: back to page 1

  const dispatch = useDispatch();
  const showFilter = useSelector((state) => state.filter.showFilter);
  const columnState = useSelector((state) => state.tutorColumns);

  const [formData, setFormData] = useState({
    id: defaultGuid,
    firstName: "",
    lastName: "",
    userCode: "",
    email: "",
    phone: "",
    alternatePhone: "",
    dob: "",
    gender: "",
    designationId: "",
    roleId: "",
    userType: defaultGuid,
    isSystemUser: true,
    isAdminUser: false,
    createdBy: defaultGuid,
    createdDate: new Date(),
    isActive: true,
    addresses: {
      createdBy: defaultGuid,
      createdDate: new Date(),
      isActive: true,
      id: defaultGuid,
      userId: defaultGuid,
      addressLine1: "",
      addressLine2: "",
      addressLine3: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
      isPrimary: true,
    },
  });

  // ─── Helper to safely extract array from various API response shapes ───────
  const extractArray = (data) => {
    if (!data) return [];
    // .NET System.Text.Json ReferenceHandler: { "$id": "1", "$values": [...] }
    if (data.$values && Array.isArray(data.$values)) return data.$values;
    // Plain array
    if (Array.isArray(data)) return data;
    // Wrapped in items/results/data
    if (data.items && Array.isArray(data.items)) return data.items;
    if (data.results && Array.isArray(data.results)) return data.results;
    if (data.data && Array.isArray(data.data)) return data.data;
    // Single object — wrap in array
    if (typeof data === "object") return [data];
    return [];
  };

  // ─── Fetch tutors and update state ────────────────────────────────────────
  const fetchTutors = async () => {
    setTutorsError("");
    try {
      const tutorResponse = await getAllTutor();
      console.log("Tutor API raw response:", tutorResponse);
      const tutors = extractArray(tutorResponse?.data);
      console.log("Parsed tutors array:", tutors);
      setUserDataSource(tutors);
    } catch (error) {
      console.error("Error fetching tutors:", error);
      setUserDataSource([]); // prevent infinite spinner
      setTutorsError(error?.response?.data?.message || error?.message || "Unable to load tutors.");
    }
  };

  // ─── Initial data load ────────────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch tutors
        await fetchTutors();

        // Fetch gender lookups
        const genderResponse = await getLookups("600" /*gender*/);
        let tempGender = [];
        genderResponse.forEach((s) => {
          tempGender.push({ value: s?.id, label: s?.typeCodeName, id: s?.id });
        });
        setGenderList(tempGender);

        // Fetch designation lookups
        const designationResponse = await getLookups("700" /*designation*/);
        let tempDesignation = [];
        designationResponse.forEach((s) => {
          tempDesignation.push({ value: s?.id, label: s?.typeCodeName });
        });
        setDesignationList(tempDesignation);

        // Fetch roles
        const rolesResponse = await getAllRoles();
        let tempRoles = [];
        rolesResponse.forEach((s) => {
          tempRoles.push({ value: s?.id.toString(), label: s?.roleName });
        });
        setRoleList(tempRoles);
      } catch (error) {
        console.error("Error fetching initial data:", error);
        setUserDataSource([]); // prevent infinite spinner on error
      }
    };

    fetchData();
  }, [saleDetailsId]);

  // ─── Re-fetch tutors when modal/delete state changes ─────────────────────
  useEffect(() => {
    // Skip on first render — initial load already handles this
    if (!editModalOpen && !isAddModalOpen && !isDelete) return;
    fetchTutors();
  }, [editModalOpen, isAddModalOpen, isDelete]);

  const dtUserColumns = [
    {
      name: "Code",
      selector: (row) => row.userCode,
      // data-tag: clicking the text counts as a row click (row click expands the tutor's details).
      cell: (row) => <span data-tag="allowRowEvents">{row.userCode}</span>,
    },
    {
      name: "Name",
      selector: (row) => row.fullName,
      grow: 2,
      style: { paddingRight: "20px" },
      cell: (row) => (
        <Link
          className="user-card mt-2 mb-2"
          to={`${process.env.PUBLIC_URL}/lms/user-details?id=${row.tutorId}&userId=${row.id}`}
        >
          <UserAvatar1
            image={getImageSource(row)}
            theme={getColor(row.fullName)}
            text={findUpper1(row.fullName)}
          ></UserAvatar1>
          <div className="user-info">
            <span className="tb-lead">
              {row.fullName}{" "}
              <span
                className={`dot dot-${
                  row.isActive === true ? "success" : row.isActive === false ? "warning" : "danger"
                } d-md-none ml-1`}
              ></span>
            </span>
            {row.email && <span>{row.email}</span>}
            {row?.phone && (
              <>
                <br />
                <span>{row.phone}</span>
              </>
            )}
          </div>
        </Link>
      ),
      sortable: true,
    },
    {
      name: "Gender",
      selector: (row) => row.gender,
      sortable: true,
      cell: (row) => <span data-tag="allowRowEvents">{row.gender}</span>,
    },
    {
      name: "DOB",
      selector: (row) => row.dob,
      cell: (row) => <span data-tag="allowRowEvents">{moment(row.dob).format("DD-MMM-yyyy")}</span>,
    },
    {
      name: "Actions",
      width: "140px",
      center: true,
      ignoreRowClick: true, // Delete / Edit / View never expand the row
      cell: (row) => (
        <div className="tutor-list-actions">
          {can("Tutor List", "delete") && (
            <span onClick={() => onDeleteHandler(row.id)}>
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

          {can("Tutor List", "edit") && (
            <span
              onClick={() => {
                onEditHandler(row.tutorId);
                setTutorId(row.tutorId);
              }}
            >
              <TooltipComponent
                tag="a"
                containerClassName="btn btn-trigger btn-icon"
                id={"edit" + row.id}
                icon="edit"
                direction="top"
                text="Edit"
              />
            </span>
          )}

          {can("Tutor List", "view") && (
            <Link to={`${process.env.PUBLIC_URL}/lms/user-details?id=${row.tutorId}&userId=${row.id}`}>
              <TooltipComponent
                tag="span"
                containerClassName="btn btn-trigger btn-icon"
                id={"view" + row.id}
                icon="eye"
                direction="top"
                text="View"
              />
            </Link>
          )}
        </div>
      ),
    },
  ];

  const formRef = useRef(null);

  const getImageSource = (data) => {
    if (data.fileData == null) return "";
    return `data:image/jpeg;base64, ${data.fileData}`;
  };

  const CloseButton = () => (
    <span className="btn-trigger toast-close-button" role="button">
      <Icon name="cross"></Icon>
    </span>
  );

  const onEditFormSubmit = (data) => {
    const inputData = formData;
    if (!isValidPhoneNumber(inputData.phone)) {
      toast.error("Please enter the valid phone number.", {
        position: "top-right",
        autoClose: true,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: false,
        closeButton: <CloseButton />,
      });
      return;
    }
    inputData["phone"] = formatPhoneNumberIntl(inputData.phone);
    inputData["dob"] = moment(inputData.dob).format("YYYY-MM-DD");
    createUser(inputData).then(() => {
      setEditModalOpen(false);
      toast.success("Data updated successfully.", {
        position: "top-right",
        autoClose: true,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: false,
        closeButton: <CloseButton />,
      });
    });
  };

  const onFormSubmit = (submitData) => {
    const inputData = formData;
    if (!isValidPhoneNumber(inputData.phone)) {
      toast.error("Please enter the valid phone number.", {
        position: "top-right",
        autoClose: true,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: false,
        closeButton: <CloseButton />,
      });
      return;
    }
    inputData["phone"] = formatPhoneNumberIntl(inputData.phone);
    inputData["dob"] = moment(inputData.dob).format("YYYY-MM-DD");
    createUser(inputData).then(() => {
      setIsAddModalOpen(false);
      fetchTutors();
      toast.success("Data Saved successfully.", {
        position: "top-right",
        autoClose: true,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: false,
        closeButton: <CloseButton />,
      });
    });
  };

  const onDeleteHandler = (id) => {
    Swal.fire({
      title: "Are you sure want to delete the user?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (result.isConfirmed) {
        deleteUser(id).then(() => {
          toast.success("User deleted successfully.", {
            position: "top-right",
            autoClose: true,
            hideProgressBar: true,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: false,
            closeButton: <CloseButton />,
          });
          setIsDelete((prev) => !prev); // toggle to trigger re-fetch
        });
      }
    });
  };

  const onEditHandler = (id) => {
    setEditModalOpen(true);
  };

  // Tutor list (filter panel closed): all tutors are loaded once, so search, sorting and paging are
  // client-side. The table keeps the page state; TutorListPagination is its pagination component.
  const searchTerm = appliedSearch.toLowerCase();
  const visibleTutors = (userDataSource || []).filter(
    (row) => !searchTerm || (row.fullName || "").toLowerCase().includes(searchTerm)
  );

  const tablePaginationOptions = useMemo(() => ({ onPageSizeSelected: setPageSize }), []);

  const renderTutorTable = () => {
    if (userDataSource === undefined) {
      return (
        <div className="tutor-list-state" role="status">
          <Spinner size="sm" color="primary" /> Loading tutors…
        </div>
      );
    }
    if (tutorsError) {
      return (
        <div className="tutor-list-state">
          <em className="icon ni ni-alert-circle text-danger"></em>
          <p>{tutorsError}</p>
          <Button size="sm" color="primary" outline type="button" onClick={fetchTutors}>
            Try again
          </Button>
        </div>
      );
    }
    return (
      <div className="tutor-list-table">
        <DataTable
          data={visibleTutors}
          columns={dtUserColumns}
          className="nk-tb-list"
          pagination
          paginationPerPage={pageSize}
          paginationResetDefaultPage={resetPageToggle}
          paginationComponent={TutorTablePagination}
          paginationComponentOptions={tablePaginationOptions}
          expandableRows
          expandableRowsComponent={TutorSkillsRow}
          expandOnRowClicked
          highlightOnHover
          pointerOnHover
          noDataComponent={
            <div className="tutor-list-state">
              {appliedSearch ? `No tutors match "${appliedSearch}".` : "There are no records found"}
            </div>
          }
          sortIcon={
            <div>
              <span>&darr;</span>
              <span>&uarr;</span>
            </div>
          }
        />
      </div>
    );
  };

  const applySearchNow = (ev) => {
    ev.preventDefault();
    setAppliedSearch(searchInput.trim());
  };

  const editModalStateChange = (input) => {
    setEditModalOpen(input);
    if (!input) fetchTutors(); // re-fetch when modal closes
  };

  const modalStateChange = (input) => {
    setIsAddModalOpen(input);
    if (!input) fetchTutors(); // re-fetch when modal closes
  };

  const { errors, register, handleSubmit } = useForm();
  const { canAny, canAll, can } = usePermissions();

  return (
    <>
      <React.Fragment>
        <Head title="Tutors"></Head>
        <Content>
          <div className="tct-tutor-list">
          <BlockHead size="sm">
            <BlockBetween className="tutor-list-head">
              <BlockHeadContent>
                <BlockTitle tag="h5">Tutors</BlockTitle>
              </BlockHeadContent>
              <BlockHeadContent className="tutor-list-toolbar">
                <form className="tutor-list-search" role="search" onSubmit={applySearchNow}>
                  <div className="form-control-wrap">
                    <div className="form-icon form-icon-left">
                      <Icon name="search"></Icon>
                    </div>
                    <input
                      type="search"
                      className="form-control"
                      placeholder="Search by tutor name"
                      aria-label="Search by tutor name"
                      value={searchInput}
                      onChange={(ev) => setSearchInput(ev.target.value)}
                    />
                  </div>
                  <Button color="primary" type="submit">
                    Search
                  </Button>
                </form>
                <div className="toggle-wrap nk-block-tools-toggle">
                  {can("Tutor List", "add") && (
                    <Button
                      className={`btn-icon btn-trigger toggle-expand mr-n1 ${sm ? "active" : ""}`}
                      onClick={() => updateSm(!sm)}
                      aria-label="Show page actions"
                    >
                      <Icon name="menu-alt-r"></Icon>
                    </Button>
                  )}

                  {can("Tutor List", "add") && (
                    <div className={`toggle-expand-content ${sm ? "expanded" : ""}`}>
                      <ul className="nk-block-tools g-3">
                        <li
                          onClick={(ev) => {
                            ev.preventDefault();
                            dispatch(toggleFilter());
                          }}
                        >
                          <TooltipComponent
                            tag="a"
                            id="ShowFilter"
                            containerClassName={`btn btn-trigger btn-icon tutor-filter-toggle ${showFilter ? "is-open" : ""}`}
                            icon="opt-dot-alt"
                            direction="top"
                            text={showFilter ? "Hide Filter" : "Show Filter"}
                          />
                        </li>
                        <li>
                          <div className="flex justify-end">
                            <UncontrolledDropdown>
                              <DropdownToggle tag="a" className="btn btn-trigger btn-icon dropdown-toggle">
                                <Icon name="setting"></Icon>
                              </DropdownToggle>
                              <DropdownMenu right className="dropdown-menu-lg">
                                <ul className="link-check">
                                  {columnState.map((col) => (
                                    <li className="p-1" key={col.key}>
                                      <div className="custom-control custom-checkbox">
                                        <input
                                          type="checkbox"
                                          checked={col.visible}
                                          onChange={(ev) => {
                                            ev.stopPropagation();
                                            dispatch(toggleColumn(col.key));
                                          }}
                                          className="custom-control-input form-control"
                                          id={col.label}
                                        />
                                        <label
                                          className="custom-control-label"
                                          htmlFor={col.label}
                                          onClick={(ev) => ev.stopPropagation()}
                                        >
                                          {col.label}
                                        </label>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              </DropdownMenu>
                            </UncontrolledDropdown>
                          </div>
                        </li>
                        {!saleDetailsId && (
                          <li className="nk-block-tools-opt d-none d-sm-block">
                            <a
                              className="btn btn-primary"
                              data-bs-toggle="modal"
                              href="#modalCreate"
                              onClick={() => setIsAddModalOpen(true)}
                            >
                              <em className="icon ni ni-plus"></em>
                              <span>Add</span>
                            </a>
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </BlockHeadContent>
            </BlockBetween>
          </BlockHead>

          <Block size="lg">
            <PreviewCard className="tutor-list-card">
              {(saleDetailsId || showFilter) && <TCTTutorListGrid search={appliedSearch} />}
              {!saleDetailsId && !showFilter && renderTutorTable()}
            </PreviewCard>
          </Block>
          </div>
          {editModalOpen && (
            <EditTCTTutor tutorId={tutorId} modalStateChange={editModalStateChange} modalOpen={editModalOpen} />
          )}
          {isAddModalOpen && <ToturForm modalStateChange={modalStateChange} modalOpen={isAddModalOpen} />}

          <ToastContainer />
        </Content>
      </React.Fragment>
    </>
  );
};

export default TCTTutorList;
