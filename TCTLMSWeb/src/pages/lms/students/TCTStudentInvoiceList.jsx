import React, { useState, useEffect } from "react";
import Content from "../../../layout/content/Content";
import Head from "../../../layout/head/Head";
import { UncontrolledDropdown, DropdownMenu, DropdownToggle, Card, Badge, DropdownItem } from "reactstrap";
import {
  Button,
  Block,
  BlockBetween,
  BlockDes,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Icon,
  PaginationComponent,
} from "../../../components/Component";
import { Link } from "react-router-dom";
import { getstudentinvoicelist } from "../../../apiservices/ScheduleService";

const TCTStudentInvoiceList = () => {
  const studentId = localStorage.getItem("userId");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [onSearch, setOnSearch] = useState(true);
  const [onSearchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemPerPage, setItemPerPage] = useState(10);
  const [sort, setSortState] = useState("asc");

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await getstudentinvoicelist(studentId);
      setData(response.data || []);
    } catch (error) {
      console.error("Error fetching data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Sorting data
  const sortFunc = () => {
    if (!data || data.length === 0) return;

    const sortedData = [...data].sort((a, b) =>
      sort === "asc" ? parseFloat(a.id) - parseFloat(b.id) : parseFloat(b.id) - parseFloat(a.id)
    );
    setData(sortedData);
  };

  // Search functionality
  useEffect(() => {
    if (onSearchText) {
      const filteredData = data.filter((item) =>
        item.invoiceNumber?.toLowerCase().includes(onSearchText.toLowerCase()) ||
        item.month?.toLowerCase().includes(onSearchText.toLowerCase()) ||
        item.year.toString().includes(onSearchText.toString())
      );
      setData(filteredData);
    } else {
      fetchData(); // Reset to original data if search text is cleared
    }
  }, [onSearchText]);

  const onFilterChange = (e) => setSearchText(e.target.value);

  // Pagination
  const indexOfLastItem = currentPage * itemPerPage;
  const indexOfFirstItem = indexOfLastItem - itemPerPage;
  const currentItems = data.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <React.Fragment>
      <Head title="Invoice List" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page>{localStorage.getItem("userName")}'s Invoices</BlockTitle>
              <BlockDes className="text-soft">
                <p>You have total {data.length} invoices.</p>
              </BlockDes>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        <Block>
          <Card className="card-stretch">
            <div className="card-inner-group">
              <div className="card-inner">
                <div className="card-title-group">
                  <div className="card-title">
                    <h5 className="title">All Invoices</h5>
                  </div>
                  <div className="card-tools mr-n1">
                    <ul className="btn-toolbar">
                      <li>
                        <Button onClick={() => setOnSearch(!onSearch)} className="btn-icon search-toggle toggle-search">
                          <Icon name="search" />
                        </Button>
                      </li>
                      <li className="btn-toolbar-sep"></li>
                      <li>
                        <UncontrolledDropdown>
                          <DropdownToggle tag="a" className="dropdown-toggle btn btn-icon btn-trigger">
                            <Icon name="setting"></Icon>
                          </DropdownToggle>
                          <DropdownMenu right>
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
                  <div className={`card-search search-wrap ${!onSearch ? "active" : ""}`}>
                    <div className="search-content">
                      <Button
                        className="search-back btn-icon toggle-search"
                        onClick={() => {
                          setSearchText("");
                          setOnSearch(!onSearch);
                        }}
                      >
                        <Icon name="arrow-left" />
                      </Button>
                      <input
                        type="text"
                        className="form-control border-transparent form-focus-none"
                        placeholder="Search by Invoice # | Month | Year"
                        value={onSearchText}
                        onChange={onFilterChange}
                      />
                      <Button className="search-submit btn-icon">
                        <Icon name="search" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="table-responsive">
              <table className="table table-striped">
                  <thead>
                    <tr>
                      <th className="tb-odr-info">
                        <span className="tb-odr-id">INVOICE #</span>
                        <span className="tb-odr-date d-none d-md-inline-block">MONTH & YEAR</span>
                      </th>
                      <th className="tb-odr-amount">
                        <span className="tb-odr-total">TOTAL AMOUNT</span>
                        <span className="tb-odr-status d-none d-md-inline-block">STATUS</span>
                      </th>
                      <th className="tb-odr-action">&nbsp;</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentItems.length > 0 ? (
                      currentItems.map((item) => (
                        <tr key={item.invoiceNumber}>
                          <td>
                            <span className="tb-odr-id">
                              <Link to={`${process.env.PUBLIC_URL}/lms/students/student-invoice-details?invNumber=${item.invoiceNumber}`}>{item.invoiceNumber}</Link>
                            </span>
                            <span className="tb-odr-date">{item.invoicePeriod}</span>
                          </td>
                          <td>
                            <span className="tb-odr-total">
                              <span className="amount">
                              {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.studentTotalPayment)}
                              </span>
                            </span>
                            <span className="tb-odr-status">
                              <Badge
                                color="success"
                                className="badge-dot"
                              >
                              "Complete"
                              </Badge>
                            </span>
                          </td>
                          <td>
                            <div className="tb-odr-btns d-none d-sm-inline">
                              <Link to={`${process.env.PUBLIC_URL}/lms/students/invoice-print?invNumber=${item.invoiceNumber}`} target="_blank">
                                <Button color="primary" size="sm" className="btn-icon btn-white btn-dim">
                                  <Icon name="printer-fill" />
                                </Button>
                              </Link>
                              <Link to={`${process.env.PUBLIC_URL}/lms/students/student-invoice-details?invNumber=${item.invoiceNumber}`}>
                                <Button color="primary" size="sm" className="btn btn-dim">
                                  View
                                </Button>
                              </Link>
                            </div>
                            {/* <Link to={`${process.env.PUBLIC_URL}/lms/students/student-invoice-details?invNumber=${item.invoiceNumber}`}>
                              <Button className="btn-pd-auto d-sm-none">
                                <Icon name="chevron-right" />
                              </Button>
                            </Link> */}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className="text-center">
                          No data found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="card-inner">
                {data.length > 0 && (
                  <PaginationComponent
                    noDown
                    itemPerPage={itemPerPage}
                    totalItems={data.length}
                    paginate={paginate}
                    currentPage={currentPage}
                  />
                )}
              </div>
            </div>
          </Card>
        </Block>
      </Content>
    </React.Fragment>
  );
};

export default TCTStudentInvoiceList;
