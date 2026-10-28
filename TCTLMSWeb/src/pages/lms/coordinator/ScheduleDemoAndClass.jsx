import React, { useContext, useEffect, useState, forwardRef, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import DatePicker from "react-datepicker";
import { ToastContainer } from "react-toastify";
import { toast } from "react-toastify";
import moment from "moment";
import {
  DropdownMenu,
  DropdownToggle,
  FormGroup,
  UncontrolledDropdown,
  DropdownItem,
  Form,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Button,
} from "reactstrap";
import {
  Block,
  BlockBetween,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Col,
  Icon,
  PreviewAltCard,
  BlockDes,
  Row,
  DataTable,
  ReactDataTable,
  TooltipComponent,
  DataTableBody,
  DataTableHead,
  DataTableRow,
  DataTableItem,
  RSelect,
} from "../../../components/Component";
import { eventOptions, events } from "../../../components/partials/calender/CalenderData";
import { setDateForPicker } from "../../../utils/Utils";
import Content from "../../../layout/content/Content";
import Head from "../../../layout/head/Head";
import UserAvatar1 from "../../../components/user/UserAvatar1";
import { findUpper1, getColor } from "../../../utils/Utils";
import { NotificationType, FollowUpStatus, UserRole, UserRolesConst, actionStatus } from "../../../utils/Utils";
import { addOrUpdateSchedule, getScheduleBySubjectId, removeScheduler } from "../../../apiservices/ScheduleService";
import { getCoursesByCoordinatorId, getEnrolledCouse } from "../../../apiservices/StudentEnrollmentService";
import { getTutors, getCoordinatorAdmins } from "../../../apiservices/UserService";
import { GetSalesDetails } from "../../../apiservices/NofiticationService";
import { getLookups, getAllRoles } from "../../../apiservices/LookupsService";
import { updateStatus } from "../../../apiservices/StudentEnrollmentService";
import ScheduleClassControl from "../common/ScheduleClassControl";
import ClassStatusUpdate from "../common/ClassStatusUpdate";
import ScheduleDemo from "../common/ScheduleDemo";
import TutorAssignmentPopup from "../common/TutorAssignmentPopup";
import FollowUpStatusPopup from "../common/FollowUpStatusPopup";
import StudentsDropoutPopup from "../common/StudentsDropoutPopup";
import TutorApproveRejectPopup from "../common/TutorApproveRejectPopup";
import ScheduleActionsPopup from "../common/ScheduleActionsPopup";
import TutorInfo from "../tutors/TutorInfo";
import "./ScheduleDemoAndClass.css";
const ScheduleDemoAndClass = () => {
  const formRef = useRef(null);
  const [viewDataItem, setViewDataItem] = useState({});
  const [statusId, setStatusId] = useState("");
  const [status, setStatus] = useState(null);
  const [statusList, setStatusList] = useState([]);
  const [unFillterdStatusList, setUnFillterdStatusList] = useState([]);
  const [tutorList, setTutorList] = useState([]);
  const [coordinatorAdminList, setCoordinatorAdminList] = useState([]);
  const [modal, setModal] = useState(false);
  const [addScheduleOpen, setAddScheduleOpen] = useState(false);
  const [scheduleDemoModal, setScheduleDemoModal] = useState(false);
  const [statusModal, setStatusModal] = useState(false);
  const [studentDataSource, setStudentDataSource] = useState();
  let  userId = localStorage.getItem("userId");
  const roleId = localStorage.getItem("roleId");
  const [tutorId, setTutorId] = useState();
  const [studentId, setStudentId] = useState();
  const [salesDetailsId, setSalesDetailsId] = useState();
  const location = useLocation();
  const [subject, setSubject] = useState();
  const [subjectId, setSubjectId] = useState();
  const [studentName, setStudentName] = useState("");
  const [viewModal, setViewModal] = useState();
  const [reload, setReload] = useState(false);
  const searchParams = new URLSearchParams(location.search);
  const [id, setId] = useState(searchParams.get("id"));
  const [statusCode, setStatusCode] = useState("");
  const [tutorPayment, setTutorPayment] = useState(null);
  const [showSalesDetails, setShowSalesDetails] = useState(false);
  const [statusUpdateHeader, setStatusUpdateHeader] = useState("Update Status");
  const defaultGuid = "00000000-0000-0000-0000-000000000000";
  const [gridShow, setGridShow] = useState(true);
  const [scheduleActionsModal, setScheduleActionsModal] = useState(false);
  const [assignTutorModal, setAssignTutorModal] = useState(false);
  const [followUpModal, setFollowUpModal] = useState(false);
  const [dropoutModal, setDropoutModal] = useState(false);
  const [approveRejectModal, setApproveRejectModal] = useState(false);
  const [tutorInfoModal, setTutorInfoModal] = useState(false);
  const [tutorInfoData, setTutorInfoData] = useState({ tutorId: null, tutorUserId: null });
  const [salesDetails, setSalesDetails] = useState({
    studentId: null,
    studentName: "",
    tutorName: "",
    coordinatorId: "",
    coordinatorName: "",
    subjectId: "",
    subjectName: "",
    gradeName: "",
    gradId: "",
    boardName: "",
    boardId: "",
    tutorId: null,
    enrollmentDate: "",
    status: "",
  });

  const [dataItem, setDataItem] = useState({});
  useEffect(() => {
    getEnrolledCourseList();
    getLookups("200" /*status*/).then((response) => {
      let temp = [];
      response
        ?.filter((s) => s.typeCodeValue == FollowUpStatus.DemoPendingTutorAssignedNotApproved)
        ?.forEach((s) => {
          temp.push({ value: s?.id, label: s?.typeCodeName, code: s?.typeCodeValue, id: s?.id });
        });
      setStatusList(temp);
      let temp1 = [];
      response.forEach((s) => {
        temp1.push({ value: s?.id, label: s?.typeCodeName, code: s?.typeCodeValue, id: s?.id });
      });
      setUnFillterdStatusList(temp1);

      var scheduleStatus = response.map((s) => {
        if (
          s.typeCodeValue == "20009" ||
          s.typeCodeValue == "20006" ||
          s.typeCodeValue == "20008" /*ShortFollowUp*/ ||
          s.typeCodeValue == "20003" /*NeedToSchedule*/
        ) {
          return { value: s?.id, label: s?.typeCodeName, code: s?.typeCodeValue, id: s?.id };
        }
      });
    });

    getTutors().then((response) => {
      let temp = [];
      response.forEach((s) => {
        temp.push({ value: s?.id.toString(), label: s?.fullName });
      });
      setTutorList(temp);
    });

    getCoordinatorAdmins().then((response) => {
      let temp = [];
      response.forEach((s) => {
        temp.push({ value: s?.id.toString(), label: s?.fullName });
      });
      setCoordinatorAdminList(temp);
    });
  }, []);

  const getEnrolledCourseList = () => {
    const userRoleName = localStorage.getItem("userRole");
    if (
      roleId == UserRole.CoordinatorAdmin ||
      roleId == UserRole.Operations ||
      roleId == UserRole.OperationsAdmin ||
      userRoleName == UserRolesConst.SALES_ADMIN
    ) {
      getEnrolledCouse(searchParams.get("id")).then((data) => {
        if (data.length > 0) {
          setStudentName(data[0].studentName);
        }
        setStudentDataSource(data);
      });
    } else {      
      if(roleId == UserRole.SuperAdmin){
        userId = searchParams.get("coordinatorId");
      }
      getCoursesByCoordinatorId(searchParams.get("id"), userId).then((data) => {
        if (data.length > 0) {
          setStudentName(data[0].studentName);
        }
        setStudentDataSource(data);
      });
    }
  };

  const [assignBtnName, setAssignBtnName] = useState("Assign Tutor");
  const [canShowFooter, setCanShowFooter] = useState(true);

  const closeSalesDetailsModal = () => {
    setShowSalesDetails(false);
    restSalesDetails();
  };
  const restSalesDetails = () => {
    setSalesDetails({
      studentId: null,
      studentName: "",
      tutorName: "",
      coordinatorId: "",
      coordinatorName: "",
      subjectId: "",
      subjectName: "",
      gradeName: "",
      gradId: "",
      boardName: "",
      boardId: "",
      tutorId: null,
      enrollmentDate: "",
      status: "",
    });
  };

  const renderLabels = (statusTypeCode) => {
    let btnLable = "";
    switch (statusTypeCode) {
      case FollowUpStatus.DemoPendingTutorNotAssigned:
        btnLable = "Assign Tutor";
        // setCanShowFooter(true);
        break;
      case FollowUpStatus.Reject:
        // setCanShowFooter(true);
        btnLable = "ReAssign Tutor";
        break;
      case FollowUpStatus.DemoPendingTutorAssignedApproved:
      case FollowUpStatus.DemoPendingTutorAssignedNotApproved:
        // setCanShowFooter(true);
        if (roleId == UserRole.CoordinatorAdmin) {
          btnLable = "Approve/Reject";
        } else {
          btnLable = "Change Tutor";
        }
        break;
      default:
        // setCanShowFooter(true);
        btnLable = "Assign Tutor";
        break;
    }
    return btnLable;
  };

  const onStatusUpdateHandler = () => {
    const inputData = {
      SalesId: salesDetails?.salesId,
      SaleseDetailsId: salesDetailsId,
      UserId: userId,
      NoteText: salesDetails?.noteText || "",
      Status: salesDetails?.status,
      TutorId: salesDetails?.tutorId,
      StatusId: salesDetails?.statusId,
      TutorPayment: salesDetails?.tutorPayment,
    };

    updateStatus(inputData).then((response) => {
      setShowSalesDetails(false);
      getEnrolledCourseList();
      toast.success("Tutor assigned successfully.", {
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

  const CloseButton = () => {
    return (
      <span className="btn-trigger toast-close-button" role="button">
        <Icon name="cross"></Icon>
      </span>
    );
  };

  function renderStatusColor(row) {
    if (row.shortCode == FollowUpStatus.Reject || row.shortCode == FollowUpStatus.Drop) {
      return "text-danger";
    } else if (
      row.shortCode == FollowUpStatus.DemoPendingTutorAssignedNotApproved ||
      row.shortCode == FollowUpStatus.DemoPendingTutorNotAssigned
    ) {
      return "text-warning";
    } else {
      return "text-success";
    }
  }

  const renderActions = (row) => {
    const hasTutor = Boolean(row.tutorId && row.tutorId !== defaultGuid);
    const isCoordinatorAdminApprovalPending =
      roleId == UserRole.CoordinatorAdmin &&
      row.shortCode == FollowUpStatus.DemoPendingTutorAssignedNotApproved;
    const isRestrictedStatus =
      row.shortCode == FollowUpStatus.DemoCompleted ||
      row.shortCode == FollowUpStatus.NeedToSchedule;
    if (isCoordinatorAdminApprovalPending) {
      return (
        <div className="nk-tb-action">
          <ul className="nk-tb-actions gx-1">
            <li
              className="nk-tb-action-hidden1"
              onClick={() => {
                setDataItem(row);
                setApproveRejectModal(true);
              }}
            >
              <TooltipComponent
                tag="a"
                containerClassName="btn btn-trigger btn-icon"
                id={"approveRejectTutor" + row?.saleDetailsId}
                icon="user-check-fill"
                direction="top"
                text="Approve/Reject Tutor"
              />
            </li>
          </ul>
        </div>
      );
    }
    const canAssignTutor = !isRestrictedStatus || hasTutor;
    const tooltip = hasTutor ? "Change Tutor" : renderLabels(row.shortCode);
    const tutorNotAssigned = row.shortCode == FollowUpStatus.DemoPendingTutorNotAssigned;
    let actionList = actionStatus.filter(
      (s) => s.value != FollowUpStatus.ReDemo && s.value != FollowUpStatus.NeedToSchedule
    );
    actionList = actionStatus;
    if (row.shortCode == FollowUpStatus.DemoCompleted) {
      actionList = actionStatus;
    }
    const disabledStyle = tutorNotAssigned
      ? { opacity: 0.35, pointerEvents: "none", cursor: "not-allowed" }
      : {};
    return (
      <>
        {/* <Icon name="user-check"></Icon> */}
        {/* <Icon name="user-cross"></Icon> */}
        <div className="nk-tb-action">
          <ul className="nk-tb-actions gx-1">
            {/* <li
              className="nk-tb-action-hidden1"
              onClick={() => {
                setDataItem(row);
                // onUpdateStatusHandler(row.salesId, row.saleDetailsId);
                setAssignTutorModal(true);
              }}
            >
              <TooltipComponent
                tag="a"
                containerClassName="btn btn-trigger btn-icon"
                id={"changeTutor" + row?.saleDetailsId}
                icon="icon ni ni-user-add-fill"
                direction="top"
                text={tutorAssignmentText}
              />
            </li> */}
            {!isCoordinatorAdminApprovalPending && <li className="nk-tb-action-hidden1">
              {canAssignTutor ? <Link to={`${process.env.PUBLIC_URL}/tct-tutor-list?id=${row.salesDetailsId}`}>
                <TooltipComponent
                  tag="a"
                  containerClassName="btn btn-trigger btn-icon"
                  id={"changeTutor" + row?.salesDetailsId}
                  icon="icon ni ni-user-add-fill"
                  direction="top"
                  text={tooltip}
                />
              </Link> : <span title="A tutor cannot be assigned at this student status" style={{ opacity: 0.35, cursor: "not-allowed" }}>
                <Icon name="user-add-fill" />
              </span>}
            </li>}
            {isCoordinatorAdminApprovalPending && (
              <>
                <li
                  className="nk-tb-action-hidden1"
                  onClick={() => {
                    setDataItem(row);
                    setApproveRejectModal(true);
                    // onUpdateStatusHandler(row.salesId, row.saleDetailsId);
                  }}
                >
                  <TooltipComponent
                    tag="a"
                    containerClassName="btn btn-trigger btn-icon"
                    id={"approveRejectTutor" + row?.saleDetailsId}
                    icon="user-check-fill"
                    direction="top"
                    text={"Approve/Reject"}
                  />
                </li>
              </>
            )}
            <>
              {row.shortCode == FollowUpStatus.DemoPendingTutorAssignedApproved && (
                <>
                  <li
                    className="nk-tb-action-hidden1"
                    onClick={() => {
                      setDataItem(row);
                      setScheduleDemoModal(true);
                    }}
                  >
                    <TooltipComponent
                      tag="a"
                      containerClassName="btn btn-trigger btn-icon"
                      id={"scheduleDemoBtn" + row?.saleDetailsId}
                      icon="monitor"
                      direction="top"
                      text={"Schedule Demo"}
                    />
                  </li>
                </>
              )}
            </>
           <li
  className="nk-tb-action-hidden1"
  style={disabledStyle}
  onClick={() => {
    if (row?.statusName === "DemoPendingTutorAssigned") {
      toast.warning("Assigned tutor approval pending from coordinator admin.");
      return;
    }

    setDataItem(row);
    setScheduleActionsModal(true);
  }}
>
  <TooltipComponent
    tag="a"
    containerClassName="btn btn-trigger btn-icon"
    id={"scheduleDemoBtn" + row?.saleDetailsId}
    icon="setting"
    direction="top"
    text={"Add/Update schedule status"}
  />
</li>
            <li style={disabledStyle}>
              <UncontrolledDropdown>
                <DropdownToggle className="dropdown-toggle btn btn-icon btn-light">
                  <Icon name="more-v"></Icon>
                </DropdownToggle>
                <DropdownMenu right>
                  <ul className="link-list-plain">
                    {actionList.map((sItem) => {
                      return (
                        <>
                          <li
                            data-value={sItem.value}
                            onClick={(e) => {
                              setDataItem(row);
                              if (e.currentTarget.dataset.value == FollowUpStatus.ReDemo) {
                                setScheduleDemoModal(true);
                                return;
                              }

                              if (e.currentTarget.dataset.value == FollowUpStatus.Drop) {
                                setDropoutModal(true);
                                return;
                              }

                              const _statusCode = FollowUpStatus.NeedToSchedule;
                              if (sItem.value != _statusCode) {
                                setStatusCode(sItem.value);
                                setFollowUpModal(true);
                                // onUpdateStatusHandler(row.salesId, row.saleDetailsId, FollowUpStatus.LongFollowUp);
                              } else {
                                setStatusModal(true);
                              }
                            }}
                          >
                            <DropdownItem
                              tag="a"
                              href="#reassigntutor"
                              onClick={(ev) => {
                                ev.preventDefault();
                              }}
                            >
                              <span>{sItem.label}</span>
                            </DropdownItem>
                          </li>
                        </>
                      );
                    })}
                  </ul>
                </DropdownMenu>
              </UncontrolledDropdown>
            </li>

            <li className="nk-tb-action-hidden1" style={disabledStyle}>
              <Link to={`${process.env.PUBLIC_URL}/tct-student-calendar?id=${row.stdUserId}`}>
                <TooltipComponent
                  tag="a"
                  containerClassName="btn btn-trigger btn-icon"
                  id={"viewUpdate" + row?.saleDetailsId}
                  icon="eye-fill"
                  direction="top"
                  text={"View/Update"}
                />
              </Link>
            </li>
          </ul>
        </div>
      </>
    );
  };

  const ExampleCustomInput = forwardRef(({ value, onClick, onChange }, ref) => (
    <div onClick={onClick} ref={ref}>
      <input className="form-control date-picker" type="text" value={value} onChange={onChange} />
      <div className="form-icon form-icon-right">
        <Icon name="calendar"></Icon>
      </div>
    </div>
  ));
  const { errors, register, handleSubmit, setValue, clearErrors } = useForm({});
  return (
    <>
      <React.Fragment>
        <Head title="TCT Schedule class/demo"></Head>
        <Content>
          <div className="tct-sc">
          <BlockHead size="sm">
            <BlockBetween>
              <BlockHeadContent>
                <div className="tct-sc-title">
                  <span className="tct-sc-title-icon" aria-hidden="true"><Icon name="calendar-booking"></Icon></span>
                  <div>
                    <BlockTitle tag="h5">Student Class Info</BlockTitle>
                    <BlockDes className="text-soft">
                      <p className="tct-sc-desc">View and manage the class details associated with this student.</p>
                    </BlockDes>
                  </div>
                </div>
              </BlockHeadContent>
              <BlockHeadContent>
                {gridShow == true ? (
                  <>
                    {" "}
                    <Link to={`${process.env.PUBLIC_URL}/lms/sales/enrollment-history`}>
                      <Button color="light" outline className="bg-white d-none d-sm-inline-flex">
                        <Icon name="arrow-left"></Icon>
                        <span>Back</span>
                      </Button>
                      <Button color="light" outline className="btn-icon bg-white d-inline-flex d-sm-none">
                        <Icon name="arrow-left"></Icon>
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <div
                      onClick={() => {
                        setGridShow(true);
                      }}
                    >
                      <Button color="light" outline className="bg-white d-none d-sm-inline-flex">
                        <Icon name="arrow-left"></Icon>
                        <span>Back</span>
                      </Button>
                      <Button color="light" outline className="btn-icon bg-white d-inline-flex d-sm-none">
                        <Icon name="arrow-left"></Icon>
                      </Button>
                    </div>
                  </>
                )}
              </BlockHeadContent>
            </BlockBetween>
          </BlockHead>
          <div className="tct-sc-student">
            <UserAvatar1 theme={getColor(studentName || "NA")} text={findUpper1(studentName || "NA")}></UserAvatar1>
            <div className="tct-sc-student-text">
              <span className="tct-sc-student-name">{studentName}</span>
              {(studentDataSource?.[0]?.board || studentDataSource?.[0]?.grade) && (
                <span className="tct-sc-student-meta">
                  {studentDataSource[0].board && <>Board: <b>{studentDataSource[0].board}</b></>}
                  {studentDataSource[0].board && studentDataSource[0].grade && <i aria-hidden="true">|</i>}
                  {studentDataSource[0].grade && <>Grade: <b>{studentDataSource[0].grade}</b></>}
                </span>
              )}
            </div>
          </div>
          <Block>
            <DataTable className="card-stretch tct-sc-table">
              <>
                <DataTableBody>
                  <DataTableHead>
                    <DataTableRow>
                      <span className="sub-text">Tutor</span>
                    </DataTableRow>
                    <DataTableRow size="mb">
                      <span className="sub-text">Course</span>
                    </DataTableRow>
                    <DataTableRow size="md">
                      <span className="sub-text">Status</span>
                    </DataTableRow>
                    <DataTableRow size="lg">
                      <span className="sub-text">Updated by</span>
                    </DataTableRow>
                    <DataTableRow size="lg">
                      <span className="sub-text">Updated on</span>
                    </DataTableRow>
                    <DataTableRow size="md">
                      <span className="sub-text">Actions</span>
                    </DataTableRow>
                  </DataTableHead>
                  {studentDataSource?.length > 0 ? (
                    studentDataSource.map((item) => {
                      return (
                        <>
                          <DataTableItem key={item.id}>
                            <DataTableRow size="md">
                              {item.tutorId && item.tutorId !== defaultGuid ? <button
                                type="button"
                                className="user-card ml-2 border-0 bg-transparent text-left p-0"
                                title="View tutor information"
                                onClick={() => {
                                  setTutorInfoData({
                                    tutorId: item.tutorId,
                                    tutorUserId: item.tutorUserId || item.tutorId,
                                  });
                                  setTutorInfoModal(true);
                                }}
                              >
                                <UserAvatar1
                                  theme={getColor(item.tutorName ?? "NA")}
                                  text={findUpper1(item.tutorName ?? "NA")}
                                ></UserAvatar1>
                                <div className="user-info">
                                  <span className="tb-lead">{item.tutorName ?? "NA"} </span>
                                  {item.tutorPhone && <span>{item.tutorPhone}</span>}
                                </div>
                              </button> : <div className="user-card ml-2">
                                <UserAvatar1 theme={getColor("NA")} text={findUpper1("NA")}></UserAvatar1>
                                <div className="user-info"><span className="tb-lead">NA</span></div>
                              </div>}
                            </DataTableRow>
                            <DataTableRow size="md">
                              <span>{item.subjectName}</span>
                            </DataTableRow>
                            <DataTableRow>
                              <span className={`tct-sc-status ${renderStatusColor(item)}`}>{item.statusName}</span>
                            </DataTableRow>
                            <DataTableRow>
                              <span>{item.modifiedByUser || "—"}</span>
                            </DataTableRow>
                            <DataTableRow>
                              <span>
                                {item?.modifiedDate && moment(item.modifiedDate).isValid()
                                  ? moment(item.modifiedDate).format("DD-MM-YYYY HH:mm")
                                  : "—"}
                              </span>
                            </DataTableRow>
                            <DataTableRow>
                              <div className="actions-buttons">{renderActions(item)}</div>
                            </DataTableRow>
                          </DataTableItem>
                        </>
                      );
                    })
                  ) : (
                    <>
                      {" "}
                      <div className="text-center">
                        <span className="text-silent">No data found</span>
                      </div>
                    </>
                  )}
                </DataTableBody>
              </>
            </DataTable>
          </Block>
          </div>
        </Content>
        <>
          {showSalesDetails && (
            <>
              {roleId == UserRole.CoordinatorAdmin ? (
                <>
                  <Modal
                    scrollable={true}
                    isOpen={showSalesDetails}
                    toggle={closeSalesDetailsModal}
                    className="modal-dialog-centered"
                    size="lg"
                  >
                    <ModalHeader
                      close={
                        <button
                          className="close"
                          type="button"
                          onClick={() => {
                            setShowSalesDetails(false);
                          }}
                        >
                          <Icon name="cross" />
                        </button>
                      }
                    >
                      Approve/Reject Tutor
                    </ModalHeader>
                    <ModalBody>
                      <div>
                        <Form
                          className="row gy-1"
                          ref={formRef}
                          noValidate
                          onSubmit={handleSubmit(onStatusUpdateHandler)}
                        >
                          <Row className="col-md-12">
                            <Col md="6">
                              <FormGroup>
                                <label className="overline-title" htmlFor="firstName">
                                  Student Name:
                                </label>
                                <p id="preview-event-start">{salesDetails.studentName}</p>
                              </FormGroup>
                            </Col>
                            <Col md="6">
                              <FormGroup>
                                <label className="overline-title" htmlFor="email">
                                  Subject:
                                </label>
                                <p id="preview-event-start">{salesDetails.subjectName}</p>
                              </FormGroup>
                            </Col>
                          </Row>
                          <Row className="col-md-12">
                            <Col md="6">
                              <FormGroup>
                                <label className="overline-title" htmlFor="firstName">
                                  Coordinator:
                                </label>
                                <p id="preview-event-start">{salesDetails.coordinatorName}</p>
                              </FormGroup>
                            </Col>
                            <Col sm="6">
                              <FormGroup>
                                <label className="overline-title">Tutor:</label>
                                <p id="preview-event-start">{salesDetails.tutorName}</p>
                              </FormGroup>
                            </Col>
                          </Row>

                          <Row className="col-md-12">
                            <Col sm="6">
                              <FormGroup>
                                <label className="overline-title" htmlFor="dob">
                                  Board:
                                </label>
                                <p id="preview-event-start">{salesDetails.boardName}</p>
                              </FormGroup>
                            </Col>
                            <Col md="6">
                              <FormGroup>
                                <label className="overline-title" htmlFor="email">
                                  Grade:
                                </label>
                                <p id="preview-event-start">{salesDetails.gradeName}</p>
                              </FormGroup>
                            </Col>
                          </Row>
                          <Row className="col-md-12">
                            <Col sm="6">
                              <FormGroup>
                                <label className="overline-title">Tutor</label>
                                <div className="form-control-wrap">
                                  <>
                                    <a
                                      href={`/lms/tutorprofile?id=${null}&userId=${salesDetails?.tutorId}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <p id="preview-event-start">
                                        {tutorList.find((t) => t.value == salesDetails?.tutorId)?.label}
                                      </p>
                                    </a>
                                  </>
                                </div>
                              </FormGroup>
                            </Col>
                            <Col sm="6">
                              <FormGroup>
                                <label className="overline-title">Status:</label>
                                <div className="form-control-wrap">
                                  <>
                                    <p
                                      className={
                                        salesDetails?.statusTypeCode ==
                                        FollowUpStatus.DemoPendingTutorAssignedNotApproved
                                          ? "text-warning"
                                          : salesDetails?.statusTypeCode == FollowUpStatus.Reject
                                          ? "text-danger"
                                          : "text-success"
                                      }
                                    >
                                      {salesDetails.statusTypeName}
                                    </p>
                                  </>
                                </div>
                              </FormGroup>
                            </Col>
                          </Row>
                          <Row className="col-md-12">
                            <Col md="12">
                              <div className="form-group">
                                <label className="form-label" htmlFor="regular-price">
                                  Tutor Payment
                                </label>
                                <p id="preview-event-start">{salesDetails.tutorPayment}</p>
                              </div>
                            </Col>
                          </Row>
                        </Form>
                      </div>
                    </ModalBody>
                    {salesDetails?.statusTypeCode == FollowUpStatus.DemoPendingTutorAssignedNotApproved && (
                      <ModalFooter className="bg-light modal-footer-custom">
                        <Col size="8"></Col>
                        <Col size="4">
                          <ul className="align-center flex-wrap flex-sm-nowrap gx-4 gy-2">
                            <li>
                              <Button
                                color="primary"
                                size="md"
                                onClick={() => {
                                  setValue("tutorId", salesDetails.tutorId);
                                  setValue("tutorPayment", salesDetails.tutorPayment);
                                  setTutorId(salesDetails.tutorId);
                                  setTutorPayment(salesDetails.tutorPayment);
                                  const typeCode = unFillterdStatusList.find(
                                    (f) => f.code == FollowUpStatus.DemoPendingTutorAssignedApproved
                                  );
                                  setStatusId(typeCode.value);
                                  setSalesDetails((prevState) => ({
                                    ...prevState,
                                    status: typeCode.code,
                                    statusId: typeCode.value,
                                  }));
                                  setValue("statusId", typeCode.value);
                                  setStatus(FollowUpStatus.DemoPendingTutorAssignedApproved);
                                  setTimeout(() => {
                                    formRef.current.props.onSubmit();
                                  }, 10);
                                }}
                              >
                                <Icon name="user-check"></Icon>
                                Approve
                              </Button>
                            </li>
                            <li>
                              <Button
                                color="btn btn-danger btn-md"
                                size="md"
                                onClick={() => {
                                  setValue("tutorId", salesDetails.tutorId);
                                  setValue("tutorPayment", salesDetails.tutorPayment);
                                  setTutorId(salesDetails.tutorId);
                                  setTutorPayment(salesDetails.tutorPayment);
                                  const typeCode = unFillterdStatusList.find((f) => f.code == FollowUpStatus.Reject);
                                  setStatusId(typeCode.value);
                                  setSalesDetails((prevState) => ({
                                    ...prevState,
                                    status: typeCode.code,
                                    statusId: typeCode.value,
                                  }));
                                  setValue("statusId", typeCode.value);
                                  setStatus(FollowUpStatus.Reject);
                                  setTimeout(() => {
                                    formRef.current.props.onSubmit();
                                  }, 10);
                                }}
                              >
                                <Icon name="user-cross" />
                                Reject
                              </Button>
                            </li>
                          </ul>
                        </Col>
                      </ModalFooter>
                    )}
                  </Modal>
                </>
              ) : (
                <>
                  <Modal
                    // scrollable={true}
                    isOpen={showSalesDetails}
                    toggle={closeSalesDetailsModal}
                    className="modal-dialog-centered"
                    size="lg"
                  >
                    <ModalHeader
                      close={
                        <button
                          className="close"
                          type="button"
                          onClick={() => {
                            setShowSalesDetails(false);
                          }}
                        >
                          <Icon name="cross" />
                        </button>
                      }
                    >
                      {statusUpdateHeader}
                    </ModalHeader>
                    <ModalBody>
                      <div>
                        <Form
                          className="row gy-1"
                          ref={formRef}
                          noValidate
                          onSubmit={handleSubmit(onStatusUpdateHandler)}
                        >
                          <Row className="col-md-12">
                            <Col md="3">
                              <FormGroup>
                                <label className="overline-title" htmlFor="firstName">
                                  Coordinator:
                                </label>
                              </FormGroup>
                            </Col>
                            <Col md="3">
                              <FormGroup>
                                <p id="preview-event-start">{salesDetails.coordinatorName}</p>
                              </FormGroup>
                            </Col>
                            <Col sm="2">
                              <FormGroup>
                                <label className="overline-title">Tutor:</label>
                              </FormGroup>
                            </Col>
                            <Col sm="4">
                              <FormGroup>
                                <div className="form-control-wrap flex">
                                  <>
                                    <a
                                      href={`/lms/tutorprofile?id=${null}&userId=${salesDetails?.tutorId}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      {tutorList.find((t) => t.value == salesDetails?.tutorId)?.label}
                                    </a>

                                    <span className="btn btn-trigger btn-icon dropdown-toggle" onClick={() => {}}>
                                      <Icon name="alert-circle-fill"></Icon>
                                    </span>
                                  </>
                                </div>
                              </FormGroup>
                            </Col>
                          </Row>

                          <Row className="col-md-12">
                            <Col sm="3">
                              <FormGroup>
                                <label className="overline-title" htmlFor="dob">
                                  Board:
                                </label>
                              </FormGroup>
                            </Col>
                            <Col sm="3">
                              <FormGroup>
                                <p id="preview-event-start">{salesDetails.boardName}</p>
                              </FormGroup>
                            </Col>
                            <Col md="2">
                              <FormGroup>
                                <label className="overline-title" htmlFor="email">
                                  Grade:
                                </label>
                              </FormGroup>
                            </Col>
                            <Col md="4">
                              <FormGroup>
                                <p id="preview-event-start">{salesDetails.gradeName}</p>
                              </FormGroup>
                            </Col>
                          </Row>
                          <>
                            {salesDetails?.statusTypeCode == FollowUpStatus.DemoPendingTutorNotAssigned ||
                            salesDetails?.statusTypeCode == FollowUpStatus.Reject ||
                            salesDetails?.statusTypeCode == FollowUpStatus.Schedule ||
                            salesDetails?.statusTypeCode == FollowUpStatus.DemoPendingTutorAssignedApproved ? (
                              <>
                                <Row className="col-md-12">
                                  <Col sm="6">
                                    <FormGroup>
                                      <label className="overline-title">Tutorsss</label>
                                      <div
                                        className="form-control-wrap form-control-with-info"
                                        style={{ width: "100%" }}
                                      >
                                        <div class="tutor-info-container">
                                          <RSelect
                                            dataSource={tutorList || []}
                                            value1={salesDetails?.tutorId}
                                            value={salesDetails?.tutorId}
                                            menuPlacement="top"
                                            onChangeHandler={(e) => {
                                              setTutorId(e.value);
                                              setSalesDetails((prevState) => ({ ...prevState, tutorId: e.value }));
                                              setValue("tutorId", e.value);
                                            }}
                                            {...register("tutorId", { required: "Tutor is Required" })}
                                          />
                                          <a
                                            href="#alert"
                                            onClick={(e) => {
                                              e.preventDefault();
                                            }}
                                            className="btn btn-icon btn-trigger text-primary chat-profile-toggle"
                                          >
                                            <Icon name="alert-circle-fill"></Icon>
                                          </a>
                                        </div>
                                        {errors.tutorId && (
                                          <span className="invalid" style={{ color: "#e85347" }}>
                                            {errors.tutorId.message}
                                          </span>
                                        )}
                                      </div>
                                    </FormGroup>
                                  </Col>
                                  <Col sm="6">
                                    <FormGroup>
                                      <label className="overline-title">Status:</label>
                                      <div className="form-control-wrap">
                                        <RSelect
                                          dataSource={statusList || []}
                                          menuPlacement="top"
                                          value1={salesDetails?.statusId}
                                          value={salesDetails?.statusId}
                                          onChangeHandler={(e) => {
                                            setStatusId(e.value);
                                            setSalesDetails((prevState) => ({
                                              ...prevState,
                                              statusId: e.value,
                                              status: e.code,
                                            }));
                                            setValue("statusId", e.value);
                                            setStatus(FollowUpStatus.DemoPendingTutorAssignedNotApproved);
                                          }}
                                          {...register("statusId", { required: "Status is required" })}
                                        />
                                        {errors.statusId && (
                                          <span className="invalid" style={{ color: "#e85347" }}>
                                            {errors.statusId.message}
                                          </span>
                                        )}
                                      </div>
                                    </FormGroup>
                                  </Col>
                                </Row>
                              </>
                            ) : (
                              <>
                                <Row className="col-md-12">
                                  <Col md="3">
                                    <div className="form-group">
                                      <label className="overline-title" htmlFor="regular-price">
                                        Tutor Payment:
                                      </label>
                                    </div>
                                  </Col>
                                  <Col md="3">
                                    <div className="form-group">
                                      {salesDetails?.statusTypeCode == FollowUpStatus.LongFollowUp ||
                                      salesDetails?.statusTypeCode == FollowUpStatus.ShortFollowUp ? (
                                        <>
                                          <p id="preview-event-start">{salesDetails.tutorPayment}</p>
                                        </>
                                      ) : (
                                        <>
                                          <div className="form-control-wrap">
                                            <input
                                              type="number"
                                              name="tutorPayment"
                                              maxLength={3}
                                              ref={register({ required: "This is required" })}
                                              className="form-control"
                                              onChange={(e) => {
                                                setTutorPayment(e.target.value);
                                              }}
                                              defaultValue={salesDetails?.tutorPayment}
                                            />
                                            {errors.tutorPayment && (
                                              <span className="invalid">{errors.tutorPayment.message}</span>
                                            )}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </Col>
                                  <Col sm="2">
                                    <FormGroup>
                                      <label className="overline-title">Status:</label>
                                    </FormGroup>
                                  </Col>
                                  <Col sm="4">
                                    <FormGroup>
                                      <div className="form-control-wrap">
                                        <>
                                          <p
                                            className={
                                              salesDetails?.statusTypeCode ==
                                              FollowUpStatus.DemoPendingTutorAssignedNotApproved
                                                ? "text-warning"
                                                : salesDetails?.statusTypeCode == FollowUpStatus.Reject
                                                ? "text-danger"
                                                : "text-success"
                                            }
                                          >
                                            {salesDetails.statusTypeName}
                                          </p>
                                        </>
                                      </div>
                                    </FormGroup>
                                  </Col>
                                </Row>
                              </>
                            )}
                          </>

                          <Row className="col-md-12">
                            <Col md="6">
                              <FormGroup>
                                <label className="form-label">Follow-up Date:</label>
                                <div className="w-100">
                                  <div className="form-control-wrap">
                                    <DatePicker
                                      // selected={startIconDate}
                                      className="form-control date-picker"
                                      showMonthDropdown
                                      showYearDropdown
                                      calendarPlacement="top"
                                      popperPlacement="top-end"
                                      dropdownMode="select"
                                      yearDropdownItemNumber={100}
                                      scrollableYearDropdown
                                      startDate={new Date()}
                                      minDate={new Date()}
                                      // onChange={setStartIconDate}
                                      customInput={<ExampleCustomInput />}
                                    />
                                    <div className="form-icon form-icon-right">
                                      <Icon name="calendar"></Icon>
                                    </div>
                                  </div>
                                </div>
                              </FormGroup>
                            </Col>
                            <Col md="6">
                              <FormGroup>
                                <label className="form-label" htmlFor="noteText">
                                  Note:
                                </label>
                                <div className="form-control-wrap">
                                  <textarea
                                    className="no-resize form-control"
                                    id="noteText"
                                    name="noteText"
                                    style={{ minHeight: "60px" }}
                                    rows={2}
                                    onChange={(e) => {
                                      setSalesDetails((prevState) => ({
                                        ...prevState,
                                        noteText: e.target.value,
                                      }));
                                      setValue("noteText", e.target.value);
                                      setValue("tutorPayment", salesDetails?.tutorPayment || 0);
                                    }}
                                    ref={register({ required: true })}
                                  ></textarea>
                                  {errors.noteText && <p className="invalid">This field is required</p>}
                                </div>
                              </FormGroup>
                            </Col>
                          </Row>
                        </Form>
                      </div>
                    </ModalBody>
                    {canShowFooter && (
                      <ModalFooter className="bg-light">
                        <Col size="6"></Col>
                        <Col size="6">
                          <Button
                            className="footer-btn-right"
                            color="primary"
                            size="md"
                            onClick={() => {
                              setValue("tutorId", salesDetails.tutorId);
                              if (statusId != "") {
                                setValue("statusId", salesDetails.statusId);
                              }
                              setTimeout(() => {
                                formRef.current.props.onSubmit();
                              }, 5);
                            }}
                          >
                            {assignBtnName}
                          </Button>
                        </Col>
                      </ModalFooter>
                    )}
                  </Modal>
                </>
              )}
            </>
          )}
        </>
        {statusModal == true && (
          <>
            <ClassStatusUpdate
              dataItem={dataItem}
              key="scheduleClass"
              salesDetails={salesDetails}
              type={FollowUpStatus.NeedToSchedule}
              modalOpen={statusModal}
              modalStateChange={() => {
                setStatusModal(false);
                getEnrolledCourseList();
              }}
            ></ClassStatusUpdate>
          </>
        )}
        {assignTutorModal == true && (
          <TutorAssignmentPopup
            dataItem={dataItem}
            statusList={unFillterdStatusList}
            salesDetails={salesDetails}
            modalOpen={assignTutorModal}
            modalStateChange={() => {
              setAssignTutorModal(false);
              getEnrolledCourseList();
            }}
          ></TutorAssignmentPopup>
        )}

        {dropoutModal == true && (
          <StudentsDropoutPopup
            dataItem={dataItem}
            statusCode={statusCode}
            salesDetails={salesDetails}
            statusList={unFillterdStatusList}
            modalOpen={dropoutModal}
            modalStateChange={() => {
              setDropoutModal(false);
              getEnrolledCourseList();
            }}
          ></StudentsDropoutPopup>
        )}

        {followUpModal == true && (
          <FollowUpStatusPopup
            dataItem={dataItem}
            statusCode={statusCode}
            salesDetails={salesDetails}
            statusList={unFillterdStatusList}
            modalOpen={followUpModal}
            modalStateChange={() => {
              setFollowUpModal(false);
              getEnrolledCourseList();
            }}
          ></FollowUpStatusPopup>
        )}
        {scheduleDemoModal == true && (
          <>
            <ScheduleDemo
              dataItem={dataItem}
              key="scheduleDemo"
              salesDetails={salesDetails}
              type={FollowUpStatus.NeedToSchedule}
              modalOpen={scheduleDemoModal}
              modalStateChange={() => {
                setScheduleDemoModal(false);
                getEnrolledCourseList();
              }}
            ></ScheduleDemo>
          </>
        )}
        {scheduleActionsModal == true && (
          <>
            <ScheduleActionsPopup
              dataItem={dataItem}
              key="scheduleactions"
              salesDetails={salesDetails}
              type={FollowUpStatus.NeedToSchedule}
              modalOpen={scheduleActionsModal}
              modalStateChange={() => {
                setScheduleActionsModal(false);
                getEnrolledCourseList();
              }}
            ></ScheduleActionsPopup>
          </>
        )}
        {approveRejectModal == true && (
          <>
            <TutorApproveRejectPopup
              dataItem={dataItem}
              statusList={unFillterdStatusList}
              key="approveRejectModal"
              salesDetails={salesDetails}
              type={FollowUpStatus.DemoPendingTutorAssignedApproved}
              modalOpen={approveRejectModal}
              modalStateChange={() => {
                setApproveRejectModal(false);
                getEnrolledCourseList();
              }}
            ></TutorApproveRejectPopup>
          </>
        )}
        {tutorInfoModal && (
          <TutorInfo
            tutorId={tutorInfoData.tutorId}
            tutorUserId={tutorInfoData.tutorUserId}
            modalOpen={tutorInfoModal}
            tutorInfoModalHandler={() => setTutorInfoModal(false)}
          />
        )}

        {addScheduleOpen == true && (
          <ScheduleClassControl
            dataItem={dataItem}
            openViewModal={viewModal}
            viewDataItem={viewDataItem}
            subjectName={subject}
            openModal={addScheduleOpen}
            onScheduleApiCallback={() => {
              setAddScheduleOpen(false);
              getEnrolledCourseList();
            }}
            onScheduleCloseCallback={() => {
              setAddScheduleOpen(false);
              setViewModal(false);
            }}
          ></ScheduleClassControl>
        )}
        <>
          {viewModal == true && (
            <ScheduleClassControl
              dataItem={dataItem}
              openViewModal={viewModal}
              viewDataItem={viewDataItem}
              subjectName={subject}
              openModal={addScheduleOpen}
              onScheduleApiCallback={() => {
                setAddScheduleOpen(false);
                getEnrolledCourseList();
              }}
              onScheduleCloseCallback={() => {
                setAddScheduleOpen(false);
                setViewModal(false);
              }}
            ></ScheduleClassControl>
          )}
        </>
        <ToastContainer />
      </React.Fragment>
    </>
  );
};
export default ScheduleDemoAndClass;
