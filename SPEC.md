# Spécifications Fonctionnelles et Techniques
## Application « Weight Tracker » — Next.js / SQLite

**Version :** 1.6  
**Date :** 17 février 2026  
**Statut :** Draft — pour validation

---

## Table des matières

1. [Contexte et objectifs](#1-contexte-et-objectifs)
2. [Périmètre fonctionnel](#2-périmètre-fonctionnel)
3. [Architecture technique](#3-architecture-technique)
4. [Modèle de données](#4-modèle-de-données)
5. [Authentification](#5-authentification)
6. [Spécifications des écrans](#6-spécifications-des-écrans)
7. [API REST](#7-api-rest)
8. [Initialisation de la base de données](#8-initialisation-de-la-base-de-données)
9. [Visualisation graphique](#9-visualisation-graphique)
10. [Règles de gestion](#10-règles-de-gestion)
11. [Exigences non fonctionnelles](#11-exigences-non-fonctionnelles)
12. [Structure du projet](#12-structure-du-projet)
13. [Critères d'acceptation](#13-critères-dacceptation)
14. [Development Workflow](#14-development-workflow)
15. [Déploiement sur Railway](#15-déploiement-sur-railway)

---

## 1. Contexte et objectifs

### 1.1 Contexte

L'application **Weight Tracker** permet à un utilisateur authentifié de saisir et de consulter l'évolution de son poids au fil du temps. L'historique est présenté sous forme de graphique interactif et de tableau. Les données sont persistées dans une base SQLite locale.

### 1.2 Objectifs

- Fournir une interface simple et rapide pour la saisie d'une pesée (date, poids, commentaire optionnel).
- Afficher l'historique complet sous forme de graphique de courbe (ligne) et de tableau paginé.
- Isoler les données par utilisateur : chaque compte ne voit que ses propres pesées.
- Exposer toutes les opérations métier via une API REST documentée.

### 1.3 Exclusions du périmètre v1

- Partage de données entre utilisateurs.
- Notifications ou rappels.
- Import/export à la demande (le CSV initial est injecté en seed uniquement).
- Application mobile native.

---

## 2. Périmètre fonctionnel

| # | Fonctionnalité | Priorité |
|---|----------------|----------|
| F-01 | Inscription par email et mot de passe | Must have |
| F-02 | Connexion / déconnexion | Must have |
| F-03 | Saisie d'une pesée (date, poids, commentaire) | Must have |
| F-04 | Remplacement d'une pesée par upsert (POST sur date existante) | Must have |
| F-05 | Suppression d'une pesée | Must have |
| F-06 | Affichage du graphique d'évolution | Must have |
| F-07 | Tableau de l'historique paginé et trié | Must have |
| F-08 | Filtrage de l'historique par plage de dates | Should have |
| F-09 | Indicateurs statistiques (min, max, moyenne, delta, moyennes périodiques) | Should have |
| F-10 | Seed automatique du CSV fourni au démarrage | Must have |

---

## 3. Architecture technique

### 3.1 Stack

| Composant | Technologie |
|-----------|-------------|
| Runtime (dev et production) | Bun |
| Framework front-end et back-end | Next.js 16.1 (App Router) |
| Langage | TypeScript |
| Base de données | SQLite via `bun:sqlite` (natif Bun) |
| ORM / Query builder | Drizzle ORM |
| Authentification | Better-auth (Credentials Provider) |
| Bibliothèque de graphiques | Recharts |
| Styling | Tailwind CSS |
| Validation des données | Zod |
| Tests | Bun test + React Testing Library |
| Hébergement production | Railway |

### 3.2 Schéma d'architecture

```
┌─────────────────────────────────────────────────────┐
│                   Navigateur client                  │
│   React (Next.js App Router) + Recharts + Tailwind   │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP / JSON
┌──────────────────────▼──────────────────────────────┐
│               Next.js API Routes (REST)              │
│         /api/auth/**  |  /api/entries/**             │
│         /api/admin/**                                │
├─────────────────────────────────────────────────────┤
│              Better-auth (session JWT)               │
├─────────────────────────────────────────────────────┤
│              Drizzle ORM                             │
├─────────────────────────────────────────────────────┤
│              SQLite (bun:sqlite — natif Bun)         │
│              Fichier : ./data/health-tracker.db      │
├─────────────────────────────────────────────────────┤
│              Bun Runtime (dev & production)          │
└─────────────────────────────────────────────────────┘
```

---

## 4. Modèle de données

### 4.1 Tables gérées par Better-auth

Better-auth crée et gère automatiquement les tables suivantes dans le schéma Drizzle. Elles ne doivent pas être modifiées manuellement :

| Table | Rôle |
|-------|------|
| `user` | Profil utilisateur (id, email, name, emailVerified, image, createdAt, updatedAt) |
| `session` | Sessions actives (id, userId, token, expiresAt, ipAddress, userAgent) |
| `account` | Comptes liés par provider (userId, accountId, providerId, password, etc.) |
| `verification` | Tokens de vérification email |

> **Note :** Better-auth nomme sa table `user` (singulier). La colonne `password` est stockée dans la table `account` (hashée par Better-auth via bcrypt). La table `user` est référencée par FK dans `weight_entries`.

### 4.2 Table `weight_entries`

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | INTEGER | PK, AUTOINCREMENT | Identifiant unique de la pesée |
| `user_id` | TEXT | NOT NULL, FK → user.id | Propriétaire de la pesée (référence la table `user` de Better-auth) |
| `entry_date` | TEXT | NOT NULL | Date de la pesée (format `YYYY-MM-DD`) |
| `weight_kg` | REAL | NOT NULL, CHECK ≥ 3 AND ≤ 150 | Poids en kilogrammes |
| `notes` | TEXT | NULL | Commentaire libre (max 500 caractères) |
| `created_at` | TEXT | NOT NULL, DEFAULT NOW | Date d'insertion en base |

> **Note :** Better-auth utilise des IDs de type `TEXT` (UUID/CUID) et non `INTEGER`. `user_id` est donc de type `TEXT` pour correspondre à `user.id`.

**Contrainte d'unicité :** `(user_id, entry_date)` — un seul enregistrement par utilisateur par jour.

**Index :** `idx_weight_entries_user_date` sur `(user_id, entry_date DESC)` pour les requêtes de listing.

### 4.3 Diagramme entité-relation

```
┌─────────────────┐          ┌──────────────────┐
│  user           │  1    N  │  weight_entries  │
│  (Better-auth)  │──────────│──────────────────│
│─────────────────│          │ id               │
│ id (TEXT/CUID)  │          │ user_id (FK)     │
│ email           │          │ entry_date       │
│ name            │          │ weight_kg        │
│ createdAt       │          │ notes            │
└─────────────────┘          │ created_at       │
                             └──────────────────┘
       │ 1
       │
       │ N
┌─────────────────┐
│  session        │
│  (Better-auth)  │
│─────────────────│
│ id              │
│ userId (FK)     │
│ token           │
│ expiresAt       │
└─────────────────┘
```

---

## 5. Authentification

### 5.1 Mécanisme

L'authentification utilise **Better-auth** avec le **Credentials Provider** (email + mot de passe). La session est gérée par un **JWT signé** (stateless, stocké en cookie HttpOnly). Better-auth s'intègre directement avec Drizzle ORM et `bun:sqlite` — ses tables (`users`, `sessions`, `accounts`, `verifications`) sont gérées dans le même schéma Drizzle que le reste de l'application.

### 5.2 Flux d'inscription

1. L'utilisateur soumet son email et son mot de passe via le formulaire `/register`.
2. Le client appelle `POST /api/auth/register` avec validation Zod côté serveur.
3. Le serveur valide le format de l'email (RFC 5322) et la robustesse du mot de passe (voir règles §10).
4. Better-auth vérifie que l'email n'est pas déjà utilisé et crée l'entrée dans la table `user` et `account` (mot de passe haché automatiquement par Better-auth via bcrypt).
5. Une session est ouverte automatiquement et le cookie HttpOnly est posé.
6. L'utilisateur est redirigé vers le tableau de bord `/dashboard`.

### 5.3 Flux de connexion

1. L'utilisateur soumet son email et son mot de passe via `/login`.
2. Le client appelle `POST /api/auth/login` géré par Better-auth.
3. Better-auth récupère l'utilisateur par email et compare le mot de passe via son mécanisme interne (bcrypt).
4. En cas de succès, un JWT est généré et stocké en cookie HttpOnly, et la session est persistée en base. L'utilisateur est redirigé vers `/dashboard`.
5. En cas d'échec, un message d'erreur générique est retourné (sans préciser si c'est l'email ou le mot de passe qui est incorrect).

### 5.4 Protection des routes

- Toutes les routes sous `/dashboard/**` et `/api/entries/**` nécessitent une session valide.
- Un middleware Next.js vérifie la présence et la validité du JWT sur ces routes.
- Les routes non authentifiées (`/`, `/login`, `/register`) redirigent vers `/dashboard` si l'utilisateur est déjà connecté.

### 5.5 Déconnexion

- Appel `POST /api/auth/logout` (Better-auth) qui invalide la session en base et détruit le cookie.
- Redirection vers `/login`.

---

## 6. Spécifications des écrans

### 6.1 Page d'accueil `/`

Écran de bienvenue minimal avec deux boutons de navigation : « Se connecter » et « S'inscrire ». Si l'utilisateur est déjà authentifié, redirection automatique vers `/dashboard`.

### 6.2 Page d'inscription `/register`

**Champs du formulaire :**

| Champ | Type | Validation |
|-------|------|------------|
| Email | email | Format valide, non vide |
| Mot de passe | password | Voir règles §10.1 |
| Confirmer le mot de passe | password | Doit correspondre au mot de passe |

**Comportement :**
- Validation côté client en temps réel (Zod + React Hook Form).
- Affichage des erreurs sous chaque champ.
- Bouton de soumission désactivé tant que le formulaire est invalide.
- En cas d'erreur serveur (email déjà utilisé), affichage d'un message d'erreur global.

### 6.3 Page de connexion `/login`

**Champs du formulaire :**

| Champ | Type | Validation |
|-------|------|------------|
| Email | email | Non vide |
| Mot de passe | password | Non vide |

**Comportement :**
- En cas d'identifiants invalides, affichage du message : « Email ou mot de passe incorrect. »
- Lien vers `/register` pour les nouveaux utilisateurs.

### 6.4 Tableau de bord `/dashboard`

Écran principal de l'application, composé de trois sections :

#### 6.4.1 Section statistiques (en-tête)

Affiche sous forme de cartes les indicateurs suivants calculés sur l'ensemble des pesées de l'utilisateur (ou sur la plage filtrée) :

- **Dernière pesée** : poids et date.
- **Poids minimum** : valeur et date.
- **Poids maximum** : valeur et date.
- **Moyenne globale** : poids moyen arrondi à une décimale.
- **Delta total** : différence entre la première et la dernière pesée (avec indicateur visuel + / −).

Les indicateurs suivants sont calculés sur des **périodes calendaires fixes** (indépendants du filtre de date du graphique) et affichés sous forme de cartes comparatives côte à côte :

- **Mois précédent vs mois d'avant** : `average_last_month` / `average_previous_month`.
- **Trimestre précédent vs trimestre d'avant** : `average_last_quarter` / `average_previous_quarter`.
- **Année précédente vs année d'avant** : `average_last_year` / `average_previous_year`.

Chaque carte comparative affiche une flèche et une couleur (vert si le poids diminue, rouge s'il augmente) pour visualiser la tendance d'une période à l'autre. La valeur est affichée comme `—` si aucune pesée n'existe sur la période.

#### 6.4.2 Section graphique

- Graphique de type **LineChart** (Recharts) affichant l'évolution du poids en fonction du temps.
- Axe des abscisses : dates, formatées `dd/MM/yyyy`.
- Axe des ordonnées : poids en kg, avec marges de 5 % au-dessus et en dessous des valeurs extrêmes.
- **Tooltip interactif** : au survol d'un point, afficher la date, le poids et la note (si présente).
- **Dot cliquable** : au clic sur un point, ouvrir le formulaire de modification pré-rempli.
- Filtre de période situé au-dessus du graphique : boutons prédéfinis (3 mois, 6 mois, 1 an, Tout) et sélecteur de plage de dates personnalisée.
- Le graphique s'adapte à la largeur de l'écran (responsive via `<ResponsiveContainer>`).

#### 6.4.3 Section tableau de l'historique

- Tableau paginé (10 entrées par page par défaut, configurable à 25 ou 50).
- **Colonnes :** Date, Poids (kg), Notes, Actions.
- Tri par défaut : date décroissante (pesée la plus récente en premier).
- Tri cliquable sur les colonnes Date et Poids.
- **Colonne Actions :** icône de modification (crayon) et icône de suppression (corbeille) avec confirmation.
- Bouton « Ajouter une pesée » visible en haut du tableau.

### 6.5 Formulaire de saisie / modification (modale ou page dédiée)

**Champs :**

| Champ | Type | Requis | Validation |
|-------|------|--------|------------|
| Date | date picker | Oui | Format valide, ≤ aujourd'hui. Si une pesée existe déjà pour cette date, elle sera remplacée (upsert). |
| Poids (kg) | number | Oui | Entre 3 et 150 kg inclus, précision max 1 décimale |
| Notes | textarea | Non | Max 500 caractères |

**Comportement :**
- En mode création, la date est pré-remplie avec la date du jour.
- En mode modification, tous les champs sont pré-remplis avec les valeurs existantes.
- Validation côté client avant soumission.
- Après soumission réussie : fermeture du formulaire et rafraîchissement de la liste et du graphique sans rechargement de page.

---

## 7. API REST

Toutes les routes API (sauf `/api/auth/**`) nécessitent une session valide. Le `user_id` est toujours extrait du JWT (jamais accepté en paramètre de requête).

### 7.1 Authentification

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/auth/register` | Créer un nouveau compte |
| POST | `/api/auth/login` | Connexion (géré par Better-auth) |
| POST | `/api/auth/logout` | Déconnexion (géré par Better-auth) |
| GET | `/api/auth/session` | Retourne la session courante |

#### POST `/api/auth/register`

**Corps de la requête :**
```json
{
  "email": "user@example.com",
  "password": "MonMotDePasse1!"
}
```

**Réponses :**

| Code | Description |
|------|-------------|
| 201 | Compte créé avec succès |
| 400 | Données invalides (détail dans le corps) |
| 409 | Email déjà utilisé |
| 500 | Erreur serveur |

**Corps de la réponse (201) :**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "created_at": "2026-02-17T10:00:00.000Z"
  }
}
```

---

### 7.2 Pesées (Weight Entries)

**Base URL :** `/api/entries`

#### GET `/api/entries`

Retourne la liste des pesées de l'utilisateur connecté.

**Paramètres de requête (query params) :**

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `from` | string (YYYY-MM-DD) | Non | Date de début du filtre |
| `to` | string (YYYY-MM-DD) | Non | Date de fin du filtre |
| `sort` | `asc` ou `desc` | Non | Ordre de tri par date (défaut : `desc`) |
| `page` | integer | Non | Numéro de page (défaut : 1) |
| `limit` | integer | Non | Entrées par page (défaut : 10, max : 100) |

**Réponse (200) :**
```json
{
  "data": [
    {
      "id": 42,
      "entry_date": "2026-02-17",
      "weight_kg": 74.5,
      "notes": null,
      "created_at": "2026-02-17T08:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 101,
    "total_pages": 11
  }
}
```

---

#### POST `/api/entries`

Crée une nouvelle pesée. **Si une pesée existe déjà pour la même date, elle est remplacée (comportement upsert).**

**Corps de la requête :**
```json
{
  "entry_date": "2026-02-17",
  "weight_kg": 74.5,
  "notes": "Après le sport"
}
```

**Réponses :**

| Code | Description |
|------|-------------|
| 201 | Pesée créée (nouvelle entrée) |
| 200 | Pesée remplacée (entrée existante écrasée) |
| 400 | Données invalides |
| 401 | Non authentifié |

**Corps de la réponse (201 ou 200) :**
```json
{
  "data": {
    "id": 42,
    "entry_date": "2026-02-17",
    "weight_kg": 74.5,
    "notes": "Après le sport",
    "created_at": "2026-02-17T08:30:00.000Z"
  }
}
```

---

#### GET `/api/entries/:id`

Retourne une pesée spécifique.

**Réponses :**

| Code | Description |
|------|-------------|
| 200 | Pesée trouvée |
| 404 | Pesée non trouvée ou n'appartient pas à l'utilisateur |
| 401 | Non authentifié |

---

#### DELETE `/api/entries/:id`

Supprime une pesée.

**Réponses :**

| Code | Description |
|------|-------------|
| 204 | Pesée supprimée |
| 404 | Pesée non trouvée ou non autorisée |
| 401 | Non authentifié |

---

#### GET `/api/entries/stats`

Retourne les statistiques calculées sur les pesées de l'utilisateur.

**Paramètres :** `from` et `to` (optionnels, même format que GET `/api/entries`).

Les champs de moyennes périodiques (`average_last_month`, etc.) sont toujours calculés sur les périodes calendaires absolues, indépendamment des filtres `from`/`to`. Les périodes sont définies comme suit :

| Champ | Période couverte |
|-------|-----------------|
| `average_last_month` | Du 1er au dernier jour du mois calendaire précédent |
| `average_previous_month` | Du 1er au dernier jour du mois d'avant le mois précédent |
| `average_last_quarter` | Le trimestre calendaire précédent complet (T1 : jan–mar, T2 : avr–jun, etc.) |
| `average_previous_quarter` | Le trimestre d'avant le trimestre précédent |
| `average_last_year` | Du 1er janvier au 31 décembre de l'année précédente |
| `average_previous_year` | Du 1er janvier au 31 décembre de l'année d'avant l'année précédente |

La valeur est `null` si aucune pesée n'existe sur la période concernée.

**Réponse (200) :**
```json
{
  "data": {
    "count": 101,
    "min": { "weight_kg": 74.5, "entry_date": "2026-02-17" },
    "max": { "weight_kg": 83.8, "entry_date": "2024-08-31" },
    "average": 80.1,
    "latest": { "weight_kg": 74.5, "entry_date": "2026-02-17" },
    "delta": -9.3,
    "average_last_month": 74.5,
    "average_previous_month": 75.7,
    "average_last_quarter": 76.2,
    "average_previous_quarter": 79.4,
    "average_last_year": 80.8,
    "average_previous_year": 81.3
  }
}
```

---

### 7.3 Format des erreurs

Toutes les réponses d'erreur suivent le format uniforme :

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Le poids doit être compris entre 3 et 150 kg.",
    "details": {}
  }
}
```

**Codes d'erreur applicatifs :**

| Code | Signification |
|------|---------------|
| `VALIDATION_ERROR` | Données de la requête invalides |
| `EMAIL_ALREADY_EXISTS` | Email déjà enregistré |
| `INVALID_CREDENTIALS` | Email ou mot de passe incorrect |
| `ENTRY_NOT_FOUND` | Pesée introuvable |
| `UNAUTHORIZED` | Session manquante ou expirée |
| `FORBIDDEN` | Action non autorisée sur cette ressource |
| `INTERNAL_ERROR` | Erreur serveur interne |

### 7.4 Administration

#### GET `/api/admin/backup`

Retourne une copie binaire cohérente de la base de données SQLite, destinée à la sauvegarde.

**Authentification :** cet endpoint est protégé par un token Bearer statique défini dans la variable d'environnement `BACKUP_SECRET`. Il est **indépendant de la session Better-auth** — aucun cookie de session n'est requis ni vérifié.

```
Authorization: Bearer <BACKUP_SECRET>
```

**Mécanisme de copie :** la copie est produite via la commande SQLite `VACUUM INTO` vers un fichier temporaire, en utilisant l'API native **`bun:sqlite`**, ce qui garantit une image cohérente et sans corruption même si des écritures sont en cours au moment de la requête. Le fichier temporaire est lu, streamé en réponse, puis supprimé.

**Réponses :**

| Code | Description |
|------|-------------|
| 200 | Fichier `.db` retourné en flux binaire |
| 401 | Header `Authorization` absent |
| 403 | Token invalide ou ne correspondant pas à `BACKUP_SECRET` |
| 500 | Erreur lors de la génération de la copie |

**Headers de la réponse (200) :**

```
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="health-tracker-backup-YYYY-MM-DD.db"
```

**Variable d'environnement requise :**

| Variable | Description |
|----------|-------------|
| `BACKUP_SECRET` | Token secret arbitraire (min. 32 caractères recommandés). Ne doit jamais être exposé côté client. |

**Exemple d'appel :**
```bash
curl -H "Authorization: Bearer <BACKUP_SECRET>" \
     https://monapp.example.com/api/admin/backup \
     --output backup-$(date +%F).db
```

---

## 8. Initialisation de la base de données

### 8.1 Fichier de migration

Le schéma est créé via Drizzle ORM lors du premier démarrage (`drizzle-kit push` ou migration automatique au boot). Le driver SQLite utilisé est **`bun:sqlite`**, l'API SQLite native de Bun — aucune dépendance externe n'est nécessaire.

### 8.2 Script de seed

Un script `scripts/seed.ts` est exécuté automatiquement si la base de données est vide (aucune entrée dans la table `users`).

**Comportement du seed :**

1. Créer un utilisateur de démonstration :
   - Email : `demo@weighttracker.app`
   - Mot de passe : `Demo1234!` (haché avant insertion)

2. Insérer les 101 pesées du fichier `data/seed/Poids-Grid_view.csv` associées à cet utilisateur.

**Règles de conversion du CSV :**
- La colonne `Jour` au format `D/M/YYYY` est convertie en `YYYY-MM-DD`.
- La colonne `Poids` est castée en `REAL`.
- La colonne `Notes` est insérée telle quelle (NULL si vide).

**Exemple de lignes du CSV source :**

| Jour | Poids | Notes |
|------|-------|-------|
| 17/2/2026 | 74.5 | *(vide)* |
| 19/7/2023 | 78.5 | retour d'Italie |
| 4/4/2023 | 78.4 | Après 1 semaine a Méribel |
| 8/2/2023 | 77.5 | intoxication alimentaire le 3 fev. Perte d'appétit |
| 4/1/2023 | 79.6 | juste après les fêtes !! |

### 8.3 Déclenchement du seed

```typescript
// Extrait de src/lib/db/seed.ts
import { db } from "./index"; // Instance Drizzle partagée
import { user } from "./schema"; // Table Better-auth

const existingUsers = await db.select().from(user).limit(1);
if (existingUsers.length === 0) {
  await runSeed();
}
```

---

## 9. Visualisation graphique

### 9.1 Bibliothèque

**Recharts** est utilisé pour sa compatibilité native avec React, son système de composants déclaratifs et sa gestion responsive via `ResponsiveContainer`.

### 9.2 Composant `WeightChart`

```typescript
// Props du composant
interface WeightChartProps {
  entries: WeightEntry[];       // Données à afficher
  dateFrom?: string;            // Filtre date début (YYYY-MM-DD)
  dateTo?: string;              // Filtre date fin (YYYY-MM-DD)
  onPointClick?: (entry: WeightEntry) => void;  // Callback au clic sur un point
}
```

### 9.3 Configuration du graphique

- **Type :** `<LineChart>` avec une `<Line>` principale.
- **Couleur de la courbe :** bleue (`#2563eb`), épaisseur 2px.
- **Points de données :** `dot={{ r: 4 }}`, `activeDot={{ r: 6, cursor: 'pointer' }}`.
- **Axe X :** `<XAxis dataKey="entry_date">` avec formateur `dd/MM`.
- **Axe Y :** `<YAxis domain={['auto', 'auto']}` avec suffixe ` kg`.
- **Grille :** `<CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb">`.
- **Tooltip personnalisé :** affiche date complète, poids et note.
- **Légende :** non requise (une seule série).
- **Responsive :** `<ResponsiveContainer width="100%" height={400}>`.

---

## 10. Règles de gestion

### 10.1 Règles de validation du mot de passe

| Règle | Condition |
|-------|-----------|
| Longueur minimale | ≥ 8 caractères |
| Longueur maximale | ≤ 128 caractères |
| Majuscule | Au moins 1 lettre majuscule |
| Minuscule | Au moins 1 lettre minuscule |
| Chiffre | Au moins 1 chiffre |

### 10.2 Règles de gestion des pesées

- **Comportement upsert :** Si l'utilisateur soumet une pesée pour une date où il en existe déjà une, la pesée existante est **remplacée silencieusement** par les nouvelles valeurs. Il n'y a pas d'erreur de doublon. L'API retourne `200` dans ce cas, `201` pour une création.
- **Date future :** La date d'une pesée ne peut pas être postérieure à la date du jour.
- **Plage de poids :** Le poids doit être compris entre **3 kg et 150 kg** inclus.
- **Précision :** Le poids est stocké avec une précision maximale d'**une décimale** (ex : 74.5). Les valeurs avec plus d'une décimale sont rejetées côté serveur.
- **Commentaire :** La note est optionnelle. Si fournie, elle ne peut pas dépasser **500 caractères**.

### 10.3 Isolation des données

Chaque appel API vérifie que la ressource demandée appartient bien à l'utilisateur identifié par le JWT. Une tentative d'accès à la ressource d'un autre utilisateur retourne `404` (et non `403`) pour ne pas révéler l'existence de la ressource.

---

## 11. Exigences non fonctionnelles

### 11.1 Performance

- Le temps de chargement initial de la page dashboard (LCP) doit être inférieur à **2 secondes** sur une connexion standard.
- Les appels API doivent répondre en moins de **200 ms** pour les opérations de lecture (liste, stats) sur un historique de 1 000 entrées.

### 11.2 Sécurité

- Les mots de passe ne sont jamais stockés en clair ni retournés par l'API.
- Les tokens JWT ont une durée de vie de **24 heures**. Le renouvellement est automatique si l'utilisateur est actif.
- Toutes les entrées utilisateur sont validées et assainies côté serveur (protection contre les injections SQL via ORM paramétré).
- Les en-têtes HTTP de sécurité sont configurés dans `next.config.ts` : `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`.
- La variable `BACKUP_SECRET` doit être définie côté serveur uniquement (jamais dans `NEXT_PUBLIC_*`) et sa valeur doit faire au minimum 32 caractères.

### 11.3 Accessibilité

- Conformité **WCAG 2.1 niveau AA** pour les composants d'interface principaux.
- Labels associés à tous les champs de formulaire.
- Navigation au clavier fonctionnelle sur l'ensemble de l'application.
- Contrastes de couleurs suffisants (ratio minimum 4.5:1 pour le texte normal).

### 11.4 Compatibilité navigateurs

| Navigateur | Version minimale |
|------------|-----------------|
| Chrome | 120+ |
| Firefox | 120+ |
| Safari | 17+ |
| Edge | 120+ |

---

## 12. Structure du projet

```
health-tracker/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── register/
│   │   │       └── page.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── [...all]/
│   │   │   │   │   └── route.ts      # Handler Better-auth (catch-all)
│   │   │   │   └── register/
│   │   │   │       └── route.ts
│   │   │   └── entries/
│   │   │       ├── route.ts          # GET (liste) + POST (upsert)
│   │   │       ├── stats/
│   │   │       │   └── route.ts      # GET (statistiques)
│   │   │       └── [id]/
│   │   │           └── route.ts      # GET + DELETE
│   │   └── admin/
│   │       └── backup/
│   │           └── route.ts          # GET (backup SQLite)
│   │   ├── layout.tsx
│   │   └── page.tsx                  # Page d'accueil
│   ├── components/
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   └── RegisterForm.tsx
│   │   ├── dashboard/
│   │   │   ├── StatsCards.tsx
│   │   │   ├── WeightChart.tsx
│   │   │   ├── WeightTable.tsx
│   │   │   └── DateRangeFilter.tsx
│   │   ├── entries/
│   │   │   ├── EntryForm.tsx
│   │   │   └── DeleteConfirmDialog.tsx
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       └── Modal.tsx
│   ├── lib/
│   │   ├── db/
│   │   │   ├── index.ts              # Instance bun:sqlite + Drizzle
│   │   │   ├── schema.ts             # Schéma Drizzle (tables app + tables better-auth)
│   │   │   ├── migrations/
│   │   │   └── seed.ts               # Seed CSV
│   │   ├── auth.ts                   # Config Better-auth
│   │   ├── validations/
│   │   │   ├── auth.schema.ts
│   │   │   └── entry.schema.ts
│   │   └── utils/
│   │       └── date.ts               # Helpers de formatage
│   └── types/
│       └── index.ts                  # Types partagés
├── data/
│   ├── health-tracker.db             # Fichier SQLite (généré)
│   └── seed/
│       └── Poids-Grid_view.csv       # Données initiales
├── scripts/
│   └── seed.ts                       # Script de seed exécutable
├── middleware.ts                     # Protection des routes
├── next.config.ts
├── drizzle.config.ts
├── tailwind.config.ts
├── bunfig.toml                       # Configuration Bun
└── package.json                      # Scripts : bun dev / bun start / bun run seed
```

---

## 13. Critères d'acceptation

### US-01 — Inscription

**En tant que** visiteur,  
**Je veux** créer un compte avec mon email et un mot de passe,  
**Afin de** pouvoir accéder à mon espace personnel de suivi de poids.

- ✅ Le formulaire valide le format email en temps réel.
- ✅ Le formulaire valide la robustesse du mot de passe en temps réel.
- ✅ Un email déjà utilisé affiche un message d'erreur clair.
- ✅ Après inscription réussie, l'utilisateur est redirigé vers `/dashboard`.

---

### US-02 — Connexion

**En tant que** utilisateur enregistré,  
**Je veux** me connecter avec mes identifiants,  
**Afin d'** accéder à mes données de poids.

- ✅ Des identifiants incorrects affichent un message d'erreur générique.
- ✅ Après connexion réussie, l'utilisateur est redirigé vers `/dashboard`.
- ✅ La session persiste pendant 24 heures.

---

### US-03 — Saisie d'une pesée

**En tant que** utilisateur connecté,  
**Je veux** enregistrer mon poids du jour,  
**Afin de** maintenir mon historique à jour.

- ✅ Je peux saisir une date, un poids et une note optionnelle.
- ✅ La date est pré-remplie avec la date du jour.
- ✅ Si je saisis une pesée pour une date déjà existante, l'ancienne valeur est remplacée sans erreur.
- ✅ Après soumission, la pesée apparaît immédiatement dans le tableau et le graphique.

---

### US-04 — Visualisation de l'historique

**En tant que** utilisateur connecté,  
**Je veux** voir l'évolution de mon poids sur un graphique,  
**Afin de** visualiser ma progression.

- ✅ Le graphique affiche toutes mes pesées par défaut.
- ✅ Je peux filtrer l'affichage sur 3 mois, 6 mois, 1 an ou une plage personnalisée.
- ✅ Le tooltip d'un point affiche la date, le poids et la note.
- ✅ Les statistiques (min, max, moyenne, delta) se mettent à jour selon le filtre actif.

---

### US-05 — Suppression d'une pesée

**En tant que** utilisateur connecté,  
**Je veux** pouvoir supprimer une pesée erronée,  
**Afin de** maintenir la qualité de mes données.

- ✅ La suppression demande une confirmation explicite.
- ✅ Je ne peux pas supprimer les pesées d'un autre utilisateur.
- ✅ Après suppression, la liste et le graphique se mettent à jour immédiatement.

---

## 14. Development Workflow

Ordre recommandé d'implémentation, conçu pour valider chaque couche avant de construire la suivante.

### Étape 1 — Initialisation du projet

```bash
bun create next-app health-tracker --typescript --tailwind --app
cd health-tracker
bun add drizzle-orm better-auth
bun add -d drizzle-kit @types/bun
```

- Configurer `bunfig.toml` pour forcer Bun comme runtime.
- Configurer `next.config.ts` avec les en-têtes de sécurité (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`).
- Vérifier que `bun dev` démarre correctement.

---

### Étape 2 — Base de données et schéma Drizzle

- Créer `src/lib/db/index.ts` : instancier `bun:sqlite` et l'instance Drizzle.
- Créer `src/lib/db/schema.ts` :
  - Déclarer les tables Better-auth (`users`, `sessions`, `accounts`, `verifications`).
  - Déclarer la table `weight_entries` avec ses contraintes (`CHECK`, unicité, FK).
- Configurer `drizzle.config.ts` pour pointer vers le fichier SQLite dans `./data/`.
- Générer et appliquer la migration initiale :

```bash
bunx drizzle-kit generate
bunx drizzle-kit push
```

- Vérifier le schéma généré et tester l'ouverture du fichier `.db`.

---

### Étape 3 — Authentification avec Better-auth

- Créer `src/lib/auth.ts` : configurer Better-auth avec le Credentials Provider, l'adapter Drizzle et `bun:sqlite`.
- Créer le handler catch-all `src/app/api/auth/[...all]/route.ts` qui délègue à Better-auth.
- Créer `src/app/api/auth/register/route.ts` : validation Zod + hachage bcrypt + insertion en base.
- Créer `src/middleware.ts` : protéger les routes `/dashboard` et `/api/entries` via la session Better-auth.
- Tester manuellement : inscription → cookie présent, accès `/dashboard` autorisé, accès sans session redirigé vers `/login`.

---

### Étape 4 — Seed de la base de données

- Créer `src/lib/db/seed.ts` :
  - Lire et parser `data/seed/Poids-Grid_view.csv` avec `Bun.file()`.
  - Convertir les dates `D/M/YYYY` → `YYYY-MM-DD`.
  - Créer l'utilisateur de démo (`demo@weighttracker.app` / `Demo1234!`).
  - Insérer les 101 pesées en transaction.
- Déclencher le seed automatiquement au boot si la table `users` est vide.
- Vérifier via `bunx drizzle-kit studio` ou requête directe que les données sont correctement insérées.

```bash
bun run src/lib/db/seed.ts
```

---

### Étape 5 — API REST : entrées de poids

Dans l'ordre :

1. **`GET /api/entries`** — listing paginé avec filtres `from`/`to`/`sort`.
2. **`POST /api/entries`** — upsert (INSERT OR REPLACE) avec validation Zod.
3. **`GET /api/entries/stats`** — agrégats SQL (MIN, MAX, AVG) + calcul des moyennes périodiques.
4. **`GET /api/entries/:id`** — lecture d'une entrée par id.
5. **`DELETE /api/entries/:id`** — suppression avec vérification de propriété.

Pour chaque route : valider le token de session, extraire le `user_id` du JWT, écrire les tests unitaires correspondants avec `bun test`.

---

### Étape 6 — API Admin : backup

- Créer `src/app/api/admin/backup/route.ts`.
- Lire `BACKUP_SECRET` depuis les variables d'environnement.
- Vérifier le Bearer token sur la requête entrante.
- Exécuter `VACUUM INTO '/tmp/backup-YYYY-MM-DD.db'` via `bun:sqlite`.
- Streamer le fichier en réponse avec `Bun.file()` puis le supprimer.
- Tester avec `curl` en local.

---

### Étape 7 — Pages et composants UI

Dans l'ordre :

1. **Layout racine** `src/app/layout.tsx` — providers, polices, meta.
2. **Page d'accueil** `/` — landing avec boutons Connexion / Inscription.
3. **Page `/register`** — `RegisterForm` avec validation Zod + React Hook Form, feedback temps réel.
4. **Page `/login`** — `LoginForm`, gestion des erreurs d'identifiants.
5. **Page `/dashboard`** — structure en trois sections (stats, graphique, tableau).

---

### Étape 8 — Composants du dashboard

Dans l'ordre :

1. **`StatsCards`** — cartes globales (dernière pesée, min, max, delta) + cartes comparatives périodiques avec indicateur vert/rouge.
2. **`DateRangeFilter`** — boutons prédéfinis (3 mois, 6 mois, 1 an, Tout) + date picker personnalisé.
3. **`WeightChart`** — `<LineChart>` Recharts avec `<ResponsiveContainer>`, tooltip personnalisé, dot cliquable.
4. **`WeightTable`** — tableau paginé, tri par colonne, actions Modifier / Supprimer.
5. **`EntryForm`** — formulaire de saisie/upsert en modale, pré-remplissage en mode édition.
6. **`DeleteConfirmDialog`** — confirmation avant suppression.

---

### Étape 9 — Tests

- Tester les routes API avec `bun test` (cas nominal, cas d'erreur, isolation des données entre utilisateurs).
- Tester les composants critiques avec React Testing Library (`EntryForm`, `WeightChart`, `StatsCards`).
- Vérifier manuellement le flux complet : inscription → saisie → graphique → modification par upsert → suppression → déconnexion.

```bash
bun test
```

---

### Étape 10 — Préparation à la production

- Configurer les variables d'environnement requises :

| Variable | Description |
|----------|-------------|
| `BETTER_AUTH_SECRET` | Secret JWT Better-auth (min. 32 caractères) |
| `BETTER_AUTH_URL` | URL publique de l'application |
| `DATABASE_PATH` | Chemin absolu vers le fichier `.db` (ex : `/data/health-tracker.db` sur Railway) |
| `BACKUP_SECRET` | Token de protection de l'endpoint backup (min. 32 caractères) |

- Vérifier le build de production :

```bash
bun run build
bun run start
```

- Déployer sur Railway en suivant les instructions de la **section 15**. S'assurer que le volume persistant est monté sur `/data` avant le premier démarrage pour que le seed et les données soient persistés correctement.

---

## 15. Déploiement sur Railway

### 15.1 Vue d'ensemble

Railway détecte automatiquement le projet Next.js, utilise Bun pour exécuter l'application et gère le serveur de production avec scaling automatique. Aucun fichier Docker n'est requis grâce au builder **Railpack** (successeur de Nixpacks), qui offre un meilleur support Bun et supporte toujours la dernière version disponible.

### 15.2 Prérequis

- Compte Railway (railway.com) avec plan **Hobby** minimum ($5/mois) — le plan Free ne supporte pas les volumes persistants requis pour SQLite.
- Repository GitHub connecté à Railway.
- Railway CLI installé localement :

```bash
bun add -g @railway/cli
railway login
```

### 15.3 Configuration Railway (`railway.json`)

Créer un fichier `railway.json` à la racine du projet :

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "RAILPACK"
  },
  "deploy": {
    "startCommand": "bun run start",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 30,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  },
  "mounts": [
    {
      "source": "sqlite-data",
      "destination": "/data"
    }
  ]
}
```

> **Note :** le mount `sqlite-data` crée un volume persistant Railway monté sur `/data`. Le fichier SQLite **doit** être stocké dans ce répertoire pour survivre aux redéploiements.

### 15.4 Volume persistant pour SQLite

Pour persister SQLite entre les déploiements sur Railway, le volume doit être monté dans `railway.json` avec `"destination": "/data"`. La variable `DATABASE_PATH` doit pointer vers ce chemin : `DATABASE_PATH=/data/health-tracker.db`.

Mettre à jour `src/lib/db/index.ts` pour utiliser cette variable :

```typescript
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";

const dbPath = process.env.DATABASE_PATH ?? "./data/health-tracker.db";
const sqlite = new Database(dbPath);
export const db = drizzle(sqlite);
```

### 15.5 Variables d'environnement sur Railway

Configurer les variables dans Railway Dashboard → Service → Variables :

| Variable | Exemple | Description |
|----------|---------|-------------|
| `DATABASE_PATH` | `/data/health-tracker.db` | Chemin vers le fichier SQLite sur le volume persistant |
| `BETTER_AUTH_SECRET` | `<32+ chars random string>` | Secret JWT Better-auth |
| `BETTER_AUTH_URL` | `https://monapp.up.railway.app` | URL publique de l'application |
| `BACKUP_SECRET` | `<32+ chars random string>` | Token de protection de l'endpoint backup |
| `NODE_ENV` | `production` | Environnement d'exécution |

Générer les secrets directement via CLI :

```bash
railway variables set BETTER_AUTH_SECRET=$(openssl rand -base64 32)
railway variables set BACKUP_SECRET=$(openssl rand -base64 32)
```

### 15.6 Endpoint de healthcheck

Créer `src/app/api/health/route.ts` pour que Railway puisse vérifier l'état du service :

```typescript
export async function GET() {
  return Response.json({ status: "ok", timestamp: new Date().toISOString() });
}
```

### 15.7 Déploiement

**Première mise en production :**

```bash
# Lier le projet local à Railway
railway link

# Déployer
railway up
```

**Déploiements suivants :** automatiques à chaque push sur la branche `main` via l'intégration GitHub configurée dans Railway Dashboard → Service → Source.

### 15.8 Domaine personnalisé

Railway génère automatiquement un domaine `*.up.railway.app`. Pour ajouter un domaine personnalisé :

1. Railway Dashboard → Service → Networking → Add Custom Domain.
2. Ajouter l'enregistrement CNAME chez le registrar DNS en suivant les instructions Railway.
3. Railway provisionne le certificat SSL automatiquement.
4. Mettre à jour la variable `BETTER_AUTH_URL` avec le nouveau domaine.

### 15.9 Backup automatisé en production

Configurer un **Cron Job Railway** pour déclencher l'endpoint de backup périodiquement et archiver le fichier :

1. Railway Dashboard → Project → New Service → Cron Job.
2. Schedule recommandé : `0 2 * * *` (tous les jours à 2h du matin).
3. Commande :

```bash
curl -s -H "Authorization: Bearer $BACKUP_SECRET" \
     $BETTER_AUTH_URL/api/admin/backup \
     --output /data/backups/backup-$(date +%F).db
```

Alternativement, utiliser Railway Storage Buckets pour archiver les sauvegardes hors du volume SQLite principal.

### 15.10 Monitoring et logs

- **Logs temps réel :** Railway Dashboard → Service → Logs, ou `railway logs --follow` en CLI.
- **Métriques :** Railway Dashboard → Service → Metrics (CPU, RAM, réseau).
- En cas d'erreur au démarrage, vérifier en priorité que le volume est bien monté et que `DATABASE_PATH` est défini.

---

*Fin des spécifications — Version 1.6*
