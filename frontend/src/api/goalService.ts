import api from './apiConfig';

export interface Goal {
    _id?: string;
    title: string;
    description?: string;
    targetAmount: number;
    currentAmount: number;
    progressPercent: number;
    startDate?: string;
    targetDate?: string;
    category?: string;
    status: string;
    createdAt?: string;
    updatedAt?: string;
}

export const goalService = {
    getGoals: async (): Promise<Goal[]> => {
        const response = await api.get('/goals');
        return response.data;
    },

    createGoal: async (goal: Partial<Goal>): Promise<Goal> => {
        const response = await api.post('/goals', goal);
        return response.data;
    },

    contribute: async (goalId: string, amount: number): Promise<Goal> => {
        const response = await api.put('/goals/contribute', { goalId, amount });
        return response.data;
    },

    updateStatus: async (goalId: string, status: string): Promise<Goal> => {
        const response = await api.put('/goals/status', { goalId, status });
        return response.data;
    },

    deleteGoal: async (goalId: string): Promise<void> => {
        await api.delete(`/goals?goalId=${goalId}`);
    }
};