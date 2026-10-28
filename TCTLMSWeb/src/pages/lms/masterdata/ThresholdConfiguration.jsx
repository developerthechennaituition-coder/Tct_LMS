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
import {
  getThresholdConfig, getThresholdConfigById, addThresholdConfig, updateThresholdConfigById, deleteThresholdConfig
} from "../../../apiservices/ThresholdConfigService";
import Head from "../../../layout/head/Head";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import Swal from "sweetalert2";
import { usePermissions } from "../../../hooks/usePermissions";

const ThresholdConfigurationList = () => {
  const { can } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [bankDataSource, setBankDataSource] = useState();
  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [isDelete, setIsDelete] = useState(false);
  const [itemPerPage, setItemPerPage] = useState(10);
  const [formData, setFormData] = useState({
    id: "00000000-0000-0000-0000-000000000000",
    entityType: "",
    groupKey: "",
    thresholdName: "",
    value: "",
    unit: "",
    description: "",
    createdBy: localStorage.getItem("userId"),
    createdDate: new Date(),
    isActive: true,
  });
  
  const { errors, register, handleSubmit, reset } = useForm();
  
  // Load threshold config on component mount and when dependencies change
  useEffect(() => {
    getThresholdConfig().then(setBankDataSource);
  }, [modalOpen, isDelete, itemPerPage]);

  const dtThresholdColumns = [
    { 
      name: "Entity Type", 
      selector: (row) => row.entityType, 
      sortable: true,
      width: "150px"
    },
    { 
      name: "Group Key", 
      selector: (row) => row.groupKey, 
      sortable: true,
      width: "200px"
    },
    { 
      name: "Threshold Name", 
      selector: (row) => row.thresholdName, 
      sortable: true,
      width: "300px",
      wrap: true,
      cell: (row) => (
        <div title={row.thresholdName} style={{ 
          overflow: 'hidden', 
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '300px'
        }}>
          {row.thresholdName}
        </div>
      )
    },
    { 
      name: "Value", 
      selector: (row) => row.value, 
      sortable: true,
      width: "100px"
    },
    { 
      name: "Unit", 
      selector: (row) => row.unit, 
      sortable: true,
      width: "120px"
    },
    { 
      name: "Description", 
      selector: (row) => row.description, 
      sortable: true,
      width: "300px",
      wrap: true,
      cell: (row) => (
        <div title={row.description} style={{ 
          overflow: 'hidden', 
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '250px'
        }}>
          {row.description}
        </div>
      )
    },
    {
      name: "Status",
      selector: (row) => row.isActive,
      cell: (row) => (
        <span className={row.isActive === true ? "tb-status text-success" : "tb-status text-warning"}>
          {row.isActive === true ? "Active" : "Inactive"}
        </span>
      ),
      width: "100px",
      hide: "md",
    },
    {
      name: "Actions",
      selector: (row) => row.id,
      cell: (row) => (
        <UncontrolledDropdown>
          <DropdownToggle color="tranparent" className="dropdown-toggle btn btn-icon btn-trigger mr-n1">
            <Icon name="more-h"></Icon>
          </DropdownToggle>
          <DropdownMenu right>
            <ul className="link-list-opt no-bdr">
              {can("Threshold Configuraion", "edit") && (
                <li>
                  <Link onClick={() => onEditHandler(row.id)}>
                    <Icon name="edit"></Icon>
                    <span>Edit</span>
                  </Link>
                </li>
              )}
              {can("Threshold Configuraion", "delete") && (
                <li>
                  <Link onClick={() => onDeleteHandler(row.id, row.isActive)}>
                    <Icon name="trash"></Icon>
                    <span>{row.isActive ? "Inactivate" : "Activate"}</span>
                  </Link>
                </li>
              )}
            </ul>
          </DropdownMenu>
        </UncontrolledDropdown>
      ),
      width: "100px",
      ignoreRowClick: true,
      allowOverflow: true,
      button: true,
    },
  ];

  const resetForm = () => {
    setFormData({
      id: "00000000-0000-0000-0000-000000000000",
      entityType: "",
      groupKey: "",
      thresholdName: "",
      value: "",
      unit: "",
      description: "",
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
      ? updateThresholdConfigById(formData.id, { ...formData })
      : addThresholdConfig({ ...formData });

    operation
      .then(() => {
        setModalOpen(false);
        resetForm();
        getThresholdConfig().then(setBankDataSource);
        toast.success(isNewRecord ? "Threshold Configuration added successfully." : "Threshold Configuration updated successfully.");
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
    getThresholdConfigById(id).then((response) => {
      setFormData(response);
      setModalOpen(true);
    }).catch(error => {
      toast.error(`Error: ${error.message || "Failed to load threshold configuration"}`);
    });
  };

  const onDeleteHandler = (id, flipStatus) => {
    Swal.fire({
      title: "Are you sure?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: flipStatus === true ? "Yes, Inactivate!" : "Yes, Activate!",
    }).then((result) => {
      if (result.isConfirmed) {
        deleteThresholdConfig(id).then(() => {
          setIsDelete(!isDelete);
          toast.success(flipStatus === true ? "Threshold Configuration inactivated successfully." : "Threshold Configuration activated successfully.");
        }).catch(error => {
          toast.error(`Error: ${error.message || "Failed to update status"}`);
        });
      }
    });
  };

  const RenderGrid = ({ dataSource }) => {
    const searchableFields = [
      'entityType',
      'groupKey',
      'thresholdName',
      'value',
      'unit',
      'description'
    ];

    return (
      <>  
        <CustomReactDataTable
          data={bankDataSource}
          columns={dtThresholdColumns}
          pagination={true} 
          canShowFilter={true}
          selectableRows={false}
          expandableRows={false}
          actions={true}
          searchableFields={searchableFields}
        />
      </>
    );
  };

  return (
    <>
      <Head title="Threshold Configurations" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle tag="h5">Threshold Configurations</BlockTitle>
            </BlockHeadContent>
            <BlockHeadContent>
              {can("Threshold Configuraion", "add") && (
                <Button color="primary" onClick={() => {
                  resetForm();
                  setModalOpen(true);
                }}>
                  <Icon name="plus" /> Add Threshold Configuration
                </Button>
              )}
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
        
        <Modal isOpen={modalOpen} toggle={closeModal} size="lg">
          <ModalHeader toggle={closeModal}>
            {isEdit ? "Edit Threshold Configuration" : "Add Threshold Configuration"}
          </ModalHeader>
          <ModalBody>
            <div>
              <PreviewCard>
                <Form className="row gy-4" onSubmit={handleSubmit(onFormSubmit)}>
                  <Row className="col-md-12">
                    <Col md="6">
                      <FormGroup>
                        <label className="form-label" htmlFor="entityType">
                          Entity Type <span className="text-danger">*</span>
                        </label>
                        <input
                          className="form-control"
                          type="text"
                          name="entityType"
                          id="entityType"
                          value={formData.entityType || ""}
                          onChange={(e) => {
                            setFormData({ ...formData, entityType: e.target.value });
                          }}
                          placeholder="Enter Entity Type"
                          ref={register({ required: "Entity Type is required" })}
                        />
                        {errors.entityType && <span className="invalid">{errors.entityType.message}</span>}
                      </FormGroup>
                    </Col>
                    <Col md="6">
                      <FormGroup>
                        <label className="form-label" htmlFor="groupKey">
                          Group Key <span className="text-danger">*</span>
                        </label>
                        <input
                          className="form-control"
                          type="text"
                          name="groupKey"
                          id="groupKey"
                          value={formData.groupKey || ""}
                          onChange={(e) => {
                            setFormData({ ...formData, groupKey: e.target.value });
                          }}
                          placeholder="Enter Group Key"
                          ref={register({ required: "Group Key is required" })}
                        />
                        {errors.groupKey && <span className="invalid">{errors.groupKey.message}</span>}
                      </FormGroup>
                    </Col>
                  </Row>
                  
                  <Row className="col-md-12">
                    <Col md="12">
                      <FormGroup>
                        <label className="form-label" htmlFor="thresholdName">
                          Threshold Name <span className="text-danger">*</span>
                        </label>
                        <input
                          className="form-control"
                          type="text"
                          name="thresholdName"
                          id="thresholdName"
                          value={formData.thresholdName || ""}
                          onChange={(e) => {
                            setFormData({ ...formData, thresholdName: e.target.value });
                          }}
                          placeholder="Enter Threshold Name"
                          ref={register({ required: "Threshold Name is required" })}
                        />
                        {errors.thresholdName && <span className="invalid">{errors.thresholdName.message}</span>}
                      </FormGroup>
                    </Col>
                  </Row>
                  
                  <Row className="col-md-12">
                    <Col md="6">
                      <FormGroup>
                        <label className="form-label" htmlFor="value">
                          Value <span className="text-danger">*</span>
                        </label>
                        <input
                          className="form-control"
                          type="number"
                          name="value"
                          id="value"
                          value={formData.value || ""}
                          onChange={(e) => {
                            setFormData({ ...formData, value: e.target.value });
                          }}
                          placeholder="Enter Value"
                          ref={register({ required: "Value is required" })}
                        />
                        {errors.value && <span className="invalid">{errors.value.message}</span>}
                      </FormGroup>
                    </Col>
                    <Col md="6">
                      <FormGroup>
                        <label className="form-label" htmlFor="unit">
                          Unit <span className="text-danger">*</span>
                        </label>
                         <input
                          className="form-control"
                          type="text"
                          name="unit"
                          id="unit"
                          value={formData.unit || ""}
                          onChange={(e) => {
                            setFormData({ ...formData, unit: e.target.value });
                          }}
                          placeholder="Enter Unit"
                          ref={register({ required: "Unit is required" })}
                        />
                        
                        {errors.unit && <span className="invalid">{errors.unit.message}</span>}
                      </FormGroup>
                    </Col>
                  </Row>
                  
                  <Row className="col-md-12">
                    <Col md="12">
                      <FormGroup>
                        <label className="form-label" htmlFor="description">
                          Description
                        </label>
                        <textarea
                          className="form-control"
                          name="description"
                          id="description"
                          rows="3"
                          value={formData.description || ""}
                          onChange={(e) => {
                            setFormData({ ...formData, description: e.target.value });
                          }}
                          placeholder="Enter Description"
                        />
                      </FormGroup>
                    </Col>
                  </Row>
                  
                  <Col size="12">
                    <ul className="align-center flex-wrap flex-sm-nowrap gx-4 gy-2">
                      <li>
                        <Button color="primary" type="submit" disabled={loading}>
                          {loading ? (
                            <>
                              <Spinner size="sm" className="mr-1" />{" "}
                              {isEdit ? "Updating..." : "Adding..."}
                            </>
                          ) : (
                            isEdit ? "Update Threshold Configuration" : "Add Threshold Configuration"
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

export default ThresholdConfigurationList;