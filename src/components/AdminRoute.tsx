import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-hot-toast';

const AdminRoute = () => {
    const { role } = useAuth();

    // Si el rol no es 'ADMIN', no permitimos el acceso.
    if (role !== 'ADMIN') {
        // Es una buena práctica notificar al usuario por qué fue redirigido.
        toast.error("Acceso denegado. No tienes permisos de administrador.");
        // Redirigimos a la página principal.
        return <Navigate to="/" replace />;
    }

    // Si el rol es 'ADMIN', renderizamos la ruta solicitada.
    return <Outlet />;
};

export default AdminRoute;