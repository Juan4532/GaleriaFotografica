#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import json
from pathlib import Path

def scan_fotografias_folder():
    """Escanea la carpeta fotografias y retorna la estructura de galerías"""
    fotografias_path = Path("fotografias")

    if not fotografias_path.exists():
        print("❌ La carpeta 'fotografias' no existe. Creándola...")
        fotografias_path.mkdir()
        print("✅ Carpeta 'fotografias' creada.")
        return []

    galerias = []

    # Extensiones de imagen válidas
    valid_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff'}

    # Recorrer subcarpetas
    for subfolder in sorted(fotografias_path.iterdir()):
        if subfolder.is_dir():
            galeria_name = subfolder.name
            fotos = []

            # Buscar archivos de imagen en la subcarpeta
            for foto_file in sorted(subfolder.iterdir()):
                if foto_file.is_file() and foto_file.suffix.lower() in valid_extensions:
                    # Usar ruta relativa desde el HTML
                    foto_path = f"fotografias/{galeria_name}/{foto_file.name}"
                    fotos.append(foto_path)

            # Solo añadir galería si tiene fotos
            if fotos:
                galerias.append({
                    "nombre": galeria_name,
                    "fotos": fotos
                })
                print(f"📁 Galería '{galeria_name}': {len(fotos)} fotos encontradas")
            else:
                print(f"⚠️  Galería '{galeria_name}': No se encontraron fotos válidas")

    return galerias

def update_galleries_js(galerias):
    """Actualiza el archivo galleries.js con la nueva estructura"""

    # Generar contenido del archivo JavaScript
    js_content = f"""// Archivo generado automáticamente por update_galleries.py
// No editar manualmente - los cambios se perderán

const galerias = {json.dumps(galerias, indent=2, ensure_ascii=False)};

// Exportar para uso en app.js
if (typeof module !== 'undefined' && module.exports) {{
    module.exports = galerias;
}}
"""

    # Escribir archivo
    with open("galleries.js", "w", encoding="utf-8") as f:
        f.write(js_content)

    print(f"✅ Archivo 'galleries.js' actualizado con {len(galerias)} galerías")

def create_example_structure():
    """Crea una estructura de ejemplo si no existe"""
    fotografias_path = Path("fotografias")
    example_galleries = ["naturaleza", "retratos", "urbano", "abstracto"]

    created_any = False
    for gallery in example_galleries:
        gallery_path = fotografias_path / gallery
        if not gallery_path.exists():
            gallery_path.mkdir(parents=True)
            # Crear archivo README en cada galería
            readme_content = f"""# Galería: {gallery}

Coloca aquí las fotos para la galería '{gallery}'.

Formatos admitidos:
- JPG/JPEG
- PNG  
- GIF
- WebP
- BMP
- TIFF

El script 'update_galleries.py' detectará automáticamente
todas las imágenes en esta carpeta.
"""
            with open(gallery_path / "README.md", "w", encoding="utf-8") as f:
                f.write(readme_content)

            created_any = True
            print(f"📁 Creada galería de ejemplo: {gallery}")

    if created_any:
        print("\n💡 Se han creado galerías de ejemplo.")
        print("   Añade tus fotos a las carpetas correspondientes y ejecuta de nuevo el script.")

def main():
    """Función principal"""
    print("🔄 Actualizando portfolio de fotografía...")
    print("=" * 50)

    # Escanear carpeta fotografias
    galerias = scan_fotografias_folder()

    if not galerias:
        print("\n⚠️  No se encontraron galerías con fotos.")
        create_example_structure()
        return

    # Actualizar galleries.js
    update_galleries_js(galerias)

    print("=" * 50)
    print("✅ Actualización completada!")
    print("\n📋 Resumen:")
    for galeria in galerias:
        print(f"   • {galeria['nombre']}: {len(galeria['fotos'])} fotos")

    print("\n🌐 Recarga la página web para ver los cambios.")

if __name__ == "__main__":
    main()
