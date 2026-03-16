# Supabase Firebase Hybrid Platform Design

**Date:** 2026-03-15

## Goal

Faire evoluer `TiketMomo` vers une plateforme de gestion SaaS hybride orientee panel central, avec Supabase comme noyau business et analytique, Firebase comme couche mobile/auth/push, et Node.js comme couche d'orchestration.

## Current Reality

Le depot montre deja une architecture hybride:

- Node/Express expose le backend principal, les pages de paiement, les webhooks, le dashboard admin et les cron jobs.
- Supabase porte la base relationnelle, le RLS, les RPC transactionnelles, le Realtime, le Storage et une grande partie du modele metier.
- Firebase est encore utilise pour les flux mobiles et la verification des tokens sur certaines routes.

## Recommended Architecture

### Core Principles

- Supabase est la source de verite business.
- Firebase reste la source de verite mobile pour l'auth et le push.
- Le backend Node sert d'anti-corruption layer et d'orchestrateur.
- Les traitements lourds, rejouables ou lents quittent le cycle HTTP et passent en workers/jobs.
- Le panel central consomme des donnees consolidees et des agregats rapides.

### Logical Topology

```text
Apps Mobiles / Web Apps / SaaS
        |
        +--> Firebase
        |    - auth mobile
        |    - push notifications
        |    - mobile-oriented services
        |
        +--> Node Backend
             - API metier
             - orchestration
             - webhooks
             - workers
             - admin control plane
                   |
                   v
              Supabase/Postgres
              - business data
              - RLS
              - Realtime
              - Storage
              - analytics SQL
              - RPC / triggers
```

## Target Domain Boundaries

- `identity-access`
- `tenant-management`
- `voucher-operations`
- `payment-billing`
- `license-saas`
- `partner-marketing`
- `reporting-analytics`
- `notifications-realtime`
- `admin-control-plane`

## Data Model Strategy

### Keep and Harden

Conserver les tables existantes suivantes, avec ajustements:

- `managers`
- `sites`
- `vouchers`
- `transactions`
- `notifications`
- `resellers`
- `commission_logs`
- `payout_requests`
- `sales_reports`
- `system_settings`

### Add for Multi-App SaaS

Ajouter:

- `apps`
- `manager_apps`
- `licenses`
- `license_entitlements`
- `auth_identities`
- `operational_events`
- `sync_jobs`
- `analytics_daily_facts`

### Identity Model

- Supabase Auth doit devenir la reference pour les acces web et les acces directs RLS.
- Firebase reste supporte pour le mobile et les integrations qui en dependent.
- Une table `auth_identities` doit lier un `manager_id` interne a plusieurs providers (`firebase`, `supabase`, autres si necessaire).

## Backend Responsibilities

### Node Backend

- verifier et traduire les identites externes
- orchestrer les integrations externes
- produire des APIs stables pour les apps
- piloter les webhooks et le traitement asynchrone
- exposer le control plane admin

### Supabase

- persister les objets metier
- appliquer le RLS
- fournir le Realtime
- executer les RPC transactionnelles
- heberger les vues analytiques et les agregats

### Firebase

- auth mobile
- push notifications
- distribution et services mobiles

## Performance Direction

- HTTP doit rester court: validation, commande, ACK rapide.
- Les traitements longs passent par des jobs.
- Les dashboards lisent des agregats et non tout l'historique brut.
- Les evenements applicatifs doivent etre consolides dans des tables analytiques dediees.

## Major Risks in Current State

- frontieres de domaines encore faibles
- logique metier encore trop proche des controllers
- incoherences entre documentation, schema et code
- scripts et RPC d'administration incomplets ou herites d'une migration
- mode hybride encore implicite plutot qu'explicite

## Migration Philosophy

- ne pas re-ecrire tout d'un coup
- consolider d'abord le modele de donnees
- stabiliser ensuite les frontieres backend
- extraire enfin les traitements asynchrones

## Success Criteria

- le panel central mesure correctement ventes, licences, activite et sante applicative
- les apps mobiles/web peuvent etre ajoutees sans casser le coeur metier
- les domaines sont isolables et testables
- Supabase est exploite a sa juste puissance sans dupliquer ce qu'il fournit deja
