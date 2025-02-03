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
        const result = await db.execute(
            `SELECT c.id, c.name, 
                (SELECT COUNT(*) FROM device_category WHERE category_id = c.id) AS device_count
             FROM category c WHERE c.id = ?`, [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Kategorie nicht gefunden" });
        }

        res.status(200).json(result.rows[0]); // Einzelne Kategorie zurückgeben
    } catch (error) {
        console.error("Fehler beim Abrufen der Kategorie:", error);
        res.status(500).json({ error: "Serverfehler" });
    }
}
