import React, { useEffect, useState, useRef } from "react";
import DataTable from "react-data-table-component";
import { Link } from "react-router-dom";
//import TooltipComponent from "../../components/TooltipComponent";
import { getFilteredTutors } from "../../../apiservices/TutorService";
import TutorFilterBar from "../common/TutorFilterBar";
import {
  Block,
  BlockBetween,
  BlockDes,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Icon,
  Col,
  PreviewCard,
  UserAvatar,
  PaginationComponent,
  Button,
  DataTableHead,
  DataTableRow,
  DataTableItem,
  TooltipComponent,
  RSelect,
  PreviewAltCard,
  ReactDataTable,
} from "../../../components/Component";

const TCTTutorListGrid = () => {
  const [tutorDataSource, setTutorDataSource] = useState([]);
  const [filters, setFilters] = useState({ board: "", grade: "", subject: "" });
  const [paginationTotalRows, setPaginationTotalRows] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [resetPagination, setResetPagination] = useState(false);
  const [loading, setLoading] = useState(false);
  const pageNumberRef = useRef(1);
  const requestControllerRef = useRef(null);
  const requestNumberRef = useRef(0);

  const fetchTutors = async (requestedFilters = filters, requestedPage = pageNumberRef.current, requestedSize = pageSize) => {
    const { board, grade, gradeGroups, subject, search } = requestedFilters;
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    const requestNumber = ++requestNumberRef.current;
    try {
      setLoading(true);
      const response = await getFilteredTutors(
        (board || []).join(","),
        (grade || []).join(","),
        (gradeGroups || []).join(","),
        (subject || []).join(","),
        search || "",
        requestedSize,
        requestedPage,
        controller.signal
      );
      if (requestNumber !== requestNumberRef.current) return;
      const rows = response?.data?.items || response?.data?.data || response?.data || [];
      setTutorDataSource(Array.isArray(rows) ? rows : []);
      setPaginationTotalRows(response?.data?.totalRecords || rows.length || 0);
    } catch (error) {
      if (requestNumber === requestNumberRef.current && !controller.signal.aborted) setTutorDataSource([]);
    } finally {
      if (requestNumber === requestNumberRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchTutors();
    return () => requestControllerRef.current?.abort();
  },[]);

  const handleFilterChange = (board, grade, gradeGroups, subject, search) => {
    const nextFilters = { board, grade, gradeGroups, subject, search };
    setFilters(nextFilters);
    pageNumberRef.current = 1;
    setCurrentPage(1);
    setResetPagination((value) => !value);
    fetchTutors(nextFilters, 1);
  };

  const handlePageChange = (page) => {
    pageNumberRef.current = page;
    setCurrentPage(page);
    fetchTutors(filters, page);
  };
  const handlePageSizeChange = (size) => {
    setPageSize(size);
    pageNumberRef.current = 1;
    setCurrentPage(1);
    setResetPagination((value) => !value);
    fetchTutors(filters, 1, size);
  };
// {
//     "tutorId": "37be4c46-4fe7-43eb-2953-08dd5e50a852",
//     "userId": "37be4c46-4fe7-43eb-2953-08dd5e50a853",
//     "tutorName": "Nagaparameswaran J",
//     "email": "sjlmnaga+tutor@gmail.com",
//     "boardId": "602e4b68-e7b2-42a2-8d1e-072f993a0012",
//     "boardName": "CBSE",
//     "gradeId": "9049b5ad-d6d6-4f9d-a747-761eabeb0e3e",
//     "gradeName": "Grade9",
//     "subjectId": "2e680d9a-4f73-442d-84ed-bebaa67cd918",
//     "subjectName": "Accounts",
//     "engagementLevel": null,
//     "rating": null,
//     "dropOutRatio": null,
//     "cancelationRatio": null,
//     "tutorPayment": 400
// }
  const columns = [
    // { name: "Code", selector: (row) => row.code },
    { name: "Tutor Name",grow: 2, selector: (row) => row.tutorName, sortable: true },
    { name: "Board", selector: (row) => row.boardName },
    { name: "Grade", selector: (row) => row.gradeName },
    { name: "Subject", selector: (row) => row.subjectName },
    { name: "Rating", selector: (row) => row.rating, sortable: true },
    { name: "Eng.%", selector: (row) => row.engagementRatio, sortable: true },
    { name: "Drop%", selector: (row) => row.dropRatio, sortable: true },
    { name: "Cncl.%", selector: (row) => row.cancelationRatio, sortable: true },
    {
      name: "Actions",
      cell: (row) => (
        <Link to={`/lms/schedule/schedule-class?id=${row.id}`}>
          <TooltipComponent
            tag="a"
            containerClassName="btn btn-trigger btn-icon"
            id={"add" + row.id}
            icon="icon ni ni-calender-date"
            direction="top"
            text="Schedule Class"
          />
        </Link>
      ),
    },
  ];

  const RenderGrid = (props) => {
    return (
      <>
        <ReactDataTable
          data={props.dataSource}
          columns={columns}
          pagination
          className="nk-tb-list"
          // selectableRows
        />
      </>
    );
  };

  return (
    <div>
      <TutorFilterBar
        filters={filters}
        onChangeCallback={handleFilterChange}
        // fetchOptions={}
      />
      <DataTable
        data={tutorDataSource}
        columns={columns}
        pagination
        paginationServer
        paginationTotalRows={paginationTotalRows}
        paginationDefaultPage={currentPage}
        paginationResetDefaultPage={resetPagination}
        paginationPerPage={pageSize}
        onChangePage={handlePageChange}
        onChangeRowsPerPage={handlePageSizeChange}
        progressPending={loading}
        noDataComponent={<div className="p-2">There are no records found</div>}
        highlightOnHover
      />
      {loading && <div className="text-center p-3">Loading tutors...</div>}
      {/* <DataTable
        data={tutorDataSource}
        columns={columns}
        pagination
        paginationServer
        paginationTotalRows={paginationTotalRows}
        onChangePage={handlePageChange}
        noDataComponent={<div className="p-2">There are no records found</div>}
        highlightOnHover
        striped
      /> */}
    </div>
  );
};

export default TCTTutorListGrid;
