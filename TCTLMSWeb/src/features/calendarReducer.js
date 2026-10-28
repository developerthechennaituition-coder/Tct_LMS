import { SET_SELECTED_DATE } from "./calendarActions";

const initialState = {
  selectedDate: null,
};

const calendarReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_SELECTED_DATE:
      return {
        ...state,
        selectedDate: action.payload,
      };

    default:
      return state;
  }
};

export default calendarReducer;