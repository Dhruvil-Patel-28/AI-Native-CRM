/**
 * ModeSwitcher — animated pill toggle for Guided ↔ Autopilot modes.
 *
 * Uses framer-motion layoutId for the smooth sliding indicator.
 * Displays "✦ Guided" and "⚡ Autopilot" labels.
 */

import { motion } from 'framer-motion'
import { IconSparkles, IconBolt } from '@tabler/icons-react'

export type DashboardMode = 'guided' | 'autopilot'

interface ModeSwitcherProps {
  mode: DashboardMode
  onModeChange: (mode: DashboardMode) => void
}

export default function ModeSwitcher({ mode, onModeChange }: ModeSwitcherProps) {
  return (
    <div className="mode-switcher" id="mode-switcher">
      <button
        className={`mode-switcher-btn ${mode === 'guided' ? 'active' : ''}`}
        onClick={() => onModeChange('guided')}
        id="mode-guided-btn"
      >
        <IconSparkles size={14} />
        Guided
      </button>
      <button
        className={`mode-switcher-btn ${mode === 'autopilot' ? 'active' : ''}`}
        onClick={() => onModeChange('autopilot')}
        id="mode-autopilot-btn"
      >
        <IconBolt size={14} />
        Autopilot
      </button>

      {/* Sliding indicator */}
      <motion.div
        className={`mode-switcher-indicator ${mode}`}
        layoutId="mode-indicator"
        style={{
          left: mode === 'guided' ? '3px' : '50%',
          width: 'calc(50% - 3px)',
        }}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 30,
        }}
      />
    </div>
  )
}
