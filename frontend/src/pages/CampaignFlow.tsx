/**
 * CampaignFlow — 4-step campaign creation wizard.
 *
 * Steps:
 *   1. Understand — AI shows intent, marketer can refine
 *   2. Segment — Preview target audience stats
 *   3. Message — Edit message with channel tabs + phone mockup
 *   4. Confirm — Review and send
 *
 * URL param: insightId or sessionId
 */

import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  IconCheck,
  IconArrowRight,
  IconArrowLeft,
  IconAlertTriangle,
  IconRocket,
  IconSparkles,
} from '@tabler/icons-react'
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
                <motion.div
                  animate={{
                    scale: idx === currentStep ? 1.1 : 1,
                  }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                    idx < currentStep
                      ? 'btn-accent !p-0'
                      : idx === currentStep
                        ? 'btn-accent !p-0 ring-4 ring-white/10'
                        : 'bg-white/[0.06] text-text-muted border border-white/[0.08]'
                  }`}
                >
                  {idx < currentStep ? (
                    <IconCheck size={14} strokeWidth={3} />
                  ) : (
                    idx + 1
                  )}
                </motion.div>
                <span className={`text-sm font-medium ${
                  idx <= currentStep ? 'text-text-primary' : 'text-text-muted'
                }`}>
                  {step}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`w-16 h-0.5 mx-3 rounded-full transition-colors duration-300 ${
                  idx < currentStep ? 'bg-white/20' : 'bg-white/[0.06]'
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
          <AnimatePresence mode="wait">
            {/* Step 1: Understand */}
            {currentStep === 0 && (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-xl font-bold text-text-primary mb-6 flex items-center gap-2">
                  <IconSparkles size={20} className="text-[#FF6B9D]" />
                  Here's what I understood:
                </h2>

                {/* Intent Box */}
                <div className="p-6 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-6">
                  <div className="flex gap-3">
                    <div className="w-1 rounded-full bg-[#FF6B9D] flex-shrink-0" />
                    <p className="text-text-primary leading-relaxed text-lg">
                      {preview.intent_text}
                    </p>
                  </div>
                </div>

                {/* Channel Recommendation */}
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-6">
                  <p className="text-sm text-text-secondary">
                    <span className="font-semibold text-[#FF6B9D]">Recommended channel: </span>
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
                      className="input-glass flex-1"
                      id="refinement-input"
                    />
                    <button
                      onClick={handleRefine}
                      disabled={!refinement.trim()}
                      className="btn-outline !text-sm"
                      id="refine-btn"
                    >
                      Refine <IconArrowRight size={14} />
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setCurrentStep(1)}
                  className="w-full py-3 rounded-xl btn-accent font-semibold"
                  id="step1-next-btn"
                >
                  Looks right <IconArrowRight size={16} />
                </button>
              </motion.div>
            )}

            {/* Step 2: Segment */}
            {currentStep === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
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
                      className="input-glass flex-1"
                      id="segment-refinement-input"
                    />
                    <button
                      onClick={handleRefine}
                      disabled={!refinement.trim()}
                      className="btn-outline !text-sm"
                      id="segment-adjust-btn"
                    >
                      Adjust <IconArrowRight size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setCurrentStep(0)}
                    className="btn-outline"
                  >
                    <IconArrowLeft size={15} /> Back
                  </button>
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="flex-1 py-3 rounded-xl btn-accent font-semibold"
                    id="step2-next-btn"
                  >
                    Use this segment <IconArrowRight size={16} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Message */}
            {currentStep === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
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
                    className="btn-outline"
                  >
                    <IconArrowLeft size={15} /> Back
                  </button>
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="flex-1 py-3 rounded-xl btn-accent font-semibold"
                    id="step3-next-btn"
                  >
                    Message looks good <IconArrowRight size={16} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 4: Confirm */}
            {currentStep === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-xl font-bold text-text-primary mb-6">
                  Review & send
                </h2>

                {/* Summary Card */}
                <div className="p-6 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-6 space-y-4">
                  <div>
                    <label className="text-xs text-text-muted mb-1.5 block">Campaign Name</label>
                    <input
                      type="text"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      className="input-glass"
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
                <div className="p-4 rounded-xl bg-warning/5 border border-warning/20 mb-6 flex items-start gap-3">
                  <IconAlertTriangle size={18} className="text-warning flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-warning/90">
                    This will send <span className="font-semibold">{preview.customer_count.toLocaleString('en-IN')} messages</span>.
                    This cannot be undone.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="btn-outline"
                  >
                    <IconArrowLeft size={15} /> Back
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={sending || !campaignName.trim()}
                    className="flex-1 py-3.5 rounded-xl btn-accent font-bold text-lg"
                    id="send-campaign-btn"
                  >
                    {sending ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        Send Campaign <IconRocket size={18} />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}

// ─── Loading & Error States ──────────────────────────────────

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-white/60 animate-spin mb-4" />
      <p className="text-text-secondary font-medium">AI is thinking...</p>
      <p className="text-text-muted text-sm mt-1">Analyzing your customer data</p>
    </div>
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <IconAlertTriangle size={40} className="text-error mb-4" />
      <p className="text-text-primary font-medium mb-2">Failed to generate preview</p>
      <button
        onClick={onRetry}
        className="btn-accent"
      >
        Try again
      </button>
    </div>
  )
}
