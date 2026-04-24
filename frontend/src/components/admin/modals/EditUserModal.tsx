import { X, AlertTriangle, Loader2 } from "lucide-react";
import { useState } from "react";
import { AdminUser } from "../../../hooks/useAdmin";

export default function EditUserModal({
    user,
    onClose,
    onSave,
  }: {
    user: AdminUser;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
  }) {
    const [fullName, setFullName] = useState(user.fullName);
    const [email, setEmail] = useState(user.email);
    const [role, setRole] = useState(user.role);
    const [password, setPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
  
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setSaving(true);
      try {
        await onSave({ fullName, email, role, ...(password ? { password } : {}) });
        onClose();
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to update user.');
      } finally {
        setSaving(false);
      }
    };
  
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-gray-900">Edit User</h2>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
  
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password <span className="text-gray-400 font-normal">(leave blank to keep current)</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
  
            {error && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> {error}
              </p>
            )}
  
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }