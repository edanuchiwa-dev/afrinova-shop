# 📸 Aperçu Visuel — Page Produit Option 2

## Structure de la Page `/produit/[slug]`

```
┌─────────────────────────────────────────┐
│  ← Boutique    Stock réel (12) • 24H  │ ← Header Sticky
├─────────────────────────────────────────┤
│                                         │
│     [Grande Image Produit]              │
│                                         │
│  Livraison Offerte • 24-48H            │
│                            [Montres]    │
├─────────────────────────────────────────┤
│  ★★★★★ 4.9/5 (62 avis vérifiés)       │
│                                         │
│  Montre Chronographe Automatique       │
│  189,00 € 255,15 € [Économie]          │
│                                         │
│  Boîtier en acier chirurgical...       │
│                                         │
├─────────────────────────────────────────┤
│  🚚 24-48H  │ 📦 Antichoc │ 🛡️ 2 Ans │
│  Expédition │  Emballage  │  Garantie │
├─────────────────────────────────────────┤
│  📍 Vos Coordonnées  [Sans CB]         │
│  ─────────────────────────────────────  │
│                                         │
│  Nom et Prénom * [              ]      │
│  Téléphone *     [              ]      │
│  Adresse *       [              ]      │
│  Code Postal *   [    ]  Ville * [   ] │
│  Transporteur    [▼ Colissimo    ]     │
│  Instructions    [              ]      │
│                                         │
│  [✓ Confirmer ma commande (189,00 €)] │ ← Bouton Principal
│                                         │
│  Paiement à la livraison ou SMS        │
│  ─────────────────────────────────────  │
│  🚚 48H  │ 📦 Antichoc │ 🛡️ 2 Ans    │ ← Extra Guarantees
│  Colissimo│  Emballage │   Garantie   │
├─────────────────────────────────────────┤
│  Total à payer      [Commander ↓]      │ ← Sticky Bottom Bar
│  189,00 € Livraison offerte            │
└─────────────────────────────────────────┘
```

## Flux Utilisateur

1. **Arrivée sur la page** → Voir l'image produit + prix + avis
2. **Scroll vers le bas** → Découvrir les garanties (24-48H, Antichoc, 2 Ans)
3. **Remplir le formulaire** → Nom, Téléphone, Adresse (sans carte bancaire)
4. **Clic sur bottom bar "Commander ↓"** → Scroll automatique vers le formulaire
5. **Clic "Confirmer ma commande"** → Validation + Écran de succès

## Écran de Confirmation

```
┌─────────────────────────────────────────┐
│                                         │
│            ✓                            │
│     (emerald badge)                     │
│                                         │
│  Merci pour votre confiance !           │
│                                         │
│  Votre colis est en cours de            │
│  préparation dans notre atelier.        │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Numéro : ORD-20261024-001       │   │
│  │ Produit : Montre Chronographe   │   │
│  │ Livraison : Paris               │   │
│  │ Transporteur : Colissimo        │   │
│  │ Total : 189,00 €                │   │
│  └─────────────────────────────────┘   │
│                                         │
│  🔔 Alerte envoyée en direct            │
│  Notre équipe a reçu votre...          │
│                                         │
│  [Retourner à l'accueil]               │
│                                         │
└─────────────────────────────────────────┘
```

## Spécificités Techniques

### États React Gérés
- `product` : Données du produit (fetch API + fallback)
- `loading` : État de chargement initial
- `customerName`, `customerPhone`, etc. : Champs du formulaire
- `carrier` : Sélection du mode de livraison
- `submitting` : Affichage du spinner pendant la validation
- `errorMsg` : Messages d'erreur de validation
- `orderConfirmed` : Données de la commande validée

### Fonctions Clés
- `scrollToForm()` : Défile vers le formulaire (appelé depuis bottom bar)
- `handleOrderSubmit()` : Validation + POST vers `/api/orders`

### Tailwind Classes Principales
- `fixed bottom-0` : Sticky bottom bar flottante
- `scroll-mt-16` : Offset de scroll pour le formulaire
- `backdrop-blur-md` : Effet de flou sur la bottom bar
- `aspect-square` : Image produit carrée responsive
- `grid grid-cols-3` : Sections de garanties
- `rounded-xl` : Bordures arrondies modernes

## Conformité avec .clinerules

✅ **Framework** : Tailwind CSS v4  
✅ **Option Validée** : Option 2 (Formulaire direct intégré)  
✅ **Sans Carte Bancaire** : Confirmé avec badge + texte de réassurance  
✅ **Barre d'action rapide** : Bottom bar avec bouton "Commander ↓"  
✅ **Référence** : Aligné pixel-perfect avec `docs/preview_mobile.html`

---

**Date de génération :** 24 octobre 2026  
**Généré par :** @Cline (Lead Frontend & UI)
