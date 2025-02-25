# Tableau de Bord Asso Miaou

## Aperçu
Le Tableau de Bord Asso Miaou est une application web conçue pour gérer et visualiser les données liées à l'organisation Asso Miaou. Ce projet se compose d'une interface utilisateur construite avec HTML, CSS et JavaScript, et d'un back-end propulsé par Spring Boot.

## Fonctionnalités

### 1. Page d'Accueil
- **Redirection** : Redirige automatiquement vers la page du tableau de bord.
- **Style** : Utilise Argon Dashboard CSS pour un look moderne.

### 2. Page du Tableau de Bord
- **Vue d'ensemble** : Affiche les métriques clés et les visualisations de données.
- **Navigation** : Inclut une barre latérale pour une navigation facile vers d'autres sections.
- **Contenu Dynamique** : Récupère et affiche les données depuis l'API back-end.

### 3. Page de Recherche
- **Fonctionnalité de Recherche** : Permet aux utilisateurs de rechercher des commandes et de filtrer les résultats.
- **Sélecteur de Plage de Dates** : Les utilisateurs peuvent sélectionner une plage de dates pour leur recherche.

## Comment Exécuter le Projet

### Prérequis
- Java 11 ou supérieur
- Maven

### Étape 1 : Configurer le Back-End Spring Boot
1. Suivez les instructions dans le fichier README.md du back-end.
2. Assurez-vous que le back-end fonctionne sur `http://localhost:8080`.

### Étape 2 : Configurer le Front-End
1. Exécutez le fichier `run.py` pour démarrer le serveur front-end.
    ```bash
    python run.py
    ```
2. Ouvrez votre navigateur et accédez à `http://localhost:8001`.

## Conclusion
Ce projet fournit un tableau de bord complet pour gérer les données liées à l'organisation Asso Miaou. Suivez les étapes ci-dessus pour configurer les composants back-end et front-end et commencer à utiliser l'application.
