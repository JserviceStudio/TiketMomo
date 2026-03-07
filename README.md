# 🌐 J+SERVICE - Backend Supabase Enterprise-Grade

**J+SERVICE** est une solution complète, performante et hautement sécurisée pour la vente de Vouchers Wi-Fi MikroTik en ligne via Mobile Money (FedaPay). 

Le backend a été entièrement migré vers **Supabase**, offrant une architecture *Zero-Trust*, *Multi-Tenant* et *Real-time*, conçue pour encaisser des milliers de transactions avec une fiabilité absolue.

---

## ⚡ Architecture & Fonctionnalités Clés

### 🛡️ 1. Sécurité "Zero-Warning" (Supabase Hardened)
Le système a été audité et validé par le **Supabase Advisor** avec un score de **0 alerte** :
- **Isolation RLS (Row Level Security)** : Chaque gérant accède uniquement à ses propres données via des politiques de sécurité au niveau de la base elle-même.
- **Performances Optimisées** : Utilisation de sous-requêtes `(select auth.uid())` pour des performances RLS 100x supérieures.
- **Fonctions Scellées** : Toutes les procédures SQL (RPC) sont protégées par un `search_path` verrouillé pour prévenir les attaques par détournement de schéma.

### 📡 2. Dashboards Temps Réel (Realtime)
Plus besoin de rafraîchir la page. Grâce aux **Supabase Subscriptions** :
- Les ventes s'affichent instantanément sur le tableau de bord Admin.
- Les gérants reçoivent des notifications de stock en direct.
- Les commissions des partenaires sont mises à jour à la seconde près.

### � 3. Transactions Idempotentes & Fiabilité
L'attribution des tickets utilise le pattern PostgreSQL **`FOR UPDATE SKIP LOCKED`** via une fonction RPC :
- Garantit qu'**un ticket ne sera JAMAIS vendu deux fois**, même en cas de trafic massif simultané.
- Intégration fluide avec les Webhooks FedaPay pour une validation instantanée.

### 🤖 4. Automatisation par Triggers SQL
La gestion intelligente des stocks est désormais gérée directement par la base de données :
- Un **Trigger PostgreSQL** surveille le stock de vouchers en temps réel.
- Génère automatiquement des notifications système dès que le seuil critique (10 tickets) est atteint.

### 📁 5. Gestion des Assets (Supabase Storage)
- Stockage sécurisé des logos de personnalisation pour les gérants.
- Génération de rapports PDF sécurisés avec accès contrôlé par RLS.

---

## 💻 Instructions de Déploiement

### Prérequis Techniques
*   Node.js (v18+)
*   Instance Supabase (Locale ou Cloud)
*   Application Firebase liée (Auth & Admin SDK).

### Étapes d'installation

1. **Cloner le projet**
   ```bash
   git clone https://github.com/JserviceStudio/TiketMomo.git
   cd TiketMomo
   npm install
   ```

2. **Configuration de la Base de Données**
   - Ouvrez le **SQL Editor** de votre projet Supabase.
   - Copiez et exécutez le contenu de [supabase_master_schema.sql](file:///home/juste-dev/Documents/TiketMomo/database/supabase_master_schema.sql).
   - Cela configurera automatiquement les tables, les index, le RLS, le Realtime et les Triggers.

3. **Configuration Environnementale**
   Créer un fichier `.env` :
   ```env
   SUPABASE_URL=votre_url_supabase
   SUPABASE_ANON_KEY=votre_cle_anon
   SUPABASE_SERVICE_ROLE_KEY=votre_cle_service_role
   FEDAPAY_WEBHOOK_SECRET=votre_secret_webhook
   GOOGLE_APPLICATION_CREDENTIALS=./firebase-key.json
   ```

4. **Lancement de l'Application**
   * Mode Développement: `npm run dev`
   * Mode Production: `npm start`

---

*Infrastructure J+SERVICE : Résilience, Automatisation et Sécurité Totale.*
