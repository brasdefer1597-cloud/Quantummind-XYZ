// content_scripts.js: Ojos y Manos de la Extensión
// Este script se inyecta en todas las páginas web para interactuar con el DOM.

/**
 * Escucha el evento 'mouseup' para detectar la selección de texto.
 * Si el texto seleccionado no está vacío, lo envía al Service Worker para su análisis.
 */
document.addEventListener('mouseup', () => {
    // Obtener el texto seleccionado
    const selectedText = window.getSelection().toString().trim();

    if (selectedText.length > 0) {
        // Almacenamos el texto seleccionado en el storage local de la extensión
        // para que el popup.js o el background.js puedan recuperarlo
        chrome.storage.local.set({ lastSelectedText: selectedText }, () => {
            // Esto es solo para depuración
            console.log("Texto seleccionado almacenado:", selectedText.substring(0, 50) + '...');
        });
    }
});

// Nota: La comunicación real para iniciar el análisis se hará a través
// del popup.html cuando el usuario presione un botón. Este script solo
// se encarga de *capturar* el contexto.
