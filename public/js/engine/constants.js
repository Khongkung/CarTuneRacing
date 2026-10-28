/**
 * Project CarTuneRacing - Parts Catalog, Tuning Specs & Physics Constants
 */

const GAME_CONSTANTS = {
  TRACK_LENGTH_METERS: 402.336, // 1/4 Mile Drag Strip
  GRAVITY: 9.80665,
  AIR_DENSITY: 1.225, // kg/m^3 at sea level
  AMBIENT_TEMP: 30,   // °C
  MAX_COOLANT_TEMP: 125, // °C where head gasket blows
  OPTIMAL_COOLANT_TEMP: 88, // °C
  BLOWN_ROD_THRESHOLD: 1.15, // 115% of rod HP limit triggers catastrophic failure
};

// --- SELECTABLE RACE DISTANCES & PRIZE MULTIPLIERS ---
const RACE_DISTANCES = [
  { id: '0.25', name: '1/4 ไมล์ (402m)', miles: 0.25, meters: 402.336, prizeMultiplier: 1.0, label: '1/4 MILE' },
  { id: '1',    name: '1 ไมล์ (1.6km)',   miles: 1.0,  meters: 1609.34, prizeMultiplier: 2.5, label: '1 MILE' },
  { id: '5',    name: '5 ไมล์ (8.0km)',   miles: 5.0,  meters: 8046.72, prizeMultiplier: 6.0, label: '5 MILES' },
  { id: '10',   name: '10 ไมล์ (16km)',   miles: 10.0, meters: 16093.4, prizeMultiplier: 12.0, label: '10 MILES' },
  { id: '20',   name: '20 ไมล์ (32km)',   miles: 20.0, meters: 32186.9, prizeMultiplier: 25.0, label: '20 MILES' },
  { id: '30',   name: '30 ไมล์ (48km)',   miles: 30.0, meters: 48280.3, prizeMultiplier: 40.0, label: '30 MILES' }
];

// --- SELECTABLE BASE CARS (GARAGE ROSTER) ---
const CAR_CATALOG = [
  {
    id: 'car_porsche_911_turbo_s',
    name: 'Porsche 911 Turbo S (992)',
    badge: '3.8L Twin-Turbo Flat-6 Supercar',
    category: 'German Supercar',
    price: 0,
    unlocked: true,
    weight: 1120,
    baseHp: 650,
    topSpeed: 330,
    dragCoeff: 0.29,
    color: '#64748b',
    sideImage: 'assets/cars/porsche_911_turbo_s/porsche_side.jpg',
    engineImage: 'assets/cars/porsche_911_turbo_s/porsche_engine.jpg',
    desc: 'ซูเปอร์คาร์เครื่องวางหลัง Porsche 911 Turbo S (992) ดีไซน์ Pixel 2D ความละเอียดสูง พร้อมห้องเครื่องด้านหลังเปิดโชว์พัดลมคู่ อินเตอร์คูลเลอร์คู่ และท่อร่วมไอดี Turbo S',
    defaultParts: {
      model: 'car_porsche_911_turbo_s',
      body: 'body_porsche_911_turbo_s',
      engine_block: 'block_i4_vtec',
      head_cams: 'head_stock',
      pistons_rods: 'pistons_cast',
      starter_battery: 'starter_oem',
      ignition: 'ignition_oem',
      fuel_system: 'fuel_stock',
      cooling: 'cool_oem',
      induction: 'ind_turbo_small',
      intercooler: 'ic_street',
      nitrous: 'nos_none',
      exhaust: 'exh_straight_3in',
      transmission: 'trans_manual_4sp',
      tires: 'tires_street',
      brakes: 'brake_stock',
      front_bumper: 'front_stock',
      side_skirts: 'skirts_stock',
      rear_wing: 'wing_none'
    }
  },
  {
    id: 'car_ford_ranger_2004',
    name: 'Ford Ranger 2.5 Open Cab (2004)',
    badge: '2.5L WL-T Turbo Diesel Open Cab',
    category: 'Diesel Drag Pickup',
    price: 0,
    unlocked: true,
    weight: 1280,
    baseHp: 380,
    topSpeed: 265,
    dragCoeff: 0.36,
    color: '#f8fafc',
    sideImage: 'assets/cars/ford_ranger_2004/ranger_side.jpg',
    engineImage: 'assets/cars/ford_ranger_2004/ranger_engine.jpg',
    desc: 'กระบะแค็บแต่งซิ่งระดับตำนาน Ford Ranger 2.5 Open Cab (2004) สติกเกอร์ RANGER WILDTRAK ล้อแม็ก 5 ก้านเบรกแดง พร้อมห้องเครื่องด้านหน้าเปิดฝากระโปรงโชว์เครื่อง 2.5 เทอร์โบ อินเตอร์บนเต็มระบบ',
    defaultParts: {
      model: 'car_ford_ranger_2004',
      chassis: 'chassis_pickup_ladder',
      body: 'body_ford_ranger_2004',
      engine_block: 'block_diesel_pickup',
      head_cams: 'head_stock',
      pistons_rods: 'pistons_cast',
      starter_battery: 'starter_oem',
      ignition: 'ignition_oem',
      fuel_system: 'fuel_stock',
      cooling: 'cool_oem',
      induction: 'ind_turbo_small',
      intercooler: 'ic_street',
      nitrous: 'nos_none',
      exhaust: 'exh_straight_3in',
      transmission: 'trans_manual_4sp',
      tires: 'tires_street',
      brakes: 'brake_stock',
      front_bumper: 'front_stock',
      side_skirts: 'skirts_stock',
      rear_wing: 'wing_none'
    }
  }
];

// --- PARTS DATABASE ---
const CAR_PARTS = {
  // 1. CHASSIS
  chassis: [
    {
      id: 'chassis_tube',
      name: 'โครงสร้างเหล็กถัก Drag Tube Frame',
      price: 0, // Default starter
      weight: 350,
      stiffness: 1.5,
      desc: 'โครงเหล็กถักสำหรับแข่งแดร็กโดยเฉพาะ เบาและแข็งแรง มีโรลบาร์นิรภัย'
    },
    {
      id: 'chassis_lightweight',
      name: 'โครงสร้างโมโนค็อก โครโมลี่น้ำหนักเบาพิเศษ',
      price: 4500,
      weight: 270,
      stiffness: 2.0,
      desc: 'ผลิตจากเหล็กโครโมลี่ 4130 น้ำหนักเบาพิเศษ ทนทานต่อแรงบิดมหาศาล'
    },
    {
      id: 'chassis_pickup_ladder',
      name: 'แชสซีส์กระบะคัสซีบันไดเสริมเหล็ก Drag Pickup Ladder',
      price: 7500,
      weight: 410,
      stiffness: 2.2,
      desc: 'คัสซีเหล็กกล้าแบบขั้นบันได ทนรับแรงบิดมหาศาล 2,000+ Nm ไม่บิดงอ'
    },
    {
      id: 'chassis_nascar_steel',
      name: 'โครงสร้างกรงเหล็กนิรภัย NASCAR Full Roll-Cage',
      price: 18000,
      weight: 360,
      stiffness: 2.9,
      desc: 'กรงเหล็กกล้ามาตรฐาน NASCAR รองรับแรงกระแทกความเร็วสูง 350+ km/h'
    },
    {
      id: 'chassis_gt_spaceframe',
      name: 'โครงสเปซเฟรมโครโมลี่ GT3 Pro Competition',
      price: 45000,
      weight: 220,
      stiffness: 3.6,
      desc: 'สเปซเฟรมแข่งระดับโลก บาลานซ์น้ำหนัก 50:50 สมดุลสูงสุดเข้าโค้งและทางตรง'
    },
    {
      id: 'chassis_formula_monocoque',
      name: 'โครงสร้างคาร์บอนไฟเบอร์ Formula Monocoque Tub',
      price: 120000,
      weight: 140,
      stiffness: 5.2,
      desc: 'คาร์บอนฮันนี่คอมบ์เกรด F1 แข็งแกร่งที่สุดในโลก และเบาหวิวเพียง 140 kg!'
    }
  ],

  // 2. BODY SHELL
  body: [
    {
      id: 'body_none',
      name: 'ไม่มีตัวถัง (โครงเหล็กเปลือย)',
      price: 0,
      weight: 0,
      dragCoeff: 0.55,
      color: '#64748b',
      desc: 'วิ่งแบบโครงเหล็กดิบๆ ระบายความร้อนดีแต่ต้านลมสูง'
    },
    {
      id: 'body_porsche_911_turbo_s',
      name: 'ตัวถัง Porsche 911 Turbo S (992)',
      price: 0,
      weight: 320,
      dragCoeff: 0.29,
      color: '#64748b',
      desc: 'ตัวถังซูเปอร์คาร์เยอรมันเครื่องวางหลัง แอโร่ไดนามิกส์สมบูรณ์แบบ'
    },
    {
      id: 'body_ford_ranger_2004',
      name: 'ตัวถัง Ford Ranger 2.5 Open Cab (2004)',
      price: 0,
      weight: 380,
      dragCoeff: 0.36,
      color: '#f8fafc',
      desc: 'ตัวถังกระบะ Open Cab ปี 2004 สีขาวคาดลาย RANGER WILDTRAK ล้อ 5 ก้านเบรกแดง'
    }
  ],

  // 3. ENGINE BLOCK
  engine_block: [
    {
      id: 'none',
      name: 'ไม่มีเครื่องยนต์',
      price: 0,
      displacement: 0,
      cylinders: 0,
      baseHp: 0,
      baseTorque: 0,
      redlineRpm: 0,
      idleRpm: 0,
      weight: 0,
      desc: 'ยังไม่ได้ติดตั้งเครื่องยนต์'
    },
    {
      id: 'block_i4_vtec',
      name: 'บล็อกเครื่อง 2.0L Inline-4 DOHC VTEC',
      price: 1500,
      displacement: 2.0,
      cylinders: 4,
      baseHp: 215,
      baseTorque: 205,
      redlineRpm: 8800,
      idleRpm: 950,
      weight: 140,
      soundType: 'i4',
      desc: 'เครื่อง 4 สูบแคมคู่ รอบจัด เสียงหวาน ลากได้ถึง 8,800 RPM'
    },
    {
      id: 'block_i6_2jz',
      name: 'บล็อกเหล็กหล่อในตำนาน 3.0L Inline-6 2JZ',
      price: 3800,
      displacement: 3.0,
      cylinders: 6,
      baseHp: 320,
      baseTorque: 430,
      redlineRpm: 8000,
      idleRpm: 850,
      weight: 220,
      soundType: 'i6',
      desc: 'เครื่อง 6 สูบเรียงเสื้อเหล็กหล่อเหนียวพิเศษ ทนรับบูสต์หนักได้มากกว่า 1,000 แรงม้า!'
    },
    {
      id: 'block_v6_tt',
      name: 'บล็อกเครื่อง 3.5L Twin-Cam V6',
      price: 4200,
      displacement: 3.5,
      cylinders: 6,
      baseHp: 340,
      baseTorque: 420,
      redlineRpm: 7600,
      idleRpm: 800,
      weight: 195,
      soundType: 'v6',
      desc: 'เครื่อง V6 อลูมิเนียม น้ำหนักเบากว่า I6 กำลังสม่ำเสมอทุกย่านรอบ'
    },
    {
      id: 'block_v8_big',
      name: 'บล็อกยักษ์ 5.0L Crossplane V8 Big-Block',
      price: 5500,
      displacement: 5.0,
      cylinders: 8,
      baseHp: 440,
      baseTorque: 580,
      redlineRpm: 7000,
      idleRpm: 750,
      weight: 260,
      soundType: 'v8',
      desc: 'เครื่อง V8 พลังดิบ ทอร์คมหาศาลตั้งแต่ออกตัว เสียงกระหึ่มเร้าใจ'
    },
    {
      id: 'block_diesel_pickup',
      name: 'บล็อกดีเซล 3.0L Commonrail Turbo (Thai Drag King)',
      price: 3500,
      displacement: 3.0,
      cylinders: 4,
      baseHp: 380,
      baseTorque: 780,
      redlineRpm: 5600,
      idleRpm: 800,
      weight: 240,
      soundType: 'diesel',
      desc: 'เครื่องดีเซลคอมมอนเรล 4 สูบ ทอร์คมหาศาล 780 Nm ออกตัวดึงกระชากวิญญาณ ควันดำท่วมลู่'
    },
    {
      id: 'block_nascar_v8',
      name: 'บล็อกเหล็กแข่ง 5.8L Pushrod NASCAR V8 (9,200 RPM)',
      price: 28000,
      displacement: 5.8,
      cylinders: 8,
      baseHp: 750,
      baseTorque: 720,
      redlineRpm: 9200,
      idleRpm: 1050,
      weight: 245,
      soundType: 'v8',
      desc: 'เครื่องยนต์ V8 สต็อกคาร์แท้ ลากรอบทะลุ 9,200 RPM เสียงคำรามสนั่นโลก'
    },
    {
      id: 'block_v10_gt3',
      name: 'บล็อกอลูมิเนียม 5.2L Naturally Aspirated V10 GT3',
      price: 65000,
      displacement: 5.2,
      cylinders: 10,
      baseHp: 640,
      baseTorque: 610,
      redlineRpm: 9000,
      idleRpm: 950,
      weight: 215,
      soundType: 'v10',
      desc: 'เครื่อง V10 ซูเปอร์คาร์สนามแข่ง เสียงหวีดหวานสะท้านอารมณ์ ตอบสนองไวทุกสัมผัส'
    },
    {
      id: 'block_v12_quad_turbo',
      name: 'บล็อกมหาประลัย 6.5L Quad-Turbo V12 Hypercar',
      price: 180000,
      displacement: 6.5,
      cylinders: 12,
      baseHp: 1100,
      baseTorque: 1250,
      redlineRpm: 8600,
      idleRpm: 900,
      weight: 275,
      soundType: 'v12',
      desc: 'เครื่อง 12 สูบ 4 เทอร์โบ ไฮเปอร์คาร์ 1,100 แรงม้าตั้งแต่ออกจากโรงงาน นุ่มนวลแต่ไร้ขีดจำกัด'
    },
    {
      id: 'block_f1_hybrid_v6',
      name: 'บล็อก 1.6L Formula V6 Turbo Hybrid (15,000 RPM)',
      price: 450000,
      displacement: 1.6,
      cylinders: 6,
      baseHp: 1050,
      baseTorque: 800,
      redlineRpm: 15000,
      idleRpm: 3800,
      weight: 110,
      soundType: 'f1',
      desc: 'สุดยอดเทคโนโลยีรถสูตร 1 รอบหมุน 15,000 RPM น้ำหนักเบาเพียง 110 kg พลัง 1,050 HP!'
    }
  ],

  // 4. CYLINDER HEAD & CAMSHAFT
  head_cams: [
    {
      id: 'head_stock',
      name: 'ฝาสูบและแคมชาร์ฟท์เดิมโรงงาน OEM',
      price: 0,
      hpMultiplier: 1.0,
      torqMultiplier: 1.0,
      rpmBonus: 0,
      roughIdle: false,
      desc: 'รอบเดินเบานิ่ง เดินเรียบ ขับง่าย'
    },
    {
      id: 'head_stage2',
      name: 'แคมชาร์ฟท์องศาสูง Stage 2 Street/Track 272°',
      price: 1100,
      hpMultiplier: 1.15,
      torqMultiplier: 1.08,
      rpmBonus: 600,
      roughIdle: true,
      desc: 'เปิดวาล์วได้ลึกและนานขึ้น เพิ่มแรงม้าช่วงกลางและปลาย มีเสียงเดินเบาตับๆ'
    },
    {
      id: 'head_stage3_drag',
      name: 'ฝาสูบ CNC พอร์ตโฟลว์ + แคมแข่ง Drag 288°',
      price: 2800,
      hpMultiplier: 1.30,
      torqMultiplier: 1.16,
      rpmBonus: 1200,
      roughIdle: true,
      desc: 'ฝาสูบขัดขยายพอร์ตไอดีไอเสียเต็มพิกัด ลากรอบได้เกิน 9,000+ RPM เสียงสับรัวสุดดิบ'
    },
    {
      id: 'head_titanium_valves',
      name: 'ฝาสูบ Billet Race + วาล์วไทเทเนียม PAC Dual Springs 305°',
      price: 8500,
      hpMultiplier: 1.45,
      torqMultiplier: 1.25,
      rpmBonus: 2200,
      roughIdle: true,
      desc: 'วาล์วไทเทเนียมน้ำหนักเบาพิเศษ ทนการลอยของวาล์ว ลากรอบทะลุ 10,500 RPM ปลอดภัย!'
    },
    {
      id: 'head_f1_pneumatic',
      name: 'ระบบฝาสูบวาล์วลม Formula Pneumatic Valve System (15,000+ RPM)',
      price: 75000,
      hpMultiplier: 1.68,
      torqMultiplier: 1.35,
      rpmBonus: 4500,
      roughIdle: true,
      desc: 'ไร้สปริงวาล์ว! ใช้แรงดันลมไนโตรเจนคืนวาล์ว ลากรอบ 15,000 RPM ไม่มีวันวาล์วลอยลูกสูบแตก!'
    }
  ],

  // 5. PISTONS & RODS (ลูกสูบ & ก้านสูบ - กำหนดขีดจำกัดแรงม้าและบูสต์!)
  pistons_rods: [
    {
      id: 'pistons_cast',
      name: 'ลูกสูบและก้านสูบหล่อเดิม OEM',
      price: 0,
      maxHpLimit: 380,
      maxBoostLimit: 0.9, // Bar
      weight: 15,
      desc: 'รับแรงม้าได้ไม่เกิน 380 HP หากบูสต์เกินก้านจะโก่งหรือทะลุเสื้อสูบ!'
    },
    {
      id: 'pistons_forged',
      name: 'ชุดลูกสูบฟอร์จ + ก้าน H-Beam Forged Steel',
      price: 1800,
      maxHpLimit: 750,
      maxBoostLimit: 1.9, // Bar
      weight: 12,
      desc: 'เหล็กตีขึ้นรูปความหนาแน่นสูง รองรับบูสต์ได้ถึง 1.9 Bar และรับได้ถึง 750 HP'
    },
    {
      id: 'pistons_billet_race',
      name: 'ชุดลูกสูบเคลือบเซรามิก + ก้าน Billet Extreme Drag',
      price: 4200,
      maxHpLimit: 1500,
      maxBoostLimit: 3.2, // Bar
      weight: 10,
      desc: 'สเปกแข่งระดับโลก เกรดอากาศยาน รับแรงอัดและบูสต์โหดได้มากกว่า 1,500 HP!'
    },
    {
      id: 'pistons_titanium_drag',
      name: 'ชุดลูกสูบ Billet Diamond-Coated + ก้าน Titanium Pro Mod',
      price: 16000,
      maxHpLimit: 2500,
      maxBoostLimit: 4.5,
      weight: 7,
      desc: 'ก้านสูบไทเทเนียมเกรด Top Fuel ทนทานต่อแรงบิดระเบิด 2,500 HP และบูสต์ 4.5 Bar!'
    },
    {
      id: 'pistons_f1_monolithic',
      name: 'ชุดลูกสูบเบอริลเลียม + ก้าน Monolithic Formula Apex (รองรับแรงม้าไร้ขีดจำกัด)',
      price: 85000,
      maxHpLimit: 999999,
      maxBoostLimit: 999.0,
      weight: 5,
      desc: 'เทคโนโลยีระดับอวกาศ รับบูสต์และแรงอัดได้ไม่จำกัด แกร่งดุจเพชร รองรับการจูนระดับหมื่นแรงม้าไร้ขีดจำกัด!'
    }
  ],

  // 6. STARTER & BATTERY (ขาดชิ้นนี้ = สตาร์ทไม่หมุน)
  starter_battery: [
    {
      id: 'starter_none',
      name: 'ไม่มีมอเตอร์สตาร์ทและแบตเตอรี่',
      price: 0,
      canStart: false,
      weight: 0,
      desc: 'ไม่มีระบบไฟสตาร์ท ทำให้เครื่องไม่หมุน'
    },
    {
      id: 'starter_oem',
      name: 'แบตเตอรี่น้ำ Lead-Acid + มอเตอร์สตาร์ทเดิม',
      price: 300,
      canStart: true,
      weight: 18,
      desc: 'ระบบสตาร์ทมาตรฐานเพียงพอสำหรับติดเครื่อง'
    },
    {
      id: 'starter_racing',
      name: 'แบตเตอรี่ลิเธียมเรซซิ่ง + ไดร์สตาร์ทไฮทอร์ค',
      price: 850,
      canStart: true,
      weight: 6,
      desc: 'ลดน้ำหนักได้ถึง 12 kg ไดสตาร์ทกำลังสูงหมุนเครื่องเร็วขึ้น'
    },
    {
      id: 'starter_supercap',
      name: 'คาปาซิเตอร์พลังงานสูง Ultra-Capacitor + Brushless Start (1 kg)',
      price: 4500,
      canStart: true,
      weight: 1,
      desc: 'หนักเพียง 1 กิโลกรัม จ่ายกระแสไฟกระชาก 1,500A สตาร์ทติดในเสี้ยววินาที'
    }
  ],

  // 7. IGNITION & SPARK (ขาดชิ้นนี้ = ไม่มีประกายไฟ จุดระเบิดไม่ติด)
  ignition: [
    {
      id: 'ignition_none',
      name: 'ไม่มีหัวเทียนและคอยล์จุดระเบิด',
      price: 0,
      hasSpark: false,
      maxSparkBoost: 0,
      weight: 0,
      desc: 'ไม่มีประกายไฟ จุดระเบิดไม่ได้'
    },
    {
      id: 'ignition_oem',
      name: 'หัวเทียนทองแดง OEM + คอยล์เดิม',
      price: 250,
      hasSpark: true,
      maxSparkBoost: 1.1, // ไฟจะเริ่มดับเมื่อบูสต์เกิน 1.1 bar
      weight: 4,
      desc: 'ระบบไฟเดิม เหมาะกับเครื่อง NA หรือบูสต์เบาๆ ไม่เกิน 1.1 Bar'
    },
    {
      id: 'ignition_plasma',
      name: 'หัวเทียนอิริเดียมเบอร์ 9 + คอยล์ซิ่งแยกสูบ High-Energy',
      price: 950,
      hasSpark: true,
      maxSparkBoost: 3.5,
      weight: 3,
      desc: 'ประกายไฟเข้มข้น จุดระเบิดแม่นยำ ไม่สะดุดแม้โดนบูสต์หนักหรือฉีดไนตรัส'
    },
    {
      id: 'ignition_cdi_drag',
      name: 'กล่องจุดระเบิด Drag CDI 500mJ Multi-Spark + คอยล์แยกสูบซิ่ง',
      price: 4200,
      hasSpark: true,
      maxSparkBoost: 4.8,
      weight: 3,
      desc: 'พลังงานประกายไฟ 500 มิลลิจูล ไฟแรงพอเผาไหม้น้ำมันและไนตรัสทุกหยด'
    },
    {
      id: 'ignition_f1_laser',
      name: 'ระบบจุดระเบิดเลเซอร์ Formula Laser Pre-Chamber Igniter',
      price: 38000,
      hasSpark: true,
      maxSparkBoost: 6.5,
      weight: 1,
      desc: 'ยิงเลเซอร์จุดระเบิดล่วงหน้าในห้อง Pre-Chamber เผาไหม้ 100% ประสิทธิภาพระดับ F1'
    }
  ],

  // 8. FUEL SYSTEM (ปั๊มติ๊ก & หัวฉีด - ถ้าไม่พอน้ำมันจะบาง เครื่องเขกพัง)
  fuel_system: [
    {
      id: 'fuel_none',
      name: 'ไม่มีปั๊มน้ำมันเชื้อเพลิงและหัวฉีด',
      price: 0,
      hasFuel: false,
      maxFuelHp: 0,
      weight: 0,
      desc: 'ไม่มีน้ำมันเข้าสู่ห้องเผาไหม้'
    },
    {
      id: 'fuel_stock',
      name: 'ปั๊มติ๊กเดิม 120 LPH + หัวฉีด 330cc',
      price: 350,
      hasFuel: true,
      maxFuelHp: 280,
      weight: 5,
      desc: 'สำหรับเครื่องสแตนดาร์ด หากจูนแรงม้าเกิน 280 HP น้ำมันจะบางจัดจนเครื่องน็อค'
    },
    {
      id: 'fuel_highflow',
      name: 'ปั๊มติ๊ก Walbro 255 LPH + หัวฉีด 750cc + เรกูเลเตอร์ซิ่ง',
      price: 1200,
      hasFuel: true,
      maxFuelHp: 680,
      weight: 6,
      desc: 'รองรับแรงม้าได้ถึง 680 HP จ่ายน้ำมันแม่นยำในรอบสูง'
    },
    {
      id: 'fuel_twin_race',
      name: 'ปั๊มคู่ Twin 450 LPH + หัวฉีด 1500cc รองรับ E85/Race Gas',
      price: 2600,
      hasFuel: true,
      maxFuelHp: 1600,
      weight: 8,
      desc: 'ระบบน้ำมันเกรด Drag รองรับแรงม้าทะลุ 1,500 HP จ่ายน้ำมันได้เหลือๆ'
    },
    {
      id: 'fuel_quad_methanol',
      name: 'ระบบปั๊มรางคู่ Billet + หัวฉีด 16 หัว Pure Methanol (2,600 HP)',
      price: 9500,
      hasFuel: true,
      maxFuelHp: 2600,
      weight: 10,
      desc: 'จ่ายเมทานอลบริสุทธิ์ท่วมห้องเผาไหม้ ลดอุณหภูมิและรองรับได้ถึง 2,600 HP'
    },
    {
      id: 'fuel_f1_direct_350bar',
      name: 'หัวฉีดไดเรกต์อินเจคชั่น 350 Bar Formula Direct Multi-Hole (3,600 HP)',
      price: 55000,
      hasFuel: true,
      maxFuelHp: 3600,
      weight: 6,
      desc: 'แรงดันฉีด 350 บาร์ ละอองฝอยระดับไมครอน จ่ายพลังงานไม่จำกัดถึง 3,600 แรงม้า!'
    }
  ],

  // 9. COOLING / RADIATOR (หม้อน้ำ - ถ้าไม่มีหรือเล็กเกิน เครื่องจะฮีต Overheat จนฝาโก่ง)
  cooling: [
    {
      id: 'cool_none',
      name: 'ไม่มีหม้อน้ำระบายความร้อน',
      price: 0,
      coolingEfficiency: 0.1,
      weight: 0,
      desc: 'ไม่มีระบบหล่อเย็น เครื่องจะร้อนจัดจนลูกสูบละลายและฝาโก่งในทันที!'
    },
    {
      id: 'cool_oem',
      name: 'หม้อน้ำช่องเดียวเดิมโรงงาน + พัดลมเดี่ยว',
      price: 400,
      coolingEfficiency: 1.0,
      weight: 12,
      desc: 'ระบายความร้อนพอดีกับสเปกโรงงาน ไม่เหมาะกับการซัดรอบสูงต่อเนื่อง'
    },
    {
      id: 'cool_aluminum_dual',
      name: 'หม้อน้ำอลูมิเนียม 2 ช่องความจุสูง + พัดลมไฟฟ้าคู่',
      price: 1100,
      coolingEfficiency: 1.8,
      weight: 10,
      desc: 'ระบายความร้อนได้ดีขึ้น 80% ป้องกันอาการความร้อนขึ้นสะสม'
    },
    {
      id: 'cool_drag_race',
      name: 'หม้อน้ำ Drag อลูมิเนียมเกรดหนาพิเศษ 3 ช่อง + พัดลมไฮสปีด',
      price: 2200,
      coolingEfficiency: 2.8,
      weight: 14,
      desc: 'คุมอุณหภูมินิ่งสนิท แม้บูสต์หนักและเร่งรอบจัดที่ 9,000 RPM'
    },
    {
      id: 'cool_quad_copper',
      name: 'หม้อน้ำทองแดงอัลลอยด์ 4 แถว + พัดลม Brushless ไต้ฝุ่น',
      price: 6800,
      coolingEfficiency: 4.2,
      weight: 12,
      desc: 'การถ่ายเทความร้อนดีเยี่ยม ระบายความร้อนได้รวดเร็วทันใจแม้แช่รอบเครื่องนาน'
    },
    {
      id: 'cool_cryogenic_f1',
      name: 'ระบบระบายความร้อนไครโอเจนิก Formula Phase-Change Heat Exchanger',
      price: 42000,
      coolingEfficiency: 7.5,
      weight: 8,
      desc: 'ใช้ของเหลวเปลี่ยนสถานะ ดูดซับความร้อนได้ระดับอวกาศ อุณหภูมิเครื่องไม่มีทางเกิน 85°C!'
    }
  ],

  // 10. FORCED INDUCTION (ระบบอัดอากาศ - เทอร์โบ / ซูเปอร์ชาร์จเจอร์)
  induction: [
    {
      id: 'ind_na',
      name: 'ระบบดูดสดตามธรรมชาติ (NA - Naturally Aspirated)',
      price: 0,
      type: 'NA',
      baseBoost: 0,
      spoolRpm: 0,
      hpBonus: 0,
      whineSound: false,
      desc: 'ไร้ระบบอัดอากาศ ตอบสนองคันเร่งฉับไว ไม่มีอาการเทอร์โบล้า (Turbo Lag)'
    },
    {
      id: 'ind_turbo_small',
      name: 'เทอร์โบเดี่ยว T28 Ball-Bearing (บูสต์เร็ว มาไว)',
      price: 1600,
      type: 'TURBO',
      baseBoost: 0.8,
      spoolRpm: 2600,
      hpBonus: 110,
      blowOff: true,
      desc: 'เทอร์โบขนาดกะทัดรัด บูสต์ติดตั้งแต่ 2,600 RPM ออกตัวคล่องตัว ขับสนุก'
    },
    {
      id: 'ind_turbo_massive',
      name: 'เทอร์โบเดี่ยวยักษ์ Drag T88 Monster Turbo',
      price: 3600,
      type: 'TURBO',
      baseBoost: 1.6,
      spoolRpm: 4600,
      hpBonus: 380,
      blowOff: true,
      desc: 'เทอร์โบลมใหญ่พิเศษ รอเปิดรอบ 4,600 RPM แต่เมื่อบูสต์เต็มที่แรงดึงจะมหาศาล!'
    },
    {
      id: 'ind_twin_turbo',
      name: 'ทวินเทอร์โบคู่ Sequential Twin-Turbo System',
      price: 4900,
      type: 'TWIN_TURBO',
      baseBoost: 1.8,
      spoolRpm: 3200,
      hpBonus: 450,
      blowOff: true,
      desc: 'เทอร์โบ 2 ตัวทำงานประสานกัน ตัวเล็กหมุนก่อน ตัวใหญ่บูสต์ต่อ กำลังมาต่อเนื่องไม่มีขาด'
    },
    {
      id: 'ind_supercharger',
      name: 'ซูเปอร์ชาร์จเจอร์ Roots Blower Supercharger',
      price: 3900,
      type: 'SUPERCHARGER',
      baseBoost: 1.2,
      spoolRpm: 1200,
      hpBonus: 260,
      whineSound: true,
      desc: 'ปั่นด้วยสายพานหน้าเครื่อง บูสต์ติดทันทีตั้งแต่ออกตัว พร้อมเสียงหวีดอันเป็นเอกลักษณ์'
    },
    {
      id: 'ind_promod_twin_billet',
      name: 'ทวินเทอร์โบ Pro Mod Billet Twin 98mm Precision (+780 HP)',
      price: 18500,
      type: 'TURBO',
      baseBoost: 2.8,
      spoolRpm: 3800,
      hpBonus: 780,
      blowOff: true,
      desc: 'เทอร์โบคู่ใบมีดฟอร์จ Billet บูสต์ 2.8 Bar อัดอากาศดั่งพายุทอร์นาโด!'
    },
    {
      id: 'ind_top_fuel_supercharger',
      name: 'ซูเปอร์ชาร์จเจอร์ Top Fuel 14-71 Blower (+1,200 HP)',
      price: 48000,
      type: 'SUPERCHARGER',
      baseBoost: 3.5,
      spoolRpm: 900,
      hpBonus: 1200,
      whineSound: true,
      desc: 'โบลเวอร์ยักษ์ตั้งตระหง่านหน้าเครื่อง ปั๊มอากาศปริมาตรมหาศาล เสียงหวีดดุดันระดับตำนานแดร็ก!'
    },
    {
      id: 'ind_quad_turbo_hyper',
      name: 'ควอดเทอร์โบ 4 ลูก Titanium Carbon Quad-Turbo Hyper (+1,800 HP)',
      price: 160000,
      type: 'TWIN_TURBO',
      baseBoost: 4.2,
      spoolRpm: 2800,
      hpBonus: 1800,
      blowOff: true,
      desc: 'เทอร์โบ 4 ลูกใบพัดเซรามิกไทเทเนียม เพิ่มพลังแรงม้าบ้าคลั่ง 1,800 HP ไร้แล็ก!'
    }
  ],

  // 11. INTERCOOLER (อินเตอร์คูลเลอร์ - ลดอุณหภูมิไอดี ป้องกันน็อคและเพิ่มม้า)
  intercooler: [
    {
      id: 'ic_none',
      name: 'ไม่มีอินเตอร์คูลเลอร์',
      price: 0,
      tempDrop: 0,
      weight: 0,
      desc: 'ไอดีร้อนจัด หากติดเทอร์โบจะสูญเสียแรงม้าและเสี่ยงเครื่องน็อค'
    },
    {
      id: 'ic_street',
      name: 'อินเตอร์คูลเลอร์วางหน้า Front Mount (FMIC) 2.5 นิ้ว',
      price: 750,
      tempDrop: 32,
      weight: 8,
      desc: 'ลดความร้อนไอดีได้ 32°C ช่วยให้อากาศหนาแน่นขึ้น ได้แรงม้าเพิ่ม 5-8%'
    },
    {
      id: 'ic_drag_ice',
      name: 'อินเตอร์คูลเลอร์ Drag หนา 4 นิ้ว พร้อมถังใส่น้ำแข็ง (Ice Tank)',
      price: 1950,
      tempDrop: 65,
      weight: 15,
      desc: 'ไอดีเย็นยะเยือกด้วยถังน้ำแข็ง ลดอุณหภูมิได้ถึง 65°C บูสต์หนักได้อย่างปลอดภัย'
    },
    {
      id: 'ic_water_air_billet',
      name: 'อินเตอร์น้ำ Billet CNC Dual Water-to-Air Core',
      price: 6500,
      tempDrop: 85,
      weight: 12,
      desc: 'ระบบน้ำหล่อเย็นไอดีแยกอิสระ ลดความร้อนได้ถึง 85°C เพิ่มแรงม้ากว่า 12%'
    },
    {
      id: 'ic_liquid_nitrogen',
      name: 'ระบบลดอุณหภูมิไอดีไนโตรเจนเหลว Cryo-SubZero (-120°C)',
      price: 35000,
      tempDrop: 120,
      weight: 9,
      desc: 'ฉีดพ่นไนโตรเจนเหลวใส่ทางเดินไอดี อากาศหนาแน่นดุจอยู่บนยอดเขาเอเวอเรสต์ เพิ่มแรงม้ามหาศาล!'
    }
  ],

  // 12. NITROUS OXIDE (NOS) (ไนตรัส - ฉีดแล้วระเบิดพลังม้าทันที)
  nitrous: [
    {
      id: 'nos_none',
      name: 'ไม่มีระบบไนตรัสออกไซด์',
      price: 0,
      shots: 0,
      boostHp: 0,
      weight: 0,
      desc: 'ไม่มีถังไนตรัส'
    },
    {
      id: 'nos_street_50',
      name: 'ถังไนตรัส Street Single Bottle (50-Shot)',
      price: 1200,
      shots: 1,
      duration: 3.5,
      boostHp: 55,
      weight: 8,
      desc: 'ถังเดียวสีฟ้า ฉีดเพิ่มแรงม้าทันใจ 55 HP นาน 3.5 วินาที'
    },
    {
      id: 'nos_drag_150',
      name: 'ระบบถังคู่ Direct-Port Drag NOS (150-Shot)',
      price: 2900,
      shots: 2,
      duration: 5.0,
      boostHp: 160,
      weight: 16,
      desc: 'หัวฉีดไนตรัสตรงเข้าทุกพอร์ตไอดี พุ่งทะยานเหมือนจรวด เพิ่ม 160 HP ทันที!'
    },
    {
      id: 'nos_stage3_300',
      name: 'ระบบถังสาม Pro Mod 300-Shot Progressive Nitrous',
      price: 8500,
      shots: 3,
      duration: 6.0,
      boostHp: 320,
      weight: 22,
      desc: 'กล่องคุมฉีดไนตรัสแบบโปรเกรสซีฟ 3 จังหวะ เพิ่มพลังแรงม้า 320 HP พุ่งกระชากหลังติดเบาะ!'
    },
    {
      id: 'nos_hyper_quad_500',
      name: 'ระบบถังคาร์บอน 4 ลูก Quad Carbon Top Fuel NOS (550-Shot)',
      price: 32000,
      shots: 4,
      duration: 7.0,
      boostHp: 550,
      weight: 18,
      desc: 'ถังคาร์บอนแรงดันสูง 4 ลูก ฉีดระเบิดมหาพลัง 550 แรงม้า ฉุดวิญญาณสู่เส้นชัยในพริบตา!'
    }
  ],

  // 13. EXHAUST (ท่อไอเสีย)
  exhaust: [
    {
      id: 'exh_oem',
      name: 'ท่อไอเสียเดิมติดรถ พร้อมหม้อพักเงียบ',
      price: 0,
      flowEfficiency: 0.85,
      weight: 22,
      flames: false,
      desc: 'ไอเสียระบายช้า อั้นแรงม้า แต่เสียงเงียบสุภาพ'
    },
    {
      id: 'exh_straight_3in',
      name: 'ท่อสแตนเลสยิงตรง 3 นิ้ว ปลายไทเทเนียม',
      price: 850,
      flowEfficiency: 1.05,
      weight: 11,
      flames: true,
      desc: 'ไอเสียระบายคล่องตัว เพิ่มแรงม้า 15-25 HP มีลูกไฟแลบเวลาเปลี่ยนเกียร์'
    },
    {
      id: 'exh_hood_exit',
      name: 'ท่อซิ่งทะลุฝากระโปรง Hood-Exit Screamer Pipe',
      price: 1700,
      flowEfficiency: 1.15,
      weight: 4,
      flames: true,
      desc: 'ท่อยิงตรงขึ้นฟ้าทะลุฝากระโปรง ไร้แรงต้าน ระบายไอเสียได้ไวที่สุด พ่นลูกไฟสนั่นลู่แข่ง!'
    },
    {
      id: 'exh_titanium_pie_cut',
      name: 'ท่อไทเทเนียมเชื่อมปล้อง Full Titanium 4-Inch Pie-Cut',
      price: 5200,
      flowEfficiency: 1.25,
      weight: 3,
      flames: true,
      desc: 'ท่อไทเทเนียมเกรดอากาศยาน ลายเชื่อมสีรุ้งสวยงาม ระบายไอเสียคล่องตัว น้ำหนักเบาหวิว'
    },
    {
      id: 'exh_f1_inconel_zoomies',
      name: 'ท่ออินโคเนลเกรด F1 Inconel Open Zoomies Header',
      price: 28000,
      flowEfficiency: 1.40,
      weight: 2,
      flames: true,
      desc: 'ท่อ Zoomie โลหะ Inconel พ่นเปลวเพลิงสีน้ำเงินยาว 2 เมตร เสียงแผดดังสะท้านปฐพี!'
    }
  ],

  // 14. TRANSMISSION / GEARBOX (ชุดเกียร์)
  transmission: [
    {
      id: 'trans_none',
      name: 'ไม่มีชุดเกียร์',
      price: 0,
      gears: 0,
      shiftDelay: 99,
      shiftLoss: 1.0,
      weight: 0,
      desc: 'ไม่มีเกียร์ ไม่สามารถส่งกำลังลงล้อได้'
    },
    {
      id: 'trans_manual_4sp',
      name: 'เกียร์ธรรมดา 4 สปีด อัตราทดกว้าง',
      price: 600,
      gears: 4,
      ratios: [3.4, 2.1, 1.4, 1.0],
      finalDrive: 3.9,
      shiftDelay: 0.38,
      shiftLoss: 0.15,
      weight: 45,
      desc: 'เกียร์ 4 เกียร์พื้นฐาน เปลี่ยนเกียร์ช้าหน่อย แต่อึดทนทาน'
    },
    {
      id: 'trans_manual_6sp',
      name: 'เกียร์ธรรมดา 6 สปีด Close-Ratio ชิดรอบจัด',
      price: 1800,
      gears: 6,
      ratios: [3.6, 2.38, 1.76, 1.35, 1.06, 0.84],
      finalDrive: 4.1,
      shiftDelay: 0.25,
      shiftLoss: 0.10,
      weight: 55,
      desc: 'เกียร์อัตราทดชิด รอบไม่ตกตอนเข้าเกียร์ ช่วยให้ความเร็วขึ้นต่อเนื่อง'
    },
    {
      id: 'trans_dogbox_drag',
      name: 'เกียร์ซีเควนเชียล Drag Dogbox ฟันตรง 5 สปีด',
      price: 4500,
      gears: 5,
      ratios: [3.2, 2.15, 1.55, 1.18, 0.95],
      finalDrive: 3.73,
      shiftDelay: 0.08,
      shiftLoss: 0.04,
      weight: 42,
      gearWhine: true,
      desc: 'เกียร์ฟันตรงสเปกแข่ง สับเกียร์ได้ในเสี้ยววินาที ไม่เสียบูสต์เทอร์โบ'
    },
    {
      id: 'trans_sequential_air',
      name: 'เกียร์ซีเควนเชียล Air-Pneumatic Paddle Shift 6 สปีด (30ms)',
      price: 14000,
      gears: 6,
      ratios: [3.4, 2.30, 1.70, 1.32, 1.08, 0.90],
      finalDrive: 3.85,
      shiftDelay: 0.03,
      shiftLoss: 0.02,
      weight: 38,
      gearWhine: true,
      desc: 'ระบบลมดันสับเกียร์ในเวลาเพียง 30 มิลลิวินาที รอบแทบไม่สะดุด ส่งกำลังต่อเนื่องไร้รอยต่อ'
    },
    {
      id: 'trans_lenco_planetary',
      name: 'เกียร์ดาวเคราะห์ Drag Lenco Planetary 4-Speed (ทน 3,000 HP)',
      price: 38000,
      gears: 4,
      ratios: [2.9, 1.95, 1.38, 1.00],
      finalDrive: 3.50,
      shiftDelay: 0.015,
      shiftLoss: 0.01,
      weight: 48,
      gearWhine: true,
      desc: 'เกียร์ระดับ Dragster อาชีพ สับเกียร์ใน 15 มิลลิวินาที ทนแรงบิดและมหาแรงม้า 3,000 HP!'
    },
    {
      id: 'trans_dct_7sp',
      name: 'เกียร์ดูอัลคลัตช์ Supercar Dual-Clutch 7 สปีด (DCT 40ms)',
      price: 22000,
      gears: 7,
      ratios: [3.40, 2.35, 1.75, 1.35, 1.08, 0.88, 0.72],
      finalDrive: 3.90,
      shiftDelay: 0.04,
      shiftLoss: 0.02,
      weight: 44,
      gearWhine: false,
      desc: 'เกียร์คลัตช์คู่ 7 สปีด สับเกียร์รวดเร็ว อัตราทดเรียงชิดลงตัว ดึงหนักทุกเกียร์ความเร็วไหลทะลุ 370 km/h!'
    },
    {
      id: 'trans_f1_seamless',
      name: 'เกียร์แข่ง Formula Seamless Shift 8-Speed (0ms Shift)',
      price: 125000,
      gears: 8,
      ratios: [3.50, 2.50, 1.90, 1.50, 1.22, 1.00, 0.82, 0.68],
      finalDrive: 3.80,
      shiftDelay: 0.002,
      shiftLoss: 0.00,
      weight: 28,
      gearWhine: true,
      desc: 'เกียร์ซีมเลส F1 การส่งกำลังไม่สะดุดแม้แต่เสี้ยววินาที 8 เกียร์ซอยชิดทะลวงความเร็วทะลุ 450+ km/h!'
    }
  ],

  // 15. TIRES & RIMS (ล้อและยาง - ตัวกำหนด Grip/Traction ออกตัว)
  tires: [
    {
      id: 'tires_street',
      name: 'ยางเรเดียลติดรถใช้งานทั่วไป (Street Radial)',
      price: 300,
      gripCoeff: 1.0,
      heatWarmRate: 0.8,
      weight: 40,
      desc: 'ยางถนนทั่วไป ลื่นฟรีทิ้งง่ายเวลาออกตัวแรงๆ'
    },
    {
      id: 'tires_semislick',
      name: 'ยางสปอร์ต Semi-Slick ดอกยางน้อย หนึบปานกลาง',
      price: 1200,
      gripCoeff: 1.55,
      heatWarmRate: 1.4,
      weight: 38,
      desc: 'ยางซอฟต์คอมปาวด์ ยึดเกาะถนนได้ดีเยี่ยม ลดอาการล้อหมุนฟรี'
    },
    {
      id: 'tires_drag_slick',
      name: 'ยางแดร็กสลิคแท้ 15 นิ้ว แก้มย้วย (Mickey Thompson Slicks)',
      price: 2800,
      gripCoeff: 2.35,
      heatWarmRate: 2.5,
      weight: 44,
      desc: 'ยางแข่งทางตรงขนานแท้ เมื่อเบิร์นยางจนร้อนจะเหนียวติดแทร็ก ออกตัวได้เต็มร้อยม้าไม่ฟรีทิ้ง!'
    },
    {
      id: 'tires_hoosier_wrinkle',
      name: 'ยางแก้มย้วยซุปเปอร์สลิค Hoosier Wrinkle-Wall 33 นิ้ว',
      price: 7500,
      gripCoeff: 3.20,
      heatWarmRate: 3.2,
      weight: 42,
      desc: 'แก้มยางย้วยบิดรับแรงกระชาก ออกตัวได้โดยไม่สูญเสียการยึดเกาะ รองรับ 1,500+ HP'
    },
    {
      id: 'tires_topfuel_giant',
      name: 'ยางยักษ์ Top Fuel Dragster Giant Slicks 36 นิ้ว',
      price: 24000,
      gripCoeff: 4.50,
      heatWarmRate: 4.5,
      weight: 52,
      desc: 'ยางขนาดมหึมาเกรด Top Fuel เหนียวติดแทร็กราวกับทากาว ออกตัว 0-100 ใน 1 วินาที!'
    },
    {
      id: 'tires_f1_soft_pirelli',
      name: 'ยาง Formula P-Zero Red Soft Compound (F1 Spec)',
      price: 60000,
      gripCoeff: 5.40,
      heatWarmRate: 5.0,
      weight: 32,
      desc: 'คอมปาวด์พิเศษ F1 ร้อนเร็ว ยึดเกาะระดับสูงสุด 5.4x ออกตัวและทรงตัวดั่งรถไฟเหาะตีลังกา'
    }
  ],

  // 16. AERODYNAMICS (แอโร่ไดนามิกส์ - สปอยเลอร์ & ลิ้นหน้า)
  aero: [
    {
      id: 'aero_stock',
      name: 'ไม่มีชุดแต่งแอโร่',
      price: 0,
      dragBonus: 0,
      downforce: 0,
      weight: 0,
      desc: 'รูปทรงเดิมๆ'
    },
    {
      id: 'aero_ducktail',
      name: 'ตูดเป็ด Drag Ducktail + ลิ้นหน้า Air Dam',
      price: 650,
      dragBonus: -0.02,
      downforce: 25,
      weight: 8,
      desc: 'รีดอากาศใต้ท้องรถ ลดลมหมุนวนท้ายรถ เพิ่มความเร็วปลาย'
    },
    {
      id: 'aero_drag_wing',
      name: 'วิงหลัง Drag Wing อลูมิเนียม พร้อมการ์ดดักลมหน้า',
      price: 1600,
      dragBonus: -0.04,
      downforce: 75,
      weight: 14,
      desc: 'สร้าง Downforce กดท้ายรถให้นิ่งตรงแหน่วที่ความเร็วเกิน 250 km/h ป้องกันรถเป๋'
    },
    {
      id: 'aero_gt3_carbon',
      name: 'ชุดแอโร่ GT3 Swan-Neck Carbon Wing + Front Splitter Canards',
      price: 8500,
      dragBonus: -0.06,
      downforce: 180,
      weight: 10,
      desc: 'วิงคอห่านคาร์บอนไฟเบอร์ กดท้ายรถนิ่งสนิท และลดแรงต้านอากาศความเร็วสูง'
    },
    {
      id: 'aero_nascar_spoiler',
      name: 'สปอยเลอร์ NASCAR Lexan Blade + Roof Aero Flaps',
      price: 12000,
      dragBonus: -0.07,
      downforce: 240,
      weight: 8,
      desc: 'แผ่นสปอยเลอร์ทรงสูงสไตล์ NASCAR ป้องกันรถเหินและสร้างแรงกดมหาศาล'
    },
    {
      id: 'aero_f1_drs_package',
      name: 'ชุดแอโร่ไดนามิกส์ Formula Active DRS Wing + Venturi Ground Effect',
      price: 78000,
      dragBonus: -0.12,
      downforce: 550,
      weight: 7,
      desc: 'ระบบปีกเปิด DRS ลดแรงต้าน 12% บนทางตรง พร้อมอุโมงค์ใต้ท้องรถ Ground Effect กดตัวรถติดพื้น!'
    }
  ],

  // 17. BRAKES & PARACHUTE (ระบบเบรกและร่มชูชีพ)
  brakes: [
    {
      id: 'brake_stock',
      name: 'ดิสก์เบรกเดิมติดรถ 1 พอต',
      price: 0,
      brakeForce: 1.0,
      weight: 20,
      hasChute: false,
      desc: 'เบรกเดิมโรงงาน ระยะเบรกยาวหน่อย'
    },
    {
      id: 'brake_big_caliper',
      name: 'ชุดเบรกคาร์บอนเซรามิก 6-Piston Calipers',
      price: 1400,
      brakeForce: 2.2,
      weight: 16,
      hasChute: false,
      desc: 'จับสนิท เบรกหยุดได้มั่นใจในระยะสั้น'
    },
    {
      id: 'brake_parachute',
      name: 'เบรกร่มชูชีพ Drag Parachute System',
      price: 2600,
      brakeForce: 4.5,
      weight: 12,
      hasChute: true,
      desc: 'กางร่มชูชีพหยุดรถหลังผ่านเส้น 402 เมตรอย่างปลอดภัย เบรกหยุดได้เร็วที่สุดในโลก!'
    },
    {
      id: 'brake_carbon_f1',
      name: 'ชุดเบรกคาร์บอน-คาร์บอน Formula Carbon-Carbon Rotors',
      price: 18000,
      brakeForce: 5.5,
      weight: 8,
      hasChute: false,
      desc: 'จานเบรกคาร์บอนเกรด F1 ทนความร้อน 1,000°C หยุดรถจาก 350 km/h ได้ในระยะสั้นที่สุด'
    },
    {
      id: 'brake_dual_chute_hyper',
      name: 'ระบบร่มชูชีพคู่ Dual Top Fuel Chutes + เบรกไทเทเนียม 8 พอต',
      price: 45000,
      brakeForce: 8.0,
      weight: 10,
      hasChute: true,
      desc: 'ร่มชูชีพคู่ขนาดมหึมา หยุดรถความเร็ว 450+ km/h ได้ปลอดภัย 100% ไม่หลุดแทร็ก!'
    }
  ],

  // 14. FRONT BUMPER & SPLITTER (กันชนหน้า & สปลิตเตอร์)
  front_bumper: [
    {
      id: 'front_stock',
      name: 'กันชนหน้าเดิมโรงงาน OEM',
      price: 0,
      dragBonus: 0,
      downforce: 0,
      weight: 12,
      desc: 'กันชนหน้ามาตรฐานสแตนดาร์ด'
    },
    {
      id: 'front_drag_lip',
      name: 'ลิ้นหน้าคาร์บอน Drag Aero Splitter',
      price: 950,
      dragBonus: -0.015,
      downforce: 15,
      weight: 6,
      desc: 'ลิ้นหน้าคาร์บอนไฟเบอร์จัดระเบียบลมใต้ท้องรถ ลดแรงต้านลม'
    },
    {
      id: 'front_gt_splitter',
      name: 'สปลิตเตอร์หน้า GT3 + คานาร์ดคู่ Carbon Canards',
      price: 3200,
      dragBonus: -0.025,
      downforce: 45,
      weight: 8,
      desc: 'ชุดลิ้นหน้าและครีบดักลมเกรด GT3 กดหน้ารถนิ่งสนิทที่ความเร็ว 300+ km/h'
    },
    {
      id: 'front_nascar_airdam',
      name: 'แอร์ดัมเหล็กกล้ากวาดลม NASCAR Blade Air-Dam',
      price: 8500,
      dragBonus: -0.035,
      downforce: 60,
      weight: 10,
      desc: 'แอร์ดัมกวาดลมลงต่ำ ปิดช่องว่างใต้หน้ารถ ลู่ลมความเร็วสูง'
    },
    {
      id: 'front_f1_wing',
      name: 'ปีกหน้าคาร์บอนมัลติเอเลเมนต์ Formula Multi-Element Wing',
      price: 35000,
      dragBonus: -0.050,
      downforce: 120,
      weight: 4,
      desc: 'ปีกหน้าแอร์โร่ไดนามิกส์ระดับ F1 สร้างแรงกดมหาศาลและลู่ลมสูงสุด'
    }
  ],

  // 15. SIDE SKIRTS (สเกิร์ตข้าง)
  side_skirts: [
    {
      id: 'skirts_stock',
      name: 'สเกิร์ตข้างเดิมติดรถ OEM',
      price: 0,
      dragBonus: 0,
      weight: 10,
      desc: 'สเกิร์ตข้างมาตรฐาน'
    },
    {
      id: 'skirts_drag_low',
      name: 'สเกิร์ตข้างแบนเรียบ Drag Ground-Effect Skirts',
      price: 800,
      dragBonus: -0.01,
      weight: 6,
      desc: 'สเกิร์ตข้างแผ่นเรียบ กันลมม้วนเข้าใต้ท้องรถ'
    },
    {
      id: 'skirts_carbon',
      name: 'สเกิร์ตข้างคาร์บอนไฟเบอร์พร้อมครีบจัดลม Aero Fins',
      price: 2400,
      dragBonus: -0.02,
      weight: 4,
      desc: 'คาร์บอนแท้น้ำหนักเบา รีดกระแสลมข้างลำตัวรถได้อย่างลื่นไหล'
    }
  ],

  // 16. REAR WING / SPOILER (วิงหลัง & สปอยเลอร์)
  rear_wing: [
    {
      id: 'wing_none',
      name: 'ไม่มีสปอยเลอร์ (Clean Tail)',
      price: 0,
      dragBonus: 0,
      downforce: 0,
      weight: 0,
      desc: 'ท้ายรถเรียบโล่ง น้ำหนักเบา ต้านลมน้อยที่สุด'
    },
    {
      id: 'wing_ducktail',
      name: 'สปอยเลอร์ตูดเป็ด Ducktail Carbon Spoiler',
      price: 1100,
      dragBonus: 0.005,
      downforce: 25,
      weight: 3,
      desc: 'สปอยเลอร์แนบท้าย สไตล์เรโทร JDM สวยงามและช่วยกดท้าย'
    },
    {
      id: 'wing_gt_carbon',
      name: 'วิงหลัง GT3 ทรงสูงคอห่าน Swan-Neck Carbon Wing',
      price: 4500,
      dragBonus: 0.015,
      downforce: 95,
      weight: 7,
      desc: 'วิงคาร์บอนขนาดใหญ่ ปรับองศาได้ กดท้ายรถนิ่งสนิทไม่ปัดส่าย'
    },
    {
      id: 'wing_drag_chute',
      name: 'วิงแผ่นเรียบอลูมิเนียม Drag Pro Mod + ถุงร่มชูชีพ Chute Pack',
      price: 9500,
      dragBonus: 0.01,
      downforce: 110,
      weight: 9,
      desc: 'วิงแดร็กสเปกโปรม็อดพร้อมกระเป๋าร่มชูชีพ เพิ่มแรงกดและสมดุลการเบรก'
    },
    {
      id: 'wing_nascar_blade',
      name: 'สปอยเลอร์แผ่นตั้ง NASCAR Lexan Blade Spoiler',
      price: 16000,
      dragBonus: 0.012,
      downforce: 130,
      weight: 6,
      desc: 'แผ่นสปอยเลอร์ตั้งชันแบบสต็อกคาร์ เสถียรภาพสูงสุดทางตรง'
    },
    {
      id: 'wing_formula_drs',
      name: 'ปีกหลัง Formula Biplane Carbon Wing + ระบบ DRS',
      price: 48000,
      dragBonus: -0.01,
      downforce: 180,
      weight: 5,
      desc: 'ปีกหลังสองชั้นระดับ F1 กดล้อหลังแน่นหนึบ พร้อมเปิดช่องลม DRS ลดแรงต้าน'
    }
  ]
};

// --- DEFAULT STARTER CAR PROFILE ---
const DEFAULT_CAR = {
  name: 'Porsche 911 Turbo S (992)',
  model: 'car_porsche_911_turbo_s',
  parts: {
    model: 'car_porsche_911_turbo_s',
    chassis: 'chassis_tube',
    body: 'body_porsche_911_turbo_s',
    engine_block: 'block_i4_vtec',
    head_cams: 'head_stock',
    pistons_rods: 'pistons_cast',
    starter_battery: 'starter_oem',
    ignition: 'ignition_oem',
    fuel_system: 'fuel_stock',
    cooling: 'cool_oem',
    induction: 'ind_turbo_small',
    intercooler: 'ic_street',
    nitrous: 'nos_none',
    exhaust: 'exh_straight_3in',
    transmission: 'trans_manual_4sp',
    tires: 'tires_street',
    brakes: 'brake_stock',
    front_bumper: 'front_stock',
    side_skirts: 'skirts_stock',
    rear_wing: 'wing_none',
    aero: 'aero_stock'
  },
  tuning: {
    afr: 12.2,             // 10.0 (หนา) - 16.0 (บางเสี่ยงน็อค)
    ignitionAdvance: 4,    // -10° ถึง +40°
    wastegateBoost: 0.8,   // Bar (ปลดล็อกไม่จำกัดบาร์)
    displacementScale: 1.0, // ขยายความจุลูกสูบ / Stroker Scale (1.0x - 10.0x+)
    compressionRatio: 10.0, // อัตราส่วนกำลังอัด (7.0:1 - 18.0:1+)
    camDuration: 272,      // องศาแคมชาร์ฟท์ (240° - 360°+)
    revLimiterRpm: 8400,   // RPM (ปลดล็อกรอบตัดไม่จำกัด)
    launchRpm: 4500,       // Two-step launch RPM
    nitrousFlowHp: 150,    // ขนาดการฉีดไนตรัส (50 - 5000+ HP)
    tirePressurePsi: 26,   // PSI (10 - 45 PSI)
    finalDrive: 3.90       // อัตราทดเฟืองท้าย
  }
};

// --- BOT OPPONENTS FOR DRAG CAREER (9 DIVERSE RACERS) ---
const BOT_ROSTER = [
  {
    id: 'bot_rookie',
    name: 'น้องใหม่หัวใจซิ่ง (Street Rookie)',
    dialogue: 'รถพี่มีแค่เครื่องเดิมๆ น้องกล้าลงเดิมพันรึเปล่าล่ะ!?',
    wager: 150,
    carName: 'Porsche 911 Carrera Street',
    bodyType: 'body_porsche_911_turbo_s',
    engineType: 'block_i4_vtec',
    stats: {
      hp: 175,
      weight: 950,
      grip: 1.1,
      topSpeed: 190,
      shiftSkill: 0.75,
      reactionTime: 0.55
    }
  },
  {
    id: 'bot_diesel_king',
    name: 'ช่างหนุ่ม ดีเซลควันดำ (Diesel Drag King)',
    dialogue: 'ถ้าทนดมควันดำไหวก็เข้ามาเลยน้อง! ทอร์ค 800 Nm ดึงหลังติดเบาะ!',
    wager: 350,
    carName: 'Ford Ranger 2.5 Open Cab (2004) Diesel Drag',
    bodyType: 'body_ford_ranger_2004',
    engineType: 'block_diesel_pickup',
    stats: {
      hp: 380,
      weight: 1200,
      grip: 1.6,
      topSpeed: 220,
      shiftSkill: 0.84,
      reactionTime: 0.45
    }
  },
  {
    id: 'bot_tuner',
    name: 'ช่างเอก อู่ซอยตัน (Highway Tuner)',
    dialogue: 'คันนี้เซ็ตโบ T28 มาขับเล่นๆ ถ้าแพ้พี่แถมสติ๊กเกอร์อู่ให้!',
    wager: 600,
    carName: 'Porsche 911 Boosted Street',
    bodyType: 'body_porsche_911_turbo_s',
    engineType: 'block_i4_vtec',
    stats: {
      hp: 340,
      weight: 1020,
      grip: 1.5,
      topSpeed: 240,
      shiftSkill: 0.88,
      reactionTime: 0.40
    }
  },
  {
    id: 'bot_muscle_boss',
    name: 'ลุงสมหมาย สายมัสเซิล (V8 Swap Boss)',
    dialogue: 'เสียง V8 ของจริงมันต้องกระหึ่มแบบนี้ไอ้น้อง อย่าร้องไห้นะเวลาแพ้!',
    wager: 1200,
    carName: 'Porsche 911 V8 Big-Block Swap',
    bodyType: 'body_porsche_911_turbo_s',
    engineType: 'block_v8_big',
    stats: {
      hp: 520,
      weight: 1350,
      grip: 1.8,
      topSpeed: 265,
      shiftSkill: 0.90,
      reactionTime: 0.35
    }
  },
  {
    id: 'bot_gt3_pro',
    name: 'อเล็กซ์ นักแข่ง GT3 (GT3 Cup Racer)',
    dialogue: 'รถคันนี้เซ็ตอัพตามมาตรฐาน FIA ทุกประการ อากาศพลศาสตร์สมบูรณ์แบบ!',
    wager: 2500,
    carName: 'Porsche 911 Turbo S GT3 Spec',
    bodyType: 'body_porsche_911_turbo_s',
    engineType: 'block_v10_gt3',
    stats: {
      hp: 640,
      weight: 1100,
      grip: 2.3,
      topSpeed: 295,
      shiftSkill: 0.94,
      reactionTime: 0.28
    }
  },
  {
    id: 'bot_drag_pro',
    name: 'พี่เสือ พระรามเก้า (Pro Drag Master)',
    dialogue: 'ระวังควันยางบังตามิดนะไอ้น้อง 2JZ ของพี่ฉีดไนตรัสมาเต็มถัง!',
    wager: 5000,
    carName: 'Porsche 911 2JZ 1,000HP Drag',
    bodyType: 'body_porsche_911_turbo_s',
    engineType: 'block_i6_2jz',
    stats: {
      hp: 850,
      weight: 1150,
      grip: 2.5,
      topSpeed: 310,
      shiftSkill: 0.95,
      reactionTime: 0.24
    }
  },
  {
    id: 'bot_nascar_vet',
    name: 'จอห์นนี่ สต็อกคาร์ (NASCAR Veteran)',
    dialogue: 'รอบ 9,200 RPM กับเสียงเครื่อง V8 สต็อกคาร์จะกลืนกินแก!',
    wager: 12000,
    carName: 'Porsche 911 Turbo S 900HP',
    bodyType: 'body_porsche_911_turbo_s',
    engineType: 'block_nascar_v8',
    stats: {
      hp: 920,
      weight: 1180,
      grip: 2.8,
      topSpeed: 340,
      shiftSkill: 0.96,
      reactionTime: 0.20
    }
  },
  {
    id: 'bot_formula_apex',
    name: 'ดร.เค แชมป์ไฮเปอร์คาร์ (Formula Apex Champion)',
    dialogue: 'นี่คือฟิสิกส์และความเร็วระดับ F1 15,000 RPM... เจ้าไม่มีทางตามทัน!',
    wager: 30000,
    carName: 'Porsche 911 Turbo S E-Hybrid Pro',
    bodyType: 'body_porsche_911_turbo_s',
    engineType: 'block_f1_hybrid_v6',
    stats: {
      hp: 1150,
      weight: 650,
      grip: 4.2,
      topSpeed: 375,
      shiftSkill: 0.99,
      reactionTime: 0.12
    }
  },
  {
    id: 'bot_boss_demon',
    name: 'พญาปีศาจ 7 วิ (The 7-Second Top Fuel Demon)',
    dialogue: 'เจ้าหนุ่ม... เจ้ายังเร็วไม่พอที่จะมองเห็นไฟท้ายข้าหรอก!',
    wager: 80000,
    carName: 'Porsche 911 Quad-Turbo V12 Monster',
    bodyType: 'body_porsche_911_turbo_s',
    engineType: 'block_v12_quad_turbo',
    stats: {
      hp: 2200,
      weight: 780,
      grip: 4.8,
      topSpeed: 420,
      shiftSkill: 1.0,
      reactionTime: 0.08
    }
  }
];
