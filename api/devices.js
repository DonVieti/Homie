import { createClient } from '@libsql/client';

const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
    try {
        // Tabelle devices abrufen
        if (req.method === 'GET') {
            const result = await db.execute('SELECT * FROM devices');
            return res.status(200).json(result.rows);
        }

        if (req.method === 'POST') {
            // dummy füllen
            const { name, type, power, room, category, image } = req.body;

            // prüfen ob alle Werte gültig
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
            // dummy mittels id
            const { id } = req.body;

            // prüfen ob Wert gültig
            if (!id || isNaN(parseInt(id))) {
                return res.status(400).json({ error: 'Ungültige oder fehlende ID' });
            }

            const result = await db.execute('DELETE FROM devices WHERE id = ?', [id]);

            // wenn result kein wert zurückgibt, id falsch
            if (result.rowsAffected === 0) {
                return res.status(404).json({ error: 'Gerät nicht gefunden' });
            }
            return res.status(200).json({ message: 'Gerät gelöscht' });
        }

        if (req.method === 'PUT') {
            // dummy füllen
            const { id, name, type, power, room, category, image } = req.body;

            // prüfen ob Werte gültig
            if (!id || !name || !type || !power || !room || !category || !image) {
                return res.status(400).json({ error: 'Alle Felder sind erforderlich' });
            }

            const result = await db.execute(
                'UPDATE devices SET name=?, type=?, power=?, room=?, category=?, image=? WHERE id=?',
                [name, type, power, room, category, image, id]
            );

            // wenn result kein wert zurückgibt, id falsch
            if (result.rowsAffected === 0) {
                return res.status(404).json({ error: 'Gerät nicht gefunden' });
            }

            return res.status(200).json({ message: 'Gerät aktualisiert' });
        }

        // unbekannte methode genutzt
        return res.status(405).json({ error: 'Methode nicht erlaubt' });

    } catch (error) {
        console.error('Fehler in der API:', error);
        return res.status(500).json({ error: 'Interner Serverfehler' });
    }
}
