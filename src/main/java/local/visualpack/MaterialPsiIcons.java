package local.visualpack;

import com.intellij.ide.IconProvider;
import com.intellij.openapi.project.DumbAware;
import com.intellij.psi.PsiElement;
import com.intellij.psi.PsiFile;
import com.intellij.psi.PsiFileSystemItem;
import java.util.Locale;
import javax.swing.Icon;

/** Sólo sustituye archivos y carpetas; conserva los iconos de clases, métodos y símbolos. */
public final class MaterialPsiIcons extends IconProvider implements DumbAware {
    @Override
    public Icon getIcon(PsiElement element, int flags) {
        if (!(element instanceof PsiFileSystemItem item)) return null;
        String language = element instanceof PsiFile file
                ? file.getLanguage().getID().toLowerCase(Locale.ROOT) : null;
        // Los identificadores de algunos lenguajes difieren de los de VS Code.
        if ("ecmascript 6".equals(language)) language = "javascript";
        if ("shell script".equals(language)) language = "shellscript";
        return MaterialFileIcons.icon(item.getVirtualFile(), item.getProject(), language);
    }
}
