/**
 * SegmentPreview — displays customer segment statistics.
 *
 * Shows a large animated customer count, descriptive subtitle,
 * stats grid with average order value, top city, and top product,
 * and a potential revenue callout.
 */

import { motion } from 'framer-motion'
import { IconMapPin, IconShoppingBag, IconReceipt } from '@tabler/icons-react'
import type { SegmentStats } from '../services/api'

interface SegmentPreviewProps {
  stats: SegmentStats
  customerCount: number
}

export default function SegmentPreview({ stats, customerCount }: SegmentPreviewProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Giant Counter */}
      <div className="text-center mb-8">
        <motion.p
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="text-7xl font-extrabold text-text-primary mb-2 tabular-nums"
        >
          {customerCount.toLocaleString('en-IN')}
        </motion.p>
        <p className="text-text-secondary text-lg">
          customers will receive this campaign
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        <StatTile
          label="Avg Order Value"
          value={`₹${stats.avg_order_value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          icon={<IconReceipt size={16} />}
          delay={0.1}
        />
        <StatTile
          label="Top City"
          value={stats.top_cities[0] ?? '—'}
          icon={<IconMapPin size={16} />}
          delay={0.2}
        />
        <StatTile
          label="Top Product"
          value={stats.top_products[0] ?? '—'}
          icon={<IconShoppingBag size={16} />}
          delay={0.3}
        />
      </div>

      {/* Potential Revenue */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-4 p-4 rounded-xl bg-emerald-400/5 border border-emerald-400/10 text-center"
      >
        <p className="text-xs text-emerald-400/70 mb-1">Potential Revenue</p>
        <p className="text-2xl font-bold text-emerald-400">
          ₹{stats.total_potential_revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </p>
      </motion.div>
    </motion.div>
  )
}

function StatTile({
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass-card p-4 text-center"
    >
      <div className="flex items-center justify-center gap-1.5 mb-1.5">
        <span className="text-text-muted">{icon}</span>
        <p className="text-xs text-text-muted">{label}</p>
      </div>
      <p className="text-lg font-semibold text-text-primary">{value}</p>
    </motion.div>
  )
}
