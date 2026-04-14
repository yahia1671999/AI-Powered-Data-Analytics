export interface DataRecord {
  [key: string]: any;
}

export interface ColumnMetadata {
  name: string;
  type: 'number' | 'string' | 'date' | 'boolean';
  isCategorical: boolean;
}

export interface DashboardConfig {
  title: string;
  kpis: string[]; // Numeric columns to show as KPIs
  charts: {
    type: 'bar' | 'line' | 'pie';
    xAxis: string;
    yAxis: string;
    title: string;
  }[];
  writtenAnalysis?: string; // AI generated written analysis
}
