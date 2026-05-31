import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, BarChart2, Medal, Settings, Sun } from 'lucide-react';

export default function Sidebar() {
    const location = useLocation();

    const navItems = [
        { path: '/', label: 'Overview', icon: LayoutDashboard },
        { path: '/users', label: 'All Users', icon: Users },
        { path: '/leaderboard', label: 'Leaderboard', icon: Medal },
        { path: '/analytics', label: 'Analytics', icon: BarChart2 },
        { path: '/challenges', label: 'Manage Challenges', icon: Settings },
    ];


    return (
        <div className="sidebar">
            <div className="sidebar-logo">
                <Sun size={28} />
                TGF Admin
            </div>

            <div className="nav-links">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                        >
                            <Icon size={20} />
                            {item.label}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
