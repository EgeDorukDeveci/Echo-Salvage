const wall = (x, y, w, h) => ({ x, y, w, h });

function makeTrialLevel() {
  return {
    name: "Khepri Pilot Trial",
    isTrial: true,
    tutorial: { kind: "pilot-trial" },
    player: { x: 130, y: 360 },
    exit: { x: 1155, y: 306, w: 62, h: 108 },
    walls: [
      wall(40, 40, 1200, 22),
      wall(40, 658, 1200, 22),
      wall(40, 40, 22, 640),
      wall(1218, 40, 22, 640),
      wall(300, 62, 24, 238),
      wall(300, 420, 24, 238),
      wall(560, 62, 24, 238),
      wall(560, 420, 24, 238),
      wall(830, 62, 24, 238),
      wall(830, 420, 24, 238),
      wall(1080, 62, 24, 238),
      wall(1080, 420, 24, 238),
      wall(382, 208, 92, 30),
      wall(382, 482, 92, 30),
      wall(622, 210, 150, 28),
      wall(622, 482, 150, 28),
      wall(895, 205, 120, 28),
      wall(895, 487, 120, 28)
    ],
    crates: [{ x: 640, y: 338, w: 46, h: 46 }],
    coinCrates: [],
    plates: [
      { id: "CARGO", x: 770, y: 360, r: 38 },
      { id: "ECHO", x: 965, y: 360, r: 45 }
    ],
    switches: [
      { id: "BOOT", x: 245, y: 360, r: 25, on: false },
      { id: "RANGE_CLEAR", x: 515, y: 360, r: 25, on: false }
    ],
    doors: [
      { x: 300, y: 300, w: 24, h: 120, requires: ["BOOT"], open: false },
      { x: 560, y: 300, w: 24, h: 120, requires: ["RANGE_CLEAR"], open: false },
      { x: 830, y: 300, w: 24, h: 120, requires: ["CARGO"], open: false },
      { x: 1080, y: 300, w: 24, h: 120, requires: ["CARGO", "ECHO"], open: false }
    ],
    turrets: [{ x: 445, y: 360, hp: 1, cooldown: 1250 }],
    drones: [],
    missileSentries: [],
    gravityNodes: [],
    echoJammers: [],
    laserSweepers: [],
    blinkHunters: [],
    shieldDrones: [],
    repairBots: [],
    movingWalls: [],
    echoCorruptionZones: [],
    boss: null,
    objective: { type: "secure" },
    lasers: [],
    scrap: [
      { x: 365, y: 360, taken: false },
      { x: 705, y: 285, taken: false },
      { x: 930, y: 280, taken: false }
    ],
    core: null
  };
}

export { makeTrialLevel };
