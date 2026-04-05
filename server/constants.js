/* ============================================================
   TerraSync — Shared Constants
   Single source of truth for hardware/business constants used
   across routes and the background worker.
   ============================================================ */

const TANK_CAPACITY_L = 7.0;

// Pipe dead volume: π × r² × L × 1000  (r=0.01 m, L=2 m)
const PIPE_DEAD_VOL_L = +(Math.PI * Math.pow(0.01, 2) * 2 * 1000).toFixed(3); // ≈ 0.628 L

const TANK_LOW_L = 1.5; // trigger "tank low" warning below this level

module.exports = { TANK_CAPACITY_L, PIPE_DEAD_VOL_L, TANK_LOW_L };
