import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const resources = path.join(root, 'src/main/resources');
const args = process.argv.slice(2);
const extensions = args.includes('--extensions') ? args[args.indexOf('--extensions') + 1] : null;
if (!extensions) throw new Error('Indica --extensions con la carpeta de extensiones de Antigravity.');

function installed(prefix) {
  const matches = fs.readdirSync(extensions).filter(name => name.startsWith(prefix));
  if (matches.length !== 1) throw new Error(`Se esperaba una instalación de ${prefix}; encontradas: ${matches.length}`);
  return path.join(extensions, matches[0]);
}
function write(relative, content) {
  const target = path.resolve(root, relative);
  if (!target.startsWith(root + path.sep)) throw new Error('Destino fuera del paquete');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}
function json(relative, content) { write(relative, JSON.stringify(content, null, 2) + '\n'); }
function xml(text) { return String(text).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'); }
function rgb(color) { return color?.replace('#', '').slice(0, 6).toUpperCase(); }

const iconsHome = installed('pkief.material-icon-theme-');
const themeHome = installed('giladgd.red-one-dark-pro-');
const manifest = JSON.parse(fs.readFileSync(path.join(iconsHome, 'dist/material-icons.json'), 'utf8'));
json('sources/material-icon-theme/material-icons.json', manifest);
const properties = [];
function property(key, value) {
  const escape = text => String(text).replaceAll('\\', '\\\\').replaceAll('\n', '\\n')
    .replace(/([ :=#!])/g, '\\$1').replace(/[^\x20-\x7E]/g, character => '\\u' + character.charCodeAt(0).toString(16).padStart(4, '0'));
  properties.push(`${escape(key.toLowerCase())}=${escape(value)}`);
}
const paths = {};
for (const [id, definition] of Object.entries(manifest.iconDefinitions)) {
  const source = path.resolve(iconsHome, 'dist', definition.iconPath);
  if (!source.startsWith(iconsHome + path.sep)) throw new Error(`Ruta de icono inválida: ${id}`);
  const name = path.basename(source);
  let svg = fs.readFileSync(source, 'utf8');
  // IntelliJ usa iconos de 16 px; viewBox conserva la geometría vectorial original.
  svg = svg.replace(/<svg\b([^>]*)>/, (_, attributes) => {
    attributes = attributes.replace(/\s+(width|height)\s*=\s*(["']).*?\2/g, '');
    return `<svg${attributes} width="16" height="16">`;
  });
  write(`src/main/resources/material-icons/${name}`, svg);
  paths[id] = `/material-icons/${name}`;
}
for (const section of ['fileNames', 'fileExtensions', 'folderNames', 'rootFolderNames', 'languageIds']) {
  for (const [name, id] of Object.entries(manifest[section] ?? {})) {
    if (!paths[id]) throw new Error(`Icono desconocido: ${id}`);
    property(`${section}.${name}`, paths[id]);
  }
  for (const [name, id] of Object.entries(manifest.light?.[section] ?? {})) {
    if (!paths[id]) throw new Error(`Icono claro desconocido: ${id}`);
    property(`light.${section}.${name}`, paths[id]);
  }
}
for (const key of ['file', 'folder', 'rootFolder']) property(`default.${key}`, paths[manifest[key] ?? manifest.folder]);
write('src/main/resources/material-icons/mappings.properties', properties.join('\n') + '\n');

const tokenScopes = {
  DEFAULT_LINE_COMMENT: 'comment.line', DEFAULT_BLOCK_COMMENT: 'comment.block', DEFAULT_DOC_COMMENT: 'comment.block.documentation',
  DEFAULT_KEYWORD: 'keyword.control', DEFAULT_STRING: 'string.quoted', DEFAULT_NUMBER: 'constant.numeric',
  DEFAULT_VALID_STRING_ESCAPE: 'constant.character.escape', DEFAULT_INVALID_STRING_ESCAPE: 'invalid.illegal',
  DEFAULT_OPERATION_SIGN: 'keyword.operator', DEFAULT_BRACES: 'punctuation.section.block', DEFAULT_BRACKETS: 'punctuation.section.brackets',
  DEFAULT_PARENTHS: 'punctuation.section.parens', DEFAULT_COMMA: 'punctuation.separator.comma', DEFAULT_SEMICOLON: 'punctuation.terminator',
  DEFAULT_DOT: 'punctuation.accessor', DEFAULT_IDENTIFIER: 'variable.other', DEFAULT_CONSTANT: 'constant.other',
  DEFAULT_LOCAL_VARIABLE: 'variable.other.readwrite', DEFAULT_GLOBAL_VARIABLE: 'variable.other', DEFAULT_PARAMETER: 'variable.parameter',
  DEFAULT_INSTANCE_FIELD: 'variable.other.property', DEFAULT_STATIC_FIELD: 'variable.other.constant',
  DEFAULT_CLASS_NAME: 'entity.name.type.class', DEFAULT_INTERFACE_NAME: 'entity.name.type.interface',
  DEFAULT_FUNCTION_DECLARATION: 'entity.name.function', DEFAULT_FUNCTION_CALL: 'entity.name.function',
  DEFAULT_INSTANCE_METHOD: 'entity.name.function', DEFAULT_STATIC_METHOD: 'entity.name.function',
  DEFAULT_METADATA: 'storage.type.annotation', DEFAULT_LABEL: 'entity.name.label', DEFAULT_TAG: 'entity.name.tag',
  DEFAULT_ATTRIBUTE: 'entity.other.attribute-name', DEFAULT_ENTITY: 'constant.character.entity',
  DEFAULT_MARKUP_ATTRIBUTE: 'entity.other.attribute-name', DEFAULT_MARKUP_ENTITY: 'constant.character.entity',
  DEFAULT_PREDEFINED_SYMBOL: 'support.constant', DEFAULT_DOC_COMMENT_TAG: 'storage.type.class',
  JAVA_KEYWORD: 'keyword.control.java', JAVA_STRING: 'string.quoted.double.java', JAVA_NUMBER: 'constant.numeric.java',
  JAVA_LINE_COMMENT: 'comment.line.java', JAVA_BLOCK_COMMENT: 'comment.block.java', JAVA_DOC_COMMENT: 'comment.block.documentation.java',
  JAVA_CLASS: 'entity.name.type.class.java', JAVA_INTERFACE: 'entity.name.type.interface.java', JAVA_METHOD: 'entity.name.function.java',
  JAVA_METHOD_CALL: 'entity.name.function.java', JAVA_STATIC_METHOD: 'entity.name.function.java', JAVA_STATIC_METHOD_CALL: 'entity.name.function.java',
  JAVA_INSTANCE_FIELD: 'variable.other.property.java', JAVA_STATIC_FIELD: 'variable.other.constant.java', JAVA_PARAMETER: 'variable.parameter.java',
  JAVA_LOCAL_VARIABLE: 'variable.other.readwrite.java', JAVA_ANNOTATION_NAME: 'storage.type.annotation.java',
  PY_KEYWORD: 'keyword.control.python', PY_STRING: 'string.quoted.python', PY_NUMBER: 'constant.numeric.python', PY_COMMENT: 'comment.line.python',
  PY_CLASS_DEFINITION: 'entity.name.type.class.python', PY_FUNC_DEFINITION: 'entity.name.function.python', PY_FUNCTION_CALL: 'entity.name.function.python',
  PY_PARAMETER: 'variable.parameter.python', PY_DECORATOR: 'entity.name.function.decorator.python', PY_BUILTIN_NAME: 'support.function.builtin.python',
  JS_KEYWORD: 'keyword.control.js', JS_STRING: 'string.quoted.js', JS_NUMBER: 'constant.numeric.js', JS_LINE_COMMENT: 'comment.line.js',
  JS_BLOCK_COMMENT: 'comment.block.js', JS_DOC_COMMENT: 'comment.block.documentation.js', JS_FUNCTION_DECLARATION: 'entity.name.function.js',
  JS_FUNCTION_CALL: 'entity.name.function.js', JS_CLASS: 'entity.name.type.class.js', JS_PARAMETER: 'variable.parameter.js',
  JS_LOCAL_VARIABLE: 'variable.other.readwrite.js', JS_GLOBAL_VARIABLE: 'variable.other.js', JS_INSTANCE_MEMBER_VARIABLE: 'variable.other.property.js',
  TS_KEYWORD: 'keyword.control.ts', TS_TYPE_PARAMETER: 'entity.name.type.ts', TS_INTERFACE: 'entity.name.type.interface.ts',
  PHP_KEYWORD: 'keyword.control.php', PHP_STRING: 'string.quoted.php', PHP_NUMBER: 'constant.numeric.php',
  PHP_LINE_COMMENT: 'comment.line.php', PHP_BLOCK_COMMENT: 'comment.block.php', PHP_DOC_COMMENT: 'comment.block.documentation.php',
  PHP_CLASS: 'entity.name.type.class.php', PHP_FUNCTION: 'entity.name.function.php', PHP_FUNCTION_CALL: 'entity.name.function.php',
  PHP_METHOD: 'entity.name.function.php', PHP_PARAMETER: 'variable.parameter.php', PHP_VARIABLE: 'variable.other.php',
  GO_KEYWORD: 'keyword.control.go', GO_STRING: 'string.quoted.go', GO_NUMBER: 'constant.numeric.go', GO_COMMENT: 'comment.line.go',
  GO_FUNCTION: 'entity.name.function.go', GO_TYPE_NAME: 'entity.name.type.go',
  RUBY_KEYWORD: 'keyword.control.ruby', RUBY_STRING: 'string.quoted.ruby', RUBY_NUMBER: 'constant.numeric.ruby',
  RUBY_COMMENT: 'comment.line.ruby', RUBY_METHOD_NAME: 'entity.name.function.ruby', RUBY_CLASS_NAME: 'entity.name.type.class.ruby',
  KOTLIN_KEYWORD: 'keyword.control.kotlin', KOTLIN_STRING: 'string.quoted.kotlin', KOTLIN_NUMBER: 'constant.numeric.kotlin',
  KOTLIN_CLASS: 'entity.name.type.class.kotlin', KOTLIN_FUNCTION_DECLARATION: 'entity.name.function.kotlin',
  KOTLIN_LINE_COMMENT: 'comment.line.kotlin', KOTLIN_BLOCK_COMMENT: 'comment.block.kotlin',
  JSON_PROPERTY_KEY: 'support.type.property-name.json', JSON_STRING: 'string.quoted.json', JSON_NUMBER: 'constant.numeric.json',
  JSON_KEYWORD: 'constant.language.json', JSON_BRACES: 'punctuation.section.block', JSON_BRACKETS: 'punctuation.section.brackets',
  XML_TAG: 'entity.name.tag', XML_TAG_NAME: 'entity.name.tag', XML_ATTRIBUTE_NAME: 'entity.other.attribute-name',
  XML_ATTRIBUTE_VALUE: 'string.quoted', XML_COMMENT: 'comment.block', XML_ENTITY_REFERENCE: 'constant.character.entity',
  HTML_TAG: 'entity.name.tag', HTML_TAG_NAME: 'entity.name.tag', HTML_ATTRIBUTE_NAME: 'entity.other.attribute-name',
  HTML_ATTRIBUTE_VALUE: 'string.quoted', HTML_COMMENT: 'comment.block',
  CSS_PROPERTY_NAME: 'support.type.property-name.css', CSS_PROPERTY_VALUE: 'support.constant.property-value.css',
  CSS_STRING: 'string.quoted.css', CSS_NUMBER: 'constant.numeric.css', CSS_COMMENT: 'comment.block.css',
  CSS_CLASS_NAME: 'entity.other.attribute-name.class.css', CSS_ID: 'entity.other.attribute-name.id.css',
  MARKDOWN_HEADER_LEVEL_1: 'markup.heading', MARKDOWN_HEADER_LEVEL_2: 'markup.heading', MARKDOWN_HEADER_LEVEL_3: 'markup.heading',
  MARKDOWN_BOLD: 'markup.bold', MARKDOWN_ITALIC: 'markup.italic', MARKDOWN_CODE_SPAN: 'markup.inline.raw.string.markdown',
  MARKDOWN_LINK_TEXT: 'string.other.link.title.markdown', MARKDOWN_LINK_DESTINATION: 'markup.underline.link',
};
function tokenSettings(theme, scope) {
  const attributes = {};
  const priorities = {};
  for (const rule of theme.tokenColors) {
    const scopes = (Array.isArray(rule.scope) ? rule.scope : [rule.scope ?? ''])
      .flatMap(value => value.split(',')).map(value => value.trim());
    for (const selector of scopes) {
      // Las reglas contextuales TextMate no tienen traducción directa al esquema de IDEA.
      if (selector && !/^[\w.-]+$/.test(selector)) continue;
      if (selector && scope !== selector && !scope.startsWith(selector + '.')) continue;
      for (const [key, value] of Object.entries(rule.settings)) {
        if (selector.length >= (priorities[key] ?? -1)) {
          attributes[key] = value;
          priorities[key] = selector.length;
        }
      }
    }
  }
  return attributes;
}
function attribute(name, values) {
  const options = Object.entries(values).filter(([, value]) => value != null)
    .map(([key, value]) => `        <option name="${xml(key)}" value="${xml(value)}"/>`).join('\n');
  return `    <option name="${xml(name)}"><value>\n${options}\n    </value></option>`;
}
function editorScheme(theme) {
  const c = theme.colors;
  const pick = (key, fallback) => rgb(c[key] ?? fallback);
  const colors = {
    CARET_COLOR: pick('editorCursor.foreground', c['editor.foreground']), CARET_ROW_COLOR: pick('editor.lineHighlightBackground', c['editor.background']),
    SELECTION_BACKGROUND: pick('editor.selectionBackground', '#283141'), SELECTION_FOREGROUND: rgb(c['editor.foreground']),
    LINE_NUMBERS_COLOR: pick('editorLineNumber.foreground', '#5c6370'), LINE_NUMBER_ON_CARET_ROW_COLOR: pick('editorLineNumber.activeForeground', c['editor.foreground']),
    GUTTER_BACKGROUND: rgb(c['editor.background']), INDENT_GUIDE: pick('editorIndentGuide.background', '#292d36'),
    SELECTED_INDENT_GUIDE: pick('editorIndentGuide.activeBackground', '#5c6370'), WHITESPACES: pick('editorWhitespace.foreground', '#3d424d'),
    RIGHT_MARGIN_COLOR: pick('editorRuler.foreground', '#292d36'),
    CONSOLE_BACKGROUND_KEY: pick('terminal.background', c['editor.background']),
    MATCHED_BRACES_INDENT_GUIDE_COLOR: pick('editorBracketMatch.border', '#e65050'),
    ADDED_LINES_COLOR: pick('editorGutter.addedBackground', '#98c379'), MODIFIED_LINES_COLOR: pick('editorGutter.modifiedBackground', '#61afef'),
    DELETED_LINES_COLOR: pick('editorGutter.deletedBackground', '#e06c75'),
  };
  for (const [ansi, key] of Object.entries({Black:'BLACK',Red:'RED',Green:'GREEN',Yellow:'YELLOW',Blue:'BLUE',Magenta:'MAGENTA',Cyan:'CYAN',White:'GRAY',BrightBlack:'DARKGRAY',BrightRed:'RED_BRIGHT',BrightGreen:'GREEN_BRIGHT',BrightYellow:'YELLOW_BRIGHT',BrightBlue:'BLUE_BRIGHT',BrightMagenta:'MAGENTA_BRIGHT',BrightCyan:'CYAN_BRIGHT',BrightWhite:'WHITE'})) {
    if (c['terminal.ansi'+ansi]) colors['CONSOLE_'+key+'_OUTPUT'] = rgb(c['terminal.ansi'+ansi]);
  }
  const attributes = [attribute('TEXT', {FOREGROUND:rgb(c['editor.foreground']), BACKGROUND:rgb(c['editor.background'])})];
  for (const [key, scope] of Object.entries(tokenScopes)) {
    const settings = tokenSettings(theme, scope);
    const font = settings.fontStyle ?? '';
    attributes.push(attribute(key, {
      FOREGROUND: rgb(settings.foreground ?? c['editor.foreground']),
      FONT_TYPE: (font.includes('bold') ? 1 : 0) + (font.includes('italic') ? 2 : 0),
      ...(font.includes('underline') ? {EFFECT_TYPE:1, EFFECT_COLOR:rgb(settings.foreground ?? c['editor.foreground'])} : {}),
    }));
  }
  attributes.push(attribute('ERRORS_ATTRIBUTES', {EFFECT_COLOR:pick('editorError.foreground','#ff3333'), EFFECT_TYPE:2}));
  attributes.push(attribute('WARNING_ATTRIBUTES', {EFFECT_COLOR:pick('editorWarning.foreground','#ffb454'), EFFECT_TYPE:2}));
  attributes.push(attribute('SEARCH_RESULT_ATTRIBUTES', {BACKGROUND:pick('editor.findMatchHighlightBackground','#303a48')}));
  attributes.push(attribute('WRITE_SEARCH_RESULT_ATTRIBUTES', {BACKGROUND:pick('editor.findMatchBackground','#435166')}));
  return `<scheme name="${xml(theme.name)}" version="142" parent_scheme="Darcula">\n  <metaInfo><property name="originalScheme">${xml(theme.name)}</property></metaInfo>\n  <colors>\n${Object.entries(colors).map(([key,value])=>`    <option name="${key}" value="${value}"/>`).join('\n')}\n  </colors>\n  <attributes>\n${attributes.join('\n')}\n  </attributes>\n</scheme>\n`;
}
function uiTheme(theme, variant) {
  const c = theme.colors;
  const background = c['editor.background'];
  const foreground = c['editor.foreground'];
  const panel = c['sideBar.background'] ?? background;
  const accent = c['textLink.foreground'];
  const selection = c['list.activeSelectionBackground'];
  const ui = {
    '*': {background:panel,foreground,selectionBackground:selection,selectionForeground:foreground,focusColor:accent},
    'Panel.background':panel, 'Label.foreground':foreground, 'Label.disabledForeground':c['input.placeholderForeground'],
    'EditorPane.background':background,'TextArea.background':background,'TextArea.foreground':foreground,
    'TextField.background':c['input.background'],'TextField.foreground':c['input.foreground'],
    'TextField.caretForeground':foreground,'TextField.selectionBackground':c['editor.selectionBackground'],
    'TextField.selectionForeground':foreground,'TextField.inactiveForeground':c['input.placeholderForeground'],
    'TextField.borderColor':c['input.border'],'TextField.focusedBorderColor':accent,
    'TextPane.background':background,'PasswordField.background':c['input.background'],
    'ComboBox.background':c['dropdown.background'],'ComboBox.foreground':foreground,'ComboBox.borderColor':c['dropdown.border'],
    'ComboBox.ArrowButton.background':c['dropdown.background'],'ComboBox.ArrowButton.iconColor':foreground,
    'Button.startBackground':c['button.background'],'Button.endBackground':c['button.background'],
    'Button.foreground':c['button.foreground'],'Button.default.startBackground':c['button.background'],
    'Button.default.endBackground':c['button.background'],'Button.default.foreground':c['button.foreground'],
    'Button.focusedBorderColor':accent,'Button.default.focusedBorderColor':accent,
    'Link.activeForeground':accent,'Link.hoverForeground':c['textLink.activeForeground'],
    'ProgressBar.progressColor':c['progressBar.background'],'ProgressBar.trackColor':background,
    'Tree.background':panel,'Tree.foreground':foreground,'Tree.selectionBackground':selection,
    'Tree.selectionForeground':foreground,'Tree.selectionInactiveBackground':c['list.inactiveSelectionBackground'],
    'Tree.selectionInactiveForeground':foreground,'Tree.hoverBackground':c['list.hoverBackground'],
    'List.background':panel,'List.foreground':foreground,'List.selectionBackground':selection,
    'List.selectionForeground':foreground,'Table.background':background,'Table.foreground':foreground,
    'Table.selectionBackground':selection,'Table.selectionForeground':foreground,
    'ToolWindow.background':panel,'ToolWindow.Header.background':c['sideBarSectionHeader.background'] ?? panel,
    'ToolWindow.HeaderTab.selectedBackground':background,'ToolWindow.HeaderTab.underlineColor':accent,
    'MainToolbar.background':c['titleBar.activeBackground'] ?? panel,
    'MainToolbar.Dropdown.background':c['titleBar.activeBackground'] ?? panel,
    'MainWindow.background':panel,'MainWindow.BorderColor':c['sideBar.border'] ?? panel,
    'Menu.background':panel,'Menu.foreground':foreground,'MenuBar.background':c['titleBar.activeBackground'] ?? panel,
    'MenuItem.background':panel,'MenuItem.foreground':foreground,'MenuItem.selectionBackground':selection,
    'MenuItem.selectionForeground':foreground,'PopupMenu.background':c['dropdown.background'],
    'Popup.borderColor':c['dropdown.border'],'Separator.foreground':c['dropdown.border'],
    'EditorTabs.background':c['editorGroupHeader.tabsBackground'] ?? panel,
    'EditorTabs.underlinedTabBackground':c['tab.activeBackground'] ?? background,
    'EditorTabs.inactiveUnderlinedTabBackground':c['tab.inactiveBackground'] ?? panel,
    'EditorTabs.selectedForeground':c['tab.activeForeground'] ?? foreground,
    'EditorTabs.underlineColor':c['tab.activeBorder'] ?? accent,
    'EditorTabs.inactiveUnderlineColor':c['tab.activeBorder'] ?? accent,
    'EditorTabs.hoverBackground':c['tab.hoverBackground'] ?? background,
    'EditorTabs.inactiveMaskColor':'#00000000',
    'StatusBar.background':c['statusBar.background'] ?? panel,'StatusBar.foreground':c['statusBar.foreground'] ?? foreground,
    'StatusBar.borderColor':c['statusBar.border'] ?? panel,
    'ScrollBar.trackColor':background,'ScrollBar.thumbColor':c['scrollbarSlider.background'],
    'ScrollBar.hoverThumbColor':c['scrollbarSlider.hoverBackground'],
    'Component.borderColor':c['input.border'],'Component.focusColor':accent,
    'Component.errorFocusColor':c['inputValidation.errorBorder'],'Component.warningFocusColor':c['inputValidation.warningBorder'],
  };
  for (const key of Object.keys(ui)) if (ui[key] == null) delete ui[key];
  return {name:theme.name,dark:true,author:'giladgd; local IntelliJ adaptation',editorScheme:`/themes/${variant}.xml`,ui};
}
for (const filename of fs.readdirSync(path.join(themeHome,'themes')).filter(name=>name.endsWith('.json'))) {
  const original = fs.readFileSync(path.join(themeHome,'themes',filename),'utf8');
  const theme = JSON.parse(original);
  const variant = filename.replace('red-one-dark-pro-','').replace('-color-theme.json','');
  write(`sources/red-one-dark-pro/${filename}`,original);
  json(`src/main/resources/themes/${variant}.theme.json`,uiTheme(theme,variant));
  write(`src/main/resources/themes/${variant}.xml`,editorScheme(theme));
}
write('src/main/resources/licenses/Material-Icon-Theme-MIT.txt',fs.readFileSync(path.join(iconsHome,'LICENSE.txt')));
write('src/main/resources/licenses/Red-One-Dark-Pro-MIT.txt',fs.readFileSync(path.join(themeHome,'LICENSE.txt')));
json('src/main/resources/licenses/provenance.json', {
  materialIconTheme:{version:'5.34.0',source:'https://github.com/material-extensions/vscode-material-icon-theme',license:'MIT'},
  redOneDarkPro:{version:'1.5.0',source:'https://gitlab.com/giladgd/red-one-dark-pro',license:'MIT'},
  background:{implementation:'Native IntelliJ Background Image; no source copied from Katsute Background'},
});
console.log(`Importados ${Object.keys(paths).length} iconos, ${properties.length} asociaciones y 4 temas.`);
