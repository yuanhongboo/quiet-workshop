// Select an actual dirty pixel with the most nearby grime. A global centroid
// can point into an already clean gap between two remaining patches.
export function findCleaningHint(field) {
  if (!field || field.done) return null;
  const { size, mask, spec } = field;
  if (
    !Number.isInteger(size) ||
    size < 2 ||
    mask?.length !== size * size ||
    !Number.isFinite(spec?.width) ||
    !Number.isFinite(spec?.height) ||
    spec.width <= 0 ||
    spec.height <= 0
  )
    return null;

  const shortSide = Math.min(spec.width, spec.height);
  const radius = Math.min(0.25, Math.max(0.12, shortSide * 0.2), shortSide * 0.45);
  const rx = Math.max(1, Math.round((radius / spec.width) * (size - 1)));
  const ry = Math.max(1, Math.round((radius / spec.height) * (size - 1)));
  const stride = size + 1;
  const sums = new Float64Array(stride * stride);
  for (let y = 0; y < size; y++) {
    let row = 0;
    for (let x = 0; x < size; x++) {
      row += mask[y * size + x];
      sums[(y + 1) * stride + x + 1] = sums[y * stride + x + 1] + row;
    }
  }

  let best = -1;
  let bestMass = 0;
  for (let y = 0; y < size; y++) {
    const top = Math.max(0, y - ry) * stride;
    const bottom = Math.min(size, y + ry + 1) * stride;
    for (let x = 0; x < size; x++) {
      const index = y * size + x;
      if (!mask[index]) continue;
      const left = Math.max(0, x - rx);
      const right = Math.min(size, x + rx + 1);
      const mass =
        sums[bottom + right] - sums[top + right] - sums[bottom + left] + sums[top + left];
      if (mass > bestMass || (mass === bestMass && mask[index] > mask[best])) {
        bestMass = mass;
        best = index;
      }
    }
  }
  return best < 0
    ? null
    : { u: (best % size) / (size - 1), v: Math.floor(best / size) / (size - 1), radius };
}
