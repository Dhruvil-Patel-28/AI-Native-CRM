/**
 * MessageDraft — editable message preview with channel tabs.
 *
 * Provides WhatsApp/Email channel tabs, editable textarea with
 * character counter, a mobile phone mockup preview, and a
 * regenerate button.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconBrandWhatsapp, IconMail, IconRefresh } from '@tabler/icons-react'

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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid grid-cols-2 gap-6"
    >
      {/* Left: Editor */}
      <div>
        {/* Channel Tabs */}
        <div className="flex gap-1 mb-4 p-1 rounded-xl bg-white/[0.04]">
          <ChannelTab
            label="WhatsApp"
            icon={<IconBrandWhatsapp size={14} />}
            active={selectedChannel === 'whatsapp'}
            color="bg-emerald-500"
            onClick={() => {
              onChannelChange('whatsapp')
              setEditedMessage(whatsappMessage)
            }}
          />
          <ChannelTab
            label="Email"
            icon={<IconMail size={14} />}
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
            className="w-full h-48 p-4 rounded-xl input-glass resize-none !text-sm !leading-relaxed"
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
            ⚠ WhatsApp messages over 160 characters may be truncated
          </p>
        )}

        {/* Regenerate Button */}
        <button
          onClick={onRegenerate}
          className="mt-3 btn-outline !px-4 !py-2 !text-sm"
          id="regenerate-message-btn"
        >
          <IconRefresh size={15} />
          Regenerate message
        </button>
      </div>

      {/* Right: Phone Mockup */}
      <div className="flex justify-center">
        <div className="w-72 relative">
          {/* Phone Frame */}
          <div className="rounded-[2.5rem] border border-white/[0.1] bg-white/[0.03] p-2 shadow-2xl backdrop-blur-sm">
            {/* Notch */}
            <div className="flex justify-center mb-2">
              <div className="w-24 h-5 rounded-full bg-white/[0.06]" />
            </div>

            {/* Screen */}
            <div className="rounded-[2rem] bg-white/[0.03] min-h-[420px] p-4 flex flex-col">
              {/* Chat Header */}
              <div className="flex items-center gap-3 pb-3 border-b border-white/[0.06] mb-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#B4506E] to-[#7C3AED] flex items-center justify-center">
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
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedChannel}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={`rounded-2xl rounded-tl-sm p-3.5 max-w-[90%] ${
                    selectedChannel === 'whatsapp'
                      ? 'bg-emerald-900/20 border border-emerald-500/15'
                      : 'bg-blue-900/20 border border-blue-500/15'
                  }`}
                >
                  <p className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap">
                    {editedMessage || 'Your message will appear here...'}
                  </p>
                  <p className="text-[10px] text-text-muted mt-2 text-right">
                    {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function ChannelTab({
  label,
  icon,
  active,
  color,
  onClick,
}: {
  label: string
  icon: React.ReactNode
  active: boolean
  color: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
        active
          ? 'bg-white/[0.08] text-text-primary shadow-sm'
          : 'text-text-muted hover:text-text-secondary'
      }`}
    >
      <div className={`w-2 h-2 rounded-full ${active ? color : 'bg-text-muted'}`} />
      {icon}
      {label}
    </button>
  )
}
