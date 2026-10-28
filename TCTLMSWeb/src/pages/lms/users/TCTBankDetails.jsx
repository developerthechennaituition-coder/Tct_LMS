import React, { useEffect, useState } from "react";
import {
  FormGroup, Modal, ModalBody, ModalFooter, ModalHeader, Row, Form, Spinner,
} from "reactstrap";
import { toast, ToastContainer } from "react-toastify";
import {
  Block, BlockBetween, BlockHead, BlockHeadContent, BlockTitle, Icon, Col, Button, CustomReactDataTable, PreviewCard
} from "../../../components/Component";
import {
  DropdownMenu, DropdownToggle, UncontrolledDropdown,
} from "reactstrap";
import Content from "../../../layout/content/Content";

import Head from "../../../layout/head/Head";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { getTCTBankDetails, getTCTBankDetailById, addTCTBankDetail, updateTCTBankDetail, deleteTCTBankDetail } from "../../../apiservices/BankService";
import Swal from "sweetalert2";

const TCTBankDetailsList = () => {
  const [loading, setLoading] = useState(false);
  const [bankDataSource, setBankDataSource] = useState();
  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [isDelete, setIsDelete] = useState(false);
  const [itemPerPage, setItemPerPage] = useState(10);
  const [formData, setFormData] = useState({
    detailId: "00000000-0000-0000-0000-000000000000",
    accountNumber: "",
    ifscCode: "",
    bankName: "",
    branchName: "",
    upiID: "",
    swiftCode: "",
    bankAddress: "",
    ibanNumber: "",
    createdBy: localStorage.getItem("userId"),
    createdDate: new Date(),
    isActive: true,
  });
  
  const { errors, register, handleSubmit, reset } = useForm();
  
  // Load bank details on component mount and when dependencies change
  useEffect(() => {
    getTCTBankDetails().then(setBankDataSource);
  }, [modalOpen, isDelete, itemPerPage]);

  const dtBankDetailsColumns = [
    { name: "Bank", selector: (row) => row.bankName, sortable: true },
    { name: "Branch", selector: (row) => row.branchName, sortable: true },
    {
      name: "Status",
      selector: (row) => row.isActive,
      cell: (row) => (
        <span className={row.isActive === true ? "tb-status text-success" : "tb-status text-warning"}>
          {row.isActive === true ? "Active" : "Inactive"}
        </span>
      ),
      hide: "md",
    },
    {
      name: "Actions",
      selector: (row) => row.id,
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
      detailId: "00000000-0000-0000-0000-000000000000",
      accountNumber: "",
      ifscCode: "",
      bankName: "",
      branchName: "",
      upiID: "",
      swiftCode: "",
      ibanNumber: "",
      createdBy: localStorage.getItem("userId"),
      createdDate: new Date(),
      isActive: true,
    });
    reset(); // Reset React Hook Form
    setIsEdit(false);
  };

  const closeModal = () => {
    setModalOpen(false);
    resetForm();
  };

  const onFormSubmit = (data) => {    
    // Prevent duplicate submission
    if (loading) return;
    
    data.tctId = 1;
    setLoading(true);
    const isNewRecord = !isEdit;
    
    const operation = isEdit
      ? updateTCTBankDetail(formData.id, { ...formData })
      : addTCTBankDetail({ ...formData });

    operation
      .then(() => {
        setModalOpen(false);
        resetForm();
        getTCTBankDetails().then(setBankDataSource);
        toast.success(isNewRecord ? "Bank Details added successfully." : "Bank Details updated successfully.");
      })
      .catch((error) => {
        toast.error(`Error: ${error.message || "Something went wrong"}`);
      })
      .finally(() => {
        setLoading(false);
      });
  };
  
  const onEditHandler = (id) => {
    setIsEdit(true);
    getTCTBankDetailById(id).then((response) => {
      setFormData(response);
      setModalOpen(true);
    }).catch(error => {
      toast.error(`Error: ${error.message || "Failed to load bank details"}`);
    });
  };

  const onDeleteHandler = (id, flipStatus) => {
    Swal.fire({
      title: "Are you sure?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: flipStatus === true ? "Yes, Inactivate Bank Details!" : "Yes, Activate Bank Details!",
    }).then((result) => {
      if (result.isConfirmed) {
        getTCTBankDetailById(id).then((bankDetail) =>
          updateTCTBankDetail(id, { ...bankDetail, isActive: !flipStatus })
        ).then(() => {
          setIsDelete(!isDelete);
          toast.success(flipStatus === true ? "Bank Details inactivated successfully." : "Bank Details activated successfully.");
        }).catch(error => {
          toast.error(`Error: ${error.message || "Failed to update status"}`);
        });
      }
    });
  };

  const RenderGrid = ({ dataSource }) => {
    const searchableFields = ['bankName', 'branchName'];
    return (
      <>  
        <CustomReactDataTable
          data={bankDataSource}
          columns={dtBankDetailsColumns}
          pagination={true}
          className="nk-tb-list"
          canShowFilter={true} // Enable built-in filtering
          selectableRows={false}
          expandableRows={false}
          actions={true} // Enable export functionality
          searchableFields={searchableFields}
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
                <Icon name="plus" /> Add Bank details
              </Button>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        <Block>
          {bankDataSource && (
            <>
              <RenderGrid dataSource={bankDataSource} />
            </>
          )}
        </Block>
        <Modal isOpen={modalOpen} toggle={closeModal}>
          <ModalHeader toggle={closeModal}>{isEdit ? "Edit Bank Details" : "Add Bank Details"}</ModalHeader>
          <ModalBody>
            <div>
              <PreviewCard>
                <Form className="row gy-4" onSubmit={handleSubmit(onFormSubmit)}>
                  <>
                    <Row className="col-md-12">
                      <Col md="12">
                        <FormGroup>
                          <label className="form-label" htmlFor="accountName">
                            Account Name
                          </label>
                          <input
                            className="form-control"
                            type="text"
                            name="accountName"
                            id="accountName"
                            value={formData.accountName || ""}
                            onChange={(e) => {
                              setFormData({ ...formData, accountName: e.target.value });
                            }}
                            placeholder="Enter Account Name"
                            ref={register({ required: "Account Name is required" })}
                          />
                          {errors.accountName && <span className="invalid">{errors.accountName.message}</span>}
                        </FormGroup>
                      </Col>
                    </Row>
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
                            value={formData.accountNumber || ""}
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
                          <label className="form-label" htmlFor="accountType">
                            Account Type
                          </label>
                          <input
                            className="form-control"
                            type="text"
                            name="accountType"
                            id="accountType"
                            value={formData.accountType || ""}
                            onChange={(e) => {
                              setFormData({ ...formData, accountType: e.target.value });
                            }}
                            placeholder="Enter Account Type like Current/Savings"
                            ref={register({ required: "Account Type is required" })}
                          />
                          {errors.accountType && <span className="invalid">{errors.accountType.message}</span>}
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
                            value={formData.bankName || ""}
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
                            value={formData.branchName || ""}
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
                            value={formData.ifscCode || ""}
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
                            value={formData.upiID || ""}
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
                            Swift Code
                          </label>
                          <input
                            className="form-control"
                            type="text"
                            name="swiftCode"
                            id="swiftCode"
                            value={formData.swiftCode || ""}
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
                            value={formData.ibanNumber || ""}
                            onChange={(e) => {
                              setFormData({ ...formData, ibanNumber: e.target.value });
                            }}
                            placeholder="Enter IBAN Number"
                          />
                        </FormGroup>
                      </Col>
                    </Row>
                  </>                  
                  <Col size="12">
                    <ul className="align-center flex-wrap flex-sm-nowrap gx-4 gy-2">
                      <li>
                        <Button color="primary" type="submit" disabled={loading}>
                          {loading ? (
                            <>
                              <Spinner size="sm" className="mr-1" />{" "}
                              {isEdit ? "Updating Bank Details..." : "Adding Bank Details..."}
                            </>
                          ) : (
                            isEdit ? "Update Bank Details" : "Add Bank Details"
                          )}
                        </Button>
                      </li>
                      <li>
                        <Button color="light" onClick={closeModal} className="link link-light">
                          Cancel
                        </Button>
                      </li>
                    </ul>
                  </Col>
                </Form>
              </PreviewCard>
            </div>
          </ModalBody>
        </Modal>
        <ToastContainer />
      </Content>
    </>
  );
};

export default TCTBankDetailsList;
