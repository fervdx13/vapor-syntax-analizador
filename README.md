# VAPOR-SYNTAX // Analizador Sintáctico Descendente Recursivo

> **Tecnológico Nacional de México | Instituto Tecnológico de Pachuca**  
> **Departamento de Sistemas y Computación**  
> **Materia:** Lenguajes y Autómatas I  
> **Actividad:** Act. 1 - Analizador de errores sintácticos  
> **Catedrático:** Mtro. Diego David Pérez Spíndola  
> 
> **Integrantes del Equipo:**  
> - Fernando Vidal Delgado (No. Control: **23200905**)  
> - Jordan Vicente Vite Gomez (No. Control: **23200908**)  
> 
> 🌐 **Despliegue en Vivo (GitHub Pages):**  
> [https://fervdx13.github.io/vapor-syntax-analizador/](https://fervdx13.github.io/vapor-syntax-analizador/)

---

## ⚡ Descripción del Proyecto

**VAPOR-SYNTAX** es una aplicación web interactiva de alto rendimiento desarrollada desde cero en JavaScript vanilla, diseñada bajo una estética retro-futurista *Vaporwave / Outrun*. Su propósito académico es implementar un compilador frontend completo con analizador léxico (*Lexer*), analizador sintáctico descendente recursivo (*Recursive Descent Parser*) con recuperación en modo pánico (*Panic Mode Synchronization*) y un motor de visualización interactiva del Árbol de Sintaxis Abstracta (*AST*) en SVG/Canvas.

---

## 🚀 Características Principales

### 1. Editor de Código Fuente y Gestión de Archivos
- **Numeración sincronizada:** Conteo en tiempo real de líneas, columnas y caracteres.
- **Soporte de tabulación:** Inserción nativa de 4 espacios al presionar `Tab`.
- **Carga de archivos locales:** Importación de código desde archivos con extensiones `.txt`, `.c`, `.cpp`, `.java`, `.js` y `.py`.
- **Inicio Limpio (Restricción Académica):** El entorno de edición inicia completamente vacío, sin plantillas ni fragmentos precargados.

### 2. Motor Léxico y Sintáctico (Implementado desde cero)
- **Tokenizador manual (`Lexer`):** Clasifica palabras reservadas, identificadores, constantes numéricas enteras y flotantes, literales de cadena, operadores aritméticos, relacionales, lógicos y delimitadores.
- **Parser Descendente Recursivo (`Parser`):** Evalúa la gramática estructurada de sentencias, declaraciones de variables, asignaciones compuestas, condicionales (`if` / `else`), ciclos (`while`, `do-while`, `for`), llamadas a funciones e instrucciones de entrada/salida (`print`, `return`).
- **Modo Pánico con Sincronización:** Detecta y reporta múltiples errores simultáneos en una sola pasada sin interrumpir abruptamente el análisis.

### 3. Detección Exhaustiva de Errores Sintácticos
- **Delimitadores desbalanceados:** Rastreo en pila de paréntesis `()`, llaves `{}` y corchetes `[]`, indicando con exactitud la línea y columna donde se abrió el símbolo no cerrado.
- **Instrucciones incompletas:** Ausencia de `;`, asignaciones truncadas o declaraciones sin identificador.
- **Condiciones vacías o malformadas:** Validación de expresiones en estructuras de control.
- **Uso inválido de operadores:** Detección de operadores binarios consecutivos o mal posicionados.
- **Estructuras huérfanas u orden inválido:** Detección de sentencias `else` sin `if` asociado o inicio inválido de instrucciones.

### 4. Diagnóstico Detallado y Resaltado en Editor
- **Tarjetas de diagnóstico:** Cada error detectado presenta su coordenada (Línea : Columna), categoría técnica, fragmento exacto, explicación pedagógica y token esperado.
- **Navegación al error:** Al hacer clic en una tarjeta de diagnóstico, el editor se desplaza automáticamente y enfoca la línea afectada.
- **Resaltado en código:** Marcado visual con resplandor neón y subrayado ondulado sobre la línea y fragmento con error.
- **Pestaña de Flujo Léxico:** Tabla interactiva con el desglose de todos los tokens reconocidos y buscador en tiempo real.

### 5. Árbol de Sintaxis Abstracta (AST) Interactivo
- **Generación automática:** Se renderiza únicamente cuando el código es 100% sintácticamente válido.
- **Visualización en SVG:** Nodos estilizados con código de colores por categoría gramatical y conectores curvos Bezier.
- **Controles interactivos:** Soporte para acercar (`+`), alejar (`-`), centrar/ajustar vista y arrastre con mouse (*Pan & Zoom*).
- **Exportación sin cortes:** Descarga del árbol completo en formato vectorial **SVG** y mapa de bits **PNG** de alta resolución (DPI 2x) con fondo retro-futurista incorporado.

---

## 📂 Estructura del Repositorio

```text
vapor-syntax-analizador/
├── index.html          # Estructura semántica, paneles y pie de página académico
├── styles.css          # Estética Vaporwave, horizonte 3D animado y reglas Neón
├── lexer.js            # Analizador léxico manual (Tokenizador)
├── parser.js           # Parser descendente recursivo con sincronización
├── astVisualizer.js    # Renderizado y exportación SVG/PNG del AST
├── app.js              # Controlador UI, eventos del editor y orquestación
└── README.md           # Documentación académica del proyecto
```

---

## 🛠️ Requisitos de Ejecución

La aplicación está construida enteramente con tecnologías web estándar (HTML5, CSS3, ES6 Moderno) sin dependencias ni compiladores externos.

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/fervdx13/vapor-syntax-analizador.git
   ```
2. Abrir el archivo `index.html` directamente en cualquier navegador moderno (Google Chrome, Microsoft Edge, Mozilla Firefox o Brave).
3. O acceder directamente a la versión en línea a través de **GitHub Pages**:  
   [https://fervdx13.github.io/vapor-syntax-analizador/](https://fervdx13.github.io/vapor-syntax-analizador/)
