import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const argValue = flag => args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined;
const ide = argValue('--ide') ?? process.env.IDEA_HOME;
if (!ide) throw new Error('Indica --ide con la carpeta de IntelliJ IDEA.');
const repoBase = (argValue('--repo-base') ?? 'https://raw.githubusercontent.com/LaterVICTOR/antigravity-visual-pack/main').replace(/\/+$/, '');
const publish = args.includes('--publish');
const product = JSON.parse(fs.readFileSync(path.join(ide,'product-info.json'),'utf8'));
const resources = path.join(root,'src/main/resources');
const plugin = fs.readFileSync(path.join(resources,'META-INF/plugin.xml'),'utf8');
const compatibility = plugin.match(/<idea-version since-build="(\d+)" until-build="(\d+)\.\*"\s*\/>/);
if (!compatibility) throw new Error('Falta un rango de compatibilidad válido en plugin.xml.');
const branch = Number(product.buildNumber.split('.')[0]);
if (!Number.isInteger(branch) || branch < Number(compatibility[1]) || branch > Number(compatibility[2])) {
  throw new Error(`El SDK ${product.buildNumber} queda fuera del rango ${compatibility[1]}–${compatibility[2]}.* declarado en plugin.xml.`);
}
const pluginId = plugin.match(/<id>([^<]+)<\/id>/)?.[1]?.trim();
const pluginName = plugin.match(/<name>([^<]+)<\/name>/)?.[1]?.trim();
const version = plugin.match(/<version>([^<]+)<\/version>/)?.[1]?.trim();
const descriptionMatch = plugin.match(/<description>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/description>/);
const description = (descriptionMatch?.[1] ?? descriptionMatch?.[2] ?? '').trim();
if (!pluginId || !pluginName) throw new Error('Falta <id> o <name> válido en plugin.xml.');
if (!version || !/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Versión de plugin inválida.');
const pluginDepends = [...plugin.matchAll(/<depends>([^<]+)<\/depends>/g)]
  .map(match => match[1].trim())
  .filter(dep => dep && !dep.startsWith('com.intellij.modules.'));
const xmlEscape = value => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');
const artifactName = `antigravity-visual-pack-${version}.zip`;
const downloadUrl = `${repoBase}/downloads/${artifactName}`;
const descriptionLines = description
  ? description.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  : [];
const updatePluginsXml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<plugins>',
  `  <plugin id="${xmlEscape(pluginId)}"`,
  `          url="${xmlEscape(downloadUrl)}"`,
  `          version="${xmlEscape(version)}">`,
  `    <idea-version since-build="${xmlEscape(compatibility[1])}" until-build="${xmlEscape(compatibility[2])}.*"/>`,
  `    <name>${xmlEscape(pluginName)}</name>`,
  ...(descriptionLines.length > 0
    ? [`    <description><![CDATA[\n      ${descriptionLines.join('\n      ').replaceAll(']]>', ']]]]><![CDATA[>')}\n    ]]></description>`]
    : []),
  ...pluginDepends.map(dep => `    <depends>${xmlEscape(dep)}</depends>`),
  '  </plugin>',
  '</plugins>',
  '',
].join('\n');
const bin = path.join(ide,'jbr/bin');
const executable = name => path.join(bin, name + (process.platform === 'win32' ? '.exe' : ''));
const javac = executable('javac');
const java = executable('java');
const jar = fs.existsSync(executable('jar')) ? executable('jar') : 'jar';
fs.copyFileSync(path.join(root,'LICENSE'),path.join(resources,'licenses/Visual-Pack-MIT.txt'));
const classes = path.join(root,'build/classes');
const testClasses = path.join(root,'build/test-classes');
const stage = path.join(root,'build/staging/antigravity-visual-pack/lib');
const dist = path.join(root,'dist');
for (const directory of [classes,testClasses,stage,dist]) fs.mkdirSync(directory,{recursive:true});
const stagedUpdateXml = path.join(root,'build/updatePlugins.xml');
fs.writeFileSync(stagedUpdateXml, updatePluginsXml, 'utf8');
function files(directory,extension) {
  return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()
    ? files(path.join(directory,entry.name),extension)
    : entry.name.endsWith(extension) ? [path.join(directory,entry.name)] : []);
}
function run(command,arguments_) {
  const result = spawnSync(command,arguments_,{cwd:root,stdio:'inherit',windowsHide:true});
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${path.basename(command)} terminó con código ${result.status}`);
}

// No se descargan SDK ni plugins: se usa el SDK de la instalación del usuario.
const classpath = path.join(ide,'lib/*');
run(javac,['-encoding','UTF-8','-proc:none','--release','21','-classpath',classpath,'-d',classes,
  ...files(path.join(root,'src/main/java'),'.java')]);
// Compila la prueba con la fuente explícita. Algunos sandboxes de Windows no
// permiten al compilador canonicalizar directorios del usuario como classpath.
run(javac,['-encoding','UTF-8','-proc:none','--release','21','-d',testClasses,
  path.join(root,'src/main/java/local/visualpack/MaterialMappings.java'),
  path.join(root,'src/main/java/local/visualpack/BackgroundImages.java'),
  ...files(path.join(root,'src/test/java'),'.java')]);

const themes = files(path.join(resources,'themes'),'.theme.json');
if (themes.length !== 4) throw new Error('Deben existir las cuatro variantes del tema.');
for (const filename of themes) {
  const theme = JSON.parse(fs.readFileSync(filename,'utf8'));
  if (!theme.dark || !theme.name.startsWith('Red One Dark Pro | ')) throw new Error('Tema inválido');
  if (!fs.existsSync(path.join(resources,theme.editorScheme))) throw new Error(`Falta ${theme.editorScheme}`);
  const relative = '/themes/'+path.basename(filename);
  if (!plugin.includes(`path="${relative}"`)) throw new Error(`Tema sin registrar: ${relative}`);
  const walk = value => {
    if (typeof value==='object') { for (const item of Object.values(value)) walk(item); }
    else if (typeof value==='string' && !/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(value)) throw new Error(`Color inválido: ${value}`);
  };
  walk(theme.ui);
}
const jarPath = path.join(stage,'antigravity-visual-pack.jar');
run(jar,['--create','--file',jarPath,'-C',classes,'.','-C',resources,'.']);
const testJar = path.join(root,'build/verification.jar');
// Sólo se empaquetan pruebas: las clases probadas se cargan desde el JAR final.
run(jar,['--create','--file',testJar,'-C',testClasses,'local/visualpack/VerifyPack.class',
  '-C',testClasses,'local/visualpack/VerifyBackgroundImages.class']);
run(java,['-Djava.awt.headless=true','-classpath',[testJar,jarPath].join(path.delimiter),
  'local.visualpack.VerifyPack',resources,stagedUpdateXml]);
run(java,['-Djava.awt.headless=true','-classpath',[testJar,jarPath].join(path.delimiter),
  'local.visualpack.VerifyBackgroundImages']);
const artifact = path.join(dist, artifactName);
run(jar,['--create','--no-manifest','--file',artifact,'-C',path.join(root,'build/staging'),'.']);
const sha256 = crypto.createHash('sha256').update(fs.readFileSync(artifact)).digest('hex');
fs.writeFileSync(artifact+'.sha256',sha256+'  '+path.basename(artifact)+'\n');
const updateXmlPath = path.join(root,'updatePlugins.xml');
fs.writeFileSync(updateXmlPath, updatePluginsXml, 'utf8');
if (publish) {
  const downloads = path.join(root,'downloads');
  fs.mkdirSync(downloads,{recursive:true});
  fs.copyFileSync(artifact, path.join(downloads, artifactName));
  fs.copyFileSync(artifact+'.sha256', path.join(downloads, artifactName+'.sha256'));
}
fs.writeFileSync(path.join(dist,'validation.json'),JSON.stringify({
  ide:product.version,build:product.buildNumber,artifact:path.basename(artifact),sha256,
  repositoryUrl:`${repoBase}/updatePlugins.xml`,
  themes:themes.length,icons:files(path.join(resources,'material-icons'),'.svg').length,
  checks:['Compilación contra SDK local','Asociaciones de iconos','Recursos completos','SVG/XML válidos','updatePlugins.xml válido','Temas y esquemas registrados','Prueba desde JAR final','Carpetas, subcarpetas, rotación, cancelación y fotos dañadas'],
  visualReview:false,installed:false,
},null,2)+'\n');
console.log(`Paquete generado: ${artifact}\nSHA-256: ${sha256}\nRepositorio XML: ${updateXmlPath}`);
const publishedZip = path.join(root,'downloads',artifactName);
if (!fs.existsSync(publishedZip)) {
  console.warn(`Aviso: ${publishedZip} todavía no existe. Usa --publish o copia el ZIP a downloads/ antes de hacer push.`);
}
