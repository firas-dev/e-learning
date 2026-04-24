export default function StatCard({ icon: Icon, label, value, sub, color }) {
    return (
      <div className="bg-white rounded-xl border p-5">
        <div className={`w-11 h-11 ${color} rounded-xl flex items-center justify-center mb-3`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm">{label}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    );
  }