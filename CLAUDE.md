# Web de Cosmic Works (cosmicworks.es)

- Página estática de una sola página: todo está en `index.html` (HTML + CSS + un pequeño script). Sin build ni dependencias.
- Se publica sola con GitHub Pages al hacer push a `main`. `CNAME` = cosmicworks.es (DNS en STRATO). No borrar `CNAME` ni `.nojekyll`.
- Bilingüe: el texto en español está en el HTML; cada elemento traducible lleva `data-i18n="tN"` (o `data-i18n-alt` en imágenes) y su versión inglesa está en el objeto `EN` del script al final. Al cambiar un texto, cambiar ambos idiomas.
- El idioma se elige por el navegador (es → español, resto → inglés) y con el botón ES/EN; se guarda en localStorage (`cw-lang`).
- Marca: rojo `#a51e1e` y blanco (logo blanco sobre rojo / rojo sobre blanco). La marca es "Cosmic Works", sin "Studios". Lema: "Gaming passion".
- Fuente del logo: IM FELL English (Google Fonts: "IM Fell English"). Titulares: IM Fell English (misma fuente que el logo); texto: Work Sans; etiquetas: JetBrains Mono.
- No mencionar IA ni ExpoGo en la web. Zampa Cubes: solo la versión original de móvil (no anunciar todavía el relanzamiento). Tales of Cotteland se muestra solo como "Project Sargon" (sin revelar detalles).
- Imágenes en `assets/`. `og-image.png` es la vista previa al compartir el enlace.
- Press kit de Tiki Tiki en `presskit/tiki-tiki/`, en inglés. **Su `index.html` es el original: se edita aquí** (ya no existe copia en el repo de Tiki-Tiki). Las imágenes, las fuentes y `TikiTiki_PressKit.zip` los pone `ArtSource/Marketing/make_presskit.sh` del repo Aturax/Tiki-Tiki (clonado junto a este): tras editar la página o cambiar una imagen allí, ejecutarlo para que el zip lleve la versión nueva, y hacer commit de lo que cambie. El zip lleva rutas con `/`; no rehacerlo con `Compress-Archive`, que en Windows PowerShell 5.1 usa `\` y en Mac y Linux se descomprime mal.
- Al tocar el objeto `EN` con scripts, volver a buscarlo después de modificar el HTML (no reutilizar posiciones antiguas) y comprobar con `node --check` que el script sigue siendo válido.
