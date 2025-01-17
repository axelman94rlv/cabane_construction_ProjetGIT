# construction_cabane_ProjetGIT
Projet fictif pour la gestion de la construction d'une cabane avec Git/Github

## Configuration des remotes


Ce projet est configuré pour utiliser deux remotes sur Github :  
-Remote principale : [cabane-construction](https://github.com/axelman94rlv/cabane_construction_ProjetGIT)  
-Remote backup : [cabane-construction](https://github.com/axelman94rlv/cabane_construction_backup)  

![screenshot de la commande](images/screen1.png)  

Toute modification est automatiquement push sur les deux remotes avec `git push origin`.

Un hook a été crée pour vérifier les fichiers .sh :
![screen hook valide](images/Screen2.png)
![screen hook invalide](images/Screen3.png)


