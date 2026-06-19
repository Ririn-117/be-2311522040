const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const fs = require('fs');

// Konfigurasi dotenv secara cerdas: hanya baca file jika file konfig.env fisik ada di folder
if (fs.existsSync('konfig.env')) {
    require('dotenv').config({ path: 'konfig.env' });
} else {
    require('dotenv').config(); 
}

const app = express();
app.use(cors());
app.use(express.json());

// 0. RUTE UTAMA
app.get('/', (req, res) => {
    res.status(200).json({
        status: "success",
        message: "Welcome to Ririn's Cloud Computing API!"
    });
});

// Konfigurasi Database Connection Pool (Menggunakan nilai default jika port kosong)
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// 1. ENDPOINT /health
app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.status(200).json({
            status: "success",
            message: "Backend is running",
            database: "connected",
            student: { name: "Ririn Fauzia Rahma", nim: "2311522040" }
        });
    } catch (error) {
        res.status(200).json({
            status: "success", 
            message: "Backend is running, but database connection error",
            database: "disconnected",
            student: { name: "Ririn Fauzia Rahma", nim: "2311522040" }
        });
    }
});

// 2. ENDPOINT /schema (Membuka formulir input ringkas dengan tepat 4 atribut database laptop)
app.get('/schema', (req, res) => {
    res.status(200).json({
        student: { name: "Ririn Fauzia Rahma", nim: "2311522040" },
        resource: {
            name: "laptops",            
            label: "Daftar Laptop",       
            description: "Aplikasi ringkas untuk mengelola data laptop kelompok"
        },
        fields: [
            { name: "brand", label: "Merek (Brand)", type: "text", required: true, showInTable: true },
            { name: "model", label: "Tipe / Model", type: "text", required: true, showInTable: true },
            { name: "ram", label: "Kapasitas RAM (GB)", type: "number", required: true, showInTable: true },
            { name: "price", label: "Harga (Rp)", type: "number", required: true, showInTable: true }
        ],
        endpoints: {
            list: "/laptops",
            detail: "/laptops/{id}",
            create: "/laptops",
            update: "/laptops/{id}",
            delete: "/laptops/{id}"
        }
    });
});

// 3. CRUD: GET ALL LAPTOPS
app.get('/laptops', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, brand, model, ram, price FROM laptops');
        res.status(200).json({
            status: "success",
            message: "Data retrieved successfully",
            total: rows.length, 
            data: rows           
        });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message, data: [] });
    }
});

// 4. CRUD: GET LAPTOP BY ID
app.get('/laptops/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, brand, model, ram, price FROM laptops WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ status: "error", message: "Laptop not found" });
        res.status(200).json({ status: "success", data: rows[0] });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

// 5. CRUD: POST CREATE LAPTOP
app.post('/laptops', async (req, res) => {
    const { brand, model, ram, price } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO laptops (brand, model, ram, price) VALUES (?, ?, ?, ?)',
            [brand, model, parseInt(ram), parseFloat(price)]
        );
        res.status(201).json({
            status: "success",
            message: "Data created successfully",
            data: { id: result.insertId, brand, model, ram, price }
        });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

// 6. CRUD: PUT UPDATE LAPTOP
app.put('/laptops/:id', async (req, res) => {
    const { brand, model, ram, price } = req.body;
    const { id } = req.params;
    try {
        await pool.query(
            'UPDATE laptops SET brand = ?, model = ?, ram = ?, price = ? WHERE id = ?',
            [brand, model, parseInt(ram), parseFloat(price), id]
        );
        res.status(200).json({
            status: "success",
            message: "Data updated successfully",
            data: { id: parseInt(id), brand, model, ram, price }
        });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

// 7. CRUD: DELETE LAPTOP
app.delete('/laptops/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM laptops WHERE id = ?', [req.params.id]);
        res.status(200).json({ status: "success", message: "Data deleted successfully" });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

// Menjalankan Server (Sudah Sinkron 100% untuk GCP Cloud Run & Dockerfile)
const PORT = process.env.PORT || 8080; 

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});