// ============================
// IMPORTS
// ============================
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

// ============================
// APP
// ============================
const app = express();

// ============================
// MIDDLEWARES
// ============================
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

app.options("*", cors());
app.use(express.json());

// ============================
// MONGODB
// ============================
const mongoUri = process.env.MONGO_URI;

mongoose.connect(mongoUri)
  .then(() => console.log("✔️ Conectado a MongoDB Atlas"))
  .catch(err => console.error("❌ Error MongoDB:", err));

// ============================
// MODELO
// ============================
const TemperatureSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true
    },
    temperature: {
      type: Number,
      required: true
    }
  },
  {
    timestamps: true
  }
);

const Temperature = mongoose.model("Temperature", TemperatureSchema);

// ============================
// RUTAS API
// ============================

// Prueba rápida
app.get("/api/test", (req, res) => {
  res.json({ status: "API OK" });
});

// Guardar temperatura (ESP32)
app.post("/api/temperature", async (req, res) => {
  try {
    const { deviceId, temperature } = req.body;

    if (!deviceId || temperature === undefined) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    const lectura = new Temperature({
      deviceId,
      temperature
    });

    await lectura.save();

    res.json({ message: "Lectura guardada" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener temperaturas por día
app.get("/api/temperature/day", async (req, res) => {
  try {
    const { date } = req.query;

    let filtro = {};

    if (date) {
      const start = new Date(date + "T00:00:00.000Z");
      const end = new Date(date + "T23:59:59.999Z");
      filtro.createdAt = { $gte: start, $lte: end };
    }

    const datos = await Temperature
      .find(filtro)
      .sort({ createdAt: 1 });

    res.json(datos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================
// SERVER
// ============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor IoT escuchando en puerto ${PORT}`);
});
