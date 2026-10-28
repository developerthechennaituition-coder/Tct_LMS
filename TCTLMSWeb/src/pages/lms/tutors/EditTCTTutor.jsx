import React, { useContext, useEffect, useState, useMemo, useRef } from "react";
import moment from "moment";
import {
    DropdownMenu, DropdownToggle, FormGroup,
    UncontrolledDropdown, Modal, ModalBody,
    ModalFooter,
    ModalHeader,
    DropdownItem, Form, Row, Input,
    Nav, NavItem, NavLink, TabContent, TabPane,
    Spinner
} from "reactstrap";
import PhoneInput, {
    formatPhoneNumber,
    formatPhoneNumberIntl,
    isPossiblePhoneNumber,
    isValidPhoneNumber
} from 'react-phone-number-input';
import 'react-phone-number-input/style.css'
import Select from "react-select";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ToastContainer } from "react-toastify";
import { toast } from "react-toastify";
import countryList from 'react-select-country-list'
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
import Head from "../../../layout/head/Head";
import { useForm } from "react-hook-form";
import classnames from "classnames";
import { createTutor, getTutorSkillset, getTutorById, deleteTutorSkillset  } from "../../../apiservices/TutorService";
import { getLookups, getAllRoles } from "../../../apiservices/LookupsService";
import SkillsetForm from "./SkillsetForm";
import Swal from "sweetalert2";
import "./EditTCTTutor.css";

const EditTCTTutor = (props) => {
    const formRef = useRef(null);
    const defaultGuid = '00000000-0000-0000-0000-000000000000';
    const [tutorSkillSets, setTutorSkillSets] = useState([]);
    const [courseList, setCourseList] = useState([]);
    const [gradeList, setGradeList] = useState([]);
    const [boardList, setBoardList] = useState([]);
    const [addCourse, setAddCourse] = useState(false);
    const createdBy = localStorage.getItem('userId');
    const [isAddModalOpen, setIsAddModalOpen] = useState(props.modalOpen);
    const options = useMemo(() => countryList().getData(), [])
    const [disabled, setDisabled] = useState(false);
    const [modal, setModal] = useState({
        edit: false,
        add: false,
    });
    const [id, setId] = useState(props.tutorId);
    const [userId, setUserId] = useState('');
    const [activeTab, setActiveTab] = useState(props?.optionsMode == 'Skillset' ? "2" : "1");
    const [formData, setFormData] = useState({
        id: defaultGuid,
        userId: defaultGuid,
        firstName: "",
        lastName: "",
        userCode: "",
        email: "",
        phone: "",
        alternatePhone: "",
        dob: "",
        gender: "",
        designationId: defaultGuid,
        roleId: "0",
        userType: defaultGuid,
        isSystemUser: true,
        isAdminUser: false,
        createdBy: createdBy,
        createdDate: new Date(),
        isActive: true,
        addresses:
        {
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
            isPrimary: true
        }
    });

    const [skillFormData, setSkillFormData] = useState({
        boardId: '',
        gradeId: '',
        subjectId: '',
        tutorId: ''
    });
    const [value, setValue] = useState('')
    const [currentPage, setCurredefaultGuidntPage] = useState(1);
    const [itemPerPage] = useState(10);
    const [genderList, setGenderList] = useState([]);
    const [designationList, setDesignationList] = useState([]);
    const [roleList, setRoleList] = useState([]);

    useEffect(() => {
        getTutorById(props.tutorId).then(async (response) => {
            setFormData(response.data);
        });
        getTutorSkillset(props.tutorId).then((response) => {
            setTutorSkillSets(response.data);
        });

        getLookups("600"/*gender*/).then((response) => {
            let temp = [];
            response.forEach(s => {
                temp.push({ value: s?.id, label: s?.typeCodeName, id: s?.id })
            })
            setGenderList(temp);
        });

        getLookups("500"/*Grade*/).then((response) => {
            let temp = [];
            response.forEach(s => {
                temp.push({ value: s?.id, label: s?.typeCodeName })
            })
            setCourseList(temp);
        });

        getLookups("400"/*Grade*/).then((response) => {
            let temp = [];
            response.forEach(s => {
                temp.push({ value: s?.id, label: s?.typeCodeName, id: s?.id })
            })
            setBoardList(temp);
        });

        getLookups("300"/*Grade*/).then((response) => {
            let temp = [];
            response.forEach(s => {
                temp.push({ value: s?.id, label: s?.typeCodeName })
            })
            setGradeList(temp);
        });

    }, []);


    // function to reset the form
    const resetForm = () => {
        setFormData({
            id: defaultGuid,
            userId: defaultGuid,
            firstName: "",
            lastName: "",
            userCode: "",
            email: "",
            phone: "",
            alternatePhone: "",
            dob: "",
            gender: "",
            designationId: defaultGuid,
            roleId: "0",
            userType: defaultGuid,
            isSystemUser: true,
            isAdminUser: false,
            createdBy: createdBy,
            createdDate: new Date(),
            isActive: true,
            addresses:
            {
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
                isPrimary: true
            }
        });
    };

    // function to close the form modal
    const onFormCancel = () => {
        setModal({ edit: false, add: false });
        setAddCourse(false);
        resetForm();
    };

    const dtColumns = [
        {
            name: "Board",
            minWidth: "150px",
            maxWidth: "150px",
            selector: (row) => row.boardName,
            sortable: true,
            cell: (row) => <span>{row.boardName}</span>,
        },
        {
            name: "Grade",
            selector: (row) => row.gradeName,
            minWidth: "50px",
            maxWidth: "100px",
            cell: (row) => (
                <span className="tb-amount">
                    {row.gradeName}
                </span>
            ),
            sortable: true,
        },
        {
            name: "Subject",
            selector: (row) => row.subjectName,
            sortable: true,
            hide: "sm",
            cell: (row) => (
                <span >
                    {row.subjectName}
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
                    className="icon ni ni-trash tct-et-delete"
                    title="Remove course"
                    style={{ cursor: "pointer", fontSize: "16px", color: "#e85347" }}
                    onClick={(e) => {
                        e.stopPropagation();
                        onDeleteCourseDetails(row.id);
                    }}
                >
                </span>
            ),
        },
    ];

    const onDeleteCourseDetails = (tutorDetailsId) => {
    Swal.fire({
        title: "Are you sure?",
        text: "This will remove the course from this tutor.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, delete it!",
    }).then((result) => {
        if (result.isConfirmed) {
            deleteTutorSkillset(tutorDetailsId).then((response) => {
                if (response?.succeeded === false) throw new Error(response.message);
                // Refresh the skillset list
                getTutorSkillset(props.tutorId).then((response) => {
                    setTutorSkillSets(response.data);
                });
                toast.success("Course removed successfully.");
            }).catch((error) => toast.error(error?.message || "Failed to remove course."));
        }
    });
};

    const RenderGrid = (props) => {
        return (<>
            <ReactDataTable
                data={props.dataSource}
                columns={dtColumns}
                pagination
                className="nk-tb-list tct-et-course-table"
            />
        </>)
    }

    const CloseButton = () => {
        return (
            <span className="btn-trigger toast-close-button" role="button">
                <Icon name="cross"></Icon>
            </span>
        );
    };

    // submit function to add a new item
    const onFormSubmit = (submitData) => {
        const inputData = { ...formData };
        var isValidPhone = isValidPhoneNumber(inputData.phone);
        if (!isValidPhone) {
            toast.error('Please enter the valid phone number.', {
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
        inputData['phone'] = formatPhoneNumberIntl(inputData.phone);
        inputData['dob'] = inputData.dob ? moment(inputData.dob).format("YYYY-MM-DD") : null;
        setDisabled(true);

        createTutor(inputData).then((response) => {
            resetForm();
            if (response.succeeded) {
                toggle('2');
                setIsAddModalOpen(false);
                props.modalStateChange(false);
                const data = response.data;
                setId(data.id);
                setUserId(data.userId);
                toast.success("Tutor Saved successfully.", {
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
            else {
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
        }).finally(() => setDisabled(false));
    };

    const skillsetCallback = (response) => {
        getTutorSkillset(id).then((response) => {
            setTutorSkillSets(response.data);
        });
        setAddCourse(false);
        toast.success("Skillset added successfully.", {
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


    const changeHandler = value => {
        alert(JSON.stringify(value));
        setValue(value)
    }

    const toggle = (tab) => {
        if (activeTab !== tab) setActiveTab(tab);
    };

    // Get current list, pagination
    const indexOfLastItem = currentPage * itemPerPage;
    const { errors, register, handleSubmit } = useForm();
    return (<React.Fragment>
        <Head title="Tutor"></Head>
        <Modal scrollable={true} isOpen={isAddModalOpen} toggle={() => {
            setIsAddModalOpen(false);
            setDisabled(false);
            props.modalStateChange(false);
        }} className="modal-dialog-centered totur-modal tct-edit-tutor" size="lg">
            <ModalHeader close={
                <button className="close" type="button" onClick={() => {
                    setIsAddModalOpen(false);
                    setDisabled(false);
                    props.modalStateChange(false);
                }} >
                    <Icon name="cross" />
                </button>
            }
            >
                <span className="tct-et-title">Edit Tutor</span>
                {(formData.firstName || formData.userCode) && (
                    <span className="tct-et-subtitle">
                        {[formData.firstName, formData.lastName].filter(Boolean).join(" ")}
                        {formData.userCode && <span className="tct-et-code">{formData.userCode}</span>}
                    </span>
                )}
            </ModalHeader>
            <ModalBody className="totur-modal-body">
                <div>
                    <PreviewCard>
                        <Nav tabs className="mt-n3 tct-et-tabs">
                            <NavItem>
                                <NavLink
                                    tag="a"
                                    disabled={props.optionsMode == 'Skillset'}
                                    href="#tab"
                                    className={classnames({ active: activeTab === "1" })}
                                    onClick={(ev) => {
                                        ev.preventDefault();
                                        toggle("1");
                                    }}
                                >
                                    <Icon name="user" />
                                    <span>Tutor Info</span>
                                </NavLink>
                            </NavItem>
                            <NavItem>
                                <NavLink
                                    tag="a"
                                    disabled={id == defaultGuid}
                                    href="#tab"
                                    className={classnames({ active: activeTab === "2" })}
                                    onClick={(ev) => {
                                        ev.preventDefault();
                                        toggle("2");
                                    }}
                                >
                                    <Icon name="book-read" />
                                    <span>Tutor Course</span>
                                </NavLink>
                            </NavItem>
                        </Nav>
                        <TabContent activeTab={activeTab} scrollable={true} >
                            <TabPane tabId="1">
                                <div>
                                    <div className="mt-6 tct-et-form">
                                        <Form className="row gy-3" ref={formRef} noValidate onSubmit={handleSubmit(onFormSubmit)}>
                                            <Row className="col-md-12">
                                                <div className="col-md-8">

                                                </div>
                                                <div className="col-md-4">

                                                </div>
                                            </Row>
                                            <div className="col-12 tct-et-section">
                                                <span className="tct-et-section-icon"><Icon name="user-circle" /></span>
                                                <div>
                                                    <h6>Personal Details</h6>
                                                    <p>Name, contact information and date of birth</p>
                                                </div>
                                            </div>
                                            <Row className="col-md-12">
                                                <Col md="4">
                                                    <FormGroup>
                                                        <label className="form-label" htmlFor="firstName">First Name</label>
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
                                                        <label className="form-label" htmlFor="dob">Date of birth </label>
                                                        <div className="form-control-wrap">
                                                            <DatePicker
                                                                selected={formData.dob ? new Date(formData.dob) : null}
                                                                dateFormat="dd/MM/yyyy"
                                                                showMonthDropdown
                                                                showYearDropdown
                                                                dropdownMode="select"
                                                                yearDropdownItemNumber={100}
                                                                scrollableYearDropdown
                                                                placeholderText="Select date of birth"
                                                                maxDate={new Date()}
                                                                onChange={(date) => {
                                                                    setFormData({ ...formData, dob: date || null });
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
                                                        <label className="form-label" htmlFor="email">Email </label>
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
                                                            }}>
                                                        </PhoneInput>
                                                    </FormGroup>
                                                </Col>
                                                <Col md="4">
                                                    <FormGroup>
                                                        <label className="form-label">Gender </label>
                                                        <div className="form-control-wrap">
                                                            <RSelect dataSource={genderList || []}
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
                                            <div className="col-12 tct-et-section">
                                                <span className="tct-et-section-icon"><Icon name="map-pin" /></span>
                                                <div>
                                                    <h6>Address</h6>
                                                    <p>Residential address of the tutor</p>
                                                </div>
                                            </div>
                                            <Row className="col-md-12">
                                                <Col md="6">
                                                    <FormGroup>
                                                        <label className="form-label" htmlFor="addressLine1">Address Line1</label>
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
                                                                        ...formData, address: {
                                                                            ...formData.address, addressLine1: e.target.value
                                                                        }
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
                                                        <label className="form-label" htmlFor="addressLine2">Address Line2 </label>
                                                        <div className="form-control-wrap">
                                                            <input
                                                                className="form-control"
                                                                type="text"
                                                                id="addressLine2"
                                                                name="addressLine2"
                                                                defaultValue={formData?.address?.addressLine2}
                                                                value={formData?.address?.addressLine2}
                                                                onChange={(e) => {
                                                                    setFormData({
                                                                        ...formData, address: {
                                                                            ...formData.address, addressLine2: e.target.value
                                                                        }
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
                                                        <label className="form-label" htmlFor="addressLine3">Address Line3 </label>
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
                                                                        ...formData, address: {
                                                                            ...formData.address, addressLine3: e.target.value
                                                                        }
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
                                                        <label className="form-label" htmlFor="city">City</label>
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
                                                                        ...formData, address: {
                                                                            ...formData.address, city: e.target.value
                                                                        }
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
                                                        <label className="form-label" htmlFor="zipCode">ZipCode</label>
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
                                                                        ...formData, address: {
                                                                            ...formData.address, zipCode: e.target.value
                                                                        }
                                                                    });
                                                                }}
                                                                placeholder="Enter zipcode"
                                                                ref={register({ required: "This field is required" })}
                                                            />
                                                            {errors.zipCode && <span className="invalid">{errors.zipCode.message}</span>}
                                                        </div>
                                                    </FormGroup>
                                                </Col>
                                                <Col sm="4">
                                                    <FormGroup>
                                                        <label className="form-label" htmlFor="state">State</label>
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
                                                                        ...formData, address: {
                                                                            ...formData.address, state: e.target.value
                                                                        }
                                                                    });
                                                                }}
                                                                placeholder="Enter state"
                                                                ref={register({ required: "This field is required" })}
                                                            />
                                                            {errors.state && <span className="invalid">{errors.state.message}</span>}
                                                        </div>
                                                    </FormGroup>
                                                </Col>
                                                <Col sm="4">
                                                    <FormGroup>
                                                        <label className="form-label" htmlFor="country">Country</label>
                                                        <div className="form-control-wrap">
                                                            <RSelect dataSource={options || []}
                                                                value1={formData?.address?.country}
                                                                onChangeHandler={(e) => {
                                                                    setFormData({
                                                                        ...formData, address: {
                                                                            ...formData?.address, country: e.value
                                                                        }
                                                                    });
                                                                }}
                                                                ref={register({ required: "This field is required" })}
                                                            />
                                                            {/* <Select options={options} value={value} onChange={changeHandler} />
                                            <input
                                                className="form-control"
                                                type="text"
                                                name="country"
                                                id="country"
                                                defaultValue={formData?.address?.country}
                                                value={formData?.address?.country}
                                                onChange={(e) => {
                                                    setFormData({
                                                        ...formData, address: {
                                                            ...formData?.address, country: e.target.value
                                                        }
                                                    });
                                                }}
                                                placeholder="Enter name"
                                                ref={register({ required: "This field is required" })}
                                            /> */}
                                                            {errors.country && <span className="invalid">{errors.country.message}</span>}
                                                        </div>
                                                    </FormGroup>
                                                </Col>
                                            </Row>
                                            {/* <Col size="12">
                                        <ul className="align-center flex-wrap flex-sm-nowrap gx-4 gy-2">
                                            <li>
                                                <Button color="primary" size="md" type="submit">
                                                    Add
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
                                    </Col> */}
                                        </Form>
                                    </div>
                                </div>
                            </TabPane>
                            <TabPane tabId="2">
                                <Block className="tct-et-courses">
                                    <div className="tct-et-courses-head">
                                        <div>
                                            <h6>
                                                Assigned Courses
                                                <span className="tct-et-count">{tutorSkillSets?.length || 0}</span>
                                            </h6>
                                            <p>Boards, grades and subjects this tutor can teach</p>
                                        </div>
                                        <button type="button" className="btn btn-primary d-none d-sm-inline-flex" onClick={() => {
                                            setAddCourse(true);
                                        }}>
                                            <em className="icon ni ni-plus"></em><span>Add Course</span>
                                        </button>
                                    </div>
                                    {tutorSkillSets?.length > 0 ? (
                                        <RenderGrid dataSource={tutorSkillSets}></RenderGrid>
                                    ) : (
                                        <div className="tct-et-empty">
                                            <span className="tct-et-empty-icon"><Icon name="book-read" /></span>
                                            <h6>No courses assigned yet</h6>
                                            <p>Use “Add Course” to assign a board, grade and subjects to this tutor.</p>
                                        </div>
                                    )}
                                </Block>
                            </TabPane>
                        </TabContent>


                        <Modal isOpen={addCourse}
                            toggle={() => onFormCancel()} className="modal-dialog-centered totur-modal tct-edit-tutor-course">
                            <ModalBody className="totur-modal-body">
                                <div className="tct-etc-head">
                                    <span className="tct-etc-icon"><Icon name="book-read" /></span>
                                    <div>
                                        <h5 className="title">Add Course</h5>
                                        <p>Choose the board, grade and subjects this tutor can teach.</p>
                                    </div>
                                    <button
                                        type="button"
                                        className="tct-etc-close"
                                        aria-label="Close"
                                        onClick={(ev) => {
                                            ev.preventDefault();
                                            onFormCancel();
                                            setAddCourse(false);
                                        }}
                                    >
                                        <Icon name="cross" />
                                    </button>
                                </div>
                                <div className="tct-etc-body">
                                    <div>
                                        <SkillsetForm tutorId={id} skillsetCallback={skillsetCallback}></SkillsetForm>
                                    </div>
                                </div>
                            </ModalBody>
                        </Modal>
                    </PreviewCard>
                    <ToastContainer />
                </div>
            </ModalBody>
            {props?.optionsMode != 'Skillset' &&
                <ModalFooter className="bg-light tct-et-footer">
                    <Col size="12">
                        <ul className="align-center flex-wrap flex-sm-nowrap gx-4 gy-2">
                            <li>
                                <Button disabled={disabled} color="primary" size="md" onClick={() => {
                                    if (!disabled) {
                                        formRef.current.props.onSubmit()
                                    }
                                }}>
                                    {disabled ? (
                                        <>
                                            <Spinner size="sm" className="mr-1" /> Saving...
                                        </>
                                    ) : (
                                        "Edit Tutor"
                                    )}
                                </Button>
                            </li>
                            <li>
                                <a href="#cancel" onClick={(ev) => {
                                    ev.preventDefault();
                                    setIsAddModalOpen(false);
                                    props.modalStateChange(false);
                                }}
                                    className="link link-light" >
                                    Cancel
                                </a>
                            </li>
                        </ul>
                    </Col>
                </ModalFooter>
            }
        </Modal>
    </React.Fragment >);
}
export default EditTCTTutor;
