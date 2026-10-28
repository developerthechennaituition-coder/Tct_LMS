import React, { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import { axios } from "../../../library/axios";
import {
  DropdownMenu,
  DropdownToggle,
  UncontrolledDropdown,
  Modal,
  ModalBody,
  FormGroup,
  DropdownItem,
  Form,
  Spinner,
} from "reactstrap";
import {
  ReactDataTable,
  Block,
  BlockBetween,
  BlockDes,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Icon,
  Col,
  Row,
  UserAvatar,
  PaginationComponent,
  Button,
  DataTableHead,
  DataTableRow,
  DataTableItem,
  TooltipComponent,
  RSelect,
  PreviewAltCard,
} from "../../../components/Component";
import Swal from "sweetalert2";
import { ToastContainer } from "react-toastify";
import { toast } from "react-toastify";
import { StudetnData } from "./UserData";
import { useLocation } from "react-router-dom";
import { getEnrolledCouse, enrollnewcourse, deletecourse } from "../../../apiservices/StudentEnrollmentService";
import { useForm } from "react-hook-form";
import { getLookups } from "../../../apiservices/LookupsService";
import { getUsers, createSale } from "../../../apiservices/UserService";
import { GetSalesDetails } from "../../../apiservices/NofiticationService";
import moment from "moment";

// Preferred Demo Date is a calendar date (DATE column): send it as "YYYY-MM-DD" so the browser
// time zone cannot shift it to the previous day, and read it back as a local date.
const toApiDate = (date) => (date ? moment(date).format("YYYY-MM-DD") : null);
const fromApiDate = (value) => (value ? moment(String(value).slice(0, 10), "YYYY-MM-DD").toDate() : null);

const StudentEnrolledCourses = (props, { studentId, sm, updateSm, setProfileName }) => {
  const [modalTab, setModalTab] = useState("1");
  const defaultGuid = "00000000-0000-0000-0000-000000000000";
  const [studentEnrolledData, setStudentEnrolledData] = useState([]);
  const [userInfo, setUserInfo] = useState(StudetnData[0]);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const [addCourse, setAddCourse] = useState(false);
  const [isAddCourseClicked, setIsAddCourseClicked] = useState(false);
  const [courseList, setCourseList] = useState([]);
  const [coordinators, setCoordinators] = useState([]);
  // existingStudentId (a student adding a course from "Add Course"): their own Student.Id; each new course is
  // saved straight away, as on the student page opened with ?id=.
  const [id, setId] = useState(props?.existingStudentId || searchParams.get("id"));
  const savesToServer = Boolean(searchParams.get("id") || props?.existingStudentId);
  const [formData, setFormData] = useState({
    Id: defaultGuid,
    SalesId: props?.dataItem?.id ?? defaultGuid,
    Coordinator: defaultGuid,
    SubjectId: defaultGuid,
    ParentPayment: 0,
    SubjectCode: "",
    AuthorBookDetails: "",
    TutorId: defaultGuid,
    StudentId: props?.dataItem?.StudentId ?? id ?? defaultGuid,
    TutorPayment: 0,
    UserId: localStorage.getItem("userId"),
    NoOfSessionPerWeek: "",
    DemoDate: null,
    IsPaidDemo: null,
  });
  const [modal, setModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const loggedInUserRole = localStorage.getItem("userRole");
  const dtEnrolledCourseColumn = [
    {
      name: "Endrolled",
      minWidth: "150px",
      maxWidth: "150px",
      selector: (row) => row.subjectName,
      sortable: true,
      cell: (row) => (
        <span>
          <div>{row.subjectName}</div>
          <div>{moment(row.createdDate).format("DD-MMM-yyyy")}</div>
        </span>
      ),
    },
    {
      name: "Tutor",
      minWidth: "150px",
      maxWidth: "150px",
      selector: (row) => row.tutorName,
      sortable: true,
      cell: (row) => <span>{row.tutorName}</span>,
    },
    {
      name: "Amount",
      selector: (row) => row.parentPayment,
      minWidth: "50px",
      maxWidth: "100px",
      cell: (row) => (
        <span className="tb-amount">
          {loggedInUserRole === "Coordinator" ||
          loggedInUserRole === "CoordinatorAdmin" ||
          loggedInUserRole === "Operations" ||
          loggedInUserRole === "OperationsAdmin"
            ? "***"
            : row.parentPayment}{" "}
          <span className="currency"></span>
        </span>
      ),
      sortable: true,
    },
    {
      name: "Status",
      selector: (row) => row.statusName,
      sortable: true,
      hide: "sm",
      cell: (row) => (
        <span
          className={`tb-status ml-1 text-${
            row.statusName === "Active" ? "success" : row.statusName === "Pending" ? "warning" : "danger"
          }`}
        >
          {row.statusName}
        </span>
      ),
    },
    {
      name: "",
      sortable: false,
      hide: "sm",
      width: "50px",
      cell: (row) => (
        <span
          className={"icon ni ni-trash"}
          onClick={() => {
            onDeleteCourse(row.saleDetailsId);
          }}
        ></span>
      ),
    },
  ];

  useEffect(() => {
    const studentId = props.dataItem?.StudentId ?? id;
    if (studentId && studentId !== defaultGuid) {
      getEnrolledCouse(studentId).then((data) => {
        setStudentEnrolledData(data);
      });
    }
  }, [addCourse]);

  useEffect(() => {
    const studentId = props.dataItem?.StudentId ?? id;
    if (studentId) {
      getEnrolledCouse(studentId).then((data) => {
        setStudentEnrolledData(data);
      });
    }

    getLookups("500" /*Grade*/).then((response) => {
      let temp = [];
      response.forEach((s) => {
        temp.push({ value: s?.id, label: s?.typeCodeName });
      });
      setCourseList(temp);
    });
 
    getUsers(6).then((response) => {
      let temp = [];

      response
        .filter((s) => s?.role === "Coordinator")
        .forEach((s) => {
          temp.push({
            value: s?.id,
            label: s?.fullName,
          });
        });

      setCoordinators(temp);
    });
  }, []);

  const onInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const onFormCancel = () => {
    setAddCourse(false);
  };

  const onEditCourse = (salesId, salesDetailId) => {
    if (!searchParams.get("id")) {
      // Not saved yet (new enrollment): the course exists only in this list and has no server ids,
      // so it is edited from here, like local add / delete.
      const course = studentEnrolledData.find((item) => item.saleDetailsId === salesDetailId);
      if (!course) return;
      setFieldErrors({});
      setFormData({
        ...formData,
        Id: course.saleDetailsId,
        SubjectId: course.subjectId,
        Coordinator: course.coordinatorId,
        ParentPayment: course.parentPayment,
        SubjectCode: course.subjectCode ?? "",
        AuthorBookDetails: course.authorBookDetails ?? "",
        NoOfSessionPerWeek: course.noOfSessionPerWeek ?? "",
        DemoDate: fromApiDate(course.demoDate),
        IsPaidDemo: course.isPaidDemo ?? null,
      });
      setIsAddCourseClicked(false);
      setAddCourse(true);
      return;
    }
    GetSalesDetails(salesId, salesDetailId, defaultGuid)
      .then((response) => {
        //setFormData(...formData, response);F
        let temp = response.data;
        formData.SubjectId = response.data.subjectId;
        formData.Coordinator = response.data.coordinatorId;
        formData.NoOfSessionPerWeek = response.data.noOfSessionPerWeek;
        formData.AuthorBookDetails = response.data.authorBookDetails;
        formData.SubjectCode = response.data.subjectCode;
        formData.DemoDate = fromApiDate(response.data.demoDate);
        formData.IsPaidDemo = response.data.isPaidDemo ?? null;
        // Only set ParentPayment if user is not a Coordinator
        if (
          loggedInUserRole !== "Coordinator" ||
          loggedInUserRole !== "CoordinatorAdmin" ||
          loggedInUserRole !== "Operations" ||
          loggedInUserRole !== "OperationsAdmin"
        ) {
          formData.ParentPayment = response.data.parentPayment;
        }
        formData.SalesId = salesId;
        formData.Id = salesDetailId;
        // New object so the modal re-renders with the loaded values.
        setFormData({ ...formData });
        console.log("Response Data for selected sales and salesdetails: ", salesId, salesDetailId, response);
       
      })
      .catch((error) => {});
    setIsAddCourseClicked(false);
    setAddCourse(true);
  };

  const onDeleteCourse = (id) => {
    console.log("Deleting course with ID: ", id);

    if (!savesToServer) {
      // For local data management
      const updatedData = studentEnrolledData.filter((item) => item.saleDetailsId !== id);
      setStudentEnrolledData(updatedData);

      toast.success("The course successfully deleted.", {
        position: "top-right",
        autoClose: true,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: false,
        closeButton: <CloseButton />,
      });

      // Notify the parent component of the change
      if (props.onDataUpdate) {
        props.onDataUpdate(updatedData);
      }
      return;
    }

    Swal.fire({
      title: "Are you sure want to delete?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (result.isConfirmed) {
        deletecourse(id)
          .then(async (response) => {
            getEnrolledCouse(searchParams.get("id")).then((data) => {
              setStudentEnrolledData(data);
            });
            toast.success("The course successfully deleted.", {
              position: "top-right",
              autoClose: true,
              hideProgressBar: true,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              progress: false,
              closeButton: <CloseButton />,
            });
          })
          .catch(function (error) {});
      }
    });
  };

  const CloseButton = () => {
    return (
      <span className="btn-trigger toast-close-button" role="button">
        <Icon name="cross"></Icon>
      </span>
    );
  };

  const onFormSubmit = async (form) => {
    const newErrors = {};
    if (!formData.SubjectId || formData.SubjectId === defaultGuid) {
      newErrors.SubjectId = "Subject is required";
    }
    if (!formData.Coordinator || formData.Coordinator === defaultGuid) {
      newErrors.Coordinator = "Coordinator is required";
    }
    if (!formData.NoOfSessionPerWeek) {
      newErrors.NoOfSessionPerWeek = "Number of sessions per week is required";
    } else if (Number(formData.NoOfSessionPerWeek) < 2) {
      newErrors.NoOfSessionPerWeek = "Minimum 2 classes per week is recommended. Please pitch for at least 2 sessions.";
    }
    // New courses must state Free / Paid explicitly (no default). Courses enrolled before
    // this field existed may stay unset when edited.
    if (isAddCourseClicked && formData.IsPaidDemo !== true && formData.IsPaidDemo !== false) {
      newErrors.IsPaidDemo = "Demo type is required";
    }
    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      return;
    }
    setFieldErrors({});

    if (isAddCourseClicked) {
      let submitData = {
        ...formData,
        DemoDate: toApiDate(formData.DemoDate),
      };

      // Remove ParentPayment from submitData if user is Coordinator
      if (loggedInUserRole === "Coordinator" || loggedInUserRole === "CoordinatorAdmin"
            || loggedInUserRole === "Operations" || loggedInUserRole === "OperationsAdmin") {
        delete submitData.ParentPayment;
      }

      console.log(submitData);

      if (!savesToServer) {
        // Check for duplicate course before adding
        const isDuplicate = studentEnrolledData.some((course) => course.subjectId === formData.SubjectId);

        if (isDuplicate) {
          toast.error("This course is already enrolled for the student.", {
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

        setIsSaving(true);

        const newCourse = {
          saleDetailsId: Date.now().toString(),
          subjectName: courseList.find((item) => item.value === formData.SubjectId)?.label || "Unknown Subject",
          subjectId: formData.SubjectId,
          coordinatorId: formData.Coordinator,
          tutorName: "Not Assigned",
          parentPayment: (loggedInUserRole === "Coordinator" || loggedInUserRole === "CoordinatorAdmin"
            || loggedInUserRole === "Operations" || loggedInUserRole === "OperationsAdmin") ? 0 : formData.ParentPayment,
          statusName: "Pending",
          subjectCode: formData.SubjectCode,
          authorBookDetails: formData.AuthorBookDetails,
          noOfSessionPerWeek: formData.NoOfSessionPerWeek,
          demoDate: toApiDate(formData.DemoDate),
          isPaidDemo: formData.IsPaidDemo,
          createdDate: new Date(),
        };

        const updatedData = [...studentEnrolledData, newCourse];
        setStudentEnrolledData(updatedData);

        if (props.onDataUpdate) {
          props.onDataUpdate(updatedData);
        }

        toast.success("The course successfully enrolled.", {
          position: "top-right",
          autoClose: true,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: false,
          closeButton: <CloseButton />,
        });

        setFormData({
          Id: defaultGuid,
          SalesId: defaultGuid,
          Coordinator: defaultGuid,
          SubjectId: defaultGuid,
          ParentPayment: 0,
          SubjectCode: "",
          AuthorBookDetails: "",
          TutorId: defaultGuid,
          StudentId: id,
          TutorPayment: 0,
          UserId: localStorage.getItem("userId"),
          NoOfSessionPerWeek: "",
          DemoDate: null,
          IsPaidDemo: null,
        });

        setIsSaving(false);
        setAddCourse(false);
        return;
      }

      setIsSaving(true);

      // Original API call implementation
      await enrollnewcourse(submitData)
        .then(async (response) => {
          if (response.succeeded == false) {
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
            return;
          }

          toast.success("The course successfully enrolled.", {
            position: "top-right",
            autoClose: true,
            hideProgressBar: true,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: false,
            closeButton: <CloseButton />,
          });

          setFormData({
            Id: defaultGuid,
            SalesId: defaultGuid,
            Coordinator: defaultGuid,
            SubjectId: defaultGuid,
            ParentPayment: 0,
            SubjectCode: "",
            AuthorBookDetails: "",
            TutorId: defaultGuid,
            StudentId: id,
            TutorPayment: 0,
            UserId: localStorage.getItem("userId"),
            NoOfSessionPerWeek: "",
            DemoDate: null,
            IsPaidDemo: null,
          });

          setAddCourse(false);
          getEnrolledCouse(id).then((data) => {
            console.log(data);
            setStudentEnrolledData(data);
          });
        })
        .catch(function (error) { })
        .finally(() => setIsSaving(false));
    }
    else if (!searchParams.get("id")) {
      // Edit a course that is not saved yet: update this list only (it is saved with the enrollment).
      const isDuplicate = studentEnrolledData.some(
        (course) => course.subjectId === formData.SubjectId && course.saleDetailsId !== formData.Id
      );
      if (isDuplicate) {
        toast.error("This course is already enrolled for the student.", {
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

      const updatedData = studentEnrolledData.map((course) =>
        course.saleDetailsId === formData.Id
          ? {
              ...course,
              subjectName: courseList.find((item) => item.value === formData.SubjectId)?.label || "Unknown Subject",
              subjectId: formData.SubjectId,
              coordinatorId: formData.Coordinator,
              parentPayment: (loggedInUserRole === "Coordinator" || loggedInUserRole === "CoordinatorAdmin"
                || loggedInUserRole === "Operations" || loggedInUserRole === "OperationsAdmin") ? course.parentPayment : formData.ParentPayment,
              subjectCode: formData.SubjectCode,
              authorBookDetails: formData.AuthorBookDetails,
              noOfSessionPerWeek: formData.NoOfSessionPerWeek,
              demoDate: toApiDate(formData.DemoDate),
              isPaidDemo: formData.IsPaidDemo,
            }
          : course
      );
      setStudentEnrolledData(updatedData);
      if (props.onDataUpdate) {
        props.onDataUpdate(updatedData);
      }

      toast.success("The course successfully updated.", {
        position: "top-right",
        autoClose: true,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: false,
        closeButton: <CloseButton />,
      });
      setAddCourse(false);
    }
    else {
      // For edit course
      let editData = {
        ...formData,
        DemoDate: toApiDate(formData.DemoDate),
        CreatedBy: localStorage.getItem("userId"),
        CreatedDate: new Date().toISOString(),
      };

      // Remove ParentPayment from editData if user is Coordinator
      if (loggedInUserRole === "Coordinator" || loggedInUserRole === "CoordinatorAdmin"
            || loggedInUserRole === "Operations" || loggedInUserRole === "OperationsAdmin") {
        delete editData.ParentPayment;
      }

      console.log("its edit course");
      console.log(editData);

      setIsSaving(true);
      axios.post('/sales/updateenrolledcourse', editData)
        .then(response => {
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
            getEnrolledCouse(props.dataItem?.StudentId ?? id).then((data) => {
              setStudentEnrolledData(data);
            });

            setFormData({
              Id: defaultGuid,
              SalesId: defaultGuid,
              Coordinator: defaultGuid,
              SubjectId: defaultGuid,
              ParentPayment: 0,
              SubjectCode: "",
              AuthorBookDetails: "",
              TutorId: defaultGuid,
              StudentId: props.dataItem?.StudentId ?? defaultGuid,
              TutorPayment: 0,
              UserId: localStorage.getItem("userId"),
              NoOfSessionPerWeek: "",
              DemoDate: null,
              IsPaidDemo: null,
            });

            setAddCourse(false);
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
    }
  };

  const RenderGrid = (props) => {
    return (
      <>
        <ReactDataTable
          data={props.dataSource}
          columns={dtEnrolledCourseColumn}
          pagination
          // selectableRows
        />
      </>
    );
  };

  const { errors, register, handleSubmit } = useForm();

  const handleNumberInput = (e, fieldName) => {
    // Allow only numbers, backspace, delete, tab, escape, enter, and decimal point
    const allowedKeys = [
      "Backspace",
      "Delete",
      "Tab",
      "Escape",
      "Enter",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
    ];

    if (allowedKeys.includes(e.key)) {
      return; // Allow these keys
    }

    // For payment field, allow decimal point
    if (fieldName === "ParentPayment" && e.key === "." && !e.target.value.includes(".")) {
      return; // Allow one decimal point for payment
    }

    // Only allow numbers (0-9)
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault(); // Prevent non-numeric input
    }
  };

  return (
    <React.Fragment>
      <BlockHead size="sm">
        <BlockBetween>
          <BlockHeadContent>
            <BlockTitle tag="h6">Enrolled Courses</BlockTitle>
          </BlockHeadContent>
          <BlockHeadContent className="align-self-start">
            <li className="nk-block-tools-opt d-none d-sm-block">
              <a
                className="btn btn-primary"
                data-bs-toggle="modal"
                href="#modalCreate"
                onClick={() => {
                  setIsAddCourseClicked(true);
                  setFieldErrors({});
                  setFormData({
                    Id: defaultGuid,
                    SalesId: defaultGuid,
                    Coordinator: defaultGuid,
                    SubjectId: defaultGuid,
                    ParentPayment: 0,
                    SubjectCode: "",
                    AuthorBookDetails: "",
                    TutorId: defaultGuid,
                    StudentId: props?.dataItem?.StudentId ?? id ?? defaultGuid,
                    TutorPayment: 0,
                    UserId: localStorage.getItem("userId"),
                    NoOfSessionPerWeek: "",
                    DemoDate: null,
                    IsPaidDemo: null,
                  });
                  setAddCourse(true);
                }}
              >
                <em className="icon ni ni-plus"></em>
                <span>Add</span>
              </a>
            </li>
          </BlockHeadContent>
        </BlockBetween>
      </BlockHead>
      <Block>
        <div className="nk-tb-list is-separate is-medium mb-3">
          <DataTableHead className="nk-tb-item">
            <DataTableRow>
              <span className="sub-text">Name</span>
            </DataTableRow>
            <DataTableRow>
              <span className="sub-text">Tutor</span>
            </DataTableRow>
            <DataTableRow size="mb">
              <span className="sub-text">Session Per Week</span>
            </DataTableRow>
            <DataTableRow size="mb">
              <span className="sub-text">Amount</span>
            </DataTableRow>
            <DataTableRow size="mb">
              <span className="sub-text">Status</span>
            </DataTableRow>
            <DataTableRow size="mb">
              <span className="sub-text"></span>
            </DataTableRow>
          </DataTableHead>
          {studentEnrolledData && studentEnrolledData.length > 0
            ? studentEnrolledData.map((item) => (
                <DataTableItem key={item.saleDetailsId}>
                  <DataTableRow size="md">
                    <span>{item.subjectName}</span>
                  </DataTableRow>
                  <DataTableRow size="md">
                    <span>{item.tutorName}</span>
                  </DataTableRow>
                  <DataTableRow size="md">
                    <span>{item.noOfSessionPerWeek}</span>
                  </DataTableRow>
                  <DataTableRow size="md">
                    <span>
                      {loggedInUserRole === "Coordinator" ||
                      loggedInUserRole === "CoordinatorAdmin" ||
                      loggedInUserRole === "Operations" ||
                      loggedInUserRole === "OperationsAdmin"
                        ? "***"
                        : item.parentPayment}
                    </span>
                  </DataTableRow>
                  <DataTableRow size="md">
                    <span>{item.statusName}</span>
                  </DataTableRow>
                  {!props?.existingStudentId && (!id || item.email !== localStorage.getItem("email")) && (
                    <DataTableRow>
                      <span
                        className={"icon ni ni-edit"}
                        onClick={() => {
                          onEditCourse(item.salesId, item.saleDetailsId);
                        }}
                      ></span>
                      <span
                        className={"icon ni ni-trash"}
                        onClick={() => {
                          onDeleteCourse(item.saleDetailsId);
                        }}
                      ></span>
                    </DataTableRow>
                  )}
                </DataTableItem>
              ))
            : null}
        </div>
        {studentEnrolledData && studentEnrolledData.length == 0 && (
          <PreviewAltCard>
            <div className="text-center">
              <span className="text-silent">No data found</span>
            </div>
          </PreviewAltCard>
        )}
      </Block>

      <Modal isOpen={addCourse} toggle={() => onFormCancel()} className="modal-dialog-centered" size="lg">
        <ModalBody>
          <a href="#cancel" className="close">
            {" "}
            <Icon
              name="cross-sm"
              onClick={(ev) => {
                ev.preventDefault();
                onFormCancel();
              }}
            ></Icon>
          </a>
          <div className="p-2">
            <h5 className="title">{isAddCourseClicked ? "Enroll New Course" : "Edit Enrolled Course"}</h5>
            <div className="mt-4">
              <form onSubmit={handleSubmit(onFormSubmit)}>
                <Row className="g-3">
                  <div className="col-md-12">
                    <div className="row col-md-12">
                      <div className="col-md-4">
                        <label className="form-label">Subject <span className="text-danger">*</span></label>
                        <FormGroup>
                          <RSelect
                            dataSource={courseList || []}
                            value1={formData.SubjectId}
                            disabled={false}
                            onChangeHandler={(e) => {
                              const temp = { ...formData };
                              temp["SubjectId"] = e.value;
                              setFormData(temp);
                              setFieldErrors((prev) => ({ ...prev, SubjectId: undefined }));
                            }}
                          />
                          {fieldErrors.SubjectId && <span className="invalid" style={{ color: "#e85347", fontSize: "11px", fontStyle: "italic" }}>{fieldErrors.SubjectId}</span>}
                        </FormGroup>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Co-ordinator <span className="text-danger">*</span></label>
                        <FormGroup>
                          <RSelect
                            dataSource={coordinators || []}
                            value1={formData.Coordinator}
                            onChangeHandler={(e) => {
                              const temp = { ...formData };
                              temp["Coordinator"] = e.value;
                              setFormData(temp);
                              setFieldErrors((prev) => ({ ...prev, Coordinator: undefined }));
                            }}
                          />
                          {fieldErrors.Coordinator && <span className="invalid" style={{ color: "#e85347", fontSize: "11px", fontStyle: "italic" }}>{fieldErrors.Coordinator}</span>}
                        </FormGroup>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Payment</label>
                        {loggedInUserRole === "CoordinatorAdmin" || loggedInUserRole === "Coordinator" ? (
                          <FormGroup>
                            <input
                              type="text"
                              className="form-control"
                              value="***"
                              disabled
                              placeholder="Access restricted"
                            />
                          </FormGroup>
                        ) : (
                          <FormGroup>
                            <input
                              type="text" // Changed from "number" to "text" for better control
                              className="form-control"
                              name="ParentPayment"
                              value={formData.ParentPayment}
                              onKeyDown={(e) => handleNumberInput(e, "ParentPayment")}
                              onChange={(e) => {
                                // Remove any non-numeric characters except decimal point
                                const value = e.target.value.replace(/[^0-9.]/g, "");

                                // Ensure only one decimal point
                                const parts = value.split(".");
                                const cleanValue = parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : value;

                                const temp = { ...formData };
                                temp["ParentPayment"] = cleanValue;
                                setFormData(temp);
                              }}
                              placeholder="Enter the amount"
                              pattern="[0-9]+(\.[0-9]{1,2})?" // HTML5 pattern for validation
                              title="Please enter a valid amount (numbers only)"
                            />
                          </FormGroup>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="row col-md-12">
                      <div className="col-md-12">
                        <label className="form-label">
                          Subjects Code for IGCSE Level. If IB, ask the Student Handbook or weekly pattern.
                        </label>
                        <FormGroup>
                          <input
                            className="form-control"
                            type="text"
                            name="SubjectCode"
                            defaultValue={formData.SubjectCode}
                            value={formData.SubjectCode}
                            onChange={(e) => {
                              setFormData({
                                ...formData,
                                SubjectCode: e.target.value,
                              });
                            }}
                            placeholder="Subjects Code for IGCSE Level."
                          />
                          {errors.SubjectCode && <span className="invalid">{errors.SubjectCode.message}</span>}
                        </FormGroup>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="row col-md-12">
                      <div className="col-md-12">
                        <label className="form-label">
                          Book details Author name or book photo received ? If not, get the details and update here.
                        </label>
                        <FormGroup>
                          <input
                            className="form-control"
                            type="text"
                            name="AuthorBookDetails"
                            defaultValue={formData.AuthorBookDetails}
                            value={formData.AuthorBookDetails}
                            onChange={(e) => {
                              setFormData({
                                ...formData,
                                AuthorBookDetails: e.target.value,
                              });
                            }}
                            placeholder="Book details Author name or book photo received"
                          />
                          {errors.AuthorBookDetails && (
                            <span className="invalid">{errors.AuthorBookDetails.message}</span>
                          )}
                        </FormGroup>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="row col-md-12">
                      <div className="col-md-12">
                        <label className="form-label">
                          No of Session per week. If less than 2. Pls pitch for minimum 2 classes. <span className="text-danger">*</span>
                        </label>
                        <FormGroup>
                          <input
                            className="form-control"
                            type="text"
                            name="NoOfSessionPerWeek"
                            value={formData.NoOfSessionPerWeek}
                            onKeyDown={(e) => handleNumberInput(e, "NoOfSessionPerWeek")}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9]/g, "");
                              setFormData({ ...formData, NoOfSessionPerWeek: value });
                              if (value) setFieldErrors((prev) => ({ ...prev, NoOfSessionPerWeek: undefined }));
                            }}
                            placeholder="No of Session per week"
                            pattern="[0-9]+"
                            title="Please enter numbers only"
                            min="2"
                            max="7"
                          />
                          {fieldErrors.NoOfSessionPerWeek && (
                            <span className="invalid" style={{ color: "#e85347", fontSize: "11px", fontStyle: "italic" }}>{fieldErrors.NoOfSessionPerWeek}</span>
                          )}
                        </FormGroup>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="row col-md-12">
                      <div className="col-md-6">
                        <label className="form-label">Preferred Demo Date</label>
                        <FormGroup>
                          <div className="form-control-wrap">
                            <DatePicker
                              placeholderText="Select preferred demo date"
                              selected={formData.DemoDate}
                              minDate={new Date()}
                              isClearable
                              onChange={(date) => setFormData({ ...formData, DemoDate: date })}
                              className="form-control date-picker"
                            />
                          </div>
                        </FormGroup>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">
                          Demo Type {isAddCourseClicked && <span className="text-danger">*</span>}
                        </label>
                        <FormGroup>
                          <div className="btn-group w-100" role="group" aria-label="Demo Type">
                            {[
                              { label: "Free Demo", value: false },
                              { label: "Paid Demo", value: true },
                            ].map((option) => (
                              <button
                                key={option.label}
                                type="button"
                                className={`btn ${formData.IsPaidDemo === option.value ? "btn-primary" : "btn-outline-primary"}`}
                                aria-pressed={formData.IsPaidDemo === option.value}
                                onClick={() => {
                                  setFormData({ ...formData, IsPaidDemo: option.value });
                                  setFieldErrors((prev) => ({ ...prev, IsPaidDemo: undefined }));
                                }}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                          {fieldErrors.IsPaidDemo && (
                            <span className="invalid" style={{ color: "#e85347", fontSize: "11px", fontStyle: "italic" }}>{fieldErrors.IsPaidDemo}</span>
                          )}
                        </FormGroup>
                      </div>
                    </div>
                  </div>
                  <Col size="12">
                    <Button color="primary" type="submit" disabled={isSaving}>
                      {isSaving ? (
                        <>
                          <Spinner size="sm" className="mr-1" /> Saving...
                        </>
                      ) : (
                        <>
                          <Icon className="plus"></Icon>
                          <span> {isAddCourseClicked ? "Enroll Course" : "Edit Course"}</span>
                        </>
                      )}
                    </Button>
                  </Col>
                </Row>
              </form>
            </div>
          </div>
        </ModalBody>
      </Modal>
      <ToastContainer />
    </React.Fragment>
  );
};
export default StudentEnrolledCourses;
