// Service Worker para la extensión (background.js)

// Escuchador de instalación de la extensión
chrome.runtime.onInstalled.addListener(() => {
  console.log('Dialéctica Hybrida 369 instalada');
  
  // Crear menú contextual para selección de texto
  chrome.contextMenus.create({
    id: "generarDialectica",
    title: "Generar dialéctica para: '%s'", 
    contexts: ["selection"]
  });
});

// Escuchador del menú contextual
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "generarDialectica") {
    const textoSeleccionado = info.selectionText;
    
    // Enviar el texto seleccionado al popup
    // El popup.js contiene el listener que recibirá este mensaje.
    chrome.runtime.sendMessage({
      action: "textoSeleccionado",
      texto: textoSeleccionado
    });
  }
});
