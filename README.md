# Benkhoos · El Palenque de la Matuna

Juego de estrategia y acción para **PC**. Explora, libera a los fugitivos, organiza la producción y defiende la Matuna. La campaña termina al recuperar las dos haciendas y derrotar a sus gobernadores, o si Benkos cae sin fondos para un rescate.

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
| Tab / Escape | Ejército / pausa |
| F5 / F9 | Guardar / cargar |
| F11 | Pantalla completa |

La bolsa admite 24 reales. El rescate cuesta 8 del cofre y entrega 3 en la bolsa. Las partidas se guardan al amanecer y manualmente. La guía, las decisiones y los menús detienen la simulación. La pérdida de foco pausa el juego y limpia las teclas.

## Guardado

La versión 2 del formato conserva el estado completo: tropas y daño, edificios, rangos, habilidades, haciendas, recursos, árboles, monturas, oleadas y progreso político. Se mantiene una copia local y se usa la más reciente entre navegador y servidor. Los guardados antiguos se migran al cargar; solo es posible recuperar los datos que la versión antigua llegó a guardar.

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
