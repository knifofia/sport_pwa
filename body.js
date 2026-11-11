'use strict';

// Silhouette stylisée : les formes décrivent la moitié gauche (centre x=60), la droite est un miroir.
// Chaque forme : [id, vue, balise SVG]. Les muscles profonds (DEEP) ne sont visibles qu'une fois sélectionnés.
const P = (pts) => `<polygon points="${pts}"/>`;
const E = (cx, cy, rx, ry, rot = 0) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${cx} ${cy})"/>`;

const BODY_SHAPES = [
  // Face
  ['scm', 'front', P('53,25 56,25 60,37 59,39')],
  ['trap_s', 'front', P('56,35 60,38 60,40 46,40')],
  ['delt_a', 'front', E(43, 47, 5, 9, 15)],
  ['delt_l_f', 'front', E(36.5, 49, 4, 8, 15)],
  ['pec', 'front', P('59,41 59,63 46,64 38,57 41,44 51,41')],
  ['biceps', 'front', E(34.5, 66, 3.5, 13, 6)],
  ['triceps_f', 'front', E(30.5, 66, 2.5, 12, 6)],
  ['brachior', 'front', E(26.5, 86, 2.5, 7, 6)],
  ['forearm_f', 'front', E(30, 95, 3.5, 12, 6)],
  ['abs', 'front', P('53,64 59,64 59,102 54,102')],
  ['obl_e', 'front', P('45,66 52,64 53,102 47,100 44,82')],
  ['tfl', 'front', E(41, 110, 3.5, 7)],
  ['quad_l', 'front', P('39,116 46,116 46,160 42,158 38,134')],
  ['sart', 'front', P('45,106 48,106 56,150 53,152')],
  ['quad_c', 'front', P('47,118 54,118 54,160 47,160')],
  ['quad_m', 'front', P('55,130 59,126 58,158 55,160')],
  ['addu_long', 'front', P('55,108 59,108 59,126 56,126')],
  ['addu_grand', 'front', P('57,124 60,124 59,150 57,148')],
  ['gracile', 'front', P('59,110 60,110 60,148 59,148')],
  ['pectine', 'front', P('52,106 55,106 56,114 53,114')],
  ['tib_ant', 'front', P('48,170 52,170 51,224 49,224')],
  ['ext_o', 'front', P('44,172 47,172 47,222 45,222')],
  ['fib_long', 'front', P('41,172 44,172 44,204 42,204')],
  ['fib_court', 'front', P('42,204 44,204 45,224 43,224')],
  ['pec_min', 'front', P('48,48 54,48 52,58 46,56')],
  ['brachial', 'front', E(31.5, 75, 2.5, 6, 6)],
  ['obl_i', 'front', P('46,80 52,76 52,96 47,96')],
  ['transv', 'front', P('48,92 53,90 53,104 49,104')],
  ['vast_int', 'front', P('46,122 52,122 52,150 46,150')],
  ['addu_court', 'front', P('55,112 59,112 59,122 56,122')],
  ['ext_h', 'front', P('47,196 49,196 49,224 47,224')],

  // Dos
  ['spl_t', 'back', P('55,24 58,24 60,33 57,34')],
  ['delt_p', 'back', E(42, 47, 5, 9, 15)],
  ['delt_l_b', 'back', E(36, 49, 4, 8, 15)],
  ['lats', 'back', P('41,62 51,64 59,86 59,96 49,96 42,78')],
  ['trap_s', 'back', P('59,28 53,34 45,43 59,45')],
  ['trap_m', 'back', P('59,45 45,43 47,52 59,55')],
  ['trap_i', 'back', P('59,55 47,52 52,64 59,84')],
  ['infra', 'back', P('44,50 54,50 54,60 44,58')],
  ['teres_min', 'back', P('41,54 44,52 45,58 42,58')],
  ['teres_maj', 'back', P('41,59 46,58 51,64 41,63')],
  ['erect', 'back', P('53,68 58,68 58,104 53,104')],
  ['triceps', 'back', E(33, 67, 5, 14, 6)],
  ['forearm_b', 'back', E(29, 93, 4.5, 14, 6)],
  ['glute_med', 'back', P('41,100 52,102 51,110 40,112')],
  ['glute_max', 'back', E(50, 120, 10, 10)],
  ['ham_l', 'back', P('39,134 49,134 48,162 42,162')],
  ['semi_t', 'back', P('49,134 54,134 53,162 49,162')],
  ['semi_m', 'back', P('54,134 59,134 57,162 53,162')],
  ['gastro', 'back', P('42,170 56,170 54,198 45,198')],
  ['soleus', 'back', P('45,198 53,198 51,226 47,226')],
  ['spl_c', 'back', P('57,33 60,33 60,42 58,42')],
  ['supra', 'back', P('47,44 55,44 55,48 47,49')],
  ['rhomb_min', 'back', P('55,46 59,46 59,51 55,51')],
  ['rhomb_maj', 'back', P('55,51 59,51 59,62 55,61')],
  ['multi', 'back', P('58,68 60,68 60,104 58,104')],
  ['ql', 'back', P('48,86 53,86 53,102 49,102')],
  ['glute_min', 'back', P('41,104 49,105 48,110 42,111')],
  ['plantar', 'back', P('44,168 48,168 47,180 44,180')],
  ['tib_post', 'back', P('47,186 51,186 50,214 48,214')],
  ['fdl', 'back', P('44,186 47,186 47,214 45,214')],
  ['fhl', 'back', P('50,196 53,196 52,220 50,220')],
];

const DEEP = new Set(['pec_min', 'brachial', 'obl_i', 'transv', 'vast_int', 'addu_court', 'ext_h', 'spl_c', 'supra',
  'rhomb_min', 'rhomb_maj', 'multi', 'ql', 'glute_min', 'plantar', 'tib_post', 'fdl', 'fhl']);

const HEAD = '<circle cx="60" cy="15" r="11"/>';
const FACE = `<g class="face"><circle cx="56" cy="13" r="1.2"/><circle cx="64" cy="13" r="1.2"/>
  <path d="M60 14 L59 18 L61 18" fill="none"/><path d="M56 21 Q60 24 64 21" fill="none"/></g>`;
const SILHOUETTE_HALF = `<polygon points="60,26 46,36 36,42 40,58 44,70 45,104 60,108"/>
  <polygon points="35,40 46,44 41,80 37,84 34,108 23,108 24,84 27,56"/>
  <polygon points="37,104 60,104 59,162 57,228 42,228 38,162"/>`;

const MUSCLE_SHAPES = {
  'Deltoïde antérieur': ['delt_a'], 'Deltoïde latéral': ['delt_l_f', 'delt_l_b'], 'Deltoïde postérieur': ['delt_p'],
  'Grand pectoral': ['pec'], 'Petit pectoral': ['pec_min'],
  'Grand dorsal': ['lats'], 'Trapèze': ['trap_s', 'trap_m', 'trap_i'], 'Trapèze supérieur': ['trap_s'],
  'Rhomboïde majeur': ['rhomb_maj'], 'Rhomboïde mineur': ['rhomb_min'],
  'Grand rond': ['teres_maj'], 'Petit rond': ['teres_min'], 'Infra-épineux': ['infra'], 'Supra-épineux': ['supra'],
  'Érecteurs du rachis': ['erect'], 'Multifides': ['multi'], 'Carré des lombes': ['ql'],
  'Biceps brachial': ['biceps'], 'Brachial': ['brachial'], 'Brachio-radial': ['brachior'], 'Triceps brachial': ['triceps', 'triceps_f'],
  'Groupe des fléchisseurs du poignet et des doigts': ['forearm_f'],
  'Groupe des extenseurs du poignet et des doigts': ['forearm_b'],
  'Sternocléidomastoïdien': ['scm'], 'Splénius de la tête': ['spl_t'], 'Splénius du cou': ['spl_c'],
  "Droit de l'abdomen": ['abs'], "Transverse de l'abdomen": ['transv'], 'Oblique externe': ['obl_e'], 'Oblique interne': ['obl_i'],
  'Grand fessier': ['glute_max'], 'Moyen fessier': ['glute_med'], 'Petit fessier': ['glute_min'],
  'Droit fémoral': ['quad_c'], 'Vaste intermédiaire': ['vast_int'], 'Vaste latéral': ['quad_l'], 'Vaste médial': ['quad_m'],
  'Biceps fémoral': ['ham_l'], 'Semi-tendineux': ['semi_t'], 'Semi-membraneux': ['semi_m'],
  'Long adducteur': ['addu_long'], 'Court adducteur': ['addu_court'], 'Grand adducteur': ['addu_grand'],
  'Gracile': ['gracile'], 'Pectiné': ['pectine'],
  'Tenseur du fascia lata': ['tfl'], 'Sartorius': ['sart'],
  'Gastrocnémien': ['gastro'], 'Plantaire grêle': ['plantar'], 'Soléaire': ['soleus'],
  'Tibial antérieur': ['tib_ant'], 'Long extenseur des orteils': ['ext_o'], "Long extenseur de l'hallux": ['ext_h'],
  'Tibial postérieur': ['tib_post'], 'Long fléchisseur des orteils': ['fdl'], "Long fléchisseur de l'hallux": ['fhl'],
  'Fibulaire long': ['fib_long'], 'Fibulaire court': ['fib_court'],
};

function bodySvg() {
  const view = (name, ox) => {
    const shapes = BODY_SHAPES.filter((s) => s[1] === name)
      .sort((a, b) => DEEP.has(a[0]) - DEEP.has(b[0]))
      .map(([id, , el]) => el.replace('/>', ` class="m${DEEP.has(id) ? ' deep' : ''}" data-s="${id}"/>`)).join('');
    return `<g transform="translate(${ox},0)"><g class="sil">${HEAD}${SILHOUETTE_HALF}</g><g class="sil" transform="translate(120,0) scale(-1,1)">${SILHOUETTE_HALF}</g>${name === 'front' ? FACE : ''}${shapes}</g>` +
      `<g transform="translate(${ox + 120},0) scale(-1,1)">${shapes}</g>`;
  };
  return `<svg viewBox="0 0 240 232" class="body" role="img" aria-label="Schéma du corps, face et dos">${view('front', 0)}${view('back', 120)}</svg>`;
}
