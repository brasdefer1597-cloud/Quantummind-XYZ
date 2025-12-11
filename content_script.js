/**
 * Script de Contenido para extraer texto de la página activa.
 * Se utiliza para proporcionar un input contextual a CHALAMANDRA.
 */

function extractPageText() {
    // Excluir elementos que son ruido (scripts, estilos, navegación, etc.)
    const selector = 'p:not(.ad-text), h1, h2, h3, li:not(.nav-item), blockquote';
    
    // Obtener todos los elementos relevantes
    const elements = document.querySelectorAll(selector);
    let extractedText = '';
    
    // Recorrer los elementos y concatenar el texto
    elements.forEach(el => {
        const text = el.textContent.trim();
        if (text.length > 5 && !el.closest('header') && !el.closest('footer') && !el.closest('nav')) {
            // Limpieza básica: reemplazar saltos de línea y espacios múltiples
            const cleanText = text.replace(/[\n\t]/g, ' ').replace(/\s\s+/g, ' ');
            extractedText += cleanText + '\n\n';
        }
    });

    // Limitar el tamaño para no exceder los límites de tokens del modelo
    const maxLength = 8000;
    
    if (extractedText.length > maxLength) {
        return extractedText.substring(0, maxLength);
    }
    
    return extractedText;
}

// Este script se ejecuta en el contexto de la página y devuelve su resultado
const pageContent = extractPageText();
// Devolver el resultado de la extracción
pageContent;
