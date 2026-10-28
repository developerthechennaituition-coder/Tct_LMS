import React from "react";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import "./CryptoDashboard.css";

const ordersData = [
  { date: "19 Dec", buy: 1800, sell: 1200 },
  { date: "20 Dec", buy: 2600, sell: 2100 },
  { date: "21 Dec", buy: 1900, sell: 1500 },
  { date: "22 Dec", buy: 4200, sell: 1100 },
  { date: "23 Dec", buy: 2500, sell: 1600 },
  { date: "24 Dec", buy: 3000, sell: 2300 },
  { date: "25 Dec", buy: 1800, sell: 1700 },
  { date: "26 Dec", buy: 4200, sell: 1100 },
  { date: "27 Dec", buy: 2200, sell: 1800 },
  { date: "28 Dec", buy: 2600, sell: 1700 },
  { date: "29 Dec", buy: 3500, sell: 1300 },
  { date: "30 Dec", buy: 2400, sell: 1700 },
  { date: "31 Dec", buy: 2900, sell: 2100 },
  { date: "01 Jan", buy: 3100, sell: 1800 },
];

const coinData = [
  {
    name: "Bitcoin",
    value: 52,
    className: "coin-bitcoin",
  },
  {
    name: "Ethereum",
    value: 40,
    className: "coin-ethereum",
  },
  {
    name: "NioCoin",
    value: 48,
    className: "coin-niocoin",
  },
  {
    name: "Litecoin",
    value: 72,
    className: "coin-litecoin",
  },
  {
    name: "Bitcoin Cash",
    value: 45,
    className: "coin-bitcoin-cash",
  },
];

const activities = [
  {
    type: "buy",
    coin: "₿",
    title: "Buy Bitcoin",
    date: "02/10/2020",
    time: "11:37 PM",
    ref: "RE2309232",
    usd: "4,565.75 USD",
    amount: "+ 0.2040 BTC",
  },
  {
    type: "buy",
    coin: "♦",
    title: "Buy Ethereum",
    date: "02/10/2020",
    time: "10:37 PM",
    ref: "RE2309232",
    usd: "2,039.39 USD",
    amount: "+ 0.1260 BTC",
  },
  {
    type: "sell",
    coin: "₿",
    title: "Sell Bitcoin",
    date: "02/10/2020",
    time: "10:45 PM",
    ref: "RE2309232",
    usd: "9,285.71 USD",
    amount: "+ 0.9475 BTC",
  },
  {
    type: "sell",
    coin: "♦",
    title: "Sell Ethereum",
    date: "02/11/2020",
    time: "10:25 PM",
    ref: "RE2309232",
    usd: "12,596.75 USD",
    amount: "+ 1.0250 BTC",
  },
  {
    type: "buy",
    coin: "₿",
    title: "Buy Bitcoin",
    date: "02/10/2020",
    time: "10:12 PM",
    ref: "RE2309232",
    usd: "400.00 USD",
    amount: "+ 0.00056 BTC",
  },
  {
    type: "sell",
    coin: "♦",
    title: "Sell Ethereum",
    date: "02/09/2020",
    time: "05:15 PM",
    ref: "RE2309232",
    usd: "6,246.50 USD",
    amount: "+ 0.02575 BTC",
  },
];

const userActivityData = [
  { day: "1", direct: 35, referral: 15 },
  { day: "2", direct: 20, referral: 25 },
  { day: "3", direct: 32, referral: 18 },
  { day: "4", direct: 20, referral: 28 },
  { day: "5", direct: 40, referral: 22 },
  { day: "6", direct: 30, referral: 17 },
  { day: "7", direct: 35, referral: 25 },
  { day: "8", direct: 22, referral: 18 },
  { day: "9", direct: 38, referral: 28 },
  { day: "10", direct: 27, referral: 20 },
  { day: "11", direct: 42, referral: 23 },
  { day: "12", direct: 30, referral: 18 },
  { day: "13", direct: 40, referral: 30 },
  { day: "14", direct: 32, referral: 20 },
];

function MoreButton() {
  return (
    <button type="button" className="crypto-more-btn" aria-label="More">
      •••
    </button>
  );
}

function CoinIcon({ type }) {
  return (
    <span className={`crypto-coin-icon ${type}`}>
      {type === "bitcoin" ? "₿" : "♦"}
    </span>
  );
}

function CryptoDashboard() {
  return (
    <>
      <Head title="Crypto Dashboard" />

      <Content>
        <div className="crypto-dashboard">

          {/* =========================
              PAGE HEADER
          ========================== */}
          <div className="crypto-page-header">
            <div>
              <h2 className="crypto-page-title">Overview</h2>
              <p className="crypto-page-subtitle">
                Welcome to Crypto Buy/Sell Platform.
              </p>
            </div>

            <div className="crypto-header-actions">
              <button type="button" className="crypto-outline-btn">
                <span>⇩</span>
                Export
              </button>

              <button type="button" className="crypto-outline-btn">
                <span>▣</span>
                Reports
              </button>

              <button type="button" className="crypto-add-btn">
                +
              </button>
            </div>
          </div>

          {/* =========================
              TOP SECTION
          ========================== */}
          <div className="crypto-top-grid">

            {/* ORDERS OVERVIEW */}
            <section className="crypto-card orders-card">

              <div className="crypto-card-header">
                <div>
                  <h3>Orders Overview</h3>
                  <p>
                    In last 15 days buy and sells overview.
                    <span> Detailed Stats</span>
                  </p>
                </div>

                <MoreButton />
              </div>

              <div className="orders-content">

                <div className="orders-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={ordersData}
                      margin={{
                        top: 15,
                        right: 5,
                        left: 0,
                        bottom: 5,
                      }}
                      barGap={3}
                    >
                      <CartesianGrid
                        strokeDasharray="0"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="date"
                        tick={{
                          fontSize: 9,
                        }}
                        tickLine={false}
                        axisLine={false}
                      />

                      <YAxis
                        tick={{
                          fontSize: 9,
                        }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `$${value}`}
                      />

                      <Tooltip />

                      <Bar
                        dataKey="buy"
                        fill="#8be0c3"
                        radius={[1, 1, 0, 0]}
                        barSize={8}
                      />

                      <Bar
                        dataKey="sell"
                        fill="#9aaaf8"
                        radius={[1, 1, 0, 0]}
                        barSize={8}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="orders-summary">

                  <div className="order-summary-box buy-summary">
                    <div className="summary-value">
                      12,954.63
                      <span> USD</span>
                    </div>

                    <div className="summary-last">
                      Last month 39,485 USD
                    </div>

                    <div className="summary-type">
                      <span className="summary-icon buy-icon">
                        ↙
                      </span>
                      Buy Orders
                    </div>
                  </div>

                  <div className="order-summary-box sell-summary">
                    <div className="summary-value">
                      12,954.63
                      <span> USD</span>
                    </div>

                    <div className="summary-last">
                      Last month 39,485 USD
                    </div>

                    <div className="summary-type">
                      <span className="summary-icon sell-icon">
                        ↗
                      </span>
                      Sell Orders
                    </div>
                  </div>

                </div>
              </div>
            </section>

            {/* ACTION CENTER */}
            <section className="crypto-card action-card">

              <div className="crypto-card-header">
                <div>
                  <h3>Action Center</h3>
                </div>

                <MoreButton />
              </div>

              <div className="action-list">

                <div className="action-item">
                  <div className="action-icon">▰</div>

                  <div className="action-content">
                    <h4>Pending Buy/Sell Orders</h4>
                    <p>
                      We have still <strong>40 buy orders</strong> and{" "}
                      <strong>12 sell orders</strong>, that need to review
                      & take necessary action.
                    </p>
                  </div>

                  <span className="action-arrow">›</span>
                </div>

                <div className="action-item">
                  <div className="action-icon">?</div>

                  <div className="action-content">
                    <h4>Support Messages</h4>
                    <p>
                      Here is <strong>18 new support message.</strong>
                    </p>
                  </div>

                  <span className="action-arrow">›</span>
                </div>

                <div className="action-item">
                  <div className="action-icon">▱</div>

                  <div className="action-content">
                    <h4>Upcoming Deposit</h4>
                    <p>
                      Here is <strong>7 upcoming deposit</strong> need to
                      review.
                    </p>
                  </div>

                  <span className="action-arrow">›</span>
                </div>

              </div>
            </section>
          </div>

          {/* =========================
              SECOND SECTION
          ========================== */}
          <div className="crypto-main-grid">

            {/* ORDERS ACTIVITIES */}
            <section className="crypto-card activities-card">

              <div className="crypto-card-header">
                <div className="title-with-link">
                  <h3>Orders Activities</h3>
                  <span>See History</span>
                </div>

                <div className="activity-filters">
                  <button type="button">Buy</button>
                  <button type="button">Sell</button>
                  <button type="button" className="active">
                    All
                  </button>
                </div>
              </div>

              <div className="crypto-table-wrapper">

                <table className="crypto-table">

                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Desc</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Ref</th>
                      <th>USD Amount</th>
                      <th>Amount</th>
                    </tr>
                  </thead>

                  <tbody>
                    {activities.map((item, index) => (
                      <tr key={index}>

                        <td>
                          <div className="type-icons">
                            <span
                              className={
                                item.type === "buy"
                                  ? "type-arrow buy"
                                  : "type-arrow sell"
                              }
                            >
                              {item.type === "buy" ? "↙" : "↗"}
                            </span>

                            <CoinIcon
                              type={
                                item.coin === "₿"
                                  ? "bitcoin"
                                  : "ethereum"
                              }
                            />
                          </div>
                        </td>

                        <td>
                          <span className="activity-name">
                            {item.title}
                          </span>
                        </td>

                        <td>{item.date}</td>

                        <td>{item.time}</td>

                        <td>
                          <span className="reference">
                            {item.ref}
                          </span>
                        </td>

                        <td>{item.usd}</td>

                        <td>{item.amount}</td>

                      </tr>
                    ))}
                  </tbody>

                </table>

              </div>
            </section>

            {/* RIGHT COLUMN */}
            <div className="crypto-right-column">

              {/* TOP COIN */}
              <section className="crypto-card top-coin-card">

                <div className="crypto-card-header">
                  <div>
                    <h3>Top Coin in Orders</h3>
                    <p>
                      In last 15 days buy and sells overview.
                    </p>
                  </div>

                  <MoreButton />
                </div>

                <div className="coin-chart">

                  <div className="coin-bars">

                    {coinData.map((coin) => (
                      <div
                        className="coin-bar-row"
                        key={coin.name}
                      >
                        <div className="coin-bar">
                          <span
                            className={coin.className}
                            style={{
                              width: `${coin.value}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}

                  </div>

                  <div className="coin-legend">
                    {coinData.map((coin) => (
                      <div
                        className="coin-legend-item"
                        key={coin.name}
                      >
                        <span
                          className={`legend-dot ${coin.className}`}
                        />

                        <span>{coin.name}</span>
                      </div>
                    ))}
                  </div>

                </div>
              </section>

              {/* USER ACTIVITIES */}
              <section className="crypto-card user-activity-card">

                <div className="crypto-card-header">
                  <div>
                    <h3>User Activities</h3>
                    <p>
                      In last 30 days
                      <span className="info-circle">i</span>
                    </p>
                  </div>

                  <MoreButton />
                </div>

                <div className="user-stats">

                  <div className="user-stat">
                    <div className="user-stat-top">
                      <span className="user-icon">♙</span>
                      <strong>345</strong>
                    </div>

                    <span>Direct Join</span>
                  </div>

                  <div className="mini-line">
                    <svg
                      viewBox="0 0 100 30"
                      preserveAspectRatio="none"
                    >
                      <polyline
                        points="0,20 10,10 20,23 30,8 40,18 50,7 60,20 70,9 80,18 90,5 100,15"
                        fill="none"
                        stroke="#9caaff"
                        strokeWidth="2"
                      />
                    </svg>
                  </div>

                  <div className="user-stat">
                    <div className="user-stat-top">
                      <span className="user-icon">♙</span>
                      <strong>49</strong>
                    </div>

                    <span>Referral Join</span>
                  </div>

                  <div className="mini-line">
                    <svg
                      viewBox="0 0 100 30"
                      preserveAspectRatio="none"
                    >
                      <polyline
                        points="0,18 10,8 20,20 30,12 40,22 50,10 60,18 70,8 80,21 90,12 100,17"
                        fill="none"
                        stroke="#b3bdfd"
                        strokeWidth="2"
                      />
                    </svg>
                  </div>

                </div>

                <div className="user-chart">
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <BarChart data={userActivityData}>
                      <XAxis
                        dataKey="day"
                        hide
                      />

                      <YAxis hide />

                      <Tooltip />

                      <Bar
                        dataKey="direct"
                        stackId="users"
                        fill="#9aaaf8"
                        barSize={13}
                      />

                      <Bar
                        dataKey="referral"
                        stackId="users"
                        fill="#d5dbfb"
                        barSize={13}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

              </section>

            </div>
          </div>

        </div>
      </Content>
    </>
  );
}

export default CryptoDashboard;