import React from "react";
import "./Reports.css";

/* =========================================================
   DATA
========================================================= */

const clientProjects = [
  {
    initials: "AB",
    name: "Abu Bin Ishtiyak",
    email: "info@softnio.com",
    project: "IT Solution",
    phone: "+811 847-4958",
    country: "United State",
    payment: "Due",
    status: "Active",
    color: "purple",
  },
  {
    initials: "AL",
    name: "Ashley Lawson",
    email: "ashley@softnio.com",
    project: "Internet configuration",
    phone: "+124 394-1787",
    country: "United Kindom",
    payment: "Paid",
    status: "Inactive",
    color: "teal",
  },
  {
    initials: "JL",
    name: "Joe Larson",
    email: "larson@example.com",
    project: "Database Management",
    phone: "+168 603-2320",
    country: "India",
    payment: "Paid",
    status: "Active",
    color: "cyan",
  },
  {
    initials: "JM",
    name: "Jane Montgomery",
    email: "jane84@example.com",
    project: "Design tool",
    phone: "+439 271-5360",
    country: "Canada",
    payment: "Canceled",
    status: "Suspend",
    color: "red",
  },
];

const expenses = [
  {
    initials: "IT",
    project: "IT Solution",
    client: "Softnio",
    total: "$7,452",
    monthly: "$1412",
    weekly: "$525",
    daily: "$225",
    color: "purple",
  },
  {
    initials: "DM",
    project: "Database Management",
    client: "Runnergy",
    total: "$4,136",
    monthly: "$1180",
    weekly: "$420",
    daily: "$130",
    color: "yellow",
  },
  {
    initials: "KR",
    project: "Keyword Research for SEO",
    client: "Techyspec",
    total: "$4,510",
    monthly: "$1235.50",
    weekly: "$510",
    daily: "$160",
    color: "cyan",
  },
  {
    initials: "BC",
    project: "Banner Completion",
    client: "Fitness Next",
    total: "$5,492.50",
    monthly: "$1420",
    weekly: "$665.50",
    daily: "$175.70",
    color: "red",
  },
];

const dealingInformation = [
  {
    initials: "AB",
    name: "Abu Bin Ishtiyak",
    attended: 17,
    win: 13,
    lost: 4,
    total: "35,040.34 USD",
    average: "24,175.20 USD",
    rank: "76%",
    color: "purple",
  },
  {
    initials: "JD",
    name: "John Doe",
    attended: 22,
    win: 16,
    lost: 6,
    total: "44,045.30 USD",
    average: "27,147.90 USD",
    rank: "82%",
    color: "teal",
  },
  {
    initials: "AL",
    name: "Ashley Lawson",
    attended: 15,
    win: 12,
    lost: 3,
    total: "23,055.35 USD",
    average: "18,195.00 USD",
    rank: "75%",
    color: "cyan",
  },
  {
    initials: "VL",
    name: "Victoria Lynch",
    attended: 20,
    win: 16,
    lost: 4,
    total: "32,042.45 USD",
    average: "28,290.85 USD",
    rank: "87%",
    color: "yellow",
  },
];

/* =========================================================
   COMMON COMPONENTS
========================================================= */

function FilterButton() {
  return (
    <button className="report-filter-btn">
      <span className="filter-icon">☰</span>
      Filtered By
      <span className="filter-arrow">›</span>
    </button>
  );
}

function DateDropdown({ children = "30 Days" }) {
  return (
    <button className="date-dropdown">
      {children}
      <span>⌄</span>
    </button>
  );
}

function MoreButton() {
  return <button className="more-btn">•••</button>;
}

function Avatar({ initials, color }) {
  return (
    <div className={`report-avatar ${color}`}>
      {initials}
    </div>
  );
}

function Pagination() {
  return (
    <div className="pagination">
      <button>Prev</button>
      <button className="active">1</button>
      <button>2</button>
      <button>...</button>
      <button>6</button>
      <button>7</button>
      <button>Next</button>
    </div>
  );
}

function PageSelector() {
  return (
    <div className="page-selector">
      <span>PAGE</span>
      <button>
        1 <span>⌄</span>
      </button>
      <span>OF 102</span>
    </div>
  );
}

function TableToolbar() {
  return (
    <div className="table-toolbar">
      <div className="toolbar-left">
        <button className="bulk-btn">
          Bulk Action <span>⌄</span>
        </button>

        <button className="apply-btn">Apply</button>
      </div>

      <div className="toolbar-right">
        <span className="search-icon">⌕</span>
        <span className="settings-icon">⚙</span>
      </div>
    </div>
  );
}

/* =========================================================
   DONUT CHARTS
========================================================= */

function ClientPaymentChart() {
  return (
    <div className="donut-wrapper">
      <div className="donut-chart payment-donut">
        <div className="donut-center">
          <span>Invoice</span>
          <strong>482 $</strong>
        </div>
      </div>

      <div className="chart-legend payment-legend">
        <div>
          <span className="legend-color paid" />
          <label>Paid</label>
          <strong>$4,305.00</strong>
          <small>58.63%</small>
        </div>

        <div>
          <span className="legend-color due" />
          <label>Due</label>
          <strong>$859.25</strong>
          <small>23.94%</small>
        </div>

        <div>
          <span className="legend-color invoice" />
          <label>Invoice</label>
          <strong>$482.15</strong>
          <small>12.94%</small>
        </div>

        <div>
          <span className="legend-color estimate" />
          <label>Estimate</label>
          <strong>$138.70</strong>
          <small>4.49%</small>
        </div>
      </div>
    </div>
  );
}

function ProjectDonutChart() {
  return (
    <div className="project-chart-wrapper">
      <div className="project-donut">
        <div className="donut-hole" />
      </div>

      <div className="project-legend">
        <span>
          <i className="started" />
          Started
        </span>

        <span>
          <i className="inprogress" />
          Inprogress
        </span>

        <span>
          <i className="completed" />
          Completed
        </span>

        <span>
          <i className="cancelled" />
          Cancelled
        </span>
      </div>
    </div>
  );
}

/* =========================================================
   RADAR / POLAR CHART
========================================================= */

function StatusPolarChart() {
  return (
    <div className="polar-chart-wrapper">
      <svg
        className="polar-chart"
        viewBox="0 0 300 220"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g transform="translate(150 105)">
          <circle r="70" className="polar-ring" />
          <circle r="55" className="polar-ring" />
          <circle r="40" className="polar-ring" />
          <circle r="25" className="polar-ring" />

          <line x1="0" y1="-70" x2="0" y2="70" className="polar-line" />
          <line x1="-70" y1="0" x2="70" y2="0" className="polar-line" />

          <path
            d="M0,-55 L60,0 L0,45 L-55,0 Z"
            className="polar-area"
          />

          <path
            d="M0,-25 L40,0 L0,50 L-48,0 Z"
            className="polar-area purple-area"
          />

          <path
            d="M0,-70 L-60,-35 L-35,0 L0,0 Z"
            className="polar-area green-area"
          />
        </g>

        <text x="145" y="22" className="polar-number">
          250
        </text>
        <text x="145" y="38" className="polar-number">
          200
        </text>
        <text x="145" y="54" className="polar-number">
          150
        </text>
        <text x="145" y="70" className="polar-number">
          100
        </text>
      </svg>

      <div className="status-chart-legend">
        <span>
          <i className="started" />
          Started
        </span>
        <span>
          <i className="inprogress" />
          Inprogress
        </span>
        <span>
          <i className="completed" />
          Completed
        </span>
        <span>
          <i className="cancelled" />
          Cancelled
        </span>
        <span>
          <i className="success" />
          Success
        </span>
      </div>
    </div>
  );
}

/* =========================================================
   CLIENT REPORT
========================================================= */

function ClientReport() {
  return (
    <section className="report-section">
      <div className="report-page-header">
        <div>
          <h1>Client Report</h1>
          <p>Client Report details.</p>
        </div>

        <FilterButton />
      </div>

      <div className="client-report-cards">
        {/* PAYMENT */}
        <div className="report-card">
          <div className="card-header">
            <div>
              <h3>Client Payment Report</h3>
            </div>
            <DateDropdown />
          </div>

          <ClientPaymentChart />
        </div>

        {/* STATUS */}
        <div className="report-card">
          <div className="card-header">
            <h3>Client Payment Status</h3>
            <DateDropdown />
          </div>

          <StatusPolarChart />
        </div>

        {/* PROJECT */}
        <div className="report-card">
          <div className="card-header">
            <h3>Client Project Reports</h3>
            <DateDropdown />
          </div>

          <ProjectDonutChart />
        </div>
      </div>

      <div className="section-title-row">
        <div>
          <h2>Client's Projects</h2>
          <p>You have total 595 client's project.</p>
        </div>

        <div className="section-actions">
          <button className="export-btn">♧ &nbsp; Export</button>
          <button className="add-btn">+</button>
        </div>
      </div>

      <div className="report-table-card">
        <TableToolbar />

        <div className="table-scroll">
          <table className="report-table">
            <thead>
              <tr>
                <th className="checkbox-column">
                  <input type="checkbox" />
                </th>
                <th>Client</th>
                <th>Projects</th>
                <th>Phone</th>
                <th>Country</th>
                <th>Payment</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {clientProjects.map((item, index) => (
                <tr key={index}>
                  <td>
                    <input type="checkbox" />
                  </td>

                  <td>
                    <div className="client-cell">
                      <Avatar
                        initials={item.initials}
                        color={item.color}
                      />

                      <div>
                        <strong>{item.name}</strong>
                        <span>{item.email}</span>
                      </div>
                    </div>
                  </td>

                  <td>
                    <div className="project-cell">
                      <strong>{item.project}</strong>
                      <span>View More</span>
                    </div>
                  </td>

                  <td>{item.phone}</td>

                  <td>{item.country}</td>

                  <td>
                    <span
                      className={`payment-status ${item.payment.toLowerCase()}`}
                    >
                      <i />
                      {item.payment}
                    </span>
                  </td>

                  <td>
                    <span
                      className={`client-status ${item.status.toLowerCase()}`}
                    >
                      {item.status}
                    </span>
                  </td>

                  <td>
                    <MoreButton />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          <Pagination />
          <PageSelector />
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   EXPENSE REPORT
========================================================= */

function ExpenseLineChart() {
  return (
    <div className="expense-chart">
      <svg
        viewBox="0 0 1200 260"
        preserveAspectRatio="none"
        className="line-chart"
      >
        <line x1="40" y1="40" x2="1160" y2="40" />
        <line x1="40" y1="80" x2="1160" y2="80" />
        <line x1="40" y1="120" x2="1160" y2="120" />
        <line x1="40" y1="160" x2="1160" y2="160" />
        <line x1="40" y1="200" x2="1160" y2="200" />

        <text x="0" y="43">12,000</text>
        <text x="0" y="83">9,600</text>
        <text x="0" y="123">7,200</text>
        <text x="0" y="163">4,800</text>
        <text x="0" y="203">2,400</text>
        <text x="25" y="235">0</text>

        <path
          className="chart-area"
          d="
            M40 165
            L100 158
            L150 160
            L205 145
            L255 158
            L315 147
            L365 130
            L415 160
            L470 153
            L520 152
            L565 160
            L620 158
            L670 135
            L715 170
            L760 145
            L810 112
            L860 140
            L905 162
            L950 158
            L995 108
            L1040 118
            L1080 118
            L1125 110
            L1160 140
            L1160 205
            L40 205
            Z
          "
        />

        <path
          className="chart-line"
          d="
            M40 165
            L100 158
            L150 160
            L205 145
            L255 158
            L315 147
            L365 130
            L415 160
            L470 153
            L520 152
            L565 160
            L620 158
            L670 135
            L715 170
            L760 145
            L810 112
            L860 140
            L905 162
            L950 158
            L995 108
            L1040 118
            L1080 118
            L1125 110
            L1160 140
          "
        />

        <path
          className="chart-dashed"
          d="
            M40 168
            L100 160
            L150 162
            L205 150
            L255 154
            L315 140
            L365 102
            L415 145
            L470 160
            L520 150
            L565 158
            L620 155
            L670 148
            L715 150
            L760 130
            L810 125
            L860 140
            L905 150
            L950 195
            L995 130
            L1040 115
            L1080 110
            L1125 98
            L1160 95
          "
        />

        <text x="35" y="245">01 Jan, 2021</text>
        <text x="600" y="245">15 Jan, 2021</text>
        <text x="1120" y="245">30 Jan, 2021</text>
      </svg>
    </div>
  );
}

function ExpenseReport() {
  return (
    <section className="report-section">
      <div className="report-page-header">
        <div>
          <h1>Expense Report</h1>
          <p>Expense Report details.</p>
        </div>

        <FilterButton />
      </div>

      <div className="expense-main-card">
        <div className="expense-header">
          <div>
            <h3>Expense Report</h3>
            <p>Project Expense Total Statistics</p>
          </div>

          <div className="range-buttons">
            <button>7 D</button>
            <button className="selected">1M</button>
            <button>3 M</button>
          </div>
        </div>

        <div className="expense-stats">
          <div>
            <span>Yearly</span>
            <strong>2.57K</strong>
            <small className="positive">↑ 12.37%</small>
          </div>

          <div>
            <span>Monthly</span>
            <strong>3.98K</strong>
            <small className="positive">↑ 47.74%</small>
          </div>

          <div>
            <span>Weekly</span>
            <strong>28.49%</strong>
            <small className="negative">↓ 12.37%</small>
          </div>

          <div>
            <span>Daily</span>
            <strong>5.95%</strong>
            <small className="positive">↑ 9.35%</small>
          </div>
        </div>

        <ExpenseLineChart />
      </div>

      <div className="report-table-card expense-table">
        <div className="table-scroll">
          <table className="report-table">
            <thead>
              <tr>
                <th>Project Name</th>
                <th>Client</th>
                <th>Total Expense</th>
                <th>Monthly Expense</th>
                <th>Weekly Expense</th>
                <th>Daily Expense</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {expenses.map((item, index) => (
                <tr key={index}>
                  <td>
                    <div className="project-name-cell">
                      <Avatar
                        initials={item.initials}
                        color={item.color}
                      />
                      <strong>{item.project}</strong>
                    </div>
                  </td>

                  <td>{item.client}</td>
                  <td>{item.total}</td>
                  <td>{item.monthly}</td>
                  <td>{item.weekly}</td>
                  <td>{item.daily}</td>

                  <td>
                    <MoreButton />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          <Pagination />
          <PageSelector />
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   DEALING INFORMATION
========================================================= */

function DealingInformation() {
  return (
    <section className="report-section">
      <div className="report-page-header">
        <div>
          <h1>Dealing Information</h1>
          <p>You have total 15 archive task.</p>
        </div>

        <FilterButton />
      </div>

      <div className="report-table-card dealing-table">
        <TableToolbar />

        <div className="table-scroll">
          <table className="report-table">
            <thead>
              <tr>
                <th className="checkbox-column">
                  <input type="checkbox" />
                </th>
                <th>Owner Name</th>
                <th>Deals Attended</th>
                <th>Deals Win</th>
                <th>Deals Lost</th>
                <th>Total Deals Value</th>
                <th>Avg Deals Value</th>
                <th>Rank</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {dealingInformation.map((item, index) => (
                <tr key={index}>
                  <td>
                    <input type="checkbox" />
                  </td>

                  <td>
                    <div className="client-cell">
                      <Avatar
                        initials={item.initials}
                        color={item.color}
                      />
                      <strong>{item.name}</strong>
                    </div>
                  </td>

                  <td className="center-cell">{item.attended}</td>
                  <td className="center-cell">{item.win}</td>
                  <td className="center-cell">{item.lost}</td>

                  <td className="center-cell">{item.total}</td>
                  <td className="center-cell">{item.average}</td>

                  <td>
                    <span
                      className={`rank ${
                        item.rank === "87%"
                          ? "rank-yellow"
                          : item.rank === "82%"
                          ? "rank-green"
                          : "rank-purple"
                      }`}
                    >
                      {item.rank}
                    </span>
                  </td>

                  <td>
                    <MoreButton />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          <Pagination />
          <PageSelector />
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   MAIN REPORT PAGE
========================================================= */

export default function Report() {
  return (
    <div className="report-module">
      <ClientReport />

      <ExpenseReport />

      <DealingInformation />
    </div>
  );
}