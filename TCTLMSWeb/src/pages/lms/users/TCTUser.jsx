import React, { useContext, useEffect, useState } from "react";
import moment from "moment";
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
  Spinner,
} from "reactstrap";
import PhoneInput, {
  formatPhoneNumber,
  formatPhoneNumberIntl,
  isPossiblePhoneNumber,
  isValidPhoneNumber,
} from "react-phone-number-input";
import "react-phone-number-input/style.css";
import Select from "react-select";
import DatePicker from "react-datepicker";
import { ToastContainer } from "react-toastify";
import { toast } from "react-toastify";
import {
  Block,
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
import { createUser } from "../../../apiservices/UserService";
import { getLookups, getAllRoles } from "../../../apiservices/LookupsService";
import { useHistory } from "react-router-dom";

const TCTUser = () => {
  const history = useHistory();
  const defaultGuid = "00000000-0000-0000-0000-000000000000";
  const createdBy = localStorage.getItem("userId");
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({
    edit: false,
    add: false,
  });
  const [formData, setFormData] = useState({
    id: defaultGuid,
    firstName: "",
    lastName: "",
    userCode: "",
    email: "",
    phone: "",
    alternatePhone: "",
    dob: "",
    joiningDate: "",
    lastWorkingDate: "",
    gender: "",
    designationId: "",
    roleId: "",
    userType: defaultGuid,
    isSystemUser: true,
    isAdminUser: false,
    createdBy: createdBy,
    createdDate: new Date(),
    isActive: true,
    address: {
      createdBy: createdBy,
      createdDate: new Date(),
      isActive: true,
      id: defaultGuid,
      userId: defaultGuid,
      addressLine1: "",
      addressLine2: "",
      addressLine3: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
      isPrimary: true,
    },
  });

  const [currentPage, setCurredefaultGuidntPage] = useState(1);
  const [itemPerPage] = useState(10);
  const [genderList, setGenderList] = useState([]);
  const [designationList, setDesignationList] = useState([]);
  const [roleList, setRoleList] = useState([]);

  useEffect(() => {
    getLookups("600" /*gender*/).then((response) => {
      let temp = [];
      response.forEach((s) => {
        temp.push({ value: s?.id, label: s?.typeCodeName, id: s?.id });
      });
      setGenderList(temp);
    });

    getLookups("700" /*designation*/).then((response) => {
      let temp = [];
      response.forEach((s) => {
        if (s.typeCodeValue != 70003 /*tutor*/ && s.typeCodeValue != 70004 /*Student*/) {
          temp.push({ value: s?.id, label: s?.typeCodeName });
        }
      });
      setDesignationList(temp);
    });

    getAllRoles().then((response) => {
      let temp = [];
      response.forEach((s) => {
        if (s.id != 1 /*SuperAdmin*/ && s.id != 13 /*Tutor*/ && s.id != 14 /*Student*/) {
          temp.push({ value: s?.id, label: s?.roleName });
        }
      });
      setRoleList(temp);
    });
  }, []);

  // function to reset the form
  const resetForm = () => {};

  // function to close the form modal
  const onFormCancel = () => {
    setModal({ edit: false, add: false });
    resetForm();
  };

  const CloseButton = () => {
    return (
      <span className="btn-trigger toast-close-button" role="button">
        <Icon name="cross"></Icon>
      </span>
    );
  };

  // submit function to add a new item
  const onFormSubmit = (submitData) => {
    const inputData = formData;
    var isValidPhone = isValidPhoneNumber(inputData.phone);
    if (!isValidPhone) {
      toast.error("Please enter the valid phone number.", {
        position: "top-right",
        autoClose: true,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: false,
        closeButton: <CloseButton />,
      });
      return;
    }
    inputData["phone"] = formatPhoneNumberIntl(inputData.phone);
    inputData["dob"] = moment(inputData.dob).format("YYYY-MM-DD");
    inputData["joiningDate"] = moment(inputData.joiningDate);
    inputData["lastWorkingDate"] = moment(inputData.lastWorkingDate);
    setLoading(true);
    createUser(inputData).then((response) => {
      resetForm();
      if (response.succeeded) {
        toast.success("User Saved successfully.", {
          position: "top-right",
          autoClose: true,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: false,
          closeButton: <CloseButton />,
        });
        setTimeout(() => {
          history.push("/tct-user-list");
        }, 100);
      } else {
        toast.error(response.message, {
          position: "top-right",
          autoClose: true,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: false,
          closeButton: <CloseButton />,
        });
      }
    }).finally(() => setLoading(false));
  };

  // Get current list, pagination
  const indexOfLastItem = currentPage * itemPerPage;
  const { errors, register, handleSubmit } = useForm();
  return (
    <React.Fragment>
      <Head title="User"></Head>
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle tag="h3" page>
                User
              </BlockTitle>
              <BlockDes className="text-soft">{/* <p>You have total 2,595 users.</p> */}</BlockDes>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>
        <PreviewCard>
          <div>
            <div className="mt-4">
              <Form className="row gy-4" noValidate onSubmit={handleSubmit(onFormSubmit)}>
                <Row className="col-md-12">
                  <div className="col-md-8"></div>
                  <div className="col-md-4"></div>
                </Row>
                <Row className="col-md-12">
                  <Col md="4">
                    <FormGroup>
                      <label className="form-label" htmlFor="firstName">
                        First Name
                      </label>
                      <input
                        className="form-control"
                        type="text"
                        name="firstName"
                        defaultValue={formData.firstName}
                        value={formData.firstName}
                        onChange={(e) => {
                          setFormData({ ...formData, firstName: e.target.value });
                        }}
                        placeholder="Enter name"
                        ref={register({ required: "This field is required" })}
                      />
                      {errors.firstName && <span className="invalid">{errors.firstName.message}</span>}
                    </FormGroup>
                  </Col>
                  <Col md="4">
                    <FormGroup>
                      <label className="form-label">Last Name </label>
                      <input
                        className="form-control"
                        type="text"
                        name="lastName"
                        defaultValue={formData.lastName}
                        value={formData.lastName}
                        onChange={(e) => {
                          setFormData({ ...formData, lastName: e.target.value });
                        }}
                        placeholder="Enter last name"
                        ref={register({ required: "This field is required" })}
                      />
                      {errors.lastName && <span className="invalid">{errors.lastName.message}</span>}
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
                            setFormData({ ...formData, dob: date ? date : null });
                          }}
                          onYearChange={(date) => setFormData({ ...formData, dob: date })}
                          className="form-control date-picker"
                        />
                      </div>
                      {errors.dob && <span className="invalid">{errors.dob.message}</span>}
                    </FormGroup>
                  </Col>
                </Row>
                <Row className="col-md-12">
                  <Col md="4">
                    <FormGroup>
                      <label className="form-label" htmlFor="email">
                        Email{" "}
                      </label>
                      <input
                        className="form-control"
                        type="text"
                        name="email"
                        value={formData.email}
                        defaultValue={formData.email}
                        placeholder="Enter email"
                        onChange={(e) => {
                          setFormData({ ...formData, email: e.target.value });
                        }}
                        ref={register({
                          required: "This field is required",
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: "invalid email address",
                          },
                        })}
                      />
                      {errors.email && <span className="invalid">{errors.email.message}</span>}
                    </FormGroup>
                  </Col>
                  <Col sm="4">
                    <FormGroup>
                      <label className="form-label" htmlFor="phone">
                        Phone Number
                      </label>
                      <PhoneInput
                        defaultCountry="IN"
                        international
                        id="phone"
                        name="phone"
                        placeholder="Enter phone number"
                        value={formData.phone}
                        onChange={(e) => {
                          setFormData({ ...formData, phone: e });
                        }}
                      ></PhoneInput>
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
                            setFormData({ ...formData, gender: e.label });
                          }}
                          ref={register({ required: "This field is required" })}
                        />
                      </div>
                      {errors.gender && <span className="invalid">{errors.gender.message}</span>}
                    </FormGroup>
                  </Col>
                </Row>
                <Row className="col-md-12">
                  <Col md="6">
                    <FormGroup>
                      <label className="form-label">Joining Date </label>
                      <div className="form-control-wrap">
                        <DatePicker
                          defaultValue={formData.joiningDate}
                          selected={formData.joiningDate ? new Date(formData.joiningDate) : null}
                          dateFormat="dd/MM/yyyy"
                          value={formData.joiningDate}
                          showMonthDropdown
                          showYearDropdown
                          dropdownMode="select"
                          yearDropdownItemNumber={100}
                          scrollableYearDropdown
                          placeholderText="Select joining date"
                          maxDate={new Date(new Date().setFullYear(new Date().getFullYear() - 20))}
                          onChange={(date) => {
                            setFormData({ ...formData, joiningDate: date ? date : null });
                          }}
                          className="form-control date-picker"
                        />
                      </div>
                      {errors.joiningDate && <span className="invalid">{errors.joiningDate.message}</span>}
                    </FormGroup>
                  </Col>
                  <Col md="6">
                    <FormGroup>
                      <label className="form-label">Last Working Day</label>
                      <div className="form-control-wrap">
                        <DatePicker
                          defaultValue={formData.lastWorkingDate}
                          selected={formData.lastWorkingDate ? new Date(formData.lastWorkingDate) : null}
                          dateFormat="dd/MM/yyyy"
                          value={formData.lastWorkingDate}
                          showMonthDropdown
                          showYearDropdown
                          dropdownMode="select"
                          yearDropdownItemNumber={100}
                          scrollableYearDropdown
                          placeholderText="Select last working date"
                          //maxDate={new Date(new Date().setFullYear(new Date().getFullYear() - 20))}
                          onChange={(date) => {
                            setFormData({ ...formData, lastWorkingDate: date ? date : null });
                          }}
                          className="form-control date-picker"
                        />
                      </div>
                      {errors.lastWorkingDate && <span className="invalid">{errors.roleId.lastWorkingDate}</span>}
                    </FormGroup>
                  </Col>
                </Row>
                <Row className="col-md-12">
                  <Col md="6">
                    <FormGroup>
                      <label className="form-label">Designation </label>
                      <div className="form-control-wrap">
                        <RSelect
                          dataSource={designationList || []}
                          value1={formData.designationId}
                          onChangeHandler={(e) => {
                            setFormData({ ...formData, designationId: e.value });
                          }}
                          ref={register({ required: "This field is required" })}
                        />
                      </div>
                      {errors.designationId && <span className="invalid">{errors.designationId.message}</span>}
                    </FormGroup>
                  </Col>
                  <Col md="6">
                    <FormGroup>
                      <label className="form-label">Role </label>
                      <div className="form-control-wrap">
                        <RSelect
                          dataSource={roleList || []}
                          value1={formData.roleId.toString()}
                          onChangeHandler={(e) => {
                            setFormData({ ...formData, roleId: e.value });
                          }}
                          ref={register({ required: "This field is required" })}
                        />
                      </div>
                      {errors.roleId && <span className="invalid">{errors.roleId.message}</span>}
                    </FormGroup>
                  </Col>
                </Row>
                <Row className="col-md-12">
                  <Col md="6">
                    <FormGroup>
                      <label className="form-label" htmlFor="addressLine1">
                        Address Line1
                      </label>
                      <div className="form-control-wrap">
                        <input
                          className="form-control"
                          type="text"
                          id="addressLine1"
                          name="addressLine1"
                          defaultValue={formData?.address?.addressLine1}
                          value={formData?.address?.addressLine1}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              address: {
                                ...formData.address,
                                addressLine1: e.target.value,
                              },
                            });
                          }}
                          placeholder="Address Line1"
                          ref={register({ required: "This field is required" })}
                        />
                        {errors.addressLine1 && <span className="invalid">{errors.addressLine1.message}</span>}
                      </div>
                    </FormGroup>
                  </Col>
                  <Col md="6">
                    <FormGroup>
                      <label className="form-label" htmlFor="addressLine2">
                        Address Line2{" "}
                      </label>
                      <div className="form-control-wrap">
                        <input
                          className="form-control"
                          type="text"
                          id="addressLine2"
                          name="addressLine2"
                          defaultValue={Designation?.address?.addressLine2}
                          value={formData?.address?.addressLine2}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              address: {
                                ...formData.address,
                                addressLine2: e.target.value,
                              },
                            });
                          }}
                          placeholder="Address Line2"
                          ref={register({ required: "This field is required" })}
                        />
                        {errors.addressLine2 && <span className="invalid">{errors.addressLine2.message}</span>}
                      </div>
                    </FormGroup>
                  </Col>
                </Row>
                <Row className="col-md-12">
                  <Col sm="6">
                    <FormGroup>
                      <label className="form-label" htmlFor="addressLine3">
                        Address Line3{" "}
                      </label>
                      <div className="form-control-wrap">
                        <input
                          className="form-control"
                          type="text"
                          name="addressLine3"
                          id="addressLine3"
                          defaultValue={formData?.address?.addressLine3}
                          value={formData?.address?.addressLine3}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              address: {
                                ...formData.address,
                                addressLine3: e.target.value,
                              },
                            });
                          }}
                          placeholder="Address Line3"
                          ref={register({ required: "This field is required" })}
                        />
                        {errors.addressLine3 && <span className="invalid">{errors.addressLine3.message}</span>}
                      </div>
                    </FormGroup>
                  </Col>
                  <Col md="6">
                    <FormGroup>
                      <label className="form-label" htmlFor="city">
                        City
                      </label>
                      <div className="form-control-wrap">
                        <input
                          className="form-control"
                          type="text"
                          name="city"
                          id="city"
                          defaultValue={formData?.address?.city}
                          value={formData?.address?.city}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              address: {
                                ...formData.address,
                                city: e.target.value,
                              },
                            });
                          }}
                          placeholder="Enter name"
                          ref={register({ required: "This field is required" })}
                        />
                        {errors.city && <span className="invalid">{errors.city.message}</span>}
                      </div>
                    </FormGroup>
                  </Col>
                </Row>
                <Row className="col-md-12">
                  <Col sm="4">
                    <FormGroup>
                      <label className="form-label" htmlFor="zipCode">
                        ZipCode
                      </label>
                      <div className="form-control-wrap">
                        <input
                          className="form-control"
                          type="text"
                          name="zipCode"
                          id="zipCode"
                          defaultValue={formData.address?.zipCode}
                          value={formData.address?.zipCode}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              address: {
                                ...formData.address,
                                zipCode: e.target.value,
                              },
                            });
                          }}
                          placeholder="Enter name"
                          ref={register({ required: "This field is required" })}
                        />
                        {errors.zipCode && <span className="invalid">{errors.zipCode.message}</span>}
                      </div>
                    </FormGroup>
                  </Col>
                  <Col sm="4">
                    <FormGroup>
                      <label className="form-label" htmlFor="state">
                        State
                      </label>
                      <div className="form-control-wrap">
                        <input
                          className="form-control"
                          type="text"
                          name="state"
                          id="state"
                          defaultValue={formData?.address?.state}
                          value={formData?.address?.state}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              address: {
                                ...formData.address,
                                state: e.target.value,
                              },
                            });
                          }}
                          placeholder="Enter name"
                          ref={register({ required: "This field is required" })}
                        />
                        {errors.state && <span className="invalid">{errors.state.message}</span>}
                      </div>
                    </FormGroup>
                  </Col>
                  <Col sm="4">
                    <FormGroup>
                      <label className="form-label" htmlFor="country">
                        Country
                      </label>
                      <div className="form-control-wrap">
                        <input
                          className="form-control"
                          type="text"
                          name="country"
                          id="country"
                          defaultValue={formData?.address?.country}
                          value={formData?.address?.country}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              address: {
                                ...formData?.address,
                                country: e.target.value,
                              },
                            });
                          }}
                          placeholder="Enter name"
                          ref={register({ required: "This field is required" })}
                        />
                        {errors.country && <span className="invalid">{errors.country.message}</span>}
                      </div>
                    </FormGroup>
                  </Col>
                </Row>
                <Col size="12">
                  <ul className="align-center flex-wrap flex-sm-nowrap gx-4 gy-2">
                    <li>
                      <Button color="primary" size="md" type="submit" disabled={loading}>
                        {loading ? (
                          <>
                            <Spinner size="sm" className="mr-1" /> Adding...
                          </>
                        ) : (
                          "Add"
                        )}
                      </Button>
                    </li>
                    <li>
                      <a
                        href="#cancel"
                        onClick={(ev) => {
                          ev.preventDefault();
                          onFormCancel();
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
          </div>
        </PreviewCard>
        <ToastContainer />
      </Content>
    </React.Fragment>
  );
};
export default TCTUser;
