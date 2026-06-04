declare module "vanta/dist/vanta.net.min" {
  const NET: (options: Record<string, unknown>) => { destroy: () => void };
  export default NET;
}

declare module "vanta/dist/vanta.waves.min" {
  const WAVES: (options: Record<string, unknown>) => { destroy: () => void };
  export default WAVES;
}
