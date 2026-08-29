import { useState, useEffect } from 'react'
import api from '../api/axios'

const roleColors = {
  USER: 'bg-gray-100 text-gray-800',
  TECNICO: 'bg-blue-100 text-blue-800',
  ADMIN: 'bg-purple-100 text-purple-800',
}

export default function AdminPanel() {
  const [users, setUsers] = useState([])
  const [allIncidents, setAllIncidents] = useState([])

  useEffect(() => {
    api.get('/users').then((res) => setUsers(res.data))
    api.get('/incidents').then((res) => setAllIncidents(res.data))
  }, [])

  const cambiarRol = async (userId, nuevoRol) => {
    await api.put(`/users/${userId}/rol`, nuevoRol, {
      headers: { 'Content-Type': 'text/plain' },
    })
    const res = await api.get('/users')
    setUsers(res.data)
  }

  const eliminarIncidente = async (id) => {
    if (!window.confirm('¿Eliminar este incidente de forma permanente?')) return
    try {
      await api.delete(`/incidents/${id}`)
      const res = await api.get('/incidents')
      setAllIncidents(res.data)
    } catch (error) {
      alert(error.response?.data?.error || 'Error al eliminar el incidente')
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Panel de Administración</h1>

      <div className="bg-white rounded-lg shadow mb-8">
        <h2 className="text-lg font-semibold p-4 border-b">Usuarios</h2>
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-6 py-4">{u.nombre}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{u.email}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColors[u.rol]}`}>{u.rol}</span>
                </td>
                <td className="px-6 py-4">
                  <select onChange={(e) => cambiarRol(u.id, e.target.value)} value={u.rol}
                    className="border rounded px-2 py-1 text-sm">
                    <option value="USER">USER</option>
                    <option value="TECNICO">TECNICO</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-lg shadow">
        <h2 className="text-lg font-semibold p-4 border-b">Todos los Incidentes ({allIncidents.length})</h2>
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Técnico</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prioridad</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {allIncidents.map((inc) => (
              <tr key={inc.id}>
                <td className="px-6 py-4">
                  <a href={`/incidents/${inc.id}`} className="text-indigo-700 hover:underline">{inc.titulo}</a>
                </td>
                <td className="px-6 py-4 text-sm">{inc.usuarioNombre}</td>
                <td className="px-6 py-4 text-sm">{inc.tecnicoNombre || '-'}</td>
                <td className="px-6 py-4"><span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">{inc.estado}</span></td>
                <td className="px-6 py-4 text-sm">{inc.prioridad}</td>
                <td className="px-6 py-4">
                  <button onClick={() => eliminarIncidente(inc.id)}
                    className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700">
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
