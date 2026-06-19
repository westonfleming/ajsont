export class AjsontError extends Error {
  public readonly path?: string;
  public readonly jsonPath?: string;

  constructor(message: string, options?: { path?: string; jsonPath?: string }) {
    super(message);
    this.name = 'AjsontError';
    this.path = options?.path;
    this.jsonPath = options?.jsonPath;
  }
}
