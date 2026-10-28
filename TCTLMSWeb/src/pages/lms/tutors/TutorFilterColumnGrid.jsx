import React, { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import DataTable from "react-data-table-component";
import { getFilteredTutors } from "../../../apiservices/TutorService";
import TutorFilterBar from "../common/TutorFilterBar";
import FullPageSpinner from "../common/FullPageSpinner";
import TutorAssignmentPopup from "../common/TutorAssignmentPopup";
import { getLookups, getAllRoles } from "../../../apiservices/LookupsService";
import AssignmentPopup from "../common/AssignmentPopup";
import { GetSalesDetails } from "../../../apiservices/NofiticationService";

import { TooltipComponent, Button } from "../../../components/Component";
import { Spinner } from "reactstrap";
import TutorListPagination from "./TutorListPagination";

import { useDispatch, useSelector } from "react-redux";
import { showColumns, hideColumns } from "../../../features/tutorColumnSlice";
import { UUIDNill } from "../../../utils/Utils";

// ─── Empty state with board/grade/subject context ─────────────────────────────
const NoTutorsMessage = ({ boardName, gradeName, subjectName }) => (
  <div style={{ textAlign: "center", padding: "40px 20px", color: "#8094ae" }}>
    <em className="icon ni ni-user-cross" style={{ fontSize: "36px", display: "block", marginBottom: "12px" }}></em>
    <p style={{ fontWeight: 500, fontSize: "15px", marginBottom: "8px" }}>
      No tutors available for this requirement
    </p>
    {(boardName || gradeName || subjectName) && (
      <div style={{
        display: "inline-flex",
        gap: "8px",
        marginBottom: "12px",
        flexWrap: "wrap",
        justifyContent: "center",
      }}>
        {boardName && (
          <span style={{
            background: "#e5edff",
            color: "#4263eb",
            borderRadius: "4px",
            padding: "2px 10px",
            fontSize: "12px",
            fontWeight: 500,
          }}>
            {boardName}
          </span>
        )}
        {gradeName && (
          <span style={{
            background: "#e6fcf5",
            color: "#0ca678",
            borderRadius: "4px",
            padding: "2px 10px",
            fontSize: "12px",
            fontWeight: 500,
          }}>
            {gradeName}
          </span>
        )}
        {subjectName && (
          <span style={{
            background: "#fff3bf",
            color: "#e67700",
            borderRadius: "4px",
            padding: "2px 10px",
            fontSize: "12px",
            fontWeight: 500,
          }}>
            {subjectName}
          </span>
        )}
      </div>
    )}
    <p style={{ fontSize: "13px" }}>
      No tutors are currently assigned to teach this subject for the selected board and grade.
      Please ensure tutor profiles are updated with their subject details, or use the filters above to broaden your
      search.
    </p>
  </div>
);

// ─── TCTTutorListGrid accepts optional salesDetails prop from parent ──────────
// search: the tutor-name search from the Tutor List toolbar (applied together with the panel filters).
const TCTTutorListGrid = ({ salesDetails: parentSalesDetails, search: toolbarSearch = "" }) => {
  const showFilter = useSelector((state) => state.filter.showFilter);
  const columnState = useSelector((state) => state.tutorColumns);
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState([]);
  const [data, setData] = useState([]);
  const [assignTutorModal, setAssignTutorModal] = useState(false);
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [salesDetails, setSalesDetails] = useState(parentSalesDetails ?? null);
  const defaultGuid = "00000000-0000-0000-0000-000000000000";

  const [filters, setFilters] = useState({
    board: [],
    grade: [],
    gradeGroups: [],
    subject: [],
    search: toolbarSearch,
  });

  const [loadError, setLoadError] = useState("");
  const [paginationTotalRows, setPaginationTotalRows] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const pageNumberRef = useRef(1);
  const tutorRequestRef = useRef(null);
  const tutorRequestSequenceRef = useRef(0);
  const [unFillterdStatusList, setUnFillterdStatusList] = useState([]);
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const saleDetailsId = queryParams.get("id");

  // Keep salesDetails in sync if parent passes it later
  useEffect(() => {
    if (parentSalesDetails) {
      setSalesDetails(parentSalesDetails);
    }
  }, [parentSalesDetails]);

  useEffect(() => {
    getLookups("200" /*status*/).then((response) => {
      let temp1 = [];
      response.forEach((s) => {
        temp1.push({ value: s?.id, label: s?.typeCodeName, code: s?.typeCodeValue, id: s?.id });
      });
      setUnFillterdStatusList(temp1);
    });

    const realColumns = [
      {
        name: "Actions",
        key: "actions",
        width: "100px",
        center: true,
        cell: (row) => (
          <>
            <div className="nk-tb-action">
              <ul className="nk-tb-actions gx-1">
                <li
                  className="nk-tb-action-hidden1"
                  onClick={() => {
                    setSelectedTutor(row);
                    setAssignTutorModal(true);
                  }}
                >
                  <TooltipComponent
                    tag="a"
                    containerClassName="btn btn-trigger btn-icon"
                    id={"changeTutor" + row?.id}
                    icon="icon ni ni-user-add-fill"
                    direction="top"
                    text="Select Tutor"
                  />
                </li>
              </ul>
            </div>
          </>
        ),
      },
      { name: "Tutor Name", selector: (row) => row.tutorName, key: "tutorName" },
      { name: "Board", selector: (row) => row.boardName, key: "boardName", width: "100px" },
      { name: "Grade", selector: (row) => row.gradeName, key: "gradeName", width: "120px" },
      { name: "Min", selector: (row) => row.minPayment, key: "MinPayment", width: "120px" },
      { name: "Max", selector: (row) => row.maxPayment, key: "MaxPayment", width: "120px" },
      { name: "Subject", selector: (row) => row.subjectName, key: "subjectName", width: "180px" },
      { name: "Rating", selector: (row) => row.rating, key: "rating", sortable: true, width: "90px" },
      { name: "Eng.%", selector: (row) => row.engagmentRatio, key: "engagmentRatio", sortable: true, width: "90px" },
      { name: "Drop%", selector: (row) => row.dropOutRatio, key: "dropOutRatio", sortable: true, width: "90px" },
      {
        name: "Cncl.%",
        selector: (row) => row.cancelationRatio,
        key: "cancelationRatio",
        sortable: true,
        width: "90px",
      },
    ];
    setColumns(realColumns);
  }, []);

  const fetchTutors = async (
    board = [],
    grade = [],
    gradeGroups = [],
    subject = [],
    search = "",
    size = pageSize,
    page = currentPage,
  ) => {
    tutorRequestRef.current?.abort();
    const requestController = new AbortController();
    tutorRequestRef.current = requestController;
    const requestSequence = ++tutorRequestSequenceRef.current;
    setLoading(true);
    setLoadError("");
    try {
      const boardIds = (board || []).join(",");
      const gradeIds = (grade || []).join(",");
      const gradeGroupIds = (gradeGroups || []).join(",");
      const subjectIds = (subject || []).join(",");
      const response = await getFilteredTutors(
        boardIds,
        gradeIds,
        gradeGroupIds,
        subjectIds,
        search,
        size || 50,
        page || 1,
        requestController.signal,
      );
      if (requestSequence !== tutorRequestSequenceRef.current) return;
      const rows = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
          ? response
          : [];
      const totalRecords = response?.totalRecords ?? rows.length;
      // A page past the end (e.g. the result set shrank): load the last page that has rows instead.
      const lastPage = Math.max(1, Math.ceil(totalRecords / (size || 50)));
      if (rows.length === 0 && totalRecords > 0 && (page || 1) > lastPage) {
        setCurrentPage(lastPage);
        pageNumberRef.current = lastPage;
        fetchTutors(board, grade, gradeGroups, subject, search, size, lastPage);
        return;
      }
      setData(rows);
      setPaginationTotalRows(totalRecords);
    } catch (error) {
      if (error?.code === "ERR_CANCELED" || error?.name === "CanceledError" || error?.name === "AbortError") return;
      console.error("Unable to load filtered tutors", error);
      if (requestSequence === tutorRequestSequenceRef.current) {
        setData([]);
        setPaginationTotalRows(0);
        setLoadError(error?.response?.data?.message || error?.message || "Unable to load tutors.");
      }
    } finally {
      if (requestSequence === tutorRequestSequenceRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => () => tutorRequestRef.current?.abort(), []);

  const getSalesDetails = async (defaultGuid, saleDetailsId) => {
    try {
      const response = await GetSalesDetails(defaultGuid, saleDetailsId, UUIDNill());
      if (response?.data) {
        const details = response.data;
        setSalesDetails(details);

        const boardId = details.boardId ? [details.boardId] : [];
        const gradeId = details.gradId ? [details.gradId] : [];
        const subjectId = details.subjectId ? [details.subjectId] : [];

        const newFilters = {
          board: boardId,
          grade: gradeId,
          gradeGroups: [],
          subject: subjectId,
          search: toolbarSearch,
        };
        setFilters(newFilters);

        fetchTutors(boardId, gradeId, [], subjectId, toolbarSearch, pageSize, currentPage);
      }
    } catch (error) {
      console.error("Failed to fetch sales details", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (saleDetailsId) {
      getSalesDetails(defaultGuid, saleDetailsId);
    } else {
      fetchTutors([], [], [], [], toolbarSearch, pageSize, 1);
    }
  }, [saleDetailsId]);

  // Toolbar search changed: re-run with the applied panel filters, from page 1.
  const hasToolbarSearchMounted = useRef(false);
  useEffect(() => {
    if (!hasToolbarSearchMounted.current) {
      hasToolbarSearchMounted.current = true;
      return;
    }
    handleFilterChange(filters.board, filters.grade, filters.gradeGroups, filters.subject, toolbarSearch, pageSize, 1);
  }, [toolbarSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setCurrentPage(1);
    pageNumberRef.current = 1;
    fetchTutors(filters.board, filters.grade, filters.gradeGroups, filters.subject, filters.search, size, 1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    pageNumberRef.current = page;
    fetchTutors(
      filters.board,
      filters.grade,
      filters.gradeGroups,
      filters.subject,
      filters.search,
      pageSize,
      page
    );
  };

  const handleFilterChange = (boards, grades, gradeGroups, subjects, search, newPageSize = pageSize, page = 1) => {
    setFilters({ board: boards, grade: grades, gradeGroups, subject: subjects, search: search });
    setCurrentPage(page);
    pageNumberRef.current = page;
    setPageSize(newPageSize);

    if (boards.length === 0 && grades.length === 0) {
      dispatch(showColumns(["boardName", "gradeName"]));
    }
    if (grades.length > 0) {
      dispatch(hideColumns(["gradeName"]));
    }
    if (boards.length > 0) {
      dispatch(hideColumns(["boardName"]));
    }
    if (boards.length > 0 && grades.length > 0) {
      dispatch(hideColumns(["boardName", "gradeName"]));
    }

    fetchTutors(boards, grades, gradeGroups, subjects, search, newPageSize, page);
  };

  // Called as a function (not rendered as <RenderGrid />) so the table and pager are not remounted on every render.
  const renderGrid = (dataSource) => {
    const columnVisibilityMap = columnState.reduce((acc, col) => {
      acc[col.key] = col.visible;
      return acc;
    }, {});

    const filteredColumns = columns.filter((col) => columnVisibilityMap[col.key] !== false);

    if (filteredColumns.length === 0) {
      return <div>Please select at least one column to display the table.</div>;
    }

    if (!loading && loadError) {
      return (
        <div className="tutor-list-state">
          <em className="icon ni ni-alert-circle text-danger"></em>
          <p>{loadError}</p>
          <Button
            size="sm"
            color="primary"
            outline
            type="button"
            onClick={() =>
              fetchTutors(filters.board, filters.grade, filters.gradeGroups, filters.subject, filters.search, pageSize, currentPage)
            }
          >
            Try again
          </Button>
        </div>
      );
    }

    // ✅ Show meaningful message with board/grade/subject context
    if (!loading && (!dataSource || dataSource.length === 0)) {
      return (
        <NoTutorsMessage
          boardName={salesDetails?.boardName}
          gradeName={salesDetails?.gradeName}
          subjectName={salesDetails?.subjectName}
        />
      );
    }

    // Paging is server-side: the table shows the current page and TutorListPagination drives page / page size.
    return (
      <div className="tutor-list-table">
        <DataTable
          data={dataSource}
          columns={filteredColumns}
          fixedHeader
          fixedHeaderScrollHeight="480px"
          progressPending={loading && (!dataSource || dataSource.length === 0)}
          progressComponent={
            <div className="tutor-list-state" role="status">
              <Spinner size="sm" color="primary" /> Loading tutors…
            </div>
          }
          noDataComponent={<div className="p-2">There are no records found</div>}
          sortIcon={
            <div>
              <span>&darr;</span>
              <span>&uarr;</span>
            </div>
          }
        />
        <TutorListPagination
          page={currentPage}
          pageSize={pageSize}
          total={paginationTotalRows}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          disabled={loading}
        />
      </div>
    );
  };

  return (
    <>
      <div>
        {loading && saleDetailsId && <FullPageSpinner />}
        {showFilter && (
          <TutorFilterBar
            filters={filters}
            onChangeCallback={handleFilterChange}
            onFilter={fetchTutors}
            hideSearch
            searchText={toolbarSearch}
          />
        )}
        {data && renderGrid(data)}
      </div>

      {assignTutorModal && (
        <AssignmentPopup
          dataItem={salesDetails}
          selectedTutor={selectedTutor}
          statusList={unFillterdStatusList}
          salesDetails={salesDetails}
          modalOpen={assignTutorModal}
          modalStateChange={() => {
            setAssignTutorModal(false);
          }}
        />
      )}
    </>
  );
};

export default TCTTutorListGrid;
