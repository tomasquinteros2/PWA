export interface VentaItem {
    id: number;
    productoId: number;
    productoDescripcion: string;
    cantidad: number;
    precioUnitario: number;
}

export interface Venta {
    id: number;
    numeroComprobante: string;
    fechaVenta: string; // Viene como un string en formato ISO 8601
    totalVenta: number;
    items: VentaItem[];
}