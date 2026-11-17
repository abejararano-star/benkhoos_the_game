export const PROLOGUE = {
  chapter: 'Prólogo · A ambos lados del mar',
  title: 'El nombre que cruzó el agua',
  lines: [
    ['Abuelo', 'Benkos, mira el agua. Cuando sube la marea, cambia el camino. Aprende a oírla.'],
    ['Benkos pequeño', 'Abuelo, si vuelven los barcos, ¿nos escondemos entre los manglares?'],
    ['Primera noche', 'Mueve al padre de Benkos con A y D o las flechas. Cuando se acerque el primer asaltante, ataca con Espacio.'],
    ['Segunda noche', 'Llegan dos asaltantes. Pulsa Mayús para esquivar cuando veas la señal de ataque. Abre paso para que las familias alcancen el manglar.'],
    ['Tercera noche', 'Defiende el sendero mientras las últimas familias se retiran. Al amanecer, el padre de Benkos queda rodeado.'],
    ['Benkos', 'Se apagaron los fuegos. Los traficantes se llevaron a los cautivos para venderlos en los dominios españoles.'],
    ['Travesía del Atlántico', 'Bajo cubierta apenas había aire para respirar. Las personas cautivas viajaban hacinadas, con poca agua. Hubo quienes murieron antes de que el barco tocara tierra.'],
    ['Cartagena · Finales del siglo XVI', 'Las familias que sobrevivieron fueron desembarcadas y vendidas bajo el dominio colonial español. A Benkos lo llamaron Domingo.'],
    ['Benkos', 'Estudiamos el camino. Si salíamos juntos de Cartagena, podíamos alcanzar la ciénaga.'],
    ['Benkos', 'Salimos juntos hacia la Matuna. La oscuridad y el manglar nos cubrieron.'],
    ['Wiwa', 'Hicimos un refugio en la Matuna. En las haciendas cercanas todavía hay gente presa. Si volvemos por ellos, que nadie tenga que volver solo.'],
    ['Benkos', 'Aquí levantamos La Matuna. Ahora volvamos por quienes quedaron atrás.']
  ],
  art: ['infancia', 'infancia', 'africa', 'africa', 'africa', 'captura', 'travesia', 'puerto', 'consejo', 'fuga', 'matuna', 'matuna'],
  notes: {
    0: 'Islas Bijagós, hacia finales del siglo XVI · La infancia, el abuelo y las tres noches se presentan como dramatización.',
    9: 'La fuga · Hacia 1599',
    11: 'Mantén S junto a un puesto para invertir reales. Pulsa E en la casa central para abrir el consejo.'
  },
  clips: {
    0: { id: 'abuelo', end: .5 }, 1: { id: 'abuelo', start: .5 },
    8: { id: 'mapa' }, 9: { id: 'fuga' }, 10: { id: 'matuna', end: .68 }, 11: { id: 'matuna', start: .68 }
  },
  voice: {
    0: { id: 'abuelo-marea', role: 'abuelo' },
    1: { id: 'benkos-nino-barcos', role: 'nino' },
    5: { id: 'benkos-captura', role: 'benkos' },
    8: { id: 'benkos-mapa', role: 'benkos' },
    9: { id: 'benkos-fuga', role: 'benkos' },
    11: { id: 'benkos-matuna', role: 'benkos' }
  },
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
