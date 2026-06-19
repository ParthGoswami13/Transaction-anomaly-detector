import { useRef, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

export default function FraudGraphView({ nodes = [], links = [] }) {
  const graphRef = useRef();

  useEffect(() => {
    if (graphRef.current) {
      graphRef.current.d3Force('charge').strength(-200);
    }
  }, []);

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-[var(--text-muted)]">
        <div className="text-center">
          <p className="text-lg font-medium">No graph data available</p>
          <p className="text-sm mt-1">Transaction network will render here once data is loaded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border-color)] overflow-hidden bg-[var(--bg-secondary)]">
      <ForceGraph2D
        ref={graphRef}
        graphData={{ nodes, links }}
        width={800}
        height={500}
        backgroundColor="transparent"
        nodeAutoColorBy="group"
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={1}
        linkColor={() => 'rgba(99, 102, 241, 0.3)'}
        linkWidth={1.5}
        nodeRelSize={6}
        nodeLabel={(node) => `${node.id}\nRisk: ${node.riskScore ?? 'N/A'}`}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const label = node.id?.slice(-6) || '?';
          const fontSize = 10 / globalScale;
          const radius = node.riskScore
            ? 4 + node.riskScore * 8
            : 5;

          // Node circle
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
          ctx.fillStyle = node.riskScore > 0.7
            ? '#ef4444'
            : node.riskScore > 0.4
            ? '#f59e0b'
            : node.group === 'merchant'
            ? '#8b5cf6'
            : '#6366f1';
          ctx.fill();

          // Glow for high risk
          if (node.riskScore > 0.7) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius + 3, 0, 2 * Math.PI);
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();
          }

          // Label
          ctx.font = `${fontSize}px Inter, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#e2e8f0';
          ctx.fillText(label, node.x, node.y + radius + fontSize + 2);
        }}
      />
    </div>
  );
}
