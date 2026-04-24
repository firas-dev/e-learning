import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({
    page,
    totalPages,
    onPage,
  }: {
    page: number;
    totalPages: number;
    onPage: (p: number) => void;
  }) {
    if (totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-center gap-2 pt-4 border-t border-gray-100 mt-4">
        <button
          onClick={() => onPage(Math.max(1, page - 1))}
          disabled={page === 1}
          className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
          const p = totalPages <= 7 ? i + 1 : i < 3 ? i + 1 : totalPages - 6 + i;
          return (
            <button
              key={p}
              onClick={() => onPage(p)}
              className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                p === page ? 'bg-indigo-600 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {p}
            </button>
          );
        })}
        <button
          onClick={() => onPage(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>
      </div>
    );
  }