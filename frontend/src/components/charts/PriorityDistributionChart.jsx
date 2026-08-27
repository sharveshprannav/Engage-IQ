import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

export function PriorityDistributionChart({ distribution }) {
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
