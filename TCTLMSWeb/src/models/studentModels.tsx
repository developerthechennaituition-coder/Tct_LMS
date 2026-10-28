export interface StudentAddress {
    id: string;
    studentId: string | null;
    userId: string | null;
    street: string | null;
    city: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    addressLine3: string | null;
    state: string | null;
    zipCode: string | null;
    country: string | null;
    isPrimary: boolean | null;
    createdBy: string;
    createdDate: string;
    modifiedBy: string | null;
    modifiedDate: string | null;
    isActive: boolean;
  }
  
  export default interface Student {
    fileName: string | null;
    fileData: string | null;
    id: string;
    userId: string;
    code: string;
    firstName: string;
    lastName: string;
    parentName: string;
    boardId: string;
    gradeId: string;
    genderId: string;
    emailAddress: string;
    mobileNumber: string;
    boardName: string;
    gradeName: string;
    studentAddress: StudentAddress;
    studentAddresses: StudentAddress[] | null;
    alternatePhone: string | null;
    gender: string;
    dob: string;
    ownership: string;
    previousBoardId: string;
    previousMarks: string | null;
    examSeries: string | null;
    customerConnectedDate: string;
    levelOfDemonstration: string | null;
    tutorPreference: string | null;
    genderPreference: string | null;
    parentsInterestedLevel: string | null;
    studentCurrentLocationAndSchool: string | null;
    createdBy: string;
    createdDate: string;
    modifiedBy: string | null;
    modifiedDate: string | null;
    isActive: boolean;
  }
  