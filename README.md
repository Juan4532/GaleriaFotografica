# Portfolio fotográfico

Web estática para mostrar fotos organizadas en galerías. No necesita servidor
ni base de datos: cada carpeta de `fotografias/` es una galería.

## Uso

1. Crea una subcarpeta por galería dentro de `fotografias/` y copia ahí tus fotos:

   ```
   fotografias/
     01-viaje-a-Lisboa/
       portada.jpg      ← opcional: se usa como portada de la galería
       P7180327.JPG
       ...
     02-retratos/
       ...
   ```

   - El nombre de la carpeta es el título: `01-viaje-a-Lisboa` se muestra como
     «Viaje a Lisboa». El número del principio solo sirve para ordenar.
   - Las fotos se ordenan por nombre (`foto 2` va antes que `foto 10`).
   - Las carpetas que empiezan por `_`, `.` o `@` se ignoran: sirven para
     guardar borradores sin publicarlos.

2. Instala Pillow (solo la primera vez) y ejecuta el script:

   ```
   pip install pillow
   python3 update_galleries.py
   ```

   El script genera `galleries.js` y, en `optimizadas/`, una miniatura y una
   versión grande de cada foto. Los originales de la cámara pueden pesar varios
   MB; las versiones optimizadas pesan una fracción y la web carga mucho más
   rápido. Solo se procesan las fotos nuevas o modificadas.

3. Abre `index.html` en el navegador.

Vuelve a ejecutar el script cada vez que añadas, quites o cambies fotos.

### Opciones del script

| Opción | Qué hace |
| --- | --- |
| `--forzar` | Regenera todas las imágenes optimizadas |
| `--sin-optimizar` | Solo genera `galleries.js`; la web usa las fotos originales |
| `--sin-originales` | El visor no enlaza los originales (si solo publicas `optimizadas/`) |

Sin Pillow el script también funciona, pero la web usará las fotos originales.

## Publicar la web

Sube `index.html`, `app.js`, `style.css`, `galleries.js` y la carpeta
`optimizadas/` (por ejemplo, a GitHub Pages). Sube también `fotografias/` si
quieres que el botón «Ver original» del visor funcione; si no, genera la web
con `python3 update_galleries.py --sin-originales`.

## Uso de la web

- Cada galería tiene su propia dirección (`#/nombre-galeria`) y cada foto
  también (`#/nombre-galeria/3`), así que puedes compartir enlaces directos y
  el botón Atrás del navegador funciona.
- En el visor: flechas ← → para cambiar de foto, Inicio/Fin para ir a la
  primera o la última y Esc para cerrar. En el móvil, desliza a los lados para
  cambiar de foto y hacia abajo para cerrar.
