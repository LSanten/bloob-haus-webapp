'use strict';

var obsidian = require('obsidian');

class ImageZoomPlugin extends obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.settings = {
      zoomFactor: 0.1
    };
    
    this.currentScale = 1;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.isDragging = false;
    this.dragStartX = 0;        // Added for drag tracking
    this.dragStartY = 0;        // Added for drag tracking
    this.dragDistance = 0;      // Added for drag tracking
    this.justFinishedDrag = false; // Flag to prevent closing after drag
    this.minDragDistance = 5;   // Minimum pixels to consider a drag
    this.overlay = null;
    this.zoomedImage = null;
  }

  async onload() {
    console.log('Loading Image Zoom plugin');
    
    await this.loadSettings();
    
    // Initialize event handlers
    this.clickHandler = this.handleClick.bind(this);
    this.keyHandler = this.handleKeyDown.bind(this);
    this.wheelHandler = this.handleWheel.bind(this);
    this.mouseDownHandler = this.handleMouseDown.bind(this);
    this.mouseMoveHandler = this.handleMouseMove.bind(this);
    this.mouseUpHandler = this.handleMouseUp.bind(this);
    
    // Register click event for images
    document.addEventListener('click', this.clickHandler);
    
    // Add debug log to check if plugin is loaded
    console.log('Image Zoom plugin loaded successfully');
  }
  
  async loadSettings() {
    this.settings = Object.assign({}, this.settings, await this.loadData());
  }
  
  async saveSettings() {
    await this.saveData(this.settings);
  }
  
  handleClick(evt) {
    // Debug log
    console.log('Click detected', evt.target.tagName);
    
    const target = evt.target;
    
    // If overlay is open, check if we need to close it
    if (this.overlay) {
      // Close if:
      // 1. We clicked the overlay background OR the image itself
      // 2. AND we didn't just finish dragging
      if ((target === this.overlay || target === this.zoomedImage) && !this.justFinishedDrag) {
        this.closeFullscreen();
        evt.preventDefault();
        evt.stopPropagation();
      }
      
      // Reset the flag for the next click
      this.justFinishedDrag = false;
      return;
    }
    
    // Check if clicked element is an image
    if (target.tagName === 'IMG') {
      console.log('Image clicked');
      
      // Skip emoji images
      if (target.classList.contains('emoji')) {
        console.log('Skipping emoji image');
        return;
      }
      
      console.log('Opening fullscreen image');
      this.openFullscreenImage(target);
      evt.preventDefault();
      evt.stopPropagation();
    }
  }
  
  handleKeyDown(evt) {
    if (evt.key === 'Escape') {
      this.closeFullscreen();
    }
  }
  
  handleWheel(evt) {
    evt.preventDefault();
    if (!this.zoomedImage) return;
    
    // Get mouse position relative to image
    const rect = this.zoomedImage.getBoundingClientRect();
    const mouseX = evt.clientX - rect.left;
    const mouseY = evt.clientY - rect.top;
    
    // Calculate new scale
    const delta = -Math.sign(evt.deltaY) * this.settings.zoomFactor;
    const newScale = Math.max(0.1, this.currentScale + delta * this.currentScale);
    
    // Calculate transform origin
    const originX = mouseX / rect.width;
    const originY = mouseY / rect.height;
    
    // Apply zoom
    this.zoomedImage.style.transformOrigin = `${originX * 100}% ${originY * 100}%`;
    this.zoomedImage.style.transform = `scale(${newScale})`;
    this.currentScale = newScale;
  }
  
  handleMouseDown(evt) {
    if (!this.zoomedImage || this.currentScale <= 1) return;
    
    this.isDragging = true;
    this.lastMouseX = evt.clientX;
    this.lastMouseY = evt.clientY;
    this.dragStartX = evt.clientX;  // Store initial position
    this.dragStartY = evt.clientY;  // Store initial position
    this.dragDistance = 0;          // Reset drag distance
    this.justFinishedDrag = false;  // Reset drag flag
    this.zoomedImage.style.cursor = 'grabbing';
    evt.preventDefault();
  }
  
  handleMouseMove(evt) {
    if (!this.isDragging || !this.zoomedImage) return;
    
    const dx = evt.clientX - this.lastMouseX;
    const dy = evt.clientY - this.lastMouseY;
    
    // Calculate total drag distance for this drag operation
    const totalDragX = evt.clientX - this.dragStartX;
    const totalDragY = evt.clientY - this.dragStartY;
    this.dragDistance = Math.sqrt(totalDragX * totalDragX + totalDragY * totalDragY);
    
    // Apply translation - using a simpler approach
    const currentTransform = this.zoomedImage.style.transform;
    // Extract current scale if it exists
    const scaleMatch = currentTransform.match(/scale\(([^)]+)\)/);
    const scale = scaleMatch ? scaleMatch[1] : this.currentScale;
    
    // Extract current translate if it exists
    const translateX = parseInt(this.zoomedImage.dataset.translateX || 0) + dx;
    const translateY = parseInt(this.zoomedImage.dataset.translateY || 0) + dy;
    
    // Store current translation in dataset
    this.zoomedImage.dataset.translateX = translateX;
    this.zoomedImage.dataset.translateY = translateY;
    
    // Apply transform
    this.zoomedImage.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    
    this.lastMouseX = evt.clientX;
    this.lastMouseY = evt.clientY;
  }
  
  handleMouseUp() {
    // Check if we've dragged past the minimum threshold
    if (this.dragDistance > this.minDragDistance) {
      this.justFinishedDrag = true;
      console.log(`Finished dragging (distance: ${this.dragDistance}px)`);
    } else {
      this.justFinishedDrag = false;
      console.log(`Not a drag, just a click (distance: ${this.dragDistance}px)`);
    }
    
    this.isDragging = false;
    if (this.zoomedImage) {
      this.zoomedImage.style.cursor = 'zoom-in';
    }
  }
  
  openFullscreenImage(img) {
    // Debug log
    console.log('Creating overlay for image', img.src);
    
    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'image-zoom-overlay';
    
    // Create zoomed image
    this.zoomedImage = document.createElement('img');
    this.zoomedImage.src = img.src;
    this.zoomedImage.className = 'image-zoom-image';
    
    // Reset dataset values
    this.zoomedImage.dataset.translateX = 0;
    this.zoomedImage.dataset.translateY = 0;
    
    this.overlay.appendChild(this.zoomedImage);
    document.body.appendChild(this.overlay);
    
    // Reset zoom state
    this.currentScale = 1;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.isDragging = false;
    
    // Add event listeners
    document.addEventListener('keydown', this.keyHandler);
    this.overlay.addEventListener('wheel', this.wheelHandler, { passive: false });
    this.zoomedImage.addEventListener('mousedown', this.mouseDownHandler);
    document.addEventListener('mousemove', this.mouseMoveHandler);
    document.addEventListener('mouseup', this.mouseUpHandler);
  }
  
  closeFullscreen() {
    if (this.overlay) {
      // Remove event listeners
      document.removeEventListener('keydown', this.keyHandler);
      this.overlay.removeEventListener('wheel', this.wheelHandler);
      if (this.zoomedImage) {
        this.zoomedImage.removeEventListener('mousedown', this.mouseDownHandler);
      }
      document.removeEventListener('mousemove', this.mouseMoveHandler);
      document.removeEventListener('mouseup', this.mouseUpHandler);
      
      // Remove the overlay from DOM
      document.body.removeChild(this.overlay);
      
      // Reset state
      this.overlay = null;
      this.zoomedImage = null;
      this.currentScale = 1;
      this.isDragging = false;
    }
  }
  
  onunload() {
    console.log('Unloading Image Zoom plugin');
    
    // Clean up any remaining event listeners and DOM elements
    if (this.overlay) {
      this.closeFullscreen();
    }
    
    // Remove main click handler
    document.removeEventListener('click', this.clickHandler);
  }
}

module.exports = ImageZoomPlugin;