import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Papa from 'papaparse';
import { toast } from 'react-hot-toast';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography,
    CircularProgress, List, ListItemText, Alert, Chip, FormControl,
    InputLabel, Select, MenuItem, Tooltip, IconButton
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

import { bulkUploadProducts, fetchProveedores, fetchTiposProducto, createTipoProducto, type ProductPayload } from '../api/productsApi';
import type { Proveedor, TipoProducto } from '../types/Producto';
import CreateProveedorDialog from './CreateProveedorDialog';

interface BulkUploadDialogProps {
    open: boolean;
    onClose: (uploaded: boolean) => void;
}

interface CsvRow {
    CODIGO: string;
    DESCRIPCION: string;
    'US S/IVA': string;
    '%GAN': string;
    IVA: string;
    [key: string]: string;
}

export default function BulkUploadDialog({ open, onClose }: BulkUploadDialogProps) {
    const queryClient = useQueryClient();
    const [file, setFile] = useState<File | null>(null);
    const [productsToUpload, setProductsToUpload] = useState<ProductPayload[]>([]);
    const [parsingErrors, setParsingErrors] = useState<string[]>([]);
    const [selectedProveedorId, setSelectedProveedorId] = useState<number | ''>('');
    const [isCreateProveedorOpen, setIsCreateProveedorOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const { data: proveedores, isLoading: isLoadingProveedores } = useQuery<Proveedor[]>({ queryKey: ['proveedores'], queryFn: fetchProveedores });
    const { data: tiposProducto } = useQuery<TipoProducto[]>({ queryKey: ['tiposProducto'], queryFn: fetchTiposProducto });

    const bulkUploadMutation = useMutation({
        mutationFn: bulkUploadProducts,
        onSuccess: () => {
            toast.success('¡Productos cargados masivamente con éxito!');
            queryClient.invalidateQueries({ queryKey: ['products'] });
            handleClose(true);
        },
        onError: (error) => {
            toast.error(`Error en la carga masiva: ${error.message}`);
        },
    });

    const createTipoMutation = useMutation({
        mutationFn: createTipoProducto,
    });

    const resetState = () => {
        setFile(null);
        setProductsToUpload([]);
        setParsingErrors([]);
        setSelectedProveedorId('');
        setIsProcessing(false);
    };

    const handleClose = (uploaded = false) => {
        resetState();
        onClose(uploaded);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setProductsToUpload([]);
        setParsingErrors([]);
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            parseFile(selectedFile);
        }
    };

    const handleCreateProveedorClose = (newProveedor?: Proveedor) => {
        setIsCreateProveedorOpen(false);
        if (newProveedor) {
            queryClient.invalidateQueries({ queryKey: ['proveedores'] });
            setSelectedProveedorId(newProveedor.id);
            toast.success(`Proveedor "${newProveedor.nombre}" creado y seleccionado.`);
        }
    };

    const parseFile = useCallback(async (fileToParse: File) => {
        if (!selectedProveedorId) {
            toast.error("Por favor, seleccione un proveedor antes de cargar el archivo.");
            setFile(null);
            (document.querySelector('input[type="file"]') as HTMLInputElement).value = '';
            return;
        }

        setIsProcessing(true);
        setProductsToUpload([]);
        setParsingErrors([]);

        try {
            const parsedData = await new Promise<CsvRow[]>((resolve, reject) => {
                Papa.parse<CsvRow>(fileToParse, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => resolve(results.data),
                    error: (error) => reject(error),
                });
            });

            const existingRubroNames = new Set(tiposProducto?.map(t => t.nombre.toLowerCase()) || []);
            const requiredRubroNames = new Set<string>();
            parsedData.forEach(row => {
                if (!row.CODIGO && row.DESCRIPCION) {
                    requiredRubroNames.add(row.DESCRIPCION.trim());
                }
            });

            const missingRubroNames = [...requiredRubroNames].filter(name => !existingRubroNames.has(name.toLowerCase()));

            if (missingRubroNames.length > 0) {
                toast.loading(`Creando ${missingRubroNames.length} nuevo(s) rubro(s)...`, { id: 'creating-rubros' });

                const creationResults = await Promise.allSettled(
                    missingRubroNames.map(name => createTipoMutation.mutateAsync({ nombre: name }))
                );

                const failedCreations = creationResults.filter(r => r.status === 'rejected') as PromiseRejectedResult[];

                if (failedCreations.length > 0) {
                    const errorMessages = failedCreations.map(fail => `  • No se pudo crear el rubro: ${(fail.reason as Error).message}`);
                    setParsingErrors(prev => [...prev, "Falló la creación de algunos rubros:", ...errorMessages]);
                    toast.error('Algunos rubros no se pudieron crear. Revise los errores.', { id: 'creating-rubros' });
                    setIsProcessing(false);
                    return;
                }

                toast.success('¡Nuevos rubros creados con éxito!', { id: 'creating-rubros' });

                await queryClient.refetchQueries({ queryKey: ['tiposProducto'] });
            }

            const finalTiposProducto = queryClient.getQueryData<TipoProducto[]>(['tiposProducto']) || [];
            const tipoProductoMap = new Map(finalTiposProducto.map(t => [t.nombre.toLowerCase(), t.id]));
            let currentTipoProductoName = '';
            const newProducts: ProductPayload[] = [];
            const localErrors: string[] = [];

            parsedData.forEach((row, index) => {
                const lineNumber = index + 2;
                if (!row.CODIGO && row.DESCRIPCION) {
                    currentTipoProductoName = row.DESCRIPCION.trim();
                    return;
                }
                if (!row.CODIGO) return;

                const tipoProductoId = tipoProductoMap.get(currentTipoProductoName.toLowerCase());
                if (!tipoProductoId) {
                    localErrors.push(`Línea ${lineNumber}: Error inesperado al buscar el rubro "${currentTipoProductoName}".`);
                    return;
                }

                const codigo_producto = row.CODIGO.trim();
                const descripcion = row.DESCRIPCION.trim();
                const precio_sin_iva = parseFloat(row['US S/IVA']?.replace('$', '').trim()) || 0;
                const porcentaje_ganancia = parseFloat(row['%GAN']) || 30;
                const iva = (parseFloat(row.IVA) || 1.21) - 1;
                const resto = row.RES ? parseInt(row.RES, 10) : null;

                if (!codigo_producto || !descripcion) {
                    localErrors.push(`Línea ${lineNumber}: Faltan código o descripción.`);
                    return;
                }

                newProducts.push({
                    codigo_producto,
                    descripcion,
                    cantidad: 1,
                    precio_sin_iva,
                    proveedorId: selectedProveedorId,
                    tipoProductoId: tipoProductoId,
                    porcentaje_ganancia,
                    iva,
                    resto
                });
            });

            setProductsToUpload(newProducts);
            setParsingErrors(prev => [...prev, ...localErrors]);

        } catch (error) {
            toast.error(`Ocurrió un error al procesar el archivo: ${(error as Error).message}`);
        } finally {
            setIsProcessing(false);
        }
    }, [selectedProveedorId, tiposProducto, queryClient, createTipoMutation]);

    const handleUpload = () => {
        if (productsToUpload.length > 0) {
            bulkUploadMutation.mutate(productsToUpload);
        } else {
            toast.error("No hay productos válidos para cargar.");
        }
    };

    return (
        <>
            <Dialog open={open} onClose={() => handleClose(false)} fullWidth maxWidth="md">
                <DialogTitle>Carga de Productos</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <FormControl fullWidth required disabled={isLoadingProveedores || bulkUploadMutation.isPending || isProcessing}>
                                <InputLabel id="proveedor-select-label">Proveedor del Archivo</InputLabel>
                                <Select
                                    labelId="proveedor-select-label"
                                    value={selectedProveedorId}
                                    label="Proveedor del Archivo"
                                    onChange={(e) => setSelectedProveedorId(e.target.value as number)}
                                >
                                    {proveedores?.map((p) => (
                                        <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <Tooltip title="Crear Nuevo Proveedor">
                                <IconButton color="primary" onClick={() => setIsCreateProveedorOpen(true)} disabled={bulkUploadMutation.isPending || isProcessing}>
                                    <AddCircleOutlineIcon />
                                </IconButton>
                            </Tooltip>
                        </Box>

                        {isProcessing ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, justifyContent: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>
                                <CircularProgress size={24} />
                                <Typography>Procesando archivo y creando rubros...</Typography>
                            </Box>
                        ) : (
                            <Button
                                variant="outlined"
                                component="label"
                                startIcon={<UploadFileIcon />}
                                disabled={bulkUploadMutation.isPending || isProcessing}
                            >
                                Seleccionar Archivo CSV
                                <input type="file" accept=".csv" hidden onChange={handleFileChange} />
                            </Button>
                        )}

                        {file && <Chip label={`Archivo: ${file.name}`} onDelete={() => resetState()} />}
                        {parsingErrors.length > 0 && (
                            <Alert severity="error" sx={{ maxHeight: 150, overflowY: 'auto' }}>
                                <Typography variant="h6">Errores encontrados:</Typography>
                                <List dense>{parsingErrors.map((err, i) => <ListItemText key={i} primary={err} />)}</List>
                            </Alert>
                        )}
                        {productsToUpload.length > 0 && (
                            <Alert severity="success">
                                <Typography>
                                    Se encontraron <strong>{productsToUpload.length}</strong> productos válidos para cargar.
                                </Typography>
                            </Alert>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => handleClose(false)} color="secondary" disabled={bulkUploadMutation.isPending || isProcessing}>Cancelar</Button>
                    <Button
                        onClick={handleUpload}
                        variant="contained"
                        disabled={!selectedProveedorId || productsToUpload.length === 0 || parsingErrors.length > 0 || bulkUploadMutation.isPending || isProcessing}
                    >
                        {bulkUploadMutation.isPending || isProcessing ? <CircularProgress size={24} /> : `Cargar ${productsToUpload.length} Productos`}
                    </Button>
                </DialogActions>
            </Dialog>
            <CreateProveedorDialog open={isCreateProveedorOpen} onClose={handleCreateProveedorClose} />
        </>
    );
}