/**
 * ============================================================================
 * VAPOR-SYNTAX // LEXER (ANALIZADOR LÉXICO)
 * Tokenizador manual en JavaScript puro para lenguaje estructurado tipo C-Like.
 * Diseñado para la cátedra de Lenguajes y Autómatas I.
 * ============================================================================
 */

// Tipos de Tokens reconocidos por la gramática
const TokenType = {
  // Palabras reservadas (Tipos de datos y declaradores)
  KEYWORD_TYPE: 'KEYWORD_TYPE',       // int, float, double, string, bool, char, void
  KEYWORD_DECL: 'KEYWORD_DECL',       // let, var, const
  
  // Palabras reservadas (Estructuras de control y flujo)
  KEYWORD_IF: 'KEYWORD_IF',           // if
  KEYWORD_ELSE: 'KEYWORD_ELSE',       // else
  KEYWORD_WHILE: 'KEYWORD_WHILE',     // while
  KEYWORD_FOR: 'KEYWORD_FOR',         // for
  KEYWORD_DO: 'KEYWORD_DO',           // do
  KEYWORD_RETURN: 'KEYWORD_RETURN',   // return
  KEYWORD_PRINT: 'KEYWORD_PRINT',     // print
  KEYWORD_FUNC: 'KEYWORD_FUNC',       // function, fn

  // Literales
  IDENTIFIER: 'IDENTIFIER',           // x, suma, total_1
  NUMBER: 'NUMBER',                   // 42, 3.1416
  STRING: 'STRING',                   // "hola", 'mundo'
  BOOLEAN: 'BOOLEAN',                 // true, false

  // Operadores aritméticos y de asignación
  OP_ASSIGN: 'OP_ASSIGN',             // =
  OP_COMPOUND_ASSIGN: 'OP_COMPOUND_ASSIGN', // +=, -=, *=, /=
  OP_PLUS: 'OP_PLUS',                 // +
  OP_MINUS: 'OP_MINUS',               // -
  OP_MUL: 'OP_MUL',                   // *
  OP_DIV: 'OP_DIV',                   // /
  OP_MOD: 'OP_MOD',                   // %
  OP_INC: 'OP_INC',                   // ++
  OP_DEC: 'OP_DEC',                   // --

  // Operadores relacionales y lógicos
  OP_EQUAL: 'OP_EQUAL',               // ==
  OP_NOT_EQUAL: 'OP_NOT_EQUAL',       // !=
  OP_LT: 'OP_LT',                     // <
  OP_GT: 'OP_GT',                     // >
  OP_LTE: 'OP_LTE',                   // <=
  OP_GTE: 'OP_GTE',                   // >=
  OP_AND: 'OP_AND',                   // &&
  OP_OR: 'OP_OR',                     // ||
  OP_NOT: 'OP_NOT',                   // !

  // Delimitadores y puntuación
  LPAREN: 'LPAREN',                   // (
  RPAREN: 'RPAREN',                   // )
  LBRACE: 'LBRACE',                   // {
  RBRACE: 'RBRACE',                   // }
  LBRACKET: 'LBRACKET',               // [
  RBRACKET: 'RBRACKET',               // ]
  SEMICOLON: 'SEMICOLON',             // ;
  COMMA: 'COMMA',                     // ,

  // Tokens especiales
  ILLEGAL: 'ILLEGAL',                 // Carácter no reconocido
  EOF: 'EOF'                          // Fin de archivo
};

// Diccionario de Palabras Reservadas
const KEYWORDS = {
  // Tipos
  'int': { type: TokenType.KEYWORD_TYPE, category: 'type' },
  'float': { type: TokenType.KEYWORD_TYPE, category: 'type' },
  'double': { type: TokenType.KEYWORD_TYPE, category: 'type' },
  'string': { type: TokenType.KEYWORD_TYPE, category: 'type' },
  'bool': { type: TokenType.KEYWORD_TYPE, category: 'type' },
  'char': { type: TokenType.KEYWORD_TYPE, category: 'type' },
  'void': { type: TokenType.KEYWORD_TYPE, category: 'type' },
  
  // Declaradores
  'let': { type: TokenType.KEYWORD_DECL, category: 'decl' },
  'var': { type: TokenType.KEYWORD_DECL, category: 'decl' },
  'const': { type: TokenType.KEYWORD_DECL, category: 'decl' },

  // Control
  'if': { type: TokenType.KEYWORD_IF, category: 'control' },
  'else': { type: TokenType.KEYWORD_ELSE, category: 'control' },
  'while': { type: TokenType.KEYWORD_WHILE, category: 'control' },
  'for': { type: TokenType.KEYWORD_FOR, category: 'control' },
  'do': { type: TokenType.KEYWORD_DO, category: 'control' },
  'return': { type: TokenType.KEYWORD_RETURN, category: 'control' },
  'print': { type: TokenType.KEYWORD_PRINT, category: 'io' },
  'function': { type: TokenType.KEYWORD_FUNC, category: 'func' },
  'fn': { type: TokenType.KEYWORD_FUNC, category: 'func' },

  // Booleanos
  'true': { type: TokenType.BOOLEAN, category: 'literal' },
  'false': { type: TokenType.BOOLEAN, category: 'literal' }
};

/**
 * Clase Token: Representa una unidad léxica con metadatos de posicionamiento.
 */
class Token {
  constructor(type, value, line, column, startOffset, endOffset) {
    this.type = type;
    this.value = value;
    this.line = line;
    this.column = column;
    this.startOffset = startOffset;
    this.endOffset = endOffset;
  }

  toString() {
    return `Token(${this.type}, '${this.value}', L:${this.line}, C:${this.column})`;
  }
}

/**
 * Clase Lexer: Escanea una cadena de código fuente y produce una secuencia de Tokens.
 */
class Lexer {
  constructor(source) {
    this.source = source || '';
    this.length = this.source.length;
    this.cursor = 0;
    this.line = 1;
    this.column = 1;
    this.tokens = [];
    this.errors = [];
  }

  // Comprueba si hemos llegado al final del archivo
  isAtEnd() {
    return this.cursor >= this.length;
  }

  // Retorna el carácter actual sin avanzar
  peek(offset = 0) {
    const pos = this.cursor + offset;
    return pos < this.length ? this.source[pos] : '\0';
  }

  // Avanza un carácter y actualiza coordenadas
  advance() {
    if (this.isAtEnd()) return '\0';
    const char = this.source[this.cursor++];
    if (char === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    return char;
  }

  // Coincide con el carácter esperado si no ha terminado
  match(expected) {
    if (this.isAtEnd()) return false;
    if (this.source[this.cursor] !== expected) return false;
    this.advance();
    return true;
  }

  // Salta espacios en blanco y comentarios
  skipWhitespaceAndComments() {
    while (!this.isAtEnd()) {
      const c = this.peek();

      // Espacios en blanco
      if (c === ' ' || c === '\t' || c === '\r' || c === '\n') {
        this.advance();
        continue;
      }

      // Comentario de una línea (//...)
      if (c === '/' && this.peek(1) === '/') {
        while (!this.isAtEnd() && this.peek() !== '\n') {
          this.advance();
        }
        continue;
      }

      // Comentario multilínea (/* ... */)
      if (c === '/' && this.peek(1) === '*') {
        const startLine = this.line;
        const startCol = this.column;
        this.advance(); // consume '/'
        this.advance(); // consume '*'
        
        let closed = false;
        while (!this.isAtEnd()) {
          if (this.peek() === '*' && this.peek(1) === '/') {
            this.advance(); // consume '*'
            this.advance(); // consume '/'
            closed = true;
            break;
          }
          this.advance();
        }

        if (!closed) {
          this.errors.push({
            line: startLine,
            column: startCol,
            message: `Comentario multilínea '/*' iniciado en L:${startLine}, C:${startCol} no fue cerrado`,
            snippet: '/*'
          });
        }
        continue;
      }

      break;
    }
  }

  // Tokeniza números enteros y de punto flotante
  scanNumber(startCol, startOffset) {
    while (!this.isAtEnd() && /[0-9]/.test(this.peek())) {
      this.advance();
    }

    // Parte decimal
    if (this.peek() === '.' && /[0-9]/.test(this.peek(1))) {
      this.advance(); // consume '.'
      while (!this.isAtEnd() && /[0-9]/.test(this.peek())) {
        this.advance();
      }
    }

    const value = this.source.slice(startOffset, this.cursor);
    return new Token(TokenType.NUMBER, value, this.line, startCol, startOffset, this.cursor);
  }

  // Tokeniza identificadores y palabras reservadas
  scanIdentifierOrKeyword(startCol, startOffset) {
    while (!this.isAtEnd() && /[a-zA-Z0-9_]/.test(this.peek())) {
      this.advance();
    }

    const value = this.source.slice(startOffset, this.cursor);
    const kw = KEYWORDS[value];

    if (kw) {
      return new Token(kw.type, value, this.line, startCol, startOffset, this.cursor);
    }
    return new Token(TokenType.IDENTIFIER, value, this.line, startCol, startOffset, this.cursor);
  }

  // Tokeniza cadenas de texto literales ("..." o '...')
  scanString(quoteChar, startCol, startOffset) {
    const startLine = this.line;
    let closed = false;

    while (!this.isAtEnd()) {
      const c = this.peek();
      if (c === '\\') {
        this.advance(); // consume barra invertida
        this.advance(); // consume carácter escapado
        continue;
      }
      if (c === quoteChar) {
        this.advance(); // consume comilla de cierre
        closed = true;
        break;
      }
      if (c === '\n') {
        // En lenguajes estructurados una cadena sin escapar no puede partir línea sin cerrar
        break;
      }
      this.advance();
    }

    const value = this.source.slice(startOffset, this.cursor);
    if (!closed) {
      this.errors.push({
        line: startLine,
        column: startCol,
        message: `Cadena de texto sin cerrar. Se esperaba delimitador de cierre ${quoteChar}`,
        snippet: value
      });
      return new Token(TokenType.ILLEGAL, value, startLine, startCol, startOffset, this.cursor);
    }

    return new Token(TokenType.STRING, value, startLine, startCol, startOffset, this.cursor);
  }

  // Escaneo completo del archivo fuente
  tokenize() {
    this.tokens = [];
    this.errors = [];
    this.cursor = 0;
    this.line = 1;
    this.column = 1;

    while (!this.isAtEnd()) {
      this.skipWhitespaceAndComments();
      if (this.isAtEnd()) break;

      const startCol = this.column;
      const startOffset = this.cursor;
      const char = this.advance();

      // Identificadores y palabras reservadas
      if (/[a-zA-Z_]/.test(char)) {
        this.tokens.push(this.scanIdentifierOrKeyword(startCol, startOffset));
        continue;
      }

      // Números
      if (/[0-9]/.test(char)) {
        this.tokens.push(this.scanNumber(startCol, startOffset));
        continue;
      }

      // Cadenas de texto
      if (char === '"' || char === "'") {
        this.tokens.push(this.scanString(char, startCol, startOffset));
        continue;
      }

      // Operadores y Delimitadores
      switch (char) {
        // Delimitadores
        case '(':
          this.tokens.push(new Token(TokenType.LPAREN, '(', this.line, startCol, startOffset, this.cursor));
          break;
        case ')':
          this.tokens.push(new Token(TokenType.RPAREN, ')', this.line, startCol, startOffset, this.cursor));
          break;
        case '{':
          this.tokens.push(new Token(TokenType.LBRACE, '{', this.line, startCol, startOffset, this.cursor));
          break;
        case '}':
          this.tokens.push(new Token(TokenType.RBRACE, '}', this.line, startCol, startOffset, this.cursor));
          break;
        case '[':
          this.tokens.push(new Token(TokenType.LBRACKET, '[', this.line, startCol, startOffset, this.cursor));
          break;
        case ']':
          this.tokens.push(new Token(TokenType.RBRACKET, ']', this.line, startCol, startOffset, this.cursor));
          break;
        case ';':
          this.tokens.push(new Token(TokenType.SEMICOLON, ';', this.line, startCol, startOffset, this.cursor));
          break;
        case ',':
          this.tokens.push(new Token(TokenType.COMMA, ',', this.line, startCol, startOffset, this.cursor));
          break;

        // Operadores de Asignación y Comparación
        case '=':
          if (this.match('=')) {
            this.tokens.push(new Token(TokenType.OP_EQUAL, '==', this.line, startCol, startOffset, this.cursor));
          } else {
            this.tokens.push(new Token(TokenType.OP_ASSIGN, '=', this.line, startCol, startOffset, this.cursor));
          }
          break;

        case '+':
          if (this.match('+')) {
            this.tokens.push(new Token(TokenType.OP_INC, '++', this.line, startCol, startOffset, this.cursor));
          } else if (this.match('=')) {
            this.tokens.push(new Token(TokenType.OP_COMPOUND_ASSIGN, '+=', this.line, startCol, startOffset, this.cursor));
          } else {
            this.tokens.push(new Token(TokenType.OP_PLUS, '+', this.line, startCol, startOffset, this.cursor));
          }
          break;

        case '-':
          if (this.match('-')) {
            this.tokens.push(new Token(TokenType.OP_DEC, '--', this.line, startCol, startOffset, this.cursor));
          } else if (this.match('=')) {
            this.tokens.push(new Token(TokenType.OP_COMPOUND_ASSIGN, '-=', this.line, startCol, startOffset, this.cursor));
          } else {
            this.tokens.push(new Token(TokenType.OP_MINUS, '-', this.line, startCol, startOffset, this.cursor));
          }
          break;

        case '*':
          if (this.match('=')) {
            this.tokens.push(new Token(TokenType.OP_COMPOUND_ASSIGN, '*=', this.line, startCol, startOffset, this.cursor));
          } else {
            this.tokens.push(new Token(TokenType.OP_MUL, '*', this.line, startCol, startOffset, this.cursor));
          }
          break;

        case '/':
          if (this.match('=')) {
            this.tokens.push(new Token(TokenType.OP_COMPOUND_ASSIGN, '/=', this.line, startCol, startOffset, this.cursor));
          } else {
            this.tokens.push(new Token(TokenType.OP_DIV, '/', this.line, startCol, startOffset, this.cursor));
          }
          break;

        case '%':
          this.tokens.push(new Token(TokenType.OP_MOD, '%', this.line, startCol, startOffset, this.cursor));
          break;

        case '!':
          if (this.match('=')) {
            this.tokens.push(new Token(TokenType.OP_NOT_EQUAL, '!=', this.line, startCol, startOffset, this.cursor));
          } else {
            this.tokens.push(new Token(TokenType.OP_NOT, '!', this.line, startCol, startOffset, this.cursor));
          }
          break;

        case '<':
          if (this.match('=')) {
            this.tokens.push(new Token(TokenType.OP_LTE, '<=', this.line, startCol, startOffset, this.cursor));
          } else {
            this.tokens.push(new Token(TokenType.OP_LT, '<', this.line, startCol, startOffset, this.cursor));
          }
          break;

        case '>':
          if (this.match('=')) {
            this.tokens.push(new Token(TokenType.OP_GTE, '>=', this.line, startCol, startOffset, this.cursor));
          } else {
            this.tokens.push(new Token(TokenType.OP_GT, '>', this.line, startCol, startOffset, this.cursor));
          }
          break;

        case '&':
          if (this.match('&')) {
            this.tokens.push(new Token(TokenType.OP_AND, '&&', this.line, startCol, startOffset, this.cursor));
          } else {
            this.errors.push({
              line: this.line,
              column: startCol,
              message: "Carácter '&' inesperado. Se esperaba operador lógico '&&'",
              snippet: '&'
            });
            this.tokens.push(new Token(TokenType.ILLEGAL, '&', this.line, startCol, startOffset, this.cursor));
          }
          break;

        case '|':
          if (this.match('|')) {
            this.tokens.push(new Token(TokenType.OP_OR, '||', this.line, startCol, startOffset, this.cursor));
          } else {
            this.errors.push({
              line: this.line,
              column: startCol,
              message: "Carácter '|' inesperado. Se esperaba operador lógico '||'",
              snippet: '|'
            });
            this.tokens.push(new Token(TokenType.ILLEGAL, '|', this.line, startCol, startOffset, this.cursor));
          }
          break;

        default:
          this.errors.push({
            line: this.line,
            column: startCol,
            message: `Carácter léxico ilegal o no reconocido: '${char}'`,
            snippet: char
          });
          this.tokens.push(new Token(TokenType.ILLEGAL, char, this.line, startCol, startOffset, this.cursor));
          break;
      }
    }

    // Token final EOF
    this.tokens.push(new Token(TokenType.EOF, 'EOF', this.line, this.column, this.cursor, this.cursor));
    return { tokens: this.tokens, errors: this.errors };
  }
}

// Exportar globalmente para navegador
window.TokenType = TokenType;
window.Token = Token;
window.Lexer = Lexer;
