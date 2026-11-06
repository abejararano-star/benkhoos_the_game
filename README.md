# Benkhoos · El Palenque de la Matuna

Juego de estrategia y acción para **PC**. Explora, libera a los fugitivos, organiza la producción y defiende la Matuna. La campaña termina al recuperar las dos haciendas y derrotar al gobernador, o si Benkos cae sin fondos para un rescate.

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
| E / W / arriba | Montar, desmontar o retirar plata del cofre |
| 1–4 | Poderes desbloqueados en el altar |
| C | Armadura, disponible desde el rango Real |
| R / T | Descansar / antorcha |
| F / clic sobre una persona | Ficha, dones, experiencia y cambio de oficio |
| Tab / Escape | Ejército / pausa |
| F5 / F9 | Guardar / cargar |
| F11 | Pantalla completa |

La bolsa admite 24 reales. El rescate cuesta 8 del cofre y entrega 3 en la bolsa. Las partidas se guardan al amanecer y manualmente. La guía, las decisiones y los menús detienen la simulación. La pérdida de foco pausa el juego y limpia las teclas.

## Guardado

La versión 3 del formato conserva el estado completo: tropas y daño, edificios, rangos, habilidades, haciendas, recursos, árboles, monturas, oleadas, cartas, mensajeros y progreso político. También guarda nombres, atributos, dones, experiencias por oficio, heridas, miedo, cansancio y cambios de profesión pendientes. Se mantiene una copia local y se usa la más reciente entre navegador y servidor. Las versiones 1 y 2 se migran al cargar; solo es posible recuperar los datos que la versión antigua llegó a guardar. Las partidas anteriores reciben el nuevo puesto de hachas sin sustituir su inventario existente.

## Personas y oficios

Cada persona tiene cinco atributos (fuerza, resistencia, percepción, destreza y cultivo), un don, un temperamento y una preferencia. Su afinidad influye en el trabajo, la caza y el combate; la resistencia también mejora su salud. Los habitantes libres eligen herramientas considerando sus capacidades, su preferencia, la necesidad del palenque y la disponibilidad.

Pulsa **F** o haz clic en una persona para conocerla. Puedes proponer otro oficio o respetar su preferencia. Un soldado con buen ojo puede aprender caza; alguien del campo con fuerza y resistencia puede entrenar como lancero. El cambio necesita equipo del puesto y un trayecto seguro. Devuelve el equipo anterior cuando hay espacio, mantiene su identidad y experiencia por profesión, y conserva la proporción de salud para impedir curaciones gratuitas.

Los leñadores talan árboles marcados. Los civiles interrumpen sus tareas y buscan refugio al ver enemigos; los cazadores y arqueros toman distancia para disparar. La infantería defiende la línea y los malheridos se retiran. Hay reacciones de daño, recuperación, cansancio, descanso y comentarios según el temperamento; las personas solidarias ayudan a vecinos heridos cercanos.

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
js/campaign.js            Expediciones, caminos, avisos y mensajeros
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
