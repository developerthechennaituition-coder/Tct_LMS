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
import { getUsers, createSale, getOwnership, getCorodinators } from "../../../apiservices/UserService";
import { getLookups } from "../../../apiservices/LookupsService";
import PhoneInput, { formatPhoneNumberIntl, isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";

const EnrolStudent = () => {
  const defaultGuid = "00000000-0000-0000-0000-000000000000";
  const [modal, setModal] = useState({
    edit: false,
    add: false,
  });
  const [loading, setLoading] = useState(false);
  const [editId, setEditedId] = useState();
  const [formData, setFormData] = useState({
    Id: defaultGuid,
    Ownership: defaultGuid,
    StudentId: defaultGuid,
    BoardId: defaultGuid,
    GradeId: defaultGuid,
    Student: {
      Id: defaultGuid,
      Code: "",
      FirstName: "",
      LastName: "",
      DOB: new Date(),
      EmailAddress: "",
      Gender: "",
      BoardId: defaultGuid,
      GradeId: defaultGuid,
      CreatedBy: localStorage.getItem("userId"),
      StudentAddress: null,
      StudentElectronicAddress: null,
      StudentAddresses: [
        {
          Id: defaultGuid,
          StudentId: defaultGuid,
          Street: "",
          City: "",
          State: "",
          ZipCode: "",
          Country: "",
          UserType: "",
          AddressLine1: "",
          AddressLine2: "",
          AddressLine3: "",
          IsPrimary: true,
          IsActive: true,
        },
      ],
      StudentElectronicAddresses: [
        {
          Id: defaultGuid,
          StudentId: defaultGuid,
          UserType: defaultGuid,
          EmailAddress: "",
          MobileNumber: "",
          IsPrimary: true,
          IsActive: true,
        },
      ],
      IsActive: true,
    },
    SalesDetailRequest: [
      {
        Id: defaultGuid,
        SalesId: defaultGuid,
        Coordinator: defaultGuid,
        SubjectId: defaultGuid,
        ParentPayment: 0,
        TutorId: null,
        TutorPayment: 0,
        IsActive: true,
        UserId: localStorage.getItem("userId"),
      },
    ],
    IsActive: true,
  });
  const [currentPage, setCurredefaultGuidntPage] = useState(1);
  const [itemPerPage] = useState(10);
  const [coordinatorsList, setCoordinatorsList] = useState([]);
  const [ownershipList, setOwnershipList] = useState([]);
  const [courseList, setCourseList] = useState([]);
  const [gradeList, setGradeList] = useState([]);
  const [boardList, setBoardList] = useState([]);
  const [genderList, setGenderList] = useState([]);
  // unselects the data on mount
  useEffect(() => {
    getOwnership("ownership").then((response) => {
      let temp = [];
      response.forEach((s) => {
        temp.push({ value: s?.id, label: s?.fullName });
      });
      setOwnershipList(temp);
    });

    getCorodinators("coordinator").then((response) => {
      let temp = [];
      response.forEach((s) => {
        temp.push({ value: s?.id, label: s?.fullName });
      });
      setCoordinatorsList(temp);
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

  // function to reset the form
  const resetForm = () => {
    setFormData({
      Id: defaultGuid,
      Ownership: defaultGuid,
      StudentId: defaultGuid,
      BoardId: defaultGuid,
      GradeId: defaultGuid,
      Student: {
        Id: defaultGuid,
        Code: "",
        FirstName: "",
        LastName: "",
        DOB: new Date(),
        EmailAddress: "",
        Gender: "",
        BoardId: defaultGuid,
        GradeId: defaultGuid,
        CreatedBy: localStorage.getItem("userId"),
        StudentAddress: null,
        StudentElectronicAddress: null,
        StudentAddresses: [
          {
            Id: defaultGuid,
            StudentId: defaultGuid,
            Street: "",
            City: "",
            State: "",
            ZipCode: "",
            Country: "",
            UserType: "",
            AddressLine1: "",
            AddressLine2: "",
            AddressLine3: "",
            IsPrimary: true,
            IsActive: true,
          },
        ],
        StudentElectronicAddresses: [
          {
            Id: defaultGuid,
            StudentId: defaultGuid,
            UserType: defaultGuid,
            EmailAddress: "",
            MobileNumber: "",
            IsPrimary: true,
            IsActive: true,
          },
        ],
        IsActive: true,
      },
      SalesDetailRequest: [
        {
          Id: defaultGuid,
          SalesId: defaultGuid,
          Coordinator: defaultGuid,
          SubjectId: defaultGuid,
          ParentPayment: 0,
          TutorId: null,
          TutorPayment: 0,
          IsActive: true,
        },
      ],
      IsActive: true,
    });
    window.location.reload(false);
  };

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
    var isValidPhone = isValidPhoneNumber(inputData.Student.MobileNumber);
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
    inputData.Student["MobileNumber"] = formatPhoneNumberIntl(inputData.Student.MobileNumber);
    inputData.Student["DOB"] = moment(inputData.Student.DOB).format("YYYY-MM-DD");
    inputData.Student["CreatedBy"] = localStorage.getItem("userId");
    inputData["CreatedBy"] = localStorage.getItem("userId");

    setLoading(true);
    createSale(inputData)
      .then((response) => {
        if (response.succeeded) {
          resetForm();
          toast.success(response.message, {
            position: "top-right",
            autoClose: true,
            hideProgressBar: true,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: false,
            closeButton: <CloseButton />,
          });
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
      })
      .finally(() => setLoading(false));
  };

  // submit function to update a new item
  const onEditSubmit = (submitData) => {
    const { name, email, phone } = submitData;
    let submittedData;
    let newitems = data;
    newitems.forEach((item) => {
      if (item.id === editId) {
        submittedData = {
          id: item.id,
          avatarBg: item.avatarBg,
          name: name,
          image: item.image,
          role: item.role,
          email: email,
          balance: formData.balance,
          phone: "+" + phone,
          emailStatus: item.emailStatus,
          kycStatus: item.kycStatus,
          lastLogin: item.lastLogin,
          status: formData.status,
          country: item.country,
        };
      }
    });
    let index = newitems.findIndex((item) => item.id === editId);
    newitems[index] = submittedData;
    setModal({ edit: false });
    resetForm();
  };

  // function that loads the want to editted data
  const onEditClick = (id) => {
    data.forEach((item) => {
      if (item.id === id) {
        setFormData({
          name: item.name,
          email: item.email,
          status: item.status,
          phone: item.phone,
          balance: item.balance,
          salesDetailRequest: [
            {
              subjectId: defaultGuid,
              parentPayment: 0,
            },
          ],
        });
        setModal({ edit: true }, { add: false });
        setEditedId(id);
      }
    });
  };

  // function to change to suspend property for an item
  const suspendUser = (id) => {
    let newData = data;
    let index = newData.findIndex((item) => item.id === id);
    newData[index].status = "Suspend";
    setData([...newData]);
  };

  // function to change the check property of an item
  const selectorCheck = (e) => {
    let newData;
    newData = data.map((item) => {
      item.checked = e.currentTarget.checked;
      return item;
    });
    setData([...newData]);
  };

  // function to delete the seletected item
  const selectorDeleteUser = () => {
    let newData;
    newData = data.filter((item) => item.checked !== true);
    setData([...newData]);
  };

  // function to change the complete property of an item
  const selectorSuspendUser = () => {
    let newData;
    newData = data.map((item) => {
      if (item.checked === true) item.status = "Suspend";
      return item;
    });
    setData([...newData]);
  };

  // Get current list, pagination
  const indexOfLastItem = currentPage * itemPerPage;
  const indexOfFirstItem = indexOfLastItem - itemPerPage;

  // Change Page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const onAddSubjects = () => {
    const temp = {
      Id: defaultGuid,
      SalesId: defaultGuid,
      Coordinator: defaultGuid,
      SubjectId: defaultGuid,
      ParentPayment: 0,
      TutorId: defaultGuid,
      TutorPayment: 0,
      CreatedBy: defaultGuid,
      CreatedDate: new Date(),
      IsActive: true,
    };
    const data = { ...formData };
    data.SalesDetailRequest.push(temp);
    setFormData(data);
  };

  const { errors, register, handleSubmit } = useForm();

  return (
    <React.Fragment>
      <Head title="Enroll a Student"></Head>
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle tag="h3" page>
                Enroll a student
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
                  <Col md="4">
                    <FormGroup>
                      <label className="form-label">Student Name</label>
                      <input
                        className="form-control"
                        type="text"
                        name="FirstName"
                        defaultValue={formData.Student.FirstName}
                        value={formData.Student.FirstName}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            Student: {
                              ...formData.Student,
                              FirstName: e.target.value,
                            },
                          });
                        }}
                        placeholder="Enter name"
                        ref={register({ required: "This field is required" })}
                      />
                      {errors.FirstName && <span className="invalid">{errors.FirstName.message}</span>}
                    </FormGroup>
                  </Col>
                  <Col md="4">
                    <FormGroup>
                      <label className="form-label">Parent Name </label>
                      <input
                        className="form-control"
                        type="text"
                        name="ParentName"
                        defaultValue={formData.Student.ParentName}
                        value={formData.Student.ParentName}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            Student: {
                              ...formData.Student,
                              ParentName: e.target.value,
                            },
                          });
                        }}
                        placeholder="Enter parent name"
                        ref={register({ required: "This field is required" })}
                      />
                      {errors.ParentName && <span className="invalid">{errors.ParentName.message}</span>}
                    </FormGroup>
                  </Col>
                  <Col sm="4">
                    <FormGroup>
                      <label className="form-label">Date of birth </label>
                      <div className="form-control-wrap">
                        <DatePicker
                          selected={formData.Student.DOB ? new Date(formData.Student.DOB) : null}
                          dateFormat="dd/MM/yyyy"
                          showMonthDropdown
                          showYearDropdown
                          dropdownMode="select"
                          yearDropdownItemNumber={100}
                          scrollableYearDropdown
                          placeholderText="Select date of birth"
                          maxDate={new Date()}
                          onChange={(date) => {
                            setFormData({
                              ...formData,
                              Student: { ...formData.Student, DOB: date },
                            });
                          }}
                          onYearChange={(date) => {
                            setFormData({
                              ...formData,
                              Student: { ...formData.Student, DOB: date },
                            });
                          }}
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
                      <label className="form-label" htmlFor="EmailAddress">
                        Email{" "}
                      </label>
                      <input
                        className="form-control"
                        type="text"
                        name="EmailAddress"
                        value={formData.Student.EmailAddress}
                        defaultValue={formData.Student.EmailAddress}
                        placeholder="Enter email"
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            Student: {
                              ...formData.Student,
                              EmailAddress: e.target.value,
                            },
                          });
                        }}
                        ref={register({
                          required: "This field is required",
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: "invalid email address",
                          },
                        })}
                      />
                      {errors.EmailAddress && <span className="invalid">{errors.EmailAddress.message}</span>}
                    </FormGroup>
                  </Col>
                  <Col sm="4">
                    <FormGroup>
                      <label className="form-label" htmlFor="MobileNumber">
                        Phone Number
                      </label>
                      <PhoneInput
                        defaultCountry="IN"
                        international
                        name="MobileNumber"
                        placeholder="Enter phone number"
                        value={formData.Student.MobileNumber}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            Student: {
                              ...formData.Student,
                              MobileNumber: e,
                            },
                          });
                        }}
                        error={
                          formData.Student.MobileNumber
                            ? isValidPhoneNumber(formData.Student.MobileNumber)
                              ? undefined
                              : "Invalid phone number"
                            : "Phone number required"
                        }
                      ></PhoneInput>
                      {errors.MobileNumber && <span className="invalid">{errors.MobileNumber.message}</span>}
                    </FormGroup>
                  </Col>
                  <Col md="4">
                    <FormGroup>
                      <label className="form-label">Gender </label>
                      <div className="form-control-wrap">
                        <RSelect
                          dataSource={genderList || []}
                          value1={formData.Student.Gender}
                          onChangeHandler={(e) => {
                            setFormData({
                              ...formData,
                              Student: {
                                ...formData.Student,
                                Gender: e.label,
                              },
                            });
                          }}
                          ref={register({ required: "This field is required" })}
                        />
                      </div>
                      {errors.Gender && <span className="invalid">{errors.Gender.message}</span>}
                    </FormGroup>
                  </Col>
                </Row>
                <Row className="col-md-12">
                  <Col md="4">
                    <FormGroup>
                      <label className="form-label">Grade </label>
                      <div className="form-control-wrap">
                        <RSelect
                          dataSource={gradeList || []}
                          value1={formData.Student.GradeId}
                          onChangeHandler={(e) => {
                            setFormData({
                              ...formData,
                              Student: {
                                ...formData.Student,
                                GradeId: e.value,
                              },
                            });
                          }}
                        />
                      </div>
                      {errors.GradeId && <span className="invalid">{errors.GradeId.message}</span>}
                    </FormGroup>
                  </Col>
                  <Col md="4">
                    <FormGroup>
                      <label className="form-label">Board </label>
                      <RSelect
                        dataSource={boardList || []}
                        value1={formData.Student.BoardId}
                        onChangeHandler={(e) => {
                          setFormData({
                            ...formData,
                            Student: {
                              ...formData.Student,
                              BoardId: e.value,
                            },
                          });
                        }}
                      />
                      {errors.BoardId && <span className="invalid">{errors.BoardId.message}</span>}
                    </FormGroup>
                  </Col>
                  <Col md="4">
                    <FormGroup>
                      <label className="form-label">Ownership </label>
                      <RSelect
                        dataSource={ownershipList || []}
                        value1={formData.Ownership}
                        onChangeHandler={(e) => {
                          setFormData({
                            ...formData,
                            Ownership: e.value,
                          });
                        }}
                      />
                      {errors.Ownership && <span className="invalid">{errors.Ownership.message}</span>}
                    </FormGroup>
                  </Col>
                </Row>
                <Row className=" row col-md-12">
                  <div className="col-md-8">
                    <label className="form-label">
                      Subject to Enroll
                      <Icon
                        onClick={() => {
                          onAddSubjects();
                        }}
                        name="plus-c"
                      ></Icon>
                    </label>
                  </div>
                  <div className="col-md-12">
                    <div className="row">
                      <div className="col-md-6">
                        <label className="form-label">Subject</label>
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Co-ordinator </label>
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Payment</label>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-12">
                    {formData.SalesDetailRequest.map((course, index) => (
                      <div className="row mb-1">
                        <div className="col-md-6">
                          <FormGroup>
                            <RSelect
                              dataSource={courseList || []}
                              value1={formData.SalesDetailRequest[index].SubjectId}
                              onChangeHandler={(e) => {
                                const temp = { ...formData };
                                temp.SalesDetailRequest[index]["SubjectId"] = e.value;
                                setFormData(temp);
                              }}
                              ref={register({ required: "This field is required" })}
                            />
                            {errors.SubjectId && <span className="invalid">{errors.SubjectId.message}</span>}
                          </FormGroup>
                        </div>
                        <div className="col-md-3">
                          <FormGroup>
                            <RSelect
                              dataSource={coordinatorsList || []}
                              value1={formData.SalesDetailRequest[index].Coordinator}
                              onChangeHandler={(e) => {
                                const temp = { ...formData };
                                temp.SalesDetailRequest[index]["Coordinator"] = e.value;
                                setFormData(temp);
                              }}
                              ref={register({ required: "This field is required" })}
                            />
                            {errors.Coordinator && <span className="invalid">{errors.Coordinator.message}</span>}
                          </FormGroup>
                        </div>
                        <div className="col-md-3">
                          <FormGroup>
                            <div className="form-control-wrap">
                              <div className="input-group">
                                <input
                                  type="number"
                                  maxLength={10}
                                  className="form-control"
                                  name={`${index}ParentPayment`}
                                  value={formData.SalesDetailRequest[index].ParentPayment}
                                  onChange={(e) => {
                                    const temp = { ...formData };
                                    temp.SalesDetailRequest[index]["ParentPayment"] = e.target.value;
                                    setFormData(temp);
                                  }}
                                  placeholder="Enter the amount."
                                />
                                <div className="input-group-append">
                                  <Button
                                    outline
                                    className="btn-dim"
                                    type="button"
                                    onClick={() => {
                                      const items = { ...formData };
                                      if (items.SalesDetailRequest.length == 1) {
                                      } else {
                                        const j = items.SalesDetailRequest.findIndex(
                                          (item) => item.SubjectId === course.SubjectId
                                        );
                                        items.SalesDetailRequest.splice([j], 1);
                                        setFormData(items);
                                      }
                                    }}
                                  >
                                    <Icon name="cross-c"></Icon>
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </FormGroup>
                        </div>
                      </div>
                    ))}
                  </div>
                </Row>
                <Col size="12">
                  <ul className="align-center flex-wrap flex-sm-nowrap gx-4 gy-2">
                    <li>
                      <Button color="primary" size="md" type="submit" disabled={loading}>
                        {loading ? (
                          <>
                            <Spinner size="sm" className="mr-1" /> Enrolling...
                          </>
                        ) : (
                          "Enroll Student"
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
export default EnrolStudent;
