/**
 * Campaigns — full list of all campaigns with stats and filtering.
 *
 * Shows every campaign (not just the last 4 like the dashboard),
 * with channel badges, delivery stats, revenue, and status.
 * Clicking any campaign navigates to its results page.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
        <h1 className="text-2xl font-bold text-text-primary mb-1">
          Campaigns
        </h1>
        <p className="text-text-secondary text-sm">
          All your marketing campaigns in one place
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="glass-card p-4">
          <p className="text-xs text-text-muted mb-1">Total Campaigns</p>
          <p className="text-2xl font-bold text-text-primary">{campaigns.length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-text-muted mb-1">
            {runningCount > 0 ? 'Running' : 'Completed'}
          </p>
          <p className="text-2xl font-bold text-text-primary">
            {runningCount > 0 ? runningCount : completedCount}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-text-muted mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-emerald-400">
            ₹{totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>
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
            const channelConfig = campaign.channel === 'whatsapp'
              ? { color: 'text-emerald-400', bg: 'bg-emerald-400/10', label: 'WhatsApp' }
              : { color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Email' }

            const openRate = campaign.total_delivered > 0
              ? ((campaign.total_opened / campaign.total_delivered) * 100).toFixed(1)
              : '0'

            return (
              <div
                key={campaign.id}
                className="glass-card p-5 hover:border-accent/20 transition-all duration-300 cursor-pointer animate-slide-up"
                style={{ animationDelay: `${idx * 60}ms`, animationFillMode: 'backwards' }}
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
                  <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full ${channelConfig.bg} ${channelConfig.color}`}>
                    {channelConfig.label}
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
                  <div className="text-right min-w-[80px]">
                    <p className="text-sm font-semibold text-emerald-400">
                      ₹{campaign.revenue_attributed.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </p>
                  </div>

                  {/* Status */}
                  {campaign.status === 'running' ? (
                    <span className="flex items-center gap-1 text-[10px] font-medium px-2.5 py-1 rounded-full bg-warning/10 text-warning">
                      <span className="w-1.5 h-1.5 rounded-full bg-warning pulse-dot" />
                      Running
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-surface-hover text-text-muted">
                      Completed
                    </span>
                  )}

                  {/* Arrow */}
                  <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="glass-card p-12 text-center">
          <svg className="w-12 h-12 text-text-muted mx-auto mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84" />
          </svg>
          <p className="text-text-primary font-medium mb-1">No campaigns yet</p>
          <p className="text-text-muted text-sm">
            Go to the Dashboard and run your first campaign from an AI insight
          </p>
        </div>
      )}
    </div>
  )
}
