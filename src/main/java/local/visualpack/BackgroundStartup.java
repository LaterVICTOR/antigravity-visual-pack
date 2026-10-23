package local.visualpack;

import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.startup.StartupActivity;

/** Recupera las carpetas guardadas al abrir el primer proyecto, también durante la indexación. */
public final class BackgroundStartup implements StartupActivity.DumbAware {
    @Override
    public void runActivity(Project project) {
        ApplicationManager.getApplication().invokeLater(() -> {
            if (!project.isDisposed()) BackgroundSettings.getInstance().start();
        });
    }
}
