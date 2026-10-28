import React, { useContext, useEffect, useState } from "react";
import {
    DropdownMenu,
    DropdownToggle,
    FormGroup,
    UncontrolledDropdown,
    DropdownItem,
    Form,
    Modal, ModalBody, ModalHeader, Button, Spinner
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
import { eventOptions, events } from "../../../components/partials/calender/CalenderData";
import { setDateForPicker } from "../../../utils/Utils";
import Content from "../../../layout/content/Content";
import Head from "../../../layout/head/Head";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { addOrUpdateSchedule, getScheduleBySubjectId, removeScheduler } from "../../../apiservices/ScheduleService";
import UserAvatar1 from "../../../components/user/UserAvatar1"
import { findUpper1, getColor } from "../../../utils/Utils";
import { getSubjectList } from "../../../apiservices/StudentEnrollmentService";
import { useLocation } from 'react-router-dom';
import DatePicker from "react-datepicker";
import { ToastContainer } from "react-toastify";
import { toast } from "react-toastify";
import moment from "moment";
import Swal from "sweetalert2";

const TCTAddEvent = (props) => {
    const [modal, setModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [subjects, setSubjects] = useState();
    const userId = localStorage.getItem('userId');
    const [tutorId, setTutorId] = useState();
    const [studentId, setStudentId] = useState();
    const [salesDetailsId, setSalesDetailsId] = useState();
    const location = useLocation();
    const [subject, setSubject] = useState();
    const [subjectId, setSubjectId] = useState();
    const [studentName, setStudentName] = useState('');
    const [viewModal, setViewModal] = useState();
    const [reload, setReload] = useState(false);
    const searchParams = new URLSearchParams(location.search);
    const [id, setId] = useState(searchParams.get('id'));
    const [hdnStartTime, setHdnStartTime] = useState('');
    const defaultGuid = '00000000-0000-0000-0000-000000000000';


    const [formData, setFormData] = useState({
        scheduleId: defaultGuid,
        saleDetailsId: defaultGuid,
        subjectId: defaultGuid,
        tutorId: defaultGuid,
        studentId: defaultGuid,
        scheduleStatus: defaultGuid,
        meetingLink: '',
        title: 'No title',
        startDate: new Date(),
        endDate: new Date(),
        startTime: new Date(),
        endTime: new Date(),
        repeatType: 'Onetime',
        description: '',
        weeklyDays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    });

    const repeatOptions = [
        { value: 'Onetime', label: 'One time' },
        { value: 'Daily', label: 'Daily' },
        { value: 'Weekly', label: 'Weekly' },
    ];

    const weekDays = [
        { value: 'Sunday', label: 'Sun' },
        { value: 'Monday', label: 'Mon' },
        { value: 'Tuesday', label: 'Tue' },
        { value: 'Wednesday', label: 'Wed' },
        { value: 'Thursday', label: 'Thu' },
        { value: 'Friday', label: 'Fri' },
        { value: 'Saturday', label: 'Sat' }
    ];

    useEffect(() => {
        getSubjectList(searchParams.get('id'), userId).then((data) => {
            setSubjects(data);
        });
    }, []);

    const { errors, register, handleSubmit } = useForm();

    const handleFormSubmit = (input) => {
        let inputData = formData;
        inputData['tutorId'] = inputData.tutorId;
        inputData['ScheduleType'] = 'Class';
        inputData['Status'] = 'Class';
        inputData['Comment'] = 'Class';
        inputData['userId'] = userId;
        inputData['RepeatDays'] = inputData.weeklyDays;
        // inputData['tutorId'] = tutorId;
        inputData['StudentId'] = id;
        inputData['SalesDetailsId'] = salesDetailsId;
        inputData['subjectId'] = inputData.subjectId;
        inputData['repeatOn'] = inputData.weeklyDays.join();
        const timeZone = 'Asia/Kolkata'; // Indian Standard Time
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
            }

            toast.success("Class scheduled successfully.", {
                position: "top-right",
                autoClose: true,
                hideProgressBar: true,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: false,
            });
            if(typeof(props?.eventCallback) == 'function'){
                props.eventCallback('add');
            }
        }).finally(() => setLoading(false));
        return
    };


    return (<>
        <form className="form-validate is-alter" name="eventform" id="eventform" onSubmit={handleSubmit(handleFormSubmit)}>
            <Row className="gx-4 gy-3">
                <Col size="12">
                    <FormGroup>
                        <label className="form-label" htmlFor="event-title">
                            Class Title
                        </label>
                        <div className="form-control-wrap">
                            <input
                                type="text"
                                id="title"
                                name="title"
                                value={formData.title}
                                onChange={(e) => {
                                    setFormData({ ...formData, title: e.target.value })
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
                        <label className="form-label">Date</label>
                        <div className="form-control-wrap">
                            <DatePicker
                                selected={formData.startDate}
                                value={formData.startDate}
                                name="startDate"
                                id="startDate"
                                onChange={(date) => setFormData({ ...formData, startDate: date })}
                                className="form-control date-picker"
                            />
                        </div>
                        {errors.startDate && <span className="invalid">Please select Date</span>}
                    </FormGroup>
                </Col>
                <Col size="3">
                    <FormGroup>
                        <label className="form-label">Start time</label>
                        <div className="form-control-wrap ssss">
                            <DatePicker
                                selected={formData.startTime}
                                value={formData.startTime}
                                name="startTime"
                                id="startTime"
                                onChange={(date) => {
                                    setFormData({ ...formData, startTime: date });
                                }}
                                ref={register({ required: true })}
                                showTimeSelect
                                showTimeSelectOnly
                                timeZone="Asia/Kolkata"
                                // timeIntervals={15}
                                timeCaption="Time"
                                dateFormat="h:mm aa"
                                className="form-control"

                            />
                            {/* {errors.startTime && <p className="invalid">Please select start time</p>} */}
                        </div>

                    </FormGroup>
                </Col>
                <Col size="3">
                    <FormGroup>
                        <label className="form-label">End time</label>
                        <div className="form-control-wrap has-timepicker">
                            <DatePicker
                                selected={formData.endTime}
                                onChange={(date) => setFormData({ ...formData, endTime: date })}
                                value={formData.endTime}
                                name="endTime"
                                id="endTime"
                                showTimeSelect
                                showTimeSelectOnly
                                timeIntervals={15}
                                timeCaption="Time"
                                dateFormat="h:mm aa"
                                className="form-control date-picker"
                            />
                            {errors.endTime && <p className="invalid">Please select end time</p>}
                        </div>
                    </FormGroup>
                </Col>
                <Col size="6">
                    <FormGroup>
                        <label className="form-label" htmlFor="event-description">Repeat</label>
                        <Row className="gx-2 reschedule-repeat">
                            {repeatOptions.map((option) => (
                                <div className="form-control-wrap">
                                    <Button
                                        key={option.value}
                                        name={option.value}
                                        disabled={option.value != 'Onetime'}
                                        variant={formData.repeatType === option.value ? "default" : "outline"}
                                        className={`flex-1 mt-10 ${formData.repeatType === option.value ? 'btn-primary' : 'btn-repeat'}`}
                                        onClick={() => {
                                            if (option.value == 'Daily') {
                                                setFormData({ ...formData, repeatType: option.value, weeklyDays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] });
                                            }
                                            else {
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
                <Col size="6">
                    <FormGroup>
                        <label className="form-label">Subject </label>
                        <select
                            ref={register({
                                required: true,
                                message: 'Please select board.'
                            })}
                            className="form-control form-select"
                            id="subjectId"
                            name="subjectId"
                            value={formData.subjectId}
                            placeholder="Select a option"
                            onChange={(e) => {
                                const _dataItem = subjects.find(s => s.subjectId == e.target.value);
                                setTutorId(_dataItem.tutorId);
                                setSalesDetailsId(_dataItem.saleDetailsId);
                                setFormData({ ...formData, subjectId: e.target.value, tutorId: _dataItem.tutorId });
                            }}>
                            <option key="001" label="Select a subjects" value="">Select</option>
                            {subjects && subjects.map((item) =>
                                <option key={item.subjectId} value={item.subjectId} data-tutorId={item.tutorId} >{item.subjectName}</option>
                            )}
                        </select>
                        {errors.subjectId && <span className="invalid">Please select Subject.</span>}
                    </FormGroup>
                </Col>
                <Col size="12">
                    <FormGroup>
                        <label className="form-label" htmlFor="event-title">
                            Link
                        </label>
                        <div className="form-control-wrap">
                            <input
                                type="text"
                                id="meetingLink"
                                name="meetingLink"
                                maxLength={250}
                                value={formData.meetingLink}
                                onChange={(e) => {
                                    setFormData({ ...formData, meetingLink: e.target.value })
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
                        <label className="form-label" htmlFor="description">
                            Class Description
                        </label>
                        <div className="form-control-wrap">
                            <textarea
                                className="form-control"
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={(e) => {
                                    setFormData({ ...formData, description: e.target.value })
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
                                        <Spinner size="sm" className="mr-1" /> Adding...
                                    </>
                                ) : (
                                    "Add Event"
                                )}
                            </Button>
                        </li>
                    </ul>
                </Col>
            </Row>
        </form>
    </>)
}
export default TCTAddEvent;