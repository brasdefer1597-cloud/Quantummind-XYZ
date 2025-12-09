// Variables de configuración de la API y el modelo
const API_KEY = ""; // La clave de la API se proporcionará en tiempo de ejecución en el entorno.
const API_URL_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';
const MODEL = 'gemini-2.5-flash-preview-09-2025';

// Base de datos de estilos y utilidades para la visualización.
const STYLE_MAP = {
    'chola': { name: 'CHOLA (Raíz/Barrio)' },
    'malandra': { name: 'MALANDRA (Estrategia/Supervivencia)' },
    'fresa': { name: 'FRESA (Tecno/Refinado)' },
    'hybrida': { name: 'HYBRIDA (Fusión)' },
};

class DialecticaExtension {
  constructor() {
    this.init();
  }

  init() {
    this.bindEvents();
    this.addMessageListener();
    this.cargarHistorial(); 
    this.actualizarEstado('✅ Extensión cargada. Lista para el análisis dialéctico.');
  }

  bindEvents() {
    document.getElementById('generarBtn').addEventListener('click', () => {
      this.generarDialectica(false);
    });

    document.getElementById('disruptBtn').addEventListener('click', () => {
      this.generarDialectica(true); // Flag para disrupción
    });

    document.getElementById('temaInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.generarDialectica(false);
    });

    document.getElementById('historialTitle').addEventListener('click', () => {
        document.getElementById('historialList').classList.toggle('hidden');
        const span = document.querySelector('#historialTitle span');
        span.textContent = document.getElementById('historialList').classList.contains('hidden') ? '▼' : '▲';
    });
  }

  addMessageListener() {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((request) => {
            if (request.action === "textoSeleccionado" && request.texto) {
                document.getElementById('temaInput').value = request.texto;
                document.getElementById('temaInput').focus();
                this.actualizarEstado(`📝 Tema cargado desde la selección: "${request.texto.substring(0, 30)}..."`);
            }
        });
    }
  }

  /**
   * Implementa la lógica de reintento con retroceso exponencial.
   */
  async fetchWithRetry(url, options, retries = 3) {
      for (let i = 0; i < retries; i++) {
          try {
              const response = await fetch(url, options);
              if (response.ok) return response;
              
              const errorText = await response.text();
              console.error(`Attempt ${i + 1} failed with status ${response.status}: ${errorText}`);

              // Si el error es 400, 401, etc., no tiene sentido reintentar.
              if (response.status < 500) {
                  throw new Error(`Error en la solicitud (código ${response.status}).`);
              }
              
          } catch (error) {
              if (i === retries - 1) throw error;
              const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
              await new Promise(resolve => setTimeout(resolve, delay));
          }
      }
      throw new Error('La solicitud falló después de múltiples reintentos.');
  }

  /**
   * Llama a la API de Gemini para generar la dialéctica.
   */
  async callGeminiApi(systemPrompt, userQuery, responseSchema) {
      const url = `${API_URL_BASE}${MODEL}:generateContent?key=${API_KEY}`;
      const payload = {
          contents: [{ parts: [{ text: userQuery }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: {
              responseMimeType: "application/json",
              responseSchema: responseSchema
          }
      };

      const options = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
      };

      const response = await this.fetchWithRetry(url, options);
      const result = await response.json();

      if (result.candidates && result.candidates.length > 0) {
          try {
              const jsonText = result.candidates[0].content.parts[0].text;
              return JSON.parse(jsonText);
          } catch (e) {
              console.error("Error al parsear la respuesta JSON:", e, result);
              throw new Error("La IA devolvió un formato incorrecto.");
          }
      } else {
          const errorMessage = result.error?.message || 'Respuesta de la API incompleta o fallida.';
          throw new Error(errorMessage);
      }
  }

  /**
   * Define la lógica de generación principal.
   */
  async generarDialectica(isDisruptive) {
    const tema = document.getElementById('temaInput').value.trim();
    const estiloTesis = document.getElementById('estiloTesis').value;
    const estiloAntitesis = document.getElementById('estiloAntitesis').value;

    if (!tema) {
      this.mostrarError('¡Escribe un tema para la dialéctica!');
      return;
    }

    this.mostrarLoading(true, isDisruptive);

    try {
        let result;
        if (isDisruptive) {
            result = await this.performDisruption(tema);
            this.mostrarDisrupcion(result, tema);
        } else {
            result = await this.performDialecticalSynthesis(tema, estiloTesis, estiloAntitesis);
            this.mostrarResultado(result, estiloTesis, estiloAntitesis);
            this.guardarEnHistorial(result, tema, estiloTesis, estiloAntitesis);
        }
    } catch (error) {
      this.mostrarError(`Error creativo: ${error.message}`);
    } finally {
      this.mostrarLoading(false);
    }
  }

  /**
   * Lógica para la síntesis dialéctica (Tesis, Antítesis, Síntesis).
   */
  async performDialecticalSynthesis(tema, estiloTesis, estiloAntitesis) {
      const systemPrompt = `Actúa como la "Dialectical Trinity" (Chola, Malandra, Fresa). Tu tarea es realizar un análisis Hegeliano sobre el concepto proporcionado y devolver el resultado en un formato JSON estricto. 1. Tesis (CHOLA): Genera un argumento fundacional y fuerte (Tesis) sobre el concepto, adoptando el estilo de ${STYLE_MAP[estiloTesis].name}. 2. Antítesis (MALANDRA): Genera un contra-argumento disruptivo (Antítesis) contra la Tesis, adoptando el estilo de ${STYLE_MAP[estiloAntitesis].name}. 3. Síntesis (FRESA): Encuentra un nuevo camino superior (Síntesis) que resuelva el conflicto entre Tesis y Antítesis. Sé conciso y potente.`;
      
      const userQuery = `Realiza un análisis dialéctico sobre el tema: "${tema}".`;

      const schema = {
          type: "OBJECT",
          properties: {
              "tesis": { "type": "STRING", "description": "La Tesis generada en el estilo CHOLA/Raíz." },
              "antitesis": { "type": "STRING", "description": "La Antítesis generada en el estilo MALANDRA/Estrategia." },
              "sintesis": { "type": "STRING", "description": "La Síntesis que resuelve el conflicto." }
          },
          required: ["tesis", "antitesis", "sintesis"]
      };

      return this.callGeminiApi(systemPrompt, userQuery, schema);
  }

  /**
   * Lógica para la disrupción creativa (solo un resultado).
   */
  async performDisruption(tema) {
      const systemPrompt = `Eres el Motor de Disrupción Creativa (MALANDRA QuantumMind). Tu única tarea es tomar un concepto o idea y transformarlo radicalmente o presentarlo desde una perspectiva completamente inesperada y subversiva. Devuelve el resultado en formato JSON estricto. El nuevo concepto disruptivo debe ser radical.`;
      
      const userQuery = `Aplica una disrupción creativa de Nivel 9 al tema: "${tema}".`;

      const schema = {
          type: "OBJECT",
          properties: {
              "original": { "type": "STRING", "description": "El concepto original proporcionado por el usuario." },
              "disruptivo": { "type": "STRING", "description": "El concepto transformado radicalmente." }
          },
          required: ["original", "disruptivo"]
      };

      const result = await this.callGeminiApi(systemPrompt, userQuery, schema);
      // Asignar el tema original al resultado para el display
      return { original: tema, disruptivo: result.disruptivo };
  }


  mostrarResultado(data, tesisKey, antitesisKey) {
    document.getElementById('resultados').innerHTML = `
        <div class="resultado tesis">
            <div class="etiqueta">TESIS (${STYLE_MAP[tesisKey].name})</div>
            <div class="contenido" id="tesisContent">${data.tesis || ''}</div>
        </div>
        <div class="resultado antitesis">
            <div class="etiqueta">ANTÍTESIS (${STYLE_MAP[antitesisKey].name})</div>
            <div class="contenido" id="antitesisContent">${data.antitesis || ''}</div>
        </div>
        <div class="resultado sintesis hibrida">
            <div class="etiqueta">SÍNTESIS 369 HYBRIDA</div>
            <div class="contenido" id="sintesisContent">${data.sintesis || ''}</div>
        </div>
    `;

    document.getElementById('resultados').classList.remove('hidden');
    this.animarResultados();
    this.actualizarEstado(`🌀 Síntesis generada - Nivel de Confianza: ALTO`);
  }

  mostrarDisrupcion(data, temaOriginal) {
    const resultadoHTML = `
      <div class="resultado hibrida">
        <div class="etiqueta">DISRUPCIÓN CREATIVA NIVEL 9 (MALANDRA)</div>
        <div class="contenido">
          <strong>Tema Base:</strong> ${temaOriginal || ''}<br><br>
          <strong>Concepto Disruptivo:</strong> ${data.disruptivo || ''}
        </div>
      </div>
    `;
    
    document.getElementById('resultados').innerHTML = resultadoHTML;
    document.getElementById('resultados').classList.remove('hidden');

    this.animarResultados();
    this.actualizarEstado(`💥 Disrupción aplicada. ¡El caos organizado ha generado una idea!`);
  }

  animarResultados() {
    const resultados = document.getElementById('resultados');
    resultados.style.opacity = '0';
    resultados.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
      resultados.style.transition = 'all 0.5s ease';
      resultados.style.opacity = '1';
      resultados.style.transform = 'translateY(0)';
    }, 100);
  }

  mostrarLoading(mostrar, isDisruptive = false) {
    const loading = document.getElementById('loading');
    const btns = [document.getElementById('generarBtn'), document.getElementById('disruptBtn')];
    loading.textContent = isDisruptive 
        ? '💥 Aplicando Disrupción Nivel 9...'
        : '🔄 Generando síntesis híbrida...';

    loading.classList.toggle('hidden', !mostrar);
    btns.forEach(btn => btn.disabled = mostrar);
  }

  mostrarError(mensaje) {
    const estadoDiv = document.getElementById('estado');
    estadoDiv.textContent = `❌ ${mensaje}`;
    estadoDiv.style.color = 'var(--fresa)'; 
    setTimeout(() => {
        estadoDiv.style.color = 'var(--text-dim)';
    }, 5000);
  }

  actualizarEstado(mensaje) {
    document.getElementById('estado').textContent = mensaje;
  }

  // Historial: Guardar
  guardarEnHistorial(data, tema, estiloTesis, estiloAntitesis) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get('dialectica_historial', (result) => {
            const historial = result.dialectica_historial || [];
            historial.unshift({ 
                ...data, 
                tema: tema,
                estiloTesis: STYLE_MAP[estiloTesis].name,
                estiloAntitesis: STYLE_MAP[estiloAntitesis].name,
                timestamp: Date.now() 
            });
            
            if (historial.length > 10) historial.pop();
            
            chrome.storage.local.set({ 'dialectica_historial': historial }, () => {
                this.mostrarHistorial(historial); 
            });
        });
    }
  }

  // Historial: Cargar y renderizar
  cargarHistorial() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get('dialectica_historial', (result) => {
            const historial = result.dialectica_historial || [];
            this.mostrarHistorial(historial);
        });
    }
  }

  // Historial: Renderizar el HTML
  mostrarHistorial(historial) {
    const listDiv = document.getElementById('historialList');
    listDiv.innerHTML = ''; 
    
    if (historial.length === 0) {
        listDiv.innerHTML = '<div style="color: var(--text-dim); text-align: center; padding: 10px;">Aún no hay síntesis en el historial.</div>';
        listDiv.classList.remove('hidden'); 
        return;
    }

    historial.forEach((item, index) => {
        // Asegurarse de que el historial tenga síntesis para mostrar
        if (!item.sintesis) return; 

        const date = new Date(item.timestamp).toLocaleTimeString();
        const itemDiv = document.createElement('div');
        itemDiv.className = 'historial-item';
        // Usamos un índice temporal ya que no hay ID de base de datos
        itemDiv.dataset.index = index; 
        itemDiv.innerHTML = `
            <strong>${item.tema}</strong>
            <p style="margin: 0;">${item.sintesis.substring(0, 80)}...</p>
            <small>(${item.estiloTesis} vs ${item.estiloAntitesis}) - ${date}</small>
        `;
        // Re-cargar la síntesis al hacer click
        itemDiv.addEventListener('click', () => this.recargarResultado(item));
        listDiv.appendChild(itemDiv);
    });

    listDiv.classList.add('hidden');
    document.querySelector('#historialTitle span').textContent = '▼';
  }

  // Recargar un resultado del historial a la vista principal
  recargarResultado(item) {
      this.actualizarEstado(`✨ Recargando historial para: ${item.tema}`);
      document.getElementById('temaInput').value = item.tema;
      document.getElementById('resultados').innerHTML = `
        <div class="resultado tesis">
            <div class="etiqueta">TESIS (${item.estiloTesis})</div>
            <div class="contenido">${item.tesis || ''}</div>
        </div>
        <div class="resultado antitesis">
            <div class="etiqueta">ANTÍTESIS (${item.estiloAntitesis})</div>
            <div class="contenido">${item.antitesis || ''}</div>
        </div>
        <div class="resultado sintesis hibrida">
            <div class="etiqueta">SÍNTESIS 369 HYBRIDA (Recargada)</div>
            <div class="contenido">${item.sintesis || ''}</div>
        </div>
      `;
      document.getElementById('resultados').classList.remove('hidden');
      this.animarResultados();
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  new DialecticaExtension();
});
