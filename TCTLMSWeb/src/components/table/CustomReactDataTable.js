import React, { useEffect, useState } from "react";
import DataTable from "react-data-table-component";
import exportFromJSON from "export-from-json";
import CopyToClipboard from "react-copy-to-clipboard";
import { Col, Modal, ModalBody, Row, Button, UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem } from "reactstrap";

const Export = ({ data, downloadFileName }) => {
  const [modal, setModal] = useState(false);

  useEffect(() => {
    if (modal === true) {
      setTimeout(() => setModal(false), 2000);
    }
  }, [modal]);

  const generateTimestamp = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    const timestamp = `${year}${month}${day}${hours}${minutes}${seconds}`;
    return downloadFileName ? `${downloadFileName}_${timestamp}` : `Export_${timestamp}`;
  };

  const fileName = generateTimestamp();

  const exportCSV = () => {
    const exportType = exportFromJSON.types.csv;
    exportFromJSON({ data, fileName, exportType });
  };

  const exportExcel = () => {
    const exportType = exportFromJSON.types.xls;
    exportFromJSON({ data, fileName, exportType });
  };

  const copyToClipboard = () => {
    setModal(true);
  };

  return (
    <React.Fragment>
      <div className="dt-export-buttons d-flex align-center">        
        <div className="dt-buttons btn-group flex-wrap">
          <button 
            className="btn btn-secondary buttons-excel buttons-html5" 
            type="button" 
            onClick={() => exportExcel()}
            title="Export data to Excel format"
          >
            <span>Excel</span>
          </button>{" "}
          <button 
            className="btn btn-secondary buttons-csv buttons-html5" 
            type="button" 
            onClick={() => exportCSV()}
            title="Export data to CSV format"
          >
            <span>CSV</span>
          </button>{" "}
          <CopyToClipboard text={JSON.stringify(data)}>
            <Button 
              className="buttons-copy buttons-html5" 
              onClick={() => copyToClipboard()}
              title="Copy data to clipboard as JSON"
            >
              <span>Copy</span>
            </Button>
          </CopyToClipboard>{" "}
        </div>
      </div>
      <Modal isOpen={modal} className="modal-dialog-centered text-center" size="sm">
        <ModalBody className="text-center m-2">
          <h5>Copied to clipboard</h5>
        </ModalBody>
        <div className="p-3 bg-light">
          <div className="text-center">Copied {data.length} rows to clipboard</div>
        </div>
      </Modal>
    </React.Fragment>
  );
};

const ExpandableRowComponent = ({ data }) => {
  return (
    <ul className="dtr-details p-2 border-bottom ml-1">
      <li className="d-block d-sm-none">
        <span className="dtr-title">Company</span> <span className="dtr-data">{data.company}</span>
      </li>
      <li className="d-block d-sm-none">
        <span className="dtr-title ">Gender</span> <span className="dtr-data">{data.gender}</span>
      </li>
      <li>
        <span className="dtr-title">Start Date</span> <span className="dtr-data">{data.startDate}</span>
      </li>
      <li>
        <span className="dtr-title">Salary</span> <span className="dtr-data">{data.salary}</span>
      </li>
    </ul>
  );
};

const CustomCheckbox = React.forwardRef(({ onClick, ...rest }, ref) => (
  <div className="custom-control custom-control-sm custom-checkbox notext">
    <input
      id={rest.name}
      type="checkbox"
      className="custom-control-input form-control"
      ref={ref}
      onClick={onClick}
      {...rest}
    />
    <label className="custom-control-label" htmlFor={rest.name} />
  </div>
));

// Loading component
const DataTableLoader = ({ message = "Loading..." }) => (
  <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
    <div className="text-center">
      <div className="spinner-border text-primary mb-3" role="status">
        <span className="sr-only">Loading...</span>
      </div>
      <div className="text-muted">{message}</div>
    </div>
  </div>
);

const CustomReactDataTable = ({
  pageSize,
  data,
  columns,
  pagination,
  actions,
  className,
  selectableRows,
  expandableRows,
  onSelectedRowsChange,
  canShowFilter,
  searchableFields = [],
  downloadFileName,
  loading = false,          // New prop for loading state
  loadingMessage,           // Custom loading message
  // Optional layout props (off by default, so existing pages render exactly as before):
  toolbarTitle,             // title shown on the left of the search/export row
  showEntriesInFooter = false, // render the "Show" entries dropdown in the footer row
  initialSearch = "",
}) => {
  const [tableData, setTableData] = useState(data || []);
  const [searchText, setSearchText] = useState(initialSearch);
  useEffect(() => { setSearchText(initialSearch); }, [initialSearch]);
  const [rowsPerPageS, setRowsPerPage] = useState(pageSize || 10);
  const [mobileView, setMobileView] = useState(false);

  // Update tableData when data prop changes
  useEffect(() => {
    setTableData(data || []);
  }, [data]);

  // Generic search function
  const performSearch = (searchValue, dataToSearch) => {
    if (!searchValue || searchValue.trim() === "") {
      return dataToSearch;
    }

    const searchLower = searchValue.toLowerCase().trim();
    
    return dataToSearch.filter((item) => {
      if (searchableFields && searchableFields.length > 0) {
        return searchableFields.some(field => {
          const fieldValue = item[field];
          if (fieldValue === null || fieldValue === undefined) return false;
          return String(fieldValue).toLowerCase().includes(searchLower);
        });
      }
      
      return Object.values(item).some(value => {
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(searchLower);
      });
    });
  };

  useEffect(() => {
    if (data && Array.isArray(data)) {
      const filteredData = performSearch(searchText, data);
      setTableData(filteredData);
    } else {
      setTableData([]);
    }
  }, [searchText, data, searchableFields]);

  const viewChange = () => {
    if (window.innerWidth < 960 && expandableRows) {
      setMobileView(true);
    } else {
      setMobileView(false);
    }
  };

  useEffect(() => {
    viewChange();
    window.addEventListener("resize", viewChange);
    return () => {
      window.removeEventListener("resize", viewChange);
    };
  }, [expandableRows]);

  const getSearchPlaceholder = () => {
    if (searchableFields && searchableFields.length > 0) {
      const fieldNames = searchableFields.map(field => {
        return field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      });
      return `Search by ${fieldNames.join(', ')}`;
    }
    return "Search...";
  };

  const handleRowsPerPageChange = (e) => {
    const newRowsPerPage = parseInt(e.target.value, 10);
    setRowsPerPage(newRowsPerPage);
  };

  const renderNoDataComponent = () => {
    const isFiltered = searchText && searchText.trim() !== "";
    const hasOriginalData = data && Array.isArray(data) && data.length > 0;
    
    if (isFiltered && hasOriginalData) {
      return (
        <div className="text-center p-4">
          <div className="empty-state">
            <em className="icon ni ni-search" style={{ fontSize: '2rem', color: '#c4c4c4' }}></em>
            <h6 className="mt-2">No matching records found</h6>
            <p className="text-muted">
              No records match your search for "{searchText}". Try adjusting your search terms.
            </p>
          </div>
        </div>
      );
    } else if (!hasOriginalData) {
      return (
        <div className="text-center p-4">
          <div className="empty-state">
            <em className="icon ni ni-inbox" style={{ fontSize: '2rem', color: '#c4c4c4' }}></em>
            <h6 className="mt-2">No records found</h6>
            <p className="text-muted">
              There are currently no records to display.
            </p>
          </div>
        </div>
      );
    }
    
    return (
      <div className="text-center p-4">
        <div className="empty-state">
          <h6>No records found</h6>
        </div>
      </div>
    );
  };

  const tableKey = `datatable-${rowsPerPageS}`;

  const searchInput = (
    <input
      type="search"
      style={{ width: "100%" }}
      className="form-control form-control-sm"
      placeholder={getSearchPlaceholder()}
      value={searchText}
      onChange={(ev) => setSearchText(ev.target.value)}
    />
  );

  const showEntriesControl = (
    <div className="dataTables_length" id="DataTables_Table_0_length">
      <label>
        <span className="d-none d-sm-inline-block">Show</span>
        <div className="form-control-select">
          {" "}
          <select
            name="DataTables_Table_0_length"
            className="custom-select custom-select-sm form-control form-control-sm"
            onChange={handleRowsPerPageChange}
            value={rowsPerPageS}
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>{" "}
        </div>
      </label>
    </div>
  );

  // Footer layout only (showEntriesInFooter): a themed rows-per-page dropdown, since a native
  // select's open list cannot be styled. Same options and the same handleRowsPerPageChange.
  const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100];
  const footerShowEntriesControl = (
    <div className="dataTables_length crdt-rpp">
      <span className="crdt-rpp-label">Rows per page</span>
      <UncontrolledDropdown direction="up">
        <DropdownToggle tag="button" type="button" className="crdt-rpp-toggle" aria-label={`Rows per page: ${rowsPerPageS}`}>
          <span>{rowsPerPageS}</span>
          <em className="icon ni ni-chevron-down"></em>
        </DropdownToggle>
        <DropdownMenu right className="crdt-rpp-menu">
          {PAGE_SIZE_OPTIONS.map((size) => (
            <DropdownItem
              key={size}
              tag="button"
              type="button"
              active={Number(rowsPerPageS) === size}
              onClick={() => {
                if (Number(rowsPerPageS) !== size) handleRowsPerPageChange({ target: { value: String(size) } });
              }}
            >
              <span>{size}</span>
              {Number(rowsPerPageS) === size && <em className="icon ni ni-check"></em>}
            </DropdownItem>
          ))}
        </DropdownMenu>
      </UncontrolledDropdown>
    </div>
  );

  // If loading, show loader instead of the entire table
  if (loading) {
    return (
      <div className={`dataTables_wrapper dt-bootstrap4 no-footer ${className ? className : ""}`}>
        <DataTableLoader message={loadingMessage} />
      </div>
    );
  }

  return (
    <div className={`dataTables_wrapper dt-bootstrap4 no-footer ${className ? className : ""}`}>
      {toolbarTitle ? (
        <div className="crdt-toolbar">
          <div className="crdt-toolbar-title">{toolbarTitle}</div>
          {canShowFilter && (
            <>
              <div className="crdt-toolbar-search dataTables_filter">{searchInput}</div>
              {actions && <Export data={tableData} downloadFileName={downloadFileName} />}
              {!showEntriesInFooter && showEntriesControl}
            </>
          )}
        </div>
      ) : (
        <Row className={`justify-between g-2 ${actions ? "with-export" : ""}`}>
          {canShowFilter && (
            <>
              <Col className="col-12 text-left mt-3" sm="8">
                <div id="DataTables_Table_0_filter" className="dataTables_filter">
                  {searchInput}
                </div>
              </Col>
              <Col className="col-5 text-right mt-3" sm="4">
                <div className="datatable-filter">
                  <div className="d-flex justify-content-end g-2">
                    {actions && <Export data={tableData} downloadFileName={downloadFileName} />}
                    {showEntriesControl}
                  </div>
                </div>
              </Col>
            </>
          )}
        </Row>
      )}
      <DataTable
        key={tableKey}
        data={tableData}
        columns={columns}
        className={className}
        selectableRows={selectableRows}
        selectableRowsComponent={CustomCheckbox}
        onSelectedRowsChange={onSelectedRowsChange}
        expandableRowsComponent={ExpandableRowComponent}
        expandableRows={mobileView}
        noDataComponent={renderNoDataComponent()}
        sortIcon={
          <div>
            <span>&darr;</span>
            <span>&uarr;</span>
          </div>
        }
        pagination={pagination}
        paginationServer={false}
        paginationPerPage={rowsPerPageS}
        paginationRowsPerPageOptions={[5, 10, 25, 50, 100]}
        paginationComponentOptions={{
          rowsPerPageText: 'Records per page:',
          rangeSeparatorText: 'of',
        }}
        onChangeRowsPerPage={(currentRowsPerPage, currentPage) => {
          setRowsPerPage(currentRowsPerPage);
        }}
        paginationComponent={({ currentPage, rowsPerPage, rowCount, onChangePage, onChangeRowsPerPage }) => {
          const startRecord = ((currentPage - 1) * rowsPerPage) + 1;
          const endRecord = Math.min(currentPage * rowsPerPage, rowCount);
          const totalPages = Math.ceil(rowCount / rowsPerPage);
          
          const pageList = (
            <ul className="pagination justify-content-end">
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => currentPage > 1 && onChangePage(currentPage - 1)}
                    disabled={currentPage === 1}
                    style={{ border: 'none', background: 'transparent' }}
                  >
                    <em className="icon ni ni-chevrons-left"></em>
                  </button>
                </li>
                
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 7) {
                    pageNum = i + 1;
                  } else {
                    if (currentPage <= 4) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 3) {
                      pageNum = totalPages - 6 + i;
                    } else {
                      pageNum = currentPage - 3 + i;
                    }
                  }
                  
                  return (
                    <li key={pageNum} className={`page-item ${currentPage === pageNum ? 'active' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => onChangePage(pageNum)}
                        style={{ 
                          border: 'none', 
                          background: currentPage === pageNum ? '#526484' : 'transparent',
                          color: currentPage === pageNum ? 'white' : '#526484'
                        }}
                      >
                        {pageNum}
                      </button>
                    </li>
                  );
                })}
                
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => currentPage < totalPages && onChangePage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    style={{ border: 'none', background: 'transparent' }}
                  >
                    <em className="icon ni ni-chevrons-right"></em>
                  </button>
                </li>
            </ul>
          );

          if (showEntriesInFooter) {
            return (
              <div className="crdt-footer">
                {footerShowEntriesControl}
                <div className="dataTables_info" role="status" aria-live="polite">
                  Showing {startRecord} to {endRecord} of {rowCount} entries
                </div>
                <div className="dataTables_paginate paging_simple_numbers">{pageList}</div>
              </div>
            );
          }

          return (
            <div className="dataTables_wrapper dt-bootstrap4 no-footer">
              <div className="row">
                <div className="col-sm-12 col-md-5">
                  <div className="dataTables_info" role="status" aria-live="polite" style={{ paddingTop: '0.75rem' }}>
                    Showing {startRecord} to {endRecord} of {rowCount} entries
                  </div>
                </div>
                <div className="col-sm-12 col-md-7">
                  <div className="dataTables_paginate paging_simple_numbers" style={{ float: 'right' }}>
                    {pageList}
                  </div>
                </div>
              </div>
            </div>
          );
        }}
      />
    </div>
  );
};

export default CustomReactDataTable;
