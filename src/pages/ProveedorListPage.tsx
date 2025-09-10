import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
    Container, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, CircularProgress, Alert, Box, Button,
    IconButton, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
    Tooltip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { fetchProveedores, deleteProveedor, fetchProducts } from '../api/productsApi';
import type { Proveedor } from '../types/Producto';
import { useAuth } from '../hooks/useAuth';

export default function ProveedorListPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { role } = useAuth();
    const isAdmin = role === 'ADMIN';

    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [generatingPdfId, setGeneratingPdfId] = useState<number | null>(null);

    const { data: proveedores, error, isLoading } = useQuery<Proveedor[], Error>({
        queryKey: ['proveedores'],
        queryFn: fetchProveedores,
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => deleteProveedor(id),
        onSuccess: () => {
            toast.success('Proveedor eliminado con éxito');
            queryClient.invalidateQueries({ queryKey: ['proveedores'] });
        },
        onError: (err: Error) => toast.error(`Error al eliminar: ${err.message}`),
    });

    const handleDeleteClick = (id: number) => {
        setSelectedId(id);
        setIsConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        if (selectedId) {
            deleteMutation.mutate(selectedId);
        }
        setIsConfirmOpen(false);
        setSelectedId(null);
    };

    const handleGeneratePdf = async (proveedor: Proveedor) => {
        setGeneratingPdfId(proveedor.id);
        toast.loading(`Generando lista de precios para ${proveedor.nombre}...`, { id: 'pdf-toast' });

        try {
            const products = await fetchProducts(undefined, String(proveedor.id));

            if (!products || products.length === 0) {
                toast.error(`El proveedor ${proveedor.nombre} no tiene productos para listar.`, { id: 'pdf-toast' });
                return;
            }

            const doc = new jsPDF();
            const docTitle = `Lista de Precios - ${proveedor.nombre}`;
            const generatedDate = `Generado el: ${new Date().toLocaleDateString('es-AR')}`;

            doc.setFontSize(18);
            doc.text(docTitle, 14, 22);
            doc.setFontSize(11);
            doc.setTextColor(100);
            doc.text(generatedDate, 14, 29);

            autoTable(doc, {
                startY: 35,
                head: [['Código', 'Descripción', 'Precio Venta (ARS)']],
                body: products.map(p => [
                    p.codigo_producto,
                    p.descripcion,
                    `$${(p.precio_publico ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
                ]),
                headStyles: { fillColor: [76, 175, 80] },
                styles: { fontSize: 9 },
            });

            const fileName = `Lista_Precios_${proveedor.nombre.replace(/\s+/g, '_')}.pdf`;
            doc.save(fileName);

            toast.success('PDF generado con éxito.', { id: 'pdf-toast' });

        } catch (err) {
            console.error("Error al generar el PDF:", err);
            toast.error('No se pudo generar el PDF.', { id: 'pdf-toast' });
        } finally {
            setGeneratingPdfId(null);
        }
    };


    if (isLoading) {
        return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;
    }

    if (error) {
        return <Container sx={{ mt: 4 }}><Alert severity="error">Error al cargar los proveedores: {error.message}</Alert></Container>;
    }

    return (
        <Container>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', my: 4 }}>
                <Typography variant="h4">Proveedores</Typography>
                {isAdmin && (
                    <Button variant="contained" onClick={() => navigate('/proveedores/nuevo')}>
                        Nuevo Proveedor
                    </Button>
                )}
            </Box>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>ID</TableCell>
                            <TableCell>Nombre</TableCell>
                            <TableCell>Contacto</TableCell>
                            <TableCell align="center">Lista de Precios</TableCell>
                            {isAdmin && <TableCell align="right">Acciones</TableCell>}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {proveedores?.map((proveedor) => (
                            <TableRow key={proveedor.id} hover>
                                <TableCell>{proveedor.id}</TableCell>
                                <TableCell>{proveedor.nombre}</TableCell>
                                <TableCell>{proveedor.contacto}</TableCell>
                                <TableCell align="center">
                                    {generatingPdfId === proveedor.id ? (
                                        <CircularProgress size={24} />
                                    ) : (
                                        <Tooltip title={`Generar PDF para ${proveedor.nombre}`}>
                                            <IconButton
                                                color="primary"
                                                onClick={() => handleGeneratePdf(proveedor)}
                                                aria-label="generar lista de precios en pdf"
                                            >
                                                <PictureAsPdfIcon />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                </TableCell>
                                {isAdmin && (
                                    <TableCell align="right">
                                        <IconButton onClick={() => navigate(`/proveedores/editar/${proveedor.id}`)} aria-label="editar">
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton onClick={() => handleDeleteClick(proveedor.id)} color="error" aria-label="eliminar">
                                            <DeleteIcon />
                                        </IconButton>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={isConfirmOpen} onClose={() => setIsConfirmOpen(false)}>
                <DialogTitle>Confirmar Eliminación</DialogTitle>
                <DialogContent><DialogContentText>¿Estás seguro de que quieres eliminar este proveedor?</DialogContentText></DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsConfirmOpen(false)}>Cancelar</Button>
                    <Button onClick={handleConfirmDelete} color="error" autoFocus>Eliminar</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}