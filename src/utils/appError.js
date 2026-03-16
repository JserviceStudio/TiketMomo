export class AppError extends Error {
    constructor(message, { statusCode = 500, code = 'SERVER_ERROR', details } = {}) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
    }
}

export const badRequest = (message, code = 'BAD_REQUEST', details) =>
    new AppError(message, { statusCode: 400, code, details });

export const unauthorized = (message, code = 'UNAUTHORIZED_INVALID_CREDENTIALS', details) =>
    new AppError(message, { statusCode: 401, code, details });
