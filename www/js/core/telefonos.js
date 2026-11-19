/* telefonos.js — códigos de área: toda América + España */
'use strict';
const CODIGOS_PAIS = [
  { c: '+1',    n: 'EE.UU. / Canadá' },
  { c: '+1242', n: 'Bahamas' },
  { c: '+1246', n: 'Barbados' },
  { c: '+1264', n: 'Anguila' },
  { c: '+1268', n: 'Antigua y Barbuda' },
  { c: '+1284', n: 'Islas Vírgenes Británicas' },
  { c: '+1340', n: 'Islas Vírgenes de EE.UU.' },
  { c: '+1345', n: 'Islas Caimán' },
  { c: '+1441', n: 'Bermudas' },
  { c: '+1473', n: 'Granada' },
  { c: '+1649', n: 'Islas Turcas y Caicos' },
  { c: '+1664', n: 'Montserrat' },
  { c: '+1670', n: 'Islas Marianas del Norte' },
  { c: '+1671', n: 'Guam' },
  { c: '+1684', n: 'Samoa Americana' },
  { c: '+1721', n: 'Sint Maarten' },
  { c: '+1758', n: 'Santa Lucía' },
  { c: '+1767', n: 'Dominica' },
  { c: '+1784', n: 'San Vicente y las Granadinas' },
  { c: '+1787', n: 'Puerto Rico' },
  { c: '+1809', n: 'República Dominicana' },
  { c: '+1829', n: 'República Dominicana' },
  { c: '+1849', n: 'República Dominicana' },
  { c: '+1868', n: 'Trinidad y Tobago' },
  { c: '+1869', n: 'San Cristóbal y Nieves' },
  { c: '+1876', n: 'Jamaica' },
  { c: '+1939', n: 'Puerto Rico' },
  { c: '+297',  n: 'Aruba' },
  { c: '+34',   n: 'España' },
  { c: '+500',  n: 'Islas Malvinas' },
  { c: '+501',  n: 'Belice' },
  { c: '+502',  n: 'Guatemala' },
  { c: '+503',  n: 'El Salvador' },
  { c: '+504',  n: 'Honduras' },
  { c: '+505',  n: 'Nicaragua' },
  { c: '+506',  n: 'Costa Rica' },
  { c: '+507',  n: 'Panamá' },
  { c: '+509',  n: 'Haití' },
  { c: '+51',   n: 'Perú' },
  { c: '+52',   n: 'México' },
  { c: '+53',   n: 'Cuba' },
  { c: '+54',   n: 'Argentina' },
  { c: '+55',   n: 'Brasil' },
  { c: '+56',   n: 'Chile' },
  { c: '+57',   n: 'Colombia' },
  { c: '+58',   n: 'Venezuela' },
  { c: '+590',  n: 'Guadalupe' },
  { c: '+591',  n: 'Bolivia' },
  { c: '+592',  n: 'Guyana' },
  { c: '+593',  n: 'Ecuador' },
  { c: '+594',  n: 'Guayana Francesa' },
  { c: '+595',  n: 'Paraguay' },
  { c: '+596',  n: 'Martinica' },
  { c: '+597',  n: 'Surinam' },
  { c: '+598',  n: 'Uruguay' },
  { c: '+599',  n: 'Curazao / Bonaire' }
];
CODIGOS_PAIS.sort((a, b) => a.n.localeCompare(b.n, 'es'));

/* país (nombre como en PAISES de destinos) → código telefónico */
const CODIGO_POR_PAIS = {
  'Argentina':'+54','Aruba':'+297','Bahamas':'+1242','Barbados':'+1246',
  'Belice':'+501','Bolivia':'+591','Brasil':'+55','Canadá':'+1',
  'Chile':'+56','Colombia':'+57','Costa Rica':'+506','Cuba':'+53',
  'Curazao':'+599','Dominica':'+1767','Ecuador':'+593',
  'El Salvador':'+503','España':'+34','Estados Unidos':'+1',
  'Granada':'+1473','Guatemala':'+502','Guyana':'+592','Haití':'+509',
  'Honduras':'+504','Jamaica':'+1876','México':'+52','Nicaragua':'+505',
  'Panamá':'+507','Paraguay':'+595','Perú':'+51','Puerto Rico':'+1787',
  'República Dominicana':'+1809','San Cristóbal y Nieves':'+1869',
  'San Vicente y las Granadinas':'+1784','Santa Lucía':'+1758',
  'Surinam':'+597','Trinidad y Tobago':'+1868','Uruguay':'+598',
  'Venezuela':'+58'
};
function codigoDePais(nombre) { return CODIGO_POR_PAIS[nombre] || ''; }

/* rellena un <select> de código de país; selDef = código por defecto */
function llenarCodigos(select, selDef) {
  select.innerHTML = '';
  CODIGOS_PAIS.forEach(p => {
    const o = document.createElement('option');
    o.value = p.c;
    o.textContent = p.n + ' (' + p.c + ')';
    select.appendChild(o);
  });
  select.value = selDef || '+506';
}
