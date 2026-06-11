/**
 * App — Root component with routing.
 *
 * Provides 7 routes wrapped inside the Layout shell:
 *   /                         → Dashboard
 *   /campaigns                → All Campaigns list
 *   /customers                → Customers overview + CSV upload
 *   /campaign/:insightId      → CampaignFlow (from insight)
 *   /campaign/nl/:sessionId   → CampaignFlow (from NL input)
 *   /autopilot/:runId         → AutopilotReview
 *   /results/:campaignId      → Results
 *
 * The Layout component manages the sidebar, mode state,
 * and background gradient transitions.
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import CampaignFlow from './pages/CampaignFlow'
import Results from './pages/Results'
import Campaigns from './pages/Campaigns'
import Customers from './pages/Customers'
import AutopilotReview from './pages/AutopilotReview'

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/campaign/:insightId" element={<CampaignFlow />} />
          <Route path="/campaign/nl/:sessionId" element={<CampaignFlow />} />
          <Route path="/autopilot/:runId" element={<AutopilotReview />} />
          <Route path="/results/:campaignId" element={<Results />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
