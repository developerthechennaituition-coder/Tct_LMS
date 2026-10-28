import React, { useContext, useEffect, useState, forwardRef, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import DatePicker from "react-datepicker";
import { ToastContainer } from "react-toastify";
import { toast } from "react-toastify";
import moment from "moment";
import Swal from "sweetalert2";
import { MessageCircle } from "lucide-react";
import { MessageSquare } from "lucide-react";
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
  Popover,
  UncontrolledPopover,
  PopoverHeader,
  PopoverBody,
  Spinner,
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
  ReactDataTable,
  TooltipComponent,
  RSelect,
} from "../../../components/Component";
import { setDateForPicker, UUIDNill } from "../../../utils/Utils";
import { NotificationType, FollowUpStatus, UserRole, actionStatus } from "../../../utils/Utils";
import { getTutors, getTutorsByAvailability, getUserAvailability } from "../../../apiservices/UserService";
import { GetSalesDetails } from "../../../apiservices/NofiticationService";
import { getTutorById, getPaymentPercentage } from "../../../apiservices/TutorService";
import { updateStatus } from "../../../apiservices/StudentEnrollmentService";
import TutorInfo from "../tutors/TutorInfo";
import TutorAvailabilityModal from "./TutorAvailabilityModal";

const TutorAssignmentPopup = (props) => {
  const defaultGuid = UUIDNill();
  const userId = localStorage.getItem("userId");
  const roleId = localStorage.getItem("roleId");
  const [isModalOpen, setIsModalOpen] = useState(props.modalOpen);
  const [modalHeader, setModalHeader] = useState("Assign Tutor");
  const [tutorInfoModal, setTutorInfoModal] = useState(false);
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
    tutorUserId: null,
    enrollmentDate: "",
    status: "",
  });
  const [tutorPaymentInfo, setTutorPaymentInfo] = useState({});
  const [userRoles, setUserRoles] = useState([]);
  const [tutorInfo, setTutorInfo] = useState({});
  const [tutorList, setTutorList] = useState([]);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [tutorName, setTutorName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);
  const [isLoadingAssignment, setIsLoadingAssignment] = useState(true);
  const [assignmentLoadError, setAssignmentLoadError] = useState(false);
  const [tutorHasAvailability, setTutorHasAvailability] = useState(true);
  const [availabilityModalOpen, setAvailabilityModalOpen] = useState(false);
  const paymentEditedRef = useRef(false);
  const toggle = () => setPopoverOpen(!popoverOpen);
  useEffect(() => {
    const loadAssignment = async () => {
    const tutorListData = await getTutorsByAvailability(props?.dataItem.stdUserId, props?.dataItem.salesId, props?.dataItem.subjectId).then(
      (response) => {
        let temp = [];
        if (response?.succeeded && Array.isArray(response?.data)) {
          response.data.forEach((s) => {
            if (!s?.tutorId) return;
            temp.push({
              value: s?.tutorId.toString(),
              label: s?.fullName,
              userId: s?.userId,
              isAvailable: s?.isAvailable,
            });
          });
        }
        setTutorList(temp);
        return temp;
      },
    );

    const _dataItem = props.dataItem;
    if (_dataItem) {
      let _response = { ...salesDetails };
      await GetSalesDetails(props?.dataItem.salesId, props?.dataItem.saleDetailsId, UUIDNill())
        .then((response) => {
          if (!response?.data || response?.succeeded === false) {
            throw new Error("Tutor assignment details could not be loaded.");
          }
          if (response?.data) {
            let temp = response?.data;
            temp["salesId"] = props?.dataItem.salesId;
            temp["salesDetailId"] = props?.dataItem.saleDetailsId;
            if (props.isTabContent == true) {
              temp["tutorId"] = props?.selectedTutor?.tutorId ?? temp["tutorId"];
              temp["tutorUserId"] = props?.selectedTutor?.userId ?? temp["tutorUserId"];
            } else if (!temp["tutorUserId"] && temp["tutorId"]) {
              const matched = tutorListData?.find((t) => t.value === temp["tutorId"]?.toString());
              if (matched) temp["tutorUserId"] = matched.userId;
            }
            setSalesDetails(temp);
            _response = temp;
            const existingTutorUserId = temp.tutorUserId || temp.tutorId;
            if (existingTutorUserId && existingTutorUserId !== defaultGuid) {
              checkTutorAvailability(existingTutorUserId);
            }
          }
        })
        .catch((error) => { throw error; });

      const inputParams = {
        boardId: _response.boardId,
        gradeId: _response.gradId,
        subjectId: _response.subjectId,
        tutorPayment: _response?.parentPayment,
      };
      await getPaymentPercentage(inputParams).then((response) => {
        if (response) {
          // Preserve the assignment's approved payment. The configured percentage
          // is only a recommendation when no tutor/payment has been assigned yet.
          setSalesDetails((prevState) => ({
            ...prevState,
            tutorPayment:
              paymentEditedRef.current
                ? prevState.tutorPayment
                : prevState.tutorId && prevState.tutorId !== defaultGuid && Number(prevState.tutorPayment) > 0
                ? prevState.tutorPayment
                : response.tutorPayment,
          }));
          setTutorPaymentInfo(response);
        }
      });
    }
    };
    loadAssignment().catch(() => {
      setAssignmentLoadError(true);
      toast.error("Unable to load tutor assignment details. Close this dialog and try again.");
    }).finally(() => setIsLoadingAssignment(false));
  }, []);

  // "Configure Payment Percentage" opens in a new tab. While no percentage is configured,
  // reload it when the user returns here, so Save enables without reopening this dialog.
  useEffect(() => {
    if (isLoadingAssignment || assignmentLoadError || tutorPaymentInfo?.tutorPercentage || !salesDetails?.boardId) return;
    const reloadPaymentPercentage = () => {
      getPaymentPercentage({
        boardId: salesDetails.boardId,
        gradeId: salesDetails.gradId,
        subjectId: salesDetails.subjectId,
        tutorPayment: salesDetails.parentPayment,
      })
        .then((response) => {
          if (!response?.tutorPercentage) return;
          setSalesDetails((prevState) => ({
            ...prevState,
            tutorPayment:
              paymentEditedRef.current
                ? prevState.tutorPayment
                : prevState.tutorId && prevState.tutorId !== defaultGuid && Number(prevState.tutorPayment) > 0
                ? prevState.tutorPayment
                : response.tutorPayment,
          }));
          setTutorPaymentInfo(response);
        })
        .catch(() => {});
    };
    window.addEventListener("focus", reloadPaymentPercentage);
    return () => window.removeEventListener("focus", reloadPaymentPercentage);
  }, [isLoadingAssignment, assignmentLoadError, tutorPaymentInfo?.tutorPercentage, salesDetails?.boardId, salesDetails?.gradId, salesDetails?.subjectId, salesDetails?.parentPayment]);

  const onStatusUpdateHandler = (formValues) => {
    if (savingRef.current || isLoadingAssignment || assignmentLoadError) return;
    const statusCode = FollowUpStatus.DemoPendingTutorAssignedNotApproved;
    const _status = (props.statusList || []).find((s) => s.code == statusCode);
    if (!_status?.id) {
      toast.error("Unable to identify the tutor-assignment status. Please refresh and try again.");
      return;
    }
    const inputData = {
      SalesId: salesDetails?.salesId,
      SaleseDetailsId: salesDetails?.salesDetailId,
      UserId: userId,
      NoteText: formValues?.noteText ?? salesDetails?.noteText ?? "",
      Status: statusCode,
      TutorId: salesDetails?.tutorId,
      StatusId: _status.id,
      FollowUpDate: null,
      TutorPayment: Number(formValues?.tutorPayment ?? salesDetails?.tutorPayment),
    };

    savingRef.current = true;
    setIsSaving(true);
    updateStatus(inputData)
      .then((response) => {
        if (response?.succeeded !== true) {
          throw new Error(response?.message || "Tutor assignment was not confirmed. Refresh the record before retrying.");
        }
        toast.success("Tutor assigned successfully.", {
          position: "top-right",
          autoClose: true,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: false,
        });
        setIsModalOpen(false);
        props.modalStateChange(false);
      })
      .catch((error) => {
        toast.error(error?.response?.data?.message || error?.message || "Tutor assignment could not be completed. Refresh the record before retrying.", {
          position: "top-right",
          autoClose: true,
          hideProgressBar: true,
        });
      })
      .finally(() => { savingRef.current = false; setIsSaving(false); });
  };

  const { errors, register, handleSubmit, setValue, setError, clearErrors } = useForm({});

  useEffect(() => {
    register("tutorId", { required: "Tutor is required" });
  }, [register]);

  useEffect(() => {
    setValue("tutorId", salesDetails.tutorId);
  }, [salesDetails, setValue]);

  const openTutorInfoWindow = () => {
    const width = 400;
    const height = 300;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    setTutorInfoModal(true);
  };

  const checkTutorAvailability = (tutorUserId) => {
    if (!tutorUserId || tutorUserId === defaultGuid) return;
    getUserAvailability(tutorUserId).then((response) => {
      setTutorHasAvailability(Array.isArray(response) ? response.length > 0 : false);
    }).catch(() => setTutorHasAvailability(false));
  };
  const handleTutorPaymentChange = (e) => { 
    if(salesDetails.parentPayment == undefined || salesDetails.parentPayment == null  || salesDetails.parentPayment == 0  ){
      setError("tutorPayment", {
        type: "manual",
        message: `Parent payment is not set.`,
      });
      return;
    }
    const value = e.target.value;
    paymentEditedRef.current = true;
    setValue("tutorPayment", value);
    const maxTutorPayment = (salesDetails.parentPayment * tutorPaymentInfo?.tutorPercentage) / 100;
    if (value > maxTutorPayment) {
      // Exceptional payments are allowed to be submitted; the API notification
      // workflow sends the assignment to Super Admin for review.
      clearErrors("tutorPayment");
      setTutorPaymentInfo((previous) => ({ ...previous, requiresSuperAdminApproval: true }));
    } else {
      clearErrors("tutorPayment");
      setTutorPaymentInfo((previous) => ({ ...previous, requiresSuperAdminApproval: false }));
    }

    setSalesDetails((prevState) => ({
      ...prevState,
      tutorPayment: value,
    }));
  };
  const tutorInfoModalHandler = () => {
    setTutorInfoModal(false);
  };

  const onChangeHandler = () => {};
  const RenderContent = ({ onChangeHandler }) => {
    return (
      <div>
        <Form className="row gy-1" noValidate onSubmit={handleSubmit(onStatusUpdateHandler)}>
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
                <p id="preview-event-start">{salesDetails?.coordinatorName}</p>
              </FormGroup>
            </Col>
            <Col sm="2">
              <FormGroup>
                <label className="overline-title" htmlFor="dob">
                  Board:
                </label>
              </FormGroup>
            </Col>
            <Col sm="4">
              <FormGroup>
                <p id="preview-event-start">{salesDetails?.boardName}</p>
              </FormGroup>
            </Col>
          </Row>

          <Row className="col-md-12">
            <Col md="3">
              <FormGroup>
                <label className="overline-title" htmlFor="email">
                  Grade:
                </label>
              </FormGroup>
            </Col>
            <Col md="3">
              <FormGroup>
                <p id="preview-event-start">{salesDetails?.gradeName}</p>
              </FormGroup>
            </Col>
            <Col md="2">
              <FormGroup>
                <label className="overline-title" htmlFor="status">
                  Status:
                </label>
              </FormGroup>
            </Col>
            <Col md="4">
              <FormGroup>
                <p id="preview-event-start">{salesDetails?.statusTypeName}</p>
              </FormGroup>
            </Col>
          </Row>
          {tutorList.length > 0 && (
            <Row className="col-md-12">
              <Col sm="6">
                <FormGroup>
                  <label className="overline-title">Tutor</label>
                  <div className="form-control-wrap form-control-with-info" style={{ width: "100%" }}>
                    <div class="tutor-info-container">
                      <RSelect
                        name="tutorId"
                        // id="tutorId"
                        isCustomOption={true}
                        ref={register({ required: "This field is required" })}
                        dataSource={tutorList || []}
                        value1={salesDetails.tutorId}
                        onChangeHandler={(e) => {
                          const isCurrentTutor = e.userId === salesDetails.tutorUserId || e.value === salesDetails.tutorId;
                          setTutorName(e.label);
                          setPopoverOpen(false);
                          console.log(salesDetails);
                          setSalesDetails((prevState) => ({
                            ...prevState,
                            tutorId: e.userId,
                            tutorUserId: e.userId,
                          }));
                          if (!isCurrentTutor) getTutorById(e.value).then((response) => {
                            const tutorSubject = response.data.tutorDetails.find(
                              (s) => s.subjectId == salesDetails.subjectId &&
                                (!s.boardId || s.boardId == salesDetails.boardId) &&
                                (!s.gradeId || s.gradeId == salesDetails.gradId),
                            );
                            if (tutorSubject && !paymentEditedRef.current) setSalesDetails((prevState) => ({
                              ...prevState, tutorPayment: tutorSubject.tutorPayment,
                            }));
                          });
                        }}
                        // {...register("tutorId", { required: "Tutor is Required" })}
                      />
                      <a
                        href="#alert"
                        onClick={(e) => {
                          e.preventDefault();
                        }}
                        className="btn btn-icon btn-trigger text-primary chat-profile-toggle"
                      >
                        <Icon
                          name="alert-circle-fill"
                          id="PopoverTop"
                          onClick={() => {
                            const effectiveTutorUserId = salesDetails.tutorUserId || salesDetails.tutorId;
                            if (
                              effectiveTutorUserId != undefined &&
                              effectiveTutorUserId != null &&
                              effectiveTutorUserId != defaultGuid
                            ) {
                              openTutorInfoWindow();
                            }
                          }}
                        ></Icon>
                      </a>
                    </div>
                    {errors.tutorId && (
                      <span className="invalid" style={{ color: "#e85347", fontSize: "11px", fontStyle: "italic" }}>
                        {errors.tutorId.message}
                      </span>
                    )}

                    {tutorInfoModal == true && (
                      <>
                        <TutorInfo
                          tutorId={salesDetails.tutorId}
                          tutorUserId={salesDetails.tutorUserId || salesDetails.tutorId}
                          modalOpen={tutorInfoModal}
                          tutorInfoModalHandler={tutorInfoModalHandler}
                        ></TutorInfo>
                      </>
                    )}
                  </div>
                </FormGroup>
              </Col>
              <Col sm="6">
                <FormGroup>
                  <label className="overline-title"> Tutor Payment:</label>
                  <div className="form-control-wrap form-control-with-info" style={{ width: "100%" }}>
                    <input
                      type="number"
                      id="tutorPayment"
                      name="tutorPayment"
                      maxLength={3}
                      value={salesDetails?.tutorPayment ?? ""}
                      ref={register({ required: true })}
                      // {...register("tutorPayment", { required: "Tutor payment is required" })}
                      className={`form-control ${errors.tutorPayment ? "is-invalid" : ""}`}
                      onChange={handleTutorPaymentChange}
                    />
                    {errors.tutorPayment && <p className="invalid">{errors.tutorPayment.message}</p>}
                    {!tutorPaymentInfo?.tutorPercentage && (
                      <a
                        href={`${window.location.origin}/payment-percentage-config`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: "12px" }}
                      >
                        Configure Payment Percentage
                      </a>
                    )}
                  </div>
                </FormGroup>
              </Col>
            </Row>
          )}
          {salesDetails.tutorId && salesDetails.tutorId !== defaultGuid && !tutorHasAvailability && (
            <Row className="col-md-12">
              <Col md="12">
                <div className="alert alert-warning d-flex align-items-center justify-content-between mb-2" style={{ borderRadius: "6px" }}>
                  <span>
                    <Icon name="alert-circle" className="mr-1" />
                    This tutor has no availability set. Please add availability before assigning.
                  </span>
                  <Button color="warning" size="sm" className="ml-2" type="button" onClick={() => setAvailabilityModalOpen(true)}>
                    Add Availability
                  </Button>
                </div>
              </Col>
            </Row>
          )}
          <Row className="col-md-12">
            <Col md="12">
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
                    }}
                    ref={register({ required: true })}
                  ></textarea>
                  {errors.noteText && <p className="invalid">This field is required</p>}
                </div>
              </FormGroup>
            </Col>
          </Row>
          <Row className="col-md-12 pt-3">
            <Col size="6"></Col>
            <Col size="6">
              <Button className="footer-btn-right ml-4" type="submit" color="primary" id="tests" size="md" disabled={isSaving || isLoadingAssignment || assignmentLoadError || !tutorHasAvailability || !!errors.tutorPayment || !tutorPaymentInfo?.tutorPercentage}>
                {isSaving ? (
                  <>
                    <Spinner size="sm" className="mr-1" /> Saving...
                  </>
                ) : "Save"}
              </Button>
              <Button
                className="footer-btn-right"
                color="secondary"
                size="md"
                onClick={() => {
                  setIsModalOpen(false);
                  props.modalStateChange(false);
                }}
              >
                Cancel
              </Button>
            </Col>
          </Row>
        </Form>
      </div>
    );
  };

  return (
    <>
      {props.isTabContent == true ? (
        <div>
          <Form className="row gy-1" noValidate onSubmit={handleSubmit(onStatusUpdateHandler)}>
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
                  <p id="preview-event-start">{salesDetails?.coordinatorName}</p>
                </FormGroup>
              </Col>
              <Col sm="2">
                <FormGroup>
                  <label className="overline-title" htmlFor="dob">
                    Board:
                  </label>
                </FormGroup>
              </Col>
              <Col sm="4">
                <FormGroup>
                  <p id="preview-event-start">{salesDetails?.boardName}</p>
                </FormGroup>
              </Col>
            </Row>

            <Row className="col-md-12">
              <Col md="3">
                <FormGroup>
                  <label className="overline-title" htmlFor="email">
                    Grade:
                  </label>
                </FormGroup>
              </Col>
              <Col md="3">
                <FormGroup>
                  <p id="preview-event-start">{salesDetails?.gradeName}</p>
                </FormGroup>
              </Col>
              <Col md="2">
                <FormGroup>
                  <label className="overline-title" htmlFor="status">
                    Status:
                  </label>
                </FormGroup>
              </Col>
              <Col md="4">
                <FormGroup>
                  <p id="preview-event-start">{salesDetails?.statusTypeName}</p>
                </FormGroup>
              </Col>
            </Row>
            {tutorList.length > 0 && (
              <Row className="col-md-12">
                <Col sm="6">
                  <FormGroup>
                    <label className="overline-title">Tutor</label>
                    <div className="form-control-wrap form-control-with-info" style={{ width: "100%" }}>
                      <div class="tutor-info-container">
                        <RSelect
                          name="tutorId"
                          // id="tutorId"
                          isCustomOption={true}
                          ref={register({ required: "This field is required" })}
                          dataSource={tutorList || []}
                          value1={salesDetails.tutorId}
                          onChangeHandler={(e) => {
                            const isCurrentTutor = e.userId === salesDetails.tutorUserId || e.value === salesDetails.tutorId;
                            setTutorName(e.label);
                            setPopoverOpen(false);
                            setSalesDetails((prevState) => ({
                              ...prevState,
                              tutorId: e.userId,
                              tutorUserId: e.userId,
                            }));
                            checkTutorAvailability(e.userId);
                            if (!isCurrentTutor) getTutorById(e.value).then((response) => {
                              const tutorSubject = response.data.tutorDetails.find(
                                (s) => s.subjectId == salesDetails.subjectId &&
                                  (!s.boardId || s.boardId == salesDetails.boardId) &&
                                  (!s.gradeId || s.gradeId == salesDetails.gradId),
                              );
                              if (tutorSubject && !paymentEditedRef.current) setSalesDetails((prevState) => ({
                                ...prevState, tutorPayment: tutorSubject.tutorPayment,
                              }));
                            });
                          }}
                          // {...register("tutorId", { required: "Tutor is Required" })}
                        />
                        <a
                          href="#alert"
                          onClick={(e) => {
                            e.preventDefault();
                          }}
                          className="btn btn-icon btn-trigger text-primary chat-profile-toggle"
                        >
                          <Icon
                            name="alert-circle-fill"
                            id="PopoverTop"
                            onClick={() => {
                              const effectiveTutorUserId = salesDetails.tutorUserId || salesDetails.tutorId;
                              if (
                                effectiveTutorUserId != undefined &&
                                effectiveTutorUserId != null &&
                                effectiveTutorUserId != defaultGuid
                              ) {
                                openTutorInfoWindow();
                              }
                            }}
                          ></Icon>
                        </a>
                      </div>
                      {errors.tutorId && (
                        <span className="invalid" style={{ color: "#e85347", fontSize: "11px", fontStyle: "italic" }}>
                          {errors.tutorId.message}
                        </span>
                      )}

                      {tutorInfoModal == true && (
                        <>
                          <TutorInfo
                            tutorId={salesDetails.tutorId}
                            tutorUserId={salesDetails.tutorUserId || salesDetails.tutorId}
                            modalOpen={tutorInfoModal}
                            tutorInfoModalHandler={tutorInfoModalHandler}
                          ></TutorInfo>
                        </>
                      )}
                    </div>
                  </FormGroup>
                </Col>
                <Col sm="6">
                  <FormGroup>
                    <label className="overline-title"> Tutor Payment:</label>
                    <div className="form-control-wrap form-control-with-info" style={{ width: "100%" }}>
                      <input
                        type="number"
                        id="tutorPayment"
                        name="tutorPayment"
                        maxLength={3}
                        value={salesDetails?.tutorPayment ?? ""}
                        ref={register({ required: true })}
                        // {...register("tutorPayment", { required: "Tutor payment is required" })}
                        className={`form-control ${errors.tutorPayment ? "is-invalid" : ""}`}
                        onChange={handleTutorPaymentChange}
                      />
                      {errors.tutorPayment && <p className="invalid">{errors.tutorPayment.message}</p>}
                      {!tutorPaymentInfo?.tutorPercentage && (
                        <a
                          href={`${window.location.origin}/payment-percentage-config`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: "12px" }}
                        >
                          Configure Payment Percentage
                        </a>
                      )}
                    </div>
                  </FormGroup>
                </Col>
              </Row>
            )}
            {salesDetails.tutorId && salesDetails.tutorId !== defaultGuid && !tutorHasAvailability && (
              <Row className="col-md-12">
                <Col md="12">
                  <div className="alert alert-warning d-flex align-items-center justify-content-between mb-2" style={{ borderRadius: "6px" }}>
                    <span>
                      <Icon name="alert-circle" className="mr-1" />
                      This tutor has no availability set. Please add availability before assigning.
                    </span>
                    <Button color="warning" size="sm" className="ml-2" type="button" onClick={() => setAvailabilityModalOpen(true)}>
                      Add Availability
                    </Button>
                  </div>
                </Col>
              </Row>
            )}
            <Row className="col-md-12">
              <Col md="12">
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
                      }}
                      ref={register({ required: true })}
                    ></textarea>
                    {errors.noteText && <p className="invalid">This field is required</p>}
                  </div>
                </FormGroup>
              </Col>
            </Row>
            <Row className="col-md-12 pt-3">
              <Col size="6"></Col>
              <Col size="6">
                <Button className="footer-btn-right ml-4" type="submit" color="primary" id="tests" size="md" disabled={isSaving || isLoadingAssignment || assignmentLoadError || !tutorHasAvailability || !!errors.tutorPayment || !tutorPaymentInfo?.tutorPercentage}>
                  {isSaving ? (
                    <>
                      <Spinner size="sm" className="mr-1" /> Saving...
                    </>
                  ) : "Save"}
                </Button>
                <Button
                  className="footer-btn-right"
                  color="secondary"
                  size="md"
                  onClick={() => {
                    setIsModalOpen(false);
                    props.modalStateChange(false);
                  }}
                >
                  Cancel
                </Button>
              </Col>
            </Row>
          </Form>
        </div>
      ) : (
        <>
          <Modal
            key={"modal1234"}
            isOpen={isModalOpen}
            toggle={() => {
              setIsModalOpen(false);
              props.modalStateChange(false);
            }}
            className="modal-dialog-centered"
            size="lg"
          >
            <ModalHeader
              close={
                <button
                  className="close"
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    props.modalStateChange(false);
                  }}
                >
                  <Icon name="cross" />
                </button>
              }
            >
              {modalHeader}
            </ModalHeader>
            <ModalBody>
              <RenderContent></RenderContent>
            </ModalBody>
          </Modal>
        </>
      )}
      {availabilityModalOpen && (
        <TutorAvailabilityModal
          isOpen={availabilityModalOpen}
          userId={salesDetails.tutorUserId || salesDetails.tutorId}
          loggedInUserId={userId}
          onClose={() => setAvailabilityModalOpen(false)}
          onSaved={() => {
            setAvailabilityModalOpen(false);
            setTutorHasAvailability(true);
          }}
        />
      )}
    </>
  );
};

export default TutorAssignmentPopup;
