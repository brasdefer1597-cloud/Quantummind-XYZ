// --- CONFIGURACIÓN Y CONSTANTES ---
const API_URL_BASE = "https://generativelanguage.googleapis.com/v1beta/models/";
const MODEL_NAME = "gemini-2.5-flash-preview-09-2025";
// La clave API se establece como una cadena vacía para que el entorno la inyecte.
const API_KEY = ""; 
const MAX_HISTORY_ITEMS = 5;

// Definiciones de Personas (Agentes)
const AGENT_PERSONAS = {
    // CHOLA (Roots): Focuses on tradition, established values, foundational history, community, and non-digital culture.
    CHOLA: "Eres el agente 'CHOLA', representando la tradición, las raíces comunitarias y la sabiduría establecida. Analiza la entrada del usuario basándote en la historia fundacional, la herencia cultural y los valores prácticos no digitales. Tu respuesta debe enfatizar la estabilidad, el contexto histórico y la importancia de la estructura comunitaria. Responde de forma concisa en un máximo de dos párrafos.",

    // MALANDRA (Disrupt): Focuses on counter-culture, innovation, challenging norms, skepticism, and street-level resourcefulness.
    MALANDRA: "Eres el agente 'MALANDRA', representando la disrupción, el escepticismo y el ingenio a nivel de calle. Analiza la entrada del usuario desafiando las normas establecidas, identificando riesgos ocultos y enfatizando estrategias rápidas, adaptativas y no convencionales. Tu respuesta debe ser provocadora pero perspicaz. Responde de forma concisa en un máximo de dos párrafos.",

    // FRESA (Tech): Focuses on technology, global trends, high-level business strategy, polish, and digital solutions.
    FRESA: "Eres el agente 'FRESA', representando la alta tecnología, las tendencias globales y la estrategia empresarial pulida. Analiza la entrada del usuario desde la perspectiva de la escalabilidad, la integración de tecnología de vanguardia y la alineación con soluciones modernas y optimizadas. Tu respuesta debe ser prospectiva y altamente profesional. Responde de forma concisa en un máximo de dos párrafos.",
};

// --- REFERENCIAS DOM ---
const topicInput = document.getElementById('topicInput');
const thesisStyleSelect = document.getElementById('thesisStyle');
const antithesisStyleSelect = document.getElementById('antithesisStyle');
const generateBtn = document.getElementById('generateBtn');
const disruptBtn = document.getElementById('disruptBtn');
const loadingDiv = document.getElementById('loading');
const resultsDiv = document.getElementById('results');
const statusDiv = document.getElementById('status');
const historyTitle = document.getElementById('historyTitle');
const historyList = document.getElementById('historyList');
const historyArrow = document.getElementById('historyArrow');

// --- UTILITY: BACKOFF Y API KEY ---

/**
 * Ejecuta una solicitud fetch con retroceso exponencial.
 */
async function fetchWithBackoff(url, options, retries = 0) {
    const MAX_RETRIES = 5;
    try {
        const response = await fetch(url, options);
        if (response.status === 429 && retries < MAX_RETRIES) {
            const delay = Math.pow(2, retries) * 1000 + Math.random() * 1000;
            console.warn(`Límite de velocidad (429). Reintentando en ${delay / 1000}s...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithBackoff(url, options, retries + 1);
        }
        return response;
    } catch (error) {
        if (retries < MAX_RETRIES) {
            const delay = Math.pow(2, retries) * 1000 + Math.random() * 1000;
            console.error(`Error de Fetch. Reintentando en ${delay / 1000}s...`, error);
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithBackoff(url, options, retries + 1);
        }
        throw new Error("Fallo al conectar con la API después de múltiples reintentos.");
    }
}

// --- CORE API HANDLER ---

/**
 * Llama a la API de Gemini para un solo paso.
 */
async function callGemini(systemPrompt, userQuery, useGrounding) {
    // Usamos API_KEY constante vacía; el entorno la llenará.
    const apiUrl = `${API_URL_BASE}${MODEL_NAME}:generateContent?key=${API_KEY}`; 

    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        tools: useGrounding ? [{ "google_search": {} }] : undefined,
    };

    const response = await fetchWithBackoff(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(`Fallo de solicitud API: ${response.status} ${response.statusText}. Detalles: ${errorBody.error?.message || 'Verifique la red.'}`);
    }

    const result = await response.json();
    const candidate = result.candidates?.[0];

    if (!candidate || !candidate.content?.parts?.[0]?.text) {
        throw new Error("La API devolvió una respuesta inválida o vacía.");
    }

    const text = candidate.content.parts[0].text;
    let sources = [];

    const groundingMetadata = candidate.groundingMetadata;
    if (groundingMetadata && groundingMetadata.groundingAttributions) {
        sources = groundingMetadata.groundingAttributions
            .map(attribution => ({
                uri: attribution.web?.uri,
                title: attribution.web?.title,
            }))
            .filter(source => source.uri && source.title);
    }

    return { text, sources };
}


// --- LÓGICA DE ANÁLISIS ---

/**
 * Maneja ambos modos de análisis: Dialectic (T-A-S) y Disruption (Tesis Híbrida).
 * @param {'full'|'disrupt'} mode Tipo de análisis.
 */
async function handleAnalysis(mode) {
    const analysisText = topicInput.value.trim();
    const thesisAgent = thesisStyleSelect.value;
    const antithesisAgent = antithesisStyleSelect.value;
    
    // Validaciones iniciales
    if (analysisText.length < 10) {
        displayError("Por favor, ingrese al menos 10 caracteres para el análisis.");
        return;
    }
    if (mode === 'full' && thesisAgent === antithesisAgent) {
        displayError("Los agentes de Tesis y Antítesis deben ser diferentes para el modo Dialectic 369.");
        return;
    }

    setLoadingState(true, mode);
    resultsDiv.classList.add('hidden');
    resultsDiv.innerHTML = '';
    
    try {
        if (mode === 'full') {
            await runDialecticSynthesis(analysisText, thesisAgent, antithesisAgent);
        } else if (mode === 'disrupt') {
            await runCreativeDisruption(analysisText, thesisAgent);
        }
    } catch (error) {
        console.error("Analysis Error:", error);
        displayError(`ERROR CRÍTICO: ${error.message}`);
    } finally {
        setLoadingState(false);
    }
}

/**
 * Ejecuta el proceso completo de Tesis-Antítesis-Síntesis.
 */
async function runDialecticSynthesis(analysisText, thesisAgent, antithesisAgent) {
    
    // --- STEP 1: GENERATE THESIS ---
    const thesisLabel = `TESIS (${thesisAgent})`;
    const thesisSystemPrompt = AGENT_PERSONAS[thesisAgent];
    appendResultCard('chola', `<p class="text-white/50">Analizando con la perspectiva ${thesisAgent}...</p>`, thesisLabel, null, 'thesis');
    
    const thesisResult = await callGemini(thesisSystemPrompt, `Analiza el siguiente tema/texto: "${analysisText}"`, false);
    
    // Reemplazar la tarjeta de carga con el resultado real
    resultsDiv.querySelector('.thesis .content').textContent = thesisResult.text;

    // --- STEP 2: GENERATE ANTITHESIS ---
    const antithesisLabel = `ANTÍTESIS (${antithesisAgent})`;
    const antithesisSystemPrompt = AGENT_PERSONAS[antithesisAgent];
    appendResultCard('fresa', `<p class="text-white/50">Contra-analizando con la perspectiva ${antithesisAgent}...</p>`, antithesisLabel, null, 'antithesis');
    
    const antithesisResult = await callGemini(antithesisSystemPrompt, `Analiza el siguiente tema/texto: "${analysisText}"`, false);
    
    resultsDiv.querySelector('.antithesis .content').textContent = antithesisResult.text;


    // --- STEP 3: GENERATE SYNTHESIS ---
    const synthesisLabel = '✨ SÍNTESIS QUANTUM 369';
    appendResultCard('malandra', `<p class="text-white/50">Sintetizando perspectivas para el colapso final...</p>`, synthesisLabel, null, 'synthesis');

    const synthesisPrompt = `
        Realiza una 'Síntesis Dialéctica' basándote en los siguientes tres elementos:
        1. TEMA/TEXTO ORIGINAL: "${analysisText}"
        2. TESIS (${thesisAgent}): "${thesisResult.text}"
        3. ANTÍTESIS (${antithesisAgent}): "${antithesisResult.text}"
        
        Sintetiza las dos visiones opuestas (Tesis y Antítesis) en una nueva conclusión o visión accionable de alto nivel. La síntesis debe resolver la tensión y proporcionar un camino a seguir, considerando el tema original. El lenguaje debe ser nítido y potente. Responde en un solo párrafo conciso.
    `;
    
    const synthesisResult = await callGemini(
        "Eres el motor 'SÍNTESIS 369'. Tu tarea es resolver las tensiones dialécticas y proporcionar el resumen de más alto nivel.",
        synthesisPrompt,
        true // Usar Google Search grounding para la síntesis
    );
    
    // Actualizar Síntesis UI
    resultsDiv.querySelector('.synthesis .content').textContent = synthesisResult.text;
    resultsDiv.classList.remove('hidden');

    // Manejar fuentes
    const sourcesHtml = generateSourcesHtml(synthesisResult.sources);
    if (sourcesHtml) {
        resultsDiv.querySelector('.synthesis .content').innerHTML += `<div class="mt-3 text-[0.8em] text-white/50">Fuentes: ${sourcesHtml}</div>`;
    }

    statusDiv.textContent = `Análisis Dialéctico 369 completo.`;
    
    // Guardar en historial
    saveToHistory(analysisText, 'full', thesisAgent, antithesisAgent, {
        thesis: thesisResult.text,
        antithesis: antithesisResult.text,
        synthesis: synthesisResult.text
    });
}

/**
 * Ejecuta el modo de Disrupción Creativa (Tesis vs. Tesis Híbrida).
 */
async function runCreativeDisruption(analysisText, thesisAgent) {
    const hybridAgent = 'HYBRIDA'; // Fusión conceptual
    
    // --- STEP 1: GENERATE ORIGINAL THESIS ---
    const originalLabel = `TESIS ORIGINAL (${thesisAgent})`;
    const originalSystemPrompt = AGENT_PERSONAS[thesisAgent];
    appendResultCard(thesisAgent.toLowerCase(), `<p class="text-white/50">Generando Tesis Base...</p>`, originalLabel, null, 'original');
    
    const originalResult = await callGemini(originalSystemPrompt, `Analiza el siguiente tema/texto: "${analysisText}"`, false);
    resultsDiv.querySelector('.original .content').textContent = originalResult.text;

    // --- STEP 2: GENERATE HYBRID DISRUPTION ---
    const disruptionLabel = '⚡ DISRUPCIÓN CREATIVA';
    const disruptionSystemPrompt = "Eres el agente 'HÍBRIDO'. Tu rol es tomar el texto generado por la Tesis original, invertir su premisa central, y re-analizar el tema desde una perspectiva de fusión radical, creando un nuevo concepto disruptivo que no es ni la Tesis ni su negación obvia. Responde en un solo párrafo conciso.";

    appendResultCard('hybrida', `<p class="text-white/50">Aplicando inversión de premisa y fusión radical...</p>`, disruptionLabel, null, 'hybrid');

    const disruptionPrompt = `
        TEMA/TEXTO ORIGINAL: "${analysisText}"
        TESIS ORIGINAL (${thesisAgent}): "${originalResult.text}"
        
        Basándote en la Tesis Original, invierte su premisa clave y genera una Disrupción Creativa que fusione elementos opuestos del tema.
    `;

    const disruptionResult = await callGemini(disruptionSystemPrompt, disruptionPrompt, false);

    // Update Disruption UI
    resultsDiv.querySelector('.hybrid .content').textContent = disruptionResult.text;
    resultsDiv.classList.remove('hidden');

    statusDiv.textContent = `Análisis de Disrupción Creativa completo.`;
    
    // Guardar en historial
    saveToHistory(analysisText, 'disrupt', thesisAgent, 'HYBRIDA', {
        original: originalResult.text,
        hybrid: disruptionResult.text,
    });
}

// --- RENDERING UI ---

/**
 * Crea y añade una tarjeta de resultado.
 */
function appendResultCard(className, response, tagText, sources, resultType) {
    const card = document.createElement('div');
    card.className = `result ${className} ${resultType}`; // resultType: original, thesis, antithesis, synthesis, hybrid
    
    let sourceHtml = '';
    if (sources) {
        sourceHtml = generateSourcesHtml(sources);
    }

    card.innerHTML = `
        <div class="tag">${tagText}</div>
        <div class="content">${response}${sourceHtml}</div>
    `;
    resultsDiv.appendChild(card);
}

/**
 * Genera el HTML para las fuentes.
 */
function generateSourcesHtml(sources) {
    if (!sources || sources.length === 0) return '';
    
    const sourceLinks = sources.slice(0, 3).map((s, i) =>
        `<a href="${s.uri}" target="_blank" title="${s.title}">[${i + 1}]</a>`
    ).join(' ');

    return `<div class="mt-3 text-[0.8em] text-white/50">Fuentes: ${sourceLinks}</div>`;
}

/**
 * Muestra un mensaje de error.
 */
function displayError(message) {
    resultsDiv.classList.remove('hidden');
    resultsDiv.innerHTML = `<div class="result antithesis" style="border-left-color: var(--fresa);"><div class="tag">ERROR DE SISTEMA</div><div class="content">${message}</div></div>`;
    statusDiv.textContent = "Error durante el análisis. Revise la consola para detalles.";
}

// --- UTILITY: ESTADO DE CARGA Y BOTONES ---

/**
 * Establece el estado de carga y deshabilita los controles.
 */
function setLoadingState(isLoading, mode) {
    const topic = topicInput.value.trim().substring(0, 30) + (topicInput.value.trim().length > 30 ? '...' : '');

    generateBtn.disabled = isLoading;
    disruptBtn.disabled = isLoading;
    topicInput.disabled = isLoading;
    thesisStyleSelect.disabled = isLoading;
    antithesisStyleSelect.disabled = isLoading;
    
    if (isLoading) {
        loadingDiv.classList.remove('hidden');
        statusDiv.textContent = `Analizando: "${topic}"...`;
        loadingDiv.textContent = mode === 'full' 
            ? '🔄 Generando Tesis, Antítesis, y Síntesis...' 
            : '⚡ Generando Disrupción Creativa...';
    } else {
        loadingDiv.classList.add('hidden');
        checkInputs(); // Re-validar el estado de los botones
    }
}

/**
 * Habilita o deshabilita los botones basado en la entrada.
 */
function checkInputs() {
    const analysisText = topicInput.value.trim();
    const textValid = analysisText.length >= 10;
    
    generateBtn.disabled = !textValid;
    disruptBtn.disabled = !textValid;
    
    if (!textValid) {
        statusDiv.textContent = "Ingrese al menos 10 caracteres para el análisis.";
    } else {
        statusDiv.textContent = "Listo para conectar con la energía creativa.";
    }
}


// --- GESTIÓN DE HISTORIAL ---

/**
 * Alterna la visibilidad del historial.
 */
function toggleHistory() {
    const isHidden = historyList.classList.toggle('hidden');
    historyArrow.textContent = isHidden ? '▼' : '▲';
}

/**
 * Guarda un resultado de análisis en el historial local.
 */
function saveToHistory(topic, mode, thesisStyle, antithesisStyle, data) {
    const timestamp = new Date().toLocaleString();
    
    let summary;
    if (mode === 'full') {
        summary = `Dialectic: ${thesisStyle} vs ${antithesisStyle}`;
    } else {
        summary = `Disruption: ${thesisStyle} Hybrid`;
    }

    const historyItem = {
        id: Date.now(),
        topic: topic,
        summary: summary,
        timestamp: timestamp,
        mode: mode,
        thesisStyle: thesisStyle,
        antithesisStyle: antithesisStyle,
        data: data 
    };

    let history = JSON.parse(localStorage.getItem('dialecticHistory') || '[]');
    
    // Añadir el nuevo elemento al principio
    history.unshift(historyItem);
    
    // Limitar el historial
    if (history.length > MAX_HISTORY_ITEMS) {
        history = history.slice(0, MAX_HISTORY_ITEMS);
    }

    localStorage.setItem('dialecticHistory', JSON.stringify(history));
    loadHistory();
}

/**
 * Carga y renderiza el historial.
 */
function loadHistory() {
    const history = JSON.parse(localStorage.getItem('dialecticHistory') || '[]');
    historyList.innerHTML = '';

    if (history.length === 0) {
        historyList.classList.remove('hidden'); // Mostrar mensaje si no hay historial
        historyList.innerHTML = '<p style="text-align: center; color: var(--text-dim);">No hay análisis recientes.</p>';
        return;
    }

    history.forEach(item => {
        const historyItemDiv = document.createElement('div');
        historyItemDiv.className = 'history-item';
        historyItemDiv.dataset.id = item.id;
        historyItemDiv.innerHTML = `
            <strong>${item.summary}</strong>
            <small>${item.topic.substring(0, 50)}...</small>
            <small>Generado: ${item.timestamp}</small>
        `;
        
        historyItemDiv.addEventListener('click', () => loadHistoryItem(item));
        historyList.appendChild(historyItemDiv);
    });
}

/**
 * Carga un elemento del historial en la interfaz de resultados.
 */
function loadHistoryItem(item) {
    // 1. Cargar datos en los controles
    topicInput.value = item.topic;
    thesisStyleSelect.value = item.thesisStyle;
    antithesisStyleSelect.value = item.antithesisStyle;
    
    // 2. Mostrar resultados
    displayHistoryResults(item.data, item.mode, item.thesisStyle, item.antithesisStyle);
    statusDiv.textContent = `Historial cargado de ${item.timestamp}.`;
    
    // 3. Colapsar historial (opcional)
    if (!historyList.classList.contains('hidden')) {
         toggleHistory();
    }
    
    // 4. Asegurar que el área de resultados esté visible
    resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Muestra los resultados del historial (solo contenido estático).
 */
function displayHistoryResults(data, mode, thesisAgent, antithesisAgent) {
    resultsDiv.classList.remove('hidden');
    resultsDiv.innerHTML = '';
    
    if (mode === 'full') {
        appendResultCard('chola', data.thesis, `TESIS (${thesisAgent})`, null, 'thesis');
        appendResultCard('fresa', data.antithesis, `ANTÍTESIS (${antithesisAgent})`, null, 'antithesis');
        appendResultCard('malandra', data.synthesis, '✨ SÍNTESIS QUANTUM 369', null, 'synthesis');
    } else if (mode === 'disrupt') {
        appendResultCard(thesisAgent.toLowerCase(), data.original, `TESIS ORIGINAL (${thesisAgent})`, null, 'original');
        appendResultCard('hybrida', data.hybrid, '⚡ DISRUPCIÓN CREATIVA', null, 'hybrid');
    }
}


// --- INICIALIZACIÓN ---

document.addEventListener('DOMContentLoaded', initializePopup);

function initializePopup() {
    // 1. Configurar Listeners de input y botones
    topicInput.addEventListener('input', checkInputs);
    thesisStyleSelect.addEventListener('change', checkInputs);
    antithesisStyleSelect.addEventListener('change', checkInputs);
    
    generateBtn.addEventListener('click', () => handleAnalysis('full'));
    disruptBtn.addEventListener('click', () => handleAnalysis('disrupt'));
    
    // 2. Configurar Historial
    historyTitle.addEventListener('click', toggleHistory);
    loadHistory();
    
    // 3. Chequeo inicial
    checkInputs();
}
