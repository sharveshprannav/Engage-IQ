import React from 'react';
import { Chart as ChartJS, LinearScale, PointElement, Tooltip, Legend } from 'chart.js';
import { Scatter } from 'react-chartjs-2';

ChartJS.register(LinearScale, PointElement, Tooltip, Legend);

export function ClusterScatterChart() {
  const chartData = {
    datasets: [
      {
        label: 'Auth Issues',
        data: [{ x: 45, y: -0.65 }],
        backgroundColor: '#ef4444',
        pointRadius: 18,
      },
      {
        label: 'Billing Questions',
        data: [{ x: 30, y: -0.2 }],
        backgroundColor: '#f59e0b',
        pointRadius: 14,
      },
      {
        label: 'Feature Requests',
        data: [{ x: 22, y: 0.4 }],
        backgroundColor: '#6366f1',
        pointRadius: 12,
      },
      {
        label: 'Praise & Kudos',
        data: [{ x: 50, y: 0.85 }],
        backgroundColor: '#10b981',
        pointRadius: 20,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { title: { display: true, text: 'Feedback Count in Cluster' } },
      y: { title: { display: true, text: 'Avg Sentiment (-1.0 to 1.0)' }, min: -1, max: 1 },
    },
  };

  return (
    <div className="h-64 w-full">
      <Scatter data={chartData} options={options} />
    </div>
  );
}
