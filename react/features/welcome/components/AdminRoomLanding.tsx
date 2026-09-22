/* eslint-disable react/jsx-no-bind */
import React, { FormEvent, useCallback, useEffect, useState } from 'react';

type AdminUser = {
    profile?: { name?: string; };
    tenant?: { name?: string; slug?: string; };
    username: string;
};

type Room = {
    createdAt: string;
    expiresAt: string | null;
    guestUrl: string;
    id: string;
    maxParticipants: number;
    status: string;
    title: string | null;
};

type ApiResponse<T> = {
    data: T;
    message?: string;
    success: boolean;
};

interface IProps {
    apiBaseUrl: string;
}

const getErrorMessage = async (response: Response) => {
    const body = await response.json().catch(() => undefined) as { message?: string; } | undefined;

    return body?.message || 'The request could not be completed.';
};

const getRequestErrorMessage = (error: unknown, fallback: string) => error instanceof DOMException && error.name === 'AbortError'
    ? 'The server took too long to respond. Please try again.'
    : error instanceof Error && error.message ? error.message : fallback;

const AdminRoomLanding = ({ apiBaseUrl }: IProps) => {
    const [ accessToken, setAccessToken ] = useState('');
    const [ copiedRoomId, setCopiedRoomId ] = useState('');
    const [ creating, setCreating ] = useState(false);
    const [ error, setError ] = useState('');
    const [ loadingSession, setLoadingSession ] = useState(true);
    const [ loginOpen, setLoginOpen ] = useState(false);
    const [ loggingIn, setLoggingIn ] = useState(false);
    const [ rooms, setRooms ] = useState<Room[]>([]);
    const [ user, setUser ] = useState<AdminUser | null>(null);

    const apiRequest = useCallback(async (path: string, init: RequestInit = {}, token = accessToken) => {
        const headers = new Headers(init.headers);
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 8000);

        headers.set('Accept', 'application/json');
        if (init.body) {
            headers.set('Content-Type', 'application/json');
        }
        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        }

        try {
            return await fetch(`${apiBaseUrl.replace(/\/$/, '')}${path}`, {
                ...init,
                credentials: 'include',
                headers,
                signal: controller.signal
            });
        } finally {
            window.clearTimeout(timeout);
        }
    }, [ accessToken, apiBaseUrl ]);

    const loadRooms = useCallback(async (token: string) => {
        const response = await apiRequest('/rooms', {}, token);

        if (!response.ok) {
            throw new Error(await getErrorMessage(response));
        }
        const body = await response.json() as ApiResponse<Room[]>;

        setRooms(body.data);
    }, [ apiRequest ]);

    useEffect(() => {
        const restoreSession = async () => {
            try {
                const refreshResponse = await apiRequest('/auth/refresh', { method: 'POST' }, '');

                if (!refreshResponse.ok) {
                    return;
                }
                const refreshBody = await refreshResponse.json() as ApiResponse<{ accessToken: string; }>;
                const token = refreshBody.data.accessToken;
                const meResponse = await apiRequest('/auth/me', {}, token);

                if (!meResponse.ok) {
                    return;
                }
                const meBody = await meResponse.json() as ApiResponse<AdminUser>;

                setAccessToken(token);
                setUser(meBody.data);
                await loadRooms(token);
            } catch {
                // An unavailable or expired session simply leaves the public landing page visible.
            } finally {
                setLoadingSession(false);
            }
        };

        restoreSession();
    }, []);

    const login = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError('');
        setLoggingIn(true);

        const form = new FormData(event.currentTarget);

        try {
            const response = await apiRequest('/auth/company-admin/login', {
                body: JSON.stringify({
                    password: form.get('password'),
                    username: form.get('username')
                }),
                method: 'POST'
            }, '');

            if (!response.ok) {
                throw new Error(await getErrorMessage(response));
            }
            const body = await response.json() as ApiResponse<{ accessToken: string; user: AdminUser; }>;

            setAccessToken(body.data.accessToken);
            setUser(body.data.user);
            setLoginOpen(false);
            await loadRooms(body.data.accessToken);
        } catch (loginError) {
            setError(getRequestErrorMessage(loginError, 'Login failed.'));
        } finally {
            setLoggingIn(false);
        }
    };

    const createRoom = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError('');
        setCreating(true);

        const formElement = event.currentTarget;
        const form = new FormData(formElement);
        const expiresAt = form.get('expiresAt')?.toString();

        try {
            const response = await apiRequest('/rooms', {
                body: JSON.stringify({
                    expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
                    maxParticipants: Number(form.get('maxParticipants')),
                    title: form.get('title') || null
                }),
                method: 'POST'
            });

            if (!response.ok) {
                throw new Error(await getErrorMessage(response));
            }
            const body = await response.json() as ApiResponse<Room>;

            setRooms(current => [ body.data, ...current ]);
            formElement.reset();
        } catch (createError) {
            setError(getRequestErrorMessage(createError, 'Room creation failed.'));
        } finally {
            setCreating(false);
        }
    };

    const logout = async () => {
        await apiRequest('/auth/logout', { method: 'POST' }).catch(() => undefined);
        setAccessToken('');
        setRooms([]);
        setUser(null);
    };

    const copyLink = async (room: Room) => {
        await navigator.clipboard.writeText(room.guestUrl);
        setCopiedRoomId(room.id);
        window.setTimeout(() => setCopiedRoomId(''), 2000);
    };

    return (
        <main
            className = 'welcome admin-room-landing'
            id = 'welcome_page'>
            <nav className = 'welcome-navbar'>
                <div className = 'welcome-navbar-content'>
                    <a
                        aria-label = 'Fame Networks home'
                        className = 'welcome-navbar-brand'
                        href = 'https://famenetworks.net'>
                        <img
                            alt = 'Fame Networks'
                            src = 'https://famenetworks.net/logo.svg' />
                        <span>Fame Meet</span>
                    </a>
                    {user ? (
                        <div className = 'welcome-navbar-user'>
                            <span>{user.profile?.name || user.username}</span>
                            <button
                                onClick = { logout }
                                type = 'button'>Log out</button>
                        </div>
                    ) : (
                        <button
                            className = 'welcome-navbar-login'
                            disabled = { loadingSession }
                            onClick = { () => setLoginOpen(true) }
                            type = 'button'>
                            Admin login
                        </button>
                    )}
                </div>
            </nav>

            {user ? (
                <section className = 'admin-room-dashboard'>
                    <div className = 'admin-room-dashboard-heading'>
                        <div>
                            <span className = 'admin-room-eyebrow'>{user.tenant?.name || 'Company admin'}</span>
                            <h1>Create a video room</h1>
                            <p>Generate a secure guest link, then share it with your participants.</p>
                        </div>
                    </div>

                    {error && <div
                        className = 'admin-room-error'
                        role = 'alert'>{error}</div>}

                    <form
                        className = 'admin-room-create-form'
                        onSubmit = { createRoom }>
                        <label>
                            Room title
                            <input
                                maxLength = { 200 }
                                name = 'title'
                                placeholder = 'Weekly team meeting'
                                type = 'text' />
                        </label>
                        <label>
                            Expires at (optional)
                            <input
                                name = 'expiresAt'
                                type = 'datetime-local' />
                        </label>
                        <label>
                            Participant limit
                            <input
                                defaultValue = '5'
                                max = '100'
                                min = '2'
                                name = 'maxParticipants'
                                required = { true }
                                type = 'number' />
                        </label>
                        <button
                            disabled = { creating }
                            type = 'submit'>
                            {creating ? 'Generating…' : 'Generate meeting link'}
                        </button>
                    </form>

                    <div className = 'admin-room-list-heading'>
                        <h2>Recent rooms</h2>
                        <span>{rooms.length} total</span>
                    </div>
                    <div className = 'admin-room-list'>
                        {rooms.length === 0 && <p className = 'admin-room-empty'>No rooms yet. Generate your first meeting link above.</p>}
                        {rooms.map(room => (
                            <article
                                className = 'admin-room-card'
                                key = { room.id }>
                                <div>
                                    <span className = { `admin-room-status admin-room-status--${room.status.toLowerCase()}` }>{room.status}</span>
                                    <h3>{room.title || 'Untitled meeting'}</h3>
                                    <p>{room.maxParticipants} participants · Created {new Date(room.createdAt).toLocaleString()}</p>
                                    {room.expiresAt && <p>Expires {new Date(room.expiresAt).toLocaleString()}</p>}
                                </div>
                                <div className = 'admin-room-card-actions'>
                                    <button
                                        disabled = { room.status !== 'ACTIVE' }
                                        onClick = { () => copyLink(room) }
                                        type = 'button'>
                                        {copiedRoomId === room.id ? 'Copied!' : 'Copy link'}
                                    </button>
                                    <a
                                        href = { room.guestUrl }
                                        rel = 'noreferrer'
                                        target = '_blank'>Open</a>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            ) : (
                <section className = 'header landing-platform-section'>
                    <div className = 'header-image' />
                    <div className = 'header-container'>
                        <span className = 'admin-room-eyebrow'>FAME IT NETWORKS</span>
                        <h1 className = 'header-text-title'>Video calls made simple.</h1>
                        <p className = 'header-text-subtitle'>Secure, reliable meeting links for your team and customers.</p>
                        <button
                            className = 'admin-room-hero-login'
                            onClick = { () => setLoginOpen(true) }
                            type = 'button'>
                            Admin login to create a room
                        </button>
                    </div>
                </section>
            )}

            {loginOpen && !user && (
                <div
                    className = 'admin-login-backdrop'
                    onMouseDown = { event => event.target === event.currentTarget && setLoginOpen(false) }>
                    <section
                        aria-labelledby = 'admin-login-title'
                        aria-modal = 'true'
                        className = 'admin-login-dialog'
                        role = 'dialog'>
                        <button
                            aria-label = 'Close login'
                            className = 'admin-login-close'
                            onClick = { () => setLoginOpen(false) }
                            type = 'button'>×</button>
                        <span className = 'admin-room-eyebrow'>ADMIN PORTAL</span>
                        <h2 id = 'admin-login-title'>Welcome back</h2>
                        <p>Sign in with your company administrator account.</p>
                        {error && <div
                            className = 'admin-room-error'
                            role = 'alert'>{error}</div>}
                        <form onSubmit = { login }>
                            <label>Username<input
                                autoComplete = 'username'
                                name = 'username'
                                required = { true }
                                type = 'text' /></label>
                            <label>Password<input
                                autoComplete = 'current-password'
                                name = 'password'
                                required = { true }
                                type = 'password' /></label>
                            <button
                                disabled = { loggingIn }
                                type = 'submit'>{loggingIn ? 'Signing in…' : 'Sign in'}</button>
                        </form>
                    </section>
                </div>
            )}
        </main>
    );
};

export default AdminRoomLanding;
