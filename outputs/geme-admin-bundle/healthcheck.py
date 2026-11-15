import sys
from urllib.request import urlopen

for endpoint in ("http://127.0.0.1:3001/login", "http://127.0.0.1:4000/api/v1/health/ready", "http://127.0.0.1:8000/health"):
    with urlopen(endpoint, timeout=3) as response:
        if response.status >= 400:
            sys.exit(1)
