require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors({
  origin: '*',   // permite GitHub Pages, Render, etc.
  methods: ['GET', 'POST'],
}));


// ======= MIDDLEWARE =======
app.use(express.json());
app.use(cors()); // Permitir peticiones desde GitHub Pages u otros dominios

// ======= VARIABLES DE ENTORNO =======
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;

// ======= MONGODB CONEXIÓN =======
const mongoUri = process.env.MONGO_URI||"mongodb+srv://Jean:J3anmarc0@cluster0.whidtbg.mongodb.net/?appName=Cluster0";


mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("✔️ Conectado a MongoDB Atlas"))
.catch(err => {
  console.error("❌ Error conectando a MongoDB:", err);
});

// ======= SCHEMA =======
const temperatureSchema = new mongoose.Schema({
  deviceId: String,
  temperature: Number,
  createdAt: { type: Date, default: Date.now }
});

const Temperature = mongoose.model("Temperature", temperatureSchema);

// =======================================================
//  ENDPOINT PARA RECIBIR TEMPERATURA DESDE EL ESP32
// =======================================================
app.post("/api/temperature", async (req, res) => {
  try {
    const { deviceId, temperature, apiKey } = req.body;

    // Validar API KEY
    if (apiKey !== API_KEY) {
      return res.status(401).json({ error: "API KEY inválida" });
    }

    // Validación de temperatura
    if (typeof temperature !== "number") {
      return res.status(400).json({ error: "Temperatura inválida" });
    }

    const newData = new Temperature({
      deviceId: deviceId || "unknown",
      temperature
    });

    await newData.save();

    return res.json({
      message: "OK",
      savedId: newData._id
    });

  } catch (err) {
    console.error("Error guardando temperatura:", err);
    return res.status(500).json({ error: "Error en el servidor" });
  }
});

// =======================================================
//  ENDPOINT PARA CONSULTAR LOS DATOS DE UN DÍA
//  Ejemplo: /api/temperature/day?date=2025-02-10
//  Si no se envía fecha → usa la fecha actual
// =======================================================
app.get("/api/temperature/day", async (req, res) => {
  try {
    let dateQuery = req.query.date;
    let start, end;

    if (dateQuery) {
      start = new Date(dateQuery + "T00:00:00");
      end   = new Date(dateQuery + "T23:59:59");
    } else {
      const now = new Date();
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    }

    const data = await Temperature.find({
      createdAt: { $gte: start, $lte: end }
    }).sort({ createdAt: 1 });

    return res.json(data);

  } catch (err) {
    console.error("Error consultando datos:", err);
    return res.status(500).json({ error: "Error en el servidor" });
  }
});

// =======================================================
//  SERVIR ARCHIVOS ESTÁTICOS (Carpeta public/)
// =======================================================
app.use(express.static(path.join(__dirname, "public")));

// Ruta fallback para cualquier archivo no encontrado
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// =======================================================
//  INICIAR SERVIDOR
// =======================================================
app.listen(PORT, () => {
  console.log(`🚀 Servidor IoT escuchando en puerto ${PORT}`);
});
