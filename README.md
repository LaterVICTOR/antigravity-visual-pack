# Antigravity Visual Pack para IntelliJ IDEA

Adaptación no oficial de **Material Icon Theme 5.34.0** y **Red One Dark Pro 1.5.0**.
El fondo utiliza la función nativa de IntelliJ. No requiere instalar temas parecidos.
Compatible con IntelliJ IDEA **2026.2.x**; compilado contra la instalación 2026.2.3.

## Instalación

1. Descarga [antigravity-visual-pack-1.0.0.zip](downloads/antigravity-visual-pack-1.0.0.zip?raw=true).
2. Abre **Settings → Plugins** con `Ctrl + Alt + S`.
3. Pulsa el engranaje y selecciona **Install Plugin from Disk…**.
4. Elige el ZIP descargado, sin descomprimirlo, y reinicia si IDEA lo solicita.
5. En **Appearance & Behavior → Appearance → Theme**, selecciona una variante:
   **Red One Dark Pro | Dark**, **Dark Bordered**, **Mirage** o **Mirage Bordered**.
6. Los iconos de archivos y carpetas se activan al cargar el plugin.
7. Para el fondo, abre un proyecto y usa **Tools → Background: configurar imagen de fondo**.
   En Apariencia, pulsa **Background Image**. Elige la imagen, opacidad, posición
   y si se aplica sólo al proyecto. Se puede usar una imagen para **Editor and Tools**
   y otra para **Empty Frame**. IDEA guarda estos ajustes.

Si ya tienes otro plugin que sustituye iconos de archivos, desactívalo para evitar
que ambos proveedores compitan. Para retirar esta adaptación, desinstala el plugin
desde Settings → Plugins y elige otro tema. El fondo se elimina con **Clear and Close**
en el diálogo nativo de Background Image.

## Alcance

- Los cuatro temas convierten la paleta original a controles de IDEA y a esquemas
  del editor. Se incluyen colores de sintaxis generales y de Java, Kotlin, Python,
  JavaScript, TypeScript, PHP, Go, Ruby, JSON, XML, HTML, CSS y Markdown.
- Los iconos provienen de los SVG originales: asociaciones por nombre, ruta,
  extensión compuesta, lenguaje PSI y carpetas, con variantes claras cuando existen.
  Se conservan los iconos de símbolos de IntelliJ y sus decoraciones habituales.
- La apariencia se adapta a los componentes de IDEA; no reproduce exactamente
  cada detalle de la interfaz de Antigravity ni sus reglas TextMate contextuales.
- IDEA no expone el estado expandido de la carpeta a estos proveedores de iconos;
  se usa el icono de carpeta normal. La personalización dinámica de colores y
  paquetes de Material Icon Theme no forma parte de este port.
- Background permite imagen estática, opacidad y posición con el soporte nativo.
  No incluye el CSS, desenfoque, rotación ni los fondos distintos por panel de
  la extensión original. No se copia ni ejecuta el código de Katsute Background.
- No se importan las preferencias privadas de Antigravity ni imágenes personales.
  La selección de tema y fondo se realiza dentro de IDEA.

## Estado de validación

Compilación contra IntelliJ IDEA 2026.2.3 completada: 8.321 comprobaciones de
asociaciones y recursos y 1.243 archivos SVG/XML válidos. La apariencia dentro
de IntelliJ todavía no se ha verificado visualmente.

## Construcción

Requiere Node.js y una instalación de IntelliJ IDEA 2026.2 con JBR que incluya `javac`.
No descarga dependencias. Desde esta carpeta:

```powershell
node scripts/build.mjs --ide "C:\Program Files\JetBrains\IntelliJ IDEA 2026.2.3"
```

El script compila contra los JAR locales, verifica las asociaciones y recursos,
valida los XML/SVG y genera el ZIP instalable. Fuentes y assets importados están
incluidos para poder reconstruirlo sin Antigravity.

Para volver a importar assets desde las extensiones instaladas:

```powershell
node scripts/import-assets.mjs --extensions "$env:USERPROFILE\.antigravity\extensions"
```

## Créditos

- Material Icon Theme: Material Extensions, MIT.
- Red One Dark Pro: giladgd, distribución con licencia MIT de David Holland.
- Código de esta adaptación: [licencia MIT](LICENSE).
- Los textos completos de las licencias y procedencia están en `src/main/resources/licenses`
  y [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
- Este paquete es un port local no oficial y no está afiliado con los autores,
  Google ni JetBrains.
