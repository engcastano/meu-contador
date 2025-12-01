import { CardConfig } from './types';

// Deixamos vazio para garantir que o sistema inicie limpo
export const MOCK_CONTABIL_CSV = ``;

export const MOCK_NUBANK_CSV = ``;

// Configuração vazia para não criar cartões indesejados na inicialização
export const CARD_CONFIGS: Record<string, CardConfig> = {};

export const MONTH_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

export const YEARS = [2023, 2024, 2025, 2026];