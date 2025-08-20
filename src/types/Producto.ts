export interface Proveedor {
    id: number;
    nombre: string;
    contacto: string;
}

export interface TipoProducto {
    id: number;
    nombre: string;
}

export interface Producto {
    id: number | string; // Permitimos string para IDs optimistas
    codigo_producto: string;
    descripcion: string;
    cantidad: number;
    iva: number;
    precio_publico: number;
    resto: number;
    precio_sin_redondear: number;
    precio_publico_us: number;
    porcentaje_ganancia: number;
    costo_dolares: number;
    costo_pesos: number;
    precio_sin_iva: number;
    fecha_ingreso: string;
    proveedorId: number;
    tipoProductoId: number;
    costoFijo: boolean;
    productosRelacionados: [],
    productosRelacionadosIds: [],
}
export interface RelatedProductResult {
    id: number;
    descripcion: string;
    nombreProveedor: string;
    precioPublico: number;
    nombreTipoProducto: string;
}
export interface  ProductDiscountPayload{
    id: number;
    cantidad: number;
}