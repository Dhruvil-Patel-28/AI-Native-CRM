/**
 * Campaigns — full list of all campaigns with stats and filtering.
 *
 * Shows every campaign (not just the last 4 like the dashboard),
 * with channel badges, delivery stats, revenue, and status.
 * Clicking any campaign navigates to its results page.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  IconRocket,
  IconBrandWhatsapp,
  IconMail,
  IconChevronRight,
  IconCurrencyRupee,
} from '@tabler/icons-react'
import { getCampaigns, type Campaign } from '../services/api'

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const load = async () => {
      const data = await getCampaigns()
      setCampaigns(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const completedCount = campaigns.filter(c => c.status === 'completed').length
  const runningCount = campaigns.filter(c => c.status === 'running').length
  const totalRevenue = campaigns.reduce((sum, c) => sum + c.revenue_attributed, 0)

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary mb-1 flex items-center gap-2">
          <IconRocket size={22} />
          Campaigns
        </h1>
        <p className="text-text-secondary text-sm">
          All your marketing campaigns in one place
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4"
        >
          <p className="text-xs text-text-muted mb-1">Total Campaigns</p>
          <p className="text-2xl font-bold text-text-primary">{campaigns.length}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-card p-4"
        >
          <p className="text-xs text-text-muted mb-1">
            {runningCount > 0 ? 'Running' : 'Completed'}
          </p>
          <p className="text-2xl font-bold text-text-primary">
            {runningCount > 0 ? runningCount : completedCount}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-4"
        >
          <p className="text-xs text-text-muted mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-emerald-400">
            ₹{totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </motion.div>
      </div>

      {/* Campaign Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card p-5">
              <div className="flex items-center gap-4">
                <div className="skeleton h-5 w-48" />
                <div className="skeleton h-5 w-20 rounded-full" />
                <div className="flex-1" />
                <div className="skeleton h-5 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : campaigns.length > 0 ? (
        <div className="space-y-3">
          {campaigns.map((campaign, idx) => {
            const isWhatsapp = campaign.channel === 'whatsapp'

            const openRate = campaign.total_delivered > 0
              ? ((campaign.total_opened / campaign.total_delivered) * 100).toFixed(1)
              : '0'

            return (
              <motion.div
                key={campaign.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.35 }}
                whileHover={{ y: -1 }}
                className="glass-card p-5 cursor-pointer group"
                onClick={() => navigate(`/results/${campaign.id}`)}
                id={`campaign-row-${campaign.id}`}
              >
                <div className="flex items-center gap-4">
                  {/* Name + Channel */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-text-primary truncate mb-1">
                      {campaign.name}
                    </h3>
                    <p className="text-xs text-text-muted">
                      {new Date(campaign.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </p>
                  </div>

                  {/* Channel Badge */}
                  <span className={`tag ${
                    isWhatsapp
                      ? 'bg-emerald-400/10 text-emerald-400'
                      : 'bg-blue-400/10 text-blue-400'
                  }`}>
                    {isWhatsapp ? (
                      <IconBrandWhatsapp size={10} />
                    ) : (
                      <IconMail size={10} />
                    )}
                    {isWhatsapp ? 'WhatsApp' : 'Email'}
                  </span>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-text-muted">
                    <div className="text-center">
                      <p className="font-semibold text-text-primary">{campaign.total_sent}</p>
                      <p>sent</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-text-primary">{openRate}%</p>
                      <p>opened</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-text-primary">{campaign.total_clicked}</p>
                      <p>clicked</p>
                    </div>
                  </div>

                  {/* Revenue */}
                  <div className="text-right min-w-[80px] flex items-center gap-1">
                    <IconCurrencyRupee size={14} className="text-emerald-400" />
                    <p className="text-sm font-semibold text-emerald-400">
                      {campaign.revenue_attributed.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </p>
                  </div>

                  {/* Status */}
                  {campaign.status === 'running' ? (
                    <span className="tag bg-warning/10 text-warning">
                      <span className="status-dot live" />
                      Running
                    </span>
                  ) : (
                    <span className="tag bg-white/[0.06] text-text-muted">
                      Completed
                    </span>
                  )}

                  {/* Arrow */}
                  <IconChevronRight size={16} className="text-text-muted group-hover:text-text-primary transition-colors" />
                </div>
              </motion.div>
            )
          })}
        </div>
      ) : (
        <div className="glass-card p-12 text-center">
          <IconRocket size={40} className="text-text-muted mx-auto mb-3" />
          <p className="text-text-primary font-medium mb-1">No campaigns yet</p>
          <p className="text-text-muted text-sm">
            Go to the Dashboard and run your first campaign from an AI insight
          </p>
        </div>
      )}
    </div>
  )
}
