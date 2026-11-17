import React, { useEffect, useRef, useState } from 'react';
import { Copy, Check, Eye, Code, GitFork, RefreshCw, Wand2, AlertTriangle, Sparkles } from 'lucide-react';

/**
 * Intelligently cleans and repairs common Mermaid syntax issues:
 * 1. Wraps unquoted special characters inside node brackets/shapes in quotes
 * 2. Normalizes missing or misspelled diagram directives (graphTD -> graph TD, flowchartTD -> flowchart TD)
 * 3. Removes dangling unlinked connectors (e.g., trailing "-->" at line ends)
 * 4. Normalizes malformed arrow operators (-- >, == >, etc.)
 * 5. Strips stray markdown fences and backticks
 */
export function autoFixMermaidSyntax(rawCode: string): string {
  if (!rawCode || !rawCode.trim()) {
    return 'flowchart TD\n  Start["Start"] --> Finish["Finish"]';
  }

  // 1. Strip markdown fences and backticks
  let code = rawCode.replace(/```mermaid/gi, '').replace(/```/g, '').trim();

  // 2. Normalize directive at the beginning
  const hasDiagramType = /^\s*(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt|pie|gitGraph|mindmap|timeline|quadrantChart|xychart-beta|packet-beta|architecture-beta)\b/i.test(code);

  if (!hasDiagramType) {
    code = `flowchart TD\n${code}`;
  } else {
    code = code
      .replace(/^\s*graph\s*-\s*TD/i, 'graph TD')
      .replace(/^\s*graphTD/i, 'graph TD')
      .replace(/^\s*flowchart\s*-\s*TD/i, 'flowchart TD')
      .replace(/^\s*flowchartTD/i, 'flowchart TD')
      .replace(/^\s*flowchart\s*-\s*LR/i, 'flowchart LR')
      .replace(/^\s*flowchartLR/i, 'flowchart LR')
      .replace(/^\s*graph\s*-\s*LR/i, 'graph LR')
      .replace(/^\s*graphLR/i, 'graph LR')
      .replace(/^\s*sequence\s*diagram/i, 'sequenceDiagram')
      .replace(/^\s*class\s*diagram/i, 'classDiagram')
      .replace(/^\s*state\s*diagram(-v2)?/i, 'stateDiagram-v2')
      .replace(/^\s*er\s*diagram/i, 'erDiagram');
  }

  // 3. Normalize broken arrow operators:
  code = code
    .replace(/--\s+>/g, '-->')
    .replace(/==\s+>/g, '==>')
    .replace(/<--\s+/g, '<-- ')
    .replace(/<-\s+-/g, '<--')
    .replace(/-\s+\.\s+->/g, '-.->');

  // 4. Remove dangling arrows at line ends (e.g. "A -->" without a target)
  code = code.replace(/(-->|---|==>|-.->)\s*$/gm, '');

  // 5. Quote unquoted node labels with special characters like (, ), :, =, +, -, /, *, ;, &, |
  // Rectangular [ ... ]
  code = code.replace(/([a-zA-Z0-9_\u00C0-\u017F]+)\[([^"\]\n\r]+)\]/g, (match, id, label) => {
    const trimmed = label.trim();
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) return match;
    if (/^[a-zA-Z0-9_ -]+$/.test(trimmed)) return match;
    const safe = trimmed.replace(/"/g, "'");
    return `${id}["${safe}"]`;
  });

  // Rhombus / Diamond { ... }
  code = code.replace(/([a-zA-Z0-9_\u00C0-\u017F]+)\{([^"\}\n\r]+)\}/g, (match, id, label) => {
    const trimmed = label.trim();
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) return match;
    if (/^[a-zA-Z0-9_ -]+$/.test(trimmed)) return match;
    const safe = trimmed.replace(/"/g, "'");
    return `${id}{"${safe}"}`;
  });

  // Rounded ( ... ) - avoid matching ([...]) or [(...)]
  code = code.replace(/([a-zA-Z0-9_\u00C0-\u017F]+)\((?![\[\(\{\"])([^"\)\n\r]+)\)/g, (match, id, label) => {
    const trimmed = label.trim();
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) return match;
    if (/^[a-zA-Z0-9_ -]+$/.test(trimmed)) return match;
    const safe = trimmed.replace(/"/g, "'");
    return `${id}("${safe}")`;
  });

  // Database cylinder [( ... )]
  code = code.replace(/([a-zA-Z0-9_\u00C0-\u017F]+)\[\(([^"\]\n\r]+)\)\]/g, (match, id, label) => {
    const trimmed = label.trim();
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) return match;
    const safe = trimmed.replace(/"/g, "'");
    return `${id}[("${safe}")]`;
  });

  // Stadium ([ ... ])
  code = code.replace(/([a-zA-Z0-9_\u00C0-\u017F]+)\(\[([^"\]\n\r]+)\]\)/g, (match, id, label) => {
    const trimmed = label.trim();
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) return match;
    const safe = trimmed.replace(/"/g, "'");
    return `${id}(["${safe}"])`;
  });

  // 6. Fix pipe labels on arrows like -->|Label With Special Chars|
  code = code.replace(/-->\|([^|\n\r]+)\|/g, (match, pipeLabel) => {
    const trimmed = pipeLabel.trim();
    if (!trimmed) return '-->';
    return `-->|${trimmed}|`;
  });

  return code;
}

interface MermaidDiagramProps {
  code: string;
  id: string;
  onFixCode?: (fixedCode: string) => void;
}

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ code, id, onFixCode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeCode, setActiveCode] = useState<string>(code);
  const [svgHtml, setSvgHtml] = useState<string>('');
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [isRendering, setIsRendering] = useState(true);
  const [wasAutoFixed, setWasAutoFixed] = useState(false);

  useEffect(() => {
    setActiveCode(code);
    setWasAutoFixed(false);
  }, [code]);

  useEffect(() => {
    let isMounted = true;

    const renderDiagram = async () => {
      setIsRendering(true);
      setRenderError(null);

      const mermaid = (window as any).mermaid;
      if (!mermaid) {
        if (isMounted) {
          setRenderError('Mermaid library initializing...');
          setIsRendering(false);
        }
        return;
      }

      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: 'neutral',
          securityLevel: 'loose',
          fontFamily: 'DM Sans, -apple-system, sans-serif',
          flowchart: {
            curve: 'basis',
            padding: 15,
          },
        });

        const cleanCode = activeCode.trim();
        const renderId = `mermaid-${id.replace(/[^a-zA-Z0-9_-]/g, '_')}-${Math.floor(Math.random() * 100000)}`;
        const { svg } = await mermaid.render(renderId, cleanCode);

        if (isMounted) {
          setSvgHtml(svg);
          setRenderError(null);
          setIsRendering(false);
        }
      } catch (err: any) {
        // Attempt automatic 2-stage recovery if not already auto-fixed
        const fixed = autoFixMermaidSyntax(activeCode);
        if (fixed !== activeCode && !wasAutoFixed) {
          try {
            const retryId = `mermaid-fix-${id.replace(/[^a-zA-Z0-9_-]/g, '_')}-${Math.floor(Math.random() * 100000)}`;
            const { svg } = await (window as any).mermaid.render(retryId, fixed.trim());
            if (isMounted) {
              setSvgHtml(svg);
              setActiveCode(fixed);
              setWasAutoFixed(true);
              setRenderError(null);
              setIsRendering(false);
            }
            return;
          } catch {
            // Both original and auto-fix failed
          }
        }

        if (isMounted) {
          setRenderError(err?.message || 'Unable to parse diagram syntax');
          setIsRendering(false);
        }
      }
    };

    renderDiagram();

    return () => {
      isMounted = false;
    };
  }, [activeCode, id, wasAutoFixed]);

  const handleCopy = () => {
    navigator.clipboard.writeText(activeCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleManualAutoFix = () => {
    const fixed = autoFixMermaidSyntax(activeCode);
    setActiveCode(fixed);
    setWasAutoFixed(true);
    if (onFixCode) {
      onFixCode(fixed);
    }
  };

  const handleGenerateFallbackBlueprint = () => {
    const safeBlueprint = `flowchart TD\n  StepA["Architecture Concept"] --> StepB["Algorithmic Execution"]\n  StepB --> StepC["Result Verification"]`;
    setActiveCode(safeBlueprint);
    setWasAutoFixed(true);
    if (onFixCode) {
      onFixCode(safeBlueprint);
    }
  };

  return (
    <div className="my-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/90 shadow-sm overflow-hidden text-slate-800 dark:text-slate-200" style={{ lineHeight: 'normal' }}>
      {/* Diagram Action Bar */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-slate-100/90 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-xs">
        <div className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300">
          <GitFork className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Interactive Mermaid Diagram</span>
          {wasAutoFixed && (
            <span className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              <Sparkles className="w-3 h-3" />
              <span>Auto-Repaired Syntax</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Quick Auto-Fix Wand Button */}
          <button
            type="button"
            onClick={handleManualAutoFix}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer"
            title="Auto-repair special characters and syntax errors"
          >
            <Wand2 className="w-3 h-3 text-amber-500" />
            <span>Auto-Fix</span>
          </button>

          {/* Toggle Code View */}
          <button
            type="button"
            onClick={() => setShowCode(!showCode)}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
            title="Toggle diagram definition code"
          >
            {showCode ? <Eye className="w-3 h-3" /> : <Code className="w-3 h-3" />}
            <span>{showCode ? 'Diagram' : 'Code'}</span>
          </button>

          {/* Copy Code */}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
            title="Copy Mermaid source"
          >
            {isCopied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            <span>{isCopied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Code View */}
      {showCode && (
        <pre className="p-3 text-[11px] font-mono bg-slate-950 text-emerald-400 overflow-x-auto border-b border-slate-800">
          <code>{activeCode}</code>
        </pre>
      )}

      {/* SVG Canvas or Error Fallback */}
      <div className="p-4 overflow-x-auto flex items-center justify-center min-h-[140px] bg-slate-50/50 dark:bg-slate-900/50">
        {isRendering ? (
          <div className="flex items-center gap-2 text-xs text-slate-500 py-6">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
            <span>Rendering diagram vector geometry...</span>
          </div>
        ) : svgHtml ? (
          <div className="w-full space-y-2">
            <div
              ref={containerRef}
              className="mermaid-svg-container w-full flex justify-center [&>svg]:max-w-full [&>svg]:h-auto"
              dangerouslySetInnerHTML={{ __html: svgHtml }}
            />
            {wasAutoFixed && onFixCode && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <Sparkles className="w-3 h-3" />
                  Syntax auto-corrected (unquoted symbols & delimiters fixed).
                </span>
                <button
                  type="button"
                  onClick={() => onFixCode(activeCode)}
                  className="px-2.5 py-1 rounded bg-indigo-500 hover:bg-indigo-600 text-white font-medium transition-colors cursor-pointer text-[10px]"
                >
                  Save Fix to Notebook Note
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full text-center py-5 space-y-3">
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4" />
              <span>Mermaid Diagram Syntax Issue Detected</span>
            </div>

            <pre className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-left text-xs font-mono inline-block max-w-full overflow-x-auto text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700">
              {activeCode}
            </pre>

            {renderError && (
              <p className="text-[11px] text-slate-500 max-w-md mx-auto italic">
                {renderError}
              </p>
            )}

            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleManualAutoFix}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium shadow-xs transition-colors cursor-pointer"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>Auto-Fix Special Characters</span>
              </button>

              <button
                type="button"
                onClick={handleGenerateFallbackBlueprint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer text-slate-700 dark:text-slate-300"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>Reset to Clean Blueprint</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Parses markdown notes text, separating standard text from ```mermaid blocks
 */
export const MermaidContentRenderer: React.FC<{
  content: string;
  className?: string;
  onUpdateContent?: (newContent: string) => void;
}> = ({
  content,
  className = '',
  onUpdateContent,
}) => {
  const mermaidRegex = /(?:```|````)mermaid\s*([\s\S]*?)(?:```|````)/g;

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let blockIndex = 0;

  const handleFixBlock = (originalCode: string, fixedCode: string) => {
    if (!onUpdateContent) return;
    const targetBlock = `\`\`\`mermaid\n${originalCode.trim()}\n\`\`\``;
    const replacementBlock = `\`\`\`mermaid\n${fixedCode.trim()}\n\`\`\``;

    if (content.includes(targetBlock)) {
      onUpdateContent(content.replace(targetBlock, replacementBlock));
    } else {
      // Fallback: replace by matching trimmed content
      const regex = new RegExp(`(?:\`\`\`|\`\`\`\`)mermaid\\s*${escapeRegExp(originalCode.trim())}\\s*(?:\`\`\`|\`\`\`\`)`, 'g');
      onUpdateContent(content.replace(regex, replacementBlock));
    }
  };

  while ((match = mermaidRegex.exec(content)) !== null) {
    const matchStart = match.index;
    const matchEnd = mermaidRegex.lastIndex;

    // Text prior to the mermaid block
    if (matchStart > lastIndex) {
      const textChunk = content.substring(lastIndex, matchStart);
      elements.push(
        <div key={`text-${blockIndex}`} className="whitespace-pre-wrap leading-relaxed">
          {textChunk}
        </div>
      );
    }

    // Mermaid block
    const mermaidCode = match[1];
    elements.push(
      <MermaidDiagram
        key={`mermaid-${blockIndex}`}
        id={`diagram-${blockIndex}`}
        code={mermaidCode}
        onFixCode={onUpdateContent ? (fixed) => handleFixBlock(mermaidCode, fixed) : undefined}
      />
    );

    lastIndex = matchEnd;
    blockIndex++;
  }

  // Trailing text chunk
  if (lastIndex < content.length) {
    const textChunk = content.substring(lastIndex);
    elements.push(
      <div key={`text-${blockIndex}`} className="whitespace-pre-wrap leading-relaxed">
        {textChunk}
      </div>
    );
  }

  return <div className={`space-y-2 ${className}`}>{elements}</div>;
};

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
