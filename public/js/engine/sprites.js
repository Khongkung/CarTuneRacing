/**
 * Project CarTuneRacing - 2D Pixel Art Procedural Canvas Renderer
 * Renders modular car chassis, body shells, engine internals, smoke, fire, and drag strip
 */

class PixelRenderer {
  constructor() {
    this.smokeParticles = [];
    this.fireParticles = [];
    this.porscheSideImg = null;
    this.porscheEngineImg = null;
    this.porscheSideLoaded = false;
    this.porscheEngineLoaded = false;

    this.rangerSideImg = null;
    this.rangerEngineImg = null;
    this.rangerSideLoaded = false;
    this.rangerEngineLoaded = false;

    if (typeof Image !== 'undefined') {
      try {
        this.porscheSideImg = new Image();
        this.porscheSideImg.onload = () => { this.porscheSideLoaded = true; };
        this.porscheSideImg.src = 'assets/cars/porsche_911_turbo_s/porsche_side.jpg';

        this.porscheEngineImg = new Image();
        this.porscheEngineImg.onload = () => { this.porscheEngineLoaded = true; };
        this.porscheEngineImg.src = 'assets/cars/porsche_911_turbo_s/porsche_engine.jpg';

        this.rangerSideImg = new Image();
        this.rangerSideImg.onload = () => { this.rangerSideLoaded = true; };
        this.rangerSideImg.src = 'assets/cars/ford_ranger_2004/ranger_side.jpg';

        this.rangerEngineImg = new Image();
        this.rangerEngineImg.onload = () => { this.rangerEngineLoaded = true; };
        this.rangerEngineImg.src = 'assets/cars/ford_ranger_2004/ranger_engine.jpg';
      } catch (e) {}
    }
  }

  // Helper to check if carData is the 2004 Ford Ranger 2.5 Open Cab
  isFordRanger(carData) {
    if (!carData) return false;
    if (carData.model === 'car_ford_ranger_2004') return true;
    if (carData.model === 'car_porsche_911_turbo_s') return false;
    const parts = carData.parts || {};
    if (parts.model === 'car_ford_ranger_2004') return true;
    if (parts.model === 'car_porsche_911_turbo_s') return false;
    return (
      carData.bodyType === 'car_ford_ranger_2004' ||
      carData.bodyType === 'body_ford_ranger_2004' ||
      parts.body === 'body_ford_ranger_2004'
    );
  }

  // Draw crisp pixel rect
  drawPixelRect(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
  }

  // --- RENDER MODULAR CAR (GARAGE, WORKSHOP & RACING) ---
  renderCar(ctx, x, y, scale = 2.0, carData, options = {}) {
    const {
      isRacing = false,
      speed = 0,
      wheelAngle = 0,
      isNosActive = false,
      isBackfire = false,
      isOverheating = false,
      isBlown = false,
      isBurnout = false,
      hasParachute = false,
      showXRay = false,
      isHoodOpen = false
    } = options;

    ctx.save();
    ctx.translate(Math.floor(x), Math.floor(y));
    ctx.scale(scale, scale);

    const parts = carData.parts || {};
    const isRanger = this.isFordRanger(carData);
    const bodyId = parts.body === 'body_none'
      ? 'body_none'
      : (isRanger ? 'body_ford_ranger_2004' : 'body_porsche_911_turbo_s');
    const engineId = parts.engine_block || 'none';
    const hasEngine = Boolean(engineId && engineId !== 'none' && engineId !== 'eng_none');
    const hasHoodExit = parts.exhaust === 'exh_hood_exit';

    // 1. Shadow underneath car
    this.drawPixelRect(ctx, 2, 30, 96, 4, 'rgba(0,0,0,0.5)');

    // 2. CHASSIS TUBE FRAME (Base)
    this.renderChassisFrame(ctx, parts.chassis || (isRanger ? 'chassis_pickup_ladder' : 'chassis_tube'));

    // 3. ENGINE BLOCK & PIPING (Under hood / X-ray)
    if (hasEngine) {
      this.renderEngineBay(ctx, parts, isHoodOpen);
    }

    // 4. EXHAUST SYSTEM (Tubes)
    this.renderExhaust(ctx, parts.exhaust);

    // 5. PIXEL-ART BODY SHELL (Porsche 911 Turbo S or Ford Ranger 2.5 Open Cab 2004)
    if (bodyId !== 'body_none') {
      const alpha = showXRay ? 0.45 : 1.0;
      ctx.globalAlpha = alpha;
      this.renderBodyShell(ctx, bodyId, parts, isHoodOpen);
      ctx.globalAlpha = 1.0;
    }

    // 6. MODULAR BODY KIT & AERO (Front Bumper, Side Skirts, Rear Wing)
    this.renderModularBodyKit(ctx, parts, bodyId);

    // 7. WHEELS & TIRES
    this.renderWheels(ctx, parts.tires, wheelAngle, parts.brakes, isRanger);

    // 8. EFFECTS (Flames, Nitrous, Smoke, Overheat)
    if (isBackfire && hasEngine) {
      if (hasHoodExit) {
        this.renderFlame(ctx, isRanger ? 72 : 18, 9, -Math.PI / 1.6);
      } else {
        this.renderFlame(ctx, -2, 26, Math.PI);
      }
    }

    if (isNosActive && hasEngine) {
      // Blue NOS purge and tail thrust
      this.renderNosFlame(ctx, -6, 26);
    }

    if (isOverheating) {
      // White steam from rear engine bay
      this.renderSteam(ctx, 14, 12);
    }

    if (isBlown) {
      // Black smoke & fire from rear engine bay
      this.renderBlownEngineEffect(ctx, 16, 16);
    }

    if (hasParachute) {
      this.renderParachute(ctx, -40, 10);
    }

    ctx.restore();
  }

  // --- 1. CHASSIS TUBE FRAME ---
  renderChassisFrame(ctx, chassisId) {
    if (chassisId === 'chassis_formula_monocoque') {
      // Carbon monocoque tub F1 chassis
      this.drawPixelRect(ctx, 24, 20, 56, 6, '#0f172a'); // Carbon tub
      this.drawPixelRect(ctx, 28, 18, 48, 2, '#334155');
      // Low formula seat
      this.drawPixelRect(ctx, 42, 17, 12, 5, '#e11d48');
      // Exposed front suspension wishbone pickups
      this.drawPixelRect(ctx, 74, 19, 4, 2, '#94a3b8');
      return;
    }

    if (chassisId === 'chassis_pickup_ladder') {
      // Heavy duty boxed ladder frame rails with crossmembers
      this.drawPixelRect(ctx, 6, 25, 86, 4, '#1e293b');
      this.drawPixelRect(ctx, 8, 26, 82, 2, '#475569');
      // Crossmembers (บันไดคัสซี)
      this.drawPixelRect(ctx, 20, 24, 4, 5, '#0f172a');
      this.drawPixelRect(ctx, 45, 24, 4, 5, '#0f172a');
      this.drawPixelRect(ctx, 70, 24, 4, 5, '#0f172a');
      // Cab roll bar
      this.drawPixelRect(ctx, 34, 10, 24, 2, '#64748b');
      this.drawPixelRect(ctx, 34, 12, 2, 14, '#475569');
      this.drawPixelRect(ctx, 56, 12, 2, 14, '#475569');
      this.drawPixelRect(ctx, 38, 16, 6, 9, '#dc2626');
      return;
    }

    // Main lower frame rail (Tube / Lightweight / NASCAR / GT)
    const frameColor = chassisId === 'chassis_nascar_steel' ? '#eab308' : (chassisId === 'chassis_gt_spaceframe' ? '#06b6d4' : '#4a4e69');
    this.drawPixelRect(ctx, 10, 26, 80, 3, frameColor);
    this.drawPixelRect(ctx, 12, 27, 76, 1, '#cbd5e1');

    // Roll cage struts
    this.drawPixelRect(ctx, 32, 10, 26, 2, frameColor); // Roof bar
    this.drawPixelRect(ctx, 32, 12, 2, 14, '#495057');  // B-Pillar bar
    this.drawPixelRect(ctx, 56, 12, 2, 14, '#495057');  // A-Pillar bar

    // Diagonal braces
    this.drawPixelRect(ctx, 34, 14, 4, 3, frameColor);
    this.drawPixelRect(ctx, 38, 17, 4, 3, frameColor);
    this.drawPixelRect(ctx, 42, 20, 4, 3, frameColor);

    if (chassisId === 'chassis_nascar_steel') {
      // Extra NASCAR door bars
      this.drawPixelRect(ctx, 34, 18, 22, 2, '#eab308');
      this.drawPixelRect(ctx, 34, 22, 22, 2, '#eab308');
    }

    // Front subframe / engine cradle
    this.drawPixelRect(ctx, 66, 24, 22, 2, '#343a40');
    this.drawPixelRect(ctx, 86, 20, 2, 6, '#343a40');

    // Seat
    this.drawPixelRect(ctx, 36, 16, 6, 10, '#e63946');
    this.drawPixelRect(ctx, 34, 23, 10, 3, '#d90429');
    // Steering wheel
    this.drawPixelRect(ctx, 48, 18, 2, 5, '#f8f9fa');
  }

  // --- 2. ENGINE BAY & INTERNALS ---
  renderEngineBay(ctx, parts, isHoodOpen = false) {
    const engineId = parts.engine_block;

    // Engine Block colors
    let blockColor = '#adb5bd';
    let headColor = '#e63946'; // Red VTEC cover

    if (engineId === 'block_i6_2jz') {
      blockColor = '#343a40'; // Legendary Iron block
      headColor = '#48cae4'; // Twin-cam blue
    } else if (engineId === 'block_v6_tt') {
      blockColor = '#6c757d';
      headColor = '#ffd166';
    } else if (engineId === 'block_v8_big') {
      blockColor = '#d90429';
      headColor = '#f77f00';
    } else if (engineId === 'block_diesel_pickup') {
      blockColor = '#1e293b';
      headColor = '#ef4444';
    } else if (engineId === 'block_v10_gt3') {
      blockColor = '#0f172a';
      headColor = '#a855f7';
    } else if (engineId === 'block_v12_quad_turbo') {
      blockColor = '#18181b';
      headColor = '#e11d48';
    } else if (engineId === 'block_f1_hybrid_v6') {
      blockColor = '#09090b';
      headColor = '#f97316';
    }

    // Cylinder block
    this.drawPixelRect(ctx, 68, 18, 16, 9, blockColor);
    // Cylinder head / Cam cover
    this.drawPixelRect(ctx, 67, 15, 18, 3, headColor);
    // Cam cover ribs / spark plug recessed valley
    this.drawPixelRect(ctx, 69, 15, 14, 1, '#18181b');
    // Pulley and belt
    this.drawPixelRect(ctx, 84, 17, 2, 8, '#212529');
    this.drawPixelRect(ctx, 85, 19, 1, 4, '#ced4da');

    // Extra details when hood is propped open
    if (isHoodOpen) {
      // 12V Racing Battery & gold terminals
      this.drawPixelRect(ctx, 60, 21, 5, 5, '#1e293b');
      this.drawPixelRect(ctx, 61, 20, 1, 1, '#ef4444'); // Positive red terminal
      this.drawPixelRect(ctx, 64, 20, 1, 1, '#38bdf8'); // Negative blue terminal

      // Spark plug high-tension leads / Ignition coils
      this.drawPixelRect(ctx, 70, 14, 1, 2, '#38bdf8');
      this.drawPixelRect(ctx, 73, 14, 1, 2, '#38bdf8');
      this.drawPixelRect(ctx, 76, 14, 1, 2, '#38bdf8');
      this.drawPixelRect(ctx, 79, 14, 1, 2, '#38bdf8');

      // Oil cap & dipstick
      this.drawPixelRect(ctx, 68, 14, 2, 1, '#facc15');

      // Red Strut Tower Brace Bar across engine bay
      this.drawPixelRect(ctx, 60, 13, 25, 1, '#dc2626');
      this.drawPixelRect(ctx, 59, 14, 2, 4, '#991b1b'); // Tower mount
    }

    // TURBO & INTERCOOLER
    const ind = parts.induction || '';
    if (ind.includes('turbo')) {
      // Turbo snail / compressor
      this.drawPixelRect(ctx, 64, 19, 4, 5, '#e0aaff');
      this.drawPixelRect(ctx, 63, 21, 3, 2, '#c77dff');
      // Silicone coupler
      this.drawPixelRect(ctx, 65, 18, 1, 3, '#38bdf8');
      // Charge pipe to front
      this.drawPixelRect(ctx, 65, 14, 18, 2, '#ced4da');
      // Blue silicone coupler at intercooler inlet
      this.drawPixelRect(ctx, 82, 14, 2, 2, '#38bdf8');
    } else if (ind.includes('supercharger')) {
      // Big blower sitting on top of head!
      this.drawPixelRect(ctx, 70, 11, 14, 4, '#ced4da');
      this.drawPixelRect(ctx, 84, 12, 3, 7, '#d62828'); // Red pulley belt
      // Blower scoop
      this.drawPixelRect(ctx, 72, 8, 10, 3, '#f72585');
    }

    // Intercooler (Front)
    if (parts.intercooler && parts.intercooler !== 'ic_none') {
      this.drawPixelRect(ctx, 86, 17, 3, 9, '#e9ecef');
      // Grid texture
      this.drawPixelRect(ctx, 87, 18, 1, 7, '#6c757d');
    }

    // Radiator & Brass/Aluminum Cap
    if (parts.cooling && parts.cooling !== 'cool_none') {
      this.drawPixelRect(ctx, 84, 16, 2, 9, '#48cae4');
      this.drawPixelRect(ctx, 84, 15, 2, 1, '#eab308'); // High-pressure radiator cap
    }
  }

  // --- HOOD PROP OPEN HELPER ---
  renderOpenHood(ctx, mainColor, lightColor) {
    // Propped open hood at ~35-degree angle
    this.drawPixelRect(ctx, 58, 6, 26, 2, mainColor);
    this.drawPixelRect(ctx, 58, 5, 26, 1, lightColor);
    // Underside heat shield
    this.drawPixelRect(ctx, 60, 7, 22, 1, '#1e293b');
    // Metal prop rod holding hood open
    this.drawPixelRect(ctx, 78, 8, 1, 10, '#cbd5e1');
  }

  // --- COLOR UTILITY FOR REALISTIC METALLIC SHADING ---
  shadeColor(color, percent) {
    if (!color || typeof color !== 'string' || !color.startsWith('#')) return color || '#3a86ff';
    let hex = color.replace('#', '');
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    let num = parseInt(hex, 16);
    if (isNaN(num)) return color;
    let amt = Math.round(2.55 * percent);
    let R = (num >> 16) + amt;
    let G = (num >> 8 & 0x00FF) + amt;
    let B = (num & 0x0000FF) + amt;
    return '#' + (
      0x1000000 +
      (R < 255 ? (R < 0 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 0 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 0 ? 0 : B) : 255)
    ).toString(16).slice(1);
  }

  // --- ROTATING SPOKED PULLEY HELPER (BLENDED PIXEL-ART METALLIC STYLE) ---
  drawSpokedPulley(ctx, x, y, r, outerColor, spokeColor, angle = 0, spokes = 5) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));

    // Soft Ambient Drop Shadow into Engine Cavity
    ctx.fillStyle = 'rgba(12, 10, 9, 0.55)';
    ctx.beginPath();
    ctx.arc(1, 2, r + 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Outer Rim with Warm Pixel-Art Ink Outline (#1c1614)
    ctx.fillStyle = outerColor || '#33302e';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1c1614';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Inner Recessed Groove
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.74, 0, Math.PI * 2);
    ctx.fill();

    // Rotating Spokes & Lightening Holes
    ctx.rotate(angle);
    ctx.strokeStyle = spokeColor || '#78716c';
    ctx.lineWidth = Math.max(1.5, r * 0.15);
    for (let i = 0; i < spokes; i++) {
      const a = (i * Math.PI * 2) / spokes;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * (r * 0.70), Math.sin(a) * (r * 0.70));
      ctx.stroke();

      const holeA = a + Math.PI / spokes;
      ctx.fillStyle = '#0c0a09';
      ctx.beginPath();
      ctx.arc(Math.cos(holeA) * (r * 0.48), Math.sin(holeA) * (r * 0.48), Math.max(1.2, r * 0.12), 0, Math.PI * 2);
      ctx.fill();
    }

    // Center Hub Nut
    ctx.fillStyle = '#a8a29e';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1c1614';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.12, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // --- ROTATING TOOTHED VERNIER CAMSHAFT GEAR HELPER (BLENDED PIXEL-ART STYLE) ---
  drawToothedCamGear(ctx, x, y, r, anodizeColor, spokeColor, angle = 0, teethCount = 16) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));

    // Ambient Occlusion Shadow behind Gear
    ctx.fillStyle = 'rgba(12, 10, 9, 0.55)';
    ctx.beginPath();
    ctx.arc(1, 2, r + 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(angle);

    // Outer Gear Teeth (Muted Steel)
    ctx.fillStyle = '#44403c';
    for (let i = 0; i < teethCount; i++) {
      const a = (i * Math.PI * 2) / teethCount;
      ctx.save();
      ctx.rotate(a);
      ctx.fillRect(-1.5, -r - 2, 3, 3.5);
      ctx.restore();
    }

    // Gear Outer Ring
    ctx.fillStyle = '#57534e';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1c1614';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Anodized Vernier Inner Carrier (Weathered / Muted Tone)
    ctx.fillStyle = anodizeColor || '#7f2323';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2);
    ctx.fill();

    // Inner Dark Recess
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.58, 0, Math.PI * 2);
    ctx.fill();

    // 5 CNC Spokes & Vernier Adjustment Bolts
    ctx.strokeStyle = spokeColor || '#a8a29e';
    ctx.lineWidth = 1.8;
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * (r * 0.62), Math.sin(a) * (r * 0.62));
      ctx.stroke();

      ctx.fillStyle = '#d6d3d1';
      ctx.beginPath();
      ctx.arc(Math.cos(a + 0.3) * (r * 0.68), Math.sin(a + 0.3) * (r * 0.68), 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Center Cam Bolt
    ctx.fillStyle = '#a8a29e';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1c1614';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // --- ROTATING ELECTRIC RADIATOR COOLING FAN HELPER (BLENDED INTO EXISTING SHROUD) ---
  drawCoolingFan(ctx, x, y, r, angle = 0) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));

    // Blend seamlessly inside existing pixel-art shroud ring
    ctx.globalAlpha = 0.86;

    // Deep Fan Cavity
    ctx.fillStyle = '#141210';
    ctx.beginPath();
    ctx.arc(0, 0, r - 2, 0, Math.PI * 2);
    ctx.fill();

    // Rotating Curved Fan Blades (7 Blades in Weathered Charcoal)
    ctx.save();
    ctx.rotate(angle);
    const bladeCount = 7;
    for (let i = 0; i < bladeCount; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI * 2) / bladeCount);
      ctx.fillStyle = '#292524';
      ctx.strokeStyle = '#57534e';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(3, -1.5);
      ctx.quadraticCurveTo(r * 0.52, -r * 0.24, r - 4, -3);
      ctx.quadraticCurveTo(r - 3, 4, r * 0.48, r * 0.10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Center Fan Motor Hub
    ctx.fillStyle = '#44403c';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.27, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1c1614';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.fillStyle = '#78716c';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Subtle Shroud Ring Outline
    ctx.strokeStyle = '#1c1614';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r - 1, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  // --- BLENDED PIXEL-ART TURBOCHARGER SNAIL & SPINNING COMPRESSOR HELPER ---
  drawBlendedTurbo(ctx, tX, tY, rOut, impAngle = 0, heatFactor = 0, housingColor = '#a8a29e') {
    ctx.save();
    ctx.translate(Math.round(tX), Math.round(tY));

    // Ambient Occlusion Shadow into Engine Bay
    ctx.fillStyle = 'rgba(12, 10, 9, 0.6)';
    ctx.beginPath();
    ctx.arc(1.5, 2.5, rOut + 2, 0, Math.PI * 2);
    ctx.fill();

    // Warm Turbine Exhaust Glow under High RPM
    if (heatFactor > 0.15) {
      ctx.fillStyle = `rgba(217, 119, 6, ${0.25 + heatFactor * 0.45})`;
      ctx.beginPath();
      ctx.arc(-2, 1, rOut + 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Weathered Cast-Aluminum Compressor Housing
    ctx.fillStyle = housingColor;
    ctx.strokeStyle = '#1c1614';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, rOut, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Inner Bevel Ring
    ctx.strokeStyle = '#57534e';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, rOut * 0.78, 0, Math.PI * 2);
    ctx.stroke();

    // Dark Inducer Throat
    ctx.fillStyle = '#141210';
    ctx.beginPath();
    ctx.arc(0, 0, rOut * 0.62, 0, Math.PI * 2);
    ctx.fill();

    // Spinning Billet Compressor Blades (Weathered Steel #a8a29e / #d6d3d1)
    ctx.save();
    ctx.rotate(impAngle);
    ctx.strokeStyle = '#a8a29e';
    ctx.lineWidth = 1.4;
    for (let b = 0; b < 6; b++) {
      const a = (b * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * (rOut * 0.56), Math.sin(a) * (rOut * 0.56));
      ctx.stroke();
    }
    ctx.fillStyle = '#d6d3d1';
    ctx.beginPath();
    ctx.arc(0, 0, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  // --- 3D SHADED TUBULAR EXHAUST HEADER PIPE HELPER ---
  drawHeaderTube(ctx, points, baseColor = '#92400e', highlightColor = '#d97706', width = 10) {
    if (!points || points.length < 2) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Dark outline
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = width + 3;
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.stroke();

    // Main bronze/steel body
    ctx.strokeStyle = baseColor;
    ctx.lineWidth = width;
    ctx.stroke();

    // Specular 3D highlight along center
    ctx.strokeStyle = highlightColor;
    ctx.lineWidth = Math.max(2, width * 0.35);
    ctx.stroke();
    ctx.restore();
  }

  // --- ENGINE-SPECIFIC 3D PERSPECTIVE BLOCK, HEADS, INTAKE, HEADERS & CAM GEARS ---
  renderFrontValveCover(ctx, eX, eY, engineId, parts = {}, beltRot = 0, heatFactor = 0) {
    const cams = parts.head_cams || 'head_stock';
    const ign = parts.ignition || 'ignition_oem';
    const exh = parts.exhaust || 'exh_stock';

    // Header Pipe Colors (Changes with Exhaust Upgrade & Heat)
    let hdrBase = '#78350f';
    let hdrHigh = '#b45309';
    if (exh.includes('titanium')) {
      hdrBase = '#1e3a8a';
      hdrHigh = '#38bdf8';
    } else if (exh.includes('straight') || exh.includes('side') || exh.includes('hood')) {
      hdrBase = '#713f12';
      hdrHigh = '#ca8a04';
    }
    if (heatFactor > 0.25) {
      hdrBase = '#991b1b';
      hdrHigh = '#f97316';
    }

    // Coil Pack & Spark Wire Colors by Ignition System
    let coilBodyColor = '#1e293b';
    let coilTopColor = '#475569';
    let wireColor = '#2563eb'; // Blue OEM/Sport wire

    if (ign === 'ignition_none') {
      coilBodyColor = 'transparent';
      coilTopColor = 'transparent';
      wireColor = 'transparent';
    } else if (ign === 'ignition_plasma') {
      coilBodyColor = '#0284c7';
      coilTopColor = '#facc15';
      wireColor = '#eab308';
    } else if (ign === 'ignition_cdi_drag') {
      coilBodyColor = '#b91c1c';
      coilTopColor = '#ef4444';
      wireColor = '#ef4444';
    } else if (ign === 'ignition_f1_laser') {
      coilBodyColor = '#0891b2';
      coilTopColor = '#22d3ee';
      wireColor = '#06b6d4';
    }

    const gearAnodize = cams.includes('titanium')
      ? '#eab308'
      : cams.includes('stage3')
        ? '#9333ea'
        : cams.includes('stage2')
          ? '#0284c7'
          : '#dc2626';

    // Empty Engine Bay Check
    if (!engineId || engineId === 'none' || engineId === 'eng_none') {
      // Empty transmission tunnel & engine mounts
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(eX, eY + 25, 42, Math.PI, 0, false);
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#334155';
      ctx.fillRect(eX - 115, eY + 20, 34, 18);
      ctx.fillRect(eX + 81, eY + 20, 34, 18);

      ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
      ctx.font = 'bold 13px "Share Tech Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('[ NO ENGINE INSTALLED / ยังไม่ได้ติดตั้งเครื่องยนต์ ]', eX, eY + 5);
      return;
    }

    // =========================================================================
    // 1. V8 BIG-BLOCK & NASCAR V8 (3/4 Isometric V-Block like Reference Image!)
    // =========================================================================
    if (engineId === 'block_v8_big' || engineId === 'block_nascar_v8') {
      const isNascar = engineId === 'block_nascar_v8';

      // Snaking 4-into-1 Exhaust Headers on Left & Right Banks
      for (let i = 0; i < 4; i++) {
        const oy = eY - 38 + i * 14;
        // Left bank headers
        this.drawHeaderTube(ctx, [
          [eX - 68, oy],
          [eX - 102 - i * 3, oy + 6],
          [eX - 96, oy + 32],
          [eX - 75, eY + 35]
        ], hdrBase, hdrHigh, 10);
        // Right bank headers
        this.drawHeaderTube(ctx, [
          [eX + 68, oy],
          [eX + 102 + i * 3, oy + 6],
          [eX + 96, oy + 32],
          [eX + 75, eY + 35]
        ], hdrBase, hdrHigh, 10);
      }

      // Lower V-Block Cast Iron / Racing Orange Crankcase
      ctx.fillStyle = isNascar ? '#c2410c' : '#1e293b';
      ctx.beginPath();
      ctx.moveTo(eX - 72, eY - 25);
      ctx.lineTo(eX + 72, eY - 25);
      ctx.lineTo(eX + 58, eY + 48);
      ctx.lineTo(eX - 58, eY + 48);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Left Angled V8 Cylinder Head & Ribbed Valve Cover (Perspective receding up-right)
      const vcColor = isNascar
        ? '#cbd5e1'
        : (cams.includes('stage3') ? '#7e22ce' : cams.includes('titanium') ? '#b45309' : '#334155');
      const vcDark = this.shadeColor(vcColor, -35);

      ctx.save();
      ctx.fillStyle = vcColor;
      ctx.beginPath();
      ctx.moveTo(eX - 82, eY + 8);
      ctx.lineTo(eX - 58, eY - 52);
      ctx.lineTo(eX - 26, eY - 46);
      ctx.lineTo(eX - 42, eY + 18);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 2.2;
      ctx.stroke();

      // Left Valve Cover Side Depth
      ctx.fillStyle = vcDark;
      ctx.beginPath();
      ctx.moveTo(eX - 82, eY + 8);
      ctx.lineTo(eX - 42, eY + 18);
      ctx.lineTo(eX - 46, eY + 30);
      ctx.lineTo(eX - 86, eY + 18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right Angled V8 Cylinder Head & Ribbed Valve Cover
      ctx.fillStyle = vcColor;
      ctx.beginPath();
      ctx.moveTo(eX + 82, eY + 8);
      ctx.lineTo(eX + 58, eY - 52);
      ctx.lineTo(eX + 26, eY - 46);
      ctx.lineTo(eX + 42, eY + 18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right Valve Cover Side Depth
      ctx.fillStyle = vcDark;
      ctx.beginPath();
      ctx.moveTo(eX + 82, eY + 8);
      ctx.lineTo(eX + 42, eY + 18);
      ctx.lineTo(eX + 46, eY + 30);
      ctx.lineTo(eX + 86, eY + 18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Fins & Oil Cap on Valve Covers
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1.5;
      for (let r = 0; r < 4; r++) {
        const ry = eY - 38 + r * 13;
        ctx.beginPath();
        ctx.moveTo(eX - 66 + r * 3, ry);
        ctx.lineTo(eX - 36 + r * 2, ry + 5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(eX + 66 - r * 3, ry);
        ctx.lineTo(eX + 36 - r * 2, ry + 5);
        ctx.stroke();
      }
      // Oil Filler Cap on Right Cover
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(eX + 60, eY + 2, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // Center Cast-Aluminum V-Valley Intake Manifold (With 8 Individual Runners!)
      const manGrad = ctx.createLinearGradient(eX - 38, eY - 55, eX + 38, eY - 55);
      manGrad.addColorStop(0, '#64748b');
      manGrad.addColorStop(0.25, '#e2e8f0');
      manGrad.addColorStop(0.5, '#f8fafc');
      manGrad.addColorStop(0.75, '#cbd5e1');
      manGrad.addColorStop(1, '#475569');

      // 8 Side Intake Runners (4 left, 4 right bridging manifold to heads)
      for (let r = 0; r < 4; r++) {
        const ry = eY - 46 + r * 13;
        ctx.fillStyle = '#94a3b8';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.fillRect(eX - 42, ry, 84, 8);
        ctx.strokeRect(eX - 42, ry, 84, 8);
      }

      // Central Longitudinal Plenum Log
      ctx.fillStyle = manGrad;
      ctx.beginPath();
      ctx.moveTo(eX - 26, eY - 56);
      ctx.lineTo(eX + 26, eY - 56);
      ctx.lineTo(eX + 30, eY + 6);
      ctx.lineTo(eX - 30, eY + 6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Longitudinal ribs on intake manifold
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      [-12, 0, 12].forEach(rx => {
        ctx.beginPath();
        ctx.moveTo(eX + rx * 0.85, eY - 54);
        ctx.lineTo(eX + rx, eY + 4);
        ctx.stroke();
      });

      // Spark Plug Wires routing from distributor/coils to heads
      if (ign !== 'ignition_none') {
        ctx.strokeStyle = wireColor;
        ctx.lineWidth = 2.5;
        for (let w = 0; w < 4; w++) {
          const wy = eY - 36 + w * 13;
          ctx.beginPath();
          ctx.moveTo(eX - 28, wy);
          ctx.quadraticCurveTo(eX - 55, wy - 4, eX - 72, wy + 8);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(eX + 28, wy);
          ctx.quadraticCurveTo(eX + 55, wy - 4, eX + 72, wy + 8);
          ctx.stroke();
        }
      }

      // Exposed Cam Gear Window if upgraded cams
      if (cams !== 'head_stock') {
        this.drawToothedCamGear(ctx, eX - 44, eY + 12, 13, gearAnodize, '#f8fafc', beltRot * 0.5);
        this.drawToothedCamGear(ctx, eX + 44, eY + 12, 13, gearAnodize, '#f8fafc', -beltRot * 0.5);
      }

      // Front Black Timing Cover with Prominent "V8" Emblem (Matches Reference Image!)
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.moveTo(eX - 32, eY - 2);
      ctx.lineTo(eX + 32, eY - 2);
      ctx.lineTo(eX + 24, eY + 34);
      ctx.lineTo(eX - 24, eY + 34);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#3f3f46';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = isNascar ? '#facc15' : '#e2e8f0';
      ctx.font = 'bold 16px "Chakra Petch", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(isNascar ? 'V8 CUP' : 'V8', eX, eY + 21);

    // =========================================================================
    // 2. 2JZ-GTE 3.0L INLINE-6 TWIN-CAM (Deep Straight-6 with Side Plenum)
    // =========================================================================
    } else if (engineId === 'block_i6_2jz') {
      // Left Exhaust Header (6-into-1)
      for (let i = 0; i < 6; i++) {
        const oy = eY - 50 + i * 11;
        this.drawHeaderTube(ctx, [
          [eX - 34, oy],
          [eX - 88 - (i % 2) * 8, oy + 5],
          [eX - 78, eY + 25]
        ], hdrBase, hdrHigh, 8);
      }

      // Right Side-Feed Cast Aluminum 2JZ Intake Plenum & 6 Individual Runners
      for (let i = 0; i < 6; i++) {
        const ry = eY - 48 + i * 10;
        ctx.fillStyle = '#cbd5e1';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.fillRect(eX + 32, ry, 42, 7);
        ctx.strokeRect(eX + 32, ry, 42, 7);
      }
      const plenGrad = ctx.createLinearGradient(eX + 62, eY - 52, eX + 102, eY + 18);
      plenGrad.addColorStop(0, '#94a3b8');
      plenGrad.addColorStop(0.5, '#f8fafc');
      plenGrad.addColorStop(1, '#475569');
      ctx.fillStyle = plenGrad;
      ctx.fillRect(eX + 66, eY - 50, 34, 68);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.strokeRect(eX + 66, eY - 50, 34, 68);

      // Front Throttle Body on 2JZ Plenum
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(eX + 83, eY + 16, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Long Receding Inline-6 Cylinder Head & Twin Cam Covers
      const covColor = cams.includes('stage3') ? '#7e22ce' : cams.includes('titanium') ? '#ca8a04' : '#1d4ed8';
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(eX - 34, eY - 58);
      ctx.lineTo(eX + 34, eY - 58);
      ctx.lineTo(eX + 44, eY + 26);
      ctx.lineTo(eX - 44, eY + 26);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Left & Right Twin Cam Towers
      ctx.fillStyle = covColor;
      ctx.fillRect(eX - 36, eY - 54, 22, 66);
      ctx.fillRect(eX + 14, eY - 54, 22, 66);
      ctx.strokeRect(eX - 36, eY - 54, 22, 66);
      ctx.strokeRect(eX + 14, eY - 54, 22, 66);

      // Center Spark Plug Valley & 6 Coil Packs
      ctx.fillStyle = '#090d16';
      ctx.fillRect(eX - 12, eY - 52, 24, 62);
      if (ign !== 'ignition_none') {
        for (let c = 0; c < 6; c++) {
          ctx.fillStyle = coilBodyColor;
          ctx.fillRect(eX - 9, eY - 49 + c * 10, 18, 7);
          ctx.fillStyle = coilTopColor;
          ctx.fillRect(eX - 4, eY - 48 + c * 10, 8, 5);
        }
      }

      // Exposed Front Twin Vernier Camshaft Gears (Spinning Live!)
      ctx.fillStyle = '#090d16';
      ctx.fillRect(eX - 38, eY - 2, 76, 32);
      ctx.strokeStyle = '#334155';
      ctx.strokeRect(eX - 38, eY - 2, 76, 32);

      // Timing belt across top of both cam gears
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(eX - 20, eY - 2);
      ctx.lineTo(eX + 20, eY - 2);
      ctx.stroke();

      this.drawToothedCamGear(ctx, eX - 20, eY + 13, 15, gearAnodize, '#f8fafc', beltRot * 0.65);
      this.drawToothedCamGear(ctx, eX + 20, eY + 13, 15, gearAnodize, '#f8fafc', beltRot * 0.65);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 9px "Share Tech Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('2JZ-GTE TWIN CAM', eX, eY - 59);

    // =========================================================================
    // 3. V6 TWIN-CAM / FORMULA F1 HYBRID V6 (60°/90° V6 Architecture)
    // =========================================================================
    } else if (engineId === 'block_v6_tt' || engineId === 'block_f1_hybrid_v6') {
      const isF1 = engineId === 'block_f1_hybrid_v6';

      // 3-into-1 Exhaust Headers per Bank
      for (let i = 0; i < 3; i++) {
        const oy = eY - 34 + i * 16;
        this.drawHeaderTube(ctx, [
          [eX - 65, oy],
          [eX - 98, oy + 8],
          [eX - 80, eY + 32]
        ], isF1 ? '#b45309' : hdrBase, isF1 ? '#facc15' : hdrHigh, 9);
        this.drawHeaderTube(ctx, [
          [eX + 65, oy],
          [eX + 98, oy + 8],
          [eX + 80, eY + 32]
        ], isF1 ? '#b45309' : hdrBase, isF1 ? '#facc15' : hdrHigh, 9);
      }

      // Angled Left & Right V6 Cylinder Heads
      const headCol = isF1 ? '#18181b' : (cams.includes('stage3') ? '#dc2626' : '#0284c7');
      ctx.fillStyle = headCol;
      ctx.strokeStyle = isF1 ? '#f59e0b' : '#090d16';
      ctx.lineWidth = 2;

      // Left Bank
      ctx.beginPath();
      ctx.moveTo(eX - 78, eY + 10);
      ctx.lineTo(eX - 55, eY - 46);
      ctx.lineTo(eX - 24, eY - 40);
      ctx.lineTo(eX - 38, eY + 18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right Bank
      ctx.beginPath();
      ctx.moveTo(eX + 78, eY + 10);
      ctx.lineTo(eX + 55, eY - 46);
      ctx.lineTo(eX + 24, eY - 40);
      ctx.lineTo(eX + 38, eY + 18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Dual Crossover Intake Plenum
      ctx.fillStyle = isF1 ? '#27272a' : '#e2e8f0';
      ctx.fillRect(eX - 36, eY - 50, 72, 54);
      ctx.strokeStyle = isF1 ? '#f97316' : '#0f172a';
      ctx.strokeRect(eX - 36, eY - 50, 72, 54);

      if (isF1) {
        // High-Voltage Orange MGU-K / MGU-H Hybrid Cables
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(eX - 30, eY - 10);
        ctx.quadraticCurveTo(eX, eY - 35, eX + 30, eY - 10);
        ctx.stroke();
      }

      // Exposed Cam Gears on V6 Banks
      this.drawToothedCamGear(ctx, eX - 48, eY + 8, 12, gearAnodize, '#f8fafc', beltRot * 0.6);
      this.drawToothedCamGear(ctx, eX + 48, eY + 8, 12, gearAnodize, '#f8fafc', -beltRot * 0.6);

      // Front Timing Cover
      ctx.fillStyle = '#18181b';
      ctx.fillRect(eX - 26, eY + 2, 52, 28);
      ctx.strokeStyle = '#475569';
      ctx.strokeRect(eX - 26, eY + 2, 52, 28);
      ctx.fillStyle = isF1 ? '#f97316' : '#38bdf8';
      ctx.font = 'bold 12px "Chakra Petch", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(isF1 ? 'F1 E-TECH' : 'V6 DOHC', eX, eY + 20);

    // =========================================================================
    // 4. V10 GT3 & V12 QUAD-TURBO HYPERCAR (Exotic Multi-Cylinder ITB / Plenum)
    // =========================================================================
    } else if (engineId === 'block_v10_gt3' || engineId === 'block_v12_quad_turbo') {
      const isV12 = engineId === 'block_v12_quad_turbo';
      const cylPerBank = isV12 ? 6 : 5;

      // Multi-tube headers on left and right
      for (let i = 0; i < cylPerBank; i++) {
        const oy = eY - 46 + i * (isV12 ? 10 : 12);
        this.drawHeaderTube(ctx, [
          [eX - 75, oy],
          [eX - 110, oy + 6],
          [eX - 90, eY + 32]
        ], hdrBase, hdrHigh, 8);
        this.drawHeaderTube(ctx, [
          [eX + 75, oy],
          [eX + 110, oy + 6],
          [eX + 90, eY + 32]
        ], hdrBase, hdrHigh, 8);
      }

      // Wide Exotic V-Banks (Red Crackled / Carbon Gold)
      const bankColor = isV12 ? '#18181b' : '#b91c1c';
      ctx.fillStyle = bankColor;
      ctx.strokeStyle = isV12 ? '#eab308' : '#090d16';
      ctx.lineWidth = 2;

      // Left Bank
      ctx.beginPath();
      ctx.moveTo(eX - 92, eY + 12);
      ctx.lineTo(eX - 66, eY - 54);
      ctx.lineTo(eX - 28, eY - 48);
      ctx.lineTo(eX - 44, eY + 20);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right Bank
      ctx.beginPath();
      ctx.moveTo(eX + 92, eY + 12);
      ctx.lineTo(eX + 66, eY - 54);
      ctx.lineTo(eX + 28, eY - 48);
      ctx.lineTo(eX + 44, eY + 20);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Individual Throttle Body (ITB) Velocity Stacks in Center Valley!
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(eX - 36, eY - 52, 72, 60);
      for (let i = 0; i < cylPerBank; i++) {
        const sy = eY - 45 + i * (isV12 ? 9.5 : 11.5);
        // Left & Right Golden/Silver Velocity Trumpets
        [-18, 18].forEach(sx => {
          ctx.fillStyle = isV12 ? '#eab308' : '#cbd5e1';
          ctx.beginPath();
          ctx.ellipse(eX + sx, sy, 9, 4.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#090d16';
          ctx.beginPath();
          ctx.ellipse(eX + sx, sy, 5.5, 2.5, 0, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Twin Exposed Cam Gears per Bank
      this.drawToothedCamGear(ctx, eX - 54, eY + 10, 12, gearAnodize, '#f8fafc', beltRot * 0.7);
      this.drawToothedCamGear(ctx, eX + 54, eY + 10, 12, gearAnodize, '#f8fafc', -beltRot * 0.7);

      // Front Timing Chest
      ctx.fillStyle = '#18181b';
      ctx.fillRect(eX - 30, eY + 2, 60, 28);
      ctx.strokeStyle = '#eab308';
      ctx.strokeRect(eX - 30, eY + 2, 60, 28);
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 13px "Chakra Petch", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(isV12 ? 'V12 HYPER' : 'V10 GT3', eX, eY + 21);

    // =========================================================================
    // 5. COMMONRAIL TURBO DIESEL 3.0L (Thai Drag Pickup Engine)
    // =========================================================================
    } else if (engineId === 'block_diesel_pickup') {
      // Heavy Braided Exhaust Manifold on Left
      for (let i = 0; i < 4; i++) {
        const oy = eY - 42 + i * 14;
        this.drawHeaderTube(ctx, [
          [eX - 36, oy],
          [eX - 92, oy + 6],
          [eX - 80, eY + 25]
        ], hdrBase, hdrHigh, 10);
      }

      // Right Aluminum Intake Manifold
      ctx.fillStyle = '#cbd5e1';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.fillRect(eX + 36, eY - 44, 42, 58);
      ctx.strokeRect(eX + 36, eY - 44, 42, 58);

      // Billet Anodized Blue/Gold Diesel Valve Cover
      const dGrad = ctx.createLinearGradient(eX - 38, eY - 52, eX + 38, eY + 22);
      dGrad.addColorStop(0, '#0284c7');
      dGrad.addColorStop(0.5, '#38bdf8');
      dGrad.addColorStop(1, '#0369a1');
      ctx.fillStyle = dGrad;
      ctx.beginPath();
      ctx.moveTo(eX - 32, eY - 54);
      ctx.lineTo(eX + 32, eY - 54);
      ctx.lineTo(eX + 40, eY + 22);
      ctx.lineTo(eX - 40, eY + 22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Golden Commonrail High-Pressure Accumulator & 4 Stainless Hardlines
      ctx.fillStyle = '#eab308';
      ctx.fillRect(eX + 20, eY - 48, 8, 52);
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 4; i++) {
        const iy = eY - 42 + i * 13;
        ctx.beginPath();
        ctx.moveTo(eX + 20, iy);
        ctx.lineTo(eX, iy);
        ctx.stroke();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(eX, iy, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Front Gear Window
      this.drawToothedCamGear(ctx, eX, eY + 12, 16, '#eab308', '#0f172a', beltRot * 0.5);

    // =========================================================================
    // 6. DEFAULT: 2.0L INLINE-4 DOHC VTEC (Red Wrinkle Head + Exposed Cam Gears)
    // =========================================================================
    } else {
      // 4-into-1 Stainless/Bronze Header on Left
      for (let i = 0; i < 4; i++) {
        const oy = eY - 42 + i * 13;
        this.drawHeaderTube(ctx, [
          [eX - 36, oy],
          [eX - 92 - i * 2, oy + 6],
          [eX - 80, eY + 28]
        ], hdrBase, hdrHigh, 9);
      }

      // 4-Runner Cast Aluminum Intake Manifold on Right
      for (let i = 0; i < 4; i++) {
        const ry = eY - 42 + i * 13;
        ctx.fillStyle = '#cbd5e1';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.fillRect(eX + 34, ry, 38, 8);
        ctx.strokeRect(eX + 34, ry, 38, 8);
      }
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(eX + 64, eY - 46, 30, 56);
      ctx.strokeRect(eX + 64, eY - 46, 30, 56);

      // Iconic Red Wrinkle-Finish DOHC VTEC Valve Cover (3D Perspective)
      const vtecColor = cams.includes('stage3') ? '#9333ea' : cams.includes('titanium') ? '#eab308' : '#dc2626';
      ctx.fillStyle = vtecColor;
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(eX - 34, eY - 52);
      ctx.lineTo(eX + 34, eY - 52);
      ctx.lineTo(eX + 42, eY + 22);
      ctx.lineTo(eX - 42, eY + 22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Center Carbon/Black Spark Plug Cover & 4 Coil Packs
      ctx.fillStyle = '#18181b';
      ctx.fillRect(eX - 11, eY - 48, 22, 48);
      if (ign !== 'ignition_none') {
        for (let c = 0; c < 4; c++) {
          ctx.fillStyle = coilBodyColor;
          ctx.fillRect(eX - 8, eY - 44 + c * 11, 16, 8);
          ctx.fillStyle = coilTopColor;
          ctx.fillRect(eX - 4, eY - 42 + c * 11, 8, 4);
        }
      }

      // Exposed Front Twin Vernier Cam Gears (Spinning Live!)
      ctx.fillStyle = '#090d16';
      ctx.fillRect(eX - 36, eY - 2, 72, 28);
      ctx.strokeStyle = '#334155';
      ctx.strokeRect(eX - 36, eY - 2, 72, 28);

      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(eX - 18, eY - 1);
      ctx.lineTo(eX + 18, eY - 1);
      ctx.stroke();

      this.drawToothedCamGear(ctx, eX - 18, eY + 12, 14, gearAnodize, '#f8fafc', beltRot * 0.65);
      this.drawToothedCamGear(ctx, eX + 18, eY + 12, 14, gearAnodize, '#f8fafc', beltRot * 0.65);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 9px "Chakra Petch", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('DOHC VTEC', eX, eY - 55);
    }
  }

  // --- RENDER 2D PIXEL SIDE SCENE IN GARAGE & WORKSHOP (PORSCHE 911 TURBO S & FORD RANGER 2.5 OPEN CAB 2004) ---
  renderGarageCarScene(ctx, w, h, carData, options = {}) {
    const {
      cameraMode = 'overview',
      showXRay = false,
      isEngineRunning = false,
      rpm = 0,
      maxRpm = 8500,
      boost = 0,
      isBackfire = false,
      isOverheating = false
    } = options;

    const parts = carData.parts || {};
    const isRanger = this.isFordRanger(carData);
    const engineId = parts.engine_block || 'none';
    const hasEngine = Boolean(engineId && engineId !== 'none' && engineId !== 'eng_none');
    const effectiveRunning = isEngineRunning && hasEngine;
    const vibY = effectiveRunning ? (Math.random() - 0.5) * (0.5 + (rpm / Math.max(1000, maxRpm)) * 2.0) : 0;

    ctx.save();

    // Exact normalized wheel coordinates per car model on the 800x446 canvas
    const rearWheelX = isRanger ? w * 0.328 : w * 0.326;
    const rearWheelY = (isRanger ? h * 0.735 : h * 0.742) + vibY * 0.4;
    const frontWheelX = isRanger ? w * 0.736 : w * 0.688;
    const frontWheelY = (isRanger ? h * 0.735 : h * 0.742) + vibY * 0.4;
    const wheelR = isRanger ? h * 0.088 : h * 0.086;

    // Camera zoom transform for Wheel focus mode
    if (cameraMode === 'wheel') {
      ctx.translate(w * 0.5, h * 0.5);
      ctx.scale(2.15, 2.15);
      ctx.translate(-(isRanger ? w * 0.70 : w * 0.66), -h * 0.73);
    }

    // 1. Draw the Pixel-Art Garage + Car Side Image (or Procedural Pixel-Art Fallback)
    if (isRanger && this.rangerSideLoaded && this.rangerSideImg && ctx.drawImage) {
      ctx.drawImage(this.rangerSideImg, 0, vibY * 0.5, w, h);
    } else if (!isRanger && this.porscheSideLoaded && this.porscheSideImg && ctx.drawImage) {
      ctx.drawImage(this.porscheSideImg, 0, vibY * 0.5, w, h);
    } else {
      // Procedural Pixel-Art Garage Background + Side View Fallback
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, w, h * 0.72);
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, h * 0.72, w, h * 0.28);
      this.renderCar(ctx, w * 0.16, h * 0.48 + vibY, 5.4, carData, {
        showXRay,
        isBackfire: isBackfire && hasEngine,
        isOverheating
      });
    }

    // 2. Blended Upgraded Tires & Brakes Overlay on the Wheels
    const tires = parts.tires || 'tires_street';
    const brakes = parts.brakes || 'brake_stock';
    const isDragSlick = tires.includes('slick') || tires.includes('radial') || tires.includes('wrinkle') || tires.includes('topfuel');
    const isCarbonBrake = brakes.includes('carbon') || brakes.includes('chute');
    const isSlottedBrake = brakes.includes('slotted') || brakes.includes('drag');

    if (isDragSlick || isCarbonBrake || isSlottedBrake) {
      ctx.save();
      ctx.globalAlpha = 0.72;
      [
        { wx: rearWheelX, wy: rearWheelY, calDir: isRanger ? -1 : 1 },
        { wx: frontWheelX, wy: frontWheelY, calDir: -1 }
      ].forEach(({ wx, wy, calDir }) => {
        if (isDragSlick) {
          // Subtle Drag Radial / Hoosier stencil ring on tire sidewall
          ctx.strokeStyle = tires.includes('wrinkle') ? '#d97706' : '#991b1b';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(wx, wy, wheelR - 5, 0, Math.PI * 2);
          ctx.stroke();
        }
        if (isCarbonBrake || isSlottedBrake) {
          // Recessed cross-drilled rotor ring & caliper accent
          ctx.strokeStyle = isCarbonBrake ? '#a8a29e' : '#b45309';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(wx, wy, wheelR * 0.48, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = isCarbonBrake ? '#ca8a04' : '#991b1b';
          ctx.fillRect(wx + calDir * (wheelR * 0.32) - 3, wy - 7, 6, 14);
        }
      });
      ctx.restore();
    }

    // 3. Blended Pixel-Art Modular Body Kit Overlays
    const frontBumper = parts.front_bumper || 'front_stock';
    const sideSkirts = parts.side_skirts || 'skirts_stock';
    const rearWing = parts.rear_wing || 'wing_none';

    // Front Bumper Splitter & Canards (Weathered Carbon with #1c1614 Pixel Ink Outline)
    if (frontBumper && frontBumper !== 'front_stock') {
      const fbX = Math.round(isRanger ? w * 0.784 : w * 0.765);
      const fbY = Math.round((isRanger ? h * 0.718 : h * 0.790) + vibY * 0.5);
      // Ground shadow under splitter
      ctx.fillStyle = 'rgba(12, 10, 9, 0.5)';
      ctx.fillRect(fbX + 2, fbY + 5, w * 0.062, 4);
      // Matte carbon splitter blade
      ctx.fillStyle = '#292524';
      ctx.strokeStyle = '#1c1614';
      ctx.lineWidth = 1.6;
      ctx.fillRect(fbX, fbY, w * 0.060, 5);
      ctx.strokeRect(fbX, fbY, w * 0.060, 5);
      // Top bevel highlight + stainless support rod
      ctx.fillStyle = '#57534e';
      ctx.fillRect(fbX + 2, fbY + 1, w * 0.056, 1.5);
      ctx.strokeStyle = '#78716c';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(fbX + w * 0.042, fbY - 10);
      ctx.lineTo(fbX + w * 0.048, fbY);
      ctx.stroke();
    }

    // Side Skirts (Matte Carbon Rocker Extension Blended Along Lower Sill)
    if (sideSkirts && sideSkirts !== 'skirts_stock') {
      const skX = Math.round(isRanger ? w * 0.415 : w * 0.392);
      const skY = Math.round((isRanger ? h * 0.708 : h * 0.785) + vibY * 0.5);
      const skW = Math.round(isRanger ? w * 0.250 : w * 0.232);
      ctx.fillStyle = 'rgba(12, 10, 9, 0.45)';
      ctx.fillRect(skX + 2, skY + 5, skW, 4);
      ctx.fillStyle = '#292524';
      ctx.strokeStyle = '#1c1614';
      ctx.lineWidth = 1.5;
      ctx.fillRect(skX, skY, skW, 5);
      ctx.strokeRect(skX, skY, skW, 5);
      ctx.fillStyle = '#57534e';
      ctx.fillRect(skX + 2, skY + 1, skW - 4, 1.5);
    }

    // Rear Wing / Spoiler / Drag Parachute (Blended Matte Carbon & Anodized Brackets)
    if (rearWing && rearWing !== 'wing_none') {
      const rwY = Math.round((isRanger ? h * 0.442 : h * 0.474) + vibY * 0.5);
      if (rearWing === 'wing_gt_carbon' || rearWing === 'wing_formula_drs') {
        // Aluminum swan-neck pylons
        ctx.fillStyle = '#292524';
        ctx.strokeStyle = '#1c1614';
        ctx.lineWidth = 1.6;
        ctx.fillRect(w * 0.205, rwY + 6, 5, h * 0.062);
        ctx.strokeRect(w * 0.205, rwY + 6, 5, h * 0.062);
        ctx.fillRect(w * 0.228, rwY + 10, 5, h * 0.055);
        ctx.strokeRect(w * 0.228, rwY + 10, 5, h * 0.055);
        // Main carbon wing blade
        ctx.fillStyle = '#292524';
        ctx.fillRect(w * 0.175, rwY, w * 0.072, 7);
        ctx.strokeRect(w * 0.175, rwY, w * 0.072, 7);
        ctx.fillStyle = '#57534e';
        ctx.fillRect(w * 0.177, rwY + 1, w * 0.068, 2);
        // Endplate with subtle dark crimson/bronze accent
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(w * 0.172, rwY - 5, 9, 22);
        ctx.strokeRect(w * 0.172, rwY - 5, 9, 22);
        ctx.fillStyle = rearWing === 'wing_formula_drs' ? '#b45309' : '#475569';
        ctx.fillRect(w * 0.174, rwY - 3, 5, 3);
      } else if (rearWing === 'wing_drag_chute') {
        const dlY = Math.round((isRanger ? h * 0.505 : h * 0.525) + vibY * 0.5);
        ctx.fillStyle = '#292524';
        ctx.strokeStyle = '#1c1614';
        ctx.lineWidth = 1.6;
        ctx.fillRect(w * 0.168, dlY, w * 0.060, 6);
        ctx.strokeRect(w * 0.168, dlY, w * 0.060, 6);
        // Weathered canvas parachute pack & mount frame at rear bumper
        const chY = Math.round((isRanger ? h * 0.635 : h * 0.685) + vibY * 0.5);
        ctx.fillStyle = '#292524';
        ctx.fillRect(w * 0.154, chY, 20, 22);
        ctx.strokeRect(w * 0.154, chY, 20, 22);
        ctx.fillStyle = '#7f2323';
        ctx.fillRect(w * 0.156, chY + 3, 16, 6);
      }
    }

    // 4. X-Ray Cutaway Mode (Front Engine on Ford Ranger vs Rear Engine on Porsche 911!)
    if (showXRay) {
      ctx.save();
      ctx.fillStyle = 'rgba(15, 12, 10, 0.84)';
      ctx.strokeStyle = '#78716c';
      ctx.lineWidth = 2;
      const xrX = isRanger ? w * 0.648 : w * 0.185;
      const xrY = (isRanger ? h * 0.542 : h * 0.605) + vibY * 0.5;
      const xrW = w * 0.165;
      const xrH = h * 0.145;
      ctx.fillRect(xrX, xrY, xrW, xrH);
      ctx.strokeRect(xrX, xrY, xrW, xrH);

      if (hasEngine) {
        ctx.fillStyle = '#44403c';
        ctx.fillRect(xrX + 16, xrY + 14, xrW - 32, xrH - 24);
        ctx.fillStyle = isRanger ? '#a8a29e' : '#7f2323';
        ctx.fillRect(xrX + 20, xrY + 8, xrW - 40, 10);
        if ((parts.induction || '').includes('turbo')) {
          ctx.fillStyle = '#a16207';
          ctx.beginPath();
          ctx.arc(xrX + (isRanger ? xrW - 18 : 18), xrY + xrH - 14, 8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#d6d3d1';
        ctx.font = 'bold 9px "Share Tech Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(engineId.replace('block_', '').toUpperCase(), xrX + xrW * 0.5, xrY + xrH - 6);
      } else {
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 10px "Share Tech Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('NO ENGINE', xrX + xrW * 0.5, xrY + xrH * 0.55);
      }
      ctx.restore();
    }

    // 5. Live Exhaust Smoke (Black Diesel Soot for Diesel Block!) & Backfire Flames at Rear
    if (effectiveRunning) {
      const exX = w * 0.175;
      const exY = (isRanger ? h * 0.705 : h * 0.752) + vibY;
      const isDiesel = engineId === 'block_diesel_pickup';
      if (Math.random() > 0.30) {
        ctx.fillStyle = isDiesel ? 'rgba(15, 23, 42, 0.58)' : 'rgba(203, 213, 225, 0.32)';
        ctx.beginPath();
        ctx.arc(exX - 8 - Math.random() * 22, exY + (Math.random() - 0.5) * 10, (isDiesel ? 7 : 5) + Math.random() * 9, 0, Math.PI * 2);
        ctx.fill();
      }
      if (isBackfire) {
        this.renderFlame(ctx, exX, exY, Math.PI);
      }
    }

    ctx.restore();
  }

  // --- FORD RANGER 2.5 OPEN CAB (2004) FRONT OPEN ENGINE BAY VIEW (BLENDED PIXEL-ART STYLE) ---
  renderRangerFrontEngineBay(ctx, w, h, carData, options = {}) {
    const {
      isEngineRunning = false,
      rpm = 900,
      maxRpm = 8500,
      throttle = 0,
      boost = 0,
      isBackfire = false,
      isOverheating = false
    } = options;

    const parts = carData.parts || {};
    const engineId = parts.engine_block || 'block_diesel_pickup';
    const hasEngineBlock = Boolean(engineId && engineId !== 'none' && engineId !== 'eng_none');
    const ind = parts.induction || 'ind_turbo_small';
    const cams = parts.head_cams || 'head_stock';
    const ignition = parts.ignition || 'ignition_oem';
    const fuelSys = parts.fuel_system || 'fuel_stock';
    const cooling = parts.cooling || 'cool_oem';
    const intercooler = parts.intercooler || 'ic_street';
    const nitrous = parts.nitrous || 'nos_none';
    const battery = parts.starter_battery || 'starter_oem';

    const effectiveRunning = isEngineRunning && hasEngineBlock;
    const vibFactor = effectiveRunning ? (0.4 + (rpm / Math.max(1000, maxRpm)) * 2.1) : 0;
    const vibX = (Math.random() - 0.5) * vibFactor;
    const vibY = (Math.random() - 0.5) * vibFactor;
    const beltRot = effectiveRunning ? (performance.now() * 0.015 * (rpm / 1000)) : 0;
    const heatFactor = effectiveRunning ? Math.min(1.0, Math.max(0, (rpm - 3800) / Math.max(1000, maxRpm - 3800))) : 0;

    ctx.save();

    // =========================================================================
    // 1. BASE SCENE: FORD RANGER 2.5 OPEN CAB (2004) FRONT OPEN ENGINE BAY PIXEL ART
    // =========================================================================
    if (this.rangerEngineLoaded && this.rangerEngineImg && ctx.drawImage) {
      ctx.drawImage(this.rangerEngineImg, 0, vibY * 0.35, w, h);
    } else {
      // Complete Procedural Pixel-Art Fallback of the 2004 Ford Ranger Front Open Engine Bay
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#1c1614';
      ctx.lineWidth = 3;
      ctx.fillRect(w * 0.27, h * 0.40, w * 0.46, h * 0.54);
      ctx.strokeRect(w * 0.27, h * 0.40, w * 0.46, h * 0.54);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(w * 0.31, h * 0.11, w * 0.38, h * 0.28);
      ctx.strokeRect(w * 0.31, h * 0.11, w * 0.38, h * 0.28);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(w * 0.38, h * 0.70, w * 0.25, h * 0.11);
      ctx.fillStyle = '#1d4ed8';
      ctx.beginPath();
      ctx.ellipse(w * 0.506, h * 0.755, 20, 9, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Exact normalized coordinates inside the Ford Ranger 2.5 Open Cab (2004) Front Engine Bay
    const eX = Math.round(w * 0.504 + vibX);
    const eY = Math.round(h * 0.538 + vibY);
    const radY = Math.round(h * 0.602 + vibY * 0.5);

    // =========================================================================
    // 2. ENGINE BAY CAVITY: EMPTY BAY vs STOCK 2.5L WL-T DIESEL vs SWAPPED ENGINE BLOCKS
    // =========================================================================
    if (!hasEngineBlock) {
      // ❌ NO ENGINE INSTALLED: Feathered Recessed Dark Engine Cavity
      const emptyGrad = ctx.createRadialGradient(eX, eY, 12, eX, eY, 115);
      emptyGrad.addColorStop(0, '#141210');
      emptyGrad.addColorStop(0.75, '#0c0a09');
      emptyGrad.addColorStop(1, 'rgba(12, 10, 9, 0.85)');
      ctx.fillStyle = emptyGrad;
      ctx.beginPath();
      ctx.moveTo(w * 0.405, h * 0.428);
      ctx.lineTo(w * 0.605, h * 0.428);
      ctx.lineTo(w * 0.608, h * 0.592);
      ctx.lineTo(w * 0.402, h * 0.592);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#292524';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Empty Bellhousing Ring
      ctx.strokeStyle = '#44403c';
      ctx.beginPath();
      ctx.arc(eX, eY + 10, 20, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 11px "Chakra Petch", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚠️ ถอดเครื่องยนต์ออกแล้ว (NO ENGINE BLOCK)', eX, eY + 6);
    } else {
      // ✅ ENGINE BLOCK INSTALLED!
      const isSwappedEngine = engineId !== 'block_diesel_pickup';

      if (isSwappedEngine) {
        // Render 3D-Perspective Pixel-Art Swapped Engine strictly inside the Ranger's central longitudinal engine bay!
        // Preserves Top-Mount Intercooler above, Turbo & Airbox on left, and Alternator & Copper Charge Pipe on right!
        this.renderRangerFrontEngineSwap(ctx, w, h, engineId, parts, beltRot, heatFactor, vibX, vibY);
      }

      // =======================================================================
      // 3. SUBTLE LIVE-SPINNING ALTERNATOR ROTOR & LOWER CRANK PULLEY (IN-PLACE!)
      // =======================================================================
      // Sits strictly inside the existing slotted Alternator face (`w * 0.556, h * 0.568`) & lower crank recess (`w * 0.504, h * 0.580`)
      // so the pixel-art valve cover & top-mount intercooler remain 100% clean and uncovered!
      const gearAnodize = cams.includes('stage3') || cams.includes('f1')
        ? '#7f2323'
        : (cams.includes('titanium') ? '#a16207' : (cams.includes('stage2') ? '#234175' : '#57534e'));

      const pCrank = { x: Math.round(w * 0.504 + vibX), y: Math.round(h * 0.580 + vibY), r: 5.5 };
      const pAlt   = { x: Math.round(w * 0.556 + vibX), y: Math.round(h * 0.568 + vibY), r: 6.2 };

      ctx.save();
      ctx.globalAlpha = 0.76;
      // Subtle lower V-belt between Crank & Alternator only
      ctx.strokeStyle = '#141210';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(pCrank.x, pCrank.y - 4);
      ctx.lineTo(pAlt.x, pAlt.y - 5);
      ctx.moveTo(pCrank.x, pCrank.y + 4);
      ctx.lineTo(pAlt.x, pAlt.y + 5);
      ctx.stroke();

      if (effectiveRunning && ctx.setLineDash) {
        ctx.strokeStyle = '#57534e';
        ctx.lineWidth = 1.4;
        ctx.setLineDash([2.5, 2.5]);
        if (typeof ctx.lineDashOffset !== 'undefined') {
          ctx.lineDashOffset = -beltRot * 8;
        }
        ctx.beginPath();
        ctx.moveTo(pCrank.x, pCrank.y - 4);
        ctx.lineTo(pAlt.x, pAlt.y - 5);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      this.drawSpokedPulley(ctx, pCrank.x, pCrank.y, pCrank.r, '#1c1917', '#78716c', beltRot, 5);
      this.drawSpokedPulley(ctx, pAlt.x, pAlt.y, pAlt.r, '#292524', '#a8a29e', -beltRot * 1.45, 6);

      // Only show upgraded vernier cam gear inside front timing window when camshafts are upgraded on stock diesel
      if (!isSwappedEngine && cams !== 'head_stock') {
        this.drawToothedCamGear(ctx, Math.round(w * 0.504 + vibX), Math.round(h * 0.525 + vibY), 5.2, gearAnodize, '#a8a29e', beltRot * 0.65, 10);
      }
      ctx.restore();

      // =======================================================================
      // 4. RECESSED IN-PLACE TURBO IMPELLER & TOP-MOUNT INTERCOOLER GLAZE
      // =======================================================================
      const isTwinOrQuad = ind.includes('twin') || ind.includes('promod') || ind.includes('quad');
      const isBigSingle = ind.includes('massive') || ind.includes('large');
      const impAngle = effectiveRunning ? (performance.now() * 0.055 * (rpm / 1000 + Math.max(0, boost) * 3.5)) : 0;

      if (ind.includes('turbo')) {
        // Recessed inside the existing pixel-art turbo compressor snail (`w * 0.448, h * 0.530`) without covering the snail housing!
        const tX = Math.round(w * 0.448 + vibX);
        const tY = Math.round(h * 0.530 + vibY);
        const throatR = isBigSingle ? 6.2 : 4.8;

        ctx.save();
        ctx.globalAlpha = 0.80;
        if (heatFactor > 0.15) {
          ctx.fillStyle = `rgba(217, 119, 6, ${0.18 + heatFactor * 0.35})`;
          ctx.beginPath();
          ctx.arc(tX, tY, throatR + 4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#141210';
        ctx.beginPath();
        ctx.arc(tX, tY, throatR, 0, Math.PI * 2);
        ctx.fill();
        ctx.translate(tX, tY);
        ctx.rotate(impAngle);
        ctx.strokeStyle = '#a8a29e';
        ctx.lineWidth = 1.2;
        for (let b = 0; b < 6; b++) {
          const a = (b * Math.PI) / 3;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * (throatR - 0.8), Math.sin(a) * (throatR - 0.8));
          ctx.stroke();
        }
        ctx.restore();

        if (isTwinOrQuad) {
          // Secondary compound turbo tucked in the lower-left shadow cavity (`w * 0.442, h * 0.562`)
          this.drawBlendedTurbo(ctx, w * 0.442 + vibX, h * 0.562 + vibY, 6.5, -impAngle * 1.05, heatFactor, '#57534e');
        }
      } else if (ind.includes('supercharger')) {
        // Blended Cast-Aluminum Roots Supercharger Housing mounted in Top-Mount position
        const scX = Math.round(w * 0.466 + vibX);
        const scY = Math.round(h * 0.428 + vibY);
        const scW = Math.round(w * 0.084);
        const scH = Math.round(h * 0.056);
        ctx.fillStyle = 'rgba(12, 10, 9, 0.55)';
        ctx.fillRect(scX + 2, scY + 3, scW, scH);
        ctx.fillStyle = '#78716c';
        ctx.strokeStyle = '#1c1614';
        ctx.lineWidth = 1.8;
        ctx.fillRect(scX, scY, scW, scH);
        ctx.strokeRect(scX, scY, scW, scH);
        // Cast Cooling Ribs along Supercharger Case
        ctx.strokeStyle = '#44403c';
        ctx.lineWidth = 1.2;
        for (let ry = scY + 5; ry < scY + scH - 3; ry += 4) {
          ctx.beginPath();
          ctx.moveTo(scX + 4, ry);
          ctx.lineTo(scX + scW - 4, ry);
          ctx.stroke();
        }
        // Dark Crimson 3-Butterfly Blower Hat on Top
        ctx.fillStyle = '#7f2323';
        ctx.fillRect(scX + 8, scY - 9, scW - 16, 9);
        ctx.strokeRect(scX + 8, scY - 9, scW - 16, 9);
      }

      // Top-Mount Intercooler (`x: 0.472 * w, y: 0.428 * h, w: 0.076 * w, h: 0.056 * h`)
      const tmicX = Math.round(w * 0.472 + vibX);
      const tmicY = Math.round(h * 0.428 + vibY);
      const tmicW = Math.round(w * 0.076);
      const tmicH = Math.round(h * 0.056);

      if (intercooler === 'ic_none' && !ind.includes('supercharger')) {
        // Recessed dark valve cover cavity when top-mount intercooler is removed
        ctx.fillStyle = '#1c1917';
        ctx.strokeStyle = '#141210';
        ctx.lineWidth = 1.6;
        ctx.fillRect(tmicX, tmicY, tmicW, tmicH);
        ctx.strokeRect(tmicX, tmicY, tmicW, tmicH);
      } else if (intercooler !== 'ic_street' && !ind.includes('supercharger')) {
        // Blended Anodized Gold / Cryo-Blue Top-Mount Intercooler Glaze (Preserves underlying pixel art!)
        const isCryoIC = intercooler.includes('nitrogen') || intercooler.includes('ice');
        ctx.save();
        ctx.fillStyle = isCryoIC ? 'rgba(56, 189, 248, 0.28)' : 'rgba(217, 119, 6, 0.32)';
        ctx.fillRect(tmicX + 3, tmicY + 3, tmicW - 6, tmicH - 6);
        ctx.strokeStyle = '#1c1614';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(tmicX + 2, tmicY + 2, tmicW - 4, tmicH - 4);
        // Subtle horizontal pixel core fins
        ctx.strokeStyle = isCryoIC ? 'rgba(186, 230, 253, 0.45)' : 'rgba(253, 224, 71, 0.40)';
        ctx.lineWidth = 1;
        for (let fy = tmicY + 6; fy < tmicY + tmicH - 4; fy += 4) {
          ctx.beginPath();
          ctx.moveTo(tmicX + 5, fy);
          ctx.lineTo(tmicX + tmicW - 5, fy);
          ctx.stroke();
        }
        // Left & Right Silicone Charge Pipe Couplers (#234175 / #7f2323)
        ctx.fillStyle = isCryoIC ? '#234175' : '#7f2323';
        ctx.strokeStyle = '#1c1614';
        ctx.fillRect(tmicX - 9, tmicY + 8, 7, 10);
        ctx.strokeRect(tmicX - 9, tmicY + 8, 7, 10);
        ctx.fillRect(tmicX + tmicW + 2, tmicY + 8, 7, 10);
        ctx.strokeRect(tmicX + tmicW + 2, tmicY + 8, 7, 10);
        ctx.restore();
      }

      // 5. BLENDED FRONT RADIATOR TOP TANK & CAP (`y = 0.602 * h`)
      if (cooling === 'cool_none') {
        ctx.fillStyle = '#141210';
        ctx.fillRect(w * 0.415, radY - 4, w * 0.18, 10);
      } else if (cooling !== 'cool_oem') {
        const isCopper = cooling.includes('copper');
        const isCryo = cooling.includes('cryogenic');
        ctx.save();
        ctx.fillStyle = isCopper ? 'rgba(180, 83, 9, 0.42)' : (isCryo ? 'rgba(37, 99, 235, 0.35)' : 'rgba(203, 213, 225, 0.32)');
        ctx.fillRect(w * 0.418, radY - 3, w * 0.175, 7);
        ctx.strokeStyle = '#1c1614';
        ctx.lineWidth = 1.4;
        ctx.strokeRect(w * 0.418, radY - 3, w * 0.175, 7);
        // Billet Radiator Pressure Cap
        ctx.fillStyle = '#7f2323';
        ctx.beginPath();
        ctx.arc(w * 0.506 + vibX * 0.5, radY, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // 6. BLENDED BATTERY ON RIGHT FENDER (`x = 0.622..0.692 * w, y = 0.562..0.624 * h`)
      if (battery === 'starter_none') {
        ctx.fillStyle = '#141210';
        ctx.fillRect(w * 0.622, h * 0.560, w * 0.070, h * 0.064);
      } else if (battery !== 'starter_oem') {
        ctx.save();
        ctx.fillStyle = battery.includes('supercap') ? 'rgba(22, 163, 74, 0.25)' : 'rgba(202, 138, 4, 0.25)';
        ctx.fillRect(w * 0.624, h * 0.564, w * 0.066, h * 0.056);
        ctx.strokeStyle = '#1c1614';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(w * 0.624, h * 0.564, w * 0.066, h * 0.056);
        ctx.restore();
      }

      // 7. BLENDED BILLET FUEL RAIL & BRAIDED NITROUS SOLENOIDS
      if (fuelSys !== 'fuel_none' && fuelSys !== 'fuel_stock') {
        const isRaceFuel = fuelSys.includes('twin') || fuelSys.includes('quad') || fuelSys.includes('f1');
        ctx.fillStyle = isRaceFuel ? '#581c87' : '#7f2323';
        ctx.strokeStyle = '#1c1614';
        ctx.lineWidth = 1.3;
        ctx.fillRect(eX - 20, eY - 12, 5, 28);
        ctx.strokeRect(eX - 20, eY - 12, 5, 28);
      }

      if (nitrous && nitrous !== 'nos_none') {
        // Anodized NOS & Fuel Solenoids mounted on inner fender with braided line to intake
        const nosX = Math.round(w * 0.402 + vibX * 0.5);
        const nosY = Math.round(h * 0.482 + vibY * 0.5);
        ctx.strokeStyle = '#44403c';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(nosX + 10, nosY + 5);
        ctx.lineTo(tmicX + 4, tmicY + 18);
        ctx.stroke();

        ctx.fillStyle = '#234175';
        ctx.strokeStyle = '#1c1614';
        ctx.lineWidth = 1.3;
        ctx.fillRect(nosX, nosY, 7, 11);
        ctx.strokeRect(nosX, nosY, 7, 11);

        ctx.fillStyle = '#7f2323';
        ctx.fillRect(nosX + 9, nosY, 7, 11);
        ctx.strokeRect(nosX + 9, nosY, 7, 11);

        if (effectiveRunning && (rpm > 4500 || boost > 0.7)) {
          ctx.fillStyle = 'rgba(224, 242, 254, 0.65)';
          ctx.beginPath();
          ctx.arc(w * 0.34, h * 0.39, 14 + Math.random() * 8, 0, Math.PI * 2);
          ctx.arc(w * 0.66, h * 0.39, 14 + Math.random() * 8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Overheating Steam Effect from Front Radiator
    if (isOverheating) {
      ctx.fillStyle = 'rgba(226, 232, 240, 0.52)';
      for (let s = 0; s < 5; s++) {
        ctx.beginPath();
        ctx.arc(w * 0.42 + s * 28, h * 0.55 - (performance.now() * 0.05 + s * 20) % 85, 14 + s * 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Live Telemetry HUD Badge in Top-Right Corner
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(w - 224, 10, 212, 52);
    ctx.strokeStyle = effectiveRunning ? '#22c55e' : '#64748b';
    ctx.lineWidth = 2;
    ctx.strokeRect(w - 224, 10, 212, 52);

    ctx.fillStyle = effectiveRunning ? '#22c55e' : '#94a3b8';
    ctx.font = 'bold 11px "Share Tech Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(
      !hasEngineBlock
        ? '✖ NO ENGINE INSTALLED'
        : (effectiveRunning ? '● ENGINE: RUNNING (LIVE)' : '○ ENGINE: OFF (STANDBY)'),
      w - 214,
      26
    );

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 13px "Chakra Petch", sans-serif';
    ctx.fillText(`${effectiveRunning ? Math.round(rpm) : 0} RPM`, w - 214, 42);

    if (effectiveRunning && boost > 0) {
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`BOOST: ${boost.toFixed(2)} Bar`, w - 214, 56);
    } else {
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`SPEC: ${engineId.replace('block_', '').toUpperCase()}`, w - 214, 56);
    }

    ctx.restore();
  }

  // --- CUSTOM 3D-PERSPECTIVE PIXEL-ART ENGINE SWAP FOR FORD RANGER (2004) FRONT BAY ---
  renderRangerFrontEngineSwap(ctx, w, h, engineId, parts, beltRot, heatFactor, vibX, vibY) {
    const cams = parts.head_cams || 'head_stock';
    const ign = parts.ignition || 'ignition_oem';

    // Exact bounds of the central longitudinal engine block cavity in ranger_engine.jpg
    // Sitting strictly below the Top-Mount Intercooler (y: 0.488..0.588 * h) and between Left Turbo (0.472 * w) & Right Alternator (0.536 * w)
    const cX = Math.round(w * 0.505 + vibX);
    const topY = Math.round(h * 0.489 + vibY);
    const botY = Math.round(h * 0.586 + vibY);
    const bH = botY - topY;
    const topHalfW = Math.round(w * 0.025); // Perspective narrower near firewall/intercooler
    const botHalfW = Math.round(w * 0.031); // Perspective wider near front radiator

    const gearAnodize = cams.includes('stage3') || cams.includes('f1')
      ? '#7f2323'
      : (cams.includes('titanium') ? '#a16207' : (cams.includes('stage2') ? '#234175' : '#57534e'));

    const coilColor = ign.includes('plasma')
      ? '#234175'
      : (ign.includes('cdi') ? '#7f2323' : (ign.includes('f1') ? '#0e7490' : '#3f3f46'));

    ctx.save();

    // 1. Soft Recessed Shadow Cavity (Preserves Top-Mount Intercooler above, Turbo on left, Alternator on right!)
    const recessGrad = ctx.createLinearGradient(cX, topY, cX, botY);
    recessGrad.addColorStop(0, 'rgba(15, 13, 12, 0.92)');
    recessGrad.addColorStop(0.5, 'rgba(24, 21, 19, 0.95)');
    recessGrad.addColorStop(1, 'rgba(15, 13, 12, 0.90)');
    ctx.fillStyle = recessGrad;
    ctx.beginPath();
    ctx.moveTo(cX - topHalfW - 2, topY);
    ctx.lineTo(cX + topHalfW + 2, topY);
    ctx.lineTo(cX + botHalfW + 3, botY);
    ctx.lineTo(cX - botHalfW - 3, botY);
    ctx.closePath();
    ctx.fill();

    // Helper for 3D perspective trapezoidal valve cover / block bank
    const drawPerspectiveBank = (topL, topR, botL, botR, y1, y2, baseCol, hiCol, edgeCol = '#1c1614') => {
      const grad = ctx.createLinearGradient(topL, y1, botR, y2);
      grad.addColorStop(0, hiCol);
      grad.addColorStop(0.45, baseCol);
      grad.addColorStop(1, '#1c1917');
      ctx.fillStyle = grad;
      ctx.strokeStyle = edgeCol;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(topL, y1);
      ctx.lineTo(topR, y1);
      ctx.lineTo(botR, y2);
      ctx.lineTo(botL, y2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Top pixel-art specular highlight rim
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.28)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(topL + 1.5, y1 + 1.5);
      ctx.lineTo(topR - 1.5, y1 + 1.5);
      ctx.stroke();
    };

    if (engineId === 'block_i6_2jz' || engineId === 'block_i4_vtec') {
      // Longitudinal DOHC Inline-6 (2JZ-GTE) or Inline-4 (VTEC) tucked under Ranger Top-Mount Intercooler
      const is2JZ = engineId === 'block_i6_2jz';
      const coverBase = is2JZ ? '#273549' : '#7f2323';
      const coverHi = is2JZ ? '#475569' : '#991b1b';
      const cylCount = is2JZ ? 6 : 4;

      // Left & Right Perspective Twin-Cam Towers
      drawPerspectiveBank(cX - topHalfW, cX - 4, cX - botHalfW, cX - 5, topY + 2, botY - 10, coverBase, coverHi);
      drawPerspectiveBank(cX + 4, cX + topHalfW, cX + 5, cX + botHalfW, topY + 2, botY - 10, coverBase, coverHi);

      // Center Recessed Spark Plug Valley & Individual Ignition Coils
      ctx.fillStyle = '#141210';
      ctx.fillRect(cX - 4, topY + 3, 8, bH - 14);
      ctx.fillStyle = coilColor;
      const stepY = (bH - 18) / cylCount;
      for (let i = 0; i < cylCount; i++) {
        ctx.fillRect(cX - 3, Math.round(topY + 5 + i * stepY), 6, 2.5);
      }

      // Cast-Aluminum Lower Timing Chest & Exposed Twin Vernier Cam Gears at Front
      drawPerspectiveBank(cX - botHalfW + 2, cX + botHalfW - 2, cX - botHalfW + 3, cX + botHalfW - 3, botY - 11, botY - 1, '#292524', '#44403c');
      this.drawToothedCamGear(ctx, cX - 8, botY - 11, 5.2, gearAnodize, '#a8a29e', beltRot * 0.7, 10);
      this.drawToothedCamGear(ctx, cX + 8, botY - 11, 5.2, gearAnodize, '#a8a29e', -beltRot * 0.7, 10);
    } else if (engineId === 'block_v8_big' || engineId === 'block_nascar_v8') {
      // V8 Big-Block / NASCAR V8: Angled Left & Right Cylinder Heads + Center Finned Intake Valley
      const isNascar = engineId === 'block_nascar_v8';
      const bankBase = isNascar ? '#7c2d12' : '#44403c';
      const bankHi = isNascar ? '#9a3412' : '#78716c';

      // Left & Right Angled V8 Valve Covers
      drawPerspectiveBank(cX - topHalfW - 2, cX - 8, cX - botHalfW - 2, cX - 10, topY + 3, botY - 6, bankBase, bankHi);
      drawPerspectiveBank(cX + 8, cX + topHalfW + 2, cX + 10, cX + botHalfW + 2, topY + 3, botY - 6, bankBase, bankHi);

      // Center Cross-Ram Intake Plenum
      drawPerspectiveBank(cX - 8, cX + 8, cX - 10, cX + 10, topY + 2, botY - 6, '#292524', '#57534e');

      // 4 Intake Runners & Coils per Bank
      ctx.fillStyle = '#78716c';
      for (let i = 0; i < 4; i++) {
        const ry = Math.round(topY + 6 + i * ((bH - 16) / 4));
        ctx.fillRect(cX - 9, ry, 18, 2);
        ctx.fillStyle = coilColor;
        ctx.fillRect(cX - botHalfW + 2, ry, 5, 2.5);
        ctx.fillRect(cX + botHalfW - 7, ry, 5, 2.5);
        ctx.fillStyle = '#78716c';
      }
      this.drawSpokedPulley(ctx, cX, botY - 6, 5.8, '#1c1917', '#a8a29e', beltRot, 5);
    } else if (engineId === 'block_v10_gt3' || engineId === 'block_v12_quad_turbo') {
      // V10 GT3 / V12 Hypercar: Carbon-Kevlar V-Banks + Brass Individual Velocity Stacks
      const pairs = engineId === 'block_v12_quad_turbo' ? 6 : 5;
      drawPerspectiveBank(cX - topHalfW - 1, cX - 7, cX - botHalfW - 1, cX - 9, topY + 2, botY - 7, '#27272a', '#52525b');
      drawPerspectiveBank(cX + 7, cX + topHalfW + 1, cX + 9, cX + botHalfW + 1, topY + 2, botY - 7, '#27272a', '#52525b');
      drawPerspectiveBank(cX - 7, cX + 7, cX - 9, cX + 9, topY + 3, botY - 7, '#18181b', '#292524');

      const stepY = (bH - 14) / pairs;
      for (let i = 0; i < pairs; i++) {
        const sy = Math.round(topY + 5 + i * stepY);
        ctx.fillStyle = '#a16207';
        ctx.fillRect(cX - 7, sy, 4, 2.5);
        ctx.fillRect(cX + 3, sy, 4, 2.5);
        ctx.fillStyle = '#71717a';
        ctx.fillRect(cX - botHalfW + 3, sy, 8, 2);
        ctx.fillRect(cX + botHalfW - 11, sy, 8, 2);
      }
      this.drawToothedCamGear(ctx, cX - 8, botY - 7, 4.8, gearAnodize, '#d4d4d8', beltRot * 0.8, 10);
      this.drawToothedCamGear(ctx, cX + 8, botY - 7, 4.8, gearAnodize, '#d4d4d8', -beltRot * 0.8, 10);
    } else {
      // V6 Twin-Turbo (block_v6_tt) or F1 Hybrid V6 (block_f1_hybrid_v6)
      const isF1 = engineId === 'block_f1_hybrid_v6';
      drawPerspectiveBank(cX - topHalfW, cX + topHalfW, cX - botHalfW, cX + botHalfW, topY + 2, botY - 8, isF1 ? '#1c1917' : '#334155', isF1 ? '#44403c' : '#64748b');
      // 3-per-side Cast Runners
      for (let i = 0; i < 3; i++) {
        const ry = Math.round(topY + 7 + i * 9);
        ctx.fillStyle = isF1 ? '#b45309' : '#94a3b8';
        ctx.fillRect(cX - topHalfW + 3, ry, topHalfW * 2 - 6, 3);
      }
      this.drawToothedCamGear(ctx, cX, botY - 7, 5.5, gearAnodize, '#d4d4d8', beltRot, 12);
    }

    ctx.restore();
  }
  renderPorscheRearEngineSwap(ctx, w, h, engineId, parts, beltRot, heatFactor, vibX, vibY) {
    const cams = parts.head_cams || 'head_stock';
    const ign = parts.ignition || 'ignition_oem';

    // Exact bounds of the upper center plenum window in porsche_engine.jpg (above the `turbo S` front badge plate!)
    // Preserves the Porsche's outer 3D molded titanium/gunmetal side bolsters AND the lower `turbo S` badge plate (y: 0.498..0.520 * h)
    const cX = Math.round(w * 0.501 + vibX);
    const topY = Math.round(h * 0.440 + vibY);
    const botY = Math.round(h * 0.496 + vibY);
    const pH = botY - topY;
    const topHalfW = Math.round(w * 0.038); // Perspective narrower near upper fans
    const botHalfW = Math.round(w * 0.043); // Perspective wider near lower `turbo S` badge

    const gearAnodize = cams.includes('stage3') || cams.includes('f1')
      ? '#7f2323'
      : (cams.includes('titanium') ? '#a16207' : (cams.includes('stage2') ? '#234175' : '#52525b'));

    const coilColor = ign.includes('plasma')
      ? '#234175'
      : (ign.includes('cdi') ? '#7f2323' : (ign.includes('f1') ? '#0e7490' : '#3f3f46'));

    ctx.save();

    // 1. 3D Recessed Engine Window inside the Porsche Plenum Frame (Preserves outer bolsters & `turbo S` badge!)
    const cavGrad = ctx.createLinearGradient(cX, topY, cX, botY);
    cavGrad.addColorStop(0, '#0f1217');
    cavGrad.addColorStop(0.5, '#181c24');
    cavGrad.addColorStop(1, '#0f1217');
    ctx.fillStyle = cavGrad;
    ctx.strokeStyle = '#272c35';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(cX - topHalfW, topY);
    ctx.lineTo(cX + topHalfW, topY);
    ctx.lineTo(cX + botHalfW, botY);
    ctx.lineTo(cX - botHalfW, botY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Helper for 3D perspective trapezoidal bank inside the Porsche rear engine window
    const drawPerspectiveBank = (topL, topR, botL, botR, y1, y2, baseCol, hiCol) => {
      const grad = ctx.createLinearGradient(topL, y1, botR, y2);
      grad.addColorStop(0, hiCol);
      grad.addColorStop(0.45, baseCol);
      grad.addColorStop(1, '#14171f');
      ctx.fillStyle = grad;
      ctx.strokeStyle = '#141210';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(topL, y1);
      ctx.lineTo(topR, y1);
      ctx.lineTo(botR, y2);
      ctx.lineTo(botL, y2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = 'rgba(226, 232, 240, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(topL + 1.5, y1 + 1.2);
      ctx.lineTo(topR - 1.5, y1 + 1.2);
      ctx.stroke();
    };

    // 2. Engine-Specific 3D Perspective Pixel-Art Architecture
    if (engineId === 'block_i6_2jz') {
      // 2JZ-GTE Inline-6: Left Cast-Aluminum Intake Plenum + 6 Runners + Right Twin-Cam Valve Cover
      drawPerspectiveBank(cX - topHalfW + 3, cX - 12, cX - botHalfW + 3, cX - 14, topY + 2, botY - 2, '#475569', '#64748b');
      for (let r = 0; r < 6; r++) {
        const ry = Math.round(topY + 3.5 + r * ((pH - 7) / 6));
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(cX - 13, ry, 10, 2);
      }
      drawPerspectiveBank(cX - 4, cX + topHalfW - 3, cX - 5, cX + botHalfW - 3, topY + 2, botY - 2, '#1e293b', '#334155');
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cX + 6, topY + 3, 8, pH - 6);
      ctx.fillStyle = coilColor;
      for (let c = 0; c < 6; c++) {
        ctx.fillRect(cX + 7, Math.round(topY + 4 + c * ((pH - 8) / 6)), 6, 2);
      }
      this.drawToothedCamGear(ctx, cX + 3, botY - 5, 4.2, gearAnodize, '#cbd5e1', beltRot * 0.7, 10);
      this.drawToothedCamGear(ctx, cX + 17, botY - 5, 4.2, gearAnodize, '#cbd5e1', -beltRot * 0.7, 10);
    } else if (engineId === 'block_v8_big' || engineId === 'block_nascar_v8') {
      // V8 Swap: Angled Left & Right Perspective Cylinder Heads + Center Cross-Ram Intake Valley
      const isNascar = engineId === 'block_nascar_v8';
      const vcBase = isNascar ? '#7c2d12' : '#334155';
      const vcHi = isNascar ? '#9a3412' : '#64748b';
      drawPerspectiveBank(cX - topHalfW + 2, cX - 13, cX - botHalfW + 2, cX - 15, topY + 2, botY - 2, vcBase, vcHi);
      drawPerspectiveBank(cX + 13, cX + topHalfW - 2, cX + 15, cX + botHalfW - 2, topY + 2, botY - 2, vcBase, vcHi);
      drawPerspectiveBank(cX - 12, cX + 12, cX - 14, cX + 14, topY + 2, botY - 2, '#1e293b', '#475569');
      for (let i = 0; i < 4; i++) {
        const ry = Math.round(topY + 4 + i * ((pH - 8) / 4));
        ctx.fillStyle = '#64748b';
        ctx.fillRect(cX - 12, ry, 24, 2);
        ctx.fillStyle = coilColor;
        ctx.fillRect(cX - topHalfW + 5, ry, 10, 2);
        ctx.fillRect(cX + topHalfW - 15, ry, 10, 2);
      }
      this.drawSpokedPulley(ctx, cX, botY - 5, 4.6, '#18181b', '#cbd5e1', beltRot, 5);
    } else if (engineId === 'block_v10_gt3' || engineId === 'block_v12_quad_turbo') {
      // V10 GT3 / V12 Quad-Turbo: Motorsport Carbon V-Banks + Brass Individual Velocity Stacks
      const pairs = engineId === 'block_v12_quad_turbo' ? 6 : 5;
      drawPerspectiveBank(cX - topHalfW + 2, cX - 10, cX - botHalfW + 2, cX - 12, topY + 2, botY - 2, '#1f2937', '#374151');
      drawPerspectiveBank(cX + 10, cX + topHalfW - 2, cX + 12, cX + botHalfW - 2, topY + 2, botY - 2, '#1f2937', '#374151');
      drawPerspectiveBank(cX - 10, cX + 10, cX - 12, cX + 12, topY + 2, botY - 2, '#111827', '#1f2937');
      const stepY = (pH - 7) / pairs;
      for (let i = 0; i < pairs; i++) {
        const ry = Math.round(topY + 3.5 + i * stepY);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(cX - topHalfW + 5, ry, 14, 2);
        ctx.fillRect(cX + topHalfW - 19, ry, 14, 2);
        ctx.fillStyle = '#a16207';
        ctx.fillRect(cX - 9, ry, 3, 2);
        ctx.fillRect(cX + 6, ry, 3, 2);
      }
      this.drawToothedCamGear(ctx, cX - 6, botY - 5, 4.0, gearAnodize, '#d4d4d8', beltRot * 0.8, 10);
      this.drawToothedCamGear(ctx, cX + 6, botY - 5, 4.0, gearAnodize, '#d4d4d8', -beltRot * 0.8, 10);
    } else if (engineId === 'block_f1_hybrid_v6') {
      // F1 1.6L E-Turbo Hybrid V6: Molded Carbon Plenum + MGU-H Orange Hybrid Busbars
      drawPerspectiveBank(cX - topHalfW + 3, cX + topHalfW - 3, cX - botHalfW + 3, cX + botHalfW - 3, topY + 2, botY - 2, '#18181b', '#27272a');
      ctx.strokeStyle = '#c2410c';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(cX - botHalfW + 8, botY - 3);
      ctx.lineTo(cX - 6, topY + 4);
      ctx.moveTo(cX + botHalfW - 8, botY - 3);
      ctx.lineTo(cX + 6, topY + 4);
      ctx.stroke();
      this.drawToothedCamGear(ctx, cX, topY + pH * 0.5, 5.0, '#a16207', '#e4e4e7', beltRot * 1.4, 12);
    } else {
      // V6 Twin-Turbo (block_v6_tt) or Commonrail Diesel (block_diesel_pickup): Dual-Bank Cast Collector
      const isDiesel = engineId === 'block_diesel_pickup';
      drawPerspectiveBank(cX - topHalfW + 3, cX - 3, cX - botHalfW + 3, cX - 4, topY + 2, botY - 2, isDiesel ? '#292524' : '#334155', isDiesel ? '#44403c' : '#64748b');
      drawPerspectiveBank(cX + 3, cX + topHalfW - 3, cX + 4, cX + botHalfW - 3, topY + 2, botY - 2, isDiesel ? '#292524' : '#334155', isDiesel ? '#44403c' : '#64748b');
      ctx.fillStyle = isDiesel ? '#a16207' : coilColor;
      for (let i = 0; i < 3; i++) {
        const ry = Math.round(topY + 5 + i * 6.5);
        ctx.fillRect(cX - topHalfW + 7, ry, 16, 2);
        ctx.fillRect(cX + topHalfW - 23, ry, 16, 2);
      }
      this.drawToothedCamGear(ctx, cX, botY - 5, 4.4, gearAnodize, '#d4d4d8', beltRot * 0.7, 10);
    }

    ctx.restore();
  }

  // --- PORSCHE 911 TURBO S (992) & FORD RANGER (2004) OPEN ENGINE BAY DISPATCHER ---
  renderFrontEngineBay(ctx, w, h, carData, options = {}) {
    if (this.isFordRanger(carData)) {
      this.renderRangerFrontEngineBay(ctx, w, h, carData, options);
      return;
    }

    const {
      isEngineRunning = false,
      rpm = 900,
      maxRpm = 8500,
      throttle = 0,
      boost = 0,
      isBackfire = false,
      isOverheating = false
    } = options;

    const parts = carData.parts || {};
    const engineId = parts.engine_block || 'block_i4_vtec';
    const hasEngineBlock = Boolean(engineId && engineId !== 'none' && engineId !== 'eng_none');
    const ind = parts.induction || 'ind_na';
    const cams = parts.head_cams || 'head_stock';
    const ignition = parts.ignition || 'ignition_oem';
    const fuelSys = parts.fuel_system || 'fuel_stock';
    const cooling = parts.cooling || 'cool_oem';
    const intercooler = parts.intercooler || 'ic_none';
    const nitrous = parts.nitrous || 'nos_none';
    const battery = parts.starter_battery || 'starter_oem';

    const effectiveRunning = isEngineRunning && hasEngineBlock;
    const vibFactor = effectiveRunning ? (0.35 + (rpm / Math.max(1000, maxRpm)) * 1.8) : 0;
    const vibX = (Math.random() - 0.5) * vibFactor;
    const vibY = (Math.random() - 0.5) * vibFactor;
    const beltRot = effectiveRunning ? (performance.now() * 0.015 * (rpm / 1000)) : 0;
    const heatFactor = effectiveRunning ? Math.min(1.0, Math.max(0, (rpm - 4200) / Math.max(1000, maxRpm - 4200))) : 0;

    ctx.save();

    // =========================================================================
    // 1. BASE SCENE: PORSCHE 911 TURBO S REAR OPEN ENGINE BAY PIXEL ART
    // =========================================================================
    if (this.porscheEngineLoaded && this.porscheEngineImg && ctx.drawImage) {
      ctx.drawImage(this.porscheEngineImg, 0, vibY * 0.35, w, h);
    } else {
      // Complete Procedural Pixel-Art Fallback of the Porsche 911 Turbo S Rear Open Engine Bay
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#64748b';
      ctx.strokeStyle = '#1c1614';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(w * 0.28, h * 0.32);
      ctx.lineTo(w * 0.72, h * 0.32);
      ctx.lineTo(w * 0.78, h * 0.65);
      ctx.lineTo(w * 0.76, h * 0.96);
      ctx.lineTo(w * 0.24, h * 0.96);
      ctx.lineTo(w * 0.22, h * 0.65);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#475569';
      ctx.fillRect(w * 0.30, h * 0.04, w * 0.40, h * 0.28);
      ctx.strokeRect(w * 0.30, h * 0.04, w * 0.40, h * 0.28);

      ctx.fillStyle = '#dc2626';
      ctx.fillRect(w * 0.27, h * 0.66, w * 0.46, 12);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 11px "Share Tech Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('P  O  R  S  C  H  E', w * 0.5, h * 0.715);
      ctx.font = 'italic bold 12px "Chakra Petch", sans-serif';
      ctx.fillStyle = '#090d16';
      ctx.fillText('911 turbo S', w * 0.5, h * 0.755);

      ctx.fillStyle = '#090d16';
      ctx.fillRect(w * 0.28, h * 0.88, w * 0.44, h * 0.10);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(w * 0.365, h * 0.942, 22, 12, 0, 0, Math.PI * 2);
      ctx.ellipse(w * 0.633, h * 0.942, 22, 12, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Exact Pixel Coordinates in porsche_engine.jpg (scaled to w x h)
    const eX = Math.round(w * 0.501 + vibX);
    const eY = Math.round(h * 0.476 + vibY);
    const leftFanX = Math.round(w * 0.456 + vibX * 0.4);
    const rightFanX = Math.round(w * 0.545 + vibX * 0.4);
    const fanY = Math.round(h * 0.381 + vibY * 0.4);
    const fanR = Math.round(w * 0.027);
    const strutY = Math.round(h * 0.528 + vibY);

    // =========================================================================
    // 2. DUAL UPPER ELECTRIC COOLING FANS (BLENDED INSIDE EXISTING DECKLID SHROUD!)
    // =========================================================================
    if (cooling === 'cool_none') {
      ctx.fillStyle = '#141210';
      ctx.beginPath();
      ctx.arc(leftFanX, fanY, fanR, 0, Math.PI * 2);
      ctx.arc(rightFanX, fanY, fanR, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Only animate fan blades when running or when cooling is upgraded so the original pixel-art shroud stays crisp!
      if (effectiveRunning) {
        const fanSpeedAngle = performance.now() * 0.018 * (1 + rpm / 3500);
        this.drawCoolingFan(ctx, leftFanX, fanY, fanR, fanSpeedAngle);
        this.drawCoolingFan(ctx, rightFanX, fanY, fanR, -fanSpeedAngle * 1.04);
      }
      if (cooling !== 'cool_oem') {
        const isCopperCool = cooling.includes('copper');
        const isCryoCool = cooling.includes('cryogenic');
        ctx.strokeStyle = isCopperCool ? 'rgba(180, 83, 9, 0.55)' : (isCryoCool ? 'rgba(56, 189, 248, 0.45)' : 'rgba(168, 162, 158, 0.45)');
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(leftFanX, fanY, fanR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(rightFanX, fanY, fanR, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // =========================================================================
    // 3. REAR ENGINE BAY CAVITY: EMPTY BAY vs STOCK vs SWAPPED ENGINE BLOCKS
    // =========================================================================
    if (!hasEngineBlock) {
      // ❌ NO ENGINE INSTALLED: Feathered Recessed Dark Rear Engine Cavity
      const emptyGrad = ctx.createRadialGradient(eX, eY + 25, 15, eX, eY + 25, 125);
      emptyGrad.addColorStop(0, '#141210');
      emptyGrad.addColorStop(0.75, '#0c0a09');
      emptyGrad.addColorStop(1, 'rgba(12, 10, 9, 0.90)');
      ctx.fillStyle = emptyGrad;
      ctx.beginPath();
      ctx.moveTo(w * 0.372, h * 0.434);
      ctx.lineTo(w * 0.630, h * 0.434);
      ctx.lineTo(w * 0.648, h * 0.658);
      ctx.lineTo(w * 0.352, h * 0.658);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#292524';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.strokeStyle = '#44403c';
      ctx.beginPath();
      ctx.arc(eX, eY + 18, 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 11px "Chakra Petch", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚠️ ถอดเครื่องยนต์ออกแล้ว (NO ENGINE BLOCK)', eX, eY + 20);
    } else {
      // ✅ ENGINE BLOCK INSTALLED!
      const isSwappedEngine = engineId !== 'block_i4_vtec';

      if (isSwappedEngine) {
        // Render Custom Pixel-Art Swapped Engine neatly inside the Upper Plenum Bay (Preserves Strut Bar, Airboxes & Y-Pipes!)
        this.renderPorscheRearEngineSwap(ctx, w, h, engineId, parts, beltRot, heatFactor, vibX, vibY);
      } else {
        // =====================================================================
        // 4. STOCK PORSCHE 911 TURBO S FLAT-6: RECESSED CENTRAL TIMING WINDOW
        // =====================================================================
        // Fits strictly inside the dark central vertical slot (`x: 0.493..0.509 * w, y: 0.453..0.485 * h`)
        // between the two vertical `PORSCHE` strips, above the `turbo S` badge!
        const gearAnodize = cams.includes('stage3') || cams.includes('f1')
          ? '#7f2323'
          : (cams.includes('titanium') ? '#a16207' : (cams.includes('stage2') ? '#234175' : '#3f3f46'));

        const slotTopY = Math.round(h * 0.455 + vibY);
        const slotBotY = Math.round(h * 0.483 + vibY);

        ctx.save();
        ctx.globalAlpha = 0.72;
        // Vertical Serpentine / Timing Belt recessed deep inside the central plenum slot
        ctx.strokeStyle = '#0f0e0d';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(eX - 3.5, slotTopY);
        ctx.lineTo(eX - 3.5, slotBotY);
        ctx.moveTo(eX + 3.5, slotTopY);
        ctx.lineTo(eX + 3.5, slotBotY);
        ctx.stroke();

        if (ctx.setLineDash) {
          ctx.strokeStyle = '#52525b';
          ctx.lineWidth = 1.3;
          ctx.setLineDash([2, 2.5]);
          if (typeof ctx.lineDashOffset !== 'undefined') {
            ctx.lineDashOffset = -beltRot * 8;
          }
          ctx.beginPath();
          ctx.moveTo(eX - 3.5, slotTopY);
          ctx.lineTo(eX - 3.5, slotBotY);
          ctx.moveTo(eX + 3.5, slotTopY);
          ctx.lineTo(eX + 3.5, slotBotY);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Upper & Lower Compact Pulleys recessed inside the Central Plenum Slot
        this.drawToothedCamGear(ctx, eX, slotTopY, 4.2, gearAnodize, '#71717a', beltRot * 0.75, 8);
        this.drawSpokedPulley(ctx, eX, slotBotY, 4.4, '#27272a', '#71717a', -beltRot, 5);
        ctx.restore();
      }

      // =======================================================================
      // 5. BLENDED FORCED INDUCTION (RECESSED TWIN TURBOS / SUPERCHARGER) & INTERCOOLERS
      // =======================================================================
      const isTwinOrQuad = ind.includes('twin') || ind.includes('promod') || ind.includes('quad');
      const isBigSingle = ind.includes('massive') || ind.includes('large');
      const impAngle = effectiveRunning ? (performance.now() * 0.055 * (rpm / 1000 + Math.max(0, boost) * 3.5)) : 0;

      if (ind.includes('turbo')) {
        // Subtle recessed impeller throats inside the Left & Right Lower Turbo Ducts (`w * 0.410, h * 0.573` & `w * 0.592, h * 0.573`)
        const tRadius = isBigSingle ? 5.6 : (isTwinOrQuad ? 5.0 : 4.5);
        const leftTurboX = Math.round(w * 0.410 + vibX);
        const rightTurboX = Math.round(w * 0.592 + vibX);
        const turboY = Math.round(h * 0.573 + vibY);
        const drawRecessedTurboThroat = (tx, ty, rad, rot) => {
          ctx.save();
          ctx.globalAlpha = 0.74;
          ctx.fillStyle = '#09090b';
          ctx.beginPath();
          ctx.arc(tx, ty, rad, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = heatFactor > 0.25 ? `rgba(234,88,12,${0.3 + heatFactor * 0.4})` : 'rgba(82,82,91,0.55)';
          ctx.lineWidth = 1.1;
          ctx.stroke();

          ctx.translate(tx, ty);
          ctx.rotate(rot);
          ctx.strokeStyle = '#a1a1aa';
          ctx.lineWidth = 0.95;
          for (let b = 0; b < 6; b++) {
            const ba = (b / 6) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(ba) * (rad - 1), Math.sin(ba) * (rad - 1));
            ctx.stroke();
          }
          ctx.fillStyle = '#d4d4d8';
          ctx.beginPath();
          ctx.arc(0, 0, 1.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        };

        drawRecessedTurboThroat(leftTurboX, turboY, tRadius, impAngle);
        if (isTwinOrQuad || ind === 'ind_turbo_small') {
          drawRecessedTurboThroat(rightTurboX, turboY, tRadius, -impAngle * 1.04);
        }
      } else if (ind.includes('supercharger')) {
        // Low-Profile CNC Twin-Screw Supercharger Pulley Unit inside Upper Plenum (`y: 0.442..0.494 * h`, above `turbo S` badge)
        const scX = Math.round(w * 0.468 + vibX);
        const scY = Math.round(h * 0.442 + vibY);
        const scW = Math.round(w * 0.066);
        const scH = Math.round(h * 0.052);
        ctx.fillStyle = '#3f3f46';
        ctx.strokeStyle = '#141210';
        ctx.lineWidth = 1.5;
        ctx.fillRect(scX, scY, scW, scH);
        ctx.strokeRect(scX, scY, scW, scH);
        // CNC Fin Lines
        ctx.strokeStyle = '#71717a';
        ctx.lineWidth = 1;
        for (let ry = scY + 4; ry < scY + scH - 4; ry += 4) {
          ctx.beginPath();
          ctx.moveTo(scX + 4, ry);
          ctx.lineTo(scX + scW - 4, ry);
          ctx.stroke();
        }
        this.drawSpokedPulley(ctx, eX, scY + scH * 0.5, 6, '#18181b', '#d4d4d8', beltRot * 1.5, 5);
      }

      // Blended Lower Twin Intercooler Cores (`left: 0.398..0.474 * w`, `right: 0.526..0.602 * w`, `y: 0.628..0.658 * h`)
      // Tints ONLY the finned silver core area while keeping the OEM end-tanks and blue silicone elbows 100% intact!
      const icY = Math.round(h * 0.628 + vibY);
      const icW = Math.round(w * 0.074);
      const icH = Math.round(h * 0.030);
      const leftIcX = Math.round(w * 0.398 + vibX);
      const rightIcX = Math.round(w * 0.528 + vibX);

      if (intercooler === 'ic_none') {
        ctx.fillStyle = 'rgba(20, 18, 16, 0.85)';
        ctx.fillRect(leftIcX, icY, icW, icH);
        ctx.fillRect(rightIcX, icY, icW, icH);
      } else if (intercooler !== 'ic_street') {
        const isCryoIC = intercooler.includes('nitrogen') || intercooler.includes('ice');
        ctx.save();
        [leftIcX, rightIcX].forEach(ix => {
          ctx.fillStyle = isCryoIC ? 'rgba(56, 189, 248, 0.22)' : 'rgba(217, 119, 6, 0.25)';
          ctx.fillRect(ix, icY, icW, icH);
          ctx.strokeStyle = isCryoIC ? 'rgba(186, 230, 253, 0.35)' : 'rgba(253, 224, 71, 0.32)';
          ctx.lineWidth = 1;
          for (let fy = icY + 3; fy < icY + icH - 2; fy += 3.5) {
            ctx.beginPath();
            ctx.moveTo(ix + 2, fy);
            ctx.lineTo(ix + icW - 2, fy);
            ctx.stroke();
          }
        });
        ctx.restore();
      }

      // Blended Billet Fuel Rails tucked along Left & Right Edges of Center Plenum (`x = 0.448 * w` & `x = 0.551 * w`)
      if (fuelSys !== 'fuel_none' && fuelSys !== 'fuel_stock') {
        const isRaceFuel = fuelSys.includes('twin') || fuelSys.includes('quad') || fuelSys.includes('f1');
        ctx.fillStyle = isRaceFuel ? '#581c87' : '#7f2323';
        ctx.strokeStyle = '#141210';
        ctx.lineWidth = 1.2;
        ctx.fillRect(w * 0.446 + vibX, h * 0.446 + vibY, 4, 24);
        ctx.strokeRect(w * 0.446 + vibX, h * 0.446 + vibY, 4, 24);
        ctx.fillRect(w * 0.552 + vibX, h * 0.446 + vibY, 4, 24);
        ctx.strokeRect(w * 0.552 + vibX, h * 0.446 + vibY, 4, 24);
      }

      // Blended Upgraded Ignition Coils along Left & Right Cylinder Banks (`x = 0.441 * w` & `x = 0.558 * w`)
      if (ignition !== 'ignition_oem' && ignition !== 'ignition_none') {
        const ignCol = ignition.includes('plasma') ? '#234175' : (ignition.includes('cdi') ? '#7f2323' : '#0e7490');
        ctx.fillStyle = ignCol;
        ctx.strokeStyle = '#141210';
        ctx.lineWidth = 1;
        for (let c = 0; c < 3; c++) {
          const cy = Math.round(h * 0.452 + c * 8 + vibY);
          ctx.fillRect(w * 0.440 + vibX, cy, 5, 5);
          ctx.strokeRect(w * 0.440 + vibX, cy, 5, 5);
          ctx.fillRect(w * 0.557 + vibX, cy, 5, 5);
          ctx.strokeRect(w * 0.557 + vibX, cy, 5, 5);
        }
      }

      // Blended Lithium / Supercap Battery Module on Left Electrical Box (`w * 0.362, h * 0.484`)
      if (battery && battery !== 'starter_oem' && battery !== 'starter_none') {
        ctx.save();
        ctx.fillStyle = battery.includes('supercap') ? 'rgba(21, 128, 61, 0.55)' : 'rgba(161, 98, 7, 0.55)';
        ctx.fillRect(w * 0.361 + vibX * 0.5, h * 0.484 + vibY * 0.5, 13, 11);
        ctx.strokeStyle = '#141210';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(w * 0.361 + vibX * 0.5, h * 0.484 + vibY * 0.5, 13, 11);
        ctx.restore();
      }

      // Blended Nitrous Oxide (NOS) Solenoids & Dual Purge Clouds (`parts.nitrous`)
      if (nitrous && nitrous !== 'nos_none') {
        const nosX = Math.round(w * 0.368 + vibX * 0.5);
        const nosY = Math.round(strutY - 12);
        // Thin dark braided line feeding into center plenum
        ctx.strokeStyle = '#3f3f46';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(nosX + 12, nosY + 4);
        ctx.lineTo(w * 0.452 + vibX, h * 0.505 + vibY);
        ctx.stroke();

        ctx.fillStyle = '#234175';
        ctx.strokeStyle = '#141210';
        ctx.lineWidth = 1.2;
        ctx.fillRect(nosX, nosY, 6, 9);
        ctx.strokeRect(nosX, nosY, 6, 9);
        ctx.fillStyle = '#7f2323';
        ctx.fillRect(nosX + 7, nosY, 6, 9);
        ctx.strokeRect(nosX + 7, nosY, 6, 9);

        if (effectiveRunning && (rpm > 5200 || boost > 0.7)) {
          ctx.fillStyle = 'rgba(224, 242, 254, 0.62)';
          ctx.beginPath();
          ctx.arc(w * 0.35, h * 0.34, 14 + Math.random() * 8, 0, Math.PI * 2);
          ctx.arc(w * 0.65, h * 0.34, 14 + Math.random() * 8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // =========================================================================
    // 6. DUAL REAR OVAL EXHAUST SMOKE & BACKFIRE FLAMES (`y: 0.942 * h`)
    // =========================================================================
    const leftExX = w * 0.365;
    const rightExX = w * 0.633;
    const exY = h * 0.942 + vibY;

    if (effectiveRunning) {
      if (Math.random() > 0.35) {
        ctx.fillStyle = 'rgba(203, 213, 225, 0.28)';
        [leftExX, rightExX].forEach(ex => {
          ctx.beginPath();
          ctx.arc(ex + (Math.random() - 0.5) * 12, exY + (Math.random() - 0.5) * 8, 6 + Math.random() * 8, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      if (isBackfire) {
        [leftExX, rightExX].forEach(ex => {
          ctx.fillStyle = 'rgba(249, 115, 22, 0.92)';
          ctx.beginPath();
          ctx.arc(ex, exY, 18 + Math.random() * 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(ex, exY, 9 + Math.random() * 5, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    }

    // Overheating Steam Effect
    if (isOverheating) {
      ctx.fillStyle = 'rgba(226, 232, 240, 0.55)';
      for (let s = 0; s < 5; s++) {
        ctx.beginPath();
        ctx.arc(w * 0.42 + s * 30, h * 0.45 - (performance.now() * 0.05 + s * 20) % 80, 16 + s * 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // =========================================================================
    // 7. LIVE TELEMETRY HUD BADGE IN TOP-RIGHT CORNER
    // =========================================================================
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(w - 224, 10, 212, 52);
    ctx.strokeStyle = effectiveRunning ? '#22c55e' : '#64748b';
    ctx.lineWidth = 2;
    ctx.strokeRect(w - 224, 10, 212, 52);

    ctx.fillStyle = effectiveRunning ? '#22c55e' : '#94a3b8';
    ctx.font = 'bold 11px "Share Tech Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(
      !hasEngineBlock
        ? '✖ NO ENGINE INSTALLED'
        : (effectiveRunning ? '● ENGINE: RUNNING (LIVE)' : '○ ENGINE: OFF (STANDBY)'),
      w - 214,
      26
    );

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 13px "Chakra Petch", sans-serif';
    ctx.fillText(`${effectiveRunning ? Math.round(rpm) : 0} RPM`, w - 214, 42);

    if (effectiveRunning && boost > 0) {
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`BOOST: ${boost.toFixed(2)} Bar`, w - 214, 56);
    } else {
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`SPEC: ${engineId.replace('block_', '').toUpperCase()}`, w - 214, 56);
    }

    ctx.restore();
  }

  // --- 3. EXHAUST SYSTEM ---
  renderExhaust(ctx, exhaustId) {
    if (exhaustId === 'exh_hood_exit') {
      // Rear decklid screamer pipe on 911 Turbo S
      this.drawPixelRect(ctx, 16, 11, 3, 5, '#495057');
      this.drawPixelRect(ctx, 16, 10, 3, 1, '#48cae4');
    } else {
      // Twin Rear Diffuser Exhaust Pipes
      this.drawPixelRect(ctx, 2, 25, 8, 3, '#334155');
      this.drawPixelRect(ctx, -1, 26, 3, 2, '#94a3b8');
    }
  }

  // --- 4. 2D PIXEL-ART BODY SHELL (PORSCHE 911 TURBO S & FORD RANGER 2.5 OPEN CAB 2004) ---
  renderBodyShell(ctx, bodyId, parts, isHoodOpen = false) {
    if (bodyId === 'body_none') return;
    if (bodyId === 'body_ford_ranger_2004') {
      this.renderBodyFordRanger2004(ctx, parts, isHoodOpen);
      return;
    }
    this.renderBodyPorsche911(ctx, parts, isHoodOpen);
  }

  renderBodyFordRanger2004(ctx, parts = {}, isHoodOpen = false) {
    // Crisp White 2004 Ford Ranger 2.5 Open Cab ("RANGER WILDTRAK" Side Graphic & 5-Spoke Wheels)
    const white = '#f8fafc';
    const shade = '#e2e8f0';
    const shadow = '#cbd5e1';
    const trim = '#0f172a';
    const glass = '#1e293b';
    const glassReflect = '#475569';

    // 1. Open Cab Roofline, Rear Quarter Window & Door Window (`x: 34..64, y: 6..15`)
    this.drawPixelRect(ctx, 35, 6, 23, 2, white);
    this.drawPixelRect(ctx, 34, 8, 28, 7, white);
    // Open Cab Rear Quarter Window (`x: 36..42, y: 8..14`)
    this.drawPixelRect(ctx, 36, 8, 6, 6, glass);
    this.drawPixelRect(ctx, 37, 9, 2, 4, glassReflect);
    // Front Door Window & Weather Visor (`x: 45..58, y: 8..14`)
    this.drawPixelRect(ctx, 45, 8, 13, 6, glass);
    this.drawPixelRect(ctx, 45, 8, 12, 1, '#090d16'); // Rain visor
    this.drawPixelRect(ctx, 48, 10, 6, 2, glassReflect);
    // Slanted Front Windshield (`x: 58..64, y: 8..15`)
    this.drawPixelRect(ctx, 58, 8, 6, 7, glass);
    // Black Bed Roll Bar behind Cab (`x: 32..34, y: 7..15`)
    this.drawPixelRect(ctx, 32, 7, 2, 8, trim);

    // 2. Pickup Bed (`x: 4..34, y: 14..25`) + Black Bed Liner + Lion Sticker
    this.drawPixelRect(ctx, 4, 14, 30, 11, white);
    this.drawPixelRect(ctx, 5, 13, 28, 1, trim); // Black bed liner rail
    this.drawPixelRect(ctx, 4, 23, 30, 2, shade);
    // Red/Amber Vertical Taillight (`x: 4..6, y: 16..22`)
    this.drawPixelRect(ctx, 4, 16, 2, 4, '#dc2626');
    this.drawPixelRect(ctx, 4, 20, 2, 2, '#f59e0b');
    // Gold/Black Lion Sticker on Rear Bed Side (`x: 7..11, y: 16..19`)
    this.drawPixelRect(ctx, 7, 16, 4, 3, '#78350f');
    this.drawPixelRect(ctx, 8, 16, 2, 2, '#eab308');

    // 3. Open Cab Doors & Front Fender (`x: 34..90, y: 15..25`)
    this.drawPixelRect(ctx, 34, 15, 55, 10, white);
    this.drawPixelRect(ctx, 34, 23, 56, 2, shadow);
    // Square 2004 Ranger Headlight & Amber Corner (`x: 86..90, y: 16..20`)
    this.drawPixelRect(ctx, 86, 16, 4, 4, '#e2e8f0');
    this.drawPixelRect(ctx, 85, 17, 1, 2, '#f97316');
    // Fender Side Turn Signal (`x: 68..70, y: 18`)
    this.drawPixelRect(ctx, 68, 18, 2, 1, '#f97316');
    // Door Handle & Black Side Mirror
    this.drawPixelRect(ctx, 46, 16, 3, 1, trim);
    this.drawPixelRect(ctx, 56, 13, 3, 2, trim);

    // 4. Signature Black Splash Stripe & "RANGER WILDTRAK" Side Graphic (`x: 32..68, y: 16..23`)
    this.drawPixelRect(ctx, 32, 16, 14, 1, '#090d16');
    this.drawPixelRect(ctx, 42, 17, 22, 3, '#090d16');
    this.drawPixelRect(ctx, 50, 20, 16, 2, '#090d16');
    this.drawPixelRect(ctx, 46, 20, 10, 1, '#dc2626'); // Red WILDTRAK accent

    if (isHoodOpen) {
      this.renderOpenHood(ctx, white, shade);
    }
  }

  renderBodyPorsche911(ctx, parts = {}, isHoodOpen = false) {
    // Agate Grey Metallic 992 Turbo S Palette (Matching User Reference Image!)
    const main = '#64748b';
    const dark = '#334155';
    const deep = '#1e293b';
    const light = '#94a3b8';
    const highlight = '#cbd5e1';
    const glass = '#0f172a';
    const glassReflect = '#475569';

    // 1. Sloping 911 Fastback Roofline & Greenhouse (`x: 22..64, y: 8..17`)
    this.drawPixelRect(ctx, 32, 8, 22, 2, light);
    this.drawPixelRect(ctx, 26, 10, 34, 2, main);
    // Slanted Front Windshield (`x: 56..64`)
    this.drawPixelRect(ctx, 56, 10, 7, 7, glass);
    this.drawPixelRect(ctx, 58, 11, 3, 5, glassReflect);
    // Iconic Curved 911 Side Window (`x: 28..55`)
    this.drawPixelRect(ctx, 30, 11, 25, 6, glass);
    this.drawPixelRect(ctx, 34, 12, 16, 2, glassReflect);
    this.drawPixelRect(ctx, 43, 11, 2, 6, '#090d16'); // B-pillar trim

    // 2. Sculpted Front Nose, Slanted Oval Headlight & Front Cooling Intakes (`x: 62..92`)
    this.drawPixelRect(ctx, 62, 16, 26, 9, main);
    this.drawPixelRect(ctx, 64, 15, 18, 2, light);
    this.drawPixelRect(ctx, 84, 18, 7, 7, dark);
    // Slanted Porsche Oval LED Matrix Headlight (`x: 81..87, y: 15..18`)
    this.drawPixelRect(ctx, 81, 15, 6, 3, '#e2e8f0');
    this.drawPixelRect(ctx, 82, 16, 4, 1, '#ffffff');
    // Amber US-Spec Front Fender Side Marker (`x: 79..82, y: 20`)
    this.drawPixelRect(ctx, 79, 20, 3, 1, '#f97316');
    // Front Bumper Active Cooling Louvers (`x: 86..91, y: 21..25`)
    this.drawPixelRect(ctx, 86, 21, 5, 4, '#090d16');
    this.drawPixelRect(ctx, 87, 22, 4, 1, '#94a3b8');
    this.drawPixelRect(ctx, 85, 25, 7, 2, '#090d16'); // Front Turbo S active lip

    // 3. Wide Rear Haunches, Doors & Turbo S Side Intake Scoop (`x: 4..62`)
    this.drawPixelRect(ctx, 6, 15, 56, 11, main);
    this.drawPixelRect(ctx, 8, 14, 24, 2, highlight); // Wide rear fender shoulder highlight
    this.drawPixelRect(ctx, 32, 17, 26, 1, light);   // Door beltline highlight
    this.drawPixelRect(ctx, 41, 18, 4, 1, dark);     // Flush door handle
    this.drawPixelRect(ctx, 52, 15, 4, 3, main);     // Side mirror housing
    this.drawPixelRect(ctx, 53, 17, 2, 2, '#090d16');

    // Signature 911 Turbo S Rear Quarter Panel Side Air Intake Scoop (`x: 31..36, y: 18..23`)
    this.drawPixelRect(ctx, 31, 18, 5, 5, '#090d16');
    this.drawPixelRect(ctx, 33, 19, 3, 4, dark);

    // Lower Black Rocker Sill & Rear Diffuser (`y: 25..27`)
    this.drawPixelRect(ctx, 6, 25, 84, 2, deep);

    // 4. Full-Width Red LED Taillight Bar & Active Turbo S Rear Wing (`x: 2..16`)
    this.drawPixelRect(ctx, 3, 17, 9, 2, '#ef4444'); // Red LED light bar
    this.drawPixelRect(ctx, 4, 17, 6, 1, '#fca5a5'); // Bright LED core
    this.drawPixelRect(ctx, 3, 23, 6, 3, '#090d16'); // Rear bumper vent & diffuser

    if (isHoodOpen) {
      // Raised Rear Engine Decklid & Wing
      this.drawPixelRect(ctx, 6, 8, 14, 2, dark);
      this.drawPixelRect(ctx, 4, 6, 12, 2, main);
      this.drawPixelRect(ctx, 14, 10, 1, 6, '#94a3b8');
    } else {
      // Active Deployed 911 Turbo S Rear Wing (`x: 3..14, y: 11..15`)
      this.drawPixelRect(ctx, 3, 11, 11, 2, main);
      this.drawPixelRect(ctx, 4, 10, 9, 1, highlight);
      this.drawPixelRect(ctx, 6, 13, 2, 3, '#090d16');
      this.drawPixelRect(ctx, 11, 13, 2, 3, '#090d16');
    }
  }

  // --- MODULAR BODY KIT (Front Bumper, Side Skirts, Rear Wing) ---
  renderModularBodyKit(ctx, parts, bodyId) {
    if (!parts) return;
    const bumper = parts.front_bumper;
    const skirts = parts.side_skirts;
    const wing = parts.rear_wing;

    // 1. FRONT BUMPER & SPLITTER
    if (bumper === 'front_drag_lip') {
      this.drawPixelRect(ctx, 86, 26, 8, 2, '#0f172a');
      this.drawPixelRect(ctx, 88, 24, 1, 2, '#94a3b8');
    } else if (bumper === 'front_gt_splitter') {
      this.drawPixelRect(ctx, 85, 26, 10, 2, '#0f172a');
      this.drawPixelRect(ctx, 87, 23, 2, 3, '#0f172a');
      this.drawPixelRect(ctx, 85, 20, 3, 1, '#38bdf8');
      this.drawPixelRect(ctx, 84, 22, 4, 1, '#38bdf8');
    } else if (bumper === 'front_nascar_airdam') {
      this.drawPixelRect(ctx, 83, 25, 11, 3, '#18181b');
      this.drawPixelRect(ctx, 85, 26, 7, 1, '#eab308');
    } else if (bumper === 'front_f1_wing') {
      this.drawPixelRect(ctx, 87, 23, 8, 2, '#0f172a');
      this.drawPixelRect(ctx, 86, 25, 10, 2, '#18181b');
      this.drawPixelRect(ctx, 92, 20, 2, 7, '#ea580c');
    }

    // 2. SIDE SKIRTS
    if (skirts === 'skirts_drag_low') {
      this.drawPixelRect(ctx, 28, 26, 40, 2, '#1e293b');
    } else if (skirts === 'skirts_carbon') {
      this.drawPixelRect(ctx, 26, 26, 42, 2, '#09090b');
      this.drawPixelRect(ctx, 26, 24, 2, 3, '#09090b');
      this.drawPixelRect(ctx, 66, 24, 2, 3, '#09090b');
    }

    // 3. REAR WING / SPOILER
    if (wing === 'wing_ducktail') {
      this.drawPixelRect(ctx, 2, 11, 6, 4, '#475569');
    } else if (wing === 'wing_gt_carbon') {
      this.drawPixelRect(ctx, -6, 6, 15, 2, '#09090b');
      this.drawPixelRect(ctx, -7, 4, 2, 7, '#38bdf8');
      this.drawPixelRect(ctx, 0, 7, 2, 9, '#334155');
      this.drawPixelRect(ctx, 5, 8, 2, 8, '#334155');
    } else if (wing === 'wing_drag_chute') {
      this.drawPixelRect(ctx, -5, 8, 13, 2, '#18181b');
      this.drawPixelRect(ctx, -6, 6, 2, 6, '#dc2626');
      this.drawPixelRect(ctx, 1, 10, 2, 6, '#94a3b8');
      this.drawPixelRect(ctx, -5, 17, 6, 5, '#dc2626');
      this.drawPixelRect(ctx, -5, 18, 5, 3, '#0f172a');
    } else if (wing === 'wing_nascar_blade') {
      this.drawPixelRect(ctx, 2, 9, 4, 7, '#f1f5f9');
      this.drawPixelRect(ctx, 3, 10, 1, 6, '#0f172a');
    } else if (wing === 'wing_formula_drs') {
      this.drawPixelRect(ctx, -6, 6, 16, 2, '#09090b');
      this.drawPixelRect(ctx, -4, 10, 12, 2, '#18181b');
      this.drawPixelRect(ctx, -7, 4, 2, 11, '#ea580c');
      this.drawPixelRect(ctx, 1, 8, 2, 8, '#09090b');
    }
  }

  // --- 5. AERODYNAMICS ---
  renderAero(ctx, aeroId) {
    // Handled via renderModularBodyKit
  }

  // --- 6. WHEELS & BRAKE CALIPERS (PORSCHE 911 PCCB YELLOW vs FORD RANGER 5-SPOKE RED CALIPERS) ---
  renderWheels(ctx, tireId, wheelAngle = 0, brakeId = 'brake_stock', isRanger = false) {
    const isDragSlick = tireId === 'tires_drag_slick' || tireId === 'tires_hoosier_wrinkle' || tireId === 'tires_topfuel_giant' || tireId === 'tires_drag_radial' || tireId === 'tires_top_fuel_wrinkle';
    const isGiant = tireId === 'tires_topfuel_giant' || tireId === 'tires_top_fuel_wrinkle';
    const isF1 = tireId === 'tires_f1_soft_pirelli';

    // Front Wheel (at x: 74, y: 24)
    this.drawSingleWheel(ctx, 74, 24, 15, '#18181b', wheelAngle, false, isF1, -1, isRanger);

    // Rear Wheel (at x: 21, y: 24)
    const rearDiameter = isGiant ? 18 : (isDragSlick ? 16 : 15);
    const rearY = isGiant ? 23 : 24;
    this.drawSingleWheel(ctx, 21, rearY, rearDiameter, '#18181b', wheelAngle, isDragSlick, isF1, isRanger ? -1 : 1, isRanger);
  }

  drawSingleWheel(ctx, cx, cy, diameter, tireColor, angle, isSlick, isF1 = false, caliperSide = 1, isRanger = false) {
    const r = diameter / 2;

    // 1. Outer Tire Rubber
    ctx.fillStyle = tireColor;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // 2. Outer Rim Lip (Polished Silver Lip on Ford Ranger 2004, Dark Gunmetal on Porsche 911)
    const rimRadius = isSlick ? r - 2.2 : r - 1.6;
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.arc(cx, cy, rimRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isRanger ? '#e2e8f0' : '#64748b';
    ctx.lineWidth = isRanger ? 1.1 : 0.8;
    ctx.stroke();

    // 3. Drilled Steel / Carbon-Ceramic Brake Rotor Disc
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(cx, cy, rimRadius * 0.72, 0, Math.PI * 2);
    ctx.fill();

    // 4. Brake Caliper (Red on Ford Ranger 2004, Bright Yellow PCCB on Porsche 911 Turbo S!)
    ctx.fillStyle = isRanger ? '#dc2626' : '#eab308';
    ctx.fillRect(cx + caliperSide * (rimRadius * 0.32) - 1.5, cy - 2.5, 3, 5);

    // 5. Rotating 5-Spoke Wheel Spokes
    ctx.strokeStyle = isRanger ? '#475569' : '#334155';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 5; i++) {
      const a = angle + (i * Math.PI * 2) / 5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * (rimRadius - 0.5), cy + Math.sin(a) * (rimRadius - 0.5));
      ctx.stroke();
    }

    // 6. Center Hub Nut
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.arc(cx, cy, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = isRanger ? '#cbd5e1' : '#facc15';
    ctx.fillRect(cx - 0.5, cy - 0.5, 1, 1);
  }

  // --- 7. SPECIAL EFFECTS (FLAMES, NOS, STEAM, BLOWN) ---
  renderFlame(ctx, x, y, rotation) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    const length = 12 + Math.floor(Math.random() * 10);
    // Outer yellow flame
    this.drawPixelRect(ctx, 0, -3, length, 6, '#facc15');
    // Mid orange flame
    this.drawPixelRect(ctx, 0, -2, length * 0.75, 4, '#fb923c');
    // Inner blue/white core
    this.drawPixelRect(ctx, 0, -1, length * 0.45, 2, '#38bdf8');

    ctx.restore();
  }

  renderNosFlame(ctx, x, y) {
    const len = 16 + Math.floor(Math.random() * 8);
    // Cyan / Purple intense thrust
    this.drawPixelRect(ctx, x - len, y - 2, len, 5, 'rgba(56, 189, 248, 0.85)');
    this.drawPixelRect(ctx, x - len * 0.7, y - 1, len * 0.7, 3, '#c084fc');
    this.drawPixelRect(ctx, x - len * 0.3, y, len * 0.3, 1, '#ffffff');
  }

  renderSteam(ctx, x, y) {
    for (let i = 0; i < 3; i++) {
      const ox = (Math.random() - 0.5) * 8;
      const oy = -Math.random() * 12;
      this.drawPixelRect(ctx, x + ox, y + oy, 4, 4, 'rgba(241, 245, 249, 0.7)');
    }
  }

  renderBlownEngineEffect(ctx, x, y) {
    // Explosion fireball & black thick smoke
    const r = 8 + Math.random() * 6;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(x, y - 4, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.arc(x - 4, y - 10, r + 2, 0, Math.PI * 2);
    ctx.fill();

    // Sparks
    for (let i = 0; i < 4; i++) {
      const sx = x + (Math.random() - 0.5) * 20;
      const sy = y + (Math.random() - 0.5) * 16;
      this.drawPixelRect(ctx, sx, sy, 2, 2, '#fef08a');
    }
  }

  renderParachute(ctx, x, y) {
    // Parachute canopy
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(x - 18, y, 16, Math.PI * 0.6, Math.PI * 1.4);
    ctx.fill();

    // Chute cords
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + 4);
    ctx.lineTo(x - 18, y - 12);
    ctx.moveTo(x, y + 4);
    ctx.lineTo(x - 18, y + 12);
    ctx.stroke();
  }

  // --- DRAG STRIP TRACK ENVIRONMENT RENDERING ---
  renderDragTrack(ctx, width, height, cameraX, isChristmasTreeActive = true, treeState = 'OFF', targetMeters = 402.336, targetLabel = '1/4 MILE') {
    // 1. Retro 80s Sunset Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.55);
    skyGrad.addColorStop(0, '#1e1b4b');   // Deep indigo
    skyGrad.addColorStop(0.5, '#4c1d95'); // Purple
    skyGrad.addColorStop(0.8, '#be185d'); // Hot magenta
    skyGrad.addColorStop(1, '#ea580c');   // Golden orange
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height * 0.55);

    // Distant city silhouette / mountain
    ctx.fillStyle = '#18181b';
    const numBuildings = 15;
    for (let i = 0; i < numBuildings; i++) {
      const bx = ((i * 120 - cameraX * 0.1) % (width + 200)) - 100;
      const bh = 40 + (i % 5) * 20;
      ctx.fillRect(bx, height * 0.55 - bh, 80, bh);
    }

    // 2. Grandstands & Crowd (Midground parallax)
    const standY = height * 0.45;
    ctx.fillStyle = '#374151';
    ctx.fillRect(0, standY, width, height * 0.15);

    // Cheering pixel spectators
    for (let cx = 0; cx < width; cx += 12) {
      const crowdColors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
      const cColor = crowdColors[(cx + Math.floor(cameraX * 0.2)) % crowdColors.length];
      this.drawPixelRect(ctx, cx, standY + 6, 6, 8, cColor);
      this.drawPixelRect(ctx, cx + 1, standY + 2, 4, 4, '#fde047'); // Heads
    }

    // Concrete barrier wall
    const wallY = height * 0.58;
    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(0, wallY, width, 18);
    ctx.fillStyle = '#d1d5db';
    ctx.fillRect(0, wallY, width, 3);
    // Red/White danger stripe on barrier
    for (let rx = 0; rx < width; rx += 40) {
      const sx = (rx - Math.floor(cameraX) % 40);
      this.drawPixelRect(ctx, sx, wallY + 3, 20, 15, '#ef4444');
    }

    // 3. Asphalt Track (Foreground)
    const trackY = height * 0.65;
    const trackH = height - trackY;
    ctx.fillStyle = '#111827'; // Dark sticky asphalt
    ctx.fillRect(0, trackY, width, trackH);

    // Rubber Burnout Groove (Black traction compound on asphalt)
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, trackY + 25, width, 40);
    ctx.fillRect(0, trackY + 95, width, 40);

    // Lane Divider Lines
    const dashW = 60;
    const gapW = 40;
    const totalDash = dashW + gapW;
    const offset = Math.floor(cameraX) % totalDash;
    ctx.fillStyle = '#fef08a'; // Bright yellow center line
    for (let lx = -totalDash; lx < width + totalDash; lx += totalDash) {
      this.drawPixelRect(ctx, lx - offset, trackY + 80, dashW, 4, '#fef08a');
    }

    // 4. DISTANCE MARKERS & FINISH LINE GANTRY
    this.renderDistanceMarkers(ctx, cameraX, trackY, height, targetMeters, targetLabel);

    // 5. CHRISTMAS TREE (Lanes Start Line)
    if (isChristmasTreeActive) {
      this.renderChristmasTree(ctx, 160 - cameraX, trackY - 95, treeState);
    }
  }

  // --- DISTANCE MARKERS ---
  renderDistanceMarkers(ctx, cameraX, trackY, height, trackMeters = 402.336, targetLabel = '1/4 MILE') {
    const pxPerMeter = 20; // 1 meter = 20 pixels on screen
    const finishLinePx = trackMeters * pxPerMeter;

    const markers = [];
    if (trackMeters <= 500) {
      markers.push({ dist: 18.28, label: '60 FT' });
      markers.push({ dist: 100.58, label: '330 FT' });
      markers.push({ dist: 201.17, label: '1/8 MILE' });
    } else if (trackMeters <= 2000) {
      markers.push({ dist: 402.336, label: '1/4 MILE' });
      markers.push({ dist: 804.67, label: '1/2 MILE' });
      markers.push({ dist: 1207.0, label: '3/4 MILE' });
    } else {
      markers.push({ dist: 1609.34, label: '1 MILE' });
      if (trackMeters >= 8000) markers.push({ dist: 8046.72, label: '5 MILES' });
      if (trackMeters >= 16000) markers.push({ dist: 16093.4, label: '10 MILES' });
      if (trackMeters >= 32000) markers.push({ dist: 32186.9, label: '20 MILES' });
    }
    markers.push({ dist: trackMeters, label: `FINISH ${targetLabel}` });

    for (const m of markers) {
      const mPx = m.dist * pxPerMeter;
      const screenX = mPx - cameraX + 180;

      if (screenX > -100 && screenX < ctx.canvas.width + 100) {
        if (m.dist === trackMeters) {
          // HUGE FINISH LINE OVERHEAD GANTRY WITH LED TIMING BOARD
          ctx.fillStyle = '#374151';
          ctx.fillRect(screenX - 8, trackY - 140, 16, 140); // Left pillar
          ctx.fillRect(screenX + 80, trackY - 140, 16, 140); // Right pillar
          ctx.fillRect(screenX - 20, trackY - 150, 120, 24); // Overhead beam

          // LED Scoreboard
          ctx.fillStyle = '#000000';
          ctx.fillRect(screenX - 10, trackY - 146, 100, 18);
          ctx.fillStyle = '#22c55e';
          ctx.font = 'bold 11px "Courier New", monospace';
          ctx.fillText(`FINISH ${targetLabel}`, screenX - 6, trackY - 132);

          // Checkerboard finish line on track
          for (let cy = 0; cy < 160; cy += 16) {
            ctx.fillStyle = (cy / 16) % 2 === 0 ? '#ffffff' : '#000000';
            ctx.fillRect(screenX - 4, trackY + cy, 8, 16);
            ctx.fillStyle = (cy / 16) % 2 === 0 ? '#000000' : '#ffffff';
            ctx.fillRect(screenX + 4, trackY + cy, 8, 16);
          }
        } else {
          // Side sign pole
          ctx.fillStyle = '#9ca3af';
          ctx.fillRect(screenX, trackY - 35, 4, 35);
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(screenX - 24, trackY - 50, 52, 18);
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 10px monospace';
          ctx.fillText(m.label, screenX - 20, trackY - 37);
        }
      }
    }
  }

  // --- CHRISTMAS TREE LIGHT SYSTEM ---
  renderChristmasTree(ctx, x, y, state) {
    if (x < -80 || x > ctx.canvas.width + 80) return;

    ctx.save();
    ctx.translate(Math.floor(x), Math.floor(y));

    // Metal pole & box
    this.drawPixelRect(ctx, 16, 0, 8, 130, '#1f2937');
    this.drawPixelRect(ctx, 4, 15, 32, 95, '#111827');
    this.drawPixelRect(ctx, 6, 17, 28, 91, '#374151');

    const isPreStage = state === 'PRE_STAGE' || state === 'STAGE' || state === 'YELLOW_1' || state === 'YELLOW_2' || state === 'YELLOW_3' || state === 'GREEN';
    const isStage = state === 'STAGE' || state === 'YELLOW_1' || state === 'YELLOW_2' || state === 'YELLOW_3' || state === 'GREEN';
    const isYellow1 = state === 'YELLOW_1' || state === 'YELLOW_2' || state === 'YELLOW_3' || state === 'GREEN';
    const isYellow2 = state === 'YELLOW_2' || state === 'YELLOW_3' || state === 'GREEN';
    const isYellow3 = state === 'YELLOW_3' || state === 'GREEN';
    const isGreen = state === 'GREEN';
    const isRed = state === 'RED';

    // Helper for circular tree bulb
    const drawBulb = (bx, by, isOn, activeColor, offColor) => {
      ctx.fillStyle = isOn ? activeColor : offColor;
      ctx.beginPath();
      ctx.arc(bx, by, 4.5, 0, Math.PI * 2);
      ctx.fill();
      if (isOn) {
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.beginPath();
        ctx.arc(bx - 1, by - 1, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    // Pre-Stage (White small bulbs)
    drawBulb(12, 22, isPreStage, '#ffffff', '#475569');
    drawBulb(28, 22, isPreStage, '#ffffff', '#475569');

    // Stage (White small bulbs)
    drawBulb(12, 33, isStage, '#ffffff', '#475569');
    drawBulb(28, 33, isStage, '#ffffff', '#475569');

    // Yellow 1
    drawBulb(12, 47, isYellow1, '#facc15', '#451a03');
    drawBulb(28, 47, isYellow1, '#facc15', '#451a03');

    // Yellow 2
    drawBulb(12, 60, isYellow2, '#facc15', '#451a03');
    drawBulb(28, 60, isYellow2, '#facc15', '#451a03');

    // Yellow 3
    drawBulb(12, 73, isYellow3, '#facc15', '#451a03');
    drawBulb(28, 73, isYellow3, '#facc15', '#451a03');

    // GREEN (GO!)
    drawBulb(12, 87, isGreen, '#22c55e', '#052e16');
    drawBulb(28, 87, isGreen, '#22c55e', '#052e16');

    // RED (FALSE START / FOUL)
    drawBulb(12, 100, isRed, '#ef4444', '#450a0a');
    drawBulb(28, 100, isRed, '#ef4444', '#450a0a');

    ctx.restore();
  }
}

const pixelRenderer = new PixelRenderer();
