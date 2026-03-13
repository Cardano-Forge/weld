export class Debuggable {
  private _debug = false;

  withDebug(enable = true) {
    this._debug = enable;
    return this;
  }

  protected _log(...message: unknown[]) {
    if (this._debug) {
      console.log(...message);
    }
  }
}
