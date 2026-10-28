import React from "react";
import "react-phone-number-input/style.css";
import { Block, PreviewAltCard } from "../../../components/Component";
import Content from "../../../layout/content/Content";
import Head from "../../../layout/head/Head";

import TCTScheduleCalender from "../schedule/TCTScheduleCalender";

const TCTStudentCalender = () => {
  return (
    <>
      <Head title="TCT - Student Calender"></Head>
      <Content>
        <Block>
          <PreviewAltCard>
            <TCTScheduleCalender guestType="student"></TCTScheduleCalender>
          </PreviewAltCard>
        </Block>
      </Content>
    </>
  );
};
export default TCTStudentCalender;
