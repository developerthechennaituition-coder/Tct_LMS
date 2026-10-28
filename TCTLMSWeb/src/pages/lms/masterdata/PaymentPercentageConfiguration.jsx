import React, { useEffect, useState } from "react";
import {
  FormGroup, Modal, ModalBody, ModalFooter, ModalHeader, Row, Form, Spinner,
} from "reactstrap";
import { toast, ToastContainer } from "react-toastify";
import {
  Block, BlockBetween, BlockHead, BlockHeadContent, BlockTitle, Icon, Col, Button, CustomReactDataTable, PreviewCard,RSelect
} from "../../../components/Component";
import {
  DropdownMenu, DropdownToggle, UncontrolledDropdown,
} from "reactstrap";
import Content from "../../../layout/content/Content";
import {
  getPaymentPercentageConfig, getPaymentPercentageConfigById, addPaymentPercentageConfig, updatePaymentPercentageConfigById, deletePaymentPercentageConfig
} from "../../../apiservices/PaymentPercentageConfigService";
import Head from "../../../layout/head/Head";
import { Link } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import Swal from "sweetalert2";
import { getLookups } from "../../../apiservices/LookupsService";
import { usePermissions } from "../../../hooks/usePermissions";


const PaymentPercentageConfigList = () => {
  const { can } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [bankDataSource, setBankDataSource] = useState();
  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [isDelete, setIsDelete] = useState(false);
  const [itemPerPage, setItemPerPage] = useState(10);
  const [boardList, setBoardList] = useState([]);
  const [gradeList, setGradeList] = useState([]);
  const [subjectList, setSubjectList] = useState([]);
  const defaultGuid = "00000000-0000-0000-0000-000000000000";
  const [formData, setFormData] = useState({
        id: defaultGuid,
        board: defaultGuid,
        grade: defaultGuid,
        subject: defaultGuid,
        tutorPercentage: "",
        tctPercentage: "",
        tutorPercentageDiscount: "0",
        tctPercentageDiscount: "0"
      });
  
  const { errors, register, handleSubmit, reset } = useForm();
  
  // Load threshold config on component mount and when dependencies change
  useEffect(() => {
    getPaymentPercentageConfig().then(setBankDataSource);
  }, [modalOpen, isDelete, itemPerPage]);

  // Load lookup data on component mount
    useEffect(() => {
      const loadLookups = async () => {
        try {
          // Load Grade lookup
          const gradeResponse = await getLookups("300");
          const gradeTemp = [{ value: defaultGuid, label: "Select grade" }];
          gradeResponse.forEach((s) => {
            gradeTemp.push({ value: s?.id, label: s?.typeCodeName });
          });
          setGradeList(gradeTemp);
  
          // Load Board lookup
          const boardResponse = await getLookups("400");
          const boardTemp = [{ value: defaultGuid, label: "Select board" }];
          boardResponse.forEach((s) => {
            boardTemp.push({ value: s?.id, label: s?.typeCodeName, id: s?.id });
          });
          setBoardList(boardTemp);
  
          // Load Subject lookup
          const subjectResponse = await getLookups("500");
          const subjectTemp = [{ value: defaultGuid, label: "Select subject" }];
          subjectResponse.forEach((s) => {
            subjectTemp.push({ value: s?.id, label: s?.typeCodeName });
          });
          setSubjectList(subjectTemp);
        } catch (error) {
          console.error("Error loading lookups:", error);
          toast.error("Failed to load dropdown data");
        }
      };
  
      loadLookups();
    }, []);

 const dtPaymentPercentageConfigColumns = [
     {
       name: "BoardName",
       selector: (row) => row.boardName,
       sortable: true,
       width: "200px"
     },
     {
       name: "GradeName",
       selector: (row) => row.gradeName,
       sortable: true,
       width: "150px"
     },
     {
       name: "SubjectName",
       selector: (row) => row.subjectName,
       sortable: true,
       width: "200px"
     },
     {
       name: "Tutor %",
       selector: (row) => row.tutorPercentage,
       sortable: true,
       width: "120px"
     },
     {
       name: "TCT %",
       selector: (row) => row.tctPercentage,
       sortable: true,
       width: "120px"
     },
     {
       name: "Tutor % Discount",
       selector: (row) => row.tutorPercentageDiscount,
       sortable: true,
       width: "160px"
     },
     {
       name: "TCT % Discount",
       selector: (row) => row.tctPercentageDiscount,
       sortable: true,
       width: "160px"
     },
     {
       name: "Status",
       selector: (row) => row.isActive,
       cell: (row) => (
         <span className={row.isActive ? "tb-status text-success" : "tb-status text-warning"}>
           {row.isActive ? "Active" : "Inactive"}
         </span>
       ),
       width: "100px",
       hide: "md",
     },
     {
       name: "Actions",
       cell: (row) => (
         <UncontrolledDropdown>
           <DropdownToggle color="tranparent" className="dropdown-toggle btn btn-icon btn-trigger mr-n1">
             <Icon name="more-h" />
           </DropdownToggle>
           <DropdownMenu right>
             <ul className="link-list-opt no-bdr">
               {can("Payment % Configuration", "edit") && (
                 <li>
                   <Link onClick={() => onEditHandler(row.id)}>
                     <Icon name="edit" />
                     <span>Edit</span>
                   </Link>
                 </li>
               )}
               {can("Payment % Configuration", "delete") && (
                 <li>
                   <Link onClick={() => onDeleteHandler(row.id, row.isActive)}>
                     <Icon name="trash" />
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
     }
   ];

  const resetForm = () => {
    setFormData({
      id: defaultGuid,
      board: defaultGuid,
      grade: defaultGuid,
      subject: defaultGuid,
      tutorPercentage: "",
      tctPercentage: "",
      tutorPercentageDiscount: 0,
      tctPercentageDiscount: 0,
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
      ? updatePaymentPercentageConfigById(formData.id, { ...formData })
      : addPaymentPercentageConfig({ ...formData });

    operation
      .then(() => {
        setModalOpen(false);
        resetForm();
        getPaymentPercentageConfig().then(setBankDataSource);
        toast.success(isNewRecord ? "Payment Percentage Config added successfully." : "Payment Percentage Config updated successfully.");
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
    getPaymentPercentageConfigById(id).then((response) => {
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
        deletePaymentPercentageConfig(id).then(() => {
          setIsDelete(!isDelete);
          toast.success(flipStatus === true ? "Payment Percentage Config inactivated successfully." : "Payment Percentage Config activated successfully.");
        }).catch(error => {
          toast.error(`Error: ${error.message || "Failed to update status"}`);
        });
      }
    });
  };

  const RenderGrid = ({ dataSource }) => {
    const searchableFields = [
      'boardName',
      'gradeName',
      'subjectName',
      'tutorPercentage',
      'tctPercentage',
      'tutorPercentageDiscount',
      'tctPercentageDiscount'
    ];

    return (
      <>  
        <CustomReactDataTable
          data={bankDataSource}
          columns={dtPaymentPercentageConfigColumns}
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
      <Head title="Percentage Configurations" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle tag="h5">Percentage Configurations</BlockTitle>
            </BlockHeadContent>
            <BlockHeadContent>
              {can("Payment % Configuration", "add") && (
                <Button color="primary" onClick={() => {
                  resetForm();
                  setModalOpen(true);
                }}>
                  <Icon name="plus" /> Add Payment Percentage Config
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
            {isEdit ? "Edit Payment Percentage Config" : "Add Payment Percentage Config"}
          </ModalHeader>
          <ModalBody>
            <div>
              <PreviewCard>
                <Form className="row gy-4" onSubmit={handleSubmit(onFormSubmit)}>
                  <Row className="col-md-12">
                    <Col md="4">
                      <FormGroup>
                        <label className="form-label" htmlFor="board">Board <span className="text-danger">*</span></label>
                        <RSelect
                          dataSource={boardList || []}
                          value1={formData.board}
                          disabled={false}
                          onChangeHandler={(e) => {
                            const temp = { ...formData };
                            temp["board"] = e.value;
                            setFormData(temp);
                          }}
                          ref={register({ required: "This field is required" })}
                        />
                        {errors.entityType && <span className="invalid">{errors.entityType.message}</span>}
                      </FormGroup>
                    </Col>
                    <Col md="4">
                      <FormGroup>
                        <label className="form-label" htmlFor="grade">Grade <span className="text-danger">*</span></label>
                        <RSelect
                          dataSource={gradeList || []}
                          value1={formData.grade}
                          disabled={false}
                          onChangeHandler={(e) => {
                            const temp = { ...formData };
                            temp["grade"] = e.value;
                            setFormData(temp);
                          }}
                          ref={register({ required: "This field is required" })}
                        />
                        {errors.entityType && <span className="invalid">{errors.entityType.message}</span>}
                      </FormGroup>
                    </Col>
                    <Col md="4">
                      <FormGroup>
                        <label className="form-label" htmlFor="board">Subject <span className="text-danger">*</span></label>
                        <RSelect
                          dataSource={subjectList || []}
                          value1={formData.subject}
                          disabled={false}
                          onChangeHandler={(e) => {
                            const temp = { ...formData };
                            temp["subject"] = e.value;
                            setFormData(temp);
                          }}
                          ref={register({ required: "This field is required" })}
                        />
                        {errors.entityType && <span className="invalid">{errors.entityType.message}</span>}
                      </FormGroup>
                    </Col>
                  </Row>
                  
                  <Row className="col-md-12">
                    <Col md="6">
                      <FormGroup>
                        <label className="form-label" htmlFor="tutorPercentage">
                          Tutor % <span className="text-danger">*</span>
                        </label>
                        <input
                          className="form-control"
                          type="text"
                          name="tutorPercentage"
                          id="tutorPercentage"
                          value={formData.tutorPercentage || ""}
                          onChange={(e) => {
                            setFormData({ ...formData, tutorPercentage: e.target.value });
                          }}
                          placeholder="Enter Tutor Percentage"
                          ref={register({ required: "Tutor Percentage Name is required" })}
                        />
                        {errors.tutorPercentage && <span className="invalid">{errors.tutorPercentage.message}</span>}
                      </FormGroup>
                    </Col>
                    <Col md="6">
                      <FormGroup>
                        <label className="form-label" htmlFor="tctPercentage">
                          TCT % <span className="text-danger">*</span>
                        </label>
                        <input
                          className="form-control"
                          type="text"
                          name="tctPercentage"
                          id="tctPercentage"
                          value={formData.tctPercentage || ""}
                          onChange={(e) => {
                            setFormData({ ...formData, tctPercentage: e.target.value });
                          }}
                          placeholder="Enter TCT Percentage"
                          ref={register({ required: "TCT Percentage Name is required" })}
                        />
                        {errors.tctPercentage && <span className="invalid">{errors.tctPercentage.message}</span>}
                      </FormGroup>
                    </Col>
                  </Row>

                  <Row className="col-md-12">
                    <Col md="6">
                      <FormGroup>
                        <label className="form-label" htmlFor="tutorPercentageDiscount">
                          Tutor % Discount<span className="text-danger">*</span>
                        </label>
                        <input
                          className="form-control"
                          type="text"
                          name="tutorPercentageDiscount"
                          id="tutorPercentageDiscount"
                          value={formData.tutorPercentageDiscount || "0"}
                          onChange={(e) => {
                            setFormData({ ...formData, tutorPercentageDiscount: e.target.value });
                          }}
                          placeholder="Enter Tutor % Discount"
                          ref={register({ required: "Tutor % Discount Name is required" })}
                        />
                        {errors.tutorPercentageDiscount && <span className="invalid">{errors.tutorPercentageDiscount.message}</span>}
                      </FormGroup>
                    </Col>
                    <Col md="6">
                      <FormGroup>
                        <label className="form-label" htmlFor="tctPercentageDiscount">
                          TCT % Discount <span className="text-danger">*</span>
                        </label>
                        <input
                          className="form-control"
                          type="text"
                          name="tctPercentageDiscount"
                          id="tctPercentageDiscount"
                          value={formData.tctPercentageDiscount || "0"}
                          onChange={(e) => {
                            setFormData({ ...formData, tctPercentageDiscount: e.target.value });
                          }}
                          placeholder="Enter TCT % Discount"
                          ref={register({ required: "TCT % Discount is required" })}
                        />
                        {errors.tctPercentageDiscount && <span className="invalid">{errors.tctPercentageDiscount.message}</span>}
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
                            isEdit ? "Update Payment Percentage Config" : "Add Payment Percentage Config"
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

export default PaymentPercentageConfigList;