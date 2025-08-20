import { createContext } from 'react';

// 1. Definimos la interfaz para el valor del contexto
export interface AuthContextType {
    token: string | null;
    login: (token: string) => void;
    role: string;
    logout: () => void;
    isAuthenticated: boolean;
}

// 2. Creamos y exportamos el objeto de contexto
export const AuthContext = createContext<AuthContextType | undefined>(undefined);