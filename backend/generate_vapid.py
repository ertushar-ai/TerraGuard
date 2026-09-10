import base64
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat, PrivateFormat, NoEncryption
from py_vapid import Vapid

v = Vapid()
v.generate_keys()
public_raw = v.public_key.public_bytes(Encoding.X962, PublicFormat.UncompressedPoint)
private_raw = v.private_key.private_bytes(Encoding.Raw, PrivateFormat.Raw, NoEncryption())

print("VAPID_PUBLIC_KEY=" + base64.urlsafe_b64encode(public_raw).rstrip(b"=").decode())
print("VAPID_PRIVATE_KEY=" + base64.urlsafe_b64encode(private_raw).rstrip(b"=").decode())
