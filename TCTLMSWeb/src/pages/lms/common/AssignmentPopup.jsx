import React, { useState } from "react";
import {
  Modal,
  ModalBody,
  Nav,
  NavItem,
  NavLink,
  TabContent,
  TabPane,
} from "reactstrap";
import classnames from "classnames";
import TutorInfo from "../tutors/TutorInfo";
import TutorAssignmentPopup from "../common/TutorAssignmentPopup";

const AssignmentPopup = (props) => {
  const [activeTab, setActiveTab] = useState("1");

  const toggleTab = (tab) => {
    if (activeTab !== tab) {
      setActiveTab(tab);
    }
  };

  const handleClose = () => {
    props.modalStateChange(false);
  };

  return (
    <Modal
      key="modal1234"
      isOpen={props.modalOpen}
      toggle={handleClose}
      className="modal-dialog-centered custom-modal tutor-assignment"
      size="xl"
    >
      <ModalBody>
        <Nav tabs className="nav-tabs-mb-icon nav-tabs-card">
          <NavItem>
            <NavLink
              href="#"
              className={classnames({ active: activeTab === "1" })}
              onClick={(ev) => {
                ev.preventDefault();
                toggleTab("1");
              }}
            >
              Assign Tutor
            </NavLink>
          </NavItem>

          <NavItem>
            <NavLink
              href="#"
              className={classnames({ active: activeTab === "2" })}
              onClick={(ev) => {
                ev.preventDefault();
                toggleTab("2");
              }}
            >
              Tutor Info
            </NavLink>
          </NavItem>
        </Nav>

        <TabContent activeTab={activeTab}>
          <TabPane tabId="1">
            {activeTab === "1" && <TutorAssignmentPopup
              isTabContent={true}
              selectedTutor={props?.selectedTutor}
              dataItem={props?.salesDetails}
              statusList={props?.statusList}
              salesDetails={props?.salesDetails}
              modalOpen={props?.modalOpen}
              modalStateChange={handleClose}
            />}
          </TabPane>

          <TabPane tabId="2">
            {activeTab === "2" && <TutorInfo
              isTabContent={true}
              selectedTutor={props?.selectedTutor}
              tutorId={props?.selectedTutor?.tutorId}
              tutorUserId={props?.selectedTutor?.userId}
              modalOpen={false}
              tutorInfoModalHandler={() => {}}
            />}
          </TabPane>
        </TabContent>
      </ModalBody>
    </Modal>
  );
};

export default AssignmentPopup;
