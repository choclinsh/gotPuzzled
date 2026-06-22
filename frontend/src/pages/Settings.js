/**
 * Settings.js — account settings page with inline, per-field editing.
 *
 * FIELDS declares the editable fields (name, email, theme). Each renders as a
 * FieldRow that can be edited and saved independently. Saving validates the
 * value, PUTs the full settings object, then updates both local state and the
 * global UserContext so the rest of the app reflects the change immediately.
 */
import React, { useState, useEffect, useContext } from "react";
import UserContext from "../context/UserContext";
import { settingsService } from "../services/settingsService"; // Adjust path as needed
import { useVolume } from "../context/VolumeContext";

import '../App.css';

// Static configuration definitions matching your exact backend schema fields
const FIELDS = [
    { key: "firstName", label: "First Name", type: "text" },
    { key: "lastName", label: "Last Name", type: "text" },
    { key: "email", label: "Email Address", type: "email" },
    {
        key: "theme",
        label: "Theme Preference",
        type: "select",
        options: [
            { value: "light", label: "Light Mode" },
            { value: "dark", label: "Dark Mode" },
            { value: "retro", label: "Retro (Puzzle Classic)" },
        ],
    },
];

// Client-side Validation Logic
function validate(key, value) {
    if (key === "firstName") {
        if (!value.trim()) return "First name is required.";
    }
    if (key === "lastName") {
        if (!value.trim()) return "Last name is required.";
    }
    if (key === "email") {
        if (!value.trim()) return "Email is required.";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
            return "Please enter a valid email address.";
    }
    return "";
}

// Reusable individual inline field editor row
function FieldRow({ fieldKey, label, type, options, savedValue, fullSettings, onSaved }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(savedValue);
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const { user } = useContext(UserContext);
    const id = user.userId;
    const userRole = user.userRole;

    // Sync draft state with saved value if it changes externally
    useEffect(() => {
        setDraft(savedValue);
    }, [savedValue]);

    const startEdit = () => {
        setDraft(savedValue);
        setError("");
        setEditing(true);
    };

    const cancelEdit = () => {
        setDraft(savedValue);
        setError("");
        setEditing(false);
    };

    const save = async (value = draft) => {
        const err = validate(fieldKey, value);
        if (err) {
            setError(err);
            return;
        }

        setSubmitting(true);
        setError("");

        try {
            // Create full settings object containing all fields
            const payload = {
                ...fullSettings,
                [fieldKey]: value,
            };

            // Call the external service instead of using fetch directly
            await settingsService.updateSettings(id, userRole, payload);

            onSaved(fieldKey, value);
            setEditing(false);
        } catch (e) {
            setError(e.message || "An error occurred while saving.");
        } finally {
            setSubmitting(false);
        }
    };

    // Render for select/dropdown fields
    if (type === "select") {
        return (
            <div className="field-card">
                <label className="field-label" htmlFor={fieldKey}>{label}</label>
                <div className="field-row">
                    <select
                        id={fieldKey}
                        value={savedValue}
                        onChange={(e) => save(e.target.value)}
                        disabled={submitting}
                        className="field-input"
                    >
                        {options.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                    {submitting && <span className="field-saving">Saving…</span>}
                </div>
                {error && <span className="error-text">{error}</span>}
            </div>
        );
    }

    // Render for normal text/email inputs
    return (
        <div className="field-card">
            <label className="field-label" htmlFor={fieldKey}>{label}</label>
            <div className="field-row">
                {editing ? (
                    <input
                        id={fieldKey}
                        type={type}
                        value={draft}
                        onChange={(e) => {
                            setDraft(e.target.value);
                            setError("");
                        }}
                        className={`field-input ${error ? "input-error" : ""}`}
                        autoFocus
                    />
                ) : (
                    <span className="field-value">{savedValue || <em>(Not set)</em>}</span>
                )}

                {editing ? (
                    <>
                        <button onClick={() => save()} disabled={submitting} className="btn-save">
                            {submitting ? "Saving…" : "Save"}
                        </button>
                        <button onClick={cancelEdit} disabled={submitting} className="btn-cancel">
                            Cancel
                        </button>
                    </>
                ) : (
                    <button onClick={startEdit} className="btn-edit">Edit</button>
                )}
            </div>
            {error && <span className="error-text">{error}</span>}
        </div>
    );
}

function VolumeRow() {
    const { volume, setVolume } = useVolume();
    const pct = Math.round(volume * 100);

    return (
        <div className="field-card">
            <label className="field-label" htmlFor="volume">
                Game Volume
            </label>
            <div className="field-row volume-row">
                <input
                    id="volume"
                    type="range"
                    min="0"
                    max="100"
                    value={pct}
                    onChange={(e) => setVolume(Number(e.target.value) / 100)}
                    className="volume-slider"
                />
                <span className="volume-value">{pct}%</span>
            </div>
        </div>
    );
}

function MuteRow() {
    const { isMuted, toggleMute } = useVolume();

    return (
        <div className="field-card">
            <span className="field-label">Sound</span>
            <div className="field-row">
                <button
                    type="button"
                    className={`mute-btn${isMuted ? ' mute-btn--muted' : ''}`}
                    onClick={toggleMute}
                    aria-pressed={isMuted}
                >
                    {isMuted ? '🔇 Muted' : '🔊 Sound On'}
                </button>
                <span className="volume-value" style={{ marginLeft: '0.5rem' }}>
                    {isMuted ? 'All sounds silenced' : 'Click to mute all sounds'}
                </span>
            </div>
        </div>
    );
}

// Main View Component export
export default function Settings() {
    const { user, setUser } = useContext(UserContext);
    const [settings, setSettings] = useState({ firstName: "", lastName: "", email: "", theme: "light" });
    const [loading, setLoading] = useState(true);
    const [fetchErr, setFetchErr] = useState("");
    const [toast, setToast] = useState("");

    const id = user.userId;
    const userRole = user.userRole;

    useEffect(() => {
        const loadBackendSettings = async () => {
            try {
                setLoading(true);

                // Call the external service
                const data = await settingsService.getSettings(id, userRole);

                setSettings({
                    firstName: data.firstName ?? "",
                    lastName: data.lastName ?? "",
                    email: data.email ?? "",
                    theme: data.theme ?? "light",
                });
            } catch (e) {
                setFetchErr(e.message || "An error occurred fetching initial data.");
            } finally {
                setLoading(false);
            }
        };

        loadBackendSettings();
    }, [id, userRole]); // Added dependencies to useEffect

    const handleSaved = (key, value) => {
        // 1. Update the local settings state for this specific page
        setSettings((prev) => ({ ...prev, [key]: value }));

        setUser((prevUser) => ({ ...prevUser, [key]: value }));

        const cleanLabel = key === "firstName"
            ? "First Name"
            : key === "lastName"
                ? "Last Name"
                : key.charAt(0).toUpperCase() + key.slice(1);

        setToast(`${cleanLabel} updated successfully!`);
        setTimeout(() => setToast(""), 2500);
    };

    if (loading) {
        return (
            <div className="settings-page-wrapper light">
                <div className="settings-container loading-state">
                    <p>Loading settings configurations…</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`settings-page-wrapper ${settings.theme}`}>
            <div className="settings-container">
                <h2>Account Settings</h2>
                <p className="section-subtitle">Update any configuration individually—no need to re-enter fields.</p>

                {fetchErr && <div className="alert alert-danger">{fetchErr}</div>}
                {toast && <div className="alert alert-success">{toast}</div>}

                <div className="fields-wrapper">
                    {FIELDS.map((f) => (
                        <FieldRow
                            key={f.key}
                            fieldKey={f.key}
                            label={f.label}
                            type={f.type}
                            options={f.options}
                            savedValue={settings[f.key]}
                            fullSettings={settings}
                            onSaved={handleSaved}
                        />
                    ))}
                    <VolumeRow />
                    <MuteRow />
                </div>
            </div>
        </div>
    );
}