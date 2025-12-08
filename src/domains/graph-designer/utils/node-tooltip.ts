import type { Core } from 'cytoscape';
import { getNodeType } from './node-data-extractor';
import type { SchemaInfo } from './node-data-extractor';

export interface SchemaConfig {
  id: string;
  label: string;
  color: string;
  icon?: string;
}

export interface NodeTypeConfig {
  id: string;
  label: string;
  color: string;
  icon?: string;
}

export interface RelationTypeConfig {
  id: string;
  label: string;
  color: string;
  icon?: string;
}

/**
 * Manages the node type tooltip for Cytoscape graphs
 */
export class NodeTooltipManager {
  private tooltip: HTMLElement | null = null;
  private cy: Core;
  private schemas: SchemaInfo[];
  private schemasConfig?: SchemaConfig[];
  private nodeTypesConfig?: NodeTypeConfig[];
  private relationTypesConfig?: RelationTypeConfig[];

  constructor(
    cy: Core, 
    schemas: SchemaInfo[] = [], 
    schemasConfig?: SchemaConfig[], 
    nodeTypesConfig?: NodeTypeConfig[],
    relationTypesConfig?: RelationTypeConfig[]
  ) {
    this.cy = cy;
    this.schemas = schemas;
    this.schemasConfig = schemasConfig;
    this.nodeTypesConfig = nodeTypesConfig;
    this.relationTypesConfig = relationTypesConfig;
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
  show(nodeType: string, x: number, y: number, nodeData?: any): void {
    const tip = this.createTooltip();
    
    // Build tooltip content
    const parts: string[] = [];
    
    // Add schema if available
    if (nodeData?.schemaId && this.schemasConfig) {
      const schema = this.schemasConfig.find(s => s.id === nodeData.schemaId);
      if (schema) {
        parts.push(`Schema: ${schema.label}`);
      }
    }
    
    // Add type if available
    if (nodeData?.nodeTypeId && this.nodeTypesConfig) {
      const type = this.nodeTypesConfig.find(t => t.id === nodeData.nodeTypeId);
      if (type) {
        parts.push(`Type: ${type.label}`);
      }
    }
    
    // Fallback to nodeType if no config available
    if (parts.length === 0) {
      parts.push(`Type: ${nodeType}`);
    }
    
    tip.textContent = parts.join(' • ');
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
        this.show(nodeType, originalEvent.clientX, originalEvent.clientY, data);
      } else {
        // Fallback to node position
        const position = node.renderedPosition();
        const container = this.cy.container();
        if (container) {
          const containerRect = container.getBoundingClientRect();
          this.show(nodeType, position.x + containerRect.left, position.y + containerRect.top, data);
        }
      }
    });

    // Hide tooltip when mouse leaves a node
    this.cy.on('mouseout', 'node', () => {
      this.hide();
    });

    // Edge hover handler - show tooltip with relation label
    this.cy.on('mouseover', 'edge', (event) => {
      const edge = event.target;
      const data = edge.data() as any;
      const relationTypeId = data.relationTypeId;
      
      // Get relation type label if available
      let tooltipText = 'Relation';
      if (relationTypeId && this.relationTypesConfig) {
        const relationType = this.relationTypesConfig.find(rt => rt.id === relationTypeId);
        if (relationType) {
          tooltipText = relationType.label;
        } else {
          tooltipText = `Relation: ${relationTypeId}`;
        }
      } else if (relationTypeId) {
        tooltipText = `Relation: ${relationTypeId}`;
      }
      
      const tip = this.createTooltip();
      tip.textContent = tooltipText;
      
      const originalEvent = event.originalEvent as MouseEvent;
      if (originalEvent) {
        tip.style.left = `${originalEvent.clientX + 10}px`;
        tip.style.top = `${originalEvent.clientY - 30}px`;
        tip.style.display = 'block';
      }
    });

    // Hide tooltip when mouse leaves edge
    this.cy.on('mouseout', 'edge', () => {
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
  updateSchemas(
    schemas: SchemaInfo[], 
    schemasConfig?: SchemaConfig[], 
    nodeTypesConfig?: NodeTypeConfig[],
    relationTypesConfig?: RelationTypeConfig[]
  ): void {
    this.schemas = schemas;
    this.schemasConfig = schemasConfig;
    this.nodeTypesConfig = nodeTypesConfig;
    this.relationTypesConfig = relationTypesConfig;
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

