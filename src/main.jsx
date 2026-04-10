import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './auth/AuthContext'

// Legacy redirect: old GH Pages base was /Kalgoh/, Vercel serves at /.
// Preserve any hash (Supabase auth callbacks come in via #access_token=... or
// #message=...) when redirecting from the old path.
if (window.location.pathname.startsWith('/Kalgoh')) {
  const newUrl = window.location.origin + '/' + window.location.search + window.location.hash;
  window.history.replaceState(null, '', newUrl);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
