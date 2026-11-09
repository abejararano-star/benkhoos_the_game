# Benkhoos · El Palenque de la Matuna

Juego de estrategia y acción para **PC**. Organiza la Matuna, rescata a personas esclavizadas en las haciendas y decide con el consejo cómo responder a Cartagena.

## Jugar con XAMPP

1. Inicia Apache y MySQL.
2. La instalación local está en `C:\xampp\htdocs\benkhoos` y usa la base `benkhoos_the_game`.
3. Para una instalación nueva, importa `schema_benkhoos.sql` en phpMyAdmin.
4. Para una base existente, aplica únicamente la migración aditiva:

   ```powershell
   C:\xampp\php\php.exe tools\setup-db.php
   ```

5. Abre [el juego local](http://localhost/benkhoos/). No lo abras con doble clic: los módulos y los atlas necesitan HTTP.

Los valores predeterminados de XAMPP son `127.0.0.1`, usuario `root`, contraseña vacía. Si tu instalación usa otros, copia `api/config.local.example.php` a `api/config.local.php`. Este archivo está excluido de Git. También se admiten `BENKHOOS_DB_HOST`, `BENKHOOS_DB_NAME`, `BENKHOOS_DB_USER` y `BENKHOOS_DB_PASSWORD`.

## Controles

| Tecla | Acción |
|---|---|
| A / D o flechas | Mover; mantener para correr |
| S / abajo | Mantener para pagar o lanzar una moneda |
| Espacio / J | Ataque con espada y lanza |
| E / W / arriba | Interactuar: animales, riachuelo, montura o cofre |
| Mayús + E | Pescar junto al riachuelo |
| 1–4 | Poderes desbloqueados en el altar |
| C | Armadura, disponible desde el rango Real |
| R / T | Descansar / antorcha |
| B | Obras, materiales y vista previa de evoluciones |
| G | Armería, vista previa y encargos para combatientes |
| F / clic sobre una persona | Ficha, dones, experiencia y cambio de oficio |
| Tab / Escape | Ejército / pausa |
| F5 / F9 | Guardar / cargar |
| F11 | Pantalla completa |

La bolsa admite 24 reales. El rescate cuesta 8 del cofre y entrega 3 en la bolsa. Las partidas se guardan al amanecer y manualmente. La guía, las decisiones y los menús detienen la simulación. La pérdida de foco pausa el juego y limpia las teclas.

## Guardado

La versión 3 del formato conserva el estado completo: tropas y daño, edificios, rangos, habilidades, haciendas, recursos, árboles, monturas, oleadas, cartas, mensajeros y progreso político. También guarda nombres, atributos, dones, experiencias por oficio, heridas, miedo, cansancio y cambios de profesión pendientes. Se mantiene una copia local y se usa la más reciente entre navegador y servidor. Las versiones 1 y 2 se migran al cargar; solo es posible recuperar los datos que la versión antigua llegó a guardar. Las partidas anteriores reciben los puestos de hachas y martillos sin sustituir su inventario existente. También reciben la casa central y materiales iniciales; los nuevos constructores se asignan desde F.

## Personas y oficios

Cada persona tiene cinco atributos (fuerza, resistencia, percepción, destreza y cultivo), un don, un temperamento y una preferencia. Su afinidad influye en el trabajo, la caza y el combate; la resistencia también mejora su salud. Los habitantes libres eligen herramientas considerando sus capacidades, su preferencia, la necesidad del palenque y la disponibilidad.

Pulsa **F** o haz clic en una persona para conocerla. Puedes proponer otro oficio o respetar su preferencia. Un soldado con buen ojo puede aprender caza; alguien del campo con fuerza y resistencia puede entrenar como lancero. El cambio necesita equipo del puesto y un trayecto seguro. Devuelve el equipo anterior cuando hay espacio, mantiene su identidad y experiencia por profesión, y conserva la proporción de salud para impedir curaciones gratuitas.

Los leñadores talan árboles marcados. Los civiles interrumpen sus tareas y buscan refugio al ver enemigos; los cazadores y arqueros toman distancia para disparar. La infantería defiende la línea y los malheridos se retiran. Hay reacciones de daño, recuperación, cansancio, descanso y comentarios según el temperamento; las personas solidarias ayudan a vecinos heridos cercanos.

## Los caminos de la libertad · edición 13

La campaña se desarrolla en tres capítulos. En el primero, libera las haciendas próximas. En el segundo, pulsa **E** frente a la casa central para convocar al consejo y organizar expediciones al Paso de Jegua y la Boca de Marea. Puedes llevar hasta tres aliados. Vence a la guarnición, rompe el portón y vuelve a la Matuna con las personas rescatadas. Si las pierdes a todas, puedes volver a intentarlo cuando el puesto se ocupe de nuevo. En el tercer capítulo, el consejo elige a quién proteger y por dónde se librará la última defensa.

El **tótem** exige el nivel correspondiente de la **Casa del Cuartel** y los reales indicados. Las viviendas y murallas también se habilitan con el nivel de ese edificio. El altar se usa para los poderes del jaguar.

La campaña imagina los destinos, diálogos, combates y decisiones. La Matuna, la resistencia liderada por Benkos Biohó, sus negociaciones con las autoridades coloniales y su ejecución en Cartagena en 1621 forman parte del contexto histórico. [Biografía de Benkos Biohó, Banco de la República](https://enciclopedia.banrepcultural.org/Benkos_Bioh%C3%B3)

## Casa del Cuartel y armería · edición 13.2

Mantén **S** frente a la Casa del Cuartel o usa **Aportar 1 real** en **B**. Los niveles II a V cuestan 6, 8, 12 y 16 reales de la bolsa y requieren de 5 a 10 segundos de trabajo en el sitio. Las murallas, granjas, torres y viviendas también esperan a un constructor. Al cargar una partida anterior se conserva el nivel más alto entre la casa y el cuartel y se reanuda la mejora que siga pendiente.

Pulsa **G** para ver las armas y armaduras desbloqueadas. Elige a un combatiente y el rango de la pieza. El encargo requiere tres segundos de forja y se recoge en la Casa del Cuartel durante el día, cuando el camino sea seguro.

## Rescates · edición 12

Las haciendas empiezan con tres cautivos. Ataca el portón con **Espacio** para liberarlos y protege su camino a la Matuna, donde buscarán oficio. Pasados tres minutos de juego, un nuevo destacamento puede ocupar la hacienda cuando esté fuera de vista. La primera conquista sigue contando para la campaña.

Las amistades y las parejas recuperan ánimo y reducen su cansancio al compartir un rato. Puedes mediar con **E** antes de que una discusión llegue a los golpes. El jaguar puede atacar a las patrullas. La antorcha hace retroceder a las culebras y ayuda a descubrir cofres ocultos antes de llegar a ellos. Abre los cofres con **E**.

## Senderos y Santuario de los Ancestros · edición 11

Pulsa **E** frente a la casa central o **B** desde cualquier lugar para abrir Obras. Para encontrar el altar, sal hacia el oeste, cruza el riachuelo y sigue las piedras talladas más allá de la hacienda. El santuario aparece en el mapa al descubrirlo. Mantén **S** junto al altar para ofrendar y desbloquear los poderes del jaguar. Las partidas anteriores conservan el nivel del altar. Las ofrendas incompletas de su antigua ubicación regresan al cofre.

El mapa se extiende hasta el Mirador de la Ceiba por el oeste y el Manglar de la Marea por el este. Ambos senderos tienen fauna, un riachuelo y un alijo que se abre con **E**. Al anochecer Benkos enciende la antorcha. Pulsa **T** para apagarla o volver a encenderla. Los reales caídos en tierra duran 150 segundos. Los civiles cercanos pueden recoger los que Benkos pierda en combate y llevarlos al cofre si el camino es seguro.

Las texturas de suelo, los fondos y los elementos del sendero se generaron con ImageGen. Las hojas originales y sus instrucciones de generación están en `art/source/*_v11.png` y `art/source/*_v11.prompt.txt`.

## Evolución, equipo y vida cotidiana · edición 10

Mantén **S** ante el altar para subirlo de nivel y cambiar su arquitectura. **B** abre las obras y permite comparar los cinco diseños del altar. Los círculos sobre los puestos o edificios muestran el precio en reales y se esconden durante el combate.

El tótem desbloquea los rangos Élite y Real al alcanzar el nivel necesario del cuartel central. En **F** puedes encargar una pieza para lanceros, arqueros y espadachines. El encargo se paga una sola vez. Su dueño recoge la pieza en el cuartel durante el día, cuando el camino es seguro. El arma y la armadura se compran por separado. El arma mejora el daño y la armadura aumenta la salud máxima. Para Benkos, **C** compra la armadura por ocho reales una vez disponible el rango Real y después permite alternarla.

Las personas generan rasgos estables como inteligencia, dedicación, ímpetu, valor, curiosidad y carisma. Hablan con sus vecinos y algunas amistades se convierten en parejas. Si alguien cae, sus personas cercanas pasan un duelo temporal que se refleja en su apariencia y eficacia. Durante el día, los civiles pueden pasear, bañarse, jugar con un animal tranquilo o descansar en casa. La guardia y los cazadores patrullan y atienden su puesto. Los cazadores persiguen presas y entregan la comida y la plata al cofre. Las granjas necesitan siembra, tiempo de crecimiento y una cosecha antes de volver a producir al día siguiente.

El caballo acelera y cambia de dirección de forma gradual. Su galope tiene ocho poses y sus ataques usan contornos separados del fondo. Las hojas de montura, altar y armas de esta edición se generaron con ImageGen. Se conservan junto a sus instrucciones de generación en `art/source/*_v10.png` y `art/source/*_v10.prompt.txt`.

## Animaciones y comunidad · edición 9

Cada oficio, rango de infantería y tipo de enemigo usa la misma familia visual para esperar, moverse y actuar. Benkos tiene poses de espada, lanza, pago, pesca y descanso. Sus monturas conservan la ropa o armadura que llevaba a pie. Los personajes que esperan respiran y miran alrededor a ritmos distintos según su temperamento. La opción de reducir movimiento desactiva esos cambios en reposo.

Durante el día los vecinos cercanos conversan, se hacen amigos y se ríen juntos. Una rivalidad puede provocar un altercado breve. Cada participante pierde como máximo tres puntos de salud, conserva al menos el 75 % de su salud máxima y solo puede recibir ese daño una vez por día. Los enemigos cercanos interrumpen los encuentros. Consulta las amistades y rivalidades con **F**. Los vínculos se conservan al guardar.

Al detenerte cerca de una inversión, la franja inferior muestra cuántos reales faltan. En **B**, las mejoras indican cuánto falta en la bolsa y qué obras ya están pagadas. Las escenas temporales `?review=1&scene=mount` y `?review=1&scene=community` permiten revisar la montura y la convivencia.

## Jungla, fauna y combate · edición 8

El encuadre acerca el mundo con escala entera. Dos capas de jungla con ceibas, lianas y vegetación sustituyen el fondo geométrico. Los rótulos de puestos y comentarios dejan de ocupar la escena: la ayuda aparece en una franja inferior al detenerte cerca de una interacción y se oculta durante el combate.

Los seis enemigos de infantería tienen ocho poses de marcha, preparación, golpe, daño y caída. Benkos y las tropas disponen de poses de combate nuevas. Los golpes del jugador y los aliados esperan al contacto; respetan dirección y alcance, pueden fallar si el rival se aleja y se interrumpen con heridas. Durante el final de un golpe puedes pulsar otra vez para encadenar espada, lanza y remate. Una pausa reinicia la secuencia. El bandolero combate con su espada.

Dos riachuelos tienen cascada, puente, agua animada, peces y vegetación. **E** permite beber para recuperar espíritu; con el espíritu lleno inicia la pesca. **Mayús + E** permite pescar directamente. Mantente cerca durante 1,6 segundos; moverte o atacar cancela la pesca. La reserva de peces se repone con el tiempo. Los arbustos próximos dan un alimento por día. Los agricultores también entregan alimentos al poblado y su contador aparece junto a madera y piedra.

Hay chigüiros, venados, jabalíes, monos, guacamayas, tortugas y un jaguar. Con **E** puedes alimentar a un animal cercano y ganar su confianza. Los animales de confianza dejan de ser objetivos de caza y algunos te siguen; un mono puede traer una moneda al día y una guacamaya alimentada informa sobre las patrullas. Puedes liberar a una tortuga atrapada. Los venados huyen al sentir peligro, y un jaguar cercano o un jabalí herido pueden embestir. Alimentarlos permite calmarlos. La confianza, los rescates, los alimentos y las reservas de pesca se guardan con la campaña; las partidas antiguas incorporan la fauna al cargar.

Las seis hojas se crearon con la herramienta de imágenes integrada y se conservan con sus prompts en `art/source/`: `enemy_gait_v8`, `enemy_actions_v8`, `combat_allies_v8`, `jungle_layers_v8`, `wildlife_v8` y `habitat_v8`. El importador reproducible es `tools/import_pixel_v8.py`.

Para revisar sin alterar una campaña real usa `?review=1&scene=village`, `?review=1&scene=creek` o `?review=1&scene=combat` y pulsa Nueva campaña. Estas escenas son temporales: no cargan ni guardan partidas y no registran récords.

## Pixel art y fluidez · edición 7

Se sustituyeron las estaciones de herramientas, cinco niveles de muralla, árboles y tocones, altar, tótem, mina, huerto, entrada de caminos, moneda, bolsa y cofre por recursos con materiales y siluetas propios. Las estaciones se distribuyen con mayor separación al cargar una partida; conservan sus existencias y mejoras. Los rótulos y las entregas se dibujan sobre una capa de interfaz para conservar la nitidez y evitar reflejos de texto en el río.

Las dos hojas nuevas de marcha contienen **128 poses** para Benkos, nueve oficios y seis variantes de tropas. El ciclo avanza según la distancia recorrida y se detiene cuando la persona deja de moverse, incluso si conserva una velocidad anterior. Transportar recursos mantiene la marcha y añade la carga al personaje. Las posiciones de cámara, personajes y proyectiles se interpolan entre los pasos de simulación; la economía y las colisiones mantienen sus 60 pasos por segundo. Los soldados esperan en puestos separados por 26 unidades.

El lienzo usa escalas enteras para que los píxeles mantengan su grosor. La bolsa del HUD tiene un dibujo propio, contador actual/máximo, 24 casillas y espacios libres. Se conserva el límite de 24 reales.

Los recursos se generaron con la herramienta de imágenes integrada. Fuentes y prompts de esta revisión: `art/source/gait_people_v7.png`, `gait_guard_v7.png`, `stations_v7.png`, `walls_v7.png`, `forest_v7.png`, `currency_v7.png` y `landmarks_v7.png`, cada una con su `.prompt.txt`. El empaquetado reproducible está en `tools/import_pixel_v7.py`.

Tras editar el cliente o regenerar atlas, ejecuta `npm run client:stamp` antes de desplegar. Este proceso asigna un hash común a HTML, estilos y todo el grafo de módulos. El archivo `.htaccess` pide revalidar código y metadatos para evitar mezclar revisiones antiguas y nuevas en caché. No hace falta borrar guardados para actualizar el arte.

## Evolución del palenque · edición 6

La tecla **B** abre las obras y un catálogo visual de los cinco niveles. La Casa del Cuartel evoluciona de palma a madera, bahareque, piedra con teja y cantería tallada. Las viviendas añaden un 15 % de recuperación adicional por nivel a quienes descansan o se recuperan en el poblado. Al mejorar las murallas también cambian sus materiales y siluetas.

Los constructores llevan materiales al sitio y trabajan mientras sea seguro. Sin un constructor trabajando, la obra queda en espera y conserva el avance. Puedes proponer este oficio desde **F** y equipar el puesto de martillos si hace falta. Los aportes y el avance de las obras se guardan con la partida.

Los leñadores entregan entre 4 y 6 unidades de madera por árbol, según su fuerza; los mineros entregan 2 de piedra por viaje además de la plata. La carga se lleva físicamente al cofre. Los árboles talados vuelven a crecer tres días después. Para cambiar de oficio, una persona termina primero su entrega.

Hay **264 nuevos fotogramas de personajes** y **15 diseños de edificios**. Benkos tiene ocho poses por secuencia de reposo, caminar, correr, lanza, espada, daño, pago y descanso. Los oficios tienen ciclos propios de trabajo y transporte; las tropas Élite y Reales usan equipo diferente. Las acciones empiezan en su primer fotograma. El importador identifica los espacios entre filas para evitar recortes de pies y fragmentos de otras secuencias. Se añadieron andamios, humo, macetas, madera apilada, herramientas reconocibles, cultivos al viento, corteza y follaje.

Las hojas y sus prompts se generaron con la herramienta de imágenes integrada y están en `art/source/`: `hero_v4.png`, `workers_v3.png`, `military_v3.png` y `settlement_v3.png`, con sus archivos `.prompt.txt`. `hero_v3.png` conserva la referencia previa al ajuste. El juego consume las cuatro hojas empaquetadas de `assets/atlas/`; `tools/import_expansion.py` forma parte de la exportación reproducible.

## Caminos de campaña

La primera patrulla consta de dos hombres y llega escalonada desde un puesto de entrada visible. Las expediciones crecen con los días y las unidades avanzadas aparecen más tarde. Los vigías dan pistas antes del anochecer. Un emisario no combatiente recorre el camino de Cartagena, espera con estandarte blanco y entrega su propuesta al pulsar **E**. Las cartas no leídas permanecen en el menú de campaña.

El Heraldo tiene un aviso previo de 35 segundos; el gobernador final parte después de perder ambas haciendas y se anuncia 45 segundos antes de cruzar la frontera. Estos avisos preceden la entrada al mapa: después los enemigos todavía deben recorrer el camino. Los refuerzos también usan las entradas, en lugar de aparecer junto al jefe.

Una nueva campaña genera un nuevo registro de servidor; cargar una campaña permite actualizar el mismo registro. El guardado informa si se realizó en MySQL o solo en el navegador. La aplicación es una instalación **local de un solo jugador**: la API no incorpora cuentas ni autenticación para ofrecerla como servicio público.

## Desarrollo y verificación

No hay dependencias de JavaScript ni CDN. Con Node 20 o posterior:

```powershell
npm test
npm run check
npm run atlas:check
npm run test:xampp
```

`npm run serve` sirve el juego en `http://127.0.0.1:8765` con guardado local; PHP necesita XAMPP. El taller de pruebas se habilita con `?debug=1` y se abre desde pausa. Usarlo excluye esa campaña de los récords.

Para desplegar una copia revisada en XAMPP:

```powershell
.\tools\deploy-xampp.ps1
```

El despliegue copia solo los archivos de ejecución, conserva la configuración local y crea un respaldo de los archivos de código que sustituye. No borra archivos ni partidas.

## Estructura

```text
index.html                Interfaz accesible, sin lógica incrustada
css/game.css              Apariencia y distribución para PC
js/config.js              Balance y estadísticas canónicas
js/world-state.js         Estado inicial del mundo
js/game.js                Coordinación, economía e interacciones
js/simulation.js          Simulación y combate a 60 pasos por segundo
js/ai.js                  Selección y reserva de trabajos
js/people.js              Personas, dones, profesiones y reacciones
js/community.js           Encuentros, amistades, rivalidades y altercados
js/campaign.js            Expediciones, caminos, avisos y mensajeros
js/settlement.js          Materiales, evoluciones y trabajo de construcción
js/renderer.js            Personajes, mundo y reflejo
js/terrain.js             Paisaje, construcciones y señales de combate
js/audio.js               Motor de tambores y efectos
js/input.js, ui.js         Controles, pausa, menús y HUD
js/save-system.js, db.js   Formato versionado y persistencia
api/                      Adaptador PHP/MySQL
migrations/               Cambios aditivos de base de datos
assets/atlas/             Único atlas usado por el juego
assets/ui/                Iconos y emblema SVG pixel art
art/source/               Hojas originales del proceso de exportación
tests/                    Pruebas de reglas y del runtime completo
```

Los catálogos SQL se conservan por compatibilidad como metadatos descriptivos; la simulación toma el balance de JavaScript. `docs/vision-original.md` contiene ideas de una etapa anterior, no la arquitectura implementada. Las versiones antiguas y duplicados se conservan localmente en `archive/`, fuera de Git y del despliegue.

Para regenerar atlas instala las dependencias opcionales con `python -m pip install -r requirements.txt` y ejecuta `npm run atlas:build`. Las versiones fijadas se probaron con Python 3.14. `generate_atlas.ps1` llama al mismo proceso. `python tools/check_atlas.py --preview` genera hojas de comprobación. La validación normal usa solo la biblioteca estándar de Python.

`npm run test:xampp` usa un perfil temporal separado, comprueba guardado y carga reales, y retira únicamente sus propios datos al terminar. No sustituye partidas existentes. Por defecto usa PHP de `C:\xampp\php\php.exe`; se puede ajustar con `BENKHOOS_PHP`.


### Puentes y riberas

En el mapa (**M**) aparecen el puente fijo al oeste y el colgante al este. El colgante cede más con una montura que al cruzar a pie. En cualquiera de sus postes, **Mayús + E** corta las cuerdas y **E** repara el paso por 3 de madera. La corriente es mortal para quienes caen. El puente del palenque sigue sirviendo para sacar agua y pescar.

**T** alterna la antorcha. Mientras la lleva encendida, Benkos combate con el machete. **E** junto a un cultivo permite sembrar cuando esté vacío o recoger la yuca madura.
