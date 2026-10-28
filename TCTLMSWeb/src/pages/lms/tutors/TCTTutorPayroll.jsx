import React, { useState, useEffect, useRef } from "react";
import { toast, ToastContainer } from "react-toastify";
import { Block, BlockBetween, BlockHead, BlockHeadContent, BlockTitle, Icon, ReactDataTable } from "../../../components/Component";
import Content from "../../../layout/content/Content";
import Head from "../../../layout/head/Head";
import { gettutorpayroll } from "../../../apiservices/ScheduleService";
import { generateTutorInvoice } from "../../../apiservices/TutorService";
import { Link } from "react-router-dom";
import { Button, Input, UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem } from "reactstrap";

// Page-scoped styles: every selector starts with .tct-pr (rendered only by this page).
const tutorPayrollStyle = `
  .tct-pr .nk-block-head { padding-bottom: 18px; }
  .tct-pr .nk-block-title.page-title { margin: 0; font-size: 1.6rem; font-weight: 700; color: #1c2b46; }

  /* Month / year toolbar */
  /* Plain right-aligned row directly above the table (no card around it). */
  .tct-pr-toolbar { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 12px; }
  /* Heading (left) + month/year controls (right) on one row; wraps below the heading only when space runs out. */
  .tct-pr .nk-block-head .nk-block-between { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px 16px; }
  .tct-pr .nk-block-head .nk-block-between > .nk-block-head-content:last-child { margin-left: auto; }
  .tct-pr .nk-block + .nk-block { margin-top: 14px; }
  .tct-pr-month { display: inline-flex; align-items: center; gap: 6px; }
  .tct-pr-nav-btn {
    display: inline-flex; align-items: center; justify-content: center;
    width: 36px; height: 36px; padding: 0; border-radius: 8px; cursor: pointer;
    color: #854fff; background: #f5f1ff; border: 1px solid #e3d8ff;
    transition: background-color 0.15s ease, color 0.15s ease;
  }
  .tct-pr-nav-btn .icon { font-size: 16px; }
  .tct-pr-nav-btn:hover { background: #854fff; color: #fff; border-color: #854fff; }
  .tct-pr-nav-btn:focus { outline: none; }
  .tct-pr-nav-btn:focus-visible { box-shadow: 0 0 0 3px rgba(133, 79, 255, 0.22); }
  .tct-pr-month-label { min-width: 110px; text-align: center; font-size: 15px; font-weight: 700; color: #1c2b46; }
  /* Year: styled native select */
  .tct-pr-year select.form-control {
    -webkit-appearance: none; -moz-appearance: none; appearance: none;
    width: 110px; height: 38px; padding: 0 34px 0 14px; cursor: pointer;
    font-size: 14px; font-weight: 600; color: #364a63;
    background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23854fff' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 12px center / 12px 12px;
    border: 1px solid #dbdfea; border-radius: 8px; box-shadow: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
  }
  .tct-pr-year select.form-control:hover { border-color: #c4b0ff; background-color: #fbf9ff; }
  .tct-pr-year select.form-control:focus { outline: none; border-color: #854fff; box-shadow: 0 0 0 3px rgba(133, 79, 255, 0.18); }
  .tct-pr-year select option { color: #364a63; background: #fff; }
  .tct-pr-year select option:checked { color: #4c1fd0; background: #f1ebff; }
  /* Year: themed dropdown (same look as Rows per page) */
  .tct-pr-year-toggle {
    display: inline-flex; align-items: center; justify-content: space-between; gap: 10px;
    min-width: 110px; height: 38px; padding: 0 12px 0 14px;
    font-size: 14px; font-weight: 600; line-height: 1; color: #364a63; cursor: pointer;
    background: #fff; border: 1px solid #dbdfea; border-radius: 8px;
    transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
  }
  .tct-pr-year-toggle .icon { font-size: 14px; color: #854fff; transition: transform 0.15s ease; }
  .tct-pr-year-toggle:hover { border-color: #c4b0ff; background: #fbf9ff; }
  .tct-pr-year-toggle:focus { outline: none; }
  .tct-pr-year-toggle:focus-visible,
  .tct-pr-year .show > .tct-pr-year-toggle { border-color: #854fff; box-shadow: 0 0 0 3px rgba(133, 79, 255, 0.18); }
  .tct-pr-year .show > .tct-pr-year-toggle .icon { transform: rotate(180deg); }
  /* Single-column list that scrolls (mouse wheel, touch, keyboard) with the scrollbar hidden. */
  .tct-pr-year .tct-pr-year-menu {
    z-index: 1000; min-width: 110px; max-height: 264px; overflow-y: auto; overscroll-behavior: contain;
    margin-top: 6px; padding: 4px;
    scrollbar-width: none; -ms-overflow-style: none;
    background: #fff; border: 1px solid #e5e9f2; border-radius: 10px; box-shadow: 0 10px 28px rgba(31, 43, 58, 0.14);
  }
  .tct-pr-year .tct-pr-year-menu::-webkit-scrollbar { display: none; width: 0; height: 0; }
  .tct-pr-year .tct-pr-year-menu .dropdown-item {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 12px; border-radius: 6px; font-size: 14px; font-weight: 500; color: #364a63;
  }
  .tct-pr-year .tct-pr-year-menu .dropdown-item:hover,
  .tct-pr-year .tct-pr-year-menu .dropdown-item:focus { background: #f5f1ff; color: #4c1fd0; outline: none; }
  .tct-pr-year .tct-pr-year-menu .dropdown-item.active { background: #f1ebff; color: #4c1fd0; font-weight: 600; }
  .tct-pr-year .tct-pr-year-menu .dropdown-item .icon { font-size: 14px; color: #854fff; }

  /* Table card */
  .tct-pr-card { position: relative; background: #fff; border: 1px solid #e5e9f2; border-radius: 12px; box-shadow: 0 1px 3px rgba(31, 43, 58, 0.05); }
  .tct-pr-card .dataTables_wrapper > .row:empty { display: none; }
  .tct-pr-card .rdt_Table { border-radius: 12px 12px 0 0; }
  .tct-pr-card .rdt_TableHeadRow { min-height: 46px; background: #f8f9fc; border-bottom: 1px solid #e5e9f2; border-radius: 12px 12px 0 0; }
  .tct-pr-card .rdt_TableCol { font-size: 12px; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; color: #8094ae; }
  .tct-pr-card .rdt_TableRow { min-height: 78px; font-size: 14px; color: #526484; }
  .tct-pr-card .rdt_TableRow:not(:last-of-type) { border-bottom-color: #eef0f5; }
  /* Row hover: light purple background, purple accent bar on the left, name and amount in purple. */
  .tct-pr-card .rdt_TableRow { transition: background-color 0.15s ease, box-shadow 0.15s ease; }
  .tct-pr-card .rdt_TableRow:hover { background: #f7f3ff; box-shadow: inset 3px 0 0 #854fff; }
  .tct-pr-card .rdt_TableRow .tb-lead { transition: color 0.15s ease; }
  .tct-pr-card .rdt_TableRow:hover .tb-lead { color: #4c1fd0; }
  .tct-pr-card .rdt_TableRow:hover .tct-pr-details { color: #364a63; }
  .tct-pr-card .rdt_TableCell { padding-top: 12px; padding-bottom: 12px; }
  .tct-pr-card .rdt_TableCell .tb-lead { font-weight: 600; color: #364a63; }
  /* Schedule Class Details: one line each, even spacing */
  .tct-pr-card .tct-pr-details { font-size: 13px; line-height: 1.7; color: #526484; }
  .tct-pr-card .tct-pr-details br { display: none; }
  .tct-pr-card .tct-pr-details > span { display: block; }
  /* Payment */
  .tct-pr-card .tct-pr-amount .tb-lead { font-size: 15px; font-weight: 700; color: #1c2b46; font-variant-numeric: tabular-nums; }
  /* Status: same text and colour as before, shown as a pill */
  .tct-pr-card .rdt_TableCell .badge { padding: 0; border: 0; background: transparent; }
  .tct-pr-card .rdt_TableCell .badge > p {
    display: inline-block; margin: 0; padding: 4px 10px; border-radius: 999px;
    font-size: 12px; font-weight: 600; line-height: 1.4; white-space: nowrap;
    background: #fff; border: 1px solid currentColor;
  }
  /* Actions */
  .tct-pr-card .rdt_TableCell .btn:not(.btn-icon) { min-height: 34px; padding: 0 14px; border-radius: 8px; font-size: 13px; font-weight: 600; white-space: nowrap; }
  .tct-pr-card .rdt_TableCell .btn-trigger.btn-icon { width: 34px; height: 34px; border-radius: 8px; color: #6e82a5; }
  .tct-pr-card .rdt_TableCell .btn-trigger.btn-icon:before { display: none; }
  .tct-pr-card .rdt_TableCell .btn-trigger.btn-icon:hover { background: #f5f1ff; color: #854fff; }
  .tct-pr-empty { margin: 0; padding: 36px 16px; text-align: center; font-size: 14px; color: #8094ae; }

  /* Pagination inside the card. LeadLists.css leaks an unscoped .pagination rule; undo it here. */
  .tct-pr-card .dataTables_wrapper .row.align-items-center { margin: 0; padding: 12px 18px; border-top: 1px solid #e5e9f2; }
  .tct-pr-card .dataTables_wrapper .row.align-items-center > [class*="col"] { padding: 0; background: transparent; }
  .tct-pr-card .dataTables_wrapper .pagination { margin: 0; padding: 0; border-top: 0; background: transparent; }
  .tct-pr-card .dataTables_info { font-size: 13px; color: #8094ae; }

  /* Rows per page: right end of the pagination row (row drawn by the shared pagination component) */
  .tct-pr-rpp { display: flex; align-items: center; justify-content: flex-end; gap: 10px; font-size: 13px; font-weight: 500; color: #6b7a90; white-space: nowrap; }
  @media (min-width: 768px) {
    .tct-pr-rpp { position: absolute; right: 18px; bottom: 0; height: 64px; }
    .tct-pr-card .dataTables_wrapper .row.align-items-center { min-height: 64px; padding-top: 0; padding-bottom: 0; padding-right: 240px; }
  }
  @media (max-width: 767.98px) {
    .tct-pr-rpp { padding: 0 18px 14px; }
  }
  .tct-pr-rpp-toggle {
    display: inline-flex; align-items: center; justify-content: space-between; gap: 10px;
    min-width: 76px; height: 38px; padding: 0 10px 0 14px;
    font-size: 14px; font-weight: 600; line-height: 1; color: #364a63; cursor: pointer;
    background: #fff; border: 1px solid #dbdfea; border-radius: 8px;
    transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
  }
  .tct-pr-rpp-toggle .icon { font-size: 14px; color: #854fff; transition: transform 0.15s ease; }
  .tct-pr-rpp-toggle:hover { border-color: #c4b0ff; background: #fbf9ff; }
  .tct-pr-rpp-toggle:focus { outline: none; }
  .tct-pr-rpp-toggle:focus-visible,
  .tct-pr-rpp .show > .tct-pr-rpp-toggle { border-color: #854fff; box-shadow: 0 0 0 3px rgba(133, 79, 255, 0.18); }
  .tct-pr-rpp .show > .tct-pr-rpp-toggle .icon { transform: rotate(180deg); }
  .tct-pr-rpp .tct-pr-rpp-menu {
    z-index: 1000; min-width: 100px; margin-bottom: 6px; padding: 4px;
    background: #fff; border: 1px solid #e5e9f2; border-radius: 10px; box-shadow: 0 10px 28px rgba(31, 43, 58, 0.14);
  }
  .tct-pr-rpp .tct-pr-rpp-menu .dropdown-item {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 12px; border-radius: 6px; font-size: 14px; font-weight: 500; color: #364a63;
  }
  .tct-pr-rpp .tct-pr-rpp-menu .dropdown-item:hover,
  .tct-pr-rpp .tct-pr-rpp-menu .dropdown-item:focus { background: #f5f1ff; color: #4c1fd0; outline: none; }
  .tct-pr-rpp .tct-pr-rpp-menu .dropdown-item.active { background: #f1ebff; color: #4c1fd0; font-weight: 600; }
  .tct-pr-rpp .tct-pr-rpp-menu .dropdown-item .icon { font-size: 14px; color: #854fff; }

  @media (max-width: 575.98px) {
    .tct-pr .nk-block-title.page-title { font-size: 1.35rem; }
    .tct-pr-toolbar { gap: 8px; }
    .tct-pr-month-label { min-width: 90px; }
  }
`;

const money = value => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(value) || 0);
const errorMessage = error => error?.response?.data?.message ||
  (typeof error?.response?.data === "string" ? error.response.data : error?.message) || "Unable to load payroll.";
const PAGE_SIZE_OPTIONS = [5, 10, 15, 25];
const STATUS_COLORS = { "Processed": "#1ee0ac", "Pending": "#f4bd0e", "No classes taken": "#8094ae" };

export default function TCTTutorPayroll() {
  const [period, setPeriod] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const month = period.getMonth() + 1, year = period.getFullYear();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("All");
  const [processing, setProcessing] = useState(null);
  const [itemPerPage, setItemPerPage] = useState(10);
  const sequence = useRef(0);
  const processingRef = useRef(false);
  const currentPeriod = useRef("");
  currentPeriod.current = `${year}-${month}`;

  const fetchPayroll = async (requestedMonth, requestedYear) => {
    const request = ++sequence.current;
    setLoading(true); setError(""); setRows([]);
    try {
      const result = await gettutorpayroll(requestedMonth, requestedYear);
      if (result?.succeeded === false) throw new Error(result.message || "Unable to load payroll.");
      if (!Array.isArray(result?.data)) throw new Error("Unexpected payroll response. Please retry.");
      if (request === sequence.current) setRows(result.data);
    } catch (failure) {
      if (request === sequence.current) setError(errorMessage(failure));
    } finally {
      if (request === sequence.current) setLoading(false);
    }
  };
  useEffect(() => {
    fetchPayroll(month, year);
    return () => { sequence.current++; };
  }, [month, year]);

  const generate = async row => {
    if (processingRef.current || row.isInvoiceGenerated || !row.noOfDaysPresent || row.approved !== row.noOfDaysPresent) return;
    const requestedPeriod = currentPeriod.current;
    processingRef.current = true; setProcessing(row.tutorId);
    try {
      const result = await generateTutorInvoice({
        inputMonth: month, inputYear: year, tutorId: row.tutorId, createdBy: localStorage.getItem("userId")
      });
      if (result?.success === false || result?.succeeded === false) throw new Error(result.message || "Payroll generation failed.");
      toast.success("Payslip generated successfully.");
      if (requestedPeriod === currentPeriod.current) await fetchPayroll(month, year);
    } catch (failure) {
      toast.error(errorMessage(failure));
    } finally {
      processingRef.current = false; setProcessing(null);
    }
  };

  const columns = [
    { name: "Tutor", selector: row => row.tutorName, sortable: true,
      cell: row => <div className="user-info"><span className="tb-lead">{row.tutorName} ({row.userCode})</span></div> },
    { name: "Month", cell: row => <div className="user-info"><span className="tb-lead">{row.scheduleMonthName} {row.scheduleYear}</span></div> },
    { name: "Classes", cell: row => <div className="user-info tct-pr-details">
      <span>Scheduled: {row.totalNoOfClasses || 0}</span>
      <span>Completed: {row.noOfDaysPresent || 0}</span>
      <span>Cancelled: {row.noOfDaysAbsent || 0}</span>
      <span>Operations approved: {row.approved || 0}</span></div> },
    { name: "Tutor Payment", selector: row => row.totalTutorPayment, sortable: true,
      cell: row => <div className="user-info tct-pr-amount"><span className="tb-lead">{money(row.totalTutorPayment)}</span>
        <small className="d-block text-soft">{row.isInvoiceGenerated ? "Saved payslip total" : "Approved classes estimate"}</small></div> },
    { name: "Status", selector: row => row.payrollStatus,
      cell: row => <div className="badge"><p style={{ color: STATUS_COLORS[row.payrollStatus] || "#526484" }}>{row.payrollStatus}</p></div> },
    { name: "Action", cell: row => row.isInvoiceGenerated
      ? <div>{(row.invoiceNumbers?.length ? row.invoiceNumbers : [row.invoiceNumber]).filter(Boolean).map(number =>
          <Link key={number} to={`${process.env.PUBLIC_URL}/lms/tutors/tutor-invoice-details?invNumber=${encodeURIComponent(number)}&from=payroll`}>View Payslip {number}<br /></Link>)}</div>
      : !row.noOfDaysPresent ? <span>No completed classes</span>
      : row.approved !== row.noOfDaysPresent ? <span>Waiting for Operations approval</span>
      : <Button size="sm" color="primary" disabled={Boolean(processing)} onClick={() => generate(row)}>
          {processing === row.tutorId ? "Processing…" : "Generate Payslip"}
        </Button> }
  ];

  const visibleRows = status === "All" ? rows : rows.filter(row => row.payrollStatus === status);
  const currentYear = new Date().getFullYear();
  const years = Array.from(new Set([...Array.from({ length: 11 }, (_, index) => currentYear - 5 + index), year])).sort();
  return <>
    <Head title="Tutor Payroll" />
    <Content>
      <style>{tutorPayrollStyle}</style>
      <div className="tct-pr">
      <BlockHead size="sm">
        <BlockBetween>
          <BlockHeadContent>
            <BlockTitle tag="h3" page>Tutor Payroll</BlockTitle>
          </BlockHeadContent>
          <BlockHeadContent>
            <div className="tct-pr-toolbar">
              <div className="tct-pr-month">
                <button type="button" className="tct-pr-nav-btn" onClick={() => setPeriod(new Date(year, month - 2, 1))} aria-label="Previous month" title="Previous month">
                  <Icon name="back-alt-fill" />
                </button>
                <span className="tct-pr-month-label">{period.toLocaleString("en-IN", { month: "long" })}</span>
                <button type="button" className="tct-pr-nav-btn" onClick={() => setPeriod(new Date(year, month, 1))} aria-label="Next month" title="Next month">
                  <Icon name="forward-alt-fill" />
                </button>
              </div>
              <div className="tct-pr-year">
                <UncontrolledDropdown>
                  <DropdownToggle tag="button" type="button" className="tct-pr-year-toggle" aria-label={`Payroll year: ${year}`}>
                    <span>{year}</span>
                    <Icon name="chevron-down" />
                  </DropdownToggle>
                  <DropdownMenu right className="tct-pr-year-menu">
                    {years.map(value => (
                      <DropdownItem key={value} tag="button" type="button" active={year === value}
                        onClick={() => { if (year !== value) setPeriod(new Date(value, month - 1, 1)); }}>
                        <span>{value}</span>
                        {year === value && <Icon name="check" />}
                      </DropdownItem>
                    ))}
                  </DropdownMenu>
                </UncontrolledDropdown>
              </div>
              <div className="tct-pr-year">
                <Input type="select" aria-label="Payroll status" value={status} style={{ width: "230px" }}
                  onChange={event => setStatus(event.target.value)}>
                  {["All", "No classes taken", "Pending", "Processed"].map(value =>
                    <option key={value} value={value}>{value} ({value === "All" ? rows.length : rows.filter(row => row.payrollStatus === value).length})</option>)}
                </Input>
              </div>
              <Button outline color="primary" disabled={loading} onClick={() => fetchPayroll(month, year)}>Refresh</Button>
            </div>
          </BlockHeadContent>
        </BlockBetween>
      </BlockHead>
      {loading ? <div role="status" className="spinner-grow text-success"><span className="sr-only">Loading payroll…</span></div>
        : error ? <div role="alert" className="text-danger">{error} <Button size="sm" onClick={() => fetchPayroll(month, year)}>Retry</Button></div>
        : <Block>
            <div className="tct-pr-card">
              {visibleRows.length > 0 ? (
                <ReactDataTable key={`${year}-${month}-${status}-${itemPerPage}`} data={visibleRows} columns={columns}
                  pagination pageSize={itemPerPage} className="nk-tb-list" />
              ) : (
                <p className="tct-pr-empty">No records found for this month</p>
              )}
              {visibleRows.length > 0 && (
                <div className="tct-pr-rpp">
                  <span>Rows per page</span>
                  <UncontrolledDropdown direction="up">
                    <DropdownToggle tag="button" type="button" className="tct-pr-rpp-toggle" aria-label={`Rows per page: ${itemPerPage}`}>
                      <span>{itemPerPage}</span>
                      <Icon name="chevron-down" />
                    </DropdownToggle>
                    <DropdownMenu right className="tct-pr-rpp-menu">
                      {PAGE_SIZE_OPTIONS.map(size => (
                        <DropdownItem key={size} tag="button" type="button" active={itemPerPage === size}
                          onClick={() => { if (itemPerPage !== size) setItemPerPage(size); }}>
                          <span>{size}</span>
                          {itemPerPage === size && <Icon name="check" />}
                        </DropdownItem>
                      ))}
                    </DropdownMenu>
                  </UncontrolledDropdown>
                </div>
              )}
            </div>
          </Block>}
      </div>
    </Content>
    <ToastContainer />
  </>;
}
