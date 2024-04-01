<script lang="ts">
  import { onMount, onDestroy } from "svelte";

  interface ImageInfo {
    img_element: HTMLImageElement;
    x: number;
    y: number;
    width: number;
    height: number;
    handles: HandleInfo[];
  }

  interface HandleInfo {
    x: number;
    y: number;
    size: number;
    cursor: HandleCursor;
    corner: Corner;
  }
  type HandleCursor = "nwse-resize" | "nesw-resize";
  type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null;
  let images: ImageInfo[] = [];
  let isDragging: boolean = false;
  let selectedImage: ImageInfo | null = null;
  let offsetX: number, offsetY: number;
  let isResizing: boolean = false;
  let activeHandle: HandleInfo | null = null;

  onMount(() => {
    ctx = canvas.getContext("2d");
    resizeCanvas(); // Set initial size
    window.addEventListener("resize", resizeCanvas); // Adjust on window resize
    window.addEventListener("keydown", handleKeyDown);
  });

  // Cleanup to prevent memory leaks
  onDestroy(() => {
    window.removeEventListener("resize", resizeCanvas);
    window.removeEventListener("keydown", handleKeyDown);
  });

  function resizeCanvas() {
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      drawImages(); // Redraw images to fit new dimensions
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Backspace" || event.key === "Delete") {
      const selectedImageIndex = selectedImage
        ? images.indexOf(selectedImage)
        : -1;
      if (selectedImageIndex !== -1) {
        // Remove the selected image
        images.splice(selectedImageIndex, 1);
        drawImages(); // Redraw the canvas to reflect the removal
      }
      // Prevent the default action of backspace to navigate back
      event.preventDefault();
    }
  }

  function handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const img_element = new Image();
      img_element.onload = () => {
        if (ctx) {
          images.push({
            img_element,
            x: 10,
            y: 10,
            width: img_element.width,
            height: img_element.height,
            handles: [],
          });
          drawImages();
        }
      };
      img_element.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);

    input.value = "";
  }

  function updateHandlePositions(image: ImageInfo) {
    const size = 20; // Size of the square handle
    image.handles = [
      {
        x: image.x - size / 2,
        y: image.y - size / 2,
        size,
        cursor: "nwse-resize",
        corner: "top-left",
      },
      {
        x: image.x + image.width - size / 2,
        y: image.y - size / 2,
        size,
        cursor: "nesw-resize",
        corner: "top-right",
      },
      {
        x: image.x - size / 2,
        y: image.y + image.height - size / 2,
        size,
        cursor: "nesw-resize",
        corner: "bottom-left",
      },
      {
        x: image.x + image.width - size / 2,
        y: image.y + image.height - size / 2,
        size,
        cursor: "nwse-resize",
        corner: "bottom-right",
      },
    ];
  }

  function drawImages() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    images.forEach((image) => {
      if (!ctx) return;
      ctx.drawImage(
        image.img_element,
        image.x,
        image.y,
        image.width,
        image.height
      );
      if (image === selectedImage) {
        // draw border
        ctx.strokeStyle = "pink";
        ctx.lineWidth = 5; // Adjust for desired border thickness
        ctx.strokeRect(image.x, image.y, image.width, image.height);

        updateHandlePositions(image);
        image.handles.forEach((handle) => {
          if (!ctx) return;
          ctx.fillStyle = "blue";
          ctx.fillRect(handle.x, handle.y, handle.size, handle.size);
        });
      }
    });
  }

  function cursorIsOverImage(
    mousePos: { x: number; y: number },
    image: ImageInfo
  ) {
    return (
      mousePos.x > image.x &&
      mousePos.x < image.x + image.width &&
      mousePos.y > image.y &&
      mousePos.y < image.y + image.height
    );
  }

  function onCanvasMouseDown(event: MouseEvent) {
    const mousePos = getMousePos(canvas, event);
    let interactionFound = false; // Flag to check if an image or handle is interacted with

    images.forEach((image) => {
      // Check for handle click first
      image.handles.forEach((handle) => {
        if (
          mousePos.x >= handle.x &&
          mousePos.x <= handle.x + handle.size &&
          mousePos.y >= handle.y &&
          mousePos.y <= handle.y + handle.size
        ) {
          interactionFound = true;
          isResizing = true;
          activeHandle = handle;
          selectedImage = image;
          return;
        }
      });

      if (!interactionFound) {
        // Check for image click
        if (cursorIsOverImage(mousePos, image) && !isResizing) {
          interactionFound = true;
          isDragging = true;
          selectedImage = image;
          offsetX = mousePos.x - image.x;
          offsetY = mousePos.y - image.y;
        }
      }
    });

    if (!interactionFound) {
      selectedImage = null;
    }

    drawImages(); // Redraw to reflect changes
  }

  function getMousePos(canvas: HTMLCanvasElement, evt: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top,
    };
  }

  function onCanvasMouseMove(event: MouseEvent) {
    // Check if the mouse is over any of the images
    const mousePos = getMousePos(canvas, event);

    // Set cursor style
    canvas.style.cursor = "default";
    images.forEach((image) => {
      if (cursorIsOverImage(mousePos, image)) {
        canvas.style.cursor = "pointer";
      }

      if (image === selectedImage) {
        image.handles.forEach((handle) => {
          if (
            mousePos.x >= handle.x &&
            mousePos.x <= handle.x + handle.size &&
            mousePos.y >= handle.y &&
            mousePos.y <= handle.y + handle.size
          ) {
            // If over a handle, change the cursor based on the handle's cursor property.
            canvas.style.cursor = handle.cursor;
          }
        });
      }
    });

    if (isResizing && activeHandle && selectedImage) {
      const originalWidth = selectedImage.width;
      const originalHeight = selectedImage.height;
      const aspectRatio = originalWidth / originalHeight;

      let newWidth, newHeight;

      // Calculate the distance moved in both x and y directions
      let dx = mousePos.x - selectedImage.x;
      let dy = mousePos.y - selectedImage.y;

      switch (activeHandle.corner) {
        case "top-left":
          newWidth = originalWidth - dx;
          newHeight = newWidth / aspectRatio;
          selectedImage.x = mousePos.x;
          selectedImage.y = selectedImage.y + originalHeight - newHeight;
          break;
        case "top-right":
          newWidth = dx;
          newHeight = newWidth / aspectRatio;
          selectedImage.y = selectedImage.y + originalHeight - newHeight;
          break;
        case "bottom-left":
          newWidth = originalWidth - dx;
          newHeight = newWidth / aspectRatio;
          selectedImage.x = mousePos.x;
          break;
        case "bottom-right":
          newWidth = dx;
          newHeight = newWidth / aspectRatio;
          break;
      }

      // Apply the new dimensions while preserving aspect ratio
      if (newWidth > 0 && newHeight > 0) {
        selectedImage.width = newWidth;
        selectedImage.height = newHeight;
        updateHandlePositions(selectedImage);
        drawImages();
      }
    } else if (isDragging && selectedImage) {
      selectedImage.x = mousePos.x - offsetX;
      selectedImage.y = mousePos.y - offsetY;
      updateHandlePositions(selectedImage);
      drawImages();
    }
  }

  function stopDrag() {
    if (isResizing) {
      // Reset resizing state
      isResizing = false;
      activeHandle = null;
    }
    if (isDragging) {
      // Reset dragging state
      isDragging = false;
      selectedImage = null;
    }
  }

  function handleUploadClick() {
    const fileInput = document.getElementById("fileInput");
    fileInput?.click(); // Programmatically trigger the file input click
  }
</script>

<body>
  <div class="canvas-container">
    <canvas
      bind:this={canvas}
      style="width: 100vw; height: 100vh;"
      on:mousedown={onCanvasMouseDown}
      on:mousemove={onCanvasMouseMove}
      on:mouseup={stopDrag}
      on:mouseout={stopDrag}
      on:blur={stopDrag}
    >
    </canvas>
    <div class="toolbar">
      <button on:click={handleUploadClick}>Upload</button>
      <!-- Trigger hidden file input -->
      <input
        type="file"
        accept="image/*"
        on:change={handleFileChange}
        id="fileInput"
        hidden
      />
      <button>Button 2</button>
      <button>Button 3</button>
    </div>
  </div>
</body>

<style>
  /* Removes margin around the body, which prevents unnecessary scrolling */
  body {
    margin: 0;
    overflow: hidden; /* Optional: Prevents scrollbars */
  }

  /* Ensures the canvas fills the entire screen */
  canvas {
    display: block; /* Removes the default inline-block behavior */
    width: 100vw;
    height: 100vh;
    background-color: #fff; /* Optional: Sets a background color */
  }

  .canvas-container {
    position: relative;
    width: 100vw;
    height: 100vh;
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }

  .toolbar {
    position: absolute;
    top: 10px;
    right: 10px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    background-color: rgba(255, 255, 255, 0.8); /* Semi-transparent white */
    padding: 10px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .toolbar button {
    cursor: pointer;
  }
</style>
