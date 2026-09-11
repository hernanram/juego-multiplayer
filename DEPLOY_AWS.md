# 🚀 Guía de Despliegue en AWS (Capa Gratuita - Free Tier)

Esta guía te explica paso a paso cómo subir **Arena of Heroes** a tu cuenta gratuita de **AWS (Amazon Web Services)** para que tus amigos puedan conectarse y jugar desde cualquier parte del mundo.

---

## Opción 1: AWS EC2 (Servidor Virtual Gratis 24/7 - Recomendado)

### 1. Lanzar una Instancia EC2 Gratuita
1. Entra a la consola de AWS: https://console.aws.amazon.com
2. Busca el servicio **EC2** y haz click en **"Lanzar instancia"** (*Launch Instance*).
3. Ajusta estos datos:
   - **Nombre**: `ArenaOfHeroes-Server`
   - **Imagen del sistema (AMI)**: `Ubuntu Server 24.04 LTS` (Apto para la capa gratuita / *Free Tier eligible*).
   - **Tipo de instancia**: `t2.micro` o `t3.micro` (Apto para capa gratuita).
   - **Par de claves (Key pair)**: Haz click en *Crear un nuevo par de claves*, nómbralo `mi-juego.pem` y descárgalo a tu computadora.
   - **Configuración de red (Security Group)**:
     - Marca la casilla **Permitir tráfico SSH**.
     - Marca la casilla **Permitir tráfico HTTP desde internet**.
     - Agrega una regla personalizada: **TCP Regla personalizada**, Puerto `3000`, Origen `0.0.0.0/0`.
4. Haz click en **Lanzar instancia**.

---

### 2. Conectarse al Servidor de AWS desde tu PC
Abre PowerShell en tu computadora en la carpeta donde descargaste la clave `mi-juego.pem` y ejecuta:

```bash
ssh -i "mi-juego.pem" ubuntu@TU_IP_PUBLIC_DE_EC2
```
*(Reemplaza `TU_IP_PUBLIC_DE_EC2` por la IP pública que AWS le asignó a tu instancia EC2).*

---

### 3. Instalar Node.js y Git en el Servidor
Una vez dentro del servidor de AWS, ejecuta los siguientes comandos:

```bash
sudo apt update
sudo apt install -y nodejs npm git
```

---

### 4. Subir el Código de tu Juego
Puedes clonar tu repositorio de GitHub o subir la carpeta:

```bash
git clone https://github.com/TU_USUARIO/juego.git
cd juego/server
npm install
```

---

### 5. Iniciar el Juego 24/7 con PM2
Para que el servidor se mantenga activo las 24 horas del día, incluso si apagas tu PC:

```bash
sudo npm install -g pm2
pm2 start index.js --name "arena-heroes"
pm2 startup
pm2 save
```

---

### 6. ¡Listo para Jugar!
Ahora todos tus amigos pueden entrar directamente desde su navegador ingresando a:

`http://TU_IP_PUBLIC_DE_EC2:3000`

---

## Opción 2: AWS App Runner / Docker (1-Click Container)
El proyecto incluye un archivo `Dockerfile`. Puedes subir la imagen a **AWS ECR** y desplegarla en **AWS App Runner** para tener un enlace HTTPS seguro automático.
