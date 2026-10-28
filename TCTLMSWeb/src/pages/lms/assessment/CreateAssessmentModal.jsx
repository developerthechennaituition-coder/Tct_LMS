import React, { useEffect, useState } from "react";
import { Modal, ModalHeader, ModalBody, ModalFooter, Form, FormGroup, Input, Button, Alert } from "reactstrap";
import { toast } from "react-toastify";
import { createAssessment, getAssessmentScheduleOptions } from "../../../apiservices/AssessmentService";

export default function CreateAssessmentModal({ isOpen, toggle, onCreated }) {
  const [options, setOptions] = useState([]);
  const [form, setForm] = useState({ scheduleId: "", examDate: "", examStartTime: "", examDurationMinutes: 60 });
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    setForm({ scheduleId: "", examDate: "", examStartTime: "", examDurationMinutes: 60 });
    setLoading(true);
    setFailed(false);
    getAssessmentScheduleOptions().then((rows) => { if (mounted) setOptions(rows); })
      .catch(() => { if (mounted) { setOptions([]); setFailed(true); } })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [isOpen]);
  const change = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await createAssessment({ ...form, examDurationMinutes: Number(form.examDurationMinutes) });
      toast.success("Test scheduled. Upload the question paper next.");
      onCreated();
      toggle();
    } catch (_) { /* Shared client displays the server validation message. */ }
    finally { setBusy(false); }
  };
  return <Modal isOpen={isOpen} toggle={busy ? undefined : toggle}>
    <ModalHeader toggle={busy ? undefined : toggle}>Schedule Assessment</ModalHeader>
    <Form onSubmit={submit}>
      <ModalBody>
        <Alert color="info">All exam times are in IST (India). Upload papers at least one day before the exam. Late uploads are flagged and allowed only before the test starts.</Alert>
        {failed && <Alert color="danger">Unable to load allocations. Close this window and try again.</Alert>}
        {!loading && !failed && !options.length && <Alert color="warning">No active class allocations found. Schedule/map the student, tutor and subject first.</Alert>}
        <FormGroup><label>Student / Subject / Tutor</label>
          <Input type="select" required value={form.scheduleId} onChange={change("scheduleId")} disabled={loading || busy}>
            <option value="">{loading ? "Loading…" : "Select an allocation"}</option>
            {options.map((o) => <option key={o.scheduleId} value={o.scheduleId}>{o.studentName} — {o.subjectName} — {o.tutorName} ({o.boardName}/{o.gradeName})</option>)}
          </Input>
        </FormGroup>
        <FormGroup><label>Exam date (IST)</label><Input type="date" required value={form.examDate} onChange={change("examDate")} /></FormGroup>
        <FormGroup><label>Start time (IST)</label><Input type="time" required value={form.examStartTime} onChange={change("examStartTime")} /></FormGroup>
        <FormGroup><label>Duration (minutes)</label><Input type="number" min="1" max="480" step="1" required value={form.examDurationMinutes} onChange={change("examDurationMinutes")} /></FormGroup>
      </ModalBody>
      <ModalFooter><Button type="button" color="light" disabled={busy} onClick={toggle}>Cancel</Button><Button type="submit" color="primary" disabled={busy || loading || !options.length}>{busy ? "Saving…" : "Schedule Test"}</Button></ModalFooter>
    </Form>
  </Modal>;
}
