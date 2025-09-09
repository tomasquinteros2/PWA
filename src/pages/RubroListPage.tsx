import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
    Container, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, CircularProgress, Alert, Box, Button,
    IconButton, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useState } from 'react';

import { fetchTiposProducto, deleteTipoProducto } from '../api/productsApi';
import type { TipoProducto } from '../types/Producto';
import { useAuth } from '../hooks/useAuth';

export default function RubroListPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { role } = useAuth();
    const isAdmin = role === 'ADMIN';

    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);

    const { data: rubros, error, isLoading } = useQuery<TipoProducto[], Error>({
        queryKey: ['tiposProducto'],
        queryFn: fetchTiposProducto,
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => deleteTipoProducto(id),
        onSuccess: () => {
            toast.success('Rubro eliminado con éxito');
            queryClient.invalidateQueries({ queryKey: ['tiposProducto'] });
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

    if (isLoading) {
        return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;
    }

    if (error) {
        return <Container sx={{ mt: 4 }}><Alert severity="error">Error al cargar los rubros: {error.message}</Alert></Container>;
    }

    return (
        <Container>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', my: 4 }}>
                <Typography variant="h4">Rubros</Typography>
                {isAdmin && (
                    <Button variant="contained" onClick={() => navigate('/rubros/nuevo')}>
                        Nuevo Rubro
                    </Button>
                )}
            </Box>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>ID</TableCell>
                            <TableCell>Nombre</TableCell>
                            {isAdmin && <TableCell align="right">Acciones</TableCell>}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rubros?.map((rubro) => (
                            <TableRow key={rubro.id} hover>
                                <TableCell>{rubro.id}</TableCell>
                                <TableCell>{rubro.nombre}</TableCell>
                                {isAdmin && (
                                    <TableCell align="right">
                                        <IconButton onClick={() => navigate(`/rubros/editar/${rubro.id}`)} aria-label="editar">
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton onClick={() => handleDeleteClick(rubro.id)} color="error" aria-label="eliminar">
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
                <DialogContent><DialogContentText>¿Estás seguro de que quieres eliminar este rubro?</DialogContentText></DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsConfirmOpen(false)}>Cancelar</Button>
                    <Button onClick={handleConfirmDelete} color="error" autoFocus>Eliminar</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}