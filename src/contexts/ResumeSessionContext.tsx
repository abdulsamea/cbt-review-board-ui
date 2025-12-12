import React, { createContext, useContext, useState, type ReactNode } from 'react';
import type { SessionStatus } from '../types/session';

interface ResumeSessionContextType {
  resumeData: SessionStatus | null;
  setResumeData: (data: SessionStatus | null) => void;
  clearResumeData: () => void;
}

const ResumeSessionContext = createContext<ResumeSessionContextType | undefined>(undefined);

export const ResumeSessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [resumeData, setResumeData] = useState<SessionStatus | null>(null);

  const clearResumeData = () => {
    setResumeData(null);
  };

  return (
    <ResumeSessionContext.Provider
      value={{
        resumeData,
        setResumeData,
        clearResumeData,
      }}
    >
      {children}
    </ResumeSessionContext.Provider>
  );
};

export const useResumeSession = (): ResumeSessionContextType => {
  const context = useContext(ResumeSessionContext);
  if (context === undefined) {
    throw new Error('useResumeSession must be used within a ResumeSessionProvider');
  }
  return context;
};

