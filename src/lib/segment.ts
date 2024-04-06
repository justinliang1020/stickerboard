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

let interactiveSegmenter: InteractiveSegmenter;

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
console.log("model loaded");

export async function handleSegmentClick(
  //@ts-ignore
  event,
  image_info: ImageInfo
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
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = image_info.width; // or scaled dimensions if you're scaling
  tempCanvas.height = image_info.height;
  const tempCtx = tempCanvas.getContext("2d");
  if (!tempCtx) {
    alert("oops no temp canvas ctx");
    return;
  }
  tempCtx.drawImage(
    image_info.img_element,
    0,
    0,
    image_info.width,
    image_info.height
  );

  interactiveSegmenter.segment(
    tempCanvas,
    {
      keypoint: {
        x: event.offsetX / event.target.width,
        y: event.offsetY / event.target.height,
      },
    },
    (result) => {
      drawSegmentation(result.categoryMask, canvas, ctx);
      drawClickPoint(ctx, event);
    }
  );
}

function drawClickPoint(ctx: CanvasRenderingContext2D, event: MouseEvent) {
  console.log(ctx);
  console.log(event.offsetY);
  console.log(event.offsetX);
}

function drawSegmentation(
  mask: MPMask | undefined,
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
