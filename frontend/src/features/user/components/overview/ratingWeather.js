// Buyer rating as weather, like a CI build-health icon: clear sun when buyers
// are happy, clouds rolling in as the average drops. Kept to one small emoji.
const BANDS = [
  { min: 4.5, emoji: "☀️", label: "Clear skies", hint: "Buyers love dealing with you. Keep it up." },
  { min: 4.0, emoji: "🌤️", label: "Mostly sunny", hint: "Buyers are happy. Quick replies keep it that way." },
  { min: 3.0, emoji: "⛅", label: "Partly cloudy", hint: "A few deals didn't go smoothly. On-time pickups help." },
  { min: 2.0, emoji: "🌥️", label: "Cloudy", hint: "Your rating is slipping. Describe items honestly and reply fast." },
  { min: 0, emoji: "🌧️", label: "Rainy", hint: "Buyers had trouble lately. Clear photos and on-time pickups win them back." },
];

export function ratingWeather(avg) {
  const n = Number(avg);
  if (!Number.isFinite(n) || n <= 0) return null;
  return BANDS.find((b) => n >= b.min) || BANDS[BANDS.length - 1];
}
