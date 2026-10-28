import React, { useEffect, useState } from "react";
import { Card, UncontrolledDropdown, DropdownMenu, DropdownItem, DropdownToggle } from "reactstrap";
import { Icon } from "../../../components/Component";
import { TCTDoughnut } from "../../components/charts/TCTCharts";

const SalesByBoard = (props) => {
  const [data, setData] = useState("7");
  const [trafficSources, setTrafficSources] = useState();
  const pleasantColors = [
    // Purples & Blues
    "#b695ff",
    "#b9fbc0",
    "#70fcd8",
    "#9f7afa",
    "#4d8bff",
    "#ffb347",
    "#8b6cea",
    "#7d5ee0",
    "#6c9fff",
    "#7de988",
    "#4d8bff",
    "#3a7dfd",
    "#2d6feb",

    // Pinks & Reds
    "#ffa9ce",
    "#ff8fb6",
    "#ff7aa6",
    "#ff6699",
    "#ff9e9e",
    "#ff8585",
    "#ff6b6b",
    "#ff5252",

    // Yellows & Oranges
    "#f9db7b",
    "#ffd166",
    "#ffc75f",
    "#ffb347",
    "#ffb88c",
    "#ffa06f",
    "#ff8b5a",
    "#ff7545",

    // Greens
    "#b9fbc0",
    "#95f2a0",
    "#7de988",
    "#65e070",
    "#85ffb8",
    "#6ceea6",
    "#52e090",
    "#40cf7e",

    // Teals & Cyans
    "#85e3ff",
    "#69daff",
    "#47d1ff",
    "#29c7ff",
    "#8effe2",
    "#70fcd8",
    "#52f7cd",
    "#38edc2",
  ];

  const jsonData = [
    {
      boardId: "602e4b68-e7b2-42a2-8d1e-072f993a0012",
      boardName: "CBSE",
      salesCount: 9,
    },
    {
      boardId: "d3a02bcf-8974-4be0-a260-7f8e9b08b931",
      boardName: "CAIE",
      salesCount: 1,
    },
    {
      boardId: "7669fa46-f753-4610-9917-898136de97e3",
      boardName: "ICSE",
      salesCount: 0,
    },
    {
      boardId: "e30f58f3-6d0f-45c7-99b9-8b92b5ea5aca",
      boardName: "IGCSE",
      salesCount: 0,
    },
    {
      boardId: "05f1673e-0417-4c12-8377-d3acf8e2d75a",
      boardName: "CISCE",
      salesCount: 0,
    },
    {
      boardId: "bb0f8950-e19a-4326-9adc-d43a87ef23df",
      boardName: "IB",
      salesCount: 0,
    },
    {
      boardId: "51bea805-4bfe-457e-b247-efa391517147",
      boardName: "NIOS",
      salesCount: 0,
    },
  ];

  useEffect(() => {
    const _result = convertToChartFormat(props.dataSource);
    setTrafficSources(_result);
  }, []);

  const generateRandomColors = (count) => {
    return Array.from({ length: count }, () => `#${Math.floor(Math.random() * 16777215).toString(16)}`);
  };
  const generatePleasantColors = (count) => {
    return Array.from(
      { length: count },
      (_, i) => pleasantColors[i % pleasantColors.length] // Loop colors if needed
    );
  };

  const convertToChartFormat = (boardSalesData) => {
    return {
      labels: boardSalesData.map((item) => item.boardName),
      dataUnit: "sales",
      legend: true,
      dataSource: boardSalesData,
      datasets: [
        {
          borderColor: "#fff",
          backgroundColor: generatePleasantColors(boardSalesData.length), // Dynamically generate colors
          data: boardSalesData.map((item) => item.salesCount),
        },
      ],
    };
  };

  const trafficSources1 = {
    labels: ["Organic Search", "Social Media", "Referrals", "Others"],
    dataUnit: "sts",
    legend: true,
    datasets: [
      {
        borderColor: "#fff",
        backgroundColor: ["#b695ff", "#b8acff", "#ffa9ce", "#f9db7b"],
        data: [4305, 859, 482, 138],
      },
    ],
  };
  return (
    <>
      <Card className="card-full overflow-hidden">
        <div className="nk-ecwg nk-ecwg4 h-100">
          <div className="card-inner flex-grow-1">
            <div className="card-title-group mb-4">
              <div className="card-title">
                <h6 className="title">Boards Offered </h6>
              </div>
              <div className="card-tools">
                <UncontrolledDropdown>
                  <DropdownToggle
                    tag="a"
                    href="#toggle"
                    onClick={(ev) => ev.preventDefault()}
                    className="dropdown-toggle btn btn-icon btn-trigger"
                  >
                    <Icon name="more-h" />
                  </DropdownToggle>
                  <DropdownMenu right className="dropdown-menu-sm">
                    <ul className="link-list-opt no-bdr">
                      <li className={data === "7" ? "active" : ""}>
                        <DropdownItem
                          tag="a"
                          href="#dropdown"
                          onClick={(ev) => {
                            ev.preventDefault();
                            setData("7");
                          }}
                        >
                          <span>7 Days</span>
                        </DropdownItem>
                      </li>
                      <li className={data === "15" ? "active" : ""}>
                        <DropdownItem
                          tag="a"
                          href="#dropdown"
                          onClick={(ev) => {
                            ev.preventDefault();
                            setData("15");
                          }}
                        >
                          <span>15 days</span>
                        </DropdownItem>
                      </li>
                      <li className={data === "30" ? "active" : ""}>
                        <DropdownItem
                          tag="a"
                          href="#dropdown"
                          onClick={(ev) => {
                            ev.preventDefault();
                            setData("30");
                          }}
                        >
                          <span>30 days</span>
                        </DropdownItem>
                      </li>
                    </ul>
                  </DropdownMenu>
                </UncontrolledDropdown>
              </div>
            </div>
            <div className="data-group">
              <div className="nk-ecwg4-ck">{trafficSources && <TCTDoughnut dataSource={trafficSources} />}</div>
              <ul className="nk-ecwg4-legends">
                {trafficSources &&
                  trafficSources.labels.map((item, index) => {
                    return (
                      <li>
                        <div className="title">
                          <span
                            className="dot dot-lg sq"
                            style={{ background: trafficSources.datasets[0].backgroundColor[index] }}
                          ></span>
                          <span>{item}</span>
                        </div>
                        <div className="amount amount-xs">{trafficSources.datasets[0].data[index]}</div>
                      </li>
                    );
                  })}
              </ul>
            </div>
          </div>
          {/* <div className="card-inner card-inner-md bg-light">
            <div className="card-note">
              <Icon className="info-fill"></Icon>
              <span>Traffic channels have beed generating the most traffics over past days.</span>
            </div>
          </div> */}
        </div>
      </Card>
    </>
  );
};
export default SalesByBoard;
