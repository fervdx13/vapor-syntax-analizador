/**
 * ============================================================================
 * VAPOR-SYNTAX // AST VISUALIZER (ÁRBOL DE SINTAXIS ABSTRACTA)
 * Renderizador interactivo en SVG con estética Vaporwave/Outrun neón.
 * Incluye cálculo de jerarquía, Pan & Zoom, y exportación a SVG/PNG.
 * Cátedra: Lenguajes y Autómatas I
 * ============================================================================
 */

class ASTVisualizer {
  constructor(svgElement, viewportElement) {
    this.svg = svgElement;
    this.viewport = viewportElement;
    this.transformGroup = document.getElementById('astTransformGroup');
    this.rootNode = null;
    this.nodeCount = 0;

    // Estado de transformación (Pan & Zoom)
    this.scale = 1;
    this.translateX = 0;
    this.translateY = 0;
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;

    // Configuración geométrica de los nodos
    this.nodeWidth = 140;
    this.nodeHeight = 52;
    this.verticalSpacing = 85;
    this.horizontalSpacing = 24;

    this.initEvents();
  }

  // Inicializa eventos del mouse para Pan & Zoom
  initEvents() {
    this.viewport.addEventListener('mousedown', (e) => {
      // Ignorar si se hace clic en botones
      if (e.target.closest('button')) return;
      this.isDragging = true;
      this.startX = e.clientX - this.translateX;
      this.startY = e.clientY - this.translateY;
      this.viewport.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      this.translateX = e.clientX - this.startX;
      this.translateY = e.clientY - this.startY;
      this.updateTransform();
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.viewport.style.cursor = 'grab';
    });

    // Zoom con rueda del mouse
    this.viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
      this.zoomAt(zoomFactor, e.clientX, e.clientY);
    }, { passive: false });
  }

  // Aplica zoom centrado en un punto
  zoomAt(factor, clientX, clientY) {
    const rect = this.viewport.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;

    const newScale = Math.min(Math.max(this.scale * factor, 0.2), 3.5);
    
    // Ajustar traslación para que el punto bajo el mouse permanezca estable
    this.translateX = mouseX - (mouseX - this.translateX) * (newScale / this.scale);
    this.translateY = mouseY - (mouseY - this.translateY) * (newScale / this.scale);
    this.scale = newScale;

    this.updateTransform();
  }

  zoomIn() {
    const rect = this.viewport.getBoundingClientRect();
    this.zoomAt(1.2, rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  zoomOut() {
    const rect = this.viewport.getBoundingClientRect();
    this.zoomAt(0.83, rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  // Actualiza la matriz de transformación SVG
  updateTransform() {
    if (this.transformGroup) {
      this.transformGroup.setAttribute(
        'transform',
        `translate(${this.translateX}, ${this.translateY}) scale(${this.scale})`
      );
    }
  }

  /**
   * Renderiza un nuevo AST completo en el SVG
   */
  render(astRoot) {
    this.rootNode = astRoot;
    this.nodeCount = 0;
    this.transformGroup.innerHTML = '';

    if (!astRoot) {
      const nodesBadge = document.getElementById('astNodesCount');
      if (nodesBadge) nodesBadge.textContent = '0 nodos generados';
      return;
    }

    // 1. Calcular dimensiones del subárbol recursivamente
    this.layoutTree = this.computeLayout(astRoot, 0);

    // 2. Centrar coordenadas x de los nodos
    this.assignCoordinates(this.layoutTree, 0);

    // 3. Dibujar enlaces curvos luminosos y nodos
    const linksGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    linksGroup.setAttribute('class', 'ast-links-layer');

    const nodesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    nodesGroup.setAttribute('class', 'ast-nodes-layer');

    this.drawTree(this.layoutTree, linksGroup, nodesGroup);

    this.transformGroup.appendChild(linksGroup);
    this.transformGroup.appendChild(nodesGroup);

    // Actualizar métrica en UI
    const nodesBadge = document.getElementById('astNodesCount');
    if (nodesBadge) {
      nodesBadge.textContent = `${this.nodeCount} nodos generados`;
    }

    // 4. Centrar y ajustar vista automáticamente
    this.fitView(this.layoutTree);
  }

  /**
   * Paso 1: Calcula anchos de cada subárbol
   */
  computeLayout(node, depth) {
    this.nodeCount++;
    const layoutNode = {
      ast: node,
      depth: depth,
      width: this.nodeWidth,
      height: this.nodeHeight,
      subtreeWidth: 0,
      x: 0,
      y: depth * this.verticalSpacing + 40,
      children: []
    };

    if (node.children && node.children.length > 0) {
      let totalChildrenWidth = 0;
      for (const child of node.children) {
        if (!child) continue;
        const childLayout = this.computeLayout(child, depth + 1);
        layoutNode.children.push(childLayout);
        totalChildrenWidth += childLayout.subtreeWidth + this.horizontalSpacing;
      }
      totalChildrenWidth -= this.horizontalSpacing; // restar último espacio
      layoutNode.subtreeWidth = Math.max(layoutNode.width, totalChildrenWidth);
    } else {
      layoutNode.subtreeWidth = layoutNode.width;
    }

    return layoutNode;
  }

  /**
   * Paso 2: Asigna posiciones x absolutas
   */
  assignCoordinates(layoutNode, leftBound) {
    layoutNode.x = leftBound + layoutNode.subtreeWidth / 2;

    let currentLeft = leftBound;
    for (const child of layoutNode.children) {
      this.assignCoordinates(child, currentLeft);
      currentLeft += child.subtreeWidth + this.horizontalSpacing;
    }
  }

  /**
   * Retorna los colores de relleno y borde neón según la categoría del nodo
   */
  getNodeStyle(type) {
    switch (type) {
      case 'Program':
        return { fill: 'rgba(0, 245, 212, 0.22)', stroke: '#00f5d4' };

      case 'VarDeclGroup':
      case 'VarDecl':
      case 'FunctionDecl':
      case 'Parameters':
      case 'Param':
        return { fill: 'rgba(155, 93, 229, 0.25)', stroke: '#9b5de5' };

      case 'Assignment':
      case 'PrintStatement':
      case 'ReturnStatement':
        return { fill: 'rgba(254, 228, 64, 0.22)', stroke: '#fee440' };

      case 'IfStatement':
      case 'ThenBranch':
      case 'ElseBranch':
      case 'WhileStatement':
      case 'DoWhileStatement':
      case 'ForStatement':
      case 'ForInit':
      case 'ForCondition':
      case 'ForUpdate':
      case 'LoopBody':
      case 'Block':
        return { fill: 'rgba(255, 42, 133, 0.25)', stroke: '#ff2a85' };

      case 'BinaryExpr':
      case 'AdditiveExpr':
      case 'MultiplicativeExpr':
      case 'RelationalExpr':
      case 'EqualityExpr':
      case 'LogicalAnd':
      case 'LogicalOr':
      case 'UnaryExpr':
      case 'PostfixExpr':
      case 'FunctionCall':
      case 'Arguments':
      case 'ArrayAccess':
        return { fill: 'rgba(0, 187, 249, 0.25)', stroke: '#00bbf9' };

      case 'Identifier':
      case 'Literal':
      case 'GroupedExpr':
      default:
        return { fill: 'rgba(255, 255, 255, 0.12)', stroke: '#f3f0ff' };
    }
  }

  /**
   * Paso 3: Dibuja enlaces y nodos en SVG
   */
  drawTree(layoutNode, linksGroup, nodesGroup) {
    const parentX = layoutNode.x;
    const parentY = layoutNode.y + layoutNode.height;

    for (const child of layoutNode.children) {
      const childX = child.x;
      const childY = child.y;

      // Línea curva Bezier cúbica con resplandor neón
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const midY = (parentY + childY) / 2;
      const d = `M ${parentX} ${parentY} C ${parentX} ${midY}, ${childX} ${midY}, ${childX} ${childY}`;
      path.setAttribute('d', d);
      path.setAttribute('class', 'ast-link');
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'url(#gradLink)');
      path.setAttribute('stroke-width', '2.5');
      path.setAttribute('opacity', '0.9');
      linksGroup.appendChild(path);

      this.drawTree(child, linksGroup, nodesGroup);
    }

    // Dibujar el nodo actual
    this.drawNode(layoutNode, nodesGroup);
  }

  /**
   * Genera el grupo SVG de un nodo individual con estilo Neón e incrustación de estilos
   */
  drawNode(layoutNode, nodesGroup) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const x = layoutNode.x - layoutNode.width / 2;
    const y = layoutNode.y;

    const nodeType = layoutNode.ast.type || 'Node';
    g.setAttribute('class', `ast-node ast-node-${nodeType}`);
    g.setAttribute('transform', `translate(${x}, ${y})`);

    const style = this.getNodeStyle(nodeType);

    // Rectángulo del nodo con bordes redondeados y colores neón incrustados
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('class', 'ast-node-rect');
    rect.setAttribute('width', layoutNode.width);
    rect.setAttribute('height', layoutNode.height);
    rect.setAttribute('rx', '8');
    rect.setAttribute('ry', '8');
    rect.setAttribute('fill', style.fill);
    rect.setAttribute('stroke', style.stroke);
    rect.setAttribute('stroke-width', '2');

    // Título del tipo de nodo con color y tipografía incrustada
    const titleText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    titleText.setAttribute('class', 'ast-node-title');
    titleText.setAttribute('x', layoutNode.width / 2);
    titleText.setAttribute('y', 20);
    titleText.setAttribute('fill', '#ffffff');
    titleText.setAttribute('font-family', "'Orbitron', 'Space Grotesk', sans-serif");
    titleText.setAttribute('font-size', '11');
    titleText.setAttribute('font-weight', '700');
    titleText.setAttribute('text-anchor', 'middle');
    titleText.textContent = this.formatNodeType(nodeType);

    // Detalle o valor del nodo con color y tipografía incrustada
    const detailText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    detailText.setAttribute('class', 'ast-node-detail');
    detailText.setAttribute('x', layoutNode.width / 2);
    detailText.setAttribute('y', 38);
    detailText.setAttribute('fill', '#fee440');
    detailText.setAttribute('font-family', "'JetBrains Mono', monospace");
    detailText.setAttribute('font-size', '10');
    detailText.setAttribute('font-weight', '600');
    detailText.setAttribute('text-anchor', 'middle');
    detailText.textContent = this.formatNodeDetail(layoutNode.ast);

    g.appendChild(rect);
    g.appendChild(titleText);
    g.appendChild(detailText);

    // Tooltip informativo al pasar el cursor
    const titleElem = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    titleElem.textContent = `Tipo: ${nodeType}\nAtributos: ${JSON.stringify(layoutNode.ast.attributes, null, 2)}`;
    g.appendChild(titleElem);

    nodesGroup.appendChild(g);
  }

  // Traduce o embellece nombres de tipos de nodos
  formatNodeType(type) {
    const map = {
      'Program': '⚡ PROGRAMA',
      'VarDeclGroup': '📦 DECLARACIÓN',
      'VarDecl': '🔑 VARIABLE',
      'IfStatement': '🔀 CONDICIONAL IF',
      'ThenBranch': '↳ ENTONCES',
      'ElseBranch': '↳ SINO',
      'WhileStatement': '🔄 CICLO WHILE',
      'DoWhileStatement': '🔄 CICLO DO-WHILE',
      'ForStatement': '🔁 CICLO FOR',
      'ForInit': '↳ INIT',
      'ForCondition': '↳ CONDICIÓN',
      'ForUpdate': '↳ ACTUALIZACIÓN',
      'LoopBody': '↳ CUERPO BUCLE',
      'Block': '📂 BLOQUE {}',
      'Assignment': '📝 ASIGNACIÓN',
      'AdditiveExpr': '➕ EXPR SUMA',
      'MultiplicativeExpr': '✖️ EXPR MULT',
      'RelationalExpr': '⚖️ RELACIONAL',
      'EqualityExpr': '⚖️ IGUALDAD',
      'LogicalAnd': '🔗 LÓGICO AND',
      'LogicalOr': '🔗 LÓGICO OR',
      'UnaryExpr': '⚡ UNARIO',
      'PostfixExpr': '⚡ POSTFIJO',
      'FunctionDecl': '⚙️ FUNCIÓN',
      'Parameters': '📋 PARÁMETROS',
      'Param': '🏷️ PARÁMETRO',
      'FunctionCall': '📞 LLAMADA',
      'Arguments': '📋 ARGUMENTOS',
      'PrintStatement': '🖨️ PRINT',
      'ReturnStatement': '↩️ RETURN',
      'Identifier': '🏷️ IDENTIFICADOR',
      'Literal': '💎 LITERAL',
      'GroupedExpr': '() AGRUPACIÓN'
    };
    return map[type] || type;
  }

  // Genera el texto secundario de un nodo (valor, operador o variable)
  formatNodeDetail(astNode) {
    const attrs = astNode.attributes || {};
    if (attrs.name) return attrs.type ? `${attrs.name}: ${attrs.type}` : attrs.name;
    if (attrs.operator) return `op: '${attrs.operator}'`;
    if (attrs.value !== undefined) return String(attrs.value);
    if (attrs.callee) return `fn: ${attrs.callee}()`;
    if (attrs.type) return `tipo: ${attrs.type}`;
    return '';
  }

  /**
   * Centra y escala el árbol para encajar perfectamente en la ventana
   */
  fitView(layoutRoot = this.layoutTree) {
    if (!layoutRoot) {
      if (this.rootNode) {
        this.layoutTree = this.computeLayout(this.rootNode, 0);
        this.assignCoordinates(this.layoutTree, 0);
        layoutRoot = this.layoutTree;
      } else {
        return;
      }
    }

    const viewportRect = this.viewport.getBoundingClientRect();
    const vWidth = Math.max(viewportRect.width || 0, this.viewport.clientWidth || 0, 700);
    const vHeight = Math.max(viewportRect.height || 0, this.viewport.clientHeight || 0, 480);

    // Configurar dimensiones y viewBox dinámico en el SVG
    this.svg.setAttribute('width', '100%');
    this.svg.setAttribute('height', '100%');
    this.svg.setAttribute('viewBox', `0 0 ${vWidth} ${vHeight}`);

    const treeWidth = layoutRoot.subtreeWidth + 120;
    const maxDepth = this.getMaxDepth(layoutRoot);
    const treeHeight = maxDepth * this.verticalSpacing + this.nodeHeight + 120;

    const scaleX = vWidth / treeWidth;
    const scaleY = vHeight / treeHeight;
    this.scale = Math.min(Math.min(scaleX, scaleY) * 0.9, 1.2);
    if (this.scale < 0.2) this.scale = 0.2;

    this.translateX = (vWidth - treeWidth * this.scale) / 2 + 60 * this.scale;
    this.translateY = 30;

    this.updateTransform();
  }

  getMaxDepth(layoutNode) {
    let max = layoutNode.depth;
    for (const child of layoutNode.children) {
      max = Math.max(max, this.getMaxDepth(child));
    }
    return max;
  }

  /**
   * Obtiene la caja delimitadora real (Bounding Box) de todos los nodos y enlaces
   */
  getTreeBBox() {
    if (this.transformGroup) {
      try {
        const bbox = this.transformGroup.getBBox();
        if (bbox && bbox.width > 0 && bbox.height > 0) {
          return {
            x: bbox.x,
            y: bbox.y,
            width: bbox.width,
            height: bbox.height
          };
        }
      } catch (err) {
        console.warn("Aviso al calcular getBBox del AST:", err);
      }
    }

    // Respaldo geométrico si getBBox no está disponible
    if (this.layoutTree) {
      const treeWidth = this.layoutTree.subtreeWidth + 140;
      const maxDepth = this.getMaxDepth(this.layoutTree);
      const treeHeight = maxDepth * this.verticalSpacing + this.nodeHeight + 100;
      return {
        x: this.layoutTree.x - this.layoutTree.subtreeWidth / 2 - 20,
        y: 20,
        width: treeWidth,
        height: treeHeight
      };
    }

    return { x: 0, y: 0, width: 800, height: 600 };
  }

  /**
   * Construye un clon independiente del SVG preparado para exportación sin cortes
   */
  buildExportSvg() {
    const bbox = this.getTreeBBox();
    const margin = 70; // Margen generoso para evitar cualquier corte en ramas derechas o inferiores
    const exportX = Math.floor(bbox.x - margin);
    const exportY = Math.floor(bbox.y - margin);
    const exportWidth = Math.ceil(bbox.width + margin * 2);
    const exportHeight = Math.ceil(bbox.height + margin * 2);

    // Clonar el SVG completo
    const svgClone = this.svg.cloneNode(true);
    svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svgClone.setAttribute('width', exportWidth);
    svgClone.setAttribute('height', exportHeight);
    svgClone.setAttribute('viewBox', `${exportX} ${exportY} ${exportWidth} ${exportHeight}`);

    // Eliminar el transform de Pan/Zoom interactivo del usuario en el clon
    const cloneGroup = svgClone.querySelector('#astTransformGroup');
    if (cloneGroup) {
      cloneGroup.removeAttribute('transform');
    }

    // Insertar fondo sólido Vaporwave #090514
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('x', exportX);
    bgRect.setAttribute('y', exportY);
    bgRect.setAttribute('width', exportWidth);
    bgRect.setAttribute('height', exportHeight);
    bgRect.setAttribute('fill', '#090514');
    svgClone.insertBefore(bgRect, svgClone.firstChild);

    // Incrustar estilos tipográficos y de líneas en defs
    let defs = svgClone.querySelector('defs');
    if (!defs) {
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      svgClone.insertBefore(defs, svgClone.firstChild);
    }

    const styleTag = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    styleTag.textContent = `
      text { font-family: 'Orbitron', 'Space Grotesk', -apple-system, sans-serif; }
      .ast-link { fill: none; stroke: url(#gradLink); stroke-width: 2.5px; opacity: 0.9; }
      .ast-node-title { fill: #ffffff; font-weight: 700; font-size: 11px; text-anchor: middle; }
      .ast-node-detail { fill: #fee440; font-weight: 600; font-size: 10px; font-family: 'JetBrains Mono', monospace; text-anchor: middle; }
    `;
    defs.appendChild(styleTag);

    return {
      svgClone,
      width: exportWidth,
      height: exportHeight,
      serialized: new XMLSerializer().serializeToString(svgClone)
    };
  }

  /**
   * Exporta el lienzo a archivo vectorial SVG
   */
  exportToSvg() {
    if (!this.rootNode) {
      alert("No hay un árbol sintáctico generado para exportar.");
      return;
    }

    const { serialized } = this.buildExportSvg();
    const blob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `VAPOR-SYNTAX_AST_${Date.now()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Exporta el lienzo a archivo de mapa de bits PNG en alta resolución
   */
  exportToPng() {
    if (!this.rootNode) {
      alert("No hay un árbol sintáctico generado para exportar.");
      return;
    }

    const { serialized, width, height } = this.buildExportSvg();
    const img = new Image();
    const svgBlob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const scaleFactor = 2; // Alta resolución (DPI 2x)
      const canvas = document.createElement('canvas');
      canvas.width = width * scaleFactor;
      canvas.height = height * scaleFactor;

      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Relleno de fondo profundo Vaporwave
      ctx.fillStyle = '#090514';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Dibujar imagen SVG completa sin recortes
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `VAPOR-SYNTAX_AST_${Date.now()}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    };

    img.src = url;
  }
}

// Exportar globalmente
window.ASTVisualizer = ASTVisualizer;
