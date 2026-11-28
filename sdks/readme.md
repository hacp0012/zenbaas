# SDK JavaScript / TypeScript

## Ajouter le sous-dépôt

```bash
git remote add -f zenbase-sdk-js-ts <URL_DU_DEPOT>
git subtree add --prefix=sdks/js-ts zenbase-sdk-js-ts main --squash
```

## Récupérer les mises à jour

```bash
git subtree pull --prefix=sdks/js-ts zenbase-sdk-js-ts main --squash
```

## Envoyer les modifications

```bash
git subtree push --prefix=sdks/js-ts zenbase-sdk-js-ts main
```
