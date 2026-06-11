/**
 * CampaignStats — compact campaign card for the dashboard sidebar.
 *
 * Shows campaign name, channel badge, delivery stats row,
 * status badge (pulsing if running), and an optional AI summary.
 */

import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { IconBrandWhatsapp, IconMail } from '@tabler/icons-react'
import type { Campaign } from '../services/api'

interface CampaignStatsProps {
  campaign: Campaign
  index: number
}

export default function CampaignStats({ campaign, index }: CampaignStatsProps) {
  const navigate = useNavigate()

  const isWhatsapp = campaign.channel === 'whatsapp'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      whileHover={{ y: -1 }}
      className="glass-card p-4 cursor-pointer group"
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
          <span
            className={`tag ${
              isWhatsapp
                ? 'bg-emerald-400/10 text-emerald-400'
                : 'bg-blue-400/10 text-blue-400'
            }`}
          >
            {isWhatsapp ? (
              <IconBrandWhatsapp size={10} />
            ) : (
              <IconMail size={10} />
            )}
            {isWhatsapp ? 'WhatsApp' : 'Email'}
          </span>
          <StatusBadge status={campaign.status} />
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex items-center gap-3 text-xs text-text-muted mb-2">
        <span>{campaign.total_sent} sent</span>
        <span className="text-white/10">·</span>
        <span>{campaign.total_opened} opened</span>
        <span className="text-white/10">·</span>
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
    </motion.div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'running') {
    return (
      <span className="tag bg-warning/10 text-warning">
        <span className="status-dot live" />
        Running
      </span>
    )
  }

  return (
    <span className="tag bg-white/[0.06] text-text-muted">
      Completed
    </span>
  )
}
