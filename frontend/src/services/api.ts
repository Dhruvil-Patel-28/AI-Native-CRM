/**
 * API service — typed functions for every CRM backend call.
 *
 * Uses axios with the base URL from VITE_API_URL. All functions
 * return typed responses and handle errors gracefully (return null
 * on failure, log to console).
 */

import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
})

// ─── Types ───────────────────────────────────────────────────

export interface Insight {
  id: string
  insight_type: string
  insight_text: string
  segment_data: Record<string, unknown> | null
  priority: number
  created_at: string
  is_acted_on: boolean
  stat: string | null
  potential_revenue: string | null
}

export interface SegmentStats {
  count: number
  avg_order_value: number
  top_cities: string[]
  top_products: string[]
  total_potential_revenue: number
}

export interface CampaignPreview {
  intent_text: string
  segment_params: Record<string, unknown>
  whatsapp_message: string
  email_message: string
  channel_recommendation: string
  channel_reason: string
  segment_stats: SegmentStats
  customer_count: number
}

export interface NLPreviewResponse extends CampaignPreview {
  session_id: string
  campaign_name: string
}

export interface AutopilotPlan {
  run_id: string
  goal: string
  reasoning: string
  segment_params: Record<string, unknown>
  customer_count: number
  segment_stats: SegmentStats
  channel: string
  message: string
  message_reasoning: string
  plan_title: string
  plan_summary: string
  confidence: string
  risk: string
  expected_revenue: number
  campaign_name: string
}



export interface Campaign {
  id: string
  name: string
  insight_id: string | null
  segment_query: Record<string, unknown> | null
  channel: string
  status: string
  created_at: string
  total_sent: number
  total_delivered: number
  total_opened: number
  total_clicked: number
  total_failed: number
  revenue_attributed: number
  ai_summary?: string | null
}

export interface MessageRecord {
  id: string
  campaign_id: string
  customer_id: string
  message_text: string
  channel: string
  status: string
  sent_at: string
  delivered_at: string | null
  opened_at: string | null
  clicked_at: string | null
  customer_name: string | null
}

export interface CampaignStatus {
  campaign: Campaign
  recent_messages: MessageRecord[]
}

export interface CustomerStats {
  total_customers: number
  total_revenue: number
  campaigns_sent: number
  avg_order_value: number
}

export interface UploadResult {
  customers_imported: number
  orders_imported: number
}

// ─── API Functions ───────────────────────────────────────────

export async function getInsights(): Promise<Insight[] | null> {
  try {
    const response = await api.get<Insight[]>('/insights')
    return response.data
  } catch (error) {
    console.error('Failed to fetch insights:', error)
    return null
  }
}

export async function previewCampaign(
  insightId: string,
  refinement: string = ''
): Promise<CampaignPreview | null> {
  try {
    const response = await api.post<CampaignPreview>('/campaigns/preview', {
      insight_id: insightId,
      refinement_text: refinement,
    })
    return response.data
  } catch (error) {
    console.error('Failed to preview campaign:', error)
    return null
  }
}

export async function nlPreviewCampaign(
  nlInput: string,
  sessionId?: string,
  refinement?: string
): Promise<NLPreviewResponse | null> {
  try {
    const response = await api.post<NLPreviewResponse>('/campaigns/nl-preview', {
      nl_input: nlInput,
      session_id: sessionId,
      refinement_text: refinement,
    })
    return response.data
  } catch (error) {
    console.error('Failed to parse NL preview:', error)
    return null
  }
}

export async function getNLSession(sessionId: string): Promise<NLPreviewResponse | null> {
  try {
    const response = await api.get<NLPreviewResponse>(`/campaigns/nl-session/${sessionId}`)
    return response.data
  } catch (error) {
    console.error('Failed to retrieve NL session:', error)
    return null
  }
}


export async function confirmCampaign(data: {
  insight_id: string
  campaign_name: string
  message_text: string
  channel: string
  segment_params: Record<string, unknown>
}): Promise<{ campaign_id: string } | null> {
  try {
    const response = await api.post<{ campaign_id: string; customer_count: number; status: string }>(
      '/campaigns/confirm',
      data
    )
    return { campaign_id: response.data.campaign_id }
  } catch (error) {
    console.error('Failed to confirm campaign:', error)
    return null
  }
}

export async function getCampaignStatus(id: string): Promise<CampaignStatus | null> {
  try {
    const response = await api.get<CampaignStatus>(`/campaigns/${id}/status`)
    return response.data
  } catch (error) {
    console.error('Failed to fetch campaign status:', error)
    return null
  }
}

export async function getCampaigns(): Promise<Campaign[] | null> {
  try {
    const response = await api.get<Campaign[]>('/campaigns')
    return response.data
  } catch (error) {
    console.error('Failed to fetch campaigns:', error)
    return null
  }
}

export async function getCustomerStats(): Promise<CustomerStats | null> {
  try {
    const response = await api.get<CustomerStats>('/customers/stats')
    return response.data
  } catch (error) {
    console.error('Failed to fetch customer stats:', error)
    return null
  }
}

export async function uploadCustomers(file: File): Promise<UploadResult | null> {
  try {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post<UploadResult>('/customers/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  } catch (error) {
    console.error('Failed to upload customers:', error)
    return null
  }
}

export async function runAutopilot(goal: string): Promise<AutopilotPlan | null> {
  try {
    const response = await api.post<AutopilotPlan>('/autopilot/run', { goal })
    return response.data
  } catch (error) {
    console.error('Failed to run autopilot:', error)
    return null
  }
}

export async function getAutopilotPlan(runId: string): Promise<AutopilotPlan | null> {
  try {
    const response = await api.get<AutopilotPlan>(`/autopilot/${runId}`)
    return response.data
  } catch (error) {
    console.error('Failed to fetch autopilot plan:', error)
    return null
  }
}

export async function approveAutopilotPlan(runId: string): Promise<{ campaign_id: string } | null> {
  try {
    const response = await api.post<{ campaign_id: string }>(`/autopilot/${runId}/approve`)
    return response.data
  } catch (error) {
    console.error('Failed to approve autopilot plan:', error)
    return null
  }
}

export async function rejectAutopilotPlan(runId: string): Promise<{ status: string } | null> {
  try {
    const response = await api.post<{ status: string }>(`/autopilot/${runId}/reject`)
    return response.data
  } catch (error) {
    console.error('Failed to reject autopilot plan:', error)
    return null
  }
}

