// C:/Users/tomas/Desktop/ecopila-pwa/src/api/apiClient.ts
import axios from 'axios';

// ✅ 1. Definimos un nombre de evento personalizado y único
const UNAUTHORIZED_EVENT = 'app:unauthorized';

// ✅ 2. Creamos una función helper para despachar el evento (opcional, pero limpio)
export const dispatchUnauthorizedEvent = () => {
    window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
};

const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8090/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor de request (está perfecto, sin cambios)
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// ✅ INTERCEPTOR DE RESPUESTA MEJORADO
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const isAuthError = error.response?.status === 401 || error.response?.status === 403;

        // Verificamos si el error es un 401 (No autorizado) o 403 (Prohibido)
        if (isAuthError) {
            // En lugar de recargar la página, disparamos un evento global.
            // Un componente de alto nivel (como AuthProvider) escuchará este evento.
            dispatchUnauthorizedEvent();
        }
        // Para cualquier otro error, lo devolvemos para que sea manejado por React Query
        return Promise.reject(error);
    }
);

export default apiClient;