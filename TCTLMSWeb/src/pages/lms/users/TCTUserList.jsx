import React, { useContext, useEffect, useMemo, useState, useRef } from "react";
import moment from "moment";
import {
  DropdownMenu,
  DropdownToggle,
  FormGroup,
  UncontrolledDropdown,
  Modal,
  ModalBody,
  DropdownItem,
  ModalFooter,
  ModalHeader,
  Spinner,
  Row,
  Form,
  Breadcrumb,
  BreadcrumbItem,
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
  Button,
  TooltipComponent,
  RSelect,
  ReactDataTable,
} from "../../../components/Component";
import Content from "../../../layout/content/Content";
import Head from "../../../layout/head/Head";
import { findUpper } from "../../../utils/Utils";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  getUsers,
  createUser,
  setUserStatus,
  getTCTUserById,
  getUserRoles,
  downloadUserExcel,
  getCoordinatorAdmins,
  getOperationsAdmins,
  getSuperAdmins,
} from "../../../apiservices/UserService";
import UserAvatar1 from "../../../components/user/UserAvatar1";
import { findUpper1, getColor } from "../../../utils/Utils";
import { usePermissions } from "../../../hooks/usePermissions";

const TCTUserList = () => {
  const { can } = usePermissions();
  const [loading, setLoading] = useState(false);
  const defaultGuid = "00000000-0000-0000-0000-000000000000";
  const loggedInUserRole = localStorage.getItem("userRole");
  const loggedInUserId = localStorage.getItem("userId");
  // Admin-type roles (e.g. CoordinatorAdmin, OperationsAdmin) only see the employees mapped to them.
  // SuperAdmin and SalesAdmin (which has SuperAdmin-equivalent permissions) see everyone.
  const scopeManagerId =
    loggedInUserRole &&
    loggedInUserRole !== "SuperAdmin" &&
    loggedInUserRole !== "SalesAdmin" &&
    loggedInUserRole.endsWith("Admin")
      ? loggedInUserId
      : null;
  const [userDataSource, setUserDataSource] = useState();
  const [sm, updateSm] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isDelete, setIsDelete] = useState(false);
  const [genderList, setGenderList] = useState([]);
  const [designationList, setDesignationList] = useState([]);
  const [roleList, setRoleList] = useState([]);
  const [roleListFilter, setRoleListFilter] = useState([]);
  const [filterGender, setFilterGender] = useState("");
  const [managerList, setManagerList] = useState([]);
  const [selectedRoleLabel, setSelectedRoleLabel] = useState("");
  const [selectedDesignationLabel, setSelectedDesignationLabel] = useState("");

  const [tablesm, updateTableSm] = useState(false);
  const [onSearch, setonSearch] = useState(true);
  const [onSearchText, setSearchText] = useState("");
  const [sort, setSortState] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [userRoleList, setUserRoleList] = useState([]);
  const [itemPerPage, setItemPerPage] = useState(10);
  const searchParams = new URLSearchParams(new URL(window.location.href).search);
  const [roleId, setRoleId] = useState(searchParams.get("roleId") || -1);
  const [draftRoleId, setDraftRoleId] = useState(searchParams.get("roleId") || -1);
  const [draftGender, setDraftGender] = useState("");

  const getInitialFormData = () => ({
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
    managerId: null,
    userType: defaultGuid,
    isSystemUser: false,
    isAdminUser: false,
    createdBy: defaultGuid,
    createdDate: new Date(),
    isActive: true,
    address: {
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

  const [formData, setFormData] = useState(getInitialFormData());

  const dtUserColumns = [
    {
      name: "Code",
      selector: (row) => row.userCode,
      cell: (row) => <span>{row.userCode}</span>,
      hide: "md",
    },
    {
      name: "Name",
      selector: (row) => row.fullName,
      compact: true,
      grow: 2,
      style: { paddingRight: "20px" },
      cell: (row) => (
        <Link className="user-card mt-2 mb-2" to={`${process.env.PUBLIC_URL}/tctuser-profile?id=${row.id}`}>
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
                <br></br>
                <span>{row.phone}</span>
              </>
            )}
          </div>
        </Link>
      ),
      sortable: true,
    },
    {
      name: "Role",
      selector: (row) => row.role,
      sortable: true,
      cell: (row) => <span className={row.role}>{row.role}</span>,
      hide: "md",
    },
    {
      name: "Gender",
      selector: (row) => row.gender,
      sortable: true,
      cell: (row) => <span className={row.gender === "Male" ? "text-blue" : "text-pink"}>{row.gender}</span>,
      hide: "md",
    },
    ,
    // {
    //   name: "Joining Date",
    //   selector: (row) => row.joiningDate,
    //   cell: (row) => <span>{row?.joiningDate != null ? moment(row.joiningDate).format("DD-MMM-yyyy") : ""}</span>,
    //   hide: "md",
    // },
    {
      name: "Status",
      selector: (row) => row.isActive,
      cell: (row) => (
        <span class={row.isActive === true ? "tb-status text-success" : "tb-status text-warning"}>
          {row.isActive === true ? "Active" : "Inactive"}
        </span>
      ),
      hide: "md",
    },
    {
      name: "Actions",
      selector: (row) => row.email,
      cell: (row) => <span>{row.email}</span>,
      cell: (row) => (
        <>
          <UncontrolledDropdown>
            <DropdownToggle color="tranparent" className="dropdown-toggle btn btn-icon btn-trigger mr-n1">
              <Icon name="more-h"></Icon>
            </DropdownToggle>
            <DropdownMenu right>
              <ul className="link-list-opt no-bdr">
                {can("User List", "view") && (
                  <li>
                    <Link to={`${process.env.PUBLIC_URL}/tctuser-profile?id=${row.id}`}>
                      <Icon name="user-circle-fill"></Icon>
                      <span>View Profile</span>
                    </Link>
                  </li>
                )}
                {can("User List", "edit") && (
                  <li>
                    <Link
                      onClick={() => {
                        onEditHandler(row.id);
                      }}
                    >
                      <Icon name="edit"></Icon>
                      <span>Edit User</span>
                    </Link>
                  </li>
                )}
                {can("User List", "delete") && (
                  <li>
                    <button
                      type="button"
                      className="btn btn-link"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onDeleteHandler(row.id, row.isActive);
                      }}
                    >
                      <Icon name="trash"></Icon>
                      <span>{row.isActive === true ? "Inactivate User" : "Activate User"}</span>
                    </button>
                  </li>
                )}
                {can("User List", "view") && (
                  <li>
                    <Link to={`${process.env.PUBLIC_URL}/useractivity-list?id=${row.id}`}>
                      <Icon name="activity-round"></Icon>
                      <span>User Activity</span>
                    </Link>
                  </li>
                )}
              </ul>
            </DropdownMenu>
          </UncontrolledDropdown>
        </>
      ),
    },
  ];
  const formRef = useRef(null);

  const excludeStudentTutor = (data) =>
    data?.filter((u) => u.role !== "Student" && u.role !== "Tutor") ?? [];
  const getUserListUsers = (selectedRoleId, filterText, managerId) =>
    getUsers(selectedRoleId, filterText, managerId, true, false);

  useEffect(() => {
    getLookups("600" /*gender*/).then((response) => {
      let temp = [];
      response.forEach((s) => {
        temp.push({ value: s?.id, label: s?.typeCodeName, id: s?.id });
      });
      setGenderList(temp);
    });

    getLookups("700" /*designation*/).then((response) => {
      let temp = [];
      response.forEach((s) => {
        if (s.typeCodeValue != 70003 /*tutor*/ && s.typeCodeValue != 70004 /*Student*/) {
          temp.push({ value: s?.id, label: s?.typeCodeName });
        }
      });
      setDesignationList(temp);
    });

    getAllRoles().then((response) => {
  let temp = [],
    _filterDDL = [];
  _filterDDL.push({ value: -1, label: "Select Role" });

  response.forEach((s) => {
    if (s.id != 1 /*SuperAdmin*/ && s.id != 13 /*Tutor*/ && s.id != 14 /*Student*/) {
      _filterDDL.push({ value: s?.id.toString(), label: s?.roleName });
      temp.push({ value: s?.id.toString(), label: s?.roleName });
    }
  }); 
  setRoleListFilter(_filterDDL);
  setRoleList(temp);
});

  }, []);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      getUserListUsers(roleId, onSearchText, scopeManagerId)
        .then((data) => {
          if (!active) return;
          const users = excludeStudentTutor(data);
          setUserDataSource(filterGender
            ? users.filter((user) => (user.gender || "").toLowerCase() === filterGender.toLowerCase())
            : users);
        })
        .catch(() => {
          if (active) toast.error("Unable to load the user list. Please try again.");
        });
    }, onSearchText ? 250 : 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [roleId, filterGender, onSearchText, scopeManagerId, editModalOpen, isAddModalOpen, isDelete]);

  useEffect(() => {
    if (!isAddModalOpen) {
      setSelectedRoleLabel("");
      setSelectedDesignationLabel("");
      setManagerList([]);
      setFormData(getInitialFormData());
    }
  }, [isAddModalOpen]);

  const getImageSource = (data) => {
    if (data.fileData == null || data.fileData == "") {
      return "";
    }
    const url = `data:image/jpeg;base64, ${data.fileData}`;
    return url;
  };

  const onEditFormSubmit = (data) => {
    setLoading(true);
    const inputData = formData;
    var isValidPhone = isValidPhoneNumber(inputData.phone);
    if (!isValidPhone) {
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
    createUser(inputData).then((response) => {
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
      setLoading(false);
    });
  };

  const onFormSubmit = (submitData) => {
    const inputData = formData;
    var isValidPhone = isValidPhoneNumber(inputData.phone);
    if (!isValidPhone) {
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
    setLoading(true);
    createUser(inputData)
      .then((response) => {
        setIsAddModalOpen(false);
        getUserListUsers(roleId, onSearchText, scopeManagerId).then((data) => {
          setUserDataSource(excludeStudentTutor(data));
        });
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
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const CloseButton = () => {
    return (
      <span className="btn-trigger toast-close-button" role="button">
        <Icon name="cross"></Icon>
      </span>
    );
  };

  const onDeleteHandler = (id, flipStatus) => {
    const userId = id;
    Swal.fire({
      title: flipStatus ? "Inactivate this user?" : "Activate this user?",
      text: flipStatus ? "The user will no longer be able to sign in." : "The user will be able to sign in again.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: flipStatus ? "Yes, inactivate user" : "Yes, activate user",
    }).then((result) => {
      if (result.isConfirmed) {
        setIsDelete(true);
        setUserStatus(userId, !flipStatus)
          .then(() => {
            toast.success(flipStatus ? "User inactivated successfully." : "User activated successfully.", {
              position: "top-right",
              autoClose: true,
              hideProgressBar: true,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              progress: false,
              closeButton: <CloseButton />,
            });
          })
          .catch(() => {
            toast.error("Unable to update the user status. Please try again.");
          })
          .finally(() => {
            getUserListUsers(roleId, onSearchText, scopeManagerId).then((data) => {
              setUserDataSource(excludeStudentTutor(data));
            });
            setIsDelete(false);
          });
      }
    });
  };

  const onEditHandler = (id) => {
    setEditModalOpen(true);
    setSelectedRoleLabel("");
    setSelectedDesignationLabel("");
    setManagerList([]);
    getTCTUserById(id).then(async (response) => {
      const userData = response.data;
      setFormData(userData);

      const desigLabel = designationList.find((d) => d.value == userData.designationId)?.label || "";
      const roleLabel = userData.role || roleList.find((r) => r.value == userData.roleId?.toString())?.label || "";

      setSelectedDesignationLabel(desigLabel);
      setSelectedRoleLabel(roleLabel);

      const mapUsers = (res) =>
        Array.isArray(res)
          ? res.map((u) => ({ value: u.id, label: u.fullName || `${u.firstName || ""} ${u.lastName || ""}`.trim() }))
          : [];
      const employeeRoleAdminId = { Coordinator: 5, Operations: 3, Accounts: 7, Payroll: 9, HR: 11 };

      if (desigLabel === "Employee" && employeeRoleAdminId[roleLabel]) {
        if (roleLabel === "Coordinator") {
          getCoordinatorAdmins().then((res) => setManagerList(mapUsers(res)));
        } else {
          getUserListUsers(employeeRoleAdminId[roleLabel], "").then((res) => setManagerList(mapUsers(res)));
        }
      } else if (desigLabel === "Manager" && roleLabel.includes("Admin")) {
        getSuperAdmins().then((res) => setManagerList(mapUsers(res)));
      }
    });
  };

  const RenderGrid = (props) => {
    return (
      <>
        <ReactDataTable
          key={`user-list-${itemPerPage}-${sort}`}
          data={props.dataSource}
          columns={dtUserColumns}
          pagination
          pageSize={itemPerPage}
          //   width="600px"
          className="nk-tb-list"
          canShowFilter={false}
          // selectableRows
        />
      </>
    );
  };

  const handleUpdateClick = () => {
    formRef.current.props.onSubmit();
    if (typeof onModalCloseCallback === "function") {
      onModalCloseCallback();
    }
  };

  const toggle = () => setonSearch(!onSearch);
  const sortFunc = (direction) => setSortState(direction);

  const displayedUserData = useMemo(() => {
    const users = [...(userDataSource || [])];
    if (!sort) return users;

    users.sort((a, b) =>
      (a.fullName || a.name || "").localeCompare(b.fullName || b.name || "", undefined, {
        sensitivity: "base",
      })
    );
    return sort === "dsc" ? users.reverse() : users;
  }, [userDataSource, sort]);
  const onFilterChange = (e) => {
    setSearchText(e.target.value);
  };

  const exportToExcel = () => {
    downloadUserExcel(roleId, onSearchText, scopeManagerId)
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
  };
  const {
    errors,
    register,
    handleSubmit,
    clearErrors,
  } = useForm({ mode: "onSubmit", reValidateMode: "onSubmit" });

  const updateValidatedField = (fieldName, value) => {
    setFormData((currentFormData) => ({
      ...currentFormData,
      [fieldName]: value,
    }));
  };

  useEffect(() => {
    const fieldsToClear = ["firstName", "lastName", "email"].filter(
      (fieldName) => String(formData[fieldName] || "").trim() && errors[fieldName]
    );

    if (fieldsToClear.length > 0) {
      clearErrors(fieldsToClear);
    }
  }, [formData.firstName, formData.lastName, formData.email, errors, clearErrors]);
  return (
    <>
      <React.Fragment>
        <Head title="User List"></Head>
        <Content>
          <BlockHead size="sm">
            <BlockBetween>
              <BlockHeadContent>
                <BlockTitle tag="h5">Users</BlockTitle>
              </BlockHeadContent>
              <BlockHeadContent>
                <div className="toggle-wrap nk-block-tools-toggle">
                  <Button className={`btn-icon btn-trigger toggle-expand mr-n1 active`} onClick={() => updateSm(!sm)}>
                    <Icon name="menu-alt-r"></Icon>
                  </Button>
                  <div className="toggle-expand-content" style={{ display: sm ? "block" : "none" }}>
                    <ul className="nk-block-tools g-3">
                      {can("User List", "add") && (
                        <li class="nk-block-tools-opt d-none d-sm-block">
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => {
                              setIsAddModalOpen(true);
                            }}
                          >
                            <em className="icon ni ni-plus"></em>
                            <span>Add</span>
                          </button>
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </BlockHeadContent>
            </BlockBetween>
          </BlockHead>

          <Block>
            <Row className="">
              <Col size={6}>
                <div
                  title="Board > Grade > Subject"
                  className="entrolled-list card-inner position-relative card-tools-toggle"
                  style={{ marginTop: "4%" }}
                ></div>
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
                                  <UncontrolledDropdown>
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
                                        <span className="sub-title dropdown-title">User Filter</span>
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
                                            <label className="overline-title overline-title-alt">Role</label>
                                            <RSelect
                                              dataSource={roleListFilter || []}
                                              value1={draftRoleId}
                                              onChangeHandler={(e) => {
                                                setDraftRoleId(e.value);
                                              }}
                                            />
                                          </Col>
                                          <Col size={12}>
                                            <label className="overline-title overline-title-alt">Gender</label>
                                            <RSelect
                                              dataSource={[{ value: "", label: "All Genders" }, ...genderList.map((g) => ({ value: g.label, label: g.label }))]}
                                              value1={draftGender}
                                              onChangeHandler={(e) => {
                                                setDraftGender(e.value);
                                              }}
                                            />
                                          </Col>
                                          <Col size="12">
                                            <FormGroup className="form-group">
                                              <Button
                                                color="secondary"
                                                onClick={() => {
                                                  setRoleId(draftRoleId);
                                                  setFilterGender(draftGender);
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
                                  <a
                                    href="#"
                                    onClick={(ev) => {
                                      ev.preventDefault();
                                      exportToExcel();
                                    }}
                                    className="btn btn-icon"
                                  >
                                    <Icon name="download-cloud" />
                                  </a>
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
                                            tag="button"
                                            type="button"
                                            onClick={() => setItemPerPage(10)}
                                          >
                                            10
                                          </DropdownItem>
                                        </li>
                                        <li className={itemPerPage === 15 ? "active" : ""}>
                                          <DropdownItem
                                            tag="button"
                                            type="button"
                                            onClick={() => setItemPerPage(15)}
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
                                            tag="button"
                                            type="button"
                                            onClick={() => sortFunc("dsc")}
                                          >
                                            DESC
                                          </DropdownItem>
                                        </li>
                                        <li className={sort === "asc" ? "active" : ""}>
                                          <DropdownItem
                                            tag="button"
                                            type="button"
                                            onClick={() => sortFunc("asc")}
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
                            toggle();
                          }}
                        >
                          <Icon name="arrow-left"></Icon>
                        </Button>
                        <input
                          type="text"
                          autoComplete="off"
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
            {(roleId !== -1 && roleId !== "-1") || filterGender ? (
              <div className="d-flex align-items-center mb-2 mt-2">
                <span className="text-muted mr-3" style={{ fontSize: "13px" }}>
                  Filters applied:{" "}
                  {roleId !== -1 && roleId !== "-1" && (
                    <strong>{roleListFilter.find((r) => r.value == roleId)?.label}</strong>
                  )}
                  {roleId !== -1 && roleId !== "-1" && filterGender && <span> &amp; </span>}
                  {filterGender && <strong>{filterGender}</strong>}
                </span>
                <Button
                  size="sm"
                  color="danger"
                  outline
                  onClick={() => {
                    setRoleId(-1);
                    setFilterGender("");
                    setDraftRoleId(-1);
                    setDraftGender("");
                  }}
                >
                  <Icon name="cross"></Icon>
                  <span>Clear Filter</span>
                </Button>
              </div>
            ) : null}
            <>
              {userDataSource && (
                <>
                  <RenderGrid dataSource={displayedUserData}></RenderGrid>
                </>
              )}
            </>
          </Block>

          <Modal
            scrollable={true}
            isOpen={isAddModalOpen}
            toggle={() => setIsAddModalOpen(false)}
            className="modal-dialog-centered"
            size="lg"
          >
            <ModalHeader
              // toggle={toggle}
              close={
                <button
                  className="close"
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    if (typeof props.onModalCloseCallback == "function") {
                      props.onModalCloseCallback();
                    }
                  }}
                >
                  <Icon name="cross" />
                </button>
              }
            >
              Add User
            </ModalHeader>
            <ModalBody>
              <div>
                <PreviewCard>
                        <Form className="row gy-4" ref={formRef} noValidate autoComplete="off" data-form-type="other" onSubmit={handleSubmit(onFormSubmit)}>
                    <Row className="col-md-12">
                      <Col md="6">
                        <FormGroup>
                          <label className="form-label" htmlFor="firstName">
                            First Name
                          </label>
                          <input
                            className="form-control"
                            type="text"
                            autoComplete="one-time-code"
                            data-form-type="other"
                            data-lpignore="true"
                            name="firstName"
                            id="firstName"
                            value={formData.firstName}
                                      onChange={(e) => updateValidatedField("firstName", e.target.value)}
                            placeholder="Enter name"
                            ref={register({ required: "This field is required" })}
                          />
                          {errors.firstName && <span className="invalid">{errors.firstName.message}</span>}
                        </FormGroup>
                      </Col>
                      <Col md="6">
                        <FormGroup>
                          <label className="form-label">Last Name </label>
                          <input
                            className="form-control"
                            type="text"
                            autoComplete="one-time-code"
                            data-form-type="other"
                            data-lpignore="true"
                            name="lastName"
                            value={formData.lastName}
                                      onChange={(e) => updateValidatedField("lastName", e.target.value)}
                            placeholder="Enter last name"
                            ref={register({ required: "This field is required" })}
                          />
                          {errors.lastName && <span className="invalid">{errors.lastName.message}</span>}
                        </FormGroup>
                      </Col>
                    </Row>
                    <Row className="col-md-12">
                      <Col sm="6">
                        <FormGroup>
                          <label className="form-label" htmlFor="dob">
                            Date of birth
                          </label>
                          <div className="form-control-wrap">
                            <DatePicker
                              autoComplete="off"
                              selected={formData.dob ? new Date(formData.dob) : null}
                              dateFormat="dd/MM/yyyy"
                              value={formData.dob}
                              showMonthDropdown
                              showYearDropdown
                              dropdownMode="select"
                              yearDropdownItemNumber={100}
                              scrollableYearDropdown
                              placeholderText="Select date of birth"
                              maxDate={new Date()}
                              onChange={(date) => {
                                setFormData({ ...formData, dob: date });
                              }}
                              onYearChange={(date) => setFormData({ ...formData, dob: date })}
                              className="form-control date-picker"
                            />
                          </div>
                          {errors.dob && <span className="invalid">{errors.dob.message}</span>}
                        </FormGroup>
                      </Col>
                      <Col md="6">
                        <FormGroup>
                          <label className="form-label" htmlFor="email">
                            Email{" "}
                          </label>
                          <input
                            className="form-control"
                            type="text"
                            autoComplete="one-time-code"
                            data-form-type="other"
                            data-lpignore="true"
                            name="email"
                            value={formData.email}
                            placeholder="Enter email"
                                      onChange={(e) => updateValidatedField("email", e.target.value)}
                            ref={register({
                              required: "This field is required",
                              pattern: {
                                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                message: "invalid email address",
                              },
                            })}
                          />
                          {errors.email && <span className="invalid">{errors.email.message}</span>}
                        </FormGroup>
                      </Col>
                    </Row>
                    <Row className="col-md-12">
                      <Col sm="6">
                        <FormGroup>
                          <label className="form-label" htmlFor="phone">
                            Phone Number
                          </label>
                          <PhoneInput
                            defaultCountry="IN"
                            international
                            id="phone"
                            name="phone"
                            placeholder="Enter phone number"
                                    value={formData.phone}
                                    autoComplete="off"
                                    onChange={(value) => {
                                      setFormData((currentFormData) => ({
                                        ...currentFormData,
                                        phone: value,
                                      }));
                                    }}
                          ></PhoneInput>
                        </FormGroup>
                      </Col>
                      <Col md="6">
                        <FormGroup>
                          <label className="form-label">Gender </label>
                          <div className="form-control-wrap">
                            <RSelect
                              dataSource={genderList || []}
                              value1={formData.gender}
                              onChangeHandler={(e) => {
                                setFormData({ ...formData, gender: e.label });
                              }}
                              ref={register({ required: "This field is required" })}
                            />
                          </div>
                          {errors.gender && <span className="invalid">{errors.gender.message}</span>}
                        </FormGroup>
                      </Col>
                    </Row>
                    <Row className="col-md-12">
                      <Col md="6">
                        <FormGroup>
                          <label className="form-label">Designation </label>
                          <div className="form-control-wrap">
                            <RSelect
                              dataSource={designationList || []}
                              value1={formData.designationId}
                              onChangeHandler={(e) => {
                                setFormData({ ...formData, designationId: e.value, managerId: null });
                                setSelectedDesignationLabel(e.label);
                                setManagerList([]);
                                const mapUsers = (res) =>
                                  Array.isArray(res)
                                    ? res.map((u) => ({ value: u.id, label: u.fullName || `${u.firstName || ""} ${u.lastName || ""}`.trim() }))
                                    : [];
                                const employeeRoleAdminId = { Coordinator: 5, Operations: 3, Accounts: 7, Payroll: 9, HR: 11 };
                                if (e.label === "Employee" && employeeRoleAdminId[selectedRoleLabel]) {
                                  if (selectedRoleLabel === "Coordinator") {
                                    getCoordinatorAdmins().then((res) => setManagerList(mapUsers(res)));
                                  } else {
                                    getUserListUsers(employeeRoleAdminId[selectedRoleLabel], "").then((res) => setManagerList(mapUsers(res)));
                                  }
                                } else if (e.label === "Manager" && selectedRoleLabel.includes("Admin")) {
                                  getSuperAdmins().then((res) => setManagerList(mapUsers(res)));
                                }
                              }}
                              ref={register({ required: "This field is required" })}
                            />
                          </div>
                          {errors.designationId && <span className="invalid">{errors.designationId.message}</span>}
                        </FormGroup>
                      </Col>
                      <Col md="6">
                        <FormGroup>
                          <label className="form-label">Role </label>
                          <div className="form-control-wrap">
                            <RSelect
                              dataSource={roleList || []}
                              value1={formData.roleId}
                              onChangeHandler={(e) => {
                                setFormData({ ...formData, roleId: e.value, managerId: null });
                                setSelectedRoleLabel(e.label);
                                setManagerList([]);
                                const mapUsers = (res) =>
                                  Array.isArray(res)
                                    ? res.map((u) => ({ value: u.id, label: u.fullName || `${u.firstName || ""} ${u.lastName || ""}`.trim() }))
                                    : [];
                                const employeeRoleAdminId = { Coordinator: 5, Operations: 3, Accounts: 7, Payroll: 9, HR: 11 };
                                if (selectedDesignationLabel === "Employee" && employeeRoleAdminId[e.label]) {
                                  if (e.label === "Coordinator") {
                                    getCoordinatorAdmins().then((res) => setManagerList(mapUsers(res)));
                                  } else {
                                    getUserListUsers(employeeRoleAdminId[e.label], "").then((res) => setManagerList(mapUsers(res)));
                                  }
                                } else if (selectedDesignationLabel === "Manager" && e.label.includes("Admin")) {
                                  getSuperAdmins().then((res) => setManagerList(mapUsers(res)));
                                }
                              }}
                              ref={register({ required: "This field is required" })}
                            />
                          </div>
                          {errors.roleId && <span className="invalid">{errors.roleId.message}</span>}
                        </FormGroup>
                      </Col>
                    </Row>
                    {(
                      (selectedDesignationLabel === "Employee" && ["Coordinator", "Operations", "Accounts", "Payroll", "HR"].includes(selectedRoleLabel)) ||
                      (selectedDesignationLabel === "Manager" && selectedRoleLabel.includes("Admin"))
                    ) && (
                      <Row className="col-md-12">
                        <Col md="6">
                          <FormGroup>
                            <label className="form-label">
                              Manager (
                              {selectedDesignationLabel === "Manager"
                                ? "Super Admin"
                                : selectedRoleLabel === "Coordinator"
                                ? "Coordinator Admin"
                                : selectedRoleLabel === "Operations"
                                ? "Operations Admin"
                                : selectedRoleLabel === "Accounts"
                                ? "Accounts Admin"
                                : selectedRoleLabel === "Payroll"
                                ? "Payroll Admin"
                                : "HR Admin"}
                              )
                            </label>
                            <div className="form-control-wrap">
                              <RSelect
                                dataSource={managerList}
                                value1={formData.managerId}
                                onChangeHandler={(e) => setFormData({ ...formData, managerId: e.value })}
                              />
                            </div>
                          </FormGroup>
                        </Col>
                      </Row>
                    )}
                    <Row className="col-md-12">
                      <Col md="6">
                        <FormGroup>
                          <label className="form-label" htmlFor="addressLine1">
                            Address Line1
                          </label>
                          <div className="form-control-wrap">
                            <input
                              className="form-control"
                              type="text"
                              autoComplete="off"
                              id="addressLine1"
                              name="addressLine1"
                              value={formData?.address?.addressLine1}
                              onChange={(e) => {
                                setFormData({
                                  ...formData,
                                  address: {
                                    ...formData.address,
                                    addressLine1: e.target.value,
                                  },
                                });
                              }}
                              placeholder="Address Line1"
                              ref={register({ required: "This field is required" })}
                            />
                            {errors.addressLine1 && <span className="invalid">{errors.addressLine1.message}</span>}
                          </div>
                        </FormGroup>
                      </Col>
                      <Col md="6">
                        <FormGroup>
                          <label className="form-label" htmlFor="addressLine2">
                            Address Line2{" "}
                          </label>
                          <div className="form-control-wrap">
                            <input
                              className="form-control"
                              type="text"
                              autoComplete="off"
                              id="addressLine2"
                              name="addressLine2"
                              value={formData?.address?.addressLine2}
                              onChange={(e) => {
                                setFormData({
                                  ...formData,
                                  address: {
                                    ...formData.address,
                                    addressLine2: e.target.value,
                                  },
                                });
                              }}
                              placeholder="Address Line2"
                              ref={register({ required: "This field is required" })}
                            />
                            {errors.addressLine2 && <span className="invalid">{errors.addressLine2.message}</span>}
                          </div>
                        </FormGroup>
                      </Col>
                    </Row>
                    <Row className="col-md-12">
                      <Col sm="12">
                        <FormGroup>
                          <label className="form-label" htmlFor="addressLine3">
                            Address Line3{" "}
                          </label>
                          <div className="form-control-wrap">
                            <input
                              className="form-control"
                              type="text"
                              autoComplete="off"
                              name="addressLine3"
                              id="addressLine3"
                              value={formData?.address?.addressLine3}
                              onChange={(e) => {
                                setFormData({
                                  ...formData,
                                  address: {
                                    ...formData.address,
                                    addressLine3: e.target.value,
                                  },
                                });
                              }}
                              placeholder="Address Line3"
                              ref={register({ required: "This field is required" })}
                            />
                            {errors.addressLine3 && <span className="invalid">{errors.addressLine3.message}</span>}
                          </div>
                        </FormGroup>
                      </Col>
                    </Row>
                    <Row className="col-md-12">
                      <Col md="6">
                        <FormGroup>
                          <label className="form-label" htmlFor="city">
                            City
                          </label>
                          <div className="form-control-wrap">
                            <input
                              className="form-control"
                              type="text"
                              autoComplete="off"
                              name="city"
                              id="city"
                              value={formData?.address?.city}
                              onChange={(e) => {
                                setFormData({
                                  ...formData,
                                  address: {
                                    ...formData.address,
                                    city: e.target.value,
                                  },
                                });
                              }}
                              placeholder="Enter name"
                              ref={register({ required: "This field is required" })}
                            />
                            {errors.city && <span className="invalid">{errors.city.message}</span>}
                          </div>
                        </FormGroup>
                      </Col>
                      <Col sm="6">
                        <FormGroup>
                          <label className="form-label" htmlFor="zipCode">
                            ZipCode
                          </label>
                          <div className="form-control-wrap">
                            <input
                              className="form-control"
                              type="text"
                              autoComplete="off"
                              name="zipCode"
                              id="zipCode"
                              value={formData.address?.zipCode}
                              onChange={(e) => {
                                setFormData({
                                  ...formData,
                                  address: {
                                    ...formData.address,
                                    zipCode: e.target.value,
                                  },
                                });
                              }}
                              placeholder="Enter name"
                              ref={register({ required: "This field is required" })}
                            />
                            {errors.zipCode && <span className="invalid">{errors.zipCode.message}</span>}
                          </div>
                        </FormGroup>
                      </Col>
                    </Row>
                    <Row className="col-md-12">
                      <Col sm="6">
                        <FormGroup>
                          <label className="form-label" htmlFor="state">
                            State
                          </label>
                          <div className="form-control-wrap">
                            <input
                              className="form-control"
                              type="text"
                              autoComplete="off"
                              name="state"
                              id="state"
                              value={formData?.address?.state}
                              onChange={(e) => {
                                setFormData({
                                  ...formData,
                                  address: {
                                    ...formData.address,
                                    state: e.target.value,
                                  },
                                });
                              }}
                              placeholder="Enter name"
                              ref={register({ required: "This field is required" })}
                            />
                            {errors.state && <span className="invalid">{errors.state.message}</span>}
                          </div>
                        </FormGroup>
                      </Col>
                      <Col sm="6">
                        <FormGroup>
                          <label className="form-label" htmlFor="country">
                            Country
                          </label>
                          <div className="form-control-wrap">
                            <input
                              className="form-control"
                              type="text"
                              autoComplete="off"
                              name="country"
                              id="country"
                              value={formData?.address?.country}
                              onChange={(e) => {
                                setFormData({
                                  ...formData,
                                  address: {
                                    ...formData?.address,
                                    country: e.target.value,
                                  },
                                });
                              }}
                              placeholder="Enter name"
                              ref={register({ required: "This field is required" })}
                            />
                            {errors.country && <span className="invalid">{errors.country.message}</span>}
                          </div>
                        </FormGroup>
                      </Col>
                    </Row>
                  </Form>
                </PreviewCard>
              </div>
            </ModalBody>
            <ModalFooter className="bg-light">
              <Col size="12">
                <ul className="align-center flex-wrap flex-sm-nowrap gx-4 gy-2">
                  <li>
                    <Button
                      color="primary"
                      size="lg"
                      className="btn-block"
                      type="submit"
                      disabled={loading}
                      onClick={() => {
                        formRef.current.props.onSubmit();
                      }}
                    >
                      {loading ? (
                        <>
                          <Spinner size="sm" className="mr-1" /> Adding User...
                        </>
                      ) : (
                        "Add User"
                      )}
                    </Button>
                  </li>
                  <li>
                    <a
                      href="#cancel"
                      onClick={(ev) => {
                        ev.preventDefault();
                        // onFormCancel();
                        setIsAddModalOpen(false);
                        if (typeof props.onModalCloseCallback == "function") {
                          props.onModalCloseCallback();
                        }
                      }}
                      className="link link-light"
                    >
                      Cancel
                    </a>
                  </li>
                </ul>
              </Col>
            </ModalFooter>
          </Modal>

          <Modal
            scrollable={true}
            isOpen={editModalOpen}
            toggle={() => setEditModalOpen(false)}
            className="modal-dialog-centered"
            size="lg"
          >
            <ModalHeader
              // toggle={toggle}
              close={
                <button
                  className="close"
                  type="button"
                  onClick={() => {
                    setEditModalOpen(false);
                    if (typeof props.onModalCloseCallback == "function") {
                      props.onModalCloseCallback();
                    }
                  }}
                >
                  <Icon name="cross" />
                </button>
              }
            >
              Edit User
            </ModalHeader>
            <ModalBody>
              <div>
                <PreviewCard>
                        <Form className="row gy-4" ref={formRef} noValidate autoComplete="off" data-form-type="other" onSubmit={handleSubmit(onEditFormSubmit)}>
                    <Row className="col-md-12">
                      <Col md="6">
                        <FormGroup>
                          <label className="form-label" htmlFor="firstName">
                            First Name
                          </label>
                          <input
                            className="form-control"
                            type="text"
                            autoComplete="one-time-code"
                            data-form-type="other"
                            data-lpignore="true"
                            name="firstName"
                            id="firstName"
                            value={formData.firstName}
                                      onChange={(e) => updateValidatedField("firstName", e.target.value)}
                            placeholder="Enter name"
                            ref={register({ required: "This field is required" })}
                          />
                          {errors.firstName && <span className="invalid">{errors.firstName.message}</span>}
                        </FormGroup>
                      </Col>
                      <Col md="6">
                        <FormGroup>
                          <label className="form-label">Last Name </label>
                          <input
                            className="form-control"
                            type="text"
                            autoComplete="one-time-code"
                            data-form-type="other"
                            data-lpignore="true"
                            name="lastName"
                            value={formData.lastName}
                                      onChange={(e) => updateValidatedField("lastName", e.target.value)}
                            placeholder="Enter last name"
                            ref={register({ required: "This field is required" })}
                          />
                          {errors.lastName && <span className="invalid">{errors.lastName.message}</span>}
                        </FormGroup>
                      </Col>
                    </Row>
                    <Row className="col-md-12">
                      <Col sm="6">
                        <FormGroup>
                          <label className="form-label" htmlFor="dob">
                            Date of birth
                          </label>
                          <div className="form-control-wrap">
                            <DatePicker
                              autoComplete="off"
                              selected={formData.dob ? new Date(formData.dob) : null}
                              dateFormat="dd/MM/yyyy"
                              //value={formData.dob}
                              showMonthDropdown
                              showYearDropdown
                              dropdownMode="select"
                              yearDropdownItemNumber={100}
                              scrollableYearDropdown
                              placeholderText="Select date of birth"
                              maxDate={new Date()}
                              onChange={(date) => {
                                setFormData({ ...formData, dob: date });
                              }}
                              onYearChange={(date) => setFormData({ ...formData, dob: date })}
                              className="form-control date-picker"
                            />
                          </div>
                          {errors.dob && <span className="invalid">{errors.dob.message}</span>}
                        </FormGroup>
                      </Col>
                      <Col md="6">
                        <FormGroup>
                          <label className="form-label" htmlFor="email">
                            Email{" "}
                          </label>
                          <input
                            className="form-control"
                            type="text"
                            autoComplete="one-time-code"
                            data-form-type="other"
                            data-lpignore="true"
                            name="email"
                            value={formData.email}
                            placeholder="Enter email"
                            readOnly="true"
                                      onChange={(e) => updateValidatedField("email", e.target.value)}
                            ref={register({
                              required: "This field is required",
                              pattern: {
                                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                message: "invalid email address",
                              },
                            })}
                          />
                          {errors.email && <span className="invalid">{errors.email.message}</span>}
                        </FormGroup>
                      </Col>
                    </Row>
                    <Row className="col-md-12">
                      <Col sm="6">
                        <FormGroup>
                          <label className="form-label" htmlFor="phone">
                            Phone Number
                          </label>
                          <PhoneInput
                            defaultCountry="IN"
                            international
                            id="phone"
                            name="phone"
                            placeholder="Enter phone number"
                                    value={formData.phone}
                                    autoComplete="off"
                                    onChange={(value) => {
                                      setFormData((currentFormData) => ({
                                        ...currentFormData,
                                        phone: value,
                                      }));
                                    }}
                          ></PhoneInput>
                        </FormGroup>
                      </Col>
                      <Col md="6">
                        <FormGroup>
                          <label className="form-label">Gender </label>
                          <div className="form-control-wrap">
                            <RSelect
                              dataSource={genderList || []}
                              value1={formData.gender}
                              onChangeHandler={(e) => {
                                setFormData({ ...formData, gender: e.label });
                              }}
                              ref={register({ required: "This field is required" })}
                            />
                          </div>
                          {errors.gender && <span className="invalid">{errors.gender.message}</span>}
                        </FormGroup>
                      </Col>
                    </Row>
                    <Row className="col-md-12">
                      <Col md="6">
                        <FormGroup>
                          <label className="form-label">Designation </label>
                          <div className="form-control-wrap">
                            <RSelect
                              dataSource={designationList || []}
                              value1={formData.designationId}
                              onChangeHandler={(e) => {
                                setFormData({ ...formData, designationId: e.value, managerId: null });
                                setSelectedDesignationLabel(e.label);
                                setManagerList([]);
                                const mapUsers = (res) =>
                                  Array.isArray(res)
                                    ? res.map((u) => ({ value: u.id, label: u.fullName || `${u.firstName || ""} ${u.lastName || ""}`.trim() }))
                                    : [];
                                const employeeRoleAdminId = { Coordinator: 5, Operations: 3, Accounts: 7, Payroll: 9, HR: 11 };
                                if (e.label === "Employee" && employeeRoleAdminId[selectedRoleLabel]) {
                                  if (selectedRoleLabel === "Coordinator") {
                                    getCoordinatorAdmins().then((res) => setManagerList(mapUsers(res)));
                                  } else {
                                    getUserListUsers(employeeRoleAdminId[selectedRoleLabel], "").then((res) => setManagerList(mapUsers(res)));
                                  }
                                } else if (e.label === "Manager" && selectedRoleLabel.includes("Admin")) {
                                  getSuperAdmins().then((res) => setManagerList(mapUsers(res)));
                                }
                              }}
                              ref={register({ required: "This field is required" })}
                            />
                          </div>
                          {errors.designationId && <span className="invalid">{errors.designationId.message}</span>}
                        </FormGroup>
                      </Col>
                      <Col md="6">
                        <FormGroup>
                          <label className="form-label">Role </label>
                          <div className="form-control-wrap">
                            <RSelect
                              dataSource={roleList || []}
                              value1={formData.roleId}
                              onChangeHandler={(e) => {
                                setFormData({ ...formData, roleId: e.value, managerId: null });
                                setSelectedRoleLabel(e.label);
                                setManagerList([]);
                                const mapUsers = (res) =>
                                  Array.isArray(res)
                                    ? res.map((u) => ({ value: u.id, label: u.fullName || `${u.firstName || ""} ${u.lastName || ""}`.trim() }))
                                    : [];
                                const employeeRoleAdminId = { Coordinator: 5, Operations: 3, Accounts: 7, Payroll: 9, HR: 11 };
                                if (selectedDesignationLabel === "Employee" && employeeRoleAdminId[e.label]) {
                                  if (e.label === "Coordinator") {
                                    getCoordinatorAdmins().then((res) => setManagerList(mapUsers(res)));
                                  } else {
                                    getUserListUsers(employeeRoleAdminId[e.label], "").then((res) => setManagerList(mapUsers(res)));
                                  }
                                } else if (selectedDesignationLabel === "Manager" && e.label.includes("Admin")) {
                                  getSuperAdmins().then((res) => setManagerList(mapUsers(res)));
                                }
                              }}
                              ref={register({ required: "This field is required" })}
                            />
                          </div>
                          {errors.roleId && <span className="invalid">{errors.roleId.message}</span>}
                        </FormGroup>
                      </Col>
                    </Row>
                    {(
                      (selectedDesignationLabel === "Employee" && ["Coordinator", "Operations", "Accounts", "Payroll", "HR"].includes(selectedRoleLabel)) ||
                      (selectedDesignationLabel === "Manager" && selectedRoleLabel.includes("Admin"))
                    ) && (
                      <Row className="col-md-12">
                        <Col md="6">
                          <FormGroup>
                            <label className="form-label">
                              Manager (
                              {selectedDesignationLabel === "Manager"
                                ? "Super Admin"
                                : selectedRoleLabel === "Coordinator"
                                ? "Coordinator Admin"
                                : selectedRoleLabel === "Operations"
                                ? "Operations Admin"
                                : selectedRoleLabel === "Accounts"
                                ? "Accounts Admin"
                                : selectedRoleLabel === "Payroll"
                                ? "Payroll Admin"
                                : "HR Admin"}
                              )
                            </label>
                            <div className="form-control-wrap">
                              <RSelect
                                dataSource={managerList}
                                value1={formData.managerId}
                                onChangeHandler={(e) => setFormData({ ...formData, managerId: e.value })}
                              />
                            </div>
                          </FormGroup>
                        </Col>
                      </Row>
                    )}
                    <Row className="col-md-12">
                      <Col md="6">
                        <FormGroup>
                          <label className="form-label" htmlFor="addressLine1">
                            Address Line1
                          </label>
                          <div className="form-control-wrap">
                            <input
                              className="form-control"
                              type="text"
                              autoComplete="off"
                              id="addressLine1"
                              name="addressLine1"
                              value={formData?.address?.addressLine1}
                              onChange={(e) => {
                                setFormData({
                                  ...formData,
                                  address: {
                                    ...formData.address,
                                    addressLine1: e.target.value,
                                  },
                                });
                              }}
                              placeholder="Address Line1"
                              ref={register({ required: "This field is required" })}
                            />
                            {errors.addressLine1 && <span className="invalid">{errors.addressLine1.message}</span>}
                          </div>
                        </FormGroup>
                      </Col>
                      <Col md="6">
                        <FormGroup>
                          <label className="form-label" htmlFor="addressLine2">
                            Address Line2{" "}
                          </label>
                          <div className="form-control-wrap">
                            <input
                              className="form-control"
                              type="text"
                              autoComplete="off"
                              id="addressLine2"
                              name="addressLine2"
                              value={formData?.address?.addressLine2}
                              onChange={(e) => {
                                setFormData({
                                  ...formData,
                                  address: {
                                    ...formData.address,
                                    addressLine2: e.target.value,
                                  },
                                });
                              }}
                              placeholder="Address Line2"
                              ref={register({ required: "This field is required" })}
                            />
                            {errors.addressLine2 && <span className="invalid">{errors.addressLine2.message}</span>}
                          </div>
                        </FormGroup>
                      </Col>
                    </Row>
                    <Row className="col-md-12">
                      <Col sm="12">
                        <FormGroup>
                          <label className="form-label" htmlFor="addressLine3">
                            Address Line3{" "}
                          </label>
                          <div className="form-control-wrap">
                            <input
                              className="form-control"
                              type="text"
                              autoComplete="off"
                              name="addressLine3"
                              id="addressLine3"
                              value={formData?.address?.addressLine3}
                              onChange={(e) => {
                                setFormData({
                                  ...formData,
                                  address: {
                                    ...formData.address,
                                    addressLine3: e.target.value,
                                  },
                                });
                              }}
                              placeholder="Address Line3"
                              ref={register({ required: "This field is required" })}
                            />
                            {errors.addressLine3 && <span className="invalid">{errors.addressLine3.message}</span>}
                          </div>
                        </FormGroup>
                      </Col>
                    </Row>
                    <Row className="col-md-12">
                      <Col md="6">
                        <FormGroup>
                          <label className="form-label" htmlFor="city">
                            City
                          </label>
                          <div className="form-control-wrap">
                            <input
                              className="form-control"
                              type="text"
                              autoComplete="off"
                              name="city"
                              id="city"
                              value={formData?.address?.city}
                              onChange={(e) => {
                                setFormData({
                                  ...formData,
                                  address: {
                                    ...formData.address,
                                    city: e.target.value,
                                  },
                                });
                              }}
                              placeholder="Enter name"
                              ref={register({ required: "This field is required" })}
                            />
                            {errors.city && <span className="invalid">{errors.city.message}</span>}
                          </div>
                        </FormGroup>
                      </Col>
                      <Col sm="6">
                        <FormGroup>
                          <label className="form-label" htmlFor="zipCode">
                            ZipCode
                          </label>
                          <div className="form-control-wrap">
                            <input
                              className="form-control"
                              type="text"
                              autoComplete="off"
                              name="zipCode"
                              id="zipCode"
                              value={formData.address?.zipCode}
                              onChange={(e) => {
                                setFormData({
                                  ...formData,
                                  address: {
                                    ...formData.address,
                                    zipCode: e.target.value,
                                  },
                                });
                              }}
                              placeholder="Enter name"
                              ref={register({ required: "This field is required" })}
                            />
                            {errors.zipCode && <span className="invalid">{errors.zipCode.message}</span>}
                          </div>
                        </FormGroup>
                      </Col>
                    </Row>
                    <Row className="col-md-12">
                      <Col sm="6">
                        <FormGroup>
                          <label className="form-label" htmlFor="state">
                            State
                          </label>
                          <div className="form-control-wrap">
                            <input
                              className="form-control"
                              type="text"
                              autoComplete="off"
                              name="state"
                              id="state"
                              value={formData?.address?.state}
                              onChange={(e) => {
                                setFormData({
                                  ...formData,
                                  address: {
                                    ...formData.address,
                                    state: e.target.value,
                                  },
                                });
                              }}
                              placeholder="Enter name"
                              ref={register({ required: "This field is required" })}
                            />
                            {errors.state && <span className="invalid">{errors.state.message}</span>}
                          </div>
                        </FormGroup>
                      </Col>
                      <Col sm="6">
                        <FormGroup>
                          <label className="form-label" htmlFor="country">
                            Country
                          </label>
                          <div className="form-control-wrap">
                            <input
                              className="form-control"
                              type="text"
                              autoComplete="off"
                              name="country"
                              id="country"
                              value={formData?.address?.country}
                              onChange={(e) => {
                                setFormData({
                                  ...formData,
                                  address: {
                                    ...formData?.address,
                                    country: e.target.value,
                                  },
                                });
                              }}
                              placeholder="Enter name"
                              ref={register({ required: "This field is required" })}
                            />
                            {errors.country && <span className="invalid">{errors.country.message}</span>}
                          </div>
                        </FormGroup>
                      </Col>
                    </Row>
                  </Form>
                </PreviewCard>
              </div>
            </ModalBody>
            <ModalFooter className="bg-light">
              <Col size="12">
                <ul className="align-center flex-wrap flex-sm-nowrap gx-4 gy-2">
                  <li>
                    <Button
                      color="primary"
                      size="lg"
                      className="btn-block"
                      type="submit"
                      disabled={loading}
                      // onClick={() => {
                      //     formRef.current.props.onSubmit()
                      //     if (typeof (props.onModalCloseCallback) == 'function') {
                      //         props.onModalCloseCallback();
                      //     }
                      // }}
                      onClick={handleUpdateClick}
                    >
                      {loading ? (
                        <>
                          <Spinner size="sm" className="mr-1" /> Updating User...
                        </>
                      ) : (
                        "Update User"
                      )}
                    </Button>
                  </li>
                  <li>
                    <a
                      href="#cancel"
                      onClick={(ev) => {
                        ev.preventDefault();
                        // onFormCancel();
                        setEditModalOpen(false);
                        if (typeof props.onModalCloseCallback == "function") {
                          props.onModalCloseCallback();
                        }
                      }}
                      className="link link-light"
                    >
                      Cancel
                    </a>
                  </li>
                </ul>
              </Col>
            </ModalFooter>
          </Modal>

          <ToastContainer />
        </Content>
      </React.Fragment>
    </>
  );
};

export default TCTUserList;
