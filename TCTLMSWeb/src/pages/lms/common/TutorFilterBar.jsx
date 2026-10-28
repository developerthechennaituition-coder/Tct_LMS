import React, { useEffect, useRef, useState } from "react";
import { Row, Col, RSelect, Button, Icon } from "../../../components/Component";
import { getLookups, getGradeByGroupAsync, getGroupByBoardAsync } from "../../../apiservices/LookupsService";
import {
  Card,
  CardHeader,
  CardFooter,
  CardImg,
  CardText,
  CardBody,
  CardTitle,
  CardSubtitle,
  CardLink,
} from "reactstrap";
// hideSearch / searchText: optional. The Tutor List keeps the tutor-name search in its page toolbar and
// passes the current text in; this panel then shows only Board, Grade Groups, Grade and Subject.
const TutorFilterBar = ({ filters, onChangeCallback, hideSearch = false, searchText = "" }) => {
  const defaultGuid = "00000000-0000-0000-0000-000000000000";
  const [gradeGroupList, setGradeGroupList] = useState([]);
  const [gradeList, setGradeList] = useState([]);
  const [courseList1, setCourseList1] = useState([]);
  const [boardList, setBoardList] = useState([]);

  const [selectedBoards, setSelectedBoards] = useState(filters.board || []);
  const [selectedGrades, setSelectedGrades] = useState(filters.grade || []);
  const [selectedGradeGroups, setSelectedGradeGroups] = useState(filters.gradeGroups || []);
  const [selectedSubjects, setSelectedSubjects] = useState(filters.subject || []);

  const [onSearch, setOnSearch] = useState(true);
  const [onSearchText, setSearchText] = useState("");
  const hasSearchMounted = useRef(false);

  const toggle = () => setOnSearch(!onSearch);
  const activeSearchText = hideSearch ? searchText || "" : onSearchText;

  useEffect(() => {
    getLookups("300" /* Grade */).then((response) => {
      //let temp = [{ value: defaultGuid, label: "Select grade" }];
      let temp = [];
      response.forEach((s) => {
        temp.push({ value: s?.id, label: s?.typeCodeName });
      });
      setGradeList(temp);
    });

    getLookups("1011" /* Course */).then((response) => {
      let temp = [];
      response.forEach((s) => {
        temp.push({ value: s?.id, label: s?.typeCodeName });
      });
      setGradeGroupList(temp);
    });

    getLookups("400" /* Board */).then((response) => {
      //let temp = [{ value: defaultGuid, label: "Select board" }];
      let temp = [];
      response.forEach((s) => {
        temp.push({ value: s?.id, label: s?.typeCodeName });
      });
      setBoardList(temp);
    });

    getLookups("500" /* Subject */).then((response) => {
      //let temp = [{ value: defaultGuid, label: "Select subject" }];
      let temp = [];
      response.forEach((s) => {
        temp.push({ value: s?.id, label: s?.typeCodeName });
      });
      setCourseList1(temp);
    });
  }, []);

  const onBoardChangeHandler = (selectedOptions) => {
    const selectedIds = selectedOptions.map((opt) => opt.value);
    setSelectedBoards(selectedIds);
    getGroupByBoardAsync(selectedIds.join(",")).then((response) => {
      let temp = [];
      response.forEach((s) => {
        temp.push({ value: s?.id, label: s?.typeCodeName });
      });
      setGradeGroupList(temp);
    });

    onGroupChangeHandler(selectedIds, selectedGradeGroups);
  };

  const onGroupChangeHandler = (boards, groups) => {
    const inputData = {
      BoardIds: boards,
      GroupIds: groups,
    };
    getGradeByGroupAsync(inputData).then((response) => {
      let temp = [];
      response.forEach((s) => {
        temp.push({ value: s?.id, label: s?.typeCodeName });
      });
      setGradeList(temp);
    });
  };

  const onFilterChange = (e) => {
    setSearchText(e.target.value);
  };

  useEffect(() => {
    if (!hasSearchMounted.current) {
      hasSearchMounted.current = true;
      return undefined;
    }

    const searchTimer = window.setTimeout(() => {
      onChangeCallback?.(
        selectedBoards,
        selectedGrades,
        selectedGradeGroups,
        selectedSubjects,
        onSearchText
      );
    }, 400);

    return () => window.clearTimeout(searchTimer);
  }, [onSearchText]); // Search only after the user pauses typing.

  if (hideSearch) {
    const applyFilters = (ev) => {
      ev.preventDefault();
      onChangeCallback?.(selectedBoards, selectedGrades, selectedGradeGroups, selectedSubjects, activeSearchText);
    };
    // Clear resets only the advanced filters; the toolbar's tutor-name search is kept.
    const clearFilters = (ev) => {
      ev.preventDefault();
      setSelectedBoards([]);
      setSelectedGrades([]);
      setSelectedSubjects([]);
      setSelectedGradeGroups([]);
      onChangeCallback?.([], [], [], [], activeSearchText);
    };
    return (
      <div className="tutor-filter-panel">
        <Row className="g-3">
          <Col size={12} md={6} lg={3}>
            <div className="form-group">
              <label className="form-label">Board</label>
              <div className="form-control-wrap">
                <RSelect
                  isMulti
                  placeholder="All boards"
                  dataSource={boardList || []}
                  value={boardList.filter((course) => selectedBoards.includes(course.value))}
                  onChangeHandler={(selectedOptions) => onBoardChangeHandler(selectedOptions || [])}
                />
              </div>
            </div>
          </Col>
          <Col size={12} md={6} lg={3}>
            <div className="form-group">
              <label className="form-label">Grade Groups</label>
              <div className="form-control-wrap">
                <RSelect
                  isMulti
                  placeholder="All grade groups"
                  dataSource={gradeGroupList || []}
                  value={gradeGroupList.filter((course) => selectedGradeGroups.includes(course.value))}
                  onChangeHandler={(selectedOptions) => {
                    const selectedIds = (selectedOptions || []).map((opt) => opt.value);
                    setSelectedGradeGroups(selectedIds);
                    onGroupChangeHandler(selectedBoards, selectedIds);
                  }}
                />
              </div>
            </div>
          </Col>
          <Col size={12} md={6} lg={3}>
            <div className="form-group">
              <label className="form-label">Grade</label>
              <div className="form-control-wrap">
                <RSelect
                  isMulti
                  placeholder="All grades"
                  dataSource={gradeList || []}
                  value={gradeList.filter((course) => selectedGrades.includes(course.value))}
                  onChangeHandler={(selectedOptions) => setSelectedGrades((selectedOptions || []).map((opt) => opt.value))}
                />
              </div>
            </div>
          </Col>
          <Col size={12} md={6} lg={3}>
            <div className="form-group">
              <label className="form-label">Subject</label>
              <div className="form-control-wrap">
                <RSelect
                  isMulti
                  placeholder="All subjects"
                  dataSource={courseList1 || []}
                  value={courseList1.filter((course) => selectedSubjects.includes(course.value))}
                  onChangeHandler={(selectedOptions) => setSelectedSubjects((selectedOptions || []).map((opt) => opt.value))}
                />
              </div>
            </div>
          </Col>
        </Row>
        <div className="tutor-filter-actions">
          <Button color="light" type="button" onClick={clearFilters}>
            Clear
          </Button>
          <Button color="primary" type="button" onClick={applyFilters}>
            Search
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Card className="card-bordered">
        <CardBody>
          <Row>
            <Col size={4}>
              <div className="form-group">
                <label className="form-label">Search</label>
                <div className="form-control-wrap">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by tutor name"
                    value={onSearchText}
                    onChange={onFilterChange}
                  />
                </div>
              </div>
            </Col>
            <Col size={4}>
              <div className="form-group">
                <label className="form-label">Board</label>
                <div className="form-control-wrap">
                  <RSelect
                    isMulti
                    dataSource={boardList || []}
                    value={boardList.filter((course) => selectedBoards.includes(course.value))}
                    onChangeHandler={(selectedOptions) => {
                      // const selectedIds = selectedOptions.map((opt) => opt.value);
                      // setSelectedBoards(selectedIds);
                      onBoardChangeHandler(selectedOptions);
                      // onChangeCallback?.(
                      //   selectedIds,
                      //   selectedGrades,
                      //   selectedGradeGroups,
                      //   selectedSubjects,
                      //   onSearchText
                      // );
                    }}
                  />
                </div>
              </div>
            </Col>

            <Col size={4}>
              <div className="form-group">
                <label className="form-label">Grade Groups</label>
                <div className="form-control-wrap">
                  <RSelect
                    isMulti
                    dataSource={gradeGroupList || []}
                    value={gradeGroupList.filter((course) => selectedGradeGroups.includes(course.value))}
                    onChangeHandler={(selectedOptions) => {
                      const selectedIds = selectedOptions.map((opt) => opt.value);
                      setSelectedGradeGroups(selectedIds);
                      onGroupChangeHandler(selectedBoards, selectedIds);
                      // onChangeCallback?.(selectedBoards, selectedGrades, selectedIds, selectedSubjects, onSearchText);
                    }}
                  />
                </div>
              </div>
            </Col>
          </Row>
          <Row className="gx-6 gy-3 align-items-center">
            <Col size={4}>
              <div className="form-group">
                <label className="form-label">Grade</label>
                <div className="form-control-wrap">
                  <RSelect
                    isMulti
                    dataSource={gradeList || []}
                    value={gradeList.filter((course) => selectedGrades.includes(course.value))}
                    onChangeHandler={(selectedOptions) => {
                      const selectedIds = selectedOptions.map((opt) => opt.value);
                      setSelectedGrades(selectedIds);
                      // onChangeCallback?.(
                      //   selectedBoards,
                      //   selectedIds,
                      //   selectedGradeGroups,
                      //   selectedSubjects,
                      //   onSearchText
                      // );
                    }}
                  />
                </div>
              </div>
            </Col>

            <Col size={4}>
              <div className="form-group">
                <label className="form-label">Subject</label>
                <div className="form-control-wrap">
                  <RSelect
                    isMulti
                    dataSource={courseList1 || []}
                    value={courseList1.filter((course) => selectedSubjects.includes(course.value))}
                    onChangeHandler={(selectedOptions) => {
                      const selectedIds = selectedOptions.map((opt) => opt.value);
                      setSelectedSubjects(selectedIds);
                      // onChangeCallback?.(
                      //   selectedBoards,
                      //   selectedGrades,
                      //   selectedGradeGroups,
                      //   selectedIds,
                      //   onSearchText
                      // );
                    }}
                  />
                </div>
              </div>
            </Col>
            <Col size={4}>
              <div className="form-group">
                <label className="form-label"> </label>
                <ul className="align-center flex-wrap flex-sm-nowrap gx-4 gy-2">
                  <li>
                    <Button
                      color="primary"
                      size="md"
                      type="button"
                      onClick={(ev) => {
                        ev.preventDefault();
                        onChangeCallback?.(
                          selectedBoards,
                          selectedGrades,
                          selectedGradeGroups,
                          selectedSubjects,
                          onSearchText
                        );
                      }}
                    >
                      Search
                    </Button>
                  </li>
                  <li>
                    <Button
                      color={"light"}
                      type="button"
                      onClick={(ev) => {
                        ev.preventDefault();
                        setSelectedBoards([]);
                        setSelectedGrades([]);
                        setSelectedSubjects([]);
                        setSelectedGradeGroups([]);
                        setSearchText("");
                        onChangeCallback?.([], [], [], [], "");
                      }}
                    >
                      Clear
                    </Button>
                  </li>
                </ul>
                {/* <label className="form-label"> </label>
                <div className="form-control-wrap">
                  <Button
                    color="light"
                    onClick={() => {
                      setSelectedBoards([]);
                      setSelectedGrades([]);
                      setSelectedSubjects([]);
                      setSelectedGradeGroups([]);
                      setSearchText("");
                      onChangeCallback?.([], [], [], [], "");
                    }}
                  >
                    <span>Clear</span>
                    <Icon name="cross-sm"></Icon>
                  </Button>
                  <Button
                    color="light"
                    onClick={() => {
                      setSelectedBoards([]);
                      setSelectedGrades([]);
                      setSelectedSubjects([]);
                      setSelectedGradeGroups([]);
                      setSearchText("");
                      onChangeCallback?.([], [], [], [], "");
                    }}
                  >
                    <span>Clear</span>
                    <Icon name="cross-sm"></Icon>
                  </Button>
                </div> */}
              </div>
            </Col>
          </Row>
        </CardBody>
      </Card>
    </>
  );
};

export default TutorFilterBar;
