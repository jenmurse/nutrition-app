'use client';

import React, { useState } from 'react';
import { marked } from 'marked';

interface AIAnalysisPanelProps {
  mealPlanId?: number;
  date?: Date;
  recipeId?: number;
  context: Record<string, unknown>;
  availableTypes?: string[];
}

const ANALYSIS_TYPES: Record<string, { label: string; description: string }> = {
  'meal-prep': { label: 'Meal Prep', description: 'Analyze batch cooking and freezing candidates' },
  'adjust-recipe': { label: 'Adjust Recipe', description: 'Suggest healthier ingredient substitutions' },
};

const AIAnalysisPanel: React.FC<AIAnalysisPanelProps> = ({
  context,
  availableTypes = ['meal-prep'],
}) => {
  const [activeType, setActiveType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const PROMPT_TEMPLATES: Record<string, string> = {
    'meal-prep': 'You are a meal prep advisor. Analyze which of these meals are good candidates for batch cooking and freezing in Souper Cubes (1-cup silicone molds). Consider which freeze well, which components can be prepped ahead, and suggest a prep plan.',
    'adjust-recipe': 'You are a culinary nutrition advisor. Given this recipe and its ingredients, suggest specific ingredient substitutions to make it healthier while keeping the flavor. Be practical.',
  };

  const copyPrompt = (type: string) => {
    const prompt = PROMPT_TEMPLATES[type];
    if (!prompt) return;
    const fullPrompt = `${prompt}\n\nHere is the data:\n\n${JSON.stringify(context, null, 2)}`;
    navigator.clipboard.writeText(fullPrompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const runAnalysis = async (type: string) => {
    setActiveType(type);
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, context }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      setResult(data.analysis);
    } catch (err) {
      const rawMsg = err instanceof Error ? err.message : 'Failed to run analysis';
      if (/429|quota|rate.?limit/i.test(rawMsg)) {
        setError('AI rate limit reached. Try again later or check your API plan at the provider\'s dashboard.');
      } else {
        setError(rawMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const renderMarkdown = (md: string) => {
    const html = marked.parse(md, { async: false }) as string;
    return (
      <div
        className="prose-sm text-[12px] text-[var(--fg)] leading-[1.7] [&_h1]:font-serif [&_h1]:text-[16px] [&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:font-serif [&_h2]:text-[14px] [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:text-[12px] [&_h3]:font-medium [&_h3]:mt-2 [&_h3]:mb-1 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:my-1 [&_li]:my-[2px] [&_p]:my-1 [&_strong]:font-medium [&_code]:font-mono [&_code]:text-[11px] [&_code]:bg-[var(--bg-subtle)] [&_code]:px-1 [&_code]:py-[1px]"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  };

  return (
    <div className="border-t border-[var(--rule)] pt-4 mt-4">
      <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] mb-3">
        AI Analysis
      </div>

      {/* Analysis type buttons — API call */}
      <div className="flex flex-wrap gap-[6px] mb-2">
        {availableTypes.map((type) => {
          const config = ANALYSIS_TYPES[type];
          if (!config) return null;
          const isActive = activeType === type;
          return (
            <button
              key={type}
              onClick={() => runAnalysis(type)}
              disabled={loading}
              className={`text-[10px] px-3 py-[5px] border transition-colors disabled:opacity-50 ${
                isActive
                  ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-light)]'
                  : 'border-[var(--rule)] text-[var(--muted)] hover:text-[var(--fg)] hover:border-[var(--rule-strong)]'
              }`}
              title={config.description}
              aria-label={config.description}
            >
              {config.label}
            </button>
          );
        })}
      </div>

      {/* Copy prompt for external AI */}
      <div className="flex flex-wrap items-center gap-[6px] mb-4">
        <span className="text-[9px] text-[var(--muted)]">or copy for:</span>
        {availableTypes.map((type) => {
          const config = ANALYSIS_TYPES[type];
          if (!config) return null;
          return (
            <button
              key={`copy-${type}`}
              onClick={() => copyPrompt(type)}
              className="text-[9px] text-[var(--muted)] hover:text-[var(--fg)] transition-colors underline"
              title={`Copy ${config.label} prompt to clipboard — paste into ChatGPT, Claude, or Gemini`}
            >
              {config.label}
            </button>
          );
        })}
        {copied && <span className="text-[9px] text-[var(--accent)]">Copied!</span>}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="py-6 text-center">
          <div className="text-[11px] text-[var(--muted)]">Analyzing...</div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="py-3 px-4 border border-[var(--error-border)] bg-[var(--error-light)] text-[12px] text-[var(--error)]">
          {error}
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div className="bg-[var(--bg-raised)] rounded-[var(--radius-sm,8px)] p-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
          {renderMarkdown(result)}
        </div>
      )}
    </div>
  );
};

export default AIAnalysisPanel;
