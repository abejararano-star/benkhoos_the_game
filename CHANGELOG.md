# Cambios de la edición PC · 5.0

- Nueva hoja de 64 sprites transparentes de habitantes, oficios y mensajeros, generada con ImageGen e importada al atlas.
- Regeneración de los atlas existentes con eliminación de blancos residuales y anclajes de pies; imágenes identificadas por hash para evitar caché antigua.
- Personas con nombre, don, temperamento, preferencias, atributos y experiencia persistente por oficio.
- Fichas con F o clic, afinidades comparables y cambios de rol mediante desplazamiento al puesto y consumo de herramientas.
- Leñadores especializados; civiles que huyen, cazadores que toman distancia, soldados que defienden y malheridos que buscan recuperación.
- Reacciones de daño, miedo, descanso, comentarios y ayuda de vecinos solidarios.
- Primera patrulla de dos hombres, llegada escalonada y puestos fronterizos visibles; progresión gradual del ejército enemigo.
- Mensajeros no combatientes desde Cartagena, cartas y propuesta de tregua; avisos anticipados y entrada física de jefes y refuerzos.
- Guardado v3 compatible con v1/v2 y adaptaciones para ventanas de PC estrechas.

## Edición 4.0

- Interfaz propia sin CDN, con menú de campaña, pausa real, panel del ejército, objetivos y señales de combate.
- Iconos SVG pixel art, paisaje con profundidad, viviendas del palenque y haciendas detalladas.
- Relación de aspecto conservada, pantalla completa y ajustes para reducir movimiento y destellos.
- Guardado completo y versionado, migración de partidas antiguas, copia local y elección de la copia más reciente.
- Persistencia MySQL transaccional con una migración aditiva; los guardados actualizan su registro y una campaña nueva crea otro.
- Progresión del ejército, armadura desbloqueable, dos objetivos territoriales y estados de victoria/derrota.
- Oleadas desde los extremos, preparación visible de ataques y rescate con coste de plata del cofre.
- Asignación de trabajos por cercanía y capacidad, reservas de herramientas y reparto de defensores.
- Simulación fija a 60 Hz y limpieza de controles al perder foco; teclado accesible en menús.
- Herramientas de prueba apartadas de la campaña y récords excluidos al usarlas.
- Código dividido en módulos, balance centralizado y un único proceso reproducible para exportar atlas.
- Pruebas de reglas, runtime, recursos, sprites y guardado real en XAMPP.
