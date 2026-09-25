// Bootstrap shim: 01-core.js initializes `state` before 02-state.js defines the real loadState().
// Return a harmless placeholder so the core file can load; 02b-init.js replaces it with the real saved state.
window.loadState = function spotlightBootstrapLoadState() {
  return {};
};
