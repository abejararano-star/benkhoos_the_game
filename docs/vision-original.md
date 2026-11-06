# Plan Maestro de Implementación y Producción: `benkhoos_the_game`

> Documento histórico de visión. La versión actual usa Canvas 2D modular; su arquitectura y ejecución se describen en el README de la raíz. Las propuestas de múltiples motores de este documento no están implementadas ni son necesarias para jugar.

**Subtítulo del Proyecto:** *El Palenque de la Matuna (1599–1621)*

**Género:** Estrategia Minimalista Lateral (Micro-Strategy) + Action RPG 2.5D (Estilo *Kingdom: Two Crowns* / *Blasphemous*)

**Stack Tecnológico Objetivo:** Phaser 3.80+ (Headless Kernel) + PixiJS v8 (Batch Sprite/UI Renderer) + React Three Fiber / Three.js (Iluminación 2.5D, Niebla y Shaders de Agua) + Zustand + Tauri v2 (Empaquetado nativo Steam/Desktop).

---

## 1. Diagnóstico del Estado Actual vs. Meta de Producción

Actualmente contamos con un **Prototipo Funcional Vertical (Pre-Alfa)** en un solo archivo (`index.html`) que ya incluye el sistema de combate, el reflejo en el río, las 7 unidades coloniales, los 2 jefes reales y las 4 láminas de aliados con evolución de 3 rangos. Para llegar a un producto comercial de calidad indie premium, debemos cerrar las siguientes brechas:

| Área del Proyecto | Estado Actual (Prototipo) | Meta de Producción (Gold Master) |
| :--- | :--- | :--- |
| **Gráficos y Sprites** | Primitivas geométricas en código (`fillRect`) que recrean tus 10 láminas de referencia. | Spritesheets en PNG indexado exportados desde **Aseprite**, empaquetados en Atlas JSON con **Mapas de Normales (Normal Maps)** para reaccionar a la luz 3D de las antorchas. |
| **Escenario y Agua** | Inversión vertical de píxeles por CPU (`drawImage` línea por línea). | Shader GLSL en **React Three Fiber** con distorsión sinusoidal, mapas de desplazamiento (Flow Maps), refracción cromática y reflejo especular de luces puntuales (`PointLight`). |
| **Lógica e IA (FSM)** | Bucle unificado con 10 roles aliados y 9 tipos de enemigos. | Arquitectura desacoplada basada en **Máquinas de Estados Finitos Jerárquicas (HFSM)** y **Árboles de Comportamiento** corriendo en el Kernel determinista de Phaser a $60\text{ Hz}$ fijos. |
| **Economía y Físicas** | Bolsa de 24 monedas, Cofre de Wiwa, Vetas de Plata, Granjas y Tótem de Ascenso. | Sistema económico completo estilo *Kingdom*: inflación por día, deterioro de escudos, 4 niveles de murallas, asedio con catapultas/cañones reales, monturas con resistencia y caravanas de suministro. |
| **Audio y Música** | Osciladores Web Audio API sintetizados en tiempo real. | Motor adaptativo con **FMOD Studio** o **Howler.js + WebAudio Multipista**: grabaciones reales de tambor alegre, llamador, tambora, marímbula y gaitas con transición vertical y horizontal según el estado de combate. |

---

## 2. Catálogo Completo de Unidades Aliadas y Árbol de Evolución (Láminas 1 a 4)

A partir de las cuatro láminas de aliados entregadas, el ejército de Benkos Biohó se estructura en **un estado civil encadenado/libre**, **un Campeón Real (Héroe/Guardaespaldas)** y **6 ramas especializadas que evolucionan en 3 Rangos (Tier 1 $\rightarrow$ Tier 2 $\rightarrow$ Tier 3)**:

### 2.1. Etapa Pre-Militar: De las Cadenas a la Libertad (Lámina 1)

| Unidad | Elementos Visuales Clave | Animaciones en Hoja de Sprites | Comportamiento e IA en el Juego |
| :--- | :--- | :--- | :--- |
| **Esclavizado / Fugitivo (`FUGITIVO`)** | Argolla de hierro al cuello, grilletes en muñecas y tobillos, cadena larga arrastrada y túnica rasgada en picos. | `idle` (4f), `walk` (7f), `carry_sack` (5f), `work_hoe` (5f), `escape_run` (5f), `hurt` (4f), `die` (4f), `break_chains` (3f). | Aparece en los campamentos o tras incendiar Haciendas. Si se acerca un soldado español, huye en pose `escape_run`. Al recoger $1$ moneda lanzada por Benkos, ejecuta `break_chains` (levanta ambos brazos partiendo los eslabones) y pasa a `ALDEANO`. |
| **Aldeano Libre / Cargador (`ALDEANO`)** | Sin cadenas, túnica limpia; cuando transporta cosecha o mineral carga el gran **Saco de Yute** al hombro. | `walk`, `carry_sack`, `work_hoe`. | Corre hacia el puesto de herramientas más cercano con stock disponible o ayuda a transportar sacos, cestos de mimbre y cajas de madera hacia el Cofre de Wiwa. |

### 2.2. Árbol de Evolución de 3 Rangos del Ejército Cimarrón (Láminas 2 y 4)

El ascenso global o por escuadrón se desbloquea en el **Tótem de Ascenso Real**:

$$
\text{Tier 1 (Africano Base)} \xrightarrow{6\text{ Reales}} \text{Tier 2 (Élite)} \xrightarrow{8\text{ Reales}} \text{Tier 3 (Real del Reino)}
$$

| Rama / Oficio | Tier 1: Base Africano (Lámina 2) | Tier 2: Rango Élite (Lámina 4 Izq.) | Tier 3: Rango Real (Lámina 4 Der.) | Función Táctica y Económica |
| :--- | :--- | :--- | :--- | :--- |
| **Infantería de Lanza y Escudo** | **Guerrero Africano**: Faja roja cruzada en el pecho, escudo tribal marrón/blanco y lanza. | **Guerrero / Lancero Élite**: Turbante blanco con joya, cota de escamas dorada y escudo negro/oro. | **Guerrero / Lancero Real**: Casco dorado con penacho rojo imperial, capa carmesí y gran escudo real. | Primera línea de choque tras la empalizada; refleja un $180\%$ de daño contra la Caballería española. |
| **Arquería** | **Arquero Africano**: Cinta amarilla en la frente, carcaj de mimbre y arco corto. | **Arquero Élite**: Diadema emplumada, faldellín bordado y arco largo de precisión. | **Arquero Real**: Penacho rojo real, capa roja y flechas pesadas de punta dorada. | Defensa antiaérea (contra el Heraldo Alado) y fuego de cobertura desde las torres. |
| **Caza y Control de Masas** | **Cazador Africano**: Jabalina corta y **Red de Caza (`net`)** tejida. | **Cazador Élite**: Jabalinas dentadas y red reforzada con pesas de bronce. | **Maestro Cazador Real**: Inmoviliza incluso a sub-jefes y caballería pesada. | Caza chigüiros de día y de noche lanza redes que inmovilizan a los soldados españoles durante $3.2\text{ s}$. |
| **Infantería de Espada** | *(Desbloqueable desde Herrería)* | **Espadachín Élite**: Turbante blanco, faldellín rojo/blanco y sable africano curvo. | **Espadachín Real**: Maestro de la espada con tajos en arco de alto daño por segundo (DPS). | Unidad ofensiva veloz ideal para acompañar a Benkos a incendiar las Haciendas Coloniales. |
| **Caballería Aliada** | *(Requiere Establo Real)* | **Caballero Élite**: Jinete con lanza sobre corcel castaño con barda dorada. | **Caballero Real**: Corcel con testera de penacho rojo, gualdrapa real y carga devastadora. | Patrulla los extremos del mapa y arrolla a los arcabuceros españoles antes de que recarguen. |
| **Minería de Plata** | **Minero Africano**: Pañuelo en la cabeza, pico de hierro y saco de piedras. | **Minero Avanzado**: Sombrero reforzado y pico de acero doble. | **Minero Real**: Túnica dorada, casco ligero y cesto de mineral puro ($2\text{ monedas}$ por viaje). | Extrae Reales de Plata directamente de las **Vetas de Roca** en las laderas de los Montes de María. |
| **Agricultura** | **Agricultor Africano**: Azadón de madera, cesto de frutas/yuca y gavillas. | **Agricultor Avanzado**: Sombrero de ala ancha y azadón pesado de hierro. | **Agricultor Real**: Atuendo dorado real y cosecha acelerada con cestos dobles. | Mantiene el flujo constante de plata diurna en las granjas de riego. |

### 2.3. El Campeón Real y Armadura de Benkos Biohó (Lámina 3)

La **Lámina 3** cumple una doble función en el diseño del juego:
1. **Armadura Real de Benkos Biohó (Acto IV — "El Rey del Arcabuco"):** Cuando el jugador desbloquea el rango real o activa su armadura con `[C]`, Benkos viste la coraza de bronce y oro, la capa roja al viento, el escudo africano negro y dorado con patrón de diamante y alterna dinámicamente entre las animaciones **`ATACANDO (ESPADA)`** (4 frames de tajo con estela blanca) y **`ATACANDO (LANZA)`** (4 frames de estocada profunda), además de la pose **`DESAFIANDO`** al invocar el *Rugido del Magdalena*.
2. **Guardia Personal del Reino (`CAMPEON_REAL`):** Unidad de élite máxima que escolta directamente a Benkos o defiende el centro del Palenque.

---

## 3. Arquitectura de Ingeniería: El Pipeline Híbrido (Phaser + Pixi v8 + R3F)

Para evitar cuellos de botella de rendimiento en navegadores o en el ejecutable de escritorio, el juego NO mezcla tres bucles `requestAnimationFrame` compitiendo entre sí. Se implementa un **Único Reloj Maestro (Single Master Ticker)** gobernado por `useFrame` de React Three Fiber, que alimenta manualmente el paso físico de Phaser y el renderizador de PixiJS.

### 3.1. Estructura de Directorios de Producción (Monorepo Vite + TypeScript)

```
benkhoos-the-game/
├── src-tauri/                  # Backend nativo en Rust (Tauri v2) para Steam API, Guardado en Disco y Gamepad
├── public/
│   ├── assets/
│   │   ├── atlases/
│   │   │   ├── benkos_rebel.json       # Lámina Personaje Principal
│   │   │   ├── benkos_royal.json       # Lámina 3 Aliados (Campeón Real con Lanza/Espada/Escudo)
│   │   │   ├── allies_enslaved.json    # Lámina 1 Aliados (Grilletes, Saco, Rompiendo Cadenas)
│   │   │   ├── allies_african_t1.json  # Lámina 2 Aliados (Guerrero, Arquero, Cazador con Red, Minero, Agricultor)
│   │   │   ├── allies_elite_royal.json # Lámina 4 Aliados (Variantes Élite y Real + Espadachín y Caballero)
│   │   │   ├── enemies_colonial.json   # Lámina 1 Enemigos (7 Tropas de la Corona)
│   │   │   └── bosses_royal.json       # Láminas 2, 3 y 4 Enemigos (Heraldo Alado y Gobernador Girón Fases 1-2)
│   │   ├── tilemaps/           # montes_de_maria.tmj (Exportado de Tiled / LDtk)
│   │   ├── audio/              # Stems en formato .ogg (Tambor Alegre, Llamador, Ambiente Selva)
│   │   └── shaders/            # magdalena_water.vert, magdalena_water.frag, foliage_wind.frag
├── src/
│   ├── core/
│   │   ├── MasterLoop.ts       # Sincronizador de DeltaTime con acumulador fijo (Fixed Timestep 16.66ms)
│   │   ├── EventBus.ts         # Emisor tipado para comunicar Simulación -> Audio/UI
│   │   └── SaveSystem.ts       # Serialización JSON + cifrado para progreso de campaña
│   ├── kernel/                 # CAPA 1: PHASER HEADLESS (Pura Lógica y Física 2D)
│   │   ├── PhysicsWorld.ts     # Colisiones Arcade, gravedad de monedas, proyectiles de red
│   │   ├── ai/
│   │   │   ├── AlliedHFSM.ts   # Máquina jerárquica para los 10 roles aliados y sus 3 rangos
│   │   │   ├── ColonialDirector.ts # IA Directora: calcula presupuesto de amenaza y oleadas nocturnas
│   │   │   └── BossGironFSM.ts # Patrones de ataque del Heraldo Alado y Gobernador Girón (2 Fases)
│   │   └── economy/
│   │       ├── CoinSlotNode.ts # Lógica Hold-to-Pay, reembolso físico y desbordamiento de bolsa
│   │       └── PalenqueGrid.ts # Nodos de expansión, Vetas de Plata, Granjas y Tótem de Ascenso
│   ├── renderer2d/             # CAPA 2: PIXI.JS v8 (Spritesheets, Partículas y HUD Diegético)
│   │   ├── PixiAtlasLoader.ts  # Carga de texturas con scaleMode = 'nearest'
│   │   ├── EntitySpriteSync.ts # Lee el buffer de memoria (Float32Array) y actualiza los AnimatedSprites
│   │   └── DiegeticHUD.ts      # Bolsa física apilada, Indicador de Rango Militar y Ranuras Fantasma
│   └── renderer3d/             # CAPA 3: REACT THREE FIBER (Escenario 2.5D, Luces y Post-Procesado)
│       ├── StageCanvas.tsx     # Configuración ortográfica/perspectiva híbrida con pixel-snapping
│       ├── LightingRig.tsx     # Sol/Luna direccional + PointLights dinámicos (Antorchas, Arcabuz, Jaguar)
│       └── WaterPlane.tsx      # RenderTarget de reflejo + Shader GLSL del Río Magdalena
```

---

## 4. Referencias Históricas, Culturales y Técnicas

1. **Navarrete, María Cristina (2008).** *San Basilio de Palenque: memoria y tradición. Surgimiento y avatares de las gestas cimarronas en el Caribe colombiano*. Universidad del Valle.
2. **De Friedemann, Nina S. & Patiño Rosselli, Carlos (1983).** *Lengua y sociedad en el Palenque de San Basilio*. Instituto Caro y Cuervo.
3. **Arrazola, Roberto (1970).** *Palenque, primer pueblo libre de América: Historia de las sublevaciones de los esclavos de Cartagena*. Ediciones Hernández.
4. **van den Berg, Thomas [noio] (2016).** *"Designing Kingdom: Minimalist Strategy and Indirect Control"* — GDC Vault.
5. **PixiJS v8 Documentation & React Three Fiber API (`pmnd.rs`).** Pipeline de texturas `nearest` e iluminación 2.5D en tiempo real.
