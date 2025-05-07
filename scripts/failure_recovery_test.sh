#!/bin/bash

# Detener un contenedor de consumer
echo "Deteniendo un contenedor de consumer..."
docker-compose stop consumer

# Esperar unos segundos
echo "Esperando 10 segundos..."
sleep 10

# Volver a iniciar el contenedor de consumer
echo "Reiniciando el contenedor de consumer..."
docker-compose start consumer

# Mostrar los logs para verificar la recuperación
echo "Mostrando logs para verificar la recuperación..."
docker-compose logs -f consumer
