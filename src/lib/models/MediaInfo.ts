// src/lib/models/MediaInfo.ts
export interface HandleInfo {
  x: number;
  y: number;
  size: number;
  cursor: "nwse-resize" | "nesw-resize";
  corner: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}

export abstract class MediaInfo {
  constructor(
    public x: number,
    public y: number,
    public width: number,
    public height: number,
    public handles: HandleInfo[] = []
  ) {}

  public z = 0;

  // Method to draw the media itself; to be implemented by subclasses
  abstract draw(ctx: CanvasRenderingContext2D, x?: number, y?: number): void;

  drawBorderAndHandles(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = "pink";
    ctx.lineWidth = 5; // Adjust for desired border thickness
    ctx.strokeRect(this.x, this.y, this.width, this.height);

    this.handles.forEach((handle) => {
      ctx.fillStyle = "blue";
      ctx.fillRect(handle.x, handle.y, handle.size, handle.size);
    });
  }

  // Method to update handle positions; useful after transformations like resize
  updateHandlePositions(): void {
    const handleSize = 20; // Example fixed size for handles
    this.handles = [
      {
        x: this.x - handleSize / 2,
        y: this.y - handleSize / 2,
        size: handleSize,
        cursor: "nwse-resize",
        corner: "top-left",
      },
      {
        x: this.x + this.width - handleSize / 2,
        y: this.y - handleSize / 2,
        size: handleSize,
        cursor: "nesw-resize",
        corner: "top-right",
      },
      {
        x: this.x - handleSize / 2,
        y: this.y + this.height - handleSize / 2,
        size: handleSize,
        cursor: "nesw-resize",
        corner: "bottom-left",
      },
      {
        x: this.x + this.width - handleSize / 2,
        y: this.y + this.height - handleSize / 2,
        size: handleSize,
        cursor: "nwse-resize",
        corner: "bottom-right",
      },
    ];
  }
}
