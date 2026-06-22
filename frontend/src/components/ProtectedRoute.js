/**
 * ProtectedRoute — gate for authenticated pages.
 *
 * Renders its children only when a user is logged in (present in UserContext);
 * otherwise redirects to the login page.
 */
import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import UserContext from '../context/UserContext';

export default function ProtectedRoute({ children }) {
    const { user } = useContext(UserContext);

    // No logged-in user → bounce to Login. `replace` keeps the
    // protected URL out of history so Back doesn't return to it.
    if (!user) {
        return <Navigate to="/" replace />;
    }

    return children;
}