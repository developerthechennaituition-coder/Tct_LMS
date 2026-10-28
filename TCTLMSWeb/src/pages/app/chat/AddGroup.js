import React, { useContext, useEffect, useState, useMemo, useRef } from "react";
import moment from "moment";
import {
  DropdownMenu,
  DropdownToggle,
  FormGroup,
  UncontrolledDropdown,
  Modal,
  Card,
  ModalBody,
  ModalFooter,
  ModalHeader,
  DropdownItem,
  Form,
  Row,
  Input,
  Nav,
  NavItem,
  NavLink,
  TabContent,
  TabPane,
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
import countryList from "react-select-country-list";
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
import { GetGroupMembers, CreateGroup } from "../../../apiservices/ChatService";
import { useLocation, Link } from "react-router-dom";
import UserAvatar1 from "../../../components/user/UserAvatar1";
import { findUpper1, getColor } from "../../../utils/Utils";

const AddGroup = (props) => {
  const formRef = useRef(null);
  const defaultGuid = "00000000-0000-0000-0000-000000000000";
  const [userList, setUserList] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const createdBy = localStorage.getItem("userId");
  const [isAddModalOpen, setIsAddModalOpen] = useState(props.modalOpen);
  const [canShow, setCanShow] = useState(props.groupId == defaultGuid);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const cancelledRef = useRef(false);
  const [modal, setModal] = useState({
    edit: false,
    add: false,
  });
  const [formData, setFormData] = useState({
    id: defaultGuid,
    userId: createdBy,
    groupName: "",
    description: "",
  });

  useEffect(() => {
    GetGroupMembers(props.groupId)
      .then((response) => {
        setUserList(Array.isArray(response) ? response : []);
      })
      .catch((error) => {
        console.log(error);
        setUserList([]);
      });
  }, []);

  const getImageSource = (data) => {
    if (data.fileData == null) {
      return "";
    }
    const url = `data:image/jpeg;base64, ${data.fileData}`;
    return url;
  };

  const onFormSubmit = (submitData) => {
    if (isSubmitting || cancelledRef.current) {
      return;
    }
    const userRole = (localStorage.getItem("userRole") || "").trim().toLowerCase();
    if (props.groupId === defaultGuid && ["student", "tutor"].includes(userRole)) {
      toast.error("Students and tutors are not allowed to create groups.");
      props.modalStateChange(false);
      return;
    }
    const _selectedMembers = selectedMembers;
    if (_selectedMembers?.length == 0) {
      toast.error("Please select the members.", {
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
    let inputData = formData;
    let _members = [];
    _selectedMembers.forEach((item) => {
      _members.push({ id: item.id });
    });
    inputData["members"] = _members;
    inputData["id"] = props.groupId;

    setIsSubmitting(true);
    CreateGroup(inputData).then((response) => {
      setIsSubmitting(false);
      if (cancelledRef.current) {
        // Modal was closed/cancelled before this request resolved; don't
        // surface a toast for an action the user already dismissed.
        return;
      }
      if (response.succeeded) {
        const data = response.data;
        toast.success("Group Created successfully.", {
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
      props.modalStateChange(false);
    });
  };

  const dtColumns = [
    {
      name: <Link className="user-card mt-2 mb-2 ml-2">Name</Link>,
      selector: (row) => row.fullName,
      compact: true,
      grow: 2,
      style: { paddingRight: "20px" },
      cell: (row) => (
        <Link
          className="user-card mt-2 mb-2 ml-2"
          to={`${process.env.PUBLIC_URL}/lms/tutorprofile?id=${row.tutorId}&userId=${row.id}`}
        >
          <UserAvatar1
            image={getImageSource(row)}
            theme={getColor(row.fullName)}
            text={findUpper1(row.fullName)}
          ></UserAvatar1>
          <div className="user-info">
            <span className="tb-lead">
              {row.fullName}{" "}
              <span
                className={`dot dot-${
                  row.isActive === true ? "success" : row.isActive === false ? "warning" : "danger"
                } d-md-none ml-1`}
              ></span>
            </span>
            {row.email && <span>{row.email}</span>}
            {row?.phone && (
              <>
                <br></br>
                <span>{row.phone}</span>
              </>
            )}
          </div>
        </Link>
      ),
      sortable: true,
    },
    {
      name: "Role",
      selector: (row) => row.role,

      cell: (row) => <span className="tb-lead">{row.role}</span>,
      sortable: true,
    },
  ];

  const handleRowSelected = (state) => {
    setSelectedMembers(state.selectedRows);
  };

  const CloseButton = () => {
    return (
      <span className="btn-trigger toast-close-button" role="button">
        <Icon name="cross"></Icon>
      </span>
    );
  };

  // Get current list, pagination
  const { errors, register, handleSubmit } = useForm();
  return (
    <React.Fragment>
      <Head title="TCT Chat Group"></Head>
      <Modal
        scrollable={true}
        isOpen={isAddModalOpen}
        backdrop="static"
        keyboard={false}
        toggle={() => {
          cancelledRef.current = true;
          setIsAddModalOpen(false);
          props.modalStateChange(false);
        }}
        className="modal-dialog-centered totur-modal"
        size="lg"
      >
        <ModalHeader
          close={
            <button
              className="close"
              type="button"
              onClick={() => {
                cancelledRef.current = true;
                setIsAddModalOpen(false);
                props.modalStateChange(false);
              }}
            >
              <Icon name="cross" />
            </button>
          }
        >
          {canShow == true ? "Add Group" : "Add Members"}
        </ModalHeader>
        <ModalBody className="totur-modal-body">
          <Content>
            {canShow == true && (
              <Col size="12">
                <div className="mt-6">
                  <Form className="row gy-3" ref={formRef} noValidate onSubmit={handleSubmit(onFormSubmit)}>
                    <Row className="col-md-12">
                      <Col md="6">
                        <FormGroup>
                          <label className="form-label" htmlFor="groupName">
                            Group Name
                          </label>
                          <input
                            className="form-control"
                            type="text"
                            name="groupName"
                            value={formData.groupName}
                            onChange={(e) => {
                              const value = e.target.value;
                              setFormData((current) => ({ ...current, groupName: value }));
                            }}
                            placeholder="Group Name"
                            ref={register({ required: "This field is required" })}
                          />
                          {errors.groupName && <span className="invalid">{errors.groupName.message}</span>}
                        </FormGroup>
                      </Col>

                      <Col md="6">
                        <FormGroup>
                          <label className="form-label" htmlFor="description">
                            About
                          </label>
                          <input
                            className="form-control"
                            type="text"
                            name="description"
                            value={formData.description}
                            placeholder="About the group"
                            onChange={(e) => {
                              const value = e.target.value;
                              setFormData((current) => ({ ...current, description: value }));
                            }}
                            ref={register({ required: "This field is required" })}
                          />
                          {errors.description && <span className="invalid">{errors.description.message}</span>}
                        </FormGroup>
                      </Col>
                    </Row>
                  </Form>
                </div>
              </Col>
            )}
            <Col size="12">
              <ReactDataTable
                pageSize={4}
                canShowFilter
                data={userList}
                columns={dtColumns}
                selectableRows
                onSelectedRowsChange={handleRowSelected}
              />
              <ToastContainer />
            </Col>
          </Content>
        </ModalBody>
        <ModalFooter className="bg-light">
          <Col size="12">
            <ul className="align-center flex-wrap flex-sm-nowrap gx-4 gy-2">
              <li>
                <Button
                  color="primary"
                  size="md"
                  disabled={isSubmitting}
                  onClick={() => {
                    if (canShow) {
                      formRef.current.props.onSubmit();
                    } else {
                      onFormSubmit(formData);
                    }
                  }}
                >
                  {canShow == true ? "Create group" : "Add Member"}
                </Button>
              </li>
              <li>
                <a
                  href="#cancel"
                  onClick={(ev) => {
                    ev.preventDefault();
                    cancelledRef.current = true;
                    setIsAddModalOpen(false);
                    props.modalStateChange(false);
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
    </React.Fragment>
  );
};
export default AddGroup;
