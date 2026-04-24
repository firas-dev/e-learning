export default function MiniBarChart({ data, color }) {
    const max = Math.max(...data.map((d) => d.count), 1);
  
    return (
      <div className="flex items-end gap-1 h-16">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={`w-full rounded-t-sm ${color}`}
              style={{ height: `${Math.max(4, (d.count / max) * 52)}px` }}
            />
            <span className="text-[10px] text-gray-400">{d.month}</span>
          </div>
        ))}
      </div>
    );
  }