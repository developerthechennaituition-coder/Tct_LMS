import React, { useState, useEffect } from "react";
import { Modal, ModalBody, ModalHeader, ModalFooter } from "reactstrap";
import Dropzone from "react-dropzone";
import { ToastContainer } from "react-toastify";
import { toast } from "react-toastify";
import axios from 'axios';
import { config } from '../../../library/config';
import { Icon, UserAvatar } from "../../../components/Component";
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
import { useForm } from "react-hook-form";

const StudentRegistration = (props) => {
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [profileModalOpen, setProfileModalOpen] = useState(true);
    const [filename, setFilename] = useState('');
    const [files4, setFiles4] = useState([]);
    const { errors, register, handleSubmit, setValue, trigger, reset, clearErrors } = useForm();
    const [formData, setFormData] = useState({
        Username:"",
    });

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

    const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    setValue(name, value);
    trigger(name);
  };

    const onSaveProfileHandler = async () => {
        const inputData = new FormData();
        alert(formData.Username);
        inputData.append('Username', formData.Username);
        //formData.append('DocumentName', props.fullName);
        //formData.append('DocumentDescription', props.fullName);

        selectedFiles.forEach((element) => {
            inputData.append('Files', element);
        });

        axios.post(`${config.API_URL}/student/studentRegistration`, inputData, { 'Content-Type': 'multipart/form-data' }).then((response) => {
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
            getUserData();
        },
        (error) => {

            return Promise.reject(error);
        });

    };


    return (
        <>
            <ToastContainer />
            <Modal isOpen={profileModalOpen || props.modalOpen} toggle={() => setProfileModalOpen(false)}
                className="modal-dialog-centered" size="sm">
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
                </ModalHeader>
                <ModalBody>
                    <form>
                        <div className="row col-md-12">
                            <div className="col-md-2"></div>
                            <div className="col-md-8">
                                <input
                        className="form-control"
                        type="text"
                        name="Username"
                        value={formData.Username}
                        onChange={(e) => {
                              setFormData({
                                ...formData,
                                Username: e.target.value,
                              });
                            }}
                        placeholder="Enter student name"
                      />
                            </div>
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
        </>)
}
export default StudentRegistration;