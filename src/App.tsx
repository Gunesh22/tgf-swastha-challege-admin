import { Routes, Route, Navigate } from 'react-router-dom';

import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import ManageChallenges from './pages/ManageChallenges';
import Users from './pages/Users';
import UserDetail from './pages/UserDetail';
import Analytics from './pages/Analytics';
import Leaderboard from './pages/Leaderboard';
import ContentManagement from './pages/ContentManagement';

export default function App() {
  return (
    <div className="app-layout">
      <Sidebar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/challenges" element={<ManageChallenges />} />
        <Route path="/users" element={<Users />} />
        <Route path="/users/:id" element={<UserDetail />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/content" element={<ContentManagement />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}
