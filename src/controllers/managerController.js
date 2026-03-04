import crypto from 'crypto';
import pool from '../config/db.js';

export const ManagerController = {
    /**
     * POST /api/v1/managers/onboard
     * Appelé automatiquement par l'Application Mobile (en arrière-plan).
     * Reçoit le Token Firebase (Header) et la Clé de Licence SaaS (Body).
     */
    async onboardManager(req, res, next) {
        try {
            // 🛡️ L'ID Firebase et Email viennent du token validé par le middleware d'Auth (Zero-Trust)
            const { manager_id, email } = req.user;

            // La licence envoyée par l'application mobile (Optionnel ou Obligatoire selon vos règles)
            const { license_key } = req.body;

            const connection = await pool.getConnection();
            try {
                await connection.beginTransaction();

                // Vérifier si le gérant a déjà son 'Espace' MySQL
                const [existing] = await connection.execute('SELECT id, api_key, email FROM managers WHERE id = ? FOR UPDATE', [manager_id]);

                let apiKeyToReturn;

                if (existing.length > 0) {
                    // L'Admin a déjà un compte, on met à jour la licence si fournie
                    apiKeyToReturn = existing[0].api_key;
                    if (license_key) {
                        await connection.execute('UPDATE managers SET license_key = ? WHERE id = ?', [license_key, manager_id]);
                    }
                } else {
                    // --- C'est un nouvel Admin ---
                    // Le serveur génère secrètement la clé API
                    apiKeyToReturn = 'sk_live_' + crypto.randomBytes(32).toString('hex');

                    // Création 100% Automatique de l'Espace Gérant dans MySQL
                    await connection.execute(
                        'INSERT INTO managers (id, email, api_key, license_key) VALUES (?, ?, ?, ?)',
                        [manager_id, email, apiKeyToReturn, license_key || null]
                    );
                }

                await connection.commit();

                // L'app mobile va intercepter cette réponse JSON et sauvegarder la clé API en local silencieusement.
                return res.status(200).json({
                    success: true,
                    message: 'Processus de configuration terminé.',
                    data: {
                        api_key: apiKeyToReturn, // L'application mobile la stockera automatiquement
                        email: email
                    }
                });

            } catch (dbError) {
                await connection.rollback();
                throw dbError;
            } finally {
                connection.release();
            }

        } catch (err) {
            next(err);
        }
    }
};
