import React from "react";
import '../App.css';

/**
 * Footer — site footer with the project name, blurb, and copyright.
 * year for the copyright line (defaults to current year).
 */
export default function Footer({ year = new Date().getFullYear() }) {
    return (
        <footer className="app-footer">
            <hr className="footer-divider" />
            <div className="footer-content">
                {/* Project/team name and short description or slogan */}
                <h3 className="footer-title">GOT PUZZLED!</h3>
                <p className="footer-description">
                    Beat the clock. Master the puzzle. Every second counts in the ultimate
                    race against the clock or your opponent, it's your choice! Sharpen your
                    reflexes, get better and better each time you play and you'll break your
                    own best score! You can even choose the pictures, number of rounds and your opponent!
                </p>

                {/* Copyright and Year */}
                <small className="footer-copyright">
                    &copy; {year} Team 9. Images from Pexels API. All rights reserved.
                </small>
            </div>
        </footer>
    );
}