package local.visualpack;

import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.project.DumbAwareAction;
import com.intellij.openapi.options.ShowSettingsUtil;
import com.intellij.openapi.options.SearchableConfigurable;

/** Usa el panel nativo: la imagen y la opacidad permanecen guardadas por IntelliJ. */
public final class BackgroundAction extends DumbAwareAction {
    @Override
    public void actionPerformed(AnActionEvent event) {
        ShowSettingsUtil.getInstance().showSettingsDialog(event.getProject(),
                configurable -> configurable instanceof SearchableConfigurable searchable
                        && "preferences.lookFeel".equals(searchable.getId()), null);
    }
}
