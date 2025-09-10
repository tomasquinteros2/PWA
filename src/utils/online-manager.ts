import { onlineManager } from '@tanstack/react-query';


export function setupOnlineManager() {
    onlineManager.setEventListener(setOnline => {
        window.addEventListener('online', () => setOnline(true));
        window.addEventListener('offline', () => setOnline(false));
        
        return () => {
            window.removeEventListener('online', () => setOnline(true));
            window.removeEventListener('offline', () => setOnline(false));
        };
    });
}