import React, { useContext, useEffect, useState, useRef } from "react";
import moment from "moment";
import {
    DropdownMenu,
    DropdownToggle,
    FormGroup,
    UncontrolledDropdown,
    Modal,
    ModalBody,
    ModalFooter,
    ModalHeader,
    Spinner,
    Row,
    Form,
} from "reactstrap";
import DatePicker from "react-datepicker";
import PhoneInput, {
    formatPhoneNumber,
    formatPhoneNumberIntl,
    isPossiblePhoneNumber,
    isValidPhoneNumber
} from 'react-phone-number-input';
import 'react-phone-number-input/style.css'
import { getLookups, getAllRoles } from "../../../apiservices/LookupsService";
import Swal from "sweetalert2";
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
    PreviewCard,
    UserAvatar,
    PaginationComponent,
    Button,
    DataTableHead,
    DataTableRow,
    DataTableItem,
    TooltipComponent,
    RSelect,
    PreviewAltCard,
    ReactDataTable,
} from "../../../components/Component";
import Content from "../../../layout/content/Content";
import Head from "../../../layout/head/Head";
import { findUpper } from "../../../utils/Utils";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { getUsers, createUser, deleteUser, getTCTUserById } from "../../../apiservices/UserService";
import UserAvatar1 from "../../../components/user/UserAvatar1"
import { findUpper1, getColor } from "../../../utils/Utils";

const EditTCTUser = (props) => {
    const [loading, setLoading] = useState(false);
    const defaultGuid = '00000000-0000-0000-0000-000000000000';
    const [userDataSource, setUserDataSource] = useState();
    const [sm, updateSm] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(props.modalOpen);
    const [isDelete, setIsDelete] = useState(false);
    const [genderList, setGenderList] = useState([]);
    const [designationList, setDesignationList] = useState([]);
    const [roleList, setRoleList] = useState([]);
    const [formData, setFormData] = useState({
        id: defaultGuid,
        firstName: "",
        lastName: "",
        userCode: "",
        email: "",
        phone: "",
        alternatePhone: "",
        dob: "",
        gender: "",
        designationId: "",
        userType: defaultGuid,
        isSystemUser: true,
        isAdminUser: false,
        createdBy: defaultGuid,
        createdDate: new Date(),
        isActive: true,
        addresses:
        {
            createdBy: defaultGuid,
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

    const formRef = useRef(null);
    useEffect(() => {

        getLookups("600"/*gender*/).then((response) => {
            let temp = [];
            response.forEach(s => {
                temp.push({ value: s?.id, label: s?.typeCodeName, id: s?.id })
            })
            setGenderList(temp);
        });

        getLookups("700"/*designation*/).then((response) => {
            let temp = [];
            response.forEach(s => {
                temp.push({ value: s?.id, label: s?.typeCodeName })
            })
            setDesignationList(temp);
        });

        getAllRoles().then((response) => {
            let temp = [];
            response.forEach(s => {
                temp.push({ value: s?.id.toString(), label: s?.roleName })
            })
            setRoleList(temp);
        });
    }, []);

    useEffect(() => {
        setFormData(props.formData);
    }, []);

    const signedInRole = localStorage.getItem("userRole") || "";
    const isOwnProfile = formData.id
        && formData.id.toLowerCase() === localStorage.getItem("userId")?.toLowerCase();
    const isSelfRoleLocked = isOwnProfile && ["student", "tutor"].includes(signedInRole.toLowerCase());
    const lockedDesignation = designationList.find(
        (item) => item.label?.toLowerCase() === signedInRole.toLowerCase()
    );
    const lockedRole = roleList.find(
        (item) => item.label?.toLowerCase() === signedInRole.toLowerCase()
    );

    const onEditFormSubmit = (data) => {
        setLoading(true);
        const inputData = {
            ...formData,
            dob: formData.dob ? moment(formData.dob).format("YYYY-MM-DD") : null,
            designationId: isSelfRoleLocked && lockedDesignation
                ? lockedDesignation.value
                : formData.designationId,
            roleId: isSelfRoleLocked
                ? (lockedRole?.value || localStorage.getItem("roleId") || formData.roleId)
                : formData.roleId,
        };
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
            setLoading(false);
            return;
        }
        inputData['phone'] = formatPhoneNumberIntl(inputData.phone);
        createUser(inputData).then((response) => {
            setEditModalOpen(false);
            if (typeof (props.onModalCloseCallback) == 'function') {
                props.onModalCloseCallback();
            }
            toast.success("Data updated successfully.", {
                position: "top-right",
                autoClose: true,
                hideProgressBar: true,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: false,
                closeButton: <CloseButton />,
            });
            setLoading(false);
            if (typeof (props.submitCallback) == 'function') {
                props.submitCallback();
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

    const { errors, register, handleSubmit } = useForm();
    return (
        <React.Fragment>
            <Modal scrollable={true} isOpen={editModalOpen} toggle={() => setEditModalOpen(false)} className="modal-dialog-centered" size="lg">
                <ModalHeader
                    // toggle={toggle}
                    close={
                        <button className="close" type="button" onClick={() => {
                            setEditModalOpen(false);
                            if (typeof (props.onModalCloseCallback) == 'function') {
                                props.onModalCloseCallback();
                            }

                        }} >
                            <Icon name="cross" />
                        </button>
                    }
                >
                    Edit User
                </ModalHeader>
                <ModalBody>
                    <div>
                        <PreviewCard>
                            <Form className="row gy-4" ref={formRef} noValidate onSubmit={handleSubmit(onEditFormSubmit)}>
                                <Row className="col-md-12">
                                    <Col md="6">
                                        <FormGroup>
                                            <label className="form-label" htmlFor="firstName">First Name</label>
                                            <input
                                                className="form-control"
                                                type="text"
                                                name="firstName"
                                                id="firstName"
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
                                    <Col md="6">
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
                                </Row>
                                <Row className="col-md-12">
                                    <Col sm="6">
                                        <FormGroup>
                                            <label className="form-label" htmlFor="dob">Date of birth</label>
                                            <div className="form-control-wrap">
                                                <DatePicker
                                                    defaultValue={formData.dob}
                                                    selected={formData.dob ? new Date(formData.dob) : null}
                                                    dateFormat="dd/MM/yyyy"
                                                    //value={formData.dob}
                                                    showMonthDropdown
                                                    showYearDropdown
                                                    dropdownMode="select"
                                                    yearDropdownItemNumber={100}
                                                    scrollableYearDropdown
                                                    placeholderText="Select date of birth"
                                                    maxDate={new Date()}
                                                    onYearChange={(date) => {
                                                        setFormData({ ...formData, dob: date });
                                                    }}
                                                    onChange={(date) => {
                                                        setFormData({ ...formData, dob: date });
                                                    }}
                                                    className="form-control date-picker"
                                                />
                                            </div>
                                            {errors.dob && <span className="invalid">{errors.dob.message}</span>}
                                        </FormGroup>
                                    </Col>
                                    <Col md="6">
                                        <FormGroup>
                                            <label className="form-label" htmlFor="email">Email </label>
                                            <input
                                                className="form-control"
                                                type="text"
                                                name="email"
                                                value={formData.email}
                                                defaultValue={formData.email}                                                
                                                placeholder="Enter email"
                                                readOnly="true"
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
                                </Row>
                                <Row className="col-md-12">
                                    <Col sm="6">
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
                                    <Col md="6">
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
                                <Row className="col-md-12">
                                    <Col md="6">
                                        <FormGroup>
                                            <label className="form-label">Designation </label>
                                            <div className="form-control-wrap">
                                                {isSelfRoleLocked ? (
                                                    <input className="form-control" value={signedInRole} disabled />
                                                ) : (
                                                    <RSelect
                                                        dataSource={designationList || []}
                                                        value1={formData.designationId}
                                                        onChangeHandler={(e) => {
                                                            setFormData({ ...formData, designationId: e.value });
                                                        }}
                                                        ref={register({ required: "This field is required" })}
                                                    />
                                                )}
                                            </div>
                                            {errors.designationId && <span className="invalid">{errors.designationId.message}</span>}
                                        </FormGroup>
                                    </Col>
                                    <Col md="6">
                                        <FormGroup>
                                            <label className="form-label">Role </label>
                                            <div className="form-control-wrap">
                                                {isSelfRoleLocked ? (
                                                    <input className="form-control" value={signedInRole} disabled />
                                                ) : (
                                                    <RSelect
                                                        dataSource={roleList || []}
                                                        value1={formData.roleId}
                                                        onChangeHandler={(e) => {
                                                            setFormData({ ...formData, roleId: e.value });
                                                        }}
                                                        ref={register({ required: "This field is required" })}
                                                    />
                                                )}
                                            </div>
                                            {errors.roleId && <span className="invalid">{errors.roleId.message}</span>}
                                        </FormGroup>
                                    </Col>
                                </Row>
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
                                    <Col sm="12">
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
                                </Row>
                                <Row className="col-md-12">
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
                                    <Col sm="6">
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
                                                    placeholder="Enter name"
                                                    ref={register({ required: "This field is required" })}
                                                />
                                                {errors.zipCode && <span className="invalid">{errors.zipCode.message}</span>}
                                            </div>
                                        </FormGroup>
                                    </Col>
                                </Row>
                                <Row className="col-md-12">
                                    <Col sm="6">
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
                                                    placeholder="Enter name"
                                                    ref={register({ required: "This field is required" })}
                                                />
                                                {errors.state && <span className="invalid">{errors.state.message}</span>}
                                            </div>
                                        </FormGroup>
                                    </Col>
                                    <Col sm="6">
                                        <FormGroup>
                                            <label className="form-label" htmlFor="country">Country</label>
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
                                                            ...formData, address: {
                                                                ...formData?.address, country: e.target.value
                                                            }
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
                            </Form>
                        </PreviewCard>
                    </div>
                </ModalBody>
                <ModalFooter className="bg-light">
                    <Col size="12">
                        <ul className="align-center flex-wrap flex-sm-nowrap gx-4 gy-2">
                            <li>
                                <Button color="primary" size="md" onClick={() => {
                                    formRef.current.props.onSubmit()
                                }}>
                                    {loading ? <><Spinner size="sm" color="light"></Spinner> <span>{"Updating..."}</span></> : "Update User"}
                                </Button>
                            </li>
                            <li>
                                <a
                                    href="#cancel"
                                    onClick={(ev) => {
                                        ev.preventDefault();
                                        // onFormCancel();
                                        setEditModalOpen(false);
                                        if (typeof (props.onModalCloseCallback) == 'function') {
                                            props.onModalCloseCallback();
                                        }
                                    }}
                                    className="link link-light"
                                >
                                    Cancel
                                </a>
                            </li>
                        </ul>
                    </Col>
                </ModalFooter>
            </Modal>

            <ToastContainer />

        </React.Fragment >
    );
};

export default EditTCTUser;
