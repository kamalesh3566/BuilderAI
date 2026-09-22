import { AuthUserPayload } from './index.js';

declare global {
    namespace Express {
        interface Request {
            user?: AuthUserPayload;
        }
    }
}

export {};
