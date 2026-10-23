package local.visualpack;

import com.intellij.ide.util.PropertiesComponent;
import com.intellij.openapi.Disposable;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.components.PersistentStateComponent;
import com.intellij.openapi.components.Service;
import com.intellij.openapi.components.State;
import com.intellij.openapi.components.Storage;
import com.intellij.openapi.wm.impl.IdeBackgroundUtil;
import com.intellij.util.concurrency.AppExecutorUtil;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

/** Una sola presentación global, con estado persistente y cancelación al descargar el plugin. */
@Service(Service.Level.APP)
@State(name = "AntigravityBackground", storages = @Storage("antigravity-background.xml"))
public final class BackgroundSettings implements PersistentStateComponent<BackgroundSettings.Options>, Disposable {
    public static final class Options {
        public boolean enabled;
        public List<String> folders = new ArrayList<>();
        public boolean recursive = true;
        public boolean random = true;
        public int intervalMinutes = 5;
        public int opacity = 15;
        public boolean emptyFrame = true;
        // Se conserva el fondo nativo, incluso si IDEA se cierra inesperadamente.
        public boolean ownsBackground;
        public String previousEditor;
        public String previousFrame;
        public String appliedEditor;
        public String appliedFrame;

        public Options copy() {
            Options result = new Options();
            result.enabled = enabled;
            result.folders = folders == null ? new ArrayList<>() : new ArrayList<>(folders);
            result.recursive = recursive;
            result.random = random;
            result.intervalMinutes = Math.clamp(intervalMinutes, 1, 1440);
            result.opacity = Math.clamp(opacity, 1, 100);
            result.emptyFrame = emptyFrame;
            result.ownsBackground = ownsBackground;
            result.previousEditor = previousEditor;
            result.previousFrame = previousFrame;
            result.appliedEditor = appliedEditor;
            result.appliedFrame = appliedFrame;
            return result;
        }
    }

    private Options options = new Options();
    private final ScheduledExecutorService executor = AppExecutorUtil.createBoundedScheduledExecutorService(
            "Antigravity background folders", 1);
    private ScheduledFuture<?> pending;
    private volatile long revision;
    private volatile boolean disposed;
    private boolean started;
    private Path current;
    private volatile String status = "Elige carpetas y pulsa Aplicar para comenzar.";

    public static BackgroundSettings getInstance() {
        return ApplicationManager.getApplication().getService(BackgroundSettings.class);
    }

    @Override
    public synchronized Options getState() { return options.copy(); }

    @Override
    public synchronized void loadState(Options state) { options = state.copy(); }

    public String getStatus() { return status; }

    /** Los proyectos comparten el temporizador; abrir otro no reinicia la presentación. */
    public void start() {
        if (started || disposed) return;
        started = true;
        restart();
    }

    public void configure(Options edited) {
        synchronized (this) {
            Options updated = edited.copy();
            updated.ownsBackground = options.ownsBackground;
            updated.previousEditor = options.previousEditor;
            updated.previousFrame = options.previousFrame;
            updated.appliedEditor = options.appliedEditor;
            updated.appliedFrame = options.appliedFrame;
            options = updated;
        }
        started = true;
        restart();
    }

    public void nextImage() {
        if (disposed || !getState().enabled) return;
        restart();
    }

    private void restart() {
        long request = ++revision;
        if (pending != null) pending.cancel(true);
        Options snapshot = getState();
        if (!snapshot.enabled) {
            restoreBackground();
            status = "Presentación desactivada. Puedes usar el selector nativo de una imagen.";
            return;
        }
        status = "Buscando imágenes en las carpetas…";
        schedule(snapshot, request, 0);
    }

    private void schedule(Options snapshot, long request, long delayMinutes) {
        if (disposed || revision != request) return;
        Path previous = current;
        pending = executor.schedule(() -> {
            var cancelled = (java.util.function.BooleanSupplier) () -> disposed || revision != request
                    || Thread.currentThread().isInterrupted();
            List<Path> images = BackgroundImages.collect(snapshot.folders, snapshot.recursive, cancelled);
            Path selected = BackgroundImages.next(images, previous, snapshot.random, cancelled);
            if (cancelled.getAsBoolean()) return;
            ApplicationManager.getApplication().invokeLater(() -> {
                if (disposed || revision != request) return;
                if (selected != null) {
                    current = selected;
                    applyImage(BackgroundImages.specification(selected, snapshot.opacity), snapshot.emptyFrame);
                    status = "Foto actual: " + selected.getFileName() + " · " + images.size() + " archivos encontrados";
                } else {
                    status = "No hay imágenes legibles. Revisa las carpetas (PNG, JPG, JPEG, GIF o BMP).";
                }
                // Se vuelve a explorar: recoge fotos añadidas y omite las eliminadas sin reiniciar IDEA.
                schedule(snapshot, request, snapshot.intervalMinutes);
            });
        }, delayMinutes, TimeUnit.MINUTES);
    }

    private synchronized void applyImage(String specification, boolean emptyFrame) {
        PropertiesComponent properties = PropertiesComponent.getInstance();
        if (!options.ownsBackground) {
            options.previousEditor = properties.getValue(IdeBackgroundUtil.EDITOR_PROP);
            options.previousFrame = properties.getValue(IdeBackgroundUtil.FRAME_PROP);
            options.ownsBackground = true;
        }
        properties.setValue(IdeBackgroundUtil.EDITOR_PROP, specification);
        options.appliedEditor = specification;
        if (emptyFrame) {
            properties.setValue(IdeBackgroundUtil.FRAME_PROP, specification);
            options.appliedFrame = specification;
        } else {
            restore(properties, IdeBackgroundUtil.FRAME_PROP, options.appliedFrame, options.previousFrame);
            options.appliedFrame = null;
        }
        IdeBackgroundUtil.resetBackgroundImagePainters();
    }

    private synchronized void restoreBackground() {
        if (!options.ownsBackground) return;
        PropertiesComponent properties = PropertiesComponent.getInstance();
        restore(properties, IdeBackgroundUtil.EDITOR_PROP, options.appliedEditor, options.previousEditor);
        restore(properties, IdeBackgroundUtil.FRAME_PROP, options.appliedFrame, options.previousFrame);
        options.ownsBackground = false;
        options.appliedEditor = null;
        options.appliedFrame = null;
        IdeBackgroundUtil.resetBackgroundImagePainters();
    }

    private static void restore(PropertiesComponent properties, String key, String applied, String previous) {
        // Si el usuario cambió el fondo desde IDEA, su elección tiene prioridad al desactivar.
        if (applied == null || !Objects.equals(properties.getValue(key), applied)) return;
        if (previous == null) properties.unsetValue(key);
        else properties.setValue(key, previous);
    }

    @Override
    public void dispose() {
        disposed = true;
        revision++;
        if (pending != null) pending.cancel(true);
        executor.shutdownNow();
        restoreBackground();
    }
}
