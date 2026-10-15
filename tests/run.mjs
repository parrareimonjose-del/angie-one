// Empaqueta una prueba con stubs de los módulos nativos y la ejecuta en Node.
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';
const file = process.argv[2]; const out = '/tmp/angie-test-' + Date.now() + '.mjs';
const stub = { name: 'stub', setup(b) {
  b.onResolve({ filter: /^(react-native|@react-native-async-storage\/.*|expo-.*|react|i18next|react-i18next)$|\/i18n$/ }, (a) => ({ path: a.path, namespace: 'stub' }));
  b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'const p=new Proxy(function(){return p},{get:(t,k)=>k==="__esModule"?false:k===Symbol.toPrimitive?()=>"":p,apply:()=>p});export default p;export const deviceLang=()=>"es",fmtLocale=()=>"es",curLang=()=>"es",createContext=()=>p,useContext=p,useEffect=p,useState=p,useCallback=p,Platform={OS:"web"},AppState=p;', loader: 'js' }));
} };
await build({ entryPoints: [file], bundle: true, platform: 'node', format: 'esm', outfile: out, plugins: [stub], logLevel: 'error' });
await import(pathToFileURL(out).href);
