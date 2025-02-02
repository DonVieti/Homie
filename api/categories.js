import { createClient } from '@libsql/client';

const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
    try {
        // KAtegorien abrufen
        if (req.method === 'GET') {
            // Alle Kategorien abrufen mit der Anzahl der Geräte
            const categories = await db.execute(`
                SELECT c.*, 
                (SELECT COUNT(*) FROM device_category WHERE category_id = c.id) AS device_count 
                FROM category c
            `);
            return res.status(200).json(categories.rows);
        }

        // Kategorie hinzufügen
        if (req.method === 'POST') {
            // dummy füllen
            const { name } = req.body;

            if (!name) {
                return res.status(400).json({ error: 'Name ist erforderlich' });
            }

            await db.execute('INSERT INTO category (name) VALUES (?)', [name]);
            return res.status(201).json({ message: 'Kategorie hinzugefügt' });
        }

        // Kategorie entfernen
        if (req.method === 'DELETE') {
            // dummy füllen
            const { id } = req.body;

            if (!id || isNaN(parseInt(id))) {
                return res.status(400).json({ error: 'Ungültige oder fehlende ID' });
            }

            // Prüfen ob Gerät mit Kategorie
            const count = await db.execute(
                'SELECT COUNT(*) AS count FROM device_category WHERE category_id = ?',
                [id]
            );
            // Kat existiert, aber verknüpft
            if (count.rows[0].count > 0) {
                return res.status(400).json({ error: 'Kategorie ist mit Geräten verknüpft und kann nicht gelöscht werden' });
            }
            // Kat entfernen
            const result = await db.execute('DELETE FROM category WHERE id = ?', [id]);

            if (result.rowsAffected === 0) {
                return res.status(404).json({ error: 'Kategorie nicht gefunden' });
            }

            return res.status(200).json({ message: 'Kategorie gelöscht' });
        }

        if (req.method === 'PUT') {
            // dummy füllen
            const { id, name } = req.body;
            // prüfen ob Werte gültig
            if (!id || !name) {
                return res.status(400).json({ error: 'ID und Name sind erforderlich' });
            }
            / Prepared Statement update
            const result = await db.execute(
                'UPDATE category SET name=? WHERE id=?',
                [name, id]
            );

            if (result.rowsAffected === 0) {
                return res.status(404).json({ error: 'Kategorie nicht gefunden' });
            }

            return res.status(200).json({ message: 'Kategorie aktualisiert' });
        }

        return res.status(405).json({ error: 'Methode nicht erlaubt' });
    } catch (error) {
        console.error('Fehler in der API:', error);
        return res.status(500).json({ error: 'Interner Serverfehler' });
    }
}
