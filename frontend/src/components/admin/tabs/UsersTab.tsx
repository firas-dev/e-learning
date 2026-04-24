import { Search, X, AlertTriangle, Loader2, Users, Edit2, UserCheck, UserX, Trash2 } from "lucide-react";
import { useState } from "react";
import { useAdminUsers, AdminUser } from "../../../hooks/useAdmin";
import DeleteConfirmModal from "../modals/DeleteConfirmModal";
import EditUserModal from "../modals/EditUserModal";
import Pagination from "../common/Pagination";

export default function UsersTab() {
    const {
      users, total, totalPages, loading, actionLoading,
      search, setSearch, roleFilter, setRoleFilter,
      statusFilter, setStatusFilter, sortBy, setSortBy,
      page, setPage, toggleBan, updateUser, deleteUser,
    } = useAdminUsers();
  
    const [editUser, setEditUser] = useState<AdminUser | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');
  
    const roleBadge = (role: string) => {
      const map: Record<string, string> = {
        student: 'bg-blue-100 text-blue-700',
        teacher: 'bg-purple-100 text-purple-700',
        admin: 'bg-indigo-100 text-indigo-700',
      };
      return `text-xs px-2 py-0.5 rounded-full font-medium capitalize ${map[role] || 'bg-gray-100 text-gray-600'}`;
    };
  
    const handleDelete = async () => {
      if (!deleteTarget) return;
      setDeleting(true);
      setDeleteError('');
      try {
        await deleteUser(deleteTarget._id);
        setDeleteTarget(null);
      } catch (e: any) {
        setDeleteError(e?.response?.data?.message || 'Failed to delete user.');
      } finally {
        setDeleting(false);
      }
    };
  
    return (
      <div>
        {editUser && (
          <EditUserModal
            user={editUser}
            onClose={() => setEditUser(null)}
            onSave={(data) => updateUser(editUser._id, data)}
          />
        )}
        {deleteTarget && (
          <DeleteConfirmModal
            title="Delete User?"
            description={`This will permanently delete "${deleteTarget.fullName}" and all their data. This cannot be undone.`}
            onConfirm={handleDelete}
            onClose={() => { setDeleteTarget(null); setDeleteError(''); }}
            loading={deleting}
          />
        )}
  
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
          >
            <option value="all">All roles</option>
            <option value="student">Students</option>
            <option value="teacher">Teachers</option>
            <option value="admin">Admins</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
          >
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="banned">Banned</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name_asc">Name A→Z</option>
            <option value="name_desc">Name Z→A</option>
          </select>
        </div>
  
        <p className="text-sm text-gray-500 mb-3">{total} user{total !== 1 ? 's' : ''} found</p>
  
        {deleteError && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> {deleteError}
          </div>
        )}
  
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No users match your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border border-gray-200 rounded-lg">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Stats</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Joined</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => {
                  const isLoading = actionLoading === user._id;
                  return (
                    <tr key={user._id} className={`hover:bg-gray-50 transition-colors ${user.isBanned ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                            {user.fullName?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{user.fullName}</p>
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={roleBadge(user.role)}>{user.role}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {user.role === 'student' && user.stats && (
                          <span>{user.stats.enrollments} enrolled · {user.stats.completed} done</span>
                        )}
                        {user.role === 'teacher' && user.stats && (
                          <span>{user.stats.courses} courses · {user.stats.students} students</span>
                        )}
                        {user.role === 'admin' && <span className="text-indigo-500">Platform admin</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {user.isBanned ? (
                          <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">Banned</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium flex items-center gap-1 w-fit">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />Active
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditUser(user)}
                            title="Edit user"
                            className="p-1.5 hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => toggleBan(user._id)}
                            disabled={isLoading}
                            title={user.isBanned ? 'Unban user' : 'Ban user'}
                            className={`p-1.5 rounded-lg transition-colors ${
                              user.isBanned
                                ? 'hover:bg-green-50 text-gray-400 hover:text-green-600'
                                : 'hover:bg-orange-50 text-gray-400 hover:text-orange-600'
                            }`}
                          >
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : user.isBanned ? (
                              <UserCheck className="w-4 h-4" />
                            ) : (
                              <UserX className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => setDeleteTarget(user)}
                            title="Delete user"
                            className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
  
        <Pagination page={page} totalPages={totalPages} onPage={setPage} />
      </div>
    );
  }