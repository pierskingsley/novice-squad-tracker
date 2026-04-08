export const ROLES = {
  ATHLETE: 'ATHLETE',
  COACH: 'COACH',
}

export const EXERCISE_CATEGORIES = {
  COMPOUND: 'compound',
  ACCESSORY: 'accessory',
}

// Used as placeholders / offline fallback — authoritative list lives in DB
export const DEFAULT_EXERCISES = [
  { name: 'Squat', category: 'compound' },
  { name: 'Deadlift', category: 'compound' },
  { name: 'Bench Press', category: 'compound' },
  { name: 'Overhead Press', category: 'compound' },
  { name: 'Barbell Row', category: 'compound' },
  { name: 'Romanian Deadlift', category: 'compound' },
  { name: 'Leg Press', category: 'compound' },
  { name: 'Pull-up', category: 'compound' },
  { name: 'Dip', category: 'compound' },
  { name: 'Hip Thrust', category: 'compound' },
  { name: 'Lat Pulldown', category: 'accessory' },
  { name: 'Cable Row', category: 'accessory' },
  { name: 'Dumbbell Curl', category: 'accessory' },
  { name: 'Tricep Pushdown', category: 'accessory' },
  { name: 'Face Pull', category: 'accessory' },
  { name: 'Lunges', category: 'accessory' },
  { name: 'Leg Curl', category: 'accessory' },
  { name: 'Leg Extension', category: 'accessory' },
  { name: 'Plank', category: 'accessory' },
]

export const TODAY = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
