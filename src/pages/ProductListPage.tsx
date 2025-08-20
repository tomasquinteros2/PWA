import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useIsMutating, useMutation, useQueryClient, keepPreviousData, onlineManager } from '@tanstack/react-query';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    Container, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, CircularProgress, Alert, Box, Button,
    Tooltip, Chip, IconButton, Menu, MenuItem, Dialog, DialogActions,
    DialogContent, DialogContentText, DialogTitle, TextField, List, ListItem,
    ListItemText, Grid, FormControl, InputLabel, Select, Divider,
    Checkbox, Fab
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import InfoIcon from '@mui/icons-material/Info';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { AddCircle } from "@mui/icons-material";

import { fetchProducts, fetchProveedores, fetchTiposProducto, deleteProduct, fetchRelatedProducts } from '../api/productsApi';
import type { Producto, RelatedProductResult } from '../types/Producto';
import { useCart } from '../context/CartProvider';
import { useAuth } from '../hooks/useAuth';
import BulkUploadDialog from '../components/BulkUploadDialog';


type DeleteMutationContext = {
    previousProducts?: Producto[];
};

function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
        return () => { clearTimeout(handler); };
    }, [value, delay]);
    return debouncedValue;
}

function ProductListPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { addToCart } = useCart();
    const { role } = useAuth();
    const isAdmin = role === 'ADMIN';

    const searchInputRef = useRef<HTMLInputElement>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [proveedorFilter, setProveedorFilter] = useState('');
    const [tipoFilter, setTipoFilter] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    const [selectedProducts, setSelectedProducts] = useState(new Set<number | string>());
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const { data: products, error, isLoading, isFetching } = useQuery<Producto[], Error, Producto[]>({
        queryKey: ['products', debouncedSearchTerm, proveedorFilter, tipoFilter],
        queryFn: () => fetchProducts(),
        placeholderData: keepPreviousData,
        select: (allProducts) => {
            if (!allProducts) return [];
            const term = debouncedSearchTerm.trim().toLowerCase();
            if (!term && !proveedorFilter && !tipoFilter) {
                return allProducts;
            }
            return allProducts.filter(product => {
                const searchMatch = term
                    ? product.descripcion.toLowerCase().includes(term) ||
                    (product.codigo_producto ?? '').toLowerCase().includes(term) ||
                    String(product.id).includes(term)
                    : true;
                const proveedorMatch = proveedorFilter ? product.proveedorId === Number(proveedorFilter) : true;
                const tipoMatch = tipoFilter ? product.tipoProductoId === Number(tipoFilter) : true;
                return searchMatch && proveedorMatch && tipoMatch;
            });
        },
    });

    const { data: proveedores } = useQuery({ queryKey: ['proveedores'], queryFn: fetchProveedores });
    const { data: tiposProducto } = useQuery({ queryKey: ['tiposProducto'], queryFn: fetchTiposProducto });

    const pendingMutations = useIsMutating({ mutationKey: ['createProduct'] }) + useIsMutating({ mutationKey: ['updateProduct'] }) + useIsMutating({ mutationKey: ['deleteProduct'] }) + useIsMutating({ mutationKey: ['registrarVenta'] });

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedProductId, setSelectedProductId] = useState<null | number | string>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [selectedProductForDetails, setSelectedProductForDetails] = useState<Producto | null>(null);
    const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

    const {
        data: relatedProductsForDetail,
        isLoading: isLoadingRelatedForDetail,
        isError: isErrorRelatedForDetail,
    } = useQuery<RelatedProductResult[]>({
        queryKey: ['relatedProducts', selectedProductForDetails?.id],
        queryFn: () => fetchRelatedProducts(selectedProductForDetails!.id),
        enabled: isDetailsOpen && !!selectedProductForDetails?.id,
    });

    useEffect(() => {
        searchInputRef.current?.focus();
    }, []);

    const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            const allProductIds = products?.map(p => p.id) || [];
            setSelectedProducts(new Set(allProductIds));
        } else {
            setSelectedProducts(new Set());
        }
    };

    const handleSelectOne = (productId: number | string) => {
        setSelectedProducts(prevSelected => {
            const newSelected = new Set(prevSelected);
            if (newSelected.has(productId)) {
                newSelected.delete(productId);
            } else {
                newSelected.add(productId);
            }
            return newSelected;
        });
    };

    const handleGenerateCustomPdf = () => {
        const productsToPrint = products?.filter(p => selectedProducts.has(p.id)) || [];

        if (productsToPrint.length === 0) {
            toast.error('No hay productos seleccionados para generar la lista.');
            return;
        }

        setIsGeneratingPdf(true);
        toast.loading('Generando PDF personalizado...', { id: 'custom-pdf-toast' });

        try {
            const doc = new jsPDF();
            doc.setFontSize(18);
            doc.text('Lista de Precios Personalizada', 14, 22);
            doc.setFontSize(11);
            doc.setTextColor(100);
            doc.text(`Generado el: ${new Date().toLocaleDateString('es-AR')}`, 14, 29);

            autoTable(doc, {
                startY: 35,
                head: [['Código', 'Descripción', 'Precio Venta (ARS)']],
                body: productsToPrint.map(p => [
                    p.codigo_producto,
                    p.descripcion,
                    `$${(p.precio_publico ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
                ]),
                headStyles: { fillColor: [76, 175, 80] },
                styles: { fontSize: 9 },
            });

            doc.save('Lista_Personalizada.pdf');
            toast.success('PDF generado con éxito.', { id: 'custom-pdf-toast' });
        } catch (err) {
            console.error("Error al generar el PDF personalizado:", err);
            toast.error('No se pudo generar el PDF.', { id: 'custom-pdf-toast' });
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            if (products?.length === 1) {
                const singleProduct = products[0];
                if (typeof singleProduct.id === 'number') {
                    addToCart(singleProduct);
                    setSearchTerm('');
                }
            } else if (products && products.length > 1) {
                toast.error('Múltiples productos coinciden. Por favor, refine la búsqueda.');
            }
        }
    };

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, productId: number | string) => {
        setAnchorEl(event.currentTarget);
        setSelectedProductId(productId);
    };

    const handleMenuClose = () => setAnchorEl(null);

    const deleteMutation = useMutation<void, Error, number | string, DeleteMutationContext>({
        mutationFn: deleteProduct,
        onMutate: async (productIdToDelete) => {
            await queryClient.cancelQueries({ queryKey: ['products'] });
            const previousProducts = queryClient.getQueryData<Producto[]>(['products']);
            queryClient.setQueryData<Producto[]>(
                ['products'],
                old => (old || []).filter(p => p.id !== productIdToDelete)
            );
            return { previousProducts };
        },
        onSuccess: () => toast.success('Producto eliminado con éxito'),
        onError: (_err, _productIdToDelete, context) => {
            if (context?.previousProducts) {
                queryClient.setQueryData(['products'], context.previousProducts);
            }
            if (onlineManager.isOnline()) {
                toast.error("Error al eliminar el producto.");
            }
        },
        onSettled: () => {
            if (onlineManager.isOnline()) {
                queryClient.invalidateQueries({ queryKey: ['products'] });
            }
        },
    });

    const handleDeleteClick = () => {
        handleMenuClose();
        setIsConfirmOpen(true);
    };

    const handleConfirmClose = () => {
        setIsConfirmOpen(false);
        setSelectedProductId(null);
    };

    const handleConfirmDelete = () => {
        if (selectedProductId) {
            deleteMutation.mutate(selectedProductId);
        }
        handleConfirmClose();
    };

    const handleEdit = () => {
        if (selectedProductId) {
            navigate(`/productos/editar/${selectedProductId}`);
        }
        handleMenuClose();
    };

    const handleDetailsClick = () => {
        if (selectedProductId) {
            const product = products?.find(p => p.id === selectedProductId);
            if (product) {
                setSelectedProductForDetails(product);
                setIsDetailsOpen(true);
            }
        }
        handleMenuClose();
    };

    const handleDetailsClose = () => {
        setIsDetailsOpen(false);
        setSelectedProductForDetails(null);
    };

    const handleBulkUploadClose = (uploaded: boolean) => {
        setIsBulkUploadOpen(false);
        if (uploaded) {
            queryClient.invalidateQueries({ queryKey: ['products'] });
        }
    };

    if (isLoading) {
        return <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh"><CircularProgress /></Box>;
    }

    if (error) {
        return <Container sx={{ mt: 4 }}><Alert severity="error">Error al cargar los productos: {error.message}</Alert></Container>;
    }

    const numSelected = selectedProducts.size;
    const rowCount = products?.length ?? 0;

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4" component="h1">
                    Gestión de Productos
                </Typography>
                {isAdmin && (
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button
                            variant="outlined"
                            startIcon={<UploadFileIcon />}
                            onClick={() => setIsBulkUploadOpen(true)}
                        >
                            Cargar Archivo
                        </Button>
                        <Button
                            component={RouterLink}
                            to="/productos/nuevo"
                            variant="contained"
                            startIcon={<AddCircle />}
                        >
                            Nuevo Producto
                        </Button>
                    </Box>
                )}
            </Box>

            <Paper sx={{ p: 2, mb: 2, position: 'relative' }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            variant="outlined"
                            placeholder="Escanear código o buscar producto..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            inputRef={searchInputRef}
                            onKeyDown={handleSearchKeyDown}
                            InputProps={{
                                startAdornment: (<SearchIcon sx={{ color: 'action.active', mr: 1 }} />),
                                endAdornment: (searchTerm && <IconButton aria-label="limpiar búsqueda" onClick={() => setSearchTerm('')} edge="end"><ClearIcon /></IconButton>)
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <FormControl fullWidth>
                            <InputLabel>Proveedor</InputLabel>
                            <Select value={proveedorFilter} label="Proveedor" onChange={(e) => setProveedorFilter(e.target.value)}>
                                <MenuItem value=""><em>Todos</em></MenuItem>
                                {proveedores?.map(p => <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <FormControl fullWidth>
                            <InputLabel>Rubro</InputLabel>
                            <Select value={tipoFilter} label="Rubro" onChange={(e) => setTipoFilter(e.target.value)}>
                                <MenuItem value=""><em>Todos</em></MenuItem>
                                {tiposProducto?.map(t => <MenuItem key={t.id} value={t.id}>{t.nombre}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
                {isFetching && onlineManager.isOnline() && <CircularProgress size={24} sx={{ position: 'absolute', top: '28px', right: '28px' }} />}
            </Paper>

            {pendingMutations > 0 && <Alert severity="info" sx={{ mb: 2 }}>Hay {pendingMutations} {pendingMutations > 1 ? 'acciones pendientes' : 'acción pendiente'} de sincronización.</Alert>}

            <TableContainer component={Paper}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell padding="checkbox">
                                <Checkbox
                                    color="primary"
                                    indeterminate={numSelected > 0 && numSelected < rowCount}
                                    checked={rowCount > 0 && numSelected === rowCount}
                                    onChange={handleSelectAll}
                                    inputProps={{ 'aria-label': 'seleccionar todos los productos' }}
                                />
                            </TableCell>
                            <TableCell sx={{ width: '5%' }}>ID</TableCell>
                            <TableCell>Código</TableCell>
                            <TableCell>Descripción</TableCell>
                            <TableCell align="right">Stock</TableCell>
                            <TableCell align="right">Costo (USD)</TableCell>
                            <TableCell align="right">% Ganancia</TableCell>
                            <TableCell align="right">Precio Venta (ARS)</TableCell>
                            <TableCell align="center">Fecha Ingreso</TableCell>
                            <TableCell align="center">Estado</TableCell>
                            {isAdmin && <TableCell align="center">Acciones</TableCell>}
                            <TableCell align="center">Añadir</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {products && products.length > 0 ? (
                            products.map((product) => {
                                const isPending = typeof product.id === 'string';
                                const isOutOfStock = product.cantidad <= 0;
                                const isSelected = selectedProducts.has(product.id);

                                return (
                                    <TableRow
                                        key={product.id}
                                        hover
                                        selected={isSelected}
                                        sx={{ opacity: isPending ? 0.6 : 1 }}
                                    >
                                        <TableCell padding="checkbox">
                                            <Checkbox
                                                color="primary"
                                                checked={isSelected}
                                                onChange={() => handleSelectOne(product.id)}
                                                inputProps={{ 'aria-labelledby': `product-checkbox-${product.id}` }}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>{String(product.id).padStart(5, '0')}</TableCell>
                                        <TableCell>{product.codigo_producto}</TableCell>
                                        <TableCell>{product.descripcion}</TableCell>
                                        <TableCell align="right" sx={{ color: isOutOfStock ? 'error.light' : 'inherit', fontWeight: isOutOfStock ? 'bold' : 'normal' }}>
                                            {product.cantidad}
                                        </TableCell>
                                        <TableCell align="right">${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(product.costo_dolares ?? 0)}</TableCell>
                                        <TableCell align="right">{(product.porcentaje_ganancia ?? 0)}%</TableCell>
                                        <TableCell align="right">${new Intl.NumberFormat('es-AR').format(product.precio_publico ?? 0)}</TableCell>
                                        <TableCell align="center">{new Date(product.fecha_ingreso).toLocaleDateString('es-AR')}</TableCell>
                                        <TableCell align="center">
                                            {isPending && <Tooltip title="Pendiente de sincronización"><Chip icon={<CloudUploadIcon />} label="Pendiente" size="small" color="warning" /></Tooltip>}
                                            {isOutOfStock && !isPending && <Tooltip title="Stock en cero o negativo"><Chip label="Revisar Stock" size="small" color="error" /></Tooltip>}
                                        </TableCell>
                                        {isAdmin && (
                                            <TableCell align="center">
                                                <IconButton aria-label="acciones" onClick={(e) => handleMenuOpen(e, product.id)} disabled={isPending}>
                                                    <MoreVertIcon />
                                                </IconButton>
                                            </TableCell>
                                        )}
                                        <TableCell align="center">
                                            <Tooltip title={isPending ? "Producto pendiente de sincronización" : "Añadir al carrito"}>
                                                <span>
                                                    <IconButton
                                                        color="primary"
                                                        aria-label="añadir al carrito"
                                                        onClick={() => addToCart(product)}
                                                        disabled={isPending}
                                                    >
                                                        <AddShoppingCartIcon />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        ) : (
                            <TableRow>
                                <TableCell colSpan={isAdmin ? 12 : 11} align="center">{debouncedSearchTerm || proveedorFilter || tipoFilter ? 'No se encontraron productos que coincidan con los filtros.' : 'No hay productos para mostrar.'}</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {numSelected > 0 && (
                <Tooltip title={`Generar PDF con ${numSelected} producto(s) seleccionado(s)`}>
                    <Fab
                        color="primary"
                        aria-label="generar pdf personalizado"
                        onClick={handleGenerateCustomPdf}
                        disabled={isGeneratingPdf}
                        sx={{
                            position: 'fixed',
                            bottom: 24,
                            right: 24,
                        }}
                    >
                        {isGeneratingPdf ? <CircularProgress size={24} color="inherit" /> : <PictureAsPdfIcon />}
                    </Fab>
                </Tooltip>
            )}

            {isAdmin && (
                <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
                    <MenuItem onClick={handleEdit}><EditIcon sx={{ mr: 1 }} /> Editar</MenuItem>
                    <MenuItem onClick={handleDetailsClick}><InfoIcon sx={{ mr: 1 }} /> Ver Detalles</MenuItem>
                    <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}><DeleteIcon sx={{ mr: 1 }} /> Eliminar</MenuItem>
                </Menu>
            )}

            <Dialog open={isConfirmOpen} onClose={handleConfirmClose}>
                <DialogTitle>Confirmar Eliminación</DialogTitle>
                <DialogContent><DialogContentText>¿Estás seguro de que quieres eliminar este producto? Esta acción no se puede deshacer.</DialogContentText></DialogContent>
                <DialogActions>
                    <Button onClick={handleConfirmClose}>Cancelar</Button>
                    <Button onClick={handleConfirmDelete} color="error" autoFocus>Eliminar</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={isDetailsOpen} onClose={handleDetailsClose} fullWidth maxWidth="sm">
                <DialogTitle>Detalles Completos del Producto</DialogTitle>
                <DialogContent>
                    {selectedProductForDetails && (
                        <>
                            <List dense>
                                <ListItem><ListItemText primary="ID" secondary={selectedProductForDetails.id} /></ListItem>
                                <ListItem><ListItemText primary="Código" secondary={selectedProductForDetails.codigo_producto ?? 'N/A'} /></ListItem>
                                <ListItem><ListItemText primary="Descripción" secondary={selectedProductForDetails.descripcion} /></ListItem>
                                <ListItem><ListItemText primary="Proveedor" secondary={proveedores?.find(p => p.id === selectedProductForDetails.proveedorId)?.nombre || 'No disponible'} /></ListItem>
                                <ListItem><ListItemText primary="Tipo de Producto" secondary={tiposProducto?.find(t => t.id === selectedProductForDetails.tipoProductoId)?.nombre || 'No disponible'} /></ListItem>
                                <ListItem><ListItemText primary="Costo Fijo" secondary={selectedProductForDetails.costoFijo ? 'Sí' : 'No'} /></ListItem>
                                <ListItem><ListItemText primary="Stock" secondary={selectedProductForDetails.cantidad} /></ListItem>
                                <ListItem><ListItemText primary="IVA Aplicado" secondary={`${(selectedProductForDetails.iva ?? 0) * 100}%`} /></ListItem>
                                <ListItem><ListItemText primary="Costo (USD)" secondary={`$${(selectedProductForDetails.costo_dolares ?? 0).toFixed(2)}`} /></ListItem>
                                <ListItem><ListItemText primary="Costo (ARS)" secondary={`$${(selectedProductForDetails.costo_pesos ?? 0).toFixed(2)}`} /></ListItem>
                                <ListItem><ListItemText primary="Precio sin IVA (USD)" secondary={`$${(selectedProductForDetails.precio_sin_iva ?? 0).toFixed(2)}`} /></ListItem>
                                <ListItem><ListItemText primary="Precio Público (USD)" secondary={`$${(selectedProductForDetails.precio_publico_us ?? 0).toFixed(3)}`} /></ListItem>
                                <ListItem><ListItemText primary="Precio Público (ARS)" secondary={`$${new Intl.NumberFormat('es-AR').format(selectedProductForDetails.precio_publico ?? 0)}`} /></ListItem>
                                <ListItem><ListItemText primary="Precio sin redondear (ARS)" secondary={`$${new Intl.NumberFormat('es-AR').format(selectedProductForDetails.precio_sin_redondear ?? 0)}`} /></ListItem>
                                <ListItem><ListItemText primary="Fecha de Ingreso" secondary={new Date(selectedProductForDetails.fecha_ingreso).toLocaleDateString('es-AR')} /></ListItem>
                            </List>

                            <Divider sx={{ my: 2 }} />
                            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                                Productos Relacionados
                            </Typography>
                            {isLoadingRelatedForDetail && (
                                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                                    <CircularProgress />
                                </Box>
                            )}
                            {isErrorRelatedForDetail && (
                                <Alert severity="error">No se pudieron cargar los productos relacionados.</Alert>
                            )}
                            {relatedProductsForDetail && relatedProductsForDetail.length > 0 ? (
                                <List dense>
                                    {relatedProductsForDetail.map((related) => (
                                        <ListItem key={related.id} divider>
                                            <ListItemText
                                                primary={related.descripcion}
                                                secondary={`Proveedor: ${related.nombreProveedor} | Precio: $${(related.precioPublico ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            ) : (
                                !isLoadingRelatedForDetail && <Typography variant="body2" color="text.secondary">Este producto no tiene relaciones.</Typography>
                            )}
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDetailsClose}>Cerrar</Button>
                </DialogActions>
            </Dialog>
            <BulkUploadDialog
                open={isBulkUploadOpen}
                onClose={handleBulkUploadClose}
            />
        </Container>
    );
}

export default ProductListPage;