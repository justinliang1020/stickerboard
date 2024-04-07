import type { ImageInfo } from "./models/ImageInfo";

export function createTempCanvasForImage(imageInfo: ImageInfo): HTMLCanvasElement {
  // scale the image and use that for segmentation
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = imageInfo.width; // or scaled dimensions if you're scaling
  tempCanvas.height = imageInfo.height;
  const tempCtx = tempCanvas.getContext("2d");

  tempCtx?.drawImage(
    imageInfo.img_element,
    0,
    0,
    imageInfo.width,
    imageInfo.height
  );
  return tempCanvas;
}
