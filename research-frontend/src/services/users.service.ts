import apiClient from './api/client';


export interface User {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role?: string;
    created_at?: string;
}

export interface CreateUserData {
    first_name: string;
    last_name: string;
    email: string;
    password?: string;
    role?: string;
}

export interface UpdateUserData {
    first_name?: string;
    last_name?: string;
    email?: string;
    role?: string;
    password?: string;
}

class UsersService {

    async getUsers(): Promise<User[]> {
        // Construct URL manually since 'users' category might not exist in config
        const url = '/users';
        const response = await apiClient.get<{ users: User[] }>(url);
        return response.users;
    }

    async getUser(id: string): Promise<User> {
        const url = `/users/${id}`;
        const response = await apiClient.get<{ user: User }>(url);
        return response.user;
    }

    async createUser(data: CreateUserData): Promise<User> {
        const url = '/users';
        const response = await apiClient.post<{ user: User }>(url, data);
        return response.user;
    }

    async updateUser(id: string, data: UpdateUserData): Promise<User> {
        const url = `/users/${id}`;
        const response = await apiClient.put<{ user: User }>(url, data);
        return response.user;
    }

    async deleteUser(id: string): Promise<void> {
        const url = `/users/${id}`;
        await apiClient.delete(url);
    }
}

export const usersService = new UsersService();
