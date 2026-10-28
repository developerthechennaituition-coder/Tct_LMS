import React from "react";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import {
  Block,
  BlockBetween,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Button,
  Icon,
  Row,
  Col,
} from "../../../components/Component";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

/* =========================================================
   SAMPLE DATA
   Replace these with API data later
========================================================= */

const enrollmentData = [
  { day: "01 Jan", students: 120 },
  { day: "02 Jan", students: 145 },
  { day: "03 Jan", students: 132 },
  { day: "04 Jan", students: 168 },
  { day: "05 Jan", students: 151 },
  { day: "06 Jan", students: 182 },
  { day: "07 Jan", students: 165 },
  { day: "08 Jan", students: 192 },
  { day: "09 Jan", students: 174 },
  { day: "10 Jan", students: 205 },
  { day: "11 Jan", students: 188 },
  { day: "12 Jan", students: 220 },
];

const salesData = [
  { day: "01", value: 520 },
  { day: "02", value: 780 },
  { day: "03", value: 620 },
  { day: "04", value: 920 },
  { day: "05", value: 700 },
  { day: "06", value: 850 },
  { day: "07", value: 640 },
  { day: "08", value: 940 },
  { day: "09", value: 720 },
  { day: "10", value: 980 },
  { day: "11", value: 760 },
  { day: "12", value: 1050 },
  { day: "13", value: 820 },
  { day: "14", value: 1120 },
];

const weekSalesData = [
  { day: "Mon", value: 420 },
  { day: "Tue", value: 610 },
  { day: "Wed", value: 520 },
  { day: "Thu", value: 760 },
  { day: "Fri", value: 580 },
  { day: "Sat", value: 820 },
  { day: "Sun", value: 690 },
];

const categoryData = [
  {
    name: "Web Development",
    value: 82,
  },
  {
    name: "Mobile Application",
    value: 65,
  },
  {
    name: "Graphic Design",
    value: 78,
  },
  {
    name: "Database",
    value: 42,
  },
  {
    name: "Marketing",
    value: 57,
  },
  {
    name: "Machine Learning",
    value: 69,
  },
  {
    name: "Data Science",
    value: 61,
  },
];

const activeStudentsData = [
  { day: "01 Jan", value: 320 },
  { day: "02 Jan", value: 390 },
  { day: "03 Jan", value: 350 },
  { day: "04 Jan", value: 440 },
  { day: "05 Jan", value: 420 },
  { day: "06 Jan", value: 480 },
  { day: "07 Jan", value: 450 },
  { day: "08 Jan", value: 510 },
  { day: "09 Jan", value: 490 },
  { day: "10 Jan", value: 530 },
  { day: "11 Jan", value: 500 },
  { day: "12 Jan", value: 570 },
  { day: "13 Jan", value: 550 },
  { day: "14 Jan", value: 590 },
  { day: "15 Jan", value: 610 },
  { day: "16 Jan", value: 580 },
  { day: "17 Jan", value: 630 },
  { day: "18 Jan", value: 610 },
  { day: "19 Jan", value: 660 },
  { day: "20 Jan", value: 640 },
  { day: "21 Jan", value: 690 },
  { day: "22 Jan", value: 670 },
  { day: "23 Jan", value: 720 },
  { day: "24 Jan", value: 700 },
  { day: "25 Jan", value: 750 },
  { day: "26 Jan", value: 730 },
  { day: "27 Jan", value: 770 },
  { day: "28 Jan", value: 760 },
  { day: "29 Jan", value: 790 },
  { day: "30 Jan", value: 810 },
];

const trafficData = [
  {
    name: "Organic Search",
    value: 4305,
  },
  {
    name: "Referrals",
    value: 482,
  },
  {
    name: "Social Media",
    value: 859,
  },
  {
    name: "Others",
    value: 138,
  },
];

const trafficColors = [
  "#6576ff",
  "#f783ac",
  "#8bb7ff",
  "#f4c95d",
];

const courses = [
  {
    short: "UI/UX",
    title: "UI/UX Design with Adobe XD",
    amount: "$8500",
    sales: "25 Sold",
  },
  {
    short: "AD",
    title: "Android App Development",
    amount: "$9500",
    sales: "10 Sold",
  },
  {
    short: "WD",
    title: "Wordpress Development",
    amount: "$7000",
    sales: "15 Sold",
  },
  {
    short: "ML",
    title: "Machine Learning",
    amount: "$10000",
    sales: "10 Sold",
  },
  {
    short: "RD",
    title: "Responsive Design",
    amount: "$8000",
    sales: "12 Sold",
  },
];

const instructors = [
  {
    initials: "AB",
    name: "Abu Bin Ishtiyak",
    email: "abu@example.com",
    rating: "★★★★★",
    reviews: "25 Reviews",
  },
  {
    initials: "AL",
    name: "Ashley Lawson",
    email: "ashley@example.com",
    rating: "★★★★☆",
    reviews: "22 Reviews",
  },
  {
    initials: "JM",
    name: "Jane Montgomery",
    email: "jane@example.com",
    rating: "★★★★☆",
    reviews: "19 Reviews",
  },
  {
    initials: "LH",
    name: "Larry Henry",
    email: "larry@example.com",
    rating: "★★★★★",
    reviews: "24 Reviews",
  },
];

const supportRequests = [
  {
    initials: "VL",
    name: "Vincent Lopez",
    message: "Thanks for contact with your issues...",
    time: "5 min ago",
  },
  {
    initials: "DM",
    name: "Daniel Moore",
    message: "Thanks for contact with your issues...",
    time: "2 hours ago",
  },
  {
    initials: "LH",
    name: "Larry Henry",
    message: "Thanks for contact with your issues...",
    time: "3 hours ago",
  },
];

/* =========================================================
   SMALL COMPONENTS
========================================================= */

const MiniBars = () => {
  const bars = [42, 58, 48, 72, 55, 76, 62, 82, 65, 88, 70, 95];

  return (
    <div
      style={{
        height: "55px",
        width: "100%",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "flex-end",
        gap: "10px",
      }}
    >
      {bars.map((height, index) => (
        <span
          key={index}
          style={{
            width: "22px",
            height: `${height}%`,
            minHeight: "10px",
            backgroundColor:
              index === bars.length - 1 ? "#6576ff" : "#dfe4ff",
            borderRadius: "2px 2px 0 0",
          }}
        />
      ))}
    </div>
  );
};

const Avatar = ({ initials, size = "md" }) => {
  return (
    <div
      className={`user-avatar ${
        size === "sm" ? "sm" : ""
      }`}
      style={{
        backgroundColor: "#e8edff",
        color: "#6576ff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "50%",
        width: size === "sm" ? "30px" : "36px",
        height: size === "sm" ? "30px" : "36px",
        minWidth: size === "sm" ? "30px" : "36px",
        fontSize: size === "sm" ? "10px" : "11px",
        fontWeight: 600,
      }}
    >
      {initials}
    </div>
  );
};

/* =========================================================
   MAIN DASHBOARD
========================================================= */

const LMSDashboard = () => {
  return (
    <>
      <Head title="LMS Dashboard" />

      <Content>
        {/* =================================================
            PAGE HEADER
        ================================================== */}

        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page>LMS Dashboard</BlockTitle>

              <div className="nk-block-des text-soft">
                <p>Welcome to Learning Management Dashboard.</p>
              </div>
            </BlockHeadContent>

            <BlockHeadContent>
              <div className="d-flex align-items-center gap-2">
                <Button
                  color="outline-primary"
                  size="sm"
                  className="d-none d-md-inline-flex"
                >
                  <Icon name="calendar" />
                  <span>Last 30 Days</span>
                  <Icon name="chevron-down" />
                </Button>

                <Button
                  color="outline-primary"
                  size="sm"
                  className="d-none d-md-inline-flex"
                >
                  <Icon name="reports" />
                  <span>Reports</span>
                </Button>
              </div>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        {/* =================================================
            STUDENT ENROLLMENT
        ================================================== */}

        <Block>
          <div className="card card-bordered">
            <div className="card-inner">
              <div className="card-title-group">
                <div className="card-title">
                  <h6 className="title">Students Enrollment</h6>

                  <p className="text-soft small">
                    In last 30 days enrollment of students.
                  </p>
                </div>

                <div className="card-tools">
                  <Button
                    color="light"
                    size="sm"
                    className="btn-icon"
                  >
                    <Icon name="more-h" />
                  </Button>
                </div>
              </div>

              <Row className="mt-3 align-items-end">
                <Col md="3">
                  <div className="d-flex align-items-center gap-4">
                    <div>
                      <div className="text-soft small">
                        This Month
                      </div>

                      <div className="fs-4 fw-medium">
                        5490
                      </div>

                      <span className="text-success small">
                        ↑ 16.93%
                      </span>
                    </div>

                    <div>
                      <div className="text-soft small">
                        This Week
                      </div>

                      <div className="fs-4 fw-medium">
                        1480
                      </div>

                      <span className="text-success small">
                        ↑ 4.26%
                      </span>
                    </div>
                  </div>
                </Col>

                <Col md="9">
                  <MiniBars />
                </Col>
              </Row>
            </div>
          </div>
        </Block>

        {/* =================================================
            SALES + CATEGORY
        ================================================== */}

        <Block>
          <Row className="g-gs">
            {/* TOTAL SALES */}

            <Col xl="3" md="6">
              <div className="card card-bordered h-100">
                <div className="card-inner">
                  <div className="card-title-group">
                    <div className="card-title">
                      <h6 className="title">Total Sales</h6>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="d-flex justify-content-between align-items-end">
                      <div>
                        <span className="text-soft small">
                          Total Amount
                        </span>

                        <div className="fs-3 fw-medium">
                          $9,495.20
                        </div>
                      </div>

                      <span className="text-success small">
                        ↑ 4.63%
                      </span>
                    </div>

                    <div
                      style={{
                        height: "100px",
                        marginTop: "15px",
                      }}
                    >
                      <ResponsiveContainer
                        width="100%"
                        height="100%"
                      >
                        <AreaChart data={salesData}>
                          <defs>
                            <linearGradient
                              id="salesGradient"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor="#6576ff"
                                stopOpacity={0.35}
                              />
                              <stop
                                offset="100%"
                                stopColor="#6576ff"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>

                          <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#6576ff"
                            fill="url(#salesGradient)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="text-end text-soft small">
                      vs. last month
                    </div>
                  </div>
                </div>
              </div>
            </Col>

            {/* THIS WEEK */}

            <Col xl="3" md="6">
              <div className="card card-bordered h-100">
                <div className="card-inner">
                  <div className="card-title-group">
                    <div className="card-title">
                      <h6 className="title">
                        This week so far
                      </h6>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="d-flex justify-content-between align-items-end">
                      <div>
                        <span className="text-soft small">
                          Current Week
                        </span>

                        <div className="fs-3 fw-medium">
                          $2,995.81
                        </div>
                      </div>

                      <span className="text-success small">
                        ↑ 7.35%
                      </span>
                    </div>

                    <div
                      style={{
                        height: "100px",
                        marginTop: "15px",
                      }}
                    >
                      <ResponsiveContainer
                        width="100%"
                        height="100%"
                      >
                        <AreaChart data={weekSalesData}>
                          <defs>
                            <linearGradient
                              id="weekGradient"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor="#6576ff"
                                stopOpacity={0.35}
                              />
                              <stop
                                offset="100%"
                                stopColor="#6576ff"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>

                          <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#6576ff"
                            fill="url(#weekGradient)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="text-end text-soft small">
                      vs. last week
                    </div>
                  </div>
                </div>
              </div>
            </Col>

            {/* TOP CATEGORIES */}

            <Col xl="6" md="12">
              <div className="card card-bordered h-100">
                <div className="card-inner">
                  <div className="card-title-group">
                    <div className="card-title">
                      <h6 className="title">
                        Top Categories
                      </h6>

                      <p className="text-soft small">
                        In last 15 days buy and sells overview.
                      </p>
                    </div>

                    <div className="card-tools">
                      <Button
                        color="light"
                        size="sm"
                        className="btn-icon"
                      >
                        <Icon name="more-h" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3">
                    {categoryData.map((item, index) => (
                      <div
                        key={item.name}
                        className="mb-3"
                      >
                        <div className="d-flex justify-content-between mb-1">
                          <span className="small">
                            {item.name}
                          </span>

                          <span className="text-soft small">
                            {item.value}%
                          </span>
                        </div>

                        <div
                          style={{
                            height: "4px",
                            background: "#edf0f5",
                            borderRadius: "3px",
                          }}
                        >
                          <div
                            style={{
                              width: `${item.value}%`,
                              height: "100%",
                              background:
                                index % 4 === 0
                                  ? "#f7834d"
                                  : index % 4 === 1
                                  ? "#72a7ff"
                                  : index % 4 === 2
                                  ? "#72d8bb"
                                  : "#6576ff",
                              borderRadius: "3px",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Block>

        {/* =================================================
            COURSES / INSTRUCTORS / SUPPORT
        ================================================== */}

        <Block>
          <Row className="g-gs">
            {/* TOP COURSES */}

            <Col xl="4" lg="6">
              <div className="card card-bordered h-100">
                <div className="card-inner">
                  <div className="card-title-group">
                    <div className="card-title">
                      <h6 className="title">Top Courses</h6>
                    </div>

                    <div className="card-tools">
                      <span className="text-soft small">
                        Weekly
                      </span>
                    </div>
                  </div>

                  <div className="mt-3">
                    {courses.map((course, index) => (
                      <div
                        key={course.title}
                        className="d-flex align-items-center justify-content-between py-2 border-bottom"
                      >
                        <div className="d-flex align-items-center">
                          <div
                            style={{
                              width: "32px",
                              height: "32px",
                              minWidth: "32px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: "4px",
                              background:
                                index % 2 === 0
                                  ? "#e8f7f3"
                                  : "#fff4df",
                              color:
                                index % 2 === 0
                                  ? "#20c997"
                                  : "#ffb020",
                              fontSize: "9px",
                              fontWeight: 600,
                            }}
                          >
                            {course.short}
                          </div>

                          <div className="ms-2">
                            <div className="fw-medium small">
                              {course.title}
                            </div>

                            <div className="text-soft">
                              {course.amount}
                            </div>
                          </div>
                        </div>

                        <div className="text-end">
                          <div className="small fw-medium">
                            {course.amount}
                          </div>

                          <div className="text-soft">
                            {course.sales}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Col>

            {/* TOP INSTRUCTORS */}

            <Col xl="4" lg="6">
              <div className="card card-bordered h-100">
                <div className="card-inner">
                  <div className="card-title-group">
                    <div className="card-title">
                      <h6 className="title">
                        Top Instructors
                      </h6>
                    </div>

                    <div className="card-tools">
                      <a
                        href="#view"
                        onClick={(e) => e.preventDefault()}
                        className="link"
                      >
                        View All
                      </a>
                    </div>
                  </div>

                  <div className="mt-3">
                    {instructors.map((instructor) => (
                      <div
                        key={instructor.name}
                        className="d-flex align-items-center justify-content-between py-2 border-bottom"
                      >
                        <div className="d-flex align-items-center">
                          <Avatar
                            initials={instructor.initials}
                            size="sm"
                          />

                          <div className="ms-2">
                            <div className="fw-medium small">
                              {instructor.name}
                            </div>

                            <div className="text-soft small">
                              {instructor.email}
                            </div>
                          </div>
                        </div>

                        <div className="text-end">
                          <div
                            style={{
                              color: "#f7b500",
                              fontSize: "11px",
                              letterSpacing: "1px",
                            }}
                          >
                            {instructor.rating}
                          </div>

                          <div className="text-soft small">
                            {instructor.reviews}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Col>

            {/* SUPPORT REQUESTS */}

            <Col xl="4" lg="12">
              <div className="card card-bordered h-100">
                <div className="card-inner">
                  <div className="card-title-group">
                    <div className="card-title">
                      <h6 className="title">
                        Support Requests
                      </h6>
                    </div>

                    <div className="card-tools">
                      <a
                        href="#requests"
                        onClick={(e) => e.preventDefault()}
                        className="link"
                      >
                        All Requests
                      </a>
                    </div>
                  </div>

                  <div className="mt-3">
                    {supportRequests.map((request) => (
                      <div
                        key={request.name}
                        className="d-flex align-items-center justify-content-between py-3 border-bottom"
                      >
                        <div className="d-flex align-items-center">
                          <Avatar
                            initials={request.initials}
                            size="sm"
                          />

                          <div className="ms-2">
                            <div className="fw-medium small">
                              {request.name}
                            </div>

                            <div className="text-soft small">
                              {request.message}
                            </div>

                            <div className="text-soft small">
                              {request.time}
                            </div>
                          </div>
                        </div>

                        <Icon
                          name="chevron-right"
                          className="text-soft"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Block>

        {/* =================================================
            ACTIVE STUDENTS + TRAFFIC SOURCES
        ================================================== */}

        <Block>
          <Row className="g-gs">
            {/* ACTIVE STUDENTS */}

            <Col xl="8" lg="7">
              <div className="card card-bordered h-100">
                <div className="card-inner">
                  <div className="card-title-group">
                    <div className="card-title">
                      <h6 className="title">
                        Active Students
                      </h6>

                      <p className="text-soft small">
                        How do your students visited in the
                        time.
                      </p>
                    </div>

                    <div className="card-tools">
                      <Button
                        color="light"
                        size="sm"
                        className="btn-icon"
                      >
                        <Icon name="more-h" />
                      </Button>
                    </div>
                  </div>

                  <Row className="mt-3">
                    <Col md="4">
                      <div className="text-soft small">
                        Monthly
                      </div>

                      <div className="fs-4">
                        9.28K
                      </div>

                      <span className="text-success small">
                        ↑ 4.63%
                      </span>
                    </Col>

                    <Col md="4">
                      <div className="text-soft small">
                        Weekly
                      </div>

                      <div className="fs-4">
                        2.69K
                      </div>

                      <span className="text-danger small">
                        ↓ 1.52%
                      </span>
                    </Col>

                    <Col md="4">
                      <div className="text-soft small">
                        Daily (Avg)
                      </div>

                      <div className="fs-4">
                        0.94K
                      </div>

                      <span className="text-success small">
                        ↑ 3.35%
                      </span>
                    </Col>
                  </Row>

                  <div
                    style={{
                      width: "100%",
                      height: "230px",
                      marginTop: "20px",
                    }}
                  >
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                    >
                      <BarChart
                        data={activeStudentsData}
                        margin={{
                          top: 10,
                          right: 5,
                          left: -20,
                          bottom: 0,
                        }}
                      >
                        <CartesianGrid
                          vertical={false}
                          stroke="#edf0f5"
                        />

                        <XAxis
                          dataKey="day"
                          tick={{
                            fontSize: 9,
                            fill: "#8091a7",
                          }}
                          axisLine={false}
                          tickLine={false}
                          interval={4}
                        />

                        <YAxis
                          tick={{
                            fontSize: 9,
                            fill: "#8091a7",
                          }}
                          axisLine={false}
                          tickLine={false}
                        />

                        <Tooltip />

                        <Bar
                          dataKey="value"
                          fill="#9aaaff"
                          radius={[2, 2, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </Col>

            {/* TRAFFIC SOURCES */}

            <Col xl="4" lg="5">
              <div className="card card-bordered h-100">
                <div className="card-inner">
                  <div className="card-title-group">
                    <div className="card-title">
                      <h6 className="title">
                        Traffic Sources
                      </h6>
                    </div>

                    <div className="card-tools">
                      <span className="text-soft small">
                        30 Days
                      </span>
                    </div>
                  </div>

                  <div
                    className="d-flex align-items-center justify-content-center"
                    style={{
                      height: "260px",
                    }}
                  >
                    <ResponsiveContainer
                      width="55%"
                      height="100%"
                    >
                      <PieChart>
                        <Pie
                          data={trafficData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={2}
                        >
                          {trafficData.map(
                            (entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  trafficColors[index]
                                }
                              />
                            )
                          )}
                        </Pie>

                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>

                    <div
                      style={{
                        width: "45%",
                      }}
                    >
                      {trafficData.map(
                        (item, index) => (
                          <div
                            key={item.name}
                            className="d-flex align-items-center mb-2"
                          >
                            <span
                              style={{
                                width: "8px",
                                height: "8px",
                                borderRadius: "2px",
                                background:
                                  trafficColors[
                                    index
                                  ],
                                marginRight: "8px",
                              }}
                            />

                            <span className="small flex-grow-1">
                              {item.name}
                            </span>

                            <span className="text-soft small">
                              {item.value.toLocaleString()}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  <div
                    className="bg-lighter px-3 py-2 rounded"
                  >
                    <span className="text-soft small">
                      <Icon name="info" /> Traffic channels
                      have been generating the most
                      traffic over past days.
                    </span>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Block>
      </Content>
    </>
  );
};

export default LMSDashboard;