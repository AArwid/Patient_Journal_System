/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [initializing, setInitializing] = useState(true);

    // The server session cookie is the source of truth, so restore it on reload.
    useEffect(() => {
        api.me()
            .then(({ user: sessionUser }) => setUser(sessionUser))
            .catch(() => setUser(null))
            .finally(() => setInitializing(false));
    }, []);

    const login = async (email, password) => {
        const { user: loggedInUser } = await api.login(email, password);
        setUser(loggedInUser);
        return loggedInUser;
    };

    const logout = async () => {
        try {
            await api.logout();
        } finally {
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, initializing, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};