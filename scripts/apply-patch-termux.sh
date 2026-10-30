#!/usr/bin/env bash
set -Eeuo pipefail

PATCH_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT="${1:-$HOME/downloads/IngenieroAI_Neon_AuthJS_Final}"

if [[ ! -d "$PROJECT" ]]; then
  echo "ERROR: No encuentro el proyecto en: $PROJECT" >&2
  echo "Uso: bash scripts/apply-patch-termux.sh /ruta/a/IngenieroAI_Neon_AuthJS_Final" >&2
  exit 1
fi

if [[ -d "$PROJECT/.git-project" ]]; then
  GIT_DIR_PATH="$PROJECT/.git-project"
elif [[ -d "$PROJECT/.git" ]]; then
  GIT_DIR_PATH="$PROJECT/.git"
else
  echo "ERROR: No encontré .git-project ni .git. No voy a inicializar ni sobrescribir Git." >&2
  exit 1
fi

gitx() { GIT_DIR="$GIT_DIR_PATH" GIT_WORK_TREE="$PROJECT" git -C "$PROJECT" "$@"; }

if [[ -n "$(gitx status --porcelain)" ]]; then
  echo "ERROR: Hay cambios locales sin guardar. Revisa 'git status' y haz commit o respáldalos antes de aplicar." >&2
  gitx status --short
  exit 1
fi

echo "Actualizando la copia local desde origin/main…"
gitx fetch origin
gitx pull --rebase origin main

for item in src db scripts package.json .env.example .gitignore README.md ARCHITECTURE.md \
  FINAL_REVIEW_STATUS.md NEON_AUTHJS_MIGRATION_STATUS.md PRODUCTION_READINESS.md \
  RELEASE_STATUS.txt RUNBOOK_PRODUCTION.md DEPLOY_FROM_TERMUX.md tsconfig.json next.config.ts; do
  if [[ -e "$PATCH_ROOT/$item" ]]; then
    cp -a "$PATCH_ROOT/$item" "$PROJECT/"
  fi
done
rm -f "$PROJECT/tsconfig.tsbuildinfo"

echo "Archivos actualizados. Ejecutando QA estática…"
if command -v node >/dev/null 2>&1; then
  (cd "$PROJECT" && node scripts/qa-static.mjs && node scripts/qa-routes.mjs)
else
  echo "AVISO: Node.js no está instalado en Termux; omití QA local. Vercel debe hacer el build real."
fi

echo "Preparando commit…"
gitx add -A
if [[ -z "$(gitx diff --cached --name-only)" ]]; then
  echo "No hay cambios nuevos que subir."
  exit 0
fi
gitx commit -m "feat: company onboarding and guarded billing MVP"
echo "Subiendo a GitHub origin/main…"
gitx push origin main
echo "PUSH COMPLETADO. Revisa Vercel → ingenieroai-pro → Deployments."
