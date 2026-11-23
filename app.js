/**
 * ============================================================================
 * VAPOR-SYNTAX // APP CONTROLLER
 * Controlador principal de la interfaz de usuario, eventos del editor,
 * sincronización de resaltado, ejecución léxica/sintáctica y visualización de AST.
 * Cátedra: Lenguajes y Autómatas I
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elementos del DOM - Editor
  const codeEditor = document.getElementById('codeEditor');
  const lineNumbers = document.getElementById('lineNumbers');
  const editorHighlights = document.getElementById('editorHighlights');
  const editorWrapper = document.getElementById('editorWrapper');
  const cursorPosition = document.getElementById('cursorPosition');
  const charCount = document.getElementById('charCount');
  const lineCount = document.getElementById('lineCount');
  const fileInput = document.getElementById('fileInput');
  const btnClear = document.getElementById('btnClear');
  const btnAnalyze = document.getElementById('btnAnalyze');

  // Elementos del DOM - Resultados y Diagnóstico
  const analysisStatusBanner = document.getElementById('analysisStatusBanner');
  const bannerIcon = document.getElementById('bannerIcon');
  const bannerTitle = document.getElementById('bannerTitle');
  const bannerSubtitle = document.getElementById('bannerSubtitle');
  const metricTime = document.getElementById('metricTime');
  const metricTokens = document.getElementById('metricTokens');
  const errorBadgeCount = document.getElementById('errorBadgeCount');
  const diagnosticsSummary = document.getElementById('diagnosticsSummary');
  const errorCardsList = document.getElementById('errorCardsList');

  // Elementos del DOM - Pestañas
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const tabBtnAst = document.getElementById('tabBtnAst');

  // Elementos del DOM - Tokens
  const tokensCountLabel = document.getElementById('tokensCountLabel');
  const tokenFilterInput = document.getElementById('tokenFilterInput');
  const tokensTableBody = document.getElementById('tokensTableBody');

  // Elementos del DOM - AST
  const astSvg = document.getElementById('astSvg');
  const astViewport = document.getElementById('astViewport');
  const astPlaceholder = document.getElementById('astPlaceholder');
  const astPlaceholderMsg = document.getElementById('astPlaceholderMsg');
  const btnZoomIn = document.getElementById('btnZoomIn');
  const btnZoomOut = document.getElementById('btnZoomOut');
  const btnFitTree = document.getElementById('btnFitTree');
  const btnExportSvg = document.getElementById('btnExportSvg');
  const btnExportPng = document.getElementById('btnExportPng');

  // Inicializar Visualizador de AST
  const astVisualizer = new ASTVisualizer(astSvg, astViewport);

  // Almacenamiento en memoria de tokens de la última ejecución y AST global
  let lastTokens = [];
  let currentErrors = [];
  let currentAST = null;
  window.currentAST = null;

  // ==========================================================================
  // 1. RESTRICCIÓN ESTRICTA: EL EDITOR INICIA 100% VACÍO
  // ==========================================================================
  codeEditor.value = '';
  updateLineNumbers();
  updateCursorPosition();

  // ==========================================================================
  // 2. EVENTOS DEL EDITOR (SINCRONIZACIÓN, TABULACIÓN, LÍNEAS)
  // ==========================================================================

  // Sincronizar scroll entre textarea, numeración de líneas y capa de resaltado
  codeEditor.addEventListener('scroll', () => {
    lineNumbers.scrollTop = codeEditor.scrollTop;
    editorHighlights.scrollTop = codeEditor.scrollTop;
    editorHighlights.scrollLeft = codeEditor.scrollLeft;
  });

  // Entrada de texto y actualización de métricas
  codeEditor.addEventListener('input', () => {
    updateLineNumbers();
    updateCursorPosition();
    // Limpiar resaltados previos al editar para un flujo iterativo limpio
    clearEditorHighlights();
  });

  // Actualizar indicador de cursor en clics o teclas de navegación
  codeEditor.addEventListener('keyup', updateCursorPosition);
  codeEditor.addEventListener('click', updateCursorPosition);

  // Soporte para tabulación con 4 espacios y atajo Ctrl+Enter
  codeEditor.addEventListener('keydown', (e) => {
    // Atajo de ejecución rápida: Ctrl + Enter o Cmd + Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      runSyntaxAnalysis();
      return;
    }

    // Tab inserta 4 espacios en la posición del cursor
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = codeEditor.selectionStart;
      const end = codeEditor.selectionEnd;
      const tabSpaces = '    ';

      codeEditor.value = codeEditor.value.substring(0, start) + tabSpaces + codeEditor.value.substring(end);
      codeEditor.selectionStart = codeEditor.selectionEnd = start + tabSpaces.length;

      updateLineNumbers();
      updateCursorPosition();
    }
  });

  // Actualiza la numeración de líneas a la izquierda
  function updateLineNumbers() {
    const lines = codeEditor.value.split('\n');
    const count = lines.length;
    let numbersHtml = '';
    for (let i = 1; i <= count; i++) {
      numbersHtml += `${i}\n`;
    }
    lineNumbers.textContent = numbersHtml;
    lineCount.textContent = `${count} línea${count === 1 ? '' : 's'}`;
    charCount.textContent = `${codeEditor.value.length} caracteres`;
  }

  // Actualiza la visualización de Línea y Columna actual del cursor
  function updateCursorPosition() {
    const text = codeEditor.value;
    const cursorPos = codeEditor.selectionStart;
    const textBeforeCursor = text.substring(0, cursorPos);
    const lines = textBeforeCursor.split('\n');
    const currentLine = lines.length;
    const currentCol = lines[lines.length - 1].length + 1;

    cursorPosition.textContent = `Línea: ${currentLine}, Col: ${currentCol}`;
  }

  // ==========================================================================
  // 3. ACCIONES DEL EDITOR: IMPORTAR ARCHIVOS Y LIMPIAR
  // ==========================================================================

  // Importar archivo de código fuente local
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      codeEditor.value = event.target.result;
      updateLineNumbers();
      updateCursorPosition();
      clearEditorHighlights();
      resetResultsPanel();
    };
    reader.readAsText(file);
    fileInput.value = ''; // permitir recargar el mismo archivo si es necesario
  });

  // Limpiar editor
  btnClear.addEventListener('click', () => {
    if (codeEditor.value.length > 0 && !confirm("¿Desea limpiar todo el código del editor?")) {
      return;
    }
    codeEditor.value = '';
    updateLineNumbers();
    updateCursorPosition();
    clearEditorHighlights();
    resetResultsPanel();
  });

  // Restablece el panel de diagnóstico al estado neutro inicial
  function resetResultsPanel() {
    analysisStatusBanner.className = 'status-banner idle';
    bannerIcon.textContent = '🛸';
    bannerTitle.textContent = 'LISTO PARA EL ANÁLISIS';
    bannerSubtitle.textContent = 'Presione "Ejecutar Análisis" o use Ctrl + Enter para evaluar la sintaxis.';
    metricTime.textContent = '0 ms';
    metricTokens.textContent = '0';
    errorBadgeCount.textContent = '0';
    diagnosticsSummary.textContent = 'Esperando entrada...';

    errorCardsList.innerHTML = `
      <div class="empty-state-notice">
        <div class="empty-icon">🛰️</div>
        <h5>Sin análisis en curso</h5>
        <p>Escriba o importe código fuente en el editor y presione <strong>EJECUTAR ANÁLISIS</strong> para validar su gramática y detectar errores.</p>
      </div>
    `;

    tokensCountLabel.textContent = '0 tokens extraídos';
    lastTokens = [];
    currentErrors = [];
    currentAST = null;
    window.currentAST = null;
    tokensTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="table-empty">Sin tokens analizados. Ejecute el análisis para ver el flujo léxico.</td>
      </tr>
    `;

    astPlaceholder.style.display = 'flex';
    astPlaceholderMsg.innerHTML = 'El Árbol de Sintaxis Abstracta (AST) se generará automáticamente cuando el código sea <strong>100% sintácticamente correcto</strong>.';
    astVisualizer.render(null);
  }

  // ==========================================================================
  // 4. MOTOR PRINCIPAL: EJECUCIÓN DEL ANÁLISIS LÉXICO Y SINTÁCTICO
  // ==========================================================================
  btnAnalyze.addEventListener('click', runSyntaxAnalysis);

  function runSyntaxAnalysis() {
    const sourceCode = codeEditor.value;

    if (!sourceCode.trim()) {
      alert("El editor está vacío. Ingrese o importe código fuente para analizar.");
      return;
    }

    const startTime = performance.now();

    // FASE 1: Análisis Léxico (Tokenización)
    const lexer = new Lexer(sourceCode);
    const { tokens, errors: lexErrors } = lexer.tokenize();
    lastTokens = tokens.filter(t => t.type !== TokenType.EOF);

    // FASE 2: Análisis Sintáctico (Parser Descendente Recursivo con Modo Pánico)
    const parser = new Parser(tokens, sourceCode);
    const parseResult = parser.parse();

    const endTime = performance.now();
    const elapsedTime = (endTime - startTime).toFixed(1);

    // Consolidar todos los errores detectados (léxicos y sintácticos)
    currentErrors = [
      ...lexErrors.map(e => ({
        ...e,
        expected: 'Carácter válido del lenguaje',
        category: 'ERROR_LEXICO'
      })),
      ...parseResult.errors
    ];

    // Actualizar métricas generales
    metricTime.textContent = `${elapsedTime} ms`;
    metricTokens.textContent = lastTokens.length;
    errorBadgeCount.textContent = currentErrors.length;

    // Renderizar tabla de tokens en pestaña de Flujo Léxico
    renderTokensTable(lastTokens);

    // Evaluar estado del análisis
    if (currentErrors.length === 0) {
      // ESTADO: SINTAXIS VÁLIDA // 100% CORRECTA
      handleAnalysisSuccess(parseResult.ast);
    } else {
      // ESTADO: ERRORES SINTÁCTICOS DETECTADOS
      handleAnalysisErrors(currentErrors);
    }
  }

  // Manejo de Caso Exitoso (Cero Errores)
  function handleAnalysisSuccess(astRoot) {
    currentAST = astRoot;
    window.currentAST = astRoot;

    analysisStatusBanner.className = 'status-banner success';
    bannerIcon.textContent = '✨';
    bannerTitle.textContent = 'SINTAXIS VÁLIDA // 100% CORRECTA';
    bannerSubtitle.textContent = 'No se encontraron errores sintácticos ni léxicos. Estructura gramatical verificada con éxito.';
    diagnosticsSummary.textContent = '0 anomalías detectadas en el código';

    // Lista de diagnósticos: Aviso positivo
    errorCardsList.innerHTML = `
      <div class="success-state-notice">
        <div class="success-state-icon">🛡️</div>
        <h5>¡Código Gramaticalmente Perfecto!</h5>
        <p>Todas las instrucciones, declaraciones, operadores, condicionales y delimitadores cumplen rigurosamente con la gramática definida.</p>
        <p style="font-size:11.5px; color: var(--neon-cyan); margin-top:4px;">
          Se ha generado automáticamente el Árbol de Sintaxis Abstracta (AST) en la pestaña correspondiente.
        </p>
      </div>
    `;

    // Limpiar resaltado de errores en el editor
    clearEditorHighlights();

    // Renderizar Árbol Sintáctico (AST) en SVG
    astPlaceholder.style.display = 'none';
    astVisualizer.render(astRoot);
  }

  // Manejo de Caso con Errores Sintácticos
  function handleAnalysisErrors(errors) {
    currentAST = null;
    window.currentAST = null;

    analysisStatusBanner.className = 'status-banner error';
    bannerIcon.textContent = '⚠️';
    bannerTitle.textContent = `ERRORES DETECTADOS (${errors.length})`;
    bannerSubtitle.textContent = `Se encontraron ${errors.length} fallo(s) sintáctico(s). Revise las tarjetas de diagnóstico a continuación.`;
    diagnosticsSummary.textContent = `${errors.length} problema(s) requieren corrección`;

    // Renderizar tarjetas de diagnóstico de errores
    errorCardsList.innerHTML = '';
    errors.forEach((err, index) => {
      const card = createErrorCard(err, index + 1);
      errorCardsList.appendChild(card);
    });

    // Resaltar visualmente las líneas y fragmentos con error sobre el editor
    highlightErrorsInEditor(errors);

    // Ocultar AST y mostrar aviso de error
    astPlaceholder.style.display = 'flex';
    astPlaceholderMsg.innerHTML = `No es posible generar el Árbol Sintáctico porque el código contiene <strong>${errors.length} error(es) sintáctico(s)</strong>. Corrija los fallos indicados para desbloquear la visualización.`;
    astVisualizer.render(null);

    // Asegurar que la pestaña de diagnósticos esté activa
    switchTab('tab-diagnostics');
  }

  // Crea el elemento DOM para una tarjeta individual de error
  function createErrorCard(error, errorNumber) {
    const card = document.createElement('div');
    card.className = 'error-card';
    card.setAttribute('title', 'Haga clic para ir a la línea con el error');

    card.innerHTML = `
      <div class="error-card-top">
        <span class="error-location-badge">
          <span>#${errorNumber}</span>
          <span>Línea ${error.line} : Col ${error.column}</span>
        </span>
        <span class="error-type-tag">${formatCategory(error.category)}</span>
      </div>

      <div class="error-snippet-box">
        <span class="snippet-tag">Fragmento:</span>
        <span class="snippet-text">${escapeHtml(error.snippet)}</span>
      </div>

      <div class="error-description">
        ${escapeHtml(error.message)}
      </div>

      <div class="error-expected-box">
        <span class="expected-label">Esperaba encontrar:</span>
        <span class="expected-token">${escapeHtml(error.expected)}</span>
      </div>
    `;

    // Al hacer clic en la tarjeta, desplaza el editor y enfoca la línea
    card.addEventListener('click', () => {
      scrollToEditorLine(error.line, error.column);
    });

    return card;
  }

  function formatCategory(category) {
    const map = {
      'DELIMITADOR_DESBALANCEADO': '🔒 Delimitador Desbalanceado',
      'INSTRUCCION_INCOMPLETA': '✂️ Sentencia Incompleta',
      'OPERADOR_INVALIDO': '⚠️ Operador Mal Utilizado',
      'ESTRUCTURA_MAL_FORMADA': '🛑 Estructura Mal Construida',
      'ORDEN_GRAMATICAL_INVALIDO': '🔀 Orden Gramatical Inválido',
      'TOKEN_INESPERADO': '❓ Token Inesperado',
      'ERROR_LEXICO': '🔍 Error Léxico'
    };
    return map[category] || category || 'Error Sintáctico';
  }

  // ==========================================================================
  // 5. RESALTADO VISUAL DE ERRORES EN EL EDITOR (LÍNEAS Y ONDULACIONES)
  // ==========================================================================

  function highlightErrorsInEditor(errors) {
    const lines = codeEditor.value.split('\n');
    const errorLinesSet = new Set(errors.map(e => e.line));

    let html = '';
    lines.forEach((lineText, idx) => {
      const lineNum = idx + 1;
      const hasError = errorLinesSet.has(lineNum);
      const escaped = escapeHtml(lineText || ' ');

      if (hasError) {
        // Encontrar error correspondiente a esta línea
        const err = errors.find(e => e.line === lineNum);
        html += `<div class="error-highlight-line"><span class="error-wavy-underline" title="${escapeHtml(err ? err.message : 'Error de sintaxis')}">${escaped}</span></div>\n`;
      } else {
        html += `<div>${escaped}</div>\n`;
      }
    });

    editorHighlights.innerHTML = html;
  }

  function clearEditorHighlights() {
    editorHighlights.innerHTML = '';
  }

  // Desplaza el cursor y enfoca una línea específica en el editor
  function scrollToEditorLine(lineNum, colNum = 1) {
    const lines = codeEditor.value.split('\n');
    let charOffset = 0;

    for (let i = 0; i < lineNum - 1 && i < lines.length; i++) {
      charOffset += lines[i].length + 1; // +1 por '\n'
    }

    charOffset += Math.max(0, colNum - 1);
    codeEditor.focus();
    codeEditor.setSelectionRange(charOffset, charOffset + 1);

    // Calcular desplazamiento aproximado de scroll
    const lineHeight = 22; // definido en styles.css
    codeEditor.scrollTop = Math.max(0, (lineNum - 4) * lineHeight);
    updateCursorPosition();
  }

  // ==========================================================================
  // 6. FLUJO LÉXICO (TABLA DE TOKENS) Y FILTRADO
  // ==========================================================================

  function renderTokensTable(tokens) {
    if (!tokens || tokens.length === 0) {
      tokensTableBody.innerHTML = `
        <tr>
          <td colspan="5" class="table-empty">Sin tokens reconocidos.</td>
        </tr>
      `;
      tokensCountLabel.textContent = '0 tokens';
      return;
    }

    tokensCountLabel.textContent = `${tokens.length} tokens extraídos`;
    renderFilteredTokens(tokens);
  }

  function renderFilteredTokens(tokens) {
    const filterText = (tokenFilterInput.value || '').trim().toLowerCase();
    const filtered = filterText
      ? tokens.filter(t => t.type.toLowerCase().includes(filterText) || t.value.toLowerCase().includes(filterText))
      : tokens;

    let rowsHtml = '';
    filtered.forEach((tok, idx) => {
      const badgeClass = getTokenBadgeClass(tok.type);
      rowsHtml += `
        <tr>
          <td style="color:var(--text-dim);">${idx + 1}</td>
          <td><span class="token-badge ${badgeClass}">${tok.type}</span></td>
          <td style="font-weight:700; color:var(--neon-cyan);">${escapeHtml(tok.value)}</td>
          <td>${tok.line}</td>
          <td>${tok.column}</td>
        </tr>
      `;
    });

    if (filtered.length === 0) {
      rowsHtml = `
        <tr>
          <td colspan="5" class="table-empty">Ningún token coincide con el filtro "${escapeHtml(filterText)}".</td>
        </tr>
      `;
    }

    tokensTableBody.innerHTML = rowsHtml;
  }

  tokenFilterInput.addEventListener('input', () => {
    renderFilteredTokens(lastTokens);
  });

  function getTokenBadgeClass(type) {
    if (type.startsWith('KEYWORD')) return 'token-keyword';
    if (type === TokenType.IDENTIFIER) return 'token-identifier';
    if (type === TokenType.NUMBER) return 'token-number';
    if (type === TokenType.STRING || type === TokenType.BOOLEAN) return 'token-string';
    if (type.startsWith('OP_')) return 'token-operator';
    return 'token-delimiter';
  }

  // ==========================================================================
  // 7. CONTROL DE PESTAÑAS
  // ==========================================================================

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');
      switchTab(targetId);
    });
  });

  function switchTab(tabId) {
    tabButtons.forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-tab') === tabId);
    });

    tabPanes.forEach(pane => {
      const isActive = pane.id === tabId;
      pane.classList.toggle('active', isActive);
      pane.style.display = isActive ? 'flex' : 'none';
    });

    // Si se activa la pestaña de tokens, asegurar que la tabla esté renderizada con los últimos tokens
    if (tabId === 'tab-tokens') {
      renderTokensTable(lastTokens);
    }

    // Si se activa la pestaña del AST, renderizar y ajustar dimensiones con el contenedor visible
    if (tabId === 'tab-ast') {
      if (currentAST) {
        astPlaceholder.style.display = 'none';
        requestAnimationFrame(() => {
          setTimeout(() => {
            astVisualizer.render(currentAST);
            astVisualizer.fitView();
          }, 40);
        });
      } else {
        astPlaceholder.style.display = 'flex';
        astVisualizer.render(null);
      }
    }
  }

  // ==========================================================================
  // 8. CONTROLES DEL VISUALIZADOR AST (ZOOM, CENTRADO, EXPORTAR)
  // ==========================================================================

  btnZoomIn.addEventListener('click', () => astVisualizer.zoomIn());
  btnZoomOut.addEventListener('click', () => astVisualizer.zoomOut());
  btnFitTree.addEventListener('click', () => {
    astVisualizer.fitView();
  });

  btnExportSvg.addEventListener('click', () => astVisualizer.exportToSvg());
  btnExportPng.addEventListener('click', () => astVisualizer.exportToPng());

  // Utilidad para sanitizar texto HTML
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
});
