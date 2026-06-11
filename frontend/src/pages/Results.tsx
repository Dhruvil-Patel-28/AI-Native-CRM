/**
 * Results — live campaign delivery tracking and AI summary.
 *
 * Polls GET /campaigns/:id/status every 3 seconds while the
 * campaign is running. Displays:
 *   - Top stats bar with progress bars
 *   - Rate percentage pills
 *   - Revenue attribution
 *   - Live message delivery feed (auto-scrolling)
 *   - AI summary card (fades in on completion)
 *
 * URL param: campaignId
 */

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  IconArrowLeft,
  IconSparkles,
  IconBrandWhatsapp,
  IconMail,
} from '@tabler/icons-react'
import { getCampaignStatus, type CampaignStatus, type MessageRecord } from '../services/api'

export default function Results() {
  const { campaignId } = useParams<{ campaignId: string }>()
  const navigate = useNavigate()

  const [data, setData] = useState<CampaignStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [userScrolled, setUserScrolled] = useState(false)
  const feedRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchStatus = useCallback(async () => {
    if (!campaignId) return
    const result = await getCampaignStatus(campaignId)
    if (result) {
      setData(result)
      setLoading(false)
    }
  }, [campaignId])

  useEffect(() => {
    fetchStatus()

    intervalRef.current = setInterval(fetchStatus, 3000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchStatus])

  // Stop polling when completed
  useEffect(() => {
    if (data?.campaign.status === 'completed' && intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [data?.campaign.status])

  // Auto-scroll feed
  useEffect(() => {
    if (!userScrolled && feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [data?.recent_messages, userScrolled])

  const handleFeedScroll = () => {
    if (!feedRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = feedRef.current
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
    setUserScrolled(!isAtBottom)
  }

  if (loading || !data) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-white/60 animate-spin mb-4" />
          <p className="text-text-secondary">Loading campaign results...</p>
        </div>
      </div>
    )
  }

  const { campaign } = data
  const isRunning = campaign.status === 'running'

  const deliveryRate = campaign.total_sent > 0
    ? ((campaign.total_delivered / campaign.total_sent) * 100)
    : 0
  const openRate = campaign.total_delivered > 0
    ? ((campaign.total_opened / campaign.total_delivered) * 100)
    : 0
  const clickRate = campaign.total_opened > 0
    ? ((campaign.total_clicked / campaign.total_opened) * 100)
    : 0

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* ─── Header ────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
            {campaign.name}
            {isRunning && (
              <span className="tag bg-warning/10 text-warning text-xs">
                <span className="status-dot live" />
                Live
              </span>
            )}
          </h1>
          <p className="text-text-muted text-sm mt-1 flex items-center gap-1.5">
            {campaign.channel === 'whatsapp' ? (
              <IconBrandWhatsapp size={14} className="text-emerald-400" />
            ) : (
              <IconMail size={14} className="text-blue-400" />
            )}
            {campaign.channel === 'whatsapp' ? 'WhatsApp' : 'Email'} campaign
            {' · '}
            {new Date(campaign.created_at).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>
      </div>

      {/* ─── Top Stats Bar ─────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatBlock label="Sent" value={campaign.total_sent} total={campaign.total_sent} color="bg-text-secondary" delay={0} />
        <StatBlock label="Delivered" value={campaign.total_delivered} total={campaign.total_sent} color="bg-blue-500" delay={0.05} />
        <StatBlock label="Opened" value={campaign.total_opened} total={campaign.total_sent} color="bg-warning" delay={0.1} />
        <StatBlock label="Clicked" value={campaign.total_clicked} total={campaign.total_sent} color="bg-success" delay={0.15} />
      </div>

      {/* Failed count */}
      {campaign.total_failed > 0 && (
        <p className="text-xs text-error mb-4">
          {campaign.total_failed} messages failed to deliver
        </p>
      )}

      {/* ─── Rate Pills + Revenue ──────────────────────── */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <RatePill label="Delivery Rate" value={deliveryRate} />
        <RatePill label="Open Rate" value={openRate} />
        <RatePill label="Click Rate" value={clickRate} />
        <div className="glass-card p-4 text-center">
          <p className="text-xs text-text-muted mb-1">Revenue Attributed</p>
          <p className="text-2xl font-bold text-emerald-400">
            ₹{campaign.revenue_attributed.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          {campaign.total_clicked > 0 && (
            <p className="text-[10px] text-text-muted mt-1">
              from {campaign.total_clicked} clicks in 48hr window
            </p>
          )}
        </div>
      </div>

      {/* ─── Live Feed + AI Summary ────────────────────── */}
      <div className="grid grid-cols-2 gap-6">
        {/* Live Message Feed */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <span className={`status-dot ${isRunning ? 'live' : ''}`} style={isRunning ? {} : { background: '#6b7280' }} />
              Live Delivery Feed
            </h3>
            {userScrolled && (
              <span className="tag bg-warning/10 text-warning">
                Paused
              </span>
            )}
          </div>

          <div
            ref={feedRef}
            onScroll={handleFeedScroll}
            className="h-80 overflow-y-auto space-y-1.5 pr-1"
            id="live-feed"
          >
            {data.recent_messages.length > 0 ? (
              [...data.recent_messages].reverse().map((msg) => (
                <FeedItem key={msg.id} message={msg} />
              ))
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-text-muted text-sm">Waiting for delivery events...</p>
              </div>
            )}
          </div>
        </div>

        {/* AI Summary */}
        <div>
          {campaign.status === 'completed' && campaign.ai_summary ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="glass-card p-6"
            >
              <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                <IconSparkles size={16} className="text-[#FF6B9D]" />
                Campaign Summary
              </h3>

              {/* Summary text */}
              {campaign.ai_summary.split('\n\n').map((paragraph, idx) => {
                if (paragraph.startsWith('💡')) {
                  return (
                    <div
                      key={idx}
                      className="mt-4 p-4 rounded-xl bg-white/[0.03] border-l-2 border-[#FF6B9D]"
                    >
                      <p className="text-sm text-text-primary leading-relaxed">
                        {paragraph}
                      </p>
                    </div>
                  )
                }
                return (
                  <p key={idx} className="text-sm text-text-secondary leading-relaxed mb-3">
                    {paragraph}
                  </p>
                )
              })}

              <button
                onClick={() => navigate('/')}
                className="mt-6 w-full btn-outline"
                id="back-to-dashboard-btn"
              >
                <IconArrowLeft size={15} /> Back to Dashboard
              </button>
            </motion.div>
          ) : isRunning ? (
            <div className="glass-card p-6 flex flex-col items-center justify-center h-80">
              <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-white/40 animate-spin mb-4" />
              <p className="text-text-secondary text-sm font-medium">Campaign in progress</p>
              <p className="text-text-muted text-xs mt-1">Summary will appear when complete</p>
            </div>
          ) : (
            <div className="glass-card p-6 flex flex-col items-center justify-center h-80">
              <p className="text-text-muted text-sm">No summary available</p>
              <button
                onClick={() => navigate('/')}
                className="mt-4 btn-outline !text-sm"
              >
                <IconArrowLeft size={14} /> Back to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────

function StatBlock({
  label,
  value,
  total,
  color,
  delay,
}: {
  label: string
  value: number
  total: number
  color: string
  delay: number
}) {
  const percentage = total > 0 ? (value / total) * 100 : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass-card p-4"
    >
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className="text-3xl font-bold text-text-primary tabular-nums">
        {value.toLocaleString('en-IN')}
      </p>
      <div className="mt-2 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ delay: delay + 0.2, duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </motion.div>
  )
}

function RatePill({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass-card p-4 text-center">
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className="text-xl font-bold text-text-primary tabular-nums">
        {value.toFixed(1)}%
      </p>
    </div>
  )
}

const STATUS_CONFIG: Record<string, { color: string; icon: string }> = {
  sent: { color: 'text-text-muted', icon: '○' },
  delivered: { color: 'text-blue-400', icon: '✓' },
  opened: { color: 'text-warning', icon: '◉' },
  clicked: { color: 'text-success', icon: '★' },
  failed: { color: 'text-error', icon: '✕' },
}

function FeedItem({ message }: { message: MessageRecord }) {
  const config = STATUS_CONFIG[message.status] ?? STATUS_CONFIG['sent']!

  const timestamp = message.clicked_at
    ?? message.opened_at
    ?? message.delivered_at
    ?? message.sent_at

  return (
    <div className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-white/[0.03] transition-colors">
      <span className={`text-sm font-mono ${config.color}`}>
        {config.icon}
      </span>
      <span className="text-xs text-text-primary flex-1 truncate">
        {message.customer_name ?? 'Customer'}
      </span>
      <span className={`text-[10px] font-medium ${config.color}`}>
        {message.status}
      </span>
      <span className="text-[10px] text-text-muted tabular-nums">
        {new Date(timestamp).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })}
      </span>
    </div>
  )
}
