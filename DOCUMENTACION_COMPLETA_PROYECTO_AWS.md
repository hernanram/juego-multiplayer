# 🎮 Arena of Heroes — Documentación Completa del Proyecto y Despliegue en AWS

> **Guía integral y manual de arquitectura para guardar, respaldar y desplegar la aplicación multijugador en la nube de Amazon Web Services (AWS Free Tier).**

---

## 📌 1. Resumen General del Juego

**Arena of Heroes** es un juego MOBA multijugador 3v3 en tiempo real ejecutado sobre el navegador web sin necesidad de plugins o instalaciones adicionales.

### 🌟 Características Principales
- **Motor Gráfico Pseudo-3D (Phaser 3)**: Renderizado a 60 FPS con gemas flotantes 3D, iluminación volumétrica, sombras dinámicas y terreno estilizado.
- **5 Héroes Únicos**:
  - 🔥 **Ignis (Mago)**: *Bola de Fuego* (Q: 3s CD) y *Meteoro Gigante* (R: 12s CD).
  - 🏹 **Vex (Arquera DPS)**: *Flecha Rápida* (Q: 3s CD) y *Ráfaga Perforante* (R: 10s CD).
  - 🛡️ **Titan (Tanque)**: *Escudo Divino* (Q: 3s CD) y *Sismo Colosal* (R: 14s CD).
  - ⚡ **Shado (Asesino)**: *Salto Oscuro* (Q: 3s CD) y *Marca Sombría* (R: 12s CD).
  - ✨ **Lyra (Sacerdotisa)**: *Aura Sagrada* (Q: 3s CD) y *Bendición Celestial* (R: 15s CD).
- **IA de Bots (3v3 Autollenado)**: Bots autónomos que patrullan carriles, atacan torres/enemigos, usan habilidades [Q] y [R], y se retiran a su base a curarse si tienen <25% HP.
- **Torres Defensivas & Nexus**: 4 Torres de piedra 3D que disparan proyectiles fotónicos. Destruir el Nexus enemigo (1500 HP) otorga la victoria.
- **Minimapa en la Esquina Superior Derecha**: Muestra la posición en tiempo real de héroes, bots, torres y bases.
- **Sintetizador de Música Épica (Web Audio API)**: Banda sonora procedural estilo Dota 2 / League of Legends (~166 BPM) con botón Mute/Unmute 🔊.

---

## 📁 2. Estructura del Código

```text
juego/
├── client/
│   ├── css/
│   │   └── style.css           # Estilos oscuros neón, HUD, botones y animaciones
│   ├── js/
│   │   └── game.js             # Motor Phaser 3, renders 3D, audio y Socket.io
│   └── index.html              # Interfaz HTML5, Menú, Lobby, HUD y Minimapa arriba a la derecha
├── server/
│   ├── HeroStats.js            # Definición de estadísticas y cooldowns (Q: 3s, R)
│   ├── GameRoom.js             # Motor físico 20 FPS, combate, IA de Bots y Torres
│   └── index.js                # Servidor Express + Socket.io en puerto 3000
├── Dockerfile                  # Contenedor Docker listo para producción
├── DEPLOY_AWS.md               # Guía rápida de comandos AWS
└── DOCUMENTACION_COMPLETA_PROYECTO_AWS.md  # Este archivo de documentación
```

---

## ☁️ 3. Guía Paso a Paso para Desplegar en AWS EC2 (Capa Gratuita / Free Tier)

### 📋 Requisitos Previos
- Una cuenta en AWS ([aws.amazon.com](https://aws.amazon.com)).
- El archivo de clave `.pem` generado en AWS.

---

### Paso 1: Lanzar la Instancia en la Consola de AWS
1. Entra a la **Consola de AWS** -> Busca el servicio **EC2**.
2. Haz click en **Lanzar una instancia** (*Launch Instance*).
3. Rellena los datos:
   - **Nombre**: `ArenaOfHeroes-Server`
   - **Sistema Operativo (AMI)**: Selecciona `Ubuntu` (`Ubuntu Server 24.04 LTS`).
   - **Tipo de instancia**: `t2.micro` o `t3.micro` *(Gratuito / Free Tier eligible)*.
   - **Par de claves (Key Pair)**: Haz click en *Crear nuevo par de claves*, nómbralo `mi-juego` y descarga `mi-juego.pem`.
4. **Configuración de Red (Security Group / Reglas de Seguridad)**:
   - Haz click en **Editar**.
   - Marca **Permitir tráfico SSH**.
   - Marca **Permitir tráfico HTTP desde internet**.
   - Haz click en **Agregar regla de grupo de seguridad**:
     - **Tipo**: `TCP personalizado`
     - **Puerto**: `3000`
     - **Origen**: `0.0.0.0/0` *(Cualquier lugar / Anywhere)*.
5. Haz click en el botón naranja **Lanzar instancia**.

---

### Paso 2: Conectarte desde tu computadora (PowerShell / Terminal)
Abre PowerShell en tu computadora en la carpeta donde descargaste `mi-juego.pem` y ejecuta:

```powershell
# Dar permisos a la clave (si estás en Windows no requiere chmod)
ssh -i "mi-juego.pem" ubuntu@TU_IP_PUBLICA_EC2
```
*(Reemplaza `TU_IP_PUBLICA_EC2` por la IP que AWS le asignó a tu instancia EC2).*

---

### Paso 3: Instalar Node.js y Clonar el Proyecto en AWS
Una vez dentro del servidor Ubuntu de AWS, copia y pega estos comandos:

```bash
# 1. Actualizar e instalar Node.js, NPM y Git
sudo apt update
sudo apt install -y nodejs npm git

# 2. Clonar tu repositorio de GitHub o subir el proyecto
git clone https://github.com/TU_USUARIO/TU_REPOSITORIO.git juego
cd juego/server

# 3. Instalar dependencias
npm install
```

---

### Paso 4: Mantener el Juego Corriendo 24/7 con PM2
Para que el servidor del juego nunca se apague incluso si cierras la consola o apagas tu PC:

```bash
# 1. Instalar gestor de procesos PM2
sudo npm install -g pm2

# 2. Iniciar el servidor de juego
pm2 start index.js --name "arena-heroes"

# 3. Configurar auto-arranque al reiniciar el servidor AWS
pm2 startup
pm2 save
```

---

### 🎮 4. Probar y Compartir con tus Amigos

Una vez completado el paso 4, tu juego estará activo las 24 horas del día. Tus amigos y tú podrán entrar desde cualquier navegador ingresando a:

`http://TU_IP_PUBLICA_EC2:3000`

---

## 🛠️ 5. Comandos Útiles para Administración

- **Ver estado del servidor en AWS**: `pm2 status`
- **Ver logs en tiempo real**: `pm2 logs arena-heroes`
- **Reiniciar el servidor**: `pm2 restart arena-heroes`
- **Detener el juego**: `pm2 stop arena-heroes`
