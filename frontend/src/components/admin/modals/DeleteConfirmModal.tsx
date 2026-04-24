import { Trash2, Loader2 } from "lucide-react";

export default function DeleteConfirmModal({
    title,
    description,
    onConfirm,
    onClose,
    loading,
  }: {
    title: string;
    description: string;
    onConfirm: () => void;
    onClose: () => void;
    loading: boolean;
  }) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-7 h-7 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
          <p className="text-gray-500 text-sm mb-6">{description}</p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    );
  }