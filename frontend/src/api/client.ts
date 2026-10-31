import {
  HealthResponse,
  MetaResponse,
  NodesResponse,
  HierarchySnapshotResponse,
  ForecastResponse,
  BacktestResponse,
  AlertsResponse,
  MetricsResponse,
  SavingsRequest,
  SavingsResponse,
  ScenarioRequest,
  ScenarioResponse,
} from './schema';

const API_BASE = '/api/v1';

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let errBody: any;
    try {
      errBody = await response.json();
    } catch {
      errBody = await response.text();
    }
    const message = errBody?.detail || errBody?.message || `API request failed with status ${response.status}`;
    throw new ApiError(response.status, message, errBody);
  }

  return response.json();
}

export const apiClient = {
  getHealth: () => request<HealthResponse>('/health'),

  getMeta: () => request<MetaResponse>('/meta'),

  getNodes: () => request<NodesResponse>('/nodes'),

  getHierarchy: (params?: { date?: string; horizon?: number; mode?: 'reconciled' | 'unreconciled' }) => {
    const sp = new URLSearchParams();
    if (params?.date) sp.set('date', params.date);
    if (params?.horizon !== undefined) sp.set('horizon', String(params.horizon));
    if (params?.mode) sp.set('mode', params.mode);
    const qs = sp.toString() ? `?${sp.toString()}` : '';
    return request<HierarchySnapshotResponse>(`/hierarchy${qs}`);
  },

  getForecast: (params?: { node?: string; horizon_days?: number }) => {
    const sp = new URLSearchParams();
    if (params?.node) sp.set('node', params.node);
    if (params?.horizon_days !== undefined) sp.set('horizon_days', String(params.horizon_days));
    const qs = sp.toString() ? `?${sp.toString()}` : '';
    return request<ForecastResponse>(`/forecast${qs}`);
  },

  getBacktest: (params?: { node?: string; horizon?: number }) => {
    const sp = new URLSearchParams();
    if (params?.node) sp.set('node', params.node);
    if (params?.horizon !== undefined) sp.set('horizon', String(params.horizon));
    const qs = sp.toString() ? `?${sp.toString()}` : '';
    return request<BacktestResponse>(`/backtest${qs}`);
  },

  getAlerts: (params?: { date?: string }) => {
    const sp = new URLSearchParams();
    if (params?.date) sp.set('date', params.date);
    const qs = sp.toString() ? `?${sp.toString()}` : '';
    return request<AlertsResponse>(`/alerts${qs}`);
  },

  getMetrics: () => request<MetricsResponse>('/metrics'),

  getSavings: (params?: SavingsRequest) => {
    const sp = new URLSearchParams();
    if (params?.baseline) sp.set('baseline', params.baseline);
    if (params?.price_under !== undefined) sp.set('price_under', String(params.price_under));
    if (params?.price_over !== undefined) sp.set('price_over', String(params.price_over));
    if (params?.horizon !== undefined) sp.set('horizon', String(params.horizon));
    const qs = sp.toString() ? `?${sp.toString()}` : '';
    return request<SavingsResponse>(`/savings${qs}`);
  },

  postScenario: (payload: ScenarioRequest) => {
    return request<ScenarioResponse>('/scenario', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

