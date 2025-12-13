import axios from "axios";
import type {
  SessionStatus,
  StartRequest,
  ResumeRequest,
} from "../types/session";

const API_BASE_URL = "http://localhost:8000";

// API to start a new session
export const startSession = async (
  data: StartRequest
): Promise<SessionStatus> => {
  try {
    const response = await axios.post<SessionStatus>(
      `${API_BASE_URL}/start_session`,
      data
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Failed to start session.");
    }
    throw new Error("Network error during session start.");
  }
};

// API to resume a halted session (Approve or Reject/Revise)
export const resumeSession = async (
  data: ResumeRequest
): Promise<SessionStatus> => {
  try {
    const response = await axios.post<SessionStatus>(
      `${API_BASE_URL}/resume_session`,
      data
    );
    const res = response.data;
    return res;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(
        error.response.data.detail || "Failed to resume session."
      );
    }
    throw new Error("Network error during session resume.");
  }
};
