/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [auditLogs, setAuditLogs] = useState([]);

    const login = (username, role) => {
        const newUser = { username, role };
        setUser(newUser);
        logBlockchainAccess(newUser, 'LOGIN', 'Successful user authentication');
    };

    const logout = () => {
        if (user) {
            logBlockchainAccess(user, 'LOGOUT', 'User logged out');
        }
        setUser(null);
    };

    const logBlockchainAccess = (currentUser, action, details) => {
        const logEntry = {
            id: `0x${Math.random().toString(16).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            user: currentUser.username,
            role: currentUser.role,
            action,
            details,
            hash: `0x${Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
            verified: true,
        };
        setAuditLogs((prev) => [logEntry, ...prev]);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, auditLogs, logBlockchainAccess }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};