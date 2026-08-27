import React from 'react';
import { Chart as ChartJS, LinearScale, PointElement, Tooltip, Legend } from 'chart.js';
import { Bubble } from 'react-chartjs-2';

ChartJS.register(LinearScale, PointElement, Tooltip, Legend);

export function TopicCloudChart({ topics = [] }) {
  const chartData = {
    datasets: [
      {
        label: 'Topics',
        data: (topics.length ? topics : [
          { topic: 'Auth', count: 28 },
          { topic: 'Billing', count: 19 },
          { topic: 'Export', count: 15 },
          { topic: 'API', count: 12 }
        ]).map((t, idx) => ({
          x: (idx + 1) * 20,
          y: t.count,
          r: Math.min(25, Math.max(8, t.count)),
          label: t.topic
        })),
        backgroundColor: 'rgba(99, 102, 241, 0.6)',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.raw.label}: ${ctx.raw.y} mentions`
        }
      }
    },
    scales: {
      x: { display: false },
      y: { grid: { color: 'rgba(156, 163, 175, 0.1)' } },
    },
  };

  return (
    <div className="h-64 w-full">
      <Bubble data={chartData} options={options} />
    </div>
  );
}
