import Dashboard from './components/Dashboard';
import { ResumeSessionProvider } from './contexts/ResumeSessionContext';

function App() {
  return (
    <ResumeSessionProvider>
      <Dashboard />
    </ResumeSessionProvider>
  );
}

export default App;