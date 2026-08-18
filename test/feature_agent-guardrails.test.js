const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

// Agent spec files to test
const AGENT_FILES = [
  'AGENT_SPECIFICATION_ALEX.md',
  'AGENT_BA_CASS.md',
  'AGENT_TESTER_NIGEL.md',
  'AGENT_DEVELOPER_CODEY.md'
];

const AGENTS_DIR = path.join(__dirname, '..', '.blueprint', 'agents');
const GUARDRAILS_FILE = path.join(AGENTS_DIR, 'GUARDRAILS.md');

// Helper: Read agent spec file content combined with shared GUARDRAILS.md
// Runtime prompts inline critical guardrail rules; full rules live in GUARDRAILS.md
function readAgentSpec(filename) {
  const filePath = path.join(AGENTS_DIR, filename);
  let content = fs.readFileSync(filePath, 'utf-8').toLowerCase();

  // Always include guardrails content — it's the shared rule source
  if (fs.existsSync(GUARDRAILS_FILE)) {
    const guardrailsContent = fs.readFileSync(GUARDRAILS_FILE, 'utf-8').toLowerCase();
    content += '\n' + guardrailsContent;
  }

  return content;
}

// Helper: Check if content contains any of the phrases (case-insensitive)
function containsAny(content, phrases) {
  return phrases.some(phrase => content.includes(phrase.toLowerCase()));
}

// Helper: Check all agent files contain required content
function allAgentsContain(phrases) {
  return AGENT_FILES.every(file => {
    const content = readAgentSpec(file);
    return containsAny(content, phrases);
  });
}

// Story: Source Restrictions (story-source-restrictions.md)
describe('Source Restrictions Guardrails', () => {

  it('T-SR-1.1: Agent specs list allowed sources', () => {
    const allowedSourcePhrases = [
      'allowed source',
      'permitted source',
      'may use',
      'can use',
      'system specification',
      'feature spec',
      'user stories',
      'business context'
    ];

    AGENT_FILES.forEach(file => {
      const content = readAgentSpec(file);
      assert.ok(
        containsAny(content, allowedSourcePhrases),
        `${file} should specify allowed sources`
      );
    });
  });

  it('T-SR-2.1: Agent specs list prohibited sources', () => {
    const prohibitedPhrases = [
      'prohibited',
      'must not',
      'do not use',
      'not allowed',
      'social media',
      'forums',
      'blog',
      'external api'
    ];

    AGENT_FILES.forEach(file => {
      const content = readAgentSpec(file);
      assert.ok(
        containsAny(content, prohibitedPhrases),
        `${file} should specify prohibited sources`
      );
    });
  });

  it('T-SR-3.1: Agent specs prohibit training data for domain facts', () => {
    const trainingDataPhrases = [
      'training data',
      'do not invent',
      'not from training',
      'hallucin',
      'domain fact'
    ];

    AGENT_FILES.forEach(file => {
      const content = readAgentSpec(file);
      assert.ok(
        containsAny(content, trainingDataPhrases),
        `${file} should prohibit using training data for domain facts`
      );
    });
  });

  it('T-SR-4.1: Agent specs prohibit external references', () => {
    const externalRefPhrases = [
      'external project',
      'external compan',
      'external reference',
      'outside project',
      'not reference external'
    ];

    AGENT_FILES.forEach(file => {
      const content = readAgentSpec(file);
      assert.ok(
        containsAny(content, externalRefPhrases),
        `${file} should prohibit external references`
      );
    });
  });

  it('T-SR-5.1: Agent specs define gap handling', () => {
    const gapHandlingPhrases = [
      'assumption',
      'escalat',
      'missing information',
      'gap',
      'not available'
    ];

    AGENT_FILES.forEach(file => {
      const content = readAgentSpec(file);
      assert.ok(
        containsAny(content, gapHandlingPhrases),
        `${file} should define gap handling (assumption or escalation)`
      );
    });
  });
});

// Story: Citation Requirements (story-citation-requirements.md)
describe('Citation Requirements Guardrails', () => {

  it('T-CR-1.1: Agent specs define citation format', () => {
    const citationFormatPhrases = [
      'per [',
      'cit',
      'reference',
      'source',
      'states'
    ];

    AGENT_FILES.forEach(file => {
      const content = readAgentSpec(file);
      assert.ok(
        containsAny(content, citationFormatPhrases),
        `${file} should define citation format`
      );
    });
  });

  it('T-CR-2.1: Agent specs mention section-level citations', () => {
    const sectionCitePhrases = [
      'section',
      'ac-',
      ':section',
      'section-level'
    ];

    AGENT_FILES.forEach(file => {
      const content = readAgentSpec(file);
      assert.ok(
        containsAny(content, sectionCitePhrases),
        `${file} should mention section-level citations`
      );
    });
  });

  it('T-CR-3.1: Agent specs distinguish assumptions from facts', () => {
    const assumptionPhrases = [
      'assumption:',
      'assumption',
      'labelled',
      'labeled',
      'distinguish',
      'explicit assumption'
    ];

    AGENT_FILES.forEach(file => {
      const content = readAgentSpec(file);
      assert.ok(
        containsAny(content, assumptionPhrases),
        `${file} should distinguish assumptions from cited facts`
      );
    });
  });

  it('T-CR-4.1: Agent specs reference business_context citations', () => {
    const bizContextPhrases = [
      'business_context',
      'business context',
      '.business_context'
    ];

    AGENT_FILES.forEach(file => {
      const content = readAgentSpec(file);
      assert.ok(
        containsAny(content, bizContextPhrases),
        `${file} should reference business_context for domain citations`
      );
    });
  });

  it('T-CR-5.1: Agent specs require traceable chain', () => {
    const traceablePhrases = [
      'trace',
      'traceab',
      'upstream',
      'downstream',
      'chain'
    ];

    AGENT_FILES.forEach(file => {
      const content = readAgentSpec(file);
      assert.ok(
        containsAny(content, traceablePhrases),
        `${file} should require traceable chain`
      );
    });
  });
});

// Story: Confidentiality (story-confidentiality.md)
describe('Confidentiality Guardrails', () => {

  it('T-CF-1.1: Agent specs prohibit verbatim business context', () => {
    const verbatimPhrases = [
      'verbatim',
      'not reproduce',
      'do not copy',
      'generic description',
      'summarise',
      'summarize'
    ];

    AGENT_FILES.forEach(file => {
      const content = readAgentSpec(file);
      assert.ok(
        containsAny(content, verbatimPhrases),
        `${file} should prohibit verbatim business context exposure`
      );
    });
  });

  it('T-CF-2.1: Agent specs prohibit external entity names', () => {
    const entityPhrases = [
      'not reference',
      'do not name',
      'external entit',
      'company name',
      'project name',
      'by name'
    ];

    AGENT_FILES.forEach(file => {
      const content = readAgentSpec(file);
      assert.ok(
        containsAny(content, entityPhrases),
        `${file} should prohibit external entity names`
      );
    });
  });

  it('T-CF-3.1: Agent specs prohibit external service exposure', () => {
    const servicePhrases = [
      'external service',
      'external api',
      'not use such service',
      'local',
      'not expose'
    ];

    AGENT_FILES.forEach(file => {
      const content = readAgentSpec(file);
      assert.ok(
        containsAny(content, servicePhrases),
        `${file} should prohibit external service exposure`
      );
    });
  });

  it('T-CF-4.1: Agent specs require self-contained outputs', () => {
    const selfContainedPhrases = [
      'self-contained',
      'self contained',
      'standalone',
      'without access to confidential'
    ];

    AGENT_FILES.forEach(file => {
      const content = readAgentSpec(file);
      assert.ok(
        containsAny(content, selfContainedPhrases),
        `${file} should require self-contained outputs`
      );
    });
  });

  it('T-CF-5.1: Agent specs require confidentiality escalation', () => {
    const confidEscalatePhrases = [
      'confidential',
      'escalat',
      'flag',
      'guidance'
    ];

    AGENT_FILES.forEach(file => {
      const content = readAgentSpec(file);
      assert.ok(
        containsAny(content, confidEscalatePhrases),
        `${file} should require confidentiality conflict escalation`
      );
    });
  });
});

// Story: Escalation Protocol (story-escalation-protocol.md)
describe('Escalation Protocol Guardrails', () => {

  it('T-EP-1.1: Agent specs define escalation for missing info', () => {
    const missingInfoPhrases = [
      'missing',
      'not present',
      'not available',
      'required information',
      'critical information'
    ];

    AGENT_FILES.forEach(file => {
      const content = readAgentSpec(file);
      assert.ok(
        containsAny(content, missingInfoPhrases),
        `${file} should define escalation for missing information`
      );
    });
  });

  it('T-EP-2.1: Agent specs define escalation for ambiguity', () => {
    const ambiguityPhrases = [
      'ambigu',
      'unclear',
      'multiple interpretation',
      'clarif'
    ];

    AGENT_FILES.forEach(file => {
      const content = readAgentSpec(file);
      assert.ok(
        containsAny(content, ambiguityPhrases),
        `${file} should define escalation for ambiguity`
      );
    });
  });

  it('T-EP-3.1: Agent specs define escalation for conflicts', () => {
    const conflictPhrases = [
      'conflict',
      'contradict',
      'inconsistent',
      'disagree'
    ];

    AGENT_FILES.forEach(file => {
      const content = readAgentSpec(file);
      assert.ok(
        containsAny(content, conflictPhrases),
        `${file} should define escalation for source conflicts`
      );
    });
  });

  it('T-EP-4.1: Agent specs define confidentiality escalation', () => {
    const confidEscalatePhrases = [
      'confidential',
      'sensitive',
      'protect',
      'escalat'
    ];

    AGENT_FILES.forEach(file => {
      const content = readAgentSpec(file);
      assert.ok(
        containsAny(content, confidEscalatePhrases),
        `${file} should define confidentiality escalation`
      );
    });
  });

  it('T-EP-5.1: Agent specs allow explicit assumptions', () => {
    const explicitAssumptionPhrases = [
      'assumption',
      'assume',
      'note:',
      'explicit'
    ];

    AGENT_FILES.forEach(file => {
      const content = readAgentSpec(file);
      assert.ok(
        containsAny(content, explicitAssumptionPhrases),
        `${file} should allow explicit assumptions when escalation not warranted`
      );
    });
  });

  it('T-EP-6.1: Agent specs prefer "not available" over hallucination', () => {
    const antiHallucinationPhrases = [
      'not available',
      'do not invent',
      'do not guess',
      'hallucin',
      'not in the provided input'
    ];

    AGENT_FILES.forEach(file => {
      const content = readAgentSpec(file);
      assert.ok(
        containsAny(content, antiHallucinationPhrases),
        `${file} should prefer stating info not available over hallucination`
      );
    });
  });
});

// Story: Pre-LLM PII Screening (story-pre-llm-pii-screening.md)
describe('Pre-LLM PII Screening Guardrails', () => {

  it('T-PII-1.1: Agent guardrails define on_LLM_start PII screening', () => {
    const piiStartPhrases = [
      'on_llm_start',
      'personal data risk',
      'pii',
      'outbound context'
    ];

    AGENT_FILES.forEach(file => {
      const content = readAgentSpec(file);
      assert.ok(
        containsAny(content, piiStartPhrases),
        `${file} should define pre-send PII screening at on_LLM_start`
      );
    });
  });

  it('T-PII-2.1: Agent guardrails define ALLOW/REVIEW/BLOCK outcomes', () => {
    const decisionPhrases = [
      'allow',
      'review',
      'block',
      'reason code'
    ];

    AGENT_FILES.forEach(file => {
      const content = readAgentSpec(file);
      assert.ok(
        containsAny(content, decisionPhrases),
        `${file} should define ALLOW/REVIEW/BLOCK decision outcomes`
      );
    });
  });

  it('T-PII-3.1: Agent guardrails prohibit raw sensitive value leakage', () => {
    const noRawPhrases = [
      'never include raw detected values',
      'raw matched values',
      'logs, errors, or telemetry evidence',
      'queue files'
    ];

    AGENT_FILES.forEach(file => {
      const content = readAgentSpec(file);
      assert.ok(
        containsAny(content, noRawPhrases),
        `${file} should prohibit raw sensitive value leakage`
      );
    });
  });

  it('T-PII-4.1: Agent guardrails require deterministic decisions', () => {
    const deterministicPhrases = [
      'deterministic',
      'identical inputs',
      'consistent outputs',
      'same inputs'
    ];

    AGENT_FILES.forEach(file => {
      const content = readAgentSpec(file);
      assert.ok(
        containsAny(content, deterministicPhrases),
        `${file} should require deterministic pre-send decisions`
      );
    });
  });
});

// Story: Prompt-Injection Triage (story-prompt-injection-triage.md)
describe('Prompt-Injection Triage Guardrails', () => {

  it('T-PIT-1.1: Agent guardrails block high-confidence untrusted exfiltration directives', () => {
    const blockDirectivePhrases = [
      'prompt-injection',
      'prompt injection',
      'exfiltrate',
      'disable controls',
      'unauthorised side effects'
    ];

    AGENT_FILES.forEach(file => {
      const content = readAgentSpec(file);
      assert.ok(
        containsAny(content, blockDirectivePhrases),
        `${file} should define blocking for high-confidence untrusted directives`
      );
    });
  });

  it('T-PIT-2.1: Agent guardrails route ambiguous instruction-like content to REVIEW', () => {
    const reviewPhrases = [
      'review',
      'ambiguous',
      'suspicious',
      'reason code',
      'redacted evidence'
    ];

    AGENT_FILES.forEach(file => {
      const content = readAgentSpec(file);
      assert.ok(
        containsAny(content, reviewPhrases),
        `${file} should route ambiguous instruction-like content to REVIEW`
      );
    });
  });

  it('T-PIT-3.1: Agent guardrails preserve defensive quoted-analysis use cases', () => {
    const defensiveQuotedPhrases = [
      'detection is a risk signal',
      'not proof of intent',
      'defensive',
      'quoted examples'
    ];

    AGENT_FILES.forEach(file => {
      const content = readAgentSpec(file);
      assert.ok(
        containsAny(content, defensiveQuotedPhrases),
        `${file} should preserve defensive quoted-analysis use cases`
      );
    });
  });

  it('T-PIT-4.1: Agent guardrails preserve trust hierarchy and independent action controls', () => {
    const trustControlPhrases = [
      'retrieved/external content as untrusted',
      'untrusted',
      'tool/action permissions',
      'evaluated independently downstream'
    ];

    AGENT_FILES.forEach(file => {
      const content = readAgentSpec(file);
      assert.ok(
        containsAny(content, trustControlPhrases),
        `${file} should preserve trust hierarchy and independent action controls`
      );
    });
  });
});

// Story: Post-LLM Token Telemetry (story-llm-end-token-telemetry.md)
describe('Post-LLM Token Telemetry Guardrails', () => {

  it('T-TEL-1.1: Agent guardrails define on_LLM_END usage capture', () => {
    const usageCapturePhrases = [
      'on_llm_end',
      'usage metadata',
      'input tokens',
      'output tokens',
      'total tokens',
      'duration'
    ];

    AGENT_FILES.forEach(file => {
      const content = readAgentSpec(file);
      assert.ok(
        containsAny(content, usageCapturePhrases),
        `${file} should define usage capture at on_LLM_END`
      );
    });
  });

  it('T-TEL-2.1: Agent guardrails include telemetry payload assembly expectations', () => {
    const payloadPhrases = [
      'telemetry payload',
      'run metadata',
      'stage correlation',
      'usage fields'
    ];

    AGENT_FILES.forEach(file => {
      const content = readAgentSpec(file);
      assert.ok(
        containsAny(content, payloadPhrases),
        `${file} should include telemetry payload assembly expectations`
      );
    });
  });

  it('T-TEL-3.1: Agent guardrails prohibit prompt/response content in usage capture', () => {
    const noLeakagePhrases = [
      'must not include prompt/response body content',
      'no content leakage',
      'without exposing raw prompt or response content'
    ];

    AGENT_FILES.forEach(file => {
      const content = readAgentSpec(file);
      assert.ok(
        containsAny(content, noLeakagePhrases),
        `${file} should prohibit prompt/response content leakage in usage capture`
      );
    });
  });

  it('T-TEL-4.1: Agent guardrails require graceful partial metadata handling and non-blocking telemetry errors', () => {
    const resiliencePhrases = [
      'missing usage fields degrade gracefully',
      'partial metrics',
      'without throwing',
      'telemetry capture errors do not fail the pipeline run'
    ];

    AGENT_FILES.forEach(file => {
      const content = readAgentSpec(file);
      assert.ok(
        containsAny(content, resiliencePhrases),
        `${file} should require safe partial metadata handling and non-blocking telemetry failures`
      );
    });
  });
});

// Additional test: Guardrails section exists in all agent specs
describe('Guardrails Section Presence', () => {

  it('T-GP-1.1: All agent specs contain a Guardrails section', () => {
    const guardrailsSectionPhrases = [
      '## guardrail',
      '# guardrail',
      '### guardrail'
    ];

    AGENT_FILES.forEach(file => {
      const content = readAgentSpec(file);
      assert.ok(
        containsAny(content, guardrailsSectionPhrases),
        `${file} should contain a Guardrails section header`
      );
    });
  });
});
