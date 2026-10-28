import React, { useContext, useCallback, useEffect, useState, useMemo, useRef } from "react";
import { FormGroup, Modal, ModalBody, ModalFooter, ModalHeader, DropdownItem, Form, Row, Spinner } from "reactstrap";

import "react-phone-number-input/style.css";
import Select from "react-select";
import DatePicker from "react-datepicker";
import { ToastContainer } from "react-toastify";
import { toast } from "react-toastify";
import countryList from "react-select-country-list";
import { Icon, Col, Button, RSelect } from "../../../components/Component";
import Content from "../../../layout/content/Content";
import Head from "../../../layout/head/Head";
import { useForm } from "react-hook-form";
import { getLookups, getAllRoles } from "../../../apiservices/LookupsService";
import {
  NotificationType,
  FollowUpStatus,
  ClassScheduleType,
  UserRole,
  UserRolesConst,
  processTimeData,
  WeekDays,
  UUIDNill,
  formatTime1,
  findOverlappingIndices,
  convertToTimeSpan,
  findOverlapsInAllocatedSlots,
  ClassStatusTypes,
} from "../../../utils/Utils";
import { GetSalesDetails } from "../../../apiservices/NofiticationService";
import DragTimeRangePicker from "./DraggableTimePicker";
import {
  getOverlappingTimeSlot,
  getTutorAvailablity,
  getStudentAllocatedSchedule,
  getUserAvailability,
  scheduleEvent,
  scheduleScheduleChangeRequest,
} from "../../../apiservices/UserService";
import UserAvailableSlotsProgressBar from "./UserAvailableSlotsProgressBar";
import TutorAvailabilityModal from "./TutorAvailabilityModal";

// The enrollment's Preferred Demo Date ("YYYY-MM-DD...") as DD-MM-YYYY, read without a time-zone shift.
const formatPreferredDemoDate = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || "");
  return match ? `${match[3]}-${match[2]}-${match[1]}` : "Not provided";
};

const ScheduleDemo = (props) => {
  const [isModalOpen, setIsModalOpen] = useState(props.modalOpen);
  const formRef = useRef(null);
  const availabilityRequest = useRef(0);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [statusList, setStatusList] = useState([]);
  const [tutorAvailableSlots, setTutorAvailableSlots] = useState([]);
  const [tutorFilteredSlots, setTutorFilteredSlots] = useState([]);
  const [studentAvailableSlots, setStudentAvailableSlots] = useState();
  const [studentFilteredSlots, setStudentFilteredSlots] = useState();
  const [filtteredTimeSlot, setFiltteredTimeSlot] = useState();
  const [unFillterdStatusList, setUnFillterdStatusList] = useState([]);
  const [studentHasNoAvailability, setStudentHasNoAvailability] = useState(false);
  const [studentAvailabilityModalOpen, setStudentAvailabilityModalOpen] = useState(false);
  const [timeSlots, setTimeSlots] = useState();
  const userId = localStorage.getItem("userId");
  const _userRole = localStorage.getItem("userRole");
  const defaultGuid = UUIDNill();
  const eventStatusCode = props?.eventStatusCode;
  const isClassRescheduleFlow =
    eventStatusCode == FollowUpStatus.ClassReScheduled || eventStatusCode == ClassStatusTypes.ClassRescheduled;
  const isRescheduleFlow = isClassRescheduleFlow || eventStatusCode == FollowUpStatus.ReScheduleDemo;
  const [headerLabel, setHeaderLabel] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [tutorAvailabilityModalOpen, setTutorAvailabilityModalOpen] = useState(false);
  const [subjects, setSubjects] = useState();
  const [formData, setFormData] = useState({
    scheduleId: defaultGuid,
    saleDetailsId: defaultGuid,
    subjectId: defaultGuid,
    tutorId: defaultGuid,
    studentId: defaultGuid,
    scheduleStatus: defaultGuid,
    meetingLink: "",
    IsRecurrence: false,
    title: "No title",
    // A new demo booking starts with no Actual Demo Date: the coordinator must choose it.
    startDate: isRescheduleFlow ? new Date() : null,
    endDate: isRescheduleFlow ? new Date() : null,
    startTime: new Date(),
    endTime: new Date(),
    repeatType: "Daily",
    noteText: "",
    studentAvailableSlots: [],
    weeklyDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  });
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
  useEffect(() => {
    const load = async () => {
    const _dataItem = props.dataItem;
    let salesData = {};
    if (_dataItem) {
      await GetSalesDetails(props?.dataItem.salesId, props?.dataItem.saleDetailsId, defaultGuid)
        .then((response) => {
          if (response?.data) {
            let temp = response?.data;
            temp["salesId"] = props?.dataItem.id;
            temp["salesDetailId"] = props?.dataItem.saleDetailsId;
            setSalesDetails(temp);
            salesData = temp;
          }
          setShowSalesDetails(true);
        })
        .catch((error) => {});
      //   setSalesDetails(props.dataItem);
      // A new demo booking has no Actual Demo Date yet: common slots load once the coordinator
      // picks one (the Preferred Demo Date is only shown, never used as the booking date).
      // Reschedules keep their existing default date.
      if (isRescheduleFlow) {
        await overlappingTimeSlot(_dataItem.tutorUserId || salesData.tutorUserId, _dataItem.stdUserId || salesData.stdUserId);
      }
      await tutorAvailablity(_dataItem.tutorId);
      await getStudentAllocatedSchedule(_dataItem.stdUserId, _dataItem.studentId, _dataItem.saleDetailsId).then(
        (response) => {
          setStudentAvailableSlots(response);
          setStudentFilteredSlots(response);
          setFormData((prev) => ({
            ...prev,
            studentAvailableSlots: response,
          }));
        }
      );

      getUserAvailability(_dataItem.stdUserId).then((avail) => {
        setStudentHasNoAvailability(!Array.isArray(avail) || avail.length === 0);
      });

      let label = `Schedule ${salesData.subjectName} Demo session for <i> ${salesData.studentName}</i>`;
      let titleText = `Schedule ${salesData.subjectName} Demo session for ${salesData.studentName}`;
      if (
        eventStatusCode == FollowUpStatus.ClassReScheduled ||
        eventStatusCode == ClassStatusTypes.ClassRescheduled
      ) {
        label = `Re-Schedule ${salesData.subjectName} class for <i> ${salesData.studentName}</i>`;
        titleText = `Re-Schedule ${salesData.subjectName} class for ${salesData.studentName}`;
      } else if (eventStatusCode == FollowUpStatus.ReScheduleDemo) {
        label = `Re-Schedule ${salesData.subjectName} demo for <i> ${salesData.studentName}</i>`;
        titleText = `Re-Schedule ${salesData.subjectName} demo for ${salesData.studentName}`;
      }
      setHeaderLabel(label);
      setFormData((prev) => ({ ...prev, title: titleText }));
    }

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
    });
    };
    load().catch(() => setAvailabilityError("Unable to load scheduling details. Close and reopen to retry."));
    return () => { availabilityRequest.current += 1; };
  }, []);

  const tutorAvailablity = async (tutorId) => {
    await getTutorAvailablity(tutorId).then((response) => {
      setTutorAvailableSlots(response);
      setTutorFilteredSlots(response);
    });
  };

  const overlappingTimeSlot = async (tutorId, studentId, date = formData.startDate) => {
    const request = ++availabilityRequest.current;
    setAvailabilityLoading(true);
    setAvailabilityError("");
    setFiltteredTimeSlot([]);
    try {
      if (!tutorId || !studentId || !date) throw new Error("Student or tutor availability reference is missing.");
      const response = await getOverlappingTimeSlot(tutorId, studentId, date);
      if (request !== availabilityRequest.current) return;
      const result = processTimeData(response);
      setTimeSlots(result);
      setFiltteredTimeSlot(result.filter((s) => s.dayInNo === date.getDay()));
    } catch (error) {
      if (request === availabilityRequest.current) setAvailabilityError(error?.response?.data?.message || error.message || "Unable to load availability. Please retry.");
    } finally {
      if (request === availabilityRequest.current) setAvailabilityLoading(false);
    }
  };

  const onStatusUpdateHandler = () => {};

  const isTimeAvailable = (newStartTime, newEndTime, slots) => {
    const newStart = convertToTime1(newStartTime);
    const newEnd = convertToTime1(newEndTime);

    return !slots.some((slot) => {
      const existingStart = convertToTime1(slot.startTime);
      const existingEnd = convertToTime1(slot.endTime);

      return newStart < existingEnd && newEnd > existingStart; // Exact time comparison
    });
  };

  const convertToTime1 = (timeString) => {
    const [hours, minutes, seconds] = timeString.split(":").map(Number);
    return new Date(1970, 0, 1, hours, minutes, seconds); // Use a fixed date
  };

  const sliderChangeCallback1 = useCallback((value, _dataItem) => {
    setFiltteredTimeSlot((prevState) =>
      prevState.map((day) =>
        day.dayInNo === _dataItem.dayInNo
          ? {
              ...day,
              slots: day.slots.map((slot) =>
                slot.uniqueId === _dataItem.uniqueId
                  ? {
                      ...slot,
                      selectedTime: `${formatTime1(value[0])}-${formatTime1(value[1])}`,
                      startMinutes: value[0],
                      endMinutes: value[1],
                      startTime: formatTime1(value[0]),
                      endTime: formatTime1(value[1]),
                    }
                  : slot
              ),
            }
          : day
      )
    );
  }, []);

  const addNewTimeSlotHandler = (_day) => {
    const temp = [...filtteredTimeSlot];
    var currentItemIndex = temp.findIndex((s) => s.dayofWeek == _day);
    let max = -Infinity;

    temp[currentItemIndex].slots.forEach((value) => {
      if (value.endMinutes > max) {
        max = value.endMinutes;
      }
    });
    temp[currentItemIndex].slots.push({
      dayInNo: temp[currentItemIndex].dayInNo,
      uniqueId: temp[currentItemIndex].slots.length + 1,
      dayofWeek: temp[currentItemIndex].dayofWeek,
      startTime: max,
      endTime: max + 60,
      startMinutes: max,
      endMinutes: max + 60,
      minMinutes: temp[currentItemIndex].startMinutes,
      maxMinutes: temp[currentItemIndex].endMinutes,
    });

    setFiltteredTimeSlot(temp);
  };

  const removeSlotHandlerCallback = (dayOfWeek, index) => {
    const temp = [...filtteredTimeSlot];
    var currentItemIndex = temp.findIndex((s) => s.dayofWeek == dayOfWeek);
    temp[currentItemIndex].slots.splice(index, 1);
    setFiltteredTimeSlot(temp);
  };

  const onSaveSchedule = () => {
    if (isSaving || availabilityLoading || availabilityError) return;
    if (!formData?.startDate) {
      toast.error(isClassRescheduleFlow ? "Select the date before saving." : "Select the Actual Demo Date before saving.", {
        position: "top-right",
        autoClose: true,
        hideProgressBar: true,
      });
      return;
    }
    if (!filtteredTimeSlot || filtteredTimeSlot.length === 0) return;
    let errorMessage = "";
    for (let i = 0; i < filtteredTimeSlot.length; i++) {
      var record = filtteredTimeSlot[i];
      const output = findOverlappingIndices(record.slots);
      if (output.length > 0) {
        errorMessage = "Time slots overlapping.";
        break;
      }

      // Weekday-wide allocation bars include classes on other dates and the
      // occurrence being rescheduled. The API validates actual-date conflicts.
    }

    if (errorMessage != "") {
      toast.error(errorMessage, {
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

    const _timeSlots = filtteredTimeSlot.map((record) => {
      const slots = record.slots.map((item) => ({
        StartTime: convertToTimeSpan(item?.startTime),
        EndTime: convertToTimeSpan(item?.endTime),
        Day: item.dayofWeek,
        Color: "",
      }));

      return {
        Day: record.dayofWeek,
        SalesId: props?.dataItem.salesId,
        SalesDetailsId: props?.dataItem.saleDetailsId,
        StartDate: formData?.startDate,
        IsRecurrence: false,
        EndDate: formData?.startDate,
        DayInNo: record?.dayInNo,
        TimeSlots: slots,
      };
    });
    const isClassReschedule =
      eventStatusCode == FollowUpStatus.ClassReScheduled ||
      eventStatusCode == ClassStatusTypes.ClassRescheduled;
    const isDemoReschedule = eventStatusCode == FollowUpStatus.ReScheduleDemo;
    const isReschedule = isClassReschedule || isDemoReschedule;
    const statusCode = isClassReschedule ? FollowUpStatus.ClassSchedule : FollowUpStatus.DemoScheduled;
    const selectedStatus = unFillterdStatusList.find((s) => s.code == statusCode);
    if (!selectedStatus?.id) {
      toast.error("The scheduling status is unavailable. Close and reopen this window; if it persists, check the status setup.");
      return;
    }
    const statusId = selectedStatus.id;
    const schedueType = isClassReschedule ? ClassScheduleType.Class : ClassScheduleType.Demo;

    const inputData = {
      SalesId: props?.dataItem.salesId,
      SalesDetailsId: props?.dataItem.saleDetailsId,
      TutorId: props?.dataItem.tutorId,
      StudentId: props?.dataItem.studentId,
      ScheduleStatus: statusId,
      SubjectId: props?.dataItem.subjectId,
      StartDate: formData?.startDate,
      ScheduleType: schedueType,
      Title: formData?.title,
      MeetingLink: formData?.meetingLink,
      IsRecurrence: false,
      ScheduleMode: "OneTime",
      TotalClasses: 1,
      IsReschedule: isReschedule,
      EndDate: formData?.startDate,
      UserId: userId,
      DayInNo: formData?.startDate.getDay(),
      TimeSlotGroup: _timeSlots,
    };

    setIsSaving(true);
    scheduleEvent(inputData)
      .then((response) => {
        if (response?.succeeded === false) {
          throw new Error(response.message || "Unable to schedule the selected class.");
        }
        const successMessage = isClassReschedule
          ? "Class successfully rescheduled."
          : isDemoReschedule
          ? "Demo successfully rescheduled."
          : "Demo successfully scheduled.";
        toast.success(successMessage, {
          position: "top-right",
          autoClose: true,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: false,
        });
        setIsModalOpen(false);
        props.modalStateChange("success");
      })
      .catch((error) => {
        const message =
          error?.response?.data?.message ||
          error?.response?.data?.title ||
          error?.message ||
          "Unable to schedule the demo. Please check the selected time.";
        toast.error(message, {
          position: "top-right",
          autoClose: 6000,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: false,
        });
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  const ChangeRequest = () => {
    const inputData = {
      EventStatus: unFillterdStatusList.find((s) => s.code == FollowUpStatus.DemoRescheduleRequest).id,
      GuestType: props?.guestType,
      SalesId: props?.dataItem.salesId,
      SalesDetailsId: props?.dataItem.saleDetailsId,
      ScheduleDetailsId: props?.scheduleDetailsId,
      UserId: userId,
    };

    scheduleScheduleChangeRequest(inputData)
      .then((response) => {
        toast.success("Request sent. Admin will contact you.", {
          position: "top-right",
          autoClose: true,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: false,
        });
        setIsModalOpen(false);
        props.modalStateChange("");
      })
      .catch((errors) => {});
  };

  const { errors, register, handleSubmit, setValue, clearErrors } = useForm({});
  return (
    <>
      {props?.type == FollowUpStatus.NeedToSchedule ? (
        <>
          <Modal
            scrollable={true}
            key={"modal123"}
            isOpen={isModalOpen}
            toggle={() => {
              setIsModalOpen(false);
              props.modalStateChange("closeaction");
            }}
            className="modal-dialog-centered custom-modal"
            size="xl"
          >
            <ModalHeader
              close={
                <div>
                  <Button
                    color="primary"
                    type="button"
                    disabled={isSaving || !filtteredTimeSlot || filtteredTimeSlot?.length === 0}
                    style={(isSaving || !filtteredTimeSlot || filtteredTimeSlot?.length === 0) ? { pointerEvents: "none", opacity: 0.65 } : {}}
                    onClick={() => {
                      onSaveSchedule();
                    }}
                  >
                    {isSaving ? (
                      <>
                        <Spinner size="sm" className="mr-1" /> Saving...
                      </>
                    ) : (
                      "Save"
                    )}
                  </Button>
                  <button
                    className="close"
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      props.modalStateChange("closeaction");
                    }}
                  >
                    <Icon name="cross" />
                  </button>
                </div>
              }
            >
              <span dangerouslySetInnerHTML={{ __html: headerLabel }}></span>{" "}
            </ModalHeader>
            <ModalBody>
              <Form className="row gy-1" ref={formRef} noValidate onSubmit={handleSubmit(onStatusUpdateHandler)}>
                <Row className="col-md-12">
                  <Col md="2">
                    <FormGroup>
                      <label className="overline-title" htmlFor="firstName">
                        Coordinator:
                      </label>
                    </FormGroup>
                  </Col>
                  <Col md="4">
                    <FormGroup>
                      <p id="preview-event-start">{salesDetails.coordinatorName}</p>
                    </FormGroup>
                  </Col>
                  <Col sm="2">
                    <FormGroup>
                      <label className="overline-title">Tutor:</label>
                    </FormGroup>
                  </Col>
                  <Col sm="3">
                    <FormGroup>
                      <p id="preview-event-start">{salesDetails.tutorName}</p>
                    </FormGroup>
                  </Col>
                </Row>

                <Row className="col-md-12">
                  <Col sm="2">
                    <FormGroup>
                      <label className="overline-title" htmlFor="dob">
                        Board:
                      </label>
                    </FormGroup>
                  </Col>
                  <Col sm="4">
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
                  <Col md="6">
                    <FormGroup>
                      <label className="form-label" htmlFor="title">
                        Title
                      </label>
                      <input
                        className="form-control"
                        type="text"
                        name="title"
                        defaultValue={formData.title}
                        value={formData.title}
                        onChange={(e) => {
                          setFormData({ ...formData, title: e.target.value });
                        }}
                        placeholder="Enter title"
                        ref={register({ required: "This field is required" })}
                      />
                      {errors.title && <span className="invalid">{errors.title.message}</span>}
                    </FormGroup>
                  </Col>
                  <Col md="6">
                    <FormGroup>
                      <label className="form-label" htmlFor="meetingLink">
                        Link
                      </label>
                      <input
                        className="form-control"
                        type="text"
                        name="title"
                        defaultValue={formData.meetingLink}
                        value={formData.meetingLink}
                        onChange={(e) => {
                          setFormData({ ...formData, meetingLink: e.target.value });
                        }}
                        placeholder="Enter link"
                        ref={register({ required: "This field is required" })}
                      />
                      {errors.meetingLink && <span className="invalid">{errors.meetingLink.message}</span>}
                    </FormGroup>
                  </Col>
                </Row>
                <Row className="col-md-12">
                  <Col md="6">
                    <FormGroup>
                      <label className="form-label">{isClassRescheduleFlow ? "Date" : "Actual Demo Date"}</label>
                      <div className="w-100">
                        <div className="form-control-wrap">
                          <DatePicker
                            placeholderText={isClassRescheduleFlow ? "Select startdate" : "Select actual demo date"}
                            selected={formData?.startDate}
                            startDate={new Date()}
                            minDate={new Date()}
                            onChange={(date) => {
                              if (!date) return;
                              overlappingTimeSlot(props.dataItem?.tutorUserId || salesDetails.tutorUserId, props.dataItem?.stdUserId || salesDetails.stdUserId, date);
                              // One-time demo / class: the end date is the same day (the API requires EndDate >= StartDate,
                              // and a demo on exactly one date).
                              setFormData((prev) => ({
                                ...prev,
                                startDate: date,
                                endDate: date,
                              }));
                            }}
                            className="form-control date-picker"
                          />
                        </div>
                      </div>
                    </FormGroup>
                    {!isClassRescheduleFlow && (
                      <FormGroup>
                        <label className="form-label">Preferred Demo Date</label>
                        <input
                          className="form-control"
                          type="text"
                          value={formatPreferredDemoDate(salesDetails.demoDate)}
                          readOnly
                          disabled
                          title="Change the preference in Edit Enrolled Course"
                        />
                      </FormGroup>
                    )}
                  </Col>
                  <Col md="6">
                    <FormGroup>
                      <label className="form-label">Note</label>
                      <div className="w-100">
                        <input
                          className="form-control"
                          type="text"
                          name="noteText"
                          defaultValue={formData.noteText}
                          value={formData.noteText}
                          onChange={(e) => {
                            setFormData((prevState) => ({
                              ...prevState,
                              noteText: e.target.value,
                            }));
                          }}
                          placeholder="Enter Note"
                          ref={register({ required: "This field is required" })}
                        />

                        {errors.noteText && <p className="invalid">This field is required</p>}
                      </div>
                    </FormGroup>
                  </Col>
                </Row>

                <Row className="col-md-12">
                  <Col md="12">
                    {filtteredTimeSlot &&
                      filtteredTimeSlot.map((elem, index) => (
                        <div key={"divSlots" + index} className="row border border-primary rounded mb-1">
                          <div className="col-md-1" style={{ lineHeight: "50px" }}>
                            {elem?.dayofWeek}
                          </div>
                          <div className="col-md-11">
                            <DragTimeRangePicker
                              component_key={"slots" + index}
                              slots={elem.slots}
                              // minTime={elem.startMinutes}
                              // maxTime={elem.endMinutes}
                              dayOfWeek={elem.day}
                              sliderChangeCallback={sliderChangeCallback1}
                              addSlotHandlerCallback={(_day) => {
                                addNewTimeSlotHandler(_day);
                              }}
                              removeSlotHandlerCallback={(_dayOfWeek, _index) => {
                                removeSlotHandlerCallback(_dayOfWeek, _index);
                              }}
                            ></DragTimeRangePicker>
                          </div>
                        </div>
                      ))}
                  </Col>

                  <Col md="12">
                    {availabilityLoading && <div role="status">Loading availability…</div>}
                    {availabilityError && <div role="alert" className="text-danger">{availabilityError}</div>}
                    {!availabilityLoading && !availabilityError && !formData?.startDate && (
                      <div className="row border border-primary rounded mb-1">
                        <div className="col-md-12 text-center pt-2 pb-2">
                          <span className="tb-status text-primary">Select the Actual Demo Date to see the available time slots.</span>
                        </div>
                      </div>
                    )}
                    {!availabilityLoading && !availabilityError && formData?.startDate && (!filtteredTimeSlot || filtteredTimeSlot?.length == 0) && (
                      <div key={"divSlots"} className="row border border-primary rounded mb-1">
                        <div className="col-md-12 text-center pt-2 pb-2 success">
                          <span className="tb-status text-warning">
                            {studentHasNoAvailability
                              ? "No common availability found. Please add availability for the student and/or tutor using the options below."
                              : "No common availability for the selected date. Check the date, available timings and availability date ranges on both sides."}
                            {!studentHasNoAvailability &&
                              _userRole != UserRolesConst.COORDINATOR_ADMIN &&
                              _userRole != UserRolesConst.COORDINATOR &&
                              _userRole != UserRolesConst.OPERATIONS &&
                              _userRole != UserRolesConst.OPERATIONS_ADMIN && (
                                <>
                                  {" "}
                                  <a href="#" onClick={() => { ChangeRequest(); }}>
                                    Click here to request a schedule adjustment.
                                  </a>
                                </>
                              )}
                          </span>
                        </div>
                      </div>
                    )}
                  </Col>
                </Row>

                <Row className="col-md-12">
                  <Col md="6">
                    <Row className="col-md-12">
                      <Col md="12">
                        <FormGroup>
                          <label className="overline-title">Tutor Available Slots:</label>
                        </FormGroup>
                      </Col>
                      <Col md="12">
                        {tutorAvailableSlots && tutorAvailableSlots.length > 0 ? (
                          <UserAvailableSlotsProgressBar
                            type="tutor"
                            dataSource={tutorFilteredSlots}
                          ></UserAvailableSlotsProgressBar>
                        ) : (
                          <p className="text-muted" style={{ fontSize: "13px" }}>
                            No tutor availability set.{" "}
                            {_userRole === UserRolesConst.COORDINATOR && (
                              <a href="#" onClick={(e) => { e.preventDefault(); setTutorAvailabilityModalOpen(true); }}>
                                Click here to add tutor availability.
                              </a>
                            )}
                          </p>
                        )}
                      </Col>
                    </Row>
                  </Col>
                  <Col md="6">
                    <Row className="col-md-12">
                      <Col md="12">
                        <FormGroup>
                          <label className="overline-title">Student Available Slots:</label>
                        </FormGroup>
                      </Col>
                      <Col md="12">
                        {studentFilteredSlots && studentFilteredSlots.length > 0 ? (
                          <UserAvailableSlotsProgressBar
                            type="student"
                            dataSource={studentFilteredSlots}
                          ></UserAvailableSlotsProgressBar>
                        ) : (
                          <p className="text-muted" style={{ fontSize: "13px" }}>
                            No student availability set.{" "}
                            {(_userRole === UserRolesConst.COORDINATOR || _userRole === UserRolesConst.COORDINATOR_ADMIN) && (
                              <a href="#" onClick={(e) => { e.preventDefault(); setStudentAvailabilityModalOpen(true); }}>
                                Click here to add student availability.
                              </a>
                            )}
                          </p>
                        )}
                      </Col>
                    </Row>
                  </Col>
                </Row>
              </Form>
              {studentAvailabilityModalOpen && (
                <TutorAvailabilityModal
                  isOpen={studentAvailabilityModalOpen}
                  userId={props.dataItem?.stdUserId}
                  loggedInUserId={userId}
                  onClose={() => setStudentAvailabilityModalOpen(false)}
                  onSaved={() => {
                    setStudentAvailabilityModalOpen(false);
                    setStudentHasNoAvailability(false);
                    getStudentAllocatedSchedule(props.dataItem?.stdUserId, props.dataItem?.studentId, props.dataItem?.saleDetailsId).then((response) => {
                      setStudentAvailableSlots(response);
                      setStudentFilteredSlots(response);
                    });
                    if (formData?.startDate) overlappingTimeSlot(props.dataItem?.tutorUserId, props.dataItem?.stdUserId);
                  }}
                />
              )}
              {tutorAvailabilityModalOpen && (
                <TutorAvailabilityModal
                  isOpen={tutorAvailabilityModalOpen}
                  userId={props.dataItem?.tutorUserId}
                  loggedInUserId={userId}
                  onClose={() => setTutorAvailabilityModalOpen(false)}
                  onSaved={() => {
                    setTutorAvailabilityModalOpen(false);
                    tutorAvailablity(props.dataItem?.tutorId);
                    if (formData?.startDate) overlappingTimeSlot(props.dataItem?.tutorUserId, props.dataItem?.stdUserId);
                  }}
                />
              )}
            </ModalBody>
          </Modal>
        </>
      ) : (
        <>
          <Modal
            scrollable={true}
            isOpen={isModalOpen}
            toggle={() => {
              setIsModalOpen(false);
              props.modalStateChange(false);
            }}
            className="modal-dialog-centered totur-modal"
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
              Change Status
            </ModalHeader>
            <ModalBody className="totur-modal-body">
              <Content>
                <ToastContainer />
              </Content>
            </ModalBody>
            <ModalFooter className="bg-light">
              <Col size="12">
                <ul className="align-center flex-wrap flex-sm-nowrap gx-4 gy-2">
                  <li>
                    <Button
                      color="primary"
                      size="md"
                      onClick={() => {
                        formRef.current.props.onSubmit();
                      }}
                    >
                      Update
                    </Button>
                  </li>
                  <li>
                    <a
                      href="#cancel"
                      onClick={(ev) => {
                        ev.preventDefault();
                        setIsModalOpen(false);
                        props.modalStateChange(false);
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
        </>
      )}
    </>
  );
};

export default ScheduleDemo;
