import React, { useEffect, useMemo, useState } from "react";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import { Alert, Badge, Card, Form, FormGroup, Input, Modal, ModalBody, ModalFooter, ModalHeader, Spinner, Table } from "reactstrap";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Block, BlockBetween, BlockHead, BlockHeadContent, BlockTitle, Button, Col, Icon, Row } from "../../../components/Component";
import { getCurrentTutorDashboard, hasTutorCompletedFirstClass, hasTutorFeedbackToday, submitTutorDailyFeedback } from "../../../apiservices/DashboardService";
import { toDateOnly as isoDate } from "../../../library/dashboardDates";

const read = (row, name) => row?.[name] ?? row?.[name.charAt(0).toUpperCase() + name.slice(1)];
const number = (value) => Number(value) || 0;
const dateValue = (value, withTime = false) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return withTime ? date.toLocaleString() : date.toLocaleDateString();
};
const timeValue = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};
const monthValue = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString([], { month: "short", year: "numeric" });
};

const EmptyRow = ({ columns, text = "No records found." }) => (
  <tr><td colSpan={columns} className="text-center text-muted py-4">{text}</td></tr>
);

const StatCard = ({ icon, label, value, color = "primary" }) => (
  <Card className={`card-bordered h-100 tt-stat tt-stat--${color}`}>
    <div className="card-inner d-flex align-items-center">
      <div className={`user-avatar bg-${color}-dim mr-3 tt-stat-icon`}><Icon name={icon} className={`text-${color}`} /></div>
      <div className="tt-stat-body"><div className="fs-24px fw-bold tt-stat-value">{value}</div><div className="text-soft tt-stat-label">{label}</div></div>
    </div>
  </Card>
);

const Section = ({ title, icon, children }) => (
  <Card className="card-bordered h-100 tt-section">
    <div className="card-inner border-bottom tt-section-head"><h6 className="title"><Icon name={icon} className="mr-2" />{title}</h6></div>
    <div className="card-inner p-0 tt-section-body">{children}</div>
  </Card>
);

const TutorDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feelingRating, setFeelingRating] = useState("");
  const [feedbackComments, setFeedbackComments] = useState("");
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const userId = localStorage.getItem("userId");

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const today = new Date();
        const from = new Date(today.getFullYear(), today.getMonth() - 11, 1);
        const to = new Date(today.getFullYear(), today.getMonth() + 2, 0);
        const result = await getCurrentTutorDashboard(isoDate(from), isoDate(to));
        if (active) {
          setDashboard(result);
          // Feedback availability is supplementary and must never prevent the
          // tutor's main dashboard from rendering.
          const [eligibilityResult, submittedResult] = await Promise.allSettled([
            hasTutorCompletedFirstClass(userId),
            hasTutorFeedbackToday(userId),
          ]);
          const eligibility = eligibilityResult.status === "fulfilled" ? eligibilityResult.value : null;
          const submitted = submittedResult.status === "fulfilled" ? submittedResult.value : null;
          if (!active) return;
          setShowFeedback(
            eligibility?.hasCompletedFirstClass === true &&
            submittedResult.status === "fulfilled" &&
            submitted?.hasSubmitted !== true
          );
        }
      } catch (requestError) {
        if (active) setError(requestError?.response?.data?.message || requestError?.message || "Unable to load tutor dashboard.");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [refreshKey, userId]);

  const submitFeedback = async (event) => {
    event.preventDefault();
    if (!feelingRating) return;
    try {
      setFeedbackSaving(true);
      await submitTutorDailyFeedback({ userId, feelingRating, comments: feedbackComments });
      setShowFeedback(false);
    } finally {
      setFeedbackSaving(false);
    }
  };

  const profile = dashboard?.profile || {};
  const summary = dashboard?.summary || {};
  const schedule = dashboard?.schedule || [];
  const subjects = dashboard?.subjects || [];
  const students = dashboard?.students || [];
  const ratings = dashboard?.ratings || [];
  const monthlyHours = dashboard?.monthlyHours || [];
  const cancellations = dashboard?.cancellationHistory || [];
  const demoVideos = dashboard?.demoVideos || [];
  const demoHistory = dashboard?.demoHistory || [];
  const allocationHistory = dashboard?.allocationHistory || [];
  const availability = dashboard?.availability || [];
  const homework = dashboard?.homework || [];

  const upcoming = useMemo(() => schedule
    .filter((item) => new Date(read(item, "classDate")) >= new Date(new Date().setHours(0, 0, 0, 0)))
    .sort((a, b) => new Date(read(a, "classDate")) - new Date(read(b, "classDate"))), [schedule]);

  const chartData = monthlyHours.map((item) => ({
    month: monthValue(read(item, "monthStart")),
    scheduled: number(read(item, "scheduledHours")),
    completed: number(read(item, "completedHours")),
  }));


  return (
    <React.Fragment>
      <Head title="Tutor Dashboard" />
      <Content>
        {/* Tutor dashboard look only (scoped to .tct-tutor-dash); data, handlers and routes unchanged. */}
        <style>{`
          .tct-tutor-dash .nk-block + .nk-block { padding-top: 18px; }
          .tct-tutor-dash .row.mb-4 { margin-bottom: 0 !important; }

          /* Heading banner + action row */
          .tct-tutor-dash .tt-head {
            padding: 18px 22px;
            margin-bottom: 18px;
            background: linear-gradient(120deg, #f3edff 0%, #eef3ff 60%, #e9f7fb 100%);
            border: 1px solid #e6defe;
            border-radius: 14px;
          }
          .tct-tutor-dash .tt-head-row { flex-wrap: wrap; gap: 12px; align-items: center; }
          .tct-tutor-dash .tt-head .nk-block-title { font-size: 22px; font-weight: 700; color: #2c2257; margin-bottom: 2px; }
          .tct-tutor-dash .tt-head .nk-block-des p { font-size: 13px; color: #6c6890; margin: 0; }
          .tct-tutor-dash .tt-head-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; align-items: center; gap: 8px; }
          .tct-tutor-dash .tt-head-actions .btn {
            height: 38px; padding: 0 14px; display: inline-flex; align-items: center; gap: 4px;
            border-radius: 8px; font-size: 13px; font-weight: 600; white-space: nowrap; background: #fff;
          }
          .tct-tutor-dash .tt-head-actions .btn:hover { background: #854fff; color: #fff; }
          .tct-tutor-dash .tt-head-actions .tt-refresh-btn { border-color: #dbdfea; color: #526484; }
          .tct-tutor-dash .tt-head-actions .tt-refresh-btn:hover { border-color: #854fff; background: #fff; color: #854fff; }
          @media (max-width: 767px) {
            .tct-tutor-dash .tt-head-actions { width: 100%; justify-content: stretch; }
            .tct-tutor-dash .tt-head-actions .btn { flex: 1 1 auto; justify-content: center; }
          }

          /* Cards */
          .tct-tutor-dash .card {
            border: 1px solid #e5e9f2;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(31, 43, 58, 0.05);
          }

          /* Stat cards: compact, coloured top edge, gentle lift */
          .tct-tutor-dash .tt-stat { border-top: 3px solid transparent; transition: transform 0.15s ease, box-shadow 0.15s ease; }
          .tct-tutor-dash .tt-stat:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(31, 43, 58, 0.08); }
          .tct-tutor-dash .tt-stat .card-inner { padding: 14px 16px; }
          .tct-tutor-dash .tt-stat-icon { width: 42px; height: 42px; border-radius: 10px; font-size: 18px; }
          .tct-tutor-dash .tt-stat-value { font-size: 22px !important; line-height: 1.2; color: #364a63; }
          .tct-tutor-dash .tt-stat-label { font-size: 12px; font-weight: 500; color: #8094ae !important; }
          .tct-tutor-dash .tt-stat--primary { border-top-color: #854fff; }
          .tct-tutor-dash .tt-stat--info { border-top-color: #09c2de; }
          .tct-tutor-dash .tt-stat--success { border-top-color: #1ee0ac; }
          .tct-tutor-dash .tt-stat--warning { border-top-color: #f4bd0e; }

          /* Profile card + chart */
          .tct-tutor-dash .card-inner { padding: 18px 20px; }
          .tct-tutor-dash .data-list.is-compact .data-item { padding: 10px 4px; }
          .tct-tutor-dash .data-label { font-size: 13px; color: #8094ae; }
          .tct-tutor-dash .data-value { font-size: 14px; color: #364a63; }
          .tct-tutor-dash h6.title { font-size: 15px; font-weight: 600; color: #364a63; }

          /* Sections: header with icon chip, tables scroll inside the card */
          .tct-tutor-dash .tt-section-head { padding: 12px 20px; }
          .tct-tutor-dash .tt-section-head .title { display: flex; align-items: center; margin: 0; }
          .tct-tutor-dash .tt-section-head .title > .icon {
            width: 28px; height: 28px; min-width: 28px;
            display: inline-flex; align-items: center; justify-content: center;
            border-radius: 8px; background: rgba(133, 79, 255, 0.1); color: #854fff;
            font-size: 15px; margin-right: 10px !important;
          }
          .tct-tutor-dash .tt-section-body .table-responsive { max-height: 360px; overflow-y: auto; }
          .tct-tutor-dash .tt-section-body .table-responsive::-webkit-scrollbar { width: 6px; height: 6px; }
          .tct-tutor-dash .tt-section-body .table-responsive::-webkit-scrollbar-thumb { background: #dbdfea; border-radius: 3px; }
          .tct-tutor-dash .tt-section-body .table thead th {
            position: sticky; top: 0; z-index: 1;
            background: #f5f6fa; border-top: 0; border-bottom: 1px solid #e5e9f2;
            padding: 9px 20px; font-size: 11px; font-weight: 600; letter-spacing: 0.04em;
            text-transform: uppercase; color: #8094ae; white-space: nowrap;
          }
          .tct-tutor-dash .tt-section-body .table td {
            padding: 10px 20px; font-size: 13px; color: #526484; vertical-align: middle; border-color: #edf0f5;
          }
          .tct-tutor-dash .tt-section-body .table tbody tr { transition: background-color 0.12s ease; }
          .tct-tutor-dash .tt-section-body .table tbody tr:hover { background-color: #faf7ff; }
          .tct-tutor-dash .tt-section-body .table td a { color: #854fff; font-weight: 600; }
          .tct-tutor-dash .tt-section-body td.text-center.text-muted {
            padding: 28px 20px !important; color: #8094ae !important; background: #fbfcfe;
          }
          .tct-tutor-dash .badge { border-radius: 6px; font-weight: 600; white-space: normal; text-align: left; }
        `}</style>
        <div className="tct-tutor-dash">
        <BlockHead size="sm" className="tt-head">
          <BlockBetween className="tt-head-row">
            <BlockHeadContent>
              <BlockTitle page tag="h3">Tutor Dashboard</BlockTitle>
              <div className="nk-block-des text-soft"><p>Welcome, {read(profile, "tutorName") || "Tutor"}. Here is your teaching overview.</p></div>
            </BlockHeadContent>
            <BlockHeadContent>
              {/* Quick actions live in the heading so they stay reachable even if the data below fails to load. */}
              <div className="tt-head-actions">
                {/* Upload Question Papers / Evaluate Answer Sheets moved to the Mock Exams page. */}
                <button type="button" className="btn btn-outline-primary tt-refresh-btn" disabled={loading} aria-label="Refresh dashboard" onClick={() => setRefreshKey((key) => key + 1)}><Icon name="reload" /><span>{loading ? "Refreshing…" : "Refresh"}</span></button>
              </div>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        {loading && <div role="status" className="text-soft mb-3"><Spinner size="sm" /> Loading dashboard…</div>}
        {error && <Alert color="danger"><Icon name="alert-circle" className="mr-2" />{error}</Alert>}

        {!error && dashboard && <Block>
          <Row className="g-gs mb-4">
            <Col xxl="3" sm="6"><StatCard icon="book" label="Subjects" value={read(summary, "subjectCount") ?? subjects.length} /></Col>
            <Col xxl="3" sm="6"><StatCard icon="users" label="Current students" value={read(summary, "currentStudentCount") ?? students.length} color="info" /></Col>
            <Col xxl="3" sm="6"><StatCard icon="calendar" label="Upcoming classes" value={read(summary, "upcomingClassCount") ?? upcoming.length} color="success" /></Col>
            <Col xxl="3" sm="6"><StatCard icon="star-fill" label="Overall rating" value={`${number(read(summary, "overallRating") || read(profile, "overallRating")).toFixed(1)} / 5`} color="warning" /></Col>
            <Col xxl="3" sm="6"><StatCard icon="calendar-check" label="Extra classes (this month)" value={number(read(summary, "currentMonthExtraClasses"))} color="success" /></Col>
          </Row>

          <Row className="g-gs mb-4">
            <Col xxl="4">
              <Card className="card-bordered h-100"><div className="card-inner">
                <div className="d-flex align-items-center mb-4"><div className="user-avatar bg-primary mr-3"><span>{(read(profile, "tutorName") || "T").charAt(0)}</span></div><div><h5 className="mb-0">{read(profile, "tutorName") || "—"}</h5><span className="text-soft">{read(profile, "userCode") || "Tutor"}</span></div></div>
                <ul className="data-list is-compact">
                  <li className="data-item"><div className="data-col"><span className="data-label">Email</span><span className="data-value">{read(profile, "email") || "—"}</span></div></li>
                  <li className="data-item"><div className="data-col"><span className="data-label">Phone</span><span className="data-value">{read(profile, "phone") || "—"}</span></div></li>
                  <li className="data-item"><div className="data-col"><span className="data-label">Location</span><span className="data-value">{read(profile, "location") || "—"}</span></div></li>
                  <li className="data-item"><div className="data-col"><span className="data-label">Joined</span><span className="data-value">{dateValue(read(profile, "joiningDate"))}</span></div></li>
                </ul>
              </div></Card>
            </Col>
            <Col xxl="8">
              <Card className="card-bordered h-100"><div className="card-inner"><h6 className="title mb-4">Scheduled vs completed hours</h6><div style={{ height: 270 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Legend /><Bar dataKey="scheduled" name="Scheduled hours" fill="#6576ff" radius={[4,4,0,0]} /><Bar dataKey="completed" name="Completed hours" fill="#1ee0ac" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer></div></div></Card>
            </Col>
          </Row>

          <Block>
          <Row className="g-gs mb-4">
            <Col xxl="8"><Section title="Upcoming classes" icon="calendar-alt"><div className="table-responsive"><Table className="table-hover mb-0"><thead><tr><th>Date</th><th>Student</th><th>Subject</th><th>Time</th><th>Status</th><th>Meeting</th></tr></thead><tbody>{upcoming.slice(0, 10).map((item) => <tr key={read(item,"scheduleDetailsId")}><td>{dateValue(read(item,"classDate"))}</td><td>{read(item,"studentName") || "—"}</td><td>{read(item,"subjectName") || "—"}</td><td>{timeValue(read(item,"startTime"))} – {timeValue(read(item,"endTime"))}</td><td><Badge color="primary" pill>{read(item,"tutorStatus") || read(item,"status") || "Scheduled"}</Badge></td><td>{read(item,"meetingLink") ? <a href={read(item,"meetingLink")} target="_blank" rel="noreferrer">Join</a> : "—"}</td></tr>)}{!upcoming.length && <EmptyRow columns={6} text="No upcoming classes." />}</tbody></Table></div></Section></Col>
            <Col xxl="4"><Section title="Subjects and payment" icon="book-read"><div className="table-responsive"><Table className="mb-0"><thead><tr><th>Subject</th><th>Grade</th><th>Rate</th><th>Rating</th></tr></thead><tbody>{subjects.map((item) => <tr key={read(item,"tutorDetailId")}><td>{read(item,"subjectName") || "—"}<small className="d-block text-soft">{read(item,"boardName")}</small></td><td>{read(item,"gradeName") || "—"}</td><td>{read(item,"standardPayment") ?? "—"}</td><td><Icon name="star-fill" className="text-warning mr-1" />{number(read(item,"subjectRating")).toFixed(1)}</td></tr>)}{!subjects.length && <EmptyRow columns={4} />}</tbody></Table></div></Section></Col>
          </Row>

          <Row className="g-gs mb-4">
            <Col xxl="7"><Section title="Current students" icon="users"><div className="table-responsive"><Table className="table-hover mb-0"><thead><tr><th>Student</th><th>Subject</th><th>Board / grade</th><th>Payment</th></tr></thead><tbody>{students.map((item) => <tr key={read(item,"allocationId")}><td>{read(item,"studentName") || "—"}<small className="d-block text-soft">{read(item,"studentCode")}</small></td><td>{read(item,"subjectName") || "—"}</td><td>{read(item,"boardName") || "—"} / {read(item,"gradeName") || "—"}</td><td>{read(item,"paymentAmount") ?? "—"}</td></tr>)}{!students.length && <EmptyRow columns={4} />}</tbody></Table></div></Section></Col>
            <Col xxl="5"><Section title="Recent ratings" icon="star"><div className="table-responsive"><Table className="mb-0"><thead><tr><th>From</th><th>Rating</th><th>Feedback</th><th>Date</th></tr></thead><tbody>{ratings.slice(0,8).map((item) => <tr key={read(item,"ratingId")}><td>{read(item,"raterName") || "Parent / Student"}</td><td><Badge color="warning">{read(item,"rating")} / 5</Badge></td><td className="text-wrap">{read(item,"feedback") || "—"}</td><td>{dateValue(read(item,"ratedAt"))}</td></tr>)}{!ratings.length && <EmptyRow columns={4} />}</tbody></Table></div></Section></Col>
          </Row>

          <Row className="g-gs mb-4">
            <Col xxl="6"><Section title="Cancellation history" icon="calendar-times"><div className="table-responsive"><Table className="mb-0"><thead><tr><th>Month</th><th>Scheduled</th><th>Tutor</th><th>Student</th><th>Tutor ratio</th></tr></thead><tbody>{cancellations.map((item,index) => <tr key={`${read(item,"monthStart")}-${index}`}><td>{monthValue(read(item,"monthStart"))}</td><td>{read(item,"scheduledClasses")}</td><td>{read(item,"tutorCancellations")}</td><td>{read(item,"studentCancellations")}</td><td>{number(read(item,"tutorCancellationPercent")).toFixed(1)}%</td></tr>)}{!cancellations.length && <EmptyRow columns={5} />}</tbody></Table></div></Section></Col>
            <Col xxl="6"><Section title="Availability" icon="clock"><div className="table-responsive"><Table className="mb-0"><thead><tr><th>Day</th><th>Time</th><th>Type</th><th>Available</th></tr></thead><tbody>{availability.map((item,index) => <tr key={read(item,"availabilityId") || read(item,"exceptionId") || index}><td>{read(item,"dayOfWeek") || "Specific date"}</td><td>{timeValue(read(item,"startTime"))} – {timeValue(read(item,"endTime"))}</td><td>{read(item,"sourceType")}</td><td><Badge color={read(item,"isAvailable") === false ? "danger" : "success"}>{read(item,"isAvailable") === false ? "No" : "Yes"}</Badge></td></tr>)}{!availability.length && <EmptyRow columns={4} />}</tbody></Table></div></Section></Col>
          </Row>

          <Row className="g-gs mb-4">
            <Col xxl="6"><Section title="Demo history" icon="video"><div className="table-responsive"><Table className="mb-0"><thead><tr><th>Student</th><th>Subject</th><th>Status</th><th>Date</th></tr></thead><tbody>{demoHistory.slice(0,10).map((item,index) => <tr key={read(item,"salesDetailsId") || index}><td>{read(item,"studentName") || "—"}</td><td>{read(item,"subjectName") || "—"}</td><td><Badge color="info">{read(item,"demoStatus") || "—"}</Badge></td><td>{dateValue(read(item,"classActualDate") || read(item,"modifiedDate") || read(item,"createdDate"))}</td></tr>)}{!demoHistory.length && <EmptyRow columns={4} />}</tbody></Table></div></Section></Col>
            <Col xxl="6"><Section title="Allocation history" icon="exchange"><div className="table-responsive"><Table className="mb-0"><thead><tr><th>Student</th><th>Subject</th><th>Status change</th><th>Date</th></tr></thead><tbody>{allocationHistory.slice(0,10).map((item) => <tr key={read(item,"historyId")}><td>{read(item,"studentName") || "—"}</td><td>{read(item,"subjectName") || "—"}</td><td>{read(item,"previousStatus") ?? "—"} → {read(item,"newStatus") ?? "—"}</td><td>{dateValue(read(item,"actionEffectiveDate"))}</td></tr>)}{!allocationHistory.length && <EmptyRow columns={4} />}</tbody></Table></div></Section></Col>
          </Row>

          <Row className="g-gs">
            <Col xxl="6"><Section title="Demo videos" icon="video-fill"><div className="table-responsive"><Table className="mb-0"><thead><tr><th>File</th><th>Type</th><th>Uploaded</th></tr></thead><tbody>{demoVideos.map((item,index) => <tr key={read(item,"documentStorageId") || read(item,"documentId") || index}><td>{read(item,"fileName") || read(item,"documentName")}</td><td>{read(item,"contentType") || "—"}</td><td>{dateValue(read(item,"createdDate"))}</td></tr>)}{!demoVideos.length && <EmptyRow columns={3} />}</tbody></Table></div></Section></Col>
            <Col xxl="6"><Section title="Homework uploads" icon="file-docs"><div className="table-responsive"><Table className="mb-0"><thead><tr><th>File</th><th>Description</th><th>Uploaded</th></tr></thead><tbody>{homework.map((item,index) => <tr key={read(item,"documentStorageId") || read(item,"documentId") || index}><td>{read(item,"fileName") || read(item,"documentName")}</td><td>{read(item,"documentDescription") || "—"}</td><td>{dateValue(read(item,"createdDate"))}</td></tr>)}{!homework.length && <EmptyRow columns={3} />}</tbody></Table></div></Section></Col>
          </Row>
        </Block>
        </Block>}
        <Modal isOpen={showFeedback} backdrop="static" centered>
          <ModalHeader>Tutor Experience Feedback</ModalHeader>
          <Form onSubmit={submitFeedback}>
            <ModalBody>
              <Alert color="info">Please share your experience after completing your first scheduled class.</Alert>
              <FormGroup>
                <label className="form-label" htmlFor="tutor-feeling-rating">How was your class experience?</label>
                <Input id="tutor-feeling-rating" type="select" value={feelingRating} onChange={(event) => setFeelingRating(event.target.value)} required>
                  <option value="">Select...</option>
                  <option value="Excellent">Excellent</option>
                  <option value="Good">Good</option>
                  <option value="Average">Average</option>
                  <option value="Needs improvement">Needs improvement</option>
                </Input>
              </FormGroup>
              <FormGroup>
                <label className="form-label" htmlFor="tutor-feedback-comments">Comments</label>
                <Input id="tutor-feedback-comments" type="textarea" value={feedbackComments} onChange={(event) => setFeedbackComments(event.target.value)} />
              </FormGroup>
            </ModalBody>
            <ModalFooter><Button color="primary" type="submit" disabled={feedbackSaving || !feelingRating}>{feedbackSaving ? "Submitting..." : "Submit Feedback"}</Button></ModalFooter>
          </Form>
        </Modal>
        </div>
      </Content>
    </React.Fragment>
  );
};

export default TutorDashboard;
