import React, { useState } from "react";

import "./InstructorDetails.css";
import {
    UserCircle,
    Eye,
    BookOpen,
    ThumbsUp,
    Edit3,
    Plus,
    CalendarDays,
    ChevronRight,
    HelpCircle,
    Trash2,
    MoreHorizontal
} from "lucide-react";

import {
    ResponsiveContainer,
    LineChart,
    Line,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from "recharts";

const earningData = [
    { day: "01 Jul, 2020", value: 3900 },
    { day: "03 Jul, 2020", value: 4100 },
    { day: "05 Jul, 2020", value: 5100 },
    { day: "07 Jul, 2020", value: 4300 },
    { day: "09 Jul, 2020", value: 5600 },
    { day: "11 Jul, 2020", value: 6600 },
    { day: "13 Jul, 2020", value: 4800 },
    { day: "15 Jul, 2020", value: 5700 },
    { day: "17 Jul, 2020", value: 5900 },
    { day: "19 Jul, 2020", value: 4300 },
    { day: "21 Jul, 2020", value: 4600 },
    { day: "23 Jul, 2020", value: 7900 },
    { day: "25 Jul, 2020", value: 7100 },
    { day: "27 Jul, 2020", value: 7300 },
    { day: "28 Jul, 2020", value: 9000 },
    { day: "29 Jul, 2020", value: 6200 },
    { day: "30 Jul, 2020", value: 4700 },
];

const activeStudentsData = [
    { value: 45 },
    { value: 62 },
    { value: 50 },
    { value: 70 },
    { value: 55 },
    { value: 74 },
    { value: 58 },
    { value: 48 },
    { value: 63 },
    { value: 54 },
    { value: 60 },
    { value: 52 },
    { value: 67 },
    { value: 58 },
    { value: 72 },
    { value: 42 },
    { value: 51 },
];

const enrollmentData = [
    { value: 32 },
    { value: 44 },
    { value: 25 },
    { value: 42 },
    { value: 34 },
    { value: 48 },
    { value: 30 },
    { value: 43 },
    { value: 28 },
    { value: 46 },
    { value: 31 },
    { value: 40 },
    { value: 27 },
    { value: 44 },
    { value: 35 },
    { value: 25 },
    { value: 20 },
];
const instructorData = {
    1: {
        name: "Abu Bin Ishtiyak",
        title: "Mr.",
        fullName: "Abu Bin Ishtiyak",
        dob: "10 Aug, 1980",
        surname: "IO",
        mobile: "+811 758-756433",
        email: "info@softnio.com",
        joiningDate: "08-16-2018 09:04PM",
        regMethod: "Email",
        country: "United State",
        nationality: "United State",
    },

    2: {
        name: "Ashley Lawson",
        title: "Ms.",
        fullName: "Ashley Lawson",
        dob: "12 Mar, 1988",
        surname: "Lawson",
        mobile: "+811 534-98324",
        email: "ashley@softnio.com",
        joiningDate: "08-20-2018 10:20AM",
        regMethod: "Email",
        country: "United kingdom",
        nationality: "United kingdom",
    },

    3: {
        name: "Joe Larson",
        title: "Mr.",
        fullName: "Joe Larson",
        dob: "15 May, 1985",
        surname: "Larson",
        mobile: "+811 987-4958",
        email: "larson@example.com",
        joiningDate: "09-12-2018 11:10AM",
        regMethod: "Email",
        country: "United State",
        nationality: "United State",
    },
};

const defaultInstructor = {
    name: "Abu Bin Ishtiyak",
    title: "Mr.",
    fullName: "Abu Bin Ishtiyak",
    dob: "10 Aug, 1980",
    surname: "IO",
    mobile: "+811 758-756433",
    email: "info@softnio.com",
    joiningDate: "08-16-2018 09:04PM",
    regMethod: "Email",
    country: "United State",
    nationality: "United State",
};

const InstructorDetails = (props) => {
    const id = props.match?.params?.id;

    const instructor =
        instructorData[id] || defaultInstructor;

    const [activeTab, setActiveTab] =
        useState("personal");

    const [notes, setNotes] = useState([
        {
            id: 1,
            text:
                "Aproin at metus et dolor tincidunt feugiat eu id quam. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Aenean sollicitudin non nunc vel pharetra.",
            date: "November 18, 2019 at 5:34 PM",
            author: "Softnio",
        },
        {
            id: 2,
            text:
                "Aproin at metus et dolor tincidunt feugiat eu id quam. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Aenean sollicitudin non nunc vel pharetra.",
            date: "November 18, 2019 at 5:34 PM",
            author: "Softnio",
        },
    ]);

    const addNote = () => {
        const note = window.prompt("Enter admin note");

        if (!note?.trim()) {
            return;
        }

        setNotes((current) => [
            ...current,
            {
                id: Date.now(),
                text: note,
                date: new Date().toLocaleString(),
                author: "Admin",
            },
        ]);
    };

    const deleteNote = (id) => {
        setNotes((current) =>
            current.filter((note) => note.id !== id)
        );
    };

    return (
        <div className="instructor-details-page">

            {/* =================================================
                PAGE TITLE
            ================================================= */}

            <div className="instructor-details-heading">

                <span className="instructor-details-heading-main">
                    Instructor
                </span>

                <span className="instructor-details-heading-slash">
                    /
                </span>

                <span className="instructor-details-heading-name">
                    {instructor.name}
                </span>

            </div>


            {/* =================================================
                MAIN CARD
            ================================================= */}

            <div className="instructor-details-card">

                {/* =================================================
                    TABS
                ================================================= */}

                <div className="instructor-details-tabs">

                    <button
                        className={
                            activeTab === "personal"
                                ? "active"
                                : ""
                        }
                        onClick={() =>
                            setActiveTab("personal")
                        }
                    >
                        <UserCircle size={17} />
                        <span>
                            Personal information
                        </span>
                    </button>


                    <button
                        className={
                            activeTab === "overview"
                                ? "active"
                                : ""
                        }
                        onClick={() =>
                            setActiveTab("overview")
                        }
                    >
                        <Eye size={17} />
                        <span>
                            Overview
                        </span>
                    </button>


                    <button
                        className={
                            activeTab === "courses"
                                ? "active"
                                : ""
                        }
                        onClick={() =>
                            setActiveTab("courses")
                        }
                    >
                        <BookOpen size={17} />
                        <span>
                            Courses
                        </span>
                    </button>


                    <button
                        className={
                            activeTab === "review"
                                ? "active"
                                : ""
                        }
                        onClick={() =>
                            setActiveTab("review")
                        }
                    >
                        <ThumbsUp size={17} />
                        <span>
                            Review
                        </span>
                    </button>


                    <button
                        className="instructor-edit-button"
                    >
                        <Edit3 size={17} />
                    </button>

                </div>


                {/* =================================================
                    PERSONAL INFORMATION
                ================================================= */}

                {activeTab === "personal" && (
                    <>

                        <div className="instructor-information">

                            <div className="instructor-info-row">

                                <div className="instructor-info-label">
                                    Title
                                </div>

                                <div className="instructor-info-value">
                                    {instructor.title}
                                </div>

                                <div className="instructor-info-label">
                                    Full Name
                                </div>

                                <div className="instructor-info-value">
                                    {instructor.fullName}
                                </div>

                            </div>


                            <div className="instructor-info-row">

                                <div className="instructor-info-label">
                                    Date of Birth
                                </div>

                                <div className="instructor-info-value">
                                    {instructor.dob}
                                </div>

                                <div className="instructor-info-label">
                                    Surname
                                </div>

                                <div className="instructor-info-value">
                                    {instructor.surname}
                                </div>

                            </div>


                            <div className="instructor-info-row">

                                <div className="instructor-info-label">
                                    Mobile Number
                                </div>

                                <div className="instructor-info-value">
                                    {instructor.mobile}
                                </div>

                                <div className="instructor-info-label">
                                    Email Address
                                </div>

                                <div className="instructor-info-value">
                                    {instructor.email}
                                </div>

                            </div>


                            {/* Additional */}

                            <div className="instructor-section-title">
                                ADDITIONAL INFORMATION
                            </div>


                            <div className="instructor-info-row">

                                <div className="instructor-info-label">
                                    Joining Date
                                </div>

                                <div className="instructor-info-value">
                                    {instructor.joiningDate}
                                </div>

                                <div className="instructor-info-label">
                                    Reg Method
                                </div>

                                <div className="instructor-info-value">
                                    {instructor.regMethod}
                                </div>

                            </div>


                            <div className="instructor-info-row">

                                <div className="instructor-info-label">
                                    Country
                                </div>

                                <div className="instructor-info-value">
                                    {instructor.country}
                                </div>

                                <div className="instructor-info-label">
                                    Nationality
                                </div>

                                <div className="instructor-info-value">
                                    {instructor.nationality}
                                </div>

                            </div>

                        </div>


                        {/* =================================================
                            ADMIN NOTES
                        ================================================= */}

                        <div className="instructor-admin-notes">

                            <div className="instructor-admin-notes-header">

                                <h2>
                                    Admin Note
                                </h2>

                                <button
                                    onClick={addNote}
                                    className="instructor-add-note"
                                >
                                    <Plus size={14} />
                                    Add Note
                                </button>

                            </div>


                            {notes.map((note) => (

                                <div
                                    className="instructor-note"
                                    key={note.id}
                                >

                                    <div className="instructor-note-content">
                                        {note.text}
                                    </div>

                                    <div className="instructor-note-meta">

                                        Added on {note.date}
                                        {" | "}
                                        By {note.author}

                                        <button
                                            onClick={() =>
                                                deleteNote(note.id)
                                            }
                                        >
                                            Delete Note
                                        </button>

                                    </div>

                                </div>

                            ))}

                        </div>

                    </>
                )}


                {/* =================================================
                    OVERVIEW
                ================================================= */}

                {activeTab === "overview" && (
    <div className="instructor-profile-overview">

        {/* =========================================
            OVERVIEW HEADER
        ========================================= */}

        <div className="profile-overview-header">

            <h2>
                Profile Overview
            </h2>

            <button className="profile-date-filter">
                <CalendarDays size={16} />

                <span>
                    Last 30 Days
                </span>

                <ChevronRight size={16} />
            </button>

        </div>


        {/* =========================================
            DASHBOARD GRID
        ========================================= */}

        <div className="profile-overview-grid">

            {/* =====================================
                TOTAL EARNING
            ===================================== */}

            <div className="total-earning-card">

                <div className="earning-card-title-row">

                    <h3>
                        Total Earning
                    </h3>

                    <HelpCircle
                        size={15}
                        className="earning-help-icon"
                    />

                </div>


                {/* Statistics */}

                <div className="earning-statistics">

                    <div className="earning-stat">

                        <span className="earning-stat-label">
                            Monthly
                        </span>

                        <strong>
                            9.28K
                        </strong>

                        <span className="earning-positive">
                            ↑ 4.63%
                        </span>

                    </div>


                    <div className="earning-stat">

                        <span className="earning-stat-label">
                            Weekly
                        </span>

                        <strong>
                            2.69K
                        </strong>

                        <span className="earning-negative">
                            ↓ 1.92%
                        </span>

                    </div>


                    <div className="earning-stat earning-stat-right">

                        <span className="earning-stat-label">
                            Daily (Avg)
                        </span>

                        <strong>
                            0.94K
                        </strong>

                        <span className="earning-positive">
                            ↑ 3.45%
                        </span>

                    </div>

                </div>


                {/* Main earning chart */}

                <div className="earning-chart">

                    <ResponsiveContainer
                        width="100%"
                        height="100%"
                    >
                        <LineChart
                            data={earningData}
                            margin={{
                                top: 10,
                                right: 10,
                                left: 0,
                                bottom: 0,
                            }}
                        >

                            <CartesianGrid
                                stroke="#e5e9f2"
                                horizontal={true}
                                vertical={false}
                            />

                            <YAxis
                                domain={[3000, 9000]}
                                ticks={[3000, 6000, 9000]}
                                tickFormatter={(value) =>
                                    `$${value}`
                                }
                                axisLine={false}
                                tickLine={false}
                                tick={{
                                    fill: "#7b8ba8",
                                    fontSize: 11,
                                }}
                                width={55}
                            />

                            <XAxis
                                dataKey="day"
                                tickLine={false}
                                axisLine={false}
                                tick={{
                                    fill: "#7b8ba8",
                                    fontSize: 11,
                                }}
                                ticks={[
                                    "01 Jul, 2020",
                                    "30 Jul, 2020",
                                ]}
                            />

                            <Tooltip
                                formatter={(value) =>
                                    [`$${value}`, "Earning"]
                                }
                            />

                            <Line
                                type="monotone"
                                dataKey="value"
                                stroke="#6576ff"
                                strokeWidth={2}
                                dot={false}
                                activeDot={{
                                    r: 4,
                                }}
                            />

                        </LineChart>
                    </ResponsiveContainer>

                </div>

            </div>


            {/* =====================================
                RIGHT SIDE
            ===================================== */}

            <div className="profile-overview-side">


                {/* =================================
                    ACTIVE STUDENTS
                ================================= */}

                <div className="overview-small-card">

                    <div className="small-card-title">
                        Active Students
                    </div>

                    <div className="small-card-main-row">

                        <strong>
                            329
                        </strong>

                        <div className="small-card-growth">

                            <span>
                                ↑ 4.63%
                            </span>

                            <small>
                                vs. last week
                            </small>

                        </div>

                    </div>


                    <div className="small-chart">

                        <ResponsiveContainer
                            width="100%"
                            height="100%"
                        >

                            <AreaChart
                                data={activeStudentsData}
                            >

                                <defs>

                                    <linearGradient
                                        id="activeStudentsGradient"
                                        x1="0"
                                        y1="0"
                                        x2="0"
                                        y2="1"
                                    >

                                        <stop
                                            offset="0%"
                                            stopColor="#39c4f4"
                                            stopOpacity={0.25}
                                        />

                                        <stop
                                            offset="100%"
                                            stopColor="#39c4f4"
                                            stopOpacity={0.02}
                                        />

                                    </linearGradient>

                                </defs>

                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#39c4f4"
                                    strokeWidth={2}
                                    fill="url(#activeStudentsGradient)"
                                    dot={false}
                                />

                            </AreaChart>

                        </ResponsiveContainer>

                    </div>

                </div>


                {/* =================================
                    NEW ENROLLMENT
                ================================= */}

                <div className="overview-small-card">

                    <div className="small-card-title">
                        New Enrolment
                    </div>

                    <div className="small-card-main-row">

                        <strong>
                            194
                        </strong>

                        <div className="small-card-growth">

                            <span>
                                ↑ 4.63%
                            </span>

                            <small>
                                vs. Yesterday
                            </small>

                        </div>

                    </div>


                    <div className="small-chart">

                        <ResponsiveContainer
                            width="100%"
                            height="100%"
                        >

                            <AreaChart
                                data={enrollmentData}
                            >

                                <defs>

                                    <linearGradient
                                        id="enrollmentGradient"
                                        x1="0"
                                        y1="0"
                                        x2="0"
                                        y2="1"
                                    >

                                        <stop
                                            offset="0%"
                                            stopColor="#39c4f4"
                                            stopOpacity={0.25}
                                        />

                                        <stop
                                            offset="100%"
                                            stopColor="#39c4f4"
                                            stopOpacity={0.02}
                                        />

                                    </linearGradient>

                                </defs>

                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#39c4f4"
                                    strokeWidth={2}
                                    fill="url(#enrollmentGradient)"
                                    dot={false}
                                />

                            </AreaChart>

                        </ResponsiveContainer>

                    </div>

                </div>

            </div>

        </div>

    </div>
)}

                {/* =================================================
                    COURSES
                ================================================= */}

                {activeTab === "courses" && (
    <div className="instructor-courses-tab">

        <div className="instructor-courses-table">

            {/* Table Header */}
            <div className="instructor-course-row instructor-course-header">

                <div className="course-number">
                    #
                </div>

                <div className="course-name">
                    Courses List
                </div>

                <div className="course-status">
                    Status
                </div>

                <div className="course-action">
                </div>

            </div>


            {/* Course 1 */}
            <div className="instructor-course-row">

                <div className="course-number">
                    1
                </div>

                <div className="course-name">
                    Learn Android Development with project
                </div>

                <div className="course-status">

                    <span className="course-status-badge active">
                        <span className="status-dot"></span>
                        Active
                    </span>

                </div>

                <div className="course-action">

                    <button
                        type="button"
                        className="course-delete-button"
                        title="Delete course"
                    >
                        <Trash2 size={16} />
                    </button>

                </div>

            </div>


            {/* Course 2 */}
            <div className="instructor-course-row">

                <div className="course-number">
                    2
                </div>

                <div className="course-name">
                    Learn Android Development with project
                </div>

                <div className="course-status">

                    <span className="course-status-badge pending">
                        <span className="status-dot"></span>
                        Pending
                    </span>

                </div>

                <div className="course-action">

                    <button
                        type="button"
                        className="course-delete-button"
                        title="Delete course"
                    >
                        <Trash2 size={16} />
                    </button>

                </div>

            </div>


            {/* Course 3 */}
            <div className="instructor-course-row">

                <div className="course-number">
                    3
                </div>

                <div className="course-name">
                    Learn Android Development with project
                </div>

                <div className="course-status">

                    <span className="course-status-badge canceled">
                        <span className="status-dot"></span>
                        Canceled
                    </span>

                </div>

                <div className="course-action">

                    <button
                        type="button"
                        className="course-delete-button"
                        title="Delete course"
                    >
                        <Trash2 size={16} />
                    </button>

                </div>

            </div>

        </div>

    </div>
)}

                {/* =================================================
                    REVIEW
                ================================================= */}

               {activeTab === "review" && (
    <div className="instructor-review-tab">

        <div className="instructor-review-table">

            {/* =========================
                TABLE HEADER
            ========================= */}

            <div className="instructor-review-row instructor-review-header">

                <div className="review-checkbox">
                    <input
                        type="checkbox"
                        aria-label="Select all reviews"
                    />
                </div>

                <div className="review-student">
                    Student
                </div>

                <div className="review-course">
                    Course name
                </div>

                <div className="review-rating">
                    Rating
                </div>

                <div className="review-content">
                    Review
                </div>

                <div className="review-action">
                    <MoreHorizontal size={18} />
                </div>

            </div>


            {/* =========================
                REVIEW 1
            ========================= */}

            <div className="instructor-review-row">

                <div className="review-checkbox">
                    <input type="checkbox" />
                </div>

                <div className="review-student">

                    <div className="review-student-info">

                        <div className="review-avatar avatar-purple">
                            AB
                        </div>

                        <div className="review-student-details">

                            <span className="review-student-name">
                                Abu Bin Ishtiyak
                            </span>

                            <span className="review-student-email">
                                info@softnio.com
                            </span>

                        </div>

                    </div>

                </div>

                <div className="review-course">
                    UI/UX Design with Adobe XD
                </div>

                <div className="review-rating">

                    <span className="review-stars">
                        ★★★★★
                    </span>

                </div>

                <div className="review-content">
                    The instructor was very knowledgable, worked at a good peace.
                </div>

                <div className="review-action">

                    <button
                        type="button"
                        className="review-delete-button"
                        title="Delete review"
                    >
                        <Trash2 size={16} />
                    </button>

                </div>

            </div>


            {/* =========================
                REVIEW 2
            ========================= */}

            <div className="instructor-review-row">

                <div className="review-checkbox">
                    <input type="checkbox" />
                </div>

                <div className="review-student">

                    <div className="review-student-info">

                        <div className="review-avatar avatar-yellow">
                            VL
                        </div>

                        <div className="review-student-details">

                            <span className="review-student-name">
                                Victoria Lynch
                            </span>

                            <span className="review-student-email">
                                victoria@example.com
                            </span>

                        </div>

                    </div>

                </div>

                <div className="review-course">
                    UI/UX Design with Adobe XD
                </div>

                <div className="review-rating">

                    <span className="review-stars">
                        ★★★★★
                    </span>

                </div>

                <div className="review-content">
                    I will highly recommend this type of instructor.
                </div>

                <div className="review-action">

                    <button
                        type="button"
                        className="review-delete-button"
                        title="Delete review"
                    >
                        <Trash2 size={16} />
                    </button>

                </div>

            </div>


            {/* =========================
                REVIEW 3
            ========================= */}

            <div className="instructor-review-row">

                <div className="review-checkbox">
                    <input type="checkbox" />
                </div>

                <div className="review-student">

                    <div className="review-student-info">

                        <div className="review-avatar avatar-green">
                            PN
                        </div>

                        <div className="review-student-details">

                            <span className="review-student-name">
                                Patrick Newman
                            </span>

                            <span className="review-student-email">
                                patrick@example.com
                            </span>

                        </div>

                    </div>

                </div>

                <div className="review-course">
                    Learn Android Development with project
                </div>

                <div className="review-rating">

                    <span className="review-stars">
                        ★★★★★
                    </span>

                </div>

                <div className="review-content">
                    I look forward to taking more classes from here.
                </div>

                <div className="review-action">

                    <button
                        type="button"
                        className="review-delete-button"
                        title="Delete review"
                    >
                        <Trash2 size={16} />
                    </button>

                </div>

            </div>


            {/* =========================
                REVIEW 4
            ========================= */}

            <div className="instructor-review-row">

                <div className="review-checkbox">
                    <input type="checkbox" />
                </div>

                <div className="review-student">

                    <div className="review-student-info">

                        <div className="review-avatar avatar-image">
                            <img
                                src="/images/avatar/a-sm.jpg"
                                alt="Jane Harris"
                            />
                        </div>

                        <div className="review-student-details">

                            <span className="review-student-name">
                                Jane Harris
                            </span>

                            <span className="review-student-email">
                                harris@example.com
                            </span>

                        </div>

                    </div>

                </div>

                <div className="review-course">
                    Learn Android Development with project
                </div>

                <div className="review-rating">

                    <span className="review-stars">
                        ★★★★★
                    </span>

                </div>

                <div className="review-content">
                    This was my first time it far exceeded my expectations.
                </div>

                <div className="review-action">

                    <button
                        type="button"
                        className="review-delete-button"
                        title="Delete review"
                    >
                        <Trash2 size={16} />
                    </button>

                </div>

            </div>

        </div>

    </div>
)}

            </div>

        </div>
    );
};

export default InstructorDetails;