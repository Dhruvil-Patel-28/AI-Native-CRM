/**
 * Dashboard — main landing page for Glow Studio CRM.
 *
 * Layout:
 *   - Header with greeting and 4 stat pills
 *   - Two-column body:
 *     Left (60%): AI Insight cards
 *     Right (40%): Recent Campaigns
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import InsightCard from '../components/InsightCard'
import CampaignStats from '../components/CampaignStats'
import {
  getInsights,
  getCampaigns,
  getCustomerStats,
  nlPreviewCampaign,
  type Insight,
  type Campaign,
  type CustomerStats,
} from '../services/api'

export default function Dashboard() {
  const [stats, setStats] = useState<CustomerStats | null>(null)
  const [insights, setInsights] = useState<Insight[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [insightsLoading, setInsightsLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)

  const [nlInput, setNlInput] = useState('')
  const [nlLoading, setNlLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [])

  const handleNlSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nlInput.trim() || nlLoading) return
    setNlLoading(true)
    const result = await nlPreviewCampaign(nlInput)
    if (result) {
      navigate(`/campaign/nl/${result.session_id}`)
    }
    setNlLoading(false)
  }

  const loadData = async () => {
    setStatsLoading(true)
    setInsightsLoading(true)

    const [statsData, campaignsData] = await Promise.all([
      getCustomerStats(),
      getCampaigns(),
    ])

    setStats(statsData)
    setCampaigns(campaignsData ?? [])
    setStatsLoading(false)

    const insightsData = await getInsights()
    setInsights(insightsData ?? [])
    setInsightsLoading(false)
  }

  const refreshInsights = async () => {
    setInsightsLoading(true)
    const data = await getInsights()
    setInsights(data ?? [])
    setInsightsLoading(false)
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* ─── Header ────────────────────────────────────── */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary mb-1">
          Good morning, Glow Studio 👋
        </h1>
        <p className="text-text-secondary text-sm">
          Here's what's happening with your customers today
        </p>

        {/* Stat Pills */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          {statsLoading ? (
            <>
              <StatPillSkeleton />
              <StatPillSkeleton />
              <StatPillSkeleton />
              <StatPillSkeleton />
            </>
          ) : stats ? (
            <>
              <StatPill
                label="Total Customers"
                value={stats.total_customers.toLocaleString('en-IN')}
                icon={<UsersIcon />}
              />
              <StatPill
                label="Total Revenue"
                value={`₹${stats.total_revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                icon={<RevenueIcon />}
              />
              <StatPill
                label="Campaigns Sent"
                value={stats.campaigns_sent.toString()}
                icon={<CampaignSentIcon />}
              />
              <StatPill
                label="Avg Order Value"
                value={`₹${stats.avg_order_value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                icon={<OrderValueIcon />}
              />
            </>
          ) : null}
        </div>
      </header>

      {/* ─── Body: Two-column layout ───────────────────── */}
      <div className="grid grid-cols-5 gap-8">
        {/* Left: AI Insights (3/5 = 60%) */}
        <section className="col-span-3" id="insights-section">
          {/* V2: Natural Language Entry Point */}
          <div className="glass-card p-6 mb-8 animate-fade-in">
            <h2 className="text-md font-semibold text-text-primary mb-3">
              What do you want to do today?
            </h2>
            <form onSubmit={handleNlSubmit} className="relative flex items-center">
              <input
                type="text"
                value={nlInput}
                onChange={(e) => setNlInput(e.target.value)}
                disabled={nlLoading}
                placeholder="Describe what you want to do... e.g. 'Reach loyal customers before Diwali'"
                className="w-full px-5 py-4 pr-14 rounded-xl bg-surface-bg border border-surface-border text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-colors disabled:opacity-50"
                id="nl-goal-input"
              />
              <button
                type="submit"
                disabled={nlLoading || !nlInput.trim()}
                className="absolute right-3 p-2.5 rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-50 flex items-center justify-center"
                id="nl-submit-btn"
              >
                {nlLoading ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                )}
              </button>
            </form>
            {nlLoading && (
              <div className="flex items-center gap-2 mt-3 text-sm text-accent animate-pulse">
                <span className="w-2 h-2 rounded-full bg-accent" />
                <span>AI is understanding your goal...</span>
              </div>
            )}
            <p className="text-xs text-text-muted mt-3">
              Or choose from AI suggestions below ↓
            </p>
          </div>

          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                <span>✨</span> What needs your attention
              </h2>
              <p className="text-xs text-text-muted mt-1">
                AI-generated from your customer data
              </p>
            </div>
            <button
              onClick={refreshInsights}
              disabled={insightsLoading}
              className="p-2 rounded-lg border border-surface-border text-text-muted hover:text-text-primary hover:border-accent/30 transition-all duration-200 disabled:opacity-50"
              id="refresh-insights-btn"
            >
              <svg
                className={`w-4 h-4 ${insightsLoading ? 'animate-spin' : ''}`}
                fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
              </svg>
            </button>
          </div>

          {insightsLoading ? (
            <div className="grid grid-cols-2 gap-4">
              <InsightSkeleton />
              <InsightSkeleton />
              <InsightSkeleton />
              <InsightSkeleton />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {insights.map((insight, idx) => (
                <InsightCard key={insight.id} insight={insight} index={idx} />
              ))}
            </div>
          )}
        </section>

        {/* Right: Recent Campaigns (2/5 = 40%) */}
        <section className="col-span-2" id="campaigns-section">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-text-primary">
              Recent Campaigns
            </h2>
          </div>

          <div className="space-y-3">
            {campaigns.length > 0 ? (
              campaigns.slice(0, 4).map((campaign, idx) => (
                <CampaignStats key={campaign.id} campaign={campaign} index={idx} />
              ))
            ) : (
              <div className="glass-card p-8 text-center">
                <p className="text-text-muted text-sm">No campaigns yet</p>
                <p className="text-text-muted text-xs mt-1">
                  Run your first campaign from an insight card
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────

function StatPill({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="glass-card p-4 flex items-center gap-3 animate-fade-in">
      <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs text-text-muted">{label}</p>
        <p className="text-lg font-bold text-text-primary">{value}</p>
      </div>
    </div>
  )
}

function StatPillSkeleton() {
  return (
    <div className="glass-card p-4 flex items-center gap-3">
      <div className="skeleton w-10 h-10 rounded-lg" />
      <div className="flex-1">
        <div className="skeleton h-3 w-20 mb-2" />
        <div className="skeleton h-5 w-16" />
      </div>
    </div>
  )
}

function InsightSkeleton() {
  return (
    <div className="glass-card p-5">
      <div className="skeleton h-5 w-20 mb-3 rounded-full" />
      <div className="skeleton h-3 w-full mb-2" />
      <div className="skeleton h-3 w-4/5 mb-2" />
      <div className="skeleton h-3 w-3/5 mb-4" />
      <div className="flex gap-2 mb-4">
        <div className="skeleton h-6 w-24 rounded-full" />
        <div className="skeleton h-6 w-20 rounded-full" />
      </div>
      <div className="skeleton h-10 w-full rounded-lg" />
    </div>
  )
}

// ─── Icons ───────────────────────────────────────────────────

function UsersIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  )
}

function RevenueIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

function CampaignSentIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
    </svg>
  )
}

function OrderValueIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
    </svg>
  )
}
