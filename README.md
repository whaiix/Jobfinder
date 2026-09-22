# JobPilot

Première étape d’un agrégateur d’offres inspiré du fonctionnement de Piston.

## Fonctionnalités

- landing page responsive blanche, bleu foncé et bleu électrique ;
- page de recherche dédiée avec plusieurs métiers et plusieurs villes ;
- autocomplétion des villes françaises (par exemple `Ly` → Lyon) ;
- sélection simultanée de plusieurs contrats, avec mise à jour automatique ;
- filtre d'expérience de 0–1 an à 5 ans et plus ;
- exclusion stricte des offres de plus de 30 jours ;
- préférences enregistrées dans le navigateur ;
- favoris, suivi des candidatures et exclusion des offres déjà postulées ;
- page distincte de candidatures spontanées avec saisie multi-métiers/multi-villes et recherche Serper de pages Contact ou Recrutement ;
- aperçu court et fiche complète de chaque annonce ;
- score de compatibilité CV/offre, mots-clés ATS et deux lettres adaptées ;
- analyse locale du texte du CV et recommandations de métiers ;
- endpoint local `GET /api/jobs/search` ;
- connecteur serveur France Travail avec OAuth et géocodage des communes ;
- connecteur Adzuna via l'API officielle ;
- recherche web optionnelle sur les cinq premières pages Google via l’API Serper ;
- agrégation parallèle et déduplication inter-sources ;
- persistance PostgreSQL optionnelle ;
- schéma d’offre normalisé ;
- classification enrichie par le titre ;
- tests pour les annonces Stage/Alternance mal étiquetées en CDD.

## Règle de classification

La classification est volontairement déterministe et explicable :

1. `stage`, `stagiaire`, `alternance`, `alternant`, `apprenti`, etc. dans le titre ;
2. ces mêmes signaux forts dans la description, afin de corriger un tag source erroné ;
3. contrat fourni par la source ;
4. autres indices présents dans le titre puis la description ;
5. catégorie `other` si aucun signal n’est suffisamment fiable.

Un titre ou une description indiquant clairement `Alternance` avec un tag `CDD` sera donc classé
`alternance`. L'expérience est également déduite des années explicites et de termes comme
`débutant`, `junior`, `confirmé` ou `senior`.

## Confidentialité du CV

Le fichier PDF/TXT est envoyé uniquement à la fonction Vercel de l'application pour en extraire
le texte, sans écriture en base ni stockage de fichier. Le texte extrait est ensuite conservé dans
le `localStorage` du navigateur avec les coordonnées confirmées par l’utilisateur, afin d’alimenter
les recommandations et les lettres. L'utilisateur peut tout effacer depuis la page Profil.

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
   - `ADZUNA_APP_ID` et `ADZUNA_APP_KEY` pour activer Adzuna ;
   - `ADZUNA_COUNTRY` avec la valeur `fr`.
   - `SERPER_API_KEY` pour analyser jusqu’à 50 résultats Google récents via Serper.
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
2. Créer des identifiants sur `developer.adzuna.com` et les ajouter dans Vercel.
3. Ajouter PostgreSQL plus tard si l'historisation des offres devient nécessaire.
4. Demander l'accès au flux/API d'affiliation Jobijoba avant son intégration.
5. Enrichir progressivement le catalogue de métiers et de compétences du moteur CV.

Avec les identifiants France Travail et/ou Adzuna, la route de recherche interroge les APIs
configurées puis fusionne les doublons. Si PostgreSQL est également configuré, les résultats
normalisés y sont enregistrés puis servent de repli. Aucune offre fictive n'est affichée.

## Sources externes

- **France Travail** : API officielle active.
- **Adzuna** : API officielle intégrée, à activer avec un `app_id` et un `app_key`.
- **Jobijoba** : la plateforme propose officiellement un flux, une API ou un widget via son
  programme d'affiliation. L'intégration sera finalisée après obtention de leur format et de
  leurs identifiants.
- **HelloWork** : aucun scraper n'est inclus, leurs conditions interdisant l'extraction par
  scraping. Une intégration nécessitera un accord ou un flux partenaire explicite.
- **Google** : Google ne fournit plus sa Custom Search JSON API aux nouveaux clients. Le connecteur
  web utilise donc l’API Serper lorsqu’une clé `SERPER_API_KEY` est configurée. Cinq pages sont
  interrogées et seuls les résultats dont la date est vérifiable et inférieure à 30 jours sont gardés.
