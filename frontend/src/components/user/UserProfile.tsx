'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
// useApi removed - migrated to domain architecture
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/AuthProvider';

interface UserProfile {
  name?: string;
  avatar?: string;
  bio?: string;
  preferences?: {
    emailNotifications: boolean;
    theme: 'light' | 'dark';
    language: string;
  };
}

interface User {
  id: string;
  email: string;
  profile?: UserProfile;
  createdAt: string;
  updatedAt: string;
}

interface UserProfileComponentProps {
  className?: string;
}

export function UserProfileComponent({ className }: UserProfileComponentProps) {
  // Legacy useApi removed - using domain architecture
  const { token } = useAuth();
  const isAuthenticated = !!token;
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UserProfile>({
    name: '',
    bio: '',
    avatar: '',
    preferences: {
      emailNotifications: true,
      theme: 'light',
      language: 'es',
    },
  });

  useEffect(() => {
    if (isAuthenticated) {
      fetchUserProfile();
    }
  }, [isAuthenticated]);

  const fetchUserProfile = async () => {
    setLoading(true);
    setError(null);

    try {
      // <<< Comentar llamada a api.user.get() >>>
      /*
      const response = await api.user.get();

      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        setUser(response.data);
        if (response.data.profile) {
          setFormData(response.data.profile);
        }
      }
      */
      // Placeholder para evitar error de no uso:
      throw new Error('Perfil no disponible temporalmente'); // Simular error ya que no hay datos

    } catch (err) {
      // setError('Error al cargar el perfil de usuario'); // Mantenido por el throw
      setError(err instanceof Error ? err.message : 'Error desconocido al cargar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name.includes('.')) {
      const [section, field] = name.split('.');
      const sectionKey = section as keyof UserProfile;
      const currentSectionValue = formData[sectionKey] || {};

      setFormData({
        ...formData,
        [section]: {
          ...currentSectionValue,
          [field]: value,
        },
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // <<< Comentar llamada a api.user.update() >>>
      /*
      const response = await api.user.update({
        profile: formData,
      });

      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        setUser(response.data);
        setIsEditing(false);
      }
      */
      // Placeholder:
      throw new Error('Actualización no disponible temporalmente'); // Simular error

    } catch (err) {
      // setError('Error al actualizar el perfil'); // Mantenido por el throw
      setError(err instanceof Error ? err.message : 'Error desconocido al actualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !user) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
        <button
          onClick={fetchUserProfile}
          className="ml-2 text-red-700 underline"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">No se encontró información del usuario</p>
      </div>
    );
  }

  return (
    <div className={cn('max-w-3xl mx-auto', className)}>
      <div className="bg-white rounded-xl border border-neutral-200/70 shadow-[0_6px_16px_-4px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="px-8 py-8">
          <header className="mb-6">
            <h1 className="text-lg font-semibold text-neutral-900">
              Perfil de Usuario
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Administra tu información personal y preferencias
            </p>
          </header>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-sm text-red-600 mb-4">
              {error}
            </div>
          )}

          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-1">
                  Nombre
                </label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name || ''}
                  onChange={handleInputChange}
                  placeholder="Tu nombre"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Biografía
                </label>
                <textarea
                  name="bio"
                  value={formData.bio || ''}
                  onChange={handleInputChange}
                  placeholder="Cuéntanos sobre ti"
                  className="w-full rounded-md border border-gray-200 p-2 min-h-[100px]"
                />
              </div>

              <div>
                <label htmlFor="avatar" className="block text-sm font-medium text-neutral-700 mb-1">
                  URL de Avatar
                </label>
                <Input
                  id="avatar"
                  name="avatar"
                  value={formData.avatar || ''}
                  onChange={handleInputChange}
                  placeholder="https://ejemplo.com/tu-avatar.jpg"
                />
              </div>

              <div className="flex items-center space-x-2 mt-4">
                <input
                  type="checkbox"
                  id="emailNotifications"
                  name="preferences.emailNotifications"
                  checked={formData.preferences?.emailNotifications || false}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      preferences: {
                        ...formData.preferences!,
                        emailNotifications: e.target.checked,
                      },
                    })
                  }
                  className="rounded border-gray-300"
                />
                <label htmlFor="emailNotifications" className="text-sm">
                  Recibir notificaciones por email
                </label>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                {user.profile?.avatar ? (
                  <img
                    src={user.profile.avatar}
                    alt={user.profile.name || 'Avatar'}
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-500 text-xl">
                      {user.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-semibold">
                    {user.profile?.name || 'Usuario'}
                  </h3>
                  <p className="text-gray-500">{user.email}</p>
                </div>
              </div>

              {user.profile?.bio && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-500">Biografía</h4>
                  <p className="mt-1">{user.profile.bio}</p>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-gray-100">
                <h4 className="text-sm font-medium text-gray-500">Preferencias</h4>
                <ul className="mt-2 space-y-1">
                  <li className="text-sm">
                    Notificaciones por email:{' '}
                    {user.profile?.preferences?.emailNotifications ? 'Activadas' : 'Desactivadas'}
                  </li>
                  <li className="text-sm">
                    Tema: {user.profile?.preferences?.theme === 'dark' ? 'Oscuro' : 'Claro'}
                  </li>
                  <li className="text-sm">
                    Idioma: {user.profile?.preferences?.language || 'Español'}
                  </li>
                </ul>
              </div>

              <div className="text-sm text-gray-500 mt-4 pt-4 border-t border-gray-100">
                <p>Miembro desde: {new Date(user.createdAt).toLocaleDateString()}</p>
                <p>Última actualización: {new Date(user.updatedAt).toLocaleDateString()}</p>
              </div>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-end px-8 py-4 bg-neutral-50 border-t border-neutral-100">
          {isEditing ? (
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                onClick={handleSubmit}
                loading={loading}
              >
                Guardar Cambios
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => setIsEditing(true)}
            >
              Editar Perfil
            </Button>
          )}
        </footer>
      </div>
    </div>
  );
}
