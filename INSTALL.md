# 🚀 Guide d'Installation - Application de Classement des Écoles

## 📋 Prérequis

Avant de commencer, assurez-vous d'avoir installé :

- **Node.js** (version 14 ou supérieure) : [Télécharger Node.js](https://nodejs.org/)
- **npm** (gestionnaire de paquets Node.js) - inclus avec Node.js
- **Git** (optionnel) : [Télécharger Git](https://git-scm.com/)

## 🛠️ Installation Étape par Étape

### 1. Téléchargement du Projet

Si vous avez Git installé :
```bash
git clone https://github.com/khalifa-IT09/Shools-Ranking.git
cd Shools-Ranking
```

Sinon, téléchargez et extrayez l'archive ZIP du projet.

### 2. Installation des Dépendances

Ouvrez un terminal/command prompt dans le dossier du projet et exécutez :

```bash
npm install
```

Cette commande installera toutes les dépendances nécessaires.

### 3. Vérification des Fichiers de Données

Assurez-vous que les trois fichiers de données sont présents dans le dossier racine :

- ✅ `RESU_CAS_2025.xlsx` (Résultats des écoles primaires)
- ✅ `RESU_BREVET_2025.xlsx` (Résultats des collèges)
- ✅ `RESU_BAC_2025.csv` (Résultats des lycées)

### 4. Configuration (Optionnel)

Créez un fichier `.env` basé sur `env.example` pour personnaliser la configuration :

```bash
cp env.example .env
```

Éditez le fichier `.env` selon vos besoins.

### 5. Lancement de l'Application

#### Méthode 1 : Script de Démarrage Automatique (Windows)
Double-cliquez sur `start.bat` ou exécutez :
```bash
start.bat
```

#### Méthode 2 : Commande Manuelle
```bash
npm start
```

#### Méthode 3 : Mode Développement
```bash
npm run dev
```

### 6. Accès à l'Application

Une fois l'application démarrée, ouvrez votre navigateur et allez à :
**http://localhost:3000**

## 🔧 Dépannage

### Problème : "Node.js n'est pas reconnu"
**Solution :** Installez Node.js depuis [nodejs.org](https://nodejs.org/)

### Problème : "npm n'est pas reconnu"
**Solution :** Redémarrez votre terminal après l'installation de Node.js

### Problème : "Erreur lors de l'installation des dépendances"
**Solutions :**
1. Vérifiez votre connexion internet
2. Essayez : `npm cache clean --force`
3. Supprimez le dossier `node_modules` et relancez `npm install`

### Problème : "Port 3000 déjà utilisé"
**Solutions :**
1. Fermez l'application qui utilise le port 3000
2. Ou changez le port dans le fichier `.env` : `PORT=3001`

### Problème : "Fichiers de données manquants"
**Solution :** Assurez-vous que les trois fichiers de données sont dans le dossier racine du projet.

## 📊 Vérification de l'Installation

Une fois l'application lancée, vous devriez voir :

1. **Page d'accueil** avec les onglets pour les trois niveaux
2. **Statistiques** affichées en haut de la page
3. **Liste des écoles** classées par performance
4. **Fonctionnalités de recherche** et de filtrage

## 🚀 Utilisation

1. **Sélectionnez un niveau** : Primaire, Collège, ou Lycée
2. **Recherchez une école** ou **filtrez par région**
3. **Consultez le classement** basé sur la performance
4. **Cliquez sur une école** pour voir les détails

## 📞 Support

Si vous rencontrez des problèmes :

1. Vérifiez ce guide de dépannage
2. Consultez la documentation dans `README.md`
3. Ouvrez une issue sur GitHub
4. Contactez l'équipe de développement

## 🔄 Mise à Jour

Pour mettre à jour l'application :

```bash
git pull origin main
npm install
npm start
```

---

**Bonne utilisation de l'application de classement des écoles ! 🎓**



