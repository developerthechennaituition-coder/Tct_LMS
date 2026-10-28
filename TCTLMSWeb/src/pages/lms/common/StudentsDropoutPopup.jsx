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
import { FollowUpStatus, setDateForPicker, UUIDNill } from "../../../utils/Utils";
import { getTutors, getCoordinatorAdmins } from "../../../apiservices/UserService";
import { GetSalesDetails } from "../../../apiservices/NofiticationService";
import { getLookups, getAllRoles } from "../../../apiservices/LookupsService";
import { updateStudnentDropout } from "../../../apiservices/StudentEnrollmentService";

const StudentsDropoutPopup = (props) => {
  const defaultGuid = UUIDNill();
  const userId = localStorage.getItem("userId");
  const roleId = localStorage.getItem("roleId");
  const [buttonText, setButtonText] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(props.modalOpen);
  const [modalHeader, setModalHeader] = useState("");
  const [salesDetailsId, setSalesDetailsId] = useState();
  const [dropoutRatioType, setDropoutRatioType] = useState();
  const [loading, setLoading] = useState(false);
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
    status: "",
    StatusId: defaultGuid,
    DropoutReasonTypeId: defaultGuid,
  });
  const [tutorList, setTutorList] = useState([]);
  useEffect(async () => {
    // setButtonText(actionStatus.find((s) => s.value == props.statusCode).label);
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
            temp["salesId"] = props?.dataItem.salesId;
            temp["salesDetailId"] = props?.dataItem.saleDetailsId;
            setSalesDetails(temp);
          }
        })
        .catch((error) => {});
    }
    setModalHeader(
      salesDetails.tutorId == defaultGuid || salesDetails.tutorId == null ? "Assign Tutor" : "Change Tutor"
    );

    getLookups("900" /*status*/).then((response) => {
      let temp = [];
      const ids = [90012, 90002, 90003, 90004, 90005, 90006, 90001, 90009, 90014];

      response?.forEach((s) => {
        temp.push({ value: s?.id, label: s?.typeCodeName, code: s?.typeCodeValue, id: s?.id });
      });
      temp = temp.filter((s) => ids.includes(s.code));
      setDropoutRatioType(temp);
    });
  }, []);

  const onStatusUpdateHandler = () => {
    const _status = props.statusList.find((s) => s.code == FollowUpStatus.Drop);
    const inputData = {
      SalesId: salesDetails?.salesId,
      SaleseDetailsId: salesDetails?.salesDetailId,
      UserId: userId,
      NoteText: salesDetails?.noteText || "",
      Status: _status?.code,
      TutorId: salesDetails?.tutorId,
      StatusId: _status.value,
      DropoutReasonTypeId: salesDetails?.DropoutReasonTypeId,
      FollowUpDate: salesDetails?.followUpDate,
      TutorPayment: salesDetails?.tutorPayment,
    };

    setLoading(true);
    updateStudnentDropout(inputData).then((response) => {
      toast.success("Data updated successfully.", {
        position: "top-right",
        autoClose: true,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: false,
      });
      props.modalStateChange(false);
    }).finally(() => setLoading(false));
  };

  const CustomDatePicker = forwardRef(({ value, onClick, onChange }, ref) => (
    <div onClick={onClick} ref={ref}>
      <input className="form-control date-picker" name="followUpDate" type="text" value={value} onChange={onChange} />
      <div className="form-icon form-icon-right">
        <Icon name="calendar"></Icon>
      </div>
    </div>
  ));

  const { errors, register, handleSubmit, setValue, trigger, clearErrors } = useForm({});
  useEffect(() => {
    // Register custom fields
    register("followUpDate", { required: "Follow-Up Date is required" });
    register("DropoutReasonTypeId", { required: "Dropout reason is required" });
  }, [register]);
  React.useEffect(() => {
    setValue("DropoutReasonTypeId", salesDetails.DropoutReasonTypeId);
    setValue("followUpDate", salesDetails.followUpDate);
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
          Dropout
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
                <Col md="3">
                  <div className="form-group">
                    <label className="overline-title" htmlFor="regular-price">
                      Current Status:
                    </label>
                  </div>
                </Col>
                <Col md="3">
                  <div className="form-group">
                    <p></p>
                  </div>
                </Col>
              </Row>
              <Row className="col-md-12">
                <Col md="6">
                  <FormGroup>
                    <label className="form-label">Drop Ratio Reasons:</label>
                    <div className="w-100">
                      <div className="form-control-wrap">
                        <RSelect
                          name="DropoutReasonTypeId"
                          isCustomOption={false}
                          ref={register({ required: true })}
                          dataSource={dropoutRatioType || []}
                          value1={salesDetails?.DropoutReasonTypeId}
                          onChangeHandler={(e) => {
                            setSalesDetails((prevState) => ({
                              ...prevState,
                              DropoutReasonTypeId: e.value,
                            }));
                          }}
                        />
                        {errors.DropoutReasonTypeId && (
                          <span className="invalid" style={{ color: "#e85347", fontSize: "11px", fontStyle: "italic" }}>
                            {errors.DropoutReasonTypeId.message}
                          </span>
                        )}
                      </div>
                    </div>
                  </FormGroup>
                </Col>
                <Col md="6">
                  <FormGroup>
                    <label className="form-label">Dropout Date:</label>
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
                          }}
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
              <Row className="col-md-12">
                <Col md="12">
                  <FormGroup>
                    <label className="form-label" htmlFor="noteText">
                      Reason:
                    </label>
                    <div className="form-control-wrap">
                      <textarea
                        className="no-resize form-control"
                        id="noteText"
                        name="noteText"
                        value={salesDetails?.noteText}
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
                  <Button className="footer-btn-right ml-2" color="secondary" size="md">
                    Cancel
                  </Button>
                  <Button className="footer-btn-right " type="submit" color="primary" size="md" disabled={loading} onClick={() => {}}>
                    {loading ? (
                      <>
                        <Spinner size="sm" className="mr-1" /> Saving...
                      </>
                    ) : (
                      "Save"
                    )}
                  </Button>
                </Col>
              </Row>
            </Form>
          </div>
        </ModalBody>
      </Modal>
    </>
  );
};

export default StudentsDropoutPopup;
