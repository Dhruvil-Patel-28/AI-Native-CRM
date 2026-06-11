/**
 * Dashboard — main landing page with dual mode views.
 *
 * GUIDED MODE (default):
 *   - NL input → AI insight cards → Recent campaigns
 *   - Warm rose gradient aesthetic
 *
 * AUTOPILOT MODE:
 *   - Hero goal input → AI handles everything
 *   - Deep indigo/purple aesthetic
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  IconUsers,
  IconCurrencyRupee,
  IconSend,
  IconShoppingCart,
  IconArrowRight,
  IconRefresh,
  IconBolt,
  IconPlayerPlay,
  IconSparkles,
  IconRocket,
  IconInfoCircle,
} from '@tabler/icons-react'
import InsightCard from '../components/InsightCard'
import CampaignStats from '../components/CampaignStats'
import { useMode } from '../components/Layout'
import {
  getInsights,
  getCampaigns,
  getCustomerStats,
  nlPreviewCampaign,
  runAutopilot,
  type Insight,
  type Campaign,
  type CustomerStats,
} from '../services/api'

export default function Dashboard() {
  const { mode } = useMode()
  const [stats, setStats] = useState<CustomerStats | null>(null)
  const [insights, setInsights] = useState<Insight[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [insightsLoading, setInsightsLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)

  // NL input state (Guided mode)
  const [nlInput, setNlInput] = useState('')
  const [nlLoading, setNlLoading] = useState(false)

  // Autopilot state
  const [autopilotGoal, setAutopilotGoal] = useState('')
  const [autopilotLoading, setAutopilotLoading] = useState(false)
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0)

  const navigate = useNavigate()

  const LOADING_MESSAGES = [
    "Agent is analyzing your customer data...",
    "Building the optimal segment...",
    "Crafting personalized messages...",
    "Preparing campaign plan...",
  ]

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    let interval: any
    if (autopilotLoading) {
      setLoadingMsgIdx(0)
      interval = setInterval(() => {
        setLoadingMsgIdx((prev) => (prev + 1) % LOADING_MESSAGES.length)
      }, 2000)
    }
    return () => clearInterval(interval)
  }, [autopilotLoading])

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

  const handleNlSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nlInput.trim() || nlLoading) return
    setNlLoading(true)
    const result = await nlPreviewCampaign(nlInput)
    if (result) {
      navigate(`/campaign/nl/${result.session_id}`)
    } else {
      alert("Failed to parse campaign preview. Please check your query and try again.")
    }
    setNlLoading(false)
  }

  const handleAutopilotSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!autopilotGoal.trim() || autopilotLoading) return
    setAutopilotLoading(true)
    const result = await runAutopilot(autopilotGoal)
    if (result) {
      navigate(`/autopilot/${result.run_id}`)
    } else {
      alert("Failed to initialize Autopilot agent campaign planner. Please try again.")
    }
    setAutopilotLoading(false)
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <AnimatePresence mode="wait">
        {mode === 'guided' ? (
          <motion.div
            key="guided-dashboard"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35 }}
          >
            <GuidedView
              stats={stats}
              statsLoading={statsLoading}
              insights={insights}
              insightsLoading={insightsLoading}
              campaigns={campaigns}
              nlInput={nlInput}
              nlLoading={nlLoading}
              onNlInputChange={setNlInput}
              onNlSubmit={handleNlSubmit}
              onRefreshInsights={refreshInsights}
            />
          </motion.div>
        ) : (
          <motion.div
            key="autopilot-dashboard"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35 }}
          >
            <AutopilotView
              stats={stats}
              statsLoading={statsLoading}
              campaigns={campaigns}
              autopilotGoal={autopilotGoal}
              autopilotLoading={autopilotLoading}
              loadingMsgIdx={loadingMsgIdx}
              loadingMessages={LOADING_MESSAGES}
              onGoalChange={setAutopilotGoal}
              onSubmit={handleAutopilotSubmit}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// GUIDED VIEW
// ═══════════════════════════════════════════════════════════════

function GuidedView({
  stats,
  statsLoading,
  insights,
  insightsLoading,
  campaigns,
  nlInput,
  nlLoading,
  onNlInputChange,
  onNlSubmit,
  onRefreshInsights,
}: {
  stats: CustomerStats | null
  statsLoading: boolean
  insights: Insight[]
  insightsLoading: boolean
  campaigns: Campaign[]
  nlInput: string
  nlLoading: boolean
  onNlInputChange: (v: string) => void
  onNlSubmit: (e: React.FormEvent) => void
  onRefreshInsights: () => void
}) {
  return (
    <>
      {/* ─── Header ────────────────────────────────────── */}
      <header className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <IconSparkles size={20} className="text-[#FF6B9D]" />
          <h1 className="text-2xl font-bold text-text-primary">
            Good morning, Glow Studio
          </h1>
        </div>
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
                icon={<IconUsers size={18} />}
                delay={0}
              />
              <StatPill
                label="Total Revenue"
                value={`₹${stats.total_revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                icon={<IconCurrencyRupee size={18} />}
                delay={0.05}
              />
              <StatPill
                label="Campaigns Sent"
                value={stats.campaigns_sent.toString()}
                icon={<IconSend size={18} />}
                delay={0.1}
              />
              <StatPill
                label="Avg Order Value"
                value={`₹${stats.avg_order_value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                icon={<IconShoppingCart size={18} />}
                delay={0.15}
              />
            </>
          ) : null}
        </div>
      </header>

      {/* ─── Body: Two-column layout ───────────────────── */}
      <div className="grid grid-cols-5 gap-8">
        {/* Left: AI Insights (3/5 = 60%) */}
        <section className="col-span-3" id="insights-section">
          {/* NL Entry Point */}
          <div className="glass-card p-6 mb-8">
            <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <IconSparkles size={16} className="text-[#FF6B9D]" />
              What do you want to do today?
            </h2>
            <form onSubmit={onNlSubmit} className="relative flex items-center">
              <input
                type="text"
                value={nlInput}
                onChange={(e) => onNlInputChange(e.target.value)}
                disabled={nlLoading}
                placeholder="Describe what you want to do... e.g. 'Reach loyal customers before Diwali'"
                className="input-glass pr-14"
                id="nl-goal-input"
              />
              <button
                type="submit"
                disabled={nlLoading || !nlInput.trim()}
                className="absolute right-2 p-2.5 rounded-xl btn-accent !px-3 !py-2.5"
                id="nl-submit-btn"
              >
                {nlLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <IconArrowRight size={18} />
                )}
              </button>
            </form>
            {nlLoading && (
              <div className="flex items-center gap-2 mt-3 text-sm text-[#FF6B9D] animate-pulse">
                <span className="w-2 h-2 rounded-full bg-[#FF6B9D]" />
                <span>AI is understanding your goal...</span>
              </div>
            )}
            <p className="text-xs text-text-muted mt-3">
              Or choose from AI suggestions below ↓
            </p>
          </div>

          {/* Insights Header */}
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
              onClick={onRefreshInsights}
              disabled={insightsLoading}
              className="p-2 rounded-xl glass-card !border-transparent hover:!border-[rgba(255,107,157,0.2)] text-text-muted hover:text-text-primary transition-all duration-200 disabled:opacity-50"
              id="refresh-insights-btn"
            >
              <IconRefresh
                size={16}
                className={insightsLoading ? 'animate-spin' : ''}
              />
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
    </>
  )
}

// ═══════════════════════════════════════════════════════════════
// AUTOPILOT VIEW
// ═══════════════════════════════════════════════════════════════

function AutopilotView({
  stats,
  statsLoading,
  campaigns,
  autopilotGoal,
  autopilotLoading,
  loadingMsgIdx,
  loadingMessages,
  onGoalChange,
  onSubmit,
}: {
  stats: CustomerStats | null
  statsLoading: boolean
  campaigns: Campaign[]
  autopilotGoal: string
  autopilotLoading: boolean
  loadingMsgIdx: number
  loadingMessages: string[]
  onGoalChange: (v: string) => void
  onSubmit: (e: React.FormEvent) => void
}) {

  return (
    <>
      {/* ─── Header ────────────────────────────────────── */}
      <header className="mb-10">
        <div className="flex items-center gap-2 mb-1">
          <IconBolt size={20} className="text-[#7C3AED]" />
          <h1 className="text-2xl font-bold text-text-primary">
            Autopilot Mode
          </h1>
        </div>
        <p className="text-text-secondary text-sm">
          Give AI a goal. It handles segment, copy, channel, and timing.
        </p>
      </header>

      {/* ─── Hero Goal Input ───────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="glass-card p-8 mb-8 glow-autopilot"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/20 flex items-center justify-center">
            <IconBolt size={22} className="text-[#7C3AED]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-primary">
              What's your goal?
            </h2>
            <p className="text-xs text-text-muted">
              Describe your objective in natural language
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit}>
          <div className="relative mb-4">
            <input
              type="text"
              value={autopilotGoal}
              onChange={(e) => onGoalChange(e.target.value)}
              disabled={autopilotLoading}
              placeholder="e.g. Increase repeat purchases, Re-engage lapsed customers, Maximize revenue..."
              className="input-glass !py-4 !text-base pr-44"
              id="autopilot-goal-input"
            />
            <button
              type="submit"
              disabled={autopilotLoading || !autopilotGoal.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 btn-accent !rounded-xl !px-5 !py-2.5 !text-xs !font-bold flex items-center gap-1.5 shadow-lg"
              style={{ boxShadow: '0 4px 20px rgba(124,58,237,0.25)' }}
              id="autopilot-submit-btn"
            >
              {autopilotLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Thinking...
                </>
              ) : (
                <>
                  Let AI take over
                  <IconArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </form>

        {autopilotLoading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 text-sm text-[#7C3AED] font-medium bg-[#7C3AED]/5 border border-[#7C3AED]/10 px-4 py-3 rounded-xl"
          >
            <div className="w-4 h-4 rounded-full border-2 border-[#7C3AED] border-t-transparent animate-spin flex-shrink-0" />
            <span>{loadingMessages[loadingMsgIdx]}</span>
          </motion.div>
        )}

        <p className="text-[10px] text-text-muted mt-4 italic flex items-center gap-1.5">
          <IconInfoCircle size={14} />
          AI will plan and propose a complete campaign. You approve before anything sends.
        </p>
      </motion.div>

      {/* ─── Stats Row ─────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4 mb-8">
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
              icon={<IconUsers size={18} />}
              delay={0}
            />
            <StatPill
              label="Total Revenue"
              value={`₹${stats.total_revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
              icon={<IconCurrencyRupee size={18} />}
              delay={0.05}
            />
            <StatPill
              label="Campaigns Sent"
              value={stats.campaigns_sent.toString()}
              icon={<IconSend size={18} />}
              delay={0.1}
            />
            <StatPill
              label="Avg Order Value"
              value={`₹${stats.avg_order_value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
              icon={<IconShoppingCart size={18} />}
              delay={0.15}
            />
          </>
        ) : null}
      </div>

      {/* ─── Recent Campaigns ──────────────────────────── */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <IconPlayerPlay size={18} className="text-[#7C3AED]" />
          Recent Campaigns
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {campaigns.length > 0 ? (
            campaigns.slice(0, 4).map((campaign, idx) => (
              <CampaignStats key={campaign.id} campaign={campaign} index={idx} />
            ))
          ) : (
            <div className="glass-card p-8 text-center col-span-2">
              <IconRocket size={32} className="text-text-muted mx-auto mb-2" />
              <p className="text-text-muted text-sm">No campaigns yet</p>
              <p className="text-text-muted text-xs mt-1">
                Set a goal above and let AI create your first campaign
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

function StatPill({
  label,
  value,
  icon,
  delay,
}: {
  label: string
  value: string
  icon: React.ReactNode
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="glass-card p-4 flex items-center gap-3"
    >
      <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center text-text-secondary flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs text-text-muted">{label}</p>
        <p className="text-lg font-bold text-text-primary">{value}</p>
      </div>
    </motion.div>
  )
}

function StatPillSkeleton() {
  return (
    <div className="glass-card p-4 flex items-center gap-3">
      <div className="skeleton w-10 h-10 rounded-xl" />
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
      <div className="skeleton h-10 w-full rounded-xl" />
    </div>
  )
}
