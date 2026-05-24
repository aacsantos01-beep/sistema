@echo off
setlocal

echo ==========================================
echo       SISTEMA IR ASSISTENCIA TECNICA
echo ==========================================
echo.

:: Define o diretorio base
cd /d %~dp0

echo [1/3] Limpando processos anteriores...
:: Tenta matar processos nas portas 3001 e 5000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1

echo [2/3] Verificando dependencias...
if not exist node_modules (
    echo Instalando dependencias da raiz...
    call npm install
)
if not exist server\node_modules (
    echo Instalando dependencias do servidor...
    cd server && call npm install && cd ..
)
if not exist client\node_modules (
    echo Instalando dependencias do cliente...
    cd client && call npm install && cd ..
)

echo [3/3] Iniciando o sistema...
echo.
echo O servidor abrira em uma nova janela (Porta 5000)
echo O cliente abrira em uma nova janela (Porta 3001)
echo.

:: Inicia o servidor em uma nova janela
start "SERVIDOR - IR Assistencia" cmd /c "cd /d %~dp0server && npm run dev"

:: Inicia o cliente em uma nova janela
start "CLIENTE - IR Assistencia" cmd /c "cd /d %~dp0client && npm start"

echo.
echo Sistema iniciado com sucesso! 
echo Mantenha as janelas pretas abertas enquanto usa o sistema.
echo.
pause
