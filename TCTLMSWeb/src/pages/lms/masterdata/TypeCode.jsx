import { useEffect, useState } from "react";
import Content from "../../../layout/content/Content";
import {
  Block,
  BlockBetween,
  BlockDes,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Icon,
  Row,
  Col,
  Button,
  TooltipComponent,
  ReactDataTable,
} from "../../../components/Component";
import { Modal, ModalBody, FormGroup, Form, Spinner } from "reactstrap";
import { useForm } from "react-hook-form";
import classNames from "classnames";
import { ToastContainer } from "react-toastify";
import { toast } from "react-toastify";
import { Card, DropdownItem, UncontrolledDropdown, DropdownMenu, DropdownToggle } from "reactstrap";
import { getLookups, addUpdateTypecode, deleteTypecode } from "../../../apiservices/LookupsService";
import { useLocation, Link } from "react-router-dom";
import Swal from "sweetalert2";
import Head from "../../../layout/head/Head";

const TypeCode = () => {
  const location = useLocation();
  const defaultGuid = "00000000-0000-0000-0000-000000000000";
  const [typeCodeDataSource, setTypeCodeDataSource] = useState();
  const [originalData, setOriginalData] = useState([]);
  const searchParams = new URLSearchParams(location.search);
  const [code, setCode] = useState(searchParams.get("code"));
  const [typegroupId, setTypeGroupId] = useState(searchParams.get("typegroupId"));
  const [tablesm, updateTableSm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [onSearch, setonSearch] = useState(true);
  const [onSearchText, setSearchText] = useState("");
  const [itemPerPage] = useState(10);
  const [id, setId] = useState(searchParams.get("id"));
  const [modal, setModal] = useState(false);
  const name = searchParams.get("name");
  const [sort, setSortState] = useState("");
  const [isNewTypeCode, setIsNewTypeCode] = useState(true);
  const [formData, setFormData] = useState({
    isActive: true,
    id: defaultGuid,
    typeGroupId: typegroupId,
    typeCodeValue: 0,
    typeCodeName: "",
    typeCodeDescription: "",
  });

  const dtTypeGroup = [
    {
      name: "Name",
      minWidth: "200px",
      selector: (row) => row.typeCodeName,
      sortable: true,
      cell: (row) => <span>{row.typeCodeName}</span>,
    },
    {
      name: "Description",
      minWidth: "200px",
      selector: (row) => row.typeCodeDescription,
      sortable: true,
      cell: (row) => <span>{row.typeCodeDescription}</span>,
    },
    {
      name: "Status",
      width: "120px",
      selector: (row) => row.isActive,
      sortable: true,
      cell: (row) => (
        <span class={row.isActive === true ? "tb-status text-success" : "tb-status text-warning"}>
          {row.isActive === true ? "Active" : "Inactive"}
        </span>
      ),
      hide: "md",
    },
    {
      name: "Action",
      sortable: false,
      hide: "sm",
      width: "100px",
      cell: (row) => (
        <UncontrolledDropdown>
          <DropdownToggle color="transparent" className="dropdown-toggle btn btn-icon btn-trigger mr-n1">
            <Icon name="more-h"></Icon>
          </DropdownToggle>
          <DropdownMenu right>
            <ul className="link-list-opt no-bdr">
              <li>
                <Link
                  onClick={() => {
                    clearForm();
                    setIsNewTypeCode(false);
                    const temp = { ...formData };
                    temp.id = row?.id;
                    temp.typeCodeDescription = row?.typeCodeDescription;
                    temp.typeCodeName = row?.typeCodeName;
                    temp.typeGroupId = row?.typeGroupId;
                    setFormData(temp);
                    setModal(true);
                  }}
                >
                  <Icon name="edit"></Icon>
                  <span>Edit TypeCode</span>
                </Link>
              </li>
              <li>
                <Link onClick={() => onDeleteTypeCode(row.id)}>
                  <Icon name="trash"></Icon>
                  <span>Delete TypeCode</span>
                </Link>
              </li>
            </ul>
          </DropdownMenu>
        </UncontrolledDropdown>
      ),
    },
  ];

  const toggle = () => setonSearch(!onSearch);
  const onFilterChange = (e) => {
    const filterText = e.target.value.toLowerCase();
    setSearchText(filterText);

    const filteredData = originalData.filter((item) => item.typeCodeName.toLowerCase().includes(filterText));
    setTypeCodeDataSource(filteredData);
  };

  useEffect(() => {
    getLookups(code).then((response) => {
      setTypeCodeDataSource(response);
      setOriginalData(response);
    });
  }, []);

  const clearForm = () => {
    const temp = { ...formData };
    temp.typeCodeDescription = "";
    temp.id = defaultGuid;
    temp.typeCodeName = "";
    setFormData(temp);
  };
  const onFormSubmit = (input) => {
    setLoading(true);
    addUpdateTypecode(formData).then((response) => {
      if (response?.succeeded === true) {
        toast.success(isNewTypeCode ? "Lookup value added successfully!" : "Lookup value updated successfully", {
          position: "top-right",
          autoClose: true,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: false,
          closeButton: <CloseButton />,
        });
        setModal(false);
        setIsNewTypeCode(true);
        clearForm();
        getLookups(code).then((response) => {
          setTypeCodeDataSource(response);
        });
      } else {
        toast.error(response.message, {
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

  const CloseButton = () => {
    return (
      <span className="btn-trigger toast-close-button" role="button">
        <Icon name="cross"></Icon>
      </span>
    );
  };

  const onDeleteTypeCode = (id) => {
  Swal.fire({
    title: "Are you sure want to delete?",
    text: "You won't be able to revert this!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, delete it!",
  }).then((result) => {
    if (result.isConfirmed) {
      deleteTypecode(id).then((response) => {
        getLookups(code).then((response) => {
          setTypeCodeDataSource(response);
        });
        toast.success("Data deleted successfully.", {
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
    }
  });
};

  const formClass = classNames({
    "form-validate": true,
    "is-alter": "alter",
  });

  const RenderGrid = (props) => {
    return (
      <>
        <ReactDataTable
          data={props.dataSource}
          columns={dtTypeGroup}
          pagination
          pageSize={10} 
          canShowFilter={false}
        />
      </>
    );
  };

  const { errors, register, handleSubmit } = useForm();
  return (
    <>
      <Content>
        <Head title="Master Details"></Head>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page>Type Codes for {name}</BlockTitle>
            </BlockHeadContent>
            <BlockHeadContent>
              <div className="toggle-wrap nk-block-tools-toggle">
                <div className="toggle-expand-content" style={{ display: "block" }}>
                  <ul className="nk-block-tools g-3">
                    <li class="nk-block-tools-opt d-none d-sm-block">
                      <a
                        class="btn btn-primary"
                        data-bs-toggle="modal"
                        href="#modalCreate"
                        onClick={() => {
                          setIsNewTypeCode(true);
                          setModal(true);
                          clearForm();
                        }}
                      >
                        <em class="icon ni ni-plus"></em>
                        <span>Add</span>
                      </a>
                    </li>
                    <Link
                      className="btn btn-outline-light bg-white d-none d-sm-inline-flex"
                      to={`${process.env.PUBLIC_URL}/master-data`}
                    >
                      <em class="icon ni ni-arrow-left"></em>
                      <span> Back</span>
                    </Link>
                  </ul>
                </div>
              </div>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>
        <Block>
          <>
            <Modal isOpen={modal} className="modal-dialog-centered" size="lg" toggle={() => setModal(false)}>
              <ModalBody>
                <a
                  href="#dropdownitem"
                  onClick={(ev) => {
                    ev.preventDefault();
                    setModal(false);
                  }}
                  className="close"
                >
                  <Icon name="cross-sm"></Icon>
                </a>
                <div className="p-2">
                  <Form className="row gy-4" noValidate onSubmit={handleSubmit(onFormSubmit)}>
                    <Row className="col-md-12">
                      <Col md="6">
                        <FormGroup>
                          <label className="form-label" htmlFor="typeCodeName">
                            Name
                          </label>
                          <input
                            className="form-control"
                            type="text"
                            id="typeCodeName"
                            name="typeCodeName"
                            defaultValue={formData?.typeCodeName}
                            value={formData?.typeCodeName}
                            onChange={(e) => {
                              const temp = { ...formData };
                              temp.typeCodeName = e.target.value;
                              setFormData(temp);
                            }}
                            placeholder="Name"
                            ref={register({ required: "This field is required" })}
                          />
                          {errors.typeCodeName && <span className="invalid">{errors.typeCodeName.message}</span>}
                        </FormGroup>
                      </Col>
                      <Col md="6">
                        <FormGroup>
                          <label className="form-label" htmlFor="typeCodeDescription">
                            Description{" "}
                          </label>
                          <input
                            className="form-control"
                            type="text"
                            id="typeCodeDescription"
                            name="typeCodeDescription"
                            defaultValue={formData?.typeCodeDescription}
                            value={formData?.typeCodeDescription}
                            onChange={(e) => {
                              const temp = { ...formData };
                              temp.typeCodeDescription = e.target.value;
                              setFormData(temp);
                            }}
                            placeholder="Description"
                            ref={register({ required: "This field is required" })}
                          />
                          {errors.typeCodeDescription && (
                            <span className="invalid">{errors.typeCodeDescription.message}</span>
                          )}
                        </FormGroup>
                      </Col>
                    </Row>
                    <Col size="12">
                      <ul className="align-center flex-wrap flex-sm-nowrap gx-4 gy-2">
                        <li>
                          <Button color="primary" size="md" type="submit" disabled={loading}>
                            {loading ? (
                              <>
                                <Spinner size="sm" className="mr-1" />{" "}
                                {isNewTypeCode ? "Adding..." : "Updating..."}
                              </>
                            ) : (
                              isNewTypeCode ? "Add" : "Update"
                            )}
                          </Button>
                        </li>
                        <li>
                          <a
                            href="#cancel"
                            onClick={(ev) => {
                              ev.preventDefault();
                              setModal(false);
                            }}
                            className="link link-light"
                          >
                            Cancel
                          </a>
                        </li>
                      </ul>
                    </Col>
                  </Form>
                </div>
              </ModalBody>
            </Modal>
          </>
          <Row className="">
            <Col size={12}>
              <div className="entrolled-list card-inner position-relative card-tools-toggle">
                <div className="card-title-group">
                  <div className="card-tools"></div>
                  <div className="card-tools mr-n1">
                    <ul className="btn-toolbar gx-1">
                      <li>
                        <a
                          href="#search"
                          onClick={(ev) => {
                            ev.preventDefault();
                            toggle();
                          }}
                          className="btn btn-icon search-toggle toggle-search"
                        >
                          <Icon name="search"></Icon>
                        </a>
                      </li>
                      <li className="btn-toolbar-sep"></li>
                      <li>
                        <div className="toggle-wrap">
                          <Button
                            className={`btn-icon btn-trigger toggle ${tablesm ? "active" : ""}`}
                            onClick={() => updateTableSm(true)}
                          >
                            <Icon name="menu-right"></Icon>
                          </Button>
                          <div className={`toggle-content ${tablesm ? "content-active" : ""}`}>
                            <ul className="btn-toolbar gx-1">
                              <li className="toggle-close">
                                <Button className="btn-icon btn-trigger toggle" onClick={() => updateTableSm(false)}>
                                  <Icon name="arrow-left"></Icon>
                                </Button>
                              </li>
                              <li>
                                <UncontrolledDropdown>
                                  <DropdownToggle tag="a" className="btn btn-trigger btn-icon dropdown-toggle">
                                    <Icon name="setting"></Icon>
                                  </DropdownToggle>
                                  <DropdownMenu right className="dropdown-menu-xs">
                                    <ul className="link-check">
                                      <li>
                                        <span>Show</span>
                                      </li>
                                      <li className={itemPerPage === 10 ? "active" : ""}>
                                        <DropdownItem
                                          tag="a"
                                          href="#dropdownitem"
                                          onClick={(ev) => {
                                            ev.preventDefault();
                                            setItemPerPage(10);
                                          }}
                                        >
                                          10
                                        </DropdownItem>
                                      </li>
                                      <li className={itemPerPage === 15 ? "active" : ""}>
                                        <DropdownItem
                                          tag="a"
                                          href="#dropdownitem"
                                          onClick={(ev) => {
                                            ev.preventDefault();
                                            setItemPerPage(15);
                                          }}
                                        >
                                          15
                                        </DropdownItem>
                                      </li>
                                    </ul>
                                    <ul className="link-check">
                                      <li>
                                        <span>Order</span>
                                      </li>
                                      <li className={sort === "dsc" ? "active" : ""}>
                                        <DropdownItem
                                          tag="a"
                                          href="#dropdownitem"
                                          onClick={(ev) => {
                                            ev.preventDefault();
                                            setSortState("dsc");
                                            sortFunc("dsc");
                                          }}
                                        >
                                          DESC
                                        </DropdownItem>
                                      </li>
                                      <li className={sort === "asc" ? "active" : ""}>
                                        <DropdownItem
                                          tag="a"
                                          href="#dropdownitem"
                                          onClick={(ev) => {
                                            ev.preventDefault();
                                            setSortState("asc");
                                            sortFunc("asc");
                                          }}
                                        >
                                          ASC
                                        </DropdownItem>
                                      </li>
                                    </ul>
                                  </DropdownMenu>
                                </UncontrolledDropdown>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
                <div className={`card-search search-wrap ${!onSearch && "active"}`}>
                  <div className="card-body">
                    <div className="search-content">
                      <Button
                        className="search-back btn-icon toggle-search active"
                        onClick={() => {
                          setSearchText("");
                          toggle();
                        }}
                      >
                        <Icon name="arrow-left"></Icon>
                      </Button>
                      <input
                        type="text"
                        className="border-transparent form-focus-none form-control"
                        placeholder="Search by name"
                        value={onSearchText}
                        onChange={(e) => onFilterChange(e)}
                      />
                      <Button className="search-submit btn-icon">
                        <Icon name="search"></Icon>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
          <div>
            {typeCodeDataSource && (
              <>
                <RenderGrid dataSource={typeCodeDataSource}></RenderGrid>
              </>
            )}
          </div>
          <ToastContainer />
        </Block>
      </Content>
    </>
  );
};

export default TypeCode;
