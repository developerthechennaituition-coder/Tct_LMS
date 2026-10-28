import { useDispatch } from "react-redux";
import { showLoading, hideLoading } from "../features/loadingSlice";

/**
 * Returns a `withLoading` wrapper that shows the global spinner for the
 * duration of any async function.
 *
 * Usage:
 *   const { withLoading } = useLoading();
 *   await withLoading(() => fetchSomeData());
 */
const useLoading = () => {
  const dispatch = useDispatch();

  const withLoading = async (asyncFn) => {
    dispatch(showLoading());
    try {
      return await asyncFn();
    } finally {
      dispatch(hideLoading());
    }
  };

  return { withLoading };
};

export default useLoading;
