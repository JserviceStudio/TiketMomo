# 🛠️ Architecture & Security Rules: J+SERVICE Backend (Enterprise-Grade)

**Objectif :** Développer un backend Multi-Tenant ultra-sécurisé, performant et résilient pour la gestion de vouchers Wi-Fi via MikroTik. Ce document fusionne vos exigences avec les standards de l'industrie issus de Google, Amazon (AWS), Meta (Facebook) et WhatsApp.

---

## 🛡️ RÈGLE 1 : Isolation Stricte Multi-Tenant (Security First - Meta & AWS Standard)
**Le Principe : "Zéro fuite de données entre locataires" (Principe du moindre privilège).**
Dans un système SaaS, la compromission ou le croisement de données entre clients est la faille la plus critique.

*   **Directive :** Toute donnée (Vouchers, Sites, Transactions) est la propriété exclusive d'un `manager_id`. L'isolation doit être absolue au niveau de la couche d'accès aux données.
*   **Implémentation :** 
    *   **Middleware Auth Pivot (Google Standard) :** Un `authMiddleware.js` intercepte Firebase Auth, vérifie le JWT, et injecte le `uid` cryptographiquement sûr dans le contexte serveur (`req.user.manager_id`). Le backend ne fait **jamais** confiance au "manager_id" fourni par le client.
    *   **Filtrage SQL Obligatoire :** Chaque requête SQL (`SELECT`, `UPDATE`, `DELETE`) **DOIT** inclure la clause `WHERE manager_id = ?`.
    *   **Requêtes Préparées Exclusives (OWASP) :** Utilisation stricte de requêtes paramétrées via `mysql2/promise` (`db.execute()`). Éradique 100% des injections SQL.
    *   **Pagination Basée sur Curseur (Meta/GraphQL Best Practice) :** Au lieu d'utiliser `OFFSET` (qui dégrade les performances sur des tables volumineuses malgré les disques NVMe), privilégier des curseurs (`WHERE id > ? LIMIT 50`).

---

## ⚡ RÈGLE 2 : Résilience Réseau & Asynchronisme (WhatsApp & Amazon Design for Failure)
**Le Principe : "Le serveur est une passerelle, pas une prison".**
Les connexions réseaux externes (VPS vers routeurs MikroTik) sont par nature instables. Le système doit absorber les pannes ("Embrace Failure").

*   **Directive :** Le backend Node.js ne doit **jamais** bloquer son Thread Principal (Event Loop) à cause d'un routeur lent ou injoignable.
*   **Implémentation :** 
    *   **Timeouts Stricts (Amazon AWS Standard) :** Toute tentative de connexion (API port 8728 ou SSH via VPN) a un `timeout` absolu maximal de 5000ms.
    *   **Idempotence des Webhooks (Stripe / Google API) :** Les Webhooks de paiement mobile recevront une clé d'idempotence (`transaction_id`) unique. Les requêtes répétées accidentellement n'activeront pas le service deux fois.
    *   **Queueing & Retry Logic (WhatsApp / Erlang Model) :** Si un MikroTik est hors-ligne pendant un paiement HTTP :
        1.  La transaction réussit en DB.
        2.  Le code Voucher est marqué "Actif / Vendu".
        3.  Le backend renvoie un "HTTP 200 OK" instantané.
        4.  L'activation sur le MikroTik est déléguée à une file d'attente (Task Queue en mémoire ou Redis) utilisant un **"Exponential Backoff with Jitter"** (Tentatives espacées : ex. 5s, 15s, 45s, 2m...) pour éviter d'inonder le routeur quand il revient en ligne (Thundering Herd Problem).

---

## 🚀 RÈGLE 3 : Sécurité "Zero-Trust", Validation & Performance NVMe 
**Le Principe : "Tout ce qui vient de l'extérieur est malveillant par défaut" (Google BeyondCorp).**

*   **Directive :** Validation agressive des entrées ("Fail-Fast") et optimisation des I/O pour des Webhooks exécutés en quelques millisecondes.
*   **Implémentation :**
    *   **Fail-Fast Input Validation :** Utiliser un validateur strict de schéma (type `Zod` ou `Joi`) sur **toutes** les routes. Si le payload de la requête ne correspond pas à 100% (type, longueur, structure), on retourne instantanément une erreur HTTP 400.
    *   **Indexation SQL Composite (Database Best Practice) :** Tirer parti des IOPS du stockage NVMe avec des `INDEX` composites ciblés (ex: `INDEX(manager_id, used, site_id)` ou `INDEX(transaction_id)`) pour réduire le temps de lecture à < 5ms.
    *   **Architecture 100% Stateless (12-Factor App) :** Aucune donnée de session persistée en RAM (`req.session`). L'état est distribué entre le JWT Firebase et la Base de Données. Permet des re-déploiements ultra-rapides et un scaling horizontal sans friction (Zero-Downtime deploy).
    *   **Rate-Limiting (API Throttling) :** Protection contre les force brutes et attaques DDoS via l'implémentation d'une limite de requêtes (ex: `express-rate-limit`) par IP externe et par `manager_id`.

---

## 📋 Standard d'API et Observabilité (Enterprise Grade)
*   **Style :** ES6. Modulaire via le principe de la Responsabilité Unique (Single Responsibility Principle). Les Contrôleurs gèrent le HTTP, les Services gèrent la logique métier, les Modèles gèrent la Base de Données.
*   **API Versioning (Google API Design) :** Toutes les routes publiques débuteront par un préfixe de version, ex: `/api/v1/vouchers/...`.
*   **Secrets & Config :** Séparation étanche entre les environnements avec des configurations chargées via `process.env`. Aucun mot de passe dans le code source Git.
*   **Enterprise JSON Response Format (JSend / Google JSON Style) :**
    *   Succès : `{ "success": true, "data": { ... } }`
    *   Erreur  : `{ "success": false, "error": { "code": "ROUTER_TIMEOUT", "message": "Le MikroTik est injoignable, activation mise en attente." } }`
    *   L'utilisation de **codes métiers prédéfinis** (ex: `INVALID_TOKEN`, `ROUTER_OFFLINE`, `VOUCHER_USED`) en complément du code HTTP permet aux applications Frontend et Mobiles de réagir proprement.
*   **Observabilité & Telemetry (Amazon Best Practice) :** Logging non bloquant sous format JSON (ex: via `Pino` ou structuré avec `Morgan`). Chaque log trace le `manager_id`, la `route`, le `temps d'exécution` et les erreurs critiques. L'historisation structurée réduit drastiquement les temps de débogage ("Mean Time To Recovery").

---

## 🤖 Directives Impératives (Pour le Copilote IA et la Génération de Code)
Ce fichier constitue le contexte système. Toute génération de code **DOIT** se conformer implicitement à :

1.  **MULTI-TENANCY ABSOLU :** Pas de requête SQL sans `WHERE manager_id = req.user.manager_id`.
2.  **ASYNC & IDEMPOTENCY :** Webhooks non-bloquants, tolérance aux pannes native avec "retry logic".
3.  **ZERO-TRUST & VALIDATION :** Vérification agressive par des schémas, requêtes SQL préparées (`mysql2/promise`), Firebase JWT sur les routes privées.
4.  **PERFORMANCE NVMe :** Temps de traitement API visé < 50ms. Pas d'opérations synchrones superflues.
5.  **ENTERPRISE ERROR HANDLING :** Retours standards `{ success: false, error: { code, message } }`, aucune fuite de pile d'erreur (Stack Trace) vers le client en production.
6.  **DOUBLE VÉRIFICATION OBLIGATOIRE :** À la fin de CHAQUE étape d'implémentation, l'IA doit relire l'intégralité du code et du contexte (schéma, middlewares, config) pour certifier que TOUTES les règles ci-dessus (Isolation, Sécurité, Performance) sont strictement respectées, avant de proposer la suite au développeur.
