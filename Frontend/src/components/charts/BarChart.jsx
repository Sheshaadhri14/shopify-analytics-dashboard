import { BarChart as RBarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

export default function BarChart({ data = [], dataKeyX = "name", dataKeyY = "value" }) {
  return (
    <div style={{ width: "100%", height: 320 }}>
      <ResponsiveContainer>
        <RBarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={dataKeyX} />
          <YAxis />
          <Tooltip />
          <Bar dataKey={dataKeyY} fill="#10B981" />
        </RBarChart>
      </ResponsiveContainer>
    </div>
  );
}
