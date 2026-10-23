package local.visualpack;

import com.intellij.ide.FileIconProvider;
import com.intellij.openapi.project.DumbAware;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.fileTypes.LanguageFileType;
import com.intellij.openapi.util.IconLoader;
import com.intellij.openapi.vfs.VirtualFile;
import com.intellij.ui.JBColor;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Locale;
import javax.swing.Icon;

/** Los SVG originales se almacenan en el plugin y se cargan a demanda. */
public final class MaterialFileIcons implements FileIconProvider, DumbAware {
    private static final MaterialMappings MAPPINGS = new MaterialMappings();
    private static final ConcurrentHashMap<String, Icon> CACHE = new ConcurrentHashMap<>();

    @Override
    public Icon getIcon(VirtualFile file, int flags, Project project) {
        String language = file.getFileType() instanceof LanguageFileType type
                ? type.getLanguage().getID().toLowerCase(Locale.ROOT) : null;
        if ("ecmascript 6".equals(language)) language = "javascript";
        if ("shell script".equals(language)) language = "shellscript";
        return icon(file, project, language);
    }

    static Icon icon(VirtualFile file, Project project, String language) {
        if (file == null || !file.isValid()) return null;
        boolean root = project != null && file.getPath().equals(project.getBasePath());
        String path = MAPPINGS.resolve(file.getPath(), file.isDirectory(), root,
                JBColor.isBright(), language);
        return path == null ? null : CACHE.computeIfAbsent(path,
                value -> IconLoader.getIcon(value, MaterialFileIcons.class));
    }
}
