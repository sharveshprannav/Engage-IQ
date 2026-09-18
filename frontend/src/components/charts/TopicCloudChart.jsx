import React from 'react';
import { Chart as ChartJS, LinearScale, PointElement, Tooltip, Legend } from 'chart.js';
import { Bubble } from 'react-chartjs-2';
import { Sparkles } from 'lucide-react';

ChartJS.register(LinearScale, PointElement, Tooltip, Legend);

export function TopicCloudChart({ topics = [] }) {
  if (!topics || topics.length === 0) {
    return (
      <div className="h-64 w-full flex flex-col items-center justify-center border border-dashed border-gray-200 dark:border-gray-800 rounded-xl p-4 text-center">
        <Sparkles className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No Topics Extracted Yet</p>
        <p className="text-xs text-gray-400 mt-0.5">Upload datasets or run ML inferences to populate topics.</p>
      </div>
    );
  }

  const chartData = {
    datasets: [
      {
        label: 'Topics',
        data: topics.map((t, idx) => ({
          x: (idx + 1) * 20,
          y: t.count,
          r: Math.min(25, Math.max(8, t.count * 2)),
          label: t.topic,
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
          label: (ctx) => `${ctx.raw.label}: ${ctx.raw.y} mentions`,
        },
      },
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
