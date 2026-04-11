import { useBoardCanvasLogic } from '@/renderer/BoardCanvasLogic';

export function BoardCanvas(): React.JSX.Element {
  const { canvasRef, containerRef } = useBoardCanvasLogic();

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full flex items-center justify-center"
      style={{ touchAction: 'none' }}
    >
      <canvas
        ref={canvasRef}
        className="block max-h-full max-w-full"
        style={{ willChange: 'transform' }}
      />
    </div>
  );
}
