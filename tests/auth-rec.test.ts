import { createAuth, newRecovery, recoverWith, checkSecret, pwAutofill, normRec } from '../src/auth';
let n = 0, f = 0; const ok = (c: any, m: string) => { c ? n++ : (f++, console.log('FAIL ' + m)); };
(async () => {
  const a0 = await createAuth('Ana', 'pin', '4826', false); const r = await newRecovery(); const a = { ...a0, ...{ recSalt: r.recSalt, recHash: r.recHash } };
  ok(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(r.code) && !JSON.stringify(a).includes(normRec(r.code)), 'código con formato y nunca guardado en claro');
  const bad = await recoverWith(a, 'AAAA-BBBB-CCCC', 'pin', '9371'); ok(!bad.ok && bad.err === 'badRec' && bad.auth.fails === 1, 'código malo cuenta intento');
  const weak = await recoverWith(a, r.code, 'pin', '1111'); ok(!weak.ok && weak.err === 'weakPin', 'PIN débil rechazado');
  const good = await recoverWith(a, r.code.toLowerCase().replace(/-/g, ' '), 'password', 'nueva-clave-9'); ok(good.ok && good.code && good.code !== r.code, 'recupera y da código nuevo');
  ok((await checkSecret(good.auth, 'nueva-clave-9')).ok && !(await checkSecret(good.auth, '4826')).ok, 'nueva clave vale, vieja no');
  ok(!(await recoverWith(good.auth, r.code, 'pin', '9371')).ok, 'código usado ya no vale');
  ok(good.auth.name === 'Ana', 'datos/nombre se conservan');
  let x: any = { ...a }; for (let i = 0; i < 5; i++) x = (await recoverWith(x, 'ZZZZ-ZZZZ-ZZZZ', 'pin', '9371')).auth; ok(x.lockUntil > Date.now(), '5 fallos bloquean 30 s');
  ok((await recoverWith(a0 as any, r.code, 'pin', '9371')).err === 'noRec', 'sin código → noRec');
  ok(pwAutofill('current', 'password').autoComplete === 'current-password' && pwAutofill('new', 'pin').autoComplete === 'new-password' && pwAutofill('new', 'password').textContentType === 'newPassword', 'autocompletar');
  console.log(`auth-rec ${n}/${n + f}`); if (f) process.exit(1);
})();
