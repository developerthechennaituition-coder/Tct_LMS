import React from "react";
import "./InvestmentDashboard.css";

const plans = [
  {
    name: "Starter Plan",
    value: 58,
    color: "#8547ff",
  },
  {
    name: "Silver Plan",
    value: 18.49,
    color: "#ff914d",
  },
  {
    name: "Diamond Plan",
    value: 16,
    color: "#19c39a",
  },
  {
    name: "Platinum Plan",
    value: 29,
    color: "#f65396",
  },
  {
    name: "Vibranium Plan",
    value: 33,
    color: "#287cff",
  },
];

const activities = [
  {
    initials: "KJ",
    name: "Keith Jensen",
    action: "requested to Withdraw.",
    time: "2 hours ago",
    avatarClass: "avatar-orange",
  },
  {
    initials: "HS",
    name: "Harry Simpson",
    action: "placed an Order.",
    time: "2 hours ago",
    avatarClass: "avatar-yellow",
  },
  {
    initials: "SM",
    name: "Stephanie Marshall",
    action: "got a huge bonus.",
    time: "2 hours ago",
    avatarClass: "avatar-blue",
  },
  {
    initials: "NC",
    name: "Nicholas Carr",
    action: "deposited funds.",
    time: "2 hours ago",
    avatarClass: "avatar-gray",
  },
  {
    initials: "TM",
    name: "Timothy Moreno",
    action: "placed an Order.",
    time: "2 hours ago",
    avatarClass: "avatar-pink",
  },
];

const investments = [
  {
    plan: "P1",
    planName: "Silver - Daily 4.76% for 21 Days",
    initials: "JC",
    name: "Janice Carroll",
    date: "18/10/2019",
    amount: "1.094780 BTC",
    status: "Processing",
    avatarClass: "person-pink",
  },
  {
    plan: "P2",
    planName: "Diamond - Daily 9.52% for 14 Days",
    initials: "VA",
    name: "Victoria Aguilar",
    date: "18/10/2019",
    amount: "1.094780 BTC",
    status: "Completed",
    avatarClass: "person-blue",
  },
  {
    plan: "P3",
    planName: "Platinum - Daily 14.82% for 7 Days",
    initials: "EH",
    name: "Emma Henry",
    date: "18/10/2019",
    amount: "1.094780 BTC",
    status: "Completed",
    avatarClass: "person-purple",
  },
  {
    plan: "P1",
    planName: "Silver - Daily 4.76% for 21 Days",
    initials: "AF",
    name: "Alice Ford",
    date: "18/10/2019",
    amount: "1.094780 BTC",
    status: "Completed",
    avatarClass: "person-green",
  },
  {
    plan: "P3",
    planName: "Platinum - Daily 14.82% for 7 Days",
    initials: "HW",
    name: "Harold Walker",
    date: "18/10/2019",
    amount: "1.094780 BTC",
    status: "Completed",
    avatarClass: "person-orange",
  },
];

const bars = [
  30, 44, 38, 54, 28, 48, 56, 31, 47, 40, 52, 35, 49, 57, 33, 46, 39, 54,
  36, 50,
];

const notificationItems = [
  {
    date: "13 Nov",
    title: "Submitted KYC Application",
    description: "Re-submitted KYC Application form.",
    time: "09:30am",
  },
  {
    date: "13 Nov",
    title: "Submitted KYC Application",
    description: "Re-submitted KYC Application form.",
    time: "09:30am",
  },
  {
    date: "13 Nov",
    title: "Submitted KYC Application",
    description: "Re-submitted KYC Application form.",
    time: "09:30am",
  },
  {
    date: "13 Nov",
    title: "Submitted KYC Application",
    description: "Re-submitted KYC Application form.",
    time: "09:30am",
  },
];

function Avatar({ initials, className = "" }) {
  return <div className={`investment-avatar ${className}`}>{initials}</div>;
}

function MiniBars({ blue = false }) {
  const values = [30, 45, 39, 52, 25, 48, 55];

  return (
    <div className={`investment-mini-bars ${blue ? "blue-bars" : ""}`}>
      {values.map((height, index) => (
        <span
          key={index}
          style={{
            height: `${height}%`,
          }}
        />
      ))}
    </div>
  );
}

function StatCard({
  title,
  amount,
  percentage,
  percentageClass,
  month,
  week,
  blue,
}) {
  return (
    <div className="investment-stat-card">
      <div className="investment-stat-content">
        <div className="investment-stat-label">{title}</div>

        <div className="investment-stat-amount">
          {amount}

          {percentage && (
            <span className={`investment-percentage ${percentageClass}`}>
              {percentage}
            </span>
          )}
        </div>

        <div className="investment-stat-details">
          <div>
            <span>THIS MONTH</span>
            <strong>{month}</strong>
          </div>

          <div>
            <span>THIS WEEK</span>
            <strong>{week}</strong>
          </div>
        </div>
      </div>

      <MiniBars blue={blue} />
    </div>
  );
}

export default function InvestmentDashboard() {
  return (
    
    <div className="investment-dashboard">
      {/* =====================================================
          PAGE HEADER
      ====================================================== */}
      <div className="investment-page-header">
        <div className="investment-page-title">
          <h1>Investment Dashboard</h1>
          <p>Welcome to Crypto Invest Dashboard</p>
        </div>

        <div className="investment-header-actions">
          <button type="button" className="investment-header-btn">
            <span>⇩</span>
            Export
          </button>

          <button type="button" className="investment-header-btn">
            <span>▣</span>
            Reports
          </button>

          <button type="button" className="investment-add-btn">
            +
          </button>
        </div>
      </div>

      {/* =====================================================
          TOP STATISTICS
      ====================================================== */}
      <div className="investment-stats-grid">
        <StatCard
          title="Total Deposit"
          amount="49,595.34 USD"
          percentage="↑ 1.93%"
          percentageClass="positive"
          month="2,940.59 USD"
          week="1,259.28 USD"
        />

        <StatCard
          title="Total Withdraw"
          amount="49,595.34 USD"
          percentage="↓ 1.93%"
          percentageClass="negative"
          month="2,940.59 USD"
          week="1,259.28 USD"
        />

        <StatCard
          title="Balance in Account"
          amount="79,358.50 USD"
          month="2,940.59 USD"
          week="1,259.28 USD"
          blue
        />
      </div>

      {/* =====================================================
          MIDDLE GRID
      ====================================================== */}
      <div className="investment-middle-grid">
        {/* ================= INVESTMENT OVERVIEW ================= */}
        <section className="investment-panel investment-overview-panel">
          <div className="investment-panel-header">
            <div>
              <h3>Investment Overview</h3>
              <p>
                The investment overview of your platform.
                <span> All Investment</span>
              </p>
            </div>
          </div>

          <div className="investment-tabs">
            <button type="button" className="active">
              Overview
            </button>

            <button type="button">This Year</button>

            <button type="button">All Time</button>
          </div>

          <div className="investment-overview-content">
            <div className="investment-overview-item">
              <span className="overview-label">
                Currently Active Investment
              </span>

              <strong>49,395.395 USD</strong>

              <small>AMOUNT</small>

              <strong className="profit-amount">49,395.395 USD</strong>

              <small>PAID PROFIT</small>
            </div>

            <div className="investment-overview-item investment-plan-count">
              <strong>
                56
                <span className="positive"> ↑ 1.93%</span>
              </strong>

              <small>PLANS</small>
            </div>

            <div className="investment-overview-item">
              <span className="overview-label">
                Investment in this Month
              </span>

              <strong>49,395.395 USD</strong>

              <small>AMOUNT</small>
            </div>

            <div className="investment-overview-item investment-plan-count">
              <strong>
                23
                <span className="negative"> ↓ 1.93%</span>
              </strong>

              <small>PLANS</small>
            </div>
          </div>
        </section>

        {/* ================= TOP INVESTED PLAN ================= */}
        <section className="investment-panel investment-plans-panel">
          <div className="investment-panel-header">
            <div>
              <h3>Top Invested Plan</h3>
              <p>In last 30 days top invested schemes.</p>
            </div>

            <button
              type="button"
              className="investment-more-btn"
              aria-label="More options"
            >
              •••
            </button>
          </div>

          <div className="investment-plans-list">
            {plans.map((plan) => (
              <div className="investment-plan-row" key={plan.name}>
                <div className="investment-plan-label">
                  <span>{plan.name}</span>
                  <small>{plan.value}%</small>
                </div>

                <div className="investment-progress">
                  <div
                    className="investment-progress-value"
                    style={{
                      width: `${plan.value}%`,
                      backgroundColor: plan.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="investment-bottom-bars">
            {bars.map((height, index) => (
              <span
                key={index}
                style={{
                  height: `${height}%`,
                }}
              />
            ))}
          </div>
        </section>

        {/* ================= RECENT ACTIVITIES ================= */}
        <section className="investment-panel investment-activities-panel">
          <div className="investment-panel-heading">
            <h3>Recent Activities</h3>

            <div className="investment-activity-filter">
              <button type="button">Cancel</button>
              <button type="button" className="active">
                All
              </button>
            </div>
          </div>

          <div className="investment-activities-list">
            {activities.map((activity) => (
              <div className="investment-activity-row" key={activity.name}>
                <Avatar
                  initials={activity.initials}
                  className={activity.avatarClass}
                />

                <div className="investment-activity-info">
                  <p>
                    <strong>{activity.name}</strong> {activity.action}
                  </p>

                  <small>{activity.time}</small>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* =====================================================
          BOTTOM GRID
      ====================================================== */}
      <div className="investment-bottom-grid">
        {/* ================= NOTIFICATIONS ================= */}
        <section className="investment-panel investment-notifications">
          <div className="investment-panel-heading">
            <h3>Notifications</h3>

            <button type="button">View All</button>
          </div>

          <div className="investment-notification-body">
            <div className="investment-month-title">November, 2019</div>

            {notificationItems.map((item, index) => (
              <div className="investment-notification-row" key={index}>
                <div className="investment-timeline">
                  <span />
                </div>

                <div className="investment-notification-date">
                  {item.date}
                </div>

                <div className="investment-notification-content">
                  <strong>{item.title}</strong>

                  <p>{item.description}</p>

                  <small>{item.time}</small>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ================= RECENT INVESTMENT ================= */}
        <section className="investment-panel investment-recent-panel">
          <div className="investment-panel-heading">
            <h3>Recent Investment</h3>

            <button type="button">View All</button>
          </div>

          <div className="investment-table-wrapper">
            <table className="investment-table">
              <thead>
                <tr>
                  <th>PLAN</th>
                  <th>WHO</th>
                  <th>DATE</th>
                  <th>AMOUNT</th>
                  <th>STATUS</th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {investments.map((investment, index) => (
                  <tr key={index}>
                    <td>
                      <div className="investment-plan-info">
                        <span className="investment-plan-circle">
                          {investment.plan}
                        </span>

                        <span>{investment.planName}</span>
                      </div>
                    </td>

                    <td>
                      <div className="investment-person-info">
                        <Avatar
                          initials={investment.initials}
                          className={investment.avatarClass}
                        />

                        <span>{investment.name}</span>
                      </div>
                    </td>

                    <td>{investment.date}</td>

                    <td>{investment.amount}</td>

                    <td>
                      {index === 0 ? (
                        <span className="investment-processing-line" />
                      ) : (
                        <span className="investment-status-completed">
                          {investment.status}
                        </span>
                      )}
                    </td>

                    <td>
                      <span className="investment-row-arrow">›</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}