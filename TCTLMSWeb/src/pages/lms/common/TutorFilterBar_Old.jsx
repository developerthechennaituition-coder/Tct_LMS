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

const TutorFilterBar = ({ filters, onChangeCallback, onFilter, fetchOptions }) => {
  const defaultGuid = "00000000-0000-0000-0000-000000000000";
  const [gradeList, setGradeList] = useState([]);
  const [courseList1, setCourseList1] = useState([]);
  const [boardList, setBoardList] = useState([]);
  const [selectedBoards, setSelectedBoards] = useState([]);
  const [selectedGrades, setSelectedGrades] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const toggle = () => setonSearch(!onSearch);
  const [onSearch, setOnSearch] = useState(false);
  const [onSearchText, setSearchText] = useState("");

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

  return (
    <>
      <Row rightpadding="gutter" className="mb-6">
        <Col size={6}>
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
                  {/*  <li>
                    <div className="toggle-wrap">
                      <Button
                        className={`btn-icon btn-trigger toggle ${tablesm ? "active" : ""}`}
                        onClick={() => updateTableSm(true)}
                      >
                        <Icon name="menu-right"></Icon>
                      </Button>
                    </div>
                  </li> */}
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
          </div>
        </Col>
      </Row>
      <Row className="gx-6 gy-3">
        <Col size={4}>
          <label className="overline-title overline-title-alt">Board</label>
          <RSelect
            isMulti
            dataSource={boardList || []}
            onChangeHandler={(selectedOptions) => {
              const selectedBoardIds = selectedOptions.map((opt) => opt.value);
              setSelectedBoards(selectedBoardIds);
              if (typeof onChangeCallback === "function") {
                onChangeCallback(selectedBoardIds, selectedGrades, selectedSubjects);
              }
            }}
          />
        </Col>

        <Col size={4}>
          <label className="overline-title overline-title-alt">Grade</label>
          <RSelect
            isMulti
            dataSource={gradeList || []}
            onChangeHandler={(selectedOptions) => {
              const selectedGradeIds = selectedOptions.map((opt) => opt.value);
              setSelectedGrades(selectedGradeIds);
              if (typeof onChangeCallback === "function") {
                onChangeCallback(selectedBoards, selectedGradeIds, selectedSubjects);
              }
            }}
          />
        </Col>

        <Col size={4}>
          <label className="overline-title overline-title-alt">Subject</label>
          <RSelect
            isMulti
            dataSource={courseList1 || []}
            onChangeHandler={(selectedOptions) => {
              const selectedSubjectIds = selectedOptions.map((opt) => opt.value);
              setSelectedSubjects(selectedSubjectIds);
              if (typeof onChangeCallback === "function") {
                onChangeCallback(selectedBoards, selectedGrades, selectedSubjectIds);
              }
            }}
          />
        </Col>
        {/* <Col size={4}>
          <label className="overline-title overline-title-alt">Search</label>
          <input
            type="text"
            className="form-control"
            placeholder="Search by tutor name"
            onChange={(e) => {
              const searchValue = e.target.value;
              if (typeof onChangeCallback === "function") {
                onChangeCallback(selectedBoards, selectedGrades, selectedSubjects, searchValue);
              }
            }}
          />
        </Col> */}
      </Row>
    </>
  );
};

export default TutorFilterBar;
