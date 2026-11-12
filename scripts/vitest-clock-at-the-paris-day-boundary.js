const BOUNDARY_HOUR = 23;
const BOUNDARY_MINUTE = 10;
const INSTALLED = Symbol.for('borso.clock-at-the-paris-day-boundary');

function readBoundaryOf(instant) {
  return Date.UTC(
    instant.getUTCFullYear(),
    instant.getUTCMonth(),
    instant.getUTCDate(),
    BOUNDARY_HOUR,
    BOUNDARY_MINUTE,
  );
}

function installBoundaryClock() {
  const RealDate = Date;
  const offset = readBoundaryOf(new RealDate()) - RealDate.now();

  class BoundaryDate extends RealDate {
    constructor(...parts) {
      if (parts.length === 0) {
        super(RealDate.now() + offset);
      } else {
        super(...parts);
      }
    }

    static now() {
      return RealDate.now() + offset;
    }

    static [Symbol.hasInstance](candidate) {
      return candidate instanceof RealDate;
    }
  }

  globalThis.Date = BoundaryDate;
  globalThis[INSTALLED] = true;
}

if (globalThis[INSTALLED] !== true) {
  installBoundaryClock();
}
