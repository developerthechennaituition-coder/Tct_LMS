import React, { useContext, useEffect, useState, forwardRef, useRef } from "react";
import { useForm } from "react-hook-form";
import DatePicker from "react-datepicker";
import { toast } from "react-toastify";
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
  ReactDataTable,
  TooltipComponent,
  RSelect,
} from "../../../components/Component";
import { setDateForPicker, UUIDNill, CoordinatorActions } from "../../../utils/Utils";
import { NotificationType, FollowUpStatus, UserRole, actionStatus } from "../../../utils/Utils";
import { getTutors, getCoordinatorAdmins } from "../../../apiservices/UserService";
import { GetSalesDetails } from "../../../apiservices/NofiticationService";
import { getLookups, getAllRoles } from "../../../apiservices/LookupsService";
import { updateStatus, updateStudnentDropout } from "../../../apiservices/StudentEnrollmentService";
import TutorInfo from "../tutors/TutorInfo";
import { tutorAssignmentLabel } from "../../../library/workflowDisplay";

const ScheduleActionsPopup = (props) => {
  const defaultGuid = UUIDNill();
  const userId = localStorage.getItem("userId");
  const roleId = localStorage.getItem("roleId");
  const [isModalOpen, setIsModalOpen] = useState(props.modalOpen);
  const [modalHeader, setModalHeader] = useState("");
  const [salesDetailsId, setSalesDetailsId] = useState();
  const [statusList, setStatusList] = useState([]);
  const [dropoutRatioType, setDropoutRatioType] = useState();
  const [isDropout, setIsDropout] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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
    enrollmentDate: "",
    followUpDate: new Date(),
    DropoutReasonTypeId: null,
    statusId: null,
    status: "",
  });
  const [tutorList, setTutorList] = useState([]);
  const effectiveTutorUserId = salesDetails?.tutorUserId || salesDetails?.tutorId;
  const hasAssignedTutor = effectiveTutorUserId && effectiveTutorUserId !== defaultGuid;
  useEffect(async () => {

    getLookups("200" /*status*/).then((response) => {
      let temp = [];
      temp = response
        .filter((s) => s.isActive == true)
        .map((s) => {
          return { value: s?.id, label: s?.typeCodeName, code: s?.typeCodeValue, id: s?.id };
        });

      temp = temp.filter((s) => Object.values(CoordinatorActions).includes(s.code));

      setStatusList(temp);
    });

    getLookups("900" /*status*/).then((response) => {
      let temp = [];
      const ids = [90012, 90002, 90003, 90004, 90005, 90006, 90001, 90009, 90014];

      response?.forEach((s) => {
        temp.push({ value: s?.id, label: s?.typeCodeName, code: s?.typeCodeValue, id: s?.id });
      });
      temp = temp.filter((s) => ids.includes(s.code));
      setDropoutRatioType(temp);
    });

    getTutors().then((response) => {
      let temp = [];
      response.forEach((s) => {
        temp.push({ value: s?.id.toString(), label: s?.fullName });
      });
      setTutorList(temp);
    });

    const _dataItem = props.dataItem;
    if (_dataItem) {
      await GetSalesDetails(props?.dataItem.salesId, props?.dataItem.saleDetailsId)
        .then((response) => {
          if (response?.data) {
            let temp = response?.data;
            // temp["statusId"] = props?.dataItem?.statusId;
            temp["salesId"] = props?.dataItem.salesId;
            temp["DropoutReasonTypeId"] = null;
            temp["salesDetailId"] = props?.dataItem.saleDetailsId;
            temp["followUpDate"] = temp.followUpDate ? new Date(temp.followUpDate) : new Date();
            temp["noteText"] = temp.noteText || "";
            setSalesDetails(temp);
          }
        })
        .catch((error) => {});
    }
    setModalHeader(
      salesDetails.tutorId == defaultGuid || salesDetails.tutorId == null ? "Assign Tutor" : "Change Tutor"
    );
  }, []);

  const onStatusUpdateHandler = async () => {

    if (!salesDetails.statusId || !salesDetails.statusCode) {
      toast.error("Please select an action.");
      return;
    }

    let inputData = {
      SalesId: salesDetails?.salesId,
      SaleseDetailsId: salesDetails?.salesDetailId,
      UserId: userId,
      NoteText: salesDetails?.noteText || "",
      Status: salesDetails.statusCode,
      TutorId: salesDetails?.tutorId,
      StatusId: salesDetails.statusId,
      FollowUpDate: salesDetails?.followUpDate,
      TutorPayment: salesDetails?.tutorPayment,
    };

    setIsSaving(true);
    try {
      if (isDropout) {
        inputData = { ...inputData, DropoutReasonTypeId: salesDetails?.DropoutReasonTypeId };
      }

      const response = isDropout
        ? await updateStudnentDropout(inputData)
        : await updateStatus(inputData);

      if (response?.succeeded === false) {
        throw new Error(response.message || "Status update failed.");
      }

      toast.success(isDropout ? "Data updated successfully." : "Follow-up status updated successfully.", {
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
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Unable to update the status.", {
        position: "top-right",
        autoClose: true,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: false,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const CustomDatePicker = forwardRef(({ value, onClick, onChange }, ref) => (
    <div onClick={onClick} ref={ref}>
      <input className="form-control date-picker" name="followUpDate" type="text" value={value} onChange={onChange} />
      <div className="form-icon form-icon-right">
        <Icon name="calendar"></Icon>
      </div>
    </div>
  ));

  const { errors, register, unregister, handleSubmit, setValue, trigger, clearErrors } = useForm({});

  useEffect(() => {
    if (isDropout) {
      register("DropoutReasonTypeId", { required: "Dropout resason required" });
    } else {
      unregister("DropoutReasonTypeId");
    }
  }, [isDropout, register, unregister]);

  useEffect(() => {
    // Register custom fields
    register("followUpDate", { required: "Follow-Up Date is required" });
    register("statusId", { required: "Actions is required" });
  }, [register]);

  React.useEffect(() => {
    setValue("followUpDate", salesDetails.followUpDate);
    setValue("statusId", salesDetails.statusId);
    if (isDropout) {
      setValue("DropoutReasonTypeId", salesDetails.DropoutReasonTypeId);
    }
  }, [salesDetails, setValue, trigger]);

  return (
    <>
      <Modal
        key={"modal1234"}
        isOpen={isModalOpen}
        toggle={() => {
          setIsModalOpen(false);
          props.modalStateChange(false);
        }}
        className="modal-dialog-centered custom-modal"
        size="xl"
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
          Status Update
        </ModalHeader>
        <ModalBody>
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
                          {salesDetails?.tutorName || tutorList.find((t) => t.value == salesDetails?.tutorId)?.label || "Not Assigned"}
                        </a>

                        <button
                          type="button"
                          className="btn btn-trigger btn-icon"
                          aria-label="View tutor details"
                          title={hasAssignedTutor ? "View tutor details" : "Tutor is not assigned"}
                          disabled={!hasAssignedTutor}
                          onClick={() => setTutorInfoModal(true)}
                        >
                          <Icon name="alert-circle-fill"></Icon>
                        </button>
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
                    <p>{salesDetails.tutorPayment}</p>
                  </div>
                </Col>
                <Col sm="2">
                  <FormGroup>
                    <label className="overline-title">Current action:</label>
                  </FormGroup>
                </Col>
                <Col sm="4">
                  <FormGroup>
                    <div className="form-control-wrap">
                      <>
                        <p
                          className={
                            salesDetails?.statusTypeCode == FollowUpStatus.DemoPendingTutorAssignedNotApproved
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
                <Col md="6">
                  <FormGroup>
                    <label className="form-label">Actions:</label>
                    <div className="w-100">
                      <div className="form-control-wrap">
                        <RSelect
                          name="statusId"
                          id="statusId"
                          isCustomOption={false}
                          ref={register({ required: true })}
                          dataSource={(statusList || []).map(option => ({ ...option, label: tutorAssignmentLabel(option.label, salesDetails.tutorId) }))}
                          value1={salesDetails?.statusId}
                          onChangeHandler={(e) => {
                            setIsDropout(
                              e.code == CoordinatorActions.DCTutorChange ||
                                e.code == CoordinatorActions.DemoCancelled ||
                                e.code == CoordinatorActions.DCDropped ||
                                e.code == CoordinatorActions.TutorChangedDropped ||
                                e.code == CoordinatorActions.DPDropped
                            );
                            setSalesDetails((prevState) => ({
                              ...prevState,
                              statusCode: e.code,
                              statusId: e.value,
                            }));
                            setValue("statusId", e.value, { shouldValidate: true });
                            clearErrors("statusId");
                          }}
                        />
                        {errors.statusId && (
                          <span className="invalid" style={{ color: "#e85347", fontSize: "11px", fontStyle: "italic" }}>
                            {errors.statusId.message}
                          </span>
                        )}
                      </div>
                    </div>
                  </FormGroup>
                </Col>
                <Col md="6">
                  <FormGroup>
                    <label className="form-label">Action Effective Date:</label>
                    <div className="w-100">
                      <div className="form-control-wrap">
                        <DatePicker
                          defaultValue={salesDetails?.followUpDate}
                          selected={salesDetails?.followUpDate}
                          value={salesDetails?.followUpDate}
                          name="followUpDate"
                          id="followUpDate"
                          className="form-control date-picker"
                          showMonthDropdown
                          showYearDropdown
                          dropdownMode="select"
                          yearDropdownItemNumber={100}
                          scrollableYearDropdown
                          startDate={new Date()}
                          minDate={new Date()}
                          onChange={(e) => {
                            setSalesDetails((prevState) => ({
                              ...prevState,
                              followUpDate: e,
                            }));
                            setValue("followUpDate", e, { shouldValidate: true });
                            clearErrors("followUpDate");
                          }}
                          // customInput={<CustomDatePicker />}
                        />
                        <div className="form-icon form-icon-right">
                          <Icon name="calendar"></Icon>
                        </div>
                      </div>
                      {errors.followUpDate && (
                        <span className="invalid" style={{ color: "#e85347", fontSize: "11px", fontStyle: "italic" }}>
                          {errors.followUpDate.message}
                        </span>
                      )}
                    </div>
                  </FormGroup>
                </Col>
              </Row>
              {isDropout && (
                <>
                  <Row className="col-md-12">
                    <Col md="12">
                      <FormGroup>
                        <label className="form-label">Drop Ratio Reasons:</label>
                        <div className="w-100">
                          <div className="form-control-wrap">
                            <RSelect
                              name="DropoutReasonTypeId"
                              isCustomOption={false}
                              ref={register({ required: true })}
                              dataSource={dropoutRatioType || []}
                              value1={salesDetails.DropoutReasonTypeId}
                              onChangeHandler={(e) => {
                                setSalesDetails((prevState) => ({
                                  ...prevState,
                                  DropoutReasonTypeId: e.value,
                                }));
                              }}
                            />
                            {errors.DropoutReasonTypeId && (
                              <span
                                className="invalid"
                                style={{ color: "#e85347", fontSize: "11px", fontStyle: "italic" }}
                              >
                                {errors.DropoutReasonTypeId.message}
                              </span>
                            )}
                          </div>
                        </div>
                      </FormGroup>
                    </Col>
                  </Row>
                </>
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
                        placeholder="Add any relevant notes for this action."
                        value={salesDetails?.noteText}
                        style={{ minHeight: "60px" }}
                        rows={2}
                        onChange={(e) => {
                          setSalesDetails((prevState) => ({
                            ...prevState,
                            noteText: e.target.value,
                          }));
                        }}
                        ref={register}
                      ></textarea>
                      {errors.noteText && <p className="invalid">This field is required</p>}
                    </div>
                  </FormGroup>
                </Col>
              </Row>
              <Row className="col-md-12 pt-3">
                <Col size="6"></Col>
                <Col size="6">
                  <Button
                    className="footer-btn-right ml-2"
                    type="button"
                    color="secondary"
                    size="md"
                    onClick={() => {
                      setIsModalOpen(false);
                      props.modalStateChange(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="footer-btn-right"
                    type="button"
                    color="primary"
                    size="md"
                    disabled={isSaving}
                    onClick={() => {
                      if (salesDetails.statusTypeName === "DemoPendingTutorAssigned") {
                        toast.warning("Assigned tutor approval pending from coordinator admin.");
                        return;
                      }
                      handleSubmit(onStatusUpdateHandler)();
                    }}
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                </Col>
              </Row>
            </Form>
          </div>
        </ModalBody>
      </Modal>
      {tutorInfoModal && hasAssignedTutor && (
        <TutorInfo
          tutorId={salesDetails?.tutorId}
          tutorUserId={effectiveTutorUserId}
          modalOpen={tutorInfoModal}
          tutorInfoModalHandler={() => setTutorInfoModal(false)}
        />
      )}
    </>
  );
};

export default ScheduleActionsPopup;
