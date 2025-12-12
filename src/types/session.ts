// Matches the status literals from your Python backend
export type SessionStatusLiteral =
  | "running"
  | "halted"
  | "complete"
  | "revising";

// Matches the SessionStatus Pydantic model response
export interface SessionStatus {
  thread_id: string;
  is_complete: boolean;
  status: SessionStatusLiteral;
  current_draft: string | null;
  final_cbt_plan: string | null;
  safety_metric: number | null;
  empathy_metric: number | null;
  model_choice: string;
  active_node: string | null;
  active_node_label: string | null;
  // We add client-side fields for easier UI tracking
  thread_alive?: boolean;
  error?: string | null;
}

// Matches the ResumeSessionRequest structure
export interface ResumeRequest {
  thread_id: string;
  suggested_content: string;
  human_decision: "Approve" | "Reject";
}

// Matches the StartSessionRequest structure
export interface StartRequest {
  user_prompt: string;
  model_choice: string;
}
