import { useState, useEffect } from "react";
import {
  BarChart3,
  Users,
  BookOpen,
  Megaphone,
  Menu,
  X,
  LogOut,
  Settings,
  User,
  MessageCircle,
  Flag,
} from "lucide-react";
import axios from "axios";

import { useAuth } from "../../../contexts/AuthContext";
import { useNavigation } from "../../../contexts/NavigationContext";
import { useMessages } from "../../../hooks/useMessages";

import NotificationBell from "../../NotificationBell";
import InvitationBell from "../../InvitationBell";

const API = "http://localhost:5000/api";

const TABS = [
  { id: "analytics",     label: "Analytics",     icon: BarChart3 },
  { id: "users",         label: "Users",          icon: Users },
  { id: "courses",       label: "Courses",        icon: BookOpen },
  { id: "announcements", label: "Announcements",  icon: Megaphone },
  { id: "reports",       label: "Reports",        icon: Flag },
];

export default function AdminSidebar({ activeTab, setActiveTab }: any) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingReports, setPendingReports] = useState(0);

  const { user, signOut } = useAuth();
  const { setCurrentPage } = useNavigation();
  const { unreadCount } = useMessages();

  // Poll pending report count every 30 s
  useEffect(() => {
    const fetchPending = async () => {
      try {
        const res = await axios.get(`${API}/reports/pending-count`);
        setPendingReports(res.data.count);
      } catch { /* ignore */ }
    };
    fetchPending();
    const interval = setInterval(fetchPending, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSignOut = async () => {
    try { await signOut(); } catch (e) { console.error(e); }
  };

  return (
    <>
      {/* Mobile Top */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b">
        <button onClick={() => setMobileOpen(true)}>
          <Menu className="w-6 h-6" />
        </button>
        <span className="font-bold">Admin</span>
      </div>

      {/* Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile Sidebar */}
      <div className={`fixed md:hidden top-0 left-0 z-50 h-full w-64 bg-white border-r transition-transform ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <SidebarContent
          collapsed={false}
          activeTab={activeTab}
          setActiveTab={(id: string) => { setActiveTab(id); setMobileOpen(false); }}
          user={user}
          setCurrentPage={setCurrentPage}
          unreadCount={unreadCount}
          pendingReports={pendingReports}
          handleSignOut={handleSignOut}
        />
      </div>

      {/* Desktop Sidebar */}
      <div className={`hidden md:flex flex-col bg-white border-r transition-all duration-300 ${collapsed ? "w-20" : "w-64"}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b">
          <div
            onClick={() => setCurrentPage("profile")}
            className="flex items-center gap-3 hover:bg-gray-100 p-2 rounded-lg cursor-pointer transition-colors overflow-hidden"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold flex-shrink-0">
              {user?.fullName?.charAt(0) || "U"}
            </div>
            {!collapsed && (
              <div className="truncate">
                <p className="text-sm font-semibold text-gray-900 truncate">{user?.fullName}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
            )}
          </div>
          <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 hover:bg-gray-100 rounded-lg flex-shrink-0">
            {collapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
          </button>
        </div>

        <SidebarContent
          collapsed={collapsed}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          user={user}
          setCurrentPage={setCurrentPage}
          unreadCount={unreadCount}
          pendingReports={pendingReports}
          handleSignOut={handleSignOut}
        />
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────── */

function SidebarContent({
  collapsed,
  activeTab,
  setActiveTab,
  user,
  setCurrentPage,
  unreadCount,
  pendingReports,
  handleSignOut,
}: any) {
  return (
    <div className="flex flex-col h-full">

      {/* TABS */}
      <div className="flex-1 p-2 space-y-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            title={collapsed ? label : ""}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
              activeTab === id
                ? "bg-indigo-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && label}

            {/* Badge for pending reports */}
            {id === "reports" && pendingReports > 0 && (
              <span className={`ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full ${
                activeTab === "reports"
                  ? "bg-white text-indigo-600"
                  : "bg-red-500 text-white"
              }`}>
                {pendingReports}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ACTIONS */}
      <div className="p-2 border-t space-y-1">
        {user?.role === "student" && !collapsed && (
          <div className="flex gap-2 px-2 py-2">
            <NotificationBell />
            <InvitationBell />
          </div>
        )}

        <button
          onClick={() => setCurrentPage("messages")}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100"
        >
          <MessageCircle className="w-5 h-5" />
          {!collapsed && "Messages"}
          {unreadCount > 0 && !collapsed && (
            <span className="ml-auto bg-red-500 text-white text-xs px-2 rounded-full">{unreadCount}</span>
          )}
        </button>

        <button onClick={() => setCurrentPage("profile")} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100">
          <User className="w-5 h-5" />
          {!collapsed && "Profile"}
        </button>

        <button onClick={() => setCurrentPage("privacy")} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100">
          <Settings className="w-5 h-5" />
          {!collapsed && "Settings"}
        </button>
      </div>

      {/* LOGOUT */}
      <div className="p-3 border-t">
        <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50">
          <LogOut className="w-5 h-5" />
          {!collapsed && "Logout"}
        </button>
      </div>
    </div>
  );
}