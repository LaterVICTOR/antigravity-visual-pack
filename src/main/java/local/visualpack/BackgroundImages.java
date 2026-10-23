package local.visualpack;

import java.io.IOException;
import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
import java.util.function.BooleanSupplier;
import javax.imageio.ImageIO;

/** Catálogo local sin dependencias de IDEA. Se consulta fuera del hilo de interfaz. */
public final class BackgroundImages {
    private static final Set<String> EXTENSIONS = Set.of("png", "jpg", "jpeg", "gif", "bmp");

    private BackgroundImages() { }

    /** No sigue enlaces de carpetas; una carpeta inaccesible no descarta las demás. */
    public static List<Path> collect(List<String> folders, boolean recursive, BooleanSupplier cancelled) {
        Set<Path> images = new LinkedHashSet<>();
        for (String folder : folders) {
            if (cancelled.getAsBoolean()) break;
            try {
                Path root = Path.of(folder).toAbsolutePath().normalize();
                Files.walkFileTree(root, Set.of(), recursive ? Integer.MAX_VALUE : 1,
                        new SimpleFileVisitor<Path>() {
                            @Override
                            public FileVisitResult preVisitDirectory(Path directory, BasicFileAttributes attributes) {
                                return cancelled.getAsBoolean() ? FileVisitResult.TERMINATE : FileVisitResult.CONTINUE;
                            }

                            @Override
                            public FileVisitResult visitFile(Path file, BasicFileAttributes attributes) {
                                if (cancelled.getAsBoolean()) return FileVisitResult.TERMINATE;
                                if (attributes.isRegularFile() && supported(file)) images.add(file);
                                return FileVisitResult.CONTINUE;
                            }

                            @Override
                            public FileVisitResult visitFileFailed(Path file, IOException exception) {
                                return FileVisitResult.CONTINUE;
                            }
                        });
            } catch (IOException | IllegalArgumentException | SecurityException ignored) {
                // Las unidades desconectadas pueden volver a aparecer en el siguiente intervalo.
            }
        }
        return images.stream().sorted(Comparator.comparing(Path::toString)).toList();
    }

    private static boolean supported(Path file) {
        String name = file.getFileName().toString().toLowerCase(Locale.ROOT);
        int dot = name.lastIndexOf('.');
        return dot >= 0 && EXTENSIONS.contains(name.substring(dot + 1));
    }

    /** Evita repetir la foto actual si hay otra válida; salta archivos dañados o borrados. */
    public static Path next(List<Path> images, Path current, boolean random, BooleanSupplier cancelled) {
        if (images.isEmpty()) return null;
        List<Path> candidates = new ArrayList<>(images);
        if (random) {
            java.util.Collections.shuffle(candidates, ThreadLocalRandom.current());
        } else if (current != null && images.contains(current)) {
            java.util.Collections.rotate(candidates, -images.indexOf(current) - 1);
        }
        if (current != null && candidates.remove(current)) candidates.add(current);
        for (Path candidate : candidates) {
            if (cancelled.getAsBoolean()) return null;
            try (var input = Files.newInputStream(candidate)) {
                // Se decodifica sólo la candidata: la exploración no carga toda la carpeta en memoria.
                var image = ImageIO.read(input);
                if (image != null) {
                    image.flush();
                    return candidate;
                }
            } catch (IOException | RuntimeException ignored) {
                // Una extensión válida no garantiza que el contenido sea una imagen legible.
            }
        }
        return null;
    }

    /** IDEA separa la especificación por comas; la URL protege comas, espacios y Unicode. */
    public static String specification(Path image, int opacity) {
        return image.toAbsolutePath().toUri().toASCIIString().replace(",", "%2C")
                + "," + Math.clamp(opacity, 1, 100) + ",scale,center";
    }
}
