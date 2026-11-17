export const PROLOGUE = {
  chapter: 'Prólogo · A ambos lados del mar',
  title: 'El nombre que cruzó el agua',
  lines: [
    'De niño, mi abuelo me llevaba a mirar el agua. Esperábamos juntos a que subiera la marea. Entonces me mostraba cómo un camino que acabábamos de cruzar desaparecía bajo nuestros pies.',
    'La tarde en que aparecieron las velas, dejé de oír a los niños que jugaban detrás de las casas. Mi abuelo me tomó de la mano y echó a andar hacia los manglares. Mi padre se quedó en el sendero.',
    'La primera noche, mi padre oyó pasos en la arena. Esperó a que el asaltante saliera de la sombra. Detrás de él, las primeras familias cruzaron hacia el manglar.',
    'La segunda noche llegaron dos por el mismo camino. Mi padre cedió unos pasos y los apartó del cruce. A sus espaldas, alguien cargó a un niño para que pudiera pasar sin hacer ruido.',
    'La tercera noche, mi padre aguantó hasta que pasó la última familia. Al amanecer vio hombres a ambos lados del sendero. Para entonces, ya estaba rodeado.',
    'Los traficantes nos llevaron a la orilla. Había botes esperando. Desde uno de ellos vi apagarse el último fuego de la aldea.',
    'Bajo cubierta apenas corría el aire. Éramos tantos que costaba tenderse. El agua escaseaba. Una mañana, la persona que había dormido a mi lado ya no respiraba. Hubo más que nunca llegaron a tierra.',
    'Desembarcamos en Cartagena. A los que sobrevivimos nos separaron y nos vendieron. Allí empezaron a llamarme Domingo. Yo seguí recordando el nombre con que me llamaba mi abuelo.',
    'Años después, nos reunimos alrededor de un mapa. Una mujer conocía los turnos de la guardia. Otro sabía dónde el agua era menos profunda. Entre todos encontramos una salida hacia la ciénaga.',
    'Salimos de noche. En los tramos bajos caminamos con el agua a la cintura. Cada vez que alguien perdía pie, los demás parábamos y le tendíamos la mano. Así llegamos juntos a la Matuna.',
    'En la Matuna levantamos primero un techo para descansar. Luego vinieron los cultivos, las casas y la guardia. Por fin pudimos encender un fuego sin tener que apagarlo al oír pasos.',
    'Desde La Matuna todavía se veían los caminos de las haciendas. Sabíamos quiénes seguían al otro lado de sus portones. Cuando llegó el momento, volvimos por ellos.'
  ].map(text => ['Benkos', text]),
  art: ['infancia', 'infancia', 'africa', 'africa', 'africa', 'captura', 'travesia', 'puerto', 'consejo', 'fuga', 'matuna', 'matuna'],
  notes: {
    0: 'Islas Bijagós, hacia finales del siglo XVI · La infancia, el abuelo y las tres noches se presentan como dramatización.',
    2: 'Primera noche · Camina con A y D o las flechas. Ataca con Espacio.',
    3: 'Segunda noche · Pulsa Mayús para esquivar cuando veas la señal de ataque.',
    4: 'Tercera noche · Cubre la retirada hasta el amanecer.',
    6: 'Travesía del Atlántico',
    7: 'Cartagena · Finales del siglo XVI',
    9: 'La fuga · Hacia 1599',
    11: 'Mantén S junto a un puesto para invertir reales. Pulsa E en la casa central para abrir el consejo.'
  },
  clips: {
    0: { id: 'abuelo', end: .5 }, 1: { id: 'abuelo', start: .5 },
    8: { id: 'mapa' }, 9: { id: 'fuga' }, 10: { id: 'matuna', end: .68 }, 11: { id: 'matuna', start: .68 }
  },
  voice: [
    'abuelo-marea', 'benkos-nino-barcos', 'narrador-primera-noche', 'narrador-segunda-noche', 'narrador-tercera-noche',
    'benkos-captura', 'narrador-travesia', 'narrador-cartagena', 'benkos-mapa', 'benkos-fuga', 'wiwa-refugio', 'benkos-matuna'
  ].map(id => ({ id, role: 'benkos' })),
  exercises: { 2: 1, 3: 2, 4: 3 }
};

export function historyDeparture(onDone) {
  return {
    chapter: 'Ruta histórica · La palabra empeñada', title: 'El acuerdo',
    lines: [
      ['Cronista · 1605', 'Las autoridades coloniales pactaron con Benkos después de años de resistencia. El acuerdo abrió un tiempo de paz para los cimarrones.'],
      ['Wiwa', 'Si vas a Cartagena, entra por la puerta de la ciudad. Que el consejo recuerde la palabra que nos dieron.']
    ], art: ['consejo', 'puerto'], onDone
  };
}

export function historyEnding(onDone) {
  return {
    chapter: 'Epílogo histórico · Cartagena de Indias', title: 'La palabra quebrada',
    lines: [
      ['Cronista', 'Años después del acuerdo, las autoridades coloniales detuvieron a Benkos en Cartagena. El gobernador García Girón ordenó su ejecución.'],
      ['16 de marzo de 1621', 'Benkos Biohó fue ahorcado en Cartagena. La resistencia que ayudó a sostener continuó en los palenques.'],
      ['Memoria de la Matuna', 'La infancia, el padre y las tres noches del prólogo son una dramatización. La resistencia, la negociación y la ejecución forman parte de la historia documentada.']
    ], art: ['traicion', 'traicion', 'matuna'], onDone
  };
}
