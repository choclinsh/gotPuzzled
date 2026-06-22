import React from 'react';
import '../App.css';

/**
 * StatCard — presentational card for one dashboard statistic.
 * @param {string} title       - stat name (e.g. "Largest Puzzle Solved")
 * @param {string|number} value - the value to display
 * @param {string} icon        - emoji/icon shown beside the value
 * @param {string} [description] - optional sub-text under the value
 */
export default function StatCard({ title, value, icon, description }) {
    return (
        <div className="stat-card">
            <div className="stat-icon">{icon}</div>
            <div className="stat-content">
                <h3 className="stat-title">{title}</h3>
                <p className="stat-value">{value}</p>
                {description && <p className="stat-desc">{description}</p>}
            </div>
        </div>
    );
}