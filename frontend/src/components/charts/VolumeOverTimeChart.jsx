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
import { BarChart3 } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export function VolumeOverTimeChart({ data = [] }) {
  const hasData =
    data &&
    data.length > 0 &&
    data.some(
      (d) =>
        (d.bug || 0) > 0 ||
        (d.feature_request || 0) > 0 ||
        (d.complaint || 0) > 0 ||
        (d.praise || 0) > 0 ||
        (d.inquiry || 0) > 0
    );

  if (!hasData) {
    return (
      <div className="h-64 w-full flex flex-col items-center justify-center border border-dashed border-gray-200 dark:border-gray-800 rounded-xl p-4 text-center">
        <BarChart3 className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No Category Volume Data</p>
        <p className="text-xs text-gray-400 mt-0.5">Ingest customer feedback to visualize category volume breakdown.</p>
      </div>
    );
  }

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
