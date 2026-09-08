const illustrations = {
  plant: `
    <path d="M46 124h158" stroke="#b8a081" stroke-width="7" stroke-linecap="round"/>
    <path d="M56 126v13m140-13v13" stroke="#8b7356" stroke-width="5"/>
    <path d="M91 82h60l-8 39q-22 9-44 0z" fill="#b98867"/>
    <ellipse cx="121" cy="82" rx="31" ry="9" fill="#cd9e7a"/>
    <ellipse cx="121" cy="82" rx="24" ry="5" fill="#6a6049"/>
    <path d="M121 81V39m0 33L98 53m24 7 28-27m-29 18-9-22" fill="none" stroke="#668462" stroke-width="4" stroke-linecap="round"/>
    <path d="M119 45Q89 41 96 19q28-2 23 26Z" fill="#92a879"/>
    <path d="M122 55q-5-32 29-39 6 29-29 39Z" fill="#6c916b"/>
    <path d="M113 69Q78 68 78 44q32-7 35 25Z" fill="#6f956e"/>
    <path d="M124 73q8-31 40-29-3 31-40 29Z" fill="var(--card-color, #7a9f75)"/>
    <path d="M174 108h23l-4 16h-15z" fill="#ded2b5"/>
    <path d="M185 108q-18-5-17-19 16 0 17 19m0 0q-1-24 17-29 7 20-17 29" fill="#8ca884"/>
    <path d="M54 102l20 7-4 15H52z" fill="#a4b8af"/>
    <path d="M56 103q-1-15 13-9l4 7m0 6 11-8" fill="none" stroke="#a4b8af" stroke-width="4" stroke-linecap="round"/>
  `,
  clock: `
    <path d="M79 43q0-31 46-31t46 31v73q0 12-12 12H91q-12 0-12-12z" fill="#ac805b"/>
    <path d="M88 45q0-25 37-25t37 25v68q0 7-8 7H96q-8 0-8-7z" fill="#c59c72"/>
    <circle cx="125" cy="55" r="34" fill="#f0e5c9" stroke="#a08257" stroke-width="4"/>
    <path d="M125 27v6m0 45v6m-28-29h6m45 0h6m-44-20 4 4m22 32 4 4m-30 0 4-4m22-32 4-4" stroke="#9b906e" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M125 55l-12-11m12 11 15-18" fill="none" stroke="#5c6555" stroke-width="4" stroke-linecap="round"/>
    <circle cx="125" cy="55" r="3.5" fill="#a77c54"/>
    <path d="M106 92h38v23h-38z" fill="#6d654e"/>
    <path d="M125 91v17" stroke="#ddbc79" stroke-width="3"/>
    <circle cx="125" cy="109" r="8" fill="#d7b372"/>
    <rect x="71" y="126" width="108" height="7" rx="3.5" fill="#8f704f"/>
    <path d="M57 45l-8-5m8 27-10 2m146-24 8-5m-8 27 10 2" stroke="#c4b68f" stroke-width="3" stroke-linecap="round"/>
  `,
  window: `
    <rect x="54" y="16" width="139" height="83" rx="5" fill="#b69c75"/>
    <rect x="60" y="21" width="127" height="73" rx="2" fill="#c9dbd5"/>
    <circle cx="160" cy="39" r="10" fill="#f7ebbc"/>
    <path d="M61 87q18-28 38-6 20-28 42-6 24-23 46-11v30H61z" fill="#a4bba0"/>
    <path d="M123 20v74M60 57h127" stroke="#f1e8d3" stroke-width="6"/>
    <path d="M54 18h22l-6 35 4 36H54zm139 0h-21l6 35-5 36h20z" fill="#e6dcc2"/>
    <path d="M62 24l-3 51m124-51 4 51" stroke="#d3c6a8" stroke-width="2"/>
    <rect x="47" y="95" width="154" height="8" rx="3" fill="#b6956c"/>
    <rect x="53" y="110" width="141" height="22" rx="3" fill="#b89770"/>
    <rect x="50" y="103" width="147" height="13" rx="6" fill="var(--card-color, #b7c7b8)"/>
    <rect x="64" y="86" width="31" height="23" rx="7" fill="#8da79a" transform="rotate(-8 79 99)"/>
    <path d="M110 106h24l6 5h-28z" fill="#f2ead8"/>
    <path d="M81 117v13m84-13v13" stroke="#dfc7a4" stroke-width="2"/>
    <path d="M206 108h18l-4 23h-10z" fill="#b88d6c"/>
    <path d="M215 109V86m0 14q-14-1-13-13 14-1 13 13m1-7q1-15 13-18 1 16-13 18" fill="#779775" stroke="#779775" stroke-width="2"/>
  `,
  sign: `
    <path d="M73 29v103M176 29v103" stroke="#997751" stroke-width="7" stroke-linecap="round"/>
    <path d="M58 28h134" stroke="#ba956a" stroke-width="9" stroke-linecap="round"/>
    <path d="M91 29v21m67-21v21" stroke="#ae8e5a" stroke-width="3"/>
    <rect x="61" y="47" width="127" height="59" rx="8" fill="#997751"/>
    <rect x="66" y="52" width="117" height="49" rx="5" fill="var(--card-color, #729582)"/>
    <path d="M97 70h24v15q-12 9-24 0zm24 3q13-1 9 9h-9" fill="#f2e5bd"/>
    <path d="M141 71h26m-26 8h22m-26 8h17" stroke="#f2e5bd" stroke-width="3" stroke-linecap="round"/>
    <path d="M106 65q-5-5 0-9m7 9q-5-5 0-9" fill="none" stroke="#d8ddb9" stroke-width="2" stroke-linecap="round"/>
    <path d="M47 42q78-41 157 0" fill="none" stroke="#8c9977" stroke-width="2"/>
    <g fill="#e4be6f"><circle cx="59" cy="36" r="4"/><circle cx="89" cy="26" r="4"/><circle cx="124" cy="22" r="4"/><circle cx="160" cy="27" r="4"/><circle cx="191" cy="37" r="4"/></g>
    <path d="M49 112h21l-4 20H53z" fill="#bf9270"/>
    <path d="M60 112q-16-10-10-24 15 4 10 24m0-2q2-22 15-24 6 19-15 24" fill="#8fa784"/>
    <path d="M187 119h19" stroke="#b99b75" stroke-width="5" stroke-linecap="round"/>
  `,
  opening: `
    <rect x="45" y="45" width="163" height="87" rx="4" fill="#dbc5a1"/>
    <path d="M43 45l10-24h146l11 24z" fill="#859d83"/>
    <rect x="88" y="25" width="77" height="15" rx="4" fill="#f0e4c6"/>
    <path d="M102 32h47" stroke="#90a183" stroke-width="3" stroke-linecap="round"/>
    <path d="M42 46h170v14H42z" fill="#dce1c8"/>
    <path d="M42 46h22v14H42zm43 0h21v14H85zm43 0h21v14h-21zm42 0h21v14h-21z" fill="#7e9c83"/>
    <path d="M42 58q11 12 22 0 11 12 21 0 11 12 21 0 11 12 22 0 11 12 21 0 11 12 21 0 11 12 21 0 10 12 21 0" fill="#b4c4a7"/>
    <rect x="58" y="74" width="48" height="54" rx="3" fill="#7d9986"/>
    <rect x="64" y="80" width="36" height="33" rx="2" fill="#dddec3"/>
    <path d="M82 81v32" stroke="#b3c4ac" stroke-width="3"/>
    <circle cx="98" cy="119" r="2" fill="#e9cc8b"/>
    <rect x="118" y="75" width="74" height="41" rx="3" fill="#ac9069"/>
    <rect x="122" y="79" width="66" height="33" rx="2" fill="#d3ddc8"/>
    <path d="M154 79v32" stroke="#f3e4c7" stroke-width="4"/>
    <path d="M134 95h13v10q-6 5-13 0z" fill="#f8efd5"/>
    <path d="M166 95h12l-3-9h-6zm6 0v12" fill="#879e77" stroke="#879e77" stroke-width="2"/>
    <rect x="115" y="114" width="81" height="6" rx="2" fill="#ac9069"/>
    <path d="M39 132h177" stroke="#bda27c" stroke-width="5" stroke-linecap="round"/>
    <path d="M204 115h19l-4 17h-11z" fill="#b88b67"/>
    <path d="M214 115q-17-9-12-22 16 1 12 22m0-4q1-24 15-27 7 21-15 27" fill="#849f76"/>
    <path d="M25 49l8 4m-3-22 7 7m184 12 8-4m-13-8 6-8" stroke="#d5bc85" stroke-width="3" stroke-linecap="round"/>
  `,
};

export function seasonArtwork(id) {
  if (!Object.hasOwn(illustrations, id)) return null;
  return `<svg viewBox="0 0 250 150" aria-hidden="true" focusable="false"><ellipse cx="128" cy="132" rx="97" ry="8" fill="#394e3d" opacity=".08"/>${illustrations[id]}</svg>`;
}
