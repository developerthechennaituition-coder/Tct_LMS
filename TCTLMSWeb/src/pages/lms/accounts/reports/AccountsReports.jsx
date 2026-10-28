import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Spinner } from "reactstrap";
import Head from "../../../../layout/head/Head";
import Content from "../../../../layout/content/Content";
import { BlockHead, BlockHeadContent, BlockTitle, Icon } from "../../../../components/Component";
import { GetMenuByUser } from "../../../../apiservices/AuthenticateService";
import { ACCOUNTS_REPORTS } from "./accountsReportConfig";
import "../../operation/reports/OperationsReports.css";
import "./AccountsReports.css";

export const AccountsReportsNotAvailable = ({ message }) => (
  <div className="opr-state">
    <Icon name="lock-alt" />
    <p>{message}</p>
  </div>
);

export const NO_ACCOUNTS_REPORT_PERMISSION =
  "You do not have permission to view this report. A Super Admin can grant it in Settings → Role Permission → Accounts Reports.";

const REPORT_LINK_PREFIX = "/lms/accounts/reports/";

// Accounts report keys the signed-in role is granted in Role Permission, read fresh from the menu API on every
// page load (the copy saved at login can be stale). The API enforces the same permissions.
export const usePermittedAccountsReports = () => {
  const [state, setState] = useState({ loading: true, keys: new Set(), names: new Map() });
  useEffect(() => {
    let active = true;
    const roleId = localStorage.getItem("roleId");
    if (!roleId) {
      setState({ loading: false, keys: new Set(), names: new Map() });
      return undefined;
    }
    const collect = (items, keys, names) => {
      (Array.isArray(items) ? items : []).forEach((item) => {
        const link = (item?.link || "").trim().toLowerCase();
        if (link.startsWith(REPORT_LINK_PREFIX)) {
          const key = link.slice(REPORT_LINK_PREFIX.length).replace(/\/+$/, "");
          keys.add(key);
          if (item?.text) names.set(key, item.text);
        }
        collect(item?.subMenu, keys, names);
      });
    };
    GetMenuByUser(roleId)
      .then((menu) => {
        const keys = new Set();
        const names = new Map();
        collect(menu, keys, names);
        if (active) setState({ loading: false, keys, names });
      })
      .catch(() => active && setState({ loading: false, keys: new Set(), names: new Map() }));
    return () => {
      active = false;
    };
  }, []);
  return state;
};

// Accounts Reports landing: the report categories the signed-in role is permitted to view.
const AccountsReports = () => {
  const permitted = usePermittedAccountsReports();
  const visibleReports = ACCOUNTS_REPORTS.filter((report) => permitted.keys.has(report.key));
  return (
    <>
      <Head title="Accounts Reports" />
      <Content>
        <div className="tct-ops-reports tct-acc-reports">
          <BlockHead size="sm" className="opr-landing-head">
            <BlockHeadContent>
              <BlockTitle page tag="h3">Accounts Reports</BlockTitle>
              <p className="opr-sub">Invoices, revenue, payments, margins and dropouts — from live accounts data.</p>
            </BlockHeadContent>
            {!permitted.loading && visibleReports.length > 0 && (
              <span className="opr-count">
                {visibleReports.length} {visibleReports.length === 1 ? "report" : "reports"} available
              </span>
            )}
          </BlockHead>
          {permitted.loading ? (
            <div className="opr-state" role="status"><Spinner color="primary" /> Loading reports…</div>
          ) : visibleReports.length === 0 ? (
            <AccountsReportsNotAvailable message="No Accounts reports have been granted to your role. A Super Admin can grant them in Settings → Role Permission → Accounts Reports." />
          ) : (
            <div className="opr-grid opr-report-grid">
              {visibleReports.map((report) => (
                <Link key={report.key} to={`${process.env.PUBLIC_URL}/lms/accounts/reports/${report.key}`} className={`opr-report-card acr-tone-${report.key}`}>
                  <span className="opr-card-chip" aria-hidden="true">
                    <Icon name={report.icon} />
                  </span>
                  <span className="opr-card-title">{permitted.names.get(report.key) || report.title}</span>
                  <span className="opr-card-desc">{report.description}</span>
                  {report.unavailable && <span className="acr-card-partial">Partial — some data not recorded</span>}
                  <span className="opr-card-cta">
                    View report <Icon name="arrow-right" />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </Content>
    </>
  );
};

export default AccountsReports;
