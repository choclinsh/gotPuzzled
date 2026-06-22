/**
 * Leaderboard.js — score table for the logged-in user.
 *
 * Defaults to the user's personal scores. Admins get a toggle to switch between
 * the personal view and the global view (every user's scores, with a User ID
 * column). `viewMode` ("personal" | "global") drives the title and columns.
 */
import React, { useState, useEffect, useContext } from 'react';
import UserContext from '../context/UserContext';
import { scoreService } from '../services/scoreService';
import '../App.css';


export default function Leaderboard() {
    const { user } = useContext(UserContext);

    const [scores, setScores] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [viewMode, setViewMode] = useState('personal');

    const fetchMyScores = async () => {
        setIsLoading(true);
        try {
            const data = await scoreService.getPersonalScores(user.userId, user.userRole);

            setScores(data || []);
            setViewMode('personal'); // Update the view state
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Load personal scores exactly once when the component mounts
    useEffect(() => {
        if (user && user.userId) {
            fetchMyScores();
        }
    }, [user]);

    // Your new function, renamed to be clear, attached to a button click
    const fetchGlobalScores = async () => {
        setError('');
        setIsLoading(true);
        try {
            const data = await scoreService.getGlobalScores(user.userId, user.userRole);

            setScores(data || []);
            setViewMode('global'); // Update the view state
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) return <div className="leaderboard-message">Loading scores... ⏳</div>;
    if (error) return <div className="leaderboard-message error">{error}</div>;

    return (
        <div className="leaderboard-container">
            <div className="leaderboard-header-wrapper">
                <div className="leaderboard-header">
                    {/* Dynamically change the title based on what we are looking at */}
                    <h2>{viewMode === 'personal' ? 'My Personal Leaderboard' : 'Global Database'}</h2>
                    <p>{viewMode === 'personal' ? `Track your puzzle-solving history, ${user?.firstName}!` : 'Admin View: All user scores'}</p>
                </div>

                {/* THE ADMIN ONLY TOGGLE BUTTON */}
                {user?.userRole === 'admin' && (
                    <div className="admin-controls">
                        {viewMode === 'personal' ? (
                            <button className="admin-btn" onClick={fetchGlobalScores}>
                                🌐 View Full Database
                            </button>
                        ) : (
                            <button className="admin-btn" onClick={fetchMyScores}>
                                👤 Back to Personal
                            </button>
                        )}
                    </div>
                )}
            </div>

            {scores.length === 0 ? (
                <div className="empty-state">
                    <p>No scores found.</p>
                </div>
            ) : (
                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                        <tr>
                            {/* Show User ID column ONLY if we are in global admin view */}
                            {viewMode === 'global' && <th>User ID</th>}
                            <th>Pieces per Puzzle</th>
                            <th>Total Rounds</th>
                            <th>Time</th>
                        </tr>
                        </thead>
                        <tbody>
                        {scores.map((scoreItem, index) => (
                            <tr key={index}>
                                {/* Show User ID data ONLY if we are in global admin view */}
                                {viewMode === 'global' && <td>{scoreItem.id}</td>}
                                <td>{scoreItem.pieces}</td>
                                <td>{scoreItem.rounds}</td>
                                <td>{scoreItem.score}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}