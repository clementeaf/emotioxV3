import { useState, useEffect } from 'react';
import { usersService, type User, type CreateUserData } from '../../services/users.service';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Card } from '../../components/ui/Card';
import { useToast } from '../../hooks/useToast';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';

export const UserManagementPage = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const { success, error } = useToast();

    // Form state
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState<CreateUserData>({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        role: 'user'
    });

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const data = await usersService.getUsers();
            setUsers(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load users', err);
            // Don't show toast on load error to avoid spam if endpoint doesn't exist yet
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        try {
            if (editingUser) {
                await usersService.updateUser(editingUser.id, formData);
                success('Usuario actualizado exitosamente');
            } else {
                await usersService.createUser(formData);
                success('Usuario creado exitosamente');
            }
            setIsModalOpen(false);
            loadUsers();
            resetForm();
        } catch (err: unknown) {
            console.error('Submit error:', err);
            // Extract error message from axios response or error object
            let errorMessage = 'Error al guardar usuario';

            if (err && typeof err === 'object' && 'response' in err) {
                // Axios error
                const axiosError = err as { response: { data: { error: string } } };
                if (axiosError.response?.data?.error) {
                    errorMessage = axiosError.response.data.error;
                }
            } else if (err instanceof Error) {
                errorMessage = err.message;
            }

            setErrorMsg(errorMessage);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await usersService.deleteUser(deleteId);
            success('Usuario eliminado');
            loadUsers();
        } catch {
            error('Error al eliminar usuario');
        } finally {
            setDeleteId(null);
        }
    };

    const openEdit = (user: User) => {
        setEditingUser(user);
        setErrorMsg(null);
        setFormData({
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            role: user.role || 'user',
            password: '' // Don't fill password on edit
        });
        setIsModalOpen(true);
    };

    const openCreate = () => {
        setEditingUser(null);
        setErrorMsg(null);
        resetForm();
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setFormData({
            first_name: '',
            last_name: '',
            email: '',
            password: '',
            role: 'user'
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios (Público)</h1>
                        <p className="text-gray-500">Administración de usuarios sin autenticación requerida</p>
                    </div>
                    <Button onClick={openCreate} variant="primary">
                        Nuevo Usuario
                    </Button>
                </div>

                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-4 text-center text-gray-500">Cargando...</td>
                                    </tr>
                                ) : users.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-4 text-center text-gray-500">No hay usuarios registrados</td>
                                    </tr>
                                ) : (
                                    users.map((user) => (
                                        <tr key={user.id}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{user.first_name} {user.last_name}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-500">{user.email}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                                    {user.role || 'user'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => openEdit(user)}
                                                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={() => setDeleteId(user.id)}
                                                    className="text-red-600 hover:text-red-900"
                                                >
                                                    Eliminar
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Modal Creación/Edición */}
                <Modal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    title={editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                >
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {errorMsg && (
                            <div className="p-3 text-sm text-red-700 bg-red-100 rounded-md">
                                {errorMsg}
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Nombre"
                                value={formData.first_name}
                                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                required
                            />
                            <Input
                                label="Apellido"
                                value={formData.last_name}
                                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                required
                            />
                        </div>
                        <Input
                            label="Email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                        <Input
                            label={editingUser ? "Contraseña (dejar en blanco para mantener)" : "Contraseña"}
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required={!editingUser}
                        />
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                            <select
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            >
                                <option value="user">Usuario</option>
                                <option value="admin">Administrador</option>
                            </select>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" variant="primary">
                                Guardar
                            </Button>
                        </div>
                    </form>
                </Modal>

                {/* Confirmación Eliminar */}
                <ConfirmationModal
                    isOpen={!!deleteId}
                    onClose={() => setDeleteId(null)}
                    onConfirm={handleDelete}
                    title="Eliminar Usuario"
                    message="¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer."
                    confirmText="Eliminar"
                    cancelText="Cancelar"
                    variant="danger"
                />
            </div>
        </div>
    );
};
