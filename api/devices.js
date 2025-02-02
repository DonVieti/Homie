import { createClient } from '@libsql/client';

const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
    try {
        // Tabelle devices abrufen
        if (req.method === 'GET') {
            console.log("🔍 Anfrage erhalten:", req.query); // DEBUG: Logge die Query-Parameter

            const { id } = req.query;

            if (id) {
                console.log("🔍 Einzelnes Gerät wird geladen:", id); // DEBUG

                const deviceResult = await db.execute('SELECT * FROM devices WHERE id = ?', [id]);

                if (deviceResult.rows.length === 0) {
                    console.log("❌ Gerät nicht gefunden:", id);
                    return res.status(404).json({ error: "Gerät nicht gefunden" });
                }

                const device = deviceResult.rows[0];

                // Kategorien für dieses Gerät abrufen
                const categoriesResult = await db.execute(`
            SELECT c.id AS category_id, c.name AS category_name
            FROM device_category dc 
            JOIN category c ON dc.category_id = c.id
            WHERE dc.device_id = ?
        `, [id]);

                console.log("✅ Kategorien gefunden:", categoriesResult.rows); // DEBUG

                return res.status(200).json({
                    ...device,
                    categories: categoriesResult.rows.map(cat => ({
                        id: cat.category_id,
                        name: cat.category_name
                    }))
                });
            }

            console.log("🔍 Alle Geräte werden geladen"); // DEBUG
            const devices = await db.execute('SELECT * FROM devices');
            const deviceCategoryMap = await db.execute(`
                SELECT dc.device_id, c.id AS category_id, c.name AS category_name
                FROM device_category dc
                         JOIN category c ON dc.category_id = c.id
            `);

            const devicesWithCategories = devices.rows.map(device => ({
                ...device,
                categories: deviceCategoryMap.rows
                    .filter(dc => dc.device_id === device.id)
                    .map(dc => ({ id: dc.category_id, name: dc.category_name }))
            }));

            console.log("✅ Alle Geräte mit Kategorien geladen"); // DEBUG
            return res.status(200).json(devicesWithCategories);
        }

        if (req.method === 'POST') {
            // dummy füllen
            const { name, type, power, room, categories, image } = req.body;

            // prüfen ob alle Werte gültig
            if (!name || !type || !power || !room || !categories || !image) {
                return res.status(400).json({ error: 'Alle Felder sind erforderlich' });
            }

            // Prepared Statement insert
            const deviceInsert = await db.execute(
                'INSERT INTO devices (name, type, power, room, image) VALUES (?, ?, ?, ?, ?)',
                [name, type, power, room, image]
            );
            const deviceId = deviceInsert.lastInsertRowid;

            // Kategorien zu device_category-Tabelle hinzufügen
            for (const categoryId of categories) {
                await db.execute(
                    'INSERT INTO device_category (device_id, category_id) VALUES (?, ?)',
                    [deviceId, categoryId]
                );
            }

            return res.status(201).json({ message: 'Gerät hinzugefügt' });
        }

        if (req.method === 'DELETE') {
            // dummy mittels id
            const { id } = req.body;

            // prüfen ob Wert gültig
            if (!id || isNaN(parseInt(id))) {
                return res.status(400).json({ error: 'Ungültige oder fehlende ID' });
            }
            // Erst verknüpfung gerät-kategorie
            await db.execute('DELETE FROM device_category WHERE device_id = ?', [id]);
            // Gerät löschen
            const result = await db.execute('DELETE FROM devices WHERE id = ?', [id]);

            // wenn result kein wert zurückgibt, id falsch
            if (result.rowsAffected === 0) {
                return res.status(404).json({ error: 'Gerät nicht gefunden' });
            }
            return res.status(200).json({ message: 'Gerät gelöscht' });
        }

        if (req.method === 'PUT') {
            // dummy füllen
            const { id, name, type, power, room, categories, image } = req.body;

            // prüfen ob Werte gültig
            if (!id || !name || !type || !power || !room || !categories || !image) {
                return res.status(400).json({ error: 'Alle Felder sind erforderlich' });
            }
            // Prepared Statement update
            const result = await db.execute(
                'UPDATE devices SET name=?, type=?, power=?, room=?, image=? WHERE id=?',
                [name, type, power, room, image, id]
            );

            // wenn result kein wert zurückgibt, id falsch
            if (result.rowsAffected === 0) {
                return res.status(404).json({ error: 'Gerät nicht gefunden' });
            }
            // Alte Kategorien entfernen
            await db.execute('DELETE FROM device_category WHERE device_id = ?', [id]);
            // Neue Kategorien zuweisen
            for (const categoryId of categories) {
                await db.execute(
                    'INSERT INTO device_category (device_id, category_id) VALUES (?, ?)',
                    [id, categoryId]
                );
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
