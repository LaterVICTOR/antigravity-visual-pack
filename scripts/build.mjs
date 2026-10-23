import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const ide = args.includes('--ide') ? args[args.indexOf('--ide')+1] : process.env.IDEA_HOME;
if (!ide) throw new Error('Indica --ide con la carpeta de IntelliJ IDEA.');
const product = JSON.parse(fs.readFileSync(path.join(ide,'product-info.json'),'utf8'));
if (!product.buildNumber.startsWith('262.')) throw new Error(`Esta adaptación requiere IDEA 2026.2 (262), recibido ${product.buildNumber}`);
const bin = path.join(ide,'jbr/bin');
const executable = name => path.join(bin, name + (process.platform === 'win32' ? '.exe' : ''));
const javac = executable('javac');
const java = executable('java');
const jar = fs.existsSync(executable('jar')) ? executable('jar') : 'jar';
const resources = path.join(root,'src/main/resources');
fs.copyFileSync(path.join(root,'LICENSE'),path.join(resources,'licenses/Visual-Pack-MIT.txt'));
const classes = path.join(root,'build/classes');
const testClasses = path.join(root,'build/test-classes');
const stage = path.join(root,'build/staging/antigravity-visual-pack/lib');
const dist = path.join(root,'dist');
for (const directory of [classes,testClasses,stage,dist]) fs.mkdirSync(directory,{recursive:true});
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
  ...files(path.join(root,'src/test/java'),'.java')]);

const plugin = fs.readFileSync(path.join(resources,'META-INF/plugin.xml'),'utf8');
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
// Sólo se empaqueta la prueba; MaterialMappings se carga desde el JAR final.
run(jar,['--create','--file',testJar,'-C',testClasses,'local/visualpack/VerifyPack.class']);
run(java,['-Djava.awt.headless=true','-classpath',[testJar,jarPath].join(path.delimiter),
  'local.visualpack.VerifyPack',resources]);
const artifact = path.join(dist,'antigravity-visual-pack-1.0.0.zip');
run(jar,['--create','--no-manifest','--file',artifact,'-C',path.join(root,'build/staging'),'.']);
const sha256 = crypto.createHash('sha256').update(fs.readFileSync(artifact)).digest('hex');
fs.writeFileSync(artifact+'.sha256',sha256+'  '+path.basename(artifact)+'\n');
fs.writeFileSync(path.join(dist,'validation.json'),JSON.stringify({
  ide:product.version,build:product.buildNumber,artifact:path.basename(artifact),sha256,
  themes:themes.length,icons:files(path.join(resources,'material-icons'),'.svg').length,
  checks:['Compilación contra SDK local','Asociaciones de iconos','Recursos completos','SVG/XML válidos','Temas y esquemas registrados','Prueba desde JAR final'],
  visualReview:false,installed:false,
},null,2)+'\n');
console.log(`Paquete generado: ${artifact}\nSHA-256: ${sha256}`);
