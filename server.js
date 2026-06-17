const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const fs = require('fs');

// Konfigurasi dotenv secara cerdas: hanya baca file jika file konfig.env fisik ada di folder
if (fs.existsSync('konfig.env')) {
    require('dotenv').config({ path: 'konfig.env' });
} else {
    require('dotenv').config(); // Fallback membaca environment variables langsung dari system cloud (GCP)
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

// 2. ENDPOINT /schema (Membuka formulir 5 kolom lengkap)
app.get('/schema', (req, res) => {
    res.status(200).json({
        student: { name: "Ririn Fauzia Rahma", nim: "2311522040" },
        resource: {
            name: "items",            
            label: "Data Buku",       
            description: "Aplikasi untuk mengelola data buku"
        },
        fields: [
            { name: "title", label: "Judul Buku", type: "text", required: true, showInTable: true },
            { name: "author", label: "Penulis", type: "text", required: true, showInTable: true },
            { name: "year", label: "Tahun Terbit", type: "number", required: false, showInTable: true },
            { name: "category", label: "Kategori", type: "select", options: ["Fiksi", "Non-Fiksi", "Teknologi", "Sejarah"], required: true, showInTable: true },
            { name: "description", label: "Deskripsi", type: "textarea", required: false, showInTable: true }
        ],
        endpoints: {
            list: "/items",
            detail: "/items/{id}",
            create: "/items",
            update: "/items/{id}",
            delete: "/items/{id}"
        }
    });
});

// 3. CRUD: GET ALL ITEMS
app.get('/items', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, title, author, year, category, description FROM books');
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

// 4. CRUD: GET ITEM BY ID
app.get('/items/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, title, author, year, category, description FROM books WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ status: "error", message: "Item not found" });
        res.status(200).json({ status: "success", data: rows[0] });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

// 5. CRUD: POST CREATE ITEM
app.post('/items', async (req, res) => {
    const { title, author, year, category, description } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO books (title, author, year, category, description) VALUES (?, ?, ?, ?, ?)',
            [title, author, year ? parseInt(year) : null, category, description || null]
        );
        res.status(201).json({
            status: "success",
            message: "Data created successfully",
            data: { id: result.insertId, title, author, year, category, description }
        });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

// 6. CRUD: PUT UPDATE ITEM
app.put('/items/:id', async (req, res) => {
    const { title, author, year, category, description } = req.body;
    const { id } = req.params;
    try {
        await pool.query(
            'UPDATE books SET title = ?, author = ?, year = ?, category = ?, description = ? WHERE id = ?',
            [title, author, year ? parseInt(year) : null, category, description || null, id]
        );
        res.status(200).json({
            status: "success",
            message: "Data updated successfully",
            data: { id: parseInt(id), title, author, year, category, description }
        });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

// 7. CRUD: DELETE ITEM
app.delete('/items/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM books WHERE id = ?', [req.params.id]);
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