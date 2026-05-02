import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import axios from "axios";

const API = "http://localhost:5000/api/auth";

// ── Types ────────────────────────────────────────────────────────────────
interface User {
  _id: string;
  email: string;
  fullName: string;
  role: "student" | "teacher" | "admin";
  isBanned?: boolean;
  banExpiresAt?: string | null;
  warningCount?: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn:  (email: string, password: string) => Promise<void>;
  signUp:  (email: string, password: string, fullName: string, role: "student" | "teacher" | "admin") => Promise<void>;
  signOut: () => void;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword:  (token: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── Provider ─────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const interceptorRef = useRef<number | null>(null);

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

  // Load session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
    setLoading(false);

    // Axios interceptor — handle 401 / suspension 403
    interceptorRef.current = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        const status  = error?.response?.status;
        const message: string = error?.response?.data?.message ?? "";

        const isAuthError =
          status === 401 ||
          (status === 403 &&
            (message.toLowerCase().includes("token") ||
              message.toLowerCase().includes("suspended") ||
              message.toLowerCase().includes("banned")));

        // If banned 403 comes back, update local user state to show BannedScreen
        // without fully logging out (so they can see the countdown)
        if (status === 403 && error?.response?.data?.isBanned) {
          const stored = localStorage.getItem("user");
          if (stored) {
            const parsed = JSON.parse(stored);
            const updated = {
              ...parsed,
              isBanned: true,
              banExpiresAt: error.response.data.banExpiresAt ?? null,
            };
            localStorage.setItem("user", JSON.stringify(updated));
            setUser(updated);
          }
          return Promise.reject(error);
        }

        if (isAuthError) {
          const hasSession = !!localStorage.getItem("token");
          if (hasSession) clearSession();
        }

        return Promise.reject(error);
      }
    );

    return () => {
      if (interceptorRef.current !== null) {
        axios.interceptors.response.eject(interceptorRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── SIGN IN ──────────────────────────────────────────────────────────
  const signIn = async (email: string, password: string) => {
    const res = await axios.post(`${API}/login`, { email, password });
    const { token, user } = res.data;

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    setUser(user);
  };

  // ── SIGN UP ──────────────────────────────────────────────────────────
  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: "student" | "teacher" | "admin"
  ) => {
    const res = await axios.post(`${API}/register`, { email, password, fullName, role });
    const { token, user } = res.data;

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    setUser(user);
  };

  // ── SIGN OUT ─────────────────────────────────────────────────────────
  const signOut = () => { clearSession(); };

  // ── FORGOT PASSWORD ──────────────────────────────────────────────────
  const forgotPassword = async (email: string) => {
    await axios.post(`${API}/forgot-password`, { email });
  };

  // ── RESET PASSWORD ───────────────────────────────────────────────────
  const resetPassword = async (token: string, newPassword: string) => {
    await axios.post(`${API}/reset-password`, { token, password: newPassword });
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, forgotPassword, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}