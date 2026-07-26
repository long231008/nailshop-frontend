import { Navigate, Route, Routes } from 'react-router-dom'
import Footer from './components/Footer'
import Header from './components/Header'
import AuthCallbackPage from './pages/AuthCallbackPage'
import BranchDetailPage from './pages/BranchDetailPage'
import BranchesPage from './pages/BranchesPage'
import CartPage from './pages/CartPage'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import MyAccountPage from './pages/MyAccountPage'
import SchedulePage from './pages/SchedulePage'

function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<BranchesPage />} />
        <Route path="/branches/:branchId" element={<BranchDetailPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/book" element={<Navigate to="/cart" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/me" element={<MyAccountPage />} />
        <Route path="/schedule" element={<SchedulePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
      <Footer />
    </>
  )
}

export default App
