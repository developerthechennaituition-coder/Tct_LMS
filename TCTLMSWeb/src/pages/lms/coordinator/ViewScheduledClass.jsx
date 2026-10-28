import React, { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import bootstrapPlugin from "@fullcalendar/bootstrap";
import DatePicker from "react-datepicker";
import { Popover, PopoverHeader, PopoverBody, ModalHeader, Modal, ModalBody, FormGroup, Button, Spinner } from "reactstrap";
import { useForm } from "react-hook-form";
import { useLocation } from "react-router-dom";
import { getStudent, updateStudent, getSubjectList } from "../../../apiservices/StudentEnrollmentService";
import { Student } from "../../../models/studentModels.tsx";
import { getLookups } from "../../../apiservices/LookupsService";
import {
  updateScheduleStatus,
  getStudentclasses,
  deleteclass,
  updatescheduledetails,
} from "../../../apiservices/ScheduleService";
import Content from "../../../layout/content/Content";
import Head from "../../../layout/head/Head";
import {
  BlockDes,
  Block,
  BlockBetween,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Col,
  Icon,
  PreviewAltCard,
  PreviewCard,
  ProjectCard,
  Row,
  ReactDataTable,
  RSelect,
} from "../../../components/Component";
import moment from "moment";
import { ToastContainer } from "react-toastify";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import ClassStatusUpdate from "../common/ClassStatusUpdate";
import { FollowUpStatus } from "../../../utils/Utils";
import Swal from "sweetalert2";
import TCTScheduleCalender from "../schedule/TCTScheduleCalender";

const EventTooltip = (props) => {
  const event = props.eventData;
  return (
    <>
      <Row className="gy-3 py-1 p-2">
        <Col sm="12">
          <div className="d-flex flex-row">
            <div class="user-avatar bg-purple-dim">
              <span>
                <Icon name="book-read"></Icon>
              </span>
            </div>
            <div className="d-flex align-items-center p-1">
              <p id="preview-event-start">
                {event?.subjectName.length > 10 ? event?.subjectName.substring(0, 10) + "..." : event?.subjectName}
              </p>
            </div>
            <div className="tooltip-card-right">
              <h6 className="overline-title">{event && moment(event?.start).format("DD-MM-YYYY")}</h6>
              <p id="preview-event-start">
                <Icon name="clock" />
                {event && moment(event?.start).format("hh:mm")}
                {" - "} {event && moment(event?.end).format("hh:mm")}
              </p>
            </div>
          </div>
        </Col>
        <Col sm="12">
          <h6 className="overline-title">Tutor Name</h6>
          <p id="preview-event-start">{event?.tutorName}</p>
        </Col>
        {/* <Col sm="6">
                    <h6 className="overline-title">Start Time</h6>
                    <p id="preview-event-start"><Icon name="clock" />{event && moment(event?.start).format('hh:mm')}</p>
                </Col>
                <Col sm="6" id="preview-event-end-check">
                    <h6 className="overline-title">End Time</h6>
                    <p id="preview-event-end"><Icon name="clock" />{event && moment(event?.end).format('hh:mm')}</p>
                </Col> */}
        <Col sm="10" id="preview-event-description-check">
          <h6 className="overline-title">Description</h6>
          <p id="preview-event-description">{event && event.description}</p>
        </Col>
      </Row>
    </>
  );
};

const EventView = ({ event, events }) => {
  const [mouseEnter, setMouseEnter] = useState(false);
  const [loading, setLoading] = useState(false);
  const { title, extendedProps, publicId } = event.event._def;
  const _eventData = events?.find((item) => item.scheduleDetailsId === extendedProps.scheduleDetailsId);
  return (
    <React.Fragment>
      <div id={publicId} onMouseEnter={() => setMouseEnter(true)} onMouseLeave={() => setMouseEnter(false)}>
        <b>{_eventData?.subjectName} :</b>
        {_eventData?.tutorName.length > 5 ? _eventData?.tutorName.substring(0, 5) : _eventData?.tutorName}
      </div>
      <Popover isOpen={mouseEnter} target={publicId}>
        <EventTooltip
          subjectName={_eventData?.subjectName}
          eventData={_eventData}
          title={_eventData?.title}
        ></EventTooltip>
        {/* <PopoverHeader>{title}</PopoverHeader>
                <PopoverBody>
                    <table>
                        <tr>
                            <td colSpan={2}>{extendedProps.description}</td>
                        </tr>
                        <tr>
                            <td>{_eventData?.tutorName}</td>
                            <td>{_eventData?.subjectName}</td>
                        </tr>
                        <tr>
                            <td>Start:{moment(_eventData?.start).format('hh:mm')}</td>
                            <td>End{moment(_eventData?.end).format('hh:mm')}</td>
                        </tr>
                    </table>
                    <br></br>
                    <b>  {_eventData?.scheduleStatusName}</b>
                </PopoverBody> */}
      </Popover>
    </React.Fragment>
  );
};

const ViewScheduledClass = ({ events, onDelete, onEdit, scheduleType }) => {
  const defaultGuid = "00000000-0000-0000-0000-000000000000";
  const location = useLocation();
  const [modal, setModal] = useState(false);
  const [edit, updateEditModal] = useState(false);
  const searchParams = new URLSearchParams(location.search);
  const [id, setId] = useState(searchParams.get("id"));
  const [studentId, setStudentId] = useState(searchParams.get("studentId"));
  const [modalState, updateModal] = useState(false);
  const [tutorModalState, setTutorModalState] = useState(false);
  const [statusList, setStatusList] = useState([]);
  const [statusTypeId, setStatusTypeId] = useState("");
  const [studentClasses, setStudentClasses] = useState();
  const [event, updateEvent] = useState({});
  const [theme, settheme] = useState();
  const [scheduleId, setScheduleId] = useState("");
  const [tutorId, setTutorId] = useState("");
  const userId = localStorage.getItem("userId");
  const [hdnStartTime, setHdnStartTime] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentData, setStudentData] = useState(null);
const [loading, setLoading] = useState(false);
  const [hdnEndTime, setHdnEndTime] = useState("");
  const [addClass, setAddClass] = useState(false);
  const [scheduleCourses, setScheduleCourses] = useState([]);
  const [scheduleDataItem, setScheduleDataItem] = useState(null);
  const [loadingScheduleCourses, setLoadingScheduleCourses] = useState(false);
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);
  const [formData, setFormData] = useState({
    scheduleId: defaultGuid,
    saleDetailsId: defaultGuid,
    subjectId: defaultGuid,
    tutorId: defaultGuid,
    studentId: defaultGuid,
    scheduleStatus: defaultGuid,
    title: "No title",
    startDate: new Date(),
    endDate: new Date(),
    startTime: new Date(),
    endTime: new Date(),
    description: "",
  });
  useEffect(() => {
    getStudent(studentId).then(async (response) => {
      let result = response.data;
      setStudentData(result);
    });
  }, []);

  const getStudentClassesById = () => {
    getStudentclasses(id).then((response) => {
      var respData = response.data;
      let _events = [];
      for (var i = 0; i < respData.length; i++) {
        const item = respData[i];
        let className = "fc-event-info";
        let canDisable = false;
        if (item.scheduleStatusCode == "20041") {
          className = "fc-event-success";
          canDisable = true;
        }

        _events.push({
          id: `default-event-id-${respData[i].scheduleDetailsId}`,
          scheduleDetailsId: respData[i].scheduleDetailsId,
          title: respData[i].title,
          start: respData[i].startDate,
          end: respData[i].endDate,
          startTime: respData[i].startTime,
          endTime: respData[i].endTime,
          description: respData[i].comment,
          meetingLink: respData[i].meetingLink,
          studentName: respData[i].studentName,
          studentId: respData[i].studentId,
          scheduleId: respData[i].scheduleId,
          subjectName: respData[i].subjectName,
          subjectId: respData[i].subjectId,
          tutorName: respData[i].tutorName,
          tutorId: respData[i].tutorId,
          className: className,
          scheduleStatus: item.scheduleStatus,
          scheduleStatusName: item.scheduleStatusName,
          canDisable: canDisable,
          type: "",
        });
      }
      setStudentClasses(_events);
    });
  };

  const toggle = () => {
    setModal(!modal);
  };

  const tutorToggle = () => {
    setTutorModalState(!tutorModalState);
  };

  const toggleEdit = () => {
    updateEditModal(!edit);
  };

  const handleEventClick = (info) => {
    toggle();
    const _event = studentClasses.find(
      (item) => item.scheduleDetailsId === info.event._def.extendedProps.scheduleDetailsId
    );
    updateEvent(_event);
    setTutorId(_event.tutorId);
    setScheduleId(_event.scheduleId);
    setStudentId(_event.studentId);
    setHdnEndTime(new Date(_event.end));
    setHdnStartTime(new Date(_event.start));
    setFormData({
      id: _event.scheduleDetailsId,
      scheduleDetailsId: _event.scheduleDetailsId,
      title: _event.title,
      start: new Date(_event.start),
      end: new Date(_event.end),
      startTime: new Date(_event.startTime),
      endTime: new Date(_event.endTime),
      description: _event.description,
      studentName: _event.studentName,
      studentId: _event.studentId,
      scheduleId: _event.scheduleId,
      tutorId: _event.tutorId,
      subjectName: _event.subjectName,
      subjectId: _event.subjectId,
      tutorName: _event.tutorName,
      meetingLink: _event?.meetingLink,
      scheduleStatus: _event?.scheduleStatus,
      scheduleStatusName: _event?.scheduleStatusName,
      type: "",
    });
    // updateEvent(event);
    // setStatusTypeId(event.scheduleStatus);
    // settheme(event.type);
  };

  const onDeleteClass = () => {
    Swal.fire({
      title: "Are you sure want to remove?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes!",
    }).then((result) => {
      if (result.isConfirmed) {
        deleteclass(event.scheduleDetailsId, userId).then((response) => {
          getStudentClassesById();
          toggle();
        });
      }
    });
  };

  const returnDate = (date) => {
    if (date !== undefined) {
      // const dateSection = date.split("-");
      // let newDate = dateSection[2] + " " + month[Number(dateSection[1]) - 1] + " " + dateSection[0];
      // return newDate;
      return date;
    }
  };
  const { errors, register, handleSubmit } = useForm();
  const handleFormSubmit = (input) => {
    const inputData = {
      scheduleId: scheduleId,
      date: formData.end,
      scheduleDetailsId: formData.scheduleDetailsId,
      title: formData.title,
      startTime: new Date(formData.start),
      endTime: new Date(formData.end),
      startTimeOld: new Date(hdnStartTime),
      endTimeOld: new Date(hdnEndTime),
      comment: formData.description,
      meetingLink: formData.meetingLink,
      studentId: studentId,
      tutorId: tutorId,
    };

    setLoading(true);
    updatescheduledetails(inputData).then((response) => {
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

      toggleEdit();
      toast.success("Class rescheduled successfully.", {
        position: "top-right",
        autoClose: true,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: false,
      });
    }).finally(() => setLoading(false));
  };

  const eventCallback = (type) => {
    setAddClass(false);
    getStudentClassesById();
  };

  const openScheduleForCourse = (course) => {
    setAddClass(false);
    setScheduleDataItem({
      salesId: course.salesId,
      saleDetailsId: course.saleDetailsId,
      studentId,
      stdUserId: id,
      tutorId: course.tutorId,
      tutorUserId: course.tutorId,
      subjectId: course.subjectId,
    });
  };

  const onAddClassClick = async () => {
    if (loadingScheduleCourses) return;
    setLoadingScheduleCourses(true);
    try {
      const courses = await getSubjectList(studentId, userId);
      if (!Array.isArray(courses) || courses.length === 0) {
        toast.error("No assigned subject is available to schedule for this student.");
      } else if (courses.length === 1) {
        openScheduleForCourse(courses[0]);
      } else {
        setScheduleCourses(courses);
        setAddClass(true);
      }
    } catch (error) {
      toast.error("Unable to load the student's subjects. Please try again.");
    } finally {
      setLoadingScheduleCourses(false);
    }
  };

  const onFormCancel = () => {
    setAddClass(false);
  };

  return (
    <React.Fragment>
      <Head title="Student Scheduled Classes "></Head>
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle tag="h6">Scheduled classes</BlockTitle>
              <BlockDes className="text-soft">
                <ul className="list-inline">
                  <li>
                    Name: <span className="text-base">{studentData?.firstName}</span>
                  </li>
                </ul>
              </BlockDes>
            </BlockHeadContent>
            <BlockHeadContent>
              <Link to={`${process.env.PUBLIC_URL}/lms/sales/enrollment-history`}>
                <Button color="light" outline className="bg-white d-none d-sm-inline-flex">
                  <Icon name="arrow-left"></Icon>
                  <span>Back</span>
                </Button>
                <Button color="light" outline className="btn-icon bg-white d-inline-flex d-sm-none">
                  <Icon name="arrow-left"></Icon>
                </Button>
              </Link>{" "}
              <Button color="light" outline className="bg-white d-none d-sm-inline-flex" onClick={onAddClassClick} disabled={loadingScheduleCourses}>
                <Icon name="plus"></Icon>
                <span>{loadingScheduleCourses ? "Loading..." : "Add Class"}</span>
              </Button>{" "}
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>
        <Block>
          <PreviewAltCard>
            <TCTScheduleCalender guestType="student" refreshKey={calendarRefreshKey}></TCTScheduleCalender>
          </PreviewAltCard>
        </Block>
      </Content>

      <Modal isOpen={addClass} toggle={onFormCancel} className="modal-md">
        <ModalHeader toggle={onFormCancel}>Select a subject to schedule</ModalHeader>
        <ModalBody>
          {scheduleCourses.map((course) => (
            <Button
              key={course.saleDetailsId}
              color="light"
              outline
              block
              className="mb-2 text-left"
              onClick={() => openScheduleForCourse(course)}
            >
              {course.subjectName} — {course.tutorName}
            </Button>
          ))}
        </ModalBody>
      </Modal>

      {scheduleDataItem && (
        <ClassStatusUpdate
          key={scheduleDataItem.saleDetailsId}
          dataItem={scheduleDataItem}
          type={FollowUpStatus.NeedToSchedule}
          modalOpen={true}
          lockSubject={true}
          modalStateChange={(result) => {
            setScheduleDataItem(null);
            if (result === "success") setCalendarRefreshKey((key) => key + 1);
          }}
        />
      )}

      <Modal isOpen={modal} toggle={toggle} className="modal-md">
        <ModalHeader className={event && event?.className} toggle={toggle}>
          {event && event?.title}
        </ModalHeader>
        <ModalBody>
          <Row className="gy-3 py-1">
            <Col sm="6">
              <h6 className="overline-title">Tutor Name</h6>
              <p id="preview-event-start">{event?.tutorName}</p>
            </Col>
            <Col sm="6">
              <h6 className="overline-title">Subject</h6>
              <p id="preview-event-start">{event?.subjectName}</p>
            </Col>
            <Col sm="6">
              <h6 className="overline-title">Start Time</h6>
              <p id="preview-event-start">{event && moment(event?.start).format("DD-MM-YYYY hh:mm")}</p>
            </Col>
            <Col sm="6" id="preview-event-end-check">
              <h6 className="overline-title">End Time</h6>
              <p id="preview-event-end">{event && moment(event?.end).format("DD-MM-YYYY hh:mm")}</p>
            </Col>
            <Col sm="10" id="preview-event-description-check">
              <h6 className="overline-title">Description</h6>
              <p id="preview-event-description">{event && event.description}</p>
            </Col>
          </Row>
          <ul className="d-flex justify-content-between gx-4 mt-3">
            <li>
              <Button
                color="primary"
                onClick={() => {
                  toggle();
                  toggleEdit();
                }}
              >
                Edit Class
              </Button>
            </li>
            <li>
              <Button
                color="danger"
                className="btn-dim"
                onClick={() => {
                  onDeleteClass();
                }}
              >
                Delete
              </Button>
            </li>
          </ul>
        </ModalBody>
      </Modal>

      <Modal isOpen={edit} toggle={toggleEdit} className="modal-md">
        <ModalHeader toggle={toggleEdit}>Update Class</ModalHeader>
        <ModalBody>
          <form className="form-validate is-alter" onSubmit={handleSubmit(handleFormSubmit)}>
            <Row className="gx-4 gy-3">
              <Col size="12">
                <FormGroup>
                  <input type="hidden" id="hdnStartTime" value={hdnStartTime}></input>
                  <input type="hidden" id="hdnStartTime" value={hdnEndTime}></input>
                  <label className="form-label" htmlFor="event-title">
                    Class Title
                  </label>
                  <div className="form-control-wrap">
                    <input
                      type="text"
                      id="event-title"
                      name="title"
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

              <Col size="6">
                <FormGroup>
                  <label className="form-label">Start time</label>
                  <div className="form-control-wrap has-timepicker">
                    <DatePicker
                      selected={formData.start}
                      onChange={(date) => {
                        setFormData({ ...formData, start: date });
                      }}
                      value={formData.start}
                      showTimeSelect
                      showTimeSelectOnly
                      timeZone="Asia/Kolkata"
                      // timeIntervals={15}
                      timeCaption="Time"
                      dateFormat="h:mm aa"
                      className="form-control date-picker"
                    />
                  </div>
                </FormGroup>
              </Col>
              <Col size="6">
                <FormGroup>
                  <label className="form-label">End time</label>
                  <div className="form-control-wrap has-timepicker">
                    <DatePicker
                      selected={formData.end}
                      onChange={(date) => setFormData({ ...formData, end: date })}
                      showTimeSelect
                      showTimeSelectOnly
                      timeIntervals={15}
                      timeCaption="Time"
                      dateFormat="h:mm aa"
                      className="form-control date-picker"
                    />
                  </div>
                </FormGroup>
              </Col>
              <Col size="12">
                <FormGroup>
                  <label className="form-label" htmlFor="event-title">
                    Meeting Link
                  </label>
                  <div className="form-control-wrap">
                    <input
                      type="text"
                      id="meetingLink"
                      name="meetingLink"
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
                      name="description"
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
              <Col size="12">
                <ul className="d-flex justify-content-between gx-4 mt-1">
                  <li>
                    <Button type="submit" color="primary" disabled={loading}>
                      {loading ? (
                        <>
                          <Spinner size="sm" className="mr-1" /> Updating...
                        </>
                      ) : (
                        "Update"
                      )}
                    </Button>
                  </li>
                  <li>
                    <Button color="danger" className="btn-dim" onClick={toggleEdit}>
                      Discard
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
  );
};

export default ViewScheduledClass;
