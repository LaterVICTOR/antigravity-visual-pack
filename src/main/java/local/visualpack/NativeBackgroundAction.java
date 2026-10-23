package local.visualpack;

import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.options.SearchableConfigurable;
import com.intellij.openapi.options.ShowSettingsUtil;
import com.intellij.openapi.project.DumbAwareAction;

/** Conserva el acceso anterior para quien prefiera configurar una sola foto con IDEA. */
public final class NativeBackgroundAction extends DumbAwareAction {
    @Override
    public void actionPerformed(AnActionEvent event) {
        ShowSettingsUtil.getInstance().showSettingsDialog(event.getProject(),
                configurable -> configurable instanceof SearchableConfigurable searchable
                        && "preferences.lookFeel".equals(searchable.getId()), null);
    }
}
