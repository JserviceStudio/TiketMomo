# Refonte Complete Web en Next.js Design

**Date:** 2026-03-15

## Objectif

Refondre l'ensemble des interfaces web de TiketMomo avec une application unique en `Next.js + React + Tailwind CSS + TypeScript`, tout en conservant le backend Express existant comme source de vérité métier pendant la migration.

## Perimetre

La refonte couvre:

- les pages publiques
- l'espace manager
- l'espace partenaires
- le panel admin

Le backend Express, les webhooks, les traitements metier et Supabase ne sont pas migres dans cette phase. Ils restent actifs et sont consommes par la nouvelle interface.

## Approches evaluees

### Option 1: Une seule application Next.js multi-zones

Une app unique avec des sections `public`, `manager`, `partners` et `admin`, un design system partage et une integration API centralisee.

**Avantages**

- cohérence UI/UX forte
- composants et tokens partages
- maintenance plus simple
- auth et navigation plus homogenes

**Inconvenients**

- demande une architecture front propre des le depart

### Option 2: Plusieurs apps separees

Une app par espace fonctionnel.

**Avantages**

- isolation forte par domaine

**Inconvenients**

- duplication du design system
- auth et sessions plus complexes
- livraison plus lente

### Option 3: Big bang complet frontend et backend

Migration simultanee des interfaces et d'une partie du serveur.

**Avantages**

- cible finale plus directe

**Inconvenients**

- risque eleve
- couplage fort
- trop destabilisant pour un projet deja en production locale

## Decision

L'option retenue est **une seule application Next.js multi-zones**, avec migration progressive des interfaces HTML existantes vers un frontend moderne, tout en gardant Express comme API backend.

## Architecture cible

### Frontend

- une application `Next.js` avec App Router
- `TypeScript` strict
- `Tailwind CSS` pour le systeme visuel
- composants React reutilisables
- separation par zones fonctionnelles

### Backend

- Express reste actif sur les routes metier
- Supabase reste connecte via le backend existant
- la logique metier n'est pas dupliquee cote frontend

### Communication

- le frontend appelle l'API Express existante
- un client API centralise encapsule les appels
- les contrats de donnees sont types cote frontend

## Structure fonctionnelle cible

- `/(public)` pour l'accueil, la presentation produit et les pages d'acces
- `/manager` pour l'exploitation vouchers, transactions, licences et parametres
- `/partners` pour le portail promo, commissions, retraits et historique
- `/admin` pour le control plane, operations, licences, partenaires, settings et audit
- `/auth` pour les parcours de connexion et de bascule entre espaces

## Direction UX/UI

### Positionnement visuel

La direction retenue est `industrial editorial`.

Elle doit produire une interface:

- sobre
- professionnelle
- memorisable
- dense sans etre surchargee
- credible pour un produit fintech/telco d'operations

### Design system

**Typographie**

- display: `Space Grotesk`
- body/interface: `Manrope`

**Palette**

- fond sable clair / pierre
- encre bleu-noir
- primaire teal profond
- accent ambre/cuivre
- danger terre cuite

**Principes**

- bordures fines
- ombres discretes
- rayons moderes
- focus states explicites
- contraste minimum AA
- tables et formulaires lisibles

## Navigation

### Espaces prives

- sidebar persistante sur desktop
- topbar compacte avec recherche, session et alertes
- drawer mobile
- breadcrumbs simples
- actions principales visibles dans le premier viewport

### Pages publiques

- structure editoriale plus ouverte
- hero fort
- sections de valeur claires
- acces directs vers les differents espaces

## Accessibilite

Le frontend doit etre accessible par defaut:

- navigation clavier complete
- landmarks semantiques
- labels explicites
- contrastes verifies
- focus visible
- etats vides comprehensibles
- statuts non relies uniquement a la couleur
- responsive mobile et desktop

## Strategie de migration

### Phase 1

- creation de l'app Next.js
- mise en place du design system
- shell global
- auth UI de base
- panel admin branche aux APIs existantes

### Phase 2

- migration du portail partenaires
- migration de l'espace manager

### Phase 3

- migration des pages publiques
- harmonisation globale
- retrait progressif des pages HTML Express devenues obsoletes

## Strategie auth et session

- conservation initiale des cookies et flows existants quand possible
- UI de connexion deployee dans Next.js
- backend Express reste autorite sur les verifications sensibles
- unification progressive des parcours `admin`, `partners`, `manager`

## Critères de reussite

- build frontend stable
- typage TypeScript sans erreurs
- experience responsive propre
- accessibilite de base solide
- admin branche aux donnees reelles
- aucune regression backend introduite
- trajectoire claire pour remplacer les anciens ecrans HTML

## Premiere livraison recommandee

La premiere livraison doit produire:

- le scaffold complet Next.js
- le design system initial
- le layout principal
- la route admin moderne
- la consommation reelle de `/admin/api/stats`

Cette livraison servira de base pour etendre ensuite `partners`, `manager` puis `public`.
