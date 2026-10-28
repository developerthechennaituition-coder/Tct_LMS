import React, { useContext, useEffect, useState, useMemo } from "react";
import {
  DropdownMenu,
  DropdownToggle,
  FormGroup,
  UncontrolledDropdown,
  Modal,
  ModalBody,
  DropdownItem,
  Form,
  Row,
  Input,
  Nav,
  NavItem,
  NavLink,
  TabContent,
  TabPane,
  Spinner,
} from "reactstrap";
import classNames from "classnames";
import { addUpdateTutorSkillset } from "../../../apiservices/TutorService";
import {
  Block,
  ReactDataTable,
  BlockBetween,
  BlockDes,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  PreviewCard,
  Icon,
  Col,
  Button,
  RSelect,
} from "../../../components/Component";
import Content from "../../../layout/content/Content";
import Head from "../../../layout/head/Head";
import { useForm } from "react-hook-form";
import classnames from "classnames";
import { createTutor } from "../../../apiservices/TutorService";
import { getLookups, getAllRoles } from "../../../apiservices/LookupsService";
import { ToastContainer } from "react-toastify";
import { toast } from "react-toastify";
import { useLocation } from "react-router-dom";

const SkillsetForm = (props) => {
  const defaultGuid = "00000000-0000-0000-0000-000000000000";
  const [loading, setLoading] = useState(false);
  const [tutorSkillSets, setTutorSkillSets] = useState([]);
  const [courseList, setCourseList] = useState([]);
  const [gradeList, setGradeList] = useState([]);
  const [loggedInUserId, setLoggedInUserId] = useState(localStorage.userId);
  const [boardList, setBoardList] = useState([]);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const [skillFormData, setSkillFormData] = useState({
    boardId: props.mode == "edit" ? props.dataItem.boardId : "",
    gradeId: props.mode == "edit" ? props.dataItem.gradeId : "",
    subjectId: "",
    subjects: props.mode == "edit" ? props.dataItem.subjectIds : [],
    loggedInUserId: localStorage.userId,
    userId: searchParams.get("id"),
    tutorId: props?.tutorId,
  });

  useEffect(() => {
    getLookups("500" /*Grade*/).then((response) => {
      let temp = [];
      response.forEach((s) => {
        temp.push({ value: s?.id, label: s?.typeCodeName });
      });
      setCourseList(temp);
    });

    getLookups("400" /*Grade*/).then((response) => {
      let temp = [];
      response.forEach((s) => {
        temp.push({ value: s?.id, label: s?.typeCodeName, id: s?.id });
      });
      setBoardList(temp);
    });

    getLookups("300" /*Grade*/).then((response) => {
      let temp = [];
      response
        .filter((s) => s?.typeCodeName?.startsWith("Grade"))
        .forEach((s) => {
          temp.push({ value: s?.id, label: s?.typeCodeName });
        });
      setGradeList(temp);
    });
  }, []);

  const onSkillSetFormSubmit = () => {
    const formData = { ...skillFormData };
    const subjectsIds = formData.subjects.map((sub) => sub.value);

    if (props.draftMode) {
      const boardName = boardList.find((b) => b.value === formData.boardId)?.label || "";
      const gradeName = gradeList.find((g) => g.value === formData.gradeId)?.label || "";
      const subjectName = formData.subjects.map((s) => s.label).join(", ");
      if (typeof props.skillsetCallback === "function") {
        props.skillsetCallback({
          boardId: formData.boardId,
          boardName,
          gradeId: formData.gradeId,
          gradeName,
          SubjectIds: subjectsIds,
          subjects: formData.subjects,
          subjectName,
        });
      }
      return;
    }

    const inputData = {
      boardId: formData.boardId,
      gradeId: formData.gradeId,
      SubjectIds: subjectsIds,
      loggedInUserId: localStorage.userId,
      userId: searchParams.get("id"),
      tutorId: props?.tutorId || defaultGuid,
      // Edit replaces only this row; add (no id) keeps the tutor's other skills.
      ...(props.mode == "edit" && props.dataItem?.id ? { id: props.dataItem.id } : {}),
    };

    setLoading(true);
    addUpdateTutorSkillset(inputData).then((response) => {
      if (response.succeeded == false) {
        toast.error("Failed to save skill sets.", {
          position: "top-right",
          autoClose: true,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: false,
        });
        return;
      }
      if (typeof props.skillsetCallback === "function") {
        props.skillsetCallback(response);
      }
    }).finally(() => setLoading(false));
  };
  const formClass = classNames({
    "form-validate": true,
    "is-alter": "alter",
  });
  const { errors, register, handleSubmit } = useForm();
  return (
    <>
      <Form className={formClass} onSubmit={handleSubmit(onSkillSetFormSubmit)}>
        <Row className="g-3">
          <div className="col-md-12">
            <div className="row">
              <div className="col-md-12">
                <label className="form-label">Board </label>

                {/* {errors.boardId && <span className="invalid">This field is required</span>} */}
                <FormGroup>
                  <select
                    ref={register({
                      required: true,
                      message: "Please select board.",
                    })}
                    className="form-control form-select"
                    id="boardId"
                    name="boardId"
                    value={skillFormData.boardId}
                    placeholder="Select a option"
                    onChange={(e) => {
                      setSkillFormData({
                        ...skillFormData,
                        boardId: e.target.value,
                      });
                    }}
                  >
                    <option label="Select a board" value=""></option>
                    {boardList.map((item) => (
                      <option value={item.value}>{item.label}</option>
                    ))}
                  </select>
                  {errors.boardId && <span className="invalid">Please select board.</span>}
                </FormGroup>
              </div>
            </div>
          </div>
          <div className="col-md-12">
            <div className="row">
              <div className="col-md-12">
                <label className="form-label">Grade </label>
                <FormGroup>
                  <div className="form-control-wrap">
                    <select
                      ref={register({
                        required: true,
                        message: "Please select grade.",
                      })}
                      className="form-control form-select"
                      id="gradeId"
                      name="gradeId"
                      isMulti
                      value={skillFormData.gradeId}
                      placeholder="Select a option"
                      onChange={(e) => {
                        setSkillFormData({
                          ...skillFormData,
                          gradeId: e.target.value,
                        });
                      }}
                    >
                      <option label="Select a grade" value=""></option>
                      {gradeList.map((item) => (
                        <option value={item.value}>{item.label}</option>
                      ))}
                    </select>
                    {errors.gradeId && <span className="invalid">Please select grade</span>}
                  </div>
                </FormGroup>
              </div>
            </div>
          </div>
          <div className="col-md-12">
            <div className="row">
              <div className="col-md-12">
                <label className="form-label">Subject</label>
                <FormGroup>
                  <RSelect
                    isMulti
                    name="subjects"
                    options={courseList}
                    value={skillFormData.subjects}
                    dataSource={courseList || []}
                    onChangeHandler={(e) => {
                      setSkillFormData({
                        ...skillFormData,
                        subjects: e,
                      });
                    }}
                    ref={register({ required: "This field is required" })}
                  />

                  {errors.subjects && <span className="invalid">Please select couse</span>}
                </FormGroup>
              </div>
            </div>
          </div>
          <Col size="12">
            <ToastContainer />
            <Button color="primary" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Spinner size="sm" className="mr-1" /> <span>Saving...</span>
                </>
              ) : (
                <>
                  <Icon className="plus"></Icon>
                  <span>Add Skills</span>
                </>
              )}
            </Button>
          </Col>
        </Row>
      </Form>
    </>
  );
};

export default SkillsetForm;
