import api from './apiConfig';

// ─── Investment Types ─────────────────────────────────────────────────────────
export interface PortfolioItem {
    symbol: string;
    quantity: number;
    avgPrice: number;
    currentPrice: number;
    currentValue: number;
    investedValue: number;
    profit: number;
    profitPercent: number;
}

export interface PortfolioSummary {
    totalInvested: number;
    totalCurrentValue: number;
    totalProfit: number;
    profitPercent: number;
}

export interface Investment {
    _id: string;
    userId: string;
    symbol: string;
    quantity: number;
    avgPrice: number;
    createdAt: string;
    updatedAt: string;
}

export interface InvestmentTransaction {
    _id: string;
    userId: string;
    symbol: string;
    quantity: number;
    price: number;
    type: 'BUY' | 'SELL';
    createdAt: string;
}

export interface TradeRequest {
    symbol: string;
    quantity: number;
}

// ─── Market Types ─────────────────────────────────────────────────────────────
export interface SymbolSearchResult {
    symbol: string;
    name: string;
}

export interface StockPrice {
    current: number;
    open: number;
    high: number;
    low: number;
    prevClose: number;
}

export interface StockFundamentals {
    price: number | null;
    marketCap: number | null;
    high52: number | null;
    low52: number | null;
    eps: number | null;
    peRatio: number | null;
    beta: number | null;
    roe: number | null;
    roa: number | null;
    freeCashFlow: number | null;
}

export interface StockProfile {
    symbol: string;
    companyName: string;
    exchange: string;
    industry: string;
    website: string;
    description: string;
    mktCap: number;
    price: number;
    image: string;
}

export interface Candle {
    datetime: string;
    open: number;
    high: number;
    low: number;
    close: number;
}

export interface Mover {
    ticker: string;
    price: string;
    change_amount: string;
    change_percentage: string;
    volume: string;
}

export interface DashboardData {
    gainers: Mover[];
    losers: Mover[];
    active: Mover[];
}

export interface StockSnapshotInput {
    symbol: string;
    price: number;
    volume: number;
    rsi: number;
    priceChange?: number;
    avgVolume?: number;
    date?: string;
}

export interface StockRecommendation {
    symbol: string;
    confidence: number;
    pattern: string;
    patterns: string[];
    price?: number;
    volume?: number;
    rsi?: number;
    successCount: number;
    failCount: number;
    analysis?: string;
    analysisSource?: 'ai' | 'fallback';
}

export interface StockRecommendationResponse {
    recommendations: StockRecommendation[];
    aiAnalysisEnabled: boolean;
    analysisMessage?: string;
}

export interface PersonalizedStockAnalysisResponse {

    response: string;

    availableBalance: number;

    expenseSummary: {
        total: number;
        averagePerDay: number;
        count: number;
    };

    recommendations: StockRecommendation[];

    primaryRecommendation?: StockRecommendation | null;

    source: 'ai' | 'fallback';
}

// ─── Investment Service ───────────────────────────────────────────────────────
export const investmentService = {
    buyStock: async (data: TradeRequest) => {
        const res = await api.post('/investments/buy', data);
        return res.data;
    },
    sellStock: async (data: TradeRequest) => {
        const res = await api.post('/investments/sell', data);
        return res.data;
    },
    getPortfolio: async (): Promise<{ success: boolean; data: PortfolioItem[] }> => {
        const res = await api.get('/investments/portfolio');
        return res.data;
    },
    getPortfolioSummary: async (): Promise<{ success: boolean; data: PortfolioSummary }> => {
        const res = await api.get('/investments/portfolio/summary');
        return res.data;
    },
    getAllInvestments: async (): Promise<{ success: boolean; data: Investment[] }> => {
        const res = await api.get('/investments');
        return res.data;
    },
    getTransactions: async (): Promise<{ success: boolean; data: InvestmentTransaction[] }> => {
        const res = await api.get('/investments/transactions');
        return res.data;
    },
};

// ─── Market Service ───────────────────────────────────────────────────────────
export const marketService = {
    searchSymbols: async (q: string): Promise<SymbolSearchResult[]> => {
        const res = await api.get(`/market/search?q=${encodeURIComponent(q)}`);
        return res.data;
    },
    getProfile: async (symbol: string): Promise<StockProfile> => {
        const res = await api.get(`/market/profile/${symbol}`);
        return res.data;
    },
    getFundamentals: async (symbol: string): Promise<StockFundamentals> => {
        const res = await api.get(`/market/fundamentals/${symbol}`);
        return res.data;
    },
    getCurrentPrice: async (symbol: string): Promise<StockPrice> => {
        const res = await api.get(`/market/price/${symbol}`);
        return res.data;
    },
    getDashboard: async (): Promise<DashboardData> => {
        const res = await api.get('/market/dashboard');
        return res.data;
    },
    getCandles: async (symbol: string): Promise<{ candles: Candle[] }> => {
        const res = await api.get(`/market/candles/${symbol}`);
        return res.data;
    },
    getPersonalizedStockAnalysis:async (): Promise<PersonalizedStockAnalysisResponse> => {
        const res =
        await api.get(
        '/market/personalized-stock-analysis'
        );
        return res.data;
},
};

export const stockLearningService = {
    saveSnapshot: async (data: StockSnapshotInput) => {
        const res = await api.post('/stocks/snapshot', data);
        return res.data;
    },
    recommend: async (
        snapshots: StockSnapshotInput[],
        options: { confidenceThreshold?: number; includeAnalysis?: boolean } = {}
    ): Promise<StockRecommendationResponse> => {
        const res = await api.post('/stocks/recommend', {
            snapshots,
            confidenceThreshold: options.confidenceThreshold,
            includeAnalysis: options.includeAnalysis,
        });
        return res.data;
    },
    runLearning: async (date?: string) => {
        const res = await api.post('/stocks/learn', date ? { date } : {});
        return res.data;
    },
};
