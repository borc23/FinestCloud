/**
 * Custom Google Maps overlay for rendering realistic solar panels with cell grid pattern
 */
export class SolarPanelOverlay extends google.maps.OverlayView {
  private bounds: google.maps.LatLngBounds;
  private div: HTMLDivElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private moduleType: string;
  private isSelected: boolean = false;
  private isHovered: boolean = false;

  constructor(bounds: google.maps.LatLngBounds, moduleType: string = 'STANDARD') {
    super();
    this.bounds = bounds;
    this.moduleType = moduleType;
  }

  onAdd() {
    this.div = document.createElement('div');
    this.div.style.position = 'absolute';
    this.div.style.pointerEvents = 'auto';
    this.div.style.cursor = 'pointer';

    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.div.appendChild(this.canvas);

    const panes = this.getPanes();
    panes?.overlayLayer.appendChild(this.div);
  }

  draw() {
    if (!this.div || !this.canvas) return;

    const overlayProjection = this.getProjection();
    if (!overlayProjection) return;

    const sw = overlayProjection.fromLatLngToDivPixel(this.bounds.getSouthWest());
    const ne = overlayProjection.fromLatLngToDivPixel(this.bounds.getNorthEast());

    if (!sw || !ne) return;

    const width = Math.abs(ne.x - sw.x);
    const height = Math.abs(ne.y - sw.y);

    this.div.style.left = Math.min(sw.x, ne.x) + 'px';
    this.div.style.top = Math.min(sw.y, ne.y) + 'px';
    this.div.style.width = width + 'px';
    this.div.style.height = height + 'px';

    // Set canvas resolution for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';

    this.renderSolarPanel();
  }

  private renderSolarPanel() {
    if (!this.canvas) return;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    const width = this.canvas.width;
    const height = this.canvas.height;
    const dpr = window.devicePixelRatio || 1;

    ctx.scale(dpr, dpr);

    // Base panel colors with subtle gradients
    const baseColors: Record<string, string> = {
      STANDARD: '#1a2332',
      PREMIUM: '#0f1419',
      COMPACT: '#1f2937'
    };

    const baseColor = baseColors[this.moduleType] || baseColors.STANDARD;

    // Draw base panel with subtle gradient
    const gradient = ctx.createLinearGradient(0, 0, width / dpr, height / dpr);
    gradient.addColorStop(0, this.lightenColor(baseColor, 5));
    gradient.addColorStop(0.5, baseColor);
    gradient.addColorStop(1, this.darkenColor(baseColor, 5));

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width / dpr, height / dpr);

    // Draw solar cell grid
    this.drawCellGrid(ctx, width / dpr, height / dpr);

    // Draw border/frame
    this.drawFrame(ctx, width / dpr, height / dpr);
  }

  private drawCellGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {
    // Determine grid layout (6x10 cells is typical for residential panels)
    const cols = 6;
    const rows = 10;
    const cellPadding = 2;

    const cellWidth = (width - cellPadding * (cols + 1)) / cols;
    const cellHeight = (height - cellPadding * (rows + 1)) / rows;

    ctx.strokeStyle = this.isSelected ? '#546e7a' : '#2c3e50';
    ctx.lineWidth = this.isSelected ? 1.5 : 0.8;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = cellPadding + col * (cellWidth + cellPadding);
        const y = cellPadding + row * (cellHeight + cellPadding);

        // Cell background with slight variation
        const cellGradient = ctx.createLinearGradient(x, y, x + cellWidth, y + cellHeight);
        cellGradient.addColorStop(0, 'rgba(60, 80, 100, 0.15)');
        cellGradient.addColorStop(1, 'rgba(20, 30, 40, 0.15)');

        ctx.fillStyle = cellGradient;
        ctx.fillRect(x, y, cellWidth, cellHeight);

        // Cell border
        ctx.strokeRect(x, y, cellWidth, cellHeight);

        // Add subtle diagonal lines for realism (busbar simulation)
        if (col % 2 === 0) {
          ctx.strokeStyle = 'rgba(150, 170, 190, 0.1)';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(x + cellWidth * 0.3, y);
          ctx.lineTo(x + cellWidth * 0.3, y + cellHeight);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x + cellWidth * 0.7, y);
          ctx.lineTo(x + cellWidth * 0.7, y + cellHeight);
          ctx.stroke();
        }
      }
    }
  }

  private drawFrame(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const frameWidth = this.isSelected ? 2.5 : 1.5;

    // Outer frame
    ctx.strokeStyle = this.isSelected ? '#546e7a' : '#2c3e50';
    ctx.lineWidth = frameWidth;
    ctx.strokeRect(frameWidth / 2, frameWidth / 2, width - frameWidth, height - frameWidth);

    // Add subtle highlight on top edge for 3D effect
    const highlightGradient = ctx.createLinearGradient(0, 0, 0, 5);
    highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
    highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = highlightGradient;
    ctx.fillRect(0, 0, width, 5);

    // Add subtle shadow on bottom edge
    const shadowGradient = ctx.createLinearGradient(0, height - 5, 0, height);
    shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
    ctx.fillStyle = shadowGradient;
    ctx.fillRect(0, height - 5, width, 5);
  }

  private lightenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
  }

  private darkenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
    const B = Math.max(0, (num & 0x0000FF) - amt);
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
  }

  setSelected(selected: boolean) {
    this.isSelected = selected;
    this.renderSolarPanel();
  }

  setHovered(hovered: boolean) {
    this.isHovered = hovered;
    this.renderSolarPanel();
  }

  onRemove() {
    if (this.div && this.div.parentNode) {
      this.div.parentNode.removeChild(this.div);
      this.div = null;
      this.canvas = null;
    }
  }
}
