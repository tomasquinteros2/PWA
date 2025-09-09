import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './context/AuthProvider';
import { CartProvider } from './context/CartProvider.tsx';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createIDBPersister } from './utils/idb-persister';
import { setupOnlineManager } from './utils/online-manager.ts';
import { createProduct, updateProduct, deleteProduct } from './api/productsApi.ts';
import './index.css';

setupOnlineManager();

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            networkMode: 'offlineFirst',
            refetchOnWindowFocus: false,
            staleTime: 1000 * 60 * 5,
            gcTime: 1000 * 60 * 60 * 24,
        },
        mutations: {
            retry: (_failureCount, error) => {
                if (error.message.includes('Network Error') || error.message.includes('Failed to fetch')) {
                    return true;
                }

                return false;
            },
        },
    },
});

queryClient.setMutationDefaults(['createProduct'], { mutationFn: createProduct });
queryClient.setMutationDefaults(['updateProduct'], { mutationFn: updateProduct });
queryClient.setMutationDefaults(['deleteProduct'], { mutationFn: deleteProduct });

const queryPersister = createIDBPersister('ecopila-cache');

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{
                persister: queryPersister,
            }}
            onSuccess={() => {
                queryClient.resumePausedMutations();
            }}
        >
            <AuthProvider>
                <CartProvider>
                    <App />
                </CartProvider>
            </AuthProvider>
        </PersistQueryClientProvider>
    </React.StrictMode>,
);