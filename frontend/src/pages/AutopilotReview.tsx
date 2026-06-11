/**
 * AutopilotReview — Page for reviewing and acting on AI agent plans.
 *
 * Layout:
 *   - Section 1: Collapsible Agent Reasoning
 *   - Section 2: Main Plan Card (Title, Summary, Segment, Channel, Message, Expected Outcomes)
 *   - Section 3: Decision Buttons (Reject vs. Approve & Send)
 */

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  IconBolt,
  IconChevronDown,
  IconBrain,
  IconBrandWhatsapp,
  IconMail,
  IconInfoCircle,
  IconArrowLeft,
  IconArrowRight,
  IconAlertTriangle,
} from '@tabler/icons-react'
import {
  getAutopilotPlan,
  approveAutopilotPlan,
  rejectAutopilotPlan,
  type AutopilotPlan,
} from '../services/api'

export default function AutopilotReview() {
  const { runId } = useParams<{ runId: string }>()
  const navigate = useNavigate()

  const [plan, setPlan] = useState<AutopilotPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState(false)
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null)
  const [isReasoningOpen, setIsReasoningOpen] = useState(false)

  useEffect(() => {
    async function loadPlan() {
      if (!runId) return
      setLoading(true)
      const data = await getAutopilotPlan(runId)
      if (data) {
        setPlan(data)
      }
      setLoading(false)
    }
    loadPlan()
  }, [runId])

  const handleApprove = async () => {
    if (!runId || !plan) return
    setActionType('approve')
    setActioning(true)
    const result = await approveAutopilotPlan(runId)
    if (result) {
      navigate(`/results/${result.campaign_id}`)
    }
    setActioning(false)
  }

  const handleReject = async () => {
    if (!runId) return
    setActionType('reject')
    setActioning(true)
    const result = await rejectAutopilotPlan(runId)
    if (result) {
      navigate('/')
    }
    setActioning(false)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <div className="w-12 h-12 rounded-full border-2 border-[#7C3AED]/30 border-t-[#7C3AED] animate-spin mb-4" />
        <p className="text-text-secondary font-medium">Loading Autopilot Plan...</p>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <IconAlertTriangle size={40} className="text-error mb-4" />
        <p className="text-text-primary font-medium mb-4">Autopilot plan not found</p>
        <button
          onClick={() => navigate('/')}
          className="btn-accent"
        >
          <IconArrowLeft size={15} /> Go Back Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <span className="tag bg-[#7C3AED]/15 text-[#7C3AED] !text-xs !px-3 !py-1">
          <IconBolt size={12} />
          Autopilot Proposed Plan
        </span>
        <h1 className="text-2xl font-bold text-text-primary mt-3">
          Review Campaign Proposal
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Goal: "{plan.goal}"
        </p>
      </motion.div>

      {/* SECTION 1: Collapsible Agent Reasoning */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="glass-card overflow-hidden"
      >
        <button
          onClick={() => setIsReasoningOpen(!isReasoningOpen)}
          className="w-full px-6 py-4 flex items-center justify-between text-left font-semibold text-text-primary hover:bg-white/[0.02] transition-colors"
          id="reasoning-toggle-btn"
        >
          <span className="flex items-center gap-2">
            <IconBrain size={18} className="text-[#7C3AED]" />
            Here's how I thought about this
          </span>
          <motion.div
            animate={{ rotate: isReasoningOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <IconChevronDown size={18} className="text-text-muted" />
          </motion.div>
        </button>
        <AnimatePresence>
          {isReasoningOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="px-6 py-4 bg-white/[0.02] border-t border-white/[0.06] text-sm text-text-secondary leading-relaxed" id="reasoning-content">
                {plan.reasoning}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* SECTION 2: The Campaign Plan Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="glass-card p-6 space-y-6 glow-autopilot"
      >
        {/* Title & Narrative */}
        <div>
          <h2 className="text-xl font-bold text-text-primary" id="plan-title">
            {plan.plan_title}
          </h2>
          <p className="text-sm text-text-secondary mt-2 leading-relaxed" id="plan-summary">
            {plan.plan_summary}
          </p>
        </div>

        <hr className="border-white/[0.06]" />

        {/* Audience Segment Diagnostic */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">Target Segment</p>
            <p className="text-lg font-bold text-text-primary mt-1" id="segment-count">
              {plan.customer_count.toLocaleString('en-IN')} customers
            </p>
            <div className="mt-2 space-y-1">
              <p className="text-xs text-text-secondary">
                <span className="font-medium">Top Cities: </span>
                {plan.segment_stats.top_cities.join(', ')}
              </p>
              <p className="text-xs text-text-secondary">
                <span className="font-medium">Top Category: </span>
                {plan.segment_stats.top_products[0] || 'N/A'}
              </p>
            </div>
          </div>

          {/* Delivery Channel */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] flex flex-col justify-between">
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">Delivery Channel</p>
              <div className="flex items-center gap-2 mt-2">
                {plan.channel === 'whatsapp' ? (
                  <IconBrandWhatsapp size={18} className="text-emerald-400" />
                ) : (
                  <IconMail size={18} className="text-blue-400" />
                )}
                <p className="text-md font-bold text-text-primary capitalize" id="campaign-channel">
                  {plan.channel}
                </p>
              </div>
            </div>
            <p className="text-xs text-text-muted italic mt-2">
              Based on historical click performance
            </p>
          </div>
        </div>

        {/* Message Copy Preview */}
        <div className="p-4 rounded-xl bg-[#7C3AED]/5 border border-[#7C3AED]/15 space-y-2">
          <p className="text-xs text-[#7C3AED] font-bold uppercase tracking-wider">Draft Message Template</p>
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-text-primary leading-relaxed whitespace-pre-line font-mono" id="message-preview">
            {plan.message}
          </div>
          <p className="text-[10px] text-text-muted flex items-center gap-1 mt-1">
            <IconInfoCircle size={13} />
            Note: Customer's name and favorite skincare product will be dynamically customized.
          </p>
          {plan.message_reasoning && (
            <p className="text-xs text-text-secondary leading-normal mt-2 border-t border-[#7C3AED]/10 pt-2 italic">
              💡 {plan.message_reasoning}
            </p>
          )}
        </div>

        {/* Financial Outcome Estimates */}
        <div className="grid grid-cols-3 gap-4 pt-2">
          <div className="text-center p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Forecast Revenue</p>
            <p className="text-lg font-extrabold text-emerald-400 mt-1" id="expected-revenue">
              ₹{plan.expected_revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="text-center p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">AI Confidence</p>
            <p className="text-md font-bold text-text-primary mt-1.5 capitalize" id="plan-confidence">
              {plan.confidence}
            </p>
          </div>
          <div className="text-center p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Risk Rating</p>
            <p className="text-md font-bold text-text-primary mt-1.5 capitalize" id="plan-risk">
              {plan.risk}
            </p>
          </div>
        </div>
      </motion.div>

      {/* SECTION 3: Decision Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="flex gap-4"
      >
        <button
          onClick={handleReject}
          disabled={actioning}
          className="flex-1 py-3.5 rounded-xl btn-outline hover:!border-error/30 !text-sm !font-semibold"
          id="reject-btn"
        >
          {actioning && actionType === 'reject' ? (
            <>
              <div className="w-4 h-4 border-2 border-text-secondary border-t-transparent rounded-full animate-spin" />
              Rejecting...
            </>
          ) : (
            <>Reject — I'll do this myself</>
          )}
        </button>
        <button
          onClick={handleApprove}
          disabled={actioning}
          className="flex-1 py-3.5 rounded-xl btn-accent !text-sm !font-bold"
          style={{ boxShadow: '0 4px 25px rgba(124,58,237,0.25)' }}
          id="approve-btn"
        >
          {actioning && actionType === 'approve' ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Launching campaign...
            </>
          ) : (
            <>
              Approve and Send <IconArrowRight size={15} />
            </>
          )}
        </button>
      </motion.div>
    </div>
  )
}
