import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { PieChart } from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend);

export function PriorityDistributionChart({ distribution }) {
  const total =
    (distribution?.very_high || 0) +
    (distribution?.high || 0) +
    (distribution?.low || 0) +
    (distribution?.normal || 0);

  if (total === 0) {
    return (
      <div className="h-64 w-full flex flex-col items-center justify-center border border-dashed border-gray-200 dark:border-gray-800 rounded-xl p-4 text-center">
        <PieChart className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No Priority Distribution Data</p>
        <p className="text-xs text-gray-400 mt-0.5">Ingest customer feedback to view triage severity breakdown.</p>
      </div>
    );
  }

  const chartData = {
    labels: ['Very High', 'High', 'Low', 'Normal'],
    datasets: [
      {
        data: [
          distribution?.very_high || 0,
          distribution?.high || 0,
          distribution?.low || 0,
          distribution?.normal || 0,
        ],
        backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'],
        borderWidth: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 12, padding: 15 } },
    },
    cutout: '70%',
  };

  return (
    <div className="h-64 w-full">
      <Doughnut data={chartData} options={options} />
    </div>
  );
}
