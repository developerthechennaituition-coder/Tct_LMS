import { useEffect, useState } from "react";
import Content from "../../../layout/content/Content";
import Head from "../../../layout/head/Head";
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
import { Card, DropdownItem, UncontrolledDropdown, DropdownMenu, DropdownToggle } from "reactstrap";
import { getAllMaster } from "../../../apiservices/LookupsService";
import { Link } from "react-router-dom";


const MastersData = () => {
  const [masterDataSource, setMasterDataSource] = useState();
  const [originalData, setOriginalData] = useState([]);
  const [tablesm, updateTableSm] = useState(false);
  const [onSearch, setonSearch] = useState(true);
  const [onSearchText, setSearchText] = useState("");
  const [itemPerPage, setItemPerPage] = useState(10);
  const [sort, setSortState] = useState("");
  const [resetPagination, setResetPagination] = useState(false);
  const dtTypeGroup = [
    {
      name: "Name",
      minWidth: "200px",
      selector: (row) => row.typeGroupName,
      sortable: true,
      cell: (row) => <span>{row.typeGroupName}</span>,
    },
    {
      name: "Description",
      minWidth: "200px",
      selector: (row) => row.typeGroupDescription,
      sortable: true,
      cell: (row) => <span>{row.typeGroupDescription}</span>,
    },
    {
      name: "Status",
      width: "120px",
      selector: (row) => row.isActive,
      sortable: true,
      cell: (row) => (
        <span className={row.isActive === true ? "tb-status text-success" : "tb-status text-warning"}>
          {row.isActive === true ? "Active" : "Inactive"}
        </span>
      ),
      hide: "md",
    },
    {
      name: "Action",
      hide: "sm",
      width: "100px",
      cell: (row) => (
        <>
          <Link
            to={`${process.env.PUBLIC_URL}/masterdetails?code=${row.typeGroupCode}&typegroupId=${row.id}&name=${row.typeGroupName}`}
          >
            <TooltipComponent
              tag="a"
              containerClassName="btn btn-trigger btn-icon"
              id={"edit" + row.id}
              icon="note-add"
              direction="top"
              text="Add Typecode"
            />
          </Link>
        </>
      ),
    },
  ];
  const toggle = () => setonSearch((current) => !current);
  const applyView = (text = onSearchText, order = sort) => {
    const normalizedText = text.trim().toLowerCase();
    const filteredData = originalData.filter((item) =>
      (item.typeGroupName || "").toLowerCase().includes(normalizedText)
    );
    const sortedData = [...filteredData].sort((a, b) => {
      const left = (a.typeGroupName || "").toLowerCase();
      const right = (b.typeGroupName || "").toLowerCase();
      return order === "dsc" ? right.localeCompare(left) : left.localeCompare(right);
    });
    setMasterDataSource(sortedData);
    setResetPagination((current) => !current);
  };
  const sortFunc = (order) => applyView(onSearchText, order);
  const onFilterChange = (e) => {
    const filterText = e.target.value.toLowerCase();
    setSearchText(filterText);
    applyView(filterText, sort);
  };
  useEffect(() => {
    getAllMaster().then((response) => {
      setMasterDataSource(response);
      setOriginalData(response);
    });
  }, []);

  const RenderGrid = (props) => {
    return (
      <>
        <ReactDataTable
          data={props.dataSource}
          columns={dtTypeGroup}
          pagination
          pageSize={itemPerPage}
          paginationResetDefaultPage={resetPagination}
          canShowFilter={false}
        />
      </>
    );
  };

  return (
    <Content>
      <Head title="Master"></Head>
      <BlockHead size="sm">
        <BlockBetween>
          <BlockHeadContent>
            <BlockTitle page>Master Data</BlockTitle>
          </BlockHeadContent>
        </BlockBetween>
      </BlockHead>
      <Block>
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
                        applyView("", sort);
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
          {masterDataSource && (
            <>
              <RenderGrid dataSource={masterDataSource}></RenderGrid>
            </>
          )}
        </div>
      </Block>
    </Content>
  );
};

export default MastersData;
