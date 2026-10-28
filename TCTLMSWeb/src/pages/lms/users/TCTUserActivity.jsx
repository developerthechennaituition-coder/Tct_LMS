import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Block,
  BlockBetween,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  ReactDataTable,
  Icon,
} from "../../../components/Component";
import { UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem } from "reactstrap";

import { useLocation } from "react-router-dom";
import { getUserActivity } from "../../../apiservices/UserService";
import moment from "moment";
import Head from "../../../layout/head/Head";

// Same formats as the table cells, so search matches exactly what is displayed.
const formatActivityDate = (value) => (value ? moment(value).format("DD-MMM-YYYY") : "N/A");
const formatActivityTime = (value) => (value ? moment(value).format("DD-MMM-YYYY hh:mm:ss") : "N/A");

// Tutor's own profile Activity tab only (.tct-act-own): rows scroll inside a fixed-height area,
// pagination + Rows per page stay below it, and the record range is shown correctly.
const ownActivityStyle = `
  .tct-act-own { position: relative; }
  /* Slim, subtle scrollbar on the table's scroll area so it is clear the rows scroll.
     Only elements that actually overflow (the rows area) show it. */
  .tct-act-own div { scrollbar-width: thin; scrollbar-color: #cdbdfd transparent; }
  .tct-act-own div::-webkit-scrollbar { width: 6px; height: 6px; }
  .tct-act-own div::-webkit-scrollbar-track { background: transparent; }
  .tct-act-own div::-webkit-scrollbar-thumb { background: #cdbdfd; border-radius: 999px; }
  .tct-act-own div::-webkit-scrollbar-thumb:hover { background: #854fff; }
  .tct-act-own div::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
  /* The shared pagination prints "1 - {page size} of {total}"; the correct range is shown in .tct-act-own-range. */
  .tct-act-own .dataTables_info { display: none; }
  .tct-act-own-bar { display: flex; align-items: center; justify-content: flex-end; gap: 16px; }
  .tct-act-own-bar .tct-rpp { margin-top: 0 !important; }
  .tct-act-own-range { font-size: 13px; color: #8094ae; white-space: nowrap; font-variant-numeric: tabular-nums; }
  @media (min-width: 768px) {
    .tct-act-own-bar { position: absolute; right: 0; bottom: 0; height: 44px; }
    .tct-act-own .dataTables_wrapper .row.align-items-center { min-height: 44px; padding-right: 340px; }
  }
  @media (max-width: 767.98px) {
    .tct-act-own-bar { justify-content: space-between; flex-wrap: wrap; margin-top: 12px; }
  }
`;

// Record range ("26–30 of 30") with its own page state. The table reports page changes through
// pageListenerRef, so changing page does not re-render TCTUserActivity: re-rendering it remounts
// the shared pagination component, whose mount effect sends the table back to page 1.
const OwnActivityRange = ({ pageListenerRef, pageSize, total }) => {
  const [page, setPage] = useState(1);
  useEffect(() => {
    pageListenerRef.current = setPage;
    return () => {
      pageListenerRef.current = null;
    };
  }, [pageListenerRef]);
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  return (
    <span className="tct-act-own-range">
      {start}–{end} of {total}
    </span>
  );
};

const TCTUserActivity = ({ showSearchAndPageSize = false }) => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const userId = searchParams.get("userId") || searchParams.get("id");

  const [userActivityData, setUserActivityData] = useState([]);
  // Tutor viewing their own profile (/useractivity-list): Rows per page + scrollable rows.
  const isTutorOwnActivity =
    !showSearchAndPageSize &&
    localStorage.getItem("roleId") === "13" &&
    location.pathname.replace(/\/$/, "") === `${process.env.PUBLIC_URL}/useractivity-list`;
  const OWN_PAGE_SIZES = [10, 25, 50, 100];
  const [ownPageSize, setOwnPageSize] = useState(25);
  const ownPageListener = useRef(null);
  const [ownPageReset, setOwnPageReset] = useState(false);
  // Opt-in (tutor Student Profile only): search over the loaded rows + Rows per page.
  const [searchText, setSearchText] = useState("");
  const [pageSize, setPageSize] = useState(25);
  const [resetPaginationToggle, setResetPaginationToggle] = useState(false);
  const resetToFirstPage = () => setResetPaginationToggle((prev) => !prev);

  const searchTerm = searchText.trim().toLowerCase();
  const visibleActivityData =
    showSearchAndPageSize && searchTerm
      ? userActivityData.filter((row) =>
          [formatActivityDate(row.loggedIn), formatActivityTime(row.loggedIn), formatActivityTime(row.loggedOut)].some(
            (text) => text.toLowerCase().includes(searchTerm)
          )
        )
      : userActivityData;

  const fetchUserActivityData = useCallback(async () => {
    if (userId) {
      try {
        const userList = await getUserActivity(userId);
        console.log("API Response:", userList);

        if (Array.isArray(userList)) {
          const formattedData = userList.map(({ loggedIn, loggedOut }) => ({
            loggedIn: loggedIn || null,
            loggedOut: loggedOut || null,
          }));

          setUserActivityData(formattedData);
        } else {
          console.error("Unexpected API response format:", userList);
        }
      } catch (error) {
        console.error("Error fetching user activity data:", error);
      }
    }
  }, [userId]);

  useEffect(() => {
    fetchUserActivityData();
  }, [fetchUserActivityData]);

  const dtEnrolledCourseColumn = [
    {
      name: "Date",
      minWidth: "150px",
      selector: (row) => row.loggedIn,
      sortable: true,
      cell: (row) =>
        row.loggedIn ? moment(row.loggedIn).format("DD-MMM-YYYY") : "N/A",
    },
    {
      name: "Log In Time",
      selector: (row) => row.loggedIn,
      sortable: true,
      cell: (row) =>
        row.loggedIn
          ? moment(row.loggedIn).format("DD-MMM-YYYY hh:mm:ss")
          : "N/A",
    },
    {
      name: "Log Out Time",
      minWidth: "150px",
      selector: (row) => row.loggedOut,
      sortable: true,
      cell: (row) =>
        row.loggedOut
          ? moment(row.loggedOut).format("DD-MMM-YYYY hh:mm:ss")
          : "N/A",
    },
  ];

  return (
    <React.Fragment>
      <Head title="User Activity"></Head>
      <BlockHead size="sm">
        <BlockBetween>
          <BlockHeadContent>
            <BlockTitle tag="h6">User Activities</BlockTitle>
          </BlockHeadContent>
        </BlockBetween>
      </BlockHead>
      <Block>
        {userActivityData.length > 0 && showSearchAndPageSize ? (
          <>
            <div className="tct-act-toolbar">
              <div className="tct-act-search">
                <Icon name="search" />
                <input
                  type="search"
                  className="form-control"
                  placeholder="Search by date or time"
                  aria-label="Search activities by date or time"
                  value={searchText}
                  onChange={(e) => {
                    setSearchText(e.target.value);
                    resetToFirstPage();
                  }}
                />
              </div>
            </div>
            <div className="tct-act-grid">
              <ReactDataTable
                data={visibleActivityData}
                columns={dtEnrolledCourseColumn}
                pageSize={pageSize}
                pagination
                paginationResetDefaultPage={resetPaginationToggle}
                className="nk-tb-list"
              />
              {visibleActivityData.length > 0 && (
                <div className="tct-rpp">
                  <span>Rows per page</span>
                  <UncontrolledDropdown direction="up">
                    <DropdownToggle tag="button" type="button" className="tct-rpp-toggle" aria-label={`Rows per page: ${pageSize}`}>
                      <span>{pageSize}</span>
                      <Icon name="chevron-down" />
                    </DropdownToggle>
                    <DropdownMenu right className="tct-rpp-menu">
                      {[10, 25, 50].map((size) => (
                        <DropdownItem
                          key={size}
                          tag="button"
                          type="button"
                          active={pageSize === size}
                          onClick={() => {
                            if (pageSize === size) return;
                            setPageSize(size);
                            resetToFirstPage();
                          }}
                        >
                          <span>{size}</span>
                          {pageSize === size && <Icon name="check" />}
                        </DropdownItem>
                      ))}
                    </DropdownMenu>
                  </UncontrolledDropdown>
                </div>
              )}
            </div>
          </>
        ) : userActivityData.length > 0 && isTutorOwnActivity ? (
          <div className="tct-act-own">
            <style>{ownActivityStyle}</style>
            {/* fixedHeader: column headers stay visible; rows scroll inside a 420px area. */}
            <ReactDataTable
              data={userActivityData}
              columns={dtEnrolledCourseColumn}
              pageSize={ownPageSize}
              pagination
              paginationResetDefaultPage={ownPageReset}
              onChangePage={(page) => ownPageListener.current && ownPageListener.current(page)}
              fixedHeader
              fixedHeaderScrollHeight="420px"
              className="nk-tb-list"
            />
            <div className="tct-act-own-bar">
              <OwnActivityRange
                pageListenerRef={ownPageListener}
                pageSize={ownPageSize}
                total={userActivityData.length}
              />
              <div className="tct-rpp">
                <span>Rows per page</span>
                <UncontrolledDropdown direction="up">
                  <DropdownToggle tag="button" type="button" className="tct-rpp-toggle" aria-label={`Rows per page: ${ownPageSize}`}>
                    <span>{ownPageSize}</span>
                    <Icon name="chevron-down" />
                  </DropdownToggle>
                  <DropdownMenu right className="tct-rpp-menu">
                    {OWN_PAGE_SIZES.map((size) => (
                      <DropdownItem
                        key={size}
                        tag="button"
                        type="button"
                        active={ownPageSize === size}
                        onClick={() => {
                          if (ownPageSize === size) return;
                          setOwnPageSize(size);
                          if (ownPageListener.current) ownPageListener.current(1);
                          setOwnPageReset((prev) => !prev); // back to page 1
                        }}
                      >
                        <span>{size}</span>
                        {ownPageSize === size && <Icon name="check" />}
                      </DropdownItem>
                    ))}
                  </DropdownMenu>
                </UncontrolledDropdown>
              </div>
            </div>
          </div>
        ) : userActivityData.length > 0 ? (
          <ReactDataTable
            data={userActivityData}
            columns={dtEnrolledCourseColumn}
            pageSize={25}
            pagination
            className="nk-tb-list"
          />
        ) : (
          <p>No user activities found.</p>
        )}
      </Block>
    </React.Fragment>
  );
};

export default TCTUserActivity;
