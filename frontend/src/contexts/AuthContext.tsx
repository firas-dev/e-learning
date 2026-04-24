import {
  createContext,
  useContext,
  useEffect,
  useRef,
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

  // Ref to the interceptor ID so we can eject it on unmount
  const interceptorRef = useRef<number | null>(null);

  // Internal sign-out logic (no circular dependency)
  const clearSession = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("currentPage");
    sessionStorage.removeItem("selectedCourse");
    sessionStorage.removeItem("selectedPDF");
    sessionStorage.removeItem("selectedTeacherId");
    delete axios.defaults.headers.common["Authorization"];
    setUser(null);
  };

  // 🔁 Load user from localStorage on refresh + register interceptor
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }

    setLoading(false);

    // ── Axios response interceptor ──────────────────────────────────
    // Catches 401 (Unauthorized / invalid token) responses globally
    // and automatically signs the user out + redirects to login.
    interceptorRef.current = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        const status = error?.response?.status;
        const message: string = error?.response?.data?.message ?? "";

        // 401 always means unauthenticated
        // 403 only when it's a token / suspension issue (not a permissions error)
        const isAuthError =
          status === 401 ||
          (status === 403 &&
            (message.toLowerCase().includes("token") ||
              message.toLowerCase().includes("suspended") ||
              message.toLowerCase().includes("banned")));

        if (isAuthError) {
          // Only act if there's currently a stored session to avoid
          // interfering with login-page requests that legitimately 401.
          const hasSession = !!localStorage.getItem("token");
          if (hasSession) {
            clearSession();
            // Let the router / App component react to user becoming null.
            // No hard redirect needed — App already renders <Login /> when !user.
          }
        }

        return Promise.reject(error);
      }
    );

    // Eject the interceptor when the provider unmounts
    return () => {
      if (interceptorRef.current !== null) {
        axios.interceptors.response.eject(interceptorRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🔐 SIGN IN
  const signIn = async (email: string, password: string) => {
    const res = await axios.post(`${API}/login`, { email, password });
    const { token, user } = res.data;

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

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
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    setUser(user);
  };

  // 🚪 SIGN OUT
  const signOut = () => {
    clearSession();
  };

  // 📧 FORGOT PASSWORD (send reset email)
  const forgotPassword = async (email: string) => {
    await axios.post(`${API}/forgot-password`, { email });
  };

  // 🔑 RESET PASSWORD (with token)
  const resetPassword = async (token: string, newPassword: string) => {
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