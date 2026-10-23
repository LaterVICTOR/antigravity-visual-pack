package local.visualpack;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Properties;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;

/** Comprueba asociaciones reales y que todos los recursos empaquetados sean válidos. */
public final class VerifyPack {
    private static final MaterialMappings MAPPINGS = new MaterialMappings();
    private static int assertions;

    public static void main(String[] arguments) throws Exception {
        expect("/project/Foo.java", false, false, false, null, "java");
        expect("C:\\Project\\FOO.JAVA", false, false, false, null, "java");
        expect("/project/types.d.ts", false, false, false, "typescript", "typescript-def");
        expect("/project/data.json", false, false, false, null, "json");
        expect("/project/.config/graphqlrc", false, false, false, null, "graphql");
        expect("/project/no-extension", false, false, false, "javascript", "javascript");
        expect("/project/no-extension", false, false, false, "python", "python");
        expect("/project/no-extension", false, false, false, null, "file");
        expect("/project/src", true, false, false, null, "folder-src");
        expect("/project/node_modules", true, false, false, null, "folder-node");
        expect("/project/.git", true, false, false, null, "folder-git");
        expect("/project/xyzunknown", true, false, false, null, "folder");

        Properties properties = new Properties();
        try (InputStream input = VerifyPack.class.getResourceAsStream("/material-icons/mappings.properties")) {
            properties.load(input);
        }
        check(MAPPINGS.resolve("/xyzunknown",true,true,false,null).equals(properties.getProperty("default.rootfolder")), "Carpeta raíz");
        for (String key : properties.stringPropertyNames()) {
            check(VerifyPack.class.getResource(properties.getProperty(key)) != null, "Recurso de " + key);
            if (key.startsWith("light.languageids.")) {
                check(MAPPINGS.resolve("/unknown-name",false,false,true,nullOrLanguage(key)).equals(properties.getProperty(key)),"Variante clara " + key);
            }
        }

        Path resources = Path.of(arguments[0]);
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
        factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
        int xmlFiles = 0;
        try (var files = Files.walk(resources)) {
            for (Path file : files.filter(path -> path.toString().endsWith(".svg") || path.toString().endsWith(".xml")).toList()) {
                factory.newDocumentBuilder().parse(file.toFile());
                xmlFiles++;
            }
        }
        System.out.println("Verificación correcta: " + assertions + " comprobaciones; " + xmlFiles + " SVG/XML válidos.");
    }

    private static String nullOrLanguage(String key) {
        return key.substring("light.languageids.".length());
    }

    private static void expect(String path, boolean directory, boolean root, boolean light, String language, String expected) {
        String actual = MAPPINGS.resolve(path,directory,root,light,language);
        check(("/material-icons/" + expected + ".svg").equals(actual), path + ": " + actual + " != " + expected);
    }

    private static void check(boolean condition, String message) {
        assertions++;
        if (!condition) throw new AssertionError(message);
    }
}
