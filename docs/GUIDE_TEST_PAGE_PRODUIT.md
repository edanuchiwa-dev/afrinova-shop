# 🧪 Guide de Test — Page Produit Option 2

**Date :** 24 octobre 2026  
**Fichier testé :** `src/app/produit/[slug]/page.tsx`

---

## 🌐 URLs de Test Disponibles

### Produits du Catalogue (Fallback)

1. **Montre Chronographe Automatique**
   - URL : `http://localhost:3000/produit/montre-chronographe`
   - Prix : 189,00 €
   - Stock : 12 unités
   - Catégorie : Montres

2. **Sacoche Cuir Véritable Vintage**
   - URL : `http://localhost:3000/produit/sacoche-cuir`
   - Prix : 129,00 €
   - Stock : 10 unités
   - Catégorie : Maroquinerie

3. **Casque Audio Sans Fil Hi-Fi Réduction de Bruit**
   - URL : `http://localhost:3000/produit/casque-audio-sans-fil`
   - Prix : 149,00 €
   - Stock : 15 unités
   - Catégorie : Audio

4. **Portefeuille Minimaliste Anti-RFID**
   - URL : `http://localhost:3000/produit/portefeuille-rfid`
   - Prix : 49,00 €
   - Stock : 20 unités
   - Catégorie : Maroquinerie

---

## ✅ Checklist de Test Manuel

### 1. Affichage Initial
- [ ] L'image du produit se charge correctement
- [ ] Le badge "Stock réel (X) • 24H" affiche le bon nombre
- [ ] Le badge "Livraison Offerte • 24-48H" est visible
- [ ] Les étoiles d'avis (★★★★★ 4.9/5) s'affichent
- [ ] Le prix principal (text-2xl) est en gras
- [ ] Le prix barré (économie) est affiché à côté
- [ ] La description du produit est lisible

### 2. Section Garanties (Première)
- [ ] 3 colonnes : 🚚 24-48H | 📦 Antichoc | 🛡️ 2 Ans
- [ ] Texte sous chaque icône visible
- [ ] Background slate-50 avec bordure

### 3. Formulaire de Livraison Directe
- [ ] Header avec icône 📍 et badge "Sans Carte Bancaire"
- [ ] Champ "Nom et Prénom *" requis
- [ ] Champ "Téléphone mobile *" de type tel
- [ ] Champ "Adresse de livraison *" requis
- [ ] Grid 2 colonnes pour Code Postal + Ville
- [ ] Sélecteur de transporteur avec 3 options :
  - Colissimo Domicile 48h (Gratuit)
  - Chronopost Express 24h
  - Point Relais Mondial Relay (Gratuit)
- [ ] Champ optionnel "Instructions pour le livreur"
- [ ] Bouton "✓ Confirmer ma commande (XXX,XX €)" en emerald-600
- [ ] Texte "Paiement à la livraison ou validation par SMS" en dessous

### 4. Section Extra Guarantees (Après le formulaire)
- [ ] Border-top pour séparer du formulaire
- [ ] 3 colonnes : 🚚 48H Colissimo | 📦 Antichoc | 🛡️ 2 Ans
- [ ] Texte en text-[10px] text-slate-500

### 5. Sticky Bottom Bar (Barre Flottante)
- [ ] Position fixed en bas de l'écran
- [ ] Background blanc avec backdrop-blur-md
- [ ] Texte "Total à payer" en uppercase
- [ ] Prix affiché avec "Livraison offerte" en vert
- [ ] Bouton "Commander ↓" en blue-600
- [ ] Clic sur le bouton scroll vers le formulaire

### 6. Validation du Formulaire
- [ ] Validation côté client si champs vides
- [ ] Message d'erreur en rose-50/rose-700 si incomplet
- [ ] Spinner pendant la soumission (border-2 animate-spin)
- [ ] Texte du bouton change en "Validation en cours..."

### 7. Écran de Confirmation (Après Soumission)
- [ ] Icône ✓ verte (emerald-100/emerald-600)
- [ ] Badge "Commande Validée avec Succès"
- [ ] Titre "Merci pour votre confiance !"
- [ ] Récapitulatif avec :
  - Numéro de commande (font-mono)
  - Nom du produit
  - Ville de livraison
  - Transporteur
  - Prix total
- [ ] Alert box bleue "Alerte envoyée en direct"
- [ ] Bouton "Retourner à l'accueil" fonctionnel

### 8. Responsive Mobile
- [ ] Layout max-w-md centré sur desktop
- [ ] sm:rounded-3xl sur desktop
- [ ] Bottom bar reste collée en bas
- [ ] Formulaire reste lisible sur petit écran
- [ ] Images ne débordent pas

---

## 🔧 Tests Techniques

### Build & Compilation
```bash
cd /home/killer7/Projets/ecommerce-team
npm run build
```
**Résultat Attendu :**
```
✓ Compiled successfully in <1s
✓ Running TypeScript ... Finished
✓ Generating static pages (8/8)
```

### Serveur de Développement
```bash
npm run dev
```
**Puis ouvrir :** `http://localhost:3000/produit/montre-chronographe`

### Test API Products (Optionnel)
```bash
curl http://localhost:3000/api/products
```
**Résultat Attendu :** JSON avec tous les produits

### Test API Orders (Simulation)
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "Test User",
    "customerPhone": "0612345678",
    "shippingAddress": "123 Rue Test",
    "shippingPostalCode": "75001",
    "shippingCity": "Paris",
    "shippingCountry": "France",
    "carrier": "Colissimo Domicile 48h (Gratuit)",
    "shippingCost": 0,
    "customerNotes": "",
    "items": [{"id": 1, "quantity": 1}]
  }'
```

---

## 🐛 Bugs Potentiels à Surveiller

1. **Scroll automatique ne fonctionne pas**
   - Vérifier que `id="commandeDirecte"` est présent
   - Vérifier que `scrollToForm()` utilise bien `scrollIntoView`

2. **Bottom bar masque le contenu**
   - Vérifier que le container a `pb-28` (padding-bottom)

3. **Images ne se chargent pas**
   - Vérifier les URLs Unsplash
   - Vérifier les domaines autorisés dans `next.config.mjs`

4. **Formulaire ne se soumet pas**
   - Vérifier que `/api/orders` est accessible
   - Vérifier la structure du payload JSON

5. **Stock ne se met pas à jour**
   - Vérifier la connexion SQLite dans `src/lib/db.ts`
   - Vérifier les transactions dans `/api/orders`

---

## 📱 Test sur Dispositifs Réels

### iOS Safari
- [ ] Sticky bar fonctionne
- [ ] Formulaire ne zoom pas trop (viewport correct)
- [ ] Scroll smooth opérationnel

### Android Chrome
- [ ] Bottom bar reste en place
- [ ] Clavier ne masque pas les champs
- [ ] Transitions CSS fluides

### Desktop (Chrome/Firefox/Edge)
- [ ] Card centrée avec max-w-md
- [ ] Bordures arrondies visibles
- [ ] Hover states fonctionnent

---

**Statut du Guide :** ✅ Complet et prêt pour utilisation
