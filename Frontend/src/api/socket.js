import { io } from "socket.io-client";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/v1";
const serverUrl = apiUrl.replace(/(\/api)?\/v1\/?$/, ""); 

export const socket = io(serverUrl, {
  autoConnect: false,
  transports: ["websocket"],
  auth: {
    token: localStorage.getItem("token"),
    tenant_id: localStorage.getItem("current_tenant"),
  },
});
