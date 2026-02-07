"""Polar.sh SDK wrapper for payment and subscription management."""
import logging
import hashlib
import hmac
import json
from typing import Optional, Dict, Any

from polar_sdk import Polar

from app.config import settings

logger = logging.getLogger(__name__)


class PolarService:
    def __init__(self):
        self._client: Optional[Polar] = None

    @property
    def client(self) -> Polar:
        if self._client is None:
            kwargs: Dict[str, Any] = {
                "access_token": settings.POLAR_ACCESS_TOKEN,
            }
            if settings.POLAR_SANDBOX:
                kwargs["server"] = "sandbox"
            self._client = Polar(**kwargs)
        return self._client

    async def create_checkout(
        self,
        user_id: str,
        email: str,
    ) -> Dict[str, str]:
        """Create a Polar checkout session for the Pro plan."""
        checkout = self.client.checkouts.create(
            request={
                "products": [settings.POLAR_PRO_PRODUCT_ID],
                "customer_email": email,
                "success_url": settings.POLAR_SUCCESS_URL,
                "metadata": {"user_id": user_id},
            }
        )
        return {
            "checkout_url": checkout.url,
            "checkout_id": str(checkout.id),
        }

    def verify_webhook(self, payload: bytes, headers: Dict[str, str]) -> Dict[str, Any]:
        """Verify and parse a Polar webhook event.

        Uses standard webhooks HMAC-SHA256 signature verification.
        """
        webhook_id = headers.get("webhook-id", "")
        webhook_timestamp = headers.get("webhook-timestamp", "")
        webhook_signature = headers.get("webhook-signature", "")

        if not all([webhook_id, webhook_timestamp, webhook_signature]):
            raise ValueError("Missing webhook headers")

        # Build signed content
        signed_content = f"{webhook_id}.{webhook_timestamp}.{payload.decode('utf-8')}"

        # Polar webhook secret may be prefixed with "whsec_"
        secret = settings.POLAR_WEBHOOK_SECRET
        if secret.startswith("whsec_"):
            secret = secret[6:]

        import base64
        secret_bytes = base64.b64decode(secret)
        expected_signature = base64.b64encode(
            hmac.new(secret_bytes, signed_content.encode("utf-8"), hashlib.sha256).digest()
        ).decode("utf-8")

        # webhook-signature can contain multiple signatures separated by space
        signatures = webhook_signature.split(" ")
        verified = False
        for sig in signatures:
            # Each signature is in format "v1,<base64>"
            parts = sig.split(",", 1)
            if len(parts) == 2:
                sig_value = parts[1]
                if hmac.compare_digest(expected_signature, sig_value):
                    verified = True
                    break

        if not verified:
            raise ValueError("Invalid webhook signature")

        return json.loads(payload)


polar_service = PolarService()
