import React, { useEffect, useState } from "react";
import moment from "moment";
import Dropzone from "react-dropzone";
import { axios } from "../../../library/axios";
import { config } from "../../../library/config";
import {
  FormGroup,
  Modal,
  ModalBody,
  ModalHeader,
  Form,
  Row,
  Input,
  Nav,
  NavItem,
  NavLink,
  TabContent,
  TabPane,
  Card,
  CardBody,
  Table,
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
import { getEnrollmentDetails, getEnrolledCouse } from "../../../apiservices/StudentEnrollmentService";
import { getCurrentStudentContext } from "../../../apiservices/DashboardService";
import { getUsers, createSale, getOwnership, getCorodinators } from "../../../apiservices/UserService";
import { getLookups } from "../../../apiservices/LookupsService";
import PhoneInput, { formatPhoneNumberIntl, isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import classnames from "classnames";
import "./EnrollStudent.css";
import EnrollNewCourse from "../../../pages/lms/students/StudentEnrolledCourses";
import { useLocation } from "react-router-dom";

const EnrollStudent = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const [id, setId] = useState(searchParams.get("id"));
  const defaultGuid = "00000000-0000-0000-0000-000000000000";
  const [activeTab, setActiveTab] = useState("1");
  // A student opening "Add Course" (no ?id): their details are shown read-only and they only add a course.
  const isStudentSelf = localStorage.getItem("userRole") === "Student" && !searchParams.get("id");
  const [selfStudentId, setSelfStudentId] = useState(null);
  const [modalSubject, setModalSubject] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [files4, setFiles4] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filename, setFilename] = useState("");
  const [audioFilename, setAudioFilename] = useState("");
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
      Gender: defaultGuid,
      BoardId: defaultGuid,
      GradeId: defaultGuid,
      ParentName: "",
      CreatedBy: localStorage.getItem("userId"),
      PreviousBoardId: defaultGuid,
      CustomerConnectedDate: "",
      LevelOfDemonstration: "",
      TutorPreference: "",
      GenderPreference: "",
      ParentsInterestedLevel: "",
      StudentCurrentLocationAndSchool: "",
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
      SalesDetailRequest: [
        {
          Id: defaultGuid,
          SalesId: defaultGuid,
          Coordinator: "",
          SubjectId: "",
          ParentPayment: 0,
          NoOfSessionPerWeek: 0,
          SubjectCode: "",
          AuthorBookDetails: "",
          IsActive: true,
          CreatedBy: localStorage.getItem("userId"),
        },
      ],
      IsActive: true,
      MobileNumber: "",
    },
    SalesDetailRequest: [],
    IsActive: true,
  });

  // Subject form data
  const [subjectData, setSubjectData] = useState({
    Id: defaultGuid,
    SalesId: defaultGuid,
    Coordinator: defaultGuid,
    SubjectId: defaultGuid,
    ParentPayment: 0,
    TutorId: null,
    TutorPayment: 0,
    SubjectCode: "",
    AuthorBookDetails: "",
    IsActive: true,
    UserId: localStorage.getItem("userId"),
  });

  const [coordinatorsList, setCoordinatorsList] = useState([]);
  const [ownershipList, setOwnershipList] = useState([]);
  const [courseList, setCourseList] = useState([]);
  const [gradeList, setGradeList] = useState([]);
  const [boardList, setBoardList] = useState([]);
  const [genderList, setGenderList] = useState([]);

  const [isStudentInfoValidated, setIsStudentInfoValidated] = useState(false);
  const [isAdditionalInfoValidated, setIsAdditionalInfoValidated] = useState(false);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [isTabLoading, setIsTabLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const switchTab = (tab) => {
    setIsTabLoading(true);
    setTimeout(() => {
      setActiveTab(tab);
      setIsTabLoading(false);
    }, 400);
  };

  const toggle = (tab) => {
    if (tab === "2" && !isStudentInfoValidated) {
      handleStudentInfoSubmit();
      return;
    }

    if (activeTab !== tab) switchTab(tab);
  };

  const toggleSubjectModal = () => {
    setModalSubject(!modalSubject);
    if (modalSubject) {
      setSubjectData({
        Id: defaultGuid,
        SalesId: defaultGuid,
        Coordinator: defaultGuid,
        SubjectId: defaultGuid,
        ParentPayment: 0,
        TutorId: null,
        TutorPayment: 0,
        IsActive: true,
        UserId: localStorage.getItem("userId"),
      });
      setEditIndex(null);
    }
  };

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

    getLookups("500" /*Subject*/).then((response) => {
      let temp = [];
      response.forEach((s) => {
        temp.push({ value: s?.id, label: s?.typeCodeName });
      });
      setCourseList(temp);
    });

    getLookups("400" /*Board*/).then((response) => {
      let temp = [];
      response.forEach((s) => {
        temp.push({ value: s?.id, label: s?.typeCodeName, id: s?.id });
      });
      setBoardList(temp);
    });

    getLookups("600" /*Gender*/).then((response) => {
      let temp = [];
      response.forEach((s) => {
        temp.push({ value: s?.id, label: s?.typeCodeName, id: s?.id });
      });

      setGenderList(temp);
    });

    getLookups("300" /*Grade*/).then((response) => {
      let temp = [];
      response.forEach((s) => {
        temp.push({ value: s?.id, label: s?.typeCodeName, id: s?.id });
      });
      setGradeList(temp);
    });
    if (id) loadEnrollment(id);
    if (isStudentSelf) {
      // Student ("Add Course"): their own enrollment, filled in; they only add a new course.
      getCurrentStudentContext(localStorage.getItem("userId"))
        .then(async (context) => {
          const studentId = context?.data?.studentId;
          if (!studentId) throw new Error("no student");
          const courses = await getEnrolledCouse(studentId);
          const salesId = (Array.isArray(courses) ? courses : courses?.data ?? [])[0]?.salesId;
          if (!salesId) throw new Error("no enrollment");
          await loadEnrollment(salesId);
          setSelfStudentId(studentId);
          setIsStudentInfoValidated(true);
          setIsAdditionalInfoValidated(true);
        })
        .catch(() => toast.error("Unable to load your enrollment details."));
    }
  }, []);

  const loadEnrollment = (salesId) =>
    getEnrollmentDetails(salesId).then((response) => {
        const data = response;
        setFormData({
          Id: data.id ?? defaultGuid,
          Ownership: data.ownership ?? defaultGuid,
          StudentId: data.studentId ?? defaultGuid,
          BoardId: data.boardId ?? defaultGuid,
          GradeId: data.gradeId ?? defaultGuid,

          Student: {
            Id: data.student?.id ?? defaultGuid,
            Code: data.student?.code ?? "",
            FirstName: data.student?.firstName ?? "",
            LastName: data.student?.lastName ?? "",
            Ownership: data.ownership ?? defaultGuid,
            DOB: data.student?.dob ? new Date(data.student.dob) : new Date(),
            EmailAddress: data.student?.emailAddress ?? "",
            Gender: data.student?.gender ?? defaultGuid,
            BoardId: data.student?.boardId ?? defaultGuid,
            GradeId: data.student?.gradeId ?? defaultGuid,
            ParentName: data.student?.parentName ?? "",
            CreatedBy: data.student?.createdBy ?? localStorage.getItem("userId"),
            PreviousBoardId: data.previousBoardId ?? defaultGuid,
            CustomerConnectedDate: data.customerConnectedDate ?? "",
            LevelOfDemonstration: data.levelOfDemonstration ?? "",
            TutorPreference: data.tutorPreference ?? "",
            GenderPreference: data.genderPreference ?? "",
            ParentsInterestedLevel: data.parentsInterestedLevel ?? "",
            StudentCurrentLocationAndSchool: data.studentCurrentLocationAndSchool ?? "",
            StudentAddress: data.studentAddress ?? null,
            StudentElectronicAddress: data.studentElectronicAddress ?? null,
            StudentAddresses:
              data.student?.studentAddresses?.length > 0
                ? data.student.studentAddresses
                : [
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
            SalesDetailRequest:
              data.salesDetailRequest?.map((item) => ({
                Id: item.id,
                SalesId: item.salesId,
                Coordinator: item.coordinator,
                SubjectId: item.subjectId,
                Status: item.status,
                ParentPayment: item.parentPayment,
                TutorId: item.tutorId,
                TutorPayment: item.tutorPayment,
                NoOfSessionPerWeek: Number(item.noOfSessionPerWeek) || 0,
                SubjectCode: item.subjectCode ?? "",
                AuthorBookDetails: item.authorBookDetails ?? "",
                StudentRiskStatus: item.studentRiskStatus ?? "",
                IsActive: item.isActive,
                CreatedBy: item.createdBy ?? localStorage.getItem("userId"),
              })) ?? [],
            IsActive: data.student?.isActive ?? true,
            MobileNumber: data.student?.mobileNumber ?? "",
          },
          SalesDetailRequest:
            data.salesDetailRequest?.map((item) => ({
              Id: item.id,
              SalesId: item.salesId,
              Coordinator: item.coordinator,
              SubjectId: item.subjectId,
              Status: item.status,
              ParentPayment: item.parentPayment,
              TutorId: item.tutorId,
              TutorPayment: item.tutorPayment,
              NoOfSessionPerWeek: Number(item.noOfSessionPerWeek) || 0,
              SubjectCode: item.subjectCode ?? "",
              AuthorBookDetails: item.authorBookDetails ?? "",
              StudentRiskStatus: item.studentRiskStatus ?? "",
              IsActive: item.isActive,
              CreatedBy: item.createdBy ?? localStorage.getItem("userId"),
            })) ?? [],

          IsActive: data.isActive ?? true,
        });
      });

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
        ParentName: "",
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
        MobileNumber: "",
      },
      SalesDetailRequest: [],
      IsActive: true,
    });
    setIsStudentInfoValidated(false);
    setIsAdditionalInfoValidated(false);
    setFiles4([]);
    setSelectedFiles([]);
    setFilename("");
    setAudioFilename("");
    setActiveTab("1");
    setActiveTab("2");
    window.location.reload(false);
  };

  const CloseButton = () => {
    return (
      <span className="btn-trigger toast-close-button" role="button">
        <Icon name="cross"></Icon>
      </span>
    );
  };

  const addSubject = () => {
    if (!subjectData.SubjectId || subjectData.SubjectId === defaultGuid) {
      toast.error("Please select a subject", {
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

    if (!subjectData.Coordinator || subjectData.Coordinator === defaultGuid) {
      toast.error("Please select a coordinator", {
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

    if (subjectData.ParentPayment === null || subjectData.ParentPayment <= 0) {
      toast.error("Please enter a valid payment amount", {
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

    const updatedSalesDetailRequest = [...formData.SalesDetailRequest];

    if (editIndex !== null) {
      updatedSalesDetailRequest[editIndex] = { ...subjectData };
    } else {
      updatedSalesDetailRequest.push({ ...subjectData });
    }

    setFormData((prevFormData) => ({
      ...prevFormData,
      SalesDetailRequest: updatedSalesDetailRequest,
    }));

    toggleSubjectModal();

    toast.success(editIndex !== null ? "Subject updated successfully" : "Subject added successfully", {
      position: "top-right",
      autoClose: true,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: false,
      closeButton: <CloseButton />,
    });
  };

  const editSubject = (index) => {
    setEditIndex(index);
    setSubjectData({ ...formData.SalesDetailRequest[index] });
    setModalSubject(true);
  };

  const removeSubject = (index) => {
    const updatedSalesDetailRequest = [...formData.SalesDetailRequest];
    updatedSalesDetailRequest.splice(index, 1);
    setFormData((prevFormData) => ({
      ...prevFormData,
      SalesDetailRequest: updatedSalesDetailRequest,
    }));

    toast.success("Subject removed successfully", {
      position: "top-right",
      autoClose: true,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: false,
      closeButton: <CloseButton />,
    });
  };

  const handleStudentInfoSubmit = (e) => {
    if (e) e.preventDefault();
    const inputStudentData = formData.Student;
    let validationMessage = "";

    if (!inputStudentData.FirstName) {
      validationMessage = "Student name is required.";
    } else if (!inputStudentData.ParentName) {
      validationMessage = "Parent name is required.";
    } else if (!inputStudentData.DOB) {
      validationMessage = "Date of birth is required.";
    } else if (
      !inputStudentData.EmailAddress ||
      !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(inputStudentData.EmailAddress)
    ) {
      validationMessage = "Please enter a valid email address.";
    } else if (!inputStudentData.MobileNumber || !isValidPhoneNumber(inputStudentData.MobileNumber)) {
      validationMessage = "Please enter a valid phone number.";
    } else if (!inputStudentData.Gender || inputStudentData.Gender === defaultGuid) {
      validationMessage = "Gender is required.";
    } else if (!inputStudentData.GradeId || inputStudentData.GradeId === defaultGuid) {
      validationMessage = "Grade is required.";
    } else if (!inputStudentData.BoardId || inputStudentData.BoardId === defaultGuid) {
      validationMessage = "Board is required.";
    } else if (!formData.Ownership || formData.Ownership === defaultGuid) {
      validationMessage = "Ownership is required.";
    }

    if (validationMessage) {
      toast.error(validationMessage, {
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

    toast.success("Student info validated. Proceed to Additional info.", {
      position: "top-right",
      autoClose: true,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: false,
      closeButton: <CloseButton />,
    });

    setIsStudentInfoValidated(true);
    if (!formData.Student.PreviousBoardId || formData.Student.PreviousBoardId === defaultGuid) {
      setFormData((prev) => ({
        ...prev,
        Student: { ...prev.Student, PreviousBoardId: prev.Student.BoardId },
      }));
    }
    switchTab("2");
  };

  const handleAdditionalInfoSubmit = (e) => {
    if (e) e.preventDefault();
    toast.success("Additional info validated. Proceed to enroll courses.", {
      position: "top-right",
      autoClose: true,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: false,
      closeButton: <CloseButton />,
    });

    setIsAdditionalInfoValidated(true);
    switchTab("3");
  };

  const handleSalesSubmit = (e) => {
    console.log("Form Data on Submission:", formData);
    formData.SalesDetailRequest = selectedCourses;
    const inputData = new FormData();
    inputData.append("Id", id ?? defaultGuid);
    inputData.append("BoardId", formData.Student.BoardId);
    inputData.append("GradeId", formData.Student.GradeId);
    inputData.append("PreviousBoardId", formData.Student.PreviousBoardId);
    inputData.append("LevelOfDemonstration", formData.Student.LevelOfDemonstration);
    inputData.append("CustomerConnectedDate", formData.Student.CustomerConnectedDate ? new Date(formData.Student.CustomerConnectedDate).toISOString() : "");
    inputData.append("TutorPreference", formData.Student.TutorPreference);
    inputData.append("GenderPreference", formData.Student.GenderPreference);
    inputData.append("CreatedBy", localStorage.getItem("userId") || "");
    inputData.append("CreatedDate", new Date().toISOString());
    inputData.append("IsActive", "true");
    inputData.append("StudentId", formData.Student.Id ?? defaultGuid);
    inputData.append("Student.Id", formData.Student.Id ?? defaultGuid);
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
    inputData.append("Student.ParentsInterestedLevel", formData.Student.ParentsInterestedLevel);
    inputData.append("Student.Ownership", formData.Student.Ownership);

    selectedCourses.map((course, index) => {
      inputData.append(`SalesDetailRequest[${index}].Id`, defaultGuid);
      inputData.append(`SalesDetailRequest[${index}].SalesId`, defaultGuid);
      inputData.append(`SalesDetailRequest[${index}].Coordinator`, course.coordinatorId);
      inputData.append(`SalesDetailRequest[${index}].SubjectId`, course.subjectId);
      inputData.append(`SalesDetailRequest[${index}].AuthorBookDetails`, course.authorBookDetails);
      inputData.append(`SalesDetailRequest[${index}].SubjectCode`, course.subjectCode);
      inputData.append(`SalesDetailRequest[${index}].ParentPayment`, course.parentPayment);
      inputData.append(`SalesDetailRequest[${index}].NoOfSessionPerWeek`, course.noOfSessionPerWeek);
      if (course.demoDate) inputData.append(`SalesDetailRequest[${index}].DemoDate`, course.demoDate);
      if (course.isPaidDemo === true || course.isPaidDemo === false)
        inputData.append(`SalesDetailRequest[${index}].IsPaidDemo`, String(course.isPaidDemo));
      inputData.append(`SalesDetailRequest[${index}].IsActive`, "true");
      inputData.append(`SalesDetailRequest[${index}].CreatedBy`, localStorage.getItem("userId") || "");
      inputData.append(`SalesDetailRequest[${index}].CreatedDate`, new Date().toISOString());
    });

    if (files4 && files4.length > 0) {
      inputData.append("Files", files4[0]);
    }
    if (selectedFiles && selectedFiles.length > 0) {
      inputData.append("Files", selectedFiles[0]);
    }

    setIsSaving(true);
    axios
      .post(`${config.API_URL}/sales/createsales`, inputData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
      .then((response) => {
        if (response.succeeded) {
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
          resetForm();
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
      .catch((error) => {
        toast.error("Failed to submit enrollment. Please try again.");
      })
      .finally(() => setIsSaving(false));
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

  // Function to open add subject modal
  const onAddSubjects = () => {
    setSubjectData({
      Id: defaultGuid,
      SalesId: defaultGuid,
      Coordinator: defaultGuid,
      SubjectId: defaultGuid,
      ParentPayment: 0,
      TutorId: null,
      TutorPayment: 0,
      IsActive: true,
      UserId: localStorage.getItem("userId"),
    });
    setEditIndex(null);
    setModalSubject(true);
  };

  const { errors, register, handleSubmit, setValue, trigger, clearErrors } = useForm();

  const handleDropChange = (acceptedFiles, setFiles) => {
    if (!acceptedFiles || acceptedFiles.length === 0) return;
    setFiles(
      acceptedFiles.map((file) =>
        Object.assign(file, {
          preview: URL.createObjectURL(file),
        }),
      ),
    );
    setFilename(acceptedFiles[0].name);
  };

  const handleAudioDrop = (acceptedFiles) => {
    if (!acceptedFiles?.length) return;
    const file = acceptedFiles[0];
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!['mp3', 'm4a'].includes(extension)) {
      toast.error("Only MP3 and M4A audio files are allowed.");
      return;
    }
    setSelectedFiles([file]);
    setAudioFilename(file.name);
  };

  const removeAudioFile = (e) => {
    e.stopPropagation();
    setSelectedFiles([]);
    setAudioFilename("");
  };

  // Helper function to get subject name by ID
  const getSubjectName = (id) => {
    const subject = courseList.find((item) => item.value === id);
    return subject ? subject.label : "Unknown Subject";
  };

  // Helper function to get coordinator name by ID
  const getCoordinatorName = (id) => {
    const coordinator = coordinatorsList.find((item) => item.value === id);
    return coordinator ? coordinator.label : "Unknown Coordinator";
  };

  useEffect(() => {
    register("Gender", { required: "Gender is required" });
    register("GradeId", { required: "Grade is required" });
    register("BoardId", { required: "Board is required" });
    register("MobileNumber", { required: "Phone number is required" });
    register("Ownership", { required: "Ownership is required" });
    register("DOB", { required: "Date of birth is required" });
  }, [register]);

  React.useEffect(() => {
    setValue("DOB", formData.Student.DOB);
    setValue("EmailAddress", formData.Student.EmailAddress);
    setValue("MobileNumber", formData.Student.MobileNumber);

    if (formData.Student.DOB) trigger("DOB");
    if (formData.Student.EmailAddress) trigger("EmailAddress");
    if (formData.Student.MobileNumber) trigger("MobileNumber");
  }, [formData, setValue, trigger]);

  const handleCourseUpdate = (updatedCourses) => {
    setSelectedCourses(updatedCourses);
  };

  const isFormValid = id ? true : selectedCourses.length > 0;

  return (
    <React.Fragment>
      <Head title="Enroll a Student"></Head>
      <Content>
        <div className="tct-enroll">
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle tag="h3" page>
                Enroll a Student
              </BlockTitle>
              <BlockDes className="text-soft">
                {isStudentSelf
                  ? "Your details are already on file. Add the extra subject you need in Enroll New Course."
                  : "Complete the form to enroll a new student"}
              </BlockDes>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

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
                  className={classnames({ active: activeTab === "2", disabled: !isStudentInfoValidated })}
                  onClick={() => {
                    toggle("2");
                  }}
                >
                  <Icon name="account-setting"></Icon> <span>Additional Information</span>
                </NavLink>
              </NavItem>
              <NavItem>
                <NavLink
                  className={classnames({ active: activeTab === "3", disabled: !isAdditionalInfoValidated })}
                  onClick={() => {
                    toggle("3");
                  }}
                >
                  <Icon name="book"></Icon> <span>Enroll New Course</span>
                </NavLink>
              </NavItem>
            </Nav>

            <div className="mt-4">
              {isTabLoading && (
                <div className="d-flex justify-content-center align-items-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              )}
              <TabContent activeTab={activeTab} style={{ display: isTabLoading ? "none" : undefined }}>
                <TabPane tabId="1">
                  {isStudentSelf && selfStudentId && (
                    <div className="alert alert-info d-flex justify-content-between align-items-center">
                      <span>These are your enrolled details (view only).</span>
                      <Button color="primary" size="sm" onClick={() => switchTab("3")}>
                        Enroll New Course <Icon name="arrow-right" />
                      </Button>
                    </div>
                  )}
                  <fieldset disabled={isStudentSelf} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
                  <Form noValidate onSubmit={handleStudentInfoSubmit}>
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
                            smartCaret={false}
                            countryCallingCodeEditable={false}
                            autoComplete="off"
                            name="MobileNumber"
                            placeholder="Enter phone number"
                            value={formData.Student.MobileNumber}
                            onChange={(e) => {
                              setFormData({
                                ...formData,
                                Student: {
                                  ...formData.Student,
                                  MobileNumber: e || "",
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
                              value1={formData.Student.Gender}
                              onChangeHandler={(e) => {
                                setFormData({
                                  ...formData,
                                  Student: {
                                    ...formData.Student,
                                    Gender: e.label,
                                  },
                                });
                                setValue("Gender", e.label);
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
                              value1={formData.Student.GradeId}
                              onChangeHandler={(e) => {
                                setFormData({
                                  ...formData,
                                  Student: {
                                    ...formData.Student,
                                    GradeId: e.value,
                                  },
                                });
                                setValue("GradeId", e.value);
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
                            value1={formData.Student.BoardId}
                            onChangeHandler={(e) => {
                              setFormData({
                                ...formData,
                                Student: {
                                  ...formData.Student,
                                  BoardId: e.value,
                                },
                              });
                              setValue("BoardId", e.value);
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
                            value1={formData.Ownership}
                            onChangeHandler={(e) => {
                              setFormData({
                                ...formData,
                                Ownership: e.value,
                                Student: {
                                  ...formData.Student,
                                  Ownership: e.value,
                                },
                              });
                              setValue("Ownership", e.value);
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
                      <Button color="primary" type="submit">
                        Next: Additional Info <Icon name="arrow-right"></Icon>
                      </Button>
                    </div>
                  </Form>
                  </fieldset>
                </TabPane>
                <TabPane tabId="2">
                  <fieldset disabled={isStudentSelf} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
                  <Row className="g-4">
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
                            placeholder="Select Board"
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
                              <div className="form-check me-3" key={index} style={{ marginRight: ".50rem" }}>
                                <input
                                  type="radio"
                                  className="form-check-input"
                                  id={`level-${index}`}
                                  name="LevelOfDemonstration"
                                  checked={formData?.Student?.LevelOfDemonstration?.includes(level) || false}
                                  onChange={(e) => {
                                    const currentLevels = formData?.Student?.LevelOfDemonstration || [];
                                    const updatedLevels = e.target.checked
                                      ? [...currentLevels, level]
                                      : currentLevels.filter((item) => item !== level);
                                    setFormData({
                                      ...formData,
                                      Student: { ...formData.Student, LevelOfDemonstration: updatedLevels },
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
                        <label className="form-label">Gender Preference (Pitch for experienced one)</label>
                        <div className="form-control-wrap">
                          <div className="d-flex flex-wrap gap-3">
                            {["Male", "Female", "Experienced", "Other"].map((option, index) => (
                              <div className="form-check me-3" key={index} style={{ marginRight: ".50rem" }}>
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
                              <div className="form-check me-3" key={index} style={{ marginRight: ".50rem" }}>
                                <input
                                  type="radio"
                                  className="form-check-input"
                                  id={`tutor-preference-${index}`}
                                  name="TutorPreference"
                                  value={option}
                                  checked={formData?.Student?.TutorPreference === option}
                                  onChange={(e) => {
                                    setFormData({
                                      ...formData,
                                      Student: {
                                        ...formData.Student,
                                        TutorPreference: e.target.value,
                                      },
                                    });
                                  }}
                                />
                                <label className="form-check-label" htmlFor={`tutor-preference-${index}`}>
                                  {option}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                        {errors.TutorPreference && <span className="invalid">{errors.TutorPreference.message}</span>}
                      </FormGroup>
                    </Col>

                    <Col md="4" className="customer-connected-datetime-picker">
                      <FormGroup>
                        <label className="form-label">Connected with Customer Date & Time</label>

                        <DatePicker
                          selected={
                            formData?.Student?.CustomerConnectedDate
                              ? new Date(formData.Student.CustomerConnectedDate)
                              : null
                          }
                          dateFormat="dd/MM/yyyy hh:mm aa"
                          showMonthDropdown
                          showYearDropdown
                          showTimeSelect
                          dropdownMode="select"
                          yearDropdownItemNumber={150}
                          scrollableYearDropdown
                          placeholderText="Select customer connected date & time"
                          onChange={(date) => {
                            setFormData({
                              ...formData,
                              Student: {
                                ...formData.Student,
                                CustomerConnectedDate: date || null,
                              },
                            });
                          }}
                          className="form-control"
                          wrapperClassName="w-100" // 👈 also add this so it stretches full width
                        />
                      </FormGroup>
                    </Col>

                    <Col md="6">
                      <FormGroup>
                        <label className="form-label">Instructions to Coordinator (Audio)</label>
                        <Dropzone
                          onDrop={handleAudioDrop}
                          maxFiles={1}
                          multiple={false}
                        >
                          {({ getRootProps, getInputProps }) => (
                            <section>
                              <div {...getRootProps()} className="dropzone upload-zone dz-clickable">
                                <input {...getInputProps()} />
                                {selectedFiles.length === 0 ? (
                                  <div className="dz-message text-center p-3">
                                    <span className="tct-en-dz-icon"><Icon name="upload-cloud" /></span>
                                    <span className="dz-message-text">
                                      Drag and drop an MP3 or M4A file, or <b>click to upload</b>
                                    </span>
                                    <span className="tct-en-dz-hint">Supported formats: MP3, M4A</span>
                                  </div>
                                ) : (
                                  <div className="p-3 w-100">
                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                      <span className="fw-bold">
                                        <Icon name="file-audio" className="me-1" /> {audioFilename}
                                      </span>
                                      <Button color="danger" size="sm" type="button" onClick={removeAudioFile}>
                                        Remove
                                      </Button>
                                    </div>
                                    <audio
                                      controls
                                      className="w-100"
                                      src={URL.createObjectURL(selectedFiles[0])}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </div>
                                )}
                              </div>
                            </section>
                          )}
                        </Dropzone>
                      </FormGroup>
                    </Col>

                    <Col md="6">
                      <FormGroup>
                        <label className="form-label">
                          Student is from India or Abroad? Student current location and school
                        </label>
                        <div className="form-control-wrap">
                          <input
                            className="form-control"
                            type="text"
                            name="StudentCurrentLocationAndSchool"
                            value={formData.Student.StudentCurrentLocationAndSchool}
                            onChange={(e) => {
                              setFormData({
                                ...formData,
                                Student: {
                                  ...formData.Student,
                                  StudentCurrentLocationAndSchool: e.target.value,
                                },
                              });
                            }}
                            placeholder="Enter current location and school"
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
                          Parents Interested Level towards TCT based on your conversation
                        </label>
                        <div className="form-control-wrap">
                          <div className="d-flex flex-wrap gap-3">
                            {["High", "Medium", "Low", "Not Interested. They are Just trying", "Other"].map(
                              (option, index) => (
                                <div className="form-check me-3" key={index} style={{ marginRight: ".50rem" }}>
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
                              ),
                            )}
                          </div>
                        </div>
                        {errors.ParentsInterestedLevel && (
                          <span className="invalid">{errors.ParentsInterestedLevel.message}</span>
                        )}
                      </FormGroup>
                    </Col>

                    <Col md="6">
                      <FormGroup>
                        <label className="form-label">
                          Parents Connected Time & Photo of call log with time duration
                        </label>
                        <Dropzone
                          onDrop={(acceptedFiles) => handleDropChange(acceptedFiles, setFiles4)}
                          accept={[".jpg", ".png", ".svg"]}
                        >
                          {({ getRootProps, getInputProps }) => (
                            <section>
                              <div {...getRootProps()} className="dropzone upload-zone dz-clickable">
                                <input {...getInputProps()} />
                                {files4.length === 0 ? (
                                  <div className="dz-message text-center p-3">
                                    <span className="tct-en-dz-icon"><Icon name="upload-cloud" /></span>
                                    <span className="dz-message-text">
                                      Drag and drop file or <b>click to upload</b>
                                    </span>
                                    <span className="tct-en-dz-hint">Supported formats: JPG, PNG, SVG</span>
                                  </div>
                                ) : (
                                  files4.map((file) => (
                                    <div
                                      key={file.name}
                                      className="dz-preview dz-processing dz-image-preview dz-error dz-complete"
                                    >
                                      <div className="dz-image">
                                        <img src={file.preview} alt="preview" />
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </section>
                          )}
                        </Dropzone>
                        {filename}
                        {errors.callLogPhoto && <span className="invalid">{errors.callLogPhoto.message}</span>}
                      </FormGroup>
                    </Col>

                    <Col md="12">
                      <Button color="primary" type="submit" onClick={handleAdditionalInfoSubmit}>
                        Next: Enroll Courses <Icon name="arrow-right" />
                      </Button>
                    </Col>
                  </Row>
                  </fieldset>
                </TabPane>

                <TabPane tabId="3">
                  {/* Course Enrollment Tab */}
                  {isStudentInfoValidated && (!isStudentSelf || selfStudentId) ? (
                    <>
                      <EnrollNewCourse
                        existingStudentId={isStudentSelf ? selfStudentId : undefined}
                        onDataUpdate={handleCourseUpdate}
                        SalesId={formData.id}
                        dataItem={formData}
                        salesDetails={formData.SalesDetailRequest}
                      />
                    </>
                  ) : (
                    <div className="text-center py-5">
                      <p>Please fill out student information in Tab 1 to proceed with course enrollment.</p>
                    </div>
                  )}
                </TabPane>
              </TabContent>
              <div className="mt-4" style={{ display: isFormValid && !isStudentSelf ? "block" : "none" }}>
                <Button className="btn btn-primary" type="submit" disabled={!isFormValid || isSaving} onClick={handleSalesSubmit}>
                  {isSaving ? (
                    <>
                      <Spinner size="sm" className="mr-1" /> Saving...
                    </>
                  ) : (
                    <>Save <Icon name="arrow-right" /></>
                  )}
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Subject Modal */}
        <Modal isOpen={modalSubject} toggle={toggleSubjectModal} size="lg">
          <ModalHeader toggle={toggleSubjectModal} className="border-bottom">
            {editIndex !== null ? "Edit Subject" : "Add Subject"}
          </ModalHeader>
          <ModalBody>
            <Form>
              <Row className="g-3">
                <Col md="12">
                  <FormGroup>
                    <label className="form-label">
                      Subject <span className="text-danger">*</span>
                    </label>
                    <RSelect
                      options={courseList || []}
                      value={courseList.find((option) => option.value === subjectData.SubjectId) || null}
                      onChange={(e) => {
                        setSubjectData({
                          ...subjectData,
                          SubjectId: e.value,
                        });
                      }}
                      placeholder="Select subject"
                    />
                  </FormGroup>
                </Col>
                <Col md="12">
                  <FormGroup>
                    <label className="form-label">
                      Coordinator <span className="text-danger">*</span>
                    </label>
                    <RSelect
                      options={coordinatorsList || []}
                      value={coordinatorsList.find((option) => option.value === subjectData.Coordinator) || null}
                      onChange={(e) => {
                        setSubjectData({
                          ...subjectData,
                          Coordinator: e.value,
                        });
                      }}
                      placeholder="Select coordinator"
                    />
                  </FormGroup>
                </Col>
                <Col md="12">
                  <FormGroup>
                    <label className="form-label">
                      Payment <span className="text-danger">*</span>
                    </label>
                    <div className="form-control-wrap">
                      <div className="input-group">
                        <div className="input-group-prepend">
                          <span className="input-group-text">₹</span>
                        </div>
                        <input
                          type="number"
                          className="form-control"
                          value={subjectData.ParentPayment}
                          onChange={(e) => {
                            setSubjectData({
                              ...subjectData,
                              ParentPayment: parseFloat(e.target.value) || 0,
                            });
                          }}
                          placeholder="Amount"
                        />
                      </div>
                    </div>
                  </FormGroup>
                </Col>
              </Row>
              <div className="mt-4 d-flex justify-content-end gap-2">
                <Button color="secondary" outline onClick={toggleSubjectModal}>
                  Cancel
                </Button>
                <Button color="primary" onClick={addSubject}>
                  {editIndex !== null ? "Update Subject" : "Add Subject"}
                </Button>
              </div>
            </Form>
          </ModalBody>
        </Modal>

        </div>
        <ToastContainer />
      </Content>
    </React.Fragment>
  );
};

export default EnrollStudent;
