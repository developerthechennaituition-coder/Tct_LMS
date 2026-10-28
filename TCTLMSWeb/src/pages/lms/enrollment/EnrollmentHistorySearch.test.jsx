import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import EnrollmentHistorySearch, { filterEnrollmentStudents } from "./EnrollmentHistorySearch";

const students = [
  { code: "STD0268", studentName: "RIJITH SHAKTHI", parentName: "Shakthi", emailAddress: "parent+one@example.com", mobileNumber: 9840012345 },
  { code: "STD0267", studentName: "NEERAJ NIRANJAN", parentName: "Niranjan", emailAddress: null, mobileNumber: null },
];
test.each(["std0268", " RIJITH ", "shakthi", "parent+one@", "98400", "rijith 0268"])("finds %s", term => {
  expect(filterEnrollmentStudents(students, term)).toEqual([students[0]]);
});
test("clear restores the authorized list without mutating it", () => {
  expect(filterEnrollmentStudents(students, "no-match")).toEqual([]);
  expect(filterEnrollmentStudents(students, "  ")).toEqual(students);
  expect(students).toHaveLength(2);
  expect(filterEnrollmentStudents(undefined, "anything")).toEqual([]);
});
test("search covers rows beyond the first displayed page", () => {
  const all = [...Array.from({ length: 10 }, (_, index) => ({ code: `OTHER${index}` })), students[0]];
  expect(filterEnrollmentStudents(all, "STD0268")).toEqual([students[0]]);
});
test("accessible search and clear controls notify the page", () => {
  const onChange = jest.fn();
  render(<EnrollmentHistorySearch value="Nicole" onChange={onChange} />);
  fireEvent.change(screen.getByRole("searchbox", { name: "Search students" }), { target: { value: "STD0268" } });
  expect(onChange).toHaveBeenLastCalledWith("STD0268");
  fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
  expect(onChange).toHaveBeenLastCalledWith("");
});
