export const PROLOGUE = {
  chapter: 'Prólogo · A ambos lados del mar',
  title: 'El nombre que cruzó el agua',
  lines: [
    ['Memoria de la Matuna', 'La tradición sitúa el origen de Benkos en la región de las islas Bijagós. Esta primera parte imagina a su padre y las tres noches de resistencia.'],
    ['Benkos', 'Mi padre decía que un camino se defiende para que alguien pueda pasar. Cuando vieron los barcos en el horizonte, las familias buscaron refugio entre los manglares.'],
    ['Primera noche', 'Mueve al padre de Benkos con A y D o las flechas. Cuando se acerque el primer asaltante, ataca con Espacio.'],
    ['Segunda noche', 'Llegan dos asaltantes. Pulsa Mayús para esquivar cuando veas la señal de ataque. Abre paso para que las familias alcancen el manglar.'],
    ['Tercera noche', 'Defiende el sendero mientras las últimas familias se retiran. Al amanecer, el padre de Benkos queda rodeado.'],
    ['Benkos', 'Se apagaron los fuegos. Los traficantes se llevaron a los cautivos para venderlos en los dominios españoles.'],
    ['Travesía del Atlántico', 'Bajo cubierta apenas había aire para respirar. Las personas cautivas viajaban hacinadas, con poca agua. Hubo quienes murieron antes de que el barco tocara tierra.'],
    ['Cartagena · Finales del siglo XVI', 'Las familias que sobrevivieron fueron desembarcadas y vendidas bajo el dominio colonial español. A Benkos lo llamaron Domingo.'],
    ['Infancia · Dramatización', 'Cerca de los muelles, el joven Benkos aprende a leer la corriente y a distinguir los remos en la oscuridad.'],
    ['La fuga · Hacia 1599', 'Benkos y otros cautivos huyeron de Cartagena. El agua y los manglares les permitieron internarse hacia la ciénaga de la Matuna.'],
    ['Wiwa', 'Hicimos un refugio en la Matuna. En las haciendas cercanas todavía hay gente presa. Si volvemos por ellos, que nadie tenga que volver solo.'],
    ['Benkos', 'En La Matuna, mantén S junto a un puesto para invertir reales y pulsa E en la casa central para abrir el consejo. Primero vamos por quienes quedaron atrás.']
  ],
  art: ['africa', 'africa', 'africa', 'africa', 'africa', 'captura', 'travesia', 'puerto', 'infancia', 'fuga', 'matuna', 'matuna'],
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
