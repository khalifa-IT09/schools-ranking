# 🏫 Classement des Écoles - Mauritanie

[![Netlify Status](https://api.netlify.com/api/v1/badges/your-badge-id/deploy-status)](https://app.netlify.com/sites/your-site-name/deploys)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Application web complète pour le classement des écoles en République Islamique de Mauritanie 🇲🇷**

Une plateforme moderne permettant aux familles mauritaniennes de trouver les meilleures options éducatives pour leurs enfants, basée sur les données officielles du Ministère de l'Éducation Nationale et de la Formation Professionnelle.

## ✨ Fonctionnalités

### 🎯 **Classement Multi-Niveaux**
- **Écoles Primaires (CAS)** : Certificat d'Aptitude Scolaire
- **Collèges (Brevet)** : Brevet d'Études du Premier Cycle  
- **Lycées (Baccalauréat)** : Résultats du Baccalauréat

### 📊 **Statistiques Détaillées**
- **5 paramètres par école** : Candidats, Admis, Taux de Réussite, Moyenne Max, Moyenne Min
- **Classement national et régional**
- **Courbes de performance interactives**
- **Recherche et filtrage par région**

### 🎨 **Interface Moderne**
- **Design responsive** (mobile, tablette, desktop)
- **Thème mauritanien** avec drapeau et couleurs nationales
- **Interface bilingue** (français/arabe)
- **Animations et effets visuels**

## 🚀 Déploiement

### Déploiement Automatique avec Netlify

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/votre-username/school-ranking-app)

### Configuration Netlify

1. **Build command** : `npm run build`
2. **Publish directory** : `dist`
3. **Node version** : `18`

## 🛠️ Installation Locale

### Prérequis
- Node.js 18+ 
- npm ou yarn

### Étapes d'installation

```bash
# Cloner le repository
git clone https://github.com/votre-username/school-ranking-app.git
cd school-ranking-app

# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm start

# Ou pour le mode développement avec rechargement automatique
npm run dev
```

L'application sera accessible sur `http://localhost:3000`

## 📁 Structure du Projet

```
school-ranking-app/
├── public/                 # Fichiers statiques
│   ├── index.html         # Page principale
│   ├── app.js            # Logique frontend
│   ├── styles.css        # Styles CSS
│   ├── drapo_RIM.jpg     # Drapeau mauritanien
│   └── _redirects        # Redirections Netlify
├── dist/                  # Build de production
├── server.js             # Serveur Express.js
├── build.js              # Script de build
├── netlify.toml          # Configuration Netlify
├── package.json          # Dépendances et scripts
├── DEPLOYMENT.md         # Guide de déploiement
└── README.md             # Ce fichier
```

## 📊 Données

L'application utilise les données officielles du Ministère de l'Éducation :

- **RESU_CAS_2025.csv** : Résultats des écoles primaires
- **RESU_BREVET_2025.csv** : Résultats des collèges  
- **RESU_BAC_2025.csv** : Résultats des lycées

## 🔧 Scripts Disponibles

```bash
npm start          # Démarrer le serveur
npm run dev        # Mode développement avec rechargement
npm run build      # Build pour la production
npm run preview    # Prévisualiser le build local
```

## 🌟 Fonctionnalités Techniques

### Backend (Node.js/Express)
- **API RESTful** pour les données des écoles
- **Traitement des fichiers CSV** avec parsing intelligent
- **Algorithme de classement** basé sur le taux de réussite et la moyenne
- **Gestion des erreurs** et logging complet
- **Sécurité** avec Helmet.js et CORS

### Frontend (HTML5/CSS3/JavaScript)
- **Interface responsive** avec CSS Grid et Flexbox
- **Recherche en temps réel** avec debouncing
- **Pagination** pour les grandes listes
- **Modales interactives** avec détails des écoles
- **Graphiques de performance** avec CSS pur
- **Support multilingue** (français/arabe)

## 📱 Compatibilité

- ✅ **Chrome** 80+
- ✅ **Firefox** 75+
- ✅ **Safari** 13+
- ✅ **Edge** 80+
- ✅ **Mobile** (iOS/Android)

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour contribuer :

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 👥 Équipe

- **Développeur Principal** : khalifa-IT09
- **Design** : Interface mauritanienne moderne
- **Données** : Ministère de l'Éducation Nationale et de la Formation Professionnelle

## 📞 Support

Pour toute question ou problème :

- 📧 **Email** : support@school-ranking-mr.com
- 🐛 **Issues** : [GitHub Issues](https://github.com/votre-username/school-ranking-app/issues)
- 📖 **Documentation** : Voir `DEPLOYMENT.md`

## 🙏 Remerciements

- Ministère de l'Éducation Nationale et de la Formation Professionnelle de Mauritanie
- Communauté open source
- Toutes les familles mauritaniennes qui utilisent cette application

---

**Développé avec ❤️ pour la République Islamique de Mauritanie 🇲🇷**

*"L'éducation est l'arme la plus puissante pour changer le monde"* - Nelson Mandela