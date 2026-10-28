import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Button, Input, Spinner } from "reactstrap";
import { toast, ToastContainer } from "react-toastify";
import { Block, BlockBetween, BlockHead, BlockHeadContent, BlockTitle, Icon, ReactDataTable } from "../../../components/Component";
import Content from "../../../layout/content/Content";
import Head from "../../../layout/head/Head";
import { getClassCompletion } from "../../../apiservices/ScheduleService";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// Completion filters: "min" keeps rows at or above it, "below" keeps rows under it.
const FILTERS = [
  { value: "all", label: "All students" },
  { value: "min-90", label: "90% and above" },
  { value: "min-75", label: "75% and above" },
  { value: "min-50", label: "50% and above" },
  { value: "below-50", label: "Below 50%" },
];

const matchesFilter = (row, filter) => {
  if (filter === "all") return true;
  const [kind, value] = filter.split("-");
  return kind === "min" ? row.completionPercent >= Number(value) : row.completionPercent < Number(value);
};

const percentColor = (percent) => (percent >= 90 ? "success" : percent >= 50 ? "warning" : "danger");

// Accounts "Due Timings": each student's subject with the share of the month's classes completed,
// so Accounts can see whose invoices are coming due (e.g. 90% / 50% completed).
const TCTDueTimings = () => {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [filter, setFilter] = useState("min-90");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getClassCompletion(month, year)
      .then((data) => active && setRows(Array.isArray(data) ? data : data?.data ?? []))
      .catch(() => {
        if (!active) return;
        setRows([]);
        toast.error("Unable to load class completion for this month.");
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [month, year]);

  const visibleRows = useMemo(() => {
    const text = search.trim().toLowerCase();
    return rows.filter(
      (row) =>
        matchesFilter(row, filter) &&
        (!text || [row.studentName, row.tutorName, row.subject, row.board, row.grade].some((v) => (v || "").toLowerCase().includes(text))),
    );
  }, [rows, filter, search]);

  const shiftMonth = (step) => {
    const date = new Date(year, month - 1 + step, 1);
    setMonth(date.getMonth() + 1);
    setYear(date.getFullYear());
  };

  const columns = [
    { name: "Student", selector: (row) => row.studentName, sortable: true, grow: 2 },
    { name: "Board / Grade", selector: (row) => `${row.board} - ${row.grade}`, sortable: true },
    { name: "Subject", selector: (row) => row.subject, sortable: true },
    { name: "Tutor", selector: (row) => row.tutorName, sortable: true, grow: 2 },
    { name: "Classes", selector: (row) => row.completedClasses, sortable: true, cell: (row) => `${row.completedClasses} of ${row.totalClasses}` },
    {
      name: "Completed",
      selector: (row) => row.completionPercent,
      sortable: true,
      cell: (row) => <Badge color={percentColor(row.completionPercent)}>{row.completionPercent}%</Badge>,
    },
    {
      name: "Invoice",
      selector: (row) => row.invoiceNumber || "",
      cell: (row) =>
        row.invoiceNumber ? (
          <span className="text-success">{row.invoiceNumber}</span>
        ) : (
          <Link to={`${process.env.PUBLIC_URL}/lms/accounts-studentlist?search=${encodeURIComponent(row.studentName)}`}>Not generated</Link>
        ),
      grow: 2,
    },
  ];

  return (
    <>
      <Head title="Due Timings" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page>Due Timings</BlockTitle>
              <p className="text-soft">Students by share of the month's classes completed (cancelled and postponed classes are not counted).</p>
            </BlockHeadContent>
            <BlockHeadContent>
              <div className="d-flex align-items-center flex-wrap" style={{ gap: 10 }}>
                <Button color="light" size="sm" onClick={() => shiftMonth(-1)} aria-label="Previous month">
                  <Icon name="chevron-left" />
                </Button>
                <strong style={{ minWidth: 130, textAlign: "center" }}>
                  {MONTHS[month - 1]} {year}
                </strong>
                <Button color="light" size="sm" onClick={() => shiftMonth(1)} aria-label="Next month">
                  <Icon name="chevron-right" />
                </Button>
                <Input type="select" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ width: 170 }}>
                  {FILTERS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </Input>
              </div>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>
        <Block>
          <div className="d-flex justify-content-between align-items-center flex-wrap mb-2" style={{ gap: 10 }}>
            <Input
              placeholder="Search by student, tutor, subject, board or grade"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ maxWidth: 420 }}
            />
            <span className="text-soft">
              {visibleRows.length} of {rows.length} student subject(s)
            </span>
          </div>
          {loading ? (
            <div className="text-center py-4">
              <Spinner size="sm" /> Loading…
            </div>
          ) : visibleRows.length > 0 ? (
            <ReactDataTable key={`${year}-${month}-${filter}`} data={visibleRows} columns={columns} pagination className="nk-tb-list" />
          ) : (
            <p className="text-center text-soft py-4">No students match this filter for {MONTHS[month - 1]} {year}.</p>
          )}
        </Block>
      </Content>
      <ToastContainer />
    </>
  );
};

export default TCTDueTimings;
