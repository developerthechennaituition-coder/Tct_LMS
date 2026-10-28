import React from "react";
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
import "./InstructorOverview.css";

const earningData = [
  { day: "01 Jul", value: 4100 },
  { day: "03 Jul", value: 4200 },
  { day: "05 Jul", value: 4800 },
  { day: "07 Jul", value: 5500 },
  { day: "09 Jul", value: 4500 },
  { day: "11 Jul", value: 5600 },
  { day: "13 Jul", value: 6700 },
  { day: "15 Jul", value: 4800 },
  { day: "17 Jul", value: 5600 },
  { day: "19 Jul", value: 5700 },
  { day: "21 Jul", value: 4700 },
  { day: "23 Jul", value: 5000 },
  { day: "25 Jul", value: 5800 },
  { day: "27 Jul", value: 5900 },
  { day: "29 Jul", value: 6000 },
  { day: "30 Jul", value: 4700 },
];

const activeStudentData = [
  { value: 24 },
  { value: 32 },
  { value: 25 },
  { value: 34 },
  { value: 27 },
  { value: 38 },
  { value: 26 },
  { value: 21 },
  { value: 29 },
  { value: 24 },
  { value: 27 },
  { value: 23 },
  { value: 31 },
  { value: 25 },
  { value: 28 },
  { value: 34 },
  { value: 18 },
  { value: 26 },
];

const enrollmentData = [
  { value: 18 },
  { value: 26 },
  { value: 14 },
  { value: 25 },
  { value: 20 },
  { value: 30 },
  { value: 21 },
  { value: 27 },
  { value: 15 },
  { value: 28 },
  { value: 18 },
  { value: 27 },
  { value: 20 },
  { value: 29 },
  { value: 17 },
  { value: 25 },
  { value: 28 },
  { value: 18 },
];

const courses = [
  {
    code: "UI/UX",
    name: "UI/UX Design with Adobe XD",
    price: "$89.00",
    amount: "$1780.00",
    sold: "20 Sold",
    type: "green",
  },
  {
    code: "WDR",
    name: "Front-end Web Development with React",
    price: "$99.00",
    amount: "$990.00",
    sold: "9 Sold",
    type: "purple",
  },
  {
    code: "PHP",
    name: "Learn PHP Basic to Advance",
    price: "$99.00",
    amount: "$990.00",
    sold: "10 Sold",
    type: "red",
  },
  {
    code: "AD",
    name: "Learn Android Development with project",
    price: "$99.00",
    amount: "$990.00",
    sold: "10 Sold",
    type: "cyan",
  },
  {
    code: "WDR",
    name: "Front-end Web Development with React",
    price: "$99.00",
    amount: "$990.00",
    sold: "9 Sold",
    type: "yellow",
  },
];

const feedback = [
  {
    initials: "AB",
    name: "Abu Bin Ishtiyak",
    email: "info@softnio.com",
    rating: 5,
  },
  {
    initials: "AL",
    name: "Ashley Lawson",
    email: "ashley@softnio.com",
    rating: 4,
  },
  {
    initials: "JM",
    name: "Jane Montgomery",
    email: "jane84@example.com",
    rating: 4,
  },
  {
    initials: "LH",
    name: "Larry Henry",
    email: "larry108@example.com",
    rating: 4,
  },
];

const supportRequests = [
  {
    initials: "VL",
    name: "Vincent Lopez",
    message: "Thanks for contact us with your issues...",
    time: "6 min ago",
    type: "image",
  },
  {
    initials: "DM",
    name: "Daniel Moore",
    message: "Thanks for contact us with your issues...",
    time: "2 Hours ago",
    type: "purple",
  },
  {
    initials: "LH",
    name: "Larry Henry",
    message: "Thanks for contact us with your issues...",
    time: "3 Hours ago",
    type: "image",
  },
];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
    <div className="instructor-chart-tooltip">
      ${payload[0].value}
    </div>
  );
};

const InstructorOverview = () => {
  return (
    <div className="instructor-overview-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="instructor-page-header">
        <h2>Instructor Overview</h2>

        <button className="date-filter-btn">
          <span className="calendar-icon">▣</span>
          <span>Last 30 Days</span>
          <span className="arrow-icon">›</span>
        </button>
      </div>


      {/* =====================================================
          TOP DASHBOARD
      ===================================================== */}

      <div className="instructor-top-grid">

        {/* =================================================
            TOTAL EARNING
        ================================================= */}

        <div className="earning-card dashboard-card">

          <div className="card-heading-row">
            <h3>Total Earning</h3>

            <span className="info-icon">?</span>
          </div>

          <div className="earning-stat-row">

            <div className="earning-stat">
              <span className="stat-label">Monthly</span>
              <strong>9.28K</strong>
              <span className="stat-change positive">
                ↑ 4.63%
              </span>
            </div>

            <div className="earning-stat">
              <span className="stat-label">Weekly</span>
              <strong>2.69K</strong>
              <span className="stat-change negative">
                ↓ 1.92%
              </span>
            </div>

            <div className="earning-stat">
              <span className="stat-label">Daily (Avg)</span>
              <strong>0.94K</strong>
              <span className="stat-change positive">
                ↑ 3.45%
              </span>
            </div>

          </div>

          <div className="earning-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={earningData}>
                <CartesianGrid
                  stroke="#dce2eb"
                  horizontal={true}
                  vertical={false}
                />

                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: "#70809a" }}
                  axisLine={false}
                  tickLine={false}
                  interval={earningData.length - 1}
                />

                <YAxis
                  domain={[3000, 9000]}
                  ticks={[3000, 6000, 9000]}
                  tickFormatter={(value) => `$ ${value}`}
                  tick={{
                    fontSize: 11,
                    fill: "#70809a",
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip content={<CustomTooltip />} />

                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#6579ff"
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


        {/* =================================================
            RIGHT STATISTICS
        ================================================= */}

        <div className="side-statistics">

          {/* Active Students */}

          <div className="small-stat-card dashboard-card">

            <h3>Active Students</h3>

            <div className="small-stat-main">
              <strong>329</strong>

              <div className="small-stat-change">
                <span>↑ 4.63%</span>
                <small>vs. last week</small>
              </div>
            </div>

            <div className="mini-chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activeStudentData}>
                  <defs>
                    <linearGradient
                      id="studentGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#5ed9f5"
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="100%"
                        stopColor="#5ed9f5"
                        stopOpacity={0.05}
                      />
                    </linearGradient>
                  </defs>

                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#56d5f4"
                    strokeWidth={2}
                    fill="url(#studentGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

          </div>


          {/* New Enrollment */}

          <div className="small-stat-card dashboard-card">

            <h3>New Enrolment</h3>

            <div className="small-stat-main">
              <strong>194</strong>

              <div className="small-stat-change">
                <span>↑ 4.63%</span>
                <small>vs. Yesterday</small>
              </div>
            </div>

            <div className="mini-chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={enrollmentData}>
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
                        stopColor="#5ed9f5"
                        stopOpacity={0.35}
                      />

                      <stop
                        offset="100%"
                        stopColor="#5ed9f5"
                        stopOpacity={0.05}
                      />
                    </linearGradient>
                  </defs>

                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#56d5f4"
                    strokeWidth={2}
                    fill="url(#enrollmentGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

          </div>

        </div>

      </div>


      {/* =====================================================
          BOTTOM GRID
      ===================================================== */}

      <div className="instructor-bottom-grid">


        {/* =================================================
            MY COURSES
        ================================================= */}

        <div className="dashboard-card courses-card">

          <div className="section-header">
            <h3>My Courses</h3>

            <button>View All</button>
          </div>

          <div className="course-list">

            {courses.map((course, index) => (
              <div className="course-row" key={index}>

                <div
                  className={`course-code ${course.type}`}
                >
                  {course.code}
                </div>

                <div className="course-information">
                  <div className="course-name">
                    {course.name}
                  </div>

                  <div className="course-price">
                    {course.price}
                  </div>
                </div>

                <div className="course-sales">
                  <strong>{course.amount}</strong>
                  <span>{course.sold}</span>
                </div>

              </div>
            ))}

          </div>

        </div>


        {/* =================================================
            STUDENT FEEDBACK
        ================================================= */}

        <div className="dashboard-card feedback-card">

          <div className="section-header">
            <h3>Student's Feedback</h3>

            <button>View All</button>
          </div>

          <div className="feedback-list">

            {feedback.map((item, index) => (
              <div className="feedback-row" key={index}>

                <div className="feedback-avatar">
                  {item.initials}
                </div>

                <div className="feedback-information">
                  <strong>{item.name}</strong>
                  <span>{item.email}</span>
                </div>

                <div className="feedback-rating">

                  <div className="stars">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={
                          star <= item.rating
                            ? "star active"
                            : "star"
                        }
                      >
                        ★
                      </span>
                    ))}
                  </div>

                  <button>Full Review</button>

                </div>

              </div>
            ))}

          </div>

        </div>


        {/* =================================================
            SUPPORT REQUESTS
        ================================================= */}

        <div className="dashboard-card support-card">

          <div className="section-header">
            <h3>Student Support Requests</h3>

            <button>All Requests</button>
          </div>

          <div className="support-list">

            {supportRequests.map((item, index) => (
              <div className="support-row" key={index}>

                <div
                  className={`support-avatar ${item.type}`}
                >
                  {item.initials}
                </div>

                <div className="support-information">

                  <strong>{item.name}</strong>

                  <span>{item.message}</span>

                  <small>{item.time}</small>

                </div>

                <div className="support-status">
                  {index === 0 ? "●" : "•"}
                </div>

              </div>
            ))}

          </div>

        </div>

      </div>

    </div>
  );
};

export default InstructorOverview;