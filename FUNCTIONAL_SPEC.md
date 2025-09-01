# Document Fonctionnel - DApp "Guess The Number"

## 1. Vue d'ensemble du produit

### 1.1 Description du produit
"Guess The Number" est une DApp (Application Décentralisée) qui permet aux utilisateurs de jouer à un jeu de devinettes de nombres sur la blockchain Polkadot. Le jeu utilise des smart contracts ink! déployés sur Pop Network pour garantir la transparence et l'équité du jeu.

### 1.2 Objectifs du produit
- **Divertissement** : Offrir une expérience de jeu simple et engageante
- **Éducation** : Démontrer les capacités des smart contracts ink! sur Polkadot
- **Adoption** : Faciliter l'adoption de la blockchain auprès du grand public
- **Innovation** : Utiliser les technologies les plus récentes de l'écosystème Polkadot

### 1.3 Public cible
- **Utilisateurs débutants** : Personnes découvrant la blockchain
- **Développeurs** : Curieux des smart contracts ink!
- **Gamers** : Joueurs cherchant de nouvelles expériences
- **Investisseurs DOT** : Utilisateurs de l'écosystème Polkadot

## 2. Fonctionnalités principales

### 2.1 Connexion Wallet

#### 2.1.1 Description
L'utilisateur doit se connecter avec un wallet compatible Polkadot pour pouvoir jouer.

#### 2.1.2 Fonctionnalités
- **Support multi-wallets** : Talisman, SubWallet, Polkadot.js Extension
- **Connexion automatique** : Mémorisation de la session
- **Gestion des comptes** : Sélection du compte à utiliser
- **Validation de connexion** : Vérification de la connectivité réseau

#### 2.1.3 Comportement attendu
- Affichage d'un bouton "Connect Wallet" si non connecté
- Affichage de l'adresse du compte connecté
- Possibilité de changer de compte
- Gestion des erreurs de connexion

### 2.2 Création d'une nouvelle partie

#### 2.2.1 Description
L'utilisateur peut démarrer une nouvelle partie en définissant une plage de nombres.

#### 2.2.2 Paramètres
- **min_number** : Nombre minimum de la plage (entier positif)
- **max_number** : Nombre maximum de la plage (entier positif)
- **Contraintes** : min_number < max_number

#### 2.2.3 Processus
1. L'utilisateur saisit les valeurs min et max
2. Validation côté client des entrées
3. Dry-run de la transaction pour vérification
4. Soumission de la transaction sur la blockchain
5. Génération d'un nombre aléatoire via VRF (Verifiable Random Function)
6. Initialisation de l'état du jeu

#### 2.2.4 Feedback utilisateur
- Toast de chargement pendant la transaction
- Toast de succès avec hash de la transaction
- Lien vers l'explorateur de blocs (Subscan)
- Affichage de l'état du jeu mis à jour

### 2.3 Jeu de devinettes

#### 2.3.1 Description
L'utilisateur doit deviner le nombre généré aléatoirement en recevant des indices.

#### 2.3.2 Mécanique de jeu
- **Objectif** : Trouver le nombre secret dans la plage définie
- **Processus** : L'utilisateur propose un nombre et reçoit un indice
- **Indices possibles** :
  - "Plus" : Le nombre secret est plus grand
  - "Moins" : Le nombre secret est plus petit
  - "Trouvé" : Le nombre a été deviné correctement

#### 2.3.3 Interface utilisateur
- **Affichage de la plage** : "Devinez le nombre entre X et Y"
- **Historique des tentatives** : Liste chronologique des essais
- **Formulaire de saisie** : Champ pour entrer le nombre
- **Bouton de validation** : "Faire une tentative"

#### 2.3.4 Validation des entrées
- **Type** : Nombre entier positif
- **Plage** : Doit être dans l'intervalle [min_number, max_number]
- **Format** : Validation regex `/^\d+$/`

### 2.4 Affichage de l'historique

#### 2.4.1 Description
L'application affiche l'historique complet des tentatives de la partie en cours.

#### 2.4.2 Informations affichées
- **Numéro de tentative** : Ordre chronologique
- **Nombre proposé** : Valeur saisie par l'utilisateur
- **Indice reçu** : Réponse du smart contract
- **Statut** : En attente, Plus, Moins, ou Trouvé

#### 2.4.3 Format d'affichage
```
Tentative 1 - Mon nombre est plus grand que 50
Tentative 2 - Mon nombre est plus petit que 75
Tentative 3 - Félicitations, vous avez trouvé le nombre 65 !
```

### 2.5 Synchronisation des données

#### 2.5.1 Description
L'application maintient une synchronisation en temps réel avec la blockchain.

#### 2.5.2 Mécanismes
- **Polling automatique** : Rafraîchissement toutes les 10 secondes
- **Synchronisation réactive** : Mise à jour après chaque transaction
- **Cache local** : Stockage des tentatives en mémoire
- **Gestion des conflits** : Résolution des données concurrentes

#### 2.5.3 États de synchronisation
- **En cours** : Affichage d'un indicateur de chargement
- **À jour** : Données synchronisées avec la blockchain
- **Erreur** : Affichage d'un message d'erreur avec possibilité de retry

## 3. Fonctionnalités secondaires

### 3.1 Notifications

#### 3.1.1 Types de notifications
- **Succès** : Transaction réussie (fond vert)
- **Erreur** : Échec de transaction (fond rouge)
- **Chargement** : Transaction en cours (fond gris)
- **Information** : Messages informatifs (fond bleu)

#### 3.1.2 Contenu des notifications
- **Message principal** : Description de l'action
- **Hash de transaction** : Identifiant unique de la transaction
- **Lien explorateur** : Lien vers Subscan pour plus de détails
- **Durée** : 5 secondes par défaut

### 3.2 Gestion des erreurs

#### 3.2.1 Types d'erreurs gérées
- **Erreurs de validation** : Entrées invalides
- **Erreurs de réseau** : Problèmes de connectivité
- **Erreurs de transaction** : Échecs sur la blockchain
- **Erreurs de wallet** : Problèmes de connexion

#### 3.2.2 Stratégies de récupération
- **Retry automatique** : Nouvelle tentative en cas d'échec réseau
- **Fallback** : Affichage d'un état de dégradation
- **Reset** : Possibilité de réinitialiser l'application
- **Support** : Messages d'aide pour l'utilisateur

### 3.3 Interface utilisateur

#### 3.3.1 Design
- **Thème** : Material-UI avec thème sombre
- **Responsive** : Adaptation mobile et desktop
- **Accessibilité** : Support des lecteurs d'écran
- **Internationalisation** : Prêt pour la traduction

#### 3.3.2 Composants UI
- **Boutons** : Actions principales et secondaires
- **Champs de saisie** : Validation en temps réel
- **Listes** : Affichage des tentatives
- **Modales** : Informations détaillées

## 4. Règles métier

### 4.1 Règles de jeu

#### 4.1.1 Création de partie
- Une seule partie active par utilisateur à la fois
- Les paramètres min et max doivent être des entiers positifs
- La plage doit être raisonnable (suggestion : max - min ≤ 1000)

#### 4.1.2 Tentatives
- Nombre illimité de tentatives
- Chaque tentative doit être un entier dans la plage définie
- Les tentatives sont immuables (pas de modification possible)

#### 4.1.3 Fin de partie
- La partie se termine quand le nombre est trouvé
- Possibilité de démarrer une nouvelle partie à tout moment
- Conservation de l'historique des parties précédentes

### 4.2 Règles techniques

#### 4.2.1 Blockchain
- Utilisation exclusive de Pop Network
- Frais de transaction en DOT
- Confirmation des transactions par finalité

#### 4.2.2 Sécurité
- Validation côté client ET serveur
- Pas d'exposition de données sensibles
- Gestion sécurisée des clés privées

#### 4.2.3 Performance
- Temps de réponse < 3 secondes pour les interactions
- Synchronisation automatique toutes les 10 secondes
- Gestion optimisée de la mémoire

## 5. Cas d'usage

### 5.1 Cas d'usage principal : Jouer une partie

#### 5.1.1 Prérequis
- Wallet connecté avec des DOT pour les frais
- Connexion internet stable

#### 5.1.2 Étapes
1. **Connexion** : L'utilisateur se connecte avec son wallet
2. **Création** : Il définit une plage (ex: 1-100) et démarre une partie
3. **Jeu** : Il propose des nombres et reçoit des indices
4. **Victoire** : Il trouve le nombre et peut recommencer

#### 5.1.3 Résultat attendu
- Expérience de jeu fluide et engageante
- Feedback immédiat sur chaque action
- Historique complet des tentatives

### 5.2 Cas d'usage : Gestion des erreurs

#### 5.2.1 Scénario
L'utilisateur tente de faire une tentative avec un nombre invalide.

#### 5.2.2 Comportement attendu
- Validation immédiate de l'entrée
- Message d'erreur clair et explicatif
- Possibilité de corriger et réessayer

### 5.3 Cas d'usage : Connexion perdue

#### 5.3.1 Scénario
La connexion réseau est interrompue pendant une partie.

#### 5.3.2 Comportement attendu
- Détection automatique de la déconnexion
- Affichage d'un message d'erreur
- Tentative de reconnexion automatique
- Restauration de l'état du jeu

## 6. Métriques et KPIs

### 6.1 Métriques utilisateur
- **Nombre de parties créées** : Engagement des utilisateurs
- **Nombre de tentatives par partie** : Difficulté perçue
- **Taux de complétion** : Parties terminées vs créées
- **Temps moyen par partie** : Engagement temporel

### 6.2 Métriques techniques
- **Temps de réponse** : Performance de l'application
- **Taux d'erreur** : Stabilité du système
- **Utilisation des ressources** : Optimisation
- **Temps de synchronisation** : Qualité de la connexion blockchain

### 6.3 Métriques business
- **Utilisateurs actifs** : Adoption du produit
- **Rétention** : Utilisateurs revenant jouer
- **Satisfaction** : Feedback utilisateur
- **Viralité** : Partage et recommandations

## 7. Contraintes et limitations

### 7.1 Contraintes techniques
- **Dépendance réseau** : Nécessite une connexion internet
- **Frais de transaction** : Coût en DOT pour chaque action
- **Latence blockchain** : Délai de confirmation des transactions
- **Compatibilité wallet** : Support limité aux wallets Polkadot

### 7.2 Contraintes fonctionnelles
- **Une partie à la fois** : Pas de parties simultanées
- **Plage limitée** : Contraintes sur les valeurs min/max
- **Pas de sauvegarde** : Données uniquement sur la blockchain
- **Pas de mode hors ligne** : Nécessite une connexion constante

### 7.3 Contraintes réglementaires
- **Conformité** : Respect des régulations locales
- **Vie privée** : Protection des données utilisateur
- **Sécurité** : Standards de sécurité applicables

## 8. Évolutions futures

### 8.1 Fonctionnalités prévues
- **Leaderboards** : Classements des meilleurs joueurs
- **Tournois** : Mode compétitif avec récompenses
- **NFTs** : Récompenses sous forme de tokens uniques
- **Multi-joueurs** : Parties en temps réel entre utilisateurs

### 8.2 Améliorations techniques
- **Multi-chaînes** : Support d'autres parachains
- **Mode hors ligne** : Synchronisation différée
- **Notifications push** : Alertes en temps réel
- **API publique** : Intégration avec d'autres applications

### 8.3 Optimisations
- **Performance** : Réduction des temps de réponse
- **UX** : Amélioration de l'expérience utilisateur
- **Accessibilité** : Support étendu des handicaps
- **Internationalisation** : Support multi-langues

## 9. Conclusion

La DApp "Guess The Number" offre une expérience de jeu simple mais engageante qui démontre les capacités des smart contracts ink! sur l'écosystème Polkadot. L'application combine une interface utilisateur moderne avec une architecture technique robuste, offrant une base solide pour l'évolution et l'extension des fonctionnalités.

Le produit répond aux besoins d'éducation et d'adoption de la blockchain tout en offrant une expérience de divertissement de qualité. Les fonctionnalités prévues permettront d'enrichir l'expérience utilisateur et d'étendre l'audience de l'application.


