// Copyright 2023 The MediaPipe Authors.

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//      http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import {
  InteractiveSegmenter,
  FilesetResolver,
  MPMask,
} from "@mediapipe/tasks-vision";

import { ImageInfo } from "./models/ImageInfo";
import { createTempCanvasForImage } from "./utils";

let interactiveSegmenter: InteractiveSegmenter;
let mask: MPMask | undefined;
interface Scribble {
  x: number;
  y: number;
}
let scribbles: Scribble[] = [];

// Before we can use InteractiveSegmenter class we must wait for it to finish
// loading. Machine Learning models can be large and take a moment to
// get everything needed to run.
const createSegmenter = async () => {
  const filesetResolver = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm"
  );
  interactiveSegmenter = await InteractiveSegmenter.createFromOptions(
    filesetResolver,
    {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/interactive_segmenter/magic_touch/float32/1/magic_touch.tflite`,
        delegate: "GPU",
      },
      outputCategoryMask: true,
      outputConfidenceMasks: false,
    }
  );
};
createSegmenter();
console.log("model Coaded");

export async function handleSegmentClick(
  //@ts-ignore
  event,
  imageInfo: ImageInfo
) {
  if (!interactiveSegmenter) {
    alert("InteractiveSegmenter still loading. Try again shortly.");
    return;
  }

  const canvas = event.target as HTMLCanvasElement;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    alert("oops no canvas context on segment");
    return;
  }

  // scale the image and use that for segmentation
  const tempCanvas = createTempCanvasForImage(imageInfo)

  scribbles.push({
    x: event.offsetX / event.target.width,
    y: event.offsetY / event.target.height,
  });

  interactiveSegmenter.segment(
    tempCanvas,
    {
      scribble: scribbles,
    },
    (result) => {
      mask = result.categoryMask;
      drawSegmentation(canvas, ctx);
      drawClickPoint(ctx, event);
    }
  );
}

export function resetScribbles(canvas: HTMLCanvasElement | undefined) {
  if (!canvas) return;
  // reset canvas and scribbles
  scribbles = [];
  let ctx = canvas.getContext("2d");
  ctx?.clearRect(0, 0, canvas.width, canvas.height);
  console.log("reset scribbles")
}

function drawClickPoint(ctx: CanvasRenderingContext2D, event: MouseEvent) {
  console.log(ctx);
  console.log(event.offsetY);
  console.log(event.offsetX);
  ctx.fillStyle = "rgba(255, 181, 203, 0.7)";
  const squareSize = 5;
  ctx.fillRect(event.offsetX - squareSize, event.offsetY - squareSize, squareSize * 2, squareSize * 2)
}

function drawSegmentation(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
) {
  if (mask === undefined) {
    alert("oops no MPMask returned");
    return;
  }
  const width = mask.width;
  const height = mask.height;
  const maskData = mask.getAsFloat32Array();
  canvas.width = width;
  canvas.height = height;

  console.log("Start visualization");

  ctx.fillStyle = "#00000000";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "rgba(18, 181, 203, 0.7)";

  //@ts-ignore
  maskData.map((category, index) => {
    if (Math.round(category * 255.0) === 0) {
      const x = (index + 1) % width;
      const y = (index + 1 - x) / width;
      ctx.fillRect(x, y, 1, 1);
    }
  });
}

export function copyMaskedRegionToNewImage(imageInfo: ImageInfo) {
  // Apply the segmentation mask
  if (mask === undefined) {
    console.error("No mask available for copying.");
    return;
  }

  // given a mask and an image, create a new imageInfo with the sticker
  const newCanvas = document.createElement("canvas");
  newCanvas.width = imageInfo.width;
  newCanvas.height = imageInfo.height;
  const newCtx = newCanvas.getContext("2d");

  if (!newCtx) {
    alert("oops no newtx in copyMaskedRegion");
    return;
  }
  // Draw the original image onto the new canvas
  newCtx.drawImage(
    imageInfo.img_element,
    0,
    0,
    imageInfo.width,
    imageInfo.height
  );

  const maskData = mask.getAsFloat32Array();
  const imgData = newCtx.getImageData(0, 0, mask.width, mask.height);

  // Iterate over the mask data and make non-segmented pixels transparent
  for (let i = 0; i < maskData.length; i++) {
    // If the mask value indicates non-segmented area, make the pixel transparent
    if (Math.round(maskData[i] * 255.0) !== 0) {
      imgData.data[i * 4 + 3] = 0; // Set alpha to 0 (transparent)
    }
  }

  // Put the modified image data back onto the canvas
  newCtx.putImageData(imgData, 0, 0);

  // Optionally, add the new canvas to the DOM or use it further in your application
  // document.body.appendChild(newCanvas); // For example, add it to the document body

  // Convert the canvas content to a data URL
  const dataURL = newCanvas.toDataURL();

  return dataURL;
}
