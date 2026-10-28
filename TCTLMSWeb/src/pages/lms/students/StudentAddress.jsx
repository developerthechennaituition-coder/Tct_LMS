import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
    Modal, ModalBody, FormGroup, Form, Spinner,
} from "reactstrap";
import {
    Block, BlockBetween, BlockDes, BlockHead, lockHeadContent,
    BlockTitle,
    Icon,
    Row,
    Col,
    Button,
    RSelect,
} from "../../../components/Component";
import classNames from "classnames";
import { ToastContainer } from "react-toastify";
import { toast } from "react-toastify";
import { addUpdateAddress } from "../../../apiservices/StudentEnrollmentService";
import { usePermissions } from "../../../hooks/usePermissions";

const StudentAddress = (props) => {
    const [formData, setFormData] = useState(props.studentAddress)
    const [loading, setLoading] = useState(false);

    useEffect(() => {

    });

    const CloseButton = () => {
        return (
          <span className="btn-trigger toast-close-button" role="button">
            <Icon name="cross"></Icon>
          </span>
        );
      };

    const onFormSubmit = (submitData) => {
        const inputData = formData;
        setLoading(true);
        addUpdateAddress(inputData).then((response) => {
            if (props.addAddressCallback) {
                props.addAddressCallback();
                toast.success("Address Add/Updated successufully.", {
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

    const formClass = classNames({
        "form-validate": true,
        "is-alter": 'alter',
    });
    const { errors, register, handleSubmit } = useForm();
    const { can } = usePermissions();
    return (<>
        <Form className={`${formClass} row gy-4`} noValidate onSubmit={handleSubmit(onFormSubmit)}>
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
                                defaultValue={formData?.addressLine1}
                                value={formData?.addressLine1}
                                onChange={(e) => {
                                    setFormData({ ...formData, addressLine1: e.target.value });
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
                                defaultValue={formData?.addressLine2}
                                value={formData?.addressLine2}
                                onChange={(e) => {
                                    setFormData({ ...formData, addressLine2: e.target.value });
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
                        <label className="form-label" htmlFor="addressLine3">Address Line3</label>
                        <div className="form-control-wrap">
                            <input
                                className="form-control"
                                type="text"
                                name="addressLine3"
                                id="addressLine3"
                                defaultValue={formData?.addressLine3}
                                value={formData?.addressLine3}
                                onChange={(e) => {
                                    setFormData({ ...formData, addressLine3: e.target.value });
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
                                defaultValue={formData?.city}
                                value={formData?.city}
                                onChange={(e) => {
                                    setFormData({ ...formData, city: e.target.value });
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
                                defaultValue={formData?.zipCode}
                                value={formData?.zipCode}
                                onChange={(e) => {
                                    setFormData({ ...formData, zipCode: e.target.value });
                                }}
                                placeholder="Enter name"
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
                                defaultValue={formData?.state}
                                value={formData?.state}
                                onChange={(e) => {
                                    setFormData({ ...formData, state: e.target.value });
                                }}
                                placeholder="Enter name"
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
                            <input
                                className="form-control"
                                type="text"
                                name="country"
                                id="country"
                                defaultValue={formData?.country}
                                value={formData?.country}
                                onChange={(e) => {
                                    setFormData({ ...formData, country: e.target.value });
                                }}
                                placeholder="Enter name"
                                ref={register({ required: "This field is required" })}
                            />
                            {errors.country && <span className="invalid">{errors.country.message}</span>}
                        </div>
                    </FormGroup>
                </Col>
            </Row>
            <Col size="12">
                <ul className="align-center flex-wrap flex-sm-nowrap gx-4 gy-2">
                    {can("Student List", "edit") && (
                    <li>
                        <Button color="primary" size="md" type="submit" disabled={loading}>
                            {loading ? (
                                <>
                                    <Spinner size="sm" className="mr-1" /> Updating...
                                </>
                            ) : (
                                "Update Address"
                            )}
                        </Button>
                    </li>
                    )}
                    <li>
                        <a
                            href="#cancel"
                            onClick={(ev) => {
                                ev.preventDefault();
                                if (props?.onFormCancel) {
                                    props.onFormCancel();   // 👈 calls back to parent to close modal
                                }
                            }}
                            className="link link-light"
                        >
                            Cancel
                        </a>

                    </li>
                </ul>
            </Col>
        </Form >
        <ToastContainer />
    </>);
}
export default StudentAddress;