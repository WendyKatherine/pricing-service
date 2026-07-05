#!/usr/bin/env bash
set -euo pipefail

echo "=============================================="
echo "1. BUILD FRESCO (sin caché, target run)"
echo "=============================================="
docker build --no-cache --target run -t pricing-test . 2>&1

echo ""
echo "=============================================="
echo "2. VERIFICACIÓN: grep de paquetes sospechosos"
echo "=============================================="
docker run --rm pricing-test ls node_modules | grep -E 'jest|eslint|typescript'

echo ""
echo "=============================================="
echo "3. ÁRBOL: npm ls de los paquetes sospechosos"
echo "=============================================="
docker run --rm pricing-test npm ls @eslint/js @jest/core @typescript-eslint/parser 2>&1

echo ""
echo "=============================================="
echo "4. ÁRBOL COMPLETO: npm ls --all --production"
echo "=============================================="
docker run --rm pricing-test npm ls --all --production 2>&1 | head -80
