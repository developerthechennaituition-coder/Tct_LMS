import React,{useEffect,useMemo,useRef,useState} from "react";
import {Link} from "react-router-dom";
import DashboardDateRange from "./DashboardDateRange";
import { toDateOnly as iso } from "../../../library/dashboardDates";
import Head from "../../../layout/head/Head"; import Content from "../../../layout/content/Content";
import {Alert,Badge,Button,Card,Modal,ModalBody,Spinner,Table} from "reactstrap";
import {Bar,BarChart,CartesianGrid,Cell,Pie,PieChart,ResponsiveContainer,Tooltip,XAxis,YAxis} from "recharts";
import {Block,BlockBetween,BlockHead,BlockHeadContent,BlockTitle,Icon} from "../../../components/Component";
import {getCurrentCoordinatorDashboard,getCurrentCoordinatorInflowDetails} from "../../../apiservices/DashboardService";
const read=(r,n)=>r?.[n]??r?.[n.charAt(0).toUpperCase()+n.slice(1)]; const num=v=>Number(v)||0;

// Coordinator Dashboard styles: every selector is under .tct-coord-dash (this page only).
// Layout uses its own CSS grid: the shared <Col> ignores the `xl` prop, which left the chart and
// table columns without a width (narrow charts, large blank areas).
const coordinatorDashStyle = `
  .tct-coord-dash .nk-block-head { padding-bottom: 18px; }
  .tct-coord-dash .nk-block-title.page-title { margin: 0; font-size: 1.6rem; font-weight: 700; color: #1c2b46; }
  .tct-coord-dash .cd-sub { margin: 4px 0 0; font-size: 14px; color: #6b7a90; }
  .tct-coord-dash .nk-block-between { flex-wrap: wrap; gap: 12px 16px; }

  /* Date range + refresh */
  .tct-coord-dash .cd-filters { display: flex; align-items: flex-end; flex-wrap: wrap; gap: 10px; }
  .tct-coord-dash .cd-field { display: flex; flex-direction: column; gap: 4px; }
  .tct-coord-dash .cd-field label { margin: 0; font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: #8094ae; }
  .tct-coord-dash .cd-field .form-control {
    width: 160px; height: 38px; padding: 0 10px; font-size: 14px; color: #364a63;
    border: 1px solid #dbdfea; border-radius: 8px; box-shadow: none;
  }
  .tct-coord-dash .cd-field .form-control:focus { border-color: #854fff; box-shadow: 0 0 0 3px rgba(133, 79, 255, 0.12); }
  .tct-coord-dash .cd-refresh.btn {
    height: 38px; display: inline-flex; align-items: center; gap: 6px; padding: 0 14px;
    border-radius: 8px; font-size: 13px; font-weight: 600;
  }

  /* Summary cards */
  .tct-coord-dash .cd-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin-bottom: 16px; }
  .tct-coord-dash .cd-stat {
    position: relative; display: flex; align-items: center; gap: 12px; height: 100%; padding: 16px;
    background: #fff; border: 1px solid #e5e9f2; border-radius: 12px; box-shadow: 0 1px 3px rgba(31, 43, 58, 0.05);
    overflow: hidden;
  }
  .tct-coord-dash .cd-stat:before { content: ""; position: absolute; left: 0; top: 0; right: 0; height: 3px; background: var(--cd-accent, #854fff); }
  .tct-coord-dash .cd-stat .user-avatar { flex-shrink: 0; width: 42px; height: 42px; border-radius: 10px; font-size: 18px; }
  .tct-coord-dash .cd-stat-value { font-size: 1.45rem; font-weight: 700; line-height: 1.2; color: #1c2b46; }
  .tct-coord-dash .cd-stat-label { margin-top: 2px; font-size: 13px; color: #6b7a90; }
  /* Cards open the details popup */
  .tct-coord-dash button.cd-stat { width: 100%; text-align: left; font: inherit; cursor: pointer; transition: border-color .15s ease, box-shadow .15s ease, transform .15s ease; }
  .tct-coord-dash button.cd-stat:hover { border-color: #d4c6ff; box-shadow: 0 6px 16px rgba(133, 79, 255, 0.12); transform: translateY(-1px); }
  .tct-coord-dash button.cd-stat:focus { outline: none; }
  .tct-coord-dash button.cd-stat:focus-visible { border-color: #854fff; box-shadow: 0 0 0 3px rgba(133, 79, 255, 0.2); }
  .tct-coord-dash .cd-stat-more { position: absolute; right: 12px; bottom: 10px; font-size: 14px; color: #b7c2d0; transition: color .15s ease; }
  .tct-coord-dash button.cd-stat:hover .cd-stat-more { color: #854fff; }

  /* Card details popup (rendered in a portal, so scoped by the modal's own class) */
  .modal-dialog.tct-cd-modal { max-width: 1120px; }
  .modal-dialog.tct-cd-modal.cdm-courses,
  .modal-dialog.tct-cd-modal.cdm-students { max-width: 1000px; }
  .modal-dialog.tct-cd-modal.cdm-successRate { max-width: 780px; }
  .tct-cd-modal .modal-content {
    border: 1px solid #e5e9f2; border-radius: 16px; overflow: hidden;
    box-shadow: 0 24px 64px rgba(28, 43, 70, 0.24), 0 2px 6px rgba(28, 43, 70, 0.06);
  }

  /* Header: category icon, title, description, period */
  .tct-cd-modal .cdm-head {
    display: flex; align-items: flex-start; gap: 14px; padding: 20px 24px 18px;
    border-bottom: 1px solid #eef0f5; background: linear-gradient(180deg, #fbfaff 0%, #ffffff 100%);
  }
  .tct-cd-modal .cdm-icon {
    display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
    width: 44px; height: 44px; border-radius: 12px; font-size: 20px;
    color: var(--cdm-accent, #854fff); background: var(--cdm-accent-bg, #f1ecff);
  }
  .tct-cd-modal .cdm-head-text { flex: 1 1 auto; min-width: 0; }
  .tct-cd-modal .cdm-title { margin: 0; font-size: 1.2rem; font-weight: 700; line-height: 1.3; color: #1c2b46; }
  .tct-cd-modal .cdm-sub { margin: 3px 0 0; font-size: 13.5px; color: #6b7a90; }
  .tct-cd-modal .cdm-period {
    display: inline-flex; align-items: center; gap: 6px; margin-top: 10px; padding: 4px 10px;
    border: 1px solid #e5e9f2; border-radius: 8px; background: #fff;
    font-size: 12px; font-weight: 600; color: #526484; white-space: nowrap;
  }
  .tct-cd-modal .cdm-period .icon { font-size: 14px; color: #8094ae; }
  .tct-cd-modal .cdm-close {
    flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center;
    width: 38px; height: 38px; margin: -4px -8px 0 0; padding: 0; border: 0; border-radius: 10px;
    background: transparent; color: #8094ae; font-size: 18px; cursor: pointer;
    transition: background .15s ease, color .15s ease;
  }
  .tct-cd-modal .cdm-close:hover { background: #f1f3f8; color: #1c2b46; }
  .tct-cd-modal .cdm-close:focus-visible { outline: none; background: #f5f1ff; color: #6a35e8; box-shadow: 0 0 0 3px rgba(133, 79, 255, 0.2); }
  .tct-cd-modal .modal-body { padding: 0; }

  /* Summary: count pill (list popups) / metric tiles (Success ratio) */
  .tct-cd-modal .cdm-kpis { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 14px 24px; border-bottom: 1px solid #eef0f5; background: #fafbfd; }
  .tct-cd-modal .cdm-kpi {
    display: inline-flex; align-items: center; gap: 8px; padding: 5px 6px 5px 12px; border-radius: 999px;
    font-size: 12.5px; font-weight: 600; color: #526484; background: #fff; border: 1px solid #e5e9f2;
  }
  .tct-cd-modal .cdm-kpi b {
    min-width: 26px; padding: 2px 9px; border-radius: 999px; text-align: center;
    font-weight: 700; color: #6a35e8; background: #f1ecff; font-variant-numeric: tabular-nums;
  }
  .tct-cd-modal .cdm-metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; padding: 16px 24px; border-bottom: 1px solid #eef0f5; background: #fafbfd; }
  .tct-cd-modal .cdm-metric { padding: 12px 16px; border: 1px solid #e5e9f2; border-radius: 12px; background: #fff; }
  .tct-cd-modal .cdm-metric-label { display: block; font-size: 12px; font-weight: 600; letter-spacing: 0.02em; color: #8094ae; }
  .tct-cd-modal .cdm-metric-value { display: block; margin-top: 4px; font-size: 1.4rem; font-weight: 700; line-height: 1.2; color: #1c2b46; font-variant-numeric: tabular-nums; }
  .tct-cd-modal .cdm-metric.is-highlight { border-color: #d4c6ff; background: #faf8ff; }
  .tct-cd-modal .cdm-metric.is-highlight .cdm-metric-value { color: #6a35e8; }

  /* Table: stays inside the popup and scrolls (both directions) within its own region */
  .tct-cd-modal .cdm-table-wrap { max-height: min(60vh, calc(100vh - 300px)); overflow: auto; scrollbar-width: thin; scrollbar-color: #d9cbff transparent; }
  .tct-cd-modal .table { margin: 0; font-size: 14px; }
  .tct-cd-modal .table thead th {
    position: sticky; top: 0; z-index: 1; padding: 11px 16px; background: #f5f6fa; border-top: 0; border-bottom: 1px solid #e5e9f2;
    font-size: 11.5px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #6b7a90; white-space: nowrap;
  }
  .tct-cd-modal .table td { padding: 13px 16px; vertical-align: middle; color: #526484; border-top: 1px solid #eef0f5; }
  .tct-cd-modal .table th:first-child, .tct-cd-modal .table td:first-child { padding-left: 24px; }
  .tct-cd-modal .table th:last-child, .tct-cd-modal .table td:last-child { padding-right: 24px; }
  .tct-cd-modal .table tbody tr:first-child td { border-top: 0; }
  .tct-cd-modal .table td.cd-strong { min-width: 150px; font-weight: 600; color: #1c2b46; }
  .tct-cd-modal .table td.cdm-num, .tct-cd-modal .table th.cdm-num { text-align: right; font-variant-numeric: tabular-nums; }
  .tct-cd-modal .table td.cdm-num { font-weight: 600; color: #364a63; }
  .tct-cd-modal .table td.cdm-nowrap { white-space: nowrap; }
  .tct-cd-modal .table-hover tbody tr:hover, .tct-cd-modal .table tbody tr:hover { background: #faf9ff; }
  /* Only the student name is clickable: link styling, not the whole row. */
  .tct-cd-modal .cdm-student-link {
    color: #1c2b46; font-weight: 600; text-decoration: none;
    border-bottom: 1px dashed #c9b8ff; transition: color .15s ease, border-color .15s ease;
  }
  .tct-cd-modal .cdm-student-link:hover, .tct-cd-modal .cdm-student-link:focus-visible { color: #6a35e8; border-bottom-color: #6a35e8; text-decoration: none; outline: none; }
  .tct-cd-modal .cdm-code { display: block; margin-top: 3px; font-size: 12px; font-weight: 500; color: #8094ae; letter-spacing: 0.02em; }
  .tct-cd-modal .cdm-status {
    display: inline-block; max-width: 260px; padding: 4px 10px; border-radius: 999px; overflow: hidden; text-overflow: ellipsis;
    font-size: 12px; font-weight: 600; line-height: 1.4; color: #6a35e8; background: #f3eeff; white-space: nowrap; vertical-align: middle;
  }
  .tct-cd-modal .cdm-yes { color: #0b8f6c; background: #e3f8f1; }
  .tct-cd-modal .cdm-no { color: #6b7a90; background: #f1f3f8; }
  .tct-cd-modal .cdm-muted { color: #b7c2d0; }

  /* Loading / empty / error */
  .tct-cd-modal .cdm-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; min-height: 220px; padding: 36px 24px; text-align: center; font-size: 14px; color: #6b7a90; }
  .tct-cd-modal .cdm-state > .icon {
    display: inline-flex; align-items: center; justify-content: center; width: 52px; height: 52px;
    border-radius: 14px; font-size: 24px; color: #854fff; background: #f1ecff;
  }
  .tct-cd-modal .cdm-state > .icon.text-danger { color: #e85347 !important; background: #fdecea; }
  .tct-cd-modal .cdm-state .btn { border-radius: 8px; font-weight: 600; }

  /* Footer hint */
  .tct-cd-modal .cdm-foot { display: flex; align-items: center; gap: 8px; padding: 12px 24px; border-top: 1px solid #eef0f5; background: #fafbfd; font-size: 12.5px; color: #6b7a90; }
  .tct-cd-modal .cdm-foot .icon { flex-shrink: 0; font-size: 15px; color: #854fff; }

  @media (max-width: 991.98px) {
    .modal-dialog.tct-cd-modal { max-width: calc(100% - 32px); }
  }
  @media (max-width: 575.98px) {
    .modal-dialog.tct-cd-modal { max-width: none; margin: 8px; }
    .tct-cd-modal .modal-content { border-radius: 14px; }
    .tct-cd-modal .cdm-head { padding: 16px; gap: 12px; }
    .tct-cd-modal .cdm-icon { width: 38px; height: 38px; font-size: 18px; }
    .tct-cd-modal .cdm-kpis, .tct-cd-modal .cdm-metrics, .tct-cd-modal .cdm-foot { padding-left: 16px; padding-right: 16px; }
    .tct-cd-modal .cdm-metrics { grid-template-columns: minmax(0, 1fr); gap: 8px; }
    .tct-cd-modal .cdm-metric { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .tct-cd-modal .cdm-metric-value { margin: 0; font-size: 1.15rem; }
    .tct-cd-modal .table th:first-child, .tct-cd-modal .table td:first-child { padding-left: 16px; }
    .tct-cd-modal .table th:last-child, .tct-cd-modal .table td:last-child { padding-right: 16px; }
    .tct-cd-modal .cdm-table-wrap { max-height: calc(100vh - 260px); }
  }

  /* Section cards (charts, tables) */
  .tct-coord-dash .cd-grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-bottom: 16px; }
  .tct-coord-dash .cd-card { height: 100%; margin: 0; border: 1px solid #e5e9f2; border-radius: 12px; box-shadow: 0 1px 3px rgba(31, 43, 58, 0.05); overflow: hidden; }
  .tct-coord-dash .cd-card-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 14px 18px; border-bottom: 1px solid #eef0f5; }
  .tct-coord-dash .cd-card-head .title { margin: 0; font-size: 15px; font-weight: 700; color: #1c2b46; }
  .tct-coord-dash .cd-count { font-size: 12px; font-weight: 600; padding: 2px 10px; border-radius: 999px; color: #6a35e8; background: #f5f1ff; }
  .tct-coord-dash .cd-chart { height: 280px; padding: 12px 12px 8px 0; }
  .tct-coord-dash .cd-empty { display: flex; align-items: center; justify-content: center; height: 100%; font-size: 14px; color: #8094ae; }

  /* Demo pipeline: doughnut (total in the centre) on the left, legend with counts on the right */
  .tct-coord-dash .cd-pipe { display: grid; grid-template-columns: minmax(200px, 250px) minmax(0, 1fr); align-items: center; gap: 16px 24px; min-height: 280px; padding: 16px 20px; }
  .tct-coord-dash .cd-pipe-chart { position: relative; width: 100%; max-width: 250px; height: 250px; margin: 0 auto; }
  .tct-coord-dash .cd-pipe-center {
    position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
    pointer-events: none; text-align: center;
  }
  .tct-coord-dash .cd-pipe-total { font-size: 2rem; font-weight: 700; line-height: 1; color: #1c2b46; font-variant-numeric: tabular-nums; }
  .tct-coord-dash .cd-pipe-caption { margin-top: 6px; font-size: 12px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: #8094ae; }
  .tct-coord-dash .cd-pipe-legend { display: flex; flex-direction: column; gap: 4px; max-height: 250px; margin: 0; padding: 0; overflow-y: auto; list-style: none; scrollbar-width: thin; }
  .tct-coord-dash .cd-pipe-legend li {
    display: grid; grid-template-columns: 12px minmax(0, 1fr) auto 44px; align-items: center; gap: 10px;
    padding: 8px 10px; border-radius: 8px; font-size: 13.5px; transition: background .15s ease;
  }
  .tct-coord-dash .cd-pipe-legend li:hover { background: #f8f7ff; }
  .tct-coord-dash .cd-pipe-name { color: #526484; overflow-wrap: anywhere; line-height: 1.35; }
  .tct-coord-dash .cd-pipe-value { font-weight: 700; color: #1c2b46; font-variant-numeric: tabular-nums; }
  .tct-coord-dash .cd-pipe-share {
    justify-self: end; padding: 2px 7px; border-radius: 999px; font-size: 11.5px; font-weight: 600;
    color: #6b7a90; background: #f1f3f8; font-variant-numeric: tabular-nums;
  }
  .tct-coord-dash .cd-pipe-empty { flex-direction: column; gap: 10px; }
  .tct-coord-dash .cd-pipe-empty .icon {
    display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px;
    border-radius: 14px; font-size: 22px; color: #854fff; background: #f1ecff;
  }
  /* Half-width card on smaller laptops and on phones: legend under the doughnut. */
  @media (min-width: 992px) and (max-width: 1299.98px) { .tct-coord-dash .cd-pipe { grid-template-columns: minmax(0, 1fr); } }
  @media (max-width: 575.98px) {
    .tct-coord-dash .cd-pipe { grid-template-columns: minmax(0, 1fr); padding: 14px 12px; }
    .tct-coord-dash .cd-pipe-chart { height: 220px; max-width: 220px; }
    .tct-coord-dash .cd-pipe-legend { max-height: none; }
  }

  /* Class Completion Trend: chart on the left, legend with totals on the right */
  .tct-coord-dash .cd-period { font-size: 12px; font-weight: 600; color: #6b7a90; padding: 4px 10px; border: 1px solid #e5e9f2; border-radius: 8px; white-space: nowrap; }
  .tct-coord-dash .cd-trend { display: grid; grid-template-columns: minmax(0, 1fr) 210px; align-items: center; gap: 12px 20px; padding: 14px 18px 16px 6px; }
  .tct-coord-dash .cd-trend-chart { height: 250px; min-width: 0; }
  .tct-coord-dash .cd-legend { display: flex; flex-direction: column; gap: 14px; margin: 0; padding: 0; list-style: none; }
  .tct-coord-dash .cd-legend li { display: flex; align-items: center; gap: 10px; font-size: 14px; }
  .tct-coord-dash .cd-dot { flex-shrink: 0; width: 12px; height: 12px; border-radius: 3px; }
  .tct-coord-dash .cd-legend-label { flex: 1 1 auto; color: #526484; }
  .tct-coord-dash .cd-legend-value { font-weight: 700; color: #1c2b46; font-variant-numeric: tabular-nums; }
  /* Half-width card on smaller laptops: legend goes under the chart. */
  @media (min-width: 992px) and (max-width: 1299.98px) {
    .tct-coord-dash .cd-trend { grid-template-columns: minmax(0, 1fr); }
  }
  @media (max-width: 575.98px) {
    .tct-coord-dash .cd-trend { grid-template-columns: minmax(0, 1fr); padding-left: 12px; }
    .tct-coord-dash .cd-trend-chart { height: 220px; }
  }

  /* Tables */
  .tct-coord-dash .cd-table-wrap { max-height: 520px; overflow: auto; }
  .tct-coord-dash .cd-card .table { margin: 0; font-size: 14px; }
  .tct-coord-dash .cd-card .table thead th {
    position: sticky; top: 0; z-index: 1; padding: 10px 14px; background: #f8f9fc; border-top: 0; border-bottom: 1px solid #e5e9f2;
    font-size: 12px; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; color: #8094ae; white-space: nowrap;
  }
  .tct-coord-dash .cd-card .table td { padding: 10px 14px; vertical-align: middle; color: #526484; border-top: 1px solid #eef0f5; }
  .tct-coord-dash .cd-card .table td.cd-strong { font-weight: 600; color: #364a63; }
  .tct-coord-dash .cd-card .table-hover tbody tr:hover { background: #faf8ff; }
  .tct-coord-dash .cd-card .badge { padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; }
  .tct-coord-dash .cd-status { display: inline-block; max-width: 100%; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; color: #6a35e8; background: #f5f1ff; overflow-wrap: anywhere; }
  .tct-coord-dash .cd-table-empty { padding: 28px 16px !important; text-align: center; color: #8094ae !important; }

  @media (max-width: 1399.98px) { .tct-coord-dash .cd-stats { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
  @media (max-width: 991.98px) { .tct-coord-dash .cd-grid-2 { grid-template-columns: minmax(0, 1fr); } }
  @media (max-width: 767.98px) {
    .tct-coord-dash .cd-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .tct-coord-dash .cd-filters, .tct-coord-dash .cd-field { width: 100%; }
    .tct-coord-dash .cd-field .form-control { width: 100%; }
    .tct-coord-dash .cd-chart { height: 240px; }
  }
  @media (max-width: 479.98px) {
    .tct-coord-dash .cd-stats { grid-template-columns: minmax(0, 1fr); }
    .tct-coord-dash .nk-block-title.page-title { font-size: 1.35rem; }
  }
`;

const STAT_ACCENT={primary:"#854fff",success:"#1ee0ac",info:"#09c2de",warning:"#f4bd0e",purple:"#816bff"};
// Demo pipeline doughnut: one colour per status, in the dashboard's accent palette.
const PIPE_COLORS=["#854fff","#1ee0ac","#09c2de","#f4bd0e","#6576ff","#ff63a5","#b9a7ff","#0b9e78","#f08c3a","#8094ae"];
const Stat=({icon,label,value,color="primary",note,onClick})=>{const Tag=onClick?"button":"div";return <Tag type={onClick?"button":undefined} className="cd-stat" onClick={onClick} title={onClick?`View ${label.toLowerCase()} details`:undefined} style={{"--cd-accent":STAT_ACCENT[color]||STAT_ACCENT.primary}}><div className={`user-avatar bg-${color}-dim text-${color}`}><Icon name={icon}/></div><div><div className="cd-stat-value">{value}</div><div className="cd-stat-label">{label}</div>{note&&<small className="text-soft">{note}</small>}</div>{onClick&&<Icon name="arrow-right" className="cd-stat-more"/>}</Tag>;};

// ─── Card details popup ──────────────────────────────────────────────────────
// Courses / Students / Total inflow / Demo pending / Converted list the inflow records from
// demos/inflow (same coordinator and date filters as the summary). Success ratio uses the
// demos/conversions rows the dashboard has already loaded.
const PENDING_DEMO_CODES=[20001,20002,20012,20013]; // same status codes as the summary's PendingDemos
const fmtDate=v=>{if(!v)return "—";const dt=new Date(v);return isNaN(dt)?String(v):dt.toLocaleDateString([],{day:"2-digit",month:"short",year:"numeric"});};
const pct=v=>`${num(v).toFixed(1)}%`;
const joinSet=set=>[...set].filter(Boolean).join(", ")||"—";
const studentLink=r=>read(r,"studentUserId")?`${process.env.PUBLIC_URL}/student-profile?id=${read(r,"studentUserId")}`:null;
// Student name links to the existing student profile page (same link as the Student List).
const studentCell=r=>{const href=studentLink(r),name=read(r,"studentName")||"—";return <>{href?<Link to={href} className="cdm-student-link" title="Open student profile">{name}</Link>:name}{read(r,"studentCode")&&<span className="cdm-code">{read(r,"studentCode")}</span>}</>;};
const statusCell=r=><span className="cdm-status">{read(r,"statusName")||"—"}</span>;
const convertedCell=r=>read(r,"isConverted")?<span className="cdm-status cdm-yes">Yes</span>:<span className="cdm-status cdm-no">No</span>;
const COL={
  date:{label:"Created",nowrap:true,render:r=>fmtDate(read(r,"createdDate"))},
  student:{label:"Student",strong:true,render:studentCell},
  subject:{label:"Subject",render:r=>read(r,"subjectName")||"—"},
  boardGrade:{label:"Board / Grade",nowrap:true,render:r=>[read(r,"boardName"),read(r,"gradeName")].filter(Boolean).join(" · ")||"—"},
  status:{label:"Status",render:statusCell},
  tutor:{label:"Tutor",render:r=>(read(r,"tutorName")||"").trim()||"—"},
  followUp:{label:"Follow-up",nowrap:true,render:r=>fmtDate(read(r,"followUpDate"))},
  converted:{label:"Converted",render:convertedCell},
};
const CARD_DETAILS={
  courses:{title:"Courses",sub:"Subjects in the inflow for this period",empty:"No courses for this period.",
    build:rows=>{const m=new Map();rows.forEach(r=>{const k=read(r,"subjectId")||"none";const g=m.get(k)||{subjectName:read(r,"subjectName"),boards:new Set(),grades:new Set(),students:new Set(),records:0,converted:0};g.boards.add(read(r,"boardName"));g.grades.add(read(r,"gradeName"));if(read(r,"studentId"))g.students.add(read(r,"studentId"));g.records++;if(read(r,"isConverted"))g.converted++;m.set(k,g);});return [...m.values()].sort((a,b)=>b.records-a.records);},
    columns:[{label:"Subject",strong:true,render:g=>g.subjectName||"Not set"},{label:"Boards",render:g=>joinSet(g.boards)},{label:"Grades",render:g=>joinSet(g.grades)},{label:"Inflow",num:true,render:g=>g.records},{label:"Students",num:true,render:g=>g.students.size},{label:"Converted",num:true,render:g=>g.converted}]},
  students:{title:"Students",sub:"Students with inflow records in this period",empty:"No students for this period.",
    build:rows=>{const m=new Map();rows.forEach(r=>{const k=read(r,"studentId");if(!k)return;const g=m.get(k)||{studentId:k,studentUserId:read(r,"studentUserId"),studentName:read(r,"studentName"),studentCode:read(r,"studentCode"),boards:new Set(),grades:new Set(),subjects:new Set(),records:0,converted:0};g.boards.add(read(r,"boardName"));g.grades.add(read(r,"gradeName"));g.subjects.add(read(r,"subjectName"));g.records++;if(read(r,"isConverted"))g.converted++;m.set(k,g);});return [...m.values()].sort((a,b)=>String(a.studentName||"").localeCompare(String(b.studentName||"")));},
    link:studentLink,
    columns:[{label:"Student",strong:true,render:studentCell},{label:"Board",render:g=>joinSet(g.boards)},{label:"Grade",render:g=>joinSet(g.grades)},{label:"Subjects",render:g=>joinSet(g.subjects)},{label:"Inflow",num:true,render:g=>g.records},{label:"Converted",num:true,render:g=>g.converted}]},
  totalInflow:{title:"Total inflow",sub:"All inflow records created in this period",empty:"No inflow records for this period.",
    build:rows=>rows,link:studentLink,columns:[COL.date,COL.student,COL.subject,COL.boardGrade,COL.status,COL.tutor,COL.converted]},
  pendingDemos:{title:"Demo pending",sub:"Inflow records still waiting for a demo",empty:"No pending demos for this period.",
    build:rows=>rows.filter(r=>PENDING_DEMO_CODES.includes(num(read(r,"statusCode")))),link:studentLink,columns:[COL.date,COL.student,COL.subject,COL.boardGrade,COL.status,COL.tutor,COL.followUp]},
  converted:{title:"Converted",sub:"Inflow records with an active class schedule",empty:"No converted records for this period.",
    build:rows=>rows.filter(r=>read(r,"isConverted")),link:studentLink,columns:[COL.date,COL.student,COL.subject,COL.boardGrade,COL.tutor,COL.status]},
  successRate:{title:"Success ratio",sub:"Converted inflow as a share of total inflow, by board",empty:"No demo requests for this period.",
    columns:[{label:"Board",strong:true,render:r=>read(r,"boardName")||"Not set"},{label:"Demo requests",num:true,render:r=>num(read(r,"demoRequests"))},{label:"Converted",num:true,render:r=>num(read(r,"converted"))},{label:"Conversion rate",num:true,render:r=>read(r,"conversionRate")==null?"—":pct(read(r,"conversionRate"))}]},
};

// Popup header icon + accent per card (same icons/colours as the dashboard cards). Display only.
const CARD_ICON={courses:["book","#854fff","#f1ecff"],students:["users","#0b9e78","#e3f8f1"],totalInflow:["inbox","#0891b2","#e0f6fb"],
  pendingDemos:["calendar","#b7791f","#fdf5e1"],converted:["check-circle","#6b55e8","#efecff"],successRate:["growth","#0b9e78","#e3f8f1"]};

const CardDetailsModal=({card,onClose,from,to,refresh,summary,conversions,cacheRef,periodLabel})=>{
  const def=card?CARD_DETAILS[card]:null; const usesInflow=!!def&&card!=="successRate";
  const [retry,setRetry]=useState(0); const [st,setSt]=useState({loading:false,error:"",rows:null});
  useEffect(()=>{if(!usesInflow)return undefined;const key=`${from}|${to}|${refresh}`;
    if(cacheRef.current[key]){setSt({loading:false,error:"",rows:cacheRef.current[key]});return undefined;}
    const controller=new AbortController();let active=true;setSt({loading:true,error:"",rows:null});
    getCurrentCoordinatorInflowDetails(from,to,controller.signal).then(rows=>{const list=Array.isArray(rows)?rows:[];cacheRef.current={[key]:list};if(active)setSt({loading:false,error:"",rows:list});})
      .catch(e=>{if(!active||e?.code==="ERR_CANCELED"||e?.name==="CanceledError")return;setSt({loading:false,error:e?.response?.data?.message||e?.message||"Unable to load details.",rows:null});});
    return()=>{active=false;controller.abort();};},[usesInflow,from,to,refresh,retry]); // eslint-disable-line react-hooks/exhaustive-deps
  if(!def)return null;
  const rows=usesInflow?(st.rows||[]):(conversions||[]); const items=usesInflow?(st.rows?def.build(rows):[]):rows;
  const loading=usesInflow&&st.loading; const error=usesInflow?st.error:""; const truncated=usesInflow&&rows.length>=500;
  const kpis=card==="successRate"?[["Total inflow",num(read(summary,"totalInflow"))],["Converted",num(read(summary,"converted"))],["Success ratio",pct(read(summary,"successRate"))]]:!loading&&!error&&st.rows?[[card==="courses"?"Courses":card==="students"?"Students":"Records",items.length]]:[];
  const [icon,accent,accentBg]=CARD_ICON[card]||CARD_ICON.courses;
  return <Modal isOpen={!!card} toggle={onClose} size="xl" centered className={`tct-cd-modal cdm-${card}`} aria-labelledby="cdm-title">
    <div className="cdm-head" style={{"--cdm-accent":accent,"--cdm-accent-bg":accentBg}}><span className="cdm-icon" aria-hidden="true"><Icon name={icon}/></span>
      <div className="cdm-head-text"><h5 id="cdm-title" className="cdm-title">{def.title}</h5><p className="cdm-sub">{def.sub}</p>
        <span className="cdm-period"><Icon name="calendar"/>{periodLabel}</span></div>
      <button type="button" className="cdm-close" onClick={onClose} aria-label="Close"><Icon name="cross"/></button></div>
    <ModalBody>
      {kpis.length>0&&(card==="successRate"
        ?<div className="cdm-metrics">{kpis.map(([l,v],i)=><div key={l} className={`cdm-metric${i===kpis.length-1?" is-highlight":""}`}><span className="cdm-metric-label">{l}</span><span className="cdm-metric-value">{v}</span></div>)}</div>
        :<div className="cdm-kpis">{kpis.map(([l,v])=><span key={l} className="cdm-kpi">{l} <b>{v}</b></span>)}</div>)}
      {loading?<div className="cdm-state" role="status"><Spinner color="primary"/>Loading details…</div>
      :error?<div className="cdm-state"><Icon name="alert-circle" className="text-danger"/><span>{error}</span><Button size="sm" color="primary" outline onClick={()=>setRetry(x=>x+1)}>Try again</Button></div>
      :items.length===0?<div className="cdm-state"><Icon name="inbox"/>{def.empty}</div>
      :<div className="cdm-table-wrap"><Table hover className="mb-0"><thead><tr>{def.columns.map(c=><th key={c.label} className={c.num?"cdm-num":undefined}>{c.label}</th>)}</tr></thead>
        <tbody>{items.map((item,i)=><tr key={read(item,"salesDetailsId")||read(item,"studentId")||i}>
          {def.columns.map(c=><td key={c.label} className={[c.strong&&"cd-strong",c.num&&"cdm-num",c.nowrap&&"cdm-nowrap"].filter(Boolean).join(" ")||undefined}>{c.render(item)}</td>)}</tr>)}</tbody></Table></div>}
    </ModalBody>
    {(truncated||(def.link&&items.length>0&&!loading&&!error))&&<div className="cdm-foot"><Icon name="info"/><span>{truncated&&"Showing the first 500 records. Narrow the date range to see the rest. "}{def.link&&items.length>0&&!loading&&!error&&"Select a student's name to open their profile."}</span></div>}
  </Modal>;
};
const CoordinatorDashboard=()=>{const today=useMemo(()=>new Date(),[]); const [from,setFrom]=useState(iso(new Date(today.getFullYear(),today.getMonth(),1))); const [to,setTo]=useState(iso(today)); const [refresh,setRefresh]=useState(0); const [state,setState]=useState({loading:true,error:"",data:null}); const [detailCard,setDetailCard]=useState(null); const inflowCacheRef=useRef({});
useEffect(()=>{let active=true;setState(x=>({...x,loading:true,error:""}));getCurrentCoordinatorDashboard(from,to).then(data=>active&&setState({loading:false,error:"",data})).catch(e=>active&&setState({loading:false,error:e?.response?.data?.message||e.message||"Unable to load dashboard.",data:null}));return()=>{active=false};},[from,to,refresh]);
const d=state.data||{},s=d.summary||{};
const pipeline=(d.pipeline||[]).map(x=>({name:read(x,"statusName")||"Unknown",count:num(read(x,"demoCount"))})); const pipelineTotal=pipeline.reduce((t,x)=>t+x.count,0); const progress=(d.progress||[]).map(x=>({month:new Date(read(x,"reportMonth")).toLocaleDateString([],{month:"short",year:"2-digit"}),rate:num(read(x,"completionRate")),scheduled:num(read(x,"scheduled")),completed:num(read(x,"completed"))}));
// Class completion totals for the legend: sums of the API's monthly Scheduled/Completed, with the same
// formula the API uses per month (100 x Completed / Scheduled).
const trendScheduled=progress.reduce((t,x)=>t+x.scheduled,0); const trendCompleted=progress.reduce((t,x)=>t+x.completed,0);
const trendRate=trendScheduled>0?`${(100*trendCompleted/trendScheduled).toFixed(1)}%`:"—";
const fmtDay=v=>{const p=String(v||"").split("-");return p.length===3?new Date(+p[0],+p[1]-1,+p[2]).toLocaleDateString([],{day:"2-digit",month:"short",year:"numeric"}):v;};
const workload=d.workload||[]; const alerts=(d.alerts||[]).slice(0,12);
return <><Head title="Coordinator Dashboard"/><Content><style>{coordinatorDashStyle}</style><div className="tct-coord-dash">
<BlockHead size="sm"><BlockBetween><BlockHeadContent><BlockTitle page tag="h3">Coordinator Dashboard</BlockTitle><p className="cd-sub">Your students, courses, demo pipeline, and tutor workload.</p></BlockHeadContent>
<BlockHeadContent><DashboardDateRange fromDate={from} toDate={to} loading={state.loading} onRefresh={(range)=>{setFrom(range.fromDate);setTo(range.toDate);setRefresh(x=>x+1);}}/></BlockHeadContent></BlockBetween></BlockHead>
{state.loading&&<div role="status" className="text-soft mb-3"><Spinner size="sm"/> Loading dashboard…</div>}{state.error&&<Alert color="danger">{state.error}</Alert>}{!state.error&&<Block>
<div className="cd-stats">
<Stat icon="book" label="Courses" value={num(read(s,"courses"))} onClick={()=>setDetailCard("courses")}/>
<Stat icon="users" label="Students" value={num(read(s,"totalStudents"))} color="success" onClick={()=>setDetailCard("students")}/>
<Stat icon="inbox" label="Total inflow" value={num(read(s,"totalInflow"))} color="info" onClick={()=>setDetailCard("totalInflow")}/>
<Stat icon="calendar" label="Demo pending" value={num(read(s,"pendingDemos"))} color="warning" onClick={()=>setDetailCard("pendingDemos")}/>
<Stat icon="check-circle" label="Converted" value={num(read(s,"converted"))} color="purple" onClick={()=>setDetailCard("converted")}/>
<Stat icon="growth" label="Success ratio" value={`${num(read(s,"successRate")).toFixed(1)}%`} color="success" onClick={()=>setDetailCard("successRate")}/>
<Stat icon="calendar-check" label="Today's Scheduled Demo" value={num(read(s,"todayScheduledDemos"))} color="info"/>
<Stat icon="check-circle-cut" label="Today's Demo Completed" value={num(read(s,"todayCompletedDemos"))} color="purple"/>
</div>
<CardDetailsModal card={detailCard} onClose={()=>setDetailCard(null)} from={from} to={to} refresh={refresh} summary={s} conversions={d.conversions} cacheRef={inflowCacheRef} periodLabel={`${fmtDay(from)} – ${fmtDay(to)}`}/>
<div className="cd-grid-2">
<Card className="cd-card"><div className="cd-card-head"><h6 className="title">Demo pipeline</h6>{pipeline.length>0&&<span className="cd-count">{pipelineTotal}</span>}</div>{pipeline.length>0&&pipelineTotal>0?<div className="cd-pipe">
<div className="cd-pipe-chart"><ResponsiveContainer><PieChart><Pie data={pipeline} dataKey="count" nameKey="name" innerRadius="64%" outerRadius="92%" paddingAngle={pipeline.filter(x=>x.count>0).length>1?2:0} cornerRadius={4} stroke="#fff" strokeWidth={2} startAngle={90} endAngle={-270} isAnimationActive>{pipeline.map((x,i)=><Cell key={x.name+i} fill={PIPE_COLORS[i%PIPE_COLORS.length]}/>)}</Pie><Tooltip formatter={(value,name)=>[`${value} (${(100*value/pipelineTotal).toFixed(1)}%)`,name]} contentStyle={{borderRadius:10,border:"1px solid #e5e9f2",boxShadow:"0 8px 20px rgba(28,43,70,0.12)",fontSize:13}}/></PieChart></ResponsiveContainer>
<div className="cd-pipe-center" aria-hidden="true"><span className="cd-pipe-total">{pipelineTotal}</span><span className="cd-pipe-caption">Total demos</span></div></div>
<ul className="cd-pipe-legend">{pipeline.map((x,i)=><li key={x.name+i} title={`${x.name}: ${x.count}`}><span className="cd-dot" style={{background:PIPE_COLORS[i%PIPE_COLORS.length]}}/><span className="cd-pipe-name">{x.name}</span><span className="cd-pipe-value">{x.count}</span><span className="cd-pipe-share">{(100*x.count/pipelineTotal).toFixed(0)}%</span></li>)}</ul>
</div>:<div className="cd-chart"><div className="cd-empty cd-pipe-empty"><Icon name="pie"/><span>No demo data for this period.</span></div></div>}</Card>
<Card className="cd-card"><div className="cd-card-head"><h6 className="title">Class Completion Trend</h6><span className="cd-period" title="Uses the From / To dates above">{fmtDay(from)} – {fmtDay(to)}</span></div>
{progress.length>0?<div className="cd-trend">
<div className="cd-trend-chart"><ResponsiveContainer><BarChart data={progress} barGap={4} barCategoryGap="28%"><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f5"/><XAxis dataKey="month" tickLine={false} axisLine={{stroke:"#e5e9f2"}} tick={{fill:"#8094ae",fontSize:12}}/><YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{fill:"#8094ae",fontSize:12}} width={36}/><Tooltip cursor={{fill:"rgba(133,79,255,0.06)"}} formatter={(value,name)=>[value,name==="scheduled"?"Scheduled classes":"Completed classes"]} labelFormatter={(label)=>{const row=progress.find(x=>x.month===label);return row?`${label} · ${row.rate.toFixed(1)}% completed`:label;}}/><Bar dataKey="scheduled" fill="#b9a7ff" radius={[4,4,0,0]} maxBarSize={28}/><Bar dataKey="completed" fill="#1ee0ac" radius={[4,4,0,0]} maxBarSize={28}/></BarChart></ResponsiveContainer></div>
<ul className="cd-legend">
<li><span className="cd-dot" style={{background:"#b9a7ff"}}/><span className="cd-legend-label">Scheduled classes</span><span className="cd-legend-value">{trendScheduled}</span></li>
<li><span className="cd-dot" style={{background:"#1ee0ac"}}/><span className="cd-legend-label">Completed classes</span><span className="cd-legend-value">{trendCompleted}</span></li>
<li><span className="cd-dot" style={{background:"#854fff"}}/><span className="cd-legend-label">Completion rate</span><span className="cd-legend-value">{trendRate}</span></li>
</ul>
</div>:<div className="cd-chart"><div className="cd-empty">No completion data for this period.</div></div>}</Card>
</div>
<div className="cd-grid-2">
<Card className="cd-card"><div className="cd-card-head"><h6 className="title">Tutor workload</h6><span className="cd-count">{workload.length}</span></div><div className="cd-table-wrap"><Table hover className="mb-0"><thead><tr><th>Tutor</th><th>Students</th><th>Subjects</th><th>Rating</th><th>Engagement</th></tr></thead><tbody>{workload.length===0&&<tr><td colSpan={5} className="cd-table-empty">No tutor workload for this period.</td></tr>}{workload.map((x,i)=><tr key={read(x,"tutorId")||i}><td className="cd-strong">{read(x,"tutorName")||"—"}</td><td>{num(read(x,"students"))}</td><td>{num(read(x,"subjects"))}</td><td>{read(x,"averageRating")??"—"}</td><td><Badge color={read(x,"engagement")==="Low"?"warning":"success"}>{read(x,"engagement")}</Badge></td></tr>)}</tbody></Table></div></Card>
<Card className="cd-card"><div className="cd-card-head"><h6 className="title">Pending alerts</h6><span className="cd-count">{alerts.length}</span></div><div className="cd-table-wrap"><Table hover className="mb-0"><thead><tr><th>Student</th><th>Subject</th><th>Alert</th><th>Status</th></tr></thead><tbody>{alerts.length===0&&<tr><td colSpan={4} className="cd-table-empty">No pending alerts.</td></tr>}{alerts.map((x,i)=><tr key={read(x,"salesDetailsId")||i}><td className="cd-strong">{read(x,"studentName")||"—"}</td><td>{read(x,"subjectName")||"—"}</td><td>{read(x,"alertType")||"—"}</td><td><span className="cd-status">{read(x,"alertStatus")||"—"}</span></td></tr>)}</tbody></Table></div></Card>
</div>
</Block>}</div></Content></>}; export default CoordinatorDashboard;
