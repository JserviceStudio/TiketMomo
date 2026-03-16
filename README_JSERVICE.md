# 🚀 J+SERVICE Cloud - Documentation Technique de Référence (v3.0)

Bienvenue dans l'écosystème **J+SERVICE**. Ce document constitue la "Bible" technique du projet, mis à jour pour l'architecture **Supabase (PostgreSQL)**.

## 📌 1. Vue d'Ensemble de l'Architecture
* **Backend Core :** Node.js / Express (Port 3000)
* **Noyau Business :** Supabase (PostgreSQL 15+, RLS, Realtime, Storage, RPC)
* **Couche Mobile :** Firebase (auth mobile, push, services orientés mobile)
* **Authentification supportée :**
  * `Supabase Auth`
  * `Firebase Auth`
  * `X-API-KEY`
* **Orientation produit :** control plane analytique multi-app et SaaS

## 🧭 1.b Rôles canoniques

Les rôles produit canoniques sont maintenant:

- `admin`
- `client`
- `reseller`

Compatibilité legacy encore acceptée dans l’application:

- `manager` -> `client`
- `partner` -> `reseller`

Référence:

- [migration-canonical-roles.md](/home/juste-dev/Documents/TiketMomo/docs/migration-canonical-roles.md)

---

## 📱 2. Protocole API & Synchronisation MikroTik
Toutes les requêtes de l'application mobile incluent `X-API-KEY` dans les Headers.

### A. Synchronisation des Tickets (Vouchers)
*   **Endpoint :** `POST /api/v1/vouchers/sync`
*   **Fonctionnement :** Le stock est généré par `Mikhmo AI`, puis envoyé par lots vers la table `vouchers`, avec rattachement à un site et à l'app `wifi-core`.
*   **Format JSON :**
```json
{
  "batch": [
    {
      "code": "WIFI-1234",
      "profile": "1 HEURE",
      "price": 100,
      "metadata": { "duration": "1h", "password": "..." }
    }
  ]
}
```

### B. Distribution de Ticket (RPC)
Le backend utilise la fonction PostgreSQL `get_next_voucher(m_id, p_val)` :
- **Atomicité :** Utilise `FOR UPDATE SKIP LOCKED`.
- **Zéro Collision :** Impossible de délivrer le même ticket à deux clients, même en charge massive.

---

## 🤝 3. Écosystème Reseller
* **Commissions :** suivies dans `commission_logs`
* **Retraits :** gérés par `payout_requests` et RPCs associées
* **Admin :** suivi via dashboard analytique et audit logs

## 👤 3.b Écosystème Client

Le `client`:

- ne génère pas le stock dans le panel web
- ne fait pas d’import manuel depuis le dashboard web
- reçoit son stock depuis `Mikhmo AI`
- suit stock, sync, licence et distribution depuis l’espace client

---

## 🛠️ 4. Sécurité Industrielle (Hardening)
Le système respecte les standards de sécurité les plus stricts :
1.  **Search Path Hardened** : Toutes les fonctions RPC utilisent `SET search_path = ''` pour bloquer toute injection de schéma.
2.  **RLS Subquery Optimization** : Utilisation de `(select auth.uid())` pour des performances optimales.
3.  **Security Invoker Views** : Les vues analytiques respectent le contexte de sécurité de l'utilisateur.

---

## 📡 5. Automatisation via Triggers PG
- `tr_check_low_stock` surveille les consommations de stock
- `tr_transactions_log_sale` matérialise les ventes dans `sales`
- les dashboards peuvent lire les flux realtime et les aggregats

## 🧭 6. Modèle plateforme
Le schema supporte maintenant aussi:
- `apps`
- `manager_apps`
- `auth_identities`
- `licenses`
- `license_entitlements`
- `operational_events`
- `sync_jobs`
- `analytics_daily_facts`

---

## 📝 Notes de Maintenance
*   **Schéma Maître :** Toujours se référer à [supabase_master_schema.sql](file:///home/juste-dev/Documents/TiketMomo/database/supabase_master_schema.sql) pour toute modification de structure.
*   **Logs d'Audit :** Toutes les actions sensibles sont journalisées dans la table `audit_logs` avec isolation RLS par utilisateur.
*   **Règle de contribution :** dans le code applicatif, préférer `client` et `reseller`; réserver `manager_*` aux tables, colonnes et compatibilités legacy.

**J+SERVICE** n'est plus seulement une application ; c'est une infrastructure Cloud résiliente, sécurisée et temps-réel prête pour l'échelle nationale.
