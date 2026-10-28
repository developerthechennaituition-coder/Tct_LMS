import { createSlice } from "@reduxjs/toolkit";

const filterSlice = createSlice({
  name: "filter",
  initialState: {
    showFilter: false,
  },
  reducers: {
    toggleFilter: (state) => {
      state.showFilter = !state.showFilter;
    }, 
  },
});

export const { toggleFilter } = filterSlice.actions;
export default filterSlice.reducer;
