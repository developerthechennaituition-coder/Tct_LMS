import { createSlice } from "@reduxjs/toolkit";

const loadingSlice = createSlice({
  name: "loading",
  initialState: {
    isLoading: false,
    count: 0, // track nested calls so overlapping async actions don't prematurely hide spinner
  },
  reducers: {
    showLoading: (state) => {
      state.count += 1;
      state.isLoading = true;
    },
    hideLoading: (state) => {
      state.count = Math.max(0, state.count - 1);
      state.isLoading = state.count > 0;
    },
    resetLoading: (state) => {
      state.count = 0;
      state.isLoading = false;
    },
  },
});

export const { showLoading, hideLoading, resetLoading } = loadingSlice.actions;
export default loadingSlice.reducer;
