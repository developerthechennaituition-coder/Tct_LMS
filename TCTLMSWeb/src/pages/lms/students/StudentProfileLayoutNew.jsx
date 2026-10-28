import React, { useState, useEffect } from "react";
import moment from "moment";
import Dropzone from "react-dropzone";
import axios from "axios";
import { config } from "../../../library/config";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import StudentProfileRegularPage from "./StudentProfile";
import { Route, Switch, Link } from "react-router-dom";
import {
  Icon,
  BlockHead,
  BlockBetween,
  BlockHeadContent,
  RSelect,
  Button,
  Col,
  BlockTitle,
} from "../../../components/Component";
import UserAvatar1 from "../../../components/user/UserAvatar1";
import { findUpper1 } from "../../../utils/Utils";
import {
  Card,
  DropdownItem,
  UncontrolledDropdown,
  DropdownMenu,
  DropdownToggle,
  TabContent,
  TabPane,
  CardBody,
  Nav,
  NavItem,
  NavLink,
  Form,
  Row,
  FormGroup,
  Spinner,
} from "reactstrap";
import StudentEnrolledCourses from "./StudentEnrolledCourses";
import ProfilePhoto from "../../components/ProfilePhoto";
import { useLocation } from "react-router-dom";
import classnames from "classnames";
import { useForm } from "react-hook-form";
import DatePicker from "react-datepicker";
import { ToastContainer } from "react-toastify";
import { toast } from "react-toastify";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import { getStudent, addUpdateAddress } from "../../../apiservices/StudentEnrollmentService";
import { getOwnership } from "../../../apiservices/UserService";
import { getLookups } from "../../../apiservices/LookupsService";
import EnrollNewCourse from "../../../pages/lms/students/StudentEnrolledCourses";
import classNames from "classnames";
import UserAvailability from "../users/UserAvailability";
import TCTUserActivity from "../users/TCTUserActivity";
import "./StudentProfileLayoutNew.css";

const StudentProfileLayout = () => {
  const defaultGuid = "00000000-0000-0000-0000-000000000000";
  const [activeTab, setActiveTab] = useState("1");
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [sm, updateSm] = useState(false);
  const [mobileView, setMobileView] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const viewOnly = searchParams.get("mode") === "view";
  const [files4, setFiles4] = useState([]);
  const [filesData, setFileData] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filename, setFilename] = useState("");
  const [id, setId] = useState(searchParams.get("id"));
  const [userId, setUserId] = useState(searchParams.get("userId"));
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [addressId, setAddressId] = useState(defaultGuid);

  // Function to change the design view under 990 px
  const viewChange = () => {
    if (window.innerWidth < 990) {
      setMobileView(true);
    } else {
      setMobileView(false);
      updateSm(false);
    }
  };

  const mapApiResponseToFormData = (apiData) => ({
    Id: apiData.id,
    Code: apiData.code,
    FirstName: apiData.firstName,
    LastName: apiData.lastName,
    ParentName: apiData.parentName,
    EmailAddress: apiData.emailAddress,
    DOB: new Date(apiData.dob),
    Gender: apiData.gender,
    GenderId: apiData.genderId,
    BoardId: apiData.boardId,
    GradeId: apiData.gradeId,
    MobileNumber: apiData.mobileNumber,
    NoOfSessionPerWeek: apiData.noOfSessionPerWeek,
    IsActive: apiData.isActive,
    StudentCurrentLocationAndSchool: apiData.studentCurrentLocationAndSchool,

    PreviousBoardId: apiData.previousBoardId,
    CustomerConnectedDate: apiData.customerConnectedDate,
    PreviousMarks: apiData.previousMarks,
    ExamSeries: apiData.examSeries,
    LevelOfDemonstration: apiData.levelOfDemonstration,
    TutorPreference: apiData.tutorPreference,
    GenderPreference: apiData.genderPreference,
    ParentsInterestedLevel: apiData.parentsInterestedLevel,
    StudentCurrentLocationAndSchool: apiData.studentCurrentLocationAndSchool,
  });

  const handleCourseUpdate = (updatedCourses) => {
    setSelectedCourses(updatedCourses);
  };

  const [formData, setFormData] = useState({
    Id: defaultGuid,
    Ownership: defaultGuid,
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
      ParentName: "",
      CreatedBy: localStorage.getItem("userId"),
      TutorPreference: "",
      GenderPreference: "",
      MobileNumber: "",
      IsActive: true,
    },
    IsActive: true,
  });

  const [ownershipList, setOwnershipList] = useState([]);
  const [gradeList, setGradeList] = useState([]);
  const [boardList, setBoardList] = useState([]);
  const [genderList, setGenderList] = useState([]);

  const { errors, register, handleSubmit, clearErrors } = useForm();

  useEffect(() => {
    getOwnership("ownership").then((response) => {
      let temp = [];
      response.forEach((s) => {
        temp.push({ value: s?.id, label: s?.fullName });
      });
      setOwnershipList(temp);
    });

    // Load lookup data
    const loadLookupData = async () => {
      try {
        // Load Board List
        const boardResponse = await getLookups("400");
        const boardTemp = boardResponse.map((s) => ({
          value: s?.id,
          label: s?.typeCodeName,
          id: s?.id,
        }));
        setBoardList(boardTemp);

        // Load Gender List
        const genderResponse = await getLookups("600");
        const genderTemp = genderResponse.map((s) => ({
          value: s?.id,
          label: s?.typeCodeName,
          id: s?.id,
        }));
        setGenderList(genderTemp);

        // Load Grade List
        const gradeResponse = await getLookups("300");
        const gradeTemp = gradeResponse.map((s) => ({
          value: s?.id,
          label: s?.typeCodeName,
          id: s?.id,
        }));
        setGradeList(gradeTemp);
      } catch (error) {
        console.error("Error loading lookup data:", error);
      }
    };

    // Get ID from URL params
    const urlId = searchParams.get("id");
    if (urlId) {
      setId(urlId);
    }

    // Load lookup data
    loadLookupData();

    // Setup responsive view
    viewChange();
    window.addEventListener("load", viewChange);
    window.addEventListener("resize", viewChange);
    document.getElementsByClassName("nk-header")[0]?.addEventListener("click", function () {
      updateSm(false);
    });

    return () => {
      window.removeEventListener("resize", viewChange);
      window.removeEventListener("load", viewChange);
    };
  }, []);

  // Separate useEffect for loading student data when ID changes
  useEffect(() => {
    if (id) {
      getStudentData();
    }
  }, [id]);

  const getStudentData = () => {
    getStudent(id).then(async (response) => {
      const studentData = response.data;
      setFormData({
        ...formData,
        Student: {
          ...formData.Student,
          ...mapApiResponseToFormData(studentData),
        },
        BoardId: studentData.boardId,
        GradeId: studentData.gradeId,
        Ownership: studentData.ownership,
        PreviousBoardId: studentData.previousBoardId,
        addressLine1: studentData.studentAddress.addressLine1,
        addressLine2: studentData.studentAddress.addressLine2,
        addressLine3: studentData.studentAddress.addressLine3,
        city: studentData.studentAddress.city,
        zipCode: studentData.studentAddress.zipCode,
        state: studentData.studentAddress.state,
        country: studentData.studentAddress.country,
      });
      setAddressId(studentData.studentAddress.id);
      setFilename(studentData.fileName);
      setFileData(studentData.fileData);
    });
  };

  const profileUpdateCallback = () => {
    getStudentData();
    setModalOpen(false);
  };

  const toggle = (tab) => {
    if (activeTab !== tab) setActiveTab(tab);
  };

  const handleStudentInfoSubmit = (e) => {
    const inputStudentData = formData.Student;
    if (!inputStudentData.FirstName) {
      return;
    }
    if (!inputStudentData.ParentName) {
      return;
    }
    if (!inputStudentData.DOB) {
      return;
    }
    if (
      !inputStudentData.EmailAddress ||
      !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(inputStudentData.EmailAddress)
    ) {
      return;
    }
    if (!inputStudentData.MobileNumber || !isValidPhoneNumber(inputStudentData.MobileNumber)) {
      return;
    }
    if (!inputStudentData.Gender || inputStudentData.Gender === defaultGuid) {
      return;
    }
    if (!inputStudentData.GradeId || inputStudentData.GradeId === defaultGuid) {
      return;
    }
    if (!inputStudentData.BoardId || inputStudentData.BoardId === defaultGuid) {
      return;
    }
    if (!formData.Ownership || formData.Ownership === defaultGuid) {
      return;
    }
    if (e) e.preventDefault();

    const inputData = new FormData();
    inputData.append("Id", defaultGuid);
    inputData.append("BoardId", formData.Student.BoardId);
    inputData.append("GradeId", formData.Student.GradeId);
    inputData.append("Ownership", formData.Ownership);
    inputData.append("PreviousBoardId", defaultGuid);
    inputData.append("LevelOfDemonstration", "");
    inputData.append("CustomerConnectedDate", "");
    inputData.append("TutorPreference", "");
    inputData.append("GenderPreference", "");
    inputData.append("CreatedBy", localStorage.getItem("userId") || "");
    inputData.append("CreatedDate", new Date().toISOString());
    inputData.append("IsActive", "true");
    inputData.append("StudentId", formData.Student.Id);
    inputData.append("Student.Id", formData.Student.Id);
    inputData.append("Student.Code", "");
    inputData.append("Student.FirstName", formData.Student.FirstName);
    inputData.append("Student.LastName", formData.Student.ParentName);
    inputData.append("Student.DOB", moment(formData.Student.DOB).format("YYYY-MM-DD"));
    inputData.append("Student.EmailAddress", formData.Student.EmailAddress);
    inputData.append("Student.Gender", formData.Student.Gender);
    inputData.append("Student.MobileNumber", formData.Student.MobileNumber);
    inputData.append("Student.BoardId", formData.Student.BoardId);
    inputData.append("Student.GradeId", formData.Student.GradeId);
    inputData.append("Student.IsActive", "true");
    inputData.append("Student.CreatedBy", localStorage.getItem("userId") || "");
    inputData.append("Student.CreatedDate", new Date().toISOString());
    inputData.append("Student.ParentsInterestedLevel", "");

    axios
      .post(`${config.API_URL}/sales/updatestudentinfo`, inputData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      })
      .then((response) => {
        if (response.data.succeeded) {
          toast.success(response.data.message, {
            position: "top-right",
            autoClose: true,
            hideProgressBar: true,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: false,
            closeButton: <CloseButton />,
          });
          if (id) {
            getStudentData();
          }
        } else {
          toast.error(response.data.message, {
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
      .catch((error) => {
        console.log(error);
        toast.error("Failed to submit enrollment. Please try again.");
      });
  };

  const handleAdditionalInfoSubmit = (e) => {
    const inputData = new FormData();
    inputData.append("Id", defaultGuid);
    inputData.append("BoardId", defaultGuid);
    inputData.append("GradeId", defaultGuid);
    inputData.append("Ownership", defaultGuid);
    inputData.append("PreviousBoardId", formData.Student.PreviousBoardId);
    inputData.append("LevelOfDemonstration", formData.Student.LevelOfDemonstration);
    inputData.append("ParentsInterestedLevel", formData.Student.ParentsInterestedLevel);

    inputData.append("TutorPreference", formData.Student.TutorPreference);
    inputData.append("GenderPreference", formData.Student.GenderPreference);
    inputData.append("CreatedBy", localStorage.getItem("userId") || "");
    inputData.append("CreatedDate", new Date().toISOString());
    inputData.append("IsActive", "true");
    inputData.append("StudentId", formData.Student.Id);
    inputData.append("Student.Id", formData.Student.Id);
    inputData.append("Student.Code", "");
    inputData.append("Student.FirstName", "");
    inputData.append("Student.LastName", "");
    inputData.append("Student.DOB", "");
    inputData.append("Student.EmailAddress", "");
    inputData.append("Student.Gender", "");
    inputData.append("Student.MobileNumber", "");
    inputData.append("Student.BoardId", "");
    inputData.append("Student.GradeId", "");
    inputData.append("Student.IsActive", "true");
    inputData.append("Student.CreatedBy", localStorage.getItem("userId") || "");
    inputData.append("Student.CreatedDate", new Date().toISOString());
    inputData.append("Student.StudentCurrentLocationAndSchool", formData.Student.StudentCurrentLocationAndSchool);
    inputData.append("CustomerConnectedDate", new Date(formData.Student.CustomerConnectedDate).toISOString());

    if (files4 && files4.length > 0) {
      inputData.append("Files", files4[0]);
    }

    setLoading(true);
    axios
      .post(`${config.API_URL}/sales/updateadditionalinfo`, inputData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      })
      .then((response) => {
        if (response.data.succeeded) {
          toast.success(response.data.message, {
            position: "top-right",
            autoClose: true,
            hideProgressBar: true,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: false,
            closeButton: <CloseButton />,
          });
          if (id) {
            getStudentData();
          }
          setActiveTab("2");
        } else {
          toast.error(response.data.message, {
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
      .catch((error) => {
        console.log(error);
        toast.error("Failed to submit additional information. Please try again.");
      })
      .finally(() => setLoading(false));

    //setIsAdditionalInfoValidated(true);
    //setActiveTab('3');
  };

  const handleAddressSubmit = (submitData) => {
    const inputData = formData;
    inputData.studentId = id;
    inputData.CreatedBy = localStorage.getItem("userId");
    inputData.CreatedDate = new Date();
    inputData.Id = addressId;
    setLoading(true);
    addUpdateAddress(inputData).then((response) => {
      if (response.succeeded) {
        toast.success("Address Add/Updated successufully.", {
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
      if (id) {
        getStudentData();
      }
      setActiveTab("3");
    }).finally(() => setLoading(false));
  };

  const CloseButton = () => {
    return (
      <span className="btn-trigger toast-close-button" role="button">
        <Icon name="cross"></Icon>
      </span>
    );
  };

  const clearForm = () => {
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
    });
    setSelectedFiles([]);
    setFiles4([]);
    setFilename("");
  };

  const formClass = classNames({
    "form-validate": true,
    "is-alter": "alter",
  });

  const handleDropChange = (acceptedFiles, setFiles) => {
    setFiles(
      acceptedFiles.map((file) =>
        Object.assign(file, {
          preview: URL.createObjectURL(file),
        })
      )
    );
    setFilename(acceptedFiles[0].name);
  };

  const convertToBase64 = (byteArray) => {
    let binary = "";
    for (let i = 0; i < byteArray.length; i++) {
      binary += String.fromCharCode(byteArray[i]);
    }
    return btoa(binary);
  };

  return (
    <React.Fragment>
      <Head title={viewOnly ? "Student Profile" : "Edit Enrollment"}></Head>
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <div className="card-inner">
                <div className="user-card">

                  <UserAvatar1 image={imageUrl} text={findUpper1(formData.Student.FirstName)} theme="primary" />
                  <div className="user-info">
                    <span className="lead-text">{formData.Student.FirstName}</span>
                    <span className="sub-text">{formData.Student.EmailAddress}</span>
                  </div>

                  {modalOpen && (
                    <ProfilePhoto
                      modalOpen={modalOpen}
                      fullName={profileName}
                      id={id}
                      modalCloseCallback={() => {
                        setModalOpen(false);
                      }}
                      profileUpdateCallback={profileUpdateCallback}
                      polished={localStorage.getItem("userRole")?.trim() === "Coordinator"}
                    ></ProfilePhoto>
                  )}

                  {!viewOnly && <div className="user-action">
                    <UncontrolledDropdown>
                      <DropdownToggle tag="a" className="btn btn-icon btn-trigger mr-n2">
                        <Icon name="more-v"></Icon>
                      </DropdownToggle>
                      <DropdownMenu right>
                        <ul className="link-list-opt no-bdr">
                          <li>
                            <DropdownItem
                              tag="a"
                              href="#dropdownitem"
                              onClick={(ev) => {
                                ev.preventDefault();
                                setModalOpen(true);
                              }}
                            >
                              <Icon name="camera-fill"></Icon>
                              <span>Change Photo</span>
                            </DropdownItem>
                          </li>
                          <li>
                            <DropdownItem
                              tag="a"
                              href="#dropdownitem"
                              onClick={(ev) => {
                                ev.preventDefault();
                              }}
                            >
                              <Icon name="edit-fill"></Icon>
                              <span>Update Profile</span>
                            </DropdownItem>
                          </li>
                        </ul>
                      </DropdownMenu>
                    </UncontrolledDropdown>
                  </div>}
                </div>
              </div>
            </BlockHeadContent>
            <BlockHeadContent>
              <Link
                className="btn btn-outline-light bg-white d-none d-sm-inline-flex"
                to={`${process.env.PUBLIC_URL}/lms/studentlist`}
              >
                <Icon name="arrow-left"></Icon>
                <span>Back</span>
              </Link>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        <div className={localStorage.getItem("userRole")?.trim() === "Coordinator" ? "tct-sp" : undefined}>
        <Card className="card-bordered">
          <CardBody className="card-inner">
            <Nav tabs className="mt-n3">
              <NavItem>
                <NavLink
                  className={classnames({ active: activeTab === "1" })}
                  onClick={() => {
                    toggle("1");
                  }}
                >
                  <Icon name="user"></Icon> <span>Student Information</span>
                </NavLink>
              </NavItem>
              <NavItem>
                <NavLink
                  className={classnames({ active: activeTab === "2" })}
                  onClick={() => {
                    toggle("2");
                  }}
                >
                  <Icon name="user-add"></Icon> <span>Additional Information</span>
                </NavLink>
              </NavItem>
              <NavItem>
                <NavLink
                  className={classnames({ active: activeTab === "3" })}
                  onClick={() => {
                    toggle("3");
                  }}
                >
                  <Icon name="map-pin-fill"></Icon> <span>Address</span>
                </NavLink>
              </NavItem>
              <NavItem>
                <NavLink
                  className={classnames({ active: activeTab === "4" })}
                  onClick={() => {
                    toggle("4");
                  }}
                >
                  <Icon name="book"></Icon> <span>Courses</span>
                </NavLink>
              </NavItem>
              <NavItem>
                <NavLink
                  className={classnames({ active: activeTab === "5" })}
                  onClick={() => {
                    toggle("5");
                  }}
                >
                  <Icon name="calender-date"></Icon> <span>Availability</span>
                </NavLink>
              </NavItem>
              <NavItem>
                <NavLink
                  className={classnames({ active: activeTab === "6" })}
                  onClick={() => {
                    toggle("6");
                  }}
                >
                  <Icon name="user-list-fill"></Icon> <span>Activity</span>
                </NavLink>
              </NavItem>
            </Nav>

            <div className="mt-4">
              <fieldset disabled={viewOnly} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
              <TabContent activeTab={activeTab}>
                <TabPane tabId="1" className="tct-sp-pane">
                  <BlockHead size="sm">
                    <BlockBetween>
                      <BlockHeadContent>
                        <BlockTitle tag="h6">Student Information</BlockTitle>
                      </BlockHeadContent>
                    </BlockBetween>
                  </BlockHead>
                  <Form noValidate onSubmit={handleSubmit(handleStudentInfoSubmit)}>
                    <Row className="g-3">
                      <Col md="4">
                        <FormGroup>
                          <label className="form-label">
                            Student Name <span className="text-danger">*</span>
                          </label>
                          <input
                            className="form-control"
                            type="text"
                            name="FirstName"
                            value={formData.Student?.FirstName || ""}
                            onChange={(e) => {
                              setFormData({
                                ...formData,
                                Student: {
                                  ...formData.Student,
                                  FirstName: e.target.value,
                                },
                              });
                            }}
                            placeholder="Enter student name"
                            ref={register({ required: "Student name is required" })}
                          />
                          {errors.FirstName && <span className="invalid">{errors.FirstName.message}</span>}
                        </FormGroup>
                      </Col>
                      <Col md="4">
                        <FormGroup>
                          <label className="form-label">
                            Parent Name <span className="text-danger">*</span>
                          </label>
                          <input
                            className="form-control"
                            type="text"
                            name="ParentName"
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
                            ref={register({ required: "Parent name is required" })}
                          />
                          {errors.ParentName && <span className="invalid">{errors.ParentName.message}</span>}
                        </FormGroup>
                      </Col>
                      <Col md="4">
                        <FormGroup>
                          <label className="form-label">
                            Date of Birth <span className="text-danger">*</span>
                          </label>
                          <div className="form-control-wrap">
                            <DatePicker
                              selected={formData.Student.DOB}
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
                                  Student: {
                                    ...formData.Student,
                                    DOB: date,
                                  },
                                });
                              }}
                              onYearChange={(date) => {
                                setFormData({ ...formData, Student: { ...formData.Student, DOB: date } });
                              }}
                              className="form-control date-picker"
                            />
                          </div>
                          {errors.DOB && (
                            <span
                              className="invalid"
                              style={{ color: "#e85347", fontSize: "11px", fontStyle: "italic" }}
                            >
                              {errors.DOB.message}
                            </span>
                          )}
                        </FormGroup>
                      </Col>
                      <Col md="4">
                        <FormGroup>
                          <label className="form-label">
                            Email <span className="text-danger">*</span>
                          </label>
                          <input
                            className="form-control"
                            type="email"
                            readOnly="true"
                            name="EmailAddress"
                            value={formData.Student.EmailAddress}
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
                              required: "Email is required",
                              pattern: {
                                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                message: "Invalid email address",
                              },
                            })}
                          />
                          {errors.EmailAddress && <span className="invalid">{errors.EmailAddress.message}</span>}
                        </FormGroup>
                      </Col>

                      <Col md="4">
                        <FormGroup>
                          <label className="form-label">
                            Phone Number <span className="text-danger">*</span>
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
                          />
                          {errors.MobileNumber && (
                            <span
                              className="invalid"
                              style={{ color: "#e85347", fontSize: "11px", fontStyle: "italic" }}
                            >
                              {errors.MobileNumber.message}
                            </span>
                          )}
                        </FormGroup>
                      </Col>
                      <Col md="4">
                        <FormGroup>
                          <label className="form-label">
                            Gender <span className="text-danger">*</span>
                          </label>
                          <div className="form-control-wrap">
                            <RSelect
                              dataSource={genderList || []}
                              value={genderList.find((g) => g.label === formData.Student.Gender)}
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
                            />
                          </div>
                          {errors.Gender && (
                            <span
                              className="invalid"
                              style={{ color: "#e85347", fontSize: "11px", fontStyle: "italic" }}
                            >
                              {errors.Gender.message}
                            </span>
                          )}
                        </FormGroup>
                      </Col>

                      <Col md="4">
                        <FormGroup>
                          <label className="form-label">
                            Grade <span className="text-danger">*</span>
                          </label>
                          <div className="form-control-wrap">
                            <RSelect
                              dataSource={gradeList || []}
                              value={gradeList?.find((option) => option.value === formData.Student.GradeId) || null}
                              onChangeHandler={(e) => {
                                setFormData({
                                  ...formData,
                                  Student: {
                                    ...formData.Student,
                                    GradeId: e?.value || "",
                                  },
                                });
                                clearErrors("GradeId");
                              }}
                              placeholder="Select grade"
                            />
                          </div>
                          {errors.GradeId && (
                            <span
                              className="invalid"
                              style={{ color: "#e85347", fontSize: "11px", fontStyle: "italic" }}
                            >
                              {errors.GradeId.message}
                            </span>
                          )}
                        </FormGroup>
                      </Col>
                      <Col md="4">
                        <FormGroup>
                          <label className="form-label">
                            Board <span className="text-danger">*</span>
                          </label>
                          <RSelect
                            dataSource={boardList || []}
                            value={boardList.find((option) => option.value === formData.Student.BoardId) || null}
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
                          {errors.BoardId && (
                            <span
                              className="invalid"
                              style={{ color: "#e85347", fontSize: "11px", fontStyle: "italic" }}
                            >
                              {errors.BoardId.message}
                            </span>
                          )}
                        </FormGroup>
                      </Col>

                      <Col md="4">
                        <FormGroup>
                          <label className="form-label">
                            Ownership (Operations)<span className="text-danger">*</span>
                          </label>
                          <RSelect
                            dataSource={ownershipList || []}
                            value={ownershipList.find((option) => option.value === formData.Ownership) || null}
                            onChangeHandler={(e) => {
                              setFormData({
                                ...formData,
                                Ownership: e.value,
                              });
                              clearErrors("Ownership");
                            }}
                            placeholder="Select ownership"
                          />
                          {errors.Ownership && (
                            <span
                              className="invalid"
                              style={{ color: "#e85347", fontSize: "11px", fontStyle: "italic" }}
                            >
                              {errors.Ownership.message}
                            </span>
                          )}
                        </FormGroup>
                      </Col>
                    </Row>

                    <div className="mt-4">
                      <Button color="primary" type="submit" onClick={handleStudentInfoSubmit}>
                        <Icon name="save" className="tct-sp-btn-icon"></Icon> <span>Save Student Info</span>
                      </Button>
                    </div>
                  </Form>
                </TabPane>

                <TabPane tabId="2" className="tct-sp-pane tct-sp-additional">
                  <BlockHead size="sm">
                    <BlockBetween>
                      <BlockHeadContent>
                        <BlockTitle tag="h6">Additional Information</BlockTitle>
                      </BlockHeadContent>
                    </BlockBetween>
                  </BlockHead>
                  <Row className="g-3">
                    <Col md="6">
                      <FormGroup>
                        <label className="form-label">
                          Same Board from the Beginning? If not, which board did the student study from?
                        </label>
                        <div className="form-control-wrap">
                          <RSelect
                            dataSource={boardList || []}
                            value={
                              boardList.find((option) => option.value === formData.Student.PreviousBoardId) || null
                            }
                            value1={formData.Student.PreviousBoardId}
                            onChangeHandler={(e) => {
                              setFormData({
                                ...formData,
                                Student: {
                                  ...formData.Student,
                                  PreviousBoardId: e.value,
                                },
                              });
                              clearErrors("PreviousBoardId");
                            }}
                            placeholder="Same Board from the Beginning? If not, which board did the student study from?"
                          />
                        </div>
                        {errors.PreviousBoardId && <span className="invalid">{errors.PreviousBoardId.message}</span>}
                      </FormGroup>
                    </Col>
                    <Col md="6">
                      <FormGroup>
                        <label className="form-label">Level of Demonstration in the demo class</label>
                        <div className="form-control-wrap">
                          <div className="d-flex flex-wrap gap-3">
                            {["Advanced", "Medium", "Very Basic", "Other"].map((level, index) => (
                              <div className="form-check" key={index} style={{ marginRight: "1.5rem" }}>
                                <input
                                  type="radio"
                                  className="form-check-input"
                                  id={`level-${index}`}
                                  name="LevelOfDemonstration"
                                  checked={formData?.Student?.LevelOfDemonstration?.includes(level) || false}
                                  onChange={(e) => {
                                    const currentLevels = formData?.Student?.LevelOfDemonstration || [];
                                    let updatedLevels;

                                    if (e.target.checked) {
                                      updatedLevels = [...currentLevels, level];
                                    } else {
                                      updatedLevels = currentLevels.filter((item) => item !== level);
                                    }

                                    setFormData({
                                      ...formData,
                                      Student: {
                                        ...formData.Student,
                                        LevelOfDemonstration: updatedLevels,
                                      },
                                    });
                                  }}
                                  value={level}
                                />
                                <label className="form-check-label" htmlFor={`level-${index}`}>
                                  {level}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                        {errors.level && <span className="invalid">{errors.level.message}</span>}
                      </FormGroup>
                    </Col>
                    <Col md="4">
                      <FormGroup>
                        <label className="form-label">Gender Preference (Pitch for experienced one) </label>
                        <div className="form-control-wrap">
                          <div className="d-flex flex-wrap gap-3">
                            {["Male", "Female", "Experienced", "Other"].map((option, index) => (
                              <div className="form-check" key={index} style={{ marginRight: "1rem" }}>
                                <input
                                  type="radio"
                                  className="form-check-input"
                                  id={`gender-preference-${index}`}
                                  name="GenderPreference"
                                  value={option}
                                  checked={formData?.Student?.GenderPreference === option}
                                  onChange={(e) => {
                                    setFormData({
                                      ...formData,
                                      Student: {
                                        ...formData.Student,
                                        GenderPreference: e.target.value,
                                      },
                                    });
                                  }}
                                />
                                <label className="form-check-label" htmlFor={`gender-preference-${index}`}>
                                  {option}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                        {errors.GenderPreference && <span className="invalid">{errors.GenderPreference.message}</span>}
                      </FormGroup>
                    </Col>
                    <Col md="4">
                      <FormGroup>
                        <label className="form-label">Tutor Preference for student</label>
                        <div className="form-control-wrap">
                          <div className="d-flex flex-wrap gap-3">
                            {["Strict", "Medium", "Liberal"].map((option, index) => (
                              <div className="form-check" key={index} style={{ marginRight: "1rem" }}>
                                <input
                                  type="radio"
                                  className="form-check-input"
                                  id={`tutor-performance-${index}`}
                                  name="TutorPreference"
                                  value={option}
                                  onChange={(e) => {
                                    setFormData({
                                      ...formData,
                                      Student: {
                                        ...formData.Student,
                                        TutorPreference: e.target.value,
                                      },
                                    });
                                  }}
                                  checked={formData?.Student?.TutorPreference === option}
                                />
                                <label className="form-check-label" htmlFor={`tutor-performance-${index}`}>
                                  {option}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                        {errors.TutorPreference && <span className="invalid">{errors.TutorPreference.message}</span>}
                      </FormGroup>
                    </Col>
                    <Col md="4">
                      <label className="form-label">Connected with Customer Date & Time</label>
                      <FormGroup>
                        <DatePicker
                          defaultValue={formData?.Student?.CustomerConnectedDate}
                          selected={
                            formData?.Student?.CustomerConnectedDate
                              ? new Date(formData.Student.CustomerConnectedDate)
                              : null
                          }
                          dateFormat="dd/MM/yyyy hh:mm"
                          showMonthDropdown
                          showYearDropdown
                          showTimeSelect
                          dropdownMode="select"
                          yearDropdownItemNumber={150}
                          scrollableYearDropdown
                          placeholderText="Select customer connected date & time"
                          //maxDate={new Date(new Date().setFullYear(new Date().getFullYear() - 5))}
                          onChange={(date) => {
                            console.log("Selected date and time: ", date);
                            setFormData({
                              ...formData,
                              Student: {
                                ...formData.Student,
                                CustomerConnectedDate: date ? date : null,
                              },
                            });
                          }}
                          className="form-control date-picker"
                        />
                        {errors.NoOfSessionPerWeek && (
                          <span className="invalid">{errors.NoOfSessionPerWeek.message}</span>
                        )}
                      </FormGroup>
                    </Col>
                    <Col md="12">
                      <FormGroup>
                        <label className="form-label">
                          Student is from India or Abroad? Or from Abroad. (To check teacher English slang and level of
                          understanding) Student current location and school
                        </label>
                        <div className="form-control-wrap">
                          <input
                            className="form-control"
                            type="text"
                            name="StudentCurrentLocationAndSchool"
                            value={formData?.Student?.StudentCurrentLocationAndSchool}
                            onChange={(e) => {
                              setFormData({
                                ...formData,
                                Student: {
                                  ...formData.Student,
                                  StudentCurrentLocationAndSchool: e.target.value,
                                },
                              });
                            }}
                            placeholder="Student is from India or Abroad? Or from Abroad. (To check teacher English slang and level of understanding) Student current location and school"
                            ref={register({ required: "This field is required" })}
                          />
                        </div>
                        {errors.StudentCurrentLocationAndSchool && (
                          <span className="invalid">{errors.StudentCurrentLocationAndSchool.message}</span>
                        )}
                      </FormGroup>
                    </Col>
                    <Col md="6">
                      <FormGroup>
                        <label className="form-label">
                          Parents Interested Level towards TCT based upon your conversation
                        </label>
                        <div className="form-control-wrap">
                          <div className="d-flex flex-row flex-wrap gap-3">
                            {["High", "Medium", "Low", "Not Interested. They are Just trying", "Other"].map(
                              (option, index) => (
                                <div className="form-check" key={index} style={{ marginRight: "1rem" }}>
                                  <input
                                    type="radio"
                                    className="form-check-input"
                                    id={`parents-interest-${index}`}
                                    name="ParentsInterestedLevel"
                                    value={option}
                                    checked={formData?.Student?.ParentsInterestedLevel === option}
                                    onChange={(e) => {
                                      setFormData({
                                        ...formData,
                                        Student: {
                                          ...formData.Student,
                                          ParentsInterestedLevel: e.target.value,
                                        },
                                      });
                                    }}
                                  />
                                  <label className="form-check-label" htmlFor={`parents-interest-${index}`}>
                                    {option}
                                  </label>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                        {errors.ParentsInterestedLevel && (
                          <span className="invalid">{errors.ParentsInterestedLevel.message}</span>
                        )}
                      </FormGroup>
                    </Col>
                    <Col md="6">
                      <label className="form-label">
                        Parents Connected Time & Photo of call log with time duration
                      </label>
                      <FormGroup>
                        <Dropzone
                          onDrop={(acceptedFiles) => handleDropChange(acceptedFiles, setFiles4)}
                          accept={[".jpg", ".png", ".svg"]}
                        >
                          {({ getRootProps, getInputProps }) => (
                            <section>
                              <div {...getRootProps()} className="dropzone upload-zone dz-clickable">
                                <input {...getInputProps()} />
                                {files4.length === 0 && (
                                  <div className="dz-message">
                                    <span className="tct-sp-dz-icon"><Icon name="upload-cloud"></Icon></span>
                                    <span className="dz-message-text">
                                      Drag and drop file or <b>click to upload</b>
                                    </span>
                                    <span className="tct-sp-dz-hint">Supported formats: JPG, PNG, SVG</span>
                                  </div>
                                )}
                                {filesData && (
                                  <div className="dz-preview dz-processing dz-image-preview dz-error dz-complete">
                                    <div className="dz-image">
                                      <img src={`data:image/jpeg;base64,${filesData}`} alt="preview" />
                                    </div>
                                  </div>
                                )}
                                {files4.map((file) => (
                                  <div
                                    key={file.name}
                                    className="dz-preview dz-processing dz-image-preview dz-error dz-complete"
                                  >
                                    <div className="dz-image">
                                      <img src={file.preview} alt="preview" />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </section>
                          )}
                        </Dropzone>
                        {filename}
                        {errors.callLogPhoto && <span className="invalid">{errors.callLogPhoto.message}</span>}
                      </FormGroup>
                    </Col>
                    <Col md="12">
                      <Button color="primary" type="submit" disabled={loading} onClick={handleAdditionalInfoSubmit}>
                        {loading ? (
                          <>
                            <Spinner size="sm" className="mr-1" /> Saving...
                          </>
                        ) : (
                          <>
                            <Icon name="save" className="tct-sp-btn-icon"></Icon> <span>Save Additional Information</span>
                          </>
                        )}
                      </Button>
                    </Col>
                  </Row>
                </TabPane>

                <TabPane tabId="3" className="tct-sp-address">
                  <BlockHead size="sm">
                    <BlockBetween>
                      <BlockHeadContent>
                        <BlockTitle tag="h6">Address</BlockTitle>
                      </BlockHeadContent>
                    </BlockBetween>
                  </BlockHead>
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
                            defaultValue={formData?.addressLine1}
                            value={formData?.addressLine1}
                            onChange={(e) => {
                              setFormData({ ...formData, addressLine1: e.target.value });
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
                            defaultValue={formData?.addressLine2}
                            value={formData?.addressLine2}
                            onChange={(e) => {
                              setFormData({ ...formData, addressLine2: e.target.value });
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
                          Address Line3
                        </label>
                        <div className="form-control-wrap">
                          <input
                            className="form-control"
                            type="text"
                            name="addressLine3"
                            id="addressLine3"
                            defaultValue={formData?.addressLine3}
                            value={formData?.addressLine3}
                            onChange={(e) => {
                              setFormData({ ...formData, addressLine3: e.target.value });
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
                            defaultValue={formData?.city}
                            value={formData?.city}
                            onChange={(e) => {
                              setFormData({ ...formData, city: e.target.value });
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
                            defaultValue={formData?.zipCode}
                            value={formData?.zipCode}
                            onChange={(e) => {
                              setFormData({ ...formData, zipCode: e.target.value });
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
                            defaultValue={formData?.state}
                            value={formData?.state}
                            onChange={(e) => {
                              setFormData({ ...formData, state: e.target.value });
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
                            defaultValue={formData?.country}
                            value={formData?.country}
                            onChange={(e) => {
                              setFormData({ ...formData, country: e.target.value });
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
                        <Button color="primary" size="md" type="submit" disabled={loading} onClick={handleAddressSubmit}>
                          {loading ? (
                            <>
                              <Spinner size="sm" className="mr-1" /> Saving...
                            </>
                          ) : (
                            "Save Address"
                          )}
                        </Button>
                      </li>
                      {/* <li>
                                          <a
                                              href="#cancel"
                                              onClick={(ev) => {
                                                  ev.preventDefault();
                                                  if (props?.onFormCancel) {
                                                      props.onFormCancel();
                                                  }
                                              }}
                                              className="link link-light"
                                          >
                                              Cancel
                                          </a>
                                      </li> */}
                    </ul>
                  </Col>
                </TabPane>

                <TabPane tabId="4">
                  <div className="tct-sp-courses">
                    <EnrollNewCourse onDataUpdate={handleCourseUpdate} />
                  </div>
                </TabPane>

                <TabPane tabId="5">
                  {activeTab === "5" && (
                    <div className="tct-sp-avail">
                      <UserAvailability navigationType="student" studentId={userId} />
                    </div>
                  )}
                </TabPane>

                <TabPane tabId="6">
                  {activeTab === "6" && (
                    <TCTUserActivity />
                  )}
                </TabPane>
              </TabContent>
              </fieldset>
            </div>
          </CardBody>
        </Card>
        <ToastContainer />
        </div>
      </Content>
    </React.Fragment>
  );
};

export default StudentProfileLayout;
