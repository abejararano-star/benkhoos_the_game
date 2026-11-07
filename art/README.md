# Arte del Palenque

Las hojas `source/*_v9.png` se crearon con la herramienta de imágenes integrada. Cada hoja tiene su encargo completo en el archivo `.prompt.txt` contiguo. Las versiones anteriores sirven como referencias de arte y están fuera del atlas de personajes activo.

Ejecuta `npm run atlas:build` para reconstruir `assets/atlas/`. `tools/import_actors.py` identifica un cuerpo conectado por pose, lo asigna a su celda y conserva el alfa de la silueta y sus bordes inmediatos. El atlas empaqueta las poses de cada personaje junto a sus anclajes. El juego utiliza un hash para distinguir revisiones de las imágenes.
