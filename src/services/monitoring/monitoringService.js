import pino from 'pino';
import fs from 'fs';
import { NotificationService } from '../notificationService.js';
import { supabaseAdmin } from '../../config/supabase.js';

// Garantit que le dossier logs/ existe (sécurise le démarrage en Docker/fresh env) [M2]
fs.mkdirSync('./logs', { recursive: true });

// Configuration du transport multisortie (Console + Fichier)
const streams = [
    { stream: process.stdout },
    { stream: fs.createWriteStream('./logs/system.log', { flags: 'a' }) }
];

const logger = pino({
    level: 'info',
    timestamp: pino.stdTimeFunctions.isoTime,
}, pino.multistream(streams));

// État du Circuit Breaker (Interne)
const circuits = {
    'FEDAPAY': { failureThreshold: 5, failureCount: 0, lastFailure: null, isOpen: false },
    'SUPABASE': { failureThreshold: 3, failureCount: 0, lastFailure: null, isOpen: false }
};

export const MonitoringService = {
    /**
     * 🛡️ AUDIT LOG (IMMUTABLE DATABASE) - Norme Financière Pro
     */
    async logAudit({ clientId, managerId, actionType, resourceId, severity = 'LOW', details = {}, req = null }) {
        try {
            const { error } = await supabaseAdmin.from('audit_logs').insert([{
                user_id: clientId || managerId || null,
                action: actionType,
                entity_id: resourceId || null,
                details: { ...details, severity },
                ip_address: req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : 'SERVER-INTERNAL'
            }]);

            if (error) throw error;
        } catch (err) {
            this.logError('AUDIT_FAIL', err);
        }
    },

    /**
     * 🛡️ CIRCUIT BREAKER - Prévention de l'Effet Domino (Google Edge Resilience)
     * Empêche de saturer les ressources si une API tierce est par terre.
     */
    isCircuitOpen(serviceName) {
        const c = circuits[serviceName];
        if (!c || !c.isOpen) return false;

        // Si le circuit est ouvert depuis plus de 2 minutes, on tente de le refermer (Soft Reset)
        if (Date.now() - c.lastFailure > 120000) {
            c.isOpen = false;
            c.failureCount = 0;
            return false;
        }
        return true;
    },

    registerFailure(serviceName) {
        const c = circuits[serviceName];
        if (!c) return;
        c.failureCount++;
        c.lastFailure = Date.now();
        if (c.failureCount >= c.failureThreshold) c.isOpen = true;
    },

    /**
     * 🚩 LOG CRITICAL ERROR
     * Enregistre l'erreur et notifie l'Admin Jservice si c'est grave
     */
    async logError(context, error, metadata = {}) {
        const errorMsg = error.message || error;

        logger.error({
            context,
            error: errorMsg,
            stack: error.stack,
            ...metadata
        }, `[ERROR][${context}] ${errorMsg}`);

        // Si l'erreur concerne un paiement ou une base de données, on alerte en Push
        if (metadata.severity === 'CRITICAL' || context.includes('PAYMENT') || context.includes('DATABASE')) {
            await this._notifyAdminFailure(context, errorMsg);
        }
    },

    /**
     * ℹ️ LOG EVENT
     */
    logInfo(context, message, metadata = {}) {
        logger.info({ context, ...metadata }, `[INFO][${context}] ${message}`);
    },

    /**
     * 🔔 NOTIFICATION D'ÉCHEC CRITIQUE (Push vers Admin)
     */
    async _notifyAdminFailure(context, message) {
        // En prod, remplacez par votre propre UID Admin Firebase
        const ADMIN_UID = process.env.ADMIN_SUPABASE_UID || 'JS_STUDIO_ADMIN';

        await NotificationService.sendPushToClient(
            ADMIN_UID,
            '🚨 Alerte Système J+SERVICE',
            `Échec critique dans: ${context}. Erreur: ${message.substring(0, 50)}...`,
            { type: 'SYSTEM_FAILURE', context: context }
        );
    },

    /**
     * 🌍 TRADUCTION DES ERREURS POUR LES CLIENTS (UX UI)
     */
    translateError(errorCode) {
        const dictionary = {
            'STOCK_DEPLETED': 'Désolé, plus de tickets disponibles. Le client a été alerté.',
            'PAYMENT_FAILED': 'Le paiement a échoué. Veuillez réessayer.',
            'CONNECTION_TIMEOUT': 'Le serveur met trop de temps à répondre. Vérifiez votre connexion.',
            'INVALID_PARAMS': 'Requête invalide. Paramètres manquants.',
        };
        return dictionary[errorCode] || 'Une erreur système est survenue. Veuillez réessayer plus tard.';
    }
};
