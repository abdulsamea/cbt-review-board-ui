export type SessionStatusLiteral =
  | "running"
  | "halted"
  | "complete"
  | "revising";

export interface SessionStatus {
  thread_id: string;
  is_complete: boolean;
  status: SessionStatusLiteral;
  current_draft: string | null;
  final_cbt_plan: string | null;
  safety_metric: number | null;
  empathy_metric: number | null;
  active_node: string | null;
  active_node_label: string | null;
  thread_alive?: boolean;
  error?: string | null;
}

export interface ResumeRequest {
  thread_id: string;
  suggested_content: string;
  human_decision: "Approve" | "Reject";
}

export interface StartRequest {
  user_prompt: string;
}
