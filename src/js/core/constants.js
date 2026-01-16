/**
 * Constants - Semantic constants to replace magic numbers
 *
 * Purpose: Centralize all magic numbers with meaningful names
 * Benefits:
 * - Self-documenting code
 * - Single source of truth
 * - Easy to adjust values
 * - Type-safe configuration
 *
 * @related Postmortem recommendations for all incidents
 */

// ============================================================================
// CAMERA CONFIGURATION
// ============================================================================

export const CAMERA = {
  // Field of View
  FOV: 30, // degrees

  // Clipping planes
  NEAR_CLIP: 0.5,
  FAR_CLIP: 10000000, // 10 million units

  // Position presets
  POSITION: {
    INITIAL_X: 0,
    INITIAL_Y: 0,
    INITIAL_Z: 2500, // Default starting position

    // Preset zoom levels
    CLOSE_UP_Z: 300,
    NORMAL_Z: 2500,
    GRID_VIEW_Z: 1800,
    FAR_VIEW_Z: 5000,
    GALAXY_VIEW_Z: 40000,
  },

  // Rotation presets
  ROTATION: {
    INITIAL_X: Math.PI * 0.05, // Slight tilt
    INITIAL_Y: Math.PI / 2, // 90° horizontal

    GRID_VIEW_X: -Math.PI / 3, // -60° bird's-eye view
    GRID_VIEW_Y: 0, // Face XY plane
  },

  // Zoom limits
  ZOOM: {
    MIN: 0.5, // Closest possible
    MAX: 80000, // Farthest possible (galaxy view range)
    SPEED: 0.125, // Zoom interpolation speed
  },
};

// ============================================================================
// COORDINATE SYSTEM SCALING
// ============================================================================

export const COORDINATES = {
  // Fediverse instance coordinate scaling
  // Applied to match Hipparcos coordinate range
  // See: Postmortem INC-009
  FEDIVERSE_SCALE: 100,

  // Hipparcos catalog uses 1 unit = 1 parsec
  HIPPARCOS_SCALE: 1.0,

  // Scale factor for raw Fediverse data loading
  // Applied as divisor: position /= DATA_LOAD_SCALE
  DATA_LOAD_SCALE: 5.0,

  // Grid system
  GRID_SIZE: 10000,
  GRID_DIVISIONS: 100,

  // Data load scaling (fediverse_final.json normalization)
  DATA_LOAD_SCALE: 5,
};

// ============================================================================
// VISIBILITY RANGES
// ============================================================================

export const VISIBILITY = {
  // Grid plane visibility
  GRID: {
    MIN_Z: 1500, // Grid appears when z > this
    MAX_Z: 1900, // Grid disappears when z > this
    OPACITY_MIN: 0,
    OPACITY_MAX: 1,
  },

  // Marker visibility thresholds
  MARKER: {
    MIN_Z: 200, // Too close - hide markers
    MAX_Z: 45000, // Too far - hide markers
  },

  // Fediverse system visibility
  FEDIVERSE: {
    // Distance from origin to be considered "at Fediverse center"
    CENTER_THRESHOLD: 100,

    // Label visibility zoom range
    LABEL_MIN_ZOOM: 0.2, // 20%
    LABEL_MAX_ZOOM: 0.9, // 90%
  },

  // Galaxy and dust visibility (hide when zoomed in past initial view)
  GALAXY: {
    HIDE_Z: 2500, // Hide galaxy/dust when z < this (at initial zoom or closer)
  },

  // Star name tooltip
  STAR_NAME: {
    FADE_IN_DELAY: 300, // ms
    FADE_OUT_DELAY: 100, // ms
  },
};

// ============================================================================
// INTERACTION THRESHOLDS
// ============================================================================

export const INTERACTION = {
  // Click detection thresholds
  THRESHOLD: {
    DEFAULT: 50, // Default raycast threshold
    CLOSE_UP: 10, // When zoomed in close (z < 500)
    CLOSE_UP_CAMERA_Z: 500, // Camera z for close-up threshold
    BASE: 100.0, // Base threshold for instance detection
    MIN: 5.0, // Minimum threshold regardless of zoom
    DYNAMIC_FACTOR: 0.025, // Multiplier for dynamic threshold (z * factor)
  },

  // Ray-based instance detection
  RAY_DETECTION: {
    MIN_COS_ANGLE: 0.5, // Minimum cosine angle to consider instance
    DISTANCE_DIVISOR: 1000, // Distance factor for threshold adjustment
    MIN_SIZE_MULTIPLIER: 0.15, // Minimum size multiplier for user_count
    MAX_SIZE_MULTIPLIER: 1.0, // Maximum size multiplier for user_count
    DIRECTION_WEIGHT: 0.1, // Weight for direction distance in scoring
  },

  // Hover detection
  HOVER: {
    DISABLE_CAMERA_Z: 300, // Disable hover when z < this
    TOOLTIP_OFFSET_X: 20, // px
    TOOLTIP_OFFSET_Y: -10, // px
  },

  // Pan/zoom animation
  ANIMATION: {
    PAN_SPEED: 0.1, // Lerp factor for panning
    PAN_THRESHOLD: 0.01, // Stop panning when distance < this

    ROTATION_SPEED: 0.0005, // Auto-rotate speed
    ROTATION_DAMPING: 0.9, // Velocity damping
    ROTATION_DRAG_DAMPING: 0.6, // Extra damping when dragging
  },
};

// ============================================================================
// FEDIVERSE SUPERGIANT POSITIONS
// ============================================================================

export const SUPERGIANT = {
  // Triangle side length
  TRIANGLE_SIDE: 500,

  // Individual positions (equilateral triangle)
  BETELGEUSE: {
    // mastodon.social
    x: 0,
    y: (500 * Math.sqrt(3)) / 3, // ~288.67
    z: 0,
    name: "mastodon.social",
    spectralClass: "M1-M2 Ia-ab",
  },

  ANTARES: {
    // mstdn.jp
    x: -250,
    y: (-500 * Math.sqrt(3)) / 6, // ~-144.34
    z: 0,
    name: "mstdn.jp",
    spectralClass: "M1.5 Iab-b",
  },

  VV_CEPHEI_A: {
    // Supercluster
    x: 250,
    y: (-500 * Math.sqrt(3)) / 6, // ~-144.34
    z: 0,
    name: "VV Cephei A",
    spectralClass: "M2 Iab",
  },
};

// ============================================================================
// SPECTRAL CLASSIFICATION
// ============================================================================

export const SPECTRAL = {
  // Temperature range (Kelvin)
  // Based on Fediverse instance activity mapping
  TEMPERATURE: {
    MIN: 3840, // Inactive instances (coolest)
    MEDIAN: 7300,
    MAX: 42000, // Very active instances (hottest)
  },

  // Spectral classes
  CLASSES: ["O", "B", "A", "F", "G", "K", "M"],

  // Color mapping (approximate)
  COLORS: {
    O: 0x9bb0ff, // Blue
    B: 0xaabfff, // Blue-white
    A: 0xcad7ff, // White
    F: 0xf8f7ff, // Yellow-white
    G: 0xfff4ea, // Yellow (like Sun)
    K: 0xffd2a1, // Orange
    M: 0xffcc6f, // Red-orange
  },
};

// ============================================================================
// RENDERING & PERFORMANCE
// ============================================================================

export const RENDERING = {
  // Anisotropic filtering
  MAX_ANISOTROPY: 16, // Will be clamped to GPU max

  // Point sizes
  POINT_SIZE: {
    STAR_MIN: 0.1,
    STAR_MAX: 10.0,
    FEDIVERSE_MIN: 1.0,
    FEDIVERSE_MAX: 50.0,
  },

  // Shader timing
  SHADER_TIME_SCALE: 0.001, // Convert ms to shader time

  // Performance targets
  PERFORMANCE: {
    TARGET_FPS: 60,
    MIN_FPS: 30,
  },
};

// ============================================================================
// UI LAYOUT
// ============================================================================

export const UI = {
  // Minimap positioning
  MINIMAP: {
    BOTTOM_PADDING: 80, // px from bottom
    RIGHT_PADDING: 20, // px from right
    ICON_HEIGHT_FALLBACK: 24, // px - when offsetHeight is 0

    ZOOM_TRACK_HEIGHT: 200, // px
    ZOOM_CURSOR_SIZE: 20, // px
  },

  // Detail panel
  DETAIL: {
    FADE_IN_DURATION: 300, // ms
    FADE_OUT_DURATION: 200, // ms
    PADDING_TOP: "10%",
  },

  // Icon sizes
  ICON: {
    GRID_VIEW: 24, // px
    VOLUME: 24,
    HELP: 24,
  },

  // Z-index layers
  Z_INDEX: {
    LOADER: 1000,
    UI_ICONS: 100,
    MINIMAP: 90,
    DETAIL: 80,
    STAR_NAME: 70,
    DEBUG_GUI: 10000,
  },
};

// ============================================================================
// AUDIO
// ============================================================================

export const AUDIO = {
  // Volume levels
  VOLUME: {
    DEFAULT: 0.3,
    MUTED: 0.0,
    MAX: 1.0,
  },

  // Crossfade
  CROSSFADE_DURATION: 2000, // ms

  // Autoplay handling
  AUTOPLAY: {
    RETRY_DELAY: 1000, // ms
    MAX_RETRIES: 3,
  },
};

// ============================================================================
// DRACO DECODER CONFIGURATION
// ============================================================================

export const DRACO = {
  // Local path for offline/local-first loading (P0-1 requirement)
  LOCAL_PATH: "src/assets/draco/",

  // CDN path as fallback
  CDN_PATH: "https://www.gstatic.com/draco/versioned/decoders/1.5.6/",

  // Prefer local decoder to avoid network dependency
  PREFER_LOCAL: true,
};

/**
 * Get Draco decoder paths in priority order for fallback loading
 * @returns {string[]} Array of paths: [primary, fallback]
 */
export function getDracoDecoderPaths() {
  return DRACO.PREFER_LOCAL
    ? [DRACO.LOCAL_PATH, DRACO.CDN_PATH]
    : [DRACO.CDN_PATH, DRACO.LOCAL_PATH];
}

/**
 * Get the primary Draco decoder path (legacy compatibility)
 * @returns {string} The primary decoder path
 * @deprecated Use getDracoDecoderPaths() for fallback support
 */
export function getDracoDecoderPath() {
  return getDracoDecoderPaths()[0];
}

// ============================================================================
// DATA PATHS
// ============================================================================

export const GITHUB_REPO = "r0k1s-i/fediverse-with-100k-stars";

export const DATA_PATHS = {
  HIPPARCOS: "data/hygdata_v3.csv",
  FEDIVERSE: `https://cdn.jsdelivr.net/gh/${GITHUB_REPO}@data/fediverse_final.json`,
  SPECTRAL_TEXTURE: "src/assets/textures/star_color_modified.png",
};

// ============================================================================
// ANIMATION TIMINGS
// ============================================================================

export const ANIMATION = {
  // Navigation
  NAVIGATE_TO_STAR: {
    DURATION: 2000, // ms
    EASING: "easeInOutCubic",
  },

  GRID_VIEW: {
    DURATION: 1000, // ms
    ROTATION_STEP: 0.1, // Interpolation factor
  },

  // UI transitions
  FADE: {
    FAST: 100, // ms
    NORMAL: 300,
    SLOW: 500,
  },
};

// ============================================================================
// DEBUG SETTINGS
// ============================================================================

export const DEBUG = {
  // Enable debug features
  ENABLED: true,

  // Logging levels
  LOG_LEVEL: {
    NONE: 0,
    ERROR: 1,
    WARN: 2,
    INFO: 3,
    DEBUG: 4,
  },

  // Current log level (set to NONE in production)
  CURRENT_LOG_LEVEL: 3, // INFO

  // Performance monitoring
  SHOW_FPS: false,
  SHOW_DRAW_CALLS: false,

  // Visual helpers
  SHOW_AXES: false,
  SHOW_GRID: false,
  SHOW_RAYCAST: false,
};

// ============================================================================
// PHYSICS & SIMULATION
// ============================================================================

export const PHYSICS = {
  // Orbital mechanics (if implemented)
  GRAVITATIONAL_CONSTANT: 6.674e-11, // N⋅m²/kg²

  // Rotation
  EARTH_ROTATION_PERIOD: 24, // hours
  EARTH_ORBITAL_PERIOD: 365.25, // days

  // Scale factors for simulation
  TIME_SCALE: 1.0,
  DISTANCE_SCALE: 1.0,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get zoom level as percentage (0-1)
 */
export function getZoomPercentage(cameraZ) {
  const { MIN, MAX } = CAMERA.ZOOM;
  return 1 - (cameraZ - MIN) / (MAX - MIN);
}

/**
 * Get interaction threshold based on camera distance
 */
export function getInteractionThreshold(cameraZ) {
  const { CLOSE_UP_CAMERA_Z, CLOSE_UP, DEFAULT } = INTERACTION.THRESHOLD;
  return cameraZ < CLOSE_UP_CAMERA_Z ? CLOSE_UP : DEFAULT;
}

/**
 * Check if grid should be visible
 */
export function isGridVisible(cameraZ) {
  const { MIN_Z, MAX_Z } = VISIBILITY.GRID;
  return cameraZ > MIN_Z && cameraZ < MAX_Z;
}

/**
 * Check if at Fediverse center
 */
export function isAtFediverseCenter(translatingPosition) {
  return translatingPosition.length() < VISIBILITY.FEDIVERSE.CENTER_THRESHOLD;
}

/**
 * Calculate grid opacity based on camera z
 */
export function getGridOpacity(cameraZ) {
  const { MIN_Z, MAX_Z } = VISIBILITY.GRID;

  if (cameraZ <= MIN_Z || cameraZ >= MAX_Z) {
    return 0;
  }

  // Fade in from MIN_Z, fade out before MAX_Z
  const fadeRange = 100;

  if (cameraZ < MIN_Z + fadeRange) {
    return (cameraZ - MIN_Z) / fadeRange;
  }

  if (cameraZ > MAX_Z - fadeRange) {
    return (MAX_Z - cameraZ) / fadeRange;
  }

  return 1;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate camera position is within bounds
 */
export function validateCameraZ(z) {
  const { MIN, MAX } = CAMERA.ZOOM;
  return Math.max(MIN, Math.min(MAX, z));
}

/**
 * Validate coordinate scaling is applied
 */
export function scaleFediverseCoordinate(value) {
  return value * COORDINATES.FEDIVERSE_SCALE;
}

// ============================================================================
// EXPORTS
// ============================================================================

// Re-export all constants as default for convenience
export default {
  CAMERA,
  COORDINATES,
  VISIBILITY,
  INTERACTION,
  SUPERGIANT,
  SPECTRAL,
  RENDERING,
  UI,
  AUDIO,
  DRACO,
  DATA_PATHS,
  ANIMATION,
  DEBUG,
  PHYSICS,

  // Helper functions
  getZoomPercentage,
  getInteractionThreshold,
  isGridVisible,
  isAtFediverseCenter,
  getGridOpacity,
  validateCameraZ,
  scaleFediverseCoordinate,
  getDracoDecoderPath,
};
