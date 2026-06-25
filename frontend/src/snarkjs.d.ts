declare module 'snarkjs' {
  export const groth16: {
    fullProve(
      input: Record<string, unknown>,
      wasmFile: string | Uint8Array,
      zkeyFile: string | Uint8Array
    ): Promise<{ proof: any; publicSignals: string[] }>
    verify(vkey: any, publicSignals: string[], proof: any): Promise<boolean>
  }
}
