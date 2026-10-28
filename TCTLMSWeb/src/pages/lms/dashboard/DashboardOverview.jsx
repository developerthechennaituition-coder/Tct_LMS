import React from "react";

import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import "./DashboardOverview.css";

import {
  BlockBetween,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Button,
  Icon,
} from "../../../components/Component";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";


// =====================================================
// SAMPLE DATA
// =====================================================

const audienceData = [
  { name: "01 Jan", users: 2200, sessions: 3500 },
  { name: "03 Jan", users: 2700, sessions: 3900 },
  { name: "05 Jan", users: 2500, sessions: 3600 },
  { name: "07 Jan", users: 3300, sessions: 4400 },
  { name: "09 Jan", users: 2900, sessions: 4100 },
  { name: "11 Jan", users: 3600, sessions: 4700 },
  { name: "13 Jan", users: 3400, sessions: 4500 },
  { name: "15 Jan", users: 4100, sessions: 5200 },
  { name: "17 Jan", users: 3800, sessions: 4900 },
  { name: "19 Jan", users: 4400, sessions: 5600 },
  { name: "21 Jan", users: 4200, sessions: 5300 },
  { name: "23 Jan", users: 4700, sessions: 5800 },
  { name: "25 Jan", users: 4500, sessions: 5500 },
  { name: "27 Jan", users: 5000, sessions: 6100 },
  { name: "29 Jan", users: 4700, sessions: 5700 },
  { name: "30 Jan", users: 4300, sessions: 5200 },
];

const activeUsersData = [
  { day: "01", users: 310 },
  { day: "02", users: 420 },
  { day: "03", users: 380 },
  { day: "04", users: 510 },
  { day: "05", users: 450 },
  { day: "06", users: 530 },
  { day: "07", users: 490 },
  { day: "08", users: 580 },
  { day: "09", users: 620 },
  { day: "10", users: 550 },
  { day: "11", users: 650 },
  { day: "12", users: 610 },
  { day: "13", users: 720 },
  { day: "14", users: 680 },
  { day: "15", users: 760 },
  { day: "16", users: 700 },
  { day: "17", users: 810 },
  { day: "18", users: 750 },
  { day: "19", users: 840 },
  { day: "20", users: 790 },
  { day: "21", users: 880 },
  { day: "22", users: 820 },
  { day: "23", users: 910 },
  { day: "24", users: 870 },
  { day: "25", users: 940 },
  { day: "26", users: 890 },
  { day: "27", users: 970 },
  { day: "28", users: 920 },
  { day: "29", users: 850 },
  { day: "30", users: 800 },
];

const trafficData = [
  {
    channel: "Organic Search",
    sessions: "4,305",
    percentage: "42.93%",
  },
  {
    channel: "Social Media",
    sessions: "859",
    percentage: "15.83%",
  },
  {
    channel: "Referrals",
    sessions: "482",
    percentage: "41.35%",
  },
  {
    channel: "Others",
    sessions: "138",
    percentage: "12.68%",
  },
];

const trafficChartData = [
  {
    name: "Organic Search",
    value: 4305,
  },
  {
    name: "Social Media",
    value: 859,
  },
  {
    name: "Referrals",
    value: 482,
  },
  {
    name: "Others",
    value: 138,
  },
];

const browserData = [
  {
    browser: "Google Chrome",
    users: "1,641",
    percentage: "72.24%",
  },
  {
    browser: "Mozilla Firefox",
    users: "457",
    percentage: "20.42%",
  },
  {
    browser: "Safari Browser",
    users: "153",
    percentage: "6.87%",
  },
  {
    browser: "UC Browser",
    users: "98",
    percentage: "2.46%",
  },
  {
    browser: "Edge / IE",
    users: "28",
    percentage: "1.14%",
  },
  {
    browser: "Other Browser",
    users: "633",
    percentage: "10.76%",
  },
];

const pagesData = [
  {
    page: "/",
    views: "2,878",
  },
  {
    page: "/subscription/index.html",
    views: "2,094",
  },
  {
    page: "/general/index.html",
    views: "1,634",
  },
  {
    page: "/crypto/index.html",
    views: "1,497",
  },
  {
    page: "/invest/index.html",
    views: "1,438",
  },
  {
    page: "/subscription/profile.html",
    views: "1,348",
  },
  {
    page: "/general/index-crypto.html",
    views: "973",
  },
];

const deviceData = [
  {
    name: "Desktop",
    value: 84.5,
  },
  {
    name: "Mobile",
    value: 14.2,
  },
  {
    name: "Tablet",
    value: 1.3,
  },
];

const trafficColors = [
  "#6576ff",
  "#9cabff",
  "#f783ac",
  "#ffc107",
];

const deviceColors = [
  "#6576ff",
  "#9cabff",
  "#b8c2ff",
];


// =====================================================
// CARD HEADER
// =====================================================

const CardHeader = ({
  title,
  description,
  action,
}) => {
  return (
    <div className="analytics-card-header">

      <div>
        <h6 className="analytics-card-title">
          {title}
        </h6>

        {description && (
          <p className="analytics-card-description">
            {description}
          </p>
        )}
      </div>

      {action && (
        <div>
          {action}
        </div>
      )}

    </div>
  );
};


// =====================================================
// DASHBOARD
// =====================================================

const DashboardOverview = () => {

  return (
    <>
      <Head title="Website Analytics" />

      <Content>

        <div className="analytics-dashboard">

          {/* ================================================= */}
          {/* PAGE HEADER */}
          {/* ================================================= */}

          <BlockHead size="sm">

            <BlockBetween>

              <BlockHeadContent>

                <BlockTitle page tag="h3">
                  Website Analytics
                </BlockTitle>

                <p className="text-soft mb-0">
                  Welcome to Analytics Dashboard.
                </p>

              </BlockHeadContent>

              <BlockHeadContent>

                <div className="analytics-header-actions">

                  <Button
                    color="light"
                    className="analytics-filter-btn"
                  >
                    Last 30 Days

                    <Icon
                      name="chevron-down"
                      className="ml-1"
                    />
                  </Button>

                  <Button
                    color="primary"
                    className="analytics-report-btn"
                  >
                    <Icon
                      name="file-text"
                      className="mr-1"
                    />

                    Reports
                  </Button>

                </div>

              </BlockHeadContent>

            </BlockBetween>

          </BlockHead>


          {/* ================================================= */}
          {/* DASHBOARD GRID */}
          {/* ================================================= */}

          <div className="analytics-grid">


            {/* ================================================= */}
            {/* AUDIENCE OVERVIEW */}
            {/* ================================================= */}

            <div className="analytics-card audience-card">

              <CardHeader
                title="Audience Overview"
                description="How have your users, sessions, bounce rate metrics trended."
                action={
                  <div className="analytics-period-buttons">

                    <button className="active">
                      7D
                    </button>

                    <button>
                      1M
                    </button>

                    <button>
                      3M
                    </button>

                  </div>
                }
              />

              {/* STATISTICS */}

              <div className="audience-stats">

                <div className="audience-stat">

                  <span>
                    Users
                  </span>

                  <strong>
                    2.57K
                  </strong>

                  <small className="positive">
                    ↑ 12.37%
                  </small>

                </div>


                <div className="audience-stat">

                  <span>
                    Sessions
                  </span>

                  <strong>
                    3.98K
                  </strong>

                  <small className="positive">
                    ↑ 4.72%
                  </small>

                </div>


                <div className="audience-stat">

                  <span>
                    Bounce Rate
                  </span>

                  <strong>
                    28.49%
                  </strong>

                  <small className="negative">
                    ↓ 2.37%
                  </small>

                </div>


                <div className="audience-stat">

                  <span>
                    Avg. Session
                  </span>

                  <strong>
                    7m 28s
                  </strong>

                  <small className="positive">
                    ↑ 4.35%
                  </small>

                </div>

              </div>


              {/* LINE CHART */}

              <div className="audience-chart">

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <LineChart
                    data={audienceData}
                    margin={{
                      top: 10,
                      right: 10,
                      left: 0,
                      bottom: 0,
                    }}
                  >

                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e5e9f2"
                    />

                    <XAxis
                      dataKey="name"
                      tick={{
                        fontSize: 10,
                        fill: "#8091a7",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />

                    <YAxis
                      tick={{
                        fontSize: 10,
                        fill: "#8091a7",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />

                    <Tooltip />

                    <Line
                      type="monotone"
                      dataKey="users"
                      stroke="#6576ff"
                      strokeWidth={2.5}
                      dot={false}
                      name="Users"
                    />

                    <Line
                      type="monotone"
                      dataKey="sessions"
                      stroke="#9cabff"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      name="Sessions"
                    />

                  </LineChart>

                </ResponsiveContainer>

              </div>

            </div>


            {/* ================================================= */}
            {/* ACTIVE USERS */}
            {/* ================================================= */}

            <div className="analytics-card active-users-card">

              <CardHeader
                title="Active Users"
                description="How do your users visit the site."
              />

              <div className="active-user-summary">

                <span>
                  Monthly
                </span>

                <strong>
                  9.28K
                </strong>

                <small className="positive">
                  ↑ 14.63%
                </small>

              </div>


              <div className="active-users-chart">

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <BarChart
                    data={activeUsersData}
                    barCategoryGap={2}
                    margin={{
                      top: 5,
                      right: 5,
                      left: 5,
                      bottom: 0,
                    }}
                  >

                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e5e9f2"
                    />

                    <XAxis
                      dataKey="day"
                      hide
                    />

                    <YAxis
                      hide
                    />

                    <Tooltip />

                    <Bar
                      dataKey="users"
                      fill="#6576ff"
                      radius={[3, 3, 0, 0]}
                    />

                  </BarChart>

                </ResponsiveContainer>

              </div>

            </div>


            {/* ================================================= */}
            {/* WEBSITE PERFORMANCE */}
            {/* ================================================= */}

            <div className="analytics-card performance-card">

              <CardHeader
                title="Website Performance"
                description="How has performance been this month."
              />

              <div className="performance-list">

                <div className="performance-row">

                  <span>
                    Bounce Rate
                  </span>

                  <strong>
                    23.59%
                  </strong>

                </div>


                <div className="performance-row">

                  <span>
                    Pageviews
                  </span>

                  <strong>
                    5.48K
                  </strong>

                </div>


                <div className="performance-row">

                  <span>
                    New Users
                  </span>

                  <strong>
                    549
                  </strong>

                </div>


                <div className="performance-row">

                  <span>
                    Time on Site
                  </span>

                  <strong>
                    3m 35s
                  </strong>

                </div>

              </div>

            </div>


            {/* ================================================= */}
            {/* TRAFFIC CHANNEL TABLE */}
            {/* ================================================= */}

            <div className="analytics-card traffic-table-card">

              <CardHeader
                title="Traffic Channel"
                description="Top traffic channel metrics."
                action={
                  <button className="analytics-small-select">
                    30 Days
                    <Icon
                      name="chevron-down"
                      className="ml-1"
                    />
                  </button>
                }
              />

              <div className="analytics-table-wrapper">

                <table className="analytics-table">

                  <thead>

                    <tr>

                      <th>
                        Channel
                      </th>

                      <th>
                        Sessions
                      </th>

                      <th>
                        Share
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {trafficData.map((item) => (

                      <tr key={item.channel}>

                        <td>
                          {item.channel}
                        </td>

                        <td>
                          {item.sessions}
                        </td>

                        <td>
                          {item.percentage}
                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            </div>


            {/* ================================================= */}
            {/* TRAFFIC DONUT */}
            {/* ================================================= */}

            <div className="analytics-card traffic-chart-card">

              <CardHeader
                title="Traffic Channel"
                description="Traffic source distribution."
              />

              <div className="traffic-donut">

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <PieChart>

                    <Pie
                      data={trafficChartData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={88}
                      paddingAngle={2}
                    >

                      {trafficChartData.map(
                        (entry, index) => (

                          <Cell
                            key={`traffic-${index}`}
                            fill={trafficColors[index]}
                          />

                        )
                      )}

                    </Pie>

                    <Tooltip />

                  </PieChart>

                </ResponsiveContainer>

              </div>


              <div className="chart-legend">

                {trafficChartData.map(
                  (item, index) => (

                    <div
                      className="legend-item"
                      key={item.name}
                    >

                      <span
                        className="legend-dot"
                        style={{
                          backgroundColor:
                            trafficColors[index],
                        }}
                      />

                      <span>
                        {item.name}
                      </span>

                    </div>

                  )
                )}

              </div>

            </div>


            {/* ================================================= */}
            {/* BROWSERS */}
            {/* ================================================= */}

            <div className="analytics-card browser-card">

              <CardHeader
                title="Browsers Used"
                description="Users by browser."
                action={
                  <button className="analytics-small-select">
                    30 Days
                  </button>
                }
              />

              <div className="analytics-table-wrapper">

                <table className="analytics-table browser-table">

                  <tbody>

                    {browserData.map((item) => (

                      <tr key={item.browser}>

                        <td>

                          <span className="browser-icon">
                            <Icon name="globe" />
                          </span>

                          {item.browser}

                        </td>

                        <td>
                          {item.users}
                        </td>

                        <td className="text-right">
                          {item.percentage}
                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            </div>


            {/* ================================================= */}
            {/* PAGES */}
            {/* ================================================= */}

            <div className="analytics-card pages-card">

              <CardHeader
                title="Pages Viewed by Users"
                description="Most visited pages."
                action={
                  <button className="analytics-small-select">
                    30 Days
                  </button>
                }
              />

              <div className="analytics-table-wrapper">

                <table className="analytics-table pages-table">

                  <tbody>

                    {pagesData.map((item) => (

                      <tr key={item.page}>

                        <td>
                          {item.page}
                        </td>

                        <td className="text-right">
                          {item.views}
                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            </div>


            {/* ================================================= */}
            {/* DEVICE */}
            {/* ================================================= */}

            <div className="analytics-card device-card">

              <CardHeader
                title="Sessions by Device"
                description="Devices used by visitors."
              />

              <div className="device-chart">

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <PieChart>

                    <Pie
                      data={deviceData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={88}
                      paddingAngle={2}
                    >

                      {deviceData.map(
                        (entry, index) => (

                          <Cell
                            key={`device-${index}`}
                            fill={deviceColors[index]}
                          />

                        )
                      )}

                    </Pie>

                    <Tooltip />

                  </PieChart>

                </ResponsiveContainer>

              </div>


              <div className="device-stats">

                <div>

                  <strong>
                    84.5%
                  </strong>

                  <span>
                    Desktop
                  </span>

                </div>


                <div>

                  <strong>
                    14.2%
                  </strong>

                  <span>
                    Mobile
                  </span>

                </div>


                <div>

                  <strong>
                    1.3%
                  </strong>

                  <span>
                    Tablet
                  </span>

                </div>

              </div>

            </div>

          </div>

        </div>

      </Content>
    </>
  );
};

export default DashboardOverview;