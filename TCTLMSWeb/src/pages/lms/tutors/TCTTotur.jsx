import React, { useContext, useEffect, useState, useMemo, useRef } from "react";
import moment from "moment";
import {
    DropdownMenu, DropdownToggle, FormGroup,
    UncontrolledDropdown, Modal, ModalBody,
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
import Content from "../../../layout/content/Content";
import Head from "../../../layout/head/Head";
import { useForm } from "react-hook-form";
import classnames from "classnames";
import { createTutor } from "../../../apiservices/TutorService";
import { getLookups, getAllRoles } from "../../../apiservices/LookupsService";
import SkillsetForm from "./SkillsetForm";



// Coordinator-only look for the Tutor page (.tct-tutorpage) and its Course modal (.tct-course-modal).
// Styles only: the form, SkillsetForm, selects and handlers are unchanged.
const tutorPageStyle = `
  /* ---- Page ---- */
  .tct-tutorpage .nk-block-head { padding-bottom: 16px; }
  .tct-tutorpage .nk-block-title.page-title { margin: 0; font-size: 1.6rem; font-weight: 700; color: #1c2b46; }
  .tct-tutorpage .card-preview { border: 1px solid #e5e9f2; border-radius: 12px; box-shadow: 0 1px 3px rgba(31, 43, 58, 0.05); }
  .tct-tutorpage .card-preview > .card-inner { padding: 6px 24px 24px; }

  /* Tabs */
  .tct-tutorpage .nav-tabs { margin-top: 0 !important; border-bottom: 1px solid #e5e9f2; }
  .tct-tutorpage .nav-tabs .nav-link {
    margin-right: 24px; padding: 16px 2px; font-size: 14px; font-weight: 600; color: #6b7a90;
    transition: color 0.15s ease;
  }
  .tct-tutorpage .nav-tabs .nav-link:after { height: 3px; border-radius: 3px 3px 0 0; background: #854fff; }
  .tct-tutorpage .nav-tabs .nav-link:hover,
  .tct-tutorpage .nav-tabs .nav-link.active { color: #854fff; }
  .tct-tutorpage .nav-tabs .nav-link.disabled { opacity: 0.45; }
  .tct-tutorpage .tab-content { padding-top: 22px; }
  .tct-tutorpage .tab-pane .mt-6 { margin-top: 0 !important; }

  /* Form fields */
  .tct-tutorpage .tab-pane .form-group { margin-bottom: 16px; }
  .tct-tutorpage .tab-pane .form-label { margin-bottom: 6px; font-size: 13px; font-weight: 600; color: #364a63; }
  .tct-tutorpage .tab-pane .form-control {
    height: 40px; padding: 0 14px; font-size: 14px; color: #364a63;
    background-color: #fff; border: 1px solid #dbdfea; border-radius: 8px; box-shadow: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .tct-tutorpage .tab-pane .form-control::placeholder { color: #a3aec2; }
  .tct-tutorpage .tab-pane .form-control:hover { border-color: #c4b0ff; }
  .tct-tutorpage .tab-pane .form-control:focus { border-color: #854fff; box-shadow: 0 0 0 3px rgba(133, 79, 255, 0.12); }
  .tct-tutorpage .tab-pane .form-control:disabled,
  .tct-tutorpage .tab-pane .form-control[readonly] { color: #8094ae; background-color: #f5f6fa; cursor: not-allowed; }
  .tct-tutorpage .tab-pane .react-datepicker-wrapper,
  .tct-tutorpage .tab-pane .react-datepicker__input-container { display: block; width: 100%; }
  /* Phone: country flag/code + number look like one input */
  .tct-tutorpage .tab-pane .PhoneInput {
    display: flex; align-items: center; gap: 10px; height: 40px; padding: 0 12px;
    background: #fff; border: 1px solid #dbdfea; border-radius: 8px; transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .tct-tutorpage .tab-pane .PhoneInput:hover { border-color: #c4b0ff; }
  .tct-tutorpage .tab-pane .PhoneInput:focus-within { border-color: #854fff; box-shadow: 0 0 0 3px rgba(133, 79, 255, 0.12); }
  .tct-tutorpage .tab-pane .PhoneInputCountry { margin: 0; }
  .tct-tutorpage .tab-pane .PhoneInputInput {
    flex: 1 1 auto; min-width: 0; height: 38px; padding: 0; font-size: 14px; color: #364a63;
    background: transparent; border: 0; outline: none;
  }
  .tct-tutorpage .tab-pane .PhoneInputInput::placeholder { color: #a3aec2; }
  /* Dropdowns (Gender, Country): shared RSelect / react-select */
  .tct-tutorpage .react-select__control { min-height: 40px; border: 1px solid #dbdfea; border-radius: 8px; box-shadow: none; font-size: 14px; }
  .tct-tutorpage .react-select__control:hover { border-color: #c4b0ff; }
  .tct-tutorpage .react-select__control--is-focused { border-color: #854fff !important; box-shadow: 0 0 0 3px rgba(133, 79, 255, 0.12) !important; }
  .tct-tutorpage .react-select__placeholder { color: #a3aec2; }
  .tct-tutorpage .react-select__single-value { color: #364a63; }
  .tct-tutorpage .react-select__indicator-separator { display: none; }
  .tct-tutorpage .react-select__dropdown-indicator { color: #854fff; }
  .tct-tutorpage .react-select__menu { z-index: 1060; margin-top: 6px; border: 1px solid #e5e9f2; border-radius: 10px; box-shadow: 0 10px 28px rgba(31, 43, 58, 0.14); overflow: hidden; }
  .tct-tutorpage .react-select__menu-list { max-height: 240px; padding: 4px; }
  .tct-tutorpage .react-select__option { padding: 8px 12px; border-radius: 6px; font-size: 14px; color: #364a63; cursor: pointer; }
  .tct-tutorpage .react-select__option--is-focused { background: #f5f1ff; color: #4c1fd0; }
  .tct-tutorpage .react-select__option--is-selected { background: #854fff; color: #fff; }

  /* Add / Cancel */
  .tct-tutorpage .tab-pane form .btn-primary { height: 40px; padding: 0 24px; border-radius: 8px; font-weight: 600; }
  .tct-tutorpage .tab-pane form .link.link-light {
    display: inline-flex; align-items: center; height: 40px; padding: 0 20px; font-weight: 600; color: #526484;
    background: #fff; border: 1px solid #dbdfea; border-radius: 8px; transition: border-color 0.15s ease, color 0.15s ease, background-color 0.15s ease;
  }
  .tct-tutorpage .tab-pane form .link.link-light:hover { color: #854fff; background: #f5f1ff; border-color: #c4b0ff; }

  /* Tutor Course tab: Add button above the table, table in a card */
  @media (min-width: 576px) {
    .tct-tutorpage .tab-pane .nk-block-tools-opt { float: none !important; display: flex !important; justify-content: flex-end; margin: 0 0 14px; list-style: none; }
  }
  .tct-tutorpage .tab-pane .nk-block-tools-opt .btn { height: 38px; display: inline-flex; align-items: center; gap: 6px; padding: 0 16px; border-radius: 8px; font-weight: 600; }
  .tct-tutorpage .tab-pane .dataTables_wrapper > .row:empty { display: none; }
  .tct-tutorpage .tab-pane .dataTables_wrapper > div.nk-tb-list:not(.dataTables_wrapper) { border: 1px solid #e5e9f2; border-radius: 10px; }
  .tct-tutorpage .tab-pane .rdt_TableHeadRow { min-height: 44px; background: #f4f6fb; border-bottom: 1px solid #e5e9f2; border-radius: 10px 10px 0 0; }
  .tct-tutorpage .tab-pane .rdt_TableCol { font-size: 12px; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; color: #6b7a90; }
  .tct-tutorpage .tab-pane .rdt_TableRow { min-height: 50px; font-size: 14px; color: #526484; }
  .tct-tutorpage .tab-pane .rdt_TableRow:not(:last-of-type) { border-bottom-color: #eef0f5; }
  .tct-tutorpage .tab-pane .rdt_TableRow:hover { background: #faf8ff; }
  /* LeadLists.css leaks an unscoped .pagination rule (padding, border-top, white background); undo it here. */
  .tct-tutorpage .tab-pane .dataTables_wrapper .pagination { margin: 0; padding: 0; border-top: 0; background: transparent; }
  .tct-tutorpage .tab-pane .dataTables_wrapper .row.align-items-center { margin: 14px 0 0; }

  /* Field grid: 3 columns on wide screens, 2 on medium, 1 on narrow */
  @media (min-width: 768px) and (max-width: 1199.98px) {
    .tct-tutorpage .tab-pane form .row > .col-md-4,
    .tct-tutorpage .tab-pane form .row > .col-sm-4 { flex: 0 0 50%; max-width: 50%; }
  }
  @media (max-width: 767.98px) {
    .tct-tutorpage .tab-pane form .row > .col-sm-4 { flex: 0 0 100%; max-width: 100%; }
    .tct-tutorpage .card-preview > .card-inner { padding: 4px 16px 18px; }
  }

  /* ---- Compact spacing (overrides the earlier page rules above) ---- */
  .tct-tutorpage .nk-block-head { padding-bottom: 12px; }
  .tct-tutorpage .card-preview > .card-inner { padding: 4px 22px 18px; }
  .tct-tutorpage .nav-tabs .nav-link { padding: 13px 2px; }
  .tct-tutorpage .tab-content { padding-top: 14px; }
  /* The form's first row only holds two empty columns: hide it so the fields start right under the tabs. */
  .tct-tutorpage .tab-pane form > .row:first-child:has(> .col-md-8:empty):has(> .col-md-4:empty) { display: none; }
  /* Form rows: smaller vertical gutters than the theme's gy-3 (which uses !important). */
  .tct-tutorpage .tab-pane form.gy-3 { margin-top: 0 !important; margin-bottom: 0 !important; }
  .tct-tutorpage .tab-pane form.gy-3 > div { padding-top: 0 !important; padding-bottom: 0 !important; }
  .tct-tutorpage .tab-pane .form-group { margin-bottom: 14px; }
  .tct-tutorpage .tab-pane .form-label { margin-bottom: 5px; }
  /* Tighter horizontal gutters between fields */
  .tct-tutorpage .tab-pane form .row > [class*="col-"] { padding-left: 10px; padding-right: 10px; }
  .tct-tutorpage .tab-pane form > .row { margin-left: -10px; margin-right: -10px; padding-left: 0; padding-right: 0; }
  /* Higher-contrast placeholders */
  .tct-tutorpage .tab-pane .form-control::placeholder,
  .tct-tutorpage .tab-pane .PhoneInputInput::placeholder,
  .tct-tutorpage .react-select__placeholder { color: #8a96ab; }
  /* Add / Cancel row directly under the fields */
  .tct-tutorpage .tab-pane form ul.align-center { margin-top: 2px; }
  /* Add button focus ring */
  .tct-tutorpage .tab-pane form .btn-primary:focus-visible,
  .tct-tutorpage .tab-pane form .link.link-light:focus-visible { box-shadow: 0 0 0 3px rgba(133, 79, 255, 0.22); outline: none; }

  /* ---- Course modal ---- */
  .tct-course-modal.modal-dialog { max-width: min(620px, calc(100vw - 32px)); }
  .tct-course-modal .modal-content { border: 0; border-radius: 14px; box-shadow: 0 24px 48px rgba(31, 43, 58, 0.2); }
  .tct-course-modal .modal-body { position: relative; padding: 24px 28px 28px; max-height: calc(100vh - 64px); overflow-y: auto; }
  .tct-course-modal .modal-body > .close {
    position: absolute; top: 16px; right: 16px; z-index: 2; display: inline-flex; align-items: center; justify-content: center;
    width: 34px; height: 34px; border-radius: 8px; color: #8094ae; opacity: 1; transition: background-color 0.15s ease, color 0.15s ease;
  }
  .tct-course-modal .modal-body > .close:hover { color: #854fff; background: #f5f1ff; }
  .tct-course-modal .modal-body > .p-2 { padding: 0 !important; }
  .tct-course-modal .title { margin: 0; padding-right: 40px; font-size: 1.2rem; font-weight: 700; color: #1c2b46; }
  .tct-course-modal .modal-body > .p-2 > .mt-4 { margin-top: 18px !important; }
  .tct-course-modal .form-label { margin-bottom: 6px; font-size: 13px; font-weight: 600; color: #364a63; }
  /* Board / Grade: styled native selects (the open option list is drawn by the browser) */
  .tct-course-modal select.form-control {
    -webkit-appearance: none; -moz-appearance: none; appearance: none;
    height: 42px; padding: 0 38px 0 14px; font-size: 14px; color: #364a63; cursor: pointer;
    background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23854fff' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 14px center / 12px 12px;
    border: 1px solid #dbdfea; border-radius: 8px; box-shadow: none; transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .tct-course-modal select.form-control:hover { border-color: #c4b0ff; }
  .tct-course-modal select.form-control:focus { border-color: #854fff; box-shadow: 0 0 0 3px rgba(133, 79, 255, 0.12); outline: none; }
  .tct-course-modal select.form-control:disabled { color: #8094ae; background-color: #f5f6fa; cursor: not-allowed; }
  .tct-course-modal select option { color: #364a63; background: #fff; }
  .tct-course-modal select option:checked { color: #4c1fd0; background: #f1ebff; }
  /* Subject: shared RSelect (react-select) */
  .tct-course-modal .react-select__control { min-height: 42px; border: 1px solid #dbdfea; border-radius: 8px; box-shadow: none; font-size: 14px; }
  .tct-course-modal .react-select__control:hover { border-color: #c4b0ff; }
  .tct-course-modal .react-select__control--is-focused { border-color: #854fff !important; box-shadow: 0 0 0 3px rgba(133, 79, 255, 0.12) !important; }
  .tct-course-modal .react-select__value-container { padding: 2px 12px; }
  .tct-course-modal .react-select__placeholder { color: #a3aec2; }
  .tct-course-modal .react-select__indicator-separator { display: none; }
  .tct-course-modal .react-select__dropdown-indicator { color: #854fff; }
  .tct-course-modal .react-select__menu { z-index: 1060; margin-top: 6px; border: 1px solid #e5e9f2; border-radius: 10px; box-shadow: 0 10px 28px rgba(31, 43, 58, 0.14); overflow: hidden; }
  .tct-course-modal .react-select__menu-list { max-height: 220px; padding: 4px; }
  .tct-course-modal .react-select__option { padding: 8px 12px; border-radius: 6px; font-size: 14px; color: #364a63; cursor: pointer; }
  .tct-course-modal .react-select__option--is-focused { background: #f5f1ff; color: #4c1fd0; }
  .tct-course-modal .react-select__option--is-selected { background: #854fff; color: #fff; }
  .tct-course-modal .react-select__multi-value { background: #f1ebff; border-radius: 6px; }
  .tct-course-modal .react-select__multi-value__label { color: #4c1fd0; font-weight: 600; }
  .tct-course-modal .react-select__multi-value__remove { color: #854fff; border-radius: 0 6px 6px 0; }
  .tct-course-modal .react-select__multi-value__remove:hover { color: #fff; background: #854fff; }
  /* Add Skills */
  .tct-course-modal .btn-primary { height: 42px; padding: 0 22px; border-radius: 8px; font-weight: 600; }
  @media (max-width: 575.98px) {
    .tct-course-modal .modal-body { padding: 20px 18px 22px; }
  }
`;

const TCTTutor = () => {

    const defaultGuid = '00000000-0000-0000-0000-000000000000';
    const [tutorSkillSets, setTutorSkillSets] = useState([]);
    const [courseList, setCourseList] = useState([]);
    const [gradeList, setGradeList] = useState([]);
    const [boardList, setBoardList] = useState([]);
    const [addCourse, setAddCourse] = useState(false);
    const [loading, setLoading] = useState(false);
    const createdBy = localStorage.getItem('userId');
    // Coordinator: redesigned look (.tct-tutorpage / .tct-course-modal). Other roles keep the existing appearance.
    const isCoordinatorView = (localStorage.getItem("userRole") || "").trim().toLowerCase() === "coordinator";
    const options = useMemo(() => countryList().getData(), [])

    // Country dropdown: choose up/down and a max height from the space actually visible around the input,
    // measured each time the menu opens (the menu floats, so the form never moves).
    const countryWrapRef = useRef(null);
    const [countryMenu, setCountryMenu] = useState({ open: false, placement: "bottom", maxHeight: 240 });
    const openCountryMenu = () => {
        const preferred = 240, minimum = 120, gap = 16;
        const control = countryWrapRef.current?.querySelector(".react-select__control");
        let placement = "bottom", maxHeight = preferred;
        if (control) {
            const rect = control.getBoundingClientRect();
            const header = document.querySelector(".nk-header-fixed");
            const topLimit = header ? Math.max(header.getBoundingClientRect().bottom, 0) : 0;
            const spaceBelow = window.innerHeight - rect.bottom - gap;
            const spaceAbove = rect.top - topLimit - gap;
            if (spaceBelow < preferred && spaceAbove > spaceBelow) {
                placement = "top";
                maxHeight = Math.min(preferred, spaceAbove);
            } else {
                maxHeight = Math.min(preferred, spaceBelow);
            }
        }
        setCountryMenu({ open: true, placement, maxHeight: Math.max(Math.floor(maxHeight), minimum) });
    };
    const closeCountryMenu = () => setCountryMenu((m) => ({ ...m, open: false }));
    useEffect(() => {
        // a fixed menu doesn't follow the page, so close it on resize (scrolling is handled by closeMenuOnScroll)
        if (!countryMenu.open) return undefined;
        window.addEventListener("resize", closeCountryMenu);
        return () => window.removeEventListener("resize", closeCountryMenu);
    }, [countryMenu.open]);

    const [modal, setModal] = useState({
        edit: false,
        add: false,
    });
    const [id, setId] = useState(defaultGuid);
    const [userId, setUserId] = useState('');
    const [activeTab, setActiveTab] = useState("1");
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
                <span className={"icon ni ni-trash"} onClick={() => {
                    onDeleteCourseDetails(row.id);
                }}
                >
                </span>
            ),
        },
    ];

    const onDeleteCourseDetails = (tutorDetailsId) => {

    }

    const RenderGrid = (props) => {
        return (<>
            <ReactDataTable
                data={props.dataSource}
                columns={dtColumns}
                pagination
                className="nk-tb-list"
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
    
    const onFormSubmit = (submitData) => {
        const inputData = formData;
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
        inputData['dob'] = moment(inputData.dob).format("YYYY-MM-DD");
        setLoading(true);
        createTutor(inputData).then((response) => {
            resetForm();
            if (response.succeeded) {
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
        }).finally(() => setLoading(false));
    };

    const skillsetCallback = (response) => {
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
        <Content>
            {isCoordinatorView && <style>{tutorPageStyle}</style>}
            <div className={isCoordinatorView ? "tct-tutorpage" : undefined}>
            <BlockHead size="sm">
                <BlockBetween>
                    <BlockHeadContent>
                        <BlockTitle tag="h3" page>
                            Tutor
                        </BlockTitle>
                    </BlockHeadContent>
                </BlockBetween>
            </BlockHead>
            <PreviewCard>
                <Nav tabs className="mt-n3">
                    <NavItem>
                        <NavLink
                            tag="a"
                            href="#tab"
                            className={classnames({ active: activeTab === "1" })}
                            onClick={(ev) => {
                                ev.preventDefault();
                                toggle("1");
                            }}
                        >
                            Tutor Info
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
                            Tutor Course
                        </NavLink>
                    </NavItem>
                </Nav>
                <TabContent activeTab={activeTab}>
                    <TabPane tabId="1">
                        <div>
                            <div className="mt-6">
                                <Form className="row gy-3" noValidate onSubmit={handleSubmit(onFormSubmit)}>
                                    <Row className="col-md-12">
                                        <div className="col-md-8">

                                        </div>
                                        <div className="col-md-4">

                                        </div>
                                    </Row>
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
                                                <div className="form-control-wrap" ref={countryWrapRef}>
                                                    <RSelect dataSource={options || []}
                                                        value1={formData?.address?.country}
                                                        // Float the menu (fixed) so opening it never scrolls or stretches the page;
                                                        // direction and height come from openCountryMenu; close if the page scrolls.
                                                        menuPosition="fixed"
                                                        menuIsOpen={countryMenu.open}
                                                        onMenuOpen={openCountryMenu}
                                                        onMenuClose={closeCountryMenu}
                                                        menuPlacement={countryMenu.placement}
                                                        maxMenuHeight={countryMenu.maxHeight}
                                                        minMenuHeight={Math.min(120, countryMenu.maxHeight)}
                                                        closeMenuOnScroll={true}
                                                        styles={{
                                                            menuPortal: (base) => ({ ...base, zIndex: 1060 }),
                                                            // keep the height react-select measured for the viewport (page CSS caps lists at 240px)
                                                            menuList: (base) => ({ ...base, maxHeight: `${base.maxHeight}px !important` }),
                                                        }}
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
                    </TabPane>
                    <TabPane tabId="2">
                        <Block>
                            <li class="nk-block-tools-opt d-none d-sm-block" style={{ float: 'right' }}>
                                <a class="btn btn-primary" data-bs-toggle="modal" href="#" onClick={() => {
                                    setAddCourse(true);
                                }}>
                                    <em class="icon ni ni-plus"></em><span>Add</span>
                                </a>
                            </li>
                            {/* {tutorSkillSets && */}
                            <><RenderGrid dataSource={tutorSkillSets}></RenderGrid></>
                            {/* } */}
                        </Block>
                    </TabPane>
                </TabContent>


                <Modal isOpen={addCourse}
                    toggle={() => onFormCancel()} className={`modal-dialog-centered${isCoordinatorView ? " tct-course-modal" : ""}`} size="lg">
                    <ModalBody>
                        <a href="#cancel" className="close">
                            {" "}
                            <Icon
                                name="cross-sm"
                                onClick={(ev) => {
                                    ev.preventDefault();
                                    onFormCancel();
                                    setAddCourse(false);
                                }}
                            ></Icon>
                        </a>
                        <div className="p-2">
                            <h5 className="title">Course</h5>
                            <div className="mt-4">
                                <SkillsetForm tutorId={id} skillsetCallback={skillsetCallback}></SkillsetForm>
                            </div>
                        </div>
                    </ModalBody>
                </Modal>
            </PreviewCard>
            </div>
            <ToastContainer />
        </Content>
    </React.Fragment >);
}
export default TCTTutor;
