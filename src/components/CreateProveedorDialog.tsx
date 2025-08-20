import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button,
    TextField, CircularProgress, Alert
} from '@mui/material';
import { createProveedor } from '../api/productsApi';
import type { ProveedorPayload } from '../api/productsApi';
import type { Proveedor } from '../types/Producto';

interface CreateProveedorDialogProps {
    open: boolean;
    // Callback que se ejecuta al cerrar, devolviendo el nuevo proveedor si se creó
    onClose: (newProveedor?: Proveedor) => void;
}

export default function CreateProveedorDialog({ open, onClose }: CreateProveedorDialogProps) {
    const [nombre, setNombre] = useState('');
    const [contacto, setContacto] = useState('');

    const mutation = useMutation({
        mutationFn: createProveedor,
        onSuccess: (data) => {
            toast.success(`Proveedor "${data.nombre}" creado con éxito.`);
            onClose(data); // Cierra el diálogo y devuelve el proveedor recién creado
        },
        onError: (error) => {
            toast.error(`No se pudo crear el proveedor: ${error.message}`);
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload: ProveedorPayload = {
            nombre: nombre.trim(),
            contacto: contacto.trim()
        };
        mutation.mutate(payload);
    };

    return (
        <Dialog open={open} onClose={() => onClose()} component="form" onSubmit={handleSubmit}>
            <DialogTitle>Crear Nuevo Proveedor</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
                <TextField
                    autoFocus
                    required
                    margin="dense"
                    id="nombre"
                    label="Nombre del Proveedor"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    disabled={mutation.isPending}
                />
                <TextField
                    required
                    margin="dense"
                    id="contacto"
                    label="Contacto (Email, Teléfono, etc.)"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={contacto}
                    onChange={(e) => setContacto(e.target.value)}
                    disabled={mutation.isPending}
                />
                {mutation.isError && (
                    <Alert severity="error">
                        {mutation.error.message}
                    </Alert>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={() => onClose()} disabled={mutation.isPending}>Cancelar</Button>
                <Button
                    type="submit"
                    variant="contained"
                    disabled={!nombre.trim() || !contacto.trim() || mutation.isPending}
                >
                    {mutation.isPending ? <CircularProgress size={24} /> : 'Crear Proveedor'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}