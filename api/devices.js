import { createClient } from '@libsql/client';

const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
    try {
        if (req.method === 'GET') {
            // Alle Geräte abrufen
            const result = await db.execute('SELECT * FROM devices');
            return res.status(200).json(result.rows);
        }

        if (req.method === 'POST') {
            // Neues Gerät hinzufügen
            const { name, type, power, room, category, image } = req.body;

            // 🛑 Fehler prüfen: Alle Felder müssen vorhanden sein
            if (!name || !type || !power || !room || !category || !image) {
                return res.status(400).json({ error: 'Alle Felder sind erforderlich' });
            }
            // Prepared Statement
            await db.execute(
                'INSERT INTO devices (name, type, power, room, category, image) VALUES (?, ?, ?, ?, ?, ?)',
                [name, type, power, room, category, image]
            );
            return res.status(201).json({ message: 'Gerät hinzugefügt' });
        }

        if (req.method === 'DELETE') {
            // Gerät löschen
            const { id } = req.body;

            // 🛑 Prüfen, ob eine gültige ID übergeben wurde
            if (!id || isNaN(parseInt(id))) {
                return res.status(400).json({ error: 'Ungültige oder fehlende ID' });
            }

            const result = await db.execute('DELETE FROM devices WHERE id = ?', [id]);

            // Falls kein Gerät gelöscht wurde, war die ID nicht vorhanden
            if (result.rowsAffected === 0) {
                return res.status(404).json({ error: 'Gerät nicht gefunden' });
            }

            return res.status(200).json({ message: 'Gerät gelöscht' });
        }

        if (req.method === 'PUT') {
            // Gerät aktualisieren
            const { id, name, type, power, room, category, image } = req.body;

            // 🛑 Prüfen, ob alle Felder vorhanden sind
            if (!id || !name || !type || !power || !room || !category || !image) {
                return res.status(400).json({ error: 'Alle Felder sind erforderlich' });
            }

            const result = await db.execute(
                'UPDATE devices SET name=?, type=?, power=?, room=?, category=?, image=? WHERE id=?',
                [name, type, power, room, category, image, id]
            );

            // Falls kein Gerät aktualisiert wurde, war die ID nicht vorhanden
            if (result.rowsAffected === 0) {
                return res.status(404).json({ error: 'Gerät nicht gefunden' });
            }

            return res.status(200).json({ message: 'Gerät aktualisiert' });
        }

        // 🛑 Falls eine unbekannte Methode genutzt wird:
        return res.status(405).json({ error: 'Methode nicht erlaubt' });

    } catch (error) {
        console.error('Fehler in der API:', error);
        return res.status(500).json({ error: 'Interner Serverfehler' });
    }
}
