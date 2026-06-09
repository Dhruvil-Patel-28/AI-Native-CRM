/**
 * CampaignStats — compact campaign card for the dashboard sidebar.
 *
 * Shows campaign name, channel badge, delivery stats row,
 * status badge (pulsing if running), and an optional AI summary.
 */

import { useNavigate } from 'react-router-dom'
import type { Campaign } from '../services/api'

interface CampaignStatsProps {
  campaign: Campaign
  index: number
}

export default function CampaignStats({ campaign, index }: CampaignStatsProps) {
  const navigate = useNavigate()

  const channelConfig = campaign.channel === 'whatsapp'
    ? { color: 'text-emerald-400', bg: 'bg-emerald-400/10', label: 'WhatsApp' }
    : { color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Email' }

  return (
    <div
      className="glass-card p-4 hover:border-accent/20 transition-all duration-300 cursor-pointer animate-slide-up"
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'backwards' }}
      onClick={() => navigate(`/results/${campaign.id}`)}
      id={`campaign-card-${campaign.id}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-text-primary truncate">
            {campaign.name}
          </h4>
        </div>
        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${channelConfig.bg} ${channelConfig.color}`}>
            {channelConfig.label}
          </span>
          <StatusBadge status={campaign.status} />
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex items-center gap-3 text-xs text-text-muted mb-2">
        <span>{campaign.total_sent} sent</span>
        <span className="text-surface-border">·</span>
        <span>{campaign.total_opened} opened</span>
        <span className="text-surface-border">·</span>
        <span>{campaign.total_clicked} clicked</span>
      </div>

      {/* Revenue */}
      {campaign.revenue_attributed > 0 && (
        <p className="text-xs text-emerald-400 font-medium">
          ₹{campaign.revenue_attributed.toLocaleString('en-IN', { maximumFractionDigits: 0 })} revenue
        </p>
      )}

      {/* AI Summary (truncated) */}
      {campaign.ai_summary && (
        <p className="text-xs text-text-muted mt-2 line-clamp-2 leading-relaxed">
          {campaign.ai_summary}
        </p>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'running') {
    return (
      <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-warning/10 text-warning">
        <span className="w-1.5 h-1.5 rounded-full bg-warning pulse-dot" />
        Running
      </span>
    )
  }

  return (
    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface-hover text-text-muted">
      Completed
    </span>
  )
}
