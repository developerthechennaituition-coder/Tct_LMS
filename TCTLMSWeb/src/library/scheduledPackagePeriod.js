import moment from "moment";

export function scheduledPackageEnd(start, months) {
  if (!Number.isInteger(Number(months)) || Number(months) < 1 || Number(months) > 10) {
    throw new Error("Select between one and ten months.");
  }
  return moment(start).startOf("month").add(Number(months), "months").subtract(1, "day").endOf("day");
}
