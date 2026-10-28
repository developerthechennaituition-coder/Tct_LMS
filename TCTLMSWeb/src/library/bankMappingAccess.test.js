import { canMapTctBank } from "./bankMappingAccess";
test.each(["OperationsAdmin", "Operations", "Accounts", "PayrollAdmin", "SuperAdmin", "Coordinator", null])(
  "%s cannot map the student's TCT bank", role => expect(canMapTctBank(role)).toBe(false));
test("Accounts Admin retains bank mapping", () => expect(canMapTctBank("AccountsAdmin")).toBe(true));
