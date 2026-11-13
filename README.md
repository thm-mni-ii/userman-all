# userman-all – Einrichtung und Start

1. **Abhängigkeiten installieren**

   In den beiden Ordnern `client` und `server` jeweils mit der rechten Maustaste auf die Datei `package.json` klicken und **Run npm install** auswählen.

2. **Automatische Kompilierung aktivieren**

   In WebStorm die TypeScript-Option **Recompile on changes** aktivieren.

3. **Datenbank vorbereiten**

   Die Datenbank starten und das Skript [`server/db/init.sql`](server/db/init.sql) importieren (siehe Handout).

4. **Server starten**

   In der IDE mit der rechten Maustaste auf [`server/src/server.js`](server/src/server.js) klicken und **Run** auswählen.

5. **Anwendung öffnen**

   Auf die URL in der Konsole klicken, um die Anwendung im Browser zu öffnen. Die Logindaten stehen im SQL-Skript [`server/db/init.sql`](server/db/init.sql).
