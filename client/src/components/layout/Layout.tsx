import { ReactNode } from 'react';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import AIChatBot from '../chat/AIChatBot';

interface LayoutProps {
  children: ReactNode;
  showChat?: boolean;
}

export default function Layout({ children, showChat = true }: LayoutProps) {
  return (
    <div className="min-h-screen bg-vault-bg-deep">
      <TopBar />
      <Sidebar />
      <main className="relative">
        {children}
      </main>
      {showChat && <AIChatBot />}
    </div>
  );
}
