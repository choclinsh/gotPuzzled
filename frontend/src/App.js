/**
 * App.js — root component: global state, theming, and routing.
 *
 * Holds the logged-in user in state and shares it via UserContext. Public route
 * "/" is the Login page; /dashboard, /leaderboard, and /settings are wrapped in
 * ProtectedRoute (redirect to login when logged out) and Layout (navbar/footer).
 * Any unknown URL redirects back to "/".
 */
import React, {useState, useEffect, useContext} from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Layout from './components/Layout';
import Leaderboard from "./pages/Leaderboard";
import UserContext from './context/UserContext';
import { VolumeProvider } from './context/VolumeContext';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

// Applies the logged-in user's theme to the whole app (not just one page)
// by setting the theme class on <html>, where the CSS variables are scoped.
function ThemeManager() {
    const { user } = useContext(UserContext);
    const theme = user?.theme || 'light';

    useEffect(() => {
        document.documentElement.className = theme;
    }, [theme]);

    return null;
}

function App() {
    const [user, setUser] = useState(null);

    return (
        <VolumeProvider>
        <UserContext.Provider value={{ user, setUser }}>
            <ThemeManager />
            <BrowserRouter>
                <Routes>
                    {/* Default route shows the Login page */}
                    <Route path="/" element={<Login />} />

                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute>
                                <Layout><Dashboard /></Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/leaderboard"
                        element={
                            <ProtectedRoute>
                                <Layout><Leaderboard /></Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/settings"
                        element={
                            <ProtectedRoute>
                                <Layout><Settings /></Layout>
                            </ProtectedRoute>
                        }
                    />

                    {/* Fallback: redirect any unknown URL back to login */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </UserContext.Provider>
        </VolumeProvider>
    );
}

export default App;