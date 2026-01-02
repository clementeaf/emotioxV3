import pool from '../../config/database';
import { register } from '../auth/auth.service';

export interface CreateUserData {
    email: string;
    password?: string;
    first_name: string;
    last_name: string;
    role?: 'admin' | 'researcher' | 'user';
}

export interface UpdateUserData {
    email?: string;
    first_name?: string;
    last_name?: string;
    role?: string;
}

export const getAllUsers = async () => {
    try {
        const query = `
            SELECT id, email, first_name, last_name, role, created_at, updated_at, cognito_sub
            FROM users
            WHERE deleted_at IS NULL
            ORDER BY created_at DESC
        `;
        const result = await pool.query(query);
        return result.rows;
    } catch (error) {
        console.error('GetAllUsers error:', error);
        throw new Error('Failed to fetch users');
    }
};

export const getUserById = async (id: string) => {
    try {
        const query = `
            SELECT id, email, first_name, last_name, role, created_at, updated_at, cognito_sub
            FROM users
            WHERE id = $1 AND deleted_at IS NULL
        `;
        const result = await pool.query(query, [id]);
        if (result.rows.length === 0) {
            return null;
        }
        return result.rows[0];
    } catch (error) {
        console.error('GetUserById error:', error);
        throw new Error('Failed to fetch user');
    }
};

export const createUser = async (data: CreateUserData) => {
    // We reuse authService.register to ensure consistency with Cognito
    // If no password provided, generate a random one (since it's required by Cognito)
    // In a real scenario, we might want to send an invitation email
    const password = data.password || Math.random().toString(36).slice(-10) + 'A1!'; // Simple random password

    // Auth service register expects specific field names
    return await register({
        email: data.email,
        password: password,
        firstName: data.first_name,
        lastName: data.last_name,
        role: (data.role as 'admin' | 'researcher') || 'researcher'
    });
};

export const updateUser = async (id: string, data: UpdateUserData) => {
    try {
        const fields: string[] = [];
        const values: (string | undefined)[] = [];
        let idx = 1;

        if (data.first_name !== undefined) {
            fields.push(`first_name = $${idx++}`);
            values.push(data.first_name);
        }
        if (data.last_name !== undefined) {
            fields.push(`last_name = $${idx++}`);
            values.push(data.last_name);
        }
        if (data.email !== undefined) {
            fields.push(`email = $${idx++}`);
            values.push(data.email);
        }
        if (data.role !== undefined) {
            fields.push(`role = $${idx++}`);
            values.push(data.role);
        }

        if (fields.length === 0) {
            throw new Error('No fields to update');
        }

        values.push(id);
        const query = `
            UPDATE users 
            SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $${idx} 
            RETURNING id, email, first_name, last_name, role, created_at, updated_at
        `;

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            throw new Error('User not found');
        }

        return result.rows[0];
    } catch (error) {
        console.error('UpdateUser error:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to update user');
    }
};

export const deleteUser = async (id: string) => {
    try {
        const query = `
            UPDATE users
            SET deleted_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND deleted_at IS NULL
            RETURNING id
        `;
        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            throw new Error('User not found or already deleted');
        }

        return { message: 'User deleted successfully' };
    } catch (error) {
        console.error('DeleteUser error:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to delete user');
    }
};
