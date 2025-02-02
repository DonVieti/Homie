import { createClient } from '@libsql/client';

const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
    const { id } = req.query; // ID aus der URL-Route holen
    if (!id) {
        return res.status(400).json({ error: "ID ist erforderlich" });
    }

    try {
        // Geräte abrufen
        const result = await db.execute('SELECT * FROM devices WHERE id = ?', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Gerät nicht gefunden" });
        }

        const device = deviceResult.rows[0];
        // Kategorien abrufen
        const categoriesResult = await db.execute(`
            SELECT c.id AS category_id, c.name AS category_name
            FROM device_category dc 
            JOIN category c ON dc.category_id = c.id
            WHERE dc.device_id = ?
        `, [id]);

        // Gerät mit Kategorien zurückgeben
        return res.status(200).json({
            ...device,
            categories: categoriesResult.rows.map(cat => ({
                id: cat.category_id,
                name: cat.category_name
            }))
        });
    } catch (error) {
        console.error("Fehler beim Abrufen des Geräts:", error);
        res.status(500).json({ error: "Serverfehler" });
    }
}
