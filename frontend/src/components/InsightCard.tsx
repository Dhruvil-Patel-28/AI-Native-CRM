/**
 * InsightCard — displays a single AI-generated insight.
 *
 * Features a color-coded type badge, insight text, stat pill,
 * potential revenue pill, and a "Run Campaign →" action button.
 * Uses framer-motion for hover effects and staggered entry.
 */

import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  IconAlertTriangle,
  IconHeartHandshake,
  IconDiamond,
  IconChartBar,
  IconSunHigh,
  IconArrowRight,
} from '@tabler/icons-react'
import type { Insight } from '../services/api'

interface InsightCardProps {
  insight: Insight
  index: number
}

const TYPE_CONFIG: Record<string, { color: string; bg: string; label: string; icon: React.ComponentType<any> }> = {
  churn_risk: { color: 'text-red-400', bg: 'bg-red-400/10', label: 'Churn Risk', icon: IconAlertTriangle },
  win_back: { color: 'text-yellow-400', bg: 'bg-yellow-400/10', label: 'Win Back', icon: IconHeartHandshake },
  high_value: { color: 'text-emerald-400', bg: 'bg-emerald-400/10', label: 'High Value', icon: IconDiamond },
  channel_performance: { color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Channel', icon: IconChartBar },
  seasonal: { color: 'text-purple-400', bg: 'bg-purple-400/10', label: 'Seasonal', icon: IconSunHigh },
}

export default function InsightCard({ insight, index }: InsightCardProps) {
  const navigate = useNavigate()
  const config = TYPE_CONFIG[insight.insight_type] ?? {
    color: 'text-text-secondary',
    bg: 'bg-surface-hover',
    label: insight.insight_type,
    icon: IconChartBar,
  }
  const TypeIcon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      whileHover={{ y: -2 }}
      className="glass-card p-5 group cursor-default"
      id={`insight-card-${insight.id}`}
    >
      {/* Type Badge + Priority */}
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${config.bg} ${config.color} flex items-center gap-1.5`}>
          <TypeIcon size={12} />
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
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-white/[0.06] text-text-primary border border-white/[0.08]">
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
        className="w-full py-2.5 px-4 rounded-xl btn-accent text-sm font-medium flex items-center justify-center gap-2"
        id={`run-campaign-btn-${insight.id}`}
      >
        Run Campaign
        <IconArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
      </button>
    </motion.div>
  )
}
