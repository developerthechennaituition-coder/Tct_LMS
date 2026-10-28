import React, { useEffect, useState } from "react";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { useNavigate } from "react-router-dom";
export const TCTDoughnut = ({ dataSource }) => {
  const [data, setData] = useState(dataSource);
  // useEffect(() => {
  //   if (state === "7") {
  //     setData(trafficSourcesSet2);
  //   } else if (state === "15") {
  //     setData(trafficSourcesSet3);
  //   } else {
  //     setData(trafficSourcesSet4);
  //   }
  // }, [state]);
  const handleClick = (event, chartElement) => {
    if (!chartElement.length) return; // No element clicked
    const index = chartElement[0]._index; // Get clicked index
    const label = data.labels[index]; // Get clicked label
    const value = data.datasets[0].data[index]; // Get clicked value
    const boardId = data.dataSource[index].boardId;
    // navigator("/lms/sales/enrollment-history");
    window.location.href = `/lms/sales/enrollment-history?boardId=${boardId}&name=${label}`;
    // navigate("/lms/sales/enrollment-history");
    // alert(`You clicked on ${label}: ${value}`);
  };
  return (
    <Doughnut
      data={data}
      options={{
        legend: {
          display: false,
        },
        onClick: handleClick,
        rotation: 1,
        cutoutPercentage: 40,
        maintainAspectRatio: false,
        tooltips: {
          enabled: true,
          callbacks: {
            title: function (tooltipItem, data) {
              return data["labels"][tooltipItem[0]["index"]];
            },
            label: function (tooltipItem, data) {
              return data.datasets[tooltipItem.datasetIndex]["data"][tooltipItem["index"]];
            },
          },
          backgroundColor: "#1c2b46",
          titleFontSize: 13,
          titleFontColor: "#fff",
          titleMarginBottom: 6,
          bodyFontColor: "#fff",
          bodyFontSize: 12,
          bodySpacing: 4,
          yPadding: 10,
          xPadding: 10,
          footerMarginTop: 0,
          displayColors: false,
        },
      }}
    />
  );
};
