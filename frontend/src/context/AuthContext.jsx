import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as api from '../apiServices';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const refreshUser = useCallback(async () => {
        if (!api.getAccessToken() && !api.getRefreshToken()) {
            setUser(null);
            setLoading(false);
            return;
        }
        try {
            const data = await api.fetchCurrentUser();
            setUser(data.user);
        } catch {
            api.clearAuthTokens();
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshUser();
    }, [refreshUser]);

    const signIn = useCallback(async (payload) => {
        const data = await api.login(payload);
        setUser(data.user);
        return data;
    }, []);

    const signOut = useCallback(async () => {
        await api.logout();
        setUser(null);
    }, []);

    const value = useMemo(
        () => ({ user, loading, signIn, signOut, refreshUser }),
        [user, loading, signIn, signOut, refreshUser]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return ctx;
}
