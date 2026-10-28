import React, { useEffect, useState, useRef } from "react";
import {
  FormGroup, Modal, ModalBody, ModalFooter, ModalHeader, Row, Form,
} from "reactstrap";
import { toast, ToastContainer } from "react-toastify";
import {
  Block, BlockBetween, BlockHead, BlockHeadContent, BlockTitle, Icon, Col, Button, ReactDataTable, PreviewCard, RSelect
} from "../../../components/Component";
import {
  DropdownMenu, DropdownToggle, UncontrolledDropdown,
} from "reactstrap";
import Content from "../../../layout/content/Content";
import Head from "../../../layout/head/Head";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  getIndianTutorBankDetailsByTutorId, getForeignTutorBankDetailsByTutorId,
  getIndianTutorBankDetailsByBankId, getForeignTutorBankDetailsByBankId,
  addIndianTutorBankDetails, addForeignTutorBankDetails,
  updateIndianTutorBankDetails, updateForeignTutorBankDetails,
  deleteIndianTutorBankDetails, deleteForeignTutorBankDetails
} from "../../../apiservices/BankService";

import Swal from "sweetalert2";

const TCTBankDetailsList = () => {
  const [loading, setLoading] = useState(false);
  const [bankDataSource, setBankDataSource] = useState();
  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [isDelete, setIsDelete] = useState(false);
  const searchParams = new URLSearchParams(window.location.search);
  const [id, setId] = useState(searchParams.get("id"));
  const [itemPerPage, setItemPerPage] = useState(10);
  const [formData, setFormData] = useState({
    id: "00000000-0000-0000-0000-000000000000",
    tutorId: useState(searchParams.get("id")),
    accountNumber: "",
    ifscCode: "",
    bankName: "",
    branchName: "",
    upiId: "",
    swiftCode: "",
    bankAddress: "",
    createdBy: useState(searchParams.get("id")),
    createdDate: new Date(),
    isActive: true,
  });
  const { errors, register, handleSubmit, reset } = useForm();
  const isIndia = (localStorage.getItem("nationality") === "IN" || localStorage.getItem("nationality") === "India");

  useEffect(() => {
    (isIndia
      ? getIndianTutorBankDetailsByTutorId(id)
      : getForeignTutorBankDetailsByTutorId(id))
      .then(response => {
        //console.log("API Response:", response);        
        if (response && response.data) {
          //console.log("Response data:", response.data);
          setBankDataSource(response.data);
        } else if (Array.isArray(response)) {
          //console.log("Response is array with length:", response.length);
          setBankDataSource(response);
        } else {
          //console.log("Unexpected response structure:", response);
          setBankDataSource([]);
        }
      })
      .catch(error => {
        //console.error("Error fetching bank details:", error);
        setBankDataSource([]);
      });
  }, [modalOpen, isDelete, itemPerPage]);

  const dtUserColumns = [
    { name: "Bank", selector: (row) => row.bankName, sortable: true },
    { name: "Branch", selector: (row) => row.branchName, sortable: true },
    { name: "Payment Identifier", selector: (row) => row.paymentIdentifier, sortable: true },
    {
      name: "Status",
      selector: (row) => row.isActive,
      cell: (row) => (
        <span class={row.isActive === true ? "tb-status text-success" : "tb-status text-warning"}>
          {row.isActive === true ? "Active" : "Inactive"}
        </span>
      ),
      hide: "md",
    },
    {
      name: "Actions",
      selector: (row) => row.id,
      cell: (row) => <span>{row.id}</span>,
      cell: (row) => (
        <>
          <UncontrolledDropdown>
            <DropdownToggle color="tranparent" className="dropdown-toggle btn btn-icon btn-trigger mr-n1">
              <Icon name="more-h"></Icon>
            </DropdownToggle>
            <DropdownMenu right>
              <ul className="link-list-opt no-bdr">
                <li>
                  <Link
                    onClick={() => {
                      onEditHandler(row.id);
                    }}
                  >
                    <Icon name="edit"></Icon>
                    <span>Edit Bank Details</span>
                  </Link>
                </li>
                <li>
                  <Link
                    onClick={() => {
                      onDeleteHandler(row.id, row.isActive);
                    }}
                  >
                    <Icon name="trash"></Icon>
                    <span>{row.isActive === true ? "In activate" : "Activate"}</span>
                  </Link>
                </li>
              </ul>
            </DropdownMenu>
          </UncontrolledDropdown>
        </>
      ),
    },
  ];

  const resetForm = () => {
    setFormData({
      id: "00000000-0000-0000-0000-000000000000",
      accountNumber: "",
      ifscCode: "",
      bankName: "",
      branchName: "",
      upiId: "",
      swiftCode: "",
      bankAddress: "",
      createdBy: localStorage.getItem("userId"),
      tutorId: localStorage.getItem("userId"),
      createdDate: new Date(),
      isActive: true,
    });
    setIsEdit(false);
  };

  const closeModal = () => {
    setModalOpen(false);
    resetForm();
  };

  const onFormSubmit = (event) => {
    if (event) event.preventDefault(); // Prevent default form submission

    const isNewRecord = formData.id === "00000000-0000-0000-0000-000000000000";
    setLoading(true);

    const operation = isEdit
      ? (isIndia
        ? updateIndianTutorBankDetails(formData.id, { ...formData })
        : updateForeignTutorBankDetails(formData.id, { ...formData }) // Fixed this line
      )
      : (isIndia
        ? addIndianTutorBankDetails({ ...formData })
        : addForeignTutorBankDetails({ ...formData })
      );

    operation
      .then(() => {
        setModalOpen(false);
        resetForm();
        return (isIndia
          ? getIndianTutorBankDetailsByTutorId(id)
          : getForeignTutorBankDetailsByTutorId(id));
      })
      .then(response => {
        if (response && response.data) {
          setBankDataSource(response.data);
        } else if (Array.isArray(response)) {
          setBankDataSource(response);
        } else {
          setBankDataSource([]);
        }
        toast.success(isNewRecord ? "Bank Details added successfully." : "Bank Details updated successfully.");
      })
      .catch(error => {
        console.error("Error in bank details operation:", error);
        toast.error("An error occurred while processing your request.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const onEditHandler = (id) => {
    setIsEdit(true);
    (isIndia
      ? getIndianTutorBankDetailsByBankId(id)
      : getForeignTutorBankDetailsByBankId(id)).then((response) => {
        console.log("Response: " + response);
        setFormData(response);
        setModalOpen(true);
      });
  };

  const onDeleteHandler = (id, flipStatus) => {
    Swal.fire({
      title: "Are you sure?",
      //text: "You want to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: flipStatus === true ? "Yes, Inactivate Bank Details!" : "Yes, Activate Bank Details!",
    }).then((result) => {
      if (result.isConfirmed) {
        (isIndia
          ? deleteIndianTutorBankDetails(id)
          : deleteForeignTutorBankDetails(id)).then(() => {
          setIsDelete(!isDelete);
          toast.success(flipStatus === true ? "Bank Details inactivated successfully." : "Bank Details activated successfully.");
        });
      }
    });
  };

  const RenderGrid = (props) => {
    return (
      <>
        <ReactDataTable
          data={props.dataSource}
          columns={dtUserColumns}
          pagination
          pageSize={itemPerPage}
          className="nk-tb-list"
          canShowFilter={false}
        />
      </>
    );
  };

  return (
    <>
      <Head title="Bank Details" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle tag="h5">Bank Details</BlockTitle>
            </BlockHeadContent>
            <BlockHeadContent>
              <Button color="primary" onClick={() => {
                resetForm();
                setModalOpen(true);
              }}>
                <Icon name="plus" /> Add Bank Details
              </Button>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        <Block>
          {bankDataSource && (
            <>
              <RenderGrid dataSource={bankDataSource}></RenderGrid>
            </>
          )}
        </Block>
        <Modal isOpen={modalOpen} toggle={closeModal}>
          <ModalHeader toggle={closeModal}>{isEdit ? "Edit Bank Details" : "Add Bank Details"}</ModalHeader>
          <ModalBody>
            <div>
              <PreviewCard>
                <Form className="row gy-4" noValidate onSubmit={handleSubmit(onFormSubmit)}>
                  {isIndia ? (
                    <>
                      <Row className="col-md-12">
                        <Col md="12">
                          <FormGroup>
                            <label className="form-label" htmlFor="accountNumber">
                              Account Number
                            </label>
                            <input
                              className="form-control"
                              type="text"
                              name="accountNumber"
                              id="accountNumber"
                              defaultValue={formData.accountNumber}
                              value={formData.accountNumber}
                              onChange={(e) => {
                                setFormData({ ...formData, accountNumber: e.target.value });
                              }}
                              placeholder="Enter Account Number"
                              ref={register({ required: "Account Number is required" })}
                            />
                            {errors.accountNumber && <span className="invalid">{errors.accountNumber.message}</span>}
                          </FormGroup>
                        </Col>
                      </Row>
                      <Row className="col-md-12">
                        <Col md="12">
                          <FormGroup>
                            <label className="form-label" htmlFor="bankName">
                              Bank Name
                            </label>
                            <input
                              className="form-control"
                              type="text"
                              name="bankName"
                              id="bankName"
                              defaultValue={formData.bankName}
                              value={formData.bankName}
                              onChange={(e) => {
                                setFormData({ ...formData, bankName: e.target.value });
                              }}
                              placeholder="Enter Bank Name"
                              ref={register({ required: "Bank Name is required" })}
                            />
                            {errors.bankName && <span className="invalid">{errors.bankName.message}</span>}
                          </FormGroup>
                        </Col>
                      </Row>
                      <Row className="col-md-12">
                        <Col md="12">
                          <FormGroup>
                            <label className="form-label" htmlFor="branchName">
                              Branch Name
                            </label>
                            <input
                              className="form-control"
                              type="text"
                              name="branchName"
                              id="branchName"
                              defaultValue={formData.branchName}
                              value={formData.branchName}
                              onChange={(e) => {
                                setFormData({ ...formData, branchName: e.target.value });
                              }}
                              placeholder="Enter Branch Name"
                              ref={register({ required: "Branch Name is required" })}
                            />
                            {errors.branchName && <span className="invalid">{errors.branchName.message}</span>}
                          </FormGroup>
                        </Col>
                      </Row>
                      <Row className="col-md-12">
                        <Col md="12">
                          <FormGroup>
                            <label className="form-label" htmlFor="ifscCode">
                              IFSC Code
                            </label>
                            <input
                              className="form-control"
                              type="text"
                              name="ifscCode"
                              id="ifscCode"
                              value={formData && formData.ifscCode ? formData.ifscCode : ""}
                              onChange={(e) => {
                                setFormData({ ...formData, ifscCode: e.target.value });
                              }}
                              placeholder="Enter IFSC Code"
                              ref={register({ required: "IFSC code is required" })}
                            />
                            {errors.ifscCode && <span className="invalid">{errors.ifscCode.message}</span>}
                          </FormGroup>
                        </Col>
                      </Row>
                      <Row className="col-md-12">
                        <Col md="12">
                          <FormGroup>
                            <label className="form-label" htmlFor="upiID">
                              UPI ID</label>
                            <input
                              className="form-control"
                              type="text"
                              name="upiID"
                              id="upiID"
                              value={formData && formData.upiID ? formData.upiID : ""}
                              onChange={(e) => {
                                setFormData({ ...formData, upiID: e.target.value });
                              }}
                              placeholder="Enter UPI Id"
                            />
                          </FormGroup>
                        </Col>
                      </Row>
                      <Row className="col-md-12">
                        <Col md="12">
                          <FormGroup>
                            <label className="form-label" htmlFor="swiftCode">
                              Swfit Code
                            </label>
                            <input
                              className="form-control"
                              type="text"
                              name="swiftCode"
                              id="swiftCode"
                              defaultValue={formData.swiftCode}
                              value={formData.swiftCode}
                              onChange={(e) => {
                                setFormData({ ...formData, swiftCode: e.target.value });
                              }}
                              placeholder="Enter Swift Code"
                            />
                          </FormGroup>
                        </Col>
                      </Row> 
                      <Row className="col-md-12">
                        <Col md="12">
                          <FormGroup>
                            <label className="form-label" htmlFor="ibanNumber">
                              IBAN Number
                            </label>
                            <input
                              className="form-control"
                              type="text"
                              name="ibanNumber"
                              id="ibanNumber"
                              defaultValue={formData.ibanNumber}
                              value={formData.ibanNumber}
                              onChange={(e) => {
                                setFormData({ ...formData, ibanNumber: e.target.value });
                              }}
                              placeholder="Enter IBAN Number"
                            />
                          </FormGroup>
                        </Col>
                      </Row>                      
                    </>
                  ) : (
                    <>
                      <Row className="col-md-12">
                        <Col md="12">
                          <FormGroup>
                            <label className="form-label" htmlFor="paymentIdentifier">
                              Payment Identifier / Govt ID</label>
                            <input
                              className="form-control"
                              type="text"
                              name="paymentIdentifier"
                              id="paymentIdentifier"
                              value={formData && formData.paymentIdentifier ? formData.paymentIdentifier : ""}
                              onChange={(e) => {
                                setFormData({ ...formData, paymentIdentifier: e.target.value });
                              }}
                              placeholder="Enter Payment Identifier"
                              ref={register({ required: "This field is required" })}
                            />
                          </FormGroup>
                        </Col>
                      </Row>
                    </>
                  )}
                  <Col size="12">
                    <ul className="align-center flex-wrap flex-sm-nowrap gx-4 gy-2">
                      <li>
                        <Button color="primary" onClick={onFormSubmit} disabled={loading}>
                          {loading ? (isEdit ? "Updating Bank Details..." : "Adding Bank Details...") : (isEdit ? "Update Bank Details" : "Add Bank Details")}
                        </Button>
                      </li>
                      <li>
                        <a
                          href="#cancel"
                          onClick={closeModal}
                          className="link link-light"
                        >
                          Cancel
                        </a>
                      </li>
                    </ul>
                  </Col>
                </Form>
              </PreviewCard>
            </div>
          </ModalBody>
        </Modal>
        <ToastContainer />
      </Content >
    </>
  );
};
export default TCTBankDetailsList;