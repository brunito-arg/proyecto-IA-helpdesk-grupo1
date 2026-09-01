import { useState, useRef, useEffect } from 'react'

const MENSAJE_ERROR = 'No se pudo contactar al asistente. Verificá que el servicio esté corriendo.'

export default function Asistente() {
  const [mensajes, setMensajes] = useState([])
  const [entrada, setEntrada] = useState('')
  const [enviando, setEnviando] = useState(false)
  const finRef = useRef(null)

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  const enviar = async (e) => {
    e.preventDefault()
    const pregunta = entrada.trim()
    if (!pregunta || enviando) return

    const historial = mensajes
      .filter((m) => !m.error)
      .slice(-8)
      .map(({ role, content }) => ({ role, content }))

    setMensajes((prev) => [
      ...prev,
      { role: 'user', content: pregunta },
      { role: 'assistant', content: '' },
    ])
    setEntrada('')
    setEnviando(true)

    try {
      const res = await fetch('/asistente-api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensaje: pregunta,
          historial,
          token: localStorage.getItem('token'),
        }),
      })

      if (!res.ok || !res.body) throw new Error('respuesta inválida')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const partes = buffer.split('\n\n')
        buffer = partes.pop()
        for (const parte of partes) {
          const linea = parte.trim()
          if (!linea.startsWith('data:')) continue
          const data = linea.slice(5).trim()
          if (data === '[DONE]') continue
          try {
            const payload = JSON.parse(data)
            if (payload.token) {
              setMensajes((prev) => {
                const copia = [...prev]
                copia[copia.length - 1] = {
                  ...copia[copia.length - 1],
                  content: copia[copia.length - 1].content + payload.token,
                }
                return copia
              })
            }
            if (payload.error) {
              setMensajes((prev) => {
                const copia = [...prev]
                copia[copia.length - 1] = { role: 'assistant', content: payload.error, error: true }
                return copia
              })
            }
          } catch {
            continue
          }
        }
      }

      setMensajes((prev) => {
        if (prev[prev.length - 1]?.content) return prev
        const copia = [...prev]
        copia[copia.length - 1] = { role: 'assistant', content: MENSAJE_ERROR, error: true }
        return copia
      })
    } catch {
      setMensajes((prev) => {
        const copia = [...prev]
        copia[copia.length - 1] = { role: 'assistant', content: MENSAJE_ERROR, error: true }
        return copia
      })
    } finally {
      setEnviando(false)
    }
  }

  const limpiar = () => {
    if (enviando) return
    setMensajes([])
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Asistente</h1>
        <button onClick={limpiar}
          className="bg-white border px-3 py-1 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
          disabled={enviando}>
          Limpiar conversación
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-white rounded-lg shadow p-4 space-y-3">
        {mensajes.length === 0 && (
          <p className="text-center text-gray-500 mt-8">
            Hola! Preguntame sobre el proyecto helpdesk (roles, incidencias, configuración, etc.)
          </p>
        )}
        {mensajes.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] px-4 py-2 rounded-lg whitespace-pre-wrap ${
              m.role === 'user'
                ? 'bg-indigo-700 text-white'
                : m.error
                  ? 'bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-800'
            }`}>
              {m.content || (enviando && i === mensajes.length - 1 ? '...' : '')}
            </div>
          </div>
        ))}
        <div ref={finRef} />
      </div>

      <form onSubmit={enviar} className="mt-4 flex gap-2">
        <input
          value={entrada}
          onChange={(e) => setEntrada(e.target.value)}
          placeholder="Escribí tu consulta..."
          className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          disabled={enviando}
        />
        <button type="submit"
          className="bg-indigo-700 text-white px-4 py-2 rounded hover:bg-indigo-800 disabled:opacity-50"
          disabled={enviando || !entrada.trim()}>
          Enviar
        </button>
      </form>
    </div>
  )
}
