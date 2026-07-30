import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

export default function CreateIncident() {
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [categoria, setCategoria] = useState('OTRO')
  const [prioridad, setPrioridad] = useState('MEDIA')
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const formData = new FormData()
      formData.append('data', new Blob([JSON.stringify({ titulo, descripcion, categoria, prioridad })], {
        type: 'application/json',
      }))
      if (file) formData.append('file', file)

      await api.post('/incidents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear incidente')
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Nuevo Incidente</h1>
      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Título</label>
          <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)}
            className="w-full border rounded px-3 py-2" required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Descripción</label>
          <textarea rows="4" value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
            className="w-full border rounded px-3 py-2" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Categoría</label>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)}
              className="w-full border rounded px-3 py-2">
              <option value="HARDWARE">Hardware</option>
              <option value="SOFTWARE">Software</option>
              <option value="RED">Red</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Prioridad</label>
            <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)}
              className="w-full border rounded px-3 py-2">
              <option value="BAJA">Baja</option>
              <option value="MEDIA">Media</option>
              <option value="ALTA">Alta</option>
              <option value="CRITICA">Crítica</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Archivo adjunto (opcional)</label>
          <input type="file" onChange={(e) => setFile(e.target.files[0])}
            className="w-full text-sm" />
        </div>
        <button type="submit" className="w-full bg-indigo-700 text-white py-2 rounded hover:bg-indigo-800">
          Crear Incidente
        </button>
      </form>
    </div>
  )
}
