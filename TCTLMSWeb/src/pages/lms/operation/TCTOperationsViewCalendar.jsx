import React from "react";
import { Link } from "react-router-dom";
import { Block, Icon, PreviewAltCard } from "../../../components/Component";
import Content from "../../../layout/content/Content";
import Head from "../../../layout/head/Head";

import TCTScheduleCalender from "../schedule/TCTScheduleCalender";

// Operations "View Calendar": the shared Tutor/Student calendar, showing every tutor's and
// student's classes (viewAll), read-only.
const TCTOperationsViewCalendar = () => {
  return (
    <>
      <Head title="TCT - Operations Calendar"></Head>
      <Content>
        <Block>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4 style={{ fontWeight: 700, margin: 0 }}>Operations Calendar</h4>
            <Link to={`${process.env.PUBLIC_URL}/lms/operation/calendar`} className="btn btn-outline-light">
              <Icon name="arrow-left" />
              <span>Back</span>
            </Link>
          </div>
          <PreviewAltCard>
            <TCTScheduleCalender guestType="operation" viewAll></TCTScheduleCalender>
          </PreviewAltCard>
        </Block>
      </Content>
    </>
  );
};
export default TCTOperationsViewCalendar;
