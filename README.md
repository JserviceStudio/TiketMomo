# 🌐 TiketMomo - Backend Architecturé Enterprise-Grade

**TiketMomo** est une solution complète, performante et hautement sécurisée pour la vente de Vouchers Wi-Fi MikroTik en ligne via Mobile Money (FedaPay). 

Le backend a été conçu avec une architecture *Zero-Trust*, *Multi-Tenant* et *Non-Bloquante*, inspirée des grands standards Cloud (Google, AWS, Meta), afin d'encaisser des milliers de transactions sans latence, grâce à la base de données optimisée pour disques NVMe.

---

## ⚡ Architecture & Fonctionnalités Clés

### 🛡️ 1. Isolation Stricte (Multi-Tenant)
Le Backend peut héberger les données de centaines de gérants réseau sans aucun risque de chevauchement. Chaque requête est isolée de manière mathématique.
- Validation des requêtes via **Firebase Auth JWT** (Tableaux de bord Admin).
- **Clé API SaaS** générée automatiquement à la connexion pour authentifier les envois depuis l'application mobile de chaque revendeur.
- La colonne `manager_id` est imposée dans **chaque requête SQL** de manière invisible aux clients.

### 💳 2. Le Distributeur Automatique Zéro-Clic (Stateless)
L'application Mobile et le routeur MikroTik se contentent de **pousser (Push Sync)** les tickets de chaque gérant en lots massifs (Bulk Inserts) vers le serveur.
Lorsqu'un client de la zone Wi-Fi clique sur "Acheter un ticket" dans le portail captif :
- Le MikroTik ne communique pas directement avec le backend, éliminant tout blocage.
- Le client est redirigé vers `/api/v1/payments/pay` où la page de checkout FedaPay s'ouvre automatiquement.
- La **Clé Publique FedaPay du Gérant** est extraite du lien MikroTik, enregistrée dynamiquement par le serveur (Auto-Apprentissage SaaS), puis injectée dans le Widget de paiement pour un transfert 100% direct de l'argent.

### 🔥 3. Transactions Idempotentes & Fiabilité Webhook
Le serveur héberge un Webhook conçu avec le pattern de sécurité financière :
- Lors du signal "PAYÉ" (Transaction Approved FedaPay), le serveur SQL active le **Locking de Ligne avec `FOR UPDATE SKIP LOCKED`**.
- Cela garantit qu'**un seul ticket ne sera jamais délivré à deux acheteurs différents**, même si deux FedaPay Webhooks tapent le serveur à la nanoseconde près.
- Le client est redirigé vers une page `/success` qui poste automatiquement son code au routeur MikroTik en arrière-plan.

### 🤖 4. Intelligence Moailte AI Push
La gestion des stocks bascule en pilotage automatique. 
À chaque vente validée, le serveur évalue le stock restant pour le forfait acheté :
- S'il en reste à peine 10, le Backend dégaine `firebase-admin` et frappe une **Notification Push Silencieuse (FCM)** ciblée au Gérant.
- L'app Mobile (MoailteAI) la détecte et génère puis renvoie immédiatement (Push) de nouveaux tickets à vendre, créant un cycle infini et autonome.

### 🧹 5. Performance NVMe & Auto-Nettoyage (Cron Job)
Pour maintenir un système répondant sous les **5ms**, le code comprend le blocage complet via requêtes préparées `mysql2/promise` pour éradiquer les injections SQL.
- Une tâche asynchrone CRON s'active tous les jours à 3h00 du matin.
- Le système purge les tickets ("vouchers") consumés et âgés de plus de **3 Jours**. 
- La trace financière (le chiffre d'affaires du Gérant) reste indéfiniment intacte (`ON DELETE SET NULL`) mais le serveur MySQL garde sa légèreté.

---

## 💻 Instructions de Déploiement

### Prérequis Techniques
*   Node.js (v18+)
*   MySQL/MariaDB (v8+) performant.
*   Application Firebase liée (Fichier `credentials.json` optionnel ou variables directes).

### Étapes d'installation

1. **Cloner le projet**
   \`\`\`bash
   git clone https://github.com/JserviceStudio/TiketMomo.git
   cd TiketMomo
   npm install
   \`\`\`

2. **Configuration Environnementale**
   Créer un fichier \`.env\` basé sur \`.env.example\` :
   \`\`\`env
   PORT=3000
   NODE_ENV=production
   DB_HOST=localhost
   DB_USER=votre_user
   DB_PASSWORD=votre_mot_de_passe
   DB_NAME=tiketmomo_db
   FEDAPAY_WEBHOOK_SECRET=votre_secret_webhook_fedapay
   GOOGLE_APPLICATION_CREDENTIALS=/chemin/absolu/vers/firebase-adminsdk.json
   \`\`\`

3. **Lancement de l'Application**
   * Mode Développement: \`npm run dev\`
   * Mode Production: \`npm start\` (Idéalement sous \`PM2\`)

---

*Développé pour la résilience et l'automatisation.*
