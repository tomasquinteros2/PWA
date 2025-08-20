import apiClient from './apiClient';

// 1. Definimos la estructura del objeto Dolar que viene en el array.
export interface Dolar {
    id: number;
    nombre: string;
    precio: number;
}


export const fetchDolar = async (): Promise<Dolar[]> => {
    const { data } = await apiClient.get<Dolar[]>('/dolar/dolar');
    return data;
};
export const forceDolarUpdate = async (): Promise<{ message: string }> => {
    const { data } = await apiClient.post<{ message: string }>('/dolar/dolar/force-update');
    return data;
};