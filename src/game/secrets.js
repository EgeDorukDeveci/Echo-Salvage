const STATION_SECRETS = [
  { id: "calibration-ghost", roomIndex: 2, x: 300, y: 620, deck: "Training Deck", title: "The Calibration Ghost", reward: 18, text: "The first Echo was not a feature. It was a maintenance drone repeating the final route of a pilot who never returned." },
  { id: "yard-listener", roomIndex: 7, x: 1180, y: 100, deck: "Training Deck", title: "Someone Was Listening", reward: 20, text: "Security logs show the station learned to distinguish a pilot from an Echo before the crew knew Echoes existed." },
  { id: "conservatory-order", roomIndex: 12, x: 1180, y: 620, deck: "Training Deck", title: "Order 7-C", reward: 22, text: "Do not destroy recorder anomalies. Route them toward pressure locks and observe whether they cooperate." },
  { id: "mirror-signal", roomIndex: 16, x: 540, y: 100, deck: "Breach Deck", title: "Signal in the Mirror", reward: 24, text: "A jammer report contains two voices with the same identity signature, arguing about which one spoke first." },
  { id: "shield-protocol", roomIndex: 22, x: 1180, y: 620, deck: "Breach Deck", title: "Protocol: Shelter", reward: 26, text: "Shield drones were built to protect evacuation crews. Their final command identifies the station itself as the crew." },
  { id: "sweeper-memory", roomIndex: 27, x: 1180, y: 620, deck: "Breach Deck", title: "A Clean Corridor", reward: 28, text: "The sweepers keep cleaning the same corridor because their sensors still detect people who passed through years ago." },
  { id: "chapel-seed", roomIndex: 32, x: 420, y: 100, deck: "Reactor Deck", title: "Seed Archive", reward: 30, text: "The reactor growth is not contamination. It is a life-support experiment that learned to feed on discarded timelines." },
  { id: "fork-hunger", roomIndex: 38, x: 420, y: 100, deck: "Reactor Deck", title: "The Orchard Is Hungry", reward: 32, text: "Hunter drones stopped pursuing crew after the roots began producing perfect copies of their movement." },
  { id: "maw-prayer", roomIndex: 41, x: 1180, y: 380, deck: "Reactor Deck", title: "Prayer of the Maw", reward: 35, text: "Every time the Verdant Maw closes, the station loses eight seconds. Every time it opens, something new remembers them." },
  { id: "canal-forecast", roomIndex: 46, x: 460, y: 620, deck: "Corruption Site", title: "Forecast: Yesterday", reward: 38, text: "Navigation predicts the station will arrive at its current coordinates three days ago. The crew marked the forecast accurate." },
  { id: "foundry-last-copy", roomIndex: 52, x: 500, y: 620, deck: "Corruption Site", title: "The Last Copy", reward: 42, text: "A recorder fragment asks the salvage drone to stop making Echoes. The voice belongs to the salvage drone." },
  { id: "spine-blackbox", roomIndex: 57, x: 1180, y: 620, deck: "Corruption Site", title: "Black Box: Null Shift", reward: 50, text: "The station was abandoned successfully. This is not the abandoned station. This is the Echo that remained." }
];

const STATION_SECRET_BY_ROOM = new Map(STATION_SECRETS.map((secret) => [secret.roomIndex, secret]));
const STATION_SECRET_IDS = new Set(STATION_SECRETS.map((secret) => secret.id));

function getStationSecret(roomIndex) {
  const secret = STATION_SECRET_BY_ROOM.get(roomIndex);
  return secret ? { ...secret } : null;
}

export { STATION_SECRETS, STATION_SECRET_IDS, getStationSecret };
