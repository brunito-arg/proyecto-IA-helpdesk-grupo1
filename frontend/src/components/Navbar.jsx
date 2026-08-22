import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="bg-indigo-700 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center space-x-4">
            <Link to="/" className="text-xl font-bold">Helpdesk</Link>
            <Link to="/dashboard" className="hover:text-indigo-200">Mis Incidentes</Link>
            <Link to="/create" className="hover:text-indigo-200">Nuevo Incidente</Link>
            <Link to="/asistente" className="hover:text-indigo-200">Asistente</Link>
            {user?.rol === 'ADMIN' && (
              <Link to="/admin" className="hover:text-indigo-200">Admin</Link>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm">{user?.nombre} ({user?.rol})</span>
            <Link to="/profile" className="hover:text-indigo-200">Perfil</Link>
            <button onClick={handleLogout} className="bg-red-500 px-3 py-1 rounded hover:bg-red-600">
              Salir
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
