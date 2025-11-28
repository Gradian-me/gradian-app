import type { Core } from 'cytoscape';
import { getNodeType } from './node-data-extractor';
import type { SchemaInfo } from './node-data-extractor';

/**
 * Manages the node type tooltip for Cytoscape graphs
 */
export class NodeTooltipManager {
  private tooltip: HTMLElement | null = null;
  private cy: Core;
  private schemas: SchemaInfo[];

  constructor(cy: Core, schemas: SchemaInfo[] = []) {
    this.cy = cy;
    this.schemas = schemas;
  }

  /**
   * Creates the tooltip element if it doesn't exist
   */
  private createTooltip(): HTMLElement {
    if (!this.tooltip) {
      this.tooltip = document.createElement('div');
      this.tooltip.className = 'node-type-tooltip';
      this.tooltip.style.cssText = `
        position: fixed;
        background: rgba(0, 0, 0, 0.85);
        color: white;
        padding: 6px 10px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
        pointer-events: none;
        z-index: 10000;
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        display: none;
      `;
      document.body.appendChild(this.tooltip);
    }
    return this.tooltip;
  }

  /**
   * Hides the tooltip
   */
  hide(): void {
    if (this.tooltip) {
      this.tooltip.style.display = 'none';
    }
  }

  /**
   * Shows the tooltip with node type information
   */
  show(nodeType: string, x: number, y: number): void {
    const tip = this.createTooltip();
    tip.textContent = `Type: ${nodeType}`;
    tip.style.left = `${x + 10}px`;
    tip.style.top = `${y - 30}px`;
    tip.style.display = 'block';
  }

  /**
   * Updates the tooltip position
   */
  updatePosition(x: number, y: number): void {
    if (this.tooltip && this.tooltip.style.display === 'block') {
      this.tooltip.style.left = `${x + 10}px`;
      this.tooltip.style.top = `${y - 30}px`;
    }
  }

  /**
   * Sets up event handlers for tooltip display
   */
  setupEventHandlers(): void {
    // Node hover handler - show tooltip with type
    this.cy.on('mouseover', 'node', (event) => {
      const node = event.target;
      const data = node.data() as any;
      const nodeType = getNodeType(data, this.schemas);
      
      // Get mouse position from the original event
      const originalEvent = event.originalEvent as MouseEvent;
      if (originalEvent) {
        this.show(nodeType, originalEvent.clientX, originalEvent.clientY);
      } else {
        // Fallback to node position
        const position = node.renderedPosition();
        const container = this.cy.container();
        if (container) {
          const containerRect = container.getBoundingClientRect();
          this.show(nodeType, position.x + containerRect.left, position.y + containerRect.top);
        }
      }
    });

    // Hide tooltip when mouse leaves a node
    this.cy.on('mouseout', 'node', () => {
      this.hide();
    });

    // Hide tooltip when mouse moves over canvas background
    this.cy.on('mouseover', 'edge', () => {
      this.hide();
    });

    // Hide tooltip when mouse leaves the canvas entirely
    this.cy.on('mouseout', () => {
      this.hide();
    });

    // Track mouse movement to update tooltip position
    this.cy.on('mousemove', 'node', (event) => {
      const originalEvent = event.originalEvent as MouseEvent;
      if (originalEvent) {
        this.updatePosition(originalEvent.clientX, originalEvent.clientY);
      }
    });
  }

  /**
   * Updates the schemas used for node type resolution
   */
  updateSchemas(schemas: SchemaInfo[]): void {
    this.schemas = schemas;
  }

  /**
   * Cleans up the tooltip element
   */
  destroy(): void {
    if (this.tooltip) {
      this.tooltip.remove();
      this.tooltip = null;
    }
  }
}

