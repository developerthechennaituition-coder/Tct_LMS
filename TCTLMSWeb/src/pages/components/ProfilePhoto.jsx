import React, { useState, useEffect } from "react";
import { Modal, ModalBody, ModalHeader, ModalFooter } from "reactstrap";
import Dropzone from "react-dropzone";
import { ToastContainer } from "react-toastify";
import { toast } from "react-toastify";
import axios from 'axios';
import { config } from '../../library/config';
import { Icon, UserAvatar } from "../../components/Component";
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
} from "../../components/Component";
import "./ProfilePhoto.css";

const ProfilePhoto = (props) => {
    // Opt-in redesigned layout (styled by .tct-photo-modal in ProfilePhoto.css). Without the prop the
    // markup is unchanged, so other pages using this component look exactly as before.
    const polished = !!props.polished;
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [profileModalOpen, setProfileModalOpen] = useState(true);
    const [filename, setFilename] = useState('');
    const [files4, setFiles4] = useState([]);

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
        const formData = new FormData();
        formData.append('UserId', props.id);
        formData.append('DocumentName', 'Profile Photo');
        formData.append('DocumentDescription', `${props.fullName || 'User'} profile photo`);

        selectedFiles.forEach((element) => {
            formData.append('Files', element);
        });

        axios.post(`${config.API_URL}/UserProfile/uploadProfileImage`, formData, { 'Content-Type': 'multipart/form-data' }).then((response) => {
            setProfileModalOpen(false);
            if (typeof (props.profileUpdateCallback) == 'function') {
               props.profileUpdateCallback();
            }

            toast.success('Profile photo updated successfully.', {
                position: "top-right",
                autoClose: true,
                hideProgressBar: true,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: false
            });
        },
            (error) => {

                return Promise.reject(error);
            });

    };


    return (
        <>
            <ToastContainer />
            <Modal isOpen={profileModalOpen || props.modalOpen} toggle={() => setProfileModalOpen(false)}
                className={polished ? "modal-dialog-centered tct-photo-modal" : "modal-dialog-centered"} size="sm">
                <ModalHeader
                    // toggle={toggle}
                    close={
                        <button className="close" type="button" onClick={() => {
                            setProfileModalOpen(false);
                            if (typeof (props.modalCloseCallback) == 'function') {
                              props.modalCloseCallback();
                            }
                        }} >
                            <Icon name="cross" />
                        </button>
                    }
                >
                    {polished && (
                        <span className="tct-photo-head">
                            <span className="tct-photo-head-icon" aria-hidden="true"><Icon name="camera-fill" /></span>
                            <span className="tct-photo-head-text">
                                <span className="tct-photo-title">Change Profile Photo</span>
                                <span className="tct-photo-sub">JPG, PNG or SVG image</span>
                            </span>
                        </span>
                    )}
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
                                                {files4.length === 0 && (polished ? (
                                                    <div className="dz-message">
                                                        <span className="tct-photo-drop-icon" aria-hidden="true"><Icon name="img" /></span>
                                                        <span className="dz-message-text">Upload a profile photo</span>
                                                        <span className="tct-photo-drop-hint">Drag and drop an image here, or browse your files</span>
                                                        <Button type="button" color="primary"><Icon name="upload-cloud" /><span>Select</span></Button>
                                                    </div>
                                                ) : (
                                                    <div className="dz-message">
                                                        <span className="dz-message-text">Drag and drop file</span>
                                                        <span className="dz-message-or">or</span>
                                                        <Button type="button" color="primary">SELECT</Button>
                                                    </div>
                                                ))}
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
                                {polished ? (
                                    filename && (
                                        <div className="tct-photo-file">
                                            <Icon name="file-img" />
                                            <span>{filename}</span>
                                        </div>
                                    )
                                ) : (
                                    filename
                                )}
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
                                {polished && <Icon name="check-circle" />}
                                {polished ? <span>Save Profile</span> : "Save Profile"}
                            </Button>
                        </div>
                    </div>

                </ModalFooter>
            </Modal>
        </>)
}
export default ProfilePhoto;
