// All the facilities (locations) at VIT Vellore campus
// Each category has a name, emoji icon, and a list of specific locations
// "capacity" = how many people can comfortably fit (used for crowd color coding)

export const facilities = {
  messes: {
    name: "Messes",
    icon: "🍽️",
    description: "Campus Dining Halls",
    color: "#FF6B35",
    locations: [
      { id: "mess-1", name: "Mess 1", capacity: 200, quietMsg: "Mess 1 crowd just dropped — good time to eat!" },
      { id: "mess-2", name: "Mess 2", capacity: 200, quietMsg: "Mess 2 crowd just dropped — quick meal window!" }
    ]
  },
  libraries: {
    name: "Libraries",
    icon: "📚",
    description: "Study Spaces & Resources",
    color: "#4ECDC4",
    locations: [
      { id: "central-library", name: "Central Library", capacity: 120, quietMsg: "Central Library is quiet right now — good time for a study session." },
      { id: "reading-hall", name: "Reading Hall", capacity: 60, quietMsg: "Reading Hall has plenty of open study space right now." }
    ]
  },
  pools: {
    name: "Swimming Pools",
    icon: "🏊",
    description: "Aquatic Facilities",
    color: "#45B7D1",
    locations: [
      { id: "main-pool", name: "Main Pool", capacity: 40, quietMsg: "Main Pool lanes are open — good time for a swim." }
    ]
  },
  gyms: {
    name: "Gyms",
    icon: "💪",
    description: "Fitness Centers",
    color: "#F59E0B",
    locations: [
      { id: "gym-1", name: "Gym 1", capacity: 60, quietMsg: "Gym 1 just opened up — quick workout window!" },
      { id: "gym-2", name: "Gym 2", capacity: 60, quietMsg: "Gym 2 has light traffic — workout equipment free." }
    ]
  },
  courts: {
    name: "Sports Courts",
    icon: "🏸",
    description: "Indoor & Outdoor Courts",
    color: "#8B5CF6",
    locations: [
      { id: "court-1", name: "Court 1", capacity: 20, quietMsg: "Court 1 is open — ready for a match." },
      { id: "court-2", name: "Court 2", capacity: 20, quietMsg: "Court 2 is open — grab your racket!" }
    ]
  }
};

// Helper function: given a location ID like "gym-1", find its full info
export function findLocation(locationId) {
  for (const [categoryId, category] of Object.entries(facilities)) {
    const location = category.locations.find(loc => loc.id === locationId);
    if (location) {
      return {
        ...location,
        categoryId,
        categoryName: category.name,
        categoryIcon: category.icon,
        categoryColor: category.color
      };
    }
  }
  return null;
}

// Helper: get all locations as a flat list
export function getAllLocations() {
  const all = [];
  for (const [categoryId, category] of Object.entries(facilities)) {
    for (const loc of category.locations) {
      all.push({ ...loc, categoryId, categoryName: category.name, categoryIcon: category.icon });
    }
  }
  return all;
}

// Helper: determine crowd status based on occupancy percentage
export function getCrowdStatus(count, capacity) {
  const ratio = capacity > 0 ? count / capacity : 0;
  if (ratio < 0.40) return { level: 'low', label: 'Low Crowd', className: 'crowd-low', color: '#22c55e' };
  if (ratio <= 0.75) return { level: 'moderate', label: 'Moderate', className: 'crowd-moderate', color: '#f59e0b' };
  return { level: 'high', label: 'Crowded', className: 'crowd-high', color: '#ef4444' };
}
