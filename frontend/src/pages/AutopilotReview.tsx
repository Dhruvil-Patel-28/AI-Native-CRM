/**
 * AutopilotReview — Page for reviewing and acting on AI agent plans.
 *
 * Layout:
 *   - Section 1: Collapsible Agent Reasoning ("Here's how I thought about this")
 *   - Section 2: Main Plan Card (Title, Summary, Segment, Channel, Message, Expected Outcomes)
 *   - Section 3: Decision Buttons (Reject vs. Approve & Send)
 */

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
        <div className="w-12 h-12 rounded-full border-2 border-accent border-t-transparent animate-spin mb-4" />
        <p className="text-text-secondary font-medium">Loading Autopilot Plan...</p>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <svg className="w-12 h-12 text-error mb-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
        <p className="text-text-primary font-medium mb-4">Autopilot plan not found</p>
        <button
          onClick={() => navigate('/')}
          className="px-5 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-all"
        >
          Go Back Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-accent bg-accent/10 px-2.5 py-1 rounded-full">
          ⚡ Autopilot Proposed Plan
        </span>
        <h1 className="text-2xl font-bold text-text-primary mt-2">
          Review Campaign Proposal
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Goal: "{plan.goal}"
        </p>
      </div>

      {/* SECTION 1: Collapsible Agent Reasoning */}
      <div className="glass-card overflow-hidden">
        <button
          onClick={() => setIsReasoningOpen(!isReasoningOpen)}
          className="w-full px-6 py-4 flex items-center justify-between text-left font-semibold text-text-primary hover:bg-surface-hover transition-colors"
          id="reasoning-toggle-btn"
        >
          <span className="flex items-center gap-2">
            <span>🧠</span> Here's how I thought about this
          </span>
          <svg
            className={`w-5 h-5 text-text-muted transition-transform duration-200 ${
              isReasoningOpen ? 'transform rotate-180' : ''
            }`}
            fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
        {isReasoningOpen && (
          <div className="px-6 py-4 bg-surface-bg/30 border-t border-surface-border text-sm text-text-secondary leading-relaxed animate-fade-in" id="reasoning-content">
            {plan.reasoning}
          </div>
        )}
      </div>

      {/* SECTION 2: The Campaign Plan Card */}
      <div className="glass-card p-6 space-y-6">
        {/* Title & Narrative */}
        <div>
          <h2 className="text-xl font-bold text-text-primary" id="plan-title">
            {plan.plan_title}
          </h2>
          <p className="text-sm text-text-secondary mt-2 leading-relaxed" id="plan-summary">
            {plan.plan_summary}
          </p>
        </div>

        <hr className="border-surface-border" />

        {/* Audience Segment Diagnostic */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-surface-bg border border-surface-border">
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
          <div className="p-4 rounded-xl bg-surface-bg border border-surface-border flex flex-col justify-between">
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">Delivery Channel</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`w-3 h-3 rounded-full ${
                  plan.channel === 'whatsapp' ? 'bg-emerald-500' : 'bg-blue-500'
                }`} />
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
        <div className="p-4 rounded-xl bg-accent/5 border border-accent/15 space-y-2">
          <p className="text-xs text-accent font-bold uppercase tracking-wider">Draft Message Template</p>
          <div className="p-3.5 rounded-lg bg-surface-card border border-surface-border text-sm text-text-primary leading-relaxed whitespace-pre-line font-mono" id="message-preview">
            {plan.message}
          </div>
          <p className="text-[10px] text-text-muted flex items-center gap-1 mt-1">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 111.083.87l-.512.768a.75.75 0 01-1.248-.06l-.234-.351zM12 21a9 9 0 110-18 9 9 0 010 18z" />
            </svg>
            Note: Customer's name and favorite skincare product will be dynamically customized.
          </p>
          {plan.message_reasoning && (
            <p className="text-xs text-text-secondary leading-normal mt-2 border-t border-accent/10 pt-2 italic">
              💡 {plan.message_reasoning}
            </p>
          )}
        </div>

        {/* Financial Outcome Estimates */}
        <div className="grid grid-cols-3 gap-4 pt-2">
          <div className="text-center p-3 rounded-lg bg-surface-bg border border-surface-border">
            <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Forecast Revenue</p>
            <p className="text-lg font-extrabold text-emerald-400 mt-1" id="expected-revenue">
              ₹{plan.expected_revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="text-center p-3 rounded-lg bg-surface-bg border border-surface-border">
            <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">AI Confidence</p>
            <p className="text-md font-bold text-text-primary mt-1.5 capitalize" id="plan-confidence">
              {plan.confidence}
            </p>
          </div>
          <div className="text-center p-3 rounded-lg bg-surface-bg border border-surface-border">
            <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Risk Rating</p>
            <p className="text-md font-bold text-text-primary mt-1.5 capitalize" id="plan-risk">
              {plan.risk}
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 3: Decision Buttons */}
      <div className="flex gap-4">
        <button
          onClick={handleReject}
          disabled={actioning}
          className="flex-1 py-3.5 rounded-xl border border-surface-border text-text-secondary hover:text-text-primary hover:border-error/30 text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
          className="flex-1 py-3.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-bold shadow-lg shadow-accent/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          id="approve-btn"
        >
          {actioning && actionType === 'approve' ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Launching campaign...
            </>
          ) : (
            <>Approve and Send →</>
          )}
        </button>
      </div>
    </div>
  )
}
