/**
 * SegmentPreview — displays customer segment statistics.
 *
 * Shows a large customer count, descriptive subtitle, and a
 * stats grid with average order value, top city, and top product.
 */

import type { SegmentStats } from '../services/api'

interface SegmentPreviewProps {
  stats: SegmentStats
  customerCount: number
}

export default function SegmentPreview({ stats, customerCount }: SegmentPreviewProps) {
  return (
    <div className="animate-fade-in">
      {/* Giant Counter */}
      <div className="text-center mb-8">
        <p className="text-7xl font-extrabold text-text-primary mb-2 tabular-nums">
          {customerCount.toLocaleString('en-IN')}
        </p>
        <p className="text-text-secondary text-lg">
          customers will receive this campaign
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        <StatTile
          label="Avg Order Value"
          value={`₹${stats.avg_order_value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
        />
        <StatTile
          label="Top City"
          value={stats.top_cities[0] ?? '—'}
        />
        <StatTile
          label="Top Product"
          value={stats.top_products[0] ?? '—'}
        />
      </div>

      {/* Potential Revenue */}
      <div className="mt-4 p-4 rounded-lg bg-emerald-400/5 border border-emerald-400/10 text-center">
        <p className="text-xs text-emerald-400/70 mb-1">Potential Revenue</p>
        <p className="text-2xl font-bold text-emerald-400">
          ₹{stats.total_potential_revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </p>
      </div>
    </div>
  )
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card p-4 text-center">
      <p className="text-xs text-text-muted mb-1.5">{label}</p>
      <p className="text-lg font-semibold text-text-primary">{value}</p>
    </div>
  )
}
