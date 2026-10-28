import React, { useState, useEffect } from "react";
import { Modal, ModalBody, ModalHeader, ModalFooter } from "reactstrap";
import Dropzone from "react-dropzone";
import Content from "../../../layout/content/Content";
import axios from 'axios';
import { config } from '../../../library/config';
import { Route, Switch, Link } from "react-router-dom";
import { Icon, UserAvatar } from "../../../components/Component";
import { ToastContainer } from "react-toastify";
import { toast } from "react-toastify";
import UserAvailability from "../users/UserAvailability";
import {
  Block,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  BlockDes,
  BackTo,
  PreviewCard,
  CodeBlock,
  Button,
  PreviewTable,
} from "../../../components/Component";
import UserAvatar1 from "../../../components/user/UserAvatar1"
import { findUpper1 } from "../../../utils/Utils";
import { Card, DropdownItem, UncontrolledDropdown, DropdownMenu, DropdownToggle } from "reactstrap";
import { useParams } from 'react-router-dom';
// import StudentEnrolledCourses from "./StudentEnrolledCourses";
import { getStudent } from "../../../apiservices/StudentEnrollmentService";
import { getTCTUserById, uploadProfileImage } from '../../../apiservices/UserService';
import { useLocation } from 'react-router-dom';
import EditTCTUser from "./EditTCTTutor";
import EditTCTTutor from "./EditTCTTutor";
import TCTTutorProfile from "./TCTTutorProfile";
import TutorSkillset from "./TutorSkillset";

const TCTToturProfileLayout = () => {
  const [sm, updateSm] = useState(false);
  const [mobileView, setMobileView] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [imageUrl, setImageUrl] = useState('')
  const [emailAddress, setEmailAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [designation, setDesignation] = useState('');
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const [id, setId] = useState(searchParams.get('id'));
  const [userId, setUserId] = useState(searchParams.get('userId'));
  const [modal, setModal] = useState(false);
  const defaultGuid = '00000000-0000-0000-0000-000000000000';
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [files4, setFiles4] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filename, setFilename] = useState('');
  // const [selectedFiles, setSelectedFiles] = useState([]);
  const [formData, setFormData] = useState({
    id: defaultGuid,
    firstName: "",
    fullName: '',
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
  // function to change the design view under 990 px
  const viewChange = () => {
    if (window.innerWidth < 990) {
      setMobileView(true);
    } else {
      setMobileView(false);
      updateSm(false);
    }
  };

  useEffect(() => {
    const name = searchParams.get('id');
    setId(name);
    getUserData();
    viewChange();
    window.addEventListener("load", viewChange);
    window.addEventListener("resize", viewChange);
    document.getElementsByClassName("nk-header")[0].addEventListener("click", function () {
      updateSm(false);
    });
    return () => {
      window.removeEventListener("resize", viewChange);
      window.removeEventListener("load", viewChange);
    };
  }, []);

  const getUserData = () => {

    getTCTUserById(searchParams.get('userId')).then((response) => {
      setFormData(response.data);
      setProfileName(response.data.fullName);      
      if (response.data.fileData != null && response.data.fileData != "") {
        setImageUrl(`data:image/jpeg;base64, ${response.data.fileData}`);
      }
      setPhone(response.data.phone);
      setEmailAddress(response.data.email);
      setDesignation(response.data.designationName);
    });
  };

  const handleDropChange = (acceptedFiles, set) => {
    setSelectedFiles(acceptedFiles);
    set(
      acceptedFiles.map((file) =>
        Object.assign(file, {
          preview: URL.createObjectURL(file),
        })
      )
    );
    setFilename(acceptedFiles[0].name);
  };
  const CloseButton = () => {
    return (
      <span className="btn-trigger toast-close-button" role="button">
        <Icon name="cross"></Icon>
      </span>
    );
  };
  const onSaveProfileHandler = async () => {
    const profilePayload = new FormData();
    profilePayload.append('UserId', searchParams.get('userId'));
    profilePayload.append('DocumentName', 'Profile Photo');
    profilePayload.append('DocumentDescription', `${formData.fullName || 'Tutor'} profile photo`);

    selectedFiles.forEach((element) => {
      profilePayload.append('Files', element);
    });

    axios.post(`${config.API_URL}/UserProfile/uploadProfileImage`, profilePayload, { 'Content-Type': 'multipart/form-data' }).then((response) => {
      setProfileModalOpen(false);
      toast.success('Profile photo updated successfully.', {
        position: "top-right",
        autoClose: true,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: false,
        closeButton: <CloseButton />,
      });
      getUserData();
    },
      (error) => {

        return Promise.reject(error);
      });

  };

  return (
    <React.Fragment>
      <Content>
        <Card className="card-bordered">
          <div className="card-aside-wrap">
            <div
              className={`card-aside card-aside-left user-aside toggle-slide toggle-slide-left toggle-break-lg ${sm ? "content-active" : ""
                }`}
            >
              <div className="card-inner-group">
                <div className="card-inner">
                  <div className="user-card">
                    <UserAvatar1 image={imageUrl} text={findUpper1(profileName)} theme="primary" />
                    <div className="user-info">
                      <span className="lead-text">{profileName}</span>
                      <span className="sub-text">{emailAddress}</span>
                      <span className="sub-text">{phone}</span>
                      <span className="sub-text">{designation}</span>

                    </div>
                    <div className="user-action">
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
                                  setProfileModalOpen(true);
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
                                  setModal(true);
                                }}
                              >
                                <Icon name="edit-fill"></Icon>
                                <span>Update Profile</span>
                              </DropdownItem>
                            </li>
                          </ul>
                        </DropdownMenu>
                      </UncontrolledDropdown>
                    </div>
                  </div>
                </div>
                {/* <div className="card-inner">
                  <div className="user-account-info py-0">
                    <h6 className="overline-title-alt">Nio Wallet Account</h6>
                    <div className="user-balance">
                      12.395769 <small className="currency currency-btc">BTC</small>
                    </div>
                    <div className="user-balance-sub">
                      Locked{" "}
                      <span>
                        0.344939 <span className="currency currency-btc">BTC</span>
                      </span>
                    </div>
                  </div>
                </div> */}
                <div className="card-inner p-0">
                  <ul className="link-list-menu">
                    <li onClick={() => updateSm(false)}>
                      <Link
                        to={`${process.env.PUBLIC_URL}/lms/tutorprofile?id=${id}&userId=${userId}`}
                        className={
                          window.location.pathname === `${process.env.PUBLIC_URL}/lms/tutorprofile` ? "active" : ""
                        }
                      >
                        <Icon name="user-fill-c"></Icon>
                        <span>Personal Information</span>
                      </Link>
                    </li>
                    <li onClick={() => updateSm(false)}>
                      <Link
                        to={`${process.env.PUBLIC_URL}/lms/tutorskillset?id=${id}&userId=${userId}`}
                        className={
                          window.location.pathname === `${process.env.PUBLIC_URL}/lms/tutorskillset` ? "active" : ""
                        }
                      >
                        <Icon name="user-fill-c"></Icon>
                        <span>Skillsets</span>
                      </Link>
                    </li>
                    <li onClick={() => updateSm(false)}>
                      <Link
                        to={`${process.env.PUBLIC_URL}/lms/tutor-timeslot?id=${id}&userId=${userId}`}
                        className={
                          window.location.pathname === `${process.env.PUBLIC_URL}/lms/tutor-timeslot` ? "active" : ""
                        }
                      >
                        <Icon name="user-fill-c"></Icon>
                        <span>Time slot</span>
                      </Link>
                    </li>
                    {/* <li onClick={() => updateSm(false)}>
                      <Link
                        to={`${process.env.PUBLIC_URL}/tutor-profile-setting?id=${id}`}
                        className={
                          window.location.pathname === `${process.env.PUBLIC_URL}/user-profile-setting` ? "active" : ""
                        }
                      >
                        <Icon name="lock-alt-fill"></Icon>
                        <span>Change Password</span>
                      </Link>
                    </li> */}
                  </ul>
                </div>
              </div>
            </div>
            <div className="card-inner">
              {sm && mobileView && <div className="toggle-overlay" onClick={() => updateSm(!sm)}></div>}
              <Switch>
                <Route
                  exact
                  path={`${process.env.PUBLIC_URL}/lms/tutorprofile`}
                  render={() => <TCTTutorProfile updateSm={updateSm} studentId={searchParams.get('id')} sm={sm} setProfileName={setProfileName} />}
                >
                </Route>
                <Route
                  exact
                  path={`${process.env.PUBLIC_URL}/lms/tutorskillset`}
                  render={() => <TutorSkillset updateSm={updateSm} tutorId={searchParams.get('id')} sm={sm} setProfileName={setProfileName} />}
                >
                </Route>
                <Route
                  exact path={`${process.env.PUBLIC_URL}/lms/tutor-timeslot`}
                  render={() => <UserAvailability navigationType="page" updateSm={updateSm} studentId={searchParams.get('id')} sm={sm}/>}
                ></Route>
                
              </Switch>
            </div>
          </div>
        </Card>

        <Modal isOpen={profileModalOpen} toggle={() => setProfileModalOpen(false)}
          className="modal-dialog-centered" size="sm">
          <ModalHeader
            // toggle={toggle}
            close={
              <button className="close" type="button" onClick={() => {
                setProfileModalOpen(false);
              }} >
                <Icon name="cross" />
              </button>
            }
          >
          </ModalHeader>
          <ModalBody>
            <form>
              <div className="row col-md-12">
                <div className="col-md-2"></div>
                <div className="col-md-8">
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
                              <span className="dz-message-text">Drag and drop file</span>
                              <span className="dz-message-or">or</span>
                              <Button type="button" color="primary">SELECT</Button>
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
                </div>
                <div className="col-md-2"></div>
              </div>
            </form>
          </ModalBody>
          <ModalFooter className="bg-light">
            <div style={{ width: '100%' }}>
              <div style={{ textAlign: 'right' }}>
                <Button color="primary" type="button" size="md" onClick={() => {
                  onSaveProfileHandler();
                }}>
                  Save Profile
                </Button>
              </div>
            </div>

          </ModalFooter>
        </Modal>
        <ToastContainer />
        {modal &&
          <EditTCTTutor modalOpen={modal} formData={formData}></EditTCTTutor>
        }
      </Content>
    </React.Fragment>
  );
};

export default TCTToturProfileLayout;
