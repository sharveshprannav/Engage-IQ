import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export function SentimentTrendChart({ data = [] }) {
  const chartData = {
    labels: data.map((d) => d.date),
    datasets: [
      {
        label: 'Avg Sentiment Polarity',
        data: data.map((d) => d.avg_sentiment),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#4f46e5',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      y: {
        min: -1.0,
        max: 1.0,
        grid: { color: 'rgba(156, 163, 175, 0.1)' },
      },
      x: {
        grid: { display: false },
      },
    },
  };

  return (
    <div className="h-64 w-full">
      <Line data={chartData} options={options} />
    </div>
  );
}
