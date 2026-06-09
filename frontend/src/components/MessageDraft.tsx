/**
 * MessageDraft — editable message preview with channel tabs.
 *
 * Provides WhatsApp/Email channel tabs, editable textarea with
 * character counter, a mobile phone mockup preview, and a
 * regenerate button.
 */

import { useState } from 'react'

interface MessageDraftProps {
  whatsappMessage: string
  emailMessage: string
  selectedChannel: string
  onChannelChange: (channel: string) => void
  onMessageChange: (message: string) => void
  onRegenerate: () => void
}

const WHATSAPP_SOFT_LIMIT = 160

export default function MessageDraft({
  whatsappMessage,
  emailMessage,
  selectedChannel,
  onChannelChange,
  onMessageChange,
  onRegenerate,
}: MessageDraftProps) {
  const currentMessage = selectedChannel === 'whatsapp' ? whatsappMessage : emailMessage
  const [editedMessage, setEditedMessage] = useState(currentMessage)

  const handleMessageEdit = (value: string) => {
    setEditedMessage(value)
    onMessageChange(value)
  }

  const isOverLimit = selectedChannel === 'whatsapp' && editedMessage.length > WHATSAPP_SOFT_LIMIT

  return (
    <div className="grid grid-cols-2 gap-6 animate-fade-in">
      {/* Left: Editor */}
      <div>
        {/* Channel Tabs */}
        <div className="flex gap-1 mb-4 p-1 rounded-lg bg-surface-bg">
          <ChannelTab
            label="WhatsApp"
            active={selectedChannel === 'whatsapp'}
            color="bg-emerald-500"
            onClick={() => {
              onChannelChange('whatsapp')
              setEditedMessage(whatsappMessage)
            }}
          />
          <ChannelTab
            label="Email"
            active={selectedChannel === 'email'}
            color="bg-blue-500"
            onClick={() => {
              onChannelChange('email')
              setEditedMessage(emailMessage)
            }}
          />
        </div>

        {/* Textarea */}
        <div className="relative">
          <textarea
            value={editedMessage}
            onChange={(e) => handleMessageEdit(e.target.value)}
            className="w-full h-48 p-4 rounded-lg bg-surface-bg border border-surface-border text-text-primary text-sm leading-relaxed resize-none focus:outline-none focus:border-accent/50 transition-colors"
            id="message-draft-textarea"
          />

          {/* Character Counter */}
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            {selectedChannel === 'whatsapp' && (
              <span className={`text-xs ${isOverLimit ? 'text-warning' : 'text-text-muted'}`}>
                {editedMessage.length}/{WHATSAPP_SOFT_LIMIT}
              </span>
            )}
          </div>
        </div>

        {isOverLimit && (
          <p className="text-xs text-warning mt-2 flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            WhatsApp messages over 160 characters may be truncated
          </p>
        )}

        {/* Regenerate Button */}
        <button
          onClick={onRegenerate}
          className="mt-3 px-4 py-2 rounded-lg border border-surface-border text-text-secondary text-sm hover:text-text-primary hover:border-accent/30 transition-all duration-200 flex items-center gap-2"
          id="regenerate-message-btn"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
          </svg>
          Regenerate message
        </button>
      </div>

      {/* Right: Phone Mockup */}
      <div className="flex justify-center">
        <div className="w-72 relative">
          {/* Phone Frame */}
          <div className="rounded-[2.5rem] border-2 border-surface-border bg-surface-bg p-2 shadow-2xl">
            {/* Notch */}
            <div className="flex justify-center mb-2">
              <div className="w-24 h-5 rounded-full bg-surface-card" />
            </div>

            {/* Screen */}
            <div className="rounded-[2rem] bg-surface-card min-h-[420px] p-4 flex flex-col">
              {/* Chat Header */}
              <div className="flex items-center gap-3 pb-3 border-b border-surface-border mb-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">G</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-text-primary">Glow Studio</p>
                  <p className="text-[10px] text-text-muted">
                    {selectedChannel === 'whatsapp' ? 'WhatsApp Business' : 'Email'}
                  </p>
                </div>
              </div>

              {/* Message Bubble */}
              <div className={`rounded-2xl rounded-tl-sm p-3.5 max-w-[90%] ${
                selectedChannel === 'whatsapp'
                  ? 'bg-emerald-900/30 border border-emerald-500/20'
                  : 'bg-blue-900/30 border border-blue-500/20'
              }`}>
                <p className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap">
                  {editedMessage || 'Your message will appear here...'}
                </p>
                <p className="text-[10px] text-text-muted mt-2 text-right">
                  {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ChannelTab({
  label,
  active,
  color,
  onClick,
}: {
  label: string
  active: boolean
  color: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
        active
          ? 'bg-surface-card text-text-primary shadow-sm'
          : 'text-text-muted hover:text-text-secondary'
      }`}
    >
      <div className={`w-2 h-2 rounded-full ${active ? color : 'bg-text-muted'}`} />
      {label}
    </button>
  )
}
