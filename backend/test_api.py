import json
import math
import random
import unittest
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

# URL base de la API. Puede sobreescribirse si es necesario.
API_URL = "http://localhost:8000"

class TestSafeMapAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Verificar si el backend está activo antes de correr los tests
        try:
            with urllib.request.urlopen(f"{API_URL}/healthz", timeout=2) as response:
                if response.status != 200:
                    raise RuntimeError("healthz status not 200")
        except Exception as e:
            raise unittest.SkipTest(
                f"El backend de SafeMap en {API_URL} no está disponible. "
                f"Por favor levanta el servidor (docker compose up) antes de correr las pruebas. Error: {e}"
            )

    def _http_request(self, path, method="GET", data=None, headers=None):
        """Helper para hacer peticiones HTTP con la librería estándar de Python."""
        url = f"{API_URL}{path}"
        req_headers = {"Content-Type": "application/json"}
        if headers:
            req_headers.update(headers)
        
        req_data = None
        if data is not None:
            req_data = json.dumps(data).encode("utf-8")
            
        req = urllib.request.Request(url, data=req_data, headers=req_headers, method=method)
        
        try:
            with urllib.request.urlopen(req, timeout=5) as response:
                status = response.status
                body = response.read().decode("utf-8")
                return status, json.loads(body) if body else None
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8")
            try:
                res_data = json.loads(body)
            except Exception:
                res_data = body
            return e.code, res_data
        except Exception as e:
            self.fail(f"Error de red/conexión al llamar a {url}: {e}")

    def test_01_healthz(self):
        """Verifica que el endpoint /healthz responda ok."""
        status, data = self._http_request("/healthz")
        self.assertEqual(status, 200)
        self.assertEqual(data, {"status": "ok"})

    def test_02_crear_reporte_valido(self):
        """Crea un reporte válido y verifica que devuelva id (UUID) y expira_en."""
        # Generar ubicación aleatoria alejada de otros tests
        lat = 19.43 + random.uniform(-0.1, 0.1)
        lng = -99.13 + random.uniform(-0.1, 0.1)
        
        payload = {
            "categoria": "robo",
            "lat": lat,
            "lng": lng,
            "descripcion": "Robo de celular en vía pública",
            "severidad": "alta"
        }
        
        status, data = self._http_request("/api/reportes", method="POST", data=payload)
        self.assertEqual(status, 201)
        self.assertIn("id", data)
        self.assertIn("expira_en", data)
        
        # Validar formato UUID (8-4-4-4-12)
        uuid_parts = data["id"].split("-")
        self.assertEqual(len(uuid_parts), 5)
        self.assertEqual([len(p) for p in uuid_parts], [8, 4, 4, 4, 12])

    def test_03_crear_reporte_validaciones(self):
        """Valida que los inputs incorrectos sean rechazados con códigos 422."""
        # 1. Latitud inválida (> 90)
        payload = {"categoria": "robo", "lat": 95.0, "lng": -99.13, "descripcion": "Test"}
        status, _ = self._http_request("/api/reportes", method="POST", data=payload)
        self.assertEqual(status, 422)
        
        # 2. Longitud inválida (< -180)
        payload = {"categoria": "robo", "lat": 19.43, "lng": -190.0, "descripcion": "Test"}
        status, _ = self._http_request("/api/reportes", method="POST", data=payload)
        self.assertEqual(status, 422)

        # 3. Categoría inválida
        payload = {"categoria": "hurto_mayor", "lat": 19.43, "lng": -99.13, "descripcion": "Test"}
        status, _ = self._http_request("/api/reportes", method="POST", data=payload)
        self.assertEqual(status, 422)

        # 4. Descripción excesiva (> 280)
        long_desc = "x" * 281
        payload = {"categoria": "robo", "lat": 19.43, "lng": -99.13, "descripcion": long_desc}
        status, _ = self._http_request("/api/reportes", method="POST", data=payload)
        self.assertEqual(status, 422)

        # 5. Severidad inválida
        payload = {"categoria": "robo", "lat": 19.43, "lng": -99.13, "descripcion": "Test", "severidad": "urgente"}
        status, _ = self._http_request("/api/reportes", method="POST", data=payload)
        self.assertEqual(status, 422)

    def test_04_anti_duplicado_409(self):
        """Verifica que se rechace un segundo reporte de la misma categoría a menos de 50 metros (retorna 409)."""
        lat = 19.45 + random.uniform(-0.05, 0.05)
        lng = -99.15 + random.uniform(-0.05, 0.05)
        
        payload_1 = {
            "categoria": "zona_oscura",
            "lat": lat,
            "lng": lng,
            "descripcion": "Primera iluminación fallida",
            "severidad": "media"
        }
        
        # Primer reporte: Exitoso
        status_1, data_1 = self._http_request("/api/reportes", method="POST", data=payload_1)
        self.assertEqual(status_1, 201)
        
        # Segundo reporte: Misma ubicación y categoría -> Conflicto (409)
        payload_2 = {
            "categoria": "zona_oscura",
            "lat": lat,
            "lng": lng,
            "descripcion": "Segunda queja de luz",
            "severidad": "media"
        }
        status_2, data_2 = self._http_request("/api/reportes", method="POST", data=payload_2)
        self.assertEqual(status_2, 409)
        self.assertIn("detail", data_2)

        # Tercer reporte: Misma ubicación pero CATEGORIA DIFERENTE -> Exitoso (201)
        payload_3 = {
            "categoria": "sospechoso",
            "lat": lat,
            "lng": lng,
            "descripcion": "Persona merodeando cerca del poste sin luz",
            "severidad": "media"
        }
        status_3, data_3 = self._http_request("/api/reportes", method="POST", data=payload_3)
        self.assertEqual(status_3, 201)

    def test_05_listar_reportes_bbox_y_limite(self):
        """Verifica la consulta de reportes por bounding box y el límite máximo de tamaño de bbox."""
        # 1. Bbox válido
        lat = 19.48 + random.uniform(-0.01, 0.01)
        lng = -99.18 + random.uniform(-0.01, 0.01)
        
        # Crear un reporte dentro del rango
        payload = {"categoria": "sospechoso", "lat": lat, "lng": lng, "descripcion": "Bbox test"}
        self._http_request("/api/reportes", method="POST", data=payload)
        
        # Consultar bbox estrecho que contiene el punto
        params = urllib.parse.urlencode({
            "min_lat": lat - 0.005,
            "min_lng": lng - 0.005,
            "max_lat": lat + 0.005,
            "max_lng": lng + 0.005
        })
        status, reportes = self._http_request(f"/api/reportes?{params}")
        self.assertEqual(status, 200)
        self.assertIsInstance(reportes, list)
        self.assertTrue(len(reportes) >= 1)
        
        # Verificar que el reporte retornado tenga las llaves públicas
        reporte_encontrado = None
        for r in reportes:
            if r["descripcion"] == "Bbox test":
                reporte_encontrado = r
                break
        self.assertIsNotNone(reporte_encontrado)
        self.assertIn("id", reporte_encontrado)
        self.assertIn("categoria", reporte_encontrado)
        self.assertIn("lat", reporte_encontrado)
        self.assertIn("lng", reporte_encontrado)
        self.assertIn("creado_en", reporte_encontrado)
        self.assertIn("expira_en", reporte_encontrado)

        # 2. Bbox demasiado grande (> 0.5 grados de lado) -> Debe retornar 400
        large_params = urllib.parse.urlencode({
            "min_lat": 19.0,
            "min_lng": -99.5,
            "max_lat": 19.6, # 0.6 grados > 0.5
            "max_lng": -99.0
        })
        status_large, err_data = self._http_request(f"/api/reportes?{large_params}")
        self.assertEqual(status_large, 400)
        self.assertIn("detail", err_data)

    def test_06_ofuscacion_coordenadas(self):
        """Verifica que las coordenadas devueltas estén ofuscadas (snap a grilla ~100m)."""
        # Usar coordenadas exactas no alineadas con múltiplos perfectos y randomizadas
        lat_exacta = 19.43 + random.uniform(-0.1, 0.1)
        lng_exacta = -99.13 + random.uniform(-0.1, 0.1)
        
        payload = {
            "categoria": "robo",
            "lat": lat_exacta,
            "lng": lng_exacta,
            "descripcion": "Prueba de ofuscacion espacial"
        }
        status_post, _ = self._http_request("/api/reportes", method="POST", data=payload)
        self.assertEqual(status_post, 201)
        
        # Consultar bbox
        params = urllib.parse.urlencode({
            "min_lat": lat_exacta - 0.01,
            "min_lng": lng_exacta - 0.01,
            "max_lat": lat_exacta + 0.01,
            "max_lng": lng_exacta + 0.01
        })
        status, reportes = self._http_request(f"/api/reportes?{params}")
        self.assertEqual(status, 200)
        
        # Encontrar nuestro reporte
        reporte = next((r for r in reportes if r["descripcion"] == "Prueba de ofuscacion espacial"), None)
        self.assertIsNotNone(reporte)
        
        # Verificar que la coordenada reportada no sea exactamente la que mandamos
        # y que cumpla con la grilla calculada
        self.assertNotEqual(reporte["lat"], lat_exacta)
        self.assertNotEqual(reporte["lng"], lng_exacta)
        
        # Calcular grilla esperada
        deg_per_m_lat = 1 / 111320
        step_lat = 100 * deg_per_m_lat
        expected_lat = round(lat_exacta / step_lat) * step_lat
        
        deg_per_m_lng = 1 / (111320 * math.cos(math.radians(lng_exacta)))
        step_lng = 100 * deg_per_m_lng
        expected_lng = round(lng_exacta / step_lng) * step_lng
        
        # Tolerancia muy pequeña por redondeo de flotantes en Python/Postgres
        self.assertAlmostEqual(reporte["lat"], expected_lat, places=5)
        self.assertAlmostEqual(reporte["lng"], expected_lng, places=5)

    def test_07_redondeo_timestamps(self):
        """Verifica que el timestamp creado_en esté redondeado a intervalos de 5 minutos."""
        lat = 19.39 + random.uniform(-0.01, 0.01)
        lng = -99.09 + random.uniform(-0.01, 0.01)
        
        payload = {
            "categoria": "zona_oscura",
            "lat": lat,
            "lng": lng,
            "descripcion": "Prueba de redondeo temporal"
        }
        self._http_request("/api/reportes", method="POST", data=payload)
        
        # Consultar
        params = urllib.parse.urlencode({
            "min_lat": lat - 0.01,
            "min_lng": lng - 0.01,
            "max_lat": lat + 0.01,
            "max_lng": lng + 0.01
        })
        _, reportes = self._http_request(f"/api/reportes?{params}")
        reporte = next((r for r in reportes if r["descripcion"] == "Prueba de redondeo temporal"), None)
        self.assertIsNotNone(reporte)
        
        # El creado_en viene en ISO format
        # P.ej. "2026-06-02T03:00:00+00:00" o similar
        creado_en_str = reporte["creado_en"]
        
        # Parsear con datetime
        # En Python 3.7+ fromisoformat soporta offset Z
        if creado_en_str.endswith("Z"):
            creado_en_str = creado_en_str[:-1] + "+00:00"
        dt = datetime.fromisoformat(creado_en_str)
        
        # El minuto del redondeo debe ser múltiplo de 5 y los segundos deben ser 0
        self.assertEqual(dt.second, 0)
        self.assertEqual(dt.microsecond, 0)
        self.assertEqual(dt.minute % 5, 0)

if __name__ == "__main__":
    unittest.main()
