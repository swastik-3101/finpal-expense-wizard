import api from './apiConfig';

export interface IncomeTotals {
    totalIncome: number;
    totalExpenses: number;
    totalInvestments: number;
    totalBalance: number;
    monthlyBudget: number;
}

export const incomeService = {
    getTotals: async (): Promise<IncomeTotals> => {
        const response = await api.get('/income');
        return response.data;
    },

    addIncome: async (amount: number): Promise<IncomeTotals> => {
        const response = await api.post('/income', { amount });
        return response.data;
    },

    setMonthlyBudget: async (monthlyBudget: number): Promise<{ monthlyBudget: number }> => {
        const response = await api.put('/income/budget', { monthlyBudget });
        return response.data;
    }
};