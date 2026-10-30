# Aplicar el paquete al repositorio desde Android/Termux

**No hagas público el repositorio.** Descarga `IngenieroAI_Complete_MVP_Patch.zip` desde ChatGPT y guárdalo en la carpeta Descargas del teléfono. El ZIP es un overlay de archivos fuente y no contiene `.git`, contraseñas ni archivos `.env` reales.


## Opción simple (script incluido)

Después de descargar el ZIP, en Termux ejecuta:

```bash
termux-setup-storage
mkdir -p "$HOME/ingenieroai-patch-stage"
unzip -o "$HOME/storage/downloads/IngenieroAI_Complete_MVP_Patch.zip" -d "$HOME/ingenieroai-patch-stage"
cd "$HOME/ingenieroai-patch-stage"
bash scripts/apply-patch-termux.sh "$HOME/downloads/IngenieroAI_Neon_AuthJS_Final"
```

El script se detiene si detecta cambios locales sin guardar, hace fetch/pull de `origin/main`, copia el paquete, ejecuta las pruebas estáticas si Node está instalado y crea/pulsa el commit. No copia `.env` ni credenciales. Si el nombre/ruta de tu carpeta de proyecto es distinto, cambia el último argumento.

En Termux, ejecuta estos comandos en orden (si tu carpeta local tiene otro nombre, ajusta `PROJECT`):

```bash
termux-setup-storage
PROJECT="$HOME/downloads/IngenieroAI_Neon_AuthJS_Final"
PATCH="$HOME/storage/downloads/IngenieroAI_Complete_MVP_Patch.zip"
GIT_DIR="$PROJECT/.git-project" GIT_WORK_TREE="$PROJECT" git -C "$PROJECT" status
GIT_DIR="$PROJECT/.git-project" GIT_WORK_TREE="$PROJECT" git fetch origin
GIT_DIR="$PROJECT/.git-project" GIT_WORK_TREE="$PROJECT" git pull --rebase origin main
```

Si `git status` muestra cambios locales tuyos que no están guardados, no sigas hasta revisarlos. Después aplica el ZIP en una carpeta temporal y copia los archivos al proyecto:

```bash
STAGE="$HOME/ingenieroai-patch-stage"
mkdir -p "$STAGE"
rm -rf "$STAGE"/* "$STAGE"/.[!.]* 2>/dev/null || true
unzip -o "$PATCH" -d "$STAGE"
for item in "$STAGE"/* "$STAGE"/.[!.]*; do
  [ -e "$item" ] || continue
  base="$(basename "$item")"
  case "$base" in .git|.git-project|node_modules|.next|.env|.env.local|.env.production) continue ;; esac
  cp -a "$item" "$PROJECT/"
done
```

Revisa que las pruebas estáticas pasen y sube el cambio:

```bash
cd "$PROJECT"
node scripts/qa-static.mjs
node scripts/qa-routes.mjs
GIT_DIR="$PROJECT/.git-project" GIT_WORK_TREE="$PROJECT" git add -A
GIT_DIR="$PROJECT/.git-project" GIT_WORK_TREE="$PROJECT" git commit -m "feat: company onboarding and guarded billing MVP"
GIT_DIR="$PROJECT/.git-project" GIT_WORK_TREE="$PROJECT" git push origin main
```

Vercel empezará el nuevo despliegue cuando el `push` se complete. Si el commit dice “nothing to commit”, revisa que el ZIP se haya extraído al directorio temporal correcto y que copiaste su contenido a la raíz del proyecto.

Después sigue `RUNBOOK_PRODUCTION.md`. No se puede crear una empresa hasta que la migración `0002` esté aplicada y SMTP tenga credenciales reales.
