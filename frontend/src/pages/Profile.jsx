import { useAuth } from '../hooks/useAuth'

export default function Profile() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Mi Perfil</h1>
      <div className="bg-white p-6 rounded-lg shadow space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-500">Nombre</label>
          <p className="text-lg">{user.nombre}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-500">Email</label>
          <p className="text-lg">{user.email}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-500">Rol</label>
          <p className="text-lg">{user.rol}</p>
        </div>
        {user.fechaRegistro && (
          <div>
            <label className="block text-sm font-medium text-gray-500">Miembro desde</label>
            <p className="text-lg">{new Date(user.fechaRegistro).toLocaleDateString()}</p>
          </div>
        )}
      </div>
    </div>
  )
}
