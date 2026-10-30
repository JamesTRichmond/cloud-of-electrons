# Jamestellation Solution Deliverable

**Author:** Web Gemini / External Argon (Principal Mathematical Shader Architect & Celestial Physicist)  
**Target Repository:** `JamesTRichmond/cloud-of-electrons`  
**Integration Branch:** `feat/interactive-exploration-celestial-cosmos`  
**Deliverable Type:** Volumetric Celestial Shader, Multi-Stratum SDF Relief, Helical MHD Prominences & Cauchy Cross-Diffraction  

---

## Architectural Physics & Volumetric Shader Overview
To resolve the visual defects identified in Session 0 and elevate The Jamestellation into a volumetric celestial focal point, this architecture replaces analytical 2D masking and point-sprite flares with four physically grounded mechanisms:

1. **3D Fractal Boundary Dissolution (Zero Egg-Halo):**  
   Analytical elliptical vignettes are completely removed. Periphery stardust is governed by a 3D Simplex/FBM erosion field $\text{smoothstep}(0.32, 0.48, d_{\text{anat}} + 0.18 \cdot \text{fbm}(\vec{P} \cdot 0.08))$ coupled with divergence-free 3D curl-noise advection, causing outer stars to detach into irregular cosmic web filaments.
2. **Multi-Stratum Craniofacial SDF Relief & Blackbody Hierarchy:**  
   A 3-stratum volumetric lattice ($160 \times 160 \times 3 = 76,800$ stellar nodes) maps anatomical relief across $Z \in [-1850, -1740]$. Spectral emission is partitioned into incandescent blue-white $O/B$-type stars ($10,000\,\text{K} - 30,000\,\text{K}$) for eyes, nose bridge, brow, and lips; $G$-type solar gold ($5,800\,\text{K}$) for cheeks, forehead, and jawline; and $M$-type red giants embedded in $H_\alpha$ ($656.3\,\text{nm}$) ionized hydrogen and violet/magenta emission nebulae across the crown.
3. **Ajna Singularity Lensing & Cauchy Cross-Diffraction:**  
   Anchored precisely at $\vec{P}_{\text{Ajna}} = [-1.94, 21.6, -1850.0]$, the Third Eye applies Einstein-ring gravitational deflection to surrounding stars within $R < 35\,\text{LY}$ and renders an 8-point optical cross-diffraction star $I(\theta) = \sum_{k=0}^{3} \exp(-\vert{}\sin(\theta - k\pi/4)\vert{} \cdot 80.0)$ with Cauchy chromatic dispersion.
4. **Helical MHD Flux Tube Prominences (pjCME) & Luminance-Guarded Laughter:**  
   Solar prominences are constructed as continuous 3D tubular meshes along twisted magnetic field lines $\vec{r}(u, \theta) = \vec{r}_{\text{anchor}} + \vec{A}\sin(u\pi) + \vec{B}\sin(2u\pi) + r_{\text{tube}}(\vec{n}\cos\theta + \vec{b}\sin\theta)$ undergoing periodic magnetic reconnection eruptions. Video blending validates decoded luminance via `step(0.03, vidLum)` across the proximity threshold $Z \in [-1550, -1680]$ to prevent asynchronous black frame bleed.

---

## 1. Vertex Shader (pjFace)
```glsl
#version 300 es
precision highp float;

layout(location = 0) in vec2 aUV;
layout(location = 1) in vec3 aSeed; // x: hash [0,1], y: stratum [-1,1], z: spectral/ajna flag [0,2]

uniform mat3 rot;
uniform vec3 cp;
uniform float t;
uniform float asp;
uniform float hpx;
uniform float gain;
uniform float fb;
uniform float uWarp;
uniform float uLaugh;
uniform float uIntegrity;
uniform sampler2D uTexStill;
uniform sampler2D uTexVideo;

out vec3 vColor;
out vec2 vTexCoord;
out float vAlpha;
out float vStarClass;   // 0: Nebula/M-type, 1: G-type, 2: O/B-type, 3: Ajna Singularity
out float vErosion;
out float vDispersion;

const vec3 AJNA_POS = vec3(-1.94, 21.6, -1850.0);
const vec2 AJNA_UV  = vec2(0.50, 0.58);
const float PI      = 3.14159265359;

// 3D Hash & Value/Simplex Noise for FBM and Divergence-Free Curl Advection
vec3 hash33(vec3 p3) {
    p3 = fract(p3 * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yxz + 33.33);
    return fract((p3.xxy + p3.yxx) * p3.zyx) * 2.0 - 1.0;
}

float noise3D(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(mix(dot(hash33(i + vec3(0,0,0)), f - vec3(0,0,0)),
                dot(hash33(i + vec3(1,0,0)), f - vec3(1,0,0)), u.x),
            mix(dot(hash33(i + vec3(0,1,0)), f - vec3(0,1,0)),
                dot(hash33(i + vec3(1,1,0)), f - vec3(1,1,0)), u.x), u.y),
        mix(mix(dot(hash33(i + vec3(0,0,1)), f - vec3(0,0,1)),
                dot(hash33(i + vec3(1,0,1)), f - vec3(1,0,1)), u.x),
            mix(dot(hash33(i + vec3(0,1,1)), f - vec3(0,1,1)),
                dot(hash33(i + vec3(1,1,1)), f - vec3(1,1,1)), u.x), u.y), u.z
    );
}

float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    mat3 m = mat3(
         0.00,  0.80,  0.60,
        -0.80,  0.36, -0.48,
        -0.60, -0.48,  0.64
    );
    for (int i = 0; i < 4; ++i) {
        v += a * noise3D(p);
        p = m * p * 2.03 + vec3(13.7, 29.1, 7.3);
        a *= 0.5;
    }
    return v;
}

vec3 curlNoise(vec3 p) {
    const float e = 0.05;
    vec3 dx = vec3(e, 0.0, 0.0);
    vec3 dy = vec3(0.0, e, 0.0);
    vec3 dz = vec3(0.0, 0.0, e);
    float n_y1 = noise3D(p + dy), n_y0 = noise3D(p - dy);
    float n_z1 = noise3D(p + dz), n_z0 = noise3D(p - dz);
    float n_x1 = noise3D(p + dx), n_x0 = noise3D(p - dx);
    return normalize(vec3(
        (n_y1 - n_y0) - (n_z1 - n_z0),
        (n_z1 - n_z0) - (n_x1 - n_x0),
        (n_x1 - n_x0) - (n_y1 - n_y0)
    ) / (2.0 * e) + 1e-5);
}

// Blackbody Planckian Locus Approximation (T in Kelvin)
vec3 planckColor(float tempK) {
    float tK = clamp(tempK, 2500.0, 30000.0) / 100.0;
    vec3 c;
    if (tK <= 66.0) {
        c.r = 1.0;
        c.g = clamp(0.39008157 * log(tK) - 0.63184144, 0.0, 1.0);
    } else {
        c.r = clamp(1.29293618 * pow(tK - 60.0, -0.13320476), 0.0, 1.0);
        c.g = clamp(1.12989086 * pow(tK - 60.0, -0.07551485), 0.0, 1.0);
    }
    if (tK >= 66.0) {
        c.b = 1.0;
    } else if (tK <= 19.0) {
        c.b = 0.0;
    } else {
        c.b = clamp(0.54320679 * log(tK - 10.0) - 1.1962541, 0.0, 1.0);
    }
    return c;
}

// True 3D Craniofacial Sculptural SDF Relief (returns Z offset in [0, 110] LY and feature weight)
vec2 evaluateAnatomicalRelief(vec2 uv, float laughFactor) {
    vec2 p = (uv - AJNA_UV) * vec2(2.0, 2.2); // Centered at Ajna bridge (0, 0)

    // Cranial ellipsoid dome base
    float r2 = dot(p * vec2(1.05, 0.85), p * vec2(1.05, 0.85));
    float cranium = max(0.0, sqrt(max(0.0, 1.0 - r2 * 0.85)));

    // Nasal bridge and pronasale tip extrusion
    float noseY = clamp((0.02 - p.y) / 0.34, 0.0, 1.0);
    float noseWidth = mix(0.065, 0.11, noseY * noseY);
    float noseBridge = exp(-(p.x * p.x) / (noseWidth * noseWidth)) *
                       smoothstep(0.08, -0.02, p.y) *
                       smoothstep(-0.38, -0.26, p.y) *
                       (0.38 + 0.28 * sin(noseY * PI * 0.82));

    // Supraorbital brow ridge
    float browCurve = 0.07 - 0.035 * cos(clamp(p.x * 4.5, -PI, PI));
    float brow = exp(-pow((p.y - browCurve) / 0.055, 2.0)) *
                 smoothstep(0.52, 0.08, abs(p.x)) * 0.24;

    // Orbital sockets (recessed cavities) & ocular globes (convex spheres)
    vec2 eyePosL = vec2(-0.22, -0.02);
    vec2 eyePosR = vec2( 0.22, -0.02);
    float dEyeL = length((p - eyePosL) * vec2(1.0, 1.45));
    float dEyeR = length((p - eyePosR) * vec2(1.0, 1.45));
    float dEye = min(dEyeL, dEyeR);
    float socketRecess = -0.18 * exp(-pow(dEye / 0.14, 2.0));
    float ocularGlobe  =  0.14 * exp(-pow(dEye / 0.065, 2.0));

    // Zygomatic arches (cheekbones elevate dynamically with celestial laughter)
    float cheekLift = 0.035 * laughFactor;
    vec2 cheekP = vec2(abs(p.x) - 0.31, p.y + 0.19 - cheekLift);
    float cheekbones = (0.22 + 0.06 * laughFactor) *
                       exp(-(cheekP.x * cheekP.x) / 0.032 - (cheekP.y * cheekP.y) / 0.028);

    // Labial (lips) & mental protuberance (chin)
    float smileCurve = 0.035 * laughFactor * (p.x * p.x * 8.0);
    vec2 lipP = vec2(p.x, p.y + 0.44 - smileCurve);
    float lips = 0.21 * exp(-(lipP.x * lipP.x) / 0.045 - (lipP.y * lipP.y) / 0.0065);
    float chin = 0.19 * exp(-(p.x * p.x) / 0.035 - pow(p.y + 0.62, 2.0) / 0.018);

    float totalRelief = cranium * 0.55 + noseBridge + brow + socketRecess + ocularGlobe + cheekbones + lips + chin;
    float ajnaPin = exp(-dot(p, p) * 65.0);
    float featureWeight = clamp(
        noseBridge * 1.8 + ocularGlobe * 3.2 + brow * 1.5 + lips * 2.1 + ajnaPin * 2.0,
        0.0, 1.0
    );

    return vec2(totalRelief, featureWeight);
}

void main() {
    vTexCoord = aUV;

    // 1. Asynchronous Video Luminance Validation & Seamless Laughter Morphing
    float camLaugh = smoothstep(-1550.0, -1680.0, cp.z);
    float activeLaugh = max(uLaugh, camLaugh);

    vec2 sampleUV = vec2(aUV.x, 1.0 - aUV.y);
    vec3 colStill = texture(uTexStill, sampleUV).rgb;
    vec3 colVideo = texture(uTexVideo, sampleUV).rgb;
    float vidLum  = dot(colVideo, vec3(0.2126, 0.7152, 0.0722));
    vec3 validVideo = mix(colStill, colVideo, step(0.03, vidLum));
    vec3 photoCol   = mix(colStill, validVideo, activeLaugh);
    float lum       = dot(photoCol, vec3(0.2126, 0.7152, 0.0722));

    // 2. Special Handling for Vertex Marked as the Exact Ajna Singularity Star (aSeed.z > 1.5)
    if (aSeed.z > 1.5) {
        vec3 ajnaCam = rot * (AJNA_POS - cp);
        if (ajnaCam.z <= 0.1) {
            gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
            return;
        }
        vColor      = vec3(0.88, 0.95, 1.0);
        vAlpha      = gain * (1.0 - fb);
        vStarClass  = 3.0;
        vErosion    = 0.0;
        vDispersion = 1.0;
        gl_Position = vec4(ajnaCam.x / (ajnaCam.z * asp), ajnaCam.y / ajnaCam.z, 0.0, 1.0);
        gl_PointSize = clamp((hpx * 190.0) / ajnaCam.z, 28.0, 420.0);
        return;
    }

    // 3. Evaluate 3D Anatomical Relief & Base World Coordinates
    vec2 anat = evaluateAnatomicalRelief(aUV, activeLaugh);
    float reliefHeight  = anat.x;
    float featureWeight = anat.y;

    // Base XY spans [-68, +68] around AJNA_POS.xy = [-1.94, 21.6]
    vec2 relXY = (aUV - AJNA_UV) * vec2(132.0, 148.0);
    // Depth spans from Z = -1850 (deep cranium / Ajna singularity plane) to Z = -1740 (nasal tip & foreground relief)
    float stratumDepth = aSeed.y * (4.5 + 14.0 * (1.0 - featureWeight));
    float zWorld = -1850.0 + (reliefHeight * 78.0 + lum * 32.0) + stratumDepth;

    vec3 pos = vec3(AJNA_POS.x + relXY.x, AJNA_POS.y + relXY.y, zWorld);

    // 4. Organic 3D FBM Boundary Dissolution (Zero Analytical Oval / Egg-Halo)
    float dAnat = length((aUV - vec2(0.50, 0.52)) * vec2(0.96, 0.88));
    float nFBM  = fbm(pos * 0.08 + vec3(0.0, t * 0.025, 0.0));
    float boundaryErosion = smoothstep(0.32, 0.48, dAnat + 0.18 * nFBM);
    vErosion = boundaryErosion;

    // Curl-noise filament stream advection at periphery (stars drift into cosmic web)
    vec3 filamentDrift = curlNoise(pos * 0.022 + vec3(t * 0.018)) * pow(boundaryErosion, 1.55) * 92.0;
    pos += filamentDrift;

    // 5. Puzzle Restoration Integrity (Entropy Scatter when uIntegrity < 1.0)
    float disarray = 1.0 - clamp(uIntegrity, 0.25, 1.0);
    if (disarray > 0.001) {
        vec3 chaosVec = hash33(vec3(aUV * 500.0, aSeed.x * 100.0));
        pos += chaosVec * disarray * 180.0;
    }

    // 6. Soft Gravitational Spacetime Curvature (Einstein Deflection within R < 35 LY of Ajna)
    vec3 toAjna = pos - AJNA_POS;
    float rAjna = length(toAjna.xy);
    if (rAjna > 0.35 && rAjna < 35.0) {
        float lensWeight = smoothstep(35.0, 1.5, rAjna) * (1.0 - featureWeight * 0.65);
        float einsteinShift = (4.8 / (rAjna + 0.8)) * lensWeight;
        pos.xy += normalize(toAjna.xy) * einsteinShift;
        vDispersion = clamp(lensWeight * 1.4, 0.0, 1.0);
    } else {
        vDispersion = 0.15 * featureWeight;
    }

    // 7. Multi-Tier Stellar Spectral Classification
    bool isCrownNebula = (aUV.y > 0.66 && dAnat > 0.24) || (boundaryErosion > 0.38);
    if (featureWeight > 0.42 && lum > 0.28) {
        // Core Facial Features: O/B-type incandescent blue-white/gold hypergiants (10,000K - 30,000K)
        vStarClass = 2.0;
        float temp = mix(10500.0, 28000.0, aSeed.x * featureWeight);
        vec3 obSpec = mix(planckColor(temp), vec3(1.0, 0.94, 0.82), 0.35);
        vColor = mix(photoCol * 1.35, obSpec, 0.58);
    } else if (!isCrownNebula) {
        // Cheeks, Forehead, Jawline: Warm solar gold G-type stars (5,800K)
        vStarClass = 1.0;
        vec3 gSpec = planckColor(5800.0 + (aSeed.x - 0.5) * 900.0);
        vColor = mix(photoCol * 1.15, gSpec * vec3(1.05, 0.92, 0.72), 0.52);
    } else {
        // Hair & Crown Nebula: Cool M-type red giants + H-alpha (656.3nm) & violet emission nebula
        vStarClass = 0.0;
        vec3 mGiant  = planckColor(3100.0 + aSeed.x * 700.0);
        vec3 hAlpha  = vec3(0.98, 0.16, 0.42);
        vec3 vNebula = vec3(0.52, 0.18, 0.92);
        vec3 nebMix  = mix(vNebula, hAlpha, 0.5 + 0.5 * sin(aSeed.x * 12.0 + t * 0.4));
        vColor = mix(nebMix, mGiant, step(0.68, aSeed.x)) * (0.65 + 0.55 * lum);
    }

    // Laughter radiance boost
    vColor *= (1.0 + 0.35 * activeLaugh * featureWeight);

    // 8. Camera Projection & Point Sizing
    vec3 camPos = rot * (pos - cp);
    if (camPos.z <= 0.2) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        return;
    }

    float twinkle = 0.82 + 0.18 * sin(t * (2.2 + 4.0 * aSeed.x) + aSeed.x * 62.8);
    float lumGate = smoothstep(0.02, 0.18, lum + 0.12 * (1.0 - boundaryErosion));
    float filamentMask = mix(1.0, step(0.35, fract(aSeed.x * 17.3 + nFBM)), boundaryErosion);
    vAlpha = gain * (1.0 - fb) * lumGate * (1.0 - pow(boundaryErosion, 1.35)) * filamentMask * twinkle;

    gl_Position = vec4(camPos.x / (camPos.z * asp), camPos.y / camPos.z, 0.0, 1.0);

    float baseRadius = (vStarClass > 1.5) ? (3.8 + 4.2 * featureWeight)
                     : (vStarClass > 0.5) ? (2.6 + 2.4 * lum)
                     : (5.5 + 8.5 * boundaryErosion);
    float warpScale  = 1.0 + uWarp * 2.5;
    gl_PointSize = clamp((hpx * baseRadius * warpScale) / camPos.z, 1.2, 64.0);
}
```

---

## 2. Fragment Shader (pjFace)
```glsl
#version 300 es
precision highp float;

in vec3 vColor;
in vec2 vTexCoord;
in float vAlpha;
in float vStarClass;
in float vErosion;
in float vDispersion;

uniform float t;
uniform float uLaugh;
uniform float uWarp;

out vec4 fragColor;

const float PI = 3.14159265359;

float diffraction8Point(float theta, float sharpness) {
    float spike = 0.0;
    for (int k = 0; k < 4; ++k) {
        float angle = theta - float(k) * (PI * 0.25);
        spike += exp(-abs(sin(angle)) * sharpness);
    }
    return spike;
}

void main() {
    if (vAlpha <= 0.002) discard;

    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float r = length(p);
    if (r > 1.0) discard;

    float theta = atan(p.y, p.x);

    // Tier 3: Ajna (Third Eye) Wormhole Singularity & 8-Point Cauchy Diffraction Star
    if (vStarClass > 2.5) {
        float rR = r * 0.91;
        float rG = r * 1.00;
        float rB = r * 1.09;

        float spikeG = diffraction8Point(theta, 80.0);
        float spikeR = diffraction8Point(theta + 0.008, 76.0);
        float spikeB = diffraction8Point(theta - 0.008, 84.0);

        vec3 spikeCol = vec3(
            spikeR * exp(-rR * 2.6),
            spikeG * exp(-rG * 2.9),
            spikeB * exp(-rB * 3.2)
        );

        float einsteinRing = exp(-pow((r - 0.24) / 0.055, 2.0)) * (0.7 + 0.3 * sin(theta * 8.0 - t * 3.5));
        float core = exp(-r * r * 28.0) * 2.5 + exp(-r * 5.2);

        vec3 prismaticRing = vec3(
            exp(-pow((rR - 0.24) / 0.06, 2.0)),
            einsteinRing,
            exp(-pow((rB - 0.24) / 0.06, 2.0))
        ) * vec3(0.65, 0.88, 1.35);

        vec3 ajnaColor = vec3(1.0, 0.98, 0.95) * core
                       + spikeCol * vec3(0.82, 0.94, 1.25) * (1.3 + 0.4 * uLaugh)
                       + prismaticRing;

        float alpha = clamp((core + spikeG * 0.85 + einsteinRing) * (1.0 - smoothstep(0.75, 1.0, r)), 0.0, 1.0) * vAlpha;
        fragColor = vec4(ajnaColor * alpha, alpha);
        return;
    }

    // Tier 2: Incandescent O/B-Type Core Feature Stars (Eyes, Lips, Brow, Nose Bridge)
    if (vStarClass > 1.5) {
        float core = exp(-r * r * 14.0);
        float halo = exp(-r * 3.6);
        float spikes = diffraction8Point(theta, 55.0) * exp(-r * 3.8) * 0.45;

        vec3 dispShift = vec3(
            exp(-r * 0.92 * 3.6),
            halo,
            exp(-r * 1.08 * 3.6)
        );
        vec3 col = vColor * mix(vec3(halo), dispShift, vDispersion) + vec3(1.0, 0.98, 0.95) * (core + spikes);
        float alpha = (core + halo * 0.65 + spikes) * (1.0 - r * r) * vAlpha;
        fragColor = vec4(col * alpha, alpha);
        return;
    }

    // Tier 1: Warm Solar G-Type Stars (Cheeks, Forehead, Jawline)
    if (vStarClass > 0.5) {
        float core = exp(-r * r * 10.0);
        float corona = exp(-r * 3.1) * (1.0 - r);
        vec3 col = mix(vColor, vec3(1.0, 0.96, 0.86), core * 0.7);
        float alpha = (core * 0.9 + corona * 0.75) * vAlpha;
        fragColor = vec4(col * alpha, alpha);
        return;
    }

    // Tier 0: Crown H-Alpha / Violet Emission Nebula & M-Type Red Giants
    float softCloud = exp(-r * r * 3.2) * (1.0 - r * r);
    float embeddedStar = exp(-r * r * 18.0) * (1.0 - vErosion * 0.6);
    vec3 col = vColor * softCloud + vec3(1.0, 0.72, 0.65) * embeddedStar * 0.6;
    float alpha = (softCloud * 0.48 + embeddedStar * 0.65) * vAlpha;
    fragColor = vec4(col * alpha, alpha);
}
```

---

## 3. 3D Coronal Mass Ejection Shader (pjCME)
```glsl
// Vertex Shader
#version 300 es
precision highp float;

layout(location = 0) in vec3 aTubeCoord;
layout(location = 1) in vec4 aLoopParams;

uniform mat3 rot;
uniform vec3 cp;
uniform float t;
uniform float asp;
uniform float hpx;
uniform float gain;
uniform float fb;
uniform float uWarp;
uniform float uLaugh;
uniform float uIntegrity;

out vec3 vTubeUVW;
out float vReconnect;
out float vEdgeDot;
out float vMasterGain;

const vec3 CROWN_CENTER = vec3(-1.94, 34.0, -1798.0);
const float PI = 3.14159265359;

vec3 evalMagneticArch(float u, float anchorAngle, float span, float altitude, float loopID, out float eruption) {
    float cyclePhase = fract(t * 0.085 + loopID * 0.371);
    eruption = smoothstep(0.55, 0.88, cyclePhase) * (1.0 - smoothstep(0.88, 0.99, cyclePhase));

    float ang0 = anchorAngle - span * 0.5;
    float ang1 = anchorAngle + span * 0.5;
    vec2 ellipR = vec2(44.0, 48.0);

    vec3 rAnchor0 = CROWN_CENTER + vec3(cos(ang0) * ellipR.x, sin(ang0) * ellipR.y, -8.0 * sin(loopID));
    vec3 rAnchor1 = CROWN_CENTER + vec3(cos(ang1) * ellipR.x, sin(ang1) * ellipR.y,  8.0 * cos(loopID));
    vec3 rBase    = mix(rAnchor0, rAnchor1, u);

    float midAng = anchorAngle;
    vec3 radialOut = normalize(vec3(cos(midAng) * 1.1, sin(midAng) * 1.25, 0.28 * sin(loopID * 2.3)));
    vec3 shearVec  = normalize(cross(radialOut, vec3(0.0, 0.0, 1.0)));

    float dynAlt = altitude * (1.0 + 0.55 * uLaugh + 1.15 * eruption);
    vec3 vecA = radialOut * dynAlt;
    vec3 vecB = shearVec * (altitude * 0.28 * sin(t * 0.6 + loopID * 1.9));

    return rBase + vecA * sin(u * PI) + vecB * sin(2.0 * u * PI);
}

void main() {
    float u      = aTubeCoord.x;
    float theta  = aTubeCoord.y;
    float loopID = aTubeCoord.z;

    float anchorAngle = aLoopParams.x;
    float span        = aLoopParams.y;
    float altitude    = aLoopParams.z;
    float twistFreq   = aLoopParams.w;

    float eruption = 0.0;
    const float du = 0.008;
    vec3 p0 = evalMagneticArch(u, anchorAngle, span, altitude, loopID, eruption);
    float dummy = 0.0;
    vec3 p1 = evalMagneticArch(min(1.0, u + du), anchorAngle, span, altitude, loopID, dummy);

    vec3 tangent = normalize(p1 - p0 + 1e-5);
    vec3 refUp   = abs(tangent.z) < 0.9 ? vec3(0.0, 0.0, 1.0) : vec3(0.0, 1.0, 0.0);
    vec3 normal  = normalize(cross(tangent, refUp));
    vec3 binorm  = cross(tangent, normal);

    float helicalPhase = theta + u * twistFreq * PI * 2.0 - t * 2.4;
    float rTube = (1.6 + 3.8 * sin(u * PI) * (1.0 + 0.7 * eruption)) * clamp(uIntegrity, 0.35, 1.0);

    vec3 radialOffset = normal * cos(helicalPhase) + binorm * sin(helicalPhase);
    vec3 worldPos     = p0 + radialOffset * rTube;

    vec3 camPos = rot * (worldPos - cp);
    if (camPos.z <= 0.2) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        return;
    }

    vec3 viewDir = normalize(worldPos - cp);
    vEdgeDot    = sqrt(max(0.0, 1.0 - pow(dot(radialOffset, viewDir), 2.0)));
    vTubeUVW    = vec3(u, helicalPhase, loopID);
    vReconnect  = eruption;
    vMasterGain = gain * (1.0 - fb) * clamp(uIntegrity, 0.25, 1.0);

    gl_Position = vec4(camPos.x / (camPos.z * asp), camPos.y / camPos.z, 0.0, 1.0);
}
```

```glsl
// Fragment Shader
#version 300 es
precision highp float;

in vec3 vTubeUVW;
in float vReconnect;
in float vEdgeDot;
in float vMasterGain;

uniform float t;
uniform float uLaugh;

out vec4 fragColor;

const float PI = 3.14159265359;

float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float plasmaNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash21(i + vec2(0,0)), hash21(i + vec2(1,0)), u.x),
        mix(hash21(i + vec2(0,1)), hash21(i + vec2(1,1)), u.x), u.y
    );
}

vec3 mhdPlasmaGrade(float heat) {
    vec3 hAlphaCrimson = vec3(0.92, 0.12, 0.28);
    vec3 solarGold     = vec3(1.00, 0.62, 0.14);
    vec3 coronalWhite  = vec3(1.00, 0.96, 0.88);
    vec3 reconnectCyan = vec3(0.72, 0.88, 1.00);

    vec3 c = mix(hAlphaCrimson, solarGold, smoothstep(0.0, 0.45, heat));
    c = mix(c, coronalWhite, smoothstep(0.45, 0.82, heat));
    c = mix(c, reconnectCyan, smoothstep(0.82, 1.0, heat));
    return c;
}

void main() {
    float u      = vTubeUVW.x;
    float theta  = vTubeUVW.y;
    float loopID = vTubeUVW.z;

    float flowForward = u * 10.0 - t * (1.8 + 0.9 * uLaugh);
    float flowCounter = u * 16.0 + t * 1.1;

    float fibril1 = plasmaNoise(vec2(flowForward, theta * 1.5 + loopID * 7.1));
    float fibril2 = plasmaNoise(vec2(flowCounter, theta * 3.0 - loopID * 3.7));
    float strand  = 0.5 + 0.5 * sin(theta * 4.0 + fibril1 * 4.5);

    float archEnvelope = sin(u * PI);
    float plasmaDensity = (0.45 * fibril1 + 0.35 * fibril2 + 0.20 * strand) *
                          smoothstep(0.0, 0.12, u) * smoothstep(1.0, 0.88, u);

    float coreCyl = pow(clamp(vEdgeDot, 0.0, 1.0), 1.6);
    float heat = clamp(
        plasmaDensity * 0.75 + coreCyl * 0.35 + vReconnect * archEnvelope * 0.65 + uLaugh * 0.2,
        0.0, 1.0
    );

    vec3 col = mhdPlasmaGrade(heat) * (1.15 + 1.4 * vReconnect * archEnvelope);
    float alpha = plasmaDensity * coreCyl * (0.38 + 0.42 * archEnvelope) * vMasterGain;

    if (alpha <= 0.003) discard;
    fragColor = vec4(col * alpha, alpha);
}
```
