/**
 * ============================================================================
 * SEED SCRIPT - Populate the database with sample data
 * ============================================================================
 *
 * Run this script to add sample data to your databases.
 *
 * Usage:
 *   cd microservice
 *   node scripts/seed.js
 *
 * Make sure MongoDB is running and all services are stopped before seeding.
 *
 * ============================================================================
 */

const mongoose = require("mongoose");

// Database URLs
const AUTH_DB_URL = "mongodb://localhost:27017/ev_auth_db";
const STATION_DB_URL = "mongodb://localhost:27017/ev_stations_db";

// ============================================================================
// SAMPLE DATA
// ============================================================================

// Sample users (passwords will be hashed by the model)
const sampleUsers = [
  {
    name: "John User",
    email: "user@example.com",
    password: "password123",
    role: "user",
    isActive: true,
  },
  {
    name: "Jane Operator",
    email: "operator@example.com",
    password: "password123",
    role: "operator",
    company: "EV Charge Co.",
    phone: "+1234567890",
    isActive: true,
  },
  {
    name: "Admin User",
    email: "admin@example.com",
    password: "password123",
    role: "admin",
    isActive: true,
  },
];

// Sample stations (Kathmandu area coordinates)
const sampleStations = [
  {
    name: "Thamel EV Hub",
    address: "Thamel, Kathmandu",
    location: {
      type: "Point",
      coordinates: [85.31, 27.715], // [longitude, latitude]
    },
    ports: [
      {
        connectorType: "Type2",
        vehicleType: "car",
        powerKW: 22,
        total: 4,
        occupied: 1,
        pricePerKWh: 15,
      },
      {
        connectorType: "CCS",
        vehicleType: "car",
        powerKW: 50,
        total: 2,
        occupied: 0,
        pricePerKWh: 20,
      },
      {
        connectorType: "AC_SLOW",
        vehicleType: "bike",
        powerKW: 3,
        total: 6,
        occupied: 2,
        pricePerKWh: 10,
      },
    ],
    operatingHours: "24/7",
    status: "active",
  },
  {
    name: "Durbar Marg Charging Point",
    address: "Durbar Marg, Kathmandu",
    location: {
      type: "Point",
      coordinates: [85.32, 27.71],
    },
    ports: [
      {
        connectorType: "CHAdeMO",
        vehicleType: "car",
        powerKW: 50,
        total: 2,
        occupied: 1,
        pricePerKWh: 22,
      },
      {
        connectorType: "CCS",
        vehicleType: "car",
        powerKW: 100,
        total: 1,
        occupied: 0,
        pricePerKWh: 25,
      },
    ],
    operatingHours: "6:00 - 22:00",
    status: "active",
  },
  {
    name: "Patan Fast Charge",
    address: "Patan Durbar Square, Lalitpur",
    location: {
      type: "Point",
      coordinates: [85.325, 27.673],
    },
    ports: [
      {
        connectorType: "Type2",
        vehicleType: "car",
        powerKW: 22,
        total: 3,
        occupied: 3,
        pricePerKWh: 14,
      },
      {
        connectorType: "AC_SLOW",
        vehicleType: "bike",
        powerKW: 2,
        total: 4,
        occupied: 1,
        pricePerKWh: 8,
      },
    ],
    operatingHours: "24/7",
    status: "active",
  },
  {
    name: "Bhaktapur EV Station",
    address: "Durbar Square, Bhaktapur",
    location: {
      type: "Point",
      coordinates: [85.428, 27.672],
    },
    ports: [
      {
        connectorType: "CCS",
        vehicleType: "car",
        powerKW: 60,
        total: 2,
        occupied: 0,
        pricePerKWh: 18,
      },
      {
        connectorType: "Type2",
        vehicleType: "car",
        powerKW: 11,
        total: 4,
        occupied: 2,
        pricePerKWh: 12,
      },
    ],
    operatingHours: "7:00 - 21:00",
    status: "active",
  },
  {
    name: "Airport Road Supercharger",
    address: "Tribhuvan International Airport Road",
    location: {
      type: "Point",
      coordinates: [85.358, 27.698],
    },
    ports: [
      {
        connectorType: "CCS",
        vehicleType: "car",
        powerKW: 150,
        total: 4,
        occupied: 1,
        pricePerKWh: 30,
      },
      {
        connectorType: "CHAdeMO",
        vehicleType: "car",
        powerKW: 100,
        total: 2,
        occupied: 0,
        pricePerKWh: 28,
      },
    ],
    operatingHours: "24/7",
    status: "active",
  },
];

// ============================================================================
// MODELS (simplified for seeding)
// ============================================================================

const bcrypt = require("bcryptjs");

// User Schema (Auth DB)
const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true, lowercase: true },
    password: String,
    role: {
      type: String,
      enum: ["user", "operator", "admin"],
      default: "user",
    },
    company: String,
    phone: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Station Schema (Station DB)
const portSchema = new mongoose.Schema(
  {
    connectorType: String,
    vehicleType: String,
    powerKW: Number,
    total: Number,
    occupied: { type: Number, default: 0 },
    pricePerKWh: Number,
  },
  { _id: false },
);

const stationSchema = new mongoose.Schema(
  {
    name: String,
    operatorId: String,
    location: {
      type: { type: String, default: "Point" },
      coordinates: [Number],
    },
    address: String,
    ports: [portSchema],
    operatingHours: { type: String, default: "24/7" },
    status: { type: String, default: "active" },
  },
  { timestamps: true },
);

stationSchema.index({ location: "2dsphere" });

// ============================================================================
// SEED FUNCTIONS
// ============================================================================

async function seedAuthDB() {
  console.log("\n📦 Seeding Auth Database...");

  const authConnection = await mongoose.createConnection(AUTH_DB_URL);
  const User = authConnection.model("User", userSchema);

  // Clear existing data
  await User.deleteMany({});
  console.log("  ✓ Cleared existing users");

  // Insert sample users
  const users = await User.create(sampleUsers);
  console.log(`  ✓ Created ${users.length} users`);

  // Print credentials
  console.log("\n  📝 Sample User Credentials:");
  sampleUsers.forEach((user) => {
    console.log(`     - ${user.email} / ${user.password} (${user.role})`);
  });

  await authConnection.close();
  return users;
}

async function seedStationDB(operatorId) {
  console.log("\n📦 Seeding Station Database...");

  const stationConnection = await mongoose.createConnection(STATION_DB_URL);
  const Station = stationConnection.model("Station", stationSchema);

  // Clear existing data
  await Station.deleteMany({});
  console.log("  ✓ Cleared existing stations");

  // Add operatorId to stations
  const stationsWithOperator = sampleStations.map((station) => ({
    ...station,
    operatorId,
  }));

  // Insert sample stations
  const stations = await Station.create(stationsWithOperator);
  console.log(`  ✓ Created ${stations.length} stations`);

  // Print station info
  console.log("\n  📍 Sample Stations:");
  stations.forEach((station) => {
    const totalPorts = station.ports.reduce((sum, p) => sum + p.total, 0);
    console.log(`     - ${station.name} (${totalPorts} ports)`);
  });

  await stationConnection.close();
  return stations;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║              MICROSERVICES - DATABASE SEEDER               ║");
  console.log("╚════════════════════════════════════════════════════════════╝");

  try {
    // Seed Auth DB
    const users = await seedAuthDB();

    // Get operator's ID for stations
    const operator = users.find((u) => u.role === "operator");

    // Seed Station DB
    await seedStationDB(operator._id.toString());

    console.log("\n✅ Seeding complete!");
    console.log("\n📌 Next steps:");
    console.log("   1. Start all services: npm run start-all");
    console.log(
      "   2. Test login: POST http://localhost:3000/api/v1/auth/login",
    );
    console.log(
      '      Body: { "email": "user@example.com", "password": "password123" }',
    );
    console.log(
      "   3. Get stations: GET http://localhost:3000/api/v1/stations",
    );

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Seeding failed:", error.message);
    process.exit(1);
  }
}

main();
