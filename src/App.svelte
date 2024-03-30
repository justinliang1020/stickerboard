<script lang="ts">
  import { onMount, onDestroy } from "svelte";

  interface ImageInfo {
    img: HTMLImageElement;
    x: number;
    y: number;
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
  });

  // Cleanup to prevent memory leaks
  onDestroy(() => {
    window.removeEventListener("resize", resizeCanvas);
  });

  function resizeCanvas() {
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      drawImages(); // Redraw images to fit new dimensions
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
          images.push({ img, x: 10, y: 10 }); // Initial position
          drawImages();
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  function drawImages() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    images.forEach(({ img, x, y }) => {
      if (!ctx) return;
      ctx.drawImage(img, x, y);
    });
  }

  function startDrag(event: MouseEvent) {
    const mouseX = event.clientX - canvas.offsetLeft;
    const mouseY = event.clientY - canvas.offsetTop;
    images.forEach((image) => {
      if (
        mouseX > image.x &&
        mouseX < image.x + image.img.width &&
        mouseY > image.y &&
        mouseY < image.y + image.img.height
      ) {
        isDragging = true;
        draggedImage = image;
        offsetX = mouseX - image.x;
        offsetY = mouseY - image.y;
      }
    });
  }

  function doDrag(event: MouseEvent) {
    if (!isDragging || !draggedImage) return;
    const mouseX = event.clientX - canvas.offsetLeft;
    const mouseY = event.clientY - canvas.offsetTop;
    draggedImage.x = mouseX - offsetX;
    draggedImage.y = mouseY - offsetY;
    drawImages();
  }

  function stopDrag() {
    isDragging = false;
    draggedImage = null;
  }
</script>

<body>
  <canvas
    bind:this={canvas}
    style="width: 100vw; height: 100vh;"
    on:mousedown={startDrag}
    on:mousemove={doDrag}
    on:mouseup={stopDrag}
    on:mouseout={stopDrag}
    on:blur={stopDrag}
  >
  </canvas>
  <input type="file" accept="image/*" on:change={handleFileChange} />
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
</style>
