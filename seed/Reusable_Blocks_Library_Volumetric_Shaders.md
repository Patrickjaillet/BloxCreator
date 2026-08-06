# REUSABLE BLOCKS LIBRARY

*GLSL Volumetric Shaders*

Classification by genre and category

- Each block can be copied as-is into a raymarched shader and freely combined with the others.
- Each block is documented along three axes: **Role** (what the code does), **Adaptation** (which parameters to modify and their effect), and **Summary** (its specificity in one sentence).
- Organized into six genres:
  1. Camera & Projection
  2. Rotation & Transformations
  3. Fractal Folding & Repetitive Geometry
  4. Polar/Log Coordinates & Cylindrical Repetition
  5. Distance Evaluation & Ray Marching
  6. Volumetric Accumulation & Colorimetry

## Table of Contents

1. [Camera & Ray Projection](#1-camera--ray-projection)
   - 1.1 Centered Projection with Oscillating Zoom
   - 1.2 Distance-Based Dynamic Projection
   - 1.3 Positional Accumulation with Vertical Offset
   - 1.4 Self-Oriented View Direction (Rodrigues)
   - 1.5 Off-Center Origin with Simple Advancement
2. [Rotation & Spatial Transformations](#2-rotation--spatial-transformations)
   - 2.1 3D Rotation Around an Arbitrary Axis (Rodrigues)
   - 2.2 Successive Multi-Axis Matrix Rotations
   - 2.3 Simple Plane Rotation (mat2)
   - 2.4 Rotation Modulated by Local Iteration State
   - 2.5 Slow Global Rotation Before Folding
3. [Fractal Folding & Repetitive Geometry](#3-fractal-folding--repetitive-geometry)
   - 3.1 Folding via Absolute Value and Spherical Inversion
   - 3.2 Clamp-Bounded Folding (Kaleidoscopic IFS)
   - 3.3 Distance Field via Box Folding (Box-Fold)
   - 3.4 Conditional Folding by Iteration Depth
   - 3.5 Modular Space Repetition (mod)
   - 3.6 Nested Rotational Folding with Progressive Normalization
4. [Polar, Logarithmic Coordinates & Cylindrical Repetition](#4-polar-logarithmic-coordinates--cylindrical-repetition)
   - 4.1 Log-Polar Reprojection (log / atan / fract)
   - 4.2 Cylindrical Coordinates with Time-Based Scrolling
5. [Distance Evaluation & Ray Marching](#5-distance-evaluation--ray-marching)
   - 5.1 Field Step via Modulo
   - 5.2 Scale-Normalized Distance Step
   - 5.3 Cascading Min/Max Distance Merging
   - 5.4 Intersection Distance Step (max)
6. [Volumetric Accumulation & Colorimetry](#6-volumetric-accumulation--colorimetry)
   - 6.1 Branchless HSV → RGB Converter
   - 6.2 Multichannel Exponential (Spectral) Accumulation
   - 6.3 Simple Inverse-Exponential Accumulation
   - 6.4 Per-Channel Weighted Accumulation (vec4)
   - 6.5 Dedicated HSV Function + Colored Accumulation

---

# 1. Camera & Ray Projection

*Initialization blocks: transform screen coordinates (fragCoord / FC) into a 3D point or direction serving as the starting point for raymarching.*

### 1.1 — Centered Projection with Oscillating Zoom

```glsl
vec2 normalizedScreenCoordinates = (fragCoord * 2.0 - viewportResolution) / viewportResolution.y;
float cameraZoomFactor = 9.0 + cos(globalTime * 0.5) * 3.0;
vec3 rayPosition = vec3(normalizedScreenCoordinates * cameraZoomFactor, accumulatedDistance + 0.2);
```

**Role:** Transforms 2D screen pixel coordinates into centered coordinates (-1 to 1) corrected for aspect ratio, then projects each pixel as a 3D point along the view direction.

**Adaptation:** Changing the multiplier 9.0 modifies the base focal distance. Adjusting 0.2 shifts the ray-marching origin point along the Z axis.

**Summary:** Basic camera setup with a zoom that "breathes" over time via the cosine.

### 1.2 — Distance-Based Dynamic Projection

```glsl
vec2 normalizedScreenCoordinates = (fragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;
float accumulatedDistance = 0.0;
vec3 rayPosition = vec3(normalizedScreenCoordinates * accumulatedDistance, accumulatedDistance * 2.0);
```

**Role:** Transforms 2D screen pixel coordinates into a centered, aspect-ratio-corrected system, and dynamically projects the point into 3D space as the ray progresses.

**Adaptation:** Modifying the multiplicative factor or the initial offset lets you adjust the field of view (FOV) and the camera's starting depth.

**Summary:** The 3D point widens with the distance traveled: a natural view cone with no trigonometric computation.

### 1.3 — Positional Accumulation with Vertical Offset

```glsl
vec3 q = vec3(0.0), p = vec3(0.0);
q.yz += 0.6;
// ... inside the raymarching loop:
p = q += (FC.rgb / r.y - 0.5) * e;
```

**Role:** Initializes the ray's starting point with a fixed vertical offset, then advances the accumulated position q at each iteration, weighted by the step e computed in the previous stage — a continuous accumulation rather than a full recalculation per pixel.

**Adaptation:** Modifying the initial offset (0.6) vertically shifts the scene; changing the subtraction factor (0.5) recenters the field of view.

**Summary:** Progressive position-accumulation technique, as an alternative to a full per-iteration recalculation.

### 1.4 — Self-Oriented View Direction (Rodrigues)

```glsl
vec3 q = vec3(0.0), p = vec3(0.0);
q.z -= 1.0;
// ... inside the loop:
vec3 rotAxis = normalize(q + 0.03);
vec3 vDir = (0.5 - FC.rgb / r.y);
vec3 rotatedDir = vDir * c + cross(rotAxis, vDir) * s + rotAxis * dot(rotAxis, vDir) * (1.0 - c);
p = q += e * rotatedDir;
```

**Role:** Computes a view direction dynamically rotated around an axis derived from the ray's current position (Rodrigues' formula), producing an organically orbiting camera rather than a rotation around a fixed axis.

**Adaptation:** Replacing normalize(q + 0.03) with a constant axis stabilizes the rotation. The 0.03 offset avoids division by zero near the origin.

**Summary:** Self-oriented ray direction: the rotation axis depends on the position the ray itself has reached.

### 1.5 — Off-Center Origin with Simple Advancement

```glsl
vec3 q = vec3(-0.1, 0.65, -0.6);
// ... inside the loop:
vec2 screenCoord = (FC.xy - 0.5 * r) / r.y;
p = q += vec3(screenCoord, 1.0) * e;
```

**Role:** Sets an off-center origin point in the scene, then advances along the ray with a constant Z component (1.0): a simple, low-cost formulation.

**Adaptation:** Modifying the components of q moves the initial viewpoint inside the fractal structure.

**Summary:** Minimalist camera setup with an off-center origin, useful for exploring a specific area of a fractal.

---

# 2. Rotation & Spatial Transformations

*Blocks that rotate 3D (or 2D) space around one or more axes, at constant or modulated speed, to animate the scene or orient the camera.*

### 2.1 — 3D Rotation Around an Arbitrary Axis (Rodrigues)

```glsl
vec3 rotationAxis = normalize(vec3(-4.0, sin(globalTime) + 7.0, 0.0));
float rotationAngle = globalTime * 0.5;
float cosineAngle = cos(rotationAngle);
float sineAngle = sin(rotationAngle);
vec3 rotatedPosition = rayPosition * cosineAngle - cross(rotationAxis, rayPosition) * sineAngle
    + rotationAxis * dot(rotationAxis, rayPosition) * (1.0 - cosineAngle);
```

**Role:** Applies Rodrigues' rotation formula to orient or rotate the entire 3D space without resorting to explicit 4x4 matrices.

**Adaptation:** Replacing the rotationAxis vector with a fixed axis (e.g. vec3(0.0, 1.0, 0.0)) or a dynamic one alters the animation's trajectory.

**Summary:** Generic rotation around any axis, ideal when the axis itself must evolve over time.

### 2.2 — Successive Multi-Axis Matrix Rotations

```glsl
float angle = iTime / 8.0;
mat2 rotationMatrix = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
rayPosition.yz *= rotationMatrix * rotationMatrix;
rayPosition.xy *= rotationMatrix;
```

**Role:** Applies successive matrix rotations to the planes of the position vector to smoothly animate the entire spatial scene over time.

**Adaptation:** Changing the time divisor (8.0) modifies the overall rotation speed.

**Summary:** Two combined mat2 rotations (one of them doubled) for a richer tumbling motion than a simple rotation.

### 2.3 — Simple Plane Rotation (mat2)

```glsl
float angle = t;
mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
p.xz *= rot;
```

**Role:** Rotates the position's XZ plane around the Y axis at a constant speed, directly proportional to global time.

**Adaptation:** Multiplying t by a factor (e.g. t * 0.3) slows the rotation; applying the same matrix to .xy or .yz changes the rotation axis.

**Summary:** The simplest mat2 rotation in the corpus — a single plane, a single speed, reusable everywhere.

### 2.4 — Rotation Modulated by Local Iteration State

```glsl
// inside the fractal loop, with u and v evolving at each pass:
float angle = inner + sin(1.0 / u + t) / v;
mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
vec2 p_xz_transformed = abs(p.xz * rot) - 0.53;
```

**Role:** Computes a rotation angle that depends not only on time but also on variables internal to the fractal loop (u, v), creating a different twist at each iteration and breaking the repetitive symmetry.

**Adaptation:** Reducing the weight of sin(1.0/u + t) (e.g. dividing by a larger constant) dampens the twist; setting the angle to `inner` alone gives a purely geometric twist with no temporal influence.

**Summary:** "Organic" rotation where each fractal iteration turns at its own rate, depending on the current state.

### 2.5 — Slow Global Rotation Before Folding

```glsl
float angle = t * 0.2;
mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
p.xz *= rot;
```

**Role:** Applies a slow, global rotation to the XZ plane before entering the fractal folding loop, making the entire structure rotate as a single rigid block.

**Adaptation:** Increasing the 0.2 factor speeds up the overall rotation; moving it after the folding loop would rotate the result rather than the input.

**Summary:** A discreet overall rotation, designed to slowly dress a fractal structure without deforming it.

---

# 3. Fractal Folding & Repetitive Geometry

*The visual heart of volumetric shaders: inner loops that fold, bound, and scale space to generate complex fractal structures (IFS).*

### 3.1 — Folding via Absolute Value and Spherical Inversion

```glsl
accumulatedScale = 1.0;
for (int fractalIteration = 0; fractalIteration < 9; fractalIteration++)
{
    float squaredDistanceToOrigin = dot(rotatedPosition, rotatedPosition);
    currentScaleFactor = max(0.95, 9.0 / squaredDistanceToOrigin);
    accumulatedScale *= currentScaleFactor;
    vec3 scaledPosition = abs(rotatedPosition) * currentScaleFactor;
    vec3 foldedPosition = abs(scaledPosition - vec3(1.0, 1.2, 3.0));
    rotatedPosition = vec3(1.5, 4.0, 3.0) - foldedPosition;
}
```

**Role:** Generates a complex three-dimensional fractal geometry via successive geometric folds (abs) and an inversion relative to a bounding sphere.

**Adaptation:** Modifying the iteration count (9) controls the fineness of detail. Adjusting the offsets vec3(1.0, 1.2, 3.0) and vec3(1.5, 4.0, 3.0) redefines the structure's topology.

**Summary:** The corpus' "classic" fractal folding block: abs + spherical inversion + offsets.

### 3.2 — Clamp-Bounded Folding (Kaleidoscopic IFS)

```glsl
vec3 foldingLimits = vec3(0.6, 0.2, 2.0);
float currentScale = 5.0;
for (int j = 0; j < 20; j++)
{
    p = 2.0 * clamp(p, -foldingLimits, foldingLimits) - p;
    float dotProduct = dot(p, p);
    float scaleFactor = dotProduct * (0.6 + accumulatedDistance * 0.2);
    p /= dotProduct;
    currentScale /= scaleFactor;
}
```

**Role:** Generates a complex fractal structure through bounded folding (clamp), spherical inversion, and iterative scaling operations.

**Adaptation:** Adjusting the fold limits (foldingLimits) or the iteration count completely redefines the fractal topology.

**Summary:** A kaleidoscopic variant of folding: clamp() replaces abs(), producing "box-like" patterns rather than "cross-like" ones.

### 3.3 — Distance Field via Box Folding (Box-Fold)

```glsl
for(float j = 0.7; j < 9.0; j++)
{
    vec2 p_xz_abs = abs(p.xz) - 0.4;
    float p_y_val = 2.0 - p.y;
    e = min(e, max(max(p_xz_abs.x, p_xz_abs.y), p_y_val) / v);
}
```

**Role:** Evaluates a "repeated box" type distance field: at each iteration, the function combines max() (intersection, box shape) and min() (union with previous iterations) to stack rectangular volumes.

**Adaptation:** Changing 0.4 modifies the box size; changing 2.0 (p_y_val) moves the structure's ceiling; increasing 9.0 adds levels of repetition.

**Summary:** A combinatorial (min/max) distance function that builds stacks of boxes rather than a centered fold.

### 3.4 — Conditional Folding by Iteration Depth

```glsl
for(int j = 1; j <= 12; j++)
{
    if(j > 3)
    {
        e = min(e, length(p.xz + length(p) / u * 0.557) / v);
        p.xz = abs(p.xz) - 0.7;
    }
    else
    {
        p = abs(p) - 0.9;
    }
    u = dot(p, p);
    v /= u;
    p /= u;
    p.y = 1.7 - p.y;
}
```

**Role:** Applies a different fold depending on iteration depth: a simple fold (abs) for the first 3 passes, then a fold combined with a radial distance evaluation for subsequent ones — a way of blending two levels of detail within a single loop.

**Adaptation:** Moving the threshold (j > 3) changes at which level of detail the structure switches from a "raw" fold to a "radial" one. The 0.557 factor adjusts the thickness of the radial pattern.

**Summary:** A two-regime folding loop: coarse then fine, controlled by a simple conditional test.

### 3.5 — Modular Space Repetition (mod)

```glsl
vec3 coord = vec3(log(R) + e * 0.1 - t, y, e) / 0.63 + (j - 1.0);
p = mod(coord, v) - j;
for(float loop_j = 0.0; loop_j < 9.0; loop_j++)
{
    p.y -= loop_j;
    float dot_p = dot(p, p);
    float clamped_val = clamp(dot_p / loop_j, -y / loop_j, 0.48);
    v /= clamped_val;
    e = clamped_val;
    p = abs(p) / e - 0.5;
}
```

**Role:** Uses mod() to periodically repeat space along the transformed coordinates, creating an infinite, regular pattern before applying a classic iterative fold/scale to it.

**Adaptation:** The 0.63 divisor controls the repetition frequency; increasing v in mod(coord, v) spaces the pattern's copies further apart.

**Summary:** Combines periodic repetition (mod) with iterative folding for tunnel- or lattice-like structures.

### 3.6 — Nested Rotational Folding with Progressive Normalization

```glsl
for(float inner = 7.0; inner < 21.0; inner++)
{
    float angle = inner + sin(1.0 / u + t) / v;
    mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    vec2 p_xz_transformed = abs(p.xz * rot) - 0.53;
    float len_xz = length(p_xz_transformed) - 0.02 / u;
    float p_y_val = 1.8 - p.y;
    e = min(e, max(len_xz, p_y_val) / v);
    u = dot(p, p);
    v /= u;
    p /= (u + 0.01);
}
```

**Role:** Combines, in a single loop, a modulated rotation (see block 2.4), an abs() fold, a distance evaluation (length + max/min), and a normalized inversion (division by dot(p,p) plus a small constant to avoid numerical blow-up) — a particularly dense "all-in-one" fractal fold.

**Adaptation:** The +0.01 constant in p /= (u + 0.01) avoids divisions by a near-zero value: reducing it increases the risk of artifacts but sharpens fine detail near the center.

**Summary:** The most complete fold in the corpus: rotation, folding, and normalized inversion fused into a single pass.

---

# 4. Polar, Logarithmic Coordinates & Cylindrical Repetition

*Specialized blocks that reproject Cartesian space into log-polar or cylindrical coordinates, a classic technique for creating tunnels, spirals, and "infinite" structures.*

### 4.1 — Log-Polar Reprojection (log / atan / fract)

```glsl
float dot_p = dot(p, p);
p /= dot_p; // spherical inversion
v = length(p);
p = vec3(log(v) + t / 4.0, p.y / v - 1.5, atan(p.z, p.x));
p = fract(p / 3.14159265 * 3.5) - 0.5;
```

**Role:** Converts the Cartesian position into a "log-polar" system: the logarithm of the radial distance (log(v)) gives an infinite zoom with no loss of precision, atan(p.z, p.x) gives the azimuthal angle, and fract() regularly repeats the pattern along these two new dimensions.

**Adaptation:** The t / 4.0 factor scrolls the tunnel over time (a sense of flight); the 3.5 factor in fract(p / π * 3.5) controls the number of repetitions around the circle.

**Summary:** The log-polar reprojection block: the key technique behind endless tunnel/spiral effects.

### 4.2 — Cylindrical Coordinates with Time-Based Scrolling

```glsl
R = length(p.xz);
y = p.y / R + R / j;
e = atan(p.x, p.z) * v + t;
vec3 coord = vec3(log(R) + e * 0.1 - t, y, e) / 0.63 + (j - 1.0);
```

**Role:** Computes a cylindrical coordinate system (radius R, angle e via atan, height y), then combines log(R) and the angle to obtain a tunnel-like coordinate that scrolls with time (-t).

**Adaptation:** The `- t` term virtually advances the camera through the tunnel; increasing the factor multiplying `v` in atan(...) * v speeds up the pattern's angular twist.

**Summary:** A cylindrical variant of log-polar, designed for continuous "journey through a tunnel" scrolling.

---

# 5. Distance Evaluation & Ray Marching

*Blocks that translate the local geometry computed by the folding loops into an advancement step for the ray (raymarching), determining the progression speed and rendering precision.*

### 5.1 — Field Step via Modulo

```glsl
float yMagnitude = length(rotatedPosition.yy);
float fieldStep = mod(yMagnitude, rotatedPosition.y) / accumulatedScale * 0.5;
accumulatedDistance += fieldStep;
```

**Role:** Computes the ray's advancement step in space based on the local geometric evaluation and accumulates the distance to produce a gaseous, volumetric appearance.

**Adaptation:** Modifying the 0.5 factor adjusts the medium's density and the depth of light penetration.

**Summary:** A modulo-based raymarching step, producing a diffuse, "gaseous" render.

### 5.2 — Scale-Normalized Distance Step

```glsl
float geometricStep = 0.0005 + rayPosition.z / currentScale;
accumulatedDistance -= geometricStep;
```

**Role:** Computes the ray's advancement step based on the evaluated local geometric structure, ensuring adaptive sampling of the volume.

**Adaptation:** Modifying the base constant term (0.0005) refines raymarching precision at the cost of performance.

**Summary:** A guaranteed minimum step (0.0005) plus an adaptive term: avoids infinite loops while remaining precise.

### 5.3 — Cascading Min/Max Distance Merging

```glsl
w.y -= 2.5;
float dot_w = dot(w, w);
u = min(dot_w, 0.5) + 0.02;
S /= u;
w = abs(w) / u - 0.4;
e = min(e, (w.x + w.z) / S);
```

**Role:** Combines a second structure (w, derived from p) with the main distance field (e) via min(), allowing a second visual element (e.g. a luminous core) to be added, merging with the fractal structure of the bounding box.

**Adaptation:** The 2.5 constant positions this second element vertically; 0.02 avoids a division by a null value when dot_w reaches zero.

**Summary:** The final step is built by merging (min) two distinct distance fields — a scene-composition technique.

### 5.4 — Intersection Distance Step (max)

```glsl
e = max(p.y - 0.1, length(p.xz) - 1.0) / v * 0.3;
o += 0.01 / exp(e * 10000.0);
```

**Role:** Uses max() to intersect two primitive shapes (a plane p.y - 0.1 and a cylinder length(p.xz) - 1.0), producing a bounded composite shape, then normalizes the result by the accumulated scale v.

**Adaptation:** Changing -1.0 modifies the cylinder's radius; changing -0.1 shifts the cutting plane vertically.

**Summary:** A distance built by geometric intersection (max) rather than by folding — for sharp, bounded shapes.

---

# 6. Volumetric Accumulation & Colorimetry

*Output blocks: convert the accumulated distance or scale into a final color, whether via a classic HSV conversion or via a multichannel exponential accumulation in the style of a "luminous volume".*

### 6.1 — Branchless HSV → RGB Converter

```glsl
float hue = 0.59;
float saturation = 0.4 - accumulatedDistance;
float value = accumulatedScale / 4000.0;
vec3 hueVector = mod(hue * 6.0 + vec3(0.0, 4.0, 2.0), 6.0);
vec3 pureColor = clamp(abs(hueVector - 3.0) - 1.0, 0.0, 1.0);
vec3 finalRgbColor = value * mix(vec3(1.0), pureColor, saturation);
```

**Role:** Efficiently converts scalars derived from the geometry into a balanced RGB color, with no conditional branching.

**Adaptation:** Modifying the base hue (0.59 = cyan/blue) or the brightness divisor 4000.0 regulates contrast and exposure.

**Summary:** An "inline" HSV→RGB conversion, with hue and value driven directly by the accumulated geometry.

### 6.2 — Multichannel Exponential (Spectral) Accumulation

```glsl
vec4 colorAccumulation = vec4(0.0);
vec4 spectralWeights = vec4(3.0, 4.0, 5.0, 0.0);
colorAccumulation += exp(-geometricStep * geometricStep * 13000000000.0 / currentScale
    + sin(spectralWeights * exp(rayPosition.z + 1.0) - log(currentScale))) / 100.0;
```

**Role:** Synthesizes the pixel's final color by accumulating exponential light intensity coupled with multichannel trigonometric modulations.

**Adaptation:** Adjusting the spectral vectors lets you change the dominant color palette of the volumetric render.

**Summary:** A "glow" accumulation where each RGB channel receives its own sinusoidal phase — the source of the typical iridescence.

### 6.3 — Simple Inverse-Exponential Accumulation

```glsl
o += 0.01 / exp(e * S);
```

**Role:** Adds, at each iteration, a light contribution inversely proportional to the distance e, weighted by the scale S — the closer the ray is to a surface, the stronger the contribution (a glow/luminous fog effect).

**Adaptation:** Increasing the 0.01 factor globally intensifies the render; multiplying e by a constant before the exponential tightens or widens the light halo.

**Summary:** The shortest accumulation block in the corpus — a single term, yet responsible for the entire "volumetric" look.

### 6.4 — Per-Channel Weighted Accumulation (vec4)

```glsl
o += 0.007 / exp(3000.0 / (v * vec4(9.0, 5.0, 4.0, 4.0) + e * 4000000.0));
```

**Role:** Applies different weights per color channel (9.0, 5.0, 4.0, 4.0) directly in the denominator of the inverse exponential, tinting the result without going through an explicit HSV conversion.

**Adaptation:** Modifying the four vec4 weights directly changes the color dominant (e.g. increasing the first weight strengthens red).

**Summary:** "Direct weighting" coloring within the accumulation — a lightweight alternative to true HSV.

### 6.5 — Dedicated HSV Function + Colored Accumulation

```glsl
vec3 hsv(float h, float s, float v)
{
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(vec3(h) + K.xyz) * 6.0 - K.www);
    return v * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), s);
}
// ... inside the raymarching loop:
o.rgb += 0.01 - hsv(-0.4 / u, 0.3, 0.02) / exp(e * 60.0);
```

**Role:** Isolates the HSV→RGB conversion into a reusable function (standard hue/saturation/value signature), then calls it with a hue dynamically derived from the local geometric state (u), for a colored accumulation where the hue changes according to position within the fractal.

**Adaptation:** The -0.4 factor in -0.4 / u controls the range of hue traversed; the fixed saturation of 0.3 can be increased for more vivid colors.

**Summary:** The only named, reusable HSV function in the corpus — the hue follows the fractal geometry in real time.
