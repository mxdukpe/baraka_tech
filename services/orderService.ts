import axios from 'axios';

const API_BASE_URL = 'https://backend.barakasn.com/api/v0/';

export const getOrders = async (page?: number) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/orders/orders/`, {
            params: { page }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching orders:', error);
        throw error;
    }
};

export const createOrder = async (orderData: any) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/orders/orders/`, orderData);
        return response.data;
    } catch (error) {
        console.error('Error creating order:', error);
        throw error;
    }
};

export const getOrderById = async (id: number) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/orders/orders/${id}/`);
        return response.data;
    } catch (error) {
        console.error('Error fetching order by id:', error);
        throw error;
    }
};