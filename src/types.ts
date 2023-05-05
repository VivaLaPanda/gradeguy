// types.ts
export type GradeRequest = {
  samples: Array<{ text: string; grade: string }>;
  essayText: string;
  essayPrompt: string;
};

export interface GradeResponse {
  grade: string;
}

export interface ErrorResponse {
  error: string;
}
