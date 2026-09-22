export default function CoupleCats() {
  return (
    <svg className="coupleCats" viewBox="0 0 480 390" role="img" aria-label="Dos gatitos acurrucados, uno naranja y otro color crema, con un corazón entre los dos">
      <path d="M49 316V192a191 191 0 0 1 382 0v124Z" fill="#f2ddbd" />
      <path d="M68 316V194a172 172 0 0 1 344 0v122" fill="none" stroke="#fff8e8" strokeWidth="2" strokeDasharray="4 8" />
      <circle cx="357" cy="86" r="30" fill="#fff2c9" />
      <g fill="#adbd8e" stroke="#71815e" strokeWidth="2" strokeLinecap="round">
        <path d="M61 301q-17-50-4-93M57 248q-26-4-25-25 28 0 25 25M58 270q23-13 27-35-29 2-27 35M60 293q-29-1-33-24 27-3 33 24" />
        <path d="M424 301q16-36 4-70M430 267q22-3 26-24-28 0-26 24M428 288q-24-9-27-30 27 0 27 30" />
      </g>
      <ellipse cx="242" cy="321" rx="191" ry="29" fill="#dcc5a6" />
      <path d="M66 309c20-30 336-29 354 0 12 25-17 48-177 48S50 336 66 309Z" fill="#acc7b1" stroke="#66503d" strokeWidth="3.5" />
      <path d="M88 333q156 27 309 0" fill="none" stroke="#7e9a83" strokeWidth="2" strokeDasharray="5 7" />

      {/* The tails curl around the outside of the shared cushion. */}
      <path d="M146 300c-72 12-82-26-71-45 7-12 22-6 18 7-8 24 26 27 48 17" fill="#dfa168" stroke="#66503d" strokeWidth="4" strokeLinecap="round" />
      <path d="M333 302c70 12 83-24 71-44-7-11-22-4-18 8 8 22-23 25-45 17" fill="#f9edda" stroke="#66503d" strokeWidth="4" strokeLinecap="round" />

      <g stroke="#66503d" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M123 306c-7-37 3-89 44-96 47-8 83 33 80 98-22 20-96 23-124-2Z" fill="#dfa168" />
        <path d="M153 305c0-43 16-64 39-62 25 2 38 33 33 67" fill="#f6d4a7" stroke="none" />
        <path d="M239 306c-4-55 24-94 67-92 43 2 58 56 50 94-25 21-91 21-117-2Z" fill="#f9edda" />
        <path d="M328 247c19 5 25 32 22 49-18-3-29-20-22-49Z" fill="#b1a08b" stroke="none" />

        {/* Rounded heads and tilted ears meet in the middle. */}
        <path d="m110 175-3-66 50 26c23-7 50-2 68 10l41-23-8 64c12 49-21 74-69 75-52 1-91-28-79-86Z" fill="#e6aa73" />
        <path d="m119 129 27 14-25 17Z" fill="#e9b0a0" stroke="none" />
        <path d="m249 141-22 13 19 14Z" fill="#e9b0a0" stroke="none" />
        <path d="m226 183-7-58 43 23c18-10 46-15 70-7l43-27-1 66c10 52-23 81-70 80-48 0-81-28-78-77Z" fill="#fff4e2" />
        <path d="m230 144 23 13-18 15Z" fill="#e9b0a0" stroke="none" />
        <path d="m363 134-22 15 22 14Z" fill="#e9b0a0" stroke="none" />
        <path d="M332 141c14 10 22 28 17 48-16 10-37 4-44-11-4-12 3-25 7-40Z" fill="#b1a08b" stroke="none" />
        <path d="m163 136 4 17m16-19 2 16m15-12-1 15" stroke="#c38350" />

        {/* Closed eyes, little smiles and pink cheeks. */}
        <path d="M136 192q10 12 21 0M201 192q10 12 20 0M251 193q10 12 21 0M319 193q10 12 20 0" fill="none" />
        <path d="m174 206 9 0-4 5Z" fill="#a56b61" stroke="#a56b61" strokeWidth="2" />
        <path d="M179 213q-7 10-14 2m14-2q6 10 13 2" fill="none" strokeWidth="2.5" />
        <path d="m289 207 9 0-4 5Z" fill="#a56b61" stroke="#a56b61" strokeWidth="2" />
        <path d="M294 214q-7 10-14 2m14-2q6 10 13 2" fill="none" strokeWidth="2.5" />
        <g fill="#e9ae9d" stroke="none" opacity=".75">
          <ellipse cx="137" cy="214" rx="13" ry="7" /><ellipse cx="216" cy="214" rx="12" ry="7" />
          <ellipse cx="250" cy="215" rx="12" ry="7" /><ellipse cx="338" cy="215" rx="13" ry="7" />
        </g>
        <path d="m121 206-21-5m21 14-20 2m254-11 21-5m-21 14 20 2" strokeWidth="2" />
        <path d="M173 308v9m13-9v10m100-9v9m13-10v9" strokeWidth="2.5" />
        <path d="M203 277q27 26 54 0" fill="none" strokeWidth="14" stroke="#f6d4a7" />
        <path d="M206 280q25 17 45 1" fill="none" strokeWidth="2.5" />
      </g>
      <g className="catsHeart" fill="#cf7868">
        <path d="M238 98c-33-19-25-39-12-39 7 0 10 4 12 8 3-4 6-8 13-8 14 0 21 20-13 39Z" />
      </g>
      <g fill="#c69550">
        <path d="m99 77 3 9 9 3-9 3-3 9-3-9-9-3 9-3ZM388 186l2 6 7 2-7 2-2 7-2-7-6-2 6-2Z" />
        <circle cx="302" cy="63" r="3" /><circle cx="86" cy="179" r="3" />
      </g>
    </svg>
  );
}
