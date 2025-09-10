import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Container, Paper, Typography, TextField, Button, Box, CircularProgress } from '@mui/material';
import { fetchProveedorById, createProveedor, updateProveedor, type ProveedorPayload } from '../api/productsApi';
import type { Proveedor } from '../types/Producto';

export default function ProveedorFormPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { id } = useParams<{ id: string }>();
    const isEditMode = Boolean(id);

    const [nombre, setNombre] = useState('');
    const [contacto, setContacto] = useState('');

    const { data: proveedorToEdit, isLoading } = useQuery({
        queryKey: ['proveedor', id],
        queryFn: () => fetchProveedorById(id!),
        enabled: isEditMode,
    });

    useEffect(() => {
        if (proveedorToEdit) {
            setNombre(proveedorToEdit.nombre);
            setContacto(proveedorToEdit.contacto);
        }
    }, [proveedorToEdit]);

    const mutation = useMutation<Proveedor, Error, ProveedorPayload>({
        mutationFn: (payload: ProveedorPayload) =>
            isEditMode ? updateProveedor({ id: id!, payload }) : createProveedor(payload),
        onSuccess: () => {
            toast.success(`Proveedor ${isEditMode ? 'actualizado' : 'creado'} con éxito`);
            queryClient.invalidateQueries({ queryKey: ['proveedores'] });
            navigate('/proveedores');
        },
        onError: (err) => toast.error(`Error: ${err.message}`),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate({ nombre, contacto });
    };

    if (isLoading) return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;

    return (
        <Container maxWidth="sm" sx={{ mt: 4 }}>
            <Paper component="form" sx={{ p: 4 }} onSubmit={handleSubmit}>
                <Typography variant="h4" gutterBottom>{isEditMode ? 'Editar' : 'Nuevo'} Proveedor</Typography>
                <TextField fullWidth required label="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} sx={{ mb: 2 }} />
                <TextField fullWidth required label="Contacto" value={contacto} onChange={e => setContacto(e.target.value)} sx={{ mb: 3 }} />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                    <Button onClick={() => navigate('/proveedores')} color="secondary">Cancelar</Button>
                    <Button type="submit" variant="contained" disabled={mutation.isPending}>
                        {mutation.isPending ? <CircularProgress size={24} /> : 'Guardar'}
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
}