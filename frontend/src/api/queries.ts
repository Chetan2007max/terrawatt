import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import { SavingsRequest, ScenarioRequest } from './schema';

export const queryKeys = {
  health: ['health'] as const,
  meta: ['meta'] as const,
  nodes: ['nodes'] as const,
  hierarchy: (date?: string, horizon?: number, mode?: string) => ['hierarchy', { date, horizon, mode }] as const,
  forecast: (node?: string, horizonDays?: number) => ['forecast', { node, horizonDays }] as const,
  backtest: (node?: string, horizon?: number) => ['backtest', { node, horizon }] as const,
  alerts: (date?: string) => ['alerts', { date }] as const,
  metrics: ['metrics'] as const,
  savings: (params?: SavingsRequest) => ['savings', params] as const,
};

export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: () => apiClient.getHealth(),
    staleTime: 60 * 1000,
  });
}

export function useMeta() {
  return useQuery({
    queryKey: queryKeys.meta,
    queryFn: () => apiClient.getMeta(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useNodes() {
  return useQuery({
    queryKey: queryKeys.nodes,
    queryFn: () => apiClient.getNodes(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useHierarchy(params?: { date?: string; horizon?: number; mode?: 'reconciled' | 'unreconciled' }) {
  return useQuery({
    queryKey: queryKeys.hierarchy(params?.date, params?.horizon, params?.mode),
    queryFn: () => apiClient.getHierarchy(params),
    staleTime: 60 * 1000,
  });
}

export function useForecast(params?: { node?: string; horizon_days?: number }) {
  return useQuery({
    queryKey: queryKeys.forecast(params?.node, params?.horizon_days),
    queryFn: () => apiClient.getForecast(params),
    staleTime: 60 * 1000,
  });
}

export function useBacktest(params?: { node?: string; horizon?: number }) {
  return useQuery({
    queryKey: queryKeys.backtest(params?.node, params?.horizon),
    queryFn: () => apiClient.getBacktest(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAlerts(params?: { date?: string }) {
  return useQuery({
    queryKey: queryKeys.alerts(params?.date),
    queryFn: () => apiClient.getAlerts(params),
    staleTime: 60 * 1000,
  });
}

export function useMetrics() {
  return useQuery({
    queryKey: queryKeys.metrics,
    queryFn: () => apiClient.getMetrics(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useSavings(params?: SavingsRequest) {
  return useQuery({
    queryKey: queryKeys.savings(params),
    queryFn: () => apiClient.getSavings(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useScenarioMutation() {
  return useMutation({
    mutationFn: (payload: ScenarioRequest) => apiClient.postScenario(payload),
  });
}

