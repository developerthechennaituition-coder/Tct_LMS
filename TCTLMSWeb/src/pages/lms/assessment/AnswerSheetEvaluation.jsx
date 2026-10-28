import React, { useEffect, useState } from "react";
import moment from "moment";
import { toast } from "react-toastify";
import { Modal, ModalHeader, ModalBody, ModalFooter, Form, FormGroup, Input, Badge, Alert } from "reactstrap";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import { useHistory } from "react-router-dom";
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
import {
  getAnswerSheetSubmissions,
  downloadAssessmentFile,
  evaluateAnswerSheet,
} from "../../../apiservices/AssessmentService";

// Page-scoped styles (every selector starts with .tct-assess). Kept identical to QuestionPaperUpload.jsx.
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

// Evaluation SLA: answer sheets must be evaluated within 1 day of submission.
const evaluationSla = (row) => {
  if (row.evaluationStatus === "Evaluated") {
    return { label: "Evaluated", color: "success" };
  }
  const dueBy = moment.parseZone(`${row.submittedOn}+05:30`).add(1, "day");
  const now = moment();
  if (now.isAfter(dueBy)) {
    return { label: "Overdue", color: "danger" };
  }
  if (dueBy.isSame(now, "day")) {
    return { label: "Due Today", color: "warning" };
  }
  return { label: "Pending", color: "info" };
};

const AnswerSheetEvaluation = () => {
  const [sm, updateSm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [evalModalOpen, setEvalModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [marksObtained, setMarksObtained] = useState("");
  const [maxMarks, setMaxMarks] = useState("");
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const tutorId = localStorage.getItem("userId");

  // Back: previous in-app page; on direct entry (no router history key) fall back to the Dashboard ("/").
  const history = useHistory();
  const handleBack = () => {
    if (history.location.key) history.goBack();
    else history.push(`${process.env.PUBLIC_URL}/`);
  };

  const loadSubmissions = () => {
    setLoading(true);
    setLoadError(false);
    getAnswerSheetSubmissions(tutorId, searchText)
      .then((response) => setSubmissions(response || []))
      .catch(() => { setSubmissions([]); setLoadError(true); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openEvalModal = (row) => {
    setSelectedSubmission(row);
    setMarksObtained(row.marksObtained ?? "");
    setMaxMarks(row.maxMarks ?? "");
    setFeedback(row.feedback ?? "");
    setEvalModalOpen(true);
  };

  const closeEvalModal = () => {
    setEvalModalOpen(false);
    setSelectedSubmission(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (submitting) return;
    if (marksObtained === "" || maxMarks === "") {
      toast.error("Please enter marks obtained and maximum marks.");
      return;
    }
    if (Number(maxMarks) <= 0 || Number(maxMarks) > 9999.99 || Number(marksObtained) < 0 || Number(marksObtained) > Number(maxMarks)) {
      toast.error("Maximum marks must be positive (up to 9999.99); marks obtained must be between zero and maximum.");
      return;
    }

    const payload = {
      MarksObtained: Number(marksObtained),
      MaxMarks: Number(maxMarks),
      Feedback: feedback,
      EvaluatedByUserId: tutorId,
    };

    setSubmitting(true);
    evaluateAnswerSheet(selectedSubmission.id, payload)
      .then(() => {
        toast.success("Evaluation submitted successfully.");
        closeEvalModal();
        loadSubmissions();
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
          <span className="d-block text-muted small">{row.subjectName}</span>
        </div>
      ),
    },
    {
      name: "Exam Date",
      selector: (row) => row.examDate,
      sortable: true,
      cell: (row) => (row.examDate ? moment(row.examDate).format("DD MMM YYYY") : "-"),
    },
    {
      name: "Submitted On",
      selector: (row) => row.submittedOn,
      sortable: true,
      cell: (row) => <span>{row.submittedOn ? moment(row.submittedOn).format("DD MMM YYYY, hh:mm A") + " IST" : "-"}{row.isLateSubmission && <Badge color="warning" className="ml-1">Late</Badge>}</span>,
    },
    {
      name: "Evaluate By",
      cell: (row) => (row.submittedOn ? moment(row.submittedOn).add(1, "day").format("DD MMM YYYY") : "-"),
    },
    {
      name: "Status",
      cell: (row) => {
        const sla = evaluationSla(row);
        return <Badge color={sla.color}>{sla.label}</Badge>;
      },
    },
    {
      name: "Marks",
      cell: (row) =>
        row.evaluationStatus === "Evaluated" ? `${row.marksObtained ?? "-"} / ${row.maxMarks ?? "-"}` : "-",
    },
    {
      name: "Action",
      cell: (row) => (
        <div className="d-flex gap-2">
          <Button
            size="sm"
            color="light"
            onClick={() => downloadAssessmentFile(row.id, true).catch((e) => toast.error(e.message))}
          >
            <Icon name="file-text" />
          </Button>
          <Button size="sm" color="primary" onClick={() => openEvalModal(row)}>
            {row.evaluationStatus === "Evaluated" ? "View / Edit" : "Evaluate"}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <React.Fragment>
      <Head title="Answer Sheet Evaluation" />
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
                  Answer Sheet Evaluation
                </BlockTitle>
              </div>
              <BlockDes className="text-soft">
                <p>Answer sheets submitted by students. Evaluation should be completed within one day of submission.</p>
              </BlockDes>
            </BlockHeadContent>
            <BlockHeadContent>
              <div className="toggle-wrap nk-block-tools-toggle">
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
          {loadError && <Alert color="danger">Unable to load submissions. Please retry using Search.</Alert>}
          <div className="tct-assess-card tct-assess-toolbar">
            <div className="tct-assess-search">
              <Icon name="search" />
              <Input
                type="search"
                placeholder="Search by student or subject"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadSubmissions()}
              />
            </div>
            <Button color="primary" className="tct-assess-search-btn" onClick={loadSubmissions}>
              <Icon name="search" /> Search
            </Button>
          </div>

          <div
            className={`tct-assess-card tct-assess-results${
              !loading && !loadError && submissions.length === 0 ? " is-empty" : ""
            }`}
          >
            <ReactDataTable data={submissions} columns={columns} pagination canShowFilter={false} className="nk-tb-list" />
            {!loading && !loadError && submissions.length === 0 && (
              <div className="tct-assess-empty">
                <span className="tct-assess-empty-icon">
                  <Icon name="file-check" />
                </span>
                <span className="tct-assess-empty-text">No answer sheets submitted yet.</span>
              </div>
            )}
          </div>
        </Block>
        </div>

        <Modal isOpen={evalModalOpen} toggle={closeEvalModal} size="md">
          <ModalHeader toggle={closeEvalModal}>Evaluate Answer Sheet</ModalHeader>
          <Form onSubmit={handleSubmit}>
            <ModalBody>
              {selectedSubmission && (
                <div className="mb-3">
                  <Row className="g-2">
                    <Col sm="6">
                      <span className="text-muted small">Student</span>
                      <div className="fw-medium">{selectedSubmission.studentName}</div>
                    </Col>
                    <Col sm="6">
                      <span className="text-muted small">Subject</span>
                      <div className="fw-medium">{selectedSubmission.subjectName}</div>
                    </Col>
                  </Row>
                  <div className="mt-2">
                    <Button
                      size="sm"
                      color="light"
                      type="button"
                      onClick={() =>
                        window.open(
                          getAnswerSheetDownloadUrl(selectedSubmission.id),
                          "_blank",
                          "noopener,noreferrer"
                        )
                      }
                    >
                      <Icon name="file-text" className="mr-1" />
                      View Submitted Answer Sheet
                    </Button>
                  </div>
                </div>
              )}

              <Row className="g-2">
                <Col sm="6">
                  <FormGroup>
                    <label className="form-label">Marks Obtained</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      max={maxMarks || 9999.99}
                      value={marksObtained}
                      onChange={(e) => setMarksObtained(e.target.value)}
                    />
                  </FormGroup>
                </Col>
                <Col sm="6">
                  <FormGroup>
                    <label className="form-label">Maximum Marks</label>
                    <Input type="number" min="0.01" max="9999.99" step="0.01" value={maxMarks} onChange={(e) => setMaxMarks(e.target.value)} />
                  </FormGroup>
                </Col>
              </Row>

              <FormGroup>
                <label className="form-label">Feedback</label>
                <Input
                  type="textarea"
                  rows="3"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Comments on the student's performance"
                />
              </FormGroup>
            </ModalBody>
            <ModalFooter>
              <Button type="button" color="light" onClick={closeEvalModal}>
                Cancel
              </Button>
              <Button type="submit" color="primary" disabled={submitting}>
                {submitting ? "Saving..." : "Submit Evaluation"}
              </Button>
            </ModalFooter>
          </Form>
        </Modal>
      </Content>
    </React.Fragment>
  );
};

export default AnswerSheetEvaluation;
