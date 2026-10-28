import React, { useEffect, useState } from "react";
import moment from "moment";
import DatePicker from "react-datepicker";
import { axios } from '../../../library/axios';
import Dropzone from "react-dropzone";
import {
  FormGroup,
  Form,
  Row,
  Card,
  CardBody,
  Spinner
} from "reactstrap";
import { ToastContainer } from "react-toastify";
import { toast } from "react-toastify";
import {
  Block,
  BlockBetween,
  BlockDes,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Icon,
  Col,
  Button,
  RSelect,
} from "../../../components/Component";
import Content from "../../../layout/content/Content";
import Head from "../../../layout/head/Head";
import { useForm } from "react-hook-form";
import { getOwnership, getCorodinators } from "../../../apiservices/UserService";
import { getLookups } from "../../../apiservices/LookupsService";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";

const EnrollStudent = () => {
  const defaultGuid = "00000000-0000-0000-0000-000000000000";
  const createdDate = new Date();
  const [loading, setLoading] = useState(false);
  const [files4, setFiles4] = useState([]);
  const [filename, setFilename] = useState("");
  const [coordinatorsList, setCoordinatorsList] = useState([]);
  const [ownershipList, setOwnershipList] = useState([]);
  const [courseList, setCourseList] = useState([]);
  const [gradeList, setGradeList] = useState([]);
  const [boardList, setBoardList] = useState([]);
  const [genderList, setGenderList] = useState([]);
  const [formData, setFormData] = useState({
    Id: defaultGuid,
    StudentId: defaultGuid,
    BoardId: "",
    GradeId: "",
    Student: {
      Id: defaultGuid,
      Code: "",
      FirstName: "",
      LastName: "",
      DOB: new Date(),
      EmailAddress: "",
      Gender: "",
      BoardId: "",
      GradeId: "",
      IsActive: true,
      CreatedBy: localStorage.getItem("userId"),
      CreatedDate: createdDate,
      ParentsInterestedLevel: "",
      StudentAddress: null,
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
          CreatedBy: localStorage.getItem("userId"),
          CreatedDate: createdDate,
        },
      ],
    },
    SalesDetailRequest: [
      {
        Id: defaultGuid,
        SalesId: defaultGuid,
        Coordinator: "",
        SubjectId: "",
        ParentPayment: 0,
        NoOfSessionPerWeek: 0,
        IsActive: true,
        CreatedBy: localStorage.getItem("userId"),
      },
    ],
  });

  // Fetch data on component mount
  useEffect(() => {
    // Fetch ownership data
    getOwnership("ownership").then((response) => {
      let temp = [];
      response.forEach((s) => {
        temp.push({ value: s?.id, label: s?.fullName });
      });
      setOwnershipList(temp);
    });

    // Fetch coordinators data
    getCorodinators("coordinator").then((response) => {
      let temp = [];
      response.forEach((s) => {
        temp.push({ value: s?.id, label: s?.fullName });
      });
      setCoordinatorsList(temp);
    });

    // Fetch course data
    getLookups("500").then((response) => {
      let temp = [];
      response.forEach((s) => {
        temp.push({ value: s?.id, label: s?.typeCodeName });
      });
      setCourseList(temp);
    });

    // Fetch board data
    getLookups("400").then((response) => {
      let temp = [];
      response.forEach((s) => {
        temp.push({ value: s?.id, label: s?.typeCodeName, id: s?.id });
      });
      setBoardList(temp);
    });

    // Fetch gender data
    getLookups("600").then((response) => {
      let temp = [];
      response.forEach((s) => {
        temp.push({ value: s?.id, label: s?.typeCodeName, id: s?.id });
      });
      setGenderList(temp);
    });

    // Fetch grade data
    getLookups("300").then((response) => {
      let temp = [];
      response.forEach((s) => {
        temp.push({ value: s?.id, label: s?.typeCodeName, id: s?.id });
      });
      setGradeList(temp);
    });
  }, []);

  const CloseButton = () => {
    return (
      <span className="btn-trigger toast-close-button" role="button">
        <Icon name="cross"></Icon>
      </span>
    );
  };

  const onSubmit = async (e) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }

    let fieldsToTrigger = [
      "FirstName",
      "MobileNumber",
      "Gender",
      "GradeId",
      "BoardId",
      "ParentsInterestedLevel"
    ];

    formData.SalesDetailRequest.forEach((_, index) => {
      fieldsToTrigger.push(`SalesDetailRequest.${index}.Coordinator`);
      fieldsToTrigger.push(`SalesDetailRequest.${index}.SubjectId`);
    });

    await trigger(fieldsToTrigger);

    const isSalesDetailValid = formData.SalesDetailRequest.every(item =>
      item.SubjectId && item.SubjectId !== defaultGuid &&
      item.Coordinator && item.Coordinator !== defaultGuid
    );

    const isSessionCountValid = formData.SalesDetailRequest.every(
      item => Number(item.NoOfSessionPerWeek) >= 2
    );

    if (!isSessionCountValid) {
      toast.error("No of Sessions per week must be at least 2 for every course.", {
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

    if (
      !formData.Student.FirstName ||
      !formData.Student.DOB ||
      !formData.Student.MobileNumber ||
      !isValidPhoneNumber(formData.Student.MobileNumber) ||
      !formData.Student.Gender ||
      !formData.Student.GradeId ||
      formData.Student.GradeId === defaultGuid ||
      !formData.Student.BoardId ||
      formData.Student.BoardId === defaultGuid ||
      !formData.ParentsInterestedLevel ||
      !isSalesDetailValid
    ) {
      toast.error("Please complete all required fields", {
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

    const inputData = new FormData();

    inputData.append("Id", defaultGuid);
    inputData.append("BoardId", formData.Student.BoardId);
    inputData.append("GradeId", formData.Student.GradeId);
    inputData.append("ParentsInterestedLevel", formData.ParentsInterestedLevel);
    inputData.append("CreatedBy", localStorage.getItem("userId") || "");
    inputData.append("CreatedDate", new Date().toISOString());
    inputData.append("IsActive", "true");
    inputData.append("StudentId", defaultGuid);

    // Student properties
    inputData.append("Student.Id", defaultGuid);
    inputData.append("Student.Code", "");
    inputData.append("Student.FirstName", formData.Student.FirstName);
    inputData.append("Student.LastName", "");
    inputData.append("Student.DOB", moment(formData.Student.DOB).format("YYYY-MM-DD"));
    inputData.append("Student.EmailAddress", "");
    inputData.append("Student.Gender", formData.Student.Gender);
    inputData.append("Student.MobileNumber", formData.Student.MobileNumber);
    inputData.append("Student.BoardId", formData.Student.BoardId);
    inputData.append("Student.GradeId", formData.Student.GradeId);
    inputData.append("Student.IsActive", "true");
    inputData.append("Student.CreatedBy", localStorage.getItem("userId") || "");
    inputData.append("Student.CreatedDate", new Date().toISOString());
    inputData.append("Student.ParentsInterestedLevel", formData.ParentsInterestedLevel);

    formData.SalesDetailRequest.forEach((detail, index) => {
      inputData.append(`SalesDetailRequest[${index}].Id`, defaultGuid);
      inputData.append(`SalesDetailRequest[${index}].SalesId`, defaultGuid);
      inputData.append(`SalesDetailRequest[${index}].Coordinator`, detail.Coordinator);
      inputData.append(`SalesDetailRequest[${index}].SubjectId`, detail.SubjectId);
      inputData.append(`SalesDetailRequest[${index}].ParentPayment`, detail.ParentPayment);
      inputData.append(`SalesDetailRequest[${index}].NoOfSessionPerWeek`, detail.NoOfSessionPerWeek);
      inputData.append(`SalesDetailRequest[${index}].IsActive`, "true");
      inputData.append(`SalesDetailRequest[${index}].CreatedBy`, localStorage.getItem("userId") || "");
      inputData.append(`SalesDetailRequest[${index}].CreatedDate`, new Date().toISOString());
    });

    if (files4 && files4.length > 0) {
      inputData.append("Files", files4[0]);
    }

    setLoading(true);
    axios.post('/sales/createsales', inputData)
      .then(response => {
        if (response.succeeded) {
          clearForm();
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
      .catch(error => {
        toast.error("Failed to submit enrollment. Please try again.");
      })
      .finally(() => setLoading(false));
  };

  const { errors, register, handleSubmit, setValue, trigger, clearErrors,reset } = useForm();

  const handleDropChange = (acceptedFiles, setFiles) => {
    if (!acceptedFiles.length) return;
    setFiles(
      acceptedFiles.map((file) =>
        Object.assign(file, {
          preview: URL.createObjectURL(file),
        })
      )
    );
    setFilename(acceptedFiles[0].name);
  };

  useEffect(() => {
    register("FirstName", { required: "Student name is required" });
    register("DOB", { required: "Date of birth is required" });
    register("MobileNumber", { required: "Phone number is required" });
    register("Gender", { required: "Gender is required" });
    register("GradeId", { required: "Grade is required" });
    register("BoardId", { required: "Board is required" });
    register("ParentsInterestedLevel", { required: "Parent's level is required" });

    formData.SalesDetailRequest.forEach((_, index) => {
      register(`SalesDetailRequest.${index}.SubjectId`, { required: "Subject is required" });
      register(`SalesDetailRequest.${index}.Coordinator`, { required: "Coordinator is required" });
    });
  }, [register, formData.SalesDetailRequest.length]);

  useEffect(() => {
    setValue("FirstName", formData.Student.FirstName);
    setValue("DOB", formData.Student.DOB);
    setValue("MobileNumber", formData.Student.MobileNumber);
    setValue("Gender", formData.Student.Gender);
    setValue("GradeId", formData.Student.GradeId);
    setValue("BoardId", formData.Student.BoardId);
    setValue("ParentsInterestedLevel", formData.ParentsInterestedLevel);

    formData.SalesDetailRequest.forEach((item, index) => {
      setValue(`SalesDetailRequest.${index}.SubjectId`, item.SubjectId);
      setValue(`SalesDetailRequest.${index}.Coordinator`, item.Coordinator);
    });

    const triggerValidation = async () => {
      if (formData.Student.FirstName) await trigger("FirstName");
      if (formData.Student.DOB) await trigger("DOB");
      if (formData.Student.MobileNumber) await trigger("MobileNumber");
      if (formData.Student.Gender) await trigger("Gender");
      if (formData.Student.GradeId) await trigger("GradeId");
      if (formData.Student.BoardId) await trigger("BoardId");
      if (formData.ParentsInterestedLevel) await trigger("ParentsInterestedLevel");

      formData.SalesDetailRequest.forEach((item, index) => {
        if (item.SubjectId) trigger(`SalesDetailRequest.${index}.SubjectId`);
        if (item.Coordinator) trigger(`SalesDetailRequest.${index}.Coordinator`);
      });
    };

    triggerValidation();
  }, [formData, setValue, trigger]);

  const onAddSubjects = () => {
    const temp = {
      Id: defaultGuid,
      SalesId: defaultGuid,
      Coordinator: "",
      SubjectId: "",
      ParentPayment: 0,
      NoOfSessionPerWeek: 0,
      IsActive: true,
      CreatedBy: localStorage.getItem("userId"),
    };
    const data = { ...formData };
    data.SalesDetailRequest.push(temp);
    setFormData(data);
  };

  const clearForm = () =>{
    reset({
    Id: defaultGuid,
    StudentId: defaultGuid,
    BoardId: "",
    GradeId: "",
    Student: {
      Id: defaultGuid,
      Code: "",
      FirstName: "",
      LastName: "",
      DOB: new Date(),
      EmailAddress: "",
      Gender: "",
      BoardId: "",
      GradeId: "",
      IsActive: true,
      CreatedBy: localStorage.getItem("userId"),
      CreatedDate: createdDate,
      ParentsInterestedLevel: "",
      StudentAddress: null,
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
          CreatedBy: localStorage.getItem("userId"),
          CreatedDate: createdDate,
        },
      ],
    },
    SalesDetailRequest: [
      {
        Id: defaultGuid,
        SalesId: defaultGuid,
        Coordinator: "",
        SubjectId: "",
        ParentPayment: 0,
        NoOfSessionPerWeek: 0,
        IsActive: true,
        CreatedBy: localStorage.getItem("userId"),
      },
    ],
  });

  setFormData({
    Id: defaultGuid,
    StudentId: defaultGuid,
    BoardId: "",
    GradeId: "",
    Student: {
      Id: defaultGuid,
      Code: "",
      FirstName: "",
      LastName: "",
      DOB: new Date(),
      EmailAddress: "",
      Gender: "",
      BoardId: "",
      GradeId: "",
      IsActive: true,
      CreatedBy: localStorage.getItem("userId"),
      CreatedDate: createdDate,
      ParentsInterestedLevel: "",
      StudentAddress: null,
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
          CreatedBy: localStorage.getItem("userId"),
          CreatedDate: createdDate,
        },
      ],
    },
    SalesDetailRequest: [
      {
        Id: defaultGuid,
        SalesId: defaultGuid,
        Coordinator: "",
        SubjectId: "",
        ParentPayment: 0,
        NoOfSessionPerWeek: 0,
        IsActive: true,
        CreatedBy: localStorage.getItem("userId"),
      },
    ],
  })
   setSelectedFiles([]);
    setFiles4([]);
    setFilename('');
  };

  return (
    <React.Fragment>
      <Head title="Enroll a Student"></Head>
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle tag="h3" page>
                Enroll a Student
              </BlockTitle>
              <BlockDes className="text-soft">
                Complete the form to enroll a new student
              </BlockDes>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        <Card className="card-bordered">
          <CardBody className="card-inner">
            <div className="mt-4">
              <Form noValidate onSubmit={handleSubmit(onSubmit)}>
                <Row className="g-3">
                  <Col md="3">
                    <FormGroup>
                      <label className="form-label">Student Name <span className="text-danger">*</span></label>
                      <input
                        className="form-control"
                        type="text"
                        name="FirstName"
                        value={formData.Student.FirstName || ""}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            Student: {
                              ...formData.Student,
                              FirstName: e.target.value,
                            },
                          });
                          clearErrors("FirstName");
                        }}
                        placeholder="Enter student name"
                      />
                      {errors.FirstName && <span className="invalid" style={{ color: "#e85347", fontSize: "11px", fontStyle: "italic" }}>{errors.FirstName.message}</span>}
                    </FormGroup>
                  </Col>
                  <Col md="3">
                    <FormGroup>
                      <label className="form-label">
                        Date of Birth <span className="text-danger">*</span>
                      </label>
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
                            clearErrors("DOB");
                          }}
                          onYearChange={(date) => {
                            setFormData({
                              ...formData,
                              Student: { ...formData.Student, DOB: date },
                            });
                            clearErrors("DOB");
                          }}
                          className="form-control date-picker"
                        />
                      </div>
                      {errors.DOB && (
                        <span className="invalid" style={{ color: "#e85347", fontSize: "11px", fontStyle: "italic" }}>
                          {errors.DOB.message}
                        </span>
                      )}
                    </FormGroup>
                  </Col>
                  <Col md="3">
                    <FormGroup>
                      <label className="form-label">Phone Number <span className="text-danger">*</span></label>
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
                          if (e) {
                            clearErrors("MobileNumber");
                          }
                        }}
                        error={
                          formData.Student.MobileNumber
                            ? isValidPhoneNumber(formData.Student.MobileNumber)
                              ? undefined
                              : "Invalid phone number"
                            : "Phone number required"
                        }
                      />
                      {errors.MobileNumber && <span className="invalid" style={{ color: "#e85347", fontSize: "11px", fontStyle: "italic" }}>{errors.MobileNumber.message}</span>}
                    </FormGroup>
                  </Col>
                  <Col md="3">
                    <FormGroup>
                      <label className="form-label">Gender <span className="text-danger">*</span></label>
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
                            clearErrors("Gender");
                          }}
                          placeholder="Select gender"
                        />
                      </div>
                      {errors.Gender && <span className="invalid" style={{ color: "#e85347", fontSize: "11px", fontStyle: "italic" }}>{errors.Gender.message}</span>}
                    </FormGroup>
                  </Col>
                  <Col md="3">
                    <FormGroup>
                      <label className="form-label">Grade <span className="text-danger">*</span></label>
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
                            clearErrors("GradeId");
                          }}
                          placeholder="Select grade"
                        />
                      </div>
                      {errors.GradeId && <span className="invalid" style={{ color: "#e85347", fontSize: "11px", fontStyle: "italic" }}>{errors.GradeId.message}</span>}
                    </FormGroup>
                  </Col>
                  <Col md="3">
                    <FormGroup>
                      <label className="form-label">Board <span className="text-danger">*</span></label>
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
                          clearErrors("BoardId");
                        }}
                        placeholder="Select board"
                      />
                      {errors.BoardId && <span className="invalid" style={{ color: "#e85347", fontSize: "11px", fontStyle: "italic" }}>{errors.BoardId.message}</span>}
                    </FormGroup>
                  </Col>
                  <Col md="5">
                    <FormGroup>
                      <label className="form-label">
                        Parents Interested Level towards TCT based upon your conversation <span className="text-danger">*</span>
                      </label>
                      <div className="form-control-wrap">
                        <div className="d-flex flex-row flex-wrap gap-3">
                          {["High", "Medium", "Low", "Not Intreseted. They are Just trying", "Other"].map(
                            (option, index) => (
                              <div className="form-check" key={index} style={{ marginRight: "1rem" }}>
                                <input
                                  type="radio"
                                  className="form-check-input"
                                  id={`parents-interest-${index}`}
                                  name="ParentsInterestedLevel"
                                  value={option}
                                  checked={formData.ParentsInterestedLevel === option}
                                  onChange={(e) => {
                                    setFormData({ ...formData, ParentsInterestedLevel: e.target.value });
                                    clearErrors("ParentsInterestedLevel");
                                  }}
                                />
                                <label className="form-check-label" htmlFor={`parents-interest-${index}`}>
                                  {option}
                                </label>
                              </div>
                            )
                          )}
                        </div>
                        {errors.ParentsInterestedLevel && <span className="invalid" style={{ color: "#e85347", fontSize: "11px", fontStyle: "italic" }}>{errors.ParentsInterestedLevel.message}</span>}
                      </div>
                    </FormGroup>
                  </Col>
                  <Col md="4">
                    <label className="form-label">
                      Instructions (Audio file) <span className="text-danger">*</span>
                    </label>
                    <FormGroup>
                      <Dropzone
                        accept="audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,.mp3,.m4a"
                        multiple={false}
                        onDrop={(acceptedFiles) => handleDropChange(acceptedFiles, setFiles4)}
                        onDropRejected={() => toast.error("Only MP3 and M4A audio files are allowed.")}
                      >
                        {({ getRootProps, getInputProps }) => (
                          <section>
                            <div {...getRootProps()} className="dropzone upload-zone dz-clickable">
                              <input {...getInputProps()} />
                              <div className="dz-message">
                                <span className="dz-message-text">
                                  Drag and drop an MP3/M4A file or <span className="lg" style={{ color: "blue" }}><Icon name="upload"></Icon></span>
                                </span>
                              </div>
                            </div>
                          </section>
                        )}
                      </Dropzone>
                      {filename}
                    </FormGroup>
                  </Col>
                </Row>
                <Row className="row col-md-12">
                  <div className="col-md-8">
                    <label className="form-label">
                      Subject to Enroll <a
                        className="btn btn-primary"
                        data-bs-toggle="modal"
                        href="#modalCreate"
                        onClick={() => {
                          onAddSubjects();
                        }}
                      >
                        <em className="icon ni ni-plus"></em>
                        <span>Add Subjects</span>
                      </a>

                    </label>
                  </div>
                  <div className="col-md-12">
                    <div className="row">
                      <div className="col-md-3">
                        <label className="form-label">Subject <span className="text-danger">*</span></label>
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Co-ordinator <span className="text-danger">*</span></label>
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">No of Session per week <span className="text-danger">*</span></label>
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Payment <span className="text-danger">*</span></label>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-12">
                    {formData.SalesDetailRequest.map((course, index) => (
                      <div className="row mb-1" key={index}>
                        <div className="col-md-3">
                          <FormGroup>
                            <RSelect
                              dataSource={courseList || []}
                              value1={formData.SalesDetailRequest[index].SubjectId}
                              className={errors?.SalesDetailRequest?.[index]?.SubjectId ? "is-invalid" : ""}
                              onChangeHandler={(e) => {
                                const temp = { ...formData };
                                temp.SalesDetailRequest[index]["SubjectId"] = e.value;
                                setFormData(temp);
                                setValue(`SalesDetailRequest.${index}.SubjectId`, e.value, {
                                  shouldValidate: true
                                });
                              }}
                              placeholder="Select subject"
                            />
                            {errors?.SalesDetailRequest?.[index]?.SubjectId && (
                              <span className="invalid" style={{ color: "#e85347", fontSize: "11px", fontStyle: "italic" }}>
                                {errors.SalesDetailRequest[index].SubjectId.message}
                              </span>
                            )}
                          </FormGroup>
                        </div>
                        <div className="col-md-3">
                          <FormGroup>
                            <RSelect
                              dataSource={coordinatorsList || []}
                              value1={formData.SalesDetailRequest[index].Coordinator}
                              className={errors?.SalesDetailRequest?.[index]?.Coordinator ? "is-invalid" : ""}
                              onChangeHandler={(e) => {
                                const temp = { ...formData };
                                temp.SalesDetailRequest[index]["Coordinator"] = e.value;
                                setFormData(temp);
                                setValue(`SalesDetailRequest.${index}.Coordinator`, e.value, {
                                  shouldValidate: true
                                });
                              }}
                              placeholder="Select coordinator"
                            />
                            {errors?.SalesDetailRequest?.[index]?.Coordinator && (
                              <span className="invalid" style={{ color: "#e85347", fontSize: "11px", fontStyle: "italic" }}>
                                {errors.SalesDetailRequest[index].Coordinator.message}
                              </span>
                            )}
                          </FormGroup>
                        </div>
                        <div className="col-md-3">
                          <FormGroup>
                            <input
                              className="form-control"
                              type="text"
                              name="NoOfSessionPerWeek"
                              value={formData.SalesDetailRequest[index].NoOfSessionPerWeek || ""}
                              onChange={(e) => {
                                const value = e.target.value.replace(/[^0-9]/g, "");
                                const temp = { ...formData };
                                temp.SalesDetailRequest[index]["NoOfSessionPerWeek"] = value;
                                setFormData(temp);
                              }}
                              placeholder="No of Session per week"
                            />
                            {formData.SalesDetailRequest[index].NoOfSessionPerWeek !== "" &&
                              Number(formData.SalesDetailRequest[index].NoOfSessionPerWeek) < 2 && (
                                <span className="invalid" style={{ color: "#e85347", fontSize: "11px", fontStyle: "italic" }}>
                                  Minimum 2 classes per week is recommended. Please pitch for at least 2 sessions.
                                </span>
                              )}
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
                                  value={formData.SalesDetailRequest[index].ParentPayment || 0}
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
                                      if (items.SalesDetailRequest.length === 1) {
                                        // Don't remove if it's the only item
                                      } else {
                                        items.SalesDetailRequest.splice(index, 1);
                                        setFormData(items);
                                      }
                                    }}
                                  >
                                    <Icon name="trash" />
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
                <div className="mt-4">
                  <Button color="primary" type="submit" disabled={loading}>
                    {loading && <Spinner size="sm" className="mr-1" />}
                    {loading ? "Submitting..." : (<>Submit Enrollment <Icon name="check"></Icon></>)}
                  </Button>
                </div>
              </Form>
            </div>
          </CardBody>
        </Card>
        <ToastContainer />
      </Content>
    </React.Fragment>
  );
};

export default EnrollStudent;
