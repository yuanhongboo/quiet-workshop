export function nearestAngle(current, target) {
  if (!Number.isFinite(current) || !Number.isFinite(target)) return 0;
  return current + Math.atan2(Math.sin(target-current),Math.cos(target-current));
}
export const INSPECTION_ANGLES = Object.freeze([0.28, Math.PI/2, Math.PI, -Math.PI/2]);
export function nextInspectionAngle(current) {
  const index=INSPECTION_ANGLES.findIndex(angle=>Math.abs(nearestAngle(current,angle)-current)<0.1);
  return nearestAngle(current,INSPECTION_ANGLES[(index+1)%INSPECTION_ANGLES.length]);
}
