import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { AxiosError } from 'axios';
import { toast } from 'react-hot-toast';
import {
    Container, Paper, Typography, TextField, Button, Box,
    Alert, CircularProgress, Link, Grid
} from '@mui/material';
import { registerUser, type RegisterPayload } from '../api/AuthApi';

function RegisterPage() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        confirmPassword: '',
    });

    const mutation = useMutation({
        mutationFn: registerUser,
        onSuccess: () => {
            toast.success('¡Registro exitoso! Ahora puedes iniciar sesión.');
            navigate('/login');
        },
        onError: (error: unknown) => {
            let errorMessage = 'Ocurrió un error inesperado.';

            if (error instanceof AxiosError && error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error instanceof Error) {
                errorMessage = error.message;
            }

            if (errorMessage.includes('already exists')) {
                toast.error('El nombre de usuario ya está en uso.');
            } else {
                toast.error(`Error al registrar: ${errorMessage}`);
            }
        }
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.username.trim().length < 6) {
            toast.error('El nombre de usuario debe tener al menos 6 caracteres.');
            return;
        }

        if (formData.password.length < 6) {
            toast.error('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            toast.error('Las contraseñas no coinciden.');
            return;
        }

        const payload: RegisterPayload = {
            username: formData.username.trim(),
            password: formData.password,
            authorities: ['USER'],
        };
        mutation.mutate(payload);
    };

    const isUsernameError = formData.username.length > 0 && formData.username.trim().length < 6;
    const isPasswordError = formData.password.length > 0 && formData.password.length < 6;
    const isConfirmPasswordError = formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword;

    return (
        <Container component="main" maxWidth="xs" sx={{ mt: 8 }}>
            <Paper elevation={3} sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography component="h1" variant="h5">
                    Crear Cuenta
                </Typography>
                <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="username"
                        label="Nombre de Usuario"
                        name="username"
                        autoComplete="username"
                        autoFocus
                        value={formData.username}
                        onChange={handleChange}
                        disabled={mutation.isPending}
                        error={isUsernameError}
                        helperText={isUsernameError ? "Debe tener al menos 6 caracteres" : ""}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="password"
                        label="Contraseña"
                        type="password"
                        id="password"
                        autoComplete="new-password"
                        value={formData.password}
                        onChange={handleChange}
                        disabled={mutation.isPending}
                        error={isPasswordError}
                        helperText={isPasswordError ? "Debe tener al menos 6 caracteres" : ""}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="confirmPassword"
                        label="Confirmar Contraseña"
                        type="password"
                        id="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        disabled={mutation.isPending}
                        error={isConfirmPasswordError}
                        helperText={isConfirmPasswordError ? "Las contraseñas no coinciden" : ""}
                    />
                    {mutation.isError && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            Ocurrió un error. Revisa los datos e inténtalo de nuevo.
                        </Alert>
                    )}
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        sx={{ mt: 3, mb: 2 }}
                        disabled={mutation.isPending}
                    >
                        {mutation.isPending ? <CircularProgress size={24} /> : 'Registrarse'}
                    </Button>
                    <Grid container justifyContent="flex-end">
                        <Grid item>
                            <Link component={RouterLink} to="/login" variant="body2">
                                ¿Ya tienes una cuenta? Inicia sesión
                            </Link>
                        </Grid>
                    </Grid>
                </Box>
            </Paper>
        </Container>
    );
}

export default RegisterPage;