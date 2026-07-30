import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../hooks/useAuth'

const statusColors = {
  ABIERTO: 'bg-yellow-100 text-yellow-800',
  EN_PROCESO: 'bg-blue-100 text-blue-800',
  RESUELTO: 'bg-green-100 text-green-800',
  CERRADO: 'bg-gray-100 text-gray-800',
}

const priorityColors = {
  BAJA: 'text-green-600',
  MEDIA: 'text-yellow-600',
  ALTA: 'text-orange-600',
  CRITICA: 'text-red-600',
}

export default function Dashboard() {
  const [incidents, setIncidents] = useState([])
  const [filter, setFilter] = useState('')
  const { user } = useAuth()

  useEffect(() => {
    api.get('/incidents').then((res) => setIncidents(res.data))
  }, [])

  const filtered = filter
    ? incidents.filter((i) => i.estado === filter)
    : incidents

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {user?.rol === 'ADMIN' || user?.rol === 'TECNICO' ? 'Todos los Incidentes' : 'Mis Incidentes'}
        </h1>
        <Link to="/create" className="bg-indigo-700 text-white px-4 py-2 rounded hover:bg-indigo-800">
          + Nuevo Incidente
        </Link>
      </div>

      <div className="mb-4 flex gap-2">
        {['', 'ABIERTO', 'EN_PROCESO', 'RESUELTO', 'CERRADO'].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded text-sm ${filter === s ? 'bg-indigo-700 text-white' : 'bg-white border'}`}>
            {s || 'Todos'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prioridad</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtered.map((inc) => (
              <tr key={inc.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <Link to={`/incidents/${inc.id}`} className="text-indigo-700 hover:underline font-medium">
                    {inc.titulo}
                  </Link>
                </td>
                <td className="px-6 py-4 text-sm">{inc.categoria}</td>
                <td className={`px-6 py-4 text-sm font-medium ${priorityColors[inc.prioridad]}`}>{inc.prioridad}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[inc.estado]}`}>
                    {inc.estado}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">{inc.usuarioNombre}</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(inc.fechaCreacion).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-500">No hay incidentes</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
