import React, { useEffect, useMemo, useState } from "react";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import { Alert, Badge, Card, Spinner, Table } from "reactstrap";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Block,
  BlockBetween,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Col,
  Icon,
  Row,
} from "../../../components/Component";
import { getFinanceDashboard, getHrDashboard } from "../../../apiservices/DashboardService";
import DashboardDateRange from "./DashboardDateRange";
import { toDateOnly as iso } from "../../../library/dashboardDates";
const read = (r, n) => r?.[n] ?? r?.[n[0].toUpperCase() + n.slice(1)],
  num = (v) => Number(v) || 0;
const Stat = ({ label, value, icon, color = "primary" }) => (
  <Card className="card-bordered h-100">
    <div className="card-inner d-flex align-items-center">
      <div className={`user-avatar bg-${color}-dim text-${color} mr-3`}>
        <Icon name={icon} />
      </div>
      <div>
        <div className="fs-24px fw-bold">{value}</div>
        <div className="text-soft">{label}</div>
      </div>
    </div>
  </Card>
);
export default function RoleAnalyticsDashboard({ type, title, description }) {
  const today = useMemo(() => new Date(), []),
    [from, setFrom] = useState(iso(new Date(today.getFullYear(), today.getMonth() - 5, 1))),
    [to, setTo] = useState(iso(today)),
    [refresh, setRefresh] = useState(0),
    [state, setState] = useState({ loading: true, error: "", data: null });
  useEffect(() => {
    let active = true;
    setState(old => ({ ...old, loading: true, error: "" }));
    (type === "hr" ? getHrDashboard : getFinanceDashboard)(from, to)
      .then((data) => active && setState({ loading: false, error: "", data }))
      .catch((e) => active && setState({ loading: false, error: e.message, data: null }));
    return () => {
      active = false;
    };
  }, [type, from, to, refresh]);
  const d = state.data || {},
    s = d.summary || {},
    hr = type === "hr",
    chart = ((hr ? d.pipeline : d.trend) || []).map((x) => ({
      name: read(x, hr ? "stage" : "reportMonth") || "-",
      value: num(read(x, hr ? "tutors" : "revenue")),
    })),
    rows = hr ? d.engagement : d.outstanding;
  return (
    <>
      <Head title={title || `${hr ? "HR" : "Accounts"} Dashboard`} />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page tag="h3">
                {title || `${hr ? "HR" : "Accounts & Payroll"} Dashboard`}
              </BlockTitle>
              {description && <p className="text-soft mb-0">{description}</p>}
            </BlockHeadContent>
            <BlockHeadContent>
              <DashboardDateRange fromDate={from} toDate={to} loading={state.loading}
                onRefresh={(range) => { setFrom(range.fromDate); setTo(range.toDate); setRefresh((x) => x + 1); }} />
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>
        {state.loading && <div role="status" className="text-soft mb-3"><Spinner size="sm" /> Loading dashboard…</div>}
        {state.error && <Alert color="danger">{state.error}</Alert>}
        <Block>
          <Row className="g-gs mb-4">
            {(hr
              ? [
                  ["Total tutors", "totalTutors", "users"],
                  ["Active tutors", "activeTutors", "user-check"],
                  ["New tutors", "newTutors", "user-add"],
                  ["Pending approvals", "pendingApprovals", "alert-circle"],
                ]
              : [
                  ["Invoices", "invoiceCount", "file-text"],
                  ["Invoiced amount", "invoicedAmount", "wallet"],
                  ["Collected", "collectedAmount", "cash"],
                  ["Tutor payable", "tutorPayable", "user-check"],
                  ["Overdue", "overdueInvoices", "alert-circle"],
                ]
            ).map((x, i) => (
              <Col md="4" xl={hr ? "3" : "2"} key={x[1]}>
                <Stat
                  label={x[0]}
                  value={
                    hr
                      ? num(read(s, x[1]))
                      : x[1].includes("Amount") || x[1].includes("Payable")
                        ? num(read(s, x[1])).toLocaleString()
                        : num(read(s, x[1]))
                  }
                  icon={x[2]}
                  color={i === 3 ? "warning" : i === 2 ? "success" : "primary"}
                />
              </Col>
            ))}
          </Row>
          <Row className="g-gs">
            <Col xl="5">
              <Card className="card-bordered">
                <div className="card-inner border-bottom">
                  <h6>{hr ? "Tutor pipeline" : "Revenue trend"}</h6>
                </div>
                <div className="card-inner" style={{ height: 330 }}>
                  <ResponsiveContainer>
                    <BarChart data={chart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" hide />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#6576ff" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>
            <Col xl="7">
              <Card className="card-bordered">
                <div className="card-inner border-bottom">
                  <h6>{hr ? "Tutor engagement" : "Outstanding invoices"}</h6>
                </div>
                <Table responsive hover className="mb-0">
                  <thead>
                    <tr>
                      {hr ? (
                        <>
                          <th>Tutor</th>
                          <th>Joined</th>
                          <th>Students</th>
                          <th>Rating</th>
                          <th>Engagement</th>
                        </>
                      ) : (
                        <>
                          <th>Invoice</th>
                          <th>Student</th>
                          <th>Amount</th>
                          <th>Due date</th>
                          <th>Days overdue</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {(rows || []).map((x, i) => (
                      <tr key={read(x, hr ? "tutorId" : "invoiceId") || i}>
                        {hr ? (
                          <>
                            <td>{read(x, "tutorName")}</td>
                            <td>
                              {read(x, "joiningDate") ? new Date(read(x, "joiningDate")).toLocaleDateString() : "—"}
                            </td>
                            <td>{num(read(x, "students"))}</td>
                            <td>{read(x, "rating") ?? "—"}</td>
                            <td>
                              <Badge color={read(x, "engagement") === "Low" ? "warning" : "success"}>
                                {read(x, "engagement")}
                              </Badge>
                            </td>
                          </>
                        ) : (
                          <>
                            <td>{read(x, "invoiceNumber")}</td>
                            <td>{read(x, "studentName")}</td>
                            <td>{num(read(x, "totalInvoiceAmount")).toLocaleString()}</td>
                            <td>{new Date(read(x, "dueDate")).toLocaleDateString()}</td>
                            <td>{num(read(x, "daysOverdue"))}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card>
            </Col>
          </Row>
        </Block>
      </Content>
    </>
  );
}
