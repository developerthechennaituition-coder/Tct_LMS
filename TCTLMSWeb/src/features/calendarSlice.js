import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  selectedDate: null,
  clickedEvent: null,
};

const calendarSlice = createSlice({
  name: "calendar",

  initialState,

  reducers: {
    setSelectedDate: (state, action) => {
      state.selectedDate = action.payload;
    },

    clearSelectedDate: (state) => {
      state.selectedDate = null;
    },

    setClickedEvent: (state, action) => {
      state.clickedEvent = action.payload;
    },

    clearClickedEvent: (state) => {
      state.clickedEvent = null;
    },
  },
});

export const { setSelectedDate, clearSelectedDate, setClickedEvent, clearClickedEvent } = calendarSlice.actions;

export default calendarSlice.reducer;
