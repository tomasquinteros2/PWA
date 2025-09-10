import apiClient from './apiClient';
import type { Producto, Proveedor, TipoProducto, RelatedProductResult } from '../types/Producto';

export interface ProductPayload {
    codigo_producto: string;
    descripcion: string;
    cantidad: number;
    proveedorId: number;
    tipoProductoId: number;
    porcentaje_ganancia: number;
    iva: number;
    resto?: number | null;
    costoFijo: boolean;
    precio_sin_iva?: number;
    costo_pesos?: number;
}
export interface TipoProductoPayload {
    nombre: string;
}
export interface ProveedorPayload {
    nombre: string;
    contacto?: string;
}
export interface ProductRelationPayload {
    productoId: number;
    productoRelacionadoId: number;
}

// === FUNCIONES DE QUERY (LEER DATOS) ===

export const fetchProducts = async (
    searchTerm?: string,
    proveedorId?: string,
    tipoId?: string
): Promise<Producto[]> => {
    const params = new URLSearchParams();
    if (searchTerm) params.append('search', searchTerm);
    if (proveedorId) params.append('proveedorId', proveedorId);
    if (tipoId) params.append('tipoId', tipoId);

    const { data } = await apiClient.get(`/producto/productos?${params.toString()}`);
    return data || [];
};

export const fetchProductById = async (id: string): Promise<Producto> => {
    const { data } = await apiClient.get(`/producto/productos/${id}`);
    return data;
};
export const createProduct = async (payload: ProductPayload): Promise<Producto> => {
    const { data } = await apiClient.post('/producto/productos', payload);
    return data;
};

export const updateProduct = async ({ id, payload }: { id: string, payload: ProductPayload }): Promise<Producto> => {
    const { data } = await apiClient.put(`/producto/productos/${id}`, payload);
    return data;
};

export const deleteProduct = async (productId: number | string): Promise<void> => {
    if (typeof productId === 'number' && productId > 1000000000000) {
        console.log("Eliminando producto optimista localmente (no se envía a la API).");
        return;
    }
    await apiClient.delete(`/producto/productos/${productId}`);
};

// === PROVEEDORES ===
export const fetchProveedores = async (): Promise<Proveedor[]> => {
    const { data } = await apiClient.get('/proveedor/proveedores');
    return data || [];
};
export const fetchProveedorById = async (id: string): Promise<Proveedor> => {
    const { data } = await apiClient.get(`/proveedor/proveedores/${id}`);
    return data;
};
export const createProveedor = async (proveedor: ProveedorPayload): Promise<Proveedor> => {
    const { data } = await apiClient.post('/proveedor/proveedores', proveedor);
    return data;
};
export const updateProveedor = async ({ id, payload }: { id: string, payload: ProveedorPayload }): Promise<Proveedor> => {
    const { data } = await apiClient.put(`/proveedor/proveedores/${id}`, payload);
    return data;
};
export const deleteProveedor = async (id: number): Promise<void> => {
    await apiClient.delete(`/proveedor/proveedores/${id}`);
};

export const fetchTiposProducto = async (): Promise<TipoProducto[]> => {
    const { data } = await apiClient.get('/tipo-producto/tiposproducto');
    return data || [];
};
export const createTipoProducto = async (tipoProducto: TipoProductoPayload): Promise<TipoProducto> => {
    const { data } = await apiClient.post('/tipo-producto/tiposproducto', tipoProducto);
    return data;
};
export const createBulkTiposProducto = async (tiposProducto: TipoProductoPayload[]): Promise<TipoProducto[]> => {
    const { data } = await apiClient.post('/tipo-producto/tiposproducto/bulk', tiposProducto);
    return data;
};
export const fetchTipoProductoById = async (id: string): Promise<TipoProducto> => {
    const { data } = await apiClient.get(`/tipo-producto/tiposproducto/${id}`);
    return data;
};

export const updateTipoProducto = async ({ id, payload }: { id: string, payload: TipoProductoPayload }): Promise<TipoProducto> => {
    const { data } = await apiClient.put(`/tipo-producto/tiposproducto/${id}`, payload);
    return data;
};

export const deleteTipoProducto = async (id: number): Promise<void> => {
    await apiClient.delete(`/tipo-producto/tiposproducto/${id}`);
};
// === FUNCIONES DE MUTACIÓN (CREAR, ACTUALIZAR, BORRAR) ===

export const relateProducts = async ({ productId, relatedIds }: { productId: number; relatedIds: number[] }): Promise<void> => {
    await apiClient.post(`/producto/productos/${productId}/relacionar`, relatedIds);
};

export const fetchRelatedProducts = async (productId: number | string): Promise<RelatedProductResult[]> => {
    const { data } = await apiClient.get(`/producto/productos/${productId}/relacionados`);
    return data || [];
};

export const relateProduct = async (payload: ProductRelationPayload): Promise<void> => {
    await apiClient.post('/producto/productos/relaciones', payload);
};

export const unrelateProduct = async (payload: ProductRelationPayload): Promise<void> => {
    await apiClient.delete('/producto/productos/relaciones', { data: payload });
};

export const bulkUploadProducts = async (products: ProductPayload[]): Promise<void> => {
    await apiClient.post('/producto/productos/cargar-masivo', products);
};


