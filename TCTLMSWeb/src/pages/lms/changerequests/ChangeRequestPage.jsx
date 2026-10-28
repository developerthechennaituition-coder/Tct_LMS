import React, { useCallback, useEffect, useState } from "react";
import moment from "moment";
import { Modal, ModalBody, ModalFooter, Spinner } from "reactstrap";
import { toast, ToastContainer } from "react-toastify";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import { BlockHead, BlockHeadContent, BlockTitle, Icon } from "../../../components/Component";
import { changeRequestErrorMessage, getMyChangeAssignments, submitChangeRequest } from "../../../apiservices/ChangeRequestService";
import {
  CHANGE_REQUEST_PAGES, MAX_DESCRIPTION_LENGTH, STUDENT_CHANGE, groupBySubject, reasonsFor, validateChangeRequest,
} from "../../../library/changeRequestRules";
import useMenuPermission from "./useMenuPermission";
import "./ChangeRequests.css";

const emptyForm = { reason: "", description: "" };

// Student → Tutor Change, Tutor → Student Change. The list and every request are checked by the server
// against the signed-in user's own courses; submitting changes nothing until Operations decides.
const RequestModal = ({ page, item, reasons, onClose, onSent }) => {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const isTutor = page.type === STUDENT_CHANGE;
  const person = isTutor ? item.studentName : item.tutorName;

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const send = () => {
    if (sending) return;
    const next = validateChangeRequest(form, page.type);
    setErrors(next);
    if (Object.keys(next).length) return;
    setSending(true);
    submitChangeRequest({ salesDetailsId: item.salesDetailsId, reason: form.reason.trim(), description: form.description.trim() })
      .then((response) => {
        toast.success(response?.message || "Request sent to Operations.");
        onSent();
      })
      .catch((error) => setErrors({ form: changeRequestErrorMessage(error, "Unable to send the request. Please try again.") }))
      .finally(() => setSending(false));
  };

  return (
    <Modal isOpen toggle={sending ? undefined : onClose} className="modal-dialog-centered tct-cr-modal" size="md">
      <div className="cr-modal-head">
        <span className="cr-chip" aria-hidden="true"><Icon name="swap" /></span>
        <div>
          <h5 className="cr-modal-title">{page.button} request</h5>
          <p className="cr-modal-sub">{person} · {item.subjectName}</p>
        </div>
        <button type="button" className="close" aria-label="Close" onClick={onClose} disabled={sending}>
          <Icon name="cross-sm" />
        </button>
      </div>
      <ModalBody>
        <dl className="cr-facts">
          <dt>{isTutor ? "Student" : "Tutor"}</dt>
          <dd>{person || "—"}</dd>
          <dt>Subject</dt>
          <dd>{item.subjectName || "—"}{item.boardName || item.gradeName ? ` · ${[item.boardName, item.gradeName].filter(Boolean).join(" · ")}` : ""}</dd>
        </dl>
        <div className="cr-field">
          <label className="form-label" htmlFor="cr-reason">Reason <span className="text-danger">*</span></label>
          <select id="cr-reason" className="form-control" value={form.reason} disabled={sending}
            onChange={(e) => setField("reason", e.target.value)}>
            <option value="">Select a reason</option>
            {reasons.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          {errors.reason && <span className="cr-error">{errors.reason}</span>}
        </div>
        <div className="cr-field">
          <label className="form-label" htmlFor="cr-description">Description <span className="text-danger">*</span></label>
          <textarea id="cr-description" className="form-control" rows={5} maxLength={MAX_DESCRIPTION_LENGTH} value={form.description}
            disabled={sending} onChange={(e) => setField("description", e.target.value)}
            placeholder={isTutor ? "Explain why the student should move to another tutor." : "Explain why you would like a different tutor."} />
          <span className="cr-hint">{form.description.length}/{MAX_DESCRIPTION_LENGTH}</span>
          {errors.description && <span className="cr-error">{errors.description}</span>}
        </div>
        <p className="cr-note"><Icon name="info" /> Your current {isTutor ? "student" : "tutor"} and classes stay as they are until Operations decides.</p>
        {errors.form && <div className="cr-state is-error" role="alert"><Icon name="alert-circle" /> {errors.form}</div>}
      </ModalBody>
      <ModalFooter>
        <button type="button" className="btn btn-light" onClick={onClose} disabled={sending}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={send} disabled={sending}>
          {sending ? <Spinner size="sm" /> : <Icon name="send" />} <span>{sending ? "Sending…" : "Send request"}</span>
        </button>
      </ModalFooter>
    </Modal>
  );
};

const ChangeRequestPage = ({ pageKey }) => {
  const page = CHANGE_REQUEST_PAGES[pageKey];
  const permission = useMenuPermission(page.link);
  const [state, setState] = useState({ loading: true, error: "", data: null });
  const [selected, setSelected] = useState(null);
  const isTutor = page.type === STUDENT_CHANGE;

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: "" }));
    getMyChangeAssignments()
      .then((response) => setState({ loading: false, error: "", data: response?.data || null }))
      .catch((error) => setState({ loading: false, error: changeRequestErrorMessage(error, "Unable to load your courses. Please try again."), data: null }));
  }, []);

  useEffect(() => {
    if (permission.allowed) load();
  }, [permission.allowed, load]);

  const assignments = state.data?.assignments || [];
  const reasons = state.data?.reasons?.length ? state.data.reasons : reasonsFor(page.type);
  const groups = groupBySubject(assignments);

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
          ) : state.loading && !state.data ? (
            <div className="cr-state" role="status"><Spinner color="primary" /> Loading your courses…</div>
          ) : state.error ? (
            <div className="cr-state is-error" role="alert">
              <Icon name="alert-circle" /> {state.error}
              <button type="button" className="btn btn-sm btn-light" onClick={load}>Retry</button>
            </div>
          ) : assignments.length === 0 ? (
            <div className="cr-empty"><Icon name="users" /><p>{isTutor ? "You have no students assigned at the moment." : "You have no tutors assigned at the moment."}</p></div>
          ) : (
            <div className="cr-groups">
              {groups.map((group) => (
                <section key={group.subject} className="cr-card" aria-label={group.subject}>
                  <h6 className="cr-card-title"><Icon name="book" /> {group.subject}</h6>
                  <ul className="cr-rows">
                    {group.items.map((item) => {
                      const person = isTutor ? item.studentName : item.tutorName;
                      return (
                        <li key={item.salesDetailsId} className="cr-row">
                          <span className="cr-avatar" aria-hidden="true">{String(person || "?").trim().charAt(0).toUpperCase()}</span>
                          <span className="cr-row-text">
                            <span className="cr-row-name">{person || "—"}</span>
                            <span className="cr-row-meta">
                              {page.personLabel}
                              {[item.boardName, item.gradeName].filter(Boolean).length ? ` · ${[item.boardName, item.gradeName].filter(Boolean).join(" · ")}` : ""}
                              {item.courseStatusName ? ` · ${item.courseStatusName}` : ""}
                              {item.enrolledDate ? ` · Enrolled ${moment(item.enrolledDate).format("DD-MMM-YYYY")}` : ""}
                            </span>
                          </span>
                          {item.pendingRequestNo ? (
                            <span className="cr-badge is-pending" title="Waiting for Operations">Request #{item.pendingRequestNo} pending</span>
                          ) : (
                            <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setSelected(item)}>
                              <Icon name="swap" /> <span>{page.button}</span>
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
        {selected && (
          <RequestModal page={page} item={selected} reasons={reasons}
            onClose={() => setSelected(null)}
            onSent={() => { setSelected(null); load(); }} />
        )}
        <ToastContainer />
      </Content>
    </React.Fragment>
  );
};

export default ChangeRequestPage;
