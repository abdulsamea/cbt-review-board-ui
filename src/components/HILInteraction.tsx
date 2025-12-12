import React, { useState } from "react";
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
import { resumeSession } from "../services/api";
import type { SessionStatus } from "../types/session";
import { useResumeSession } from "../contexts/ResumeSessionContext";

interface HILInteractionProps {
  sessionStatus: SessionStatus;
  setSessionStatus: React.Dispatch<React.SetStateAction<SessionStatus | null>>;
}

const HILInteraction: React.FC<HILInteractionProps> = ({
  sessionStatus,
  setSessionStatus,
}) => {
  // Access global resume session context
  const { setResumeData } = useResumeSession();
  
  // Current draft is editable by the user
  const [draftContent, setDraftContent] = useState(
    sessionStatus.current_draft || ""
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"Approve" | "Reject" | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
      const resumeData = await resumeSession({
        thread_id: sessionStatus.thread_id,
        suggested_content: draftContent, // Send edited content (revision instruction or final draft)
        human_decision: decision,
      });
      
      // Store resumeData globally so it can be accessed from Dashboard and other components
      setResumeData(resumeData);
      
      // Success: Stream will now update the state
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

      <TextField
        fullWidth
        multiline
        rows={10}
        label="Draft for Review (Edit to provide revision instructions)"
        value={draftContent}
        onChange={(e) => setDraftContent(e.target.value)}
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
          Reject & Revise
        </Button>
      </Box>

      {/* Confirmation Dialog (Point 6) */}
      <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)}>
        <DialogTitle>
          {actionType === "Approve" ? "Confirm Approval" : "Confirm Revision"}
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to **{actionType}** the current draft?
            {actionType === "Reject" &&
              " The content above will be sent as revision instructions to the drafting agent."}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleConfirm}
            color={actionType === "Approve" ? "primary" : "error"}
            variant="contained"
          >
            Yes, {actionType}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HILInteraction;
