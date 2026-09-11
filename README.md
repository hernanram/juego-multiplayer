# 🎮 Arena of Heroes

MOBA multijugador en el navegador, inspirado en DOTA. Construido con **Phaser 3** (cliente) + **Node.js + Socket.io** (servidor).

## 🦸 Los 5 Héroes

| Héroe | Rol | HP | Velocidad | Habilidad (Q) |
|-------|-----|-----|-----------|---------------|
| 🔥 **Ignis** | Mago | 450 | 140 | Bola de Fuego (AoE) |
| 🏹 **Vex** | DPS | 400 | 180 | Flecha Rápida |
| 🛡️ **Titan** | Tank | 850 | 120 | Escudo Divino |
| ⚡ **Shado** | Asesino | 380 | 200 | Salto Oscuro (Dash) |
| ✨ **Lyra** | Support | 430 | 155 | Aura Sagrada (Curación) |

## 🚀 Correr Localmente

```bash
# 1. Instalar dependencias
cd server
npm install

# 2. Iniciar el servidor
npm run dev       # con nodemon (recarga automática)
# ó
npm start         # producción

# 3. Abrir el juego
# Ir a: http://localhost:3000
```

## 🎮 Cómo Jugar

- **Click izquierdo** en el mapa → Mover héroe
- **Click izquierdo** en enemigo → Atacar
- **Q** → Usar habilidad especial (apunta con el mouse)
- **Rueda del mouse** → Zoom
- **Enter** → Chat
- **Objetivo**: ¡Destruir el Nexus enemigo!

## 🗺️ El Mapa

- Mapa 2000×2000 píxeles
- 3 lanes: Top, Mid (diagonal), Bottom
- Jungla con obstáculos
- Nexus equipo 1 (🔴): esquina superior-izquierda
- Nexus equipo 2 (🔵): esquina inferior-derecha
- Reaparición automática a los 6 segundos tras morir

## ☁️ Despliegue en AWS (Free Tier)

### Paso 1: Crear instancia EC2

1. Ve a [AWS Console](https://console.aws.amazon.com)
2. EC2 → Launch Instance
3. Selecciona: **Ubuntu 22.04 LTS**
4. Tipo: **t2.micro** (Free Tier)
5. Security Group → Agregar reglas:
   - SSH: puerto 22
   - HTTP: puerto 80
   - Custom TCP: puerto 3000

### Paso 2: Conectarte a la instancia

```bash
ssh -i "tu-clave.pem" ubuntu@TU-IP-PUBLICA
```

### Paso 3: Instalar Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version  # verificar
```

### Paso 4: Subir el proyecto

```bash
# Desde tu PC local:
scp -i "tu-clave.pem" -r ./juego ubuntu@TU-IP:~/arena-heroes

# O usar git:
git init
git add .
git commit -m "Arena of Heroes v1"
git remote add origin TU-REPO-URL
git push
# Luego en EC2: git clone TU-REPO-URL
```

### Paso 5: Instalar dependencias y correr

```bash
cd ~/arena-heroes/server
npm install

# Instalar PM2 para mantener el servidor activo
sudo npm install -g pm2
pm2 start index.js --name arena-heroes
pm2 startup  # para que inicie con el sistema
pm2 save
```

### Paso 6: Nginx como proxy (opcional pero recomendado)

```bash
sudo apt install -y nginx

# Crear config
sudo nano /etc/nginx/sites-available/arena-heroes
```

Contenido del archivo nginx:
```nginx
server {
    listen 80;
    server_name TU-IP-PUBLICA;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/arena-heroes /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Paso 7: ¡Listo! 🎉

Ahora puedes compartir `http://TU-IP-PUBLICA` con tus amigos.

---

## 🔧 Variables de Entorno

```bash
PORT=3000  # Puerto del servidor (default: 3000)
```

## 📦 Stack Tecnológico

- **Servidor**: Node.js 20, Express 4, Socket.io 4
- **Cliente**: HTML5, CSS3, Phaser 3.60, Web Audio API
- **Deploy**: AWS EC2 t2.micro, Nginx, PM2

## 🎵 Sonido

El juego genera sonidos proceduralmente con la **Web Audio API** — no requiere archivos de audio externos. Los sonidos se activan al:
- Mover el héroe
- Atacar
- Usar habilidades (cada héroe tiene sonido único)
- Matar enemigos
- Ganar/Perder

## 📝 Licencia

MIT — Úsalo libremente para proyectos personales o comerciales.
