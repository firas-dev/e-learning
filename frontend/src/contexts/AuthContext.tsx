import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";
import axios from "axios";

// ✅ API URL
const API = "http://localhost:5000/api/auth";

// ✅ Types
interface User {
  _id: string;
  email: string;
  fullName: string;
  role: "student" | "teacher" | "admin";
}

interface AuthContextType {
  user: User | null;
  loading: boolean;

  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: "student" | "teacher" | "admin"
  ) => Promise<void>;

  signOut: () => void;

  // 🆕 Password reset
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
}

// ✅ Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ✅ Provider
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔁 Load user from localStorage on refresh
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (storedUser && token) {
      setUser(JSON.parse(storedUser));

      // attach token globally
      axios.defaults.headers.common[
        "Authorization"
      ] = `Bearer ${token}`;
    }

    setLoading(false);
  }, []);

  // 🔐 SIGN IN
  const signIn = async (email: string, password: string) => {
    const res = await axios.post(`${API}/login`, {
      email,
      password,
    });

    const { token, user } = res.data;

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));

    axios.defaults.headers.common[
      "Authorization"
    ] = `Bearer ${token}`;

    setUser(user);
  };

  // 📝 SIGN UP
  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: "student" | "teacher" | "admin"
  ) => {
    const res = await axios.post(`${API}/register`, {
      email,
      password,
      fullName,
      role,
    });

    const { token, user } = res.data;

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));

    axios.defaults.headers.common[
      "Authorization"
    ] = `Bearer ${token}`;

    setUser(user);
  };

  // 🚪 SIGN OUT
  const signOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    delete axios.defaults.headers.common["Authorization"];

    setUser(null);
  };

  // 📧 FORGOT PASSWORD (send reset email)
  const forgotPassword = async (email: string) => {
    await axios.post(`${API}/forgot-password`, { email });
  };

  // 🔑 RESET PASSWORD (with token)
  const resetPassword = async (
    token: string,
    newPassword: string
  ) => {
    await axios.post(`${API}/reset-password`, {
      token,
      password: newPassword,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
        forgotPassword,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ✅ Hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}