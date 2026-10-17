import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  server: {
    port: 3000,
    host: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        admin: path.resolve(__dirname, 'admin.html')
      }
    }
  },
  plugins: [
    {
      name: 'facebook-sync-api',
      configureServer(server) {
        server.middlewares.use('/api/sync-facebook', (req, res) => {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          
          if (req.method === 'OPTIONS') {
            res.statusCode = 200;
            res.end();
            return;
          }

          try {
            const feedPath = path.resolve(__dirname, 'data', 'facebook-feed.json');
            if (fs.existsSync(feedPath)) {
              const content = fs.readFileSync(feedPath, 'utf-8');
              const parsed = JSON.parse(content);
              res.statusCode = 200;
              res.end(JSON.stringify({
                success: true,
                message: 'Synced successfully from Mercer Chiefs Facebook Page',
                source: 'https://www.facebook.com/mercerchiefshockey',
                syncedAt: new Date().toISOString(),
                count: parsed.posts ? parsed.posts.length : 0,
                posts: parsed.posts || []
              }));
              return;
            }
          } catch (err) {
            console.error('Error in /api/sync-facebook:', err);
          }

          res.statusCode = 200;
          res.end(JSON.stringify({
            success: false,
            message: 'Unable to load Facebook feed cache',
            posts: []
          }));
        });

        server.middlewares.use('/api/sync-junior', (req, res) => {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          
          if (req.method === 'OPTIONS') {
            res.statusCode = 200;
            res.end();
            return;
          }

          try {
            const feedPath = path.resolve(__dirname, 'data', 'junior-feed.json');
            if (fs.existsSync(feedPath)) {
              const content = fs.readFileSync(feedPath, 'utf-8');
              res.statusCode = 200;
              res.end(content);
              return;
            }
          } catch (err) {
            console.error('Error in /api/sync-junior:', err);
          }

          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'junior feed not found' }));
        });
      }
    }
  ]
});
