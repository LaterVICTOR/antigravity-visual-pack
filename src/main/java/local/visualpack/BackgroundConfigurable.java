package local.visualpack;

import com.intellij.openapi.fileChooser.FileChooser;
import com.intellij.openapi.fileChooser.FileChooserDescriptorFactory;
import com.intellij.openapi.options.ConfigurationException;
import com.intellij.openapi.options.SearchableConfigurable;
import java.awt.BorderLayout;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.GridBagConstraints;
import java.awt.GridBagLayout;
import java.awt.Insets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Objects;
import javax.swing.DefaultListModel;
import javax.swing.JButton;
import javax.swing.JCheckBox;
import javax.swing.JComponent;
import javax.swing.JLabel;
import javax.swing.JList;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JSpinner;
import javax.swing.SpinnerNumberModel;
import javax.swing.Timer;

/** Ajustes visibles en Apariencia: admite varias carpetas sin pedir una imagen individual. */
public final class BackgroundConfigurable implements SearchableConfigurable {
    private JPanel panel;
    private JCheckBox enabled;
    private DefaultListModel<String> folders;
    private JCheckBox recursive;
    private JCheckBox random;
    private JCheckBox emptyFrame;
    private JSpinner interval;
    private JSpinner opacity;
    private JLabel status;
    private Timer statusTimer;

    @Override
    public String getId() { return "local.visualpack.background"; }

    @Override
    public String getDisplayName() { return "Antigravity Visual Pack"; }

    @Override
    public JComponent createComponent() {
        panel = new JPanel(new GridBagLayout());
        GridBagConstraints row = new GridBagConstraints();
        row.gridx = 0;
        row.gridy = 0;
        row.weightx = 1;
        row.fill = GridBagConstraints.HORIZONTAL;
        row.anchor = GridBagConstraints.NORTHWEST;
        row.insets = new Insets(4, 0, 4, 0);

        addRow(new JLabel("Fotos de fondo desde carpetas"), row);
        enabled = new JCheckBox("Activar cambio automático de fotos");
        addRow(enabled, row);
        addRow(new JLabel("Carpetas de imágenes (PNG, JPG, JPEG, GIF y BMP):"), row);
        folders = new DefaultListModel<>();
        JList<String> list = new JList<>(folders);
        JScrollPane scroll = new JScrollPane(list);
        scroll.setPreferredSize(new Dimension(520, 150));
        addRow(scroll, row);

        JPanel buttons = new JPanel(new FlowLayout(FlowLayout.LEFT, 0, 0));
        JButton add = new JButton("Añadir carpetas…");
        add.addActionListener(event -> FileChooser.chooseFiles(
                FileChooserDescriptorFactory.multiDirs().withTitle("Seleccionar carpetas de fotos"),
                null, panel, null, selected -> {
                    for (var folder : selected) {
                        if (!folders.contains(folder.getPath())) folders.addElement(folder.getPath());
                    }
                }));
        JButton remove = new JButton("Quitar seleccionadas");
        remove.addActionListener(event -> {
            int[] indices = list.getSelectedIndices();
            for (int i = indices.length - 1; i >= 0; i--) folders.remove(indices[i]);
        });
        buttons.add(add);
        buttons.add(remove);
        addRow(buttons, row);

        recursive = new JCheckBox("Incluir subcarpetas");
        random = new JCheckBox("Orden aleatorio (sin repetir la foto actual)");
        emptyFrame = new JCheckBox("Mostrar también cuando no hay archivos abiertos");
        addRow(recursive, row);
        addRow(random, row);
        addRow(emptyFrame, row);
        interval = new JSpinner(new SpinnerNumberModel(5, 1, 1440, 1));
        opacity = new JSpinner(new SpinnerNumberModel(15, 1, 100, 1));
        addRow(field("Cambiar cada (minutos):", interval), row);
        addRow(field("Opacidad (%):", opacity), row);

        JButton next = new JButton("Siguiente foto");
        next.addActionListener(event -> BackgroundSettings.getInstance().nextImage());
        addRow(next, row);
        addRow(new JLabel("Pulsa Aplicar para guardar y cargar las fotos. Los cambios son globales."), row);
        addRow(new JLabel("Los fondos nativos guardados sólo para un proyecto tienen prioridad."), row);
        status = new JLabel();
        status.setPreferredSize(new Dimension(520, 28));
        addRow(status, row);
        row.weighty = 1;
        addRow(new JPanel(), row);

        BackgroundSettings.getInstance().start();
        reset();
        // El temporizador sólo actualiza el texto; la exploración y decodificación usan un ejecutor aparte.
        statusTimer = new Timer(1000, event -> updateStatus());
        statusTimer.start();
        return panel;
    }

    private void addRow(JComponent component, GridBagConstraints row) {
        panel.add(component, row);
        row.gridy++;
    }

    private static JPanel field(String label, JSpinner input) {
        JPanel field = new JPanel(new BorderLayout(12, 0));
        field.add(new JLabel(label), BorderLayout.WEST);
        field.add(input, BorderLayout.CENTER);
        return field;
    }

    private void updateStatus() {
        String text = BackgroundSettings.getInstance().getStatus();
        // JLabel interpreta HTML si un nombre de archivo empieza con <html>.
        status.putClientProperty("html.disable", Boolean.TRUE);
        status.setText(text);
        status.setToolTipText(text);
    }

    private BackgroundSettings.Options edited() {
        BackgroundSettings.Options value = new BackgroundSettings.Options();
        value.enabled = enabled.isSelected();
        value.folders = new ArrayList<>();
        for (int i = 0; i < folders.size(); i++) value.folders.add(folders.get(i));
        value.recursive = recursive.isSelected();
        value.random = random.isSelected();
        value.emptyFrame = emptyFrame.isSelected();
        value.intervalMinutes = (Integer) interval.getValue();
        value.opacity = (Integer) opacity.getValue();
        return value;
    }

    @Override
    public boolean isModified() {
        if (panel == null) return false;
        var saved = BackgroundSettings.getInstance().getState();
        var edited = edited();
        return saved.enabled != edited.enabled || !Objects.equals(saved.folders, edited.folders)
                || saved.recursive != edited.recursive || saved.random != edited.random
                || saved.emptyFrame != edited.emptyFrame || saved.intervalMinutes != edited.intervalMinutes
                || saved.opacity != edited.opacity;
    }

    @Override
    public void apply() throws ConfigurationException {
        // Confirma también lo escrito manualmente en los campos de los spinners.
        try {
            interval.commitEdit();
            opacity.commitEdit();
        } catch (java.text.ParseException exception) {
            throw new ConfigurationException("Revisa el intervalo (1–1440 minutos) y la opacidad (1–100)." );
        }
        var value = edited();
        if (value.enabled) {
            if (value.folders.isEmpty()) throw new ConfigurationException("Añade al menos una carpeta de fotos.");
            for (String folder : value.folders) {
                try {
                    if (Files.isDirectory(Path.of(folder))) continue;
                } catch (IllegalArgumentException | SecurityException ignored) { }
                throw new ConfigurationException("La carpeta no está disponible: " + folder);
            }
        }
        BackgroundSettings.getInstance().configure(value);
        updateStatus();
    }

    @Override
    public void reset() {
        if (panel == null) return;
        var saved = BackgroundSettings.getInstance().getState();
        enabled.setSelected(saved.enabled);
        folders.clear();
        for (String folder : saved.folders) folders.addElement(folder);
        recursive.setSelected(saved.recursive);
        random.setSelected(saved.random);
        emptyFrame.setSelected(saved.emptyFrame);
        interval.setValue(saved.intervalMinutes);
        opacity.setValue(saved.opacity);
        updateStatus();
    }

    @Override
    public void disposeUIResources() {
        if (statusTimer != null) statusTimer.stop();
        statusTimer = null;
        panel = null;
        folders = null;
        enabled = null;
        recursive = null;
        random = null;
        emptyFrame = null;
        interval = null;
        opacity = null;
        status = null;
    }
}
