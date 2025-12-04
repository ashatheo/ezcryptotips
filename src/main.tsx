import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { HederaWalletProvider } from './HederaWalletContext'
import { AuthProvider } from './contexts/AuthContext'
import { auth, db, googleProvider } from './firebase'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider firebaseAuth={auth} firebaseDb={db} googleProvider={googleProvider}>
      <HederaWalletProvider>
        <App />
      </HederaWalletProvider>
    </AuthProvider>
  </React.StrictMode>,
)