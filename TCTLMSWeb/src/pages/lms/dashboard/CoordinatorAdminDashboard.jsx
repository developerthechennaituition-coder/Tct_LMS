import DashboardDateRange from "./DashboardDateRange";
import { toDateOnly as iso } from "../../../library/dashboardDates";
import React, { useEffect, useMemo, useState } from "react";
import Content from "../../../layout/content/Content";
import Head from "../../../layout/head/Head";
import { Alert, Badge, Card, Spinner, Table } from "reactstrap";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Block, BlockBetween, BlockHead, BlockHeadContent, BlockTitle, Col, Icon, Row } from "../../../components/Component";
import { getCurrentCoordinatorAdminDashboard } from "../../../apiservices/DashboardService";

const read = (r, n) => r?.[n] ?? r?.[n[0].toUpperCase() + n.slice(1)],
      num = v => Number(v) || 0;

const Stat = ({
  label,
  value,
  color = "primary",
  icon
}) => <Card className="card-bordered h-100"><div className="card-inner d-flex align-items-center"><div className={`user-avatar bg-${color}-dim text-${color} mr-3`}><Icon name={icon} /></div><div><div className="fs-24px fw-bold">{value}</div><div className="text-soft">{label}</div></div></div></Card>;

export default function CoordinatorAdminDashboard() {
  const today = useMemo(() => new Date(), []),
        [from, setFrom] = useState(iso(new Date(today.getFullYear(), today.getMonth(), 1))),
        [to, setTo] = useState(iso(today)),
        [refresh, setRefresh] = useState(0),
        [state, setState] = useState({
    loading: true,
    error: "",
    data: null
  });
  useEffect(() => {
    let active = true;
    setState(old => ({ ...old, loading: true, error: "" }));
    getCurrentCoordinatorAdminDashboard(from, to).then(data => active && setState({
      loading: false,
      error: "",
      data
    })).catch(e => active && setState({
      loading: false,
      error: e.message,
      data: null
    }));
    return () => {
      active = false;
    };
  }, [from, to, refresh]);
  const d = state.data || {},
        s = d.summary || {},
        chart = (d.pipeline || []).map(x => ({
    name: read(x, "statusName") || "Unknown",
    count: num(read(x, "demoCount"))
  }));
  return <><Head title="Coordinator Admin Dashboard" /><Content><BlockHead size="sm"><BlockBetween><BlockHeadContent><BlockTitle page tag="h3">Coordinator Admin Dashboard</BlockTitle><p className="text-soft">Team performance and tutor-assignment approvals.</p></BlockHeadContent><BlockHeadContent><DashboardDateRange fromDate={from} toDate={to} loading={state.loading} onRefresh={(range) => { setFrom(range.fromDate); setTo(range.toDate); setRefresh(x => x + 1); }} /></BlockHeadContent></BlockBetween></BlockHead>{state.loading && <div role="status" className="text-soft mb-3"><Spinner size="sm" /> Loading dashboard…</div>}{state.error && <Alert color="danger">{state.error}</Alert>}<Block><Row className="g-gs mb-4"><Col md="4" xl="2"><Stat label="Coordinators" value={num(read(s, "coordinators"))} icon="users" /></Col><Col md="4" xl="2"><Stat label="Inflow" value={num(read(s, "totalInflow"))} icon="inbox" color="info" /></Col><Col md="4" xl="2"><Stat label="Students" value={num(read(s, "students"))} icon="user-list" color="success" /></Col><Col md="4" xl="2"><Stat label="Pending approvals" value={num(read(s, "pendingApprovals"))} icon="alert-circle" color="warning" /></Col><Col md="4" xl="2"><Stat label="Converted" value={num(read(s, "converted"))} icon="check-circle" color="purple" /></Col><Col md="4" xl="2"><Stat label="Conversion" value={`${num(read(s, "conversionRate")).toFixed(1)}%`} icon="growth" color="success" /></Col></Row><Row className="g-gs mb-4"><Col xl="6"><Card className="card-bordered"><div className="card-inner border-bottom"><h6>Coordinator performance</h6></div><Table responsive hover className="mb-0"><thead><tr><th>Coordinator</th><th>Inflow</th><th>Students</th><th>Pending</th><th>Success</th></tr></thead><tbody>{(d.coordinators || []).map((x, i) => <tr key={read(x, "coordinatorId") || i}><td>{read(x, "coordinatorName")}</td><td>{num(read(x, "inflow"))}</td><td>{num(read(x, "students"))}</td><td>{num(read(x, "pendingApprovals"))}</td><td>{num(read(x, "successRate")).toFixed(1)}%</td></tr>)}</tbody></Table></Card></Col><Col xl="6"><Card className="card-bordered"><div className="card-inner border-bottom"><h6>Demo pipeline</h6></div><div className="card-inner" style={{
                height: 310
              }}><ResponsiveContainer><BarChart data={chart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" hide /><YAxis /><Tooltip /><Bar dataKey="count" fill="#6576ff" /></BarChart></ResponsiveContainer></div></Card></Col></Row><Card className="card-bordered"><div className="card-inner border-bottom"><h6>Pending tutor-assignment approvals</h6></div><Table responsive hover className="mb-0"><thead><tr><th>Coordinator</th><th>Student</th><th>Tutor</th><th>Subject</th><th>Status</th></tr></thead><tbody>{(d.approvals || []).map((x, i) => <tr key={read(x, "salesDetailsId") || i}><td>{read(x, "coordinatorName") || "—"}</td><td>{read(x, "studentName") || "—"}</td><td>{read(x, "tutorName") || "—"}</td><td>{read(x, "subjectName") || "—"}</td><td><Badge color="warning">{read(x, "statusName") || "Pending"}</Badge></td></tr>)}</tbody></Table></Card></Block></Content></>;
}
