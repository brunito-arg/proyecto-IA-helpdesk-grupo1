import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import { useAuth } from '../hooks/useAuth'

export default function Layout() {
  const { user } = useAuth()

  if (!user) {
    return <Outlet />
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  )
}
