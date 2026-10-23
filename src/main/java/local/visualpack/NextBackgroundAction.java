package local.visualpack;

import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.project.DumbAwareAction;

/** Permite saltar una foto sin cambiar las carpetas ni esperar el intervalo. */
public final class NextBackgroundAction extends DumbAwareAction {
    @Override
    public void actionPerformed(AnActionEvent event) {
        BackgroundSettings.getInstance().nextImage();
    }
}
