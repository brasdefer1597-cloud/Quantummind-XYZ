// Configuración de la API Key (debe estar vacía para el entorno Canvas)
const API_KEY = "";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent";

/**
 * Función para simular el fallo de la API de Chrome y forzar el fallback a la API de Cloud/Web.
 * En un entorno real de Chrome, 'ai.languageModel.generateContent' sería la primera opción.
 */
async function generateContentWithFallback(prompt) {
    try {
        // --- 1. Intento con la API de Chrome (Simulada o Real) ---
        // En el entorno real, usaría: chrome.ai.languageModel.generateContent({ prompt: prompt })
        // Aquí, simulamos que esto falla o no está disponible, y caemos al proxy.
        // Simularemos un 10% de fallo para probar la resiliencia
        if (Math.random() < 0.1) {
            throw new Error("Simulación: Fallo de Gemini Nano/AI de Chrome. Activando ResilientAPIProxy (Cloud).");
        }
        
        // Simulación de respuesta rápida de Nano
        const simulatedNanoResponse = `[NANO: Análisis Base] La IA local confirma que la dialéctica es un proceso válido. El prompt se enviará al Cloud Proxy para un análisis más profundo.`;
        // console.log(simulatedNanoResponse);

    } catch (error) {
        // console.error("Fallo de Nano/Chrome AI, cayendo a ResilientAPIProxy (Cloud).", error.message);
        // Continuamos con el proxy de la Nube (API de Gemini)
    }

    // --- 2. ResilientAPIProxy: Llamada a la API de Gemini (Cloud) con Backoff ---
    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: {
            parts: [{ text: "Eres un motor de IA Dialéctica. Tu objetivo es proporcionar una respuesta clara, profunda y estructurada, actuando como las tres personalidades: CHOLA (Tesis), MALANDRA (Antítesis) y FRESA (Síntesis). Genera la respuesta en el formato JSON especificado. Sé conciso y directo en cada rol." }]
        },
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "OBJECT",
                properties: {
                    thesis: { "type": "STRING", "description": "La perspectiva fundamental y conservadora (CHOLA)." },
                    antithesis: { "type": "STRING", "description": "La perspectiva disruptiva y crítica (MALANDRA)." },
                    synthesis: { "type": "STRING", "description": "La conclusión óptima y ejecutable (FRESA)." }
                },
                required: ["thesis", "antithesis", "synthesis"]
            }
        },
    };

    let lastError = null;
    for (let i = 0; i < 3; i++) { // Intentar 3 veces con backoff exponencial
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s

        if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
            // console.log(`Reintentando API... Intento ${i + 1}`);
        }

        try {
            const response = await fetch(GEMINI_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;

            if (jsonText) {
                // Colapso Cuántico: Parsear el JSON de la Síntesis
                const parsedJson = JSON.parse(jsonText);
                return parsedJson;
            } else {
                throw new Error("Respuesta de IA vacía o formato incorrecto.");
            }

        } catch (error) {
            lastError = error;
            // No registrar retries como errores, solo el fallo final.
        }
    }

    throw new Error(`Fallo final de la API después de múltiples reintentos: ${lastError.message}`);
}

/**
 * Escucha los mensajes desde el pop-up (popup.js)
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Asegurarse de que la respuesta sea asíncrona (mandato de Chrome)
    if (request.action === 'runDialectic') {
        const input = request.input;
        
        generateContentWithFallback(input)
            .then(result => {
                // Devuelve la Tesis, Antítesis y Síntesis al pop-up
                sendResponse(result); 
            })
            .catch(error => {
                // Devuelve el error al pop-up
                sendResponse({ error: error.message });
            });
        
        return true; // Indica que la respuesta es asíncrona
    }
});
