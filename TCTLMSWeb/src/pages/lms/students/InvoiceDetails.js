import React, { useState, useEffect } from "react";
import {
  BlockHead,
  BlockTitle,
  Button,
  Icon,
  BlockDes,
  BlockHeadContent,
  Block,
  BlockBetween,
} from "../../../components/Component";
import Content from "../../../layout/content/Content";
import Head from "../../../layout/head/Head";
import LogoDark from "../../../images/TCTLoginPageLogo.png";
import { Link, useLocation } from "react-router-dom";
import { getstudentinvoicebyid } from "../../../apiservices/ScheduleService";
import { QRCodeSVG } from "qrcode.react"; // npm install qrcode.react

const InvoiceDetails = () => {
  const [data, setData] = useState();
  const [studentName, setStudentName] = useState("");
  const [tutorName, setTutorName] = useState("");
  const [userCode, setUserCode] = useState("");
  const [grade, setGrade] = useState("");
  const [board, setBoard] = useState("");
  const [previousMonthTotalClasses, setPreviousMonthTotalClasses] = useState("");
  const [currentMonthName, setCurrentMonthName] = useState("");
  const [previousMonthPendingClassesMonthYear, setPreviousMonthPendingClassesMonthYear] = useState("");
  const [previousMonthPendingClasses, setPreviousMonthPendingClasses] = useState("");
  const [previousMonthPendingAmount, setPreviousMonthPendingAmount] = useState("");
  const [longDate, setLongDate] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [grandTotalAmount, setGrandTotalAmount] = useState("");
  const [paymentUrl, setPaymentUrl] = useState(null); // ← NEW

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const from = queryParams.get("from");
  const invNumber = queryParams.get("invNumber");

  const redirectUrl =
    from === "payroll"
      ? `${process.env.PUBLIC_URL}/tct-student-payroll-list`
      : `${process.env.PUBLIC_URL}/tct-student-invoice-list`;

  useEffect(() => {
    getstudentinvoicebyid(invNumber)
      .then((response) => {
        const rawData = response.data?.data || response.data || [];

        if (!Array.isArray(rawData) || rawData.length === 0) {
          console.warn("No data returned:", response.data);
          return;
        }

        const sortedData = rawData.sort((a, b) => new Date(a.scheduleDate) - new Date(b.scheduleDate));

        setData(sortedData);
        setStudentName(sortedData[0]?.studentName || "N/A");
        setTutorName(sortedData[0]?.tutorName || "N/A");
        setUserCode(sortedData[0]?.userCode || "N/A");
        setGrade(sortedData[0]?.grade || "N/A");
        setBoard(sortedData[0]?.board || "N/A");
        setLongDate(formatDate(sortedData[0].createdDate));
        setCurrentMonthName(sortedData[0].invoicePeriod);
        setPreviousMonthTotalClasses(sortedData[0].previousMonthTotalClasses || 0);
        setPreviousMonthPendingClasses(sortedData[0].previousMonthPendingClasses || 0);
        setPreviousMonthPendingClassesMonthYear(sortedData[0].previousMonthPendingClassesMonthYear || "N/A");

        // ── NEW: read paymentURL (capital URL as seen in network tab) ──
        const url = sortedData[0]?.paymentURL || sortedData[0]?.paymentUrl || null;
        setPaymentUrl(url);

        const currentMonthTotal = sortedData.reduce((sum, item) => sum + (item.parentSubjectPayment || 0), 0);
        const pendingAmount = (sortedData[0].parentSubjectPayment || 0) * (sortedData[0].previousMonthPendingClasses || 0);
        const grandTotal = currentMonthTotal - pendingAmount;

        setPreviousMonthPendingAmount(new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(-pendingAmount));
        setTotalAmount(new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(currentMonthTotal));
        setGrandTotalAmount(new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(grandTotal));
      })
      .catch((err) => {
        console.error("Error fetching data:", err);
      });
  }, [invNumber]);

  const formatDate = (date) => {
    const options = { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true };
    return new Intl.DateTimeFormat("en-US", options).format(new Date(date));
  };

  const formatShortDate = (date) => {
    const options = { day: "2-digit", month: "short", year: "numeric" };
    return new Intl.DateTimeFormat("en-US", options).format(new Date(date));
  };

  const formatTime = (date) => {
    const options = { hour: "2-digit", minute: "2-digit", hour12: true };
    return new Intl.DateTimeFormat("en-US", options).format(new Date(date));
  };

  const completedClasses = previousMonthTotalClasses - previousMonthPendingClasses;
  const completionRate = previousMonthTotalClasses > 0 ? Math.round((completedClasses / previousMonthTotalClasses) * 100) : 0;

  const getCompletionRateColor = (rate) => rate < 60 ? '#dc2626' : '#059669';
  const getCompletionRateGradient = (rate) => {
    const color = rate < 60 ? '#dc2626' : '#10b981';
    return `conic-gradient(${color} 0deg ${(rate * 3.6)}deg, #e5e7eb ${(rate * 3.6)}deg 360deg)`;
  };

  return (
    <React.Fragment>
      <Head title="Invoice Detail"></Head>
      <Content>
        <BlockHead>
          <BlockBetween className="g-3">
            <BlockHeadContent>
              <BlockTitle>{studentName}'s Invoice for {currentMonthName}</BlockTitle>
              <BlockTitle>
                <span><strong className="text-primary small">#{invNumber}</strong></span>
              </BlockTitle>
              <BlockDes className="text-soft">
                <ul className="list-inline">
                  <li>Created Date: <span className="text-base">{longDate}</span></li>
                </ul>
              </BlockDes>
            </BlockHeadContent>
            <BlockHeadContent>
              {from === "Accounts" && (
                <Link to={redirectUrl}>
                  <Button color="light" outline className="bg-white d-none d-sm-inline-flex">
                    <Icon name="arrow-left"></Icon>
                    <span>Back</span>
                  </Button>
                </Link>
              )}
              <Link to={redirectUrl}>
                <Button color="light" outline className="btn-icon bg-white d-inline-flex d-sm-none">
                  <Icon name="arrow-left"></Icon>
                </Button>
              </Link>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        <Block>
          <div className="invoice">
            <div className="invoice-action">
              <Button
                size="lg"
                color="primary"
                outline
                className="btn-icon btn-white btn-dim"
                //onClick={() => window.print()}

                onClick={() => window.open(
    `${process.env.PUBLIC_URL}/lms/students/invoice-print?invNumber=${invNumber}`,
    '_blank'
  )}
              >
                <Icon name="printer-fill"></Icon>
              </Button>
            </div>
            <div className="invoice-wrap">
              <div className="invoice-brand text-center">
                <img src={LogoDark} alt="" />
              </div>
              <div className="invoice-bills">
                <div className="table-responsive">
                  <div className="invoice-stats-section">
                    <div className="stats-header">
                      <h5 className="stats-title">{previousMonthPendingClassesMonthYear}</h5>
                      <p className="stats-subtitle">Previous Month Class Summary</p>
                    </div>
                    <div className="stats-grid">
                      <div className="stat-card stat-total">
                        <div className="stat-icon"><Icon name="calendar"></Icon></div>
                        <div className="stat-content">
                          <span className="stat-label">Total Classes</span>
                          <h4 className="stat-value">{previousMonthTotalClasses}</h4>
                          <span className="stat-description">Scheduled sessions</span>
                        </div>
                      </div>
                      <div className="stat-card stat-completed">
                        <div className="stat-icon"><Icon name="check-circle"></Icon></div>
                        <div className="stat-content">
                          <span className="stat-label">Completed</span>
                          <h4 className="stat-value">{completedClasses}</h4>
                          <span className="stat-description">Successfully finished</span>
                        </div>
                      </div>
                      <div className="stat-card stat-pending">
                        <div className="stat-icon"><Icon name="clock"></Icon></div>
                        <div className="stat-content">
                          <span className="stat-label">Pending</span>
                          <h4 className="stat-value" style={{ color: previousMonthPendingClasses > 0 ? '#dc2626' : 'inherit' }}>
                            {previousMonthPendingClasses}
                          </h4>
                          <span className="stat-description">Requires attention</span>
                        </div>
                      </div>
                      <div className="stat-card stat-completion">
                        <div className="completion-rate">
                          <div className="progress-circle">
                            <div className="progress-fill" style={{ background: getCompletionRateGradient(completionRate) }}>
                              <span className="progress-percentage" style={{ color: getCompletionRateColor(completionRate) }}>
                                {completionRate}%
                              </span>
                            </div>
                          </div>
                          <div className="completion-text">
                            <span className="stat-label">Completion Rate</span>
                            <h4 className="stat-value" style={{ color: getCompletionRateColor(completionRate) }}>{completionRate}%</h4>
                            <span className="stat-description">{completedClasses} of {previousMonthTotalClasses} completed</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="invoice-info-section">
                    <div className="invoice-info-header">
                      <h5 className="info-title">Session Details</h5>
                    </div>
                    <div className="invoice-info-grid">
                      <div className="info-item">
                        <span className="info-label">Tutor</span>
                        <span className="info-value">{tutorName} ({userCode})</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Grade</span>
                        <span className="info-value">{grade}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Board</span>
                        <span className="info-value">{board}</span>
                      </div>
                    </div>
                  </div>

                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th className="w-250px">Subject</th>
                        <th className="w-220px">Schedule Date</th>
                        <th className="w-250px">Schedule Time</th>
                        <th className="w-80px">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data && data.length > 0 ? (
                        data.map((item, index) => (
                          <tr key={index}>
                            <td>{item.subject}</td>
                            <td>{formatShortDate(item.scheduleDate)}</td>
                            <td>{formatTime(item.scheduleStartTime)} - {formatTime(item.scheduleEndTime)}</td>
                            <td>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.parentSubjectPayment)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan="4" className="text-center">No data available</td></tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="2"></td>
                        <td>Total</td>
                        <td>{totalAmount}</td>
                      </tr>
                      <tr>
                        <td colSpan="2"></td>
                        <td>Last Month Adjustments</td>
                        <td style={{ color: previousMonthPendingClasses > 0 ? 'red' : 'inherit' }}>{previousMonthPendingAmount}</td>
                      </tr>
                      <tr>
                        <td colSpan="2"></td>
                        <td>Grand Total</td>
                        <td>{grandTotalAmount}</td>
                      </tr>
                    </tfoot>
                  </table>

                  <div className="nk-notes ff-italic fs-12px text-soft">
                    Invoice was created on a computer and is valid without the signature and seal.
                  </div>

                  {/* ── QR Code section — shown when paymentUrl exists ── */}
                  {paymentUrl && (
                    <div className="qr-payment-section">
                      <div className="qr-payment-card">
                        <div className="qr-payment-left">
                          <div className="qr-payment-title">Scan to Pay</div>
                          <div className="qr-payment-subtitle">Use any UPI or banking app to scan and pay instantly</div>
                          <div className="qr-payment-amount">{grandTotalAmount}</div>
                          <a href={paymentUrl} target="_blank" rel="noopener noreferrer" className="qr-payment-link">
                            Or click to open payment page ↗
                          </a>
                        </div>
                        <div className="qr-payment-right">
                          <div className="qr-payment-border">
                            <QRCodeSVG
                              value={paymentUrl}
                              size={130}
                              level="H"
                              includeMargin={true}
                            />
                          </div>
                          <div className="qr-powered">Powered by Stripe</div>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          </div>
        </Block>
      </Content>

      <style jsx>{`
        /* ── QR Payment Section ── */
        .qr-payment-section {
          margin-top: 2rem;
          display: flex;
          justify-content: center;
        }
        .qr-payment-card {
          display: flex;
          align-items: center;
          gap: 2rem;
          background: #f0fdf4;
          border: 2px solid #7CB342;
          border-radius: 12px;
          padding: 1.5rem 2rem;
          width: 100%;
          max-width: 600px;
        }
        .qr-payment-left {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .qr-payment-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: #7CB342;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .qr-payment-subtitle {
          font-size: 0.82rem;
          color: #555;
          line-height: 1.4;
        }
        .qr-payment-amount {
          font-size: 1.4rem;
          font-weight: 700;
          color: #1e293b;
          margin-top: 4px;
        }
        .qr-payment-link {
          font-size: 0.8rem;
          color: #7CB342;
          text-decoration: none;
          margin-top: 4px;
        }
        .qr-payment-link:hover {
          text-decoration: underline;
        }
        .qr-payment-right {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }
        .qr-payment-border {
          border: 2px solid #7CB342;
          border-radius: 8px;
          padding: 6px;
          background: #fff;
        }
        .qr-powered {
          font-size: 10px;
          color: #aaa;
          font-style: italic;
        }

        /* ── Print: hide QR section on print (TCTInvoicePrint handles print version) ── */
        @media print {
          .qr-payment-section { display: none !important; }
          .nk-header, .nk-sidebar, .nk-footer, .invoice-action, .nk-block-head, .btn { display: none !important; }
          .nk-content { padding: 0 !important; }
          .invoice { box-shadow: none !important; border: none !important; }
        }

        /* ── existing styles unchanged below ── */
        .invoice-info-section { margin-top: 1.5rem; margin-bottom: 2rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; }
        .invoice-info-header { text-align: center; margin-bottom: 1rem; }
        .info-title { font-size: 1.25rem; font-weight: 700; color: #1e293b; margin-bottom: 0.25rem; }
        .invoice-info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; justify-items: center; }
        .info-item { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 0.75rem; background: white; border: 1px solid #e2e8f0; border-radius: 8px; min-width: 180px; }
        .info-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 0.5rem; }
        .info-value { font-size: 1rem; font-weight: 600; color: #1e293b; }
        .invoice-stats-section { margin-top: 2rem; display: flex; flex-direction: column; align-items: center; }
        .stats-header { text-align: center; margin-bottom: 1.5rem; }
        .stats-title { font-size: 1.5rem; font-weight: 700; color: #1e293b; margin-bottom: 0.25rem; }
        .stats-subtitle { color: #64748b; font-size: 0.9rem; margin: 0; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; width: 100%; max-width: 1200px; justify-items: center; }
        .stat-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; display: flex; align-items: center; gap: 1rem; transition: all 0.3s ease; position: relative; overflow: hidden; }
        .stat-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: #e2e8f0; }
        .stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .stat-total { background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border-color: #93c5fd; }
        .stat-total::before { background: linear-gradient(90deg, #3b82f6, #1d4ed8); }
        .stat-completed { background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border-color: #86efac; }
        .stat-completed::before { background: linear-gradient(90deg, #10b981, #059669); }
        .stat-pending { background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border-color: #fca5a5; }
        .stat-pending::before { background: linear-gradient(90deg, #ef4444, #dc2626); }
        .stat-icon { width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; flex-shrink: 0; }
        .stat-total .stat-icon { background: rgba(59,130,246,0.1); color: #1d4ed8; }
        .stat-completed .stat-icon { background: rgba(16,185,129,0.1); color: #059669; }
        .stat-pending .stat-icon { background: rgba(239,68,68,0.1); color: #dc2626; }
        .stat-content { flex: 1; min-width: 0; }
        .stat-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 0.25rem; display: block; }
        .stat-value { font-size: 1.75rem; font-weight: 700; line-height: 1; margin-bottom: 0.25rem; color: #1e293b; }
        .stat-description { font-size: 0.8rem; color: #64748b; }
        .completion-rate { display: flex; align-items: center; gap: 1rem; width: 100%; }
        .progress-circle { width: 48px; height: 48px; position: relative; flex-shrink: 0; }
        .progress-fill { width: 100%; height: 100%; border-radius: 50%; display: flex; align-items: center; justify-content: center; position: relative; }
        .progress-fill::before { content: ''; position: absolute; width: 32px; height: 32px; background: white; border-radius: 50%; }
        .progress-percentage { font-size: 0.75rem; font-weight: 700; z-index: 1; position: relative; }
        .completion-text { display: flex; flex-direction: column; gap: 0.25rem; flex: 1; min-width: 0; }
        @media (max-width: 1200px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 768px) { .invoice-info-grid { grid-template-columns: 1fr; } .stats-grid { grid-template-columns: 1fr; } .stat-card { flex-direction: column; text-align: center; } .stat-value { font-size: 1.5rem; } .completion-rate { flex-direction: column; text-align: center; } .qr-payment-card { flex-direction: column; text-align: center; } }
      `}</style>
    </React.Fragment>
  );
};

export default InvoiceDetails;
