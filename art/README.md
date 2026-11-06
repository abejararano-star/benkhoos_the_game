# Recursos de personajes

`source/palenque_people_v2.png` es la hoja nueva de 8 filas × 8 columnas creada con la herramienta integrada **ImageGen**, usando `guerreros_retro.png` solo como referencia de estilo. Se conserva su canal alfa original. Los recursos anteriores siguen respaldados en el historial de Git.

El encargo de generación está en `source/palenque_people_v2.prompt.txt`: pixel art de palenqueros y un emisario colonial, fondo transparente, personajes completos con márgenes, sin rótulos ni cuadrícula, escala y línea de pies uniformes. Las filas representan habitante, leñador, agricultor, minero, cazador, lancero, arquero y mensajero. Las ocho columnas contienen reposo de pie, dos pasos, dos acciones con herramienta, daño, huida y descanso sentado.

`tools/export_atlas.py` es la entrada única del proceso de reconstrucción. Importa la hoja generada mediante `tools/build_people_atlas.py`, recorta cada celda según su alfa, calcula los anclajes y la empaqueta con los demás personajes en `assets/atlas/`. El manifiesto incluye un hash de contenido para invalidar cachés. No se vuelve a generar arte al ejecutar el juego.
