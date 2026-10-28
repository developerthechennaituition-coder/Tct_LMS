import React, { useCallback, useEffect, useState } from "react";
import moment from "moment";
import { Modal, ModalBody, ModalFooter, Spinner } from "reactstrap";
import { toast, ToastContainer } from "react-toastify";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import { BlockHead, BlockHeadContent, BlockTitle, Icon } from "../../../components/Component";
import {
  approveChangeRequest, changeRequestErrorMessage, getOperationsChangeRequests, getReplacementTutors, rejectChangeRequest,
} from "../../../apiservices/ChangeRequestService";
import { CHANGE_REQUEST_PAGES, MAX_NOTE_LENGTH, STUDENT_CHANGE, validateDecision } from "../../../library/changeRequestRules";
import useMenuPermission from "./useMenuPermission";
import "./ChangeRequests.css";

const STATUS_TABS = [
  { key: "Pending", label: "Pending" },
  { key: "Reassigned", label: "Reassigned" },
  { key: "Rejected", label: "Rejected" },
  { key: "", label: "All" },
];
const statusBadge = (status) => (
  <span className={`cr-badge is-${String(status || "").toLowerCase()}`}>{status}</span>
);
const fmt = (value, withTime) => (value ? moment.utc(value).local().format(withTime ? "DD-MMM-YYYY hh:mm A" : "DD-MMM-YYYY") : "—");

// Review of one request. Approving moves the course (and its upcoming classes) to the chosen tutor; the
// server re-checks scope, eligibility, the tutor's rate, timetable clashes and that the request is still open.
const ReviewModal = ({ page, request, onClose, onDecided }) => {
  const pending = request.status === "Pending";
  const [tutors, setTutors] = useState({ loading: pending, error: "", items: [] });
  const [newTutorId, setNewTutorId] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState({});
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!pending) return undefined;
    let active = true;
    getReplacementTutors(page.list, request.id)
      .then((response) => active && setTutors({ loading: false, error: "", items: Array.isArray(response?.data) ? response.data : [] }))
      .catch((error) => active && setTutors({ loading: false, error: changeRequestErrorMessage(error, "Unable to load eligible tutors."), items: [] }));
    return () => {
      active = false;
    };
  }, [page.list, request.id, pending]);

  const chosen = tutors.items.find((t) => t.tutorId === newTutorId);

  const decide = (decision) => {
    const next = validateDecision(decision, { newTutorId, note, tutors: tutors.items });
    setErrors(next);
    if (Object.keys(next).length) return;
    if (decision === "approve" && !confirming) {
      setConfirming(true);
      return;
    }
    setSaving(true);
    const call = decision === "approve"
      ? approveChangeRequest(page.list, request.id, { newTutorId, note: note.trim() || null })
      : rejectChangeRequest(page.list, request.id, { note: note.trim() });
    call
      .then((response) => {
        toast.success(response?.message || (decision === "approve" ? "Tutor reassigned." : "Request rejected."));
        onDecided();
      })
      .catch((error) => {
        setConfirming(false);
        setErrors({ form: changeRequestErrorMessage(error, "Unable to save the decision. Please try again.") });
      })
      .finally(() => setSaving(false));
  };

  return (
    <Modal isOpen toggle={saving ? undefined : onClose} className="modal-dialog-centered tct-cr-modal" size="lg">
      <div className="cr-modal-head">
        <span className="cr-chip" aria-hidden="true"><Icon name="swap" /></span>
        <div>
          <h5 className="cr-modal-title">Request #{request.requestNo} · {request.requestType === STUDENT_CHANGE ? "Student Change" : "Tutor Change"}</h5>
          <p className="cr-modal-sub">{request.studentName} · {request.subjectName}</p>
        </div>
        {statusBadge(request.status)}
        <button type="button" className="close" aria-label="Close" onClick={onClose} disabled={saving}>
          <Icon name="cross-sm" />
        </button>
      </div>
      <ModalBody>
        <dl className="cr-facts">
          <dt>Student</dt>
          <dd>{request.studentName || "—"}</dd>
          <dt>Current tutor</dt>
          <dd>{request.currentTutorName || "—"}</dd>
          <dt>Subject</dt>
          <dd>{request.subjectName || "—"}{request.boardName || request.gradeName ? ` · ${[request.boardName, request.gradeName].filter(Boolean).join(" · ")}` : ""}</dd>
          <dt>Requested by</dt>
          <dd>{request.requestedByName || "—"} · {fmt(request.createdDate, true)}</dd>
          <dt>Reason</dt>
          <dd><b>{request.reason}</b></dd>
          <dt>Description</dt>
          <dd className="cr-pre">{request.description}</dd>
          {!pending && (
            <>
              <dt>Decision</dt>
              <dd>
                {request.status === "Reassigned"
                  ? `Reassigned to ${request.newTutorName || "—"}${request.movedSessionCount ? ` · ${request.movedSessionCount} upcoming class(es) moved` : ""}`
                  : "Rejected"}
                {" · "}{request.decidedByName || "—"} · {fmt(request.decidedDate, true)}
              </dd>
              {request.decisionNote && (<><dt>Note</dt><dd className="cr-pre">{request.decisionNote}</dd></>)}
            </>
          )}
        </dl>

        {pending && !request.assignmentUnchanged && (
          <div className="cr-state is-error" role="alert">
            <Icon name="alert-circle" /> This course's tutor has changed since the request was raised. Reject this request instead.
          </div>
        )}

        {pending && (
          <>
            <div className="cr-field">
              <label className="form-label" htmlFor="cr-new-tutor">Replacement tutor</label>
              {tutors.loading ? (
                <div className="cr-state" role="status"><Spinner size="sm" color="primary" /> Loading eligible tutors…</div>
              ) : tutors.error ? (
                <div className="cr-state is-error" role="alert"><Icon name="alert-circle" /> {tutors.error}</div>
              ) : tutors.items.length === 0 ? (
                <div className="cr-state">No other tutor teaches this board, grade and subject. Add the skill set to a tutor first.</div>
              ) : (
                <select id="cr-new-tutor" className="form-control" value={newTutorId} disabled={saving || confirming || !request.assignmentUnchanged}
                  onChange={(e) => { setNewTutorId(e.target.value); setErrors((p) => ({ ...p, newTutorId: undefined })); }}>
                  <option value="">Select a tutor</option>
                  {tutors.items.map((t) => (
                    <option key={t.tutorId} value={t.tutorId} disabled={!(Number(t.rate) > 0)}>
                      {t.name}{Number(t.rate) > 0 ? ` · rate ${Number(t.rate)}` : " · no rate configured"}
                    </option>
                  ))}
                </select>
              )}
              {errors.newTutorId && <span className="cr-error">{errors.newTutorId}</span>}
            </div>
            <div className="cr-field">
              <label className="form-label" htmlFor="cr-note">Note <span className="cr-hint">(required to reject)</span></label>
              <textarea id="cr-note" className="form-control" rows={3} maxLength={MAX_NOTE_LENGTH} value={note} disabled={saving || confirming}
                onChange={(e) => { setNote(e.target.value); setErrors((p) => ({ ...p, note: undefined })); }}
                placeholder="Decision note or reason for rejecting" />
              {errors.note && <span className="cr-error">{errors.note}</span>}
            </div>
            {confirming && chosen && (
              <div className="cr-confirm" role="alert">
                <Icon name="alert-circle" />
                <span>
                  Move <b>{request.studentName}</b>'s <b>{request.subjectName}</b> from <b>{request.currentTutorName}</b> to <b>{chosen.name}</b>?
                  Upcoming classes move to {chosen.name}; past classes, attendance and the course status stay as they are.
                  The student and both tutors are notified.
                </span>
              </div>
            )}
          </>
        )}
        {errors.form && <div className="cr-state is-error" role="alert"><Icon name="alert-circle" /> {errors.form}</div>}
      </ModalBody>
      <ModalFooter>
        <button type="button" className="btn btn-light" onClick={confirming ? () => setConfirming(false) : onClose} disabled={saving}>
          {confirming ? "Back" : pending ? "Cancel" : "Close"}
        </button>
        {pending && !confirming && (
          <button type="button" className="btn btn-outline-danger" onClick={() => decide("reject")} disabled={saving}>
            {saving ? <Spinner size="sm" /> : <Icon name="cross-circle" />} <span>Reject</span>
          </button>
        )}
        {pending && (
          <button type="button" className="btn btn-primary" onClick={() => decide("approve")}
            disabled={saving || tutors.loading || !request.assignmentUnchanged || tutors.items.length === 0}>
            {saving ? <Spinner size="sm" /> : <Icon name="swap" />} <span>{confirming ? "Confirm reassignment" : "Reassign"}</span>
          </button>
        )}
      </ModalFooter>
    </Modal>
  );
};

const OperationsChangeRequests = ({ pageKey }) => {
  const page = CHANGE_REQUEST_PAGES[pageKey];
  const permission = useMenuPermission(page.link);
  const [state, setState] = useState({ loading: true, error: "", items: [] });
  const [statusTab, setStatusTab] = useState("Pending");
  const [open, setOpen] = useState(null);
  const tutorList = page.type === STUDENT_CHANGE;

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: "" }));
    getOperationsChangeRequests(page.list)
      .then((response) => setState({ loading: false, error: "", items: Array.isArray(response?.data) ? response.data : [] }))
      .catch((error) => setState({ loading: false, error: changeRequestErrorMessage(error, "Unable to load requests. Please try again."), items: [] }));
  }, [page.list]);

  useEffect(() => {
    if (permission.allowed) load();
  }, [permission.allowed, load]);

  const count = (key) => (key ? state.items.filter((r) => r.status === key).length : state.items.length);
  const listed = statusTab ? state.items.filter((r) => r.status === statusTab) : state.items;

  return (
    <React.Fragment>
      <Head title={page.title} />
      <Content>
        <div className="tct-change-requests">
          <BlockHead size="sm">
            <BlockHeadContent>
              <BlockTitle page tag="h3">{page.title}</BlockTitle>
              <p className="cr-sub">{page.sub}</p>
            </BlockHeadContent>
          </BlockHead>

          {permission.loading ? (
            <div className="cr-state" role="status"><Spinner color="primary" /> Checking access…</div>
          ) : !permission.allowed ? (
            <div className="cr-locked"><Icon name="lock-alt" /><p>You do not have permission to view {page.title}. A Super Admin can grant it in Settings → Role Permission.</p></div>
          ) : (
            <section className="cr-card cr-list">
              <div className="cr-tabs" role="tablist">
                {STATUS_TABS.map((t) => (
                  <button key={t.label} type="button" role="tab" aria-selected={statusTab === t.key}
                    className={statusTab === t.key ? "is-active" : ""} onClick={() => setStatusTab(t.key)}>
                    {t.label} <span className="cr-count">{count(t.key)}</span>
                  </button>
                ))}
                <button type="button" className="btn btn-sm btn-light cr-refresh" onClick={load} disabled={state.loading}>
                  {state.loading ? <Spinner size="sm" /> : <Icon name="reload" />} <span>Refresh</span>
                </button>
              </div>
              {state.loading && state.items.length === 0 ? (
                <div className="cr-state" role="status"><Spinner size="sm" color="primary" /> Loading requests…</div>
              ) : state.error ? (
                <div className="cr-state is-error" role="alert">
                  <Icon name="alert-circle" /> {state.error}
                  <button type="button" className="btn btn-sm btn-light" onClick={load}>Retry</button>
                </div>
              ) : listed.length === 0 ? (
                <div className="cr-empty"><Icon name="inbox" /><p>No {statusTab ? statusTab.toLowerCase() : ""} requests.</p></div>
              ) : (
                <div className="cr-table-wrap">
                  <table className="table cr-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        {tutorList && <th>Tutor</th>}
                        <th>Student</th>
                        {!tutorList && <th>Current tutor</th>}
                        <th>Subject</th>
                        <th>Reason</th>
                        <th>Description</th>
                        <th>Submitted</th>
                        <th>Status</th>
                        <th aria-label="Actions" />
                      </tr>
                    </thead>
                    <tbody>
                      {listed.map((r) => (
                        <tr key={r.id}>
                          <td>{r.requestNo}</td>
                          {tutorList && <td className="cr-strong">{r.currentTutorName || "—"}</td>}
                          <td className={tutorList ? "" : "cr-strong"}>{r.studentName || "—"}</td>
                          {!tutorList && <td>{r.currentTutorName || "—"}</td>}
                          <td>{r.subjectName || "—"}</td>
                          <td>{r.reason}</td>
                          <td className="cr-desc" title={r.description}>{r.description}</td>
                          <td className="cr-nowrap">{fmt(r.createdDate)}</td>
                          <td>{statusBadge(r.status)}</td>
                          <td>
                            <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setOpen(r)}>
                              <Icon name="eye" /> <span>{r.status === "Pending" ? "Review" : "View"}</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </div>
        {open && (
          <ReviewModal page={page} request={open}
            onClose={() => setOpen(null)}
            onDecided={() => { setOpen(null); load(); }} />
        )}
        <ToastContainer />
      </Content>
    </React.Fragment>
  );
};

export default OperationsChangeRequests;
