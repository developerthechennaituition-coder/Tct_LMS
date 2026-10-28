import React, { useEffect, useState } from "react";
import moment from "moment";
import { toast } from "react-toastify";
import { Modal, ModalHeader, ModalBody, ModalFooter, Form, FormGroup, Input, Alert, Badge } from "reactstrap";
import Dropzone from "react-dropzone";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import {
  Block,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  BlockDes,
  BlockBetween,
  Icon,
  Button,
  Row,
  Col,
  ReactDataTable,
} from "../../../components/Component";
import { useHistory } from "react-router-dom";
import { getTestSchedulesForUpload, uploadQuestionPaper, cancelAssessment, downloadAssessmentFile, validateAssessmentFiles } from "../../../apiservices/AssessmentService";
import CreateAssessmentModal from "./CreateAssessmentModal";

const ACCEPTED_TYPES = [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"];

// Page-scoped styles (every selector starts with .tct-assess). Kept identical to AnswerSheetEvaluation.jsx.
const assessPageStyle = `
  .tct-assess .nk-block-head { padding-bottom: 18px; }
  .tct-assess-titlerow { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .tct-assess .nk-block-title.page-title { margin: 0; font-size: 1.6rem; font-weight: 700; color: #1c2b46; line-height: 1.25; }
  .tct-assess .nk-block-des p { margin: 8px 0 0; max-width: 860px; font-size: 14px; line-height: 1.6; color: #6b7a90; }
  .tct-assess .nk-block-des strong { color: #364a63; }
  .tct-assess-back {
    display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0;
    height: 36px; padding: 0 14px; border-radius: 8px;
    border: 1px solid #d9cbff; background: #f5f1ff; color: #6a35e8;
    font-size: 13px; font-weight: 600; line-height: 1; cursor: pointer;
    transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
  }
  .tct-assess-back .icon { font-size: 16px; }
  .tct-assess-back:hover { background: #854fff; border-color: #854fff; color: #fff; }
  .tct-assess-back:focus { outline: none; }
  .tct-assess-back:focus-visible { box-shadow: 0 0 0 3px rgba(133, 79, 255, 0.22); }

  .tct-assess-card { background: #fff; border: 1px solid #e5e9f2; border-radius: 12px; box-shadow: 0 1px 3px rgba(31, 43, 58, 0.05); }
  .tct-assess-toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; padding: 14px 16px; margin-bottom: 16px; }
  .tct-assess-search { position: relative; flex: 1 1 320px; max-width: 460px; }
  .tct-assess-search > .icon {
    position: absolute; left: 13px; top: 50%; transform: translateY(-50%);
    font-size: 16px; color: #8094ae; pointer-events: none;
  }
  .tct-assess-search .form-control {
    height: 40px; padding-left: 38px; font-size: 14px;
    border: 1px solid #dbdfea; border-radius: 8px; box-shadow: none;
  }
  .tct-assess-search .form-control:focus { border-color: #854fff; box-shadow: 0 0 0 3px rgba(133, 79, 255, 0.12); }
  .tct-assess-search-btn.btn { height: 40px; padding: 0 18px; border-radius: 8px; font-weight: 600; gap: 6px; }

  .tct-assess-results { overflow: hidden; }
  .tct-assess-results .dataTables_wrapper > .row:empty { display: none; }
  .tct-assess-results .rdt_TableHeadRow { min-height: 46px; background: #f8f9fc; border-bottom: 1px solid #e5e9f2; }
  .tct-assess-results .rdt_TableCol { font-size: 12px; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; color: #8094ae; }
  .tct-assess-results .rdt_TableRow { min-height: 58px; }
  .tct-assess-results .rdt_TableRow:not(:last-of-type) { border-bottom-color: #eef0f5; }
  .tct-assess-results .rdt_TableRow:hover { background: #fbfaff; }
  /* When the page's own empty state is shown, hide the table's duplicate "There are no records found" strip. */
  .tct-assess-results.is-empty .dataTables_wrapper { display: none; }
  .tct-assess-empty { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 44px 16px; }
  .tct-assess-empty-icon {
    display: flex; align-items: center; justify-content: center;
    width: 52px; height: 52px; margin-bottom: 12px; border-radius: 50%;
    background: #f5f1ff; color: #854fff; font-size: 24px;
  }
  .tct-assess-empty-text { font-size: 14px; font-weight: 500; color: #526484; }

  @media (max-width: 575.98px) {
    .tct-assess .nk-block-title.page-title { font-size: 1.35rem; }
    .tct-assess-search { flex-basis: 100%; max-width: none; }
    .tct-assess-search-btn.btn { width: 100%; justify-content: center; }
  }
`;

const qpStatus = (row) => {
  if (!row.questionPaperUploadedOn) return { label: "Not Uploaded", color: "danger" };
  const examDate = moment.parseZone(row.startsAt);
  const uploadedOn = moment.parseZone(`${row.questionPaperUploadedOn}+05:30`);
  if (uploadedOn.isAfter(examDate.clone().subtract(1, "day"))) {
    return { label: "Uploaded Late", color: "warning" };
  }
  return { label: "Uploaded", color: "success" };
};

const QuestionPaperUpload = () => {
  const [sm, updateSm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testSchedules, setTestSchedules] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  const [files, setFiles] = useState([]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const userId = localStorage.getItem("userId");
  const roleId = localStorage.getItem("roleId");

  // Back: previous in-app page; on direct entry (no router history key) fall back to the Dashboard ("/").
  const history = useHistory();
  const handleBack = () => {
    if (history.location.key) history.goBack();
    else history.push(`${process.env.PUBLIC_URL}/`);
  };

  const loadTestSchedules = () => {
    setLoading(true);
    setLoadError(false);
    getTestSchedulesForUpload(userId, roleId, searchText)
      .then((response) => setTestSchedules(response || []))
      .catch(() => { setTestSchedules([]); setLoadError(true); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTestSchedules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openUploadModal = (row) => {
    setSelectedTest(row);
    setFiles([]);
    setNotes(row.questionPaperNotes || "");
    setModalOpen(true);
  };

  const closeUploadModal = () => {
    setModalOpen(false);
    setSelectedTest(null);
  };

  const handleDrop = (acceptedFiles) => {
    const error = validateAssessmentFiles(acceptedFiles);
    if (error) { toast.error(error); return; }
    setFiles(acceptedFiles);
  };

  const isLateUpload = selectedTest
    ? moment().isAfter(moment.parseZone(selectedTest.startsAt).subtract(1, "day"))
    : false;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (submitting) return;
    if (files.length === 0) {
      toast.error("Please attach the question paper file before uploading.");
      return;
    }

    const inputData = new FormData();
    inputData.append("TestScheduleId", selectedTest.id);
    inputData.append("UploadedByUserId", userId);
    inputData.append("Notes", notes);
    files.forEach((file) => inputData.append("Files", file));

    setSubmitting(true);
    uploadQuestionPaper(inputData)
      .then(() => {
        toast.success("Question paper uploaded successfully.");
        closeUploadModal();
        loadTestSchedules();
      })
      .catch(() => {})
      .finally(() => setSubmitting(false));
  };

  const columns = [
    {
      name: "Student",
      selector: (row) => row.studentName,
      sortable: true,
      cell: (row) => (
        <div>
          <span className="tb-lead">{row.studentName}</span>
          <span className="d-block text-muted small">
            {row.boardName} | {row.gradeName}
          </span>
        </div>
      ),
    },
    {
      name: "Tutor",
      selector: (row) => row.tutorName,
      sortable: true,
    },
    {
      name: "Subject",
      selector: (row) => row.subjectName,
      sortable: true,
    },
    {
      name: "Exam Date & Time",
      selector: (row) => row.examDate,
      sortable: true,
      cell: (row) => (
        <div>
          <span>{row.examDate ? moment(row.examDate).format("DD MMM YYYY") : "-"}</span>
          <span className="d-block text-muted small">{row.examStartTime || ""} IST</span>
        </div>
      ),
    },
    {
      name: "QP Due By (D-1)",
      selector: (row) => row.examDate,
      cell: (row) =>
        row.examDate ? (
          <span>{moment.parseZone(row.startsAt).subtract(1, "day").format("DD MMM YYYY HH:mm")} IST</span>
        ) : (
          "-"
        ),
    },
    {
      name: "Status",
      cell: (row) => {
        const status = qpStatus(row);
        return <Badge color={status.color}>{status.label}</Badge>;
      },
    },
    {
      name: "Action",
      cell: (row) => (
        <div className="d-flex flex-wrap gap-1">
        <Button size="sm" color="primary" disabled={moment().isSameOrAfter(moment.parseZone(row.startsAt))} onClick={() => openUploadModal(row)}>
          <Icon name="upload" className="mr-1" />
          {row.questionPaperUploadedOn ? "Replace" : "Upload"}
        </Button>
        {row.questionPaperUploadedOn && <Button size="sm" color="light" onClick={() => downloadAssessmentFile(row.id).catch((e) => toast.error(e.message))}>Download</Button>}
        <Button size="sm" color="danger" outline disabled={moment().isSameOrAfter(moment.parseZone(row.startsAt))} onClick={async () => {
          if (!window.confirm("Cancel this assessment? Students will no longer see it. Existing files will be retained.")) return;
          try { await cancelAssessment(row.id); toast.success("Assessment cancelled."); loadTestSchedules(); } catch (_) { /* Shared error handling. */ }
        }}>Cancel</Button>
        </div>
      ),
    },
  ];

  return (
    <React.Fragment>
      <Head title="Question Paper Upload" />
      <Content>
        <style>{assessPageStyle}</style>
        <div className="tct-assess">
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <div className="tct-assess-titlerow">
                <button type="button" className="tct-assess-back" onClick={handleBack} aria-label="Go back">
                  <Icon name="arrow-left" />
                  <span>Back</span>
                </button>
                <BlockTitle page tag="h3">
                  Question Paper Upload
                </BlockTitle>
              </div>
              <BlockDes className="text-soft">
                <p>
                  Upload the question paper for each scheduled test. Papers must be shared at least{" "}
                  <strong>one day before</strong> the exam date; students can only view/download it during their
                  scheduled test window.
                </p>
              </BlockDes>
            </BlockHeadContent>
            <BlockHeadContent>
              <div className="toggle-wrap nk-block-tools-toggle">
                <Button color="primary" onClick={() => setCreateOpen(true)}>Schedule Test</Button>
                <Button
                  className={`btn-icon btn-trigger toggle-expand mr-n1 ${sm ? "active" : ""}`}
                  onClick={() => updateSm(!sm)}
                >
                  <Icon name="more-v" />
                </Button>
              </div>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        <Block>
          {loadError && <Alert color="danger">Unable to load assessments. Please retry using Search.</Alert>}
          <div className="tct-assess-card tct-assess-toolbar">
            <div className="tct-assess-search">
              <Icon name="search" />
              <Input
                type="search"
                placeholder="Search by student or subject"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadTestSchedules()}
              />
            </div>
            <Button color="primary" className="tct-assess-search-btn" onClick={loadTestSchedules}>
              <Icon name="search" /> Search
            </Button>
          </div>

          <div
            className={`tct-assess-card tct-assess-results${
              !loading && !loadError && testSchedules.length === 0 ? " is-empty" : ""
            }`}
          >
            <ReactDataTable
              data={testSchedules}
              columns={columns}
              pagination
              canShowFilter={false}
              className="nk-tb-list"
            />
            {!loading && !loadError && testSchedules.length === 0 && (
              <div className="tct-assess-empty">
                <span className="tct-assess-empty-icon">
                  <Icon name="file-text" />
                </span>
                <span className="tct-assess-empty-text">No scheduled tests found.</span>
              </div>
            )}
          </div>
        </Block>
        </div>

        <CreateAssessmentModal isOpen={createOpen} toggle={() => setCreateOpen(false)} onCreated={loadTestSchedules} />
        <Modal isOpen={modalOpen} toggle={submitting ? undefined : closeUploadModal} size="md">
          <ModalHeader toggle={closeUploadModal}>Upload Question Paper</ModalHeader>
          <Form onSubmit={handleSubmit}>
            <ModalBody>
              {selectedTest && (
                <div className="mb-3">
                  <Row className="g-2">
                    <Col sm="6">
                      <span className="text-muted small">Student</span>
                      <div className="fw-medium">{selectedTest.studentName}</div>
                    </Col>
                    <Col sm="6">
                      <span className="text-muted small">Subject</span>
                      <div className="fw-medium">{selectedTest.subjectName}</div>
                    </Col>
                    <Col sm="6">
                      <span className="text-muted small">Exam Date</span>
                      <div className="fw-medium">
                        {selectedTest.examDate ? moment(selectedTest.examDate).format("DD MMM YYYY") : "-"}{" "}
                        {selectedTest.examStartTime}
                      </div>
                    </Col>
                    <Col sm="6">
                      <span className="text-muted small">Board / Grade</span>
                      <div className="fw-medium">
                        {selectedTest.boardName} / {selectedTest.gradeName}
                      </div>
                    </Col>
                  </Row>
                </div>
              )}

              {isLateUpload && (
                <Alert color="warning">
                  <Icon name="alert-triangle" className="mr-1" />
                  This is a late upload — question papers should be shared at least one day before the exam date.
                </Alert>
              )}

              <FormGroup>
                <label className="form-label">Question Paper Files</label>
                <p className="small text-muted">Up to 10 files, 20 MB each / 40 MB total. Multiple files are downloaded together as a ZIP.</p>
                <Dropzone onDrop={handleDrop} accept={ACCEPTED_TYPES}>
                  {({ getRootProps, getInputProps }) => (
                    <div {...getRootProps()} className="dropzone upload-zone dz-clickable">
                      <input {...getInputProps()} />
                      {files.length === 0 ? (
                        <div className="dz-message">
                          <span className="dz-message-text">Drag and drop file (PDF, DOC, JPG, PNG)</span>
                          <span className="dz-message-or">or</span>
                          <Button type="button" color="primary">
                            SELECT
                          </Button>
                        </div>
                      ) : (
                        <ul className="mb-0 pl-3">
                          {files.map((file) => (
                            <li key={file.name}>{file.name}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </Dropzone>
              </FormGroup>

              <FormGroup>
                <label className="form-label">Notes / Instructions for Student (optional)</label>
                <Input
                  type="textarea"
                  rows="3"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Answer all questions, duration 90 minutes"
                />
              </FormGroup>
            </ModalBody>
            <ModalFooter>
              <Button type="button" color="light" onClick={closeUploadModal}>
                Cancel
              </Button>
              <Button type="submit" color="primary" disabled={submitting}>
                {submitting ? "Uploading..." : "Upload Question Paper"}
              </Button>
            </ModalFooter>
          </Form>
        </Modal>
      </Content>
    </React.Fragment>
  );
};

export default QuestionPaperUpload;
