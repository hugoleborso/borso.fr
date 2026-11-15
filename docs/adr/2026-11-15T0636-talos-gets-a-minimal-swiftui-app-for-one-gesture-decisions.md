# ADR-2026-11-15T0636: Talos prend une licence Apple Developer pour une petite app SwiftUI qui tranche depuis la notification

- **Status:** proposed
- **Date:** 2026-11-15
- **Deciders:** l'opérateur
- **Tags:** talos, ios, notifications, cost

## Résumé

**Décision proposée.** Prendre l'Apple Developer Program, 99 USD par an, pour une petite app SwiftUI distribuée par TestFlight. Au départ, elle affiche la proposition dans la notification avec 2 à 4 boutons. Elle envoie le choix sans ouvrir d'app. La PWA reste l'app principale.

**C'est la première exception à la règle « borso.fr reste quasi gratuit, sans service payant ».** L'opérateur tranche en revue de cette PR. Le statu quo reste une option défendable.

| Option | Gestes par décision | Coût annuel | Construction et maintenance | Chaîne de build | Ce que ça débloque en plus |
|---|---|---|---|---|---|
| 1. Statu quo, PWA | 🔴 2 taps, plus le chargement de la PWA | 🟢 0 | 🟢 le modèle à plusieurs choix seulement | 🟢 aucune nouvelle | 🔴 rien |
| 2a. Licence + SwiftUI natif (proposée) | 🟢 1 appui long puis 1 tap, sans ouvrir d'app | 🔴 99 USD | 🟡 une petite app Swift, l'envoi APNs dans l'API | 🟡 macOS : Mac local ou runner GitHub | 🟢 widgets, Live Activities, Siri, HealthKit, Contacts |
| 2b. Licence + coquille Capacitor ou Expo | 🟢 pareil que 2a | 🔴 99 USD | 🔴 une coquille, plus du Swift pour l'action en fond | 🟡 macOS, plus la chaîne JavaScript | 🟢 pareil que 2a |
| 3. Bot Telegram ou DM Slack | 🟡 2 taps, sans charger la PWA (inféré) | 🟢 0 | 🟡 un bot, un webhook, un lien d'identité | 🟢 aucune nouvelle | 🔴 rien |
| 4. App native sans licence | 🔴 aucune notification distante | 🟢 0 | 🔴 réinstaller chaque semaine | 🔴 un Mac branché tous les 7 jours | 🟡 HealthKit, Contacts, widgets, sans push |

🟢 bon, 🟡 acceptable, 🔴 bloquant ou mauvais.

## Context

Talos est un agent qui travaille en fond. Il prépare des propositions (des cartes), l'utilisateur les tranche dans la PWA, et ce choix déclenche une routine (`apps/talos/CONTRAT.md`, « Une proposition »).

Le besoin est de trancher en un geste depuis la notification, entre 2 et 4 options, par exemple « mardi », « jeudi » ou « pas cette semaine ». Ce besoin dépasse Accepter et Refuser.

Aujourd'hui il faut deux taps au minimum. La notification ouvre `/proposals/<slug>`, et la carte porte les boutons (`CONTRAT.md` écrit « one tap opens the card and a second decides »). La cause est une limite de Safari iOS, vérifiée sur trois sources :

- Les données de compatibilité MDN donnent `Notification.actions` et le paramètre `actions` de `showNotification` à `version_added: false` pour Safari, et Safari iOS les reflète. Chrome les prend en charge depuis la version 53, Firefox depuis la 152 (lu dans `mdn/browser-compat-data`, `api/Notification.json` et `api/ServiceWorkerRegistration.json`, le 2026-11-15).
- Le fil [Apple Developer Forums 726793](https://developer.apple.com/forums/thread/726793) rapporte depuis iOS 16.4 que les actions déclarées sont ignorées, et seul « View » s'affiche. Aucune réponse d'Apple n'y figure. Le dernier message, de novembre 2024, dit qu'iOS ne les prend toujours pas en charge.
- La doc [OneSignal sur les boutons d'action](https://documentation.onesignal.com/docs/action-buttons) classe Safari en « No buttons », sur macOS comme sur iOS.

Une contrainte vaut pour toutes les options. Une proposition est binaire aujourd'hui, car `POST /proposals/:slug/decision` prend `"acceptee" | "refusee"`. Il faut d'abord un modèle à plusieurs choix, une liste `options` sur la proposition et l'option choisie dans la décision. Ce travail est le même dans les cinq options, donc il ne les départage pas.

## Criteria

| Criterion | Raised by | Weight | Why it matters | How it is measured |
|---|---|---|---|---|
| Does it change the app for its users | operator | high | Trancher en un geste, entre 2 et 4 options, depuis la notification | Nombre de gestes entre la notification affichée et la décision enregistrée |
| Coût annuel | operator | high | borso.fr reste quasi gratuit, sans service payant | Prix public, lu sur la page Apple |
| Effort de construction et de maintenance | operator | medium | Un seul opérateur, des agents en parallèle | Ce que le changement touche : nouveaux langages, nouveaux secrets, nouvelles chaînes |
| Chaîne de build | operator | medium | Pas de Mac dans les sessions cloud | Où le build tourne : Mac local ou runner macOS GitHub Actions |
| Ce que le natif débloque en plus | operator | low | Des usages futurs (sport, contacts, widgets) | Doc Apple de chaque framework, lue le 2026-11-15 |

## Decision

**Option 2a, licence Apple Developer et petite app SwiftUI.** C'est la seule option qui tranche en un geste sans ouvrir d'app, avec jusqu'à quatre boutons, exactement le besoin. Elle coûte 99 USD par an et une petite base Swift. La coquille Capacitor ou Expo coûte la même licence et demande quand même du Swift pour l'action en fond. Le statu quo et la messagerie restent à deux taps. L'app sans licence ne reçoit pas de notification distante.

## Consequences

- `+` Une décision prend un appui long et un tap sur la notification, sans ouvrir d'app, avec 2 à 4 boutons.
- `+` La même app peut porter plus tard un widget « À décider », une Live Activity, des raccourcis Siri, et lire HealthKit pour le suivi sport.
- `-` La première dépense récurrente de borso.fr est de 99 USD par an. Le montant en euros s'affiche à l'inscription. Des sources secondaires donnent 99 € (non vérifié chez Apple).
- `-` Un nouveau langage (Swift) et une nouvelle chaîne (Xcode, signature, TestFlight) que les sessions cloud ne peuvent pas lancer sans runner macOS.
- `-` Un build TestFlight expire après 90 jours, donc il faut un build au moins par trimestre.
- `-` Si l'adhésion n'est pas renouvelée, les notifications natives s'arrêtent. La PWA reste le repli et continue de marcher.
- `~` L'API envoie des notifications APNs en plus du web push. Il faut une clé APNs `.p8` dans SSM sous `/talos/`, et une route qui enregistre le jeton de l'appareil.
- `~` L'app native s'authentifie avec un jeton gardé dans le trousseau, car la session de la PWA est un cookie HttpOnly. Le jeton est révocable depuis la PWA.

## Alternatives considered

### Option 2a — Licence Apple Developer et SwiftUI natif (chosen)

- **Raised by:** operator
- **Summary:** Une app SwiftUI minimale. Elle enregistre une `UNNotificationCategory` par nombre de choix et reçoit les notifications APNs de l'API Talos. Elle envoie l'option choisie à l'API en arrière-plan. Un tap sur le corps de la notification ouvre la carte dans la PWA. Distribution par TestFlight en test interne, sans passage sur l'App Store.
- **Strengths:**
  - Gestes. [« Declaring your actionable notification types »](https://developer.apple.com/documentation/usernotifications/declaring-your-actionable-notification-types) dit que le bouton envoie l'action à l'app, « which then processes the action in the background ». Une action sans l'option [`foreground`](https://developer.apple.com/documentation/usernotifications/unnotificationactionoptions/foreground) n'ouvre pas l'app. Les [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/notifications) donnent « up to four buttons » dans la vue détaillée, donc 2 à 4 options tiennent.
  - Débloque, vérifié sur la doc Apple : [WidgetKit](https://developer.apple.com/documentation/widgetkit) (widgets sur l'écran d'accueil et l'écran verrouillé), [ActivityKit](https://developer.apple.com/documentation/activitykit) (Live Activities, mises à jour par push), [App Intents](https://developer.apple.com/documentation/appintents) (Siri, Spotlight, Raccourcis), [HealthKit](https://developer.apple.com/documentation/healthkit) (données sport avec permission), [Contacts](https://developer.apple.com/documentation/contacts) (carnet d'adresses).
  - Chaîne de build. Les runners hébergés standard sont gratuits pour un dépôt public ([GitHub](https://docs.github.com/en/billing/concepts/product-billing/github-actions)). La page ne nomme pas macOS dans cette phrase, donc la gratuité du runner macOS est inférée.
- **Costs:**
  - 99 USD par an, « in local currency where available » ([Apple](https://developer.apple.com/help/account/membership/program-enrollment/)).
  - Une app Swift, une route APNs dans l'API, une clé `.p8`, un certificat et un profil de signature en secrets GitHub.
  - Ne débloque pas l'historique d'appels, car [`CXCallObserver`](https://developer.apple.com/documentation/callkit/cxcallobserver) ne voit que les appels en cours. Ne débloque pas iMessage, car le framework [Messages](https://developer.apple.com/documentation/messages) crée des extensions et des autocollants, il ne lit pas les conversations. Ne débloque pas WhatsApp, qui n'expose aucune API de lecture sur iOS (inféré). Talos continue de les lire sur le Mac (la routine `collecte-mac`).
- **Rationale:** Elle gagne sur le critère de poids fort que seules 2a et 2b remplissent. Elle bat 2b sur l'effort, car 2b demande aussi du Swift.

### Option 1 — Statu quo, la PWA ouvre la carte (rejected)

- **Raised by:** operator
- **Summary:** On garde le web push. La notification ouvre `/proposals/<slug>`, et la carte affiche les 2 à 4 boutons une fois le modèle à plusieurs choix livré.
- **Strengths:** Zéro coût, zéro nouvelle chaîne. Le lien profond existe déjà.
- **Costs:** Deux taps et le démarrage de la PWA à chaque décision. Rien de plus sur iOS.
- **Rejection rationale:** Perd sur le critère de poids fort. Si l'opérateur juge que deux taps suffisent, ou que la règle « sans service payant » pèse plus, cette option gagne. Le modèle à plusieurs choix se livre de toute façon.
- **Operator's answer:** en attente, l'opérateur tranche en revue de cette PR.

### Option 2b — Licence et coquille Capacitor ou Expo autour de la PWA (rejected)

- **Raised by:** operator
- **Summary:** Emballer le site React dans une coquille native et réutiliser le code de la PWA.
- **Strengths:** Toute l'app devient native d'un coup, avec les mêmes capacités que 2a.
- **Costs:**
  - La [doc du plugin Capacitor Push Notifications](https://capacitorjs.com/docs/apis/push-notifications) ne propose aucune méthode pour déclarer des catégories. Il faut écrire le Swift soi-même.
  - La [doc expo-notifications](https://docs.expo.dev/versions/latest/sdk/notifications/) a `setNotificationCategoryAsync` et `opensAppToForeground`. Mais sa tâche de fond ne tourne sur un tap d'action, app fermée, que sur Android. Sur iOS, le choix peut donc être perdu si l'app est fermée.
  - La connexion par passkey dans une WebView demande des domaines associés.
  - Deux runtimes à maintenir, plus une chaîne native.
- **Rejection rationale:** Même licence et même besoin de Swift que 2a, avec une couche de plus. Elle passerait devant si l'opérateur voulait toute la PWA en natif.
- **Operator's answer:** en attente, l'opérateur tranche en revue de cette PR.

### Option 3 — Bot Telegram ou DM Slack avec boutons (rejected)

- **Raised by:** operator
- **Summary:** L'API poste chaque proposition dans un chat, avec un bouton par option. Telegram le fait avec `InlineKeyboardMarkup` et `callback_data` ([Bot API](https://core.telegram.org/bots/api)), Slack avec des boutons Block Kit. Le clic revient par webhook.
- **Strengths:** Gratuit. Aucune chaîne Apple. Les boutons portent autant d'options que voulu.
- **Costs:**
  - Les boutons vivent dans le message, pas dans la notification iOS. Il faut donc un tap pour ouvrir le chat, puis un tap sur le bouton (inféré, non mesuré sur un téléphone).
  - Le contenu privé des propositions passe par un tiers.
  - Pour Slack, les connecteurs de cette session appartiennent à l'employeur (`CLAUDE.md`). Il faudrait un espace de travail personnel.
- **Rejection rationale:** Deux gestes comme le statu quo. Le gain est d'éviter le chargement de la PWA, au prix d'un tiers qui lit le contenu.
- **Operator's answer:** en attente, l'opérateur tranche en revue de cette PR.

### Option 4 — App native sans licence payante (rejected)

- **Raised by:** operator
- **Summary:** Une app signée par l'équipe personnelle gratuite de Xcode, installée depuis un Mac.
- **Strengths:** Gratuit. HealthKit, App Groups (donc les widgets) et Contacts sont disponibles sans adhésion.
- **Costs:**
  - La [table des capacités iOS](https://developer.apple.com/help/account/reference/supported-capabilities-ios) coche « Push notifications », « Siri », « Time Sensitive Notifications » et « Communication Notifications » pour les membres payants seulement (lu dans le HTML de la page). L'app ne reçoit donc aucune notification distante, et le besoin n'est pas rempli.
  - Les profils expirent « sept jours après leur émission » ([Apple, comparatif des adhésions](https://developer.apple.com/fr/support/compare-memberships/)). Il faut recompiler depuis un Mac chaque semaine, et la CI ne peut pas le faire.
- **Rejection rationale:** Éliminée sur le critère de poids fort. Sans push, aucune notification n'arrive au bon moment.
- **Operator's answer:** en attente, l'opérateur tranche en revue de cette PR.

## Scores

|   | 2a. SwiftUI + licence | 1. Statu quo | 2b. Coquille + licence | 3. Telegram ou Slack | 4. Sans licence |
|---|---|---|---|---|---|
| Gestes | ✓ appui long et un tap, sans ouvrir d'app | ✗ 2 taps et la PWA | ✓ comme 2a, si le Swift est écrit | ✗ 2 taps (inféré) | ✗ pas de push distant |
| Coût annuel | ✗ 99 USD | ✓ 0 | ✗ 99 USD | ✓ 0 | ✓ 0 |
| Effort | ✓ une petite app Swift | ✓ rien de neuf | ✗ coquille plus Swift | ✓ un bot et un webhook | ✗ réinstaller chaque semaine |
| Chaîne de build | ✓ runner macOS, signature en secrets | ✓ inchangée | ✓ runner macOS | ✓ inchangée | ✗ Mac obligatoire, sans CI |
| Débloque en plus | ✓ widgets, Live Activities, Siri, HealthKit, Contacts | ✗ rien | ✓ comme 2a | ✗ rien | ✓ HealthKit, Contacts, widgets |

## Implementation pointers

- Spec : aucune pour l'instant. Si l'option 2a est acceptée, une spec `docs/features/talos/` la suit.
- Plan : aucun.
- Commit : à remplir par `/after-task-kaizen` au merge.
- Files : `apps/talos/CONTRAT.md` (`POST /proposals/:slug/decision`, `POST /notify`), `apps/talos/site/public/sw.js` (`notificationclick`).
- Related ADRs : ADR-2026-10-23T0932 (le web push de pragma reprend celui de Talos), ADR-2026-11-11T1306 (chaque décision déclenche une routine enregistrée).
