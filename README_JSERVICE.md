# 🚀 J+SERVICE Cloud - Documentation Technique de Référence (v3.0)

Bienvenue dans l'écosystème **J+SERVICE**. Ce document constitue la "Bible" technique du projet, mis à jour pour l'architecture **Supabase (PostgreSQL)**.

## 📌 1. Vue d'Ensemble de l'Architecture
*   **Backend Core :** Node.js / Express (Port 3000)
*   **Base de Données :** Supabase (PostgreSQL 15+)
*   **Authentification :** 
    *   `JWT Supabase Auth` (Dashboard Admin & Gérants)
    *   `X-API-KEY` (Synchronisation Mobile MikroTik)
    *   `PostgreSQL RLS` (Isolation Multi-Tenant au niveau DB)
*   **Temps Réel :** Supabase Realtime (Realtime Publication)
*   **Stockage :** Supabase Storage (Buckets : `manager-assets`, `reports-pdf`)

---

## 📱 2. Protocole API & Synchronisation MikroTik
Toutes les requêtes de l'application mobile incluent `X-API-KEY` dans les Headers.

### A. Synchronisation des Tickets (Vouchers)
*   **Endpoint :** `POST /api/v1/vouchers/sync`
*   **Fonctionnement :** Envoi par lots (Batch) vers la table `vouchers`.
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

## 🤝 3. Écosystème Partenaires (Realtime)
Le portail partenaire est désormais réactif en temps réel.
*   **Commissions :** Les `commission_logs` sont poussés instantanément via Supabase Realtime.
*   **Retraits :** Les demandes de retrait (`payout_requests`) sont auditées et validées via l'interface Admin.

---

## 🛠️ 4. Sécurité Industrielle (Hardening)
Le système respecte les standards de sécurité les plus stricts :
1.  **Search Path Hardened** : Toutes les fonctions RPC utilisent `SET search_path = ''` pour bloquer toute injection de schéma.
2.  **RLS Subquery Optimization** : Utilisation de `(select auth.uid())` pour des performances optimales.
3.  **Security Invoker Views** : Les vues analytiques respectent le contexte de sécurité de l'utilisateur.

---

## 📡 5. Automatisation via Triggers PG
Le serveur Node.js est soulagé de la surveillance des stocks :
- Le trigger `tr_check_low_stock` s'exécute directement dans PostgreSQL.
- Il insère automatiquement des entrées dans la table `notifications`.
- Le dashboard écoute le canal `realtime` pour afficher l'alerte au gérant sans délai.

---

## 📝 Notes de Maintenance
*   **Schéma Maître :** Toujours se référer à [supabase_master_schema.sql](file:///home/juste-dev/Documents/TiketMomo/database/supabase_master_schema.sql) pour toute modification de structure.
*   **Logs d'Audit :** Toutes les actions sensibles sont journalisées dans la table `audit_logs` avec isolation RLS par utilisateur.

**J+SERVICE** n'est plus seulement une application ; c'est une infrastructure Cloud résiliente, sécurisée et temps-réel prête pour l'échelle nationale.
