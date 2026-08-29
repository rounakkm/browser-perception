export interface DOMElement {
  element_id: string;
  type: string;
  role?: string;
  label?: string;
  value?: string;
  text?: string;
  bbox?: number[]; // [x, y, width, height]
  attributes: Record<string, string>;
  is_interactive: boolean;
}

export interface SanitizedElement {
  element_id: string;
  type: string;
  role?: string;
  label?: string;
  value?: string;
  text?: string;
  bbox?: number[];
  is_interactive: boolean;
  sensitive: boolean;
}

export interface VisualElement {
  bbox: number[];
  text_content?: string;
  confidence: number;
}

export interface ProcessingMetrics {
  capture_ms: number;
  dom_ms: number;
  ocr_ms: number;
  vision_ms: number;
  sanitization_ms: number;
  total_ms: number;
}

export interface DashboardState {
  url: string;
  title: string;
  screenshot_url?: string;
  raw_elements: DOMElement[];
  sanitized_elements: SanitizedElement[];
  ocr_results: VisualElement[];
  vision_results: VisualElement[];
  metrics: ProcessingMetrics;
  viewport: Record<string, number>;
  timestamp: number;
}

export interface InspectableElement {
  element_id?: string;
  type?: string;
  role?: string;
  label?: string;
  value?: string;
  text?: string;
  text_content?: string;
  confidence?: number;
  bbox?: number[];
  is_interactive?: boolean;
  sensitive?: boolean;
}
