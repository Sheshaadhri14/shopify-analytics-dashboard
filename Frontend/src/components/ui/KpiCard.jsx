export default function KpiCard({ title, value }) {
  return (
    <div className="p-4 bg-white shadow rounded-lg">
      <h4 className="text-gray-600 text-sm">{title}</h4>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
