import React from "react";
import "react-phone-number-input/style.css";
import { Block, PreviewAltCard } from "../../../components/Component";
import Content from "../../../layout/content/Content";
import Head from "../../../layout/head/Head";
import TCTScheduleCalender from "../schedule/TCTScheduleCalender";

const TCTTutorCalender = () => {
  return (
    <>
      <Head title="TCT - tutor info"></Head>
      <Content>
        <Block>
          <PreviewAltCard>
            <TCTScheduleCalender guestType="tutor"></TCTScheduleCalender>
          </PreviewAltCard>
        </Block>
      </Content>
    </>
  );
};
export default TCTTutorCalender;
