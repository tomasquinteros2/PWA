import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Chip, Skeleton, Tooltip, Box, IconButton, CircularProgress } from '@mui/material';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import { toast } from 'react-hot-toast';
import { fetchDolar, forceDolarUpdate, type Dolar } from '../api/dolarApi';

export default function DolarDisplay() {
    const queryClient = useQueryClient();

    // 1. Query para obtener el valor (sin cambios)
    const { data, isLoading, isError, error } = useQuery<Dolar[]>({
        queryKey: ['dolar'],
        queryFn: fetchDolar,
        staleTime: 1000 * 60 * 5,
        refetchInterval: 1000 * 60 * 5,
        refetchOnWindowFocus: true,
    });

    // 2. ✅ NUEVO: Mutación para forzar la actualización
    const forceUpdateMutation = useMutation({
        mutationFn: forceDolarUpdate,
        onSuccess: (data) => {
            toast.success(data.message || 'Solicitud de actualización enviada.');
            // Después de que el backend confirma, invalidamos la query actual
            // para que React Query la vuelva a buscar automáticamente.
            setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: ['dolar'] });
            }, 1000); // Pequeño delay para dar tiempo al backend a procesar
        },
        onError: (error) => {
            toast.error(`Error al forzar la actualización: ${error.message}`);
        },
    });

    // Estados de carga y error de la query (sin cambios)
    if (isLoading) {
        return <Skeleton variant="rounded" width={100} height={32} sx={{ bgcolor: 'grey.700' }} />;
    }
    if (isError) {
        // ... (código de error sin cambios)
        return (
            <Tooltip title={`Error de red: ${error.message}`}>
                <Chip
                    icon={<AttachMoneyIcon />}
                    label="Error"
                    color="error"
                    variant="outlined"
                    size="small"
                />
            </Tooltip>
        );
    }

    const dolarValue = data?.[0]?.precio;
    const dolarNombre = data?.[0]?.nombre || "Valor del Dólar Actual";

    // Verificación de valor válido (sin cambios)
    if (typeof dolarValue !== 'number' || dolarValue <= 0) {
        // ... (código de valor no válido sin cambios)
        return (
            <Tooltip title="No se pudo obtener un valor de dólar válido desde el servidor.">
                <Chip
                    icon={<ErrorOutlineIcon />}
                    label="N/A"
                    color="warning"
                    variant="outlined"
                />
            </Tooltip>
        );
    }

    const formattedDolar = new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
    }).format(dolarValue);

    // 3. ✅ NUEVO: JSX que incluye el botón de refrescar
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Tooltip title={dolarNombre}>
                <Chip
                    icon={<AttachMoneyIcon />}
                    label={formattedDolar}
                    color="secondary"
                    variant="outlined"
                />
            </Tooltip>
            <Tooltip title="Forzar Actualización">
                {/* El botón se deshabilita mientras la mutación está en proceso */}
                <IconButton
                    size="small"
                    onClick={() => forceUpdateMutation.mutate()}
                    disabled={forceUpdateMutation.isPending}
                    aria-label="forzar actualización del dólar"
                >
                    {forceUpdateMutation.isPending ? (
                        <CircularProgress size={20} color="inherit" />
                    ) : (
                        <RefreshIcon fontSize="small" />
                    )}
                </IconButton>
            </Tooltip>
        </Box>
    );
}