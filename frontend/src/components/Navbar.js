/**
 * Navbar — top navigation for the authenticated pages.
 *
 * Shows the logo, links to Dashboard/Leaderboard/Settings, a greeting, a
 * collapsible "Details" panel with the user's profile, and a Logout button that
 * calls the API, clears the user from context, and returns to the login page.
 */
import { useState, useContext } from "react";
import './Navbar.css';
import { useNavigate, Link } from 'react-router-dom';
import UserContext from '../context/UserContext';
import {authService} from "../services/authService";
import '../App.css';

export default function Navbar() {
    const { user, setUser } = useContext(UserContext);
    const navigate = useNavigate();

    // Add state for the details dropdown
    const [showDetails, setShowDetails] = useState(false);

    const handleLogout = async () => {
        try {
            await authService.logout();

            console.log('Logged out successfully from backend');
            setUser(null);

        } catch (error) {
            console.error('Error during logout:', error);
        } finally {
            navigate('/', { replace: true });
        }
    };

    return (
        <nav className="navbar">
            {/* LOGO SECTION */}
            <div className="navbar__brand">
                <img src="/assets/logo.jpg" alt="gotPuzzled Game Logo" className="logo-image" />
            </div>

            <ul className="navbar__nav">
                <li><Link to="/dashboard" className="navbar__link">Dashboard</Link></li>
                <li><Link to="/leaderboard" className="navbar__link">My Leaderboard</Link></li>
            </ul>

            <div className="navbar__user">
                {/* Optional chaining (?) prevents crashes if user is null for a split second */}
                <span className="username">Welcome, {user?.firstName}!</span>

                {/* 2. The Details Toggle Button */}
                <button
                    className="details-btn"
                    onClick={() => setShowDetails(!showDetails)}
                >
                    Details 👤
                </button>

                <Link to="/settings">
                    <button className="settings-btn">Settings ⚙️</button>
                </Link>
                <button className="logout-btn" onClick={handleLogout}>Logout</button>
            </div>

            {/* 3. The Pop-up Card (Only renders if showDetails is true) */}
            {showDetails && user && (
                <div className="details-dropdown">
                    <h4>My Profile</h4>
                    <p><strong>First Name:</strong> {user.firstName}</p>
                    <p><strong>Last Name:</strong> {user.lastName}</p>
                    <p><strong>Email:</strong> {user.email}</p>
                    <p><strong>Role:</strong> {user.userRole}</p>
                </div>
            )}
        </nav>
    );
}