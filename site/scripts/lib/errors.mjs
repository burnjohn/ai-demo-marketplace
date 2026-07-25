/**
 * Fatal build error — thrown when the generator encounters a condition that
 * must abort the build with a non-zero exit code and a human-readable
 * message naming the offending source(s).
 */
export class BuildIndexError extends Error {
  constructor(message) {
    super(message);
    this.name = "BuildIndexError";
  }
}
