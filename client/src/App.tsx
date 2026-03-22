import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useAuthStore } from './store/authStore';
import { useAuthInit } from './hooks/useAuthInit';
import { useGlobalSocketEvents } from './hooks/useGlobalSocketEvents';

import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import FriendsPage from './pages/FriendsPage';
import LeaderboardPage from './pages/LeaderboardPage';
import MinesGamePage from './pages/MinesGamePage';
import WordJumblePage from './pages/WordJumblePage';
import ProfileCompletionModal from './components/ui/ProfileCompletionModal';

import './styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AppShell() {
  const { initialized } = useAuthInit();
  useGlobalSocketEvents();

  if (!initialized) {
    return (
      <div className="min-h-screen bg-vault-bg-deep flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-vault-violet flex items-center justify-center shadow-glow-md animate-pulse">
            <span className="text-white text-xl font-display font-bold">V</span>
          </div>
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-vault-violet animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="noise-overlay" />
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/profile/:username?" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/friends" element={<ProtectedRoute><FriendsPage /></ProtectedRoute>} />
        <Route path="/leaderboard" element={<ProtectedRoute><LeaderboardPage /></ProtectedRoute>} />
        <Route path="/games/mines/:roomCode?" element={<ProtectedRoute><MinesGamePage /></ProtectedRoute>} />
        <Route path="/games/word-jumble/:roomCode?" element={<ProtectedRoute><WordJumblePage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ProfileCompletionModal />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1E1545',
            color: '#E8E4FF',
            border: '1px solid #2A1F5A',
            borderRadius: '10px',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#22D3A0', secondary: '#1E1545' } },
          error: { iconTheme: { primary: '#FF4D6A', secondary: '#1E1545' } },
        }}
      />
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
