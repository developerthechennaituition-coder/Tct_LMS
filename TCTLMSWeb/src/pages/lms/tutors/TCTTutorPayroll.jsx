import React, { useState, useEffect, useRef } from "react";
import { toast, ToastContainer } from "react-toastify";
import { Block, BlockBetween, BlockHead, BlockHeadContent, BlockTitle, Icon, ReactDataTable } from "../../../components/Component";
import Content from "../../../layout/content/Content";
import Head from "../../../layout/head/Head";
import { gettutorpayroll } from "../../../apiservices/ScheduleService";
import { generateTutorInvoice } from "../../../apiservices/TutorService";
import { Link } from "react-router-dom";
import { Button, Input, UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem } from "reactstrap";
import DataTable from "react-data-table-component";

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
  /* Cancelled classes to review (not deducted: not certain whether they were re-scheduled). */
  .tct-pr-card .tct-pr-review { margin-top: 6px; padding: 6px 8px; border: 1px solid #f4d48a; border-radius: 8px; background: #fff8e6;
    font-size: 12px; line-height: 1.4; color: #7a5600; white-space: normal; }
  .tct-pr-card .tct-pr-review strong { display: block; font-size: 12.5px; color: #6b4a00; }
  .tct-pr-card .tct-pr-review ul { margin: 4px 0 0; padding-left: 16px; }
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

// Tutor role only: every selector is under .tct-pr-tutor (rendered for roleId 13); other roles keep tutorPayrollStyle alone.
const tutorRolePayrollStyle = `
  .tct-pr-tutor .nk-block-head { padding-bottom: 16px; }
  .tct-pr-tutor .nk-block-title.page-title { font-size: 1.65rem; letter-spacing: -0.01em; }
  /* Toolbar: Refresh keeps the same height as the other controls */
  .tct-pr-tutor .tct-pr-toolbar { gap: 10px; }
  .tct-pr-tutor .tct-pr-toolbar > .btn { height: 38px; padding: 0 18px; border-radius: 8px; font-weight: 600; }
  .tct-pr-tutor .tct-pr-toolbar > .btn:focus-visible { box-shadow: 0 0 0 3px rgba(133, 79, 255, 0.25); }

  /* Table: tighter rows, clear header */
  .tct-pr-tutor .tct-pr-card { border-radius: 14px; }
  .tct-pr-tutor .tct-pr-card .rdt_TableHeadRow { min-height: 44px; }
  .tct-pr-tutor .tct-pr-card .rdt_TableCol { font-size: 11.5px; letter-spacing: 0.06em; }
  .tct-pr-tutor .tct-pr-card .rdt_TableCol_Sortable:hover { color: #854fff; }
  .tct-pr-tutor .tct-pr-card .rdt_TableRow { min-height: 0; }
  .tct-pr-tutor .tct-pr-card .rdt_TableCell { padding-top: 10px; padding-bottom: 10px; }
  .tct-pr-tutor .tct-pr-card .rdt_TableRow:hover { background: #faf7ff; }
  /* Tutor name: wraps on word boundaries; month is secondary */
  .tct-pr-tutor .tct-pr-card .rdt_TableCell .user-info { min-width: 0; }
  .tct-pr-tutor .tct-pr-card .rdt_TableCell .tb-lead { line-height: 1.45; white-space: normal; overflow-wrap: anywhere; }
  .tct-pr-tutor .tct-pr-card .rdt_TableCell:nth-child(2) .tb-lead { font-weight: 500; color: #526484; }

  /* Classes: compact 2 x 2 group (label left, count right) */
  .tct-pr-stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 6px; width: 100%; max-width: 300px; margin: 0; }
  .tct-pr-stat {
    display: flex; align-items: center; justify-content: space-between; gap: 6px; min-width: 0;
    padding: 3px 8px; border-radius: 6px; background: #f6f7fb; line-height: 1.4;
  }
  .tct-pr-stat dt { min-width: 0; margin: 0; font-size: 11.5px; font-weight: 500; color: #6b7a90; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tct-pr-stat dd { margin: 0; font-size: 13px; font-weight: 700; color: #1c2b46; font-variant-numeric: tabular-nums; }
  .tct-pr-stat:last-child { background: #f3eeff; }
  .tct-pr-stat:last-child dt { color: #6a35e8; }
  .tct-pr-card .rdt_TableRow:hover .tct-pr-stat { background: #fff; }

  /* Payment: amount prominent, helper text readable */
  .tct-pr-tutor .tct-pr-card .tct-pr-amount .tb-lead { font-size: 16px; color: #1c2b46; letter-spacing: -0.01em; }
  .tct-pr-tutor .tct-pr-card .rdt_TableRow:hover .tct-pr-amount .tb-lead { color: #4c1fd0; }
  .tct-pr-tutor .tct-pr-card .tct-pr-amount small { margin-top: 2px; font-size: 12px; color: #8094ae !important; }

  /* Status: soft filled badges, darker text for contrast (same text and status as before) */
  .tct-pr-tutor .tct-pr-card .rdt_TableCell .badge > p.tct-pr-status {
    display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px 4px 8px; border: 0; white-space: normal; text-align: left;
  }
  .tct-pr-tutor .tct-pr-card .rdt_TableCell .badge > p.tct-pr-status::before { content: ""; flex: none; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
  .tct-pr-status.is-processed { color: #0c8a68 !important; background: #e3f9f2 !important; }
  .tct-pr-status.is-pending { color: #946b00 !important; background: #fff6dc !important; }
  .tct-pr-status.is-awaiting-operations-approval { color: #067a8c !important; background: #e1f7fb !important; }
  .tct-pr-status.is-no-classes-taken { color: #5d6b82 !important; background: #f1f3f8 !important; }

  /* Action */
  .tct-pr-note { font-size: 13px; line-height: 1.45; color: #8094ae; }
  .tct-pr-note.is-waiting { color: #067a8c; }
  .tct-pr-tutor .tct-pr-card .rdt_TableCell a { font-size: 13px; font-weight: 600; line-height: 1.6; color: #6a35e8; }
  .tct-pr-tutor .tct-pr-card .rdt_TableCell a:hover { color: #4c1fd0; text-decoration: underline; }
  .tct-pr-tutor .tct-pr-card .rdt_TableCell a:focus-visible,
  .tct-pr-tutor .tct-pr-card .rdt_TableCell .btn:focus-visible { outline: none; border-radius: 4px; box-shadow: 0 0 0 3px rgba(133, 79, 255, 0.25); }

  /* Compact pager (TutorPayrollPagination): page controls | record range (centred) | Rows per page */
  .tct-pr-pager {
    display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; gap: 12px 16px;
    padding: 12px 18px; border-top: 1px solid #e5e9f2;
  }
  .tct-pr-pager-nav { justify-self: start; min-width: 0; }
  .tct-pr-pager .pagination { display: flex; flex-wrap: nowrap; align-items: center; gap: 4px; margin: 0; padding: 0; border: 0; background: transparent; }
  .tct-pr-pager .page-item .page-link {
    display: inline-flex; align-items: center; justify-content: center; gap: 4px; min-width: 34px; height: 34px; margin: 0; padding: 0 10px;
    font-size: 13px; font-weight: 600; line-height: 1; color: #526484; background: #fff; border: 1px solid #e5e9f2; border-radius: 8px;
    font-variant-numeric: tabular-nums; transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  }
  .tct-pr-pager .page-item .page-link .icon { font-size: 14px; }
  .tct-pr-pager .page-item:not(.disabled):not(.active) .page-link:hover { color: #6a35e8; background: #f5f1ff; border-color: #d9cbff; }
  .tct-pr-pager .page-item.active .page-link { color: #fff; background: #854fff; border-color: #854fff; box-shadow: 0 4px 10px rgba(133, 79, 255, 0.25); }
  .tct-pr-pager .page-item.disabled .page-link { color: #b7c2d0; background: #fafbfc; cursor: not-allowed; }
  .tct-pr-pager .page-link.tct-pr-pager-gap { min-width: 24px; padding: 0 2px; color: #8094ae; background: transparent; border-color: transparent; letter-spacing: 0.08em; }
  .tct-pr-pager .page-link:focus { outline: none; box-shadow: none; }
  .tct-pr-pager .page-link:focus-visible { box-shadow: 0 0 0 3px rgba(133, 79, 255, 0.28); }
  .tct-pr-pager-range { justify-self: center; font-size: 13px; font-weight: 500; color: #6b7a90; white-space: nowrap; font-variant-numeric: tabular-nums; }
  /* Rows per page sits in the pager's third track (not over the footer, as on the other roles' layout). */
  .tct-pr-tutor .tct-pr-pager .tct-pr-rpp { position: static; height: auto; padding: 0; justify-self: end; }
  @media (max-width: 767.98px) {
    /* Stacked and centred: page controls, record range, then Rows per page */
    .tct-pr-pager { grid-template-columns: 1fr; justify-items: center; padding: 14px; gap: 10px; }
    .tct-pr-pager-nav, .tct-pr-tutor .tct-pr-pager .tct-pr-rpp { justify-self: center; }
  }

  /* Status filter (themed dropdown) */
  .tct-pr-filter-toggle {
    display: inline-flex; align-items: center; gap: 10px; width: 280px; max-width: 100%; height: 38px; padding: 0 12px 0 14px;
    font-size: 14px; font-weight: 600; line-height: 1; color: #364a63; text-align: left; cursor: pointer;
    background: #fff; border: 1px solid #dbdfea; border-radius: 8px;
    transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
  }
  .tct-pr-filter-toggle:hover { border-color: #c4b0ff; background: #fbf9ff; }
  .tct-pr-filter-toggle:focus { outline: none; }
  .tct-pr-filter-toggle:focus-visible,
  .tct-pr-filter .show > .tct-pr-filter-toggle { border-color: #854fff; box-shadow: 0 0 0 3px rgba(133, 79, 255, 0.18); }
  .tct-pr-filter-toggle > .icon { flex: none; margin-left: 2px; font-size: 14px; color: #854fff; transition: transform 0.15s ease; }
  .tct-pr-filter .show > .tct-pr-filter-toggle > .icon { transform: rotate(180deg); }
  .tct-pr-filter-label { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tct-pr-filter-count {
    flex: none; min-width: 26px; padding: 3px 7px; border-radius: 999px; text-align: center;
    font-size: 12px; font-weight: 700; line-height: 1.2; color: #6a35e8; background: #f1ebff; font-variant-numeric: tabular-nums;
  }
  .tct-pr-filter-dot { flex: none; width: 8px; height: 8px; border-radius: 50%; background: #854fff; }
  .tct-pr-filter-dot.is-no-classes-taken { background: #8094ae; }
  .tct-pr-filter-dot.is-awaiting-operations-approval { background: #09c2de; }
  .tct-pr-filter-dot.is-pending { background: #f4bd0e; }
  .tct-pr-filter-dot.is-processed { background: #1ee0ac; }
  .tct-pr-filter .tct-pr-filter-menu {
    z-index: 1000; width: 300px; max-width: calc(100vw - 32px); margin-top: 6px; padding: 6px;
    background: #fff; border: 1px solid #e5e9f2; border-radius: 12px; box-shadow: 0 12px 30px rgba(31, 43, 58, 0.16);
  }
  .tct-pr-filter .tct-pr-filter-menu .dropdown-item {
    display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px;
    font-size: 14px; font-weight: 500; line-height: 1.3; color: #364a63; white-space: normal;
  }
  .tct-pr-filter .tct-pr-filter-menu .dropdown-item + .dropdown-item { margin-top: 2px; }
  .tct-pr-filter .tct-pr-filter-menu .dropdown-item .tct-pr-filter-label { white-space: normal; }
  .tct-pr-filter .tct-pr-filter-menu .dropdown-item .tct-pr-filter-count { color: #526484; background: #f1f3f8; }
  .tct-pr-filter .tct-pr-filter-menu .dropdown-item .tct-pr-filter-check { flex: none; width: 16px; font-size: 14px; color: #854fff; visibility: hidden; }
  .tct-pr-filter .tct-pr-filter-menu .dropdown-item:hover,
  .tct-pr-filter .tct-pr-filter-menu .dropdown-item:focus { background: #f5f1ff; color: #4c1fd0; outline: none; }
  .tct-pr-filter .tct-pr-filter-menu .dropdown-item:focus-visible { box-shadow: inset 0 0 0 2px rgba(133, 79, 255, 0.4); }
  .tct-pr-filter .tct-pr-filter-menu .dropdown-item.active { background: #f1ebff; color: #4c1fd0; font-weight: 600; }
  .tct-pr-filter .tct-pr-filter-menu .dropdown-item.active .tct-pr-filter-count { color: #fff; background: #854fff; }
  .tct-pr-filter .tct-pr-filter-menu .dropdown-item.active .tct-pr-filter-check { visibility: visible; }

  /* Tablet / phone: the table keeps every column and scrolls sideways inside the card only */
  .tct-pr-tutor .tct-pr-card { max-width: 100%; }
  .tct-pr-tutor .tct-pr-card .dataTables_wrapper > div:not(.row) { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  @media (max-width: 991.98px) {
    .tct-pr-tutor .nk-block-head .nk-block-between > .nk-block-head-content:last-child { flex: 1 1 100%; margin-left: 0; }
    .tct-pr-tutor .tct-pr-toolbar { justify-content: flex-start; }
  }
  @media (max-width: 575.98px) {
    .tct-pr-tutor .tct-pr-toolbar > .tct-pr-month { flex: 1 1 100%; justify-content: space-between; }
    /* One full-width control per row, in the same order as on desktop (keeps keyboard order). */
    .tct-pr-tutor .tct-pr-toolbar > .tct-pr-year,
    .tct-pr-tutor .tct-pr-toolbar > .btn { flex: 1 1 100%; min-width: 0; }
    .tct-pr-tutor .tct-pr-toolbar .tct-pr-filter-toggle,
    .tct-pr-tutor .tct-pr-toolbar .tct-pr-year-toggle { width: 100%; }
    .tct-pr-tutor .tct-pr-year .dropdown { display: block; }
    .tct-pr-filter .tct-pr-filter-menu { width: 100%; }
  }
`;

const money = value => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(value) || 0);
const errorMessage = error => error?.response?.data?.message ||
  (typeof error?.response?.data === "string" ? error.response.data : error?.message) || "Unable to load payroll.";
const PAGE_SIZE_OPTIONS = [5, 10, 15, 25];
const AWAITING_OPS = "Awaiting Operations Approval";
const STATUS_COLORS = { "Processed": "#1ee0ac", "Pending": "#f4bd0e", [AWAITING_OPS]: "#09c2de", "No classes taken": "#8094ae" };
const STATUS_OPTIONS = ["All", "No classes taken", AWAITING_OPS, "Pending", "Processed"];
// "Awaiting Operations Approval" → "awaiting-operations-approval" (CSS modifier for the tutor view's status colours).
const statusSlug = value => String(value || "").toLowerCase().replace(/[^a-z]+/g, "-");

// Tutor view pager: page numbers to show — first and last page, the current page and its neighbours, and the
// first four pages near the start (or last four near the end). A one-page gap shows that page instead of "…".
const compactPageItems = (page, totalPages) => {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const keep = new Set([1, totalPages, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach(n => keep.add(n));
  if (page >= totalPages - 2) [totalPages - 3, totalPages - 2, totalPages - 1].forEach(n => keep.add(n));
  const pages = [...keep].filter(n => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  const items = [];
  pages.forEach((n, i) => {
    const gap = i > 0 ? n - pages[i - 1] : 1;
    if (gap === 2) items.push(n - 1);
    else if (gap > 2) items.push(`gap-${n}`);
    items.push(n);
  });
  return items;
};

// Tutor view footer: page controls | record range | Rows per page. The table component owns the page state and
// passes onChangePage; the page-size choice goes back to the page's existing handler (paginationComponentOptions).
const TutorPayrollPagination = ({ currentPage, rowsPerPage, rowCount, onChangePage, paginationComponentOptions }) => {
  const totalPages = Math.max(1, Math.ceil(rowCount / rowsPerPage));
  const current = Math.min(Math.max(1, currentPage), totalPages);
  const from = rowCount === 0 ? 0 : (current - 1) * rowsPerPage + 1;
  const to = Math.min(current * rowsPerPage, rowCount);
  const go = next => { if (next >= 1 && next <= totalPages && next !== current) onChangePage(next); };
  const { pageSizes = [], onPageSizeSelected } = paginationComponentOptions || {};
  return (
    <div className="tct-pr-pager">
      <nav aria-label="Payroll pages" className="tct-pr-pager-nav">
        <ul className="pagination mb-0">
          <li className={`page-item${current === 1 ? " disabled" : ""}`}>
            <button type="button" className="page-link tct-pr-pager-step" onClick={() => go(current - 1)} disabled={current === 1} aria-label="Previous page">
              <Icon name="chevrons-left" /><span>Prev</span>
            </button>
          </li>
          {compactPageItems(current, totalPages).map(item => typeof item === "number" ? (
            <li key={item} className={`page-item d-none d-sm-block${item === current ? " active" : ""}`}>
              <button type="button" className="page-link" onClick={() => go(item)}
                aria-label={`Page ${item}`} aria-current={item === current ? "page" : undefined}>{item}</button>
            </li>
          ) : (
            <li key={item} className="page-item disabled d-none d-sm-block" aria-hidden="true">
              <span className="page-link tct-pr-pager-gap">…</span>
            </li>
          ))}
          <li className="page-item active d-sm-none">
            <span className="page-link tct-pr-pager-of">{current} / {totalPages}</span>
          </li>
          <li className={`page-item${current === totalPages ? " disabled" : ""}`}>
            <button type="button" className="page-link tct-pr-pager-step" onClick={() => go(current + 1)} disabled={current === totalPages} aria-label="Next page">
              <span>Next</span><Icon name="chevrons-right" />
            </button>
          </li>
        </ul>
      </nav>
      <span className="tct-pr-pager-range" role="status" aria-live="polite">{from}–{to} of {rowCount}</span>
      <div className="tct-pr-rpp">
        <span>Rows per page</span>
        <UncontrolledDropdown direction="up">
          <DropdownToggle tag="button" type="button" className="tct-pr-rpp-toggle" aria-label={`Rows per page: ${rowsPerPage}`}>
            <span>{rowsPerPage}</span>
            <Icon name="chevron-down" />
          </DropdownToggle>
          <DropdownMenu right className="tct-pr-rpp-menu">
            {pageSizes.map(size => (
              <DropdownItem key={size} tag="button" type="button" active={rowsPerPage === size}
                onClick={() => onPageSizeSelected && onPageSizeSelected(size)}>
                <span>{size}</span>
                {rowsPerPage === size && <Icon name="check" />}
              </DropdownItem>
            ))}
          </DropdownMenu>
        </UncontrolledDropdown>
      </div>
    </div>
  );
};

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
    if (processingRef.current || row.isInvoiceGenerated || !row.noOfDaysPresent || !row.approved || row.approved !== row.noOfDaysPresent) return;
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

  // Tutor role (13): presentation layer only (.tct-pr-tutor styles, compact Classes group, column widths).
  const isTutorView = localStorage.getItem("roleId") === "13";
  const classCounts = row => [
    ["Scheduled", row.totalNoOfClasses || 0],
    ["Completed", row.noOfDaysPresent || 0],
    ["Cancelled", row.noOfDaysAbsent || 0],
    ["Operations approved", row.approved || 0],
  ];

  const columns = [
    { name: "Tutor", selector: row => row.tutorName, sortable: true,
      cell: row => <div className="user-info"><span className="tb-lead">{row.tutorName} ({row.userCode})</span></div> },
    { name: "Month", cell: row => <div className="user-info"><span className="tb-lead">{row.scheduleMonthName} {row.scheduleYear}</span></div> },
    { name: "Classes", cell: row => isTutorView
      ? <dl className="tct-pr-stats">{classCounts(row).map(([label, value]) =>
          <div key={label} className="tct-pr-stat"><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      : <div className="user-info tct-pr-details">
      <span>Scheduled: {row.totalNoOfClasses || 0}</span>
      <span>Completed: {row.noOfDaysPresent || 0}</span>
      <span>Cancelled: {row.noOfDaysAbsent || 0}</span>
      <span>Operations approved: {row.approved || 0}</span></div> },
    { name: "Tutor Payment", selector: row => row.totalTutorPayment, sortable: true,
      cell: row => <div className="user-info tct-pr-amount"><span className="tb-lead">{money(row.totalTutorPayment)}</span>
        <small className="d-block text-soft">{row.isInvoiceGenerated ? "Saved payslip total" : "Approved classes estimate"}</small></div> },
    { name: "Status", selector: row => row.payrollStatus,
      cell: row => <div>
        <div className="badge"><p
          className={isTutorView ? `tct-pr-status is-${statusSlug(row.payrollStatus)}` : undefined}
          style={{ color: STATUS_COLORS[row.payrollStatus] || "#526484" }}>{row.payrollStatus}</p></div>
        {/* Cancelled classes not deducted because it is not certain whether they were re-scheduled: for review. */}
        {/* Staff view only: not on a tutor's own payroll (roleId 13). Independent of the tutor-view styling. */}
        {localStorage.getItem("roleId") !== "13" && row.cancellationsToReview > 0 && (
          <div className="tct-pr-review" role="note">
            <strong>{row.cancellationsToReview} cancelled class{row.cancellationsToReview > 1 ? "es" : ""} to review</strong>
            <span>Not deducted: it is not certain whether {row.cancellationsToReview > 1 ? "they were" : "it was"} re-scheduled.</span>
            <ul>{(row.cancellationReviewNotes || []).map(note => <li key={note}>{note}</li>)}</ul>
          </div>
        )}
      </div> },
    { name: "Action", cell: row => row.isInvoiceGenerated
      ? <div>{(row.invoiceNumbers?.length ? row.invoiceNumbers : [row.invoiceNumber]).filter(Boolean).map(number =>
          <Link key={number} to={`${process.env.PUBLIC_URL}/lms/tutors/tutor-invoice-details?invNumber=${encodeURIComponent(number)}&from=payroll`}>View Payslip {number}<br /></Link>)}</div>
      : !row.noOfDaysPresent ? <span className={isTutorView ? "tct-pr-note" : undefined}>No completed classes</span>
      // No payable (Operations-approved) class yet, or some completed classes still unapproved: no payslip.
      : !row.approved || row.approved !== row.noOfDaysPresent ? <span className={isTutorView ? "tct-pr-note is-waiting" : undefined}>Waiting for Operations approval</span>
      : <Button size="sm" color="primary" disabled={Boolean(processing)} onClick={() => generate(row)}>
          {processing === row.tutorId ? "Processing…" : "Generate Payslip"}
        </Button> }
  ];
  // Tutor view: column sizing only (same columns, selectors, sorting and cells).
  const tutorColumnLayout = {
    "Tutor": { minWidth: "210px", grow: 2, wrap: true },
    "Month": { minWidth: "120px", maxWidth: "140px" },
    "Classes": { minWidth: "270px", grow: 2 },
    "Tutor Payment": { minWidth: "170px", grow: 1 },
    "Status": { minWidth: "200px", grow: 1 },
    "Action": { minWidth: "190px", grow: 1, wrap: true },
  };
  const tableColumns = isTutorView ? columns.map(column => ({ ...column, ...tutorColumnLayout[column.name] })) : columns;

  const visibleRows = status === "All" ? rows : rows.filter(row => row.payrollStatus === status);
  const statusCount = value => value === "All" ? rows.length : rows.filter(row => row.payrollStatus === value).length;
  const currentYear = new Date().getFullYear();
  const years = Array.from(new Set([...Array.from({ length: 11 }, (_, index) => currentYear - 5 + index), year])).sort();
  return <>
    <Head title="Tutor Payroll" />
    <Content>
      <style>{tutorPayrollStyle}</style>
      {isTutorView && <style>{tutorRolePayrollStyle}</style>}
      <div className={isTutorView ? "tct-pr tct-pr-tutor" : "tct-pr"}>
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
              {isTutorView ? (
                // Tutor view: themed dropdown (a native select's option list cannot be styled); same options,
                // counts and setStatus handler as the select below.
                <div className="tct-pr-year tct-pr-filter">
                  <UncontrolledDropdown>
                    <DropdownToggle tag="button" type="button" className="tct-pr-filter-toggle"
                      aria-label={`Payroll status: ${status} (${statusCount(status)})`}>
                      <span className={`tct-pr-filter-dot is-${statusSlug(status)}`} aria-hidden="true" />
                      <span className="tct-pr-filter-label">{status}</span>
                      <span className="tct-pr-filter-count">{statusCount(status)}</span>
                      <Icon name="chevron-down" />
                    </DropdownToggle>
                    <DropdownMenu right className="tct-pr-filter-menu">
                      {STATUS_OPTIONS.map(value => (
                        <DropdownItem key={value} tag="button" type="button" active={status === value}
                          aria-current={status === value ? "true" : undefined} onClick={() => setStatus(value)}>
                          <span className={`tct-pr-filter-dot is-${statusSlug(value)}`} aria-hidden="true" />
                          <span className="tct-pr-filter-label">{value}</span>
                          <span className="tct-pr-filter-count">{statusCount(value)}</span>
                          <Icon name="check" className="tct-pr-filter-check" />
                        </DropdownItem>
                      ))}
                    </DropdownMenu>
                  </UncontrolledDropdown>
                </div>
              ) : (
              <div className="tct-pr-year">
                <Input type="select" aria-label="Payroll status" value={status} style={{ width: "280px" }}
                  onChange={event => setStatus(event.target.value)}>
                  {STATUS_OPTIONS.map(value =>
                    <option key={value} value={value}>{value} ({statusCount(value)})</option>)}
                </Input>
              </div>
              )}
              <Button outline color="primary" disabled={loading} onClick={() => fetchPayroll(month, year)}>Refresh</Button>
            </div>
          </BlockHeadContent>
        </BlockBetween>
      </BlockHead>
      {loading ? <div role="status" className="spinner-grow text-success"><span className="sr-only">Loading payroll…</span></div>
        : error ? <div role="alert" className="text-danger">{error} <Button size="sm" onClick={() => fetchPayroll(month, year)}>Retry</Button></div>
        : <Block>
            <div className="tct-pr-card">
              {visibleRows.length > 0 && isTutorView ? (
                // Tutor view: same table library and props as ReactDataTable, with the compact TutorPayrollPagination footer.
                <div className="dataTables_wrapper dt-bootstrap4 no-footer">
                  <DataTable key={`${year}-${month}-${status}-${itemPerPage}`} data={visibleRows} columns={tableColumns}
                    className="nk-tb-list" pagination paginationPerPage={itemPerPage} paginationRowsPerPageOptions={PAGE_SIZE_OPTIONS}
                    paginationComponent={TutorPayrollPagination}
                    paginationComponentOptions={{ pageSizes: PAGE_SIZE_OPTIONS, onPageSizeSelected: size => { if (itemPerPage !== size) setItemPerPage(size); } }}
                    noDataComponent={<div className="p-2">There are no records found</div>}
                    sortIcon={<div><span>&darr;</span><span>&uarr;</span></div>} />
                </div>
              ) : visibleRows.length > 0 ? (
                <ReactDataTable key={`${year}-${month}-${status}-${itemPerPage}`} data={visibleRows} columns={tableColumns}
                  pagination pageSize={itemPerPage} className="nk-tb-list" />
              ) : (
                <p className="tct-pr-empty">No records found for this month</p>
              )}
              {visibleRows.length > 0 && !isTutorView && (
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
