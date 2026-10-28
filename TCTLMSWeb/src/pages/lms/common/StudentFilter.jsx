import React, { useContext, useEffect, useState, useRef } from "react";
import {
  DropdownMenu,
  DropdownToggle,
  FormGroup,
  UncontrolledDropdown,
  Modal,
  ModalHeader,
  ModalBody,
  DropdownItem,
  Breadcrumb,
  BreadcrumbItem,
  Form,
} from "reactstrap";
import { useLocation } from "react-router-dom";
import {
  Block,
  BlockBetween,
  BlockDes,
  BlockHead,
  BlockHeadContent,
  Icon,
  Button,
  BlockTitle,
  ReactDataTable,
  TooltipComponent,
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableRow,
  DataTableItem,
  Row,
  Col,
  RSelect,
} from "../../../components/Component";
import { getLookups } from "../../../apiservices/LookupsService";
const StudentFilter = (props) => {
  const [sm, updateSm] = useState(false);
  const [studentDataSource, setStudentDataSource] = useState();
  const [dataSource, setDataSource] = useState();
  const [currentPage, setCurrentPage] = useState(1);
  
  const defaultGuid = "00000000-0000-0000-0000-000000000000";
  const [gradeList, setGradeList] = useState([]);
  const searchParams = new URLSearchParams(new URL(window.location.href).search);
  const [boardName, setBoardName] = useState(searchParams.get("name"));
  const [subjectName, setSubjectName] = useState("All");
  const [gradeName, setGradeName] = useState("All");
  const [boardId, setBoardId] = useState(searchParams.get("boardId") || defaultGuid);
  const [gradeId, setGradeId] = useState(defaultGuid);
  const [subjectId, setSubjectId] = useState(defaultGuid);
  const [courseList1, setCourseList1] = useState([]);
  const [boardList, setBoardList] = useState([]);
  const [hiddenColumns, setHiddenColumns] = useState([]);
  const dropdownRef = useRef(null);
  const [tablesm, updateTableSm] = useState(false);
  const [onSearch, setonSearch] = useState(true);
  const [onSearchText, setSearchText] = useState(props.initialSearch || "");
  useEffect(() => { setSearchText(props.initialSearch || ""); }, [props.initialSearch]);
  const [sort, setSortState] = useState("");
  const [itemPerPage, setItemPerPage] = useState(10);
  const toggle = () => setonSearch(!onSearch);
  // Coordinator Student List layout (StudentList passes coordinatorView); other roles keep the original markup.
  const coordinatorView = !!props.coordinatorView;
  const isAllValue = (v) => !v || String(v).trim().toLowerCase() === "all";
  const activeFilters = [
    ["Board", boardName],
    ["Grade", gradeName],
    ["Subject", subjectName],
  ].filter(([, value]) => !isAllValue(value));
  
  useEffect(() => {
    getLookups("300" /*Grade*/).then((response) => {
      let temp = [];
      temp.push({ value: defaultGuid, label: "Select grade" });
      response.forEach((s) => {
        temp.push({ value: s?.id, label: s?.typeCodeName });
      });
      setGradeList(temp);
    });

    getLookups("400" /*Board*/).then((response) => {
      let temp = [];
      temp.push({ value: defaultGuid, label: "Select board" });
      response.forEach((s) => {
        temp.push({ value: s?.id, label: s?.typeCodeName, id: s?.id });
      });
      setBoardList(temp);
    });

    getLookups("500" /*Subject*/).then((response) => {
      let temp = [];
      temp.push({ value: defaultGuid, label: "Select subject" });
      response.forEach((s) => {
        temp.push({ value: s?.id, label: s?.typeCodeName });
      });
      setCourseList1(temp);
    });
  }, []);

  // Sorting data
  const sortFunc = (params) => {
    let defaultData = data;
    if (params === "asc") {
      let sortedData = defaultData.sort((a, b) => a.name.localeCompare(b.name));
      setData([...sortedData]);
    } else if (params === "dsc") {
      let sortedData = defaultData.sort((a, b) => b.name.localeCompare(a.name));
      setData([...sortedData]);
    }
  };

  const onFilterChange = (e) => {
    setSearchText(e.target.value);
    props.filterHandlerCallback(boardId, gradeId, subjectId, e.target.value);
  };
  return (
    <Row className="">
      <Col size={6}>
        {coordinatorView ? (
          <div className="tct-csl-path" title="Board > Grade > Subject" aria-label="Active filters">
            <span className="tct-csl-path-label">
              <Icon name="filter-alt"></Icon> Showing
            </span>
            {activeFilters.length === 0 ? (
              <span className="tct-csl-chip is-all">All students</span>
            ) : (
              activeFilters.map(([level, value], index) => (
                <React.Fragment key={level}>
                  {index > 0 && <Icon name="chevron-right" className="tct-csl-path-sep"></Icon>}
                  <span className="tct-csl-chip">
                    <small>{level}</small> {value}
                  </span>
                </React.Fragment>
              ))
            )}
          </div>
        ) : (
        <div
          title="Board > Grade > Subject"
          className="entrolled-list card-inner position-relative card-tools-toggle"
          style={{ marginTop: "4%" }}
        >
          <Breadcrumb className="breadcrumb-arrow">
            <BreadcrumbItem>
              <a href="#">{boardName || "All"}</a>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <a href="#">{gradeName || "All"}</a>
            </BreadcrumbItem>
            <BreadcrumbItem>{subjectName || "All"}</BreadcrumbItem>
          </Breadcrumb>
        </div>
        )}
      </Col>
      <Col size={6}>
        <div className="entrolled-list card-inner position-relative card-tools-toggle">
          <div className="card-title-group">
            <div className="card-tools">
              {coordinatorView && (
                <div className="tct-csl-search">
                  <label htmlFor="tct-csl-search-input" className="sr-only">Search students</label>
                  <Icon name="search" className="tct-csl-search-icon"></Icon>
                  <input
                    id="tct-csl-search-input"
                    type="text"
                    className="form-control"
                    placeholder="Search students..."
                    value={onSearchText}
                    onChange={(e) => onFilterChange(e)}
                  />
                  {onSearchText && (
                    <button
                      type="button"
                      className="tct-csl-search-clear"
                      aria-label="Clear search"
                      title="Clear search"
                      onClick={() => {
                        setSearchText("");
                        props.filterHandlerCallback(boardId, gradeId, subjectId, "");
                      }}
                    >
                      <Icon name="cross"></Icon>
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="card-tools mr-n1">
              <ul className="btn-toolbar gx-1">
                {!coordinatorView && (
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
                )}
                {!coordinatorView && <li className="btn-toolbar-sep"></li>}
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
                          <UncontrolledDropdown innerRef={dropdownRef}>
                            <DropdownToggle tag="a" className="btn btn-trigger btn-icon dropdown-toggle">
                              <div className="dot dot-primary"></div>
                              <Icon name="filter-alt"></Icon>
                            </DropdownToggle>
                            <DropdownMenu right className="filter-wg dropdown-menu-xl" style={{ overflow: "visible" }}>
                              <div className="dropdown-head">
                                <span className="sub-title dropdown-title">{coordinatorView ? "Student Filters" : "Student Filter"}</span>
                                <div className="dropdown">
                                  <DropdownItem
                                    href="#more"
                                    onClick={(ev) => {
                                      ev.preventDefault();
                                    }}
                                    className="btn btn-sm btn-icon"
                                  >
                                    <Icon name="more-h"></Icon>
                                  </DropdownItem>
                                </div>
                              </div>
                              <div className="dropdown-body dropdown-body-rg">
                                <Row className="gx-6 gy-3">
                                  <Col size={12}>
                                    <label className="overline-title overline-title-alt">Board</label>
                                    <RSelect
                                      dataSource={boardList || []}
                                      value1={boardId}
                                      onChangeHandler={(e) => {
                                        if (e.value == defaultGuid) {
                                          setBoardName("All");
                                        } else {
                                          var board = boardList.find((s) => s.value == e.value);
                                          setBoardName(board?.label);
                                        }
                                        setBoardId(e.value);
                                      }}
                                    />
                                  </Col>
                                  <Col size={12}>
                                    <label className="overline-title overline-title-alt">Grade</label>
                                    <RSelect
                                      dataSource={gradeList || []}
                                      value1={gradeId}
                                      menuPlacement="top"
                                      onChangeHandler={(e) => {
                                        if (e.value == defaultGuid) {
                                          setGradeName("All");
                                        } else {
                                          var board = gradeList.find((s) => s.value == e.value);
                                          setGradeName(board?.label);
                                        }
                                        setGradeId(e.value);
                                      }}
                                    />
                                  </Col>
                                  <Col size={12}>
                                    <label className="overline-title overline-title-alt">Subject</label>
                                    <RSelect
                                      value1={subjectId}
                                      dataSource={courseList1 || []}
                                      menuPlacement="top"
                                      onChangeHandler={(e) => {
                                        if (e.value == defaultGuid) {
                                          setSubjectName("All");
                                        } else {
                                          var board = courseList1.find((s) => s.value == e.value);
                                          setSubjectName(board?.label);
                                        }
                                        setSubjectId(e.value);
                                      }}
                                    />
                                  </Col>
                                  <Col size="12">
                                    <FormGroup className="form-group">
                                      <Button
                                        color="secondary"
                                        onClick={() => {
                                          props.filterHandlerCallback(boardId, gradeId, subjectId, onSearchText);
                                          document.body.click();
                                        }}
                                      >
                                        Filter
                                      </Button>
                                    </FormGroup>
                                  </Col>
                                </Row>
                              </div>
                            </DropdownMenu>
                          </UncontrolledDropdown>
                        </li>
                        <li>
                          <UncontrolledDropdown>
                            <DropdownToggle tag="a" className="btn btn-trigger btn-icon dropdown-toggle">
                              <Icon name="setting"></Icon>
                            </DropdownToggle>
                            <DropdownMenu right className="dropdown-menu-xs">
                              {!coordinatorView && (
                              <ul className="link-check">
                                <li>
                                  <span>Show</span>
                                </li>
                                
                                <li className={itemPerPage === 5 ? "active" : ""}>
                                  <DropdownItem
                                    tag="a"
                                    href="#dropdownitem"
                                    onClick={(ev) => {
                                      ev.preventDefault();
                                      setItemPerPage(5);
                                      props.filterHandlerCallback(boardId, gradeId, subjectId,onSearchText, 5);
                                    }}
                                  >
                                    5
                                  </DropdownItem>
                                </li>
                                <li className={itemPerPage === 10 ? "active" : ""}>
                                  <DropdownItem
                                    tag="a"
                                    href="#dropdownitem"
                                    onClick={(ev) => {
                                      ev.preventDefault();
                                      setItemPerPage(10);
                                      props.filterHandlerCallback(boardId, gradeId, subjectId,onSearchText, 10);
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
                                      props.filterHandlerCallback(boardId, gradeId, subjectId, onSearchText, 15);
                                    }}
                                  >
                                    15
                                  </DropdownItem>
                                </li>
                              </ul>
                              )}
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
          {!coordinatorView && (
          <div className={`card-search search-wrap ${!onSearch && "active"}`}>
            <div className="card-body">
              <div className="search-content">
                <Button
                  className="search-back btn-icon toggle-search active"
                  onClick={() => {
                    setSearchText("");
                    props.filterHandlerCallback(boardId, gradeId, subjectId, "");
                    toggle();
                  }}
                >
                  <Icon name="arrow-left"></Icon>
                </Button>
                <input
                  type="text"
                  className="border-transparent form-focus-none form-control"
                  placeholder="Search by user or email"
                  value={onSearchText}
                  onChange={(e) => onFilterChange(e)}
                />
                <Button className="search-submit btn-icon">
                  <Icon name="search"></Icon>
                </Button>
              </div>
            </div>
          </div>
          )}
        </div>
      </Col>
    </Row>
  );
};
export default StudentFilter;
