import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../../stores/auth.store';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';

const profileSchema = z.object({
    firstName: z.string().min(2, 'First name is required'),
    lastName: z.string().min(2, 'Last name is required'),
    email: z.string().email('Invalid email address'),
});

type ProfileForm = z.infer<typeof profileSchema>;

export const ProfilePage = () => {
    const { user, updateProfile, deleteAccount, isLoading, error } = useAuthStore();
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);

    const { register, handleSubmit, formState: { errors, isDirty } } = useForm<ProfileForm>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            firstName: user?.first_name || '',
            lastName: user?.last_name || '',
            email: user?.email || '',
        },
    });

    const onSubmit = async (data: ProfileForm) => {
        try {
            await updateProfile({
                first_name: data.firstName,
                last_name: data.lastName,
                email: data.email,
            });
        } catch {
            // Error handled by store
        }
    };

    const handleDeleteClick = () => {
        setDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        await deleteAccount();
    };

    return (
        <div className="h-full p-4 sm:p-6 overflow-y-auto">
            <div className="space-y-4 sm:space-y-6 max-w-2xl mx-auto">
                <Card>
                    <CardHeader>
                        <CardTitle>Profile Settings</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            {error && (
                                <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md border border-red-200">
                                    {error}
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Input
                                    id="firstName"
                                    label="First Name"
                                    {...register('firstName')}
                                    error={errors.firstName?.message}
                                />
                                <Input
                                    id="lastName"
                                    label="Last Name"
                                    {...register('lastName')}
                                    error={errors.lastName?.message}
                                />
                            </div>

                            <Input
                                id="email"
                                label="Email address"
                                type="email"
                                {...register('email')}
                                error={errors.email?.message}
                                disabled // Email usually shouldn't be changed easily without verification
                            />

                            <div className="flex justify-end">
                                <Button type="submit" isLoading={isLoading} disabled={!isDirty}>
                                    Save Changes
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <Card className="border-red-200">
                    <CardHeader>
                        <CardTitle className="text-red-600">Danger Zone</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-600 mb-4">
                            Once you delete your account, there is no going back. Please be certain.
                        </p>
                        <Button variant="danger" onClick={handleDeleteClick} isLoading={isLoading}>
                            Delete Account
                        </Button>
                    </CardContent>
                </Card>

                <ConfirmationModal
                    isOpen={deleteModalOpen}
                    onClose={() => setDeleteModalOpen(false)}
                    onConfirm={handleConfirmDelete}
                    title="Delete Account"
                    message="Are you sure you want to delete your account? This action cannot be undone."
                    confirmText="Delete Account"
                    cancelText="Cancel"
                    variant="danger"
                    isLoading={isLoading}
                />
            </div>
        </div>
    );
};
