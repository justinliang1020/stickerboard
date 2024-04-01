// src/lib/models/ImageInfo.ts
import { MediaInfo } from "./MediaInfo";

export class ImageInfo extends MediaInfo {
  public img_element: HTMLImageElement;

  constructor(
    x: number,
    y: number,
    width: number,
    height: number,
    img_element: HTMLImageElement
  ) {
    super(x, y, width, height);
    this.img_element = img_element;
    this.updateHandlePositions(); // Initialize handles based on image dimensions
  }

  // Concrete implementation for drawing an image
  draw(ctx: CanvasRenderingContext2D): void {
    if (!ctx) return;
    ctx.drawImage(this.img_element, this.x, this.y, this.width, this.height);
  }
}
