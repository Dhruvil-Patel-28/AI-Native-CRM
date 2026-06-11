/**
 * CampaignFlow — 4-step campaign creation wizard.
 *
 * Steps:
 *   1. Understand — AI shows intent, marketer can refine
 *   2. Segment — Preview target audience stats
 *   3. Message — Edit message with channel tabs + phone mockup
 *   4. Confirm — Review and send
 *
 * URL param: insightId (from the insight card's "Run Campaign" button)
 */

import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import SegmentPreview from '../components/SegmentPreview'
import MessageDraft from '../components/MessageDraft'
import {
  previewCampaign,
  confirmCampaign,
  nlPreviewCampaign,
  getNLSession,
  type CampaignPreview,
} from '../services/api'

const STEPS = ['Understand', 'Segment', 'Message', 'Confirm'] as const

export default function CampaignFlow() {
  const { insightId, sessionId } = useParams<{ insightId?: string; sessionId?: string }>()
  const navigate = useNavigate()

  const [currentStep, setCurrentStep] = useState(0)
  const [preview, setPreview] = useState<CampaignPreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [refinement, setRefinement] = useState('')
  const [selectedChannel, setSelectedChannel] = useState('whatsapp')
  const [editedMessage, setEditedMessage] = useState('')
  const [campaignName, setCampaignName] = useState('')

  const loadPreview = useCallback(async (refineText: string = '') => {
    if (!insightId && !sessionId) return
    setLoading(true)
    let data: CampaignPreview | null = null
    
    if (insightId) {
      data = await previewCampaign(insightId, refineText)
    } else if (sessionId) {
      if (refineText) {
        data = await nlPreviewCampaign('', sessionId, refineText)
      } else {
        data = await getNLSession(sessionId)
      }
    }

    if (data) {
      setPreview(data)
      setSelectedChannel(data.channel_recommendation)
      setEditedMessage(
        data.channel_recommendation === 'whatsapp'
          ? data.whatsapp_message
          : data.email_message
      )
      const name = (data as any).campaign_name || `Campaign — ${new Date().toLocaleDateString('en-IN')}`
      setCampaignName(name)
    }
    setLoading(false)
  }, [insightId, sessionId])

  useEffect(() => {
    loadPreview()
  }, [loadPreview])

  const handleRefine = async () => {
    await loadPreview(refinement)
    setRefinement('')
  }

  const handleRegenerate = async () => {
    await loadPreview('regenerate the message with a different tone')
  }

  const handleConfirm = async () => {
    if ((!insightId && !sessionId) || !preview) return
    setSending(true)

    const result = await confirmCampaign({
      insight_id: insightId || '',
      campaign_name: campaignName,
      message_text: editedMessage,
      channel: selectedChannel,
      segment_params: preview.segment_params,
    })

    if (result) {
      navigate(`/results/${result.campaign_id}`)
    }
    setSending(false)
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* ─── Progress Bar ──────────────────────────────── */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-3">
          {STEPS.map((step, idx) => (
            <div key={step} className="flex items-center">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                    idx < currentStep
                      ? 'bg-accent text-white'
                      : idx === currentStep
                        ? 'bg-accent text-white ring-4 ring-accent/20'
                        : 'bg-surface-card text-text-muted border border-surface-border'
                  }`}
                >
                  {idx < currentStep ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  ) : (
                    idx + 1
                  )}
                </div>
                <span className={`text-sm font-medium ${
                  idx <= currentStep ? 'text-text-primary' : 'text-text-muted'
                }`}>
                  {step}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`w-16 h-0.5 mx-3 rounded-full transition-colors duration-300 ${
                  idx < currentStep ? 'bg-accent' : 'bg-surface-border'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ─── Step Content ──────────────────────────────── */}
      <div className="glass-card p-8">
        {loading ? (
          <LoadingState />
        ) : !preview ? (
          <ErrorState onRetry={() => loadPreview()} />
        ) : (
          <>
            {/* Step 1: Understand */}
            {currentStep === 0 && (
              <div className="animate-fade-in">
                <h2 className="text-xl font-bold text-text-primary mb-6">
                  Here's what I understood:
                </h2>

                {/* Intent Box */}
                <div className="p-6 rounded-xl bg-accent/5 border border-accent/10 mb-6">
                  <div className="flex gap-3">
                    <div className="w-1 rounded-full bg-accent flex-shrink-0" />
                    <p className="text-text-primary leading-relaxed text-lg">
                      {preview.intent_text}
                    </p>
                  </div>
                </div>

                {/* Channel Recommendation */}
                <div className="p-4 rounded-lg bg-surface-bg border border-surface-border mb-6">
                  <p className="text-sm text-text-secondary">
                    <span className="font-semibold text-accent">Recommended channel: </span>
                    {preview.channel_recommendation === 'whatsapp' ? 'WhatsApp' : 'Email'}
                    {' — '}{preview.channel_reason}
                  </p>
                </div>

                {/* Refinement Input */}
                <div className="mb-6">
                  <label className="text-sm text-text-muted mb-2 block">
                    Want to adjust anything? Tell me...
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={refinement}
                      onChange={(e) => setRefinement(e.target.value)}
                      placeholder="e.g. Focus on customers in Mumbai only"
                      className="flex-1 px-4 py-3 rounded-lg bg-surface-bg border border-surface-border text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-colors"
                      id="refinement-input"
                    />
                    <button
                      onClick={handleRefine}
                      disabled={!refinement.trim()}
                      className="px-5 py-3 rounded-lg border border-surface-border text-text-secondary text-sm font-medium hover:border-accent/30 hover:text-text-primary transition-all disabled:opacity-30"
                      id="refine-btn"
                    >
                      Refine →
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setCurrentStep(1)}
                  className="w-full py-3 rounded-lg bg-accent hover:bg-accent-hover text-white font-semibold transition-all duration-200"
                  id="step1-next-btn"
                >
                  Looks right →
                </button>
              </div>
            )}

            {/* Step 2: Segment */}
            {currentStep === 1 && (
              <div className="animate-fade-in">
                <h2 className="text-xl font-bold text-text-primary mb-6">
                  Your target audience
                </h2>

                <SegmentPreview
                  stats={preview.segment_stats}
                  customerCount={preview.customer_count}
                />

                {/* Refinement */}
                <div className="mt-6 mb-6">
                  <label className="text-sm text-text-muted mb-2 block">
                    Narrow this segment...
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={refinement}
                      onChange={(e) => setRefinement(e.target.value)}
                      placeholder="e.g. Only customers who bought Serum"
                      className="flex-1 px-4 py-3 rounded-lg bg-surface-bg border border-surface-border text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-colors"
                      id="segment-refinement-input"
                    />
                    <button
                      onClick={handleRefine}
                      disabled={!refinement.trim()}
                      className="px-5 py-3 rounded-lg border border-surface-border text-text-secondary text-sm font-medium hover:border-accent/30 hover:text-text-primary transition-all disabled:opacity-30"
                      id="segment-adjust-btn"
                    >
                      Adjust →
                    </button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setCurrentStep(0)}
                    className="px-6 py-3 rounded-lg border border-surface-border text-text-secondary text-sm font-medium hover:border-accent/30 hover:text-text-primary transition-all"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="flex-1 py-3 rounded-lg bg-accent hover:bg-accent-hover text-white font-semibold transition-all duration-200"
                    id="step2-next-btn"
                  >
                    Use this segment →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Message */}
            {currentStep === 2 && (
              <div className="animate-fade-in">
                <h2 className="text-xl font-bold text-text-primary mb-6">
                  Craft your message
                </h2>

                <MessageDraft
                  whatsappMessage={preview.whatsapp_message}
                  emailMessage={preview.email_message}
                  selectedChannel={selectedChannel}
                  onChannelChange={setSelectedChannel}
                  onMessageChange={setEditedMessage}
                  onRegenerate={handleRegenerate}
                />

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="px-6 py-3 rounded-lg border border-surface-border text-text-secondary text-sm font-medium hover:border-accent/30 hover:text-text-primary transition-all"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="flex-1 py-3 rounded-lg bg-accent hover:bg-accent-hover text-white font-semibold transition-all duration-200"
                    id="step3-next-btn"
                  >
                    Message looks good →
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Confirm */}
            {currentStep === 3 && (
              <div className="animate-fade-in">
                <h2 className="text-xl font-bold text-text-primary mb-6">
                  Review & send
                </h2>

                {/* Summary Card */}
                <div className="p-6 rounded-xl bg-surface-bg border border-surface-border mb-6 space-y-4">
                  <div>
                    <label className="text-xs text-text-muted mb-1.5 block">Campaign Name</label>
                    <input
                      type="text"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg bg-surface-card border border-surface-border text-text-primary text-sm focus:outline-none focus:border-accent/50 transition-colors"
                      id="campaign-name-input"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-text-muted mb-1">Segment</p>
                      <p className="text-sm font-semibold text-text-primary">
                        {preview.customer_count.toLocaleString('en-IN')} customers
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-text-muted mb-1">Channel</p>
                      <p className="text-sm font-semibold text-text-primary flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          selectedChannel === 'whatsapp' ? 'bg-emerald-500' : 'bg-blue-500'
                        }`} />
                        {selectedChannel === 'whatsapp' ? 'WhatsApp' : 'Email'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-text-muted mb-1">Message Preview</p>
                    <p className="text-sm text-text-secondary line-clamp-3 leading-relaxed">
                      {editedMessage}
                    </p>
                  </div>
                </div>

                {/* Warning */}
                <div className="p-4 rounded-lg bg-warning/5 border border-warning/20 mb-6 flex items-start gap-3">
                  <svg className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                  <p className="text-sm text-warning/90">
                    This will send <span className="font-semibold">{preview.customer_count.toLocaleString('en-IN')} messages</span>.
                    This cannot be undone.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="px-6 py-3 rounded-lg border border-surface-border text-text-secondary text-sm font-medium hover:border-accent/30 hover:text-text-primary transition-all"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={sending || !campaignName.trim()}
                    className="flex-1 py-3.5 rounded-lg bg-accent hover:bg-accent-hover text-white font-bold text-lg transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
                    id="send-campaign-btn"
                  >
                    {sending ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Sending...
                      </>
                    ) : (
                      <>Send Campaign 🚀</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Loading & Error States ──────────────────────────────────

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-12 h-12 rounded-full border-2 border-accent border-t-transparent animate-spin mb-4" />
      <p className="text-text-secondary font-medium">AI is thinking...</p>
      <p className="text-text-muted text-sm mt-1">Analyzing your customer data</p>
    </div>
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <svg className="w-12 h-12 text-error mb-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
      </svg>
      <p className="text-text-primary font-medium mb-2">Failed to generate preview</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-all"
      >
        Try again
      </button>
    </div>
  )
}
