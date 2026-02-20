export interface SectionAnalysis {
  text: string;
  ai_probability: number;
  rationale: string;
  markers: string[];
}

export interface PerModelResult {
  sections: SectionAnalysis[];
  overall_score: number;
  summary: string;
  model: string;
}

export interface AnalysisResponse {
  id: string;
  title: string;
  status: string;
  overallScore: number;
  sections: SectionAnalysis[];
  models: string[];
  provider: string;
  summary: string;
  error?: string;
  perModelResults: PerModelResult[];
  progress?: AnalysisProgress;
  createdAt: string;
}

export interface AnalysisProgress {
  totalModels: number;
  completedModels: number;
  currentModel?: string;
  modelStatuses: Record<string, string>;
}

export interface AnalysisListItem {
  id: string;
  title: string;
  status: string;
  overallScore: number;
  provider: string;
  models: string[];
  createdAt: string;
}

export interface ConnectionTestResult {
  success: boolean;
  error?: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  context_length?: number;
  pricing?: any;
  supported_parameters?: string[];
  size?: number;
}
