// Dashboard filters are calendar dates, not UTC instants. Converting local
// midnight with toISOString shifts the day in timezones such as India.
export const toDateOnly = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export const parseDateOnly = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return toDateOnly(date) === value ? date : null;
};

export const displayFilterDate = (value) => (value ? value.split("-").reverse().join("-") : "");
export const parseFilterDate = (value) => {
  if (!/^\d{2}-\d{2}-\d{4}$/.test(value || "")) return null;
  return parseDateOnly(value.split("-").reverse().join("-"));
};
