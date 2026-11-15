// Helpers for the campus line art (components/campus/CampusArt.jsx).

// Drawn height of each building at scale 1 (for placing labels above it).
export const ART_HEIGHT = { hostel: 180, academic: 190, canteen: 104 };

/* Shared route timeline: hold at each of 4 stops, travel between them. */
export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function makeTimeline({ hold, move, endHold }) {
  const cycle = hold * 3 + move * 3 + endHold;
  const phaseAt = (t) => {
    let acc = 0;
    for (let i = 0; i < 4; i += 1) {
      const h = i === 3 ? endHold : hold;
      if (t < acc + h) return { stop: i, seg: i - 1, f: 1 };
      acc += h;
      if (i < 3) {
        if (t < acc + move) return { stop: null, seg: i, f: easeInOutCubic((t - acc) / move) };
        acc += move;
      }
    }
    return { stop: 3, seg: 2, f: 1 };
  };
  return { cycle, phaseAt };
}
