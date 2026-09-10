from typing import Iterable

from app.core.config import VAPID_PRIVATE_KEY, VAPID_SUBJECT


def push_enabled() -> bool:
    return bool(VAPID_PRIVATE_KEY and VAPID_SUBJECT)


def send_web_push(subscription_info: dict, payload: dict) -> None:
    if not push_enabled():
        raise RuntimeError("Web Push is not configured. Add VAPID_PRIVATE_KEY and VAPID_SUBJECT to .env")
    from pywebpush import webpush
    webpush(
        subscription_info=subscription_info,
        data=__import__("json").dumps(payload),
        vapid_private_key=VAPID_PRIVATE_KEY,
        vapid_claims={"sub": VAPID_SUBJECT},
    )


def notify_subscriptions(subscriptions: Iterable, payload: dict) -> int:
    sent = 0
    for subscription in subscriptions:
        info = {
            "endpoint": subscription.endpoint,
            "keys": {"p256dh": subscription.p256dh, "auth": subscription.auth},
        }
        try:
            send_web_push(info, payload)
            sent += 1
        except Exception:
            # A single stale/invalid browser subscription must not break alert generation.
            continue
    return sent
