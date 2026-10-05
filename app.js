// Los datos de las galerías se cargan desde galleries.js (generado por update_galleries.py)
//
// Rutas (en el hash de la URL, para que funcionen el botón Atrás y los enlaces directos):
//   #/                    vista principal
//   #/<galeria>           cuadrícula de fotos de una galería
//   #/<galeria>/<n>       foto n (empezando en 1) a pantalla completa

'use strict';

const PROPORCION_POR_DEFECTO = 4 / 3;

// Admite tanto el formato antiguo de galleries.js (lista de rutas) como el nuevo
// (objetos con versión grande, miniatura y dimensiones)
function codificarRuta(ruta) {
    return ruta.split('/').map(encodeURIComponent).join('/');
}

function normalizarFoto(foto) {
    if (typeof foto === 'string') {
        const url = codificarRuta(foto);
        return { src: url, mini: url, original: url, proporcion: null };
    }
    const src = foto.src || foto.original;
    return {
        src,
        mini: foto.mini || src,
        original: foto.original || src,
        proporcion: foto.ancho && foto.alto ? foto.ancho / foto.alto : null
    };
}

function tituloLegible(nombre) {
    const titulo = nombre.replace(/^\d+[\s._-]+/, '').replace(/[_-]+/g, ' ').trim() || nombre;
    return titulo.charAt(0).toUpperCase() + titulo.slice(1);
}

const listaGalerias = (typeof galerias !== 'undefined' && Array.isArray(galerias)) ? galerias : [];
const datosGalerias = listaGalerias
    .map(g => ({
        nombre: g.nombre,
        titulo: g.titulo || tituloLegible(g.nombre),
        fotos: (g.fotos || []).map(normalizarFoto)
    }))
    .filter(g => g.fotos.length > 0);

// Estado de la aplicación
const estadoActual = {
    vista: null,          // 'principal', 'galeria', 'foto'
    galeria: null,        // objeto de datosGalerias
    galeriaRenderizada: null,
    fotoActual: 0,
    cargaPendiente: null
};

// Referencias a elementos del DOM
const elementos = {
    vistaPrincipal: document.getElementById('galeria-principal'),
    vistaGaleria: document.getElementById('galeria-individual'),
    vistaCompleta: document.getElementById('foto-completa'),
    contenedorGalerias: document.querySelector('.contenedor-galerias'),
    contenedorFotos: document.querySelector('.contenedor-fotos'),
    tituloGaleria: document.getElementById('titulo-galeria'),
    contadorGaleria: document.querySelector('.contador-galeria'),
    contenedorImagen: document.querySelector('.contenedor-imagen'),
    imagenCompleta: document.getElementById('imagen-completa'),
    infoTitulo: document.querySelector('.info-titulo'),
    infoPosicion: document.querySelector('.info-posicion'),
    btnOriginal: document.querySelector('.btn-original'),
    btnVolver: document.querySelector('.btn-volver'),
    btnCerrar: document.querySelector('.btn-cerrar'),
    btnAnterior: document.querySelector('.btn-anterior'),
    btnSiguiente: document.querySelector('.btn-siguiente')
};

const vistas = {
    principal: elementos.vistaPrincipal,
    galeria: elementos.vistaGaleria,
    foto: elementos.vistaCompleta
};

// ---------- Rutas e historial ----------

function rutaGaleria(galeria) {
    return `#/${encodeURIComponent(galeria.nombre)}`;
}

function rutaFoto(galeria, indice) {
    return `${rutaGaleria(galeria)}/${indice + 1}`;
}

function leerRuta() {
    const partes = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    let nombre;
    try {
        nombre = partes[0] ? decodeURIComponent(partes[0]) : null;
    } catch {
        nombre = null;
    }
    const galeria = nombre ? datosGalerias.find(g => g.nombre === nombre) : null;
    const numero = Number.parseInt(partes[1], 10);
    return { galeria, nombre, numero };
}

// Navega añadiendo una entrada al historial. "padre" es la ruta desde la que se
// navega: si al volver coincide con el destino, basta con history.back().
function navegar(hash, padre = null) {
    history.pushState({ padre }, '', hash);
    mostrarRuta();
}

function reemplazarRuta(hash) {
    history.replaceState(history.state, '', hash);
    mostrarRuta();
}

function volverA(hash) {
    if (history.state && history.state.padre === hash) {
        history.back();
    } else {
        // Se entró con un enlace directo: se avanza al destino en vez de salir de la web
        navegar(hash);
    }
}

let rutaMostrada = null;

function mostrarRuta() {
    // popstate y hashchange pueden llegar juntos: no repetir el mismo cambio
    if (location.hash === rutaMostrada) return;

    const { galeria, numero } = leerRuta();
    let ruta;

    if (!galeria) {
        ruta = '#/';
        mostrarPrincipal();
    } else if (Number.isNaN(numero) || numero < 1 || numero > galeria.fotos.length) {
        ruta = rutaGaleria(galeria);
        mostrarGaleria(galeria);
    } else {
        ruta = rutaFoto(galeria, numero - 1);
        mostrarFoto(galeria, numero - 1);
    }

    // Corrige en la barra de direcciones las rutas inválidas o escritas a mano
    if (location.hash && location.hash !== ruta) history.replaceState(history.state, '', ruta);
    rutaMostrada = location.hash;
}

// ---------- Cambio de vista ----------

function cambiarVista(nuevaVista) {
    const anterior = estadoActual.vista;
    if (anterior === nuevaVista) return;

    // Las vistas inactivas se ocultan con visibility (no display) para que cada
    // una conserve su posición de desplazamiento, e inert las saca del foco
    Object.entries(vistas).forEach(([nombre, vista]) => {
        const activa = nombre === nuevaVista;
        vista.classList.toggle('activa', activa);
        vista.inert = !activa;
    });
    estadoActual.vista = nuevaVista;
    document.body.classList.toggle('visor-abierto', nuevaVista === 'foto');
}

// Mueve el foco sin desplazar la página (el desplazamiento lo gestionamos aparte)
function enfocar(elemento) {
    if (elemento) elemento.focus({ preventScroll: true });
}

// ---------- Vista principal ----------

function crearElementoGaleria(galeria, indice) {
    const enlace = document.createElement('a');
    enlace.className = 'galeria-item';
    enlace.href = rutaGaleria(galeria);
    enlace.dataset.galeria = galeria.nombre;

    const portada = galeria.fotos[0];
    const img = document.createElement('img');
    // loading debe fijarse antes que src o el navegador descarga la imagen ya.
    // Las primeras portadas se ven nada más abrir la web: no retrasarlas
    img.loading = indice < 6 ? 'eager' : 'lazy';
    img.decoding = 'async';
    img.src = portada.mini;
    img.alt = '';

    const pie = document.createElement('span');
    pie.className = 'galeria-pie';
    const titulo = document.createElement('span');
    titulo.className = 'galeria-titulo';
    titulo.textContent = galeria.titulo;
    const cantidad = document.createElement('span');
    cantidad.className = 'galeria-cantidad';
    cantidad.textContent = textoCantidad(galeria.fotos.length);
    pie.append(titulo, cantidad);

    enlace.append(img, pie);
    enlace.addEventListener('click', (e) => {
        if (!esClicNormal(e)) return;
        e.preventDefault();
        if (e.detail <= 1) navegar(rutaGaleria(galeria), '#/');
    });
    return enlace;
}

function renderizarGaleriasPrincipales() {
    elementos.contenedorGalerias.replaceChildren();

    if (datosGalerias.length === 0) {
        const aviso = document.createElement('p');
        aviso.className = 'mensaje-vacio';
        aviso.textContent = 'Todavía no hay galerías. Añade fotos a la carpeta "fotografias" y ejecuta update_galleries.py.';
        elementos.contenedorGalerias.append(aviso);
        return;
    }

    const fragmento = document.createDocumentFragment();
    datosGalerias.forEach((galeria, indice) => fragmento.append(crearElementoGaleria(galeria, indice)));
    elementos.contenedorGalerias.append(fragmento);
}

function mostrarPrincipal() {
    const vieneDe = estadoActual.galeria;
    estadoActual.galeria = null;
    document.title = tituloSitio;
    cambiarVista('principal');

    // Libera las miniaturas de la galería que se deja (pueden ser cientos)
    elementos.contenedorFotos.replaceChildren();
    estadoActual.galeriaRenderizada = null;

    // Al volver, el foco regresa a la galería de la que venimos
    const tarjeta = vieneDe &&
        [...elementos.contenedorGalerias.children].find(el => el.dataset.galeria === vieneDe.nombre);
    if (tarjeta) {
        tarjeta.scrollIntoView({ block: 'nearest' });
        enfocar(tarjeta);
    }
}

// ---------- Vista de galería ----------

function crearElementoFoto(galeria, foto, indice) {
    const enlace = document.createElement('a');
    enlace.className = 'foto-item';
    enlace.href = rutaFoto(galeria, indice);
    enlace.dataset.indice = indice;

    const proporcion = foto.proporcion || PROPORCION_POR_DEFECTO;
    enlace.style.setProperty('--proporcion', proporcion.toFixed(4));

    const img = document.createElement('img');
    img.loading = 'lazy';  // antes que src, o se descarga de inmediato
    img.decoding = 'async';
    img.src = foto.mini;
    img.alt = `Foto ${indice + 1} de ${galeria.fotos.length}`;
    enlace.append(img);

    // Sin dimensiones en galleries.js (formato antiguo o sin Pillow): se toman
    // de la miniatura cuando carga, para no recortarla
    if (!foto.proporcion) {
        enlace.classList.add('sin-dimensiones');
        img.addEventListener('load', () => {
            if (!img.naturalWidth || !img.naturalHeight) return;
            foto.proporcion = img.naturalWidth / img.naturalHeight;
            enlace.style.setProperty('--proporcion', foto.proporcion.toFixed(4));
            enlace.classList.remove('sin-dimensiones');
        }, { once: true });
    }

    enlace.addEventListener('click', (e) => {
        if (!esClicNormal(e)) return;
        e.preventDefault();
        // En un doble clic, el segundo no debe cerrar el visor que abrió el primero
        if (e.detail <= 1) navegar(rutaFoto(galeria, indice), rutaGaleria(galeria));
    });
    return enlace;
}

function renderizarFotosGaleria(galeria) {
    const fragmento = document.createDocumentFragment();
    galeria.fotos.forEach((foto, indice) => fragmento.append(crearElementoFoto(galeria, foto, indice)));
    elementos.contenedorFotos.replaceChildren(fragmento);

    elementos.tituloGaleria.textContent = galeria.titulo;
    elementos.contadorGaleria.textContent = textoCantidad(galeria.fotos.length);
    estadoActual.galeriaRenderizada = galeria;
}

function mostrarGaleria(galeria) {
    const desdeVisor = estadoActual.vista === 'foto' && estadoActual.galeria === galeria;
    const esNueva = estadoActual.galeriaRenderizada !== galeria;

    if (esNueva) renderizarFotosGaleria(galeria);
    estadoActual.galeria = galeria;
    document.title = `${galeria.titulo} · ${tituloSitio}`;
    cambiarVista('galeria');

    if (desdeVisor) {
        // Al cerrar el visor, volvemos a la miniatura de la última foto vista
        const miniatura = elementos.contenedorFotos.children[estadoActual.fotoActual];
        if (miniatura) {
            miniatura.scrollIntoView({ block: esNueva ? 'center' : 'nearest' });
            enfocar(miniatura);
        }
    } else {
        if (esNueva) elementos.vistaGaleria.scrollTop = 0;
        enfocar(elementos.tituloGaleria);
    }
}

// ---------- Visor de foto completa ----------

function mostrarFoto(galeria, indice) {
    // La cuadrícula no se crea aquí: con un enlace directo a una foto se
    // descargarían miniaturas que nadie ve. Se crea al cerrar el visor.
    const abriendo = estadoActual.vista !== 'foto';
    estadoActual.galeria = galeria;
    estadoActual.fotoActual = indice;

    const foto = galeria.fotos[indice];
    const total = galeria.fotos.length;
    const posicion = `${indice + 1} / ${total}`;

    elementos.infoTitulo.textContent = galeria.titulo;
    elementos.infoPosicion.textContent = posicion;
    elementos.imagenCompleta.alt = `Foto ${indice + 1} de ${total} de ${galeria.titulo}`;
    elementos.btnOriginal.href = foto.original;
    elementos.btnOriginal.hidden = foto.original === foto.src;
    elementos.btnAnterior.hidden = total < 2;
    elementos.btnSiguiente.hidden = total < 2;
    document.title = `${galeria.titulo} · ${posicion} · ${tituloSitio}`;

    cargarImagen(foto);
    precargarVecinas(galeria, indice);

    cambiarVista('foto');
    if (abriendo) enfocar(elementos.vistaCompleta);
}

// Muestra la miniatura (ya en caché) al instante y la sustituye por la versión
// grande cuando termina de descargarse
function cargarImagen(foto) {
    const img = elementos.imagenCompleta;
    const contenedor = elementos.contenedorImagen;

    if (estadoActual.cargaPendiente) estadoActual.cargaPendiente.onload = estadoActual.cargaPendiente.onerror = null;

    const grande = new Image();
    grande.decoding = 'async';
    estadoActual.cargaPendiente = grande;

    const terminar = (cargada) => {
        if (estadoActual.cargaPendiente !== grande) return;
        estadoActual.cargaPendiente = null;
        // Si la versión grande falla, se queda la miniatura en vez de una imagen rota
        if (cargada) img.src = foto.src;
        contenedor.classList.remove('cargando');
    };
    grande.onload = () => terminar(true);
    grande.onerror = () => terminar(false);
    grande.src = foto.src;

    if (grande.complete && grande.naturalWidth > 0) {
        terminar(true);
    } else {
        img.src = foto.mini;
        contenedor.classList.add('cargando');
    }
}

function precargarVecinas(galeria, indice) {
    const total = galeria.fotos.length;
    [indice + 1, indice - 1].forEach(i => {
        if (total < 2) return;
        const vecina = galeria.fotos[(i + total) % total];
        const img = new Image();
        img.decoding = 'async';
        img.src = vecina.src;
    });
}

function cambiarFoto(desplazamiento) {
    const galeria = estadoActual.galeria;
    if (estadoActual.vista !== 'foto' || !galeria || galeria.fotos.length < 2) return;
    const total = galeria.fotos.length;
    const indice = (estadoActual.fotoActual + desplazamiento + total) % total;
    // Recorrer fotos no llena el historial: "Atrás" cierra el visor
    reemplazarRuta(rutaFoto(galeria, indice));
}

function irAFoto(indice) {
    const galeria = estadoActual.galeria;
    if (estadoActual.vista !== 'foto' || !galeria) return;
    if (indice !== estadoActual.fotoActual) reemplazarRuta(rutaFoto(galeria, indice));
}

function cerrarVisor() {
    if (estadoActual.galeria) volverA(rutaGaleria(estadoActual.galeria));
}

function volverAPrincipal() {
    volverA('#/');
}

// ---------- Utilidades ----------

const tituloSitio = document.title;

function textoCantidad(n) {
    return n === 1 ? '1 foto' : `${n} fotos`;
}

// Deja que Ctrl/Cmd/Mayús + clic o el botón central abran en otra pestaña
function esClicNormal(e) {
    return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

// ---------- Eventos ----------

elementos.btnVolver.addEventListener('click', (e) => {
    if (esClicNormal(e)) {
        e.preventDefault();
        volverAPrincipal();
    }
});
elementos.btnCerrar.addEventListener('click', cerrarVisor);
elementos.btnAnterior.addEventListener('click', () => cambiarFoto(-1));
elementos.btnSiguiente.addEventListener('click', () => cambiarFoto(1));

// La foto ocupa toda la caja de la imagen (object-fit: contain), así que hay que
// calcular si el clic cae en la foto o en las franjas vacías de alrededor
function clicFueraDeLaFoto(e) {
    const img = elementos.imagenCompleta;
    if (e.target === elementos.contenedorImagen) return true;
    if (e.target !== img || !img.naturalWidth) return false;
    const caja = img.getBoundingClientRect();
    const escala = Math.min(caja.width / img.naturalWidth, caja.height / img.naturalHeight);
    const ancho = img.naturalWidth * escala;
    const alto = img.naturalHeight * escala;
    const x = e.clientX - caja.left - (caja.width - ancho) / 2;
    const y = e.clientY - caja.top - (caja.height - alto) / 2;
    return x < 0 || y < 0 || x > ancho || y > alto;
}

// Clic en el fondo oscuro (fuera de la foto) cierra el visor. Se ignora el
// segundo clic de un doble clic para no abrir la miniatura que queda debajo.
elementos.contenedorImagen.addEventListener('click', (e) => {
    if (e.detail <= 1 && clicFueraDeLaFoto(e)) cerrarVisor();
});

document.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;

    if (estadoActual.vista === 'foto') {
        switch (e.key) {
            case 'Escape': cerrarVisor(); break;
            case 'ArrowLeft': cambiarFoto(-1); break;
            case 'ArrowRight': cambiarFoto(1); break;
            case 'Home': irAFoto(0); break;
            case 'End': irAFoto(estadoActual.galeria.fotos.length - 1); break;
            default: return;
        }
        e.preventDefault();
    } else if (estadoActual.vista === 'galeria' && e.key === 'Escape') {
        e.preventDefault();
        volverAPrincipal();
    }
});

// Gestos de deslizamiento en el visor (se ignoran con dos dedos o con zoom)
let toqueInicial = null;

elementos.vistaCompleta.addEventListener('touchstart', (e) => {
    const conZoom = window.visualViewport && window.visualViewport.scale > 1.01;
    toqueInicial = (e.touches.length === 1 && !conZoom)
        ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
        : null;
}, { passive: true });

elementos.vistaCompleta.addEventListener('touchmove', (e) => {
    if (e.touches.length > 1) toqueInicial = null;
}, { passive: true });

elementos.vistaCompleta.addEventListener('touchend', (e) => {
    if (!toqueInicial || e.changedTouches.length !== 1) return;
    const diffX = toqueInicial.x - e.changedTouches[0].clientX;
    const diffY = toqueInicial.y - e.changedTouches[0].clientY;
    toqueInicial = null;

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
        // Deslizar a la izquierda: siguiente; a la derecha: anterior
        cambiarFoto(diffX > 0 ? 1 : -1);
    } else if (diffY < -80 && Math.abs(diffY) > Math.abs(diffX) * 1.5) {
        // Deslizar hacia abajo: cerrar
        cerrarVisor();
    }
});

window.addEventListener('popstate', mostrarRuta);
window.addEventListener('hashchange', mostrarRuta);

// ---------- Inicialización ----------

function inicializar() {
    renderizarGaleriasPrincipales();
    mostrarRuta();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializar);
} else {
    inicializar();
}
