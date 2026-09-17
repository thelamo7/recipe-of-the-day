// Mifflin-St Jeor BMR -> TDEE -> calorie/protein targets. Rough estimates
// only — see the disclaimer rendered alongside these numbers on the page.

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
};

export const ACTIVITY_LABELS = {
  sedentary: "Sedentary (little or no exercise)",
  light: "Lightly active (1-3 days/week)",
  moderate: "Moderately active (3-5 days/week)",
  very: "Very active (6-7 days/week)",
};

// Midpoints of the requested ranges: ~15-20% deficit, ~10-15% surplus.
const GOAL_MULTIPLIERS = {
  lose: 0.825,
  maintain: 1,
  gain: 1.125,
};

export const GOAL_LABELS = {
  lose: "Lose weight",
  maintain: "Maintain",
  gain: "Gain weight / muscle",
};

export function lbToKg(lb) {
  return lb * 0.453592;
}

export function ftInToCm(feet, inches) {
  return (feet * 12 + inches) * 2.54;
}

export function calculateBMR({ sex, weightKg, heightCm, age }) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

export function calculateTDEE(bmr, activityLevel) {
  return bmr * (ACTIVITY_MULTIPLIERS[activityLevel] || ACTIVITY_MULTIPLIERS.sedentary);
}

export function calculateCalorieTarget(tdee, goal) {
  return Math.round(tdee * (GOAL_MULTIPLIERS[goal] ?? 1));
}

// 0.7-1g protein per lb bodyweight; use the higher end for muscle gain.
export function calculateProteinTarget(weightLb, goal) {
  const gramsPerLb = goal === "gain" ? 1.0 : 0.8;
  return Math.round(weightLb * gramsPerLb);
}

// Given a profile {sex, age, heightFt, heightIn, weightLb, activity, goal},
// returns { bmr, tdee, calorieTarget, proteinTarget } all rounded.
export function computeTargets(profile) {
  const heightCm = ftInToCm(Number(profile.heightFt) || 0, Number(profile.heightIn) || 0);
  const weightKg = lbToKg(Number(profile.weightLb) || 0);
  const bmr = calculateBMR({
    sex: profile.sex,
    weightKg,
    heightCm,
    age: Number(profile.age) || 0,
  });
  const tdee = calculateTDEE(bmr, profile.activity);
  const calorieTarget = calculateCalorieTarget(tdee, profile.goal);
  const proteinTarget = calculateProteinTarget(Number(profile.weightLb) || 0, profile.goal);
  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    calorieTarget,
    proteinTarget,
  };
}
