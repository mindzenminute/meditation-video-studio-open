# meditation-video-studio-open
Studio de production de vidéos de méditation guidée avec Remotion, n8n, OpenRouter RAG et Vercel.
# meditation-video-studio-open

Studio de production de vidéos de méditation guidée de 10 minutes, basé sur :

- **Remotion** pour la composition vidéo
- **n8n** comme source de contenu
- **OpenRouter** pour la génération de texte assistée par IA via RAG
- **Vercel** pour le déploiement, les webhooks et le stockage Blob optionnel

## Objectif

Produire une vidéo de méditation guidée au format fixe :

| Segment | Durée |
|---|---:|
| Intro | 8 s |
| Respiration | 18 s |
| Guidage | 555 s |
| Outro | 15 s |
| **Total** | **596 s** |

Thème de référence : **« Instants de fraîcheur dans une journée »**.

L’audio est pré-généré en externe. Remotion assemble la vidéo, synchronise les textes, applique le branding et gère les fondus.

---

## Prérequis

- Node.js >= 20
- npm
- Compte OpenRouter (pour la génération RAG)
- Compte Vercel (pour déploiement et Blob storage optionnel)

---

## Installation locale

```bash
npm install
