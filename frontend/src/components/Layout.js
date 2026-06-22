/**
 * Layout — shared page chrome and global background-music player.
 *
 * Wraps every authenticated route (Dashboard, Leaderboard, Settings) and stays
 * mounted across navigation. Because this component never unmounts between
 * those pages, its Audio node persists and the menu soundtrack plays
 * seamlessly without restarting on every route change.
 *
 * Music logic:
 *   - Plays while the user is on any menu route (/dashboard, /leaderboard, /settings).
 *   - Pauses (preserving playback position) when a game is active. The gameActive
 *     flag is set by Dashboard via VolumeContext when a game mode starts or ends.
 *   - Resumes from the paused position when the user returns to the menu.
 */
import { useState, useEffect, useContext } from "react";
import { useLocation } from "react-router-dom";
import Footer from './Footer';
import Navbar from "./Navbar";
import VolumeContext, { useBackgroundMusic } from "../context/VolumeContext";
import '../App.css';

/** Routes where the menu soundtrack should be playing. */
const MENU_ROUTES = ['/dashboard', '/leaderboard', '/settings'];

const MENU_MUSIC_SRC = '/assets/game_menu_sound.mp3';

export default function Layout({ children }) {
    const [year, setYear] = useState("");
    const location = useLocation();
    const { gameActive } = useContext(VolumeContext);

    useEffect(() => {
        async function fetchYear() {
            try {
                const res = await fetch("https://worldtimeapi.org/api/timezone/Asia/Jerusalem");
                const data = await res.json();
                setYear(new Date(data.datetime).getFullYear());
            } catch {
                setYear(new Date().getFullYear());
            }
        }
        fetchYear();
    }, []);

    // Global background-music player — lives here so it persists across all three
    // menu pages. enabled=false pauses without resetting position, so returning
    // from a game resumes the track mid-song rather than starting over.
    const isMenuRoute = MENU_ROUTES.includes(location.pathname);
    useBackgroundMusic(MENU_MUSIC_SRC, { enabled: isMenuRoute && !gameActive });

    return (
        <div className="app-wrapper">
            <Navbar />
            <main className="page-container">
                {children}
            </main>
            <Footer year={year} />
        </div>
    );
}
