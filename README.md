# ![Node/Express/Prisma Example App](project-logo.png)

> RealWorld-API auf Basis von Node.js, Express und Prisma. Die API stellt Registrierung und Login, Profile, Artikel, Tags, Kommentare und Favoriten bereit und speichert alle Daten dauerhaft in PostgreSQL. Sie ist die Backend-Hälfte des RealWorld-Produkts und wird vom React-Frontend über die mit `REACT_APP_API_ROOT` konfigurierte Basis angesprochen.

## Tech-Stack

- **Laufzeit:** Node.js mit TypeScript
- **HTTP-Framework:** Express 4
- **ORM:** Prisma 4
- **Datenbank:** PostgreSQL 18
- **Workspace:** Nx 17
- **Tests:** Jest
- **Authentifizierung:** JWT (HS256) im `Authorization`-Header, keine Cookies

## Voraussetzungen

- Node.js und npm
- Docker (für die lokale PostgreSQL-Datenbank)

## Installation

```shell
npm ci
npx prisma generate
```

`npx prisma generate` erzeugt den typisierten Prisma-Client aus `src/prisma/schema.prisma`.

## Datenbank starten

Die lokale PostgreSQL-Datenbank wird mit der mitgelieferten `compose.yaml` gestartet:

```shell
docker compose up -d db
```

Sie lauscht auf Port `5432` und verwendet die Datenbank, den Benutzer und das Passwort `app` (nur für die lokale Entwicklung). Die Daten liegen im Docker-Volume `postgres-data`.

Zum Beenden:

```shell
docker compose down
```

Zum vollständigen Zurücksetzen inklusive Daten:

```shell
docker compose down -v
```

## Umgebungsvariablen

Die API liest ihre Konfiguration aus der Umgebung:

| Variable | Pflicht | Beschreibung |
| --- | --- | --- |
| `DATABASE_URL` | ja | PostgreSQL-Verbindung, z. B. `postgresql://app:app@localhost:5432/app` |
| `JWT_SECRET` | ja (Produktion) | Schlüssel zum Signieren der JWTs. In der Entwicklung existiert ein unsicherer Fallback; produktiv muss ein eigener Wert gesetzt werden, z. B. mit `openssl rand -hex 32`. |
| `PORT` | nein | Port der API, Standard `3000`. |
| `CORS_ORIGIN` | nein | Ursprung des Frontends, z. B. `http://localhost:5173`. Mehrere Ursprünge werden durch Kommas getrennt. Ist die Variable nicht gesetzt, startet die API trotzdem und sendet keinen `Access-Control-Allow-Origin`-Header. |
| `NODE_ENV` | nein | z. B. `production` für den Produktivbetrieb. |

Beispiel für eine lokale Shell:

```shell
export DATABASE_URL="postgresql://app:app@localhost:5432/app"
export JWT_SECRET="$(openssl rand -hex 32)"
export CORS_ORIGIN="http://localhost:5173"
export PORT=3000
```

## Entwicklung starten

Ein einziger Befehl startet die vollständige Entwicklungsumgebung — die PostgreSQL-Datenbank `db` und die API `api` im Entwicklungsmodus — inklusive der Migrationen:

```shell
npm run dev
```

Der Launcher wartet, bis die Datenbank bereit ist, erzeugt den Prisma-Client, wendet die Migrationen an und startet danach die API. Ist `DATABASE_URL` nicht gesetzt, verwendet er die lokale Entwicklungsverbindung `postgresql://app:app@localhost:5432/app` aus der `compose.yaml`.

Dieselben Schritte lassen sich auch einzeln ausführen:

```shell
docker compose up -d --wait db
npx prisma generate
npx prisma migrate deploy
npx nx serve api
```

Die API läuft anschließend unter `http://localhost:3000`. Die Statusroute `GET /` antwortet mit:

```json
{ "status": "API is running on /api" }
```

Alle API-Routen liegen unter `/api`.

## Produktions-Build und Start

```shell
npm ci
npx prisma generate
npx nx build api
npx prisma migrate deploy
node dist/api/main.js
```

Der Befehl `npm run start:prod` fasst die letzten beiden Schritte zusammen: Er wendet die Migrationen an und startet danach den gebauten Server. Die Datei `RUN.json` beschreibt denselben Ablauf für automatisierte Starts: Installation mit `npm ci`, Build mit `npx nx build api`, Start mit `npm run start:prod`, Health-Pfad `/` und Port aus `PORT`.

## Datenbank befüllen (Seed)

```shell
npx prisma db seed
```

Das Seed-Skript legt **zwölf Demo-Nutzer** mit zufällig erzeugten Namen, E-Mail-Adressen und Passwörtern an (markiert mit `demo: true`). Jeder dieser Nutzer erhält zwölf zufällige Artikel mit Tags, und jeder Demo-Nutzer kommentiert jeden dieser Artikel. Die zufällig erzeugten Passwörter werden weder ausgegeben noch gespeichert lesbar hinterlegt; es gibt daher **keinen festen Demo-Login**. Für einen eigenen Zugang entweder `POST /api/users` verwenden oder einen der Demo-Nutzer über seine E-Mail-Adresse ansprechen, sofern diese bekannt ist.

## Tests

```shell
npm test
```

oder gezielt für die API:

```shell
npx nx test api
```

Die Jest-Tests laufen ohne laufende Datenbank, da die Prisma-Aufrufe gemockt werden.

## API verwenden

Basis-URL: `http://localhost:3000/api`

Authentifizierte Anfragen senden das JWT im Header, wahlweise mit den Präfixen `Token` oder `Bearer`:

```
Authorization: Token <jwt>
```

Fehlerantworten haben die Form:

```json
{ "errors": { "email": ["has already been taken"] } }
```

### Authentifizierung

| Methode | Pfad | Auth | Body | Antwort |
| --- | --- | --- | --- | --- |
| `POST` | `/api/users` | nein | `{ "user": { "username": "...", "email": "...", "password": "..." } }` | `201` mit `{ "user": { ... } }` |
| `POST` | `/api/users/login` | nein | `{ "user": { "email": "...", "password": "..." } }` | `200` mit `{ "user": { ... } }` |
| `GET` | `/api/user` | ja | – | `200` mit `{ "user": { ... } }` |
| `PUT` | `/api/user` | ja | `{ "user": { "email"?, "username"?, "password"?, "bio"?, "image"? } }` | `200` mit `{ "user": { ... } }` |

Beispiel für eine Nutzerantwort:

```json
{
  "user": {
    "email": "jane@example.com",
    "username": "jane",
    "bio": null,
    "image": null,
    "token": "<jwt>"
  }
}
```

### Profile

| Methode | Pfad | Auth | Body | Antwort |
| --- | --- | --- | --- | --- |
| `GET` | `/api/profiles/:username` | optional | – | `200` mit `{ "profile": { ... } }` |
| `POST` | `/api/profiles/:username/follow` | ja | – | `200` mit `{ "profile": { ... } }` |
| `DELETE` | `/api/profiles/:username/follow` | ja | – | `200` mit `{ "profile": { ... } }` |

```json
{
  "profile": {
    "username": "jane",
    "bio": null,
    "image": null,
    "following": false
  }
}
```

### Artikel

| Methode | Pfad | Auth | Body / Query | Antwort |
| --- | --- | --- | --- | --- |
| `GET` | `/api/articles` | optional | Query: `tag`, `author`, `favorited`, `offset`, `limit` | `200` mit `{ "articles": [...], "articlesCount": 0 }` |
| `GET` | `/api/articles/feed` | ja | Query: `offset`, `limit` | `200` mit `{ "articles": [...], "articlesCount": 0 }` |
| `GET` | `/api/articles/:slug` | optional | – | `200` mit `{ "article": { ... } }` |
| `POST` | `/api/articles` | ja | `{ "article": { "title": "...", "description": "...", "body": "...", "tagList": ["..."] } }` | `201` mit `{ "article": { ... } }` |
| `PUT` | `/api/articles/:slug` | ja | `{ "article": { "title"?, "description"?, "body"?, "tagList"? } }` | `200` mit `{ "article": { ... } }` |
| `DELETE` | `/api/articles/:slug` | ja | – | `204` ohne Inhalt |

Beispiel für eine Artikelantwort:

```json
{
  "article": {
    "slug": "how-to-train-your-dragon",
    "title": "How to train your dragon",
    "description": "Ever wonder how?",
    "body": "You have to believe",
    "tagList": ["dragons", "training"],
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z",
    "favorited": false,
    "favoritesCount": 0,
    "author": {
      "username": "jane",
      "bio": null,
      "image": null,
      "following": false
    }
  }
}
```

### Kommentare

| Methode | Pfad | Auth | Body | Antwort |
| --- | --- | --- | --- | --- |
| `GET` | `/api/articles/:slug/comments` | optional | – | `200` mit `{ "comments": [...] }` |
| `POST` | `/api/articles/:slug/comments` | ja | `{ "comment": { "body": "..." } }` | `200` mit `{ "comment": { ... } }` |
| `DELETE` | `/api/articles/:slug/comments/:id` | ja | – | `200` mit `{}` |

```json
{
  "comment": {
    "id": 1,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z",
    "body": "Keep writing!",
    "author": {
      "username": "jane",
      "bio": null,
      "image": null,
      "following": false
    }
  }
}
```

### Favoriten

| Methode | Pfad | Auth | Body | Antwort |
| --- | --- | --- | --- | --- |
| `POST` | `/api/articles/:slug/favorite` | ja | – | `200` mit `{ "article": { ... } }` |
| `DELETE` | `/api/articles/:slug/favorite` | ja | – | `200` mit `{ "article": { ... } }` |

### Tags

| Methode | Pfad | Auth | Body | Antwort |
| --- | --- | --- | --- | --- |
| `GET` | `/api/tags` | optional | – | `200` mit `{ "tags": ["dragons", "training"] }` |

## Funktionen

- Registrierung und Login mit gehashten Passwörtern und JWT-Authentifizierung
- Aktuelles Nutzerkonto lesen und aktualisieren
- Profile anzeigen sowie Nutzern folgen und entfolgen
- Artikel anlegen, lesen, filtern, aktualisieren und löschen
- Personalisierter Feed der gefolgten Autoren
- Tags, Kommentare und Favoriten
- Persistenz in PostgreSQL über Prisma
- CORS-Policy, die den konfigurierten Frontend-Ursprung konkret nennt; ohne gesetzte `CORS_ORIGIN` werden keine CORS-Header gesendet
- Demo-Daten per Seed-Skript
