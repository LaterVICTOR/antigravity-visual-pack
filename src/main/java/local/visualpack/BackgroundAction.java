package local.visualpack;

import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.project.DumbAwareAction;
import com.intellij.openapi.options.ShowSettingsUtil;

/** Abre directamente el panel de carpetas para que no dependa de encontrar el botón nativo. */
public final class BackgroundAction extends DumbAwareAction {
    @Override
    public void actionPerformed(AnActionEvent event) {
        ShowSettingsUtil.getInstance().showSettingsDialog(event.getProject(), BackgroundConfigurable.class);
    }
}
