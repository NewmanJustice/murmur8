const { init } = require('./init');
const {
  parseRefinementArgs,
  loadRefinementContext,
  applySpecDiff,
  buildRefinementPayload,
  linkParentRun,
  isTechnicalFeature,
  filterAffectedStories,
  buildStoryChanges,
  buildChangeSummary,
  isPauseBypassable,
} = require('./refine');
const { update } = require('./update');
const { validate, formatOutput, checkNodeVersion } = require('./validate');
const { recordHistory, displayHistory, showStats, clearHistory, storeStageFeedback, updateStage } = require('./history');
const {
  readConfig,
  writeConfig,
  resetConfig,
  calculateFailureRate,
  recommendStrategy,
  applyStrategy,
  shouldRetry,
  mapIssuesToStrategies
} = require('./retry');
const {
  validateFeedback,
  shouldPause,
  getDefaultConfig: getFeedbackDefaultConfig,
  readConfig: readFeedbackConfig,
  writeConfig: writeFeedbackConfig
} = require('./feedback');
const {
  calculateCalibration,
  correlateIssues,
  recommendThreshold,
  displayFeedbackInsights
} = require('./insights');
const {
  parseHandoffSummary,
  extractSection,
  countBulletItems,
  extractFilePaths,
  validateHandoffSummary,
  getHandoffPath,
  getHandoffTemplate
} = require('./handoff');
const {
  needsBusinessContext,
  parseIncludeBusinessContextFlag,
  shouldIncludeBusinessContext,
  buildQueueState,
  generateBusinessContextDirective
} = require('./business-context');
const {
  classifyFeature,
  parseStoryFlags,
  shouldIncludeStories,
  buildClassifiedQueueState,
  logClassification,
  TECHNICAL_KEYWORDS,
  USER_FACING_KEYWORDS
} = require('./classifier');
const {
  parseFlags: parseInteractiveFlags,
  shouldEnterInteractiveMode,
  createSession,
  getSessionProgress,
  handleCommand,
  getNextSection,
  markSectionComplete,
  markSectionTBD,
  gatherContext,
  identifyGaps,
  generateQuestions,
  canFinalize,
  generateSpec,
  writeSpec,
  generateHandoff,
  getOutputPath,
  SESSION_STATES,
  SECTION_ORDER,
  MIN_REQUIRED_SECTIONS,
  SYSTEM_SPEC_QUESTIONS
} = require('./interactive');
const {
  getDefaultStackConfig,
  readStackConfig,
  writeStackConfig,
  resetStackConfig,
  setStackConfigValue,
  detectStackConfig,
  displayStackConfig
} = require('./stack');
const {
  parseGitStatus,
  formatDiffSummary,
  formatFeatureHeader,
  hasChanges,
  shouldSkipPreview,
  parseUserChoice,
  createAbortResult,
  truncateDiff,
  getPreviewState,
  markWorktreeAborted,
  getPromptText
} = require('./diff-preview');
const { loadConfig, generateRunId, ensureFeatureId, buildPayload, compressArtifact,
        enqueueFailure, retryQueue, ensureDotenv, ensureGitignore, formatTelemetryConfig
      } = require('./telemetry');
const tools = require('./tools');
const theme = require('./theme');

module.exports = {
  init,
  update,
  validate,
  formatOutput,
  checkNodeVersion,
  recordHistory,
  displayHistory,
  showStats,
  clearHistory,
  storeStageFeedback,
  updateStage,
  // Retry module exports
  readConfig,
  writeConfig,
  resetConfig,
  calculateFailureRate,
  recommendStrategy,
  applyStrategy,
  shouldRetry,
  mapIssuesToStrategies,
  // Feedback module exports
  validateFeedback,
  shouldPause,
  getFeedbackDefaultConfig,
  readFeedbackConfig,
  writeFeedbackConfig,
  // Feedback insights exports
  calculateCalibration,
  correlateIssues,
  recommendThreshold,
  displayFeedbackInsights,
  // Handoff summary exports
  parseHandoffSummary,
  extractSection,
  countBulletItems,
  extractFilePaths,
  validateHandoffSummary,
  getHandoffPath,
  getHandoffTemplate,
  // Business context exports
  needsBusinessContext,
  parseIncludeBusinessContextFlag,
  shouldIncludeBusinessContext,
  buildQueueState,
  generateBusinessContextDirective,
  // Classifier module exports (smart story routing)
  classifyFeature,
  parseStoryFlags,
  shouldIncludeStories,
  buildClassifiedQueueState,
  logClassification,
  TECHNICAL_KEYWORDS,
  USER_FACING_KEYWORDS,
  // Stack config exports
  getDefaultStackConfig,
  readStackConfig,
  writeStackConfig,
  resetStackConfig,
  setStackConfigValue,
  detectStackConfig,
  displayStackConfig,
  // Telemetry module exports
  loadConfig,
  generateRunId,
  ensureFeatureId,
  buildPayload,
  compressArtifact,
  enqueueFailure,
  retryQueue,
  ensureDotenv,
  ensureGitignore,
  formatTelemetryConfig,
  // Tools module (model native features)
  tools,
  // Theme module (murmuration visual theming)
  theme,
  // Diff preview exports
  parseGitStatus,
  formatDiffSummary,
  formatFeatureHeader,
  hasChanges,
  shouldSkipPreview,
  parseUserChoice,
  createAbortResult,
  truncateDiff,
  getPreviewState,
  markWorktreeAborted,
  getPromptText,
  // Interactive mode exports
  parseInteractiveFlags,
  shouldEnterInteractiveMode,
  createSession,
  getSessionProgress,
  handleCommand,
  getNextSection,
  markSectionComplete,
  markSectionTBD,
  gatherContext,
  identifyGaps,
  generateQuestions,
  canFinalize,
  generateSpec,
  writeSpec,
  generateHandoff,
  getOutputPath,
  SESSION_STATES,
  SECTION_ORDER,
  MIN_REQUIRED_SECTIONS,
  SYSTEM_SPEC_QUESTIONS,
  // Refine module exports
  parseRefinementArgs,
  loadRefinementContext,
  applySpecDiff,
  buildRefinementPayload,
  linkParentRun,
  isTechnicalFeature,
  filterAffectedStories,
  buildStoryChanges,
  buildChangeSummary,
  isPauseBypassable,
};
