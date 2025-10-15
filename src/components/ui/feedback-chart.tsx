"use client";

import React from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

const data = [
  { name: "CO", value: 95 },
  { name: "ME", value: 88 },
  { name: "EE", value: 91 },
  { name: "CE", value: 82 },
];

export function FeedbackCompletionChart(): React.ReactElement {
  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 16, right: 16, left: 8, bottom: 8 }}>
          <XAxis dataKey="name" stroke="#374151" tick={{ fontSize: 12 }} />
          <YAxis stroke="#374151" tickFormatter={(v) => `${v}%`} />
          <Tooltip formatter={(value: number) => `${value}%`} />
          <Bar dataKey="value" fill="#005A9C" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default FeedbackCompletionChart;
