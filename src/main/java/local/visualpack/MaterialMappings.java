package local.visualpack;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.Locale;
import java.util.Properties;

/** Resuelve nombres y extensiones sin cargar PSI ni acceder al disco del proyecto. */
public final class MaterialMappings {
    private final Properties mappings = new Properties();

    public MaterialMappings() {
        try (InputStream input = MaterialMappings.class.getResourceAsStream("/material-icons/mappings.properties")) {
            if (input == null) throw new IOException("Faltan las asociaciones de Material Icon Theme");
            mappings.load(input);
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }

    public String resolve(String path, boolean directory, boolean root, boolean light, String language) {
        String normalized = path.replace('\\', '/').toLowerCase(Locale.ROOT);
        String name = normalized.substring(normalized.lastIndexOf('/') + 1);
        if (directory) {
            String icon = root ? lookup("rootFolderNames", name, light) : null;
            if (icon == null) icon = lookup("folderNames", name, light);
            return icon != null ? icon : mappings.getProperty(root ? "default.rootfolder" : "default.folder");
        }
        // Primero los nombres exactos, incluyendo asociaciones dependientes de una carpeta.
        for (int start = 0; start < normalized.length();) {
            String icon = lookup("fileNames", normalized.substring(start), light);
            if (icon != null) return icon;
            int slash = normalized.indexOf('/', start);
            if (slash < 0) break;
            start = slash + 1;
        }
        // Una extensión compuesta como d.ts tiene prioridad sobre ts.
        for (int dot = name.indexOf('.'); dot >= 0; dot = name.indexOf('.', dot + 1)) {
            String icon = lookup("fileExtensions", name.substring(dot + 1), light);
            if (icon != null) return icon;
        }
        if (language != null) {
            String icon = lookup("languageIds", language.toLowerCase(Locale.ROOT), light);
            if (icon != null) return icon;
        }
        return mappings.getProperty("default.file");
    }

    private String lookup(String section, String name, boolean light) {
        String key = section.toLowerCase(Locale.ROOT) + "." + name;
        String override = light ? mappings.getProperty("light." + key) : null;
        return override != null ? override : mappings.getProperty(key);
    }
}
