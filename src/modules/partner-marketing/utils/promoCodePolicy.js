import crypto from 'crypto';
import levenshtein from 'fast-levenshtein';

export const PromoCodePolicy = {
    normalize(code) {
        return String(code || '').trim().toUpperCase();
    },

    generateFallbackCode(prefix = 'JPLUS') {
        return `${prefix}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    },

    findConflict(candidateCode, existingCodes = []) {
        const normalizedCandidate = this.normalize(candidateCode);

        for (const existingCode of existingCodes) {
            const normalizedExisting = this.normalize(existingCode);
            const distance = levenshtein.get(normalizedCandidate, normalizedExisting);

            if (distance === 0) {
                return { type: 'duplicate', code: normalizedExisting };
            }

            if (distance < 2) {
                return { type: 'similar', code: normalizedExisting };
            }
        }

        return null;
    }
};
