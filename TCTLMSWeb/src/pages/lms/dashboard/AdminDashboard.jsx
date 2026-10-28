import DashboardDateRange from "./DashboardDateRange";
import { toDateOnly as isoDate } from "../../../library/dashboardDates";
import React, { useEffect, useMemo, useState } from "react";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import { Alert, Card, Spinner, Table } from "reactstrap";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Block, BlockBetween, BlockHead, BlockHeadContent, BlockTitle, Col, Icon, Row } from "../../../components/Component";
import { getCurrentSuperAdminDashboard } from "../../../apiservices/DashboardService";

const read = (row, name) => row?.[name] ?? row?.[name.charAt(0).toUpperCase() + name.slice(1)];

const number = value => Number(value) || 0;

const Stat = ({
  icon,
  label,
  value,
  color = "primary",
  note
}) => <Card className="card-bordered h-100"><div className="card-inner d-flex align-items-center"><div className={`user-avatar bg-${color}-dim text-${color} mr-3`}><Icon name={icon} /></div><div><div className="fs-24px fw-bold">{value}</div><div className="text-soft">{label}</div>{note && <small className="text-soft">{note}</small>}</div></div></Card>;

const SuperAdminDashboard = () => {
  const today = useMemo(() => new Date(), []);
  const [fromDate, setFromDate] = useState(isoDate(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [toDate, setToDate] = useState(isoDate(today));
  const [refresh, setRefresh] = useState(0);
  const [state, setState] = useState({
    loading: true,
    error: "",
    data: null
  });
  useEffect(() => {
    let active = true;
    setState(old => ({ ...old,
      loading: true,
      error: ""
    }));
    getCurrentSuperAdminDashboard(fromDate, toDate).then(data => active && setState({
      loading: false,
      error: "",
      data
    })).catch(error => active && setState({
      loading: false,
      error: error?.response?.data?.message || error.message || "Unable to load dashboard.",
      data: null
    }));
    return () => {
      active = false;
    };
  }, [fromDate, toDate, refresh]);
  const data = state.data || {};
  const summary = data.summary || {};
  const completion = (data.completion || []).map(x => ({
    name: `${read(x, "boardName") || "-"} / ${read(x, "subjectName") || "-"}`,
    rate: number(read(x, "completionRate"))
  }));
  const attendance = (data.attendance || []).map(x => ({
    date: new Date(read(x, "attendanceDate")).toLocaleDateString([], {
      month: "short",
      day: "numeric"
    }),
    rate: number(read(x, "attendanceRate"))
  }));
  return <React.Fragment><Head title="Super Admin Dashboard" /><Content><div className="pt-4">
    <BlockHead size="sm"><BlockBetween><BlockHeadContent><BlockTitle page tag="h3">Super Admin Dashboard</BlockTitle><div className="nk-block-des text-soft"><p>System-wide academic, user, and resource performance.</p></div></BlockHeadContent><BlockHeadContent><DashboardDateRange fromDate={fromDate} toDate={toDate} loading={state.loading} onRefresh={(range) => { setFromDate(range.fromDate); setToDate(range.toDate); setRefresh(x => x + 1); }} /></BlockHeadContent></BlockBetween></BlockHead>
    {state.loading && <div role="status" className="text-soft mb-3"><Spinner size="sm" /> Loading dashboard…</div>}{state.error && <Alert color="danger">{state.error}</Alert>}
    {!state.error && <Block><Row className="g-gs mb-4">
      <Col md="4" xl="2"><Stat icon="layers" label="Boards" value={number(read(summary, "totalBoards"))} /></Col><Col md="4" xl="2"><Stat icon="users" label="Active students" value={number(read(summary, "activeStudents"))} color="success" /></Col><Col md="4" xl="2"><Stat icon="user-check" label="Active tutors" value={number(read(summary, "activeTutors"))} color="info" /></Col><Col md="4" xl="2"><Stat icon="check-circle" label="Completion" value={`${number(read(summary, "completionRate")).toFixed(1)}%`} color="purple" /></Col><Col md="4" xl="2"><Stat icon="calendar-check" label="Attendance" value={`${number(read(summary, "attendanceRate")).toFixed(1)}%`} color="warning" /></Col><Col md="4" xl="2"><Stat icon="wallet" label="Pending finance" value="—" color="danger" note="Invoice schema required" /></Col>
    </Row><Row className="g-gs mb-4"><Col xl="6"><Card className="card-bordered"><div className="card-inner border-bottom"><h6 className="title">Course completion</h6></div><div className="card-inner" style={{
                  height: 330
                }}><ResponsiveContainer><BarChart data={completion}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" hide /><YAxis domain={[0, 100]} /><Tooltip /><Bar dataKey="rate" name="Completion %" fill="#6576ff" /></BarChart></ResponsiveContainer></div></Card></Col><Col xl="6"><Card className="card-bordered"><div className="card-inner border-bottom"><h6 className="title">Attendance trend</h6></div><div className="card-inner" style={{
                  height: 330
                }}><ResponsiveContainer><LineChart data={attendance}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis domain={[0, 100]} /><Tooltip /><Line type="monotone" dataKey="rate" name="Attendance %" stroke="#1ee0ac" strokeWidth={3} /></LineChart></ResponsiveContainer></div></Card></Col></Row>
    <Row className="g-gs"><Col xl="6"><Card className="card-bordered"><div className="card-inner border-bottom"><h6 className="title">Board overview</h6></div><Table responsive hover className="mb-0"><thead><tr><th>Board</th><th>Students</th><th>Subjects</th></tr></thead><tbody>{(data.boards || []).map((x, i) => <tr key={read(x, "boardId") || i}><td>{read(x, "boardName") || "—"}</td><td>{number(read(x, "activeStudents"))}</td><td>{number(read(x, "subjectCount"))}</td></tr>)}</tbody></Table></Card></Col><Col xl="6"><Card className="card-bordered"><div className="card-inner border-bottom"><h6 className="title">Latest onboarded users</h6></div><Table responsive hover className="mb-0"><thead><tr><th>User</th><th>Role</th><th>Created</th><th>Status</th></tr></thead><tbody>{(data.latestUsers || []).slice(0, 10).map((x, i) => <tr key={read(x, "userId") || i}><td>{read(x, "userName") || "—"}</td><td>{read(x, "roleName") || "—"}</td><td>{read(x, "createdDate") ? new Date(read(x, "createdDate")).toLocaleDateString() : "—"}</td><td>{read(x, "isActive") ? "Active" : "Inactive"}</td></tr>)}</tbody></Table></Card></Col></Row>
    <Alert color="info" className="mt-4"><Icon name="info" className="mr-2" />Upcoming Grade 10/12 deadlines will activate after an exam-date field is added during student onboarding.</Alert>
    </Block>}
  </div></Content></React.Fragment>;
};

export default SuperAdminDashboard;
