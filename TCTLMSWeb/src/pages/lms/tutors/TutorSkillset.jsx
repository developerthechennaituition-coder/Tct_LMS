import React, { useEffect, useState, useMemo, useRef } from "react";
import { Modal, ModalBody, UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem } from "reactstrap";
import "react-phone-number-input/style.css";
import { ToastContainer } from "react-toastify";
import { toast } from "react-toastify";
import countryList from "react-select-country-list";
import {
  Block,
  ReactDataTable,
  BlockBetween,
  BlockHead,
  BlockHeadContent,
  TooltipComponent,
  BlockTitle,
  Icon,
  Button,
} from "../../../components/Component";
import Head from "../../../layout/head/Head";
import { getTutorSkillset, UpdateTutorPayment, deleteTutorSkillset } from "../../../apiservices/TutorService";
import { getLookups } from "../../../apiservices/LookupsService";
import { useLocation, Link } from "react-router-dom";
import SkillsetForm from "./SkillsetForm";
import Swal from "sweetalert2";

const TutorSkillset = (props) => {
  const formRef = useRef(null);
  const defaultGuid = "00000000-0000-0000-0000-000000000000";
  const [tutorSkillSets, setTutorSkillSets] = useState();
  const [courseList, setCourseList] = useState([]);
  const [gradeList, setGradeList] = useState([]);
  const [boardList, setBoardList] = useState([]);
  const [addCourse, setAddCourse] = useState(false);
  const createdBy = localStorage.getItem("userId");
  const [isAddModalOpen, setIsAddModalOpen] = useState(props.modalOpen);
  const options = useMemo(() => countryList().getData(), []);
  const [disabled, setDisabled] = useState(false);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const [modal, setModal] = useState({
    edit: false,
    add: false,
  });
  const [activeTab, setActiveTab] = useState("1");

  const [skillFormData, setSkillFormData] = useState({
    boardId: "",
    gradeId: "",
    subjectId: "",
    tutorId: "",
  });
  const [value, setValue] = useState("");
  const [currentPage, setCurredefaultGuidntPage] = useState(1);
  const [itemPerPage] = useState(10);
  // Opt-in (tutor's own profile): visible Rows per page. Starts at the existing page size (25);
  // other pages using this component keep the fixed 25 and no dropdown.
  const showRowsPerPage = props.showRowsPerPage === true;
  const SKILL_PAGE_SIZES = [10, 25, 50, 100];
  const [skillPageSize, setSkillPageSize] = useState(25);
  const [skillPageReset, setSkillPageReset] = useState(false);
  const [genderList, setGenderList] = useState([]);
  const [designationList, setDesignationList] = useState([]);
  const [roleList, setRoleList] = useState([]);
  const [addSkillsetModal, setAddSkillsetModal] = useState(false);
  const [dataItem, setDataItem] = useState();
  const [mode, setMode] = useState("add");
  const effectiveTutorId =
    props.tutorId || searchParams.get("userId") || searchParams.get("id") || localStorage.getItem("userId");

  const loadTutorSkillsets = () => {
    if (!effectiveTutorId) return Promise.resolve();
    return getTutorSkillset(effectiveTutorId).then((response) => {
      setTutorSkillSets(response?.data ?? response);
    });
  };

  useEffect(() => {
    loadTutorSkillsets();

    getLookups("600" /*gender*/).then((response) => {
      let temp = [];
      response.forEach((s) => {
        temp.push({ value: s?.id, label: s?.typeCodeName, id: s?.id });
      });
      setGenderList(temp);
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

    getLookups("300" /*Grade*/).then((response) => {
      let temp = [];
      response
        .filter((s) => s?.typeCodeName?.startsWith("Grade"))
        .forEach((s) => {
          temp.push({ value: s?.id, label: s?.typeCodeName });
        });
      setGradeList(temp);
    });
  }, [effectiveTutorId]);

  // function to reset the form
  const resetForm = () => {};

  // function to close the form modal
  const onFormCancel = () => {
    setAddSkillsetModal(false);
  };
  const updateTutorPayment = async (amount, row, inputElement) => {
    if (Number(amount) === Number(row.tutorPayment)) return;
    const prompt = await Swal.fire({
      title: "Request tutor rate change",
      html: `<div class="text-start mb-2"><b>Current amount:</b> ${row.tutorPayment}<br/><b>Proposed amount:</b> ${amount}</div>`,
      input: "textarea",
      inputLabel: "Reason for change (required)",
      inputPlaceholder: "Enter the reason for this payment change",
      showCancelButton: true,
      confirmButtonText: "Submit for approval",
      inputValidator: (value) => !value?.trim() && "Reason is required.",
    });
    if (!prompt.isConfirmed) {
      inputElement.value = row.tutorPayment;
      return;
    }
    const inputData = {
      UserId: createdBy,
      Payment: amount,
      Id: row.id,
      Reason: prompt.value.trim(),
    };
    UpdateTutorPayment(inputData)
      .then((response) => {
        toast.success("Payment change submitted for Super Admin approval.", {
          position: "top-right",
          autoClose: true,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: false,
          closeButton: <CloseButton />,
        });
        inputElement.value = row.tutorPayment;
        loadTutorSkillsets();
      })
      .catch((error) => {
        inputElement.value = row.tutorPayment;
        toast.error("Unable to update the payment.", {
          position: "top-right",
          autoClose: true,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: false,
          closeButton: <CloseButton />,
        });
      });
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
      cell: (row) => <span className="tb-amount">{row.gradeName}</span>,
      sortable: true,
    },
    {
      name: "Subject",
      selector: (row) => row.subjectName,
      sortable: true,
      hide: "sm",
      cell: (row) => <span>{row.subjectName}</span>,
    },
    {
      name: "Payment",
      selector: (row) => row.tutorPayment,
      sortable: true,
      hide: "sm",
      cell: (row) => (
        <span>
          <input
            className="form-control"
            
            key={row.id}
            name="tutorPayment"
            onBlur={(e) => {
              if (e.target.value != "") {
                updateTutorPayment(e.target.value, row, e.target);
                // alert(e.target.value);
              }
            }}
            defaultValue={row.tutorPayment}
            // value={row.tutorPayment}
            // onChange={(e) => {
            //   // setFormData({ ...formData, firstName: e.target.value });
            // }}
            placeholder="Enter amount"
            // ref={register({ required: "This field is required" })}
          />
        </span>
      ),
    },
    {
      name: "",
      sortable: false,
      hide: "sm",
      width: "150px",
      cell: (row) => (
        // <span
        //   className={"icon ni ni-trash"}
        //   onClick={() => {
        //     onDeleteCourseDetails(row.id);
        //   }}
        // ></span>
        <>
          <div className="nk-tb-action">
            <ul className="nk-tb-actions">
              <li
                onClick={() => {
                  setDataItem(row);
                  setMode("edit");
                  setAddSkillsetModal(true);
                }}
              >
                <TooltipComponent
                  tag="a"
                  containerClassName="btn btn-trigger btn-icon"
                  id={"changeTutor" + row?.boardId}
                  icon="icon ni ni-edit-fill"
                  direction="top"
                  text="Edit"
                />
              </li>
              <li
                onClick={() => {
                  onDeleteCourseDetails(row.id);
                }}
              >
                <TooltipComponent
                  tag="a"
                  containerClassName="btn btn-trigger btn-icon"
                  id={"changeTutor" + row?.gradeId}
                  icon="icon ni ni-cross"
                  direction="top"
                  text="Delete"
                />
              </li>
            </ul>
          </div>
        </>
      ),
    },
  ];

  const onDeleteCourseDetails = (tutorDetailsId) => {
    deleteTutorSkillset(tutorDetailsId).then((response) => {
      if (response?.succeeded === false) throw new Error(response.message);
      loadTutorSkillsets();
      toast.success("Skill removed successfully.", {
        position: "top-right",
        autoClose: true,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: false,
        closeButton: <CloseButton />,
      });
    }).catch(() => {
      toast.error("Failed to remove skill.", {
        position: "top-right",
        autoClose: true,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: false,
        closeButton: <CloseButton />,
      });
    });
  };

  const RenderGrid = (props) => {
    return (
      <>
        <ReactDataTable
          data={props.dataSource}
          columns={dtColumns}
          pageSize={showRowsPerPage ? skillPageSize : 25}
          pagination
          paginationResetDefaultPage={showRowsPerPage ? skillPageReset : undefined}
          className="nk-tb-list"
        />
      </>
    );
  };

  const CloseButton = () => {
    return (
      <span className="btn-trigger toast-close-button" role="button">
        <Icon name="cross"></Icon>
      </span>
    );
  };

  const submitCallback = () => {
    loadTutorSkillsets();
    setAddSkillsetModal(false);
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
  };

  const editModalStateChange = (input) => {
    setAddSkillsetModal(false);
  };

  return (
    <React.Fragment>
      <Head title="TCT - tutor info"></Head>
      <BlockHead size="sm">
        <BlockBetween>
          <BlockHeadContent>
            <BlockTitle tag="h4"></BlockTitle>
          </BlockHeadContent>
          <BlockHeadContent>
            <Button
              color="primary"
              onClick={() => {
                setMode("add");
                setAddSkillsetModal(true);
              }}
            >
              <Icon name="plus" /> Add Skills
            </Button>
          </BlockHeadContent>
        </BlockBetween>
      </BlockHead>
      <Block>
        <Modal
          isOpen={addSkillsetModal}
          toggle={() => onFormCancel()}
          className="modal-dialog-centered totur-modal"
          size="lg"
        >
          <ModalBody className="totur-modal-body">
            <a href="#cancel" className="close">
              {" "}
              <Icon
                name="cross-sm"
                onClick={(ev) => {
                  ev.preventDefault();
                  onFormCancel();
                  setAddSkillsetModal(false);
                }}
              ></Icon>
            </a>
            <div className="p-2">
              <h5 className="title">Skills</h5>
              <div className="mt-4">
                <SkillsetForm
                  dataItem={dataItem}
                  mode={mode}
                  tutorId={effectiveTutorId}
                  skillsetCallback={submitCallback}
                ></SkillsetForm>
              </div>
            </div>
          </ModalBody>
        </Modal>

        {tutorSkillSets &&
          (showRowsPerPage ? (
            <div className="tct-sk-grid">
              <RenderGrid dataSource={tutorSkillSets}></RenderGrid>
              {tutorSkillSets.length > 0 && (
                <div className="tct-rpp">
                  <span>Rows per page</span>
                  <UncontrolledDropdown direction="up">
                    <DropdownToggle tag="button" type="button" className="tct-rpp-toggle" aria-label={`Rows per page: ${skillPageSize}`}>
                      <span>{skillPageSize}</span>
                      <Icon name="chevron-down" />
                    </DropdownToggle>
                    <DropdownMenu right className="tct-rpp-menu">
                      {SKILL_PAGE_SIZES.map((size) => (
                        <DropdownItem
                          key={size}
                          tag="button"
                          type="button"
                          active={skillPageSize === size}
                          onClick={() => {
                            if (skillPageSize === size) return;
                            setSkillPageSize(size);
                            setSkillPageReset((prev) => !prev); // back to page 1
                          }}
                        >
                          <span>{size}</span>
                          {skillPageSize === size && <Icon name="check" />}
                        </DropdownItem>
                      ))}
                    </DropdownMenu>
                  </UncontrolledDropdown>
                </div>
              )}
            </div>
          ) : (
            <>
              <RenderGrid dataSource={tutorSkillSets}></RenderGrid>
            </>
          ))}
        <ToastContainer />
      </Block>
    </React.Fragment>
  );
};
export default TutorSkillset;
