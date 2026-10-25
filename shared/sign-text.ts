// Ordinary headings use capitals. Literal identifiers must retain their case.
export function protectedLiterals(value:string):string[]{
  const tokens=new Set<string>();
  for(const match of value.matchAll(/https?:\/\/[^\s]+|www\.[^\s]+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g))tokens.add(match[0]);
  for(const match of value.matchAll(/(?:password|passcode|access\s+code|code|username|user\s*name|SSID)\s*(?:is\s+|[:=]\s*)?["'`]?([^\s"'`,;]+)/gi))tokens.add(match[1]);
  for(const match of value.matchAll(/`([^`]+)`|"([^"]+)"/g))tokens.add(match[1]||match[2]);
  for(const word of value.match(/[A-Za-z0-9_-]+/g)||[])if(/[a-z][A-Z]|[A-Z][a-z].*[A-Z]/.test(word))tokens.add(word);
  return [...tokens];
}

export function signText(value:string):string {
  return protectedLiterals(value).length ? value : value.toUpperCase();
}

export function literalsKept(expected:string,observed:string):boolean {
  return protectedLiterals(expected).every(token=>observed.includes(token));
}
