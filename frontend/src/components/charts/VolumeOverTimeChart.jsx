import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export function VolumeOverTimeChart({ data = [] }) {
  const chartData = {
    labels: data.map((d) => d.date),
    datasets: [
      {
        label: 'Bug',
        data: data.map((d) => d.bug),
        backgroundColor: '#ef4444',
      },
      {
        label: 'Feature Request',
        data: data.map((d) => d.feature_request),
        backgroundColor: '#6366f1',
      },
      {
        label: 'Complaint',
        data: data.map((d) => d.complaint),
        backgroundColor: '#f59e0b',
      },
      {
        label: 'Praise',
        data: data.map((d) => d.praise),
        backgroundColor: '#10b981',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { stacked: true, grid: { display: false } },
      y: { stacked: true, grid: { color: 'rgba(156, 163, 175, 0.1)' } },
    },
    plugins: {
      legend: { position: 'bottom' },
    },
  };

  return (
    <div className="h-64 w-full">
      <Bar data={chartData} options={options} />
    </div>
  );
}
