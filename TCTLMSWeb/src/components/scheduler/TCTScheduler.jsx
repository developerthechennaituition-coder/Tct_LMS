import React, { useState, useEffect } from 'react';
import {
    DropdownMenu, DropdownToggle, FormGroup,
    UncontrolledDropdown, Modal, ModalBody,
    ModalFooter,
    ModalHeader,
    DropdownItem, Form, Row, Input,
    Nav, NavItem, NavLink, TabContent, TabPane
} from "reactstrap";
import DatePicker from "react-datepicker";
import {
    Block,
    ReactDataTable,
    BlockBetween,
    BlockDes,
    BlockHead,
    BlockHeadContent,
    BlockTitle,
    PreviewCard,
    Icon,
    Col,
    Button,
    RSelect,
} from "../Component";
// import './Scheduler.css';

// Utility Functions
const generateUniqueId = () => Math.random().toString(36).substr(2, 9);

const formatDate = (date) => {
    return date ? date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }) : '';
};

const getWeekDates = (currentDate) => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    return Array.from({ length: 7 }, (_, i) => {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        return date;
    });
};

// Event Modal Component
const EventModal = ({
    event,
    isOpen,
    currentDate,
    onClose,
    onSave,
    onDelete
}) => {
    const [title, setTitle] = useState(event?.title || '');
    const [description, setDescription] = useState(event?.description || '');
    const [controlDate, setControlDate] = useState(
        event?.date
            ? new Date(event.date).toISOString().split('T')[0]
            : currentDate.toISOString().split('T')[0]
    );
    const [date, setDate] = useState(
        event?.date
            ? new Date(event.date).toISOString().split('T')[0]
            : currentDate.toISOString().split('T')[0]
    );

    const [startTime, setStartTime] = useState(new Date()); //useState(event?.startTime || '09:00');
    const [endTime, setEndTime] = useState(new Date());//useState(event?.endTime || '10:00');

    const handleSave = () => {

        console.log('Saving event:', {
            id: event?.id || generateUniqueId(),
            title,
            description,
            date: date,
            // date: new Date(date),
            startTime,
            endTime
        });

        onSave({
            id: event?.id || generateUniqueId(),
            title,
            description,
            date: date,
            // date: new Date(date),
            startTime,
            endTime
        });
    };

    return (
        <>
            <Modal scrollable={true} isOpen={isOpen} toggle={() => {
                // setIsAddModalOpen(false);
                // setDisabled(false);
                // props.modalStateChange(false);
            }} className="modal-dialog-centered totur-modal" size="lg">
                <ModalBody>
                    <form>
                        <Row className="col-md-12">
                            <Col md="12" className="pb-md-1">
                                <FormGroup>
                                    <label className="form-label" htmlFor="full-name-1">
                                        Title
                                    </label>
                                    <input
                                        className="form-control"
                                        type="text"
                                        placeholder="Event Title"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        required
                                    />

                                </FormGroup>
                            </Col>
                            <Col md="12" className="pb-md-1">
                                <FormGroup>
                                    <label className="form-label" htmlFor="full-name-1">
                                        Description
                                    </label>
                                    <textarea
                                        className="form-control"
                                        placeholder="Description"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                    />
                                </FormGroup>
                            </Col>
                            <Col md="12" className="pb-md-1">
                                <FormGroup>
                                    <label className="form-label" htmlFor="full-name-1">Date:</label>
                                    <DatePicker
                                        defaultValue={controlDate}
                                        // selected={formData.student.dob}
                                        value={controlDate}
                                        dateFormat="dd/MM/yyyy"
                                        name="dob"
                                        placeholder="Select date of birth"
                                        showMonthDropdown
                                        showYearDropdown
                                        dropdownMode="select"
                                        yearDropdownItemNumber={100}
                                        scrollableYearDropdown
                                        onChange={(e) => {
                                            setDate(e);
                                            const d = new Date(e).toLocaleDateString();
                                            setControlDate(d)

                                        }}
                                        className="form-control date-picker" />
                                    {/* <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    required
                                /> */}
                                </FormGroup>
                            </Col>
                            <Col md="6" className="pb-md-1">
                                <FormGroup>
                                    <label className="form-label" htmlFor="full-name-1">Start Time:</label>
                                    {/* <DatePicker
                                        selected={startTime}
                                        onChange={(date) => setStartTime(date)}
                                        showTimeSelect
                                        showTimeSelectOnly
                                        timeIntervals={15}
                                        timeCaption="Time"
                                        dateFormat="h:mm aa"
                                        className="form-control date-picker"
                                    /> */}
                                    <input
                                        type="time"
                                         className="form-control date-picker"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        required
                                    />
                                </FormGroup>
                            </Col>
                            <Col md="6" className="pb-md-1">
                                <label className="form-label" htmlFor="full-name-1">End Time:</label>
                                {/* <DatePicker
                                    selected={endTime}
                                    onChange={(date) => setEndTime(date)}
                                    showTimeSelect
                                    showTimeSelectOnly
                                    timeIntervals={15}
                                    timeCaption="Time"
                                    dateFormat="h:mm aa"
                                    className="form-control date-picker"
                                /> */}
                                <input
                                    type="time"
                                     className="form-control date-picker"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    required
                                />
                            </Col>
                            {/* <Col md="12">
                            <button onClick={handleSave}>Save</button>
                            <button onClick={onClose}>Cancel</button>
                            {event && (
                                <button
                                    className="delete-btn"
                                    onClick={() => onDelete(event.id)}
                                >
                                    Delete
                                </button>
                            )}
                        </Col> */}
                        </Row>
                    </form>
                </ModalBody>
                <ModalFooter className="bg-light">
                    <Col size="12">
                        <ul className="align-center flex-wrap flex-sm-nowrap gx-4 gy-2">
                            <li>
                                <Button color="primary" size="md" onClick={handleSave}>
                                    Save
                                </Button>
                            </li>
                            <li>
                                <a href="#cancel" onClick={onClose}
                                    className="link link-light" >
                                    Cancel
                                </a>
                            </li>
                        </ul>
                    </Col>
                </ModalFooter>
            </Modal >
        </>
    );
};

// Main Scheduler Component
const Scheduler = () => {
    const [view, setView] = useState('month');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState(() => {
        // Load events from localStorage
        const savedEvents = localStorage.getItem('scheduler-events');
        return savedEvents ? JSON.parse(savedEvents).map(event => ({
            ...event,
            date: new Date(event.date)
        })) : [];
    });
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Save events to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem('scheduler-events', JSON.stringify(events));
    }, [events]);

    // Navigation Methods
    const navigatePrev = () => {
        const newDate = new Date(currentDate);
        switch (view) {
            case 'month':
                newDate.setMonth(newDate.getMonth() - 1);
                break;
            case 'week':
                newDate.setDate(newDate.getDate() - 7);
                break;
            case 'day':
                newDate.setDate(newDate.getDate() - 1);
                break;
            default:
                break;
        }
        setCurrentDate(newDate);
    };

    const navigateNext = () => {
        const newDate = new Date(currentDate);
        switch (view) {
            case 'month':
                newDate.setMonth(newDate.getMonth() + 1);
                break;
            case 'week':
                newDate.setDate(newDate.getDate() + 7);
                break;
            case 'day':
                newDate.setDate(newDate.getDate() + 1);
                break;
            default:
                break;
        }
        setCurrentDate(newDate);
    };

    // Event Handlers
    const addEvent = (newEvent) => {
        console.log('Adding event:', newEvent);
        setEvents(prevEvents => [...prevEvents, newEvent]);
        setIsModalOpen(false);
    };

    const updateEvent = (updatedEvent) => {
        console.log('Updating event:', updatedEvent);
        setEvents(prevEvents =>
            prevEvents.map(event =>
                event.id === updatedEvent.id ? updatedEvent : event
            )
        );
        setIsModalOpen(false);
    };

    const deleteEvent = (eventId) => {
        console.log('Deleting event:', eventId);
        setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
        setIsModalOpen(false);
    };

    const openEventModal = (event = null) => {
        setSelectedEvent(event);
        setIsModalOpen(true);
    };

    // Render Month View
    const renderMonthView = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const calendarDays = [];

        // Add empty days before the first day of the month
        for (let i = 0; i < firstDay; i++) {
            calendarDays.push(
                <div key={`empty-${i}`} className="calendar-day empty"></div>
            );
        }

        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dayEvents = events.filter(
                event =>
                    event.date.toDateString() === date.toDateString()
            );

            calendarDays.push(
                <div
                    key={day}
                    className="calendar-day"
                    onClick={() => {
                        setCurrentDate(date);
                        setView('day');
                    }}
                >
                    <div className="day-number">{day}</div>
                    {dayEvents.map(event => (
                        <div
                            key={event.id}
                            className="event-marker"
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEvent(event);
                                setIsModalOpen(true);
                            }}
                        >
                            {event.title}
                        </div>
                    ))}
                </div>
            );
        }

        return (
            <div className="month-view">
                <div className="calendar-header">
                    {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </div>
                <div className="calendar-weekdays">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="weekday-label">{day}</div>
                    ))}
                </div>
                <div className="calendar-grid">
                    {calendarDays}
                </div>
            </div>
        );
    };

    // Render Week View
    const renderWeekView = () => {
        const weekDates = getWeekDates(currentDate);

        return (
            <div className="week-view">
                <div className="week-grid">
                    {weekDates.map((date, index) => {
                        const dayEvents = events.filter(
                            event => event.date.toDateString() === date.toDateString()
                        );

                        return (
                            <div key={index} className="week-day">
                                <div className="week-day-header">
                                    {date.toLocaleDateString('en-US', {
                                        weekday: 'short',
                                        month: 'short',
                                        day: 'numeric'
                                    })}
                                </div>
                                {dayEvents.map(event => (
                                    <div
                                        key={event.id}
                                        className="week-event"
                                        onClick={() => {
                                            setSelectedEvent(event);
                                            setIsModalOpen(true);
                                        }}
                                    >
                                        {event.title}
                                        <br />
                                        {event.startTime} - {event.endTime}
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // Render Day View
    const renderDayView = () => {
        const hours = Array.from({ length: 24 }, (_, i) => i);
        const dayEvents = events.filter(
            e => e.date.toDateString() === currentDate.toDateString()
        );

        return (
            <div className="day-view">
                <div className="day-header">{formatDate(currentDate)}</div>
                <div className="day-grid">
                    {hours.map(hour => {
                        const hourEvents = dayEvents.filter(
                            e => parseInt(e.startTime.split(':')[0]) === hour
                        );

                        return (
                            <div key={hour} className="hour-slot">
                                <div className="hour-label">
                                    {hour.toString().padStart(2, '0')}:00
                                </div>
                                <div className="hour-events">
                                    {hourEvents.map(event => (
                                        <div
                                            key={event.id}
                                            className="day-event"
                                            onClick={() => {
                                                setSelectedEvent(event);
                                                setIsModalOpen(true);
                                            }}
                                        >
                                            {event.title}
                                            <br />
                                            {event.startTime} - {event.endTime}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="scheduler-container">
            <div className="scheduler-controls">
                <div className="view-switcher">
                    <button
                        className={view === 'month' ? 'active' : ''}
                        onClick={() => setView('month')}
                    >
                        Month
                    </button>
                    <button
                        className={view === 'week' ? 'active' : ''}
                        onClick={() => setView('week')}
                    >
                        Week
                    </button>
                    <button
                        className={view === 'day' ? 'active' : ''}
                        onClick={() => setView('day')}
                    >
                        Day
                    </button>
                </div>
                <div className="navigation-controls">
                    <button onClick={navigatePrev}>Previous</button>
                    <button onClick={navigateNext}>Next</button>
                </div>
                <button
                    className="add-event-btn"
                    onClick={() => openEventModal()}
                >
                    + Add Event
                </button>
            </div>

            {view === 'month' && renderMonthView()}
            {view === 'week' && renderWeekView()}
            {view === 'day' && renderDayView()}

            {isModalOpen && (
                <EventModal
                    isOpen={isModalOpen}
                    event={selectedEvent}
                    currentDate={currentDate}
                    onClose={() => setIsModalOpen(false)}
                    onSave={selectedEvent ? updateEvent : addEvent}
                    onDelete={deleteEvent}
                />
            )}
        </div>
    );
};

export default Scheduler;