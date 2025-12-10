// background.js: Service Worker (Cerebro Central)
// Este script maneja la lógica de la IA, la orquestación de las personalidades y la comunicación con la API.

// --------------------------------------------------------
// --- 1. CONFIGURACIÓN Y CONSTANTES ---
// --------------------------------------------------------

// Nota: La clave de API se asume que se obtendrá en tiempo de ejecución de un almacén seguro o se
// inyectará. Para este entorno, la dejamos vacía y el runtime la proveerá.
const API_KEY = ""; 
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/";
const MODEL_NAME = "gemini-2.5-flash-preview-09-2025";
const MAX_RETRIES = 5;

// Definición de las 3 Personalidades Dialécticas (System Prompts)
const PERSONAS = {
    // THESIS (La Sabiduría de la Calle/Tradición): Analiza la base y la historia.
    CHOLA: {
        name: "CHOLA (Thesis)",
        color: "#b91c1c", // Rojo Fuerte
        systemPrompt: "Actúa como una experta en sabiduría popular, historia y conocimiento tradicional. Tu análisis debe ser firme, fundamentado en la experiencia de la vida real y la historia. Sé concisa y provee la base del argumento. Usa un tono de respeto y autoridad. Responde únicamente en un párrafo.",
    },
    // ANTITHESIS (La Disrupción/Caos): Desafía, encuentra riesgos y propone alternativas.
    MALANDRA: {
        name: "MALANDRA (Antithesis)",
        color: "#1d4ed8", // Azul Oscuro
        systemPrompt: "Actúa como una hacker, disruptora y experta en riesgos. Tu análisis debe desafiar activamente el texto, encontrar vulnerabilidades, puntos ciegos o sugerir un camino completamente opuesto y arriesgado. Sé audaz y no temas al conflicto. Responde únicamente en un párrafo.",
    },
    // SYNTHESIS (La Optimización/Estética): Sintetiza y refina la mejor conclusión.
    FRESA: {
        name: "FRESA (Synthesis)",
        color: "#7e22ce", // Morado Lujoso
        systemPrompt: "Actúa como una consultora de élite, enfocada en la estética, la optimización y la claridad. Tu análisis debe fusionar la fortaleza de la Tesis (CHOLA) con el riesgo de la Antítesis (MALANDRA) para crear la conclusión más pulcra, ética y de alto impacto. Responde únicamente en un párrafo.",
    }
};

// --------------------------------------------------------
// --- 2. RESILIENT API PROXY (Llamada con Backoff) ---
// --------------------------------------------------------

/**
 * Llama a la API de Gemini con reintentos de Backoff Exponencial.
 * @param {string} prompt El texto de la pregunta del usuario.
 * @param {string} systemInstruction El prompt del sistema para la personalidad.
 * @returns {Promise<string>} La respuesta del modelo.
 */
async function callGeminiAPI(prompt, systemInstruction) {
    const url = `${BASE_URL}${MODEL_NAME}:generateContent?key=${API_KEY}`;
    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: {
            parts: [{ text: systemInstruction }]
        },
        tools: [{ "google_search": {} }] // Habilitar Grounding
    };

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s, 8s, 16s...

        try {
            if (attempt > 0) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const result = await response.json();
                const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "Error: No se recibió contenido.";
                return text;
            } else if (response.status === 429) {
                // Too Many Requests - continuar con el reintento
                console.warn(`Intento ${attempt + 1}: Límite de tasa alcanzado. Reintentando en ${delay}ms...`);
            } else {
                // Otros errores HTTP (400, 500, etc.)
                const errorText = await response.text();
                throw new Error(`Error HTTP ${response.status}: ${errorText}`);
            }
        } catch (error) {
            console.error(`Error en el intento ${attempt + 1}:`, error.message);
            if (attempt === MAX_RETRIES - 1) {
                throw new Error("Fallo en la conexión después de múltiples reintentos.");
            }
        }
    }
}

// --------------------------------------------------------
// --- 3. ORQUESTADOR DIALÉCTICO ---
// --------------------------------------------------------

/**
 * Ejecuta el proceso dialéctico (CHOLA, MALANDRA, FRESA) y luego la Síntesis.
 * @param {string} context El texto seleccionado por el usuario.
 * @returns {Promise<{results: Object, finalSynthesis: string}>} Resultados del debate.
 */
async function runDialecticalOrchestrator(context) {
    const results = {};
    const personaPromises = [];
    const prompt = `Analiza el siguiente texto y aplica tu rol: "${context}"`;

    // 1. Ejecutar las 3 personalidades de forma concurrente
    for (const key in PERSONAS) {
        const persona = PERSONAS[key];
        const promise = callGeminiAPI(prompt, persona.systemPrompt)
            .then(response => {
                results[key] = {
                    name: persona.name,
                    color: persona.color,
                    response: response,
                };
            })
            .catch(error => {
                results[key] = {
                    name: persona.name,
                    color: persona.color,
                    response: `Error en ${persona.name}: ${error.message}`,
                };
            });
        personaPromises.push(promise);
    }

    // Esperar a que las 3 personalidades terminen
    await Promise.all(personaPromises.map(p => p.catch(e => console.error("Error en promesa de personalidad:", e))));

    // 2. Crear el prompt de Síntesis usando los resultados
    const synthesisPrompt = `Genera una síntesis final, clara y concisa (máximo 4 oraciones) de este debate. 
    Tesis (CHOLA): ${results.CHOLA?.response || 'No disponible'}
    Antítesis (MALANDRA): ${results.MALANDRA?.response || 'No disponible'}
    Tu objetivo es encontrar la mejor conclusión y plan de acción. Responde únicamente con la síntesis.`;
    
    // 3. Ejecutar la síntesis final
    let finalSynthesis = "Error al generar la síntesis final.";
    try {
        // Usamos la personalidad FRESA para la síntesis final por su enfoque en la optimización.
        finalSynthesis = await callGeminiAPI(synthesisPrompt, PERSONAS.FRESA.systemPrompt);
    } catch (e) {
        console.error("Fallo al generar la síntesis:", e);
        finalSynthesis = "Fallo total al generar la síntesis dialéctica.";
    }

    return { results, finalSynthesis };
}

// --------------------------------------------------------
// --- 4. MANEJO DE MENSAJES (Comunicación con Content Script) ---
// --------------------------------------------------------

// Listener para recibir mensajes desde el content_scripts.js (el texto seleccionado)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Aseguramos que el mensaje sea la acción de inicio
    if (message.action === "startDialecticalAnalysis" && message.context) {
        
        // Ejecutamos la orquestación en segundo plano y enviamos el resultado.
        runDialecticalOrchestrator(message.context)
            .then(response => {
                // Enviamos una respuesta de éxito al popup/content script
                sendResponse({ status: "success", data: response });
            })
            .catch(error => {
                // Enviamos una respuesta de error
                console.error("Error en Orquestador:", error);
                sendResponse({ status: "error", message: error.message });
            });

        // Retornar 'true' para indicar que sendResponse será llamado asíncronamente
        return true; 
    }
});

console.log("Service Worker de Chalamandra cargado.");
