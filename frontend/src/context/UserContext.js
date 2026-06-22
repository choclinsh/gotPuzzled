/**
 * UserContext — holds the logged-in user across the whole app.
 *
 * Provided in App.js as { user, setUser }. `user` is the profile object
 * returned by the API after login (or null when logged out). Components read it
 * with useContext(UserContext); the login/logout flows and Settings update it.
 */
import { createContext } from "react";
const UserContext = createContext(null);
export default UserContext;