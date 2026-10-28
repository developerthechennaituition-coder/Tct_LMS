import React from "react";
import { Icon } from "../../../components/Component";

export const TUTOR_PAGE_SIZES = [10, 25, 50, 100];

// Page numbers to show: always the first and last page, plus a window around the current page.
const pageItems = (page, totalPages) => {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const start = Math.max(2, Math.min(page - 1, totalPages - 4));
  const end = Math.min(totalPages - 1, Math.max(page + 1, 5));
  const items = [1];
  if (start > 2) items.push("gap-start");
  for (let i = start; i <= end; i++) items.push(i);
  if (end < totalPages - 1) items.push("gap-end");
  items.push(totalPages);
  return items;
};

// Rows per page + record range + page navigation for the Tutor List tables.
const TutorListPagination = ({ page, pageSize, total, onPageChange, onPageSizeChange, disabled = false }) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  const from = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, total);
  const go = (next) => {
    if (disabled || next < 1 || next > totalPages || next === current) return;
    onPageChange(next);
  };

  return (
    <div className="tutor-list-pager">
      <div className="tutor-list-pager-size">
        <label htmlFor="tutorRowsPerPage">Rows per page</label>
        <div className="form-control-select">
          <select
            id="tutorRowsPerPage"
            className="form-control form-control-sm"
            value={pageSize}
            disabled={disabled}
            onChange={(ev) => onPageSizeChange(Number(ev.target.value))}
          >
            {TUTOR_PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
        <span className="tutor-list-pager-range" role="status" aria-live="polite">
          {from}–{to} of {total}
        </span>
      </div>
      <nav aria-label="Tutor list pages">
        <ul className="pagination pagination-sm mb-0">
          <li className={`page-item ${current === 1 || disabled ? "disabled" : ""}`}>
            <button type="button" className="page-link" onClick={() => go(current - 1)} aria-label="Previous page">
              <Icon name="chevron-left" />
              <span className="d-none d-sm-inline">Prev</span>
            </button>
          </li>
          {pageItems(current, totalPages).map((item) =>
            typeof item === "number" ? (
              <li key={item} className={`page-item d-none d-sm-block ${item === current ? "active" : ""}`}>
                <button
                  type="button"
                  className="page-link"
                  onClick={() => go(item)}
                  aria-current={item === current ? "page" : undefined}
                >
                  {item}
                </button>
              </li>
            ) : (
              <li key={item} className="page-item disabled d-none d-sm-block">
                <span className="page-link">…</span>
              </li>
            )
          )}
          <li className="page-item d-sm-none disabled">
            <span className="page-link">
              {current} / {totalPages}
            </span>
          </li>
          <li className={`page-item ${current === totalPages || disabled ? "disabled" : ""}`}>
            <button type="button" className="page-link" onClick={() => go(current + 1)} aria-label="Next page">
              <span className="d-none d-sm-inline">Next</span>
              <Icon name="chevron-right" />
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default TutorListPagination;
