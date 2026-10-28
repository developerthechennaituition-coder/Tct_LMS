import React, { useContext, useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import DatePicker from "react-datepicker";
import { ToastContainer } from "react-toastify";
import { toast } from "react-toastify";
import moment from "moment";
import Swal from "sweetalert2";
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
import { NotificationType, FollowUpStatus, ClassScheduleType, UserRole } from "../../../utils/Utils";
import { addOrUpdateSchedule, getScheduleBySubjectId, removeScheduler } from "../../../apiservices/ScheduleService";
const ScheduleClassControl = ({
  viewDataItem,
  dataItem,
  onScheduleCloseCallback,
  openViewModal,
  openModal,
  subjectName,
  onScheduleApiCallback,
}) => {
  console.log("viewFormData", viewDataItem);
  const formRef = useRef(null);
  const [modal, setModal] = useState(openModal);
  const [loading, setLoading] = useState(false);
  const [viewModal, setViewModal] = useState(openViewModal);
  const userId = localStorage.getItem("userId");
  const location = useLocation();
  const [studentName, setStudentName] = useState("");
  const searchParams = new URLSearchParams(location.search);
  const [statusCode, setStatusCode] = useState(dataItem.shortCode);
  const defaultGuid = "00000000-0000-0000-0000-000000000000";
  const [repeatOptions, setRepeatOptions] = useState([
    { value: "Onetime", label: "Onetime" },
    { value: "Daily", label: "Daily" },
    { value: "Weekly", label: "Weekly" },
  ]);

  const [formData, setFormData] = useState({
    scheduleId: defaultGuid,
    saleDetailsId: defaultGuid,
    subjectId: defaultGuid,
    tutorId: defaultGuid,
    studentId: defaultGuid,
    scheduleStatus: defaultGuid,
    meetingLink: "",
    title: "No title",
    startDate: new Date(),
    endDate: moment().add(1, "months").toDate(),
    noOfMonths: 1,
    startTime: new Date(),
    endTime: new Date(),
    repeatType: "Daily",
    shortCode: dataItem.shortCode,
    description: "",
    weeklyDays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  });

  const [dates, setDates] = useState({
    startDate: new Date(),
    startTime: new Date(),
    endTime: new Date(),
    endDate: new Date(),
  });
  const [theme, settheme] = useState("");

  const weekDays = [
    { value: "Sunday", label: "Sun" },
    { value: "Monday", label: "Mon" },
    { value: "Tuesday", label: "Tue" },
    { value: "Wednesday", label: "Wed" },
    { value: "Thursday", label: "Thu" },
    { value: "Friday", label: "Fri" },
    { value: "Saturday", label: "Sat" },
  ];

  const toggle = () => {
    setModal(!modal);
    clearForm();
    onScheduleCloseCallback();
  };

  const viewToggle = () => {
    setViewModal(!viewModal);
    onScheduleCloseCallback();
  };

  const getScheduleType = (status) => {
    if (status == FollowUpStatus.DemoPendingTutorAssignedApproved) {
      return ClassScheduleType.Demo;
    } else {
      return ClassScheduleType.Class;
    }
  };

  const handleFormSubmit = (input) => {
    let inputData = formData;
    inputData["ScheduleType"] = getScheduleType(statusCode);
    inputData["MeetingLine"] = getScheduleType(statusCode);
    inputData["Status"] = "Class";
    inputData["Comment"] = "Class";
    inputData["userId"] = userId;
    inputData["RepeatDays"] = inputData.weeklyDays;

    inputData["tutorId"] = dataItem?.tutorId;
    inputData["StudentId"] = dataItem?.studentId;
    inputData["SalesDetailsId"] = dataItem?.salesDetailsId;
    inputData["subjectId"] = dataItem?.subjectId;
    inputData["repeatOn"] =
      statusCode == FollowUpStatus.DemoPendingTutorAssignedApproved ? "" : inputData.weeklyDays.join();
    inputData["WeeklyDays"] = statusCode == FollowUpStatus.DemoPendingTutorAssignedApproved ? [] : inputData.weeklyDays;
    inputData["statusCode"] =
      statusCode == FollowUpStatus.DemoPendingTutorAssignedApproved
        ? FollowUpStatus.DemoScheduled
        : FollowUpStatus.Schedule;
    //20019
    const timeZone = "Asia/Kolkata"; // Indian Standard Time
    var localDate = new Date(inputData.startTime);
    inputData.startTime = localDate;
    inputData = JSON.stringify(inputData);

    setLoading(true);
    addOrUpdateSchedule(inputData).then((response) => {
      if (response.succeeded == false) {
        toast.error(response.message, {
          position: "top-right",
          autoClose: true,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: false,
        });
        return;
      }
      setModal(false);
      onScheduleApiCallback();
      toast.success("Class scheduled successfully.", {
        position: "top-right",
        autoClose: true,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: false,
      });
    }).finally(() => setLoading(false));
    return;
  };

  const toggleWeekDay = (day) => {
    setFormData((prev) => ({
      ...prev,
      weeklyDays: prev.weeklyDays.includes(day) ? prev.weeklyDays.filter((d) => d !== day) : [...prev.weeklyDays, day],
    }));
  };

  const clearForm = () => {
    setFormData({
      scheduleId: defaultGuid,
      saleDetailsId: defaultGuid,
      subjectId: defaultGuid,
      tutorId: defaultGuid,
      studentId: defaultGuid,
      scheduleStatus: defaultGuid,
      title: "",
      startDate: new Date(),
      endDate: moment().add(1, "months").toDate(),
      noOfMonths: 1,
      startTime: null,
      endTime: null,
      repeatType: "Daily",
      description: "",
      weeklyDays: [],
    });
  };

  const CloseButton = () => {
    return (
      <span className="btn-trigger toast-close-button" role="button">
        <Icon name="cross"></Icon>
      </span>
    );
  };

  const { errors, register, handleSubmit, setValue, clearErrors } = useForm({});
  return (
    <>
      <React.Fragment>
        <Modal isOpen={viewModal} scrollable={true} toggle={viewToggle} className="modal-md">
          <ModalHeader toggle={viewToggle}>
            {viewDataItem?.shortCode == FollowUpStatus.DemoScheduled ||
            viewDataItem?.shortCode == FollowUpStatus.DemoCompleted
              ? "Demo"
              : "Class"}
            : {dataItem?.subjectName}
          </ModalHeader>
          <ModalBody>
            <Row className="gy-3 py-1">
              <Col sm="6">
                <h6 className="overline-title">Title</h6>
                <p id="preview-event-start">{viewDataItem?.title}</p>
              </Col>
              <Col sm="6">
                <h6 className="overline-title">Tutor</h6>
                <p id="preview-event-start">{viewDataItem?.tutorName}</p>
              </Col>
              <Col sm="6">
                <h6 className="overline-title">Start Date </h6>
                <p id="preview-event-start">
                  {moment(viewDataItem?.startDate).format("DD-MM-yyyy")}:{viewDataItem?.startTimeView}
                </p>
              </Col>
              <Col sm="6" id="preview-event-end-check">
                <h6 className="overline-title">End Date</h6>
                <p id="preview-event-start">
                  {moment(viewDataItem?.endDate).format("DD-MM-yyyy")}:{viewDataItem?.endTimeView}
                </p>
              </Col>
              {viewDataItem?.shortCode != FollowUpStatus.DemoCompleted &&
                viewDataItem?.shortCode != FollowUpStatus.DemoCancelled &&
                viewDataItem?.shortCode != FollowUpStatus.DemoScheduled && (
                  <>
                    <Col sm="10" id="preview-event-description-check">
                      <h6 className="overline-title">Repeat</h6>
                      <p id="preview-event-description">{viewDataItem?.repeatType}</p>
                    </Col>

                    <Col sm="10" id="preview-event-description-check">
                      <h6 className="overline-title">Repeat On</h6>
                      <p id="preview-event-description">{viewDataItem?.weeklyDays?.join()}</p>
                    </Col>
                  </>
                )}
              <Col sm="10" id="preview-event-description-check">
                <h6 className="overline-title">Link</h6>
                <p id="preview-event-description">
                  <a href={viewDataItem?.meetingLink} target="_blank" rel="noopener noreferrer">
                    {viewDataItem?.meetingLink}
                  </a>
                </p>
              </Col>
              <Col sm="10" id="preview-event-description-check">
                <h6 className="overline-title">Comment</h6>
                <p id="preview-event-description">{viewDataItem?.description}</p>
              </Col>
            </Row>
          </ModalBody>
        </Modal>

        <Modal isOpen={modal} scrollable={true} toggle={toggle} className="modal-md" size="lg">
          <ModalHeader toggle={toggle}>
            {formData.shortCode == FollowUpStatus.DemoPendingTutorAssignedApproved ? "Schedule demo" : "Schedule class"}{" "}
            - {dataItem?.subjectName} sss
            {formData.shortCode}
          </ModalHeader>
          <ModalBody>
            <form className="form-validate is-alter" onSubmit={handleSubmit(handleFormSubmit)}>
              <Row className="gx-4 gy-3">
                <Col size="12">
                  <FormGroup>
                    <label className="form-label" htmlFor="event-title">
                      Class Title
                    </label>
                    <div className="form-control-wrap">
                      <input
                        type="text"
                        id="event-title"
                        name="title"
                        placeholder="Title"
                        value={formData.title}
                        onChange={(e) => {
                          setFormData({ ...formData, title: e.target.value });
                        }}
                        className="form-control"
                        ref={register({ required: true })}
                      />
                      {errors.title && <p className="invalid">This field is required</p>}
                    </div>
                  </FormGroup>
                </Col>
                <Col sm="6">
                  <FormGroup>
                    <label className="form-label">Start Date &amp; Time</label>
                    <Row className="gx-2">
                      <div className="w-55">
                        <div className="form-control-wrap">
                          <DatePicker
                            placeholderText="Select startdate"
                            selected={formData.startDate}
                            startDate={new Date()}
                            minDate={new Date()}
                            disabled={statusCode != "20013"}
                            onChange={(date) => {
                              if (statusCode == "20013") {
                                setFormData({ ...formData, startDate: date, endDate: date });
                              } else {
                                setFormData({ ...formData, startDate: date });
                              }
                            }}
                            className="form-control date-picker"
                          />
                        </div>
                      </div>
                      <div className="w-45">
                        <div className="form-control-wrap has-timepicker">
                          <DatePicker
                            placeholderText="Select time"
                            selected={formData.startTime}
                            onChange={(date) => {
                              setFormData({ ...formData, startTime: date });
                            }}
                            showTimeSelect
                            showTimeSelectOnly
                            timeZone="Asia/Kolkata"
                            timeIntervals={15}
                            timeCaption="Time"
                            dateFormat="h:mm aa"
                            className="form-control date-picker"
                          />
                        </div>
                      </div>
                    </Row>
                  </FormGroup>
                </Col>
                <Col sm="6">
                  <FormGroup>
                    <label className="form-label">End Date &amp; Time</label>
                    {statusCode != "20013" && (
                      <div className="mb-2">
                        <label className="form-label">No. of Months</label>
                        <select
                          className="form-control"
                          value={formData.noOfMonths}
                          onChange={(e) => {
                            const m = Number(e.target.value);
                            const newEnd = moment(formData.startDate).add(m, "months").toDate();
                            setFormData({ ...formData, noOfMonths: m, endDate: newEnd });
                          }}
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((m) => (
                            <option key={m} value={m}>{m} month{m > 1 ? "s" : ""}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <Row className="gx-2">
                      <div className="w-55">
                        <div className="form-control-wrap">
                          <DatePicker
                            placeholderText="Select enddate"
                            startDate={new Date()}
                            selected={formData.endDate}
                            disabled={true}
                            onChange={(date) => setFormData({ ...formData, endDate: date })}
                            className="form-control date-picker"
                          />
                        </div>
                      </div>
                      <div className="w-45">
                        <div className="form-control-wrap has-timepicker">
                          <DatePicker
                            placeholderText="Select time"
                            selected={formData.endTime}
                            onChange={(date) => setFormData({ ...formData, endTime: date })}
                            showTimeSelect
                            showTimeSelectOnly
                            timeIntervals={15}
                            timeCaption="Time"
                            dateFormat="h:mm aa"
                            className="form-control date-picker"
                          />
                        </div>
                      </div>
                    </Row>
                  </FormGroup>
                </Col>

                {formData.shortCode == FollowUpStatus.DemoCompleted && (
                  <>
                    <Col size="12">
                      <FormGroup>
                        <label className="form-label" htmlFor="event-description">
                          Repeat
                        </label>
                        <Row className="gx-2">
                          {repeatOptions.map((option) => (
                            <div className="form-control-wrap" key={`weekdays_${option.value}`}>
                              <Button
                                key={option.value}
                                variant={formData.repeatType === option.value ? "default" : "outline"}
                                className={`flex-1 mt-10 ${
                                  formData.repeatType === option.value ? "btn-primary" : "btn-repeat"
                                }`}
                                onClick={() => {
                                  if (option.value == "Daily") {
                                    setFormData({
                                      ...formData,
                                      repeatType: option.value,
                                      weeklyDays: [
                                        "Sunday",
                                        "Monday",
                                        "Tuesday",
                                        "Wednesday",
                                        "Thursday",
                                        "Friday",
                                        "Saturday",
                                      ],
                                    });
                                  } else {
                                    setFormData({ ...formData, repeatType: option.value, weeklyDays: [] });
                                  }
                                }}
                              >
                                {option.label}
                              </Button>
                            </div>
                          ))}
                        </Row>
                      </FormGroup>
                    </Col>
                    {formData.repeatType === "Weekly" && (
                      <Col size="12">
                        <FormGroup>
                          <label className="form-label" htmlFor="event-description">
                            Repeat on:
                          </label>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              {weekDays.map((day) => (
                                <div className="form-control-wrap">
                                  <Button
                                    key={day.value}
                                    className={formData.weeklyDays.includes(day.value) ? "btn-primary " : "btn-repeat"}
                                    onClick={() => toggleWeekDay(day.value)}
                                  >
                                    {day.label}
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </FormGroup>
                      </Col>
                    )}
                  </>
                )}
                <Col size="12">
                  <FormGroup>
                    <label className="form-label" htmlFor="event-title">
                      Link
                    </label>
                    <div className="form-control-wrap">
                      <input
                        type="text"
                        placeholder="Please enter link"
                        id="meetingLink"
                        name="meetingLink"
                        maxLength={250}
                        value={formData.meetingLink}
                        onChange={(e) => {
                          setFormData({ ...formData, meetingLink: e.target.value });
                        }}
                        className="form-control"
                        ref={register({ required: true })}
                      />
                      {errors.meetingLink && <p className="invalid">This field is required</p>}
                    </div>
                  </FormGroup>
                </Col>
                <Col size="12">
                  <FormGroup>
                    <label className="form-label" htmlFor="event-description">
                      Class Description
                    </label>
                    <div className="form-control-wrap">
                      <textarea
                        className="form-control"
                        id="event-description"
                        placeholder="Please enter comments"
                        name="description"
                        rows={1}
                        value={formData.description}
                        onChange={(e) => {
                          setFormData({ ...formData, description: e.target.value });
                        }}
                        ref={register({ required: true })}
                      ></textarea>

                      {errors.description && <p className="invalid">This field is required</p>}
                    </div>
                  </FormGroup>
                </Col>

                <Col size="6"></Col>
                <Col size="6">
                  <ul className="d-flex justify-content-between gx-4 mt-1">
                    <li>
                      <Button type="submit" color="primary" disabled={loading}>
                        {loading ? (
                          <>
                            <Spinner size="sm" className="mr-1" /> Saving...
                          </>
                        ) : formData.shortCode == FollowUpStatus.DemoPendingTutorAssignedApproved ? (
                          "Add demo"
                        ) : (
                          "Add class"
                        )}
                      </Button>
                    </li>
                    <li>
                      <Button color="danger" className="btn-dim" onClick={toggle}>
                        Cancel
                      </Button>
                    </li>
                  </ul>
                </Col>
              </Row>
            </form>
          </ModalBody>
        </Modal>
        <ToastContainer />
      </React.Fragment>
    </>
  );
};
export default ScheduleClassControl;
