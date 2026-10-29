// Cloud of Electrons - Decoupled Global Event Bus & Extensibility Registry
// Enables parallel improvement modules (Audio, Radar, Security, Sub-Cosmos, Anomalies)
// to integrate without merge conflicts or direct shader edits.

(function(){
  window.COE_EVENTS = {
    dispatch(name, detail = {}) {
      try {
        window.dispatchEvent(new CustomEvent(name, { detail }));
      } catch(e) {
        console.warn('[COE_EVENTS] Dispatch error:', e);
      }
    },
    on(name, handler) {
      window.addEventListener(name, handler);
    },
    off(name, handler) {
      window.removeEventListener(name, handler);
    }
  };

  // Extension Registries for parallel subsystems
  window.COE_EXTENSIONS = {
    security: null,   // Populated by site/security/gateway.js
    audio: null,      // Populated by site/audio/engine.js
    realms: null,     // Populated by site/realms/sub-cosmos-manager.js
    controls: null,   // Populated by site/controls/flight-deck.js
    anomalies: null   // Populated by site/anomalies/scanner.js
  };
})();
