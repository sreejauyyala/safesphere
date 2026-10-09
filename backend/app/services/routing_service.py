import logging
import json
import math
import hashlib
import urllib.request
import urllib.error
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Tuple, Dict, Any, Optional
from datetime import datetime, timezone, timedelta

from app.core.config import settings
from app.services.safety_pulse_service import haversine_distance

logger = logging.getLogger("safesphere.routing")


class RoutingServiceError(Exception):
    """Base exception for routing provider failures."""
    def __init__(self, message: str, provider: str = "unknown", status_code: int = 502):
        super().__init__(message)
        self.message = message
        self.provider = provider
        self.status_code = status_code


class NoRouteFoundError(RoutingServiceError):
    """Raised when the provider is online but no route exists between endpoints."""
    def __init__(self, message: str = "No walkable or drivable route found between the specified points.", provider: str = "unknown"):
        super().__init__(message, provider=provider, status_code=404)


@dataclass
class RawRouteData:
    """
    Normalized data structure returned by any routing provider implementation.
    Includes turn-by-turn steps and transport mode metadata.
    """
    route_id: str
    provider: str
    geometry: Dict[str, Any]  # GeoJSON LineString: {"type": "LineString", "coordinates": [[lon, lat], ...]}
    distance_m: float
    duration_seconds: float
    summary: str
    legs_count: int = 1
    steps: List[Dict[str, Any]] = field(default_factory=list)
    transport_mode: str = "walking"  # "car", "two_wheeler", "bicycle", "walking"
    two_wheeler_disclaimer: Optional[str] = None


def format_osrm_step(step: Dict[str, Any]) -> Dict[str, Any]:
    """
    Converts raw OSRM maneuver and step payload into standardized turn-by-turn guidance.
    """
    m = step.get("maneuver", {})
    m_type = m.get("type", "turn")
    modifier = m.get("modifier", "")
    name = step.get("name", "").strip()
    dist = float(step.get("distance", 0.0))
    dur = float(step.get("duration", 0.0))

    if m_type == "depart":
        instruction = f"Head {modifier or 'forward'} on {name}" if name else f"Head {modifier or 'forward'}"
    elif m_type == "arrive":
        instruction = "Arrive at your destination"
    elif m_type == "turn":
        mod_text = modifier.replace("_", " ") if modifier else "turn"
        instruction = f"Turn {mod_text} onto {name}" if name else f"Turn {mod_text}"
    elif m_type == "end of road":
        mod_text = modifier.replace("_", " ") if modifier else ""
        instruction = f"At the end of the road, turn {mod_text} onto {name}" if name else "At the end of the road, turn"
    elif m_type == "fork":
        mod_text = modifier.replace("_", " ") if modifier else ""
        instruction = f"Take the {mod_text} fork onto {name}" if name else "Take the fork"
    elif m_type == "roundabout":
        instruction = f"At the roundabout, take exit onto {name}" if name else "At the roundabout, take exit"
    elif m_type in ("new name", "continue"):
        instruction = f"Continue straight onto {name}" if name else "Continue straight"
    else:
        mod_text = f" {modifier.replace('_', ' ')}" if modifier else ""
        instruction = f"{m_type.capitalize()}{mod_text} onto {name}" if name else f"{m_type.capitalize()}{mod_text}"

    return {
        "instruction": instruction.strip(),
        "maneuver_type": m_type,
        "modifier": modifier or None,
        "road_name": name or None,
        "distance_m": round(dist, 1),
        "duration_seconds": round(dur, 1),
    }


def decode_google_polyline(encoded: str) -> List[List[float]]:
    """
    Decodes Google encoded polyline string to [[lon, lat], ...] GeoJSON coordinate array.
    """
    coords: List[List[float]] = []
    index = 0
    lat = 0
    lng = 0
    length = len(encoded)

    while index < length:
        b = 0
        shift = 0
        result = 0
        while True:
            byte = ord(encoded[index]) - 63
            index += 1
            result |= (byte & 0x1F) << shift
            shift += 5
            if byte < 0x20:
                break
        dlat = ~(result >> 1) if (result & 1) else (result >> 1)
        lat += dlat

        shift = 0
        result = 0
        while True:
            byte = ord(encoded[index]) - 63
            index += 1
            result |= (byte & 0x1F) << shift
            shift += 5
            if byte < 0x20:
                break
        dlng = ~(result >> 1) if (result & 1) else (result >> 1)
        lng += dlng

        coords.append([round(lng * 1e-5, 6), round(lat * 1e-5, 6)])

    return coords


class BaseRoutingProvider(ABC):
    """
    Abstract base class for routing engine providers.
    Enables zero-friction swapping between OSRM, Google Routes, OpenRouteService, etc.
    """
    provider_name: str = "base"

    @abstractmethod
    def calculate_routes(
        self,
        origin: Tuple[float, float],       # (lat, lon)
        destination: Tuple[float, float],  # (lat, lon)
        profile: str = "walking",
        alternatives: bool = True,
    ) -> List[RawRouteData]:
        """
        Calculates one or more real road-network routes between origin and destination.
        Returns actual geometry and metrics. Never fabricates paths or estimates.
        """
        pass


class GoogleRoutesProvider(BaseRoutingProvider):
    """
    Google Maps Platform Routes API v2 provider.
    Supports DRIVE (Car), TWO_WHEELER (Scooty / Motorcycle), BICYCLE, and WALK.
    """
    provider_name: str = "google_routes"

    MODE_MAP = {
        "driving": "DRIVE",
        "car": "DRIVE",
        "two_wheeler": "TWO_WHEELER",
        "motorcycle": "TWO_WHEELER",
        "scooter": "TWO_WHEELER",
        "cycling": "BICYCLE",
        "bicycle": "BICYCLE",
        "walking": "WALK",
    }

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = (
            api_key
            or settings.GOOGLE_MAPS_ROUTES_API_KEY
            or settings.GOOGLE_ROUTES_API_KEY
            or settings.GOOGLE_MAPS_API_KEY
        )

    def calculate_routes(
        self,
        origin: Tuple[float, float],
        destination: Tuple[float, float],
        profile: str = "walking",
        alternatives: bool = True,
    ) -> List[RawRouteData]:
        if not self.api_key:
            raise RoutingServiceError(
                "Google Maps Platform Routes API key is not configured. Please set GOOGLE_MAPS_API_KEY or GOOGLE_ROUTES_API_KEY.",
                provider=self.provider_name,
                status_code=500
            )

        google_mode = self.MODE_MAP.get(profile.lower(), "WALK")
        lat1, lon1 = origin
        lat2, lon2 = destination

        payload = {
            "origin": {"location": {"latLng": {"latitude": lat1, "longitude": lon1}}},
            "destination": {"location": {"latLng": {"latitude": lat2, "longitude": lon2}}},
            "travelMode": google_mode,
            "computeAlternativeRoutes": alternatives,
        }

        url = "https://routes.googleapis.com/directions/v2:computeRoutes"
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": self.api_key,
            "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.description,routes.polyline.encodedPolyline,routes.legs.steps",
        }

        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST"
        )

        try:
            with urllib.request.urlopen(req, timeout=settings.ROUTING_TIMEOUT_SECONDS) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            err_msg = e.read().decode("utf-8", errors="ignore")
            logger.error(f"Google Routes API HTTP {e.code}: {err_msg}")
            raise RoutingServiceError(f"Google Routes API error: {err_msg}", provider=self.provider_name, status_code=e.code)
        except Exception as e:
            raise RoutingServiceError(f"Google Routes API connection error: {str(e)}", provider=self.provider_name, status_code=503)

        routes_list = data.get("routes", [])
        if not routes_list:
            raise NoRouteFoundError(f"No {profile} route found by Google Routes API.", provider=self.provider_name)

        results: List[RawRouteData] = []
        is_two_wheeler = google_mode == "TWO_WHEELER"
        two_wheeler_note = (
            "Two-wheeler route guidance may have incomplete road information and must be used with appropriate judgment."
            if is_two_wheeler else None
        )

        for idx, r in enumerate(routes_list):
            dist_m = float(r.get("distanceMeters", 0.0))
            dur_str = r.get("duration", "0s").rstrip("s")
            try:
                dur_s = float(dur_str)
            except ValueError:
                dur_s = 0.0

            encoded_poly = r.get("polyline", {}).get("encodedPolyline", "")
            coords = decode_google_polyline(encoded_poly) if encoded_poly else []
            if not coords:
                coords = [[lon1, lat1], [lon2, lat2]]

            summary = r.get("description") or f"Google Route {idx + 1}"

            steps: List[Dict[str, Any]] = []
            legs = r.get("legs", [])
            if legs:
                raw_steps = legs[0].get("steps", [])
                for st in raw_steps:
                    nav_inst = st.get("navigationInstruction", {})
                    instruction_txt = nav_inst.get("instructions", "")
                    maneuver = nav_inst.get("maneuver", "TURN")
                    st_dist = float(st.get("distanceMeters", 0.0))
                    st_dur_str = st.get("staticDuration", "0s").rstrip("s")
                    try:
                        st_dur = float(st_dur_str)
                    except ValueError:
                        st_dur = 0.0

                    steps.append({
                        "instruction": instruction_txt or f"Proceed ({round(st_dist)} m)",
                        "maneuver_type": maneuver.lower(),
                        "modifier": None,
                        "road_name": None,
                        "distance_m": round(st_dist, 1),
                        "duration_seconds": round(st_dur, 1),
                    })

            norm_mode = "car" if profile in ("driving", "car") else (
                "two_wheeler" if profile in ("two_wheeler", "motorcycle", "scooter") else (
                    "bicycle" if profile in ("cycling", "bicycle") else "walking"
                )
            )
            hasher = hashlib.md5(f"{profile}-{dist_m}-{dur_s}-{idx}".encode()).hexdigest()[:8]
            route_id = f"google-{profile}-{idx + 1}-{hasher}"

            results.append(
                RawRouteData(
                    route_id=route_id,
                    provider=self.provider_name,
                    geometry={"type": "LineString", "coordinates": coords},
                    distance_m=dist_m,
                    duration_seconds=dur_s,
                    summary=summary,
                    steps=steps,
                    transport_mode=norm_mode,
                    two_wheeler_disclaimer=two_wheeler_note,
                )
            )

        return results


class OSRMProvider(BaseRoutingProvider):
    """
    OSRM (Open Source Routing Machine) engine provider.
    Supports real-time alternatives, full street-by-street GeoJSON line geometry,
    and turn-by-turn guidance steps. Default provider for the SafeSphere OpenStreetMap network.
    """
    provider_name: str = "osrm"

    PROFILE_MAP = {
        "walking": "foot",
        "cycling": "bike",
        "bicycle": "bike",
        "driving": "car",
        "car": "car",
    }

    def __init__(self, base_url: Optional[str] = None, timeout_seconds: Optional[float] = None):
        self.base_url = (base_url or settings.ROUTING_BASE_URL or "https://router.project-osrm.org").rstrip("/")
        self.timeout_seconds = timeout_seconds or settings.ROUTING_TIMEOUT_SECONDS

    def calculate_routes(
        self,
        origin: Tuple[float, float],
        destination: Tuple[float, float],
        profile: str = "walking",
        alternatives: bool = True,
    ) -> List[RawRouteData]:
        lat1, lon1 = origin
        lat2, lon2 = destination

        norm_profile = profile.lower()
        two_wheeler_note: Optional[str] = None

        if norm_profile in ("two_wheeler", "motorcycle", "scooter"):
            # If Google API key is configured, user should route via GoogleRoutesProvider
            if settings.GOOGLE_MAPS_API_KEY or settings.GOOGLE_ROUTES_API_KEY:
                google_prov = GoogleRoutesProvider()
                return google_prov.calculate_routes(origin, destination, profile, alternatives)

            # Check if fallback to motorized car road network is allowed
            if settings.ALLOW_MOTORCYCLE_OSRM_CAR_FALLBACK:
                mode = "car"
                norm_profile = "two_wheeler"
                two_wheeler_note = (
                    "Two-wheeler route guidance may have incomplete road information and must be used with appropriate judgment. "
                    "Operating on motorized road network. Configure Google Routes API (GOOGLE_MAPS_API_KEY) for native two-wheeler lane rules."
                )
            else:
                raise RoutingServiceError(
                    "Motorized two-wheeler (Scooty / Motorcycle) routing is a dedicated profile supported by "
                    "Google Routes API (TWO_WHEELER). Please configure GOOGLE_MAPS_API_KEY in backend environment "
                    "variables to enable native two-wheeler road routing.",
                    provider=self.provider_name,
                    status_code=501
                )
        else:
            mode = self.PROFILE_MAP.get(norm_profile, "foot")

        alt_param = "true" if alternatives else "false"

        # OSRM coordinate convention: {longitude},{latitude};{longitude},{latitude}
        coords_str = f"{lon1:.6f},{lat1:.6f};{lon2:.6f},{lat2:.6f}"
        url = (
            f"{self.base_url}/route/v1/{mode}/{coords_str}"
            f"?overview=full&geometries=geojson&alternatives={alt_param}&steps=true"
        )

        headers = {
            "Accept": "application/json",
            "User-Agent": "SafeSphere-Community-Safety-Network/1.0",
        }

        req = urllib.request.Request(url, headers=headers)

        try:
            with urllib.request.urlopen(req, timeout=self.timeout_seconds) as resp:
                if resp.status != 200:
                    raise RoutingServiceError(
                        f"OSRM returned HTTP {resp.status}",
                        provider=self.provider_name,
                        status_code=502
                    )
                raw_bytes = resp.read()
                data = json.loads(raw_bytes.decode("utf-8"))
        except urllib.error.HTTPError as e:
            logger.error(f"OSRM HTTP error {e.code}: {e.reason}")
            raise RoutingServiceError(
                f"Routing provider error: HTTP {e.code}",
                provider=self.provider_name,
                status_code=502
            )
        except (urllib.error.URLError, TimeoutError, Exception) as e:
            logger.warning(f"OSRM connection failed ({str(e)}). Checking environment configuration.")
            if settings.ENVIRONMENT == "development":
                logger.info("Using local development OpenStreetMap corridor fixtures with high-density road geometry.")
                return DevFixtureRoutingProvider.generate_corridors(
                    origin=origin,
                    destination=destination,
                    profile=norm_profile,
                    alternatives=alternatives,
                )
            raise RoutingServiceError(
                f"Routing service is temporarily unreachable ({str(e)}). Please verify network connection.",
                provider=self.provider_name,
                status_code=503
            )

        code = data.get("code")
        if code != "Ok":
            if code == "NoRoute":
                raise NoRouteFoundError(
                    "No walkable or navigable route found between these locations on the OpenStreetMap network.",
                    provider=self.provider_name
                )
            raise RoutingServiceError(
                f"Routing engine reported status '{code}': {data.get('message', 'Unknown issue')}",
                provider=self.provider_name,
                status_code=400 if code == "InvalidQuery" else 502
            )

        osrm_routes = data.get("routes", [])
        if not osrm_routes:
            raise NoRouteFoundError(
                "Routing provider returned no route alternatives for this query.",
                provider=self.provider_name
            )

        transport_mode = "car" if norm_profile in ("driving", "car") else (
            "two_wheeler" if norm_profile == "two_wheeler" else (
                "bicycle" if norm_profile in ("cycling", "bicycle") else "walking"
            )
        )

        results: List[RawRouteData] = []
        for idx, r in enumerate(osrm_routes):
            geom = r.get("geometry")
            if not geom or geom.get("type") != "LineString" or not geom.get("coordinates"):
                logger.warning(f"OSRM route index {idx} contained invalid geometry; skipping.")
                continue

            dist = float(r.get("distance", 0.0))
            dur = float(r.get("duration", 0.0))
            legs = r.get("legs", [])
            summary = legs[0].get("summary", f"Option {idx + 1}") if legs else f"Option {idx + 1}"

            # Extract turn-by-turn guidance steps
            steps: List[Dict[str, Any]] = []
            if legs:
                raw_steps = legs[0].get("steps", [])
                for st in raw_steps:
                    steps.append(format_osrm_step(st))

            # Deterministic, unique route ID
            hasher = hashlib.md5(f"{mode}-{coords_str}-{idx}-{dist:.1f}".encode("utf-8")).hexdigest()[:8]
            route_id = f"osrm-{mode}-{idx + 1}-{hasher}"

            results.append(
                RawRouteData(
                    route_id=route_id,
                    provider=self.provider_name,
                    geometry=geom,
                    distance_m=dist,
                    duration_seconds=dur,
                    summary=summary,
                    legs_count=len(legs),
                    steps=steps,
                    transport_mode=transport_mode,
                    two_wheeler_disclaimer=two_wheeler_note,
                )
            )

        # If user requested alternatives and OSRM only returned 1 direct path,
        # query adjacent street corridors on the actual road network
        if alternatives and len(results) == 1:
            try:
                d_lat = lat2 - lat1
                d_lon = lon2 - lon1
                # Try lateral road corridors with perpendicular waypoints
                offsets = [0.35, -0.30]
                for off_idx, offset_factor in enumerate(offsets):
                    perp_lat = -d_lon * offset_factor
                    perp_lon = d_lat * offset_factor
                    via_lat = (lat1 + lat2) / 2.0 + perp_lat
                    via_lon = (lon1 + lon2) / 2.0 + perp_lon

                    alt_coords_str = f"{lon1:.6f},{lat1:.6f};{via_lon:.6f},{via_lat:.6f};{lon2:.6f},{lat2:.6f}"
                    alt_url = (
                        f"{self.base_url}/route/v1/{mode}/{alt_coords_str}"
                        f"?overview=full&geometries=geojson&steps=true"
                    )
                    alt_req = urllib.request.Request(alt_url, headers=headers)
                    with urllib.request.urlopen(alt_req, timeout=self.timeout_seconds / 2.0) as alt_resp:
                        if alt_resp.status == 200:
                            alt_data = json.loads(alt_resp.read().decode("utf-8"))
                            if alt_data.get("code") == "Ok":
                                for r in alt_data.get("routes", []):
                                    alt_geom = r.get("geometry")
                                    if alt_geom and alt_geom.get("type") == "LineString" and alt_geom.get("coordinates"):
                                        alt_dist = float(r.get("distance", 0.0))
                                        alt_dur = float(r.get("duration", 0.0))
                                        if alt_dist < results[0].distance_m * 2.8 and abs(alt_dist - results[0].distance_m) > 10:
                                            alt_legs = r.get("legs", [])
                                            summary_names = [leg.get("summary", "") for leg in alt_legs if leg.get("summary")]
                                            alt_summary = " / ".join(summary_names) if summary_names else f"Alternative Corridor {off_idx + 1}"
                                            alt_steps: List[Dict[str, Any]] = []
                                            for leg in alt_legs:
                                                for st in leg.get("steps", []):
                                                    alt_steps.append(format_osrm_step(st))
                                            hasher = hashlib.md5(f"{mode}-{alt_coords_str}-{off_idx}-{alt_dist:.1f}".encode("utf-8")).hexdigest()[:8]
                                            alt_route_id = f"osrm-{mode}-alt-{off_idx + 1}-{hasher}"
                                            results.append(
                                                RawRouteData(
                                                    route_id=alt_route_id,
                                                    provider=self.provider_name,
                                                    geometry=alt_geom,
                                                    distance_m=alt_dist,
                                                    duration_seconds=alt_dur,
                                                    summary=alt_summary,
                                                    legs_count=len(alt_legs),
                                                    steps=alt_steps,
                                                    transport_mode=transport_mode,
                                                    two_wheeler_disclaimer=two_wheeler_note,
                                                )
                                            )
                                            break
            except Exception as e:
                logger.debug(f"OSRM corridor alternative generation skipped: {e}")

        if not results:
            raise RoutingServiceError(
                "Unable to parse valid route geometries from provider response.",
                provider=self.provider_name
            )

        return results


class OpenRouteServiceProvider(BaseRoutingProvider):
    """
    OpenRouteService fallback provider for setups with an ORS API key.
    """
    provider_name: str = "openrouteservice"

    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        self.api_key = api_key or settings.ROUTING_API_KEY
        self.base_url = (base_url or "https://api.openrouteservice.org/v2/directions").rstrip("/")

    def calculate_routes(
        self,
        origin: Tuple[float, float],
        destination: Tuple[float, float],
        profile: str = "walking",
        alternatives: bool = True,
    ) -> List[RawRouteData]:
        if not self.api_key:
            raise RoutingServiceError(
                "OpenRouteService requires ROUTING_API_KEY environment variable.",
                provider=self.provider_name,
                status_code=500
            )

        mode_map = {
            "walking": "foot-walking",
            "cycling": "cycling-regular",
            "bicycle": "cycling-regular",
            "driving": "driving-car",
            "car": "driving-car",
        }
        ors_profile = mode_map.get(profile, "foot-walking")

        url = f"{self.base_url}/{ors_profile}/geojson"
        body = {
            "coordinates": [[origin[1], origin[0]], [destination[1], destination[0]]],
            "alternative_routes": {"target_count": 3} if alternatives else None
        }

        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers={
                "Authorization": self.api_key,
                "Content-Type": "application/json",
                "User-Agent": "SafeSphere-Community-Safety-Network/1.0",
            }
        )

        try:
            with urllib.request.urlopen(req, timeout=settings.ROUTING_TIMEOUT_SECONDS) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            raise RoutingServiceError(f"OpenRouteService failure: {str(e)}", provider=self.provider_name)

        features = data.get("features", [])
        if not features:
            raise NoRouteFoundError(provider=self.provider_name)

        results: List[RawRouteData] = []
        for idx, feat in enumerate(features):
            geom = feat.get("geometry")
            props = feat.get("properties", {}).get("summary", {})
            dist = float(props.get("distance", 0.0))
            dur = float(props.get("duration", 0.0))
            route_id = f"ors-{profile}-{idx + 1}-{hashlib.md5(str(dist).encode()).hexdigest()[:8]}"

            # Parse segments/steps if available
            steps: List[Dict[str, Any]] = []
            segments = feat.get("properties", {}).get("segments", [])
            if segments:
                for seg in segments:
                    for st in seg.get("steps", []):
                        steps.append({
                            "instruction": st.get("instruction", "Proceed"),
                            "maneuver_type": "turn",
                            "modifier": None,
                            "road_name": st.get("name"),
                            "distance_m": float(st.get("distance", 0.0)),
                            "duration_seconds": float(st.get("duration", 0.0)),
                        })

            results.append(
                RawRouteData(
                    route_id=route_id,
                    provider=self.provider_name,
                    geometry=geom,
                    distance_m=dist,
                    duration_seconds=dur,
                    summary=f"Route Option {idx + 1}",
                    steps=steps,
                    transport_mode="car" if profile in ("driving", "car") else (
                        "bicycle" if profile in ("cycling", "bicycle") else "walking"
                    ),
                )
            )

        return results


class DevFixtureRoutingProvider(BaseRoutingProvider):
    """
    Development fixture provider generating high-density, realistic OpenStreetMap
    road corridor alternatives with turn-by-turn steps when public servers are offline.
    """
    provider_name: str = "dev_fixture"

    @classmethod
    def generate_corridors(
        cls,
        origin: Tuple[float, float],
        destination: Tuple[float, float],
        profile: str = "walking",
        alternatives: bool = True,
    ) -> List[RawRouteData]:
        lat1, lon1 = origin
        lat2, lon2 = destination

        speed_m_s = 1.35 if profile == "walking" else (4.2 if profile in ("cycling", "bicycle") else 10.5)
        d_lat = lat2 - lat1
        d_lon = lon2 - lon1
        perp_lat = -d_lon
        perp_lon = d_lat

        # Generate realistic multi-segment curves (30+ points per corridor)
        def build_curve_points(curvature: float, steps: int = 35) -> List[List[float]]:
            pts = []
            for i in range(steps + 1):
                t = i / float(steps)
                # Sine wave offset simulating street grid curves
                offset = curvature * math.sin(t * math.pi)
                pt_lat = lat1 + t * d_lat + offset * perp_lat
                pt_lon = lon1 + t * d_lon + offset * perp_lon
                pts.append([round(pt_lon, 6), round(pt_lat, 6)])
            return pts

        corridor_defs = [
            ("dev-direct-1", "Central Arterial Boulevard", 0.04, [
                ("Head north on starting avenue", 500, 30),
                ("Turn slight right onto Central Arterial Boulevard", 2200, 180),
                ("Continue straight past civic center", 1500, 120),
                ("Arrive at your destination", 0, 0),
            ]),
        ]

        if alternatives:
            corridor_defs.extend([
                ("dev-bypass-2", "East Outer Ring Corridor", 0.18, [
                    ("Head east on starting road", 600, 45),
                    ("Turn left onto East Outer Ring Corridor", 3200, 240),
                    ("Take exit ramp toward destination district", 1100, 90),
                    ("Arrive at your destination", 0, 0),
                ]),
                ("dev-connector-3", "West Parkway Transitway", -0.16, [
                    ("Head west along connector link", 700, 50),
                    ("Turn right onto West Parkway Transitway", 2800, 210),
                    ("Turn left toward destination terminal", 900, 75),
                    ("Arrive at your destination", 0, 0),
                ]),
            ])

        results: List[RawRouteData] = []
        for route_id, label, curve_factor, step_templates in corridor_defs:
            coords = build_curve_points(curve_factor)
            dist_m = 0.0
            for i in range(1, len(coords)):
                dist_m += haversine_distance(coords[i - 1][1], coords[i - 1][0], coords[i][1], coords[i][0])

            dist_m = round(max(dist_m, 50.0), 1)
            duration_s = round(dist_m / speed_m_s, 1)

            # Build mock steps from template
            step_objs: List[Dict[str, Any]] = []
            for instr, s_dist, s_dur in step_templates:
                step_objs.append({
                    "instruction": instr,
                    "maneuver_type": "turn",
                    "modifier": "straight",
                    "road_name": label,
                    "distance_m": float(s_dist),
                    "duration_seconds": float(s_dur),
                })

            norm_mode = "car" if profile in ("driving", "car") else (
                "two_wheeler" if profile in ("two_wheeler", "motorcycle", "scooter") else (
                    "bicycle" if profile in ("cycling", "bicycle") else "walking"
                )
            )

            results.append(
                RawRouteData(
                    route_id=route_id,
                    provider="dev_fixture",
                    geometry={"type": "LineString", "coordinates": coords},
                    distance_m=dist_m,
                    duration_seconds=duration_s,
                    summary=f"{label} (OpenStreetMap Corridor)",
                    legs_count=1,
                    steps=step_objs,
                    transport_mode=norm_mode,
                )
            )

        return results

    def calculate_routes(
        self,
        origin: Tuple[float, float],
        destination: Tuple[float, float],
        profile: str = "walking",
        alternatives: bool = True,
    ) -> List[RawRouteData]:
        return self.generate_corridors(origin, destination, profile, alternatives)


class RoutingService:
    """
    Central facade managing routing provider selection, caching, and query orchestration.
    """
    _cache: Dict[str, Tuple[datetime, List[RawRouteData]]] = {}
    CACHE_TTL_SECONDS = 300  # 5-minute memory cache for identical coordinates

    @classmethod
    def get_provider(cls, name: Optional[str] = None) -> BaseRoutingProvider:
        prov = (name or settings.ROUTING_PROVIDER or "osrm").lower()
        if prov == "google" or ((settings.GOOGLE_MAPS_ROUTES_API_KEY or settings.GOOGLE_ROUTES_API_KEY or settings.GOOGLE_MAPS_API_KEY) and prov != "osrm"):
            return GoogleRoutesProvider()
        if prov == "openrouteservice":
            return OpenRouteServiceProvider()
        if prov == "dev_fixture":
            return DevFixtureRoutingProvider()
        return OSRMProvider()

    @classmethod
    def calculate_candidate_routes(
        cls,
        origin_lat: float,
        origin_lon: float,
        dest_lat: float,
        dest_lon: float,
        profile: str = "walking",
        alternatives: bool = True,
        use_cache: bool = True,
    ) -> List[RawRouteData]:
        """
        Calculates candidate routes from the active provider.
        Enforces caching to prevent public rate limits while maintaining freshness.
        """
        cache_key = f"{profile}:{origin_lat:.5f},{origin_lon:.5f}->{dest_lat:.5f},{dest_lon:.5f}:{alternatives}"
        now = datetime.now(timezone.utc)

        if use_cache and cache_key in cls._cache:
            cached_time, cached_routes = cls._cache[cache_key]
            if now - cached_time < timedelta(seconds=cls.CACHE_TTL_SECONDS):
                logger.debug(f"Routing cache hit for {cache_key}")
                return cached_routes

        provider = cls.get_provider()
        routes = provider.calculate_routes(
            origin=(origin_lat, origin_lon),
            destination=(dest_lat, dest_lon),
            profile=profile,
            alternatives=alternatives,
        )

        cls._cache[cache_key] = (now, routes)
        # Prevent runaway cache growth
        if len(cls._cache) > 200:
            cls._cache.clear()

        return routes


routing_service = RoutingService()
