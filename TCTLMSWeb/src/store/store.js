import { configureStore } from '@reduxjs/toolkit';
import filterReducer from "../features/tutorFilterSlice";
import tutorColumnReducer from "../features/tutorColumnSlice";
import calendarReducer from "../features/calendarSlice";
import loadingReducer from "../features/loadingSlice";

export const store = configureStore({
    reducer: {
        filter: filterReducer,
        tutorColumns: tutorColumnReducer,
        calendar: calendarReducer,
        loading: loadingReducer,
    },
});

// export default store;