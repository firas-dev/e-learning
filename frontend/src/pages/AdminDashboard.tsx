import { useState } from 'react';
import Navbar from '../components/Navbar';
import {
  Users,
  BookOpen,
  TrendingUp,
  AlertTriangle,
  Settings,
  BarChart3,
  Activity,
  Database,
} from 'lucide-react';

export default function AdminDashboard() {
  const [stats] = useState({
    totalUsers: 2450,
    totalCourses: 125,
    totalEnrollments: 8934,
    activeNow: 342,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Admin Dashboard
          </h1>
          <p className="text-gray-600">System management and global analytics</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
            <p className="text-sm text-gray-600">Total Users</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalCourses}</p>
            <p className="text-sm text-gray-600">Total Courses</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalEnrollments}</p>
            <p className="text-sm text-gray-600">Total Enrollments</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.activeNow}</p>
            <p className="text-sm text-gray-600">Active Now</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-6">User Management</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Role</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Joined</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { id: '1', name: 'Alice Johnson', role: 'Student', status: 'Active', joined: '2 months ago' },
                      { id: '2', name: 'Prof. Smith', role: 'Teacher', status: 'Active', joined: '3 months ago' },
                      { id: '3', name: 'Bob Williams', role: 'Student', status: 'Inactive', joined: '1 month ago' },
                      { id: '4', name: 'Carol Davis', role: 'Teacher', status: 'Active', joined: '4 months ago' },
                      { id: '5', name: 'David Brown', role: 'Student', status: 'Active', joined: '2 weeks ago' },
                    ].map((user) => (
                      <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">{user.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            user.status === 'Active'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {user.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{user.joined}</td>
                        <td className="px-4 py-3 text-sm">
                          <button className="text-blue-600 hover:text-blue-700 font-medium">View</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-6">System Performance</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">API Response Time</p>
                  <p className="text-2xl font-bold text-gray-900">124ms</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Database Load</p>
                  <p className="text-2xl font-bold text-gray-900">34%</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Cache Hit Rate</p>
                  <p className="text-2xl font-bold text-gray-900">87%</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Uptime</p>
                  <p className="text-2xl font-bold text-gray-900">99.99%</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">System Health</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-green-900">Database</p>
                    <p className="text-xs text-green-700">Operational</p>
                  </div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>

                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-green-900">AI Engine</p>
                    <p className="text-xs text-green-700">Running</p>
                  </div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>

                <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-yellow-900">Storage</p>
                    <p className="text-xs text-yellow-700">78% used</p>
                  </div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">System Settings</h2>
              <div className="space-y-2">
                <button className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-left font-medium flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Configure AI Models
                </button>
                <button className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-left font-medium flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Database Settings
                </button>
                <button className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-left font-medium flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Analytics Settings
                </button>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-xl shadow-sm p-6">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-red-900">System Alerts</h3>
                  <p className="text-sm text-red-700">3 active alerts</p>
                </div>
              </div>
              <div className="space-y-2 text-xs text-red-700">
                <p>• High memory usage detected</p>
                <p>• 2 courses pending review</p>
                <p>• Backup scheduled for tonight</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
