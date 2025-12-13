import React, { useState, useEffect } from "react";
import {
  Button,
  TextField,
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
} from "@mui/material";
import ReactMarkdown from "react-markdown";
import { resumeSession } from "../services/api";
import type { SessionStatus } from "../types/session";
import { useResumeSession } from "../contexts/ResumeSessionContext";

interface HILInteractionProps {
  sessionStatus: SessionStatus;
  setSessionStatus: React.Dispatch<React.SetStateAction<SessionStatus | null>>;
  restartStream: () => void;
}

const HILInteraction: React.FC<HILInteractionProps> = ({
  sessionStatus,
  setSessionStatus,
  restartStream,
}) => {

  const { setResumeData } = useResumeSession();
  
  // Original draft (non-editable, from sessionStatus)
  const [originalDraft, setOriginalDraft] = useState(
    sessionStatus.current_draft || ""
  );
  
  // User suggestions (editable, for revision instructions)
  const [userSuggestions, setUserSuggestions] = useState("");
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"Approve" | "Reject" | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Update original draft when sessionStatus changes (e.g., new draft from stream)
  useEffect(() => {
    if (sessionStatus.current_draft) {
      setOriginalDraft(sessionStatus.current_draft);
      // Clear user suggestions when new draft arrives
      setUserSuggestions("");
    }
  }, [sessionStatus.current_draft]);

  const handleActionClick = (type: "Approve" | "Reject") => {
    setActionType(type);
    setIsDialogOpen(true);
    setSubmitError(null);
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setIsDialogOpen(false);
    const decision = actionType as "Approve" | "Reject";

    // Optimistic UI update: Start stream polling again immediately
    setSessionStatus((prev) =>
      prev
        ? {
            ...prev,
            status: decision === "Approve" ? "running" : "revising",
            thread_alive: true,
            active_node: decision === "Approve" ? "Finalize" : "Drafting", // Show routing hint
          }
        : null
    );

    try {
      // 1. Invoke resume API with required data
      // For "Approve", use original draft; for "Reject", use user suggestions from second text area
      const suggestedContent = decision === "Approve" 
        ? originalDraft 
        : userSuggestions; // Use user suggestions (can be empty string)
      
      const resumeData = await resumeSession({
        thread_id: sessionStatus.thread_id,
        suggested_content: suggestedContent,
        human_decision: decision,
      });
      
      // Store resumeData globally so it can be accessed from Dashboard and other components
      setResumeData(resumeData);
      
      // 2. Open SSE connection for same thread and start listening
      if (decision === "Reject") {
        restartStream();
        console.log('SSE stream restarted for thread:', sessionStatus.thread_id);
      }
      
      // 3. Stream will now update the state with latest draft data
    } catch (error) {
      console.error("Resume failed:", error);
      setSubmitError(
        `Failed to resume session: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      // Revert status on failure for immediate feedback
      setSessionStatus((prev) =>
        prev ? { ...prev, status: "halted", thread_alive: false } : null
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitting) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          {actionType === "Approve" ? "Finalizing..." : "Sending Revision..."}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: 3,
        border: "1px solid #ddd",
        borderRadius: 2,
        backgroundColor: "#fff8e1",
      }}
    >
      <Typography variant="h5" gutterBottom color="error">
        User Suggestion Needed
      </Typography>
      {submitError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {submitError}
        </Alert>
      )}

      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: "bold" }}>
        Original Draft
      </Typography>
      <Box
        sx={{
          border: "1px solid #ddd",
          p: 2,
          backgroundColor: "#f5f5f5",
          borderRadius: 1,
          mb: 3,
          minHeight: "200px",
          maxHeight: "400px",
          overflowY: "auto",
        }}
      >
        {originalDraft ? (
          <ReactMarkdown>{originalDraft}</ReactMarkdown>
        ) : (
          <Typography color="text.secondary">No draft available</Typography>
        )}
      </Box>

      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: "bold" }}>
        Your Suggestions / Revision Instructions
      </Typography>
      <TextField
        fullWidth
        multiline
        rows={6}
        label="Enter your revision suggestions or instructions here"
        value={userSuggestions}
        onChange={(e) => setUserSuggestions(e.target.value)}
        placeholder="Provide your feedback, revision instructions, or suggestions for improving the draft..."
        sx={{ mb: 2 }}
      />

      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => handleActionClick("Approve")}
          sx={{ flexGrow: 1 }}
        >
          Approve & Finalize
        </Button>
        <Button
          variant="outlined"
          color="error"
          onClick={() => handleActionClick("Reject")}
          sx={{ flexGrow: 1 }}
        >
          Revise
        </Button>
      </Box>

      <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)}>
        <DialogTitle>
          {actionType === "Approve" ? "Confirm Approval" : "Confirm Revision"}
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to {actionType === 'Reject' ? 'revise' : 'accept'} the current draft?
            {actionType === "Reject" && (
              <Box component="span">
                
                {userSuggestions && " Your suggestions will be sent as revision instructions to the drafting agent."}
                {!userSuggestions && (
                  <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
                    Note: No suggestions provided. The original draft will be used.
                  </Typography>
                )}
              </Box>
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleConfirm}
            color={actionType === "Approve" ? "primary" : "error"}
            variant="contained"
          >
            Yes, {actionType === 'Reject' ? 'revise this draft' : 'I accept this draft'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HILInteraction;
