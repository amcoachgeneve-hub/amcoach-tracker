# AM Coach Tracker — Guide de déploiement

## Ce que ça fait
- Chaque client reçoit un lien unique : `amcoach.vercel.app/client/sarah`
- Le client note ses habitudes, poids, mental, énergie, sommeil chaque jour
- Le dimanche il fait son bilan de semaine
- Toi tu accèdes à `/coach` pour voir tous tes clients et leurs bilans

---

## ÉTAPE 1 — Supabase (base de données gratuite)

1. Va sur **supabase.com** → "Start your project" → crée un compte
2. Crée un nouveau projet (nom: `amcoach`, mot de passe: note-le quelque part)
3. Dans le menu gauche : **SQL Editor**
4. Copie-colle tout le contenu de `SUPABASE_SCHEMA.sql` et clique **Run**
5. Va dans **Settings → API** :
   - Copie **Project URL** → c'est ton `SUPABASE_URL`
   - Copie **anon public key** → c'est ton `SUPABASE_ANON_KEY`

---

## ÉTAPE 2 — GitHub (uploader le code)

1. Va sur **github.com** → "New repository"
2. Nom : `amcoach-tracker`, coché **Public**, coché **Add README**
3. Clique **Create repository**
4. Sur la page du repo : clique **uploading an existing file**
5. Upload TOUS les fichiers du projet (glisser-déposer le dossier)
6. Clique **Commit changes**

---

## ÉTAPE 3 — Vercel (mettre en ligne)

1. Va sur **vercel.com** → "Sign up with GitHub"
2. Clique **"New Project"** → sélectionne `amcoach-tracker`
3. Dans **Environment Variables**, ajoute :
   ```
   NEXT_PUBLIC_SUPABASE_URL        = [ta Project URL Supabase]
   NEXT_PUBLIC_SUPABASE_ANON_KEY   = [ta anon key Supabase]
   NEXT_PUBLIC_COACH_PASSWORD      = [ton mot de passe coach, ex: akli2024]
   ```
4. Clique **Deploy** → attends 2 minutes

Ton lien est prêt : `https://amcoach-tracker.vercel.app`

---

## ÉTAPE 4 — Utilisation

### Créer un client
1. Va sur `ton-lien.vercel.app/coach`
2. Connexion avec ton mot de passe
3. Clique "+ Nouveau client"
4. Entre le prénom et la date de départ
5. Clique "Copier lien WhatsApp" → envoie à ton client

### Lien client
Le client reçoit : `ton-lien.vercel.app/client/sarah`
Il ouvre sur mobile, tape son prénom = c'est parti pour 90 jours.

### Voir les bilans
Dashboard coach → tu vois score, dernier bilan, victoire, blocage, question pour toi.

---

## Domaine personnalisé (optionnel)
Dans Vercel → Settings → Domains → ajoute `tracker.amcoachgeneve.com`
