/**
 * InsightCard — displays a single AI-generated insight.
 *
 * Features a color-coded type badge, insight text, stat pill,
 * potential revenue pill, and a "Run Campaign →" action button.
 */

import { useNavigate } from 'react-router-dom'
import type { Insight } from '../services/api'

interface InsightCardProps {
  insight: Insight
  index: number
}

const TYPE_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  churn_risk: { color: 'text-red-400', bg: 'bg-red-400/10', label: 'Churn Risk' },
  win_back: { color: 'text-yellow-400', bg: 'bg-yellow-400/10', label: 'Win Back' },
  high_value: { color: 'text-emerald-400', bg: 'bg-emerald-400/10', label: 'High Value' },
  channel_performance: { color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Channel' },
  seasonal: { color: 'text-purple-400', bg: 'bg-purple-400/10', label: 'Seasonal' },
}

export default function InsightCard({ insight, index }: InsightCardProps) {
  const navigate = useNavigate()
  const config = TYPE_CONFIG[insight.insight_type] ?? {
    color: 'text-text-secondary',
    bg: 'bg-surface-hover',
    label: insight.insight_type,
  }

  return (
    <div
      className="glass-card p-5 hover:border-accent/30 transition-all duration-300 animate-slide-up group"
      style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'backwards' }}
      id={`insight-card-${insight.id}`}
    >
      {/* Type Badge + Priority */}
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${config.bg} ${config.color}`}>
          {config.label}
        </span>
        <span className="text-xs text-text-muted">
          P{insight.priority}
        </span>
      </div>

      {/* Insight Text */}
      <p className="text-sm text-text-primary leading-relaxed mb-4">
        {insight.insight_text}
      </p>

      {/* Stat Pills */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {insight.stat && (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-surface-hover text-text-primary border border-surface-border">
            {insight.stat}
          </span>
        )}
        {insight.potential_revenue && (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-400/10 text-emerald-400">
            {insight.potential_revenue}
          </span>
        )}
      </div>

      {/* Action Button */}
      <button
        onClick={() => navigate(`/campaign/${insight.id}`)}
        className="w-full py-2.5 px-4 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 group-hover:shadow-lg group-hover:shadow-accent/20"
        id={`run-campaign-btn-${insight.id}`}
      >
        Run Campaign
        <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
        </svg>
      </button>
    </div>
  )
}
