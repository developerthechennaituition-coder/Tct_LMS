import React, { useEffect, useState } from "react";
import moment from "moment";
import { toast } from "react-toastify";
import { Modal, ModalHeader, ModalBody, ModalFooter, Form, Input, Alert, Badge } from "reactstrap";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import { Block, BlockHead, BlockHeadContent, BlockTitle, BlockDes, Button, ReactDataTable } from "../../../components/Component";
import { getStudentTestPapers, submitAnswerSheet, downloadAssessmentFile, validateAssessmentFiles } from "../../../apiservices/AssessmentService";

export default function StudentTestPapers() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [clockOffset, setClockOffset] = useState(0);
  const [tick, setTick] = useState(Date.now());

  const loadTests = () => {
    setLoading(true);
    setLoadError(false);
    return getStudentTestPapers().then((rows) => {
      setTests(rows || []);
      if (rows?.[0]?.serverNow) setClockOffset(Date.parse(rows[0].serverNow) - Date.now());
    }).catch(() => { setTests([]); setLoadError(true); }).finally(() => setLoading(false));
  };
  useEffect(() => {
    loadTests();
    const timer = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const now = tick + clockOffset;
  const download = (id, answer = false) => downloadAssessmentFile(id, answer).catch((e) => toast.error(e.message));
  const openUpload = (row) => { setSelectedTest(row); setFiles([]); };
  const chooseFiles = (e) => {
    const selected = Array.from(e.target.files || []);
    const error = validateAssessmentFiles(selected);
    if (error) { toast.error(error); setFiles([]); e.target.value = ""; return; }
    setFiles(selected);
  };
  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const error = validateAssessmentFiles(files);
    if (error) { toast.error(error); return; }
    const data = new FormData();
    data.append("TestScheduleId", selectedTest.id);
    files.forEach((file) => data.append("Files", file));
    setSubmitting(true);
    try {
      await submitAnswerSheet(data);
      toast.success("Answer sheet submitted successfully.");
      setSelectedTest(null);
      await loadTests();
    } catch (_) { /* Authenticated API client displays the validation error. */ }
    finally { setSubmitting(false); }
  };

  const columns = [
    { name: "Subject", selector: (r) => r.subjectName, sortable: true, cell: (r) => <div>
      <strong>{r.subjectName}</strong><div className="text-muted small">{r.boardName} / {r.gradeName}</div>
      {r.questionPaperNotes && <div className="small">Instructions: {r.questionPaperNotes}</div>}
    </div> },
    { name: "Exam Date & Time (IST)", selector: (r) => r.startsAt, sortable: true,
      cell: (r) => <div>{moment.parseZone(r.startsAt).format("DD MMM YYYY, hh:mm A")}<div className="small">{r.examDurationMinutes} minutes</div></div> },
    { name: "Question Paper", cell: (r) => {
      if (!r.questionPaperUploaded) return <span>Not shared yet</span>;
      if (now < Date.parse(r.startsAt)) return <span className="text-muted small">Locked until {moment.parseZone(r.startsAt).format("DD MMM, hh:mm A")} IST</span>;
      if (now >= Date.parse(r.endsAt)) return <span className="text-muted small">Test window closed</span>;
      return <Button size="sm" color="primary" outline onClick={() => download(r.id)}>Download Paper</Button>;
    } },
    { name: "Answer Sheet / Result", cell: (r) => {
      if (r.answerSheetSubmitted) return <div>
        <Badge color={r.evaluationStatus === "Evaluated" ? "success" : "info"}>{r.evaluationStatus === "Evaluated" ? "Evaluated" : "Pending Evaluation"}</Badge>
        {r.isLateSubmission && <Badge color="warning" className="ml-1">Late submission</Badge>}
        {r.evaluationStatus === "Evaluated" && <div className="small mt-1">Marks: {r.marksObtained} / {r.maxMarks}
          {r.feedback && <div>Feedback: {r.feedback}</div>}</div>}
        {r.submissionId && <Button size="sm" color="light" className="mt-1" onClick={() => download(r.submissionId, true)}>My Answer Sheet</Button>}
      </div>;
      if (!r.questionPaperUploaded || now < Date.parse(r.startsAt)) return <span>Not available yet</span>;
      return <div><Button size="sm" color="secondary" onClick={() => openUpload(r)}>Submit Answer Sheet</Button>
        {now >= Date.parse(r.endsAt) && <div className="small text-warning">Will be marked as a late submission</div>}</div>;
    } }
  ];

  return <>
    <Head title="My Tests & Assessments" />
    <Content>
      <BlockHead size="sm"><BlockHeadContent><BlockTitle page tag="h3">My Tests &amp; Assessments</BlockTitle>
        <BlockDes><p>Download papers during the exam window. All exam times are in IST. Submit all answer-sheet pages together; a submitted answer cannot be replaced.</p></BlockDes>
        <Button color="light" onClick={loadTests} disabled={loading}>{loading ? "Loading…" : "Refresh Tests / Results"}</Button>
      </BlockHeadContent></BlockHead>
      <Block>
        {loadError && <Alert color="danger">Unable to load your assessments. Please retry or contact Operations.</Alert>}
        <ReactDataTable data={tests} columns={columns} pagination canShowFilter={false} className="nk-tb-list" />
        {!loading && !loadError && !tests.length && <p className="text-center text-muted p-3">No tests have been scheduled for your account.</p>}
      </Block>
      <Modal isOpen={!!selectedTest} toggle={submitting ? undefined : () => setSelectedTest(null)}>
        <ModalHeader toggle={submitting ? undefined : () => setSelectedTest(null)}>Submit Answer Sheet — {selectedTest?.subjectName}</ModalHeader>
        <Form onSubmit={submit}><ModalBody>
          <Alert color="info">Upload 1–10 files (PDF, DOC, DOCX, JPG, PNG), up to 20 MB each / 40 MB total. Multiple files are saved together as a ZIP. Review all pages before submitting.</Alert>
          {selectedTest && now >= Date.parse(selectedTest.endsAt) && <Alert color="warning">The exam has ended. Your submission will be labelled Late.</Alert>}
          <Input type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={chooseFiles} disabled={submitting} />
          <ul className="mt-2">{files.map((f, i) => <li key={i}>{f.name}</li>)}</ul>
        </ModalBody><ModalFooter>
          <Button type="button" color="light" disabled={submitting} onClick={() => setSelectedTest(null)}>Cancel</Button>
          <Button type="submit" color="primary" disabled={submitting || !files.length}>{submitting ? "Submitting…" : "Submit Answer Sheet"}</Button>
        </ModalFooter></Form>
      </Modal>
    </Content>
  </>;
}
