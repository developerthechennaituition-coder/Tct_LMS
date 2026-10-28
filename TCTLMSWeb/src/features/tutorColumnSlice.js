// store/columnsSlice.js
import { createSlice } from "@reduxjs/toolkit";
import { act } from "react";

const initialColumns = [
  { key: "tutorName", label: "Tutor Name", visible: true },
  { key: "boardName", label: "Board", visible: true },
  { key: "gradeName", label: "Grade", visible: true },
  { key: "subjectName", label: "Subject", visible: true },
  { key: "rating", label: "Rating", visible: true },
  { key: "engagementRatio", label: "Eng.%", visible: true },
  { key: "dropRatio", label: "Drop", visible: true },
  { key: "cancelationRatio", label: "Cncl", visible: true },
];

const tutorColumnSlice = createSlice({
  name: "tutorColumns",
  initialState: initialColumns,
  reducers: {
    toggleColumn: (state, action) => {
      const col = state.find((c) => c.key === action.payload);
      if (col) col.visible = !col.visible;
    },
    showColumns: (state, action) => {
      for (const item of action.payload) {
        const colIndex = state.findIndex((c) => c.key === item);
        if (colIndex !== -1) {
          state[colIndex].visible = true;
        }
      }
    },
    hideColumns: (state, action) => {
      for (const item of action.payload) {
        const colIndex = state.findIndex((c) => c.key === item);
        if (colIndex !== -1) {
          state[colIndex].visible = false;
        }
      }
    },
    showAll: (state) => {
      state.forEach((c) => (c.visible = true));
    },
    hideAll: (state) => {
      state.forEach((c) => (c.visible = false));
    },
  },
});

export const { toggleColumn, showColumns, hideColumns, showAll, hideAll } = tutorColumnSlice.actions;
export default tutorColumnSlice.reducer;
