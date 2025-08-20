import { onlineManager } from '@tanstack/react-query';

// Esta función le dice a react-query que use los eventos del navegador
// para saber si hay o no conexión a internet.
export function setupOnlineManager() {
    onlineManager.setEventListener(setOnline => {
        window.addEventListener('online', () => setOnline(true));
        window.addEventListener('offline', () => setOnline(false));

        // Devolvemos una función de limpieza para que React la llame
        // cuando el componente se desmonte.
        return () => {
            window.removeEventListener('online', () => setOnline(true));
            window.removeEventListener('offline', () => setOnline(false));
        };
    });
}