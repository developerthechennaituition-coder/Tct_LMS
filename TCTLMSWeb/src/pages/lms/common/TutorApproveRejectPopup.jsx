import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import {
  FormGroup,
  Form,
  Modal,
  ModalBody,
  ModalHeader,
  Button,
  UncontrolledPopover,
  PopoverHeader,
  PopoverBody,
} from "reactstrap";
import { Col, Icon, Row, RSelect } from "../../../components/Component";
import { UUIDNill, FollowUpStatus } from "../../../utils/Utils";
import { getTutors, getTutorAvailablity } from "../../../apiservices/UserService";
import { GetSalesDetails } from "../../../apiservices/NofiticationService";
import { updateStatus } from "../../../apiservices/StudentEnrollmentService";
import UserAvailableSlotsProgressBar from "./UserAvailableSlotsProgressBar";

const TutorApproveRejectPopup = (props) => {
  const defaultGuid = UUIDNill();
  const userId = localStorage.getItem("userId");

  const [tutorAvailableSlots, setTutorAvailableSlots] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(props.modalOpen);
  const [modalHeader] = useState("Approve/Reject Tutor");
  const [tutorList, setTutorList] = useState([]);
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [tutorName, setTutorName] = useState("");
  const [decision, setDecision] = useState(null);
  const [saving, setSaving] = useState(false);

  const [salesDetails, setSalesDetails] = useState({
    studentId: null,
    studentName: "",
    tutorName: "",
    coordinatorId: "",
    coordinatorName: "",
    subjectId: "",
    subjectName: "",
    gradeName: "",
    gradId: "",
    boardName: "",
    boardId: "",
    tutorId: "",
    enrollmentDate: "",
    status: "",
    tutorPayment: "",
    noteText: "",
  });

  const toggle = () => setPopoverOpen(!popoverOpen);

  const { errors, register, handleSubmit, setValue } = useForm({});

  useEffect(() => {
    register("tutorId", { required: "Tutor is required" });
  }, [register]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const tutorResponse = await getTutors();

        const tutors = (tutorResponse || []).map((s) => ({
          value: s?.id?.toString(),
          label: s?.fullName,
        }));

        setTutorList(tutors);

        const _dataItem = props.dataItem;
        if (_dataItem) {
          const response = await GetSalesDetails(
            props?.dataItem.salesId,
            props?.dataItem.saleDetailsId,
            UUIDNill()
          );

          if (response?.data) {
            const temp = {
              ...response.data,
              salesId: props?.dataItem.salesId,
              salesDetailId: props?.dataItem.saleDetailsId,
              tutorId: response?.data?.tutorId
                ? response.data.tutorId.toString()
                : "",
            };

            setSalesDetails(temp);
            setValue("tutorId", temp.tutorId);

            if (temp.tutorId) {
              const matchedTutor =
                tutors.find(
                  (t) =>
                    t.value?.toString().trim() ===
                    temp.tutorId?.toString().trim()
                ) || null;

              setSelectedTutor(
                matchedTutor || {
                  value: temp.tutorId,
                  label: temp.tutorName || "Selected Tutor",
                }
              );

              setTutorName(
                matchedTutor?.label || temp.tutorName || "Selected Tutor"
              );

              await tutorAvailablity(temp.tutorId);
            }
          }
        }
      } catch (error) {
        console.error("Error loading tutor popup data:", error);
      }
    };

    loadData();
  }, [props.dataItem, setValue]);

  useEffect(() => {
    setIsModalOpen(props.modalOpen);
  }, [props.modalOpen]);

  const tutorAvailablity = async (tutorId) => {
    if (!tutorId) {
      setTutorAvailableSlots([]);
      return;
    }

    try {
      const response = await getTutorAvailablity(tutorId);
      setTutorAvailableSlots(response || []);
    } catch (error) {
      console.error("Error getting tutor availability:", error);
      setTutorAvailableSlots([]);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    props.modalStateChange(false);
  };

  const onStatusUpdateHandler = async (selectedDecision) => {
    if (selectedDecision === "reject" && !salesDetails?.noteText?.trim()) {
      toast.error("Rejection reason is required.");
      return;
    }
    const statusCode = selectedDecision === "approve"
      ? FollowUpStatus.DemoPendingTutorAssignedApproved
      : FollowUpStatus.Reject;
    const typeCode = props.statusList.find((item) => item.code === statusCode);
    if (!typeCode) {
      toast.error("The selected approval status is unavailable.");
      return;
    }
    const inputData = {
      SalesId: salesDetails?.salesId,
      SaleseDetailsId: salesDetails?.salesDetailId,
      UserId: userId,
      NoteText: salesDetails?.noteText || "",
      Status: statusCode,
      TutorId: salesDetails?.tutorId,
      StatusId: typeCode.value,
      FollowUpDate: null,
      TutorPayment: salesDetails?.tutorPayment,
    };

    const message =
      selectedDecision === "approve"
        ? "Tutor approved successfully."
        : "Tutor rejected successfully.";

    try {
      setSaving(true);
      const response = await updateStatus(inputData);
      if (response?.succeeded === false) throw new Error(response.message);
      toast.success(message, {
        position: "top-right",
        autoClose: true,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: false,
      });

      closeModal();
    } catch (error) {
      toast.error(error?.message || "Unable to update the tutor assignment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal
        key="modal1234"
        isOpen={isModalOpen}
        toggle={closeModal}
        className="modal-dialog-centered"
        size="lg"
      >
        <ModalHeader
          close={
            <button className="close" type="button" onClick={closeModal}>
              <Icon name="cross" />
            </button>
          }
        >
          {modalHeader}
        </ModalHeader>

        <ModalBody>
          <div>
            <Form
              className="row gy-1"
              noValidate
              onSubmit={(event) => event.preventDefault()}
            >
              <Row className="col-md-12">
                <Col md="3">
                  <FormGroup>
                    <label className="overline-title">Coordinator:</label>
                  </FormGroup>
                </Col>
                <Col md="3">
                  <FormGroup>
                    <p>{salesDetails?.coordinatorName}</p>
                  </FormGroup>
                </Col>
                <Col sm="2">
                  <FormGroup>
                    <label className="overline-title">Board:</label>
                  </FormGroup>
                </Col>
                <Col sm="4">
                  <FormGroup>
                    <p>{salesDetails?.boardName}</p>
                  </FormGroup>
                </Col>
              </Row>

              <Row className="col-md-12">
                <Col md="3">
                  <FormGroup>
                    <label className="overline-title">Grade:</label>
                  </FormGroup>
                </Col>
                <Col md="3">
                  <FormGroup>
                    <p>{salesDetails?.gradeName}</p>
                  </FormGroup>
                </Col>
                <Col md="2">
                  <FormGroup>
                    <label className="overline-title">Status:</label>
                  </FormGroup>
                </Col>
                <Col md="4">
                  <FormGroup>
                    <p>{salesDetails?.statusTypeName}</p>
                  </FormGroup>
                </Col>
              </Row>

              {tutorList.length > 0 && (
                <Row className="col-md-12">
                  <Col sm="6">
                    <FormGroup>
                      <label className="overline-title">Tutor</label>
                      <div
                        className="form-control-wrap form-control-with-info"
                        style={{ width: "100%" }}
                      >
                        <div className="tutor-info-container">
                          <RSelect
                            key={selectedTutor?.value || "empty"}
                            name="tutorId"
                            ref={register({ required: "This field is required" })}
                            dataSource={tutorList || []}
                            value={selectedTutor}
                            value1={selectedTutor?.value || ""}
                            onChangeHandler={(e) => {
                              const selected = {
                                value: e?.value,
                                label: e?.label,
                              };

                              setSelectedTutor(selected);
                              setTutorName(e?.label || "");
                              setPopoverOpen(false);
                              tutorAvailablity(e?.value);

                              setSalesDetails((prevState) => ({
                                ...prevState,
                                tutorId: e?.value,
                                tutorName: e?.label,
                              }));

                              setValue("tutorId", e?.value);
                            }}
                          />

                          <a
                            href="#alert"
                            onClick={(e) => {
                              e.preventDefault();
                              setPopoverOpen((prev) => !prev);
                            }}
                            className="btn btn-icon btn-trigger text-primary chat-profile-toggle"
                          >
                            <Icon name="alert-circle-fill" id="PopoverTop" />
                          </a>
                        </div>

                        {errors.tutorId && (
                          <span
                            className="invalid"
                            style={{
                              color: "#e85347",
                              fontSize: "11px",
                              fontStyle: "italic",
                            }}
                          >
                            {errors.tutorId.message}
                          </span>
                        )}

                        <UncontrolledPopover
                          isOpen={popoverOpen}
                          className="custompopover"
                          placement="top"
                          toggle={toggle}
                          target="PopoverTop"
                        >
                          <PopoverHeader>
                            Tutor Info {tutorName ? `- ${tutorName}` : ""}
                          </PopoverHeader>
                          <PopoverBody>
                            <Row className="col-md-12">
                              <Col md="12">
                                {tutorAvailableSlots && (
                                  <UserAvailableSlotsProgressBar
                                    type="tutor"
                                    dataSource={tutorAvailableSlots}
                                  />
                                )}
                              </Col>
                            </Row>

                            <Col md="12">
                              {(!tutorAvailableSlots ||
                                tutorAvailableSlots?.length === 0) && (
                                  <div key="divSlots" className="row mb-1">
                                    <div className="col-md-12 text-center pt-2 pb-2 success">
                                      <span className="tb-status text-warning">
                                        No available time slot for selected tutor!
                                      </span>
                                    </div>
                                  </div>
                                )}
                            </Col>
                          </PopoverBody>
                        </UncontrolledPopover>
                      </div>
                    </FormGroup>
                  </Col>

                  <Col sm="6">
                    <FormGroup>
                      <label className="overline-title">Tutor Payment:</label>
                      <div
                        className="form-control-wrap form-control-with-info"
                        style={{ width: "100%" }}
                      >
                        <input
                          type="number"
                          id="tutorPayment"
                          name="tutorPayment"
                          maxLength={3}
                          ref={register({ required: true })}
                          className="form-control"
                          onChange={(e) => {
                            setSalesDetails((prevState) => ({
                              ...prevState,
                              tutorPayment: e.target.value,
                            }));
                          }}
                          value={salesDetails?.tutorPayment || ""}
                        />
                        {errors.tutorPayment && (
                          <p className="invalid">This field is required</p>
                        )}
                      </div>
                    </FormGroup>
                  </Col>
                </Row>
              )}

              {decision && <Row className="col-md-12">
                <Col md="12">
                  <FormGroup>
                    <label className="form-label" htmlFor="noteText">
                      {decision === "reject" ? "Rejection reason:" : "Remarks (optional):"}
                    </label>
                    <div className="form-control-wrap">
                      <textarea
                        className="no-resize form-control"
                        id="noteText"
                        name="noteText"
                        style={{ minHeight: "60px" }}
                        rows={2}
                        onChange={(e) => {
                          setSalesDetails((prevState) => ({
                            ...prevState,
                            noteText: e.target.value,
                          }));
                        }}
                        ref={register({ required: decision === "reject" })}
                        value={salesDetails?.noteText || ""}
                      />
                      {errors.noteText && (
                        <p className="invalid">This field is required</p>
                      )}
                    </div>
                  </FormGroup>
                </Col>
              </Row>}

              <Row className="col-md-12 pt-3">
                <Col size="6"></Col>
                <Col size="6">
                  <ul className="align-center flex-wrap flex-sm-nowrap gx-4 gy-2">
                    <li>
                      <Button
                        color="primary"
                        size="md"
                        type="button"
                        disabled={saving}
                        onClick={() => {
                          if (decision === "approve") onStatusUpdateHandler("approve");
                          else setDecision("approve");
                        }}
                      >
                        <Icon name="user-check" />
                        Approve
                      </Button>
                    </li>

                    <li>
                      <Button
                        color="btn btn-danger btn-md"
                        size="md"
                        type="button"
                        disabled={saving}
                        onClick={() => {
                          if (decision === "reject") onStatusUpdateHandler("reject");
                          else setDecision("reject");
                        }}
                      >
                        <Icon name="user-cross" />
                        Reject
                      </Button>
                    </li>

                    <li>
                      <Button
                        color="secondary"
                        type="button"
                        size="md"
                        onClick={closeModal}
                      >
                        Cancel
                      </Button>
                    </li>
                  </ul>
                </Col>
              </Row>
            </Form>
          </div>
        </ModalBody>
      </Modal>
    </>
  );
};

export default TutorApproveRejectPopup;
