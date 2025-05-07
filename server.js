const http = require("http");
const fs = require("fs");
const WebSocket = require("ws");
const express = require("express");
app.use(express.static('public'));

const server = http.createServer((req, res) => {
    if (req.url === "/" || req.url === "/index.html") {
        fs.readFile("index.html", (err, data) => { // 📌 index.html을 public 폴더 없이 제공
            if (err) {
                res.writeHead(500, { "Content-Type": "text/plain" });
                res.end("Internal Server Error");
            } else {
                res.writeHead(200, { "Content-Type": "text/html" });
                res.end(data);
            }
        });
    } else {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not Found");
    }
});

const wss = new WebSocket.Server({ server });

let avatars = {};
let clientId = 0;

wss.on("connection", (ws) => {
    const userId = `user_${clientId++}`;
    avatars[userId] = { x: 200, y: 200, gender: null, username: `익명_${clientId}` };

    ws.send(JSON.stringify({ avatars }));

    ws.on("message", (message) => {
        const data = JSON.parse(message);

        if (data.username) {
            avatars[userId].username = data.username;
        }

        if (data.gender) {
            avatars[userId].gender = data.gender;
        }

        if (data.dx !== undefined && data.dy !== undefined) {
            avatars[userId].x = Math.max(0, Math.min(380, avatars[userId].x + data.dx));
            avatars[userId].y = Math.max(0, Math.min(380, avatars[userId].y + data.dy));
        }

        if (data.message) {
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ message: `${avatars[userId].username}: ${data.message}` }));
                }
            });
        }

        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ avatars }));
            }
        });
    });

    ws.on("close", () => {
        delete avatars[userId];
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ avatars }));
            }
        });
    });
});

const PORT = process.env.PORT || 8000;  
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
