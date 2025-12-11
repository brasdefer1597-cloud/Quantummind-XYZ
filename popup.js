document.addEventListener('DOMContentLoaded', () => {
    const userInput = document.getElementById('user-input');
    const igniteButton = document.getElementById('ignite-button');
    const contentScriptButton = document.getElementById('content-script-button');
    const resetButton = document.getElementById('reset-button');
    const inputSection = document.getElementById('input-section');
    const resultsSection = document.getElementById('results-section');
    const synthesisOutput = document.getElementById('synthesis-output');
    const debateOutput = document.getElementById('debate-output');
    const statusText = document.getElementById('status-text');
    const statusDot = document.getElementById('status-dot');
    const errorMessage = document.getElementById('error-message');

    // Estado inicial
    updateStatus('Listo', 'bg-green-500');

    function updateStatus(text, colorClass) {
        statusText.textContent = text;
        statusDot.className = `w-2 h-2 rounded-full ${colorClass} ${colorClass === 'bg-green-500' ? 'animate-pulse' : 'animate-spin-slow'}`;
    }

    function handleError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
        updateStatus('Error', 'bg-red-500');
        inputSection.classList.remove('hidden');
        resultsSection.classList.add('hidden');
        igniteButton.disabled = false;
        contentScriptButton.disabled = false;
    }

    function processRequest(input) {
        if (!input.trim()) {
            handleError("Por favor, introduce un tema o analiza el contenido de la página.");
            return;
        }

        updateStatus('Procesando', 'bg-yellow-500');
        errorMessage.classList.add('hidden');
        igniteButton.disabled = true;
        contentScriptButton.disabled = true;

        chrome.runtime.sendMessage({
            action: 'runDialectic',
            input: input
        }, (response) => {
            if (chrome.runtime.lastError) {
                handleError(`Error de comunicación: ${chrome.runtime.lastError.message}`);
                return;
            }

            if (response.error) {
                handleError(`Error de IA: ${response.error}`);
            } else if (response.synthesis) {
                synthesisOutput.textContent = response.synthesis;
                debateOutput.textContent = `--- DEBATE COMPLETO ---\n\nCHOLA (Tesis):\n${response.thesis}\n\nMALANDRA (Antítesis):\n${response.antithesis}`;
                
                inputSection.classList.add('hidden');
                resultsSection.classList.remove('hidden');
                updateStatus('Completado', 'bg-green-500');
            } else {
                handleError("Respuesta inesperada del service worker.");
            }
        });
    }

    // --- Event Listeners ---
    
    // 1. Botón de Encender Motor (Input Manual)
    igniteButton.addEventListener('click', () => {
        processRequest(userInput.value);
    });

    // 2. Botón de Analizar Contenido
    contentScriptButton.addEventListener('click', () => {
        updateStatus('Extrayendo Texto', 'bg-blue-500');

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const activeTab = tabs[0];
            if (!activeTab || !activeTab.id) {
                handleError("No se pudo obtener la pestaña activa.");
                return;
            }

            // Ejecutar el content script para obtener el texto
            chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                files: ['content.js']
            }, (results) => {
                if (chrome.runtime.lastError || !results || results[0].result === null) {
                    handleError("Error al inyectar script o la página no tiene contenido de texto válido.");
                    return;
                }
                const pageText = results[0].result;
                if (pageText.length < 50) {
                    handleError("Texto insuficiente en la página para un análisis dialéctico.");
                    return;
                }
                
                // Usar el texto extraído como input para el proceso dialéctico
                userInput.value = `Analiza el siguiente contenido de la página: ${pageText.substring(0, 1000)}... (Texto completo: ${pageText.length} caracteres)`;
                processRequest(pageText); // Pasa el texto completo al service worker
            });
        });
    });

    // 3. Botón de Reinicio
    resetButton.addEventListener('click', () => {
        userInput.value = '';
        inputSection.classList.remove('hidden');
        resultsSection.classList.add('hidden');
        errorMessage.classList.add('hidden');
        igniteButton.disabled = false;
        contentScriptButton.disabled = false;
        updateStatus('Listo', 'bg-green-500');
    });

});
