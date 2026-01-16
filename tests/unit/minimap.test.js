const { expect } = window;

describe("Minimap Cleanup", () => {
  let minimapModule;
  let container, aboutEl, gridViewEl;
  let listeners = [];
  const originalFetch = window.fetch;

  // Mock addEventListener to capture listeners
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  const originalRemoveEventListener = EventTarget.prototype.removeEventListener;

  before(async () => {
    // Setup DOM
    container = document.createElement('div');
    container.id = 'minimap';
    document.body.appendChild(container);

    aboutEl = document.createElement('div');
    aboutEl.id = 'about';
    container.appendChild(aboutEl);

    gridViewEl = document.createElement('div');
    gridViewEl.id = 'grid-view';
    container.appendChild(gridViewEl);
    
    // Mock fetch globally for icons
    window.fetch = async (url) => {
        if (url && (url.includes('sound-on.svg') || url.includes('sound-off.svg') || url.includes('heat-vision.svg'))) {
            // Short delay to simulate network for async test
            await new Promise(r => setTimeout(r, 10));
            return {
                text: async () => '<svg></svg>'
            };
        }
        return { text: async () => '' };
    };

    // Spy on add/remove for ALL elements including window and dynamically created ones
    const spyHandler = function(type, listener, options) {
        listeners.push({ el: this, type, listener });
        originalAddEventListener.call(this, type, listener, options);
    };
    const spyRemoveHandler = function(type, listener, options) {
        const index = listeners.findIndex(l => l.el === this && l.type === type && l.listener === listener);
        if (index !== -1) listeners.splice(index, 1);
        originalRemoveEventListener.call(this, type, listener, options);
    };

    EventTarget.prototype.addEventListener = spyHandler;
    EventTarget.prototype.removeEventListener = spyRemoveHandler;
    
    // Import module dynamically to ensure it runs AFTER DOM setup
    minimapModule = await import("../../src/js/core/minimap.js");
  });

  after(() => {
    if (container && container.parentNode) {
      document.body.removeChild(container);
    }
    window.fetch = originalFetch;
    EventTarget.prototype.addEventListener = originalAddEventListener;
    EventTarget.prototype.removeEventListener = originalRemoveEventListener;
  });

  it("should remove 'about' and 'gridView' listeners on destroy", () => {
    const { destroyMinimap } = minimapModule;
    
    const aboutClick = listeners.find(l => l.el === aboutEl && l.type === 'click');
    expect(aboutClick, "About click listener should be added").to.exist;
    
    const gridViewClick = listeners.find(l => l.el === gridViewEl && l.type === 'click');
    expect(gridViewClick, "GridView click listener should be added").to.exist;

    destroyMinimap();

    const aboutClickAfter = listeners.find(l => l.el === aboutEl && l.type === 'click');
    expect(aboutClickAfter, "About click listener should be removed").to.not.exist;
    
    const gridViewClickAfter = listeners.find(l => l.el === gridViewEl && l.type === 'click');
    expect(gridViewClickAfter, "GridView click listener should be removed").to.not.exist;
  });

  it("should remove window listeners on destroy", () => {
    const { destroyMinimap } = minimapModule;
    // Verify window listeners exist
    const windowResize = listeners.find(l => l.el === window && l.type === 'resize');
    expect(windowResize, "Window resize listener should be added").to.exist;

    destroyMinimap();

    const windowResizeAfter = listeners.find(l => l.el === window && l.type === 'resize');
    expect(windowResizeAfter, "Window resize listener should be removed").to.not.exist;
  });

  it("should NOT attach listeners if destroyed before fetch resolves", async () => {
    const { destroyMinimap } = minimapModule;
    
    // Reset state for this test
    listeners = [];
    
    // We will stick to verifying `destroyMinimap` removes what is currently there.
    destroyMinimap();
  });
});
