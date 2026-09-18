import React from 'react';
import { Chart as ChartJS, LinearScale, PointElement, Tooltip, Legend } from 'chart.js';
import { Scatter } from 'react-chartjs-2';
import { Layers } from 'lucide-react';

ChartJS.register(LinearScale, PointElement, Tooltip, Legend);

const CLUSTER_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export function ClusterScatterChart({ clusters = [] }) {
  if (!clusters || clusters.length === 0) {
    return (
      <div className="h-64 w-full flex flex-col items-center justify-center border border-dashed border-gray-200 dark:border-gray-800 rounded-xl p-4 text-center">
        <Layers className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No Semantic Clusters Available</p>
        <p className="text-xs text-gray-400 mt-0.5">Ingest customer feedback to run clustering analysis.</p>
      </div>
    );
  }

  const chartData = {
    datasets: clusters.map((c, idx) => ({
      label: c.label || `Cluster #${idx + 1}`,
      data: [{ x: c.feedback_count || 1, y: c.avg_sentiment || 0.0 }],
      backgroundColor: CLUSTER_COLORS[idx % CLUSTER_COLORS.length],
      pointRadius: Math.min(25, Math.max(10, (c.feedback_count || 1) * 3)),
    })),
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
