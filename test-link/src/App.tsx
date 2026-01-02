import { Routes, Route, Navigate } from 'react-router-dom'
import Complete from './pages/Complete'
import Disqualified from './pages/Disqualified'
import Overquota from './pages/Overquota'

// Detect subdomain from hostname
function getDefaultRoute(): string {
  const hostname = window.location.hostname

  if (hostname.startsWith('complete.')) return '/complete'
  if (hostname.startsWith('disqualified.')) return '/disqualified'
  if (hostname.startsWith('overquota.')) return '/overquota'

  // Default fallback
  return '/complete'
}

function App() {
  const defaultRoute = getDefaultRoute()

  return (
    <Routes>
      <Route path="/" element={<Navigate to={defaultRoute} replace />} />
      <Route path="/complete" element={<Complete />} />
      <Route path="/disqualified" element={<Disqualified />} />
      <Route path="/overquota" element={<Overquota />} />
    </Routes>
  )
}

export default App
