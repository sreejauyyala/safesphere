import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

# pyrefly: ignore [missing-import]
from app.core.database import get_db
# pyrefly: ignore [missing-import]
from app.core.config import settings
# pyrefly: ignore [missing-import]
from app.services.routing_service import routing_service, RoutingServiceError, NoRouteFoundError
# pyrefly: ignore [missing-import]
from app.services.route_safety_service import route_safety_service
# pyrefly: ignore [missing-import]
from app.schemas.route import (
    RouteAlternativesRequest,
    RouteAlternativesResponse,
    RouteAlternativeItem,
    RouteSafetyAssessRequest,
    TurnByTurnStep,
)

logger = logging.getLogger("safesphere.routes_api")
router = APIRouter()


@router.post("/alternatives", response_model=RouteAlternativesResponse, status_code=status.HTTP_200_OK)
def get_route_alternatives(
    payload: RouteAlternativesRequest,
    db: Session = Depends(get_db),
):
    """
    Calculates real road-network candidate routes between origin and destination,
    assesses Safety Pulse conditions along each corridor, and ranks alternatives.
    """
    try:
        raw_routes = routing_service.calculate_candidate_routes(
            origin_lat=payload.origin.latitude,
            origin_lon=payload.origin.longitude,
            dest_lat=payload.destination.latitude,
            dest_lon=payload.destination.longitude,
            profile=payload.profile,
            alternatives=payload.alternatives,
        )
    except NoRouteFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except RoutingServiceError as e:
        logger.error(f"Routing provider error: {e.message}")
        raise HTTPException(
            status_code=e.status_code,
            detail=e.message,
        )
    except Exception as e:
        logger.exception("Unexpected routing error")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while calculating route alternatives: {str(e)}",
        )

    # Assess safety conditions for each candidate route
    candidate_items: List[RouteAlternativeItem] = []
    for raw in raw_routes:
        safety_result = route_safety_service.assess_route_safety(
            db=db,
            route_geometry=raw.geometry,
            distance_m=raw.distance_m,
            duration_seconds=raw.duration_seconds,
            transport_mode=raw.transport_mode,
            departure_time=payload.departure_time,
        )

        steps_obj: List[TurnByTurnStep] = []
        for s in raw.steps:
            if isinstance(s, dict):
                steps_obj.append(TurnByTurnStep(**s))
            elif isinstance(s, TurnByTurnStep):
                steps_obj.append(s)

        item = RouteAlternativeItem(
            route_id=raw.route_id,
            route_type="alternative",
            route_type_label=f"Route via {raw.summary}",
            provider=raw.provider,
            transport_mode=raw.transport_mode,
            distance_m=raw.distance_m,
            duration_seconds=raw.duration_seconds,
            origin=payload.origin,
            destination=payload.destination,
            geometry=raw.geometry,
            steps=steps_obj,
            two_wheeler_disclaimer=raw.two_wheeler_disclaimer,
            risk_assessment=safety_result.assessment,
            safety_assessment=safety_result.assessment,
            strongest_signals=safety_result.signals,
            relevant_issues=safety_result.relevant_issues,
            distinct_verified_issues_count=len(safety_result.relevant_issues),
            explanation=safety_result.explanation,
            limitations=safety_result.limitations,
            summary_tags=[],
        )
        candidate_items.append(item)

    # Compare and rank candidate routes
    ranked_routes, rec_status, rec_id, rec_reason = route_safety_service.compare_and_rank_routes(candidate_items)

    overall_limitations = [
        "Estimates depend on verified civic reports and help point density.",
        "Missing reports do not guarantee safe conditions along unmonitored stretches.",
    ]

    return RouteAlternativesResponse(
        routes=ranked_routes,
        recommendation_status=rec_status,
        recommended_route_id=rec_id,
        recommendation_reason=rec_reason,
        limitations=overall_limitations,
    )


@router.post("/assess-safety", status_code=status.HTTP_200_OK)
def assess_custom_route_safety(
    payload: RouteSafetyAssessRequest,
    db: Session = Depends(get_db),
):
    """
    On-demand Safety Pulse assessment for arbitrary route geometries.
    """
    safety_result = route_safety_service.assess_route_safety(
        db=db,
        route_geometry=payload.geometry,
        distance_m=payload.distance_m,
        duration_seconds=payload.duration_seconds,
    )

    return {
        "route_id": payload.route_id,
        "risk_assessment": safety_result.assessment,
        "safety_assessment": safety_result.assessment,
        "strongest_signals": safety_result.signals,
        "relevant_issues": safety_result.relevant_issues,
        "distinct_verified_issues_count": len(safety_result.relevant_issues),
        "explanation": safety_result.explanation,
        "limitations": safety_result.limitations,
        "disclaimer": (
            "Route safety assessments are estimates based on available information. "
            "They do not guarantee safety or predict crime."
        ),
    }


@router.get("/provider-info", status_code=status.HTTP_200_OK)
def get_provider_info():
    """
    Diagnostic endpoint detailing current routing engine provider configuration.
    """
    provider = routing_service.get_provider()
    return {
        "provider": provider.provider_name,
        "base_url": getattr(provider, "base_url", None),
        "timeout_seconds": settings.ROUTING_TIMEOUT_SECONDS,
        "sample_interval_m": settings.ROUTE_SAMPLE_INTERVAL_METERS,
        "max_sample_points": settings.ROUTE_MAX_SAMPLE_POINTS,
        "status": "operational",
    }
