import React from "react";
import { Link } from "react-router-dom";
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
} from "../../../components/Component";

// Page-scoped styles: every selector starts with .tct-mock.
const mockExamsStyle = `
  .tct-mock .nk-block-head { padding-bottom: 18px; }
  .tct-mock .nk-block-title.page-title { margin: 0; font-size: 1.6rem; font-weight: 700; color: #1c2b46; }
  .tct-mock .nk-block-des p { margin: 6px 0 0; font-size: 14px; color: #6b7a90; }

  .tct-mock-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
  .tct-mock-card {
    display: flex; flex-direction: column; gap: 14px; height: 100%; padding: 22px;
    background: #fff; border: 1px solid #e5e9f2; border-radius: 12px; box-shadow: 0 1px 3px rgba(31, 43, 58, 0.05);
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .tct-mock-card:hover { border-color: #d9cbff; box-shadow: 0 6px 18px rgba(133, 79, 255, 0.1); }
  .tct-mock-card-head { display: flex; align-items: center; gap: 12px; }
  .tct-mock-icon {
    display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
    width: 44px; height: 44px; border-radius: 10px; font-size: 22px; color: #854fff; background: #f5f1ff;
  }
  .tct-mock-card-title { margin: 0; font-size: 16px; font-weight: 700; color: #1c2b46; }
  .tct-mock-card-text { margin: 0; flex: 1 1 auto; font-size: 14px; line-height: 1.6; color: #6b7a90; }
  .tct-mock-card .btn {
    align-self: flex-start; display: inline-flex; align-items: center; gap: 6px;
    height: 38px; padding: 0 16px; border-radius: 8px; font-size: 13px; font-weight: 600;
  }

  @media (max-width: 767.98px) {
    .tct-mock-grid { grid-template-columns: minmax(0, 1fr); }
    .tct-mock .nk-block-title.page-title { font-size: 1.35rem; }
    .tct-mock-card .btn { align-self: stretch; justify-content: center; }
  }
`;

// Mock Exams: entry point to the existing Question Paper Upload and Answer Sheet Evaluation pages
// (same routes the Tutor Dashboard buttons used; no logic is duplicated here).
const MockExams = () => {
  return (
    <React.Fragment>
      <Head title="Mock Exams" />
      <Content>
        <style>{mockExamsStyle}</style>
        <div className="tct-mock">
          <BlockHead size="sm">
            <BlockBetween>
              <BlockHeadContent>
                <BlockTitle page tag="h3">
                  Mock Exams
                </BlockTitle>
                <BlockDes>
                  <p>Upload question papers for scheduled tests and evaluate the answer sheets students submit.</p>
                </BlockDes>
              </BlockHeadContent>
            </BlockBetween>
          </BlockHead>

          <Block>
            <div className="tct-mock-grid">
              <div className="tct-mock-card">
                <div className="tct-mock-card-head">
                  <span className="tct-mock-icon">
                    <Icon name="upload" />
                  </span>
                  <h5 className="tct-mock-card-title">Upload Question Papers</h5>
                </div>
                <p className="tct-mock-card-text">
                  Upload the question paper for each scheduled test, at least one day before the exam date.
                </p>
                <Link to={`${process.env.PUBLIC_URL}/lms/assessment/question-paper-upload`} className="btn btn-primary">
                  <Icon name="upload" />
                  <span>Upload Question Papers</span>
                </Link>
              </div>

              <div className="tct-mock-card">
                <div className="tct-mock-card-head">
                  <span className="tct-mock-icon">
                    <Icon name="file-check" />
                  </span>
                  <h5 className="tct-mock-card-title">Evaluate Answer Sheets</h5>
                </div>
                <p className="tct-mock-card-text">
                  Review the answer sheets submitted by students and record marks and feedback.
                </p>
                <Link to={`${process.env.PUBLIC_URL}/lms/assessment/answer-sheet-evaluation`} className="btn btn-primary">
                  <Icon name="file-check" />
                  <span>Evaluate Answer Sheets</span>
                </Link>
              </div>
            </div>
          </Block>
        </div>
      </Content>
    </React.Fragment>
  );
};

export default MockExams;
