// Simple local mock data to start
export const machines = [
  {
    id: "amsco-5000-01",
    name: "AMSCO 5000",
    model: "5000",
    type: "washer", // washer | sterilizer | ultrasonic
    location: "SPD Room A",
    status: "active", // active | out_of_service
    lastDescaleAt: "2025-09-05T10:15:00Z",
  },
  {
    id: "washer-2",
    name: "Washer 2",
    model: "S-300",
    type: "washer",
    location: "SPD Room B",
    status: "active",
    lastDescaleAt: "2025-08-31T12:00:00Z",
  },
  {
    id: "steri-1",
    name: "Sterilizer 1",
    model: "V-PRO maX",
    type: "sterilizer",
    location: "Sterile Storage",
    status: "out_of_service",
    lastDescaleAt: null,
  },
];

export function findMachine(id) {
  return machines.find((m) => m.id === id);
}
