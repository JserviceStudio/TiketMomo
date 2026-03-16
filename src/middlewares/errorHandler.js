import { logger } from '../config/logger.js';

/**
 * Gère les routes qui n'existent pas (404)
 */
export const notFoundHandler = (req, res, next) => {
    const error = new Error(`Route non trouvée - ${req.originalUrl}`);
    res.status(404);
    next(error); // Passe l'erreur au gestionnaire global
};

/**
 * 🛡️ Gestionnaire d'Erreurs Global (Enterprise Grade Handling)
 * Aucune fuite de stack trace en production
 */
export const errorHandler = (error, req, res, next) => {
    // Si res.statusCode n'a pas été défini (ex: serveur crash), alors on force un 500
    const statusCode = error.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);

    // Log interne de l'erreur
    logger.error({
        code: error.code || 'SERVER_ERROR',
        statusCode,
        path: req.originalUrl,
        method: req.method,
        details: error.details,
        stack: error.stack
    }, error.message);

    // Format JSON Standardisé Entreprise (JSend)
    res.status(statusCode).json({
        success: false,
        error: {
            code: error.code || 'SERVER_ERROR',
            message: error.message,
            // Ne jamais exposer le `stack` en production au client.
            ...(process.env.NODE_ENV === 'development' && { _debug_stack: error.stack }),
        }
    });
};
