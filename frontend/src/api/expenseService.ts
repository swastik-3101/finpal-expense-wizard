//expenseseervice.ts
import api from './apiConfig';

export interface Expense {
  id?: string;
  title: string;
  amount: number;
  category: string;
  date: string;
}

export const expenseService = {
  getExpenses: async () => {
    try {
      const response = await api.get('/expenses');
      return response.data;
    } catch (error) {
      console.error('Error fetching expenses:', error);
      throw error;
    }
  },
  
  addExpense: async (expense: Expense) => {
    try {
      const response = await api.post('/expenses', expense);
      return response.data;
    } catch (error) {
      console.error('Error adding expense:', error);
      throw error;
    }
  },
  
  updateExpense: async (id: string, expense: Expense) => {
    try {
      const response = await api.put(`/expenses/${id}`, expense);
      return response.data;
    } catch (error) {
      console.error('Error updating expense:', error);
      throw error;
    }
  },
  
  deleteExpense: async (id: string) => {
    try {
      const response = await api.delete(`/expenses/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw error;
    }
  },

  getCategories: async () => {
    try {
      const response = await api.get('/expenses/categories');
      return response.data;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  },

  uploadReceipt: async (formData: FormData) => {
    try {
      const response = await api.post('/expenses/upload-receipt', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading receipt:', error);
      throw error;
    }
  }
};
