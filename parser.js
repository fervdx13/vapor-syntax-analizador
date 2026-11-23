/**
 * ============================================================================
 * VAPOR-SYNTAX // PARSER (ANALIZADOR SINTÁCTICO DESCENDENTE RECURSIVO)
 * Implementado desde cero en JavaScript puro con recuperación en modo pánico.
 * Detecta múltiples errores sintácticos simultáneos y genera el AST.
 * Cátedra: Lenguajes y Autómatas I
 * ============================================================================
 */

// Categorías de Errores Sintácticos
const ErrorCategory = {
  DELIMITER_UNBALANCED: 'DELIMITADOR_DESBALANCEADO',
  INCOMPLETE_STMT: 'INSTRUCCION_INCOMPLETA',
  OPERATOR_MISUSE: 'OPERADOR_INVALIDO',
  MALFORMED_CONTROL: 'ESTRUCTURA_MAL_FORMADA',
  INVALID_ORDER: 'ORDEN_GRAMATICAL_INVALIDO',
  UNEXPECTED_TOKEN: 'TOKEN_INESPERADO'
};

/**
 * Clase que representa un Nodo del Árbol de Sintaxis Abstracta (AST)
 */
class ASTNode {
  constructor(type, attributes = {}, children = []) {
    this.type = type;
    this.attributes = attributes;
    this.children = children;
    this.id = 'node_' + Math.random().toString(36).substr(2, 9);
  }

  addChild(child) {
    if (child) this.children.push(child);
  }
}

/**
 * Analizador Sintáctico Descendente Recursivo con Sincronización
 */
class Parser {
  constructor(tokens, sourceText = '') {
    this.tokens = tokens || [];
    this.sourceText = sourceText;
    this.current = 0;
    this.errors = [];
    
    // Pila de balance de delimitadores para rastrear aperturas
    this.delimiterStack = [];
    
    // Conjunto de palabras clave de tipos y declaradores
    this.typeKeywords = new Set(['int', 'float', 'double', 'string', 'bool', 'char', 'void']);
    this.declKeywords = new Set(['let', 'var', 'const']);
    this.statementStarters = new Set([
      TokenType.KEYWORD_TYPE, TokenType.KEYWORD_DECL,
      TokenType.KEYWORD_IF, TokenType.KEYWORD_WHILE, TokenType.KEYWORD_FOR,
      TokenType.KEYWORD_DO, TokenType.KEYWORD_RETURN, TokenType.KEYWORD_PRINT,
      TokenType.KEYWORD_FUNC, TokenType.LBRACE
    ]);
  }

  // Obtiene el token actual
  peek() {
    return this.tokens[this.current] || this.tokens[this.tokens.length - 1];
  }

  // Obtiene el token anterior
  previous() {
    return this.tokens[this.current - 1] || this.tokens[0];
  }

  // Obtiene un token adelantado
  peekAhead(offset = 1) {
    const idx = this.current + offset;
    return idx < this.tokens.length ? this.tokens[idx] : this.tokens[this.tokens.length - 1];
  }

  // Verifica si el analizador llegó al fin de tokens
  isAtEnd() {
    return this.peek().type === TokenType.EOF;
  }

  // Avanza al siguiente token
  advance() {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  // Verifica si el tipo actual coincide
  check(type) {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  // Verifica si el lexema actual coincide
  checkValue(val) {
    if (this.isAtEnd()) return false;
    return this.peek().value === val;
  }

  // Si coincide el tipo, avanza y retorna true
  match(...types) {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  // Registra un error sintáctico estructurado
  recordError(token, message, expected, category = ErrorCategory.UNEXPECTED_TOKEN) {
    const tok = token || this.peek();
    
    // Evitar errores duplicados idénticos en la misma coordenada
    const isDuplicate = this.errors.some(e => e.line === tok.line && e.column === tok.column && e.message === message);
    if (isDuplicate) return;

    this.errors.push({
      line: tok.line,
      column: tok.column,
      snippet: tok.type === TokenType.EOF ? 'FIN_DE_CODIGO' : (tok.value || tok.type),
      message: message,
      expected: expected || 'Sintaxis válida',
      category: category
    });
  }

  // Consume un token esperado o registra error
  consume(type, message, expected, category = ErrorCategory.UNEXPECTED_TOKEN) {
    if (this.check(type)) {
      const tok = this.advance();
      // Registrar emparejamiento de delimitadores
      if (type === TokenType.RPAREN || type === TokenType.RBRACE || type === TokenType.RBRACKET) {
        this.popDelimiter(type);
      }
      return tok;
    }
    const currentTok = this.peek();
    this.recordError(currentTok, message, expected, category);
    return null;
  }

  // Registro y balance de delimitadores abiertos
  pushDelimiter(token) {
    this.delimiterStack.push(token);
  }

  popDelimiter(closeType) {
    if (this.delimiterStack.length === 0) {
      const tok = this.previous();
      this.recordError(
        tok,
        `Delimitador de cierre '${tok.value}' inesperado sin apertura previa correspondiente.`,
        'Eliminar delimitador extra',
        ErrorCategory.DELIMITER_UNBALANCED
      );
      return;
    }

    const openTok = this.delimiterStack[this.delimiterStack.length - 1];
    const pairs = {
      [TokenType.RPAREN]: TokenType.LPAREN,
      [TokenType.RBRACE]: TokenType.LBRACE,
      [TokenType.RBRACKET]: TokenType.LBRACKET
    };

    if (openTok.type === pairs[closeType]) {
      this.delimiterStack.pop();
    } else {
      // Delimitadores cruzados o desbalanceados
      const tok = this.previous();
      this.recordError(
        tok,
        `Delimitador de cierre '${tok.value}' no coincide con delimitador '${openTok.value}' abierto en Línea ${openTok.line}, Col ${openTok.column}.`,
        `Cierre coincidente para '${openTok.value}'`,
        ErrorCategory.DELIMITER_UNBALANCED
      );
    }
  }

  // Validación final de delimitadores sin cerrar al final del archivo
  checkUnclosedDelimiters() {
    while (this.delimiterStack.length > 0) {
      const openTok = this.delimiterStack.pop();
      const expectedClose = openTok.type === TokenType.LPAREN ? "')'" :
                            openTok.type === TokenType.LBRACE ? "'}'" : "']'";
      this.recordError(
        openTok,
        `Delimitador '${openTok.value}' abierto en Línea ${openTok.line}, Columna ${openTok.column} nunca fue cerrado.`,
        `Se esperaba ${expectedClose} correspondiente`,
        ErrorCategory.DELIMITER_UNBALANCED
      );
    }
  }

  // Modo Pánico / Recuperación: Sincroniza hasta el inicio de la siguiente instrucción
  synchronize() {
    this.advance();
    while (!this.isAtEnd()) {
      if (this.previous().type === TokenType.SEMICOLON) return;
      if (this.previous().type === TokenType.RBRACE) return;

      const nextType = this.peek().type;
      if (this.statementStarters.has(nextType)) return;
      if (nextType === TokenType.KEYWORD_ELSE) return;

      this.advance();
    }
  }

  /**
   * PUNTO DE ENTRADA PRINCIPAL: parse()
   */
  parse() {
    const rootNode = new ASTNode('Program', { name: 'VAPOR_PROGRAM' }, []);

    while (!this.isAtEnd()) {
      try {
        const stmt = this.declarationOrStatement();
        if (stmt) {
          rootNode.addChild(stmt);
        }
      } catch (err) {
        this.synchronize();
      }
    }

    // Comprobar si quedaron delimitadores sin cerrar
    this.checkUnclosedDelimiters();

    return {
      ast: this.errors.length === 0 ? rootNode : null,
      partialAst: rootNode,
      errors: this.errors
    };
  }

  /**
   * Declaraciones o Sentencias
   */
  declarationOrStatement() {
    const tok = this.peek();

    // 1. Detectar orden gramatical inválido (ejemplo: '= 10 int x;', '+ a = 5;')
    if (tok.type === TokenType.OP_ASSIGN || tok.type === TokenType.OP_COMPOUND_ASSIGN ||
        tok.type === TokenType.OP_PLUS || tok.type === TokenType.OP_MUL ||
        tok.type === TokenType.OP_DIV || tok.type === TokenType.OP_MOD) {
      this.recordError(
        tok,
        `Token inesperado '${tok.value}' al inicio de la instrucción. Orden gramatical inválido.`,
        'Identificador, palabra clave o tipo de dato',
        ErrorCategory.INVALID_ORDER
      );
      this.synchronize();
      return null;
    }

    // 2. Detección de 'else' huérfano sin 'if' previo
    if (tok.type === TokenType.KEYWORD_ELSE) {
      this.advance();
      this.recordError(
        tok,
        "Cláusula 'else' huérfana detectada sin una sentencia 'if' previa asociada.",
        "Eliminar 'else' o colocar una estructura 'if' previa",
        ErrorCategory.MALFORMED_CONTROL
      );
      this.synchronize();
      return null;
    }

    // 3. Declaración de Función (function / fn o tipo seguido de ident y '(')
    if (tok.type === TokenType.KEYWORD_FUNC) {
      return this.functionDeclaration();
    }

    // 4. Declaración de Variables con tipos o declaradores (int, float, let, var, const)
    if (tok.type === TokenType.KEYWORD_TYPE) {
      // Diferenciar entre función "int suma() {...}" y variable "int x = 5;"
      if (this.peekAhead(1).type === TokenType.IDENTIFIER && this.peekAhead(2).type === TokenType.LPAREN) {
        return this.functionDeclaration();
      }
      return this.variableDeclaration();
    }

    if (tok.type === TokenType.KEYWORD_DECL) {
      return this.variableDeclaration();
    }

    // 5. Sentencias generales
    return this.statement();
  }

  /**
   * Declaración de Función: type|fn id(params) { body }
   */
  functionDeclaration() {
    let returnType = 'void';
    let isKwFunc = false;

    if (this.match(TokenType.KEYWORD_FUNC)) {
      isKwFunc = true;
    } else if (this.match(TokenType.KEYWORD_TYPE)) {
      returnType = this.previous().value;
    }

    const nameTok = this.consume(
      TokenType.IDENTIFIER,
      "Se esperaba el identificador (nombre) en la declaración de la función.",
      "Nombre de función",
      ErrorCategory.INCOMPLETE_STMT
    );

    const fnName = nameTok ? nameTok.value : '<desconocido>';
    const fnNode = new ASTNode('FunctionDecl', { name: fnName, returnType: returnType }, []);

    // Paréntesis de parámetros
    if (this.check(TokenType.LPAREN)) {
      const lparen = this.advance();
      this.pushDelimiter(lparen);
    } else {
      this.recordError(
        this.peek(),
        "Se esperaba '(' después del nombre de la función.",
        "'('",
        ErrorCategory.DELIMITER_UNBALANCED
      );
    }

    // Parámetros
    const paramsNode = new ASTNode('Parameters', {}, []);
    if (!this.check(TokenType.RPAREN) && !this.isAtEnd()) {
      do {
        let pType = 'var';
        if (this.match(TokenType.KEYWORD_TYPE, TokenType.KEYWORD_DECL)) {
          pType = this.previous().value;
        }
        const pNameTok = this.consume(
          TokenType.IDENTIFIER,
          "Se esperaba nombre de parámetro en la firma de función.",
          "Identificador de parámetro",
          ErrorCategory.INCOMPLETE_STMT
        );
        if (pNameTok) {
          paramsNode.addChild(new ASTNode('Param', { name: pNameTok.value, type: pType }));
        }
      } while (this.match(TokenType.COMMA));
    }

    this.consume(
      TokenType.RPAREN,
      "Se esperaba ')' para cerrar la lista de parámetros de la función.",
      "')'",
      ErrorCategory.DELIMITER_UNBALANCED
    );
    fnNode.addChild(paramsNode);

    // Cuerpo de la función
    if (this.check(TokenType.LBRACE)) {
      const body = this.blockStatement();
      fnNode.addChild(body);
    } else {
      this.recordError(
        this.peek(),
        "Se esperaba '{' para iniciar el cuerpo de la función.",
        "'{' Bloque de función",
        ErrorCategory.MALFORMED_CONTROL
      );
    }

    return fnNode;
  }

  /**
   * Declaración de Variables:
   * int a = 5, b = 10;
   * let x = 20;
   */
  variableDeclaration() {
    const typeTok = this.advance();
    const typeName = typeTok.value;
    const declGroupNode = new ASTNode('VarDeclGroup', { type: typeName }, []);

    // Validar caso de instrucción sin identificador: "int = 5;" o "let ;"
    if (this.check(TokenType.OP_ASSIGN) || this.check(TokenType.SEMICOLON)) {
      this.recordError(
        this.peek(),
        `Declaración sin identificador. La palabra clave '${typeName}' debe ir acompañada del nombre de variable.`,
        'Identificador de variable',
        ErrorCategory.INCOMPLETE_STMT
      );
      this.synchronize();
      return null;
    }

    do {
      const identTok = this.consume(
        TokenType.IDENTIFIER,
        `Se esperaba identificador de variable tras '${typeName}'.`,
        'Nombre de identificador',
        ErrorCategory.INCOMPLETE_STMT
      );

      if (!identTok) {
        this.synchronize();
        return null;
      }

      const varNode = new ASTNode('VarDecl', { name: identTok.value, type: typeName });

      // Inicialización opcional (= expr)
      if (this.match(TokenType.OP_ASSIGN)) {
        const assignTok = this.previous();
        // Validar asignación truncada: "int x = ;"
        if (this.check(TokenType.SEMICOLON) || this.check(TokenType.COMMA) || this.isAtEnd()) {
          this.recordError(
            this.peek(),
            `Asignación truncada para la variable '${identTok.value}'. Falta la expresión o valor tras '='.`,
            'Expresión o valor literal',
            ErrorCategory.INCOMPLETE_STMT
          );
        } else {
          const initExpr = this.expression();
          if (initExpr) varNode.addChild(initExpr);
        }
      }

      declGroupNode.addChild(varNode);
    } while (this.match(TokenType.COMMA));

    // Verificar terminación con ';'
    this.consumeSemicolon("la declaración de variable");
    return declGroupNode;
  }

  /**
   * Sentencias
   */
  statement() {
    // 1. Bloque de código { ... }
    if (this.check(TokenType.LBRACE)) {
      return this.blockStatement();
    }

    // 2. Condicional if / else if / else
    if (this.match(TokenType.KEYWORD_IF)) {
      return this.ifStatement();
    }

    // 3. Ciclo while
    if (this.match(TokenType.KEYWORD_WHILE)) {
      return this.whileStatement();
    }

    // 4. Ciclo do-while
    if (this.match(TokenType.KEYWORD_DO)) {
      return this.doWhileStatement();
    }

    // 5. Ciclo for
    if (this.match(TokenType.KEYWORD_FOR)) {
      return this.forStatement();
    }

    // 6. Sentencia print
    if (this.match(TokenType.KEYWORD_PRINT)) {
      return this.printStatement();
    }

    // 7. Sentencia return
    if (this.match(TokenType.KEYWORD_RETURN)) {
      return this.returnStatement();
    }

    // 8. Sentencia de expresión o asignación (x = 5; foo(); x++;)
    return this.expressionStatement();
  }

  /**
   * Bloque delimitado por llaves { ... }
   */
  blockStatement() {
    const lbrace = this.advance(); // consume '{'
    this.pushDelimiter(lbrace);

    const blockNode = new ASTNode('Block', {}, []);

    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      const stmt = this.declarationOrStatement();
      if (stmt) blockNode.addChild(stmt);
    }

    this.consume(
      TokenType.RBRACE,
      `Llave '{' abierta en Línea ${lbrace.line}, Col ${lbrace.column} nunca fue cerrada con '}'.`,
      "'}'",
      ErrorCategory.DELIMITER_UNBALANCED
    );

    return blockNode;
  }

  /**
   * Sentencia Condicional if / else
   */
  ifStatement() {
    const ifTok = this.previous();
    const ifNode = new ASTNode('IfStatement', {}, []);

    // Validar paréntesis de condición
    let hasOpenParen = false;
    if (this.check(TokenType.LPAREN)) {
      const lparen = this.advance();
      this.pushDelimiter(lparen);
      hasOpenParen = true;
    } else {
      this.recordError(
        this.peek(),
        "Se esperaba '(' delimitando la condición del 'if'.",
        "'('",
        ErrorCategory.MALFORMED_CONTROL
      );
    }

    // Validar condición no vacía: if ()
    if (this.check(TokenType.RPAREN)) {
      this.recordError(
        this.peek(),
        "La condición del 'if' no puede estar vacía. Se requiere una expresión lógica o de comparación.",
        'Expresión lógica/relacional',
        ErrorCategory.INCOMPLETE_STMT
      );
      this.advance(); // consume ')'
      if (hasOpenParen) this.popDelimiter(TokenType.RPAREN);
    } else {
      const condition = this.expression();
      if (condition) ifNode.addChild(condition);

      if (hasOpenParen) {
        this.consume(
          TokenType.RPAREN,
          "Se esperaba ')' al final de la condición del 'if'.",
          "')'",
          ErrorCategory.DELIMITER_UNBALANCED
        );
      }
    }

    // Cuerpo de la rama THEN
    const thenBranch = this.statement();
    if (thenBranch) {
      const thenNode = new ASTNode('ThenBranch', {}, [thenBranch]);
      ifNode.addChild(thenNode);
    }

    // Rama ELSE opcional
    if (this.match(TokenType.KEYWORD_ELSE)) {
      const elseBranch = this.statement();
      if (elseBranch) {
        const elseNode = new ASTNode('ElseBranch', {}, [elseBranch]);
        ifNode.addChild(elseNode);
      }
    }

    return ifNode;
  }

  /**
   * Ciclo while ( condition ) statement
   */
  whileStatement() {
    const whileTok = this.previous();
    const whileNode = new ASTNode('WhileStatement', {}, []);

    let hasOpenParen = false;
    if (this.check(TokenType.LPAREN)) {
      const lparen = this.advance();
      this.pushDelimiter(lparen);
      hasOpenParen = true;
    } else {
      this.recordError(
        this.peek(),
        "Se esperaba '(' delimitando la condición del 'while'.",
        "'('",
        ErrorCategory.MALFORMED_CONTROL
      );
    }

    // Condición vacía: while ()
    if (this.check(TokenType.RPAREN)) {
      this.recordError(
        this.peek(),
        "La condición del bucle 'while' no puede estar vacía.",
        'Expresión lógica',
        ErrorCategory.INCOMPLETE_STMT
      );
      this.advance();
      if (hasOpenParen) this.popDelimiter(TokenType.RPAREN);
    } else {
      const condition = this.expression();
      if (condition) whileNode.addChild(condition);

      if (hasOpenParen) {
        this.consume(
          TokenType.RPAREN,
          "Se esperaba ')' al final de la condición del bucle 'while'.",
          "')'",
          ErrorCategory.DELIMITER_UNBALANCED
        );
      }
    }

    // Cuerpo del while
    const body = this.statement();
    if (body) {
      whileNode.addChild(new ASTNode('LoopBody', {}, [body]));
    }

    return whileNode;
  }

  /**
   * Ciclo do statement while ( condition );
   */
  doWhileStatement() {
    const doNode = new ASTNode('DoWhileStatement', {}, []);
    
    // Cuerpo
    const body = this.statement();
    if (body) doNode.addChild(new ASTNode('LoopBody', {}, [body]));

    // Cláusula while
    this.consume(
      TokenType.KEYWORD_WHILE,
      "Se esperaba palabra clave 'while' al final del ciclo 'do-while'.",
      "'while'",
      ErrorCategory.MALFORMED_CONTROL
    );

    // Paréntesis de condición
    let hasOpenParen = false;
    if (this.check(TokenType.LPAREN)) {
      const lp = this.advance();
      this.pushDelimiter(lp);
      hasOpenParen = true;
    } else {
      this.recordError(
        this.peek(),
        "Se esperaba '(' antes de la condición en 'do-while'.",
        "'('",
        ErrorCategory.MALFORMED_CONTROL
      );
    }

    if (this.check(TokenType.RPAREN)) {
      this.recordError(
        this.peek(),
        "La condición en el ciclo 'do-while' no puede estar vacía.",
        'Expresión lógica',
        ErrorCategory.INCOMPLETE_STMT
      );
      this.advance();
      if (hasOpenParen) this.popDelimiter(TokenType.RPAREN);
    } else {
      const cond = this.expression();
      if (cond) doNode.addChild(cond);
      if (hasOpenParen) {
        this.consume(
          TokenType.RPAREN,
          "Se esperaba ')' tras la condición en 'do-while'.",
          "')'",
          ErrorCategory.DELIMITER_UNBALANCED
        );
      }
    }

    this.consumeSemicolon("el ciclo 'do-while'");
    return doNode;
  }

  /**
   * Ciclo for ( init ; condition ; update ) statement
   */
  forStatement() {
    const forNode = new ASTNode('ForStatement', {}, []);

    let hasOpenParen = false;
    if (this.check(TokenType.LPAREN)) {
      const lp = this.advance();
      this.pushDelimiter(lp);
      hasOpenParen = true;
    } else {
      this.recordError(
        this.peek(),
        "Se esperaba '(' tras la palabra clave 'for'.",
        "'('",
        ErrorCategory.MALFORMED_CONTROL
      );
    }

    // 1. Inicialización
    let initNode = null;
    if (this.match(TokenType.SEMICOLON)) {
      // Cláusula init vacía: for (; ...)
      initNode = new ASTNode('ForInitEmpty');
    } else if (this.check(TokenType.KEYWORD_TYPE) || this.check(TokenType.KEYWORD_DECL)) {
      initNode = this.variableDeclaration(); // ya consume ';'
    } else {
      initNode = this.expression();
      this.consumeSemicolon("la cláusula de inicialización del ciclo 'for'");
    }
    if (initNode) forNode.addChild(new ASTNode('ForInit', {}, [initNode]));

    // 2. Condición
    let condNode = null;
    if (this.match(TokenType.SEMICOLON)) {
      // Cláusula condición vacía: for (...; ; ...)
      condNode = new ASTNode('ForCondEmpty');
    } else {
      condNode = this.expression();
      this.consumeSemicolon("la cláusula de condición del ciclo 'for'");
    }
    if (condNode) forNode.addChild(new ASTNode('ForCondition', {}, [condNode]));

    // 3. Actualización (Incremento / Decremento)
    let updateNode = null;
    if (!this.check(TokenType.RPAREN)) {
      updateNode = this.expression();
    }
    if (updateNode) forNode.addChild(new ASTNode('ForUpdate', {}, [updateNode]));

    if (hasOpenParen) {
      this.consume(
        TokenType.RPAREN,
        "Se esperaba ')' tras las cláusulas del ciclo 'for'.",
        "')'",
        ErrorCategory.DELIMITER_UNBALANCED
      );
    }

    // Cuerpo del for
    const body = this.statement();
    if (body) forNode.addChild(new ASTNode('LoopBody', {}, [body]));

    return forNode;
  }

  /**
   * Sentencia print ( expr ) ; o print expr ;
   */
  printStatement() {
    const printNode = new ASTNode('PrintStatement', {}, []);
    let hasParen = false;

    if (this.check(TokenType.LPAREN)) {
      const lp = this.advance();
      this.pushDelimiter(lp);
      hasParen = true;
    }

    if (this.check(TokenType.SEMICOLON)) {
      this.recordError(
        this.peek(),
        "La instrucción 'print' requiere al menos un argumento o expresión a imprimir.",
        'Expresión a imprimir',
        ErrorCategory.INCOMPLETE_STMT
      );
    } else {
      const expr = this.expression();
      if (expr) printNode.addChild(expr);
    }

    if (hasParen) {
      this.consume(
        TokenType.RPAREN,
        "Se esperaba ')' de cierre en la llamada a 'print'.",
        "')'",
        ErrorCategory.DELIMITER_UNBALANCED
      );
    }

    this.consumeSemicolon("la instrucción 'print'");
    return printNode;
  }

  /**
   * Sentencia return expr? ;
   */
  returnStatement() {
    const returnNode = new ASTNode('ReturnStatement', {}, []);

    if (!this.check(TokenType.SEMICOLON)) {
      const expr = this.expression();
      if (expr) returnNode.addChild(expr);
    }

    this.consumeSemicolon("la instrucción 'return'");
    return returnNode;
  }

  /**
   * Sentencia de Expresión o Asignación
   */
  expressionStatement() {
    const expr = this.expression();
    if (!expr) {
      this.recordError(
        this.peek(),
        `Instrucción sintácticamente no reconocida: '${this.peek().value}'.`,
        'Sentencia o expresión válida',
        ErrorCategory.INVALID_ORDER
      );
      this.synchronize();
      return null;
    }

    this.consumeSemicolon("la instrucción");
    return expr;
  }

  /**
   * Consume ';' verificando omisiones comunes
   */
  consumeSemicolon(contextName) {
    if (this.check(TokenType.SEMICOLON)) {
      this.advance();
      return;
    }

    const prevTok = this.previous();
    this.recordError(
      prevTok,
      `Falta punto y coma ';' al final de ${contextName}.`,
      "';' al final de la línea",
      ErrorCategory.INCOMPLETE_STMT
    );
  }

  // ==========================================================================
  // PARSER DE EXPRESIONES (PRECEDENCIA DESCENDENTE)
  // ==========================================================================

  expression() {
    return this.assignment();
  }

  /**
   * Asignaciones: id = expr, id += expr, etc.
   */
  assignment() {
    const expr = this.logicalOr();

    if (this.match(TokenType.OP_ASSIGN, TokenType.OP_COMPOUND_ASSIGN)) {
      const opTok = this.previous();

      // Validar si la expresión a la izquierda es asignable (l-value)
      if (expr && expr.type !== 'Identifier' && expr.type !== 'ArrayAccess') {
        this.recordError(
          opTok,
          `Destino de asignación inválido a la izquierda de '${opTok.value}'. Debe ser una variable o identificador.`,
          'Identificador modificable',
          ErrorCategory.INVALID_ORDER
        );
      }

      // Validar asignación sin lado derecho: "x = ;"
      if (this.check(TokenType.SEMICOLON) || this.check(TokenType.RPAREN) || this.isAtEnd()) {
        this.recordError(
          this.peek(),
          `Asignación truncada. Falta el valor o la expresión después del operador '${opTok.value}'.`,
          'Expresión de asignación',
          ErrorCategory.INCOMPLETE_STMT
        );
        return expr;
      }

      const valueExpr = this.assignment();
      return new ASTNode('Assignment', { operator: opTok.value }, [expr, valueExpr]);
    }

    return expr;
  }

  /**
   * Operador Lógico OR (||)
   */
  logicalOr() {
    let expr = this.logicalAnd();

    while (this.match(TokenType.OP_OR)) {
      const opTok = this.previous();
      this.checkConsecutiveOperators(opTok);
      const right = this.logicalAnd();
      expr = new ASTNode('LogicalOr', { operator: opTok.value }, [expr, right]);
    }

    return expr;
  }

  /**
   * Operador Lógico AND (&&)
   */
  logicalAnd() {
    let expr = this.equality();

    while (this.match(TokenType.OP_AND)) {
      const opTok = this.previous();
      this.checkConsecutiveOperators(opTok);
      const right = this.equality();
      expr = new ASTNode('LogicalAnd', { operator: opTok.value }, [expr, right]);
    }

    return expr;
  }

  /**
   * Igualdad (==, !=)
   */
  equality() {
    let expr = this.relational();

    while (this.match(TokenType.OP_EQUAL, TokenType.OP_NOT_EQUAL)) {
      const opTok = this.previous();
      this.checkConsecutiveOperators(opTok);
      const right = this.relational();
      expr = new ASTNode('EqualityExpr', { operator: opTok.value }, [expr, right]);
    }

    return expr;
  }

  /**
   * Relacionales (<, >, <=, >=)
   */
  relational() {
    let expr = this.additive();

    while (this.match(TokenType.OP_LT, TokenType.OP_GT, TokenType.OP_LTE, TokenType.OP_GTE)) {
      const opTok = this.previous();
      this.checkConsecutiveOperators(opTok);
      const right = this.additive();
      expr = new ASTNode('RelationalExpr', { operator: opTok.value }, [expr, right]);
    }

    return expr;
  }

  /**
   * Suma y Resta (+, -)
   */
  additive() {
    let expr = this.multiplicative();

    while (this.match(TokenType.OP_PLUS, TokenType.OP_MINUS)) {
      const opTok = this.previous();
      this.checkConsecutiveOperators(opTok);
      const right = this.multiplicative();
      expr = new ASTNode('AdditiveExpr', { operator: opTok.value }, [expr, right]);
    }

    return expr;
  }

  /**
   * Multiplicación, División, Módulo (*, /, %)
   */
  multiplicative() {
    let expr = this.unary();

    while (this.match(TokenType.OP_MUL, TokenType.OP_DIV, TokenType.OP_MOD)) {
      const opTok = this.previous();
      this.checkConsecutiveOperators(opTok);
      const right = this.unary();
      expr = new ASTNode('MultiplicativeExpr', { operator: opTok.value }, [expr, right]);
    }

    return expr;
  }

  /**
   * Operadores Unarios (!, -, +, ++, --)
   */
  unary() {
    // Detectar operadores binarios mal colocados al inicio de expresión: "* a + b"
    if (this.check(TokenType.OP_MUL) || this.check(TokenType.OP_DIV) || this.check(TokenType.OP_MOD) ||
        this.check(TokenType.OP_AND) || this.check(TokenType.OP_OR) ||
        this.check(TokenType.OP_EQUAL) || this.check(TokenType.OP_NOT_EQUAL) ||
        this.check(TokenType.OP_LT) || this.check(TokenType.OP_GT) ||
        this.check(TokenType.OP_LTE) || this.check(TokenType.OP_GTE)) {
      const badOp = this.advance();
      this.recordError(
        badOp,
        `La expresión no puede comenzar con el operador binario '${badOp.value}'.`,
        'Operando, identificador o literal',
        ErrorCategory.OPERATOR_MISUSE
      );
      return this.unary();
    }

    if (this.match(TokenType.OP_NOT, TokenType.OP_MINUS, TokenType.OP_PLUS, TokenType.OP_INC, TokenType.OP_DEC)) {
      const opTok = this.previous();
      const right = this.unary();
      return new ASTNode('UnaryExpr', { operator: opTok.value, prefix: true }, [right]);
    }

    return this.postfix();
  }

  /**
   * Postfijo: llamadas a funciones foo(), incrementos i++, accesos a arreglo a[i]
   */
  postfix() {
    let expr = this.primary();

    while (true) {
      // Llamada a función: expr(args)
      if (this.check(TokenType.LPAREN)) {
        const lp = this.advance();
        this.pushDelimiter(lp);
        const argsNode = new ASTNode('Arguments', {}, []);

        if (!this.check(TokenType.RPAREN)) {
          do {
            const arg = this.expression();
            if (arg) argsNode.addChild(arg);
          } while (this.match(TokenType.COMMA));
        }

        this.consume(
          TokenType.RPAREN,
          "Se esperaba ')' al finalizar los argumentos de la llamada a función.",
          "')'",
          ErrorCategory.DELIMITER_UNBALANCED
        );

        expr = new ASTNode('FunctionCall', { callee: expr ? expr.attributes.name : 'anon' }, [expr, argsNode]);
      }
      // Acceso a corchetes: expr[index]
      else if (this.check(TokenType.LBRACKET)) {
        const lb = this.advance();
        this.pushDelimiter(lb);
        const indexExpr = this.expression();
        this.consume(
          TokenType.RBRACKET,
          "Se esperaba ']' al cerrar el índice del arreglo.",
          "']'",
          ErrorCategory.DELIMITER_UNBALANCED
        );
        expr = new ASTNode('ArrayAccess', {}, [expr, indexExpr]);
      }
      // Incremento / Decremento postfijo
      else if (this.match(TokenType.OP_INC, TokenType.OP_DEC)) {
        const opTok = this.previous();
        expr = new ASTNode('PostfixExpr', { operator: opTok.value }, [expr]);
      }
      else {
        break;
      }
    }

    return expr;
  }

  /**
   * Expresiones Primarias: literales, variables, agrupación ()
   */
  primary() {
    // Literal booleano
    if (this.match(TokenType.BOOLEAN)) {
      return new ASTNode('Literal', { value: this.previous().value, literalType: 'boolean' });
    }

    // Literal numérico
    if (this.match(TokenType.NUMBER)) {
      return new ASTNode('Literal', { value: this.previous().value, literalType: 'number' });
    }

    // Literal de cadena
    if (this.match(TokenType.STRING)) {
      return new ASTNode('Literal', { value: this.previous().value, literalType: 'string' });
    }

    // Identificador
    if (this.match(TokenType.IDENTIFIER)) {
      return new ASTNode('Identifier', { name: this.previous().value });
    }

    // Expresión agrupada entre paréntesis ( expr )
    if (this.check(TokenType.LPAREN)) {
      const lp = this.advance();
      this.pushDelimiter(lp);

      // Paréntesis vacíos ()
      if (this.check(TokenType.RPAREN)) {
        this.recordError(
          this.peek(),
          "Expresión vacía dentro de paréntesis '()'. Se esperaba un valor u operación.",
          'Expresión interna',
          ErrorCategory.INCOMPLETE_STMT
        );
        this.advance();
        this.popDelimiter(TokenType.RPAREN);
        return null;
      }

      const innerExpr = this.expression();
      this.consume(
        TokenType.RPAREN,
        `Paréntesis '(' abierto en Línea ${lp.line}, Col ${lp.column} nunca fue cerrado.`,
        "')'",
        ErrorCategory.DELIMITER_UNBALANCED
      );

      return new ASTNode('GroupedExpr', {}, [innerExpr]);
    }

    // Manejo de token inesperado
    const badTok = this.peek();
    if (!this.isAtEnd() && badTok.type !== TokenType.SEMICOLON) {
      this.recordError(
        badTok,
        `Token inesperado '${badTok.value}' en la expresión.`,
        'Identificador, número, cadena o expresión agrupada',
        ErrorCategory.UNEXPECTED_TOKEN
      );
      this.advance();
    }

    return null;
  }

  /**
   * Detección de operadores binarios consecutivos (ejemplo: a + * b o a == && b)
   */
  checkConsecutiveOperators(lastOpTok) {
    const nextTok = this.peek();
    const isBinaryOp = (t) => {
      return t === TokenType.OP_PLUS || t === TokenType.OP_MINUS ||
             t === TokenType.OP_MUL || t === TokenType.OP_DIV || t === TokenType.OP_MOD ||
             t === TokenType.OP_EQUAL || t === TokenType.OP_NOT_EQUAL ||
             t === TokenType.OP_LT || t === TokenType.OP_GT ||
             t === TokenType.OP_LTE || t === TokenType.OP_GTE ||
             t === TokenType.OP_AND || t === TokenType.OP_OR ||
             t === TokenType.OP_ASSIGN || t === TokenType.OP_COMPOUND_ASSIGN;
    };

    if (isBinaryOp(nextTok.type)) {
      this.recordError(
        nextTok,
        `Operador binario consecutivo inválido '${nextTok.value}' inmediatamente después de '${lastOpTok.value}'.`,
        'Operando o identificador entre operadores',
        ErrorCategory.OPERATOR_MISUSE
      );
    }
  }
}

// Exportar al ámbito global
window.ASTNode = ASTNode;
window.Parser = Parser;
window.ErrorCategory = ErrorCategory;
