// API and model configuration variables
const API_KEY = ""; // API key will be provided at runtime in the environment.
const API_URL_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';
const MODEL = 'gemini-2.5-flash-preview-09-2025';

// Style database and utilities for visualization.
const STYLE_MAP = {
    'chola': { name: 'CHOLA (Root/Barrio)' },
    'malandra': { name: 'MALANDRA (Strategy/Survival)' },
    'fresa': { name: 'FRESA (Tech/Refined)' },
    'hybrida': { name: 'HYBRID (Fusion)' },
};

class DialecticaExtension {
  constructor() {
    this.init();
  }

  init() {
    this.bindEvents();
    this.addMessageListener();
    this.loadHistory(); 
    this.updateStatus('✅ Extension loaded. Ready for dialectical analysis.');
  }

  bindEvents() {
    document.getElementById('generateBtn').addEventListener('click', () => {
      this.generateDialectic(false);
    });

    document.getElementById('disruptBtn').addEventListener('click', () => {
      this.generateDialectic(true); // Flag for disruption
    });

    document.getElementById('topicInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.generateDialectic(false);
    });

    document.getElementById('historyTitle').addEventListener('click', () => {
        document.getElementById('historyList').classList.toggle('hidden');
        const span = document.querySelector('#historyTitle span');
        span.textContent = document.getElementById('historyList').classList.contains('hidden') ? '▼' : '▲';
    });
  }

  addMessageListener() {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((request) => {
            if (request.action === "textoSeleccionado" && request.texto) {
                document.getElementById('topicInput').value = request.texto;
                document.getElementById('topicInput').focus();
                this.updateStatus(`📝 Topic loaded from selection: "${request.texto.substring(0, 30)}..."`);
            }
        });
    }
  }

  /**
   * Implements exponential backoff retry logic.
   */
  async fetchWithRetry(url, options, retries = 3) {
      for (let i = 0; i < retries; i++) {
          try {
              const response = await fetch(url, options);
              if (response.ok) return response;
              
              const errorText = await response.text();
              console.error(`Attempt ${i + 1} failed with status ${response.status}: ${errorText}`);

              if (response.status < 500) {
                  throw new Error(`Request error (code ${response.status}).`);
              }
              
          } catch (error) {
              if (i === retries - 1) throw error;
              const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
              await new Promise(resolve => setTimeout(resolve, delay));
          }
      }
      throw new Error('Request failed after multiple retries.');
  }

  /**
   * Calls the Gemini API for content generation.
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
              console.error("Error parsing JSON response:", e, result);
              throw new Error("AI returned an incorrect format.");
          }
      } else {
          const errorMessage = result.error?.message || 'Incomplete or failed API response.';
          throw new Error(errorMessage);
      }
  }

  /**
   * Main generation logic function.
   */
  async generateDialectic(isDisruptive) {
    const topic = document.getElementById('topicInput').value.trim();
    const thesisStyle = document.getElementById('thesisStyle').value;
    const antithesisStyle = document.getElementById('antithesisStyle').value;

    if (!topic) {
      this.showError('Please enter a topic for the dialectic!');
      return;
    }

    this.showLoading(true, isDisruptive);

    try {
        let result;
        if (isDisruptive) {
            result = await this.performDisruption(topic);
            this.showDisruption(result, topic);
        } else {
            result = await this.performDialecticalSynthesis(topic, thesisStyle, antithesisStyle);
            this.showResult(result, thesisStyle, antithesisStyle);
            this.saveToHistory(result, topic, thesisStyle, antithesisStyle);
        }
    } catch (error) {
      this.showError(`Creative Error: ${error.message}`);
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Logic for dialectical synthesis (Thesis, Antithesis, Synthesis).
   */
  async performDialecticalSynthesis(topic, thesisStyleKey, antithesisStyleKey) {
      const thesisStyleName = STYLE_MAP[thesisStyleKey].name;
      const antithesisStyleName = STYLE_MAP[antithesisStyleKey].name;

      const systemPrompt = `Act as the "Dialectical Trinity" (Chola, Malandra, Fresa). Your task is to perform a Hegelian analysis on the provided concept and return the result in a strict JSON format. 1. Thesis: Generate a foundational and strong argument (Thesis) on the concept, adopting the style of ${thesisStyleName}. 2. Antithesis: Generate a disruptive counter-argument (Antithesis) against the Thesis, adopting the style of ${antithesisStyleName}. 3. Synthesis: Find a new, superior path (Synthesis) that resolves the conflict between Thesis and Antithesis. Be concise and powerful.`;
      
      const userQuery = `Perform a dialectical analysis on the topic: "${topic}".`;

      const schema = {
          type: "OBJECT",
          properties: {
              "thesis": { "type": "STRING", "description": "The Thesis generated in the chosen style." },
              "antithesis": { "type": "STRING", "description": "The Antithesis generated in the chosen counter-style." },
              "synthesis": { "type": "STRING", "description": "The Synthesis that resolves the conflict." }
          },
          required: ["thesis", "antithesis", "synthesis"]
      };

      return this.callGeminiApi(systemPrompt, userQuery, schema);
  }

  /**
   * Logic for creative disruption.
   */
  async performDisruption(topic) {
      const systemPrompt = `You are the Creative Disruption Engine (MALANDRA QuantumMind). Your sole task is to take a concept or idea and radically transform it or present it from a completely unexpected and subversive perspective. Return the result in a strict JSON format. The new disruptive concept must be radical.`;
      
      const userQuery = `Apply a Level 9 creative disruption to the topic: "${topic}".`;

      const schema = {
          type: "OBJECT",
          properties: {
              "originalTopic": { "type": "STRING", "description": "The original concept provided by the user." },
              "disruptiveConcept": { "type": "STRING", "description": "The radically transformed concept." }
          },
          required: ["originalTopic", "disruptiveConcept"]
      };

      const result = await this.callGeminiApi(systemPrompt, userQuery, schema);
      // Map keys to expected display format
      return { original: topic, disruptive: result.disruptiveConcept };
  }


  showResult(data, thesisKey, antithesisKey) {
    document.getElementById('results').innerHTML = `
        <div class="result thesis">
            <div class="tag">THESIS (${STYLE_MAP[thesisKey].name})</div>
            <div class="content" id="thesisContent">${data.thesis || ''}</div>
        </div>
        <div class="result antithesis">
            <div class="tag">ANTITHESIS (${STYLE_MAP[antithesisKey].name})</div>
            <div class="content" id="antithesisContent">${data.antithesis || ''}</div>
        </div>
        <div class="result synthesis hybrid">
            <div class="tag">HYBRID SYNTHESIS 369</div>
            <div class="content" id="synthesisContent">${data.synthesis || ''}</div>
        </div>
    `;

    document.getElementById('results').classList.remove('hidden');
    this.animateResults();
    this.updateStatus(`🌀 Synthesis generated - Confidence Level: HIGH`);
  }

  showDisruption(data, originalTopic) {
    const resultHTML = `
      <div class="result hybrid">
        <div class="tag">CREATIVE DISRUPTION LEVEL 9 (MALANDRA)</div>
        <div class="content">
          <strong>Base Topic:</strong> ${originalTopic || ''}<br><br>
          <strong>Disruptive Concept:</strong> ${data.disruptive || ''}
        </div>
      </div>
    `;
    
    document.getElementById('results').innerHTML = resultHTML;
    document.getElementById('results').classList.remove('hidden');

    this.animateResults();
    this.updateStatus(`💥 Disruption applied. Organized chaos has generated an idea!`);
  }

  animateResults() {
    const results = document.getElementById('results');
    results.style.opacity = '0';
    results.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
      results.style.transition = 'all 0.5s ease';
      results.style.opacity = '1';
      results.style.transform = 'translateY(0)';
    }, 100);
  }

  showLoading(show, isDisruptive = false) {
    const loading = document.getElementById('loading');
    const btns = [document.getElementById('generateBtn'), document.getElementById('disruptBtn')];
    loading.textContent = show && isDisruptive
        ? '💥 Applying Level 9 Disruption...'
        : '🔄 Generating hybrid synthesis...';

    loading.classList.toggle('hidden', !show);
    btns.forEach(btn => btn.disabled = show);
  }

  showError(message) {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = `❌ ${message}`;
    statusDiv.style.color = 'var(--fresa)'; 
    setTimeout(() => {
        statusDiv.style.color = 'var(--text-dim)';
    }, 5000);
  }

  updateStatus(message) {
    document.getElementById('status').textContent = message;
  }

  // History: Save
  saveToHistory(data, topic, thesisStyle, antithesisStyle) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get('dialectica_history', (result) => {
            const history = result.dialectica_history || [];
            history.unshift({ 
                ...data, 
                topic: topic,
                thesisStyle: STYLE_MAP[thesisStyle].name,
                antithesisStyle: STYLE_MAP[antithesisStyle].name,
                timestamp: Date.now() 
            });
            
            if (history.length > 10) history.pop();
            
            chrome.storage.local.set({ 'dialectica_history': history }, () => {
                this.showHistory(history); 
            });
        });
    }
  }

  // History: Load and render
  loadHistory() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get('dialectica_history', (result) => {
            const history = result.dialectica_history || [];
            this.showHistory(history);
        });
    }
  }

  // History: Render HTML
  showHistory(history) {
    const listDiv = document.getElementById('historyList');
    listDiv.innerHTML = ''; 
    
    if (history.length === 0) {
        listDiv.innerHTML = '<div style="color: var(--text-dim); text-align: center; padding: 10px;">No synthesis history yet.</div>';
        listDiv.classList.remove('hidden'); 
        return;
    }

    history.forEach((item, index) => {
        if (!item.synthesis) return; 

        const date = new Date(item.timestamp).toLocaleTimeString();
        const itemDiv = document.createElement('div');
        itemDiv.className = 'history-item';
        itemDiv.dataset.index = index; 
        itemDiv.innerHTML = `
            <strong>${item.topic}</strong>
            <p style="margin: 0;">${item.synthesis.substring(0, 80)}...</p>
            <small>(${item.thesisStyle} vs ${item.antithesisStyle}) - ${date}</small>
        `;
        itemDiv.addEventListener('click', () => this.reloadResult(item));
        listDiv.appendChild(itemDiv);
    });

    listDiv.classList.add('hidden');
    document.querySelector('#historyTitle span').textContent = '▼';
  }

  // Reload a result from history to the main view
  reloadResult(item) {
      this.updateStatus(`✨ Reloading history for: ${item.topic}`);
      document.getElementById('topicInput').value = item.topic;
      document.getElementById('results').innerHTML = `
        <div class="result thesis">
            <div class="tag">THESIS (${item.thesisStyle})</div>
            <div class="content">${item.tesis || ''}</div>
        </div>
        <div class="result antithesis">
            <div class="tag">ANTITHESIS (${item.antithesisStyle})</div>
            <div class="content">${item.antitesis || ''}</div>
        </div>
        <div class="result synthesis hybrid">
            <div class="tag">HYBRID SYNTHESIS 369 (Reloaded)</div>
            <div class="content">${item.sintesis || ''}</div>
        </div>
      `;
      document.getElementById('results').classList.remove('hidden');
      this.animateResults();
  }
}

// Initialize when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new DialecticaExtension();
});
