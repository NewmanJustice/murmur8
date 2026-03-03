'use strict';

// --- Banner ---

const BANNER = `
       }
    }    }
  }   }    }
    }   }  }  }
  }  }   }  }
     }  }
       }
`;

function banner(useColor) {
  const art = BANNER;
  if (useColor) {
    return `\x1b[36m${art}\x1b[0m`;
  }
  return art;
}

// --- Glyphs & Labels ---

const STAGE_GLYPH = '}';

const STAGE_LABELS = {
  alex: 'creating feature spec',
  cass: 'writing user stories',
  nigel: 'building tests',
  'codey-plan': 'drafting implementation plan',
  'codey-implement': 'implementing feature'
};

const STAGE_NAMES = {
  alex: 'Alex',
  cass: 'Cass',
  nigel: 'Nigel',
  'codey-plan': 'Codey',
  'codey-implement': 'Codey'
};

// --- Status Icons (replacing emoji) ---

const STATUS_ICONS = {
  'parallel_queued': '\u00b7',    // ·
  'worktree_created': '\u25cb',   // ○
  'parallel_running': '\u25d4',   // ◔
  'merge_pending': '\u25d1',      // ◑
  'parallel_complete': '\u2713',  // ✓
  'parallel_failed': '\u2717',    // ✗
  'merge_conflict': '\u26a0',     // ⚠
  'aborted': '\u25a0'             // ■
};

// --- Spinner ---

const SPINNER_FRAMES = ['} }  ', ' } } ', '  } }', ' } } ', '} }  '];

// --- Messages ---

const MESSAGES = {
  startingFlock: (count) => `Starting murmuration — ${count} feature${count === 1 ? '' : 's'} taking flight`,
  landed: 'Landed',
  mergedAndLanded: 'Merged and landed',
  turbulence: 'Encountered turbulence',
  lostFormation: 'Lost formation',
  timedOut: 'Timed out \u2014 lost the flock',
  flockScattering: 'Flock scattering... stopping pipelines',
  takingFlight: 'Taking flight...',
  murmurationComplete: '--- Murmuration Complete ---',
  conflictsHeader: 'Features with turbulence (branches preserved):',
  failuresHeader: 'Features that lost formation (worktrees preserved):'
};

// --- Color helper ---

function colorize(text, color, useColor) {
  if (!useColor) return text;
  const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m'
  };
  return `${colors[color] || ''}${text}${colors.reset}`;
}

// --- Stage formatting ---

function formatStageStart(stage, index) {
  const indent = ' '.repeat(index);
  const name = STAGE_NAMES[stage] || stage;
  const label = STAGE_LABELS[stage] || stage;
  return `${indent}${STAGE_GLYPH} ${name} \u2014 ${label}`;
}

// --- Progress bar ---

function progressBar(percent, width = 20) {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return '[' + '}'.repeat(filled) + '\u00b7'.repeat(empty) + ']';
}

module.exports = {
  BANNER,
  STAGE_GLYPH,
  STAGE_LABELS,
  STAGE_NAMES,
  STATUS_ICONS,
  SPINNER_FRAMES,
  MESSAGES,
  colorize,
  formatStageStart,
  progressBar,
  banner
};
