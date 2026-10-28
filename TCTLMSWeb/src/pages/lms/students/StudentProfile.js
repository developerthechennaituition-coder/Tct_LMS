import React, { useEffect, useState } from "react";
import Head from "../../../layout/head/Head";
import DatePicker from "react-datepicker";
import moment from "moment";
import { ToastContainer } from "react-toastify";
import { toast } from "react-toastify";
import { Modal, ModalBody, FormGroup, Form, Spinner } from "reactstrap";
import {
  Block,
  BlockBetween,
  BlockDes,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Icon,
  Row,
  Col,
  Button,
  RSelect,
} from "../../../components/Component";
import classNames from "classnames";
import { useLocation } from "react-router-dom";
import { getStudent, updateStudent } from "../../../apiservices/StudentEnrollmentService";
import { countryOptions, StudetnData } from "./UserData";
import { getDateStructured } from "../../../utils/Utils";
import { useForm } from "react-hook-form";
import { getUsers, createSale } from "../../../apiservices/UserService";
import { getLookups } from "../../../apiservices/LookupsService";
import StudentAddress from "../students/StudentAddress";
import { usePermissions } from "../../../hooks/usePermissions";

const StudentProfilePage = ({ sm, updateSm, setProfileName }) => {
  const [modalTab, setModalTab] = useState("1");
  const [loading, setLoading] = useState(false);
  const defaultGuid = "00000000-0000-0000-0000-000000000000";
  const [userInfo, setUserInfo] = useState(StudetnData[0]);
  const [coordinators, setCoordinators] = useState([]);
  const [courseList, setCourseList] = useState([]);
  const [gradeList, setGradeList] = useState([]);
  const [boardList, setBoardList] = useState([]);
  const [genderList, setGenderList] = useState([]);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const [id, setId] = useState(searchParams.get("id"));
  const [formData, setFormData] = useState({
    id: defaultGuid,
    code: "",
    studentName: "",
    parentName: "",
    firstName: "",
    dob: new Date(),
    gender: "",
    boardId: defaultGuid,
    gradeId: defaultGuid,
    emailAddress: "",
    mobileNumber: "",
    studentAddresses: {
      id: defaultGuid,
      state: "",
      addressLine1: "",
      addressLine2: "",
      addressLine3: "",
      city: "",
      country: "",
      zipCode: "",
      isActive: true,
    },
    studentElectronicAddress: {
      id: defaultGuid,
      studentId: defaultGuid,
      userType: defaultGuid,
      emailAddress: "",
      mobileNumber: "",
      isPrimary: true,
      isActive: true,
    },
  });

  const [modal, setModal] = useState(false);

  useEffect(() => {
    getStudent(id).then(async (response) => {
      let result = response.data;
      result.dob = result.dob == null ? "" : moment(result.dob);
      setFormData(result);
    });
    getUsers("cordinator").then((response) => {
      let temp = [];
      response.forEach((s) => {
        temp.push({ value: s?.userId, label: s?.fullName });
      });
      setCoordinators(temp);
    });

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

    getLookups("600" /*gender*/).then((response) => {
      let temp = [];
      response.forEach((s) => {
        temp.push({ value: s?.id, label: s?.typeCodeName, id: s?.id });
      });
      setGenderList(temp);
    });

    getLookups("300" /*Grade*/).then((response) => {
      let temp = [];
      response.forEach((s) => {
        temp.push({ value: s?.id, label: s?.typeCodeName });
      });
      setGradeList(temp);
    });
  }, []);

  const onInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const submitForm = () => {
    let submitData = {
      ...formData,
    };
    setUserInfo(submitData);
    setModal(false);
  };

  const onFormCancel = () => {
    setModalTab("1");
    setModal({ edit: false, add: false });  
  };

  const onFormSubmit = (submitData) => {
    const inputData = formData;
    inputData["dob"] = moment(inputData.dob).format("YYYY-MM-DD");
    setLoading(true);
    updateStudent(inputData).then((response) => {
      setModal(false);
      toast.success("Student profile updated successfully.", {
        position: "top-right",
        autoClose: true,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: false,
        closeButton: <CloseButton />,
      });
      getStudent(id).then(async (response) => {
        let result = response.data;
        result.dob = moment(result.dob);
        setFormData(result);
      });
    }).finally(() => setLoading(false));
  };

  const addAddressCallback = () => {
    setModal(false);
    getStudent(id).then(async (response) => {
      let result = response.data;
      result.dob = moment(result.dob);
      setFormData(result);
    });
  };

  const formClass = classNames({
    "form-validate": true,
    "is-alter": "alter",
  });

  const CloseButton = () => {
    return (
      <span className="btn-trigger toast-close-button" role="button">
        <Icon name="cross"></Icon>
      </span>
    );
  };

  const { errors, register, handleSubmit } = useForm();
  const { errors1, register1, handleAddressSubmit } = useForm();
  const { can } = usePermissions();
  const openEditModal = () => {
    if (can("Student List", "edit")) {
      setModal(true);
    }
  };
  return (
    <React.Fragment>
      <Head title="User List - Profile"></Head>
      <BlockHead size="lg">
        <BlockBetween>
          <BlockHeadContent>
            <BlockTitle tag="h4">Student Information</BlockTitle>
          </BlockHeadContent>
          <BlockHeadContent className="align-self-start d-lg-none">
            <Button
              className={`toggle btn btn-icon btn-trigger mt-n1 ${sm ? "active" : ""}`}
              onClick={() => updateSm(!sm)}
            >
              <Icon name="menu-alt-r"></Icon>
            </Button>
          </BlockHeadContent>
        </BlockBetween>
      </BlockHead>

      <Block>
        <div className="nk-data data-list">
          <div className="data-head">
            <h6 className="overline-title">Basics</h6>
          </div>
          <div className="data-item" onClick={openEditModal}>
            <div className="data-col">
              <span className="data-label">Student Name</span>
              <span className="data-value">{formData.firstName}</span>
            </div>
            {/* <div className="data-col data-col-end">
              <span className="data-more">
                <Icon name="forward-ios"></Icon>
              </span>
            </div> */}
          </div>
          <div className="data-item" onClick={openEditModal}>
            <div className="data-col">
              <span className="data-label">Parent Names</span>
              <span className="data-value">{formData.parentName}</span>
            </div>
            {/* <div className="data-col data-col-end">
              <span className="data-more">
                <Icon name="forward-ios"></Icon>
              </span>
            </div> */}
          </div>
          <div className="data-item">
            <div className="data-col">
              <span className="data-label">Email</span>
              <span className="data-value">{formData.emailAddress}</span>
            </div>
            {/* <div className="data-col data-col-end">
              <span className="data-more disable">
                <Icon name="lock-alt"></Icon>
              </span>
            </div> */}
          </div>
          <div className="data-item" onClick={openEditModal}>
            <div className="data-col">
              <span className="data-label">Phone Number</span>
              <span className="data-value text-soft">{formData.mobileNumber}</span>
            </div>
            {/* <div className="data-col data-col-end">
              <span className="data-more">
                <Icon name="forward-ios"></Icon>
              </span>
            </div> */}
          </div>
          <div className="data-item" onClick={openEditModal}>
            <div className="data-col">
              <span className="data-label">Date of Birth</span>

              <span className="data-value">
                {formData.dob == "" ? "" : new Date(formData.dob).toLocaleDateString()}
              </span>
            </div>
            {/* <div className="data-col data-col-end">
              <span className="data-more">
                <Icon name="icon ni ni-edit"></Icon>
              </span>
            </div> */}
          </div>
          {formData?.studentAddress?.addressLine1 != "" && formData?.studentAddress?.addressLine1 != null && (
            <div className="data-item" onClick={openEditModal}>
              <div className="data-col">
                <span className="data-label">Address</span>
                <span className="data-value">
                  {formData?.studentAddress?.addressLine1}, {formData?.studentAddress?.addressLine2},
                  <br />
                  {formData?.studentAddress?.addressLine3}, {formData?.studentAddress?.city} -{" "}
                  {formData?.studentAddress?.zipCode}
                  <br />
                  {formData?.studentAddress?.state}, {formData?.studentAddress?.country}
                </span>
              </div>
              {/* <div className="data-col data-col-end">
              <span className="data-more">
                <Icon name="forward-ios"></Icon>
              </span>
            </div> */}
            </div>
          )}
        </div>
      </Block>

      <Modal isOpen={modal} className="modal-dialog-centered" size="lg" toggle={() => {
    setModal(false);
    setModalTab("1");   
  }}>
        <ModalBody>
          <a
            href="#dropdownitem"
            onClick={(ev) => {
              ev.preventDefault();
              setModal(false);
            }}
            className="close"
          >
            <Icon name="cross-sm"></Icon>
          </a>
          <div className="p-2">
            <h5 className="title">Update Profile</h5>
            <ul className="nk-nav nav nav-tabs">
              <li className="nav-item">
                <a
                  className={`nav-link ${modalTab === "1" && "active"}`}
                  onClick={(ev) => {
                    ev.preventDefault();
                    setModalTab("1");
                  }}
                  href="#personal"
                >
                  Personal
                </a>
              </li>
              <li className="nav-item">
                <a
                  className={`nav-link ${modalTab === "2" && "active"}`}
                  onClick={(ev) => {
                    ev.preventDefault();
                    setModalTab("2");
                  }}
                  href="#address"
                >
                  Address
                </a>
              </li>
            </ul>
            <div className="tab-content">
              <div className={`tab-pane ${modalTab === "1" ? "active" : ""}`} id="personal">
                <Form className={`${formClass} row gy-4`} noValidate onSubmit={handleSubmit(onFormSubmit)}>
                  <Row className="col-md-12">
                    <Col md="4">
                      <FormGroup>
                        <label className="form-label" htmlFor="firstName">
                          Student Name
                        </label>
                        <div className="form-control-wrap">
                          <input
                            ref={register({ required: "This field is required" })}
                            type="text"
                            id="firstName"
                            defaultValue={formData.firstName}
                            value={formData.firstName}
                            placeholder="Enter name"
                            onChange={(e) => {
                              setFormData({ ...formData, firstName: e.target.value });
                            }}
                            name="firstName"
                            className="form-control"
                          />
                          {errors.firstName && <span className="invalid">{errors.firstName.message}</span>}
                        </div>
                      </FormGroup>
                    </Col>
                    <Col md="4">
                      <FormGroup>
                        <label className="form-label">Parent Name </label>
                        <div className="form-control-wrap">
                          <input
                            className="form-control"
                            type="text"
                            name="parentName"
                            id="parentName"
                            defaultValue={formData.parentName}
                            value={formData.parentName}
                            onChange={(e) => {
                              setFormData({
                                ...formData,
                                parentName: e.target.value,
                              });
                            }}
                            placeholder="Enter parent name"
                            ref={register({ required: "This field is required" })}
                          />
                          {errors.parentName && <span className="invalid">{errors.parentName.message}</span>}
                        </div>
                      </FormGroup>
                    </Col>
                    <Col sm="4">
                      <FormGroup>
                        <label className="form-label" htmlFor="dob">
                          Date of birth{" "}
                        </label>
                        <div className="form-control-wrap">
                          <DatePicker
                            defaultValue={formData.dob}
                            selected={formData.dob ? new Date(formData.dob) : null}
                            dateFormat="dd/MM/yyyy"
                            value={formData.dob}
                            showMonthDropdown
                            showYearDropdown
                            dropdownMode="select"
                            yearDropdownItemNumber={100}
                            scrollableYearDropdown
                            placeholderText="Select date of birth"
                            maxDate={new Date()}
                            onChange={(date) => {
                              setFormData({ ...formData, dob: date });
                            }}
                            onYearChange={(date) => setFormData({ ...formData, dob: date })}
                            className="form-control date-picker"
                          />
                          {errors.dob && <span className="invalid">{errors.dob.message}</span>}
                        </div>
                      </FormGroup>
                    </Col>
                  </Row>
                  <Row className="col-md-12">
                    <Col md="4">
                      <FormGroup>
                        <label className="form-label" htmlFor="emailAddress">
                          Email{" "}
                        </label>
                        <div className="form-control-wrap">
                          <input
                            className="form-control"
                            type="text"
                            name="emailAddress"
                            id="emailAddress"
                            value={formData?.emailAddress}
                            defaultValue={formData?.emailAddress}
                            placeholder="Enter email"
                            onChange={(e) => {
                              setFormData({ ...formData, emailAddress: e.target.value });
                            }}
                            ref={register({
                              required: "This field is required",
                              pattern: {
                                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                message: "invalid email address",
                              },
                            })}
                          />
                          {errors.emailAddress && <span className="invalid">{errors.emailAddress.message}</span>}
                        </div>
                      </FormGroup>
                    </Col>
                    <Col sm="4">
                      <FormGroup>
                        <label className="form-label" htmlFor="mobileNumber">
                          Phone Number
                        </label>
                        <div className="form-control-wrap">
                          <input
                            type="number"
                            id="mobileNumber"
                            maxLength={10}
                            name="mobileNumber"
                            value={formData.mobileNumber}
                            defaultValue={formData.mobileNumber}
                            onChange={(e) => {
                              setFormData({ ...formData, mobileNumber: e.target.value });
                            }}
                            className="form-control"
                            placeholder="Phone Number"
                            ref={register({ required: "This field is required" })}
                          />
                          {errors.mobileNumber && <span className="invalid">{errors.mobileNumber.message}</span>}
                        </div>
                      </FormGroup>
                    </Col>
                    <Col md="4">
                      <FormGroup>
                        <label className="form-label">Gender </label>
                        <div className="form-control-wrap">
                          <RSelect
                            dataSource={genderList || []}
                            value1={formData.gender}
                            onChangeHandler={(e) => {
                              setFormData({ ...formData, Gender: e.label });
                            }}
                            ref={register({ required: "This field is required" })}
                          />
                        </div>
                        {errors.Gender && <span className="invalid">{errors.Gender.message}</span>}
                      </FormGroup>
                    </Col>
                  </Row>
                  <Row className="col-md-12">
                    <Col md="6">
                      <FormGroup>
                        <label className="form-label">Grade </label>
                        <div className="form-control-wrap">
                          <RSelect
                            dataSource={gradeList || []}
                            value1={formData.gradeId}
                            onChangeHandler={(e) => {
                              setFormData({ ...formData, gradeId: e.value });
                            }}
                          />
                        </div>
                        {errors.gradeId && <span className="invalid">{errors.gradeId.message}</span>}
                      </FormGroup>
                    </Col>
                    <Col md="6">
                      <FormGroup>
                        <label className="form-label">Board </label>
                        <RSelect
                          dataSource={boardList || []}
                          value1={formData.boardId}
                          onChangeHandler={(e) => {
                            setFormData({ ...formData, boardId: e.value });
                          }}
                        />
                        {errors.boardId && <span className="invalid">{errors.boardId.message}</span>}
                      </FormGroup>
                    </Col>
                  </Row>
                  <Col size="12">
                    <ul className="align-center flex-wrap flex-sm-nowrap gx-4 gy-2">
                      {can("Student List", "edit") && (
                      <li>
                        <Button color="primary" size="md" type="submit" disabled={loading}>
                          {loading ? (
                            <>
                              <Spinner size="sm" className="mr-1" /> Updating...
                            </>
                          ) : (
                            "Update"
                          )}
                        </Button>
                      </li>
                      )}
                      <li>
                        <a
                          href="#cancel"
                          onClick={(ev) => {
                            ev.preventDefault();
                            onFormCancel();
                            setModal(false);
                          }}
                          className="link link-light"
                        >
                          Cancel
                        </a>
                      </li>
                    </ul>
                  </Col>
                </Form>
              </div>
              <div className={`tab-pane ${modalTab === "2" ? "active" : ""}`} id="address">
                <StudentAddress
                  studentAddress={formData?.studentAddress}
                  addAddressCallback={addAddressCallback}
                  onFormCancel={() => {
                    setModal(false);
                    setModalTab("1");
                  }}
                ></StudentAddress>
              </div>
            </div>
          </div>
        </ModalBody>
      </Modal>
      <ToastContainer />
    </React.Fragment>
  );
};
export default StudentProfilePage;
