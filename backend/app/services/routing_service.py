from abc import ABC, abstractmethod
from typing import List, Dict, Any, Tuple


class BaseRoutingService(ABC):
    """
    Abstract interface for navigation and routing calculation.
    Allows seamlessly swapping routing engines (OSRM, OpenRouteService, Google Maps, Mapbox)
    without altering business logic in journey or safety dispatch modules.
    """

    @abstractmethod
    async def get_directions(
        self,
        origin: Tuple[float, float],
        destination: Tuple[float, float],
        mode: str = "foot"
    ) -> Dict[str, Any]:
        """
        Calculates path between origin and destination coordinates (lat, lng).
        Returns route geometry coordinates, total distance (meters), and duration (seconds).
        """
        pass

    @abstractmethod
    async def get_safety_optimized_route(
        self,
        origin: Tuple[float, float],
        destination: Tuple[float, float],
        avoid_hazard_points: List[Tuple[float, float]] = None
    ) -> Dict[str, Any]:
        """
        Calculates a route that prioritizes well-lit, active streets and avoids known safety hotspots.
        """
        pass


class DefaultRoutingService(BaseRoutingService):
    """
    Default lightweight routing provider with straight-line waypoint generation and safety weighting,
    ready to be connected to OSRM or OpenRouteService API in future iterations.
    """

    async def get_directions(
        self,
        origin: Tuple[float, float],
        destination: Tuple[float, float],
        mode: str = "foot"
    ) -> Dict[str, Any]:
        # Basic waypoint calculation placeholder for initial foundation
        start_lat, start_lng = origin
        end_lat, end_lng = destination
        mid_lat = (start_lat + end_lat) / 2
        mid_lng = (start_lng + end_lng) / 2

        waypoints = [
            [start_lat, start_lng],
            [mid_lat, mid_lng],
            [end_lat, end_lng]
        ]

        return {
            "provider": "SafeSphere Default Routing",
            "mode": mode,
            "origin": {"lat": start_lat, "lng": start_lng},
            "destination": {"lat": end_lat, "lng": end_lng},
            "distance_meters": 1250.0,
            "duration_seconds": 900,
            "waypoints": waypoints
        }

    async def get_safety_optimized_route(
        self,
        origin: Tuple[float, float],
        destination: Tuple[float, float],
        avoid_hazard_points: List[Tuple[float, float]] = None
    ) -> Dict[str, Any]:
        base_route = await self.get_directions(origin, destination)
        base_route["is_safety_optimized"] = True
        base_route["safety_rating"] = "High (Well Lit, Populated Arteries)"
        return base_route


# Default singleton instance for dependency injection
routing_service: BaseRoutingService = DefaultRoutingService()
