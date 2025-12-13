// src/components/Dashboard.tsx

import React, { useState } from 'react';
import { 
    Grid, Paper, Typography, Box, Alert, LinearProgress, 
    FormControl, Select, MenuItem, InputLabel
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ReactMarkdown from 'react-markdown';

import { useSessionStream } from '../hooks/useSessionStream';
import { startSession } from '../services/api'; 
 // Assuming you define SessionStatus type
import HILInteraction from './HILInteraction'; 

// --- Interface Definitions (Assuming these are where your types are) ---

interface StatusIndicatorProps {
    status: string;
    threadAlive: boolean;
}

interface MetricsDisplayProps {
    label: string;
    value: number | null | undefined;
}

// --- Components ---

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, threadAlive }) => {
    let color: 'error' | 'warning' | 'info' | 'success' = 'info';
    let label = 'Initializing...';

    if (status === "complete") {
        color = 'success';
        label = 'COMPLETE (Finalized)';
    } else if (status === "halted") {
        color = 'error';
        label = 'HALTED (Awaiting Review)';
    } else if (status === "running") {
        color = 'info';
        label = 'RUNNING';
    } else if (status === "revising") {
        color = 'warning';
        label = 'REVISING...';
    }

    if (threadAlive && status !== "complete") {
        label = `${label} (Active)`;
    }

    return (
        <Alert severity={color} sx={{ mb: 1, fontWeight: 'bold' }}>
            Status: {label}
        </Alert>
    );
};

const MetricsDisplay: React.FC<MetricsDisplayProps> = ({ label, value }) => {
    if (value === null || value === undefined) return null;
    const score = Math.round(value * 100) / 100; // Display 2 decimal places

    return (
        <Box sx={{ my: 1 }}>
            <Typography variant="body2">{label} ({score.toFixed(2)})</Typography>
            <LinearProgress 
                variant="determinate" 
                value={score * 100} 
                sx={{ height: 8, borderRadius: 5 }} 
                color={score >= 0.8 ? 'success' : (score >= 0.5 ? 'warning' : 'error')}
            />
        </Box>
    );
};

const ActiveNodeDisplay: React.FC<{ label: string | null | undefined }> = ({ label }) => {
    if (!label) return null;
    return (
        <Alert severity="info" sx={{ mb: 1 }}>
            Active Agent: <strong>{label}</strong>
        </Alert>
    );
};

// --- Main Dashboard ---

const Dashboard: React.FC = () => {
    const [prompt, setPrompt] = useState("I often feel depressed when I fail coding interviews. Can you generate a simple CBT exercise for managing the stress?");
    const [threadId, setThreadId] = useState<string | null>(null);
    const [modelChoice, setModelChoice] = useState('openai');

    // useSessionStream is the core hook fetching status updates
    const { sessionStatus, setSessionStatus, isLoading, error: streamError, restartStream } = useSessionStream(threadId);


    const handleStartSession = async () => {
        try {
            setThreadId(null); // Reset thread ID to restart stream
            setSessionStatus(null);
            
            const newStatus = await startSession({ user_prompt: prompt, model_choice: modelChoice });
            setThreadId(newStatus.thread_id);
            setSessionStatus(newStatus);
        } catch (err) {
            console.error("Error starting session:", err);
            alert("Failed to start session. Check console for details.");
        }
    };

    const renderMainContent = () => {
        if (!sessionStatus) {
            return (
                <Paper elevation={3} sx={{ padding: '10px', minWidth: '100%',  height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="h6" color="textSecondary">CBT Draft Will be seen here.</Typography>
                </Paper>
            );
        }

        // Check 1: Display the final completed state (Standard success path)
        if (sessionStatus.status === 'complete' && sessionStatus.final_cbt_plan) {
            return (
                <Paper elevation={3} sx={{ p: 3, backgroundColor: '#e8f5e9', height: '100%' }}>
                    <Typography variant="h4" color="success" gutterBottom>✅ Final Approved CBT Plan</Typography>
                    <Box sx={{ border: '1px solid #ccc', p: 2, backgroundColor: '#fff', maxHeight: '70vh', overflowY: 'auto', borderRadius: 1 }}>
                        <ReactMarkdown>{sessionStatus.final_cbt_plan}</ReactMarkdown>
                    </Box>
                    <Alert severity="success" sx={{mt: 2}}>Final artifact saved and session complete.</Alert>
                </Paper>
            );
        }

        // Check 2: Awaiting human input (HILInteraction rendering)
        if (sessionStatus.status === 'halted' && sessionStatus.active_node === 'Critic' && sessionStatus.current_draft) {
            return (
                <HILInteraction 
                    sessionStatus={sessionStatus} 
                    setSessionStatus={setSessionStatus}
                    restartStream={restartStream}
                />
            );
        }

        // --- CRITICAL DEFENSIVE CHECK (For missed 'complete' status) ---
        // If the thread is confirmed dead (!thread_alive) OR the stream failed (error), 
        // AND we have final plan data, force the final view display.
        if ((!sessionStatus.thread_alive) && sessionStatus.final_cbt_plan) {
            return (
                 <Paper elevation={3} sx={{ p: 3, height: '100%', backgroundColor: '#e8f5e9' }}>
                    <Typography variant="h4" color="success" gutterBottom>✅ Final Approved CBT Plan (Retrieved)</Typography>
                    <Alert severity="warning" sx={{mb: 2}}>Stream ended unexpectedly, but final artifact was successfully retrieved from the server.</Alert>
                    <Box sx={{ border: '1px solid #ccc', p: 2, backgroundColor: '#fff', maxHeight: '70vh', overflowY: 'auto', borderRadius: 1 }}>
                        <ReactMarkdown>{sessionStatus.final_cbt_plan}</ReactMarkdown>
                    </Box>
                </Paper>
            );
        }

        // Check 3: Default state (Running, Revising, or unexpected Halt)
        return (
            <Paper
                elevation={3}
                sx={{
                    padding: '15px',
                    height: "100%",
                    overflowY: "auto",
                    backgroundColor: "#fff",
                }}
            >
                <Typography variant="h5" gutterBottom color="primary">
                    { sessionStatus?.active_node === 'Finalize' ? 'Final CBT Report' : 'Current Working Draft' }
                </Typography>

                {/* Display loading/revising indicators */}
                {(sessionStatus?.active_node !== 'Finalize') && (sessionStatus.status === "running" || sessionStatus.status === "revising") && (
                    <Box sx={{ width: "100%", mb: 2 }}>
                      { <LinearProgress /> }
                    </Box>
                )}
                {sessionStatus.status === "revising" && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        The drafting agent is revising based on your feedback.
                    </Alert>
                )}
                
                {/* Display unexpected halt/error */}
                {sessionStatus.status === 'halted' && sessionStatus.active_node !== 'HIL_Node' && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        Session Halted unexpectedly at **{sessionStatus.active_node}**. Check graph logs.
                    </Alert>
                )}
                
                {/* Draft Content */}
                <Box
                    sx={{
                        border: "1px solid #eee",
                        // padding: '10px',
                        minHeight: "300px",
                        backgroundColor: "#f9f9f9",
                        borderRadius: 1,
                    }}
                >
                    {sessionStatus.current_draft ? (
                        <ReactMarkdown>{sessionStatus.current_draft}</ReactMarkdown>
                    ) : (
                        <Typography color="text.secondary">Drafting in progress...</Typography>
                    )}
                </Box>
            </Paper>
        );
    };

    return (
        <Box sx={{ px: 2, py: 3, alignItems: 'center', justifyContent: 'center' }}>
            <Typography
                variant="h3"
                gutterBottom
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
                <DashboardIcon sx={{ mr: 1 }} />
                CBT Review Board Dashboard
            </Typography>

            <Grid container direction="column" sx={{ width: '100vw', minWidth: '100%', px: '10px', py: '10px', overflowX: 'hidden',  alignItems: 'center', justifyContent: 'center'  }} spacing={4}>
                {/* Top row: Start New Session + Session Info side by side */}
                <Grid container direction="row" spacing={3} sx={{ width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                    <Grid sx={{ height: '400px', minWidth: '40%', flexGrow: 0, flexShrink: 0 }}>
                    <Paper elevation={3} sx={{ p: 3, height: '100%', boxSizing: 'border-box' }}>
                        <Typography variant="h5" gutterBottom>1. Start New Session</Typography>
                        <FormControl fullWidth margin="normal">
                        <Typography variant="body2" sx={{ mb: 0.5 }}>User's CBT Requirement/Prompt*</Typography>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            rows={4}
                            style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', width: '100%' }}
                        />
                        </FormControl>
                        <FormControl fullWidth margin="normal">
                        <InputLabel id="model-select-label">Model Choice</InputLabel>
                        <Select
                            labelId="model-select-label"
                            value={modelChoice}
                            label="Model Choice"
                            onChange={(e) => setModelChoice(e.target.value as string)}
                            fullWidth
                        >
                            <MenuItem value={"openai"}>OpenAI (Default)</MenuItem>
                            <MenuItem value={"anthropic"}>Anthropic</MenuItem>
                        </Select>
                        </FormControl>
                        <Box sx={{ mt: 2 }}>
                        <button
                            onClick={handleStartSession}
                            style={{ padding: '10px 20px', backgroundColor: '#1976d2', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            disabled={isLoading}
                        >
                            <PlayArrowIcon sx={{ mr: 1 }} />
                            {threadId ? 'RESTART PROCESS' : 'START PROCESS'}
                        </button>
                        </Box>
                    </Paper>
                    </Grid>

                    <Grid sx={{ height: '400px', minWidth: '40%', flexGrow: 0, flexShrink: 0 }}>
                    <Paper elevation={3} sx={{ p: 3, height: '100%', boxSizing: 'border-box' }}>
                        <Typography variant="h5" gutterBottom>2. Session Info</Typography>
                        {sessionStatus ? (
                        <>
                            <StatusIndicator status={sessionStatus.status} threadAlive={sessionStatus.thread_alive ?? false} />
                            {sessionStatus.status !== 'halted' || sessionStatus.active_node !== 'HIL_Node' ? (
                            <ActiveNodeDisplay label={sessionStatus.active_node_label} />
                            ) : (
                            <Alert severity="info" sx={{ mb: 1 }}>
                                Awaiting Action: <strong>{sessionStatus.active_node_label}</strong>
                            </Alert>
                            )}
                            <MetricsDisplay label="Safety Score" value={sessionStatus.safety_metric} />
                            <MetricsDisplay label="Empathy Score" value={sessionStatus.empathy_metric} />
                            {sessionStatus.error && sessionStatus.error !== "'HIL_Node'" && (
                            <Alert severity="error" sx={{ mt: 2 }}>Graph Error: {sessionStatus.error}</Alert>
                            )}
                        </>
                        ) : (
                        <Typography color="textSecondary">Awaiting session start...</Typography>
                        )}
                        {streamError && (
                        <Alert severity="error" sx={{ mt: 2 }}>Stream Error: {streamError}</Alert>
                        )}
                    </Paper>
                    </Grid>
                </Grid>

                <Grid container direction="row" spacing={3} sx={{ maxWidth: '80%' }}>
                    <Box sx={{ width: '100%' }}>
                    {renderMainContent()}
                    </Box>
                </Grid>
            </Grid>

        </Box>
    );
};

export default Dashboard;