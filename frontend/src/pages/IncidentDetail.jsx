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
  const [comentarios, setComentarios] = useState([])
  const [nuevoComentario, setNuevoComentario] = useState('')
  const [nota, setNota] = useState('')
  const [cerrando, setCerrando] = useState(false)

  useEffect(() => {
    api.get(`/incidents/${id}`).then((res) => setIncident(res.data))
    api.get('/users/tecnicos').then((res) => setTecnicos(res.data))
    api.get(`/incidents/${id}/comments`).then((res) => setComentarios(res.data))
  }, [id])

  const cargarComentarios = () => {
    api.get(`/incidents/${id}/comments`).then((res) => setComentarios(res.data))
  }

  const agregarComentario = async () => {
    if (!nuevoComentario.trim()) return
    try {
      await api.post(`/incidents/${id}/comments`, { contenido: nuevoComentario })
      setNuevoComentario('')
      cargarComentarios()
    } catch (error) {
      alert(error.response?.data?.error || 'Error al agregar comentario')
    }
  }

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

  const cerrarIncidente = async () => {
    setCerrando(true)
    try {
      await api.put(`/incidents/${id}/close`, { nota })
      const res = await api.get(`/incidents/${id}`)
      setIncident(res.data)
      setNota('')
    } finally {
      setCerrando(false)
    }
  }

  const eliminarIncidente = async () => {
    if (!window.confirm('¿Eliminar este incidente de forma permanente?')) return
    try {
      await api.delete(`/incidents/${id}`)
      navigate('/')
    } catch (error) {
      alert(error.response?.data?.error || 'Error al eliminar el incidente')
    }
  }

  if (!incident) return <p className="text-center py-10">Cargando...</p>

  const puedeCambiarEstado = user?.rol === 'ADMIN'
  const puedeCerrar = user?.rol === 'ADMIN' || user?.rol === 'TECNICO'

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

        {incident.githubIssueUrl && (
          <div className="mb-4">
            <a href={incident.githubIssueUrl} target="_blank" rel="noreferrer"
              className="text-indigo-700 hover:underline text-sm">
              Ver issue de GitHub
            </a>
          </div>
        )}

        {incident.notaResolucion && (
          <div className="mb-4">
            <h2 className="font-medium mb-2">Nota de resolución</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{incident.notaResolucion}</p>
          </div>
        )}

        <div className="border-t pt-4 mt-4">
          <h2 className="font-medium mb-2">Comentarios</h2>
          <div className="space-y-3 mb-4">
            {comentarios.length === 0 && (
              <p className="text-gray-500 text-sm">Sin comentarios aún</p>
            )}
            {comentarios.map((c) => (
              <div key={c.id} className="bg-gray-50 rounded p-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span className="font-medium text-gray-700">{c.usuarioNombre}</span>
                  <span>{new Date(c.fechaCreacion).toLocaleString()}</span>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap text-sm">{c.contenido}</p>
              </div>
            ))}
          </div>
          <textarea value={nuevoComentario} onChange={(e) => setNuevoComentario(e.target.value)}
            placeholder="Escribí un comentario..."
            rows="2"
            className="w-full border rounded px-3 py-2 mb-2"></textarea>
          <button onClick={agregarComentario}
            disabled={!nuevoComentario.trim()}
            className={`px-4 py-2 rounded text-sm ${!nuevoComentario.trim()
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-indigo-700 text-white hover:bg-indigo-800'}`}>
            Comentar
          </button>
        </div>

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

        {user && (
          <div className="border-t pt-4 mt-4">
            <h2 className="font-medium mb-2">Asignar Técnico</h2>
            <select onChange={(e) => asignarTecnico(e.target.value)} value={incident.tecnicoId || ''}
              className="border rounded px-3 py-2">
              <option value="" disabled>Seleccionar técnico</option>
              {tecnicos.map((t) => (
                <option key={t.id} value={t.id}>{t.nombre} ({t.email})</option>
              ))}
            </select>
          </div>
        )}

        {puedeCerrar && incident.estado !== 'CERRADO' && (
          <div className="border-t pt-4 mt-4">
            <h2 className="font-medium mb-2">Cerrar Incidente</h2>
            <textarea value={nota} onChange={(e) => setNota(e.target.value)}
              placeholder="Nota de resolución (obligatoria)"
              rows="3"
              className="w-full border rounded px-3 py-2 mb-3"></textarea>
            <button onClick={cerrarIncidente}
              disabled={!nota.trim() || cerrando}
              className={`px-4 py-2 rounded text-sm ${!nota.trim() || cerrando
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'}`}>
              {cerrando ? 'Cerrando...' : 'Cerrar Incidente'}
            </button>
          </div>
        )}

        {user?.rol === 'ADMIN' && (
          <div className="border-t pt-4 mt-4">
            <button onClick={eliminarIncidente}
              className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700">
              Eliminar Incidente
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
