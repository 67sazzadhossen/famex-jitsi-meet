export type GuestRoomValidation = {
    expiresAt: string;
    jitsiBaseUrl: string;
    jitsiRoomName: string;
    roomId: string;
    title: string | null;
    valid: true;
    sessionToken?: string;
};

type ValidationResponse = {
    data?: GuestRoomValidation;
    message?: string;
    success: boolean;
};

export class GuestRoomValidationError extends Error {
    status: number;

    constructor(message: string, status = 0) {
        super(message);
        this.status = status;
    }
}

export async function validateGuestRoom(
        apiBaseUrl: string,
        publicRoomId: string,
        timeoutMs = 8000): Promise<GuestRoomValidation> {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    const endpoint = `${apiBaseUrl.replace(/\/$/, '')}/public/rooms/${encodeURIComponent(publicRoomId)}/validate`;

    try {
        const response = await fetch(endpoint, {
            headers: { Accept: 'application/json' },
            signal: controller.signal
        });
        const body = await response.json().catch(() => undefined) as ValidationResponse | undefined;

        if (!response.ok || !body?.success || !body.data?.valid || !body.data.jitsiRoomName) {
            throw new GuestRoomValidationError(body?.message || 'This meeting link is invalid or unavailable.', response.status);
        }

        return body.data;
    } catch (error) {
        if (error instanceof GuestRoomValidationError) {
            throw error;
        }

        throw new GuestRoomValidationError(
            error instanceof DOMException && error.name === 'AbortError'
                ? 'Meeting validation timed out. Please try again.'
                : 'The meeting could not be validated. Please try again.',
            0);
    } finally {
        window.clearTimeout(timeout);
    }
}

export async function joinGuestRoom(
        apiBaseUrl: string,
        publicRoomId: string,
        timeoutMs = 8000): Promise<GuestRoomValidation> {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    const endpoint = `${apiBaseUrl.replace(/\/$/, '')}/public/rooms/${encodeURIComponent(publicRoomId)}/join`;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { Accept: 'application/json' },
            signal: controller.signal
        });
        const body = await response.json().catch(() => undefined) as ValidationResponse | undefined;

        if (!response.ok || !body?.success || !body.data?.valid || !body.data.jitsiRoomName) {
            throw new GuestRoomValidationError(body?.message || 'This meeting room is full or unavailable.', response.status);
        }

        if (body.data.sessionToken) {
            const tokenKey = `fame-room-session:${publicRoomId}`;
            sessionStorage.setItem(tokenKey, body.data.sessionToken);
            const heartbeat = () => fetch(`${apiBaseUrl.replace(/\/$/, '')}/public/rooms/${encodeURIComponent(publicRoomId)}/heartbeat`, {
                method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionToken: body.data?.sessionToken })
            }).catch(() => undefined);
            window.setInterval(heartbeat, 15000);
            window.addEventListener('beforeunload', () => fetch(`${apiBaseUrl.replace(/\/$/, '')}/public/rooms/${encodeURIComponent(publicRoomId)}/leave`, {
                method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionToken: body.data?.sessionToken })
            }).catch(() => undefined), { once: true });
        }

        return body.data;
    } catch (error) {
        if (error instanceof GuestRoomValidationError) throw error;
        throw new GuestRoomValidationError(error instanceof DOMException && error.name === 'AbortError'
            ? 'Meeting validation timed out. Please try again.' : 'The meeting could not be joined. Please try again.', 0);
    } finally {
        window.clearTimeout(timeout);
    }
}
