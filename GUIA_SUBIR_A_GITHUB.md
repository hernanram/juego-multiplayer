# 🚀 Guía Paso a Paso: Cómo Subir y Actualizar el Proyecto en GitHub

Esta guía documenta los pasos necesarios para vincular este proyecto a **GitHub** por primera vez y cómo mantenerlo actualizado en el futuro.

---

## 📌 Estado Actual del Proyecto
En tu máquina local ya hemos realizado la configuración inicial básica:
- ✅ **`.gitignore` creado:** Filtra carpetas pesadas (como `node_modules/`) y archivos temporales para no subirlos a GitHub.
- ✅ **Git inicializado:** Se creó el repositorio Git local en la rama principal (`main`).
- ✅ **Primer Commit creado:** Todos los archivos de tu proyecto están guardados localmente en el punto de control inicial.

---

## 🛠️ Paso 1: Crear el Repositorio en GitHub

1. Abre tu navegador web e ingresa a tu cuenta de GitHub.
2. Dirígete a: **[https://github.com/new](https://github.com/new)** (o haz clic en el botón `+` arriba a la derecha y selecciona **New repository**).
3. Configura los siguientes campos:
   - **Repository name:** Escribe el nombre de tu proyecto (ejemplo: `juego-multiplayer`).
   - **Description (opcional):** Breve descripción del juego.
   - **Public / Private:** Elige si deseas que sea Público (visible para todos) o Privado (solo para ti y colaboradores).
   - **⚠️ MUY IMPORTANTE:** **NO marques** las casillas de:
     - ❌ *Add a README file*
     - ❌ *Add .gitignore*
     - ❌ *Choose a license*  
     *(Esto es porque tu proyecto local ya los tiene incluidos).*
4. Haz clic en el botón verde **Create repository**.

---

## 🔗 Paso 2: Conectar tu Proyecto Local con GitHub

Una vez creado el repositorio en GitHub, la página te mostrará una sección llamada **"…or push an existing repository from the command line"**.

1. Abre tu terminal de **PowerShell** o **Terminal** en la carpeta del proyecto (`C:\Users\ROG STRIX\Desktop\juego`).
2. Copia y ejecuta los siguientes dos comandos (reemplazando `TU_USUARIO` y `TU_REPOSITORIO` con tus datos reales):

```powershell
# 1. Vincular el repositorio remoto de GitHub
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git

# 2. Subir tu código a la rama 'main' de GitHub
git push -u origin main
```

> 💡 **Nota de Autenticación:** Si es la primera vez que usas Git/GitHub en esa computadora, Windows abrirá una pequeña ventana pidiéndote iniciar sesión en tu cuenta de GitHub. Solo debes hacer clic en **Sign in with your browser** y autorizar el acceso.

---

## 🔄 Paso 3: Cómo subir cambios futuros a GitHub

Cada vez que hagas modificaciones en tu código y quieras actualizarlo en GitHub, solo debes ejecutar estos 3 sencillos comandos en tu terminal:

```powershell
# 1. Seleccionar todos los archivos modificados o creados
git add .

# 2. Guardar los cambios con un mensaje explicativo
git commit -m "Explicación breve de lo que cambiaste o agregaste"

# 3. Subir los cambios a GitHub
git push
```

---

## 🛠️ Comandos de Utilidad Rápidos

- **Ver el estado de tus archivos:**
  ```powershell
  git status
  ```
- **Ver a qué URL de GitHub está conectado el proyecto:**
  ```powershell
  git remote -v
  ```
- **Ver el historial de commits guardados:**
  ```powershell
  git log --oneline
  ```
