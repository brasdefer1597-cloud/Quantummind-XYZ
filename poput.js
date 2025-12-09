// Base de datos de estilos para la visualización del nombre completo.
const STYLE_MAP = {
    'chola': { name: 'CHOLA (Raíz/Barrio)' },
    'malandra': { name: 'MALANDRA (Estrategia/Supervivencia)' },
    'fresa': { name: 'FRESA (Tecno/Refinado)' },
    'hybrida': { name: 'HYBRIDA (Fusión)' },
};

class DialecticaExtension {
  constructor() {
    this.backendUrl = 'http://localhost:3000';
    this.init();
  }

  init() {
    this.bindEvents();
    // Escuchar mensajes del Service Worker (background.js)
    this.addMessageListener();
    this.cargarHistorial(); // NUEVO: Cargar historial al inicio
    this.actualizarEstado('Conectando con la energía creativa...');
  }

  bindEvents() {
    document.getElementById('generarBtn').addEventListener('click', () => {
      this.generarDialectica(false);
    });

    document.getElementById('disruptBtn').addEventListener('click', () => {
      this.generarDialectica(true); // Flag para disrupción
    });

    // Enter key support
    document.getElementById('temaInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.generarDialectica(false);
    });

    // Toggle historial
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
                // Rellenar el input de tema con el texto seleccionado
                document.getElementById('temaInput').value = request.texto;
                document.getElementById('temaInput').focus();
                
                this.actualizarEstado(`📝 Tema cargado desde la selección: "${request.texto.substring(0, 30)}..."`);
            }
        });
    }
  }

  /**
   * Genera la dialéctica o aplica la disrupción.
   * @param {boolean} isDisruptive - Si es true, usa el endpoint de disrupción.
   */
  async generarDialectica(isDisruptive) {
    const tema = document.getElementById('temaInput').value.trim();
    const estiloTesis = document.getElementById('estiloTesis').value;
    const estiloAntitesis = document.getElementById('estiloAntitesis').value;

    if (!tema) {
      this.mostrarError('¡Escribe un tema para la dialéctica!');
      return;
    }

    this.mostrarLoading(true);

    const endpoint = isDisruptive ? '/api/creative/disrupt' : '/api/dialectica/generar';
    const bodyPayload = isDisruptive 
        ? { concepto: tema, nivelDisrupcion: 9 }
        : { tema, estiloTesis, estiloAntitesis };

    try {
      const response = await fetch(`${this.backendUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });

      if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.error || `HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        if (isDisruptive) {
            this.mostrarDisrupcion(data.data);
        } else {
            this.mostrarResultado(data.data, estiloTesis, estiloAntitesis);
            this.guardarEnHistorial(data.data, tema, estiloTesis, estiloAntitesis); // Pasamos estilos y tema
        }
      } else {
        throw new Error(data.error || 'Respuesta del servidor incompleta.');
      }

    } catch (error) {
      this.mostrarError(`Error creativo: ${error.message}`);
    } finally {
      this.mostrarLoading(false);
    }
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
    
    // Efecto visual
    this.animarResultados();
    
    this.actualizarEstado(`🌀 Síntesis generada - Energía: ${data.energia}`);
  }

  mostrarDisrupcion(data) {
    // Usando la estructura HTML de tus fragmentos para la disrupción
    const resultadoHTML = `
      <div class="resultado hibrida">
        <div class="etiqueta">DISRUPCIÓN CREATIVA NIVEL ${data.nivelDisrupcion || 9}</div>
        <div class="contenido">
          <strong>Original:</strong> ${data.original || ''}<br><br>
          <strong>Disruptivo:</strong> ${data.disruptivo || ''}
        </div>
      </div>
    `;
    
    document.getElementById('resultados').innerHTML = resultadoHTML;
    document.getElementById('resultados').classList.remove('hidden');

    this.animarResultados();
    this.actualizarEstado(`💥 Disrupción aplicada - Tipo: ${data.tipo}`);
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

  mostrarLoading(mostrar) {
    const loading = document.getElementById('loading');
    const btns = [document.getElementById('generarBtn'), document.getElementById('disruptBtn')];

    loading.classList.toggle('hidden', !mostrar);
    btns.forEach(btn => btn.disabled = mostrar);
  }

  mostrarError(mensaje) {
    const estadoDiv = document.getElementById('estado');
    estadoDiv.textContent = `❌ ${mensaje}`;
    // Usamos el estilo del estado para mostrar el error, no un alert
    estadoDiv.style.color = 'var(--fresa)'; 
    setTimeout(() => {
        estadoDiv.style.color = 'rgba(255, 255, 255, 0.5)';
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
            
            // Mantener solo últimos 10
            if (historial.length > 10) historial.pop();
            
            chrome.storage.local.set({ 'dialectica_historial': historial }, () => {
                this.mostrarHistorial(historial); // Actualizar UI del historial inmediatamente
            });
        });
    }
  }

  // Historial: Cargar y renderizar al inicio
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
    listDiv.innerHTML = ''; // Limpiar lista
    
    if (historial.length === 0) {
        listDiv.innerHTML = '<div style="color: var(--text-dim); text-align: center; padding: 10px;">Aún no hay síntesis en el historial.</div>';
        listDiv.classList.remove('hidden'); // Mostrar mensaje vacío
        return;
    }

    historial.forEach(item => {
        const date = new Date(item.timestamp).toLocaleTimeString();
        const itemDiv = document.createElement('div');
        itemDiv.className = 'historial-item';
        itemDiv.dataset.id = item.id;
        itemDiv.innerHTML = `
            <strong>${item.tema}</strong>
            <p style="margin: 0;">${item.sintesis.substring(0, 80)}...</p>
            <small>(${item.estiloTesis} vs ${item.estiloAntitesis}) - ${date}</small>
        `;
        listDiv.appendChild(itemDiv);
    });

    // Ocultar la lista por defecto
    listDiv.classList.add('hidden');
    document.querySelector('#historialTitle span').textContent = '▼';
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  new DialecticaExtension();
});
