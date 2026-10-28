export const config = {
  PUBLIC_URL: process.env.REACT_APP_PUBLIC_URL || "",
  API_URL: process.env.REACT_APP_API_URL,
  CHAT_APP_API_URL: process.env.REACT_APP_CHAT_APP_API_URL,
  APP_NAME: process.env.REACT_APP_APP_NAME || "My LMS App",
  JWT_SECRET: process.env.REACT_APP_JWT_SECRET || "",
  drawerWidth: "260px",
  idleTimeOutMinutes: 5,
  ageMinRequired: 18,
};

export default config;




// export const config = {
//   // API_URL: import.meta.env.VITE_API_URL,
//   PUBLIC_URL: "",
//   //APP_NAME: import.meta.env.VITE_APP_NAME,
//   API_URL: "https://localhost:44352/api",
//   CHAT_APP_API_URL: "https://localhost:44352/api",
//   //API_URL: "https://api.lms.thechennaituition.com/api",
//   //CHAT_APP_API_URL: "https://api.lms.thechennaituition.com/api",
//   APP_NAME: "",
//   JWT_SECRET: "123456",
//   drawerWidth: "260px",
//   idleTimeOutMinutes: 5,
//   ageMinRequired: 18,
// };
// export default config;
