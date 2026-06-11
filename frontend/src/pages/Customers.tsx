/**
 * Customers — customer overview with stats and CSV upload.
 *
 * Shows aggregate customer metrics and provides a drag-and-drop
 * CSV upload interface for importing new customers and orders.
 */

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  IconUsers,
  IconCurrencyRupee,
  IconSend,
  IconShoppingCart,
  IconUpload,
  IconCheck,
  IconX,
} from '@tabler/icons-react'
import { getCustomerStats, uploadCustomers, type CustomerStats, type UploadResult } from '../services/api'
import { useMode } from '../components/Layout'

export default function Customers() {
  const { mode } = useMode()
  const [stats, setStats] = useState<CustomerStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const load = async () => {
      const data = await getCustomerStats()
      setStats(data)
      setLoading(false)
    }
    load()
  }, [])

  const handleUpload = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setUploadError('Please upload a CSV file.')
      return
    }

    setUploading(true)
    setUploadError(null)
    setUploadResult(null)

    const result = await uploadCustomers(file)
    if (result) {
      setUploadResult(result)
      // Refresh stats after upload
      const newStats = await getCustomerStats()
      setStats(newStats)
    } else {
      setUploadError('Upload failed. Please check the file format and try again.')
    }
    setUploading(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files[0]
    if (file) handleUpload(file)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleUpload(file)
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary mb-1 flex items-center gap-2">
          <IconUsers size={22} />
          Customers
        </h1>
        <p className="text-text-secondary text-sm">
          Manage your customer base and import new data
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {loading ? (
          <>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="glass-card p-5">
                <div className="skeleton h-3 w-20 mb-3" />
                <div className="skeleton h-7 w-16" />
              </div>
            ))}
          </>
        ) : stats ? (
          <>
            <StatCard
              label="Total Customers"
              value={stats.total_customers.toLocaleString('en-IN')}
              icon={<IconUsers size={18} />}
              delay={0}
            />
            <StatCard
              label="Total Revenue"
              value={`₹${stats.total_revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
              icon={<IconCurrencyRupee size={18} />}
              delay={0.05}
            />
            <StatCard
              label="Campaigns Sent"
              value={stats.campaigns_sent.toString()}
              icon={<IconSend size={18} />}
              delay={0.1}
            />
            <StatCard
              label="Avg Order Value"
              value={`₹${stats.avg_order_value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
              icon={<IconShoppingCart size={18} />}
              delay={0.15}
            />
          </>
        ) : null}
      </div>

      {/* CSV Upload Section */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-6"
      >
        <h2 className="text-lg font-semibold text-text-primary mb-1">
          Import Customers
        </h2>
        <p className="text-sm text-text-muted mb-6">
          Upload a CSV file with columns: <code className="text-xs bg-white/[0.06] px-1.5 py-0.5 rounded">name, email, phone, city, order_date, amount, product_category</code>
        </p>

        {/* Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-200 cursor-pointer ${
            dragActive
              ? mode === 'guided'
                ? 'border-[#B4506E] bg-[#B4506E]/5'
                : 'border-[#7C3AED] bg-[#7C3AED]/5'
              : 'border-white/[0.1] hover:border-white/[0.2] hover:bg-white/[0.02]'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          id="csv-upload-zone"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
            id="csv-file-input"
          />

          {uploading ? (
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white/60 animate-spin mb-3" />
              <p className="text-text-secondary font-medium">Uploading...</p>
            </div>
          ) : (
            <>
              <IconUpload size={32} className="text-text-muted mx-auto mb-3" />
              <p className="text-text-primary font-medium mb-1">
                Drop your CSV file here or click to browse
              </p>
              <p className="text-text-muted text-sm">
                Existing customers will be updated (matched by email)
              </p>
            </>
          )}
        </div>

        {/* Upload Result */}
        {uploadResult && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 rounded-xl bg-emerald-400/5 border border-emerald-400/20"
          >
            <div className="flex items-center gap-2 mb-1">
              <IconCheck size={16} className="text-emerald-400" />
              <p className="text-sm font-medium text-emerald-400">Upload successful</p>
            </div>
            <p className="text-xs text-text-secondary">
              Imported {uploadResult.customers_imported} new customers and {uploadResult.orders_imported} orders
            </p>
          </motion.div>
        )}

        {/* Upload Error */}
        {uploadError && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 rounded-xl bg-error/5 border border-error/20"
          >
            <div className="flex items-center gap-2">
              <IconX size={16} className="text-error" />
              <p className="text-sm text-error">{uploadError}</p>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* CSV Format Guide */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card p-6 mt-4"
      >
        <h3 className="text-sm font-semibold text-text-primary mb-3">CSV Format Example</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left py-2 px-3 text-text-muted font-medium">name</th>
                <th className="text-left py-2 px-3 text-text-muted font-medium">email</th>
                <th className="text-left py-2 px-3 text-text-muted font-medium">phone</th>
                <th className="text-left py-2 px-3 text-text-muted font-medium">city</th>
                <th className="text-left py-2 px-3 text-text-muted font-medium">order_date</th>
                <th className="text-left py-2 px-3 text-text-muted font-medium">amount</th>
                <th className="text-left py-2 px-3 text-text-muted font-medium">product_category</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/[0.04]">
                <td className="py-2 px-3 text-text-secondary">Priya Sharma</td>
                <td className="py-2 px-3 text-text-secondary">priya@email.com</td>
                <td className="py-2 px-3 text-text-secondary">+919876543210</td>
                <td className="py-2 px-3 text-text-secondary">Mumbai</td>
                <td className="py-2 px-3 text-text-secondary">2026-06-01</td>
                <td className="py-2 px-3 text-text-secondary">2499</td>
                <td className="py-2 px-3 text-text-secondary">Serum</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-text-secondary">Rahul Patel</td>
                <td className="py-2 px-3 text-text-secondary">rahul@email.com</td>
                <td className="py-2 px-3 text-text-secondary">+919123456789</td>
                <td className="py-2 px-3 text-text-secondary">Delhi</td>
                <td className="py-2 px-3 text-text-secondary">2026-05-15</td>
                <td className="py-2 px-3 text-text-secondary">1299</td>
                <td className="py-2 px-3 text-text-secondary">Sunscreen</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-text-muted mt-3">
          Valid categories: Moisturizer, Serum, Sunscreen, Cleanser, Toner
        </p>
      </motion.div>
    </div>
  )
}

function StatCard({
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
      className="glass-card p-5"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-text-muted">{icon}</span>
        <p className="text-xs text-text-muted">{label}</p>
      </div>
      <p className="text-2xl font-bold text-text-primary">{value}</p>
    </motion.div>
  )
}
