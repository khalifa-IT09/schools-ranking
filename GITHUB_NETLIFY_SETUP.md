# 🚀 Guide de Déploiement GitHub + Netlify

## 📋 Étapes pour publier votre application

### 1. **Créer un repository sur GitHub**

1. Aller sur [github.com](https://github.com)
2. Cliquer sur **"New repository"**
3. Nom du repository : `school-ranking-app`
4. Description : `Application de classement des écoles pour la Mauritanie`
5. Choisir **Public** ou **Private**
6. **NE PAS** cocher "Initialize with README" (déjà créé)
7. Cliquer sur **"Create repository"**

### 2. **Connecter le repository local à GitHub**

```bash
# Ajouter le remote origin (remplacer VOTRE_USERNAME)
git remote add origin https://github.com/VOTRE_USERNAME/school-ranking-app.git

# Changer le nom de la branche principale
git branch -M main

# Pousser le code vers GitHub
git push -u origin main
```

### 3. **Configurer Netlify pour le déploiement automatique**

1. Aller sur [netlify.com](https://netlify.com)
2. Se connecter avec votre compte GitHub
3. Cliquer sur **"New site from Git"**
4. Choisir **"GitHub"**
5. Autoriser Netlify à accéder à vos repositories
6. Sélectionner `school-ranking-app`

### 4. **Configuration du build sur Netlify**

Dans les paramètres de build :

- **Build command** : `npm run build`
- **Publish directory** : `dist`
- **Node version** : `18`

### 5. **Variables d'environnement (si nécessaire)**

Aucune variable d'environnement requise pour cette application.

### 6. **Déploiement automatique**

Une fois configuré, Netlify déploiera automatiquement :
- ✅ À chaque push sur la branche `main`
- ✅ À chaque pull request
- ✅ Avec un préfixe de déploiement pour les branches

### 7. **URL de votre site**

Votre site sera accessible sur :
- **URL par défaut** : `https://votre-site-name.netlify.app`
- **URL personnalisée** : Configurable dans les paramètres Netlify

## 🔄 Workflow de développement

### Pour mettre à jour l'application :

```bash
# 1. Faire vos modifications
# 2. Tester localement
npm start

# 3. Build pour vérifier
npm run build

# 4. Commit et push
git add .
git commit -m "Description des modifications"
git push origin main

# 5. Netlify déploiera automatiquement !
```

## 📁 Structure finale sur GitHub

```
school-ranking-app/
├── 📁 public/              # Fichiers statiques
├── 📁 dist/                # Build de production (généré)
├── 📄 server.js            # Serveur Express
├── 📄 package.json         # Dépendances
├── 📄 netlify.toml         # Configuration Netlify
├── 📄 build.js             # Script de build
├── 📄 README.md            # Documentation
├── 📄 .gitignore           # Fichiers à ignorer
├── 📄 DEPLOYMENT.md        # Guide de déploiement
└── 📄 *.csv                # Données des écoles
```

## ✅ Vérifications finales

- [ ] Repository GitHub créé
- [ ] Code poussé vers GitHub
- [ ] Netlify connecté au repository
- [ ] Configuration de build correcte
- [ ] Site déployé et accessible
- [ ] Toutes les fonctionnalités testées

## 🆘 Support

Si vous rencontrez des problèmes :

1. **Vérifier les logs de build** dans Netlify
2. **Tester localement** avec `npm run build`
3. **Consulter la documentation** Netlify
4. **Vérifier la configuration** dans `netlify.toml`

---

**🎉 Félicitations ! Votre application est maintenant en ligne !**

*Votre application de classement des écoles mauritaniennes est prête à aider les familles à choisir la meilleure éducation pour leurs enfants.* 🇲🇷
