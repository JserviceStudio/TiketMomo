import Joi from 'joi';

// Schéma pour un ticket individuel (Basé sur VoucherPayload du mobile)
const voucherSchema = Joi.object({
    username: Joi.string().min(1).max(50).required(),
    password: Joi.string().allow('', null).optional(),
    profile: Joi.string().max(50).required(),
    price: Joi.number().min(0).required(),
    generatedAt: Joi.date().iso().required(),
    batchId: Joi.string().max(100).required(),
});

// Schéma pour le payload complet du Sync (Basé sur le fetch du mobile)
export const syncVouchersValidator = Joi.object({
    batch: Joi.array().items(voucherSchema).min(1).max(1000).required(),
    metadata: Joi.object({
        timestamp: Joi.date().iso().required(),
        count: Joi.number().integer().min(1).required(),
        source: Joi.string().required(),
        license: Joi.string().allow('', null).optional(),
    }).required(),
});
