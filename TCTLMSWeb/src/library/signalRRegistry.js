// The chat SignalR connection lives inside ChatContextProvider (mounted only
// while /app-chat is open), but logout happens outside React entirely (see
// axios.jsx). Relying on the browser to eventually tear down the socket
// during navigation left the user showing "online" for a noticeable delay
// after logging out. This registry lets logout code stop the connection
// explicitly and synchronously before it redirects, so the server's
// OnDisconnectedAsync — and the "offline" broadcast — fires immediately.
let activeConnection = null;

export const registerChatConnection = (connection) => {
  activeConnection = connection;
};

export const unregisterChatConnection = (connection) => {
  if (activeConnection === connection) {
    activeConnection = null;
  }
};

export const stopChatConnection = async () => {
  const connection = activeConnection;
  activeConnection = null;
  if (!connection) return;
  try {
    await connection.stop();
  } catch (error) {
    // Logging out regardless of whether the graceful close succeeded.
  }
};
