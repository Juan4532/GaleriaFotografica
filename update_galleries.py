#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Genera galleries.js a partir de la carpeta fotografias/.

Cada subcarpeta de fotografias/ es una galería. Si Pillow está instalado
(pip install pillow), además crea versiones optimizadas de cada foto en
optimizadas/: una miniatura para las cuadrículas y una versión grande para
el visor, mucho más ligeras que los originales de la cámara.

Uso:
    python3 update_galleries.py                 # escanea y genera
    python3 update_galleries.py --forzar        # regenera todas las imágenes
    python3 update_galleries.py --sin-optimizar # solo genera galleries.js
    python3 update_galleries.py --sin-originales # no enlaza los originales
                                                 # (si solo publicas optimizadas/)
"""

import argparse
import json
import os
import re
import sys
import unicodedata
from pathlib import Path
from urllib.parse import quote

RAIZ = Path(__file__).resolve().parent
CARPETA_FOTOS = RAIZ / "fotografias"
CARPETA_OPTIMIZADAS = RAIZ / "optimizadas"
ARCHIVO_JS = RAIZ / "galleries.js"

# Formatos que el navegador muestra directamente
EXTENSIONES_WEB = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".bmp"}
# Formatos que solo se pueden publicar si Pillow los convierte a JPEG
EXTENSIONES_CONVERTIBLES = {".tif", ".tiff", ".heic", ".heif"}

TAMANO_MINIATURA = 800   # lado mayor máximo, en píxeles
TAMANO_GRANDE = 2048
CALIDAD_JPEG = 82

try:
    from PIL import Image, ImageOps
    try:
        from pillow_heif import register_heif_opener  # opcional
        register_heif_opener()
    except ImportError:
        pass
except ImportError:
    Image = None


def orden_natural(texto):
    """Ordena 'foto 2' antes que 'foto 10'."""
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", texto)]


def es_oculto(ruta):
    # ".DS_Store", "._foto.jpg" (macOS), "@eaDir" (Synology), "_borradores"...
    return ruta.name.startswith((".", "_", "@"))


def titulo_legible(nombre_carpeta):
    """'02-san_juan' -> 'San juan'. El prefijo numérico solo sirve para ordenar."""
    titulo = re.sub(r"^\d+[\s._-]+", "", nombre_carpeta)
    titulo = re.sub(r"[_-]+", " ", titulo).strip() or nombre_carpeta
    return titulo[0].upper() + titulo[1:]


def url_relativa(ruta):
    """Ruta relativa a la web, codificada para que espacios o tildes no rompan la URL."""
    # macOS guarda las tildes descompuestas (NFD); git y los servidores, compuestas (NFC)
    relativa = unicodedata.normalize("NFC", ruta.relative_to(RAIZ).as_posix())
    return quote(relativa, safe="/")


def buscar_fotos(carpeta, con_pillow):
    validas = EXTENSIONES_WEB | (EXTENSIONES_CONVERTIBLES if con_pillow else set())
    fotos, ignoradas = [], []
    for archivo in carpeta.iterdir():
        if not archivo.is_file() or es_oculto(archivo):
            continue
        ext = archivo.suffix.lower()
        if ext in validas:
            fotos.append(archivo)
        elif ext in EXTENSIONES_CONVERTIBLES:
            ignoradas.append(archivo.name)
    fotos.sort(key=lambda f: orden_natural(f.name))
    # Una foto llamada "portada.*" se usa como portada de la galería
    fotos.sort(key=lambda f: f.stem.lower() != "portada")
    return fotos, ignoradas


def nombres_salida(fotos):
    """Nombre .jpg de cada versión optimizada, sin colisiones (a.jpg y a.png)."""
    usados, nombres = set(), {}
    for foto in fotos:
        nombre = foto.stem + ".jpg"
        if nombre.lower() in usados:
            nombre = f"{foto.stem}_{foto.suffix.lstrip('.')}.jpg"
        usados.add(nombre.lower())
        nombres[foto] = nombre
    return nombres


def guardar_reducida(imagen, destino, tamano):
    copia = imagen.copy()
    copia.thumbnail((tamano, tamano), Image.LANCZOS)
    destino.parent.mkdir(parents=True, exist_ok=True)
    copia.save(destino, "JPEG", quality=CALIDAD_JPEG, optimize=True, progressive=True)


def optimizar(foto, nombre_galeria, nombre_salida, forzar):
    """Crea miniatura y versión grande. Devuelve (miniatura, grande, ancho, alto)."""
    mini = CARPETA_OPTIMIZADAS / nombre_galeria / "mini" / nombre_salida
    grande = CARPETA_OPTIMIZADAS / nombre_galeria / "grande" / nombre_salida
    # Las versiones optimizadas llevan la misma fecha que el original: si la
    # fecha cambia (aunque sea a una anterior), la foto se ha sustituido
    fecha = foto.stat().st_mtime_ns
    al_dia = (
        not forzar
        and mini.exists() and grande.exists()
        and mini.stat().st_mtime_ns == fecha
        and grande.stat().st_mtime_ns == fecha
    )
    if al_dia:
        with Image.open(grande) as img:
            ancho, alto = img.size
        return mini, grande, ancho, alto

    with Image.open(foto) as img:
        # Respeta la orientación EXIF: muchas cámaras guardan las verticales giradas
        img = ImageOps.exif_transpose(img)
        if img.mode not in ("RGB", "L"):
            fondo = Image.new("RGB", img.size, (17, 17, 17))
            rgba = img.convert("RGBA")
            fondo.paste(rgba, mask=rgba.getchannel("A"))
            img = fondo
        guardar_reducida(img, mini, TAMANO_MINIATURA)
        guardar_reducida(img, grande, TAMANO_GRANDE)
    for destino in (mini, grande):
        os.utime(destino, ns=(fecha, fecha))
    with Image.open(grande) as img:
        ancho, alto = img.size
    return mini, grande, ancho, alto


def limpiar_optimizadas(generadas):
    """Borra de optimizadas/ las imágenes de fotos que ya no existen."""
    if not CARPETA_OPTIMIZADAS.exists():
        return 0
    borradas = 0
    for archivo in CARPETA_OPTIMIZADAS.rglob("*"):
        if archivo.is_file() and archivo not in generadas:
            archivo.unlink()
            borradas += 1
    for carpeta in sorted(CARPETA_OPTIMIZADAS.rglob("*"), reverse=True):
        if carpeta.is_dir() and not any(carpeta.iterdir()):
            carpeta.rmdir()
    return borradas


def escanear(optimizar_fotos, forzar, enlazar_originales):
    galerias, generadas = [], set()
    subcarpetas = [c for c in CARPETA_FOTOS.iterdir() if c.is_dir() and not es_oculto(c)]

    sueltas = [f for f in CARPETA_FOTOS.iterdir()
               if f.is_file() and f.suffix.lower() in EXTENSIONES_WEB | EXTENSIONES_CONVERTIBLES]
    if sueltas:
        print(f"⚠️  {len(sueltas)} fotos sueltas en '{CARPETA_FOTOS.name}/' se ignoran: "
              "muévelas a una subcarpeta (galería)")

    for carpeta in sorted(subcarpetas, key=lambda c: orden_natural(c.name)):
        fotos, ignoradas = buscar_fotos(carpeta, optimizar_fotos)
        if ignoradas:
            print(f"   ⚠️  '{carpeta.name}': {len(ignoradas)} fotos TIFF/HEIC ignoradas "
                  "(instala Pillow para convertirlas)")
        if not fotos:
            print(f"⚠️  Galería '{carpeta.name}': no se encontraron fotos válidas")
            continue

        nombres = nombres_salida(fotos)
        entradas = []
        for i, foto in enumerate(fotos, 1):
            entrada = {"original": url_relativa(foto)}
            if optimizar_fotos:
                try:
                    mini, grande, ancho, alto = optimizar(foto, carpeta.name, nombres[foto], forzar)
                except Exception as error:  # foto dañada o formato raro
                    print(f"\r   ❌ No se pudo procesar '{foto.name}' y se omite: {error}")
                    continue
                else:
                    generadas.update((mini, grande))
                    entrada.update(src=url_relativa(grande), mini=url_relativa(mini),
                                   ancho=ancho, alto=alto)
                    if not enlazar_originales:
                        del entrada["original"]
            entradas.append(entrada)
            print(f"   {i}/{len(fotos)} {foto.name}".ljust(60), end="\r", flush=True)

        galerias.append({
            "nombre": carpeta.name,
            "titulo": titulo_legible(carpeta.name),
            "fotos": entradas,
        })
        print(f"📁 Galería '{carpeta.name}': {len(entradas)} fotos".ljust(60))

    return galerias, generadas


def escribir_js(galerias):
    contenido = (
        "// Archivo generado automáticamente por update_galleries.py\n"
        "// No editar manualmente - los cambios se perderán\n\n"
        f"const galerias = {json.dumps(galerias, indent=2, ensure_ascii=False)};\n"
    )
    ARCHIVO_JS.write_text(contenido, encoding="utf-8")


def main():
    # Evita que los emojis rompan el script en consolas de Windows
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(errors="replace")

    parser = argparse.ArgumentParser(description="Actualiza las galerías del portfolio.")
    parser.add_argument("--forzar", action="store_true",
                        help="regenera todas las imágenes optimizadas")
    parser.add_argument("--sin-optimizar", action="store_true",
                        help="no crea miniaturas; la web usará las fotos originales")
    parser.add_argument("--sin-originales", action="store_true",
                        help="no enlaza las fotos originales desde el visor "
                             "(útil si solo publicas la carpeta optimizadas/)")
    args = parser.parse_args()

    print("🔄 Actualizando portfolio de fotografía...")
    print("=" * 50)

    if not CARPETA_FOTOS.exists():
        CARPETA_FOTOS.mkdir()
        print(f"📁 Creada la carpeta '{CARPETA_FOTOS.name}'.")
        print("   Crea dentro una subcarpeta por galería, añade tus fotos")
        print("   y vuelve a ejecutar este script.")
        return

    optimizar_fotos = not args.sin_optimizar
    if optimizar_fotos and Image is None:
        print("⚠️  Pillow no está instalado: se usarán las fotos originales (más lentas).")
        print("   Instálalo con:  pip install pillow\n")
        optimizar_fotos = False

    galerias, generadas = escanear(optimizar_fotos, args.forzar, not args.sin_originales)

    if not galerias:
        print("\n⚠️  No se encontraron galerías con fotos; galleries.js no se ha modificado.")
        print(f"   Crea subcarpetas dentro de '{CARPETA_FOTOS.name}/' con tus fotos.")
        return

    escribir_js(galerias)
    if optimizar_fotos:
        borradas = limpiar_optimizadas(generadas)
        if borradas:
            print(f"🧹 Eliminadas {borradas} imágenes optimizadas que ya no se usan")

    total = sum(len(g["fotos"]) for g in galerias)
    print("=" * 50)
    print(f"✅ galleries.js actualizado: {len(galerias)} galerías, {total} fotos")
    print("🌐 Recarga la página web para ver los cambios.")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(1)
