import React, { useEffect, useState } from "react";
import Select from "react-select";

const customFormatOption = (option) => (
  <div style={{ color: option.isAvailable ? "inherit" : "red" }}>
    {option.label}
    {!option.isAvailable && <span style={{ marginLeft: 8 }}> </span>}
  </div>
);
const customStyles = {
  option: (provided, state) => ({
    ...provided,
    backgroundColor: !state.data.isAvailable ? "#ffe5e5" : provided?.backgroundColor,
    color: !state.data.isAvailable ? "#a00" : provided?.color,
  }),
};
const RSelect = ({ ...props }) => {
  let value = "";
  let label = "";
  let placeholder = "";
  value = props?.value1?.toString()?.toLocaleLowerCase();
  placeholder = props?.placeholder;
  let item =
    props?.dataSource?.length > 0 ? props?.dataSource[props?.dataSource?.findIndex((s) => s?.value == value)] : null;
  if (item == null || item == undefined) {
    item =
      props?.dataSource?.length > 0
        ? props?.dataSource[props?.dataSource?.findIndex((s) => s?.label?.toLocaleLowerCase() == value)]
        : null;
  }
  return (
    <div className="form-control-select">
      {props?.isCustomOption == true ? (
        <>
          <Select
            className={`react-select-container ${props.className ? props.className : ""}`}
            classNamePrefix="react-select"
            menuPlacement={props?.menuPlacement || "bottom"}
            options={props.dataSource}
            isDisabled={props.disabled}
            formatOptionLabel={customFormatOption}
            styles={customStyles}
            value={item}
            {...props}
            placeholder={placeholder}
            rules={{ required: true }}
            onChange={(e) => {
              if (props?.onChangeHandler) {
                props.onChangeHandler(e);
              }
            }}
          />
        </>
      ) : (
        <>
          <Select
            className={`react-select-container ${props.className ? props.className : ""}`}
            classNamePrefix="react-select"
            menuPlacement={props?.menuPlacement || "bottom"}
            options={props.dataSource}
            isDisabled={props.disabled}
            value={item}
            {...props}
            placeholder={placeholder}
            rules={{ required: true }}
            onChange={(e) => {
              if (props?.onChangeHandler) {
                props.onChangeHandler(e);
              }
            }}
          />
        </>
      )}
    </div>
  );
};

export default RSelect;
