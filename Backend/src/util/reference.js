import { randomInt } from 'crypto';

export function AppointmentReference(date = new Date()) {
    const yy = String(date.getFullYear()).slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `MS-${yy}${mm}${dd}-${randomInt(1000, 10000)}`;
}

export function DataRequestReference() {
    return `MS-REQ-${randomInt(100000, 1000000)}`;
}

export async function WithUniqueReference(makeReference, insert, attempts = 5) {
    for (let i = 0; i < attempts; i++) {
        const reference = makeReference();
        try {
            return await insert(reference);
        } catch (error) {
            if (error.code !== 'ER_DUP_ENTRY' || i === attempts - 1) throw error;
        }
    }
}
