/**
 * Customers — customer overview with stats and CSV upload.
 *
 * Shows aggregate customer metrics and provides a drag-and-drop
 * CSV upload interface for importing new customers and orders.
 */

import { useState, useRef } from 'react'
import { getCustomerStats, uploadCustomers, type CustomerStats, type UploadResult } from '../services/api'
import { useEffect } from 'react'

export default function Customers() {
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
        <h1 className="text-2xl font-bold text-text-primary mb-1">
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
              icon="👥"
            />
            <StatCard
              label="Total Revenue"
              value={`₹${stats.total_revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
              icon="💰"
            />
            <StatCard
              label="Campaigns Sent"
              value={stats.campaigns_sent.toString()}
              icon="📨"
            />
            <StatCard
              label="Avg Order Value"
              value={`₹${stats.avg_order_value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
              icon="🛒"
            />
          </>
        ) : null}
      </div>

      {/* CSV Upload Section */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-1">
          Import Customers
        </h2>
        <p className="text-sm text-text-muted mb-6">
          Upload a CSV file with columns: <code className="text-xs bg-surface-bg px-1.5 py-0.5 rounded">name, email, phone, city, order_date, amount, product_category</code>
        </p>

        {/* Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200 cursor-pointer ${
            dragActive
              ? 'border-accent bg-accent/5'
              : 'border-surface-border hover:border-accent/30 hover:bg-surface-hover/30'
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
              <div className="w-10 h-10 rounded-full border-2 border-accent border-t-transparent animate-spin mb-3" />
              <p className="text-text-secondary font-medium">Uploading...</p>
            </div>
          ) : (
            <>
              <svg className="w-10 h-10 text-text-muted mx-auto mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
              </svg>
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
          <div className="mt-4 p-4 rounded-lg bg-emerald-400/5 border border-emerald-400/20 animate-fade-in">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              <p className="text-sm font-medium text-emerald-400">Upload successful</p>
            </div>
            <p className="text-xs text-text-secondary">
              Imported {uploadResult.customers_imported} new customers and {uploadResult.orders_imported} orders
            </p>
          </div>
        )}

        {/* Upload Error */}
        {uploadError && (
          <div className="mt-4 p-4 rounded-lg bg-error/5 border border-error/20 animate-fade-in">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-error" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
              <p className="text-sm text-error">{uploadError}</p>
            </div>
          </div>
        )}
      </div>

      {/* CSV Format Guide */}
      <div className="glass-card p-6 mt-4">
        <h3 className="text-sm font-semibold text-text-primary mb-3">CSV Format Example</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-surface-border">
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
              <tr className="border-b border-surface-border/50">
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
      </div>
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="glass-card p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <p className="text-xs text-text-muted">{label}</p>
      </div>
      <p className="text-2xl font-bold text-text-primary">{value}</p>
    </div>
  )
}
