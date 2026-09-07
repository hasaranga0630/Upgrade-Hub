require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = Number(process.env.PORT || 5000);
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET || 'upgrade_hub_secure_jwt_secret_token_key_2026';

// 1. Disable revealing Express signature
app.disable('x-powered-by');

// 2. HTTP Security Headers with Helmet
app.use(helmet({
  contentSecurityPolicy: false, // Prevents blocking cross-origin assets across local dev ports
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// 3. Strict CORS Policy
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  ...(process.env.FRONTEND_ORIGIN
    ? process.env.FRONTEND_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
    : [])
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    return callback(new Error(`Cross-Origin Request Blocked: Origin ${origin} not allowed by CORS policy.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400
}));

// 4. Strict Payload Limits to Prevent Memory Exhaustion
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// 5. Rate Limiting Protection
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 400, // Max 400 requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP. Please try again later.' }
});

const mutationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // Max 60 mutations per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many transactions or submissions. Please slow down and try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Max 20 authentication requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again after 15 minutes.' }
});

app.use('/api/', apiLimiter);

// 6. NoSQL Injection Defense (Recursive query & body sanitizer)
function sanitizeNoSql(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeNoSql);
  }
  const clean = {};
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      continue;
    }
    clean[key] = sanitizeNoSql(obj[key]);
  }
  return clean;
}

app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') req.body = sanitizeNoSql(req.body);
  if (req.query && typeof req.query === 'object') req.query = sanitizeNoSql(req.query);
  if (req.params && typeof req.params === 'object') req.params = sanitizeNoSql(req.params);
  next();
});

// 7. Cross-Site Scripting (XSS) Sanitization
function sanitizeXss(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/onerror\s*=/gi, '')
    .replace(/onload\s*=/gi, '')
    .trim();
}

function sanitizeInputs(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeInputs);
  }
  const clean = {};
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'string') {
      clean[key] = sanitizeXss(obj[key]);
    } else if (typeof obj[key] === 'object') {
      clean[key] = sanitizeInputs(obj[key]);
    } else {
      clean[key] = obj[key];
    }
  }
  return clean;
}

app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') req.body = sanitizeInputs(req.body);
  next();
});

const userRoles = ['Admin', 'Cashier', 'Technician'];
const productCategories = ['Mobile Accessory', 'Mobile Part', '3W Mod Part'];
const serviceTypes = ['Mobile Repair', '3W Modification'];
const jobStatuses = ['Received', 'In Progress', 'Ready', 'Delivered'];
const paymentMethods = ['Cash', 'Card', 'Bank Transfer', 'Online'];

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: userRoles, default: 'Cashier' },
  phone: { type: String, trim: true, default: '' },
  avatar: { type: String, default: '' }
}, { timestamps: true });

UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
  category: { type: String, required: true, enum: productCategories },
  sellingPrice: { type: Number, required: true, min: 0 },
  costPrice: { type: Number, default: 0, min: 0 },
  stockQuantity: { type: Number, required: true, min: 0, validate: Number.isInteger },
  imageUrl: { type: String, trim: true }
}, { timestamps: true });

const JobCardSchema = new mongoose.Schema({
  customerName: { type: String, required: true, trim: true, maxlength: 120 },
  customerPhone: { type: String, required: true, trim: true, maxlength: 30 },
  serviceType: { type: String, enum: serviceTypes, required: true },
  deviceOrVehicle: { type: String, required: true, trim: true, maxlength: 120 },
  issueDetails: { type: String, required: true, trim: true, maxlength: 2000 },
  estimatedCost: { type: Number, default: 0, min: 0 },
  advancePaid: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: jobStatuses, default: 'Received' }
}, { timestamps: true });

const InvoiceSchema = new mongoose.Schema({
  customerName: { type: String, required: true, trim: true, maxlength: 120 },
  customerPhone: { type: String, trim: true, maxlength: 30, default: '' },
  items: [{
    _id: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    sellingPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, validate: Number.isInteger }
  }],
  totalAmount: { type: Number, required: true, min: 0 },
  paymentMethod: { type: String, required: true, enum: paymentMethods, default: 'Cash' },
  cashTendered: { type: Number, default: 0, min: 0 },
  changeDue: { type: Number, default: 0, min: 0 }
}, { timestamps: true });

const initialProductsSeed = [
  {
    "name": "Pioneer Bluetooth 3W Stereo / Digital Music Player",
    "category": "3W Mod Part",
    "sellingPrice": 16500,
    "costPrice": 12500,
    "stockQuantity": 10,
    "imageUrl": "/images/products/pioneer-stereo.jpg"
  },
  {
    "name": "Android 9\" Touchscreen 3W Multimedia System",
    "category": "3W Mod Part",
    "sellingPrice": 28500,
    "costPrice": 21500,
    "stockQuantity": 7,
    "imageUrl": "/images/products/android-player.jpg"
  },
  {
    "name": "JBL Stage 6.5\" 3-Way High-Output Speakers (Pair)",
    "category": "3W Mod Part",
    "sellingPrice": 12800,
    "costPrice": 9200,
    "stockQuantity": 14,
    "imageUrl": "/images/products/jbl-speakers.jpg"
  },
  {
    "name": "Pioneer TS-A6967S 6x9\" 4-Way Oval Sound Box Speakers",
    "category": "3W Mod Part",
    "sellingPrice": 18500,
    "costPrice": 13800,
    "stockQuantity": 9,
    "imageUrl": "/images/products/oval-speakers.jpg"
  },
  {
    "name": "10\" Heavy Bass Tube Subwoofer with Inbuilt Amp (1000W)",
    "category": "3W Mod Part",
    "sellingPrice": 24500,
    "costPrice": 18000,
    "stockQuantity": 6,
    "imageUrl": "/images/products/subwoofer-tube.jpg"
  },
  {
    "name": "12\" Double-Magnet Heavy Bass Subwoofer (Custom 3W Box)",
    "category": "3W Mod Part",
    "sellingPrice": 34000,
    "costPrice": 26000,
    "stockQuantity": 4,
    "imageUrl": "/images/products/heavy-subwoofer.jpg"
  },
  {
    "name": "4-Channel MOSFET Audio Power Amplifier 1200W",
    "category": "3W Mod Part",
    "sellingPrice": 19800,
    "costPrice": 14500,
    "stockQuantity": 8,
    "imageUrl": "/images/products/mosfet-amplifier.jpg"
  },
  {
    "name": "High-Frequency Titanium Bullet Tweeters Set (Pair)",
    "category": "3W Mod Part",
    "sellingPrice": 4500,
    "costPrice": 2800,
    "stockQuantity": 22,
    "imageUrl": "/images/products/bullet-tweeters.jpg"
  },
  {
    "name": "Bajaj RE Dual Projector LED Headlight with Angel Eyes",
    "category": "3W Mod Part",
    "sellingPrice": 18500,
    "costPrice": 14000,
    "stockQuantity": 12,
    "imageUrl": "/images/products/projector-headlight.jpg"
  },
  {
    "name": "3-Wheeler Custom 10-Spoke Alloy Wheel Set (Set of 3)",
    "category": "3W Mod Part",
    "sellingPrice": 38000,
    "costPrice": 29000,
    "stockQuantity": 5,
    "imageUrl": "/images/products/alloy-wheels.jpg"
  },
  {
    "name": "Sport Stainless Steel Tuned Exhaust Pipe & Beat Silencer",
    "category": "3W Mod Part",
    "sellingPrice": 22000,
    "costPrice": 16500,
    "stockQuantity": 7,
    "imageUrl": "/images/products/sport-exhaust.jpg"
  },
  {
    "name": "Underbody & Canopy Dynamic App-Controlled RGB Neon Kit",
    "category": "3W Mod Part",
    "sellingPrice": 8500,
    "costPrice": 5800,
    "stockQuantity": 18,
    "imageUrl": "/images/products/rgb-neon.jpg"
  },
  {
    "name": "Handlebar Dual U7 Owl-Eye LED Fog Lights with Strobe",
    "category": "3W Mod Part",
    "sellingPrice": 6800,
    "costPrice": 4500,
    "stockQuantity": 16,
    "imageUrl": "/images/products/fog-lights.jpg"
  },
  {
    "name": "Dual Trumpet Chrome Air Horn Set with 12V Compressor",
    "category": "3W Mod Part",
    "sellingPrice": 7900,
    "costPrice": 5200,
    "stockQuantity": 11,
    "imageUrl": "/images/products/air-horn.jpg"
  },
  {
    "name": "Roots Megasonic Dual High-Tone Disc Horns (12V)",
    "category": "3W Mod Part",
    "sellingPrice": 6200,
    "costPrice": 4100,
    "stockQuantity": 15,
    "imageUrl": "/images/products/roots-horn.jpg"
  },
  {
    "name": "Digital LCD Multi-Function Speedometer & RPM Cluster",
    "category": "3W Mod Part",
    "sellingPrice": 14200,
    "costPrice": 10500,
    "stockQuantity": 4,
    "imageUrl": "/images/products/speedometer.jpg"
  },
  {
    "name": "CNC Aluminum Sport Handlebar Grips & Adjustable Levers",
    "category": "3W Mod Part",
    "sellingPrice": 4800,
    "costPrice": 3200,
    "stockQuantity": 20,
    "imageUrl": "/images/products/handlebar-grips.jpg"
  },
  {
    "name": "Tuk Tuk Heavy-Duty Custom Mud Flaps Set (Bajaj King)",
    "category": "3W Mod Part",
    "sellingPrice": 3500,
    "costPrice": 2200,
    "stockQuantity": 25,
    "imageUrl": "/images/products/mud-flaps.jpg"
  },
  {
    "name": "Three-Wheeler Stainless Steel Front Bumper Crash Guard",
    "category": "3W Mod Part",
    "sellingPrice": 15500,
    "costPrice": 11000,
    "stockQuantity": 6,
    "imageUrl": "/images/products/bumper-guard.jpg"
  },
  {
    "name": "Custom Velvet Interior Side Curtains & Rear Sunshade Net",
    "category": "3W Mod Part",
    "sellingPrice": 5800,
    "costPrice": 3900,
    "stockQuantity": 14,
    "imageUrl": "/images/products/velvet-curtains.jpg"
  },
  {
    "name": "Anker PowerCore 20,000mAh 22.5W Fast Charge Power Bank",
    "category": "Mobile Accessory",
    "sellingPrice": 13500,
    "costPrice": 9800,
    "stockQuantity": 15,
    "imageUrl": "/images/products/anker-powerbank.jpg"
  },
  {
    "name": "Apple MagSafe 10,000mAh Magnetic Wireless Power Bank",
    "category": "Mobile Accessory",
    "sellingPrice": 15800,
    "costPrice": 11500,
    "stockQuantity": 9,
    "imageUrl": "/images/products/magsafe-powerbank.jpg"
  },
  {
    "name": "Baseus Blade 100W Ultra-Thin 20,000mAh Laptop Power Bank",
    "category": "Mobile Accessory",
    "sellingPrice": 26500,
    "costPrice": 20000,
    "stockQuantity": 4,
    "imageUrl": "/images/products/baseus-powerbank.jpg"
  },
  {
    "name": "Joyroom 22.5W 20,000mAh Multi-Cable LED Power Bank",
    "category": "Mobile Accessory",
    "sellingPrice": 9500,
    "costPrice": 6800,
    "stockQuantity": 18,
    "imageUrl": "/images/products/joyroom-powerbank.jpg"
  },
  {
    "name": "Anker 65W GaN Dual USB-C Fast Wall Charger",
    "category": "Mobile Accessory",
    "sellingPrice": 9800,
    "costPrice": 7200,
    "stockQuantity": 12,
    "imageUrl": "/images/products/anker-charger.jpg"
  },
  {
    "name": "Apple AirPods Pro 2nd Gen with USB-C MagSafe Case",
    "category": "Mobile Accessory",
    "sellingPrice": 68500,
    "costPrice": 56000,
    "stockQuantity": 6,
    "imageUrl": "/images/products/airpods-pro.jpg"
  },
  {
    "name": "Joyroom JR-T03S Pro Wireless ANC Bluetooth Earbuds",
    "category": "Mobile Accessory",
    "sellingPrice": 8900,
    "costPrice": 6200,
    "stockQuantity": 15,
    "imageUrl": "/images/products/joyroom-earbuds.jpg"
  },
  {
    "name": "iPhone 15 Pro Max Heavy-Duty Armor Kickstand Case",
    "category": "Mobile Accessory",
    "sellingPrice": 3800,
    "costPrice": 2100,
    "stockQuantity": 32,
    "imageUrl": "/images/products/iphone-case.jpg"
  },
  {
    "name": "Samsung Galaxy S24 Ultra Clear Magnetic Hybrid Case",
    "category": "Mobile Accessory",
    "sellingPrice": 3400,
    "costPrice": 1900,
    "stockQuantity": 25,
    "imageUrl": "/images/products/samsung-case.jpg"
  },
  {
    "name": "Braided 100W 6A Fast Charging Type-C to Type-C Cable (2m)",
    "category": "Mobile Accessory",
    "sellingPrice": 2600,
    "costPrice": 1400,
    "stockQuantity": 40,
    "imageUrl": "/images/products/braided-cable.jpg"
  },
  {
    "name": "Remax 3-in-1 Fast Charging Cable (Type-C/Lightning/Micro)",
    "category": "Mobile Accessory",
    "sellingPrice": 1950,
    "costPrice": 1100,
    "stockQuantity": 35,
    "imageUrl": "/images/products/remax-3in1-cable.jpg"
  },
  {
    "name": "9D Full Cover Privacy Tempered Glass Screen Protector",
    "category": "Mobile Accessory",
    "sellingPrice": 1800,
    "costPrice": 850,
    "stockQuantity": 50,
    "imageUrl": "/images/products/tempered-glass.jpg"
  },
  {
    "name": "360° Rotatable Tuk Tuk Handlebar & Bike Phone Mount",
    "category": "Mobile Accessory",
    "sellingPrice": 3200,
    "costPrice": 1700,
    "stockQuantity": 18,
    "imageUrl": "/images/products/phone-mount.jpg"
  },
  {
    "name": "Bluetooth 5.3 FM Transmitter & 30W Dual USB Fast Charger",
    "category": "Mobile Accessory",
    "sellingPrice": 3500,
    "costPrice": 2100,
    "stockQuantity": 16,
    "imageUrl": "/images/products/fm-transmitter.jpg"
  },
  {
    "name": "Samsung Galaxy S23 Ultra Dynamic AMOLED 2X Display Assembly",
    "category": "Mobile Part",
    "sellingPrice": 52000,
    "costPrice": 42000,
    "stockQuantity": 3,
    "imageUrl": "/images/products/samsung-display.jpg"
  },
  {
    "name": "iPhone 13 Pro 120Hz Super Retina XDR OLED Display Panel",
    "category": "Mobile Part",
    "sellingPrice": 44000,
    "costPrice": 35000,
    "stockQuantity": 4,
    "imageUrl": "/images/products/iphone-screen.jpg"
  },
  {
    "name": "iPhone 14 OEM Replacement Battery 3279mAh (TI Chip)",
    "category": "Mobile Part",
    "sellingPrice": 9500,
    "costPrice": 6500,
    "stockQuantity": 16,
    "imageUrl": "/images/products/iphone14-battery.jpg"
  },
  {
    "name": "iPhone 12 / 12 Pro OEM High-Capacity Battery 2815mAh",
    "category": "Mobile Part",
    "sellingPrice": 8200,
    "costPrice": 5400,
    "stockQuantity": 14,
    "imageUrl": "/images/products/iphone12-battery.jpg"
  },
  {
    "name": "Redmi Note 12 Pro 50MP Sony IMX766 OIS Camera Module",
    "category": "Mobile Part",
    "sellingPrice": 9800,
    "costPrice": 7200,
    "stockQuantity": 5,
    "imageUrl": "/images/products/camera-module.jpg"
  },
  {
    "name": "Samsung Note 20 Ultra USB-C Charging Port & Mic Sub-Board",
    "category": "Mobile Part",
    "sellingPrice": 5800,
    "costPrice": 3800,
    "stockQuantity": 12,
    "imageUrl": "/images/products/charging-subboard.jpg"
  },
  {
    "name": "Xiaomi Poco X3 Pro PMIC Power IC Chip (PM8150B)",
    "category": "Mobile Part",
    "sellingPrice": 4200,
    "costPrice": 2600,
    "stockQuantity": 10,
    "imageUrl": "/images/products/power-ic.jpg"
  },
  {
    "name": "iPhone 11 Face ID Earpiece Speaker & Sensor Flex Assembly",
    "category": "Mobile Part",
    "sellingPrice": 4600,
    "costPrice": 2800,
    "stockQuantity": 14,
    "imageUrl": "/images/products/sensor-flex.jpg"
  },
  {
    "name": "Universal UV LOCA Liquid Optical Clear Adhesive (50ml)",
    "category": "Mobile Part",
    "sellingPrice": 2400,
    "costPrice": 1300,
    "stockQuantity": 20,
    "imageUrl": "/images/products/loca-glue.jpg"
  },
  {
    "name": "iPhone 14 Pro OEM Back Glass Panel with Large Camera Frame",
    "category": "Mobile Part",
    "sellingPrice": 6500,
    "costPrice": 4200,
    "stockQuantity": 8,
    "imageUrl": "/images/products/back-glass.jpg"
  }
];

const initialJobsSeed = [
  {
    "customerName": "Kamal Perera",
    "customerPhone": "077 452 9811",
    "serviceType": "Mobile Repair",
    "deviceOrVehicle": "Samsung Galaxy S23 Ultra",
    "issueDetails": "Screen glass cracked with green vertical flicker. Customer requests genuine Dynamic AMOLED replacement.",
    "estimatedCost": 52000,
    "advancePaid": 20000,
    "status": "In Progress"
  },
  {
    "customerName": "Nalin Samarasinghe",
    "customerPhone": "071 883 4402",
    "serviceType": "3W Modification",
    "deviceOrVehicle": "Bajaj RE 4S (WP AB-8821)",
    "issueDetails": "Install Bluetooth car stereo head unit, pair of JBL 6.5\" speakers, front dual projector LEDs, and horn relay harness.",
    "estimatedCost": 48500,
    "advancePaid": 25000,
    "status": "Ready"
  },
  {
    "customerName": "Dinuka Fernando",
    "customerPhone": "076 991 2234",
    "serviceType": "Mobile Repair",
    "deviceOrVehicle": "iPhone 14 Pro",
    "issueDetails": "Battery drains rapidly (72% battery health). Requires OEM battery replacement with calibration chip.",
    "estimatedCost": 12500,
    "advancePaid": 5000,
    "status": "Received"
  },
  {
    "customerName": "Rohan Jayawardena",
    "customerPhone": "070 334 5519",
    "serviceType": "3W Modification",
    "deviceOrVehicle": "Piaggio Ape City (WP QF-5519)",
    "issueDetails": "Full custom sound setup: 10\" bass tube subwoofer, 4-channel power amplifier, underglow RGB neon lighting, and dual USB ports.",
    "estimatedCost": 58000,
    "advancePaid": 35000,
    "status": "Delivered"
  },
  {
    "customerName": "Priyantha Wickramasinghe",
    "customerPhone": "077 621 3340",
    "serviceType": "3W Modification",
    "deviceOrVehicle": "TVS King Deluxe (CP AA-1044)",
    "issueDetails": "Install 9\" Android multimedia player with reverse camera, 6x9 sound box speakers, dual trumpet air horn, and custom alloy wheel set.",
    "estimatedCost": 82000,
    "advancePaid": 45000,
    "status": "In Progress"
  }
];

const User = mongoose.model('User', UserSchema);
const Product = mongoose.model('Product', ProductSchema);
const JobCard = mongoose.model('JobCard', JobCardSchema);
const Invoice = mongoose.model('Invoice', InvoiceSchema);

async function seedIfEmpty() {
  try {
    const pCount = await Product.countDocuments();
    if (pCount === 0) {
      await Product.insertMany(initialProductsSeed);
      console.log('Seeded initial products into database.');
    }
    const jCount = await JobCard.countDocuments();
    if (jCount === 0) {
      await JobCard.insertMany(initialJobsSeed);
      console.log('Seeded initial job cards into database.');
    }
    const uCount = await User.countDocuments();
    if (uCount === 0) {
      const adminPass = await bcrypt.hash('admin123', 10);
      const cashierPass = await bcrypt.hash('cashier123', 10);
      const techPass = await bcrypt.hash('tech123', 10);
      await User.insertMany([
        {
          name: 'Super Admin',
          email: 'admin@upgradehub.lk',
          password: adminPass,
          role: 'Admin',
          phone: '077 123 4567'
        },
        {
          name: 'Chief Cashier',
          email: 'cashier@upgradehub.lk',
          password: cashierPass,
          role: 'Cashier',
          phone: '077 234 5678'
        },
        {
          name: 'Master Technician',
          email: 'tech@upgradehub.lk',
          password: techPass,
          role: 'Technician',
          phone: '077 345 6789'
        }
      ]);
      console.log('Seeded default staff accounts (admin, cashier, technician).');
    }
  } catch (e) {
    console.error('Database seed error:', e.message);
  }
}

function generateToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired session. Please sign in again.' });
    }
    req.user = decoded;
    next();
  });
}

const SRI_LANKA_PHONE_REGEX = /^(?:\+94|0)?7[0-9]{8}$/;
const GENERAL_PHONE_REGEX = /^[0-9+\-\s()]{9,20}$/;

function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const digits = phone.replace(/[^0-9+]/g, '');
  if (digits.length < 9 || digits.length > 15) return false;
  const rawNumber = phone.replace(/[\s\-()]/g, '');
  return SRI_LANKA_PHONE_REGEX.test(rawNumber) || GENERAL_PHONE_REGEX.test(phone.trim());
}

function isValidName(name) {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  return trimmed.length >= 2 && trimmed.length <= 120;
}

const requireFields = (body, fields) => fields.every((field) => (
  body[field] !== undefined && body[field] !== null && String(body[field]).trim() !== ''
));

// Authentication Endpoints
app.post('/api/auth/signup', authLimiter, async (req, res) => {
  const { name, email, password, role = 'Cashier', phone = '' } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Full name is required.' });
  }
  if (!isValidName(name)) {
    return res.status(400).json({ error: 'Name must be between 2 and 60 characters.' });
  }
  if (!email || !email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }
  if (!userRoles.includes(role)) {
    return res.status(400).json({ error: `Invalid role. Allowed: ${userRoles.join(', ')}` });
  }
  if (phone && !isValidPhone(phone)) {
    return res.status(400).json({ error: 'Please enter a valid telephone number.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    return res.status(409).json({ error: 'An account with this email address already exists.' });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password: hashedPassword,
    role,
    phone: phone.trim()
  });

  const token = generateToken(user);
  res.status(201).json({
    message: 'Account created successfully.',
    token,
    user: user.toJSON()
  });
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !email.trim() || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = generateToken(user);
  res.json({
    message: 'Signed in successfully.',
    token,
    user: user.toJSON()
  });
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User account not found.' });
  }
  res.json({ user: user.toJSON() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

app.get('/api/products', async (req, res) => {
  let list = await Product.find().sort({ name: 1 }).lean();
  if (list.length === 0) {
    await seedIfEmpty();
    list = await Product.find().sort({ name: 1 }).lean();
  }
  res.json(list);
});

app.post('/api/products/reset', mutationLimiter, async (req, res) => {
  try {
    await Product.deleteMany({});
    const inserted = await Product.insertMany(initialProductsSeed);
    console.log('Reset catalog to 44 products.');
    res.json({ message: 'Catalog reset successfully', count: inserted.length, products: inserted });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset catalog.' });
  }
});

app.post('/api/products', mutationLimiter, async (req, res) => {
  const { name, category, sellingPrice, stockQuantity, costPrice = 0, imageUrl = '' } = req.body;
  if (!requireFields(req.body, ['name', 'category', 'sellingPrice', 'stockQuantity'])) {
    return res.status(400).json({ error: 'Name, category, price and quantity are required.' });
  }
  if (!isValidName(name)) {
    return res.status(400).json({ error: 'Product name must be between 2 and 120 characters.' });
  }
  if (!productCategories.includes(category)) {
    return res.status(400).json({ error: `Invalid category. Allowed: ${productCategories.join(', ')}` });
  }
  const numericPrice = Number(sellingPrice);
  const numericQty = Number(stockQuantity);
  if (isNaN(numericPrice) || numericPrice < 0) {
    return res.status(400).json({ error: 'Selling price must be a valid non-negative number.' });
  }
  if (!Number.isInteger(numericQty) || numericQty < 0) {
    return res.status(400).json({ error: 'Stock quantity must be a non-negative integer.' });
  }
  const product = await Product.create({
    name: name.trim(),
    category,
    sellingPrice: numericPrice,
    costPrice: Math.max(0, Number(costPrice) || 0),
    stockQuantity: numericQty,
    imageUrl: imageUrl ? imageUrl.trim() : ''
  });
  res.status(201).json(product);
});

app.get('/api/jobs', async (req, res) => {
  let list = await JobCard.find().sort({ createdAt: -1 }).lean();
  if (list.length === 0) {
    await seedIfEmpty();
    list = await JobCard.find().sort({ createdAt: -1 }).lean();
  }
  res.json(list);
});

app.post('/api/jobs', mutationLimiter, async (req, res) => {
  if (!requireFields(req.body, ['customerName', 'customerPhone', 'serviceType', 'deviceOrVehicle', 'issueDetails'])) {
    return res.status(400).json({ error: 'Customer, contact, service, device and issue details are required.' });
  }
  if (!isValidName(req.body.customerName)) {
    return res.status(400).json({ error: 'Customer name must be between 2 and 120 characters.' });
  }
  if (!isValidPhone(req.body.customerPhone)) {
    return res.status(400).json({ error: 'Please provide a valid customer telephone number (e.g. 077 123 4567 or +94 77 123 4567).' });
  }
  if (!serviceTypes.includes(req.body.serviceType)) {
    return res.status(400).json({ error: `Invalid service type. Allowed: ${serviceTypes.join(', ')}` });
  }
  const job = await JobCard.create(req.body);
  res.status(201).json(job);
});

app.put('/api/jobs/:id/status', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid job id.' });
  }
  if (!jobStatuses.includes(req.body.status)) {
    return res.status(400).json({ error: 'Invalid job status.' });
  }
  const updatedJob = await JobCard.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true, runValidators: true }
  );
  if (!updatedJob) return res.status(404).json({ error: 'Job not found.' });
  res.json(updatedJob);
});

app.post('/api/invoices', mutationLimiter, async (req, res) => {
  const {
    customerName,
    customerPhone = '',
    items,
    paymentMethod = 'Cash',
    cashTendered = 0,
    changeDue = 0
  } = req.body;

  if (!customerName || !customerName.trim()) {
    return res.status(400).json({ error: 'Customer name is required.' });
  }
  if (!isValidName(customerName)) {
    return res.status(400).json({ error: 'Customer name must be between 2 and 120 characters.' });
  }
  if (!customerPhone || !customerPhone.trim()) {
    return res.status(400).json({ error: 'Customer telephone number is required.' });
  }
  if (!isValidPhone(customerPhone)) {
    return res.status(400).json({ error: 'Please provide a valid customer telephone number (e.g. 077 123 4567 or +94 77 123 4567).' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one item is required.' });
  }
  if (!paymentMethods.includes(paymentMethod)) {
    return res.status(400).json({ error: `Unsupported payment method '${paymentMethod}'. Allowed: ${paymentMethods.join(', ')}` });
  }
  if (paymentMethod === 'Cash' && (!cashTendered || Number(cashTendered) <= 0)) {
    return res.status(400).json({ error: 'Cash received amount is required for cash payments.' });
  }

  const invoiceItems = [];
  const updatedProducts = [];

  try {
    for (const item of items) {
      const qty = Number(item.quantity) || 1;
      if (qty < 1) {
        return res.status(400).json({ error: 'Each item must have a quantity of at least 1.' });
      }

      let product = null;
      if (mongoose.isValidObjectId(item._id)) {
        product = await Product.findById(item._id);
      }
      if (!product && item.name) {
        product = await Product.findOne({ name: item.name });
      }
      if (!product) {
        product = await Product.create({
          name: item.name,
          category: item.category || 'Mobile Accessory',
          sellingPrice: Number(item.sellingPrice) || 0,
          stockQuantity: Math.max(15, qty + 5)
        });
      }

      if (product.stockQuantity < qty) {
        throw Object.assign(new Error(`Insufficient stock for ${product.name} (available: ${product.stockQuantity}).`), { status: 409 });
      }

      const updated = await Product.findOneAndUpdate(
        { _id: product._id, stockQuantity: { $gte: qty } },
        { $inc: { stockQuantity: -qty } },
        { new: true }
      );
      if (!updated) {
        throw Object.assign(new Error(`Insufficient stock for ${product.name}.`), { status: 409 });
      }

      updatedProducts.push({ _id: product._id, quantity: qty });
      invoiceItems.push({
        _id: product._id,
        name: product.name,
        sellingPrice: product.sellingPrice,
        quantity: qty
      });
    }

    const totalAmount = invoiceItems.reduce((sum, i) => sum + i.sellingPrice * i.quantity, 0);
    if (paymentMethod === 'Cash' && Number(cashTendered) < totalAmount) {
      return res.status(400).json({
        error: `Cash received (LKR ${Number(cashTendered).toLocaleString()}) is less than total payable (LKR ${totalAmount.toLocaleString()}).`
      });
    }

    const invoice = await Invoice.create({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      items: invoiceItems,
      totalAmount,
      paymentMethod,
      cashTendered: Number(cashTendered) || 0,
      changeDue: Number(changeDue) || Math.max(0, (Number(cashTendered) || 0) - totalAmount)
    });
    res.status(201).json(invoice);
  } catch (error) {
    await Promise.all(updatedProducts.map((p) => Product.findByIdAndUpdate(
      p._id, { $inc: { stockQuantity: p.quantity } }
    )));
    throw error;
  }
});

// Serve Production Frontend Build if available (for single-container/monolith deployment)
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '../frontend/build');
  if (fs.existsSync(buildPath)) {
    app.use(express.static(buildPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(buildPath, 'index.html'));
    });
  }
}

app.use((error, req, res, next) => {
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({ error: 'The submitted data is invalid.', details: error.message });
  }
  if (error.message && error.message.includes('CORS policy')) {
    return res.status(403).json({ error: error.message });
  }
  console.error('Request failed:', error.message || error);
  const isDev = process.env.NODE_ENV === 'development';
  const statusCode = error.status || error.statusCode || 500;
  res.status(statusCode).json({
    error: error.status ? error.message : 'An unexpected server error occurred. Please try again.',
    ...(isDev && { details: error.message, stack: error.stack })
  });
});

async function startServer() {
  if (!MONGO_URI || MONGO_URI.includes('******') || !/^mongodb(?:\+srv)?:\/\//.test(MONGO_URI)) {
    throw new Error('MongoDB URI is missing or invalid. Add a complete mongodb:// or mongodb+srv:// connection string to backend/.env.');
  }
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  console.log('Upgrade Hub database connected successfully.');
  await seedIfEmpty();
  return app.listen(PORT, () => console.log(`Upgrade Hub backend active on http://localhost:${PORT}`));
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error(`Backend startup failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { app, startServer, models: { Product, JobCard, Invoice, User } };
