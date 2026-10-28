import React, { useState, createContext } from "react";
import { StudetnData } from "./UserData";

export const StudentContext = createContext();

export const StudentContextProvider = (props) => {
  const [data, setData] = useState(StudetnData);

  return <StudentContext.Provider value={{ contextData: [data, setData] }}>{props.children}</StudentContext.Provider>;
};
