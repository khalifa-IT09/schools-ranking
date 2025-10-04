# 🚀 Guide de Déploiement - Classement des Écoles Mauritanie

## Déploiement sur Netlify

### Méthode 1 : Déploiement via Git (Recommandé)

1. **Créer un repository GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit - School Ranking App"
   git branch -M main
   git remote add origin https://github.com/votre-username/school-ranking-app.git
   git push -u origin main
   ```

2. **Connecter à Netlify**
   - Aller sur [netlify.com](https://netlify.com)
   - Cliquer sur "New site from Git"
   - Connecter votre compte GitHub
   - Sélectionner le repository `school-ranking-app`

3. **Configuration du build**
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Node version**: `18`

### Méthode 2 : Déploiement manuel

1. **Préparer les fichiers**
   ```bash
   npm run build
   ```

2. **Uploader sur Netlify**
   - Aller sur [netlify.com](https://netlify.com)
   - Glisser-déposer le dossier `dist` dans la zone de déploiement

### Configuration requise

- **Node.js**: Version 18 ou supérieure
- **Build command**: `npm run build`
- **Publish directory**: `dist`

### Variables d'environnement (si nécessaire)

Aucune variable d'environnement requise pour cette application.

### Fonctionnalités incluses

✅ **Application complètement fonctionnelle**
- Classement des écoles primaires (CAS)
- Classement des collèges (Brevet)  
- Classement des lycées (Baccalauréat)
- Interface responsive et moderne
- Thème mauritanien avec drapeau
- Recherche et filtrage par région
- Statistiques détaillées par école

### Support

Pour toute question concernant le déploiement, contactez l'équipe de développement.

---
**Développé avec ❤️ pour la République Islamique de Mauritanie 🇲🇷**
