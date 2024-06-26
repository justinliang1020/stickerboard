<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { ImageInfo } from "./lib/models/ImageInfo";
  import { MediaInfo, type HandleInfo } from "./lib/models/MediaInfo";
  import frierenImage from "./assets/frieren-blogroll.jpeg";
  import {
    handleSegmentClick,
    copyMaskedRegionToNewImage,
    resetScribbles,
  } from "./lib/segment";
  import { scale } from "svelte/transition";
  import { createTempCanvasForImage } from "./lib/utils";

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null;
  let medias: MediaInfo[] = [];
  let isDragging: boolean = false;
  let selectedMedia: MediaInfo | null = null;
  let offsetX: number, offsetY: number;
  let isResizing: boolean = false;
  let activeHandle: HandleInfo | null = null;
  let actionsToolbar: HTMLDivElement;
  let segmentMode = false;
  let canvasSegmentation: HTMLCanvasElement | undefined;

  function tick() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawMedias();
    updateActionsToolbar();
  }
  $: medias, tick();
  $: selectedMedia, tick();
  $: canvas, tick();
  $: segmentMode, resetScribbles(canvasSegmentation);

  onMount(() => {
    if (
      /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(
        navigator.userAgent.toLowerCase()
      )
    ) {
      alert("NOTE: sticker functionality is not yet ready for mobile use :(");
    }

    ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingQuality = "high";
    resizeCanvas(); // Set initial size
    window.addEventListener("resize", resizeCanvas); // Adjust on window resize
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("paste", handlePaste); // Listen for paste events
    canvas.addEventListener("dragover", handleDragOver); // Allows us to drop
    canvas.addEventListener("dragenter", handleDragEnter); // Optional: Visual cue
    canvas.addEventListener("dragleave", handleDragLeave); // Optional: Reset visual cue
    canvas.addEventListener("drop", handleDrop); // Handle file drop

    // add default image
    addImageToCanvas(frierenImage, 100, 100);

    function resizeCanvas() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function handleKeyDown(event: KeyboardEvent) {
      switch (true) {
        case event.key === "Backspace" || event.key === "Delete":
          deleteSelectedMedia();
          event.preventDefault();
          break;
        case (event.ctrlKey || event.metaKey) && event.key === "c":
          copySelectedImageToClipboard();
          event.preventDefault();
          break;
        case (event.ctrlKey || event.metaKey) && event.key === "x":
          copySelectedImageToClipboard();
          deleteSelectedMedia();
          event.preventDefault();
          break;
        case event.key === "Escape":
          selectedMedia = null;
          event.preventDefault();
          break;
      }
    }

    function handlePaste(event: ClipboardEvent) {
      const items = event.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf("image") !== -1) {
            const file = items[i].getAsFile();
            if (!file) return;
            readFileAndDisplay(file);
          }
        }
      }
    }

    function handleDragOver(event: DragEvent) {
      event.preventDefault(); // Necessary to allow dropping
      canvas.style.backgroundColor = "rgba(173, 216, 230, 0.5)"; // Light blue color with some transparency
    }

    function handleDragEnter(event: DragEvent) {
      event.preventDefault();
    }

    function handleDragLeave(event: DragEvent) {
      event.preventDefault();
      canvas.style.backgroundColor = "";
    }

    function handleDrop(event: DragEvent) {
      event.preventDefault();
      const file = event.dataTransfer?.files[0];
      if (file) {
        readFileAndDisplay(file);
      }
      canvas.style.backgroundColor = "";
    }
    return () => {
      window.removeEventListener("resize", resizeCanvas); // Adjust on window resize
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("paste", handlePaste); // Listen for paste events
      canvas.removeEventListener("dragover", handleDragOver); // Allows us to drop
      canvas.removeEventListener("dragenter", handleDragEnter); // Optional: Visual cue
      canvas.removeEventListener("dragleave", handleDragLeave); // Optional: Reset visual cue
      canvas.removeEventListener("drop", handleDrop); // Handle file drop
    };
  });

  function handleButtonFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    const file = input.files[0];
    readFileAndDisplay(file);

    input.value = "";
  }

  function deleteSelectedMedia() {
    if (!selectedMedia) return;

    const index = medias.findIndex((media) => media === selectedMedia);
    if (index !== -1) {
      medias = [...medias.slice(0, index), ...medias.slice(index + 1)];
      selectedMedia = null;
    }
  }

  async function downloadSelectedMedia() {
    // TODO: refactor to support gif
    if (!selectedMedia || !ctx || !(selectedMedia instanceof ImageInfo)) return;

    const tempCanvas = createTempCanvasForImage(selectedMedia);

    // Convert the temporary canvas to a Blob, then create a URL for downloading
    tempCanvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);

      // Create an anchor (<a>) element to facilitate downloading
      const downloadLink = document.createElement("a");
      downloadLink.href = url;
      downloadLink.download = "downloaded-image.png"; // Set the default filename for the download

      // Append the anchor to the document temporarily and trigger the download
      document.body.appendChild(downloadLink);
      downloadLink.click();

      // Clean up by revoking the blob URL and removing the anchor from the document
      URL.revokeObjectURL(url);
      document.body.removeChild(downloadLink);
    }, "image/png");
  }

  async function downloadCanvas() {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);

      // Create an anchor (<a>) element to facilitate downloading
      const downloadLink = document.createElement("a");
      downloadLink.href = url;
      downloadLink.download = "downloaded-image.png"; // Set the default filename for the download

      // Append the anchor to the document temporarily and trigger the download
      document.body.appendChild(downloadLink);
      downloadLink.click();

      // Clean up by revoking the blob URL and removing the anchor from the document
      URL.revokeObjectURL(url);
      document.body.removeChild(downloadLink);
    }, "image/png");
  }

  function addImageToCanvas(imageSrc: string, x: number = 10, y: number = 10) {
    const img_element = new Image();
    img_element.src = imageSrc; // Set the source of the image to trigger the load
    img_element.onload = () => {
      let width = img_element.width;
      let height = img_element.height;
      if (
        img_element.width > canvas.width ||
        img_element.height > canvas.height
      ) {
        const scale_factor = Math.max(
          (img_element.width * 1.3) / canvas.width,
          (img_element.height * 1.3) / canvas.height
        );
        console.log(scale_factor);
        width = width / scale_factor;
        height = height / scale_factor;
      }
      if (ctx) {
        // Assuming your ImageInfo constructor takes parameters for x, y, width, height, and the image element
        const imageInfo = new ImageInfo(x, y, width, height, img_element);
        medias = [...medias, imageInfo];
      }
    };
  }

  function readFileAndDisplay(file: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      addImageToCanvas(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function copySelectedImageToClipboard() {
    if (!selectedMedia || !ctx || !(selectedMedia instanceof ImageInfo)) return;

    // Create a temporary canvas with dimensions matching the selected image
    const tempCanvas = createTempCanvasForImage(selectedMedia);

    tempCanvas.toBlob((blob) => {
      if (!blob) return;
      navigator.clipboard
        .write([new ClipboardItem({ "image/png": blob })])
        .then(() => console.log("Image copied to clipboard"))
        .catch((err) =>
          console.error("Error copying image to clipboard:", err)
        );
    }, "image/png");
  }

  function drawMedias() {
    if (!ctx) return;
    medias.forEach((media) => {
      if (!ctx) return;
      media.draw(ctx);
      if (media === selectedMedia) {
        media.updateHandlePositions();
        media.drawBorderAndHandles(ctx);
      }
    });
  }

  function cursorIsOverMedia(
    mousePos: { x: number; y: number },
    image: MediaInfo
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
    segmentMode = false;

    for (let i = medias.length - 1; i >= 0; i--) {
      // Check for handle click first
      medias[i].handles.forEach((handle) => {
        if (
          mousePos.x >= handle.x &&
          mousePos.x <= handle.x + handle.size &&
          mousePos.y >= handle.y &&
          mousePos.y <= handle.y + handle.size
        ) {
          interactionFound = true;
          isResizing = true;
          activeHandle = handle;
          selectedMedia = medias[i];
          return;
        }
      });

      // Check for image click
      if (cursorIsOverMedia(mousePos, medias[i]) && !isResizing) {
        interactionFound = true;
        isDragging = true;
        selectedMedia = medias[i];
        offsetX = mousePos.x - medias[i].x;
        offsetY = mousePos.y - medias[i].y;
        return;
      }
    }

    if (!interactionFound) {
      selectedMedia = null;
    }
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
    medias.forEach((image) => {
      if (cursorIsOverMedia(mousePos, image)) {
        canvas.style.cursor = "pointer";
      }

      if (image === selectedMedia) {
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

    if (isResizing && activeHandle && selectedMedia) {
      const originalWidth = selectedMedia.width;
      const originalHeight = selectedMedia.height;
      const aspectRatio = originalWidth / originalHeight;

      let newWidth, newHeight;

      // Calculate the distance moved in both x and y directions
      let dx = mousePos.x - selectedMedia.x;
      let dy = mousePos.y - selectedMedia.y;

      switch (activeHandle.corner) {
        case "top-left":
          newWidth = originalWidth - dx;
          newHeight = newWidth / aspectRatio;
          selectedMedia.x = mousePos.x;
          selectedMedia.y = selectedMedia.y + originalHeight - newHeight;
          break;
        case "top-right":
          newWidth = dx;
          newHeight = newWidth / aspectRatio;
          selectedMedia.y = selectedMedia.y + originalHeight - newHeight;
          break;
        case "bottom-left":
          newWidth = originalWidth - dx;
          newHeight = newWidth / aspectRatio;
          selectedMedia.x = mousePos.x;
          break;
        case "bottom-right":
          newWidth = dx;
          newHeight = newWidth / aspectRatio;
          break;
      }

      // Apply the new dimensions while preserving aspect ratio
      if (newWidth > 0 && newHeight > 0) {
        selectedMedia.width = newWidth;
        selectedMedia.height = newHeight;
        selectedMedia.updateHandlePositions();
      }
    } else if (isDragging && selectedMedia) {
      selectedMedia.x = mousePos.x - offsetX;
      selectedMedia.y = mousePos.y - offsetY;
      selectedMedia.updateHandlePositions();
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
    }
  }

  function handleUploadClick() {
    const fileInput = document.getElementById("fileInput");
    fileInput?.click(); // Programmatically trigger the file input click
  }

  function handleSendToBack() {
    if (!selectedMedia) return;

    const index = medias.indexOf(selectedMedia);
    if (index > 0) {
      const item = medias[index];
      medias = [item, ...medias.slice(0, index), ...medias.slice(index + 1)];
    }
  }

  function updateActionsToolbar() {
    if (selectedMedia) {
      const { x, y } = selectedMedia; // Assume these are the top-left coordinates of the image
      const actionsDivHeight = actionsToolbar.offsetHeight; // Get the height of the actions div
      // Position the div above the image, adjusting by its height so it doesn't overlap
      actionsToolbar.style.left = `${x}px`;
      actionsToolbar.style.top = `${y - actionsDivHeight - 10}px`; // 10px gap above the image
      actionsToolbar.style.display = "block"; // Make it visible
    } else {
      actionsToolbar.style.display = "none"; // Hide it if no image is selected
    }
  }

  function enableSegmentMode() {
    segmentMode = true;
  }

  function disableSegmentMode() {
    segmentMode = false;
    selectedMedia = null;
  }

  function handleSegmentClickWrapper(event: MouseEvent) {
    if (!(selectedMedia instanceof ImageInfo)) return;
    handleSegmentClick(event, selectedMedia);
  }

  function createSticker(event: MouseEvent) {
    if (!(selectedMedia instanceof ImageInfo)) return;
    let newImageURL = copyMaskedRegionToNewImage(selectedMedia);
    if (!newImageURL) return;
    addImageToCanvas(newImageURL, 10, 10);
  }

  function resetSegmentation(event: MouseEvent) {
    resetScribbles(canvasSegmentation);
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
      on:pointerdown={onCanvasMouseDown}
      on:pointermove={onCanvasMouseMove}
      on:pointerup={stopDrag}
      on:pointerout={stopDrag}
      on:blur={stopDrag}
    >
    </canvas>
    {#if selectedMedia && segmentMode}
      <canvas
        class="canvas-segmentation"
        style="position: absolute; left: {selectedMedia.x}px; top: {selectedMedia.y}px; width: {selectedMedia.width}px; height: {selectedMedia.height}px; background-color: rgba(0, 50, 0, 0.15);"
        bind:this={canvasSegmentation}
        on:click={handleSegmentClickWrapper}
        on:pointerdown={handleSegmentClickWrapper}
      ></canvas>
    {/if}
    {#if !segmentMode}
      <div
        class="floating-actions"
        bind:this={actionsToolbar}
        style="display: none;"
      >
        <button on:click={handleSendToBack}>Send To Back</button>
        <button on:click={enableSegmentMode}>Enter Sticker Mode</button>
        <button on:click={deleteSelectedMedia}>Delete Image</button>
        <button on:click={downloadSelectedMedia}>Download</button>
      </div>
    {:else}
      <div
        class="floating-actions"
        bind:this={actionsToolbar}
        style="display: none;"
      >
        <button on:click={disableSegmentMode}>Exit Sticker Mode</button>
        <button on:click={resetSegmentation}>Reset Sticker</button>
        <button on:click={createSticker}>Create Sticker</button>
      </div>
    {/if}
    <div class="toolbar">
      <button on:click={handleUploadClick}>Upload</button>
      <button on:click={downloadCanvas}>Download Canvas</button>
      <a href="https://twitter.com/justinliang1020">made by justin</a>
      <!-- Trigger hidden file input -->
      <input
        type="file"
        accept="image/*"
        on:change={handleButtonFileChange}
        id="fileInput"
        hidden
      />
    </div>
  </div>
</body>

<style>
  /* Removes margin around the body, which prevents unnecessary scrolling */
  body {
    margin: 0;
    overflow: hidden; /* Optional: Prevents scrollbars */
    touch-action: none;
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

  .floating-actions {
    position: absolute;
    z-index: 10; /* Ensure it appears above the canvas */
    background-color: #f9f9f9; /* Example background */
    border: 1px solid #ccc; /* Example border */
    border-radius: 5px; /* Rounded corners */
    padding: 5px; /* Some padding */
    display: flex; /* For button alignment */
    gap: 5px; /* Gap between buttons */
  }
</style>
