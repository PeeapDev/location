"""
Confidence scoring service for address data quality assessment.

Confidence scores range from 0.0 to 1.0 and indicate the reliability
of address data for delivery and verification purposes.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional


@dataclass
class ConfidenceFactors:
    """Individual factors contributing to confidence score."""
    gps_accuracy: float = 0.0
    verification_method: float = 0.0
    completeness: float = 0.0
    recency: float = 0.0
    delivery_success: float = 0.0


class ConfidenceScorer:
    """
    Calculate confidence scores for addresses based on multiple factors.

    Scoring weights:
    - GPS accuracy: 25%
    - Verification method: 25%
    - Data completeness: 20%
    - Data recency: 15%
    - Delivery success rate: 15%
    """

    # Scoring weights
    WEIGHT_GPS = 0.25
    WEIGHT_VERIFICATION = 0.25
    WEIGHT_COMPLETENESS = 0.20
    WEIGHT_RECENCY = 0.15
    WEIGHT_DELIVERY = 0.15

    # GPS accuracy thresholds (meters)
    GPS_EXCELLENT = 5.0
    GPS_GOOD = 10.0
    GPS_ACCEPTABLE = 25.0

    # Verification method scores
    VERIFICATION_SCORES = {
        "field_survey": 1.0,
        "photo_verified": 0.8,
        "user_submitted": 0.5,
        "crowdsourced": 0.3,
        "imported": 0.4,
        None: 0.3
    }

    # Required fields for completeness
    REQUIRED_FIELDS = ["street_name", "landmark_primary"]
    OPTIONAL_FIELDS = ["block", "house_number", "building_name", "delivery_instructions"]

    @classmethod
    def score_gps_accuracy(cls, accuracy_m: Optional[float]) -> float:
        """
        Score GPS accuracy.

        Args:
            accuracy_m: GPS accuracy in meters (None if unknown)

        Returns:
            Score from 0.0 to 1.0
        """
        if accuracy_m is None:
            return 0.3  # Unknown accuracy

        if accuracy_m <= cls.GPS_EXCELLENT:
            return 1.0
        elif accuracy_m <= cls.GPS_GOOD:
            return 0.8
        elif accuracy_m <= cls.GPS_ACCEPTABLE:
            return 0.5
        else:
            return 0.2

    @classmethod
    def score_verification_method(cls, method: Optional[str]) -> float:
        """
        Score verification method.

        Args:
            method: Verification method string

        Returns:
            Score from 0.0 to 1.0
        """
        return cls.VERIFICATION_SCORES.get(method, 0.3)

    @classmethod
    def score_completeness(
        cls,
        street_name: Optional[str],
        block: Optional[str],
        house_number: Optional[str],
        building_name: Optional[str],
        landmark_primary: Optional[str],
        delivery_instructions: Optional[str]
    ) -> float:
        """
        Score data completeness.

        Args:
            Various address fields

        Returns:
            Score from 0.0 to 1.0
        """
        fields = {
            "street_name": street_name,
            "block": block,
            "house_number": house_number,
            "building_name": building_name,
            "landmark_primary": landmark_primary,
            "delivery_instructions": delivery_instructions
        }

        # Check required fields (60% weight)
        required_count = sum(1 for f in cls.REQUIRED_FIELDS if fields.get(f))
        required_score = required_count / len(cls.REQUIRED_FIELDS) if cls.REQUIRED_FIELDS else 1.0

        # Check optional fields (40% weight)
        optional_count = sum(1 for f in cls.OPTIONAL_FIELDS if fields.get(f))
        optional_score = optional_count / len(cls.OPTIONAL_FIELDS) if cls.OPTIONAL_FIELDS else 1.0

        return (required_score * 0.6) + (optional_score * 0.4)

    @classmethod
    def score_recency(cls, updated_at: Optional[datetime]) -> float:
        """
        Score data recency.

        Args:
            updated_at: Last update timestamp

        Returns:
            Score from 0.0 to 1.0
        """
        if updated_at is None:
            return 0.3

        now = datetime.utcnow()
        age = now - updated_at

        if age <= timedelta(days=180):  # < 6 months
            return 1.0
        elif age <= timedelta(days=365):  # 6-12 months
            return 0.8
        elif age <= timedelta(days=730):  # 1-2 years
            return 0.5
        else:
            return 0.3

    @classmethod
    def score_delivery_success(cls, success_rate: Optional[float]) -> float:
        """
        Score historical delivery success rate.

        Args:
            success_rate: Delivery success rate (0.0-1.0), None if no history

        Returns:
            Score from 0.0 to 1.0
        """
        if success_rate is None:
            return 0.5  # No history, neutral score
        return success_rate

    @classmethod
    def calculate(
        cls,
        accuracy_m: Optional[float] = None,
        verification_method: Optional[str] = None,
        street_name: Optional[str] = None,
        block: Optional[str] = None,
        house_number: Optional[str] = None,
        building_name: Optional[str] = None,
        landmark_primary: Optional[str] = None,
        delivery_instructions: Optional[str] = None,
        updated_at: Optional[datetime] = None,
        delivery_success_rate: Optional[float] = None
    ) -> tuple[float, ConfidenceFactors]:
        """
        Calculate overall confidence score.

        Args:
            Various address attributes

        Returns:
            Tuple of (overall_score, individual_factors)
        """
        factors = ConfidenceFactors(
            gps_accuracy=cls.score_gps_accuracy(accuracy_m),
            verification_method=cls.score_verification_method(verification_method),
            completeness=cls.score_completeness(
                street_name, block, house_number,
                building_name, landmark_primary, delivery_instructions
            ),
            recency=cls.score_recency(updated_at),
            delivery_success=cls.score_delivery_success(delivery_success_rate)
        )

        overall = (
            factors.gps_accuracy * cls.WEIGHT_GPS +
            factors.verification_method * cls.WEIGHT_VERIFICATION +
            factors.completeness * cls.WEIGHT_COMPLETENESS +
            factors.recency * cls.WEIGHT_RECENCY +
            factors.delivery_success * cls.WEIGHT_DELIVERY
        )

        return round(overall, 2), factors

    @classmethod
    def get_rating(cls, score: float) -> str:
        """
        Get human-readable rating from score.

        Args:
            score: Confidence score (0.0-1.0)

        Returns:
            Rating string
        """
        if score >= 0.90:
            return "VERIFIED"
        elif score >= 0.70:
            return "RELIABLE"
        elif score >= 0.50:
            return "PROBABLE"
        elif score >= 0.30:
            return "UNCERTAIN"
        else:
            return "UNVERIFIED"

    @classmethod
    def get_delivery_recommendation(cls, score: float) -> dict:
        """
        Get delivery recommendation based on score.

        Args:
            score: Confidence score

        Returns:
            Recommendation dictionary
        """
        if score >= 0.90:
            return {
                "can_deliver": True,
                "call_before_delivery": False,
                "additional_verification": False,
                "message": "Full confidence - proceed with delivery"
            }
        elif score >= 0.70:
            return {
                "can_deliver": True,
                "call_before_delivery": False,
                "additional_verification": False,
                "message": "Standard delivery"
            }
        elif score >= 0.50:
            return {
                "can_deliver": True,
                "call_before_delivery": True,
                "additional_verification": False,
                "message": "Customer callback recommended"
            }
        elif score >= 0.30:
            return {
                "can_deliver": True,
                "call_before_delivery": True,
                "additional_verification": True,
                "message": "Agent verification required"
            }
        else:
            return {
                "can_deliver": False,
                "call_before_delivery": True,
                "additional_verification": True,
                "message": "Hold for manual review"
            }
