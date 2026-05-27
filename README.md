# BOUTIDIDACT — Frontend (borne tactile)

Application web **React 19 + Vite + Tailwind** : interface client en libre-service, panneau admin, personnalisation des tickets, guides relais.

**URL production type** : `https://boutididactt.vercel.app`

## Rôle

- Catalogue produits (Hiboutik ou menu importé IA)
- Panier et paiement (carte / espèces)
- Envoi des commandes au backend → file d’impression cloud
- Réglages boutique (Hiboutik, imprimante, mode relais)
- Téléchargement APK / exe relais

## Routes utiles

| Chemin | Écran |
|--------|--------|
| `/` | Accueil / menu / paiement (borne) |
| `/personnaliser-ticket` | Mise en page ticket (sections, logo, aperçu) |
| `/relay-guide` | Guide installation relais |
| `/relais` | Relais web (iPad / iPhone, WiFi local) |
| `/admin-setup` | Configuration initiale (mot de passe admin route) |

**Admin borne** : appui long sur le logo → PIN (`VITE_ADMIN_PIN` ou PIN enregistré dans les réglages).

## Variables d’environnement

Copier `.env.example` → `.env` :

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | URL du backend (`http://localhost:3001` en dev, URL Vercel en prod) |
| `VITE_ADMIN_PIN` | PIN par défaut admin (modifiable dans les réglages) |
| `VITE_IDLE_TIMEOUT_MS` | Retour écran d’accueil après inactivité (ex. `60000`) |

Les identifiants **Hiboutik** et la **clé relais** sont saisis dans Admin et stockés en `localStorage` + cloud (Stripe metadata), pas dans `.env`.

## Développement

```powershell
cd frontend
npm install
npm run dev          # http://localhost:5173 (écoute 0.0.0.0)
npm run build        # sortie dans dist/
npm run preview      # http://localhost:4173 — tester le build LAN
```

**Tablette sur le même WiFi** : utiliser l’IP du PC, ex. `http://192.168.1.47:5173`, et ajouter cette origine dans `print-server` → `CORS_ORIGINS`.

## Déploiement Vercel

1. Projet Vercel pointant sur `frontend/`
2. Variable `VITE_API_URL` = URL du backend déployé
3. `vercel.json` : fichiers statiques `/downloads/*` servis avant la SPA

**APK distribué** : placer `Boutididact-Print-Server.apk` dans `public/downloads/` (liens Admin + guide relais).

## Flux technique (headers)

Le client axios envoie automatiquement (depuis `boutididact_settings`) :

- `X-Hiboutik-*` — compte, user, api key, store/vendor id  
- `X-Shop-*` — nom, adresse, SIRET, TVA, footer, modèle ticket  
- `X-Printer-Ip` / `X-Printer-Port` — imprimante locale (mode direct)  

En **mode relais** (défaut), `VITE_API_URL` pointe vers le cloud ; l’impression passe par l’APK.

## Écrans admin (onglets)

- **État** — connexion Hiboutik, test, imprimante / relais  
- **Menu** — catalogue, import IA photo  
- **Actions** — plein écran, rechargement  
- **Relais** — clé relais, liens APK / exe, étapes  
- **Réglages** — Hiboutik, mode relais, IP imprimante, test impression  

## Personnalisation ticket

`/personnaliser-ticket` — formulaire simple + **sections** (activer / ordre / message libre / QR). Aperçu temps réel. Sauvegarde cloud via `PUT /api/saas/ticket-template`.

## Dépendances principales

- `axios` — API backend  
- `framer-motion` — animations borne  
- `lucide-react` — icônes  
- `stripe` — checkout abonnement (API route Vercel frontend si utilisée)
