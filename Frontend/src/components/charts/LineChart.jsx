import { LineChart as RLineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

export default function LineChart({ data = [], dataKeyX = "date", dataKeyY = "revenue" }) {
  return (
    <div style={{ width: "100%", height: 320 }}>
      <ResponsiveContainer>
        <RLineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={dataKeyX} />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey={dataKeyY} stroke="#4F46E5" strokeWidth={2} dot={false} />
        </RLineChart>
      </ResponsiveContainer>
    </div>
  );
}
