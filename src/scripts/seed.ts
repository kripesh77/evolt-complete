import mongoose from "mongoose";
import dotenv from "dotenv";
import Station from "../models/Station.js";
import User from "../models/user.js";
import type { IStation, Port, OperatingHours } from "../types/vehicle.js";

dotenv.config({ path: "./config.env" });

// Port type without occupied (for seed data - occupied is added during processing)
type SeedPort = Omit<Port, "occupied">;
type SeedStation = Omit<
  IStation,
  "_id" | "createdAt" | "updatedAt" | "ports"
> & {
  ports: SeedPort[];
};

// Helper function to convert old string format to new OperatingHours format
function parseOperatingHours(hoursString: string): OperatingHours {
  if (hoursString === "24/7") {
    return { type: "24/7" };
  }
  
  // Parse custom hours like "06:00 - 23:00"
  const match = hoursString.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
  if (match) {
    return {
      type: "custom",
      openTime: match[1],
      closeTime: match[2],
    };
  }
  
  // Default to 24/7 if parsing fails
  return { type: "24/7" };
}

// Sample station data for different cities
const sampleStations: SeedStation[] = [
  // Delhi NCR stations
  {
    name: "EV Hub Connaught Place",
    location: {
      type: "Point",
      coordinates: [77.2195, 28.6315], // CP, Delhi
    },
    address: "Block A, Connaught Place, New Delhi, Delhi 110001",
    ports: [
      {
        connectorType: "CCS",
        vehicleType: "car",
        powerKW: 150,
        total: 4,
        pricePerKWh: 18,
      },
      {
        connectorType: "Type2",
        vehicleType: "car",
        powerKW: 22,
        total: 6,
        pricePerKWh: 12,
      },
      {
        connectorType: "AC_SLOW",
        vehicleType: "bike",
        powerKW: 3,
        total: 8,
        pricePerKWh: 8,
      },
    ],
    operatingHours: { type: "24/7" },
    status: "active",
  },
  {
    name: "Green Charge Gurgaon",
    location: {
      type: "Point",
      coordinates: [77.0266, 28.4595], // Gurgaon
    },
    address: "Cyber Hub, DLF Cyber City, Gurgaon, Haryana 122002",
    ports: [
      {
        connectorType: "CCS",
        vehicleType: "car",
        powerKW: 350,
        total: 2,
        pricePerKWh: 22,
      },
      {
        connectorType: "CHAdeMO",
        vehicleType: "car",
        powerKW: 50,
        total: 2,
        pricePerKWh: 15,
      },
      {
        connectorType: "Type2",
        vehicleType: "car",
        powerKW: 11,
        total: 4,
        pricePerKWh: 10,
      },
    ],
    operatingHours: { type: "custom", openTime: "06:00", closeTime: "23:00" },
    status: "active",
  },
  {
    name: "Quick Charge Noida",
    location: {
      type: "Point",
      coordinates: [77.391, 28.5355], // Noida Sector 18
    },
    address: "Sector 18, Noida, Uttar Pradesh 201301",
    ports: [
      {
        connectorType: "CCS",
        vehicleType: "car",
        powerKW: 60,
        total: 4,
        pricePerKWh: 14,
      },
      {
        connectorType: "AC_SLOW",
        vehicleType: "bike",
        powerKW: 2,
        total: 10,
        pricePerKWh: 6,
      },
    ],
    operatingHours: { type: "24/7" },
    status: "active",
  },
  {
    name: "Electro Station Dwarka",
    location: {
      type: "Point",
      coordinates: [77.042, 28.5921], // Dwarka
    },
    address: "Sector 21, Dwarka, New Delhi, Delhi 110077",
    ports: [
      {
        connectorType: "Type2",
        vehicleType: "car",
        powerKW: 22,
        total: 6,
        pricePerKWh: 11,
      },
      {
        connectorType: "AC_SLOW",
        vehicleType: "bike",
        powerKW: 3.3,
        total: 5,
        pricePerKWh: 7,
      },
    ],
    operatingHours: { type: "custom", openTime: "08:00", closeTime: "22:00" },
    status: "active",
  },
  {
    name: "Metro Charge Rajiv Chowk",
    location: {
      type: "Point",
      coordinates: [77.2167, 28.6328], // Rajiv Chowk Metro
    },
    address: "Rajiv Chowk Metro Station, New Delhi, Delhi 110001",
    ports: [
      {
        connectorType: "AC_SLOW",
        vehicleType: "bike",
        powerKW: 3,
        total: 15,
        pricePerKWh: 5,
      },
    ],
    operatingHours: { type: "custom", openTime: "06:00", closeTime: "23:00" },
    status: "active",
  },
  // Mumbai stations
  {
    name: "Power Point BKC",
    location: {
      type: "Point",
      coordinates: [72.865, 19.0626], // BKC, Mumbai
    },
    address: "Bandra Kurla Complex, Mumbai, Maharashtra 400051",
    ports: [
      {
        connectorType: "CCS",
        vehicleType: "car",
        powerKW: 100,
        total: 6,
        pricePerKWh: 16,
      },
      {
        connectorType: "CHAdeMO",
        vehicleType: "car",
        powerKW: 50,
        total: 4,
        pricePerKWh: 14,
      },
      {
        connectorType: "Type2",
        vehicleType: "car",
        powerKW: 22,
        total: 8,
        pricePerKWh: 10,
      },
    ],
    operatingHours: { type: "24/7" },
    status: "active",
  },
  {
    name: "EV Spot Andheri",
    location: {
      type: "Point",
      coordinates: [72.8362, 19.1136], // Andheri
    },
    address: "Andheri East, Mumbai, Maharashtra 400069",
    ports: [
      {
        connectorType: "CCS",
        vehicleType: "car",
        powerKW: 50,
        total: 4,
        pricePerKWh: 12,
      },
      {
        connectorType: "AC_SLOW",
        vehicleType: "bike",
        powerKW: 3,
        total: 12,
        pricePerKWh: 6,
      },
    ],
    operatingHours: { type: "24/7" },
    status: "active",
  },
  // Bangalore stations
  {
    name: "Tech Park Charging Hub",
    location: {
      type: "Point",
      coordinates: [77.6408, 12.9352], // Electronic City
    },
    address: "Electronic City Phase 1, Bengaluru, Karnataka 560100",
    ports: [
      {
        connectorType: "CCS",
        vehicleType: "car",
        powerKW: 120,
        total: 8,
        pricePerKWh: 15,
      },
      {
        connectorType: "Type2",
        vehicleType: "car",
        powerKW: 22,
        total: 10,
        pricePerKWh: 9,
      },
      {
        connectorType: "AC_SLOW",
        vehicleType: "bike",
        powerKW: 3,
        total: 20,
        pricePerKWh: 5,
      },
    ],
    operatingHours: { type: "24/7" },
    status: "active",
  },
  {
    name: "MG Road EV Station",
    location: {
      type: "Point",
      coordinates: [77.6069, 12.9758], // MG Road
    },
    address: "MG Road, Bengaluru, Karnataka 560001",
    ports: [
      {
        connectorType: "CCS",
        vehicleType: "car",
        powerKW: 60,
        total: 4,
        pricePerKWh: 14,
      },
      {
        connectorType: "CHAdeMO",
        vehicleType: "car",
        powerKW: 50,
        total: 2,
        pricePerKWh: 13,
      },
    ],
    operatingHours: { type: "custom", openTime: "08:00", closeTime: "22:00" },
    status: "active",
  },
  // Inactive station for testing
  {
    name: "Under Maintenance Station",
    location: {
      type: "Point",
      coordinates: [77.5946, 12.9716], // Bangalore Central
    },
    address: "Brigade Road, Bengaluru, Karnataka 560025",
    ports: [
      {
        connectorType: "CCS",
        vehicleType: "car",
        powerKW: 50,
        total: 4,
        pricePerKWh: 12,
      },
    ],
    operatingHours: { type: "24/7" },
    status: "inactive",
  },
];

async function seedDatabase() {
  try {
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      throw new Error("MONGODB_URI not defined");
    }

    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(mongoURI);
    console.log("✅ Connected to MongoDB");

    // Clear existing data
    console.log("🧹 Clearing existing data...");
    await Station.deleteMany({});
    await User.deleteMany({});

    // Create test users with different roles
    console.log("👤 Creating test users...");

    // Create operators
    const operator1 = await User.create({
      name: "EV Hub Networks",
      email: "operator@evhub.com",
      password: "password123",
      role: "operator",
      company: "EV Hub Networks Pvt Ltd",
      phone: "+91-9876543210",
    });
    console.log(`✅ Created operator: ${operator1.email}`);

    const operator2 = await User.create({
      name: "Green Charge India",
      email: "operator2@greencharge.in",
      password: "password123",
      role: "operator",
      company: "Green Charge India Ltd",
      phone: "+91-9876543211",
    });
    console.log(`✅ Created operator: ${operator2.email}`);

    // Create admin
    const admin = await User.create({
      name: "System Admin",
      email: "admin@evcharging.com",
      password: "admin123456",
      role: "admin",
      company: "EV Charging Platform",
      phone: "+91-9000000000",
    });
    console.log(`✅ Created admin: ${admin.email}`);

    // Create regular user
    const regularUser = await User.create({
      name: "Test User",
      email: "user@test.com",
      password: "password123",
      role: "user",
      vehicleProfiles: [
        {
          vehicleType: "car",
          batteryCapacity_kWh: 60,
          efficiency_kWh_per_km: 0.15,
          batteryPercent: 80,
          compatibleConnectors: ["CCS", "Type2"],
        },
      ],
    });
    console.log(`✅ Created user: ${regularUser.email}`);

    // Add operatorId and random occupied values to stations (alternate between operators)
    const stationsWithOperators = sampleStations.map((station, index) => {
      // Add random occupied values directly to each port
      const portsWithOccupancy: Port[] = station.ports.map((port) => ({
        ...port,
        occupied: Math.floor(Math.random() * (port.total + 1)),
      }));

      return {
        ...station,
        operatorId: index % 2 === 0 ? operator1._id : operator2._id,
        ports: portsWithOccupancy,
        lastStatusUpdate: new Date(),
      };
    });

    // Insert stations
    console.log("📍 Inserting sample stations...");
    const createdStations = await Station.insertMany(stationsWithOperators);
    console.log(
      `✅ Created ${createdStations.length} stations with embedded occupancy`,
    );

    // Print summary
    console.log("\n📊 Database seeded successfully!");
    console.log("----------------------------------------");
    console.log(`Total stations: ${createdStations.length}`);
    console.log(
      `Active stations: ${createdStations.filter((s: { status: string }) => s.status === "active").length}`,
    );
    console.log(
      `Inactive stations: ${createdStations.filter((s: { status: string }) => s.status === "inactive").length}`,
    );

    type PortType = { vehicleType: string; total: number };
    type StationType = { ports: PortType[] };

    const bikePorts = createdStations.reduce(
      (sum: number, s: StationType) =>
        sum +
        s.ports
          .filter((p: PortType) => p.vehicleType === "bike")
          .reduce((ps: number, p: PortType) => ps + p.total, 0),
      0,
    );
    const carPorts = createdStations.reduce(
      (sum: number, s: StationType) =>
        sum +
        s.ports
          .filter((p: PortType) => p.vehicleType === "car")
          .reduce((ps: number, p: PortType) => ps + p.total, 0),
      0,
    );

    console.log(`Total bike ports: ${bikePorts}`);
    console.log(`Total car ports: ${carPorts}`);
    console.log("----------------------------------------");
    console.log("\n👤 Test User Credentials:");
    console.log("----------------------------------------");
    console.log("Operator 1:");
    console.log(`  Email: operator@evhub.com`);
    console.log(`  Password: password123`);
    console.log(`  Role: operator`);
    console.log("Operator 2:");
    console.log(`  Email: operator2@greencharge.in`);
    console.log(`  Password: password123`);
    console.log(`  Role: operator`);
    console.log("Admin:");
    console.log(`  Email: admin@evcharging.com`);
    console.log(`  Password: admin123456`);
    console.log(`  Role: admin`);
    console.log("Regular User:");
    console.log(`  Email: user@test.com`);
    console.log(`  Password: password123`);
    console.log(`  Role: user`);
    console.log("----------------------------------------");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("👋 Disconnected from MongoDB");
  }
}

// Run if called directly
seedDatabase();
