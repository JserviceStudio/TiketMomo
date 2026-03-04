import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// 🚀 Connexion par Pool (Requêtes Préparées)
// Les pools sont cruciaux pour une API Stateless et asynchrone (Non-Blocking IO)
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'tiketmomo_db',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

// Test rapide de la connexion lors du démarrage
pool.getConnection()
    .then((conn) => {
        console.log('📦 Base de données MySQL connectée avec succès.');
        conn.release();
    })
    .catch((err) => {
        console.error('❌ Erreur de connexion à la base de données :', err.message);
        // On ne "crash" pas l'app ici, l'architecture doit absorber la panne (Resilience).
        // Les requêtes retourneront une erreur 500 le temps que la DB revienne.
    });

export default pool;
