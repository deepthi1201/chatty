import { createContext, useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

// ✅ Set backend URL (with fallback)
const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
axios.defaults.baseURL = backendUrl;
axios.defaults.withCredentials = true; // optional for cookies or auth headers

// ✅ Create Auth Context
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [authUser, setAuthUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [socket, setSocket] = useState(null);

  // ✅ Check if user is authenticated
  const checkAuth = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/auth/check`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        setAuthUser(data.userData);
        connectSocket(data.userData);
      } else {
        setAuthUser(null);
      }
    } catch (error) {
      console.error("❌ Auth check error:", error.message);
      setAuthUser(null);
    }
  };

  // ✅ Login or Signup user
  const login = async (state, credentials) => {
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/auth/${state}`,
        credentials
      );

      if (data.success) {
        setAuthUser(data.userData);
        connectSocket(data.userData);

        axios.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
        localStorage.setItem("token", data.token);
        setToken(data.token);

        toast.success(data.message || "Logged in successfully!");
      } else {
        toast.error(data.message || "Login failed!");
      }
    } catch (error) {
      console.error("❌ Login error:", error.message);
      toast.error(error.response?.data?.message || "Something went wrong!");
    }
  };

  // ✅ Logout user
  const logout = async () => {
    try {
      localStorage.removeItem("token");
      setToken(null);
      setAuthUser(null);
      setOnlineUsers([]);
      axios.defaults.headers.common["Authorization"] = null;
      if (socket) socket.disconnect();

      toast.success("Logged out successfully!");
    } catch (error) {
      console.error("Logout error:", error.message);
    }
  };

  // ✅ Update profile
  const updateProfile = async (formData) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return toast.error("Not authenticated!");

      const { data } = await axios.put(
        `${backendUrl}/api/auth/update-profile`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (data.success) {
        setAuthUser(data.user);
        toast.success("Profile updated successfully 🎉");
      } else {
        toast.error(data.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("❌ Profile update error:", error.message);
      toast.error("Something went wrong while updating!");
    }
  };

  // ✅ Connect Socket.io
  const connectSocket = (userData) => {
    if (!userData || socket?.connected) return;

    const newSocket = io(backendUrl, {
      query: { userId: userData._id },
      transports: ["websocket"],
    });

    newSocket.on("connect", () => {
      console.log("🟢 Socket connected:", newSocket.id);
    });

    newSocket.on("disconnect", () => {
      console.log("🔴 Socket disconnected");
    });

    newSocket.on("getOnlineUsers", (userIds) => {
      setOnlineUsers(userIds);
    });

    setSocket(newSocket);
  };

  // ✅ Auto-check auth when token changes
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      checkAuth();
    }
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        authUser,
        onlineUsers,
        socket,
        login,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
