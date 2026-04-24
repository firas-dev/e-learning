import { Shield } from "lucide-react";

export default function AdminHeader({ user }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500">
            Welcome, {user?.fullName}
          </p>
        </div>
      </div>
    </div>
  );
}