import apiClient from './apiClient';

export interface LoginPayload {
    username: string;
    password: string;
}

export interface LoginResponse {
    idToken: string;
}

export interface RegisterPayload {
    username: string;
    password: string;
    authorities: string[];
}

/**
 * Realiza la petición de login al backend.
 */
export const loginUser = async (credentials: LoginPayload): Promise<LoginResponse> => {
    const { data } = await apiClient.post<LoginResponse>('/auth/login', credentials);
    return data;
};

/**
 * Realiza la petición de registro al backend.
 */
export const registerUser = async (userData: RegisterPayload): Promise<void> => {
    await apiClient.post('/auth/register', userData);
};