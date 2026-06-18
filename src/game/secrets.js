const STATION_SECRETS = [
  { id: "calibration-ghost", roomIndex: 2, x: 300, y: 620, deck: "Training Deck", title: "The Calibration Ghost", text: "The first Echo was not a feature. It was a maintenance drone repeating the final route of a pilot who never returned." },
  { id: "yard-listener", roomIndex: 7, x: 1180, y: 100, deck: "Training Deck", title: "Someone Was Listening", text: "Security logs show the station learned to distinguish a pilot from an Echo before the crew knew Echoes existed." },
  { id: "conservatory-order", roomIndex: 12, x: 1180, y: 620, deck: "Training Deck", title: "Order 7-C", text: "Do not destroy recorder anomalies. Route them toward pressure locks and observe whether they cooperate." },
  { id: "mirror-signal", roomIndex: 16, x: 540, y: 100, deck: "Breach Deck", title: "Signal in the Mirror", text: "A jammer report contains two voices with the same identity signature, arguing about which one spoke first." },
  { id: "shield-protocol", roomIndex: 22, x: 1180, y: 620, deck: "Breach Deck", title: "Protocol: Shelter", text: "Shield drones were built to protect evacuation crews. Their final command identifies the station itself as the crew." },
  { id: "sweeper-memory", roomIndex: 27, x: 1180, y: 620, deck: "Breach Deck", title: "A Clean Corridor", text: "The sweepers keep cleaning the same corridor because their sensors still detect people who passed through years ago." },
  { id: "chapel-seed", roomIndex: 32, x: 420, y: 100, deck: "Reactor Deck", title: "Seed Archive", text: "The reactor growth is not contamination. It is a life-support experiment that learned to feed on discarded timelines." },
  { id: "fork-hunger", roomIndex: 38, x: 420, y: 100, deck: "Reactor Deck", title: "The Orchard Is Hungry", text: "Hunter drones stopped pursuing crew after the roots began producing perfect copies of their movement." },
  { id: "maw-prayer", roomIndex: 41, x: 1180, y: 380, deck: "Reactor Deck", title: "Prayer of the Maw", text: "Every time the Verdant Maw closes, the station loses eight seconds. Every time it opens, something new remembers them." },
  { id: "canal-forecast", roomIndex: 46, x: 460, y: 620, deck: "Corruption Site", title: "Forecast: Yesterday", text: "Navigation predicts the station will arrive at its current coordinates three days ago. The crew marked the forecast accurate." },
  { id: "foundry-last-copy", roomIndex: 52, x: 500, y: 620, deck: "Corruption Site", title: "The Last Copy", text: "A recorder fragment asks the salvage drone to stop making Echoes. The voice belongs to the salvage drone." },
  { id: "spine-blackbox", roomIndex: 57, x: 1180, y: 620, deck: "Corruption Site", title: "Black Box: Null Shift", text: "The station was abandoned successfully. This is not the abandoned station. This is the Echo that remained." }
];

const SECRET_MILESTONES = [
  { count: 3, title: "Training Archive Restored", protocol: "+20 maximum energy while equipped.", unlock: { bucket: "relics", id: "memoryCoil", label: "Memory Coil relic" } },
  { count: 6, title: "Breach Archive Restored", protocol: "Echo deployment costs 4 less energy while equipped.", unlock: { bucket: "relics", id: "echoLure", label: "Echo Lure relic" } },
  { count: 9, title: "Reactor Archive Restored", protocol: "Abilities recharge 18% faster while equipped.", unlock: { bucket: "relics", id: "phaseLens", label: "Phase Lens relic" } },
  { count: 12, title: "Null Archive Complete", protocol: "A hybrid energy, Echo, and cooldown protocol.", unlock: { bucket: "relics", id: "nullCrown", label: "Null Crown relic" } }
];

const STATION_SECRET_BY_ROOM = new Map(STATION_SECRETS.map((secret) => [secret.roomIndex, secret]));
const STATION_SECRET_IDS = new Set(STATION_SECRETS.map((secret) => secret.id));

function getStationSecret(roomIndex) {
  const secret = STATION_SECRET_BY_ROOM.get(roomIndex);
  return secret ? { ...secret } : null;
}

function getSecretMilestone(count) {
  return SECRET_MILESTONES.find((milestone) => milestone.count === count) || null;
}

function getNextSecretMilestone(count) {
  return SECRET_MILESTONES.find((milestone) => milestone.count > count) || null;
}

export { STATION_SECRETS, STATION_SECRET_IDS, SECRET_MILESTONES, getStationSecret, getSecretMilestone, getNextSecretMilestone };
