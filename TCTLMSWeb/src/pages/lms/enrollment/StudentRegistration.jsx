import React, { useEffect, useState } from "react";
import Dropzone from "react-dropzone";
import {
  FormGroup,
  Form,
  Row,
  Card,
  CardBody,
  Spinner
} from "reactstrap";
import { toast } from "react-toastify";
import { ToastContainer } from "react-toastify";
import {
  Block,
  BlockBetween,
  BlockDes,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Col,
  Button,
  Icon,
  RSelect
} from "../../../components/Component";
import Content from "../../../layout/content/Content";
import Head from "../../../layout/head/Head";
import { useForm } from "react-hook-form";
import PhoneInput, { formatPhoneNumberIntl, isValidPhoneNumber } from "react-phone-number-input";
import { getLookups } from "../../../apiservices/LookupsService";
import { createStudentRegistration } from "../../../apiservices/StudentEnrollmentService";
import "react-phone-number-input/style.css";

const StudentRegistration = () => {
  const defaultGuid = "00000000-0000-0000-0000-000000000000";
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filename, setFilename] = useState('');
  const [files4, setFiles4] = useState([]);
  const [courseList, setCourseList] = useState([]);

  const [formData, setFormData] = useState({
    id: defaultGuid,
    studentName: "",
    parentName: "",
    parentOccupation: "",
    parentMobile: "",
    parentEmail: "",
    subject: "",
    curriculum: "",
    location: "",
    schoolName: "",
    address: "",
    feesPerHour: "",
    annualExamMonth: "",
    demoFeedback: "",
    termsAccepted: false,
    isActive: true,
    createdBy: localStorage.getItem("userId")
  });

  const { errors, register, handleSubmit, setValue, trigger, reset } = useForm();

  useEffect(() => {
    getLookups("500").then((response) => {
      const temp = response.map((s) => ({
        value: s?.id,
        label: s?.typeCodeName
      }));
      setCourseList(temp);
    });
  }, []);

  const CloseButton = () => (
    <span className="btn-trigger toast-close-button" role="button">
      <Icon name="cross"></Icon>
    </span>
  );

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

  const clearForm = () => {
    reset({
      studentName: "",
      parentName: "",
      parentOccupation: "",
      parentMobile: "",
      parentEmail: "",
      subject: "",
      curriculum: "",
      location: "",
      schoolName: "",
      address: "",
      feesPerHour: "",
      annualExamMonth: "",
      demoFeedback: "",
      termsAccepted: false,
    });

    setFormData({
      id: defaultGuid,
      studentName: "",
      parentName: "",
      parentOccupation: "",
      parentMobile: "",
      parentEmail: "",
      subject: defaultGuid,
      curriculum: "",
      location: "",
      schoolName: "",
      address: "",
      feesPerHour: "",
      annualExamMonth: "",
      demoFeedback: "",
      termsAccepted: false,
      isActive: true,
      createdBy: localStorage.getItem("userId")
    });

    setSelectedFiles([]);
    setFiles4([]);
    setFilename('');
  };

  const onSubmit = () => {
    if (!isValidPhoneNumber(formData.parentMobile)) {
      toast.error("Please enter a valid phone number", {
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

    if (selectedFiles.length === 0) {
      toast.error("Please upload an ID proof", {
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

    const inputData = new FormData();

    inputData.append("StudentName", formData.studentName);
    inputData.append("ParentName", formData.parentName);
    inputData.append("ParentOccupation", formData.parentOccupation);
    inputData.append("ParentMobile", formatPhoneNumberIntl(formData.parentMobile));
    inputData.append("ParentEmail", formData.parentEmail);
    inputData.append("Subject", formData.subject);
    inputData.append("Curriculum", formData.curriculum);
    inputData.append("Location", formData.location);
    inputData.append("SchoolName", formData.schoolName);
    inputData.append("Address", formData.address);
    inputData.append("FeesPerHour", formData.feesPerHour.toString());
    inputData.append("AnnualExamMonth", formData.annualExamMonth.toString());
    inputData.append("DemoFeedback", formData.demoFeedback);
    inputData.append("TermsAccepted", formData.termsAccepted.toString());
    inputData.append("IsActive", formData.isActive.toString());

    const userId = localStorage.getItem("userId");
    if (userId) {
      inputData.append("CreatedBy", userId);
    } else {
      console.warn("Warning: No userId found in localStorage");
    }

    selectedFiles.forEach((element) => {
      inputData.append('Files', element);
    });

    setLoading(true);
    createStudentRegistration(inputData)
      .then((response) => {
        const message = response?.message || "Student registration completed successfully";
        toast.success(message, {
          position: "top-right",
          autoClose: true,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: false
        });
        clearForm();
      })
      .catch((error) => {
        console.error("API error:", error);

        let errorMessage = "Server error occurred.";
        
        if (error.response) {
          errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
        }

        toast.error(errorMessage, {
          position: "top-right",
          autoClose: true,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: false
        });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const fields = [
      { name: "studentName", message: "Student name is required" },
      { name: "parentName", message: "Parent's name is required" },
      { name: "parentMobile", message: "Phone number is required" },
      { name: "parentEmail", message: "Email is required", pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: "Invalid email address" }},
      { name: "subject", message: "Subject is required" },
      { name: "curriculum", message: "Curriculum is required" },
      { name: "location", message: "Location is required" },
      { name: "schoolName", message: "School name is required" },
      { name: "address", message: "Address is required" },
      { name: "feesPerHour", message: "Fees is required" },
      { name: "annualExamMonth", message: "Annual exam month is required" },
      { name: "parentOccupation", message: "Occupation is required" },
      { name: "demoFeedback", message: "Demo feedback is required" },
      { name: "termsAccepted", message: "You must accept terms and conditions" }
    ];

    fields.forEach(field => {
      const options = { required: field.message };
      if (field.pattern) options.pattern = field.pattern;
      register(field.name, options);
    });
  }, [register]);

  useEffect(() => {
    Object.keys(formData).forEach(key => {
      setValue(key, formData[key]);
    });
    setValue("subject", formData.subject);

    if (formData.parentMobile) trigger("parentMobile");
    if (formData.parentEmail) trigger("parentEmail");
  }, [formData, setValue, trigger]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setValue(name, value);
    trigger(name);
  };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: checked,
    }));
    setValue(name, checked);
    trigger(name);
  };

  const handlePhoneChange = (value) => {
    setFormData(prev => ({
      ...prev,
      parentMobile: value,
    }));
    setValue("parentMobile", value);
    trigger("parentMobile");
  };

  const handleSubjectChange = (e) => {
    setFormData(prev => ({
      ...prev,
      subject: e.value
    }));
    setValue("subject", e.value, { shouldValidate: true });
  };

  return (
    <React.Fragment>
      <Head title="Student Registration"></Head>
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle tag="h3" page>
                Student Registration
              </BlockTitle>
              <BlockDes className="text-soft">
                Complete the form to register a new student
              </BlockDes>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        <Card className="card-bordered">
          <CardBody className="card-inner">
            <div className="mt-4">
              <Form noValidate onSubmit={handleSubmit(onSubmit)}>
                <Row className="g-3">
                  <Col md="4">
                    <FormGroup>
                      <label className="form-label">Student Name <span className="text-danger">*</span></label>
                      <input
                        className="form-control"
                        type="text"
                        name="studentName"
                        value={formData.studentName}
                        onChange={handleInputChange}
                        placeholder="Enter student name"
                      />
                      {errors.studentName && <span className="invalid">{errors.studentName.message}</span>}
                    </FormGroup>
                  </Col>

                  <Col md="4">
                    <FormGroup>
                      <label className="form-label">Parent's Name <span className="text-danger">*</span></label>
                      <input
                        className="form-control"
                        type="text"
                        name="parentName"
                        value={formData.parentName}
                        onChange={handleInputChange}
                        placeholder="Enter parent's name"
                      />
                      {errors.parentName && <span className="invalid">{errors.parentName.message}</span>}
                    </FormGroup>
                  </Col>

                  <Col md="4">
                    <FormGroup>
                      <label className="form-label">Parent's Occupation <span className="text-danger">*</span></label>
                      <input
                        className="form-control"
                        type="text"
                        name="parentOccupation"
                        value={formData.parentOccupation}
                        onChange={handleInputChange}
                        placeholder="Enter parent's occupation"
                      />
                      {errors.parentOccupation && <span className="invalid">{errors.parentOccupation.message}</span>}
                    </FormGroup>
                  </Col>

                  <Col md="4">
                    <FormGroup>
                      <label className="form-label">Phone Number <span className="text-danger">*</span></label>
                      <PhoneInput
                        defaultCountry="IN"
                        international
                        name="parentMobile"
                        placeholder="Enter phone number"
                        value={formData.parentMobile}
                        onChange={handlePhoneChange}
                        error={
                          formData.parentMobile
                            ? isValidPhoneNumber(formData.parentMobile)
                              ? undefined
                              : "Invalid phone number"
                            : "Phone number required"
                        }
                      />
                      {errors.parentMobile && <span className="invalid" style={{ color: "#e85347", fontSize: "11px", fontStyle: "italic" }}>{errors.parentMobile.message}</span>}
                    </FormGroup>
                  </Col>

                  <Col md="4">
                    <FormGroup>
                      <label className="form-label">Parent's Email <span className="text-danger">*</span></label>
                      <input
                        className="form-control"
                        type="email"
                        name="parentEmail"
                        value={formData.parentEmail}
                        onChange={handleInputChange}
                        placeholder="Enter parent's email"
                      />
                      {errors.parentEmail && <span className="invalid" style={{ color: "#e85347", fontSize: "11px", fontStyle: "italic" }}>{errors.parentEmail.message}</span>}
                    </FormGroup>
                  </Col>

                  <Col md="4">
                    <FormGroup>
                      <label className="form-label">Subject / Standard <span className="text-danger">*</span></label>
                      <RSelect
                        dataSource={courseList}
                        value1={formData.subject}
                        className={errors?.subject ? "is-invalid" : ""}
                        onChangeHandler={handleSubjectChange}
                        placeholder="Select subject"
                      />
                      {errors.subject && <span className="invalid" style={{ color: "#e85347", fontSize: "11px", fontStyle: "italic" }}>{errors.subject.message}</span>}                      
                    </FormGroup>
                  </Col>

                  <Col md="4">
                    <FormGroup>
                      <label className="form-label">Curriculum / Board <span className="text-danger">*</span></label>
                      <div className="form-control-wrap">
                        <input
                          className="form-control"
                          type="text"
                          name="curriculum"
                          value={formData.curriculum}
                          onChange={handleInputChange}
                          placeholder="Enter student curriculum"
                        />
                        {errors.curriculum && <span className="invalid" style={{ color: "#e85347", fontSize: "11px", fontStyle: "italic" }}>{errors.curriculum.message}</span>}
                      </div>
                    </FormGroup>
                  </Col>

                  <Col md="4">
                    <FormGroup>
                      <label className="form-label">Student Location <span className="text-danger">*</span></label>
                      <input
                        className="form-control"
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        placeholder="Enter student location"
                      />
                      {errors.location && <span className="invalid">{errors.location.message}</span>}
                    </FormGroup>
                  </Col>

                  <Col md="4">
                    <FormGroup>
                      <label className="form-label">School Name <span className="text-danger">*</span></label>
                      <input
                        className="form-control"
                        type="text"
                        name="schoolName"
                        value={formData.schoolName}
                        onChange={handleInputChange}
                        placeholder="Enter school name"
                      />
                      {errors.schoolName && <span className="invalid">{errors.schoolName.message}</span>}
                    </FormGroup>
                  </Col>

                  <Col md="4">
                    <FormGroup>
                      <label className="form-label">Fees Per Hour / Class <span className="text-danger">*</span></label>
                      <input
                        className="form-control"
                        type="number"
                        name="feesPerHour"
                        value={formData.feesPerHour}
                        onChange={handleInputChange}
                        placeholder="Enter agreed fees per hour/class"
                      />
                      {errors.feesPerHour && <span className="invalid">{errors.feesPerHour.message}</span>}
                    </FormGroup>
                  </Col>

                  <Col md="4">
                    <FormGroup>
                      <label className="form-label">Annual Exam Month <span className="text-danger">*</span></label>
                      <select
                        className="form-control"
                        name="annualExamMonth"
                        value={formData.annualExamMonth}
                        onChange={handleInputChange}
                      >
                        <option value="">Select month</option>
                        <option value="1">January</option>
                        <option value="2">February</option>
                        <option value="3">March</option>
                        <option value="4">April</option>
                        <option value="5">May</option>
                        <option value="6">June</option>
                        <option value="7">July</option>
                        <option value="8">August</option>
                        <option value="9">September</option>
                        <option value="10">October</option>
                        <option value="11">November</option>
                        <option value="12">December</option>
                      </select>
                      {errors.annualExamMonth && <span className="invalid">{errors.annualExamMonth.message}</span>}
                    </FormGroup>
                  </Col>

                  <Col md="6">
                    <FormGroup>
                      <label className="form-label">Address <span className="text-danger">*</span></label>
                      <textarea
                        className="form-control"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        placeholder="Enter full address"
                        rows="3"
                      />
                      {errors.address && <span className="invalid">{errors.address.message}</span>}
                    </FormGroup>
                  </Col>

                  <Col md="6">
                    <FormGroup>
                      <label className="form-label">Demo Feedback <span className="text-danger">*</span></label>
                      <textarea
                        className="form-control"
                        name="demoFeedback"
                        value={formData.demoFeedback}
                        onChange={handleInputChange}
                        placeholder="Enter feedback for demo class"
                        rows="3"
                      />
                      {errors.demoFeedback && <span className="invalid">{errors.demoFeedback.message}</span>}
                    </FormGroup>
                  </Col>

                  <Col md="6">
                    <label className="form-label">ID Proof <span className="text-danger">*</span></label>
                    <FormGroup>
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
                      {filename && <span className="mt-1 d-block">{filename}</span>}
                    </FormGroup>
                  </Col>

                  <Col md="6">
                    <FormGroup className="mt-4">
                      <div className="custom-control custom-checkbox">
                        <input
                          type="checkbox"
                          className="custom-control-input"
                          id="termsAccepted"
                          name="termsAccepted"
                          checked={formData.termsAccepted}
                          onChange={handleCheckboxChange}
                        />
                        <label className="custom-control-label" htmlFor="termsAccepted">
                          <a href={`https://thechennaituition.com/terms-and-conditions/`} target="_blank" rel="noopener noreferrer" className="nav-link">
                            I accept the Terms and Conditions <span className="text-danger">*</span>
                          </a>
                        </label>
                      </div>
                      {errors.termsAccepted && <span className="invalid" style={{ color: "#e85347", fontSize: "11px", fontStyle: "italic" }}>{errors.termsAccepted.message}</span>}
                    </FormGroup>
                  </Col>
                </Row>
                <div className="mt-4">
                  <Button color="primary" type="submit" disabled={loading}>
                    {loading ? (
                      <>
                        <Spinner size="sm" className="mr-1" /> Submitting...
                      </>
                    ) : (
                      <>Submit Registration <Icon name="check"></Icon></>
                    )}
                  </Button>
                </div>
              </Form>
            </div>
          </CardBody>
        </Card>
        <ToastContainer />
      </Content>
    </React.Fragment>
  );
};

export default StudentRegistration;