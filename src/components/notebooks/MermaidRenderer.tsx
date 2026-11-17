import React, { useEffect, useRef, useState } from 'react';
import { Copy, Check, Eye, Code, GitFork, RefreshCw } from 'lucide-react';

interface MermaidDiagramProps {
  code: string;
  id: string;
}

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ code, id }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgHtml, setSvgHtml] = useState<string>('');
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [isRendering, setIsRendering] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const renderDiagram = async () => {
      setIsRendering(true);
      setRenderError(null);

      // Check if mermaid is available on window
      const mermaid = (window as any).mermaid;
      if (!mermaid) {
        // Fallback if CDN is not ready yet or offline
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

        const cleanCode = code.trim();
        const renderId = `mermaid-${id.replace(/[^a-zA-Z0-9_-]/g, '_')}-${Math.floor(Math.random() * 10000)}`;
        const { svg } = await mermaid.render(renderId, cleanCode);

        if (isMounted) {
          setSvgHtml(svg);
          setRenderError(null);
          setIsRendering(false);
        }
      } catch (err: any) {
        console.warn('Mermaid render issue:', err);
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
  }, [code, id]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="my-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/90 shadow-sm overflow-hidden text-slate-800 dark:text-slate-200" style={{ lineHeight: 'normal' }}>
      {/* Diagram Action Bar */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-slate-100/90 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
          <GitFork className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Interactive Mermaid Diagram</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCode(!showCode)}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
            title="Toggle diagram definition code"
          >
            {showCode ? <Eye className="w-3 h-3" /> : <Code className="w-3 h-3" />}
            <span>{showCode ? 'View Diagram' : 'View Code'}</span>
          </button>

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
          <code>{code}</code>
        </pre>
      )}

      {/* SVG Canvas or Fallback */}
      <div className="p-4 overflow-x-auto flex items-center justify-center min-h-[140px] bg-slate-50/50 dark:bg-slate-900/50">
        {isRendering ? (
          <div className="flex items-center gap-2 text-xs text-slate-500 py-6">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
            <span>Rendering diagram vector geometry...</span>
          </div>
        ) : svgHtml ? (
          <div
            ref={containerRef}
            className="mermaid-svg-container w-full flex justify-center [&>svg]:max-w-full [&>svg]:h-auto"
            dangerouslySetInnerHTML={{ __html: svgHtml }}
          />
        ) : (
          <div className="w-full text-center py-4 space-y-2">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Visual Architecture Blueprint
            </div>
            <pre className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-left text-xs font-mono inline-block max-w-full overflow-x-auto text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700">
              {code}
            </pre>
            {renderError && (
              <p className="text-[10px] text-slate-500 italic">
                Note: {renderError}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Parses markdown notes text, separating standard text from ```mermaid blocks
 */
export const MermaidContentRenderer: React.FC<{ content: string; className?: string }> = ({
  content,
  className = '',
}) => {
  // Regex to match ```mermaid ... ``` or ````mermaid ... ```` blocks
  const mermaidRegex = /(?:```|````)mermaid\s*([\s\S]*?)(?:```|````)/g;

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let blockIndex = 0;

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
