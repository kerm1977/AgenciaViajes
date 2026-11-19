@echo off
chcp 65001 >nul
title TravelMaster OTA - watcher 8788
cd /d %~dp0
echo.
echo  TravelMaster OTA. El celular y la PC en el mismo WiFi.
echo  Cada cambio guardado en www\ se publica solo como version nueva.
echo  IPs de esta PC:
python scripts\fijar_ip.py
echo.
start "OTA TravelMaster" /min python scripts\ota_watch.py
pause
