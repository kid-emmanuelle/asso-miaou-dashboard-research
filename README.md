# Tableau de Bord Asso Miaou

Une application web de tableau de bord pour gérer les données d'une association, incluant les commandes, les membres, les groupes et le matériel.

## Aperçu

Ce projet est une application de tableau de bord pour "Asso Miaou", fournissant une interface pour visualiser et rechercher dans les données de l'association. L'application comprend :

- Un tableau de bord principal avec des métriques clés et des graphiques
- Une interface de recherche pour les commandes
- Un design responsive qui fonctionne sur ordinateur et appareils mobiles
- Un mode clair/sombre interchangeable

## Fonctionnalités

### Page Tableau de Bord

- Affichage des métriques clés :
  - Chiffre d'affaires total
  - Nombre total de membres
  - Nombre total de groupes
  - Nombre total de commandes
- Graphique de tendance des revenus montrant le chiffre d'affaires mensuel
- Meilleurs vendeurs par valeur de commande
- Section des activités récentes

### Page de Recherche

- Recherche de commandes par plage de dates
- Recherche rapide dans tous les champs
- Recherche avancée par :
  - Membre client
  - Membre actif (vendeur)
  - Matériel
- Vue détaillée des commandes avec détails imprimables

### Configuration

- Personnalisation de la couleur de la barre latérale
- Basculement entre mode clair/sombre
- Mise en page responsive pour toutes les tailles d'écran

## Stack Technique

- HTML5, CSS3, JavaScript
- Framework Bootstrap pour les composants UI
- Chart.js pour la visualisation des données
- Serveur HTTP Python pour le développement local

## Intégration API

L'application se connecte à une API backend fonctionnant sur `http://localhost:8080` avec les points de terminaison suivants :

- `/api/commandes` - Obtenir toutes les commandes
- `/api/membres` - Obtenir tous les membres
- `/api/groupes` - Obtenir tous les groupes
- `/api/membres/actifs` - Obtenir les membres actifs (vendeurs)
- `/api/commandes/search/vendeur/{id}` - Obtenir les commandes par ID de vendeur

## Comment Exécuter

### Prérequis

- Python 3.x installé sur votre système
- Un navigateur web moderne (Chrome, Firefox, Safari, Edge)
- Serveur API backend fonctionnant sur le port 8080 (non inclus dans ce dépôt)

### Lancement de l'Application

1. Clonez ce dépôt sur votre machine locale :
   ```
   git clone <url-du-dépôt>
   cd asso-miaou-dashboard-research
   ```

2. Démarrez le serveur HTTP Python en exécutant :
   ```
   python run.py
   ```
   
   Cela va :
   - Démarrer un serveur web sur le port 8001
   - Ouvrir automatiquement votre navigateur par défaut sur http://localhost:8001

3. L'application devrait maintenant fonctionner dans votre navigateur. Si elle ne s'ouvre pas automatiquement, naviguez vers :
   ```
   http://localhost:8001
   ```

### Développement

Pour modifier l'application :

- Modifiez les fichiers HTML dans le répertoire `pages/`
- Modifiez les fichiers JavaScript dans le répertoire `assets/js/`
- Modifiez les fichiers CSS dans le répertoire `assets/css/`

Après avoir effectué des modifications, rafraîchissez votre navigateur pour voir les mises à jour.

## Structure du Projet 
```
├── assets/
│ ├── css/ # Stylesheets
│ ├── img/ # Images and icons
│ ├── js/ # JavaScript files
│ │ ├── core/ # Core libraries
│ │ ├── plugins/ # Plugin libraries
│ │ ├── dashboard-data.js # Dashboard data handling
│ │ ├── recherche.js # Search functionality
│ │ └── argon-dashboard.js # Main dashboard functionality
├── pages/
│ ├── dashboard.html # Main dashboard page
│ ├── recherche.html # Search page
│ └── tables.html # Tables page
└── run.py # Python server script
```

## Compatibilité des Navigateurs

L'application est compatible avec :
- Chrome (dernière version)
- Firefox (dernière version)
- Safari (dernière version)
- Edge (dernière version)

## Licence

Ce projet est sous licence MIT - voir le fichier LICENSE pour plus de détails.