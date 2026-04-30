import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import AdminSidebar from "../components/admin/layout/AdminSidebar";
import AdminHeader from "../components/admin/layout/AdminHeader";
import AnalyticsTab from "../components/admin/tabs/AnalyticsTab";
import UsersTab from "../components/admin/tabs/UsersTab";
import CoursesTab from "../components/admin/tabs/CoursesTab";
import AnnouncementsTab from "../components/admin/tabs/AnnouncementsTab";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("analytics");

  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden">

      {/* Sidebar */}
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">


        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-3">

          <AdminHeader user={user} />

          {activeTab === "analytics" && <AnalyticsTab />}
          {activeTab === "users" && <UsersTab />}
          {activeTab === "courses" && <CoursesTab />}
          {activeTab === "announcements" && <AnnouncementsTab />}

        </div>
      </div>
    </div>
  );
}