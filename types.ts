
export interface ConversionResult {
  latex: string;
  html: string;
}

export enum FileType {
  PDF = 'application/pdf',
  DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
}

export interface ProcessingFile {
  file: File;
  type: FileType;
  status: 'idle' | 'processing' | 'completed' | 'error';
  progress: number;
  result?: ConversionResult;
  error?: string;
}
