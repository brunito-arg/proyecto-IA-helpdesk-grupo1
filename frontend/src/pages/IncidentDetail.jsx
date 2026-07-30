import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../hooks/useAuth'

const statusColors = {
  ABIERTO: 'bg-yellow-100 text-yellow-800',
  EN_PROCESO: 'bg-blue-100 text-blue-800',
  RESUELTO: 'bg-green-100 text-green-800',
  CERRADO: 'bg-gray-100 text-gray-800',
}

export default function IncidentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [incident, setIncident] = useState(null)
  const [tecnicos, setTecnicos] = useState([])

  useEffect(() => {
    api.get(`/incidents/${id}`).then((res) => setIncident(res.data))
    if (user?.rol === 'ADMIN') {
      api.get('/users/tecnicos').then((res) => setTecnicos(res.data))
    }
  }, [id, user])

  const cambiarEstado = async (estado) => {
    await api.put(`/incidents/${id}/status`, estado, {
      headers: { 'Content-Type': 'text/plain' },
    })
    const res = await api.get(`/incidents/${id}`)
    setIncident(res.data)
  }

  const asignarTecnico = async (tecnicoId) => {
    await api.put(`/incidents/${id}/assign/${tecnicoId}`)
    const res = await api.get(`/incidents/${id}`)
    setIncident(res.data)
  }

  if (!incident) return <p className="text-center py-10">Cargando...</p>

  const puedeCambiarEstado = user?.rol === 'ADMIN' || user?.rol === 'TECNICO'

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => navigate(-1)} className="text-indigo-700 hover:underline mb-4 block">&larr; Volver</button>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-2xl font-bold">{incident.titulo}</h1>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[incident.estado]}`}>
            {incident.estado}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div><span className="font-medium">Categoría:</span> {incident.categoria}</div>
          <div><span className="font-medium">Prioridad:</span> {incident.prioridad}</div>
          <div><span className="font-medium">Creado por:</span> {incident.usuarioNombre}</div>
          <div><span className="font-medium">Técnico asignado:</span> {incident.tecnicoNombre || 'Sin asignar'}</div>
          <div><span className="font-medium">Fecha:</span> {new Date(incident.fechaCreacion).toLocaleString()}</div>
          <div><span className="font-medium">Última actualización:</span> {new Date(incident.fechaActualizacion).toLocaleString()}</div>
        </div>

        <div className="mb-4">
          <h2 className="font-medium mb-2">Descripción</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{incident.descripcion}</p>
        </div>

        {incident.archivoUrl && (
          <div className="mb-4">
            <a href={`/uploads/${incident.archivoUrl}`} target="_blank" rel="noreferrer"
              className="text-indigo-700 hover:underline text-sm">
              📎 Descargar archivo adjunto
            </a>
          </div>
        )}

        {puedeCambiarEstado && (
          <div className="border-t pt-4 mt-4">
            <h2 className="font-medium mb-2">Cambiar Estado</h2>
            <div className="flex gap-2">
              {['ABIERTO', 'EN_PROCESO', 'RESUELTO', 'CERRADO'].map((s) => (
                <button key={s} onClick={() => cambiarEstado(s)}
                  disabled={incident.estado === s}
                  className={`px-3 py-1 rounded text-sm ${incident.estado === s
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {user?.rol === 'ADMIN' && !incident.tecnicoId && (
          <div className="border-t pt-4 mt-4">
            <h2 className="font-medium mb-2">Asignar Técnico</h2>
            <select onChange={(e) => asignarTecnico(e.target.value)} defaultValue=""
              className="border rounded px-3 py-2">
              <option value="" disabled>Seleccionar técnico</option>
              {tecnicos.map((t) => (
                <option key={t.id} value={t.id}>{t.nombre} ({t.email})</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  )
}
