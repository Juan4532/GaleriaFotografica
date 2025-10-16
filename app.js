// Los datos de las galerías se cargan desde galleries.js

// Estado de la aplicación (usando variables JavaScript en lugar de localStorage)
let estadoActual = {
    vista: 'principal', // 'principal', 'galeria', 'foto'
    galeriaActual: null,
    fotoActual: 0,
    fotosActuales: []
};

// Referencias a elementos del DOM
const elementos = {
    vistaPrincipal: document.getElementById('galeria-principal'),
    vistaGaleria: document.getElementById('galeria-individual'),
    vistaCompleta: document.getElementById('foto-completa'),
    contenedorGalerias: document.querySelector('.contenedor-galerias'),
    contenedorFotos: document.querySelector('.contenedor-fotos'),
    imagenCompleta: document.getElementById('imagen-completa'),
    btnVolver: document.querySelector('.btn-volver'),
    btnCerrar: document.querySelector('.btn-cerrar'),
    btnAnterior: document.querySelector('.btn-anterior'),
    btnSiguiente: document.querySelector('.btn-siguiente')
};

// Función para cambiar entre vistas
function cambiarVista(nuevaVista) {
    // Ocultar todas las vistas
    document.querySelectorAll('.vista').forEach(vista => {
        vista.classList.remove('activa');
    });
    
    // Mostrar la vista seleccionada
    switch(nuevaVista) {
        case 'principal':
            elementos.vistaPrincipal.classList.add('activa');
            estadoActual.vista = 'principal';
            break;
        case 'galeria':
            elementos.vistaGaleria.classList.add('activa');
            estadoActual.vista = 'galeria';
            break;
        case 'foto':
            elementos.vistaCompleta.classList.add('activa');
            estadoActual.vista = 'foto';
            break;
    }
}

// Función para crear elemento de galería
function crearElementoGaleria(nombreGaleria, primeraFoto) {
    const galeriaDiv = document.createElement('div');
    galeriaDiv.className = 'galeria-item';
    galeriaDiv.setAttribute('tabindex', '0');
    galeriaDiv.setAttribute('role', 'button');
    galeriaDiv.setAttribute('aria-label', `Galería ${nombreGaleria}`);
    
    const img = document.createElement('img');
    img.src = primeraFoto;
    img.alt = `Primera foto de ${nombreGaleria}`;
    img.loading = 'lazy';
    
    galeriaDiv.appendChild(img);
    
    // Event listeners para clic y teclado
    galeriaDiv.addEventListener('click', () => abrirGaleria(nombreGaleria));
    galeriaDiv.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            abrirGaleria(nombreGaleria);
        }
    });
    
    return galeriaDiv;
}

// Función para crear elemento de foto
function crearElementoFoto(urlFoto, indice) {
    const fotoDiv = document.createElement('div');
    fotoDiv.className = 'foto-item';
    fotoDiv.setAttribute('tabindex', '0');
    fotoDiv.setAttribute('role', 'button');
    fotoDiv.setAttribute('aria-label', `Foto ${indice + 1}`);
    
    const img = document.createElement('img');
    img.src = urlFoto;
    img.alt = `Foto ${indice + 1}`;
    img.loading = 'lazy';
    
    fotoDiv.appendChild(img);
    
    // Event listeners para clic y teclado
    fotoDiv.addEventListener('click', () => abrirFotoCompleta(indice));
    fotoDiv.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            abrirFotoCompleta(indice);
        }
    });
    
    return fotoDiv;
}

// Renderizar galerías principales
function renderizarGaleriasPrincipales() {
    elementos.contenedorGalerias.innerHTML = '';

    galerias.forEach(galeria => {
        if (galeria.fotos && galeria.fotos.length > 0) {
            const elementoGaleria = crearElementoGaleria(galeria.nombre, galeria.fotos[0]);
            elementos.contenedorGalerias.appendChild(elementoGaleria);
        }
    });
}

// Renderizar fotos de galería específica
function renderizarFotosGaleria(nombreGaleria) {
    elementos.contenedorFotos.innerHTML = '';

    const galeria = galerias.find(g => g.nombre === nombreGaleria);
    if (galeria && galeria.fotos) {
        galeria.fotos.forEach((foto, indice) => {
            const elementoFoto = crearElementoFoto(foto, indice);
            elementos.contenedorFotos.appendChild(elementoFoto);
        });
    }
}


// Función para abrir una galería específica
function abrirGaleria(nombreGaleria) {
    estadoActual.galeriaActual = nombreGaleria;
    estadoActual.fotosActuales = galerias[nombreGaleria] || [];
    
    renderizarFotosGaleria(nombreGaleria);
    cambiarVista('galeria');
}

function abrirGaleria(nombreGaleria) {
    estadoActual.galeriaActual = nombreGaleria;
    const galeria = galerias.find(g => g.nombre === nombreGaleria);
    estadoActual.fotosActuales = galeria ? galeria.fotos : [];
    renderizarFotosGaleria(nombreGaleria);
    cambiarVista('galeria');
}

function abrirFotoCompleta(indice) {
    const fotos = estadoActual.fotosActuales;
    if (fotos && fotos[indice]) {
        estadoActual.fotoActual = indice;
        elementos.imagenCompleta.src = fotos[indice];
        elementos.imagenCompleta.alt = `Foto ${indice + 1} de ${estadoActual.galeriaActual}`;
        cambiarVista('foto');
    } else {
        console.error('Foto no encontrada en índice:', indice);
    }
}


// Función para navegar a la foto anterior
function fotoAnterior() {
    const totalFotos = estadoActual.fotosActuales.length;
    if (totalFotos > 0) {
        estadoActual.fotoActual = (estadoActual.fotoActual - 1 + totalFotos) % totalFotos;
        elementos.imagenCompleta.src = estadoActual.fotosActuales[estadoActual.fotoActual];
        elementos.imagenCompleta.alt = `Foto ${estadoActual.fotoActual + 1} de ${estadoActual.galeriaActual}`;
    }
}

// Función para navegar a la foto siguiente
function fotoSiguiente() {
    const totalFotos = estadoActual.fotosActuales.length;
    if (totalFotos > 0) {
        estadoActual.fotoActual = (estadoActual.fotoActual + 1) % totalFotos;
        elementos.imagenCompleta.src = estadoActual.fotosActuales[estadoActual.fotoActual];
        elementos.imagenCompleta.alt = `Foto ${estadoActual.fotoActual + 1} de ${estadoActual.galeriaActual}`;
    }
}

// Función para volver a la vista principal
function volverAPrincipal() {
    estadoActual.galeriaActual = null;
    estadoActual.fotosActuales = [];
    estadoActual.fotoActual = 0;
    cambiarVista('principal');
}

// Función para volver a la galería desde foto completa
function volverAGaleria() {
    cambiarVista('galeria');
}

// Event listeners para botones de navegación
elementos.btnVolver.addEventListener('click', volverAPrincipal);
elementos.btnCerrar.addEventListener('click', volverAGaleria);
elementos.btnAnterior.addEventListener('click', fotoAnterior);
elementos.btnSiguiente.addEventListener('click', fotoSiguiente);

// Event listeners para navegación con teclado
document.addEventListener('keydown', (e) => {
    switch(estadoActual.vista) {
        case 'foto':
            if (e.key === 'Escape') {
                volverAGaleria();
            } else if (e.key === 'ArrowLeft') {
                fotoAnterior();
            } else if (e.key === 'ArrowRight') {
                fotoSiguiente();
            }
            break;
        case 'galeria':
            if (e.key === 'Escape') {
                volverAPrincipal();
            }
            break;
    }
});

// Event listener para gestos de deslizamiento en dispositivos táctiles
let startX = 0;
let startY = 0;

document.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
});

document.addEventListener('touchend', (e) => {
    if (estadoActual.vista !== 'foto') return;
    
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const diffX = startX - endX;
    const diffY = startY - endY;
    
    // Verificar que el movimiento sea principalmente horizontal
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
        if (diffX > 0) {
            // Deslizar hacia la izquierda (foto siguiente)
            fotoSiguiente();
        } else {
            // Deslizar hacia la derecha (foto anterior)
            fotoAnterior();
        }
    }
});

// Función para precargar imágenes (mejora la experiencia del usuario)
function precargarImagenes() {
    galerias.forEach(galeria => {
        galeria.fotos.forEach(urlFoto => {
            const img = new Image();
            img.src = urlFoto;
        });
    });
}


// Función de inicialización
function inicializar() {
    // Renderizar galerías principales
    renderizarGaleriasPrincipales();
    
    // Mostrar vista principal
    cambiarVista('principal');
    
    // Precargar imágenes en segundo plano
    setTimeout(precargarImagenes, 1000);
    
    console.log('Portfolio fotográfico inicializado correctamente');
    console.log(`Se encontraron ${Object.keys(galerias).length} galerías`);
}

// Inicializar la aplicación cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializar);
} else {
    inicializar();
}

// Función para agregar nuevas galerías dinámicamente
// (simula la funcionalidad de detectar nuevas carpetas)
function agregarGaleria(nombre, fotos) {
    if (!galerias[nombre]) {
        galerias[nombre] = fotos;
        renderizarGaleriasPrincipales();
        console.log(`Nueva galería '${nombre}' agregada con ${fotos.length} fotos`);
        return true;
    }
    return false;
}

// Función para actualizar fotos de una galería existente
function actualizarGaleria(nombre, fotos) {
    if (galerias[nombre]) {
        galerias[nombre] = fotos;
        if (estadoActual.galeriaActual === nombre && estadoActual.vista === 'galeria') {
            renderizarFotosGaleria(nombre);
            estadoActual.fotosActuales = fotos;
        }
        renderizarGaleriasPrincipales();
        console.log(`Galería '${nombre}' actualizada con ${fotos.length} fotos`);
        return true;
    }
    return false;
}

// Exportar funciones para uso futuro (si se necesita agregar funcionalidad)
window.portfolioFotografico = {
    agregarGaleria,
    actualizarGaleria,
    galerias,
    estadoActual
};
