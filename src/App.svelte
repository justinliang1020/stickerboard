<script lang="ts">
  import { onMount, onDestroy } from "svelte";

  interface ImageInfo {
    img: HTMLImageElement;
    x: number;
    y: number;
    clicked: boolean;
  }

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null;
  let images: ImageInfo[] = [];
  let isDragging: boolean = false;
  let draggedImage: ImageInfo | null = null;
  let offsetX: number, offsetY: number;

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
      const selectedImageIndex = images.findIndex((image) => image.clicked);
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
      const img = new Image();
      img.onload = () => {
        if (ctx) {
          images.push({ img, x: 10, y: 10, clicked: false }); // Initial position
          drawImages();
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);

    input.value = "";
  }

  function drawImages() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    images.forEach(({ img, x, y, clicked }) => {
      if (!ctx) return;
      ctx.drawImage(img, x, y);
      if (clicked) {
        ctx.strokeStyle = "pink";
        ctx.lineWidth = 5; // Adjust for desired border thickness
        ctx.strokeRect(x, y, img.width, img.height);
      }
    });
  }

  function startDrag(event: MouseEvent) {
    const mousePos = getMousePos(canvas, event);
    let imageFound = false; // Flag to check if an image is found under the click
    images.forEach((image) => {
      if (
        mousePos.x > image.x &&
        mousePos.x < image.x + image.img.width &&
        mousePos.y > image.y &&
        mousePos.y < image.y + image.img.height
      ) {
        imageFound = true;
        if (image.clicked === false) {
          image.clicked = true;
        }

        // Prepare for dragging
        isDragging = true;
        draggedImage = image;
        offsetX = mousePos.x - image.x;
        offsetY = mousePos.y - image.y;
      } else {
        // Unclick other images
        image.clicked = false;
      }
    });

    if (!imageFound) {
      images.forEach((image) => (image.clicked = false)); // Unclick all if clicked on empty space
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

    const isOverImage = images.some((image) => {
      return (
        mousePos.x > image.x &&
        mousePos.x < image.x + image.img.width &&
        mousePos.y > image.y &&
        mousePos.y < image.y + image.img.height
      );
    });

    canvas.style.cursor = isOverImage ? "pointer" : "default";
    if (!isDragging || !draggedImage) return;
    draggedImage.x = mousePos.x - offsetX;
    draggedImage.y = mousePos.y - offsetY;
    drawImages();
  }

  function stopDrag() {
    isDragging = false;
    draggedImage = null;
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
      on:mousedown={startDrag}
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
