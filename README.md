# JobPilot

Première étape d’un agrégateur d’offres inspiré du fonctionnement de Piston.

## Ce qui est déjà présent

- interface de recherche responsive ;
- filtres par métier, ville et contrat ;
- endpoint local `GET /api/jobs/search` ;
- connecteur serveur France Travail avec OAuth et géocodage des communes ;
- persistance PostgreSQL optionnelle ;
- schéma d’offre normalisé ;
- classification enrichie par le titre ;
- tests pour les annonces Stage/Alternance mal étiquetées en CDD.

## Règle de classification

La classification est volontairement déterministe et explicable :

1. `stage`, `stagiaire`, `alternance`, `alternant`, `apprenti`, etc. dans le titre ;
2. contrat fourni par la source ;
3. autres indices présents dans le titre ;
4. indices dans la description ;
5. catégorie `other` si aucun signal n’est suffisamment fiable.

Un titre `Alternant développeur` fourni avec le tag `CDD` sera donc classé `alternance`.

## Lancer le projet

```bash
pnpm install
pnpm dev
```

Puis ouvrir `http://localhost:3000`.

## Activer PostgreSQL

Une base locale prête à l'emploi est décrite dans `compose.yaml` :

```bash
docker compose up -d
```

Définir ensuite `DATABASE_URL` depuis `.env.example`, puis appliquer le schéma :

```bash
pnpm db:migrate
```

## Mettre le site sur Vercel

Vercel reconnaît automatiquement le projet Next.js : aucun fichier de configuration
Vercel supplémentaire n'est nécessaire.

1. Créer un dépôt GitHub et y envoyer ce dossier, sans envoyer `.env.local`.
2. Dans Vercel, choisir **Add New > Project**, connecter GitHub et importer le dépôt.
3. Dans **Settings > Environment Variables**, ajouter pour `Production` et `Preview` :
   - `FRANCE_TRAVAIL_CLIENT_ID` ;
   - `FRANCE_TRAVAIL_CLIENT_SECRET` ;
   - `FRANCE_TRAVAIL_SCOPE` avec `api_offresdemploiv2 o2dsoffre`.
4. Cliquer sur **Deploy**. Après une modification des variables, relancer un déploiement.

La base de données n'est pas obligatoire au premier déploiement. Pour l'ajouter ensuite :

1. ouvrir **Vercel Marketplace** depuis le projet ;
2. installer **Neon Postgres** et le connecter au projet ;
3. vérifier que l'intégration a créé `DATABASE_URL` ;
4. ouvrir l'éditeur SQL de Neon et exécuter le contenu de
   `db/migrations/001_create_job_offers.sql`.

`compose.yaml` sert uniquement à installer PostgreSQL sur un ordinateur pour le
développement local. Il n'est pas utilisé par Vercel.

## Étapes suivantes

1. Ajouter les identifiants France Travail dans `.env.local` ou dans Vercel.
2. Ajouter PostgreSQL plus tard si l'historisation des offres devient nécessaire.
3. Ajouter le connecteur Adzuna et la déduplication inter-sources.
4. Ajouter les objectifs utilisateur et le scoring CV/offre.

Sans configuration, l’application conserve automatiquement son mode démonstration. Avec
les identifiants France Travail, la route de recherche interroge l’API réelle. Si PostgreSQL
est également configuré, les résultats normalisés y sont enregistrés puis servent de repli.
