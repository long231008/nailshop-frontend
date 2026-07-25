import { Route, Routes } from 'react-router-dom'
import Header from './components/Header'
import AuthCallbackPage from './pages/AuthCallbackPage'
import BookPage from './pages/BookPage'
import BranchDetailPage from './pages/BranchDetailPage'
import BranchesPage from './pages/BranchesPage'
import LoginPage from './pages/LoginPage'
import MyAccountPage from './pages/MyAccountPage'

function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<BranchesPage />} />
        <Route path="/branches/:branchId" element={<BranchDetailPage />} />
        <Route path="/book" element={<BookPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/me" element={<MyAccountPage />} />
      </Routes>
    </>
  )
}

export default App
