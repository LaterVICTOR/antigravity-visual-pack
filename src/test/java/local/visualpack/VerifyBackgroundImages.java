package local.visualpack;

import java.awt.image.BufferedImage;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.List;
import javax.imageio.ImageIO;

/** Pruebas con archivos reales: carpetas anidadas, fotos corruptas y rotación sin repetición. */
public final class VerifyBackgroundImages {
    private static int checks;

    public static void main(String[] arguments) throws Exception {
        Path root = Files.createTempDirectory("antigravity-fotos-");
        try {
            Path first = image(root.resolve("01 foto, México.PNG"));
            Path second = image(root.resolve("02.png"));
            Path nested = image(Files.createDirectories(root.resolve("subcarpeta")).resolve("03.png"));
            Files.writeString(root.resolve("ignorar.txt"), "texto");
            Path broken = Files.writeString(root.resolve("00-corrupta.png"), "esto no es una imagen");
            var shallow = BackgroundImages.collect(List.of(root.toString()), false, () -> false);
            check(shallow.size() == 3 && !shallow.contains(nested), "Sin subcarpetas ni archivos de texto");
            var all = BackgroundImages.collect(List.of(root.toString(), root.resolve("subcarpeta").toString()),
                    true, () -> false);
            check(all.size() == 4 && all.contains(nested), "Subcarpetas y eliminación de duplicados");
            check(BackgroundImages.next(all, null, false, () -> false).equals(first), "Salta foto corrupta");
            check(BackgroundImages.next(all, first, false, () -> false).equals(second), "Avanza en orden");
            check(BackgroundImages.next(all, nested, false, () -> false).equals(first), "Vuelve al inicio");
            for (int i = 0; i < 30; i++) {
                check(!BackgroundImages.next(all, first, true, () -> false).equals(first), "Aleatorio sin repetición inmediata");
            }
            check(BackgroundImages.next(List.of(first), first, true, () -> false).equals(first), "Una sola foto");
            check(BackgroundImages.next(List.of(broken), null, true, () -> false) == null, "Sólo fotos dañadas");
            check(BackgroundImages.next(List.of(), null, true, () -> false) == null, "Lista vacía");
            Files.delete(second);
            check(BackgroundImages.next(List.of(second, first), null, false, () -> false).equals(first), "Foto eliminada durante la rotación");
            check(BackgroundImages.collect(List.of(root.resolve("no-existe").toString(), root.toString()),
                    true, () -> false).size() == 3, "Carpeta desconectada no bloquea las otras");
            check(BackgroundImages.collect(List.of(root.toString()), true, () -> true).isEmpty(), "Exploración cancelada");
            check(BackgroundImages.next(all, null, true, () -> true) == null, "Selección cancelada");
            String[] specification = BackgroundImages.specification(first, 15).split(",");
            check(specification.length == 4 && specification[1].equals("15"), "Ruta con comas no rompe opacidad");
            // La misma clase URL que usa el pintor de IDEA debe poder abrir la ruta escapada.
            try (var input = java.net.URI.create(specification[0]).toURL().openStream()) {
                check(ImageIO.read(input) != null, "URL local con Unicode, espacios y comas");
            }
            check(BackgroundImages.specification(first, 0).endsWith(",1,scale,center"), "Opacidad mínima");
            check(BackgroundImages.specification(first, 200).endsWith(",100,scale,center"), "Opacidad máxima");
            System.out.println("Fondos correctos: " + checks + " comprobaciones con archivos reales.");
        } finally {
            // Sólo se retira la carpeta temporal que esta prueba acaba de crear.
            try (var paths = Files.walk(root)) {
                for (Path path : paths.sorted(Comparator.reverseOrder()).toList()) Files.deleteIfExists(path);
            }
        }
    }

    private static Path image(Path path) throws Exception {
        ImageIO.write(new BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB), "png", path.toFile());
        return path;
    }

    private static void check(boolean condition, String message) {
        checks++;
        if (!condition) throw new AssertionError(message);
    }
}
